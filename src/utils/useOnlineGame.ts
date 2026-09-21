import { useState, useEffect, useRef, useCallback } from 'react';
import mqtt, { type MqttClient } from 'mqtt';
import {
  GameVariant,
  Move,
  OnlineRoomState,
  OnlineRoomSummary,
  PieceColor,
  ChatMessage,
} from '../types';
import { applyMove, checkGameStatus, createInitialBoard } from './checkersLogic';

// Generate clean 6-character room code (without confusing chars like 0/O, 1/I)
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Public WebSocket MQTT Brokers with WSS (SSL) support
const MQTT_BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
];

interface NetworkMessage {
  senderId: string;
  senderName: string;
  type:
    | 'ROOM_ANNOUNCE'
    | 'ROOM_CLOSED'
    | 'JOIN_REQUEST'
    | 'JOIN_ACCEPTED'
    | 'SYNC_MOVE'
    | 'CHAT'
    | 'RESIGN'
    | 'DRAW_OFFER'
    | 'DRAW_RESPONSE'
    | 'REMATCH_REQUEST'
    | 'HEARTBEAT'
    | 'PLAYER_LEFT';
  targetId?: string;
  payload?: any;
  timestamp: number;
}

export function useOnlineGame() {
  const [isConnected, setIsConnected] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [roomState, setRoomState] = useState<OnlineRoomState | null>(null);
  const [myColor, setMyColor] = useState<PieceColor | 'spectator' | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [myPlayerName, setMyPlayerName] = useState<string>('Oyuncu');
  const [notification, setNotification] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeRooms, setActiveRooms] = useState<OnlineRoomSummary[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  const clientRef = useRef<MqttClient | null>(null);
  const currentTopicRef = useRef<string | null>(null);
  const isHostRef = useRef<boolean>(false);
  const roomStateRef = useRef<OnlineRoomState | null>(null);
  const myPlayerIdRef = useRef<string | null>(null);
  const myPlayerNameRef = useRef<string>('Oyuncu');

  const notificationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const joinRetryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const joinTimeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize state and ref together to avoid stale closures
  const updateRoomState = useCallback(
    (updater: OnlineRoomState | null | ((prev: OnlineRoomState | null) => OnlineRoomState | null)) => {
      setRoomState((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        roomStateRef.current = next;
        return next;
      });
    },
    []
  );

  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    notificationTimerRef.current = setTimeout(() => {
      setNotification(null);
    }, 4500);
  }, []);

  // Publish message to current room topic
  const publishMessage = useCallback(
    (msg: NetworkMessage, options?: { retain?: boolean }) => {
      if (clientRef.current && clientRef.current.connected && currentTopicRef.current) {
        try {
          clientRef.current.publish(
            currentTopicRef.current,
            JSON.stringify(msg),
            { qos: 1, retain: options?.retain || false }
          );
        } catch (err) {
          console.error('MQTT publish error:', err);
        }
      }
    },
    []
  );

  // Cleanup all timers and MQTT connection
  const cleanupConnections = useCallback(() => {
    if (joinRetryTimerRef.current) {
      clearInterval(joinRetryTimerRef.current);
      joinRetryTimerRef.current = null;
    }
    if (joinTimeoutTimerRef.current) {
      clearTimeout(joinTimeoutTimerRef.current);
      joinTimeoutTimerRef.current = null;
    }
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }

    setIsConnecting(false);

    if (clientRef.current) {
      try {
        if (currentTopicRef.current && myPlayerIdRef.current) {
          if (isHostRef.current) {
            // Clear retained room announcement if host is leaving
            clientRef.current.publish(
              currentTopicRef.current,
              JSON.stringify({
                senderId: myPlayerIdRef.current,
                senderName: myPlayerNameRef.current,
                type: 'ROOM_CLOSED',
                timestamp: Date.now(),
              }),
              { qos: 1, retain: true }
            );
          } else {
            const leaveMsg: NetworkMessage = {
              senderId: myPlayerIdRef.current,
              senderName: myPlayerNameRef.current,
              type: 'PLAYER_LEFT',
              timestamp: Date.now(),
            };
            clientRef.current.publish(
              currentTopicRef.current,
              JSON.stringify(leaveMsg),
              { qos: 0 }
            );
          }
        }
        clientRef.current.end(true);
      } catch {
        // Ignore
      }
      clientRef.current = null;
    }
    currentTopicRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupConnections();
    };
  }, [cleanupConnections]);

  // Handle incoming parsed network message
  const handleIncomingMessage = useCallback(
    (msg: NetworkMessage) => {
      if (!msg || typeof msg !== 'object') return;
      // Discard our own messages
      if (msg.senderId === myPlayerIdRef.current) return;

      switch (msg.type) {
        case 'ROOM_ANNOUNCE': {
          // If guest is waiting to join and room is announced, send join request immediately
          if (!isHostRef.current && myPlayerIdRef.current && !roomStateRef.current) {
            publishMessage({
              senderId: myPlayerIdRef.current,
              senderName: myPlayerNameRef.current,
              type: 'JOIN_REQUEST',
              timestamp: Date.now(),
            });
          }
          break;
        }

        case 'ROOM_CLOSED': {
          if (!isHostRef.current) {
            showNotification('Oda sahibi oyundan ayrıldı.');
            setError('Ev sahibi odayı kapattı.');
          }
          break;
        }

        case 'JOIN_REQUEST': {
          // Host receives join request from guest
          if (!isHostRef.current) return;
          const current = roomStateRef.current;
          if (!current) return;

          const hostColor = current.players.red?.id === myPlayerIdRef.current ? 'red' : 'black';
          const guestColor: PieceColor = hostColor === 'red' ? 'black' : 'red';

          const updatedState: OnlineRoomState = {
            ...current,
            players: {
              ...current.players,
              [guestColor]: {
                id: msg.senderId,
                name: msg.senderName,
                color: guestColor,
                connected: true,
              },
            },
            lastActivity: Date.now(),
          };

          updateRoomState(updatedState);

          // Send acceptance specifically targeted to this guest
          publishMessage({
            senderId: myPlayerIdRef.current!,
            senderName: myPlayerNameRef.current,
            type: 'JOIN_ACCEPTED',
            targetId: msg.senderId,
            payload: {
              roomState: updatedState,
              assignedColor: guestColor,
            },
            timestamp: Date.now(),
          });

          showNotification(`${msg.senderName} odaya katıldı! Oyun başlıyor.`);
          break;
        }

        case 'JOIN_ACCEPTED': {
          // Guest receives full room state from host
          if (isHostRef.current) return;
          if (msg.targetId && msg.targetId !== myPlayerIdRef.current) return;

          if (joinRetryTimerRef.current) {
            clearInterval(joinRetryTimerRef.current);
            joinRetryTimerRef.current = null;
          }
          if (joinTimeoutTimerRef.current) {
            clearTimeout(joinTimeoutTimerRef.current);
            joinTimeoutTimerRef.current = null;
          }

          setIsConnecting(false);
          setError(null);

          const { roomState: hostRoomState, assignedColor } = msg.payload || {};
          if (hostRoomState && assignedColor) {
            updateRoomState(hostRoomState);
            setMyColor(assignedColor);
            showNotification('Odaya başarıyla bağlanıldı! İyi oyunlar.');
          }
          break;
        }

        case 'SYNC_MOVE': {
          if (msg.payload?.roomState) {
            updateRoomState(msg.payload.roomState);
          }
          break;
        }

        case 'CHAT': {
          if (msg.payload?.chatMessage) {
            updateRoomState((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                chatMessages: [...prev.chatMessages, msg.payload.chatMessage],
              };
            });
          }
          break;
        }

        case 'RESIGN': {
          updateRoomState((prev) => {
            if (!prev) return prev;
            const resignedColor: PieceColor = msg.payload?.resignedBy;
            const winnerColor: PieceColor = resignedColor === 'red' ? 'black' : 'red';
            const winningStatus = winnerColor === 'red' ? 'red_won' : 'black_won';
            showNotification(`Rakip maçı terk etti. Kazandınız!`);
            return {
              ...prev,
              status: winningStatus,
              winner: winnerColor,
            };
          });
          break;
        }

        case 'DRAW_OFFER': {
          updateRoomState((prev) => {
            if (!prev) return prev;
            showNotification('Rakibiniz beraberlik teklif etti.');
            return {
              ...prev,
              drawOfferedBy: msg.payload?.from,
            };
          });
          break;
        }

        case 'DRAW_RESPONSE': {
          if (msg.payload?.accepted) {
            updateRoomState((prev) => {
              if (!prev) return prev;
              showNotification('Beraberlik teklifi kabul edildi. Oyun berabere!');
              return {
                ...prev,
                status: 'draw',
                winner: 'draw',
                drawOfferedBy: null,
              };
            });
          } else {
            updateRoomState((prev) => {
              if (!prev) return prev;
              showNotification('Beraberlik teklifi reddedildi.');
              return {
                ...prev,
                drawOfferedBy: null,
              };
            });
          }
          break;
        }

        case 'REMATCH_REQUEST': {
          updateRoomState((prev) => {
            if (!prev) return prev;
            if (prev.rematchRequestedBy && prev.rematchRequestedBy !== msg.payload?.requestedBy) {
              // Both sides agreed: reset game with swapped colors or fresh board
              const newBoard = createInitialBoard(prev.variant);
              const updatedState: OnlineRoomState = {
                ...prev,
                board: newBoard,
                currentTurn: 'red',
                multiJumpPiecePos: null,
                lastMove: null,
                status: 'playing',
                winner: undefined,
                drawOfferedBy: null,
                rematchRequestedBy: null,
                moveCount: 0,
                lastActivity: Date.now(),
              };
              showNotification('Rövanş maçı başladı! İyi oyunlar.');
              return updatedState;
            } else {
              showNotification('Rakip rövanş maçı teklif etti!');
              return {
                ...prev,
                rematchRequestedBy: msg.payload?.requestedBy,
              };
            }
          });
          break;
        }

        case 'PLAYER_LEFT': {
          showNotification('Rakip odadan ayrıldı.');
          updateRoomState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              players: {
                red: prev.players.red ? { ...prev.players.red, connected: prev.players.red.id === myPlayerIdRef.current } : null,
                black: prev.players.black ? { ...prev.players.black, connected: prev.players.black.id === myPlayerIdRef.current } : null,
              },
            };
          });
          break;
        }

        case 'HEARTBEAT': {
          // Keep-alive received
          break;
        }

        default:
          break;
      }
    },
    [publishMessage, showNotification, updateRoomState]
  );

  // Connect to MQTT Broker with fallback
  const connectBroker = useCallback(
    (
      topic: string,
      onConnected: () => void,
      onError: (err: string) => void,
      brokerIndex = 0
    ) => {
      if (brokerIndex >= MQTT_BROKERS.length) {
        onError('Çevrimiçi sunuculara bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
        setIsConnecting(false);
        return;
      }

      const brokerUrl = MQTT_BROKERS[brokerIndex];
      const clientId = `dama_${Math.random().toString(36).substring(2, 11)}`;

      const client = mqtt.connect(brokerUrl, {
        clientId,
        clean: true,
        connectTimeout: 8000,
        reconnectPeriod: 3000,
        keepalive: 20,
      });

      let hasConnected = false;

      client.on('connect', () => {
        hasConnected = true;
        setIsConnected(true);
        currentTopicRef.current = topic;

        client.subscribe(topic, { qos: 1 }, (subErr) => {
          if (subErr) {
            console.error('MQTT subscribe error:', subErr);
            onError('Odaya abone olunamadı.');
            setIsConnecting(false);
            return;
          }
          onConnected();
        });
      });

      client.on('message', (_top, payload) => {
        try {
          const parsed = JSON.parse(payload.toString());
          handleIncomingMessage(parsed);
        } catch (e) {
          console.error('Failed to parse incoming message:', e);
        }
      });

      client.on('error', (err) => {
        console.error('MQTT error on', brokerUrl, err);
        if (!hasConnected) {
          client.end(true);
          // Try next broker fallback
          connectBroker(topic, onConnected, onError, brokerIndex + 1);
        }
      });

      client.on('close', () => {
        if (!hasConnected) {
          client.end(true);
          connectBroker(topic, onConnected, onError, brokerIndex + 1);
        }
      });

      clientRef.current = client;
    },
    [handleIncomingMessage]
  );

  // Start periodic heartbeat
  const startHeartbeat = useCallback(
    (pId: string, pName: string) => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = setInterval(() => {
        if (clientRef.current && clientRef.current.connected && currentTopicRef.current) {
          const hb: NetworkMessage = {
            senderId: pId,
            senderName: pName,
            type: 'HEARTBEAT',
            timestamp: Date.now(),
          };
          try {
            clientRef.current.publish(currentTopicRef.current, JSON.stringify(hb), { qos: 0 });
          } catch {
            // Ignore
          }
        }
      }, 10000);
    },
    []
  );

  // Host creates room
  const createRoom = useCallback(
    (
      variant: GameVariant,
      playerName: string,
      preferredColor: 'red' | 'black' | 'random' = 'random'
    ) => {
      cleanupConnections();
      setError(null);
      isHostRef.current = true;
      setMyPlayerName(playerName);
      myPlayerNameRef.current = playerName;

      const roomId = generateRoomCode();
      const hostColor: PieceColor =
        preferredColor === 'random'
          ? Math.random() < 0.5
            ? 'red'
            : 'black'
          : preferredColor;

      const hostId = 'p_' + Math.random().toString(36).substring(2, 9);
      setMyColor(hostColor);
      setMyPlayerId(hostId);
      myPlayerIdRef.current = hostId;

      const initialRoom: OnlineRoomState = {
        roomId,
        variant,
        board: createInitialBoard(variant),
        currentTurn: 'red',
        multiJumpPiecePos: null,
        lastMove: null,
        status: 'playing',
        players: {
          red:
            hostColor === 'red'
              ? { id: hostId, name: playerName, color: 'red', connected: true }
              : null,
          black:
            hostColor === 'black'
              ? { id: hostId, name: playerName, color: 'black', connected: true }
              : null,
        },
        spectatorsCount: 0,
        drawOfferedBy: null,
        rematchRequestedBy: null,
        moveCount: 0,
        chatMessages: [],
        lastActivity: Date.now(),
      };

      updateRoomState(initialRoom);

      const topic = `turkdama/rooms/${roomId.toLowerCase()}`;
      connectBroker(
        topic,
        () => {
          // Announce room retained so any guest subscribing instantly gets room details
          publishMessage(
            {
              senderId: hostId,
              senderName: playerName,
              type: 'ROOM_ANNOUNCE',
              payload: {
                roomId,
                variant,
                hostName: playerName,
                hostColor,
              },
              timestamp: Date.now(),
            },
            { retain: true }
          );
          startHeartbeat(hostId, playerName);
        },
        (errMsg) => {
          setError(errMsg);
        }
      );
    },
    [cleanupConnections, connectBroker, publishMessage, startHeartbeat, updateRoomState]
  );

  // Guest joins room
  const joinRoom = useCallback(
    (roomIdInput: string, playerName: string) => {
      cleanupConnections();
      setError(null);
      setIsConnecting(true);
      isHostRef.current = false;
      setMyPlayerName(playerName);
      myPlayerNameRef.current = playerName;

      const cleanCode = roomIdInput.trim().toUpperCase();
      if (cleanCode.length < 4) {
        setError('Geçersiz oda kodu. En az 4-6 karakter giriniz.');
        setIsConnecting(false);
        return;
      }

      const guestId = 'p_' + Math.random().toString(36).substring(2, 9);
      setMyPlayerId(guestId);
      myPlayerIdRef.current = guestId;

      const topic = `turkdama/rooms/${cleanCode.toLowerCase()}`;
      connectBroker(
        topic,
        () => {
          // Connection ready: start requesting join from host
          const sendJoinReq = () => {
            const reqMsg: NetworkMessage = {
              senderId: guestId,
              senderName: playerName,
              type: 'JOIN_REQUEST',
              timestamp: Date.now(),
            };
            publishMessage(reqMsg);
          };

          // Send immediately
          sendJoinReq();

          // Retry sending every 1.5s until accepted or timeout
          joinRetryTimerRef.current = setInterval(sendJoinReq, 1500);

          // 12-second timeout if room not found
          joinTimeoutTimerRef.current = setTimeout(() => {
            if (joinRetryTimerRef.current) {
              clearInterval(joinRetryTimerRef.current);
              joinRetryTimerRef.current = null;
            }
            setIsConnecting(false);
            setError('Oda bulunamadı veya ev sahibi henüz oyuna girmedi. Lütfen oda kodunu kontrol edin.');
          }, 12000);

          startHeartbeat(guestId, playerName);
        },
        (errMsg) => {
          setIsConnecting(false);
          setError(errMsg);
        }
      );
    },
    [cleanupConnections, connectBroker, publishMessage, startHeartbeat]
  );

  // Quick Match
  const quickMatch = useCallback(
    (variant: GameVariant, playerName: string) => {
      const qmCode = `QM${variant.substring(0, 3).toUpperCase()}1`;
      joinRoom(qmCode, playerName);

      const timer = setTimeout(() => {
        if (!roomStateRef.current) {
          createRoom(variant, playerName, 'random');
        }
      }, 3000);

      return () => clearTimeout(timer);
    },
    [createRoom, joinRoom]
  );

  // Make Move Handler
  const makeMove = useCallback(
    (move: Move) => {
      const current = roomStateRef.current;
      if (!current) return;

      const { newBoard, hasFurtherJumps, promotedToKing } = applyMove(
        current.board,
        move,
        current.variant
      );

      const nextTurn: PieceColor = hasFurtherJumps
        ? current.currentTurn
        : current.currentTurn === 'red'
        ? 'black'
        : 'red';

      const nextStatus = hasFurtherJumps
        ? 'playing'
        : checkGameStatus(newBoard, nextTurn, null, current.variant);

      const updatedState: OnlineRoomState = {
        ...current,
        board: newBoard,
        currentTurn: nextTurn,
        multiJumpPiecePos: hasFurtherJumps ? move.to : null,
        status: nextStatus,
        winner:
          nextStatus === 'red_won'
            ? 'red'
            : nextStatus === 'black_won'
            ? 'black'
            : nextStatus === 'draw'
            ? 'draw'
            : undefined,
        lastMove: { from: move.from, to: move.to },
        moveCount: current.moveCount + 1,
        lastActivity: Date.now(),
      };

      updateRoomState(updatedState);

      if (myPlayerIdRef.current) {
        publishMessage({
          senderId: myPlayerIdRef.current,
          senderName: myPlayerNameRef.current,
          type: 'SYNC_MOVE',
          payload: {
            move,
            roomState: updatedState,
          },
          timestamp: Date.now(),
        });
      }

      return {
        hasFurtherJumps,
        promotedToKing,
      };
    },
    [publishMessage, updateRoomState]
  );

  // Resign
  const resign = useCallback(() => {
    const current = roomStateRef.current;
    if (!current || !myColor || myColor === 'spectator' || !myPlayerIdRef.current) return;

    const winnerColor: PieceColor = myColor === 'red' ? 'black' : 'red';
    const winningStatus = winnerColor === 'red' ? 'red_won' : 'black_won';

    const updatedState: OnlineRoomState = {
      ...current,
      status: winningStatus,
      winner: winnerColor,
      lastActivity: Date.now(),
    };

    updateRoomState(updatedState);

    publishMessage({
      senderId: myPlayerIdRef.current,
      senderName: myPlayerNameRef.current,
      type: 'RESIGN',
      payload: {
        resignedBy: myColor,
      },
      timestamp: Date.now(),
    });
  }, [myColor, publishMessage, updateRoomState]);

  // Offer Draw
  const offerDraw = useCallback(() => {
    const current = roomStateRef.current;
    if (!current || !myColor || myColor === 'spectator' || !myPlayerIdRef.current) return;

    updateRoomState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        drawOfferedBy: myColor,
      };
    });

    publishMessage({
      senderId: myPlayerIdRef.current,
      senderName: myPlayerNameRef.current,
      type: 'DRAW_OFFER',
      payload: {
        from: myColor,
      },
      timestamp: Date.now(),
    });

    showNotification('Beraberlik teklifi gönderildi.');
  }, [myColor, publishMessage, showNotification, updateRoomState]);

  // Respond to Draw
  const respondDraw = useCallback(
    (accepted: boolean) => {
      const current = roomStateRef.current;
      if (!current || !myPlayerIdRef.current) return;

      if (accepted) {
        const updatedState: OnlineRoomState = {
          ...current,
          status: 'draw',
          winner: 'draw',
          drawOfferedBy: null,
          lastActivity: Date.now(),
        };
        updateRoomState(updatedState);
        showNotification('Beraberlik teklifini kabul ettiniz. Oyun berabere.');
      } else {
        updateRoomState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            drawOfferedBy: null,
          };
        });
        showNotification('Beraberlik teklifini reddettiniz.');
      }

      publishMessage({
        senderId: myPlayerIdRef.current,
        senderName: myPlayerNameRef.current,
        type: 'DRAW_RESPONSE',
        payload: {
          accepted,
        },
        timestamp: Date.now(),
      });
    },
    [publishMessage, showNotification, updateRoomState]
  );

  // Request Rematch
  const requestRematch = useCallback(() => {
    const current = roomStateRef.current;
    if (!current || !myColor || myColor === 'spectator' || !myPlayerIdRef.current) return;

    updateRoomState((prev) => {
      if (!prev) return prev;
      if (prev.rematchRequestedBy && prev.rematchRequestedBy !== myColor) {
        // Both accepted!
        const newBoard = createInitialBoard(prev.variant);
        const updatedState: OnlineRoomState = {
          ...prev,
          board: newBoard,
          currentTurn: 'red',
          multiJumpPiecePos: null,
          lastMove: null,
          status: 'playing',
          winner: undefined,
          drawOfferedBy: null,
          rematchRequestedBy: null,
          moveCount: 0,
          lastActivity: Date.now(),
        };

        publishMessage({
          senderId: myPlayerIdRef.current!,
          senderName: myPlayerNameRef.current,
          type: 'REMATCH_REQUEST',
          payload: {
            requestedBy: myColor,
          },
          timestamp: Date.now(),
        });

        showNotification('Rövanş maçı başladı! İyi oyunlar.');
        return updatedState;
      } else {
        publishMessage({
          senderId: myPlayerIdRef.current!,
          senderName: myPlayerNameRef.current,
          type: 'REMATCH_REQUEST',
          payload: {
            requestedBy: myColor,
          },
          timestamp: Date.now(),
        });
        showNotification('Rövanş isteği rakibe iletildi.');
        return {
          ...prev,
          rematchRequestedBy: myColor,
        };
      }
    });
  }, [myColor, publishMessage, showNotification, updateRoomState]);

  // Send Chat
  const sendChat = useCallback(
    (text: string) => {
      if (!roomStateRef.current || !text.trim() || !myPlayerIdRef.current) return;

      const chatMsg: ChatMessage = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        sender: myPlayerNameRef.current,
        senderColor: myColor === 'spectator' ? undefined : myColor || undefined,
        text: text.trim(),
        timestamp: Date.now(),
      };

      updateRoomState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          chatMessages: [...prev.chatMessages, chatMsg],
        };
      });

      publishMessage({
        senderId: myPlayerIdRef.current,
        senderName: myPlayerNameRef.current,
        type: 'CHAT',
        payload: {
          chatMessage: chatMsg,
        },
        timestamp: Date.now(),
      });
    },
    [myColor, publishMessage, updateRoomState]
  );

  // Leave Room
  const leaveRoom = useCallback(() => {
    cleanupConnections();
    updateRoomState(null);
    setMyColor(null);
    setMyPlayerId(null);
    myPlayerIdRef.current = null;
    setError(null);
    setIsConnecting(false);
  }, [cleanupConnections, updateRoomState]);

  // Refresh active rooms mock/listing
  const fetchActiveRooms = useCallback(async () => {
    setIsLoadingRooms(true);
    setTimeout(() => {
      setActiveRooms([
        {
          roomId: 'TURK88',
          variant: 'turkish',
          status: 'playing',
          playerCount: 1,
          hostName: 'UstaOyuncu',
        },
        {
          roomId: 'CAPR44',
          variant: 'diagonal',
          status: 'playing',
          playerCount: 1,
          hostName: 'DamaSever',
        },
      ]);
      setIsLoadingRooms(false);
    }, 400);
  }, []);

  return {
    isConnected,
    isConnecting,
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
