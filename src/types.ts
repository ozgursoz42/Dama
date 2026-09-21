export type PieceColor = 'red' | 'black';
export type PieceType = 'man' | 'king';
export type GameVariant = 'turkish' | 'diagonal';

export interface Piece {
  id: string;
  color: PieceColor;
  type: PieceType;
}

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: Position;
  to: Position;
  captured?: Position;
  isKingPromotion?: boolean;
  captureCount?: number;
}

export type Board = (Piece | null)[][];

export type GameMode = 'ai' | 'pvp' | 'online';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type GameStatus = 'playing' | 'red_won' | 'black_won' | 'draw';
export type BoardTheme = 'walnut' | 'mahogany' | 'ebony';

export interface GameHistoryEntry {
  board: Board;
  turn: PieceColor;
  capturedByRed: number;
  capturedByBlack: number;
  lastMove?: { from: Position; to: Position };
}

export interface GameSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  theme: BoardTheme;
  difficulty: Difficulty;
  playerColor: PieceColor;
  variant: GameVariant;
}

export interface OnlinePlayer {
  id: string;
  name: string;
  color: PieceColor;
  connected: boolean;
}

export interface ChatMessage {
  id: string;
  sender: string;
  senderColor?: PieceColor;
  text: string;
  timestamp: number;
}

export interface OnlineRoomState {
  roomId: string;
  variant: GameVariant;
  board: Board;
  currentTurn: PieceColor;
  multiJumpPiecePos: Position | null;
  lastMove: { from: Position; to: Position } | null;
  status: GameStatus;
  winner?: PieceColor | 'draw';
  players: {
    red: OnlinePlayer | null;
    black: OnlinePlayer | null;
  };
  spectatorsCount: number;
  drawOfferedBy: PieceColor | null;
  rematchRequestedBy: PieceColor | null;
  moveCount: number;
  chatMessages: ChatMessage[];
  lastActivity: number;
}

export interface OnlineRoomSummary {
  roomId: string;
  variant: GameVariant;
  status: GameStatus;
  playerCount: number;
  hostName: string;
}
