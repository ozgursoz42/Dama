import { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameVariant,
  Move,
  OnlineRoomState,
  OnlineRoomSummary,
  PieceColor,
  ChatMessage,
} from '../types';

export function useOnlineGame() {
  const [isConnected, setIsConnected] = useState(false);
  const [roomState, setRoomState] = useState<OnlineRoomState | null>(null);
  const [myColor, setMyColor] = useState<PieceColor | 'spectator' | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeRooms, setActiveRooms] = useState<OnlineRoomSummary[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const notificationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    notificationTimerRef.current = setTimeout(() => {
      setNotification(null);
    }, 4000);
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      ws.onclose = () => {
        setIsConnected(false);
      };

      ws.onerror = () => {
        setError('Sunucu bağlantısı sağlanamadı.');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'room_joined') {
            setRoomState(data.roomState);
            setMyColor(data.myColor);
            setMyPlayerId(data.myPlayerId);
            setError(null);
          } else if (data.type === 'room_update') {
            setRoomState(data.roomState);
            if (data.notification) {
              showNotification(data.notification);
            }
          } else if (data.type === 'move_made') {
            setRoomState(data.roomState);
          } else if (data.type === 'chat_message') {
            setRoomState((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                chatMessages: [...prev.chatMessages, data.message],
              };
            });
          } else if (data.type === 'error') {
            setError(data.message);
            setTimeout(() => setError(null), 5000);
          }
        } catch (err) {
          console.error('WS message parse error:', err);
        }
      };

      socketRef.current = ws;
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setError('Bağlantı hatası oluştu.');
    }
  }, [showNotification]);

  // Initial connect
  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback(
    (payload: Record<string, unknown>) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(payload));
      } else {
        connect();
        setTimeout(() => {
          if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(payload));
          }
        }, 500);
      }
    },
    [connect]
  );

  const fetchActiveRooms = useCallback(async () => {
    setIsLoadingRooms(true);
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setActiveRooms(data);
      }
    } catch {
      // Ignored
    } finally {
      setIsLoadingRooms(false);
    }
  }, []);

  const createRoom = useCallback(
    (variant: GameVariant, playerName: string, preferredColor: 'red' | 'black' | 'random' = 'random') => {
      send({
        type: 'create_room',
        variant,
        playerName,
        preferredColor,
      });
    },
    [send]
  );

  const quickMatch = useCallback(
    (variant: GameVariant, playerName: string) => {
      send({
        type: 'quick_match',
        variant,
        playerName,
      });
    },
    [send]
  );

  const joinRoom = useCallback(
    (roomId: string, playerName: string) => {
      send({
        type: 'join_room',
        roomId,
        playerName,
      });
    },
    [send]
  );

  const makeMove = useCallback(
    (move: Move) => {
      if (!roomState) return;
      send({
        type: 'make_move',
        roomId: roomState.roomId,
        move,
      });
    },
    [roomState, send]
  );

  const resign = useCallback(() => {
    if (!roomState) return;
    send({
      type: 'resign',
      roomId: roomState.roomId,
    });
  }, [roomState, send] );

  const offerDraw = useCallback(() => {
    if (!roomState) return;
    send({
      type: 'offer_draw',
      roomId: roomState.roomId,
    });
  }, [roomState, send]);

  const respondDraw = useCallback(
    (accepted: boolean) => {
      if (!roomState) return;
      send({
        type: 'respond_draw',
        roomId: roomState.roomId,
        accepted,
      });
    },
    [roomState, send]
  );

  const requestRematch = useCallback(() => {
    if (!roomState) return;
    send({
      type: 'request_rematch',
      roomId: roomState.roomId,
    });
  }, [roomState, send]);

  const sendChat = useCallback(
    (text: string) => {
      if (!roomState || !text.trim()) return;
      send({
        type: 'chat',
        roomId: roomState.roomId,
        text,
      });
    },
    [roomState, send]
  );

  const leaveRoom = useCallback(() => {
    if (roomState) {
      send({
        type: 'leave_room',
        roomId: roomState.roomId,
      });
    }
    setRoomState(null);
    setMyColor(null);
    setMyPlayerId(null);
  }, [roomState, send]);

  return {
    isConnected,
    roomState,
    myColor,
    myPlayerId,
    notification,
    error,
    activeRooms,
    isLoadingRooms,
    fetchActiveRooms,
    createRoom,
    quickMatch,
    joinRoom,
    makeMove,
    resign,
    offerDraw,
    respondDraw,
    requestRematch,
    sendChat,
    leaveRoom,
  };
}
