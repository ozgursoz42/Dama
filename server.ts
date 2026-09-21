import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import {
  Board,
  GameStatus,
  GameVariant,
  Move,
  OnlinePlayer,
  OnlineRoomState,
  OnlineRoomSummary,
  PieceColor,
  Position,
  ChatMessage,
} from './src/types';
import {
  createInitialBoard,
  applyMove,
  checkGameStatus,
  getAllLegalMoves,
} from './src/utils/checkersLogic';

interface ConnectedPlayer extends OnlinePlayer {
  ws?: WebSocket;
  lastSeen: number;
}

interface Room {
  id: string;
  variant: GameVariant;
  board: Board;
  currentTurn: PieceColor;
  multiJumpPiecePos: Position | null;
  lastMove: { from: Position; to: Position } | null;
  status: GameStatus;
  winner?: PieceColor | 'draw';
  players: {
    red: ConnectedPlayer | null;
    black: ConnectedPlayer | null;
  };
  spectators: Map<string, { ws: WebSocket; name: string }>;
  drawOfferedBy: PieceColor | null;
  rematchRequestedBy: PieceColor | null;
  moveCount: number;
  chatMessages: ChatMessage[];
  lastActivity: number;
  isQuickMatch: boolean;
}

const rooms = new Map<string, Room>();

// Helper to generate a unique 6-character room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  if (rooms.has(code)) {
    return generateRoomCode();
  }
  return code;
}

// Convert Room to sanitized public OnlineRoomState for clients
function getPublicRoomState(room: Room): OnlineRoomState {
  return {
    roomId: room.id,
    variant: room.variant,
    board: room.board,
    currentTurn: room.currentTurn,
    multiJumpPiecePos: room.multiJumpPiecePos,
    lastMove: room.lastMove,
    status: room.status,
    winner: room.winner,
    players: {
      red: room.players.red
        ? {
            id: room.players.red.id,
            name: room.players.red.name,
            color: 'red',
            connected: Boolean(room.players.red.ws && room.players.red.ws.readyState === WebSocket.OPEN),
          }
        : null,
      black: room.players.black
        ? {
            id: room.players.black.id,
            name: room.players.black.name,
            color: 'black',
            connected: Boolean(room.players.black.ws && room.players.black.ws.readyState === WebSocket.OPEN),
          }
        : null,
    },
    spectatorsCount: room.spectators.size,
    drawOfferedBy: room.drawOfferedBy,
    rematchRequestedBy: room.rematchRequestedBy,
    moveCount: room.moveCount,
    chatMessages: room.chatMessages.slice(-50),
    lastActivity: room.lastActivity,
  };
}

