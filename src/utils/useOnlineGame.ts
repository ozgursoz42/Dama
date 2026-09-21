import { useState, useEffect, useRef, useCallback } from 'react';
import { Peer, type DataConnection } from 'peerjs';
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

const PEER_PREFIX = 'dama-v2-';

export function useOnlineGame() {
  const [isConnected, setIsConnected] = useState(true);
  const [roomState, setRoomState] = useState<OnlineRoomState | null>(null);
  const [myColor, setMyColor] = useState<PieceColor | 'spectator' | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [myPlayerName, setMyPlayerName] = useState<string>('Oyuncu');
  const [notification, setNotification] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeRooms, setActiveRooms] = useState<OnlineRoomSummary[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const notificationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHostRef = useRef<boolean>(false);

  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    notificationTimerRef.current = setTimeout(() => {
      setNotification(null);
    }, 4500);
  }, []);

  // Cleanup helper
  const cleanupConnections = useCallback(() => {
    if (connRef.current) {
      try {
        connRef.current.close();
      } catch {
        // Ignored
      }
      connRef.current = null;
    }
    if (peerRef.current) {
      try {
        peerRef.current.destroy();
      } catch {
        // Ignored
      }
      peerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupConnections();
    };
  }, [cleanupConnections]);

  // Send message to peer
  const sendToPeer = useCallback((payload: Record<string, unknown>) => {
    if (connRef.current && connRef.current.open) {
      try {
        connRef.current.send(payload);
      } catch (err) {
        console.error('Peer send error:', err);
      }
    }
  }, []);

  // Handle incoming peer data
  const handlePeerData = useCallback(
    (data: any) => {
      if (!data || typeof data !== 'object') return;

      switch (data.type) {
        case 'JOIN_REQUEST': {
          // Host receives join request from guest
          if (!isHostRef.current) return;
          setRoomState((prev) => {
            if (!prev) return prev;

            const hostColor = prev.players.red?.id === myPlayerId ? 'red' : 'black';
            const guestColor: PieceColor = hostColor === 'red' ? 'black' : 'red';

            const updatedState: OnlineRoomState = {
              ...prev,
              players: {
                ...prev.players,
                [guestColor]: {
                  id: data.playerId,
                  name: data.playerName,
                  color: guestColor,
                  connected: true,
                },
              },
              lastActivity: Date.now(),
            };

            // Send acceptance with full state to guest
            sendToPeer({
              type: 'JOIN_ACCEPTED',
              roomState: updatedState,
              assignedColor: guestColor,
              assignedId: data.playerId,
            });

            showNotification(`${data.playerName} odaya katıldı! Oyun başlıyor.`);
            return updatedState;
          });
          break;
        }

        case 'JOIN_ACCEPTED': {
          // Guest receives full room state from host
          setRoomState(data.roomState);
          setMyColor(data.assignedColor);
          setMyPlayerId(data.assignedId);
          setError(null);
          showNotification('Odaya başarıyla bağlanıldı! İyi oyunlar.');
          break;
        }

        case 'SYNC_MOVE': {
          setRoomState(data.roomState);
          break;
        }

        case 'CHAT': {
          setRoomState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              chatMessages: [...prev.chatMessages, data.message],
            };
          });
          break;
        }

        case 'RESIGN': {
          setRoomState((prev) => {
            if (!prev) return prev;
            const winnerColor: PieceColor = data.resignedBy === 'red' ? 'black' : 'red';
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
          setRoomState((prev) => {
            if (!prev) return prev;
            showNotification('Rakibiniz beraberlik teklif etti.');
            return {
              ...prev,
              drawOfferedBy: data.from,
            };
          });
          break;
        }

        case 'DRAW_RESPONSE': {
          if (data.accepted) {
            setRoomState((prev) => {
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
            setRoomState((prev) => {
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
          setRoomState((prev) => {
            if (!prev) return prev;
            if (prev.rematchRequestedBy && prev.rematchRequestedBy !== data.requestedBy) {
              // Both sides accepted rematch! Start fresh game with swapped colors
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
                rematchRequestedBy: data.requestedBy,
              };
            }
          });
          break;
        }

        default:
          break;
      }
    },
    [myPlayerId, sendToPeer, showNotification]
  );

  // Set up connection event listeners
  const setupConnectionListeners = useCallback(
    (conn: DataConnection) => {
      connRef.current = conn;

      conn.on('data', (data: any) => {
        handlePeerData(data);
      });

      conn.on('close', () => {
        showNotification('Rakibin bağlantısı kesildi.');
        setRoomState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            players: {
              red: prev.players.red ? { ...prev.players.red, connected: prev.players.red.id === myPlayerId } : null,
              black: prev.players.black ? { ...prev.players.black, connected: prev.players.black.id === myPlayerId } : null,
            },
          };
        });
      });

      conn.on('error', (err) => {
        console.error('DataConnection error:', err);
      });
    },
    [handlePeerData, myPlayerId, showNotification]
  );

  // Initialize Host Peer
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

      // Create initial authoritative state immediately
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

      setRoomState(initialRoom);

      // Initialize PeerJS host with deterministic ID
      const peerId = `${PEER_PREFIX}${roomId.toLowerCase()}`;
      try {
        const peer = new Peer(peerId, {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' },
            ],
          },
        });

        peer.on('open', () => {
          setIsConnected(true);
          setError(null);
        });

        peer.on('connection', (conn) => {
          setupConnectionListeners(conn);
        });

        peer.on('error', (err: any) => {
          console.error('Host peer error:', err);
          if (err.type === 'unavailable-id') {
            // Very rare collision: retry with a new code
            createRoom(variant, playerName, preferredColor);
          } else {
            setError('Bağlantı hatası: ' + (err.message || 'Lütfen tekrar deneyin.'));
          }
        });

        peerRef.current = peer;
      } catch (err: any) {
        console.error('Failed to create host peer:', err);
        setError('P2P ağına bağlanılamadı.');
      }
    },
    [cleanupConnections, setupConnectionListeners]
  );

  // Initialize Guest Peer & Join
  const joinRoom = useCallback(
    (roomIdInput: string, playerName: string) => {
      cleanupConnections();
      setError(null);
      isHostRef.current = false;
      setMyPlayerName(playerName);

      const cleanCode = roomIdInput.trim().toUpperCase();
      if (cleanCode.length < 4) {
        setError('Geçersiz oda kodu girdiniz.');
        return;
      }

      const guestId = 'p_' + Math.random().toString(36).substring(2, 9);
      setMyPlayerId(guestId);

      try {
        // Random guest peer ID
        const peer = new Peer({
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' },
            ],
          },
        });

        peer.on('open', () => {
          setIsConnected(true);
          setError(null);

          const targetHostId = `${PEER_PREFIX}${cleanCode.toLowerCase()}`;
          const conn = peer.connect(targetHostId, {
            reliable: true,
          });

          setupConnectionListeners(conn);

          conn.on('open', () => {
            conn.send({
              type: 'JOIN_REQUEST',
              playerName,
              playerId: guestId,
            });
          });
        });

        peer.on('error', (err: any) => {
          console.error('Guest peer error:', err);
          if (err.type === 'peer-unavailable') {
            setError('Oda bulunamadı veya kapatılmış. Oda kodunu kontrol edin.');
          } else {
            setError('Bağlantı kurulamadı: ' + (err.message || 'Hata oluştu'));
          }
        });

        peerRef.current = peer;
      } catch (err: any) {
        console.error('Failed to connect to room:', err);
        setError('Odaya bağlanılamadı.');
      }
    },
    [cleanupConnections, setupConnectionListeners]
  );

  // Quick Match: Tries joining an active pool or hosts one
  const quickMatch = useCallback(
    (variant: GameVariant, playerName: string) => {
      const qmCode = `QM${variant.substring(0, 3).toUpperCase()}1`;
      joinRoom(qmCode, playerName);

      // If peer is unavailable within 2.5 seconds, create as host on that code!
      const timer = setTimeout(() => {
        if (!roomState) {
          createRoom(variant, playerName, 'random');
        }
      }, 2500);

      return () => clearTimeout(timer);
    },
    [createRoom, joinRoom, roomState]
  );

  // Make Move Handler
  const makeMove = useCallback(
    (move: Move) => {
      if (!roomState) return;

      const { newBoard, hasFurtherJumps } = applyMove(
        roomState.board,
        move,
        roomState.variant
      );

      const nextTurn: PieceColor = hasFurtherJumps
        ? roomState.currentTurn
        : roomState.currentTurn === 'red'
        ? 'black'
        : 'red';

      const nextStatus = hasFurtherJumps
        ? 'playing'
        : checkGameStatus(newBoard, nextTurn, null, roomState.variant);

      const updatedState: OnlineRoomState = {
        ...roomState,
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
        moveCount: roomState.moveCount + 1,
        lastActivity: Date.now(),
      };

      setRoomState(updatedState);

      sendToPeer({
        type: 'SYNC_MOVE',
        move,
        roomState: updatedState,
      });
    },
    [roomState, sendToPeer]
  );

  // Resign
  const resign = useCallback(() => {
    if (!roomState || !myColor || myColor === 'spectator') return;

    const winnerColor: PieceColor = myColor === 'red' ? 'black' : 'red';
    const winningStatus = winnerColor === 'red' ? 'red_won' : 'black_won';

    const updatedState: OnlineRoomState = {
      ...roomState,
      status: winningStatus,
      winner: winnerColor,
      lastActivity: Date.now(),
    };

    setRoomState(updatedState);

    sendToPeer({
      type: 'RESIGN',
      resignedBy: myColor,
    });
  }, [myColor, roomState, sendToPeer]);

  // Offer Draw
  const offerDraw = useCallback(() => {
    if (!roomState || !myColor || myColor === 'spectator') return;

    setRoomState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        drawOfferedBy: myColor,
      };
    });

    sendToPeer({
      type: 'DRAW_OFFER',
      from: myColor,
    });

    showNotification('Beraberlik teklifi gönderildi.');
  }, [myColor, roomState, sendToPeer, showNotification]);

  // Respond to Draw
  const respondDraw = useCallback(
    (accepted: boolean) => {
      if (!roomState) return;

      if (accepted) {
        const updatedState: OnlineRoomState = {
          ...roomState,
          status: 'draw',
          winner: 'draw',
          drawOfferedBy: null,
          lastActivity: Date.now(),
        };
        setRoomState(updatedState);
        showNotification('Beraberlik teklifini kabul ettiniz. Oyun berabere.');
      } else {
        setRoomState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            drawOfferedBy: null,
          };
        });
        showNotification('Beraberlik teklifini reddettiniz.');
      }

      sendToPeer({
        type: 'DRAW_RESPONSE',
        accepted,
      });
    },
    [roomState, sendToPeer, showNotification]
  );

  // Request Rematch
  const requestRematch = useCallback(() => {
    if (!roomState || !myColor || myColor === 'spectator') return;

    setRoomState((prev) => {
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

        sendToPeer({
          type: 'REMATCH_REQUEST',
          requestedBy: myColor,
        });

        showNotification('Rövanş maçı başladı! İyi oyunlar.');
        return updatedState;
      } else {
        sendToPeer({
          type: 'REMATCH_REQUEST',
          requestedBy: myColor,
        });
        showNotification('Rövanş isteği rakibe iletildi.');
        return {
          ...prev,
          rematchRequestedBy: myColor,
        };
      }
    });
  }, [myColor, roomState, sendToPeer, showNotification]);

  // Send Chat
  const sendChat = useCallback(
    (text: string) => {
      if (!roomState || !text.trim()) return;

      const chatMsg: ChatMessage = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        sender: myPlayerName,
        senderColor: myColor === 'spectator' ? undefined : myColor || undefined,
        text: text.trim(),
        timestamp: Date.now(),
      };

      setRoomState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          chatMessages: [...prev.chatMessages, chatMsg],
        };
      });

      sendToPeer({
        type: 'CHAT',
        message: chatMsg,
      });
    },
    [myColor, myPlayerName, roomState, sendToPeer]
  );

  // Leave Room
  const leaveRoom = useCallback(() => {
    cleanupConnections();
    setRoomState(null);
    setMyColor(null);
    setMyPlayerId(null);
    setError(null);
  }, [cleanupConnections]);

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