// Broadcast a message to all sockets in a room
function broadcastToRoom(room: Room, message: Record<string, unknown>) {
  const payload = JSON.stringify(message);
  
  if (room.players.red?.ws && room.players.red.ws.readyState === WebSocket.OPEN) {
    room.players.red.ws.send(payload);
  }
  if (room.players.black?.ws && room.players.black.ws.readyState === WebSocket.OPEN) {
    room.players.black.ws.send(payload);
  }
  for (const [, spectator] of room.spectators) {
    if (spectator.ws.readyState === WebSocket.OPEN) {
      spectator.ws.send(payload);
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', onlineRooms: rooms.size });
  });

  // Get active public rooms list
  app.get('/api/rooms', (req, res) => {
    const list: OnlineRoomSummary[] = [];
    const now = Date.now();

    for (const [id, room] of rooms.entries()) {
      // Filter out stale rooms inactive for more than 15 minutes
      if (now - room.lastActivity > 15 * 60 * 1000) {
        continue;
      }
      
      const playerCount = (room.players.red ? 1 : 0) + (room.players.black ? 1 : 0);
      const hostName = room.players.red?.name || room.players.black?.name || 'Anonim';
      
      list.push({
        roomId: id,
        variant: room.variant,
        status: room.status,
        playerCount,
        hostName,
      });
    }

    res.json(list);
  });

  const server = http.createServer(app);

  // WebSocket Server setup on /ws
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    let currentRoomId: string | null = null;
    let playerId: string | null = null;
    let playerColor: PieceColor | 'spectator' | null = null;

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        const { type } = data;

        // 1. CREATE ROOM
        if (type === 'create_room') {
          const { variant = 'turkish', playerName = 'Oyuncu 1', preferredColor = 'random', isQuickMatch = false } = data;
          const roomId = generateRoomCode();
          
          let assignedColor: PieceColor = 'red';
          if (preferredColor === 'black') {
            assignedColor = 'black';
          } else if (preferredColor === 'random') {
            assignedColor = Math.random() < 0.5 ? 'red' : 'black';
          }

          playerId = `p_${Math.random().toString(36).substring(2, 9)}`;
          playerColor = assignedColor;
          currentRoomId = roomId;

          const playerObj: ConnectedPlayer = {
            id: playerId,
            name: playerName.trim() || 'Oyuncu 1',
            color: assignedColor,
            connected: true,
            lastSeen: Date.now(),
            ws,
          };

          const newRoom: Room = {
            id: roomId,
            variant,
            board: createInitialBoard(variant),
            currentTurn: 'red',
            multiJumpPiecePos: null,
            lastMove: null,
            status: 'playing',
            players: {
              red: assignedColor === 'red' ? playerObj : null,
              black: assignedColor === 'black' ? playerObj : null,
            },
            spectators: new Map(),
            drawOfferedBy: null,
            rematchRequestedBy: null,
            moveCount: 0,
            chatMessages: [
              {
                id: `m_${Date.now()}`,
                sender: 'Sistem',
                text: `Oda oluşturuldu (${roomId}). Rakip bekleniyor...`,
                timestamp: Date.now(),
              },
            ],
            lastActivity: Date.now(),
            isQuickMatch: Boolean(isQuickMatch),
          };

          rooms.set(roomId, newRoom);

          ws.send(
            JSON.stringify({
              type: 'room_joined',
              roomId,
              myColor: assignedColor,
              myPlayerId: playerId,
              roomState: getPublicRoomState(newRoom),
            })
          );
          return;
        }

        // 2. QUICK MATCH
        if (type === 'quick_match') {
          const { variant = 'turkish', playerName = 'Oyuncu' } = data;

          // Find an available waiting room with 1 player
          let matchedRoom: Room | null = null;
          for (const [, r] of rooms) {
            if (
              r.variant === variant &&
              ((r.players.red && !r.players.black) || (!r.players.red && r.players.black)) &&
              r.status === 'playing'
            ) {
              matchedRoom = r;
              break;
            }
          }

          if (matchedRoom) {
            // Join existing room
            const neededColor: PieceColor = matchedRoom.players.red ? 'black' : 'red';
            playerId = `p_${Math.random().toString(36).substring(2, 9)}`;
            playerColor = neededColor;
            currentRoomId = matchedRoom.id;

            const playerObj: ConnectedPlayer = {
              id: playerId,
              name: playerName.trim() || 'Oyuncu 2',
              color: neededColor,
              connected: true,
              lastSeen: Date.now(),
              ws,
            };

            matchedRoom.players[neededColor] = playerObj;
            matchedRoom.lastActivity = Date.now();
            matchedRoom.chatMessages.push({
              id: `m_${Date.now()}`,
              sender: 'Sistem',
              text: `${playerObj.name} katıldı! Oyun başladı.`,
              timestamp: Date.now(),
            });

            ws.send(
              JSON.stringify({
                type: 'room_joined',
                roomId: matchedRoom.id,
                myColor: neededColor,
                myPlayerId: playerId,
                roomState: getPublicRoomState(matchedRoom),
              })
            );

            broadcastToRoom(matchedRoom, {
              type: 'room_update',
              roomState: getPublicRoomState(matchedRoom),
              notification: `${playerObj.name} odaya katıldı!`,
            });
            return;
          }

          // No open room found, create a new one!
          const roomId = generateRoomCode();
          const assignedColor: PieceColor = Math.random() < 0.5 ? 'red' : 'black';
          playerId = `p_${Math.random().toString(36).substring(2, 9)}`;
          playerColor = assignedColor;
          currentRoomId = roomId;

          const playerObj: ConnectedPlayer = {
            id: playerId,
            name: playerName.trim() || 'Oyuncu 1',
            color: assignedColor,
            connected: true,
            lastSeen: Date.now(),
            ws,
          };

          const newRoom: Room = {
            id: roomId,
            variant,
            board: createInitialBoard(variant),
            currentTurn: 'red',
            multiJumpPiecePos: null,
            lastMove: null,
            status: 'playing',
            players: {
              red: assignedColor === 'red' ? playerObj : null,
              black: assignedColor === 'black' ? playerObj : null,
            },
            spectators: new Map(),
            drawOfferedBy: null,
            rematchRequestedBy: null,
            moveCount: 0,
            chatMessages: [
              {
                id: `m_${Date.now()}`,
                sender: 'Sistem',
                text: `Hızlı eşleşme odası oluşturuldu (${roomId}). Rakip aranıyor...`,
                timestamp: Date.now(),
              },
            ],
            lastActivity: Date.now(),
            isQuickMatch: true,
          };

          rooms.set(roomId, newRoom);

          ws.send(
            JSON.stringify({
              type: 'room_joined',
              roomId,
              myColor: assignedColor,
              myPlayerId: playerId,
              roomState: getPublicRoomState(newRoom),
            })
          );
          return;
        }

        // 3. JOIN ROOM
        if (type === 'join_room') {
          const { roomId, playerName = 'Misafir' } = data;
          const targetCode = (roomId || '').toUpperCase().trim();
          const room = rooms.get(targetCode);

          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: `Oda bulunamadı (${targetCode}). Kodu kontrol edin.` }));
            return;
          }

          currentRoomId = targetCode;
          playerId = `p_${Math.random().toString(36).substring(2, 9)}`;

          // Check if red or black is open
          if (!room.players.red) {
            playerColor = 'red';
            room.players.red = {
              id: playerId,
              name: playerName.trim() || 'Kırmızı Oyuncu',
              color: 'red',
              connected: true,
              lastSeen: Date.now(),
              ws,
            };
          } else if (!room.players.black) {
            playerColor = 'black';
            room.players.black = {
              id: playerId,
              name: playerName.trim() || 'Siyah Oyuncu',
              color: 'black',
              connected: true,
              lastSeen: Date.now(),
              ws,
            };
          } else {
            // Room is full, join as spectator
            playerColor = 'spectator';
            room.spectators.set(playerId, { ws, name: playerName.trim() || 'İzleyici' });
          }

          room.lastActivity = Date.now();
          room.chatMessages.push({
            id: `m_${Date.now()}`,
            sender: 'Sistem',
            text: `${playerName.trim()} odaya katıldı.`,
            timestamp: Date.now(),
          });

          ws.send(
            JSON.stringify({
              type: 'room_joined',
              roomId: room.id,
              myColor: playerColor,
              myPlayerId: playerId,
              roomState: getPublicRoomState(room),
            })
          );

          broadcastToRoom(room, {
            type: 'room_update',
            roomState: getPublicRoomState(room),
            notification: `${playerName.trim()} katıldı!`,
          });
          return;
        }

        // 4. MAKE MOVE
        if (type === 'make_move') {
          const { roomId, move } = data;
          const room = rooms.get(roomId);
          if (!room) return;

          if (playerColor !== 'red' && playerColor !== 'black') {
            ws.send(JSON.stringify({ type: 'error', message: 'İzleyiciler hamle yapamaz.' }));
            return;
          }

          if (room.currentTurn !== playerColor) {
            ws.send(JSON.stringify({ type: 'error', message: 'Sıra sizde değil.' }));
            return;
          }

          if (room.status !== 'playing') {
            ws.send(JSON.stringify({ type: 'error', message: 'Oyun sona erdi.' }));
            return;
          }

          // Apply move
          const { newBoard, promotedToKing, hasFurtherJumps } = applyMove(room.board, move, room.variant);
          room.board = newBoard;
          room.lastMove = { from: move.from, to: move.to };
          room.moveCount += 1;
          room.lastActivity = Date.now();

          let nextTurn = room.currentTurn;
          if (hasFurtherJumps) {
            room.multiJumpPiecePos = move.to;
          } else {
            room.multiJumpPiecePos = null;
            nextTurn = room.currentTurn === 'red' ? 'black' : 'red';
            room.currentTurn = nextTurn;

            // Check game status
            const gameStatus = checkGameStatus(newBoard, nextTurn, null, room.variant);
            room.status = gameStatus;
            if (gameStatus === 'red_won') {
              room.winner = 'red';
              room.chatMessages.push({
                id: `m_${Date.now()}`,
                sender: 'Sistem',
                text: 'Kırmızı oyuncu maçı kazandı!',
                timestamp: Date.now(),
              });
            } else if (gameStatus === 'black_won') {
              room.winner = 'black';
              room.chatMessages.push({
                id: `m_${Date.now()}`,
                sender: 'Sistem',
                text: 'Siyah oyuncu maçı kazandı!',
                timestamp: Date.now(),
              });
            } else if (gameStatus === 'draw') {
              room.winner = 'draw';
              room.chatMessages.push({
                id: `m_${Date.now()}`,
                sender: 'Sistem',
                text: 'Oyun beraberlikle sonuçlandı.',
                timestamp: Date.now(),
              });
            }
          }

          broadcastToRoom(room, {
            type: 'move_made',
            move,
            promotedToKing,
            hasFurtherJumps,
            roomState: getPublicRoomState(room),
          });
          return;
        }

        // 5. RESIGN (TERK ET)
        if (type === 'resign') {
          const { roomId } = data;
          const room = rooms.get(roomId);
          if (!room || room.status !== 'playing') return;

          if (playerColor === 'red' || playerColor === 'black') {
            const winner: PieceColor = playerColor === 'red' ? 'black' : 'red';
            room.status = winner === 'red' ? 'red_won' : 'black_won';
            room.winner = winner;
            const playerName = room.players[playerColor]?.name || (playerColor === 'red' ? 'Kırmızı' : 'Siyah');
            room.chatMessages.push({
              id: `m_${Date.now()}`,
              sender: 'Sistem',
              text: `${playerName} oyundan çekildi. ${winner === 'red' ? 'Kırmızı' : 'Siyah'} kazandı.`,
              timestamp: Date.now(),
            });

            broadcastToRoom(room, {
              type: 'room_update',
              roomState: getPublicRoomState(room),
              notification: `${playerName} çekildi!`,
            });
          }
          return;
        }

        // 6. OFFER DRAW
        if (type === 'offer_draw') {
          const { roomId } = data;
          const room = rooms.get(roomId);
          if (!room || room.status !== 'playing') return;

          if (playerColor === 'red' || playerColor === 'black') {
            room.drawOfferedBy = playerColor;
            const playerName = room.players[playerColor]?.name || 'Oyuncu';
            room.chatMessages.push({
              id: `m_${Date.now()}`,
              sender: 'Sistem',
              text: `${playerName} beraberlik teklif etti.`,
              timestamp: Date.now(),
            });

            broadcastToRoom(room, {
              type: 'room_update',
              roomState: getPublicRoomState(room),
              notification: `${playerName} beraberlik teklif etti.`,
            });
          }
          return;
        }

        // 7. RESPOND DRAW
        if (type === 'respond_draw') {
          const { roomId, accepted } = data;
          const room = rooms.get(roomId);
          if (!room || !room.drawOfferedBy) return;

          if (accepted) {
            room.status = 'draw';
            room.winner = 'draw';
            room.drawOfferedBy = null;
            room.chatMessages.push({
              id: `m_${Date.now()}`,
              sender: 'Sistem',
              text: 'Beraberlik teklifi kabul edildi. Oyun berabere.',
              timestamp: Date.now(),
            });
          } else {
            const decliner = playerColor === 'red' ? room.players.red?.name : room.players.black?.name;
            room.drawOfferedBy = null;
            room.chatMessages.push({
              id: `m_${Date.now()}`,
              sender: 'Sistem',
              text: `${decliner || 'Oyuncu'} beraberlik teklifini reddetti.`,
              timestamp: Date.now(),
            });
          }

          broadcastToRoom(room, {
            type: 'room_update',
            roomState: getPublicRoomState(room),
          });
          return;
        }

        // 8. REQUEST REMATCH
        if (type === 'request_rematch') {
          const { roomId } = data;
          const room = rooms.get(roomId);
          if (!room) return;

          if (playerColor === 'red' || playerColor === 'black') {
            if (room.rematchRequestedBy && room.rematchRequestedBy !== playerColor) {
              // Both agreed to rematch! Reset board
              room.board = createInitialBoard(room.variant);
              room.currentTurn = 'red';
              room.multiJumpPiecePos = null;
              room.lastMove = null;
              room.status = 'playing';
              room.winner = undefined;
              room.drawOfferedBy = null;
              room.rematchRequestedBy = null;
              room.moveCount = 0;
              room.chatMessages.push({
                id: `m_${Date.now()}`,
                sender: 'Sistem',
                text: 'Rövanş başladı! İyi oyunlar.',
                timestamp: Date.now(),
              });

              broadcastToRoom(room, {
                type: 'room_update',
                roomState: getPublicRoomState(room),
                notification: 'Rövanş başladı!',
              });
            } else {
              room.rematchRequestedBy = playerColor;
              const playerName = room.players[playerColor]?.name || 'Oyuncu';
              room.chatMessages.push({
                id: `m_${Date.now()}`,
                sender: 'Sistem',
                text: `${playerName} rövanş maçı teklif etti.`,
                timestamp: Date.now(),
              });

              broadcastToRoom(room, {
                type: 'room_update',
                roomState: getPublicRoomState(room),
                notification: `${playerName} rövanş istedi.`,
              });
            }
          }
          return;
        }

        // 9. CHAT MESSAGE
        if (type === 'chat') {
          const { roomId, text } = data;
          const room = rooms.get(roomId);
          if (!room || !text || typeof text !== 'string') return;

          const senderName =
            playerColor === 'red'
              ? room.players.red?.name || 'Kırmızı'
              : playerColor === 'black'
              ? room.players.black?.name || 'Siyah'
              : room.spectators.get(playerId || '')?.name || 'İzleyici';

          const msg: ChatMessage = {
            id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            sender: senderName,
            senderColor: playerColor === 'red' || playerColor === 'black' ? playerColor : undefined,
            text: text.trim().substring(0, 140),
            timestamp: Date.now(),
          };

          room.chatMessages.push(msg);
          room.lastActivity = Date.now();

          broadcastToRoom(room, {
            type: 'chat_message',
            message: msg,
          });
          return;
        }

        // 10. LEAVE ROOM
        if (type === 'leave_room') {
          const { roomId } = data;
          const room = rooms.get(roomId);
          if (room) {
            if (playerColor === 'red' && room.players.red?.id === playerId) {
              room.players.red = null;
            } else if (playerColor === 'black' && room.players.black?.id === playerId) {
              room.players.black = null;
            } else if (playerId) {
              room.spectators.delete(playerId);
            }

            broadcastToRoom(room, {
              type: 'room_update',
              roomState: getPublicRoomState(room),
              notification: 'Bir oyuncu odadan ayrıldı.',
            });
          }
          currentRoomId = null;
          playerId = null;
          playerColor = null;
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    });

    ws.on('close', () => {
      if (currentRoomId && rooms.has(currentRoomId)) {
        const room = rooms.get(currentRoomId)!;
        if (playerColor === 'red' && room.players.red?.id === playerId) {
          room.players.red.connected = false;
        } else if (playerColor === 'black' && room.players.black?.id === playerId) {
          room.players.black.connected = false;
        } else if (playerId) {
          room.spectators.delete(playerId);
        }

        broadcastToRoom(room, {
          type: 'room_update',
          roomState: getPublicRoomState(room),
        });
      }
    });
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
