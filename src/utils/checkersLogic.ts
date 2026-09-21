import { Board, Piece, PieceColor, Position, Move, GameVariant } from '../types';

export const BOARD_SIZE = 8;

/**
 * Creates the initial 8x8 checkers board setup
 * Turkish variant:
 * - Rows 1 & 2: 16 Black pieces (all 8 columns)
 * - Rows 3 & 4: Empty
 * - Rows 5 & 6: 16 Red pieces (all 8 columns)
 * - Rows 0 & 7: Empty back ranks
 *
 * Diagonal variant:
 * - Rows 0-2: 12 Black pieces on dark squares
 * - Rows 3-4: Empty
 * - Rows 5-7: 12 Red pieces on dark squares
 */
export function createInitialBoard(variant: GameVariant = 'turkish'): Board {
  const board: Board = Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(null));

  let idCounter = 1;

  if (variant === 'turkish') {
    // Turkish Dama: 16 pieces per player on rows 1,2 and 5,6 across all 8 columns
    for (let col = 0; col < BOARD_SIZE; col++) {
      // Black pieces on rows 1 and 2
      board[1][col] = {
        id: `b_${idCounter++}`,
        color: 'black',
        type: 'man',
      };
      board[2][col] = {
        id: `b_${idCounter++}`,
        color: 'black',
        type: 'man',
      };

      // Red pieces on rows 5 and 6
      board[5][col] = {
        id: `r_${idCounter++}`,
        color: 'red',
        type: 'man',
      };
      board[6][col] = {
        id: `r_${idCounter++}`,
        color: 'red',
        type: 'man',
      };
    }
  } else {
    // Classic Diagonal Checkers: 12 pieces per player on dark squares
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if ((row + col) % 2 === 1) {
          if (row < 3) {
            board[row][col] = {
              id: `b_${idCounter++}`,
              color: 'black',
              type: 'man',
            };
          } else if (row > 4) {
            board[row][col] = {
              id: `r_${idCounter++}`,
              color: 'red',
              type: 'man',
            };
          }
        }
      }
    }
  }

  return board;
}

/**
 * Deep clones the board matrix
 */
export function cloneBoard(board: Board): Board {
  return board.map((row) =>
    row.map((cell) => (cell ? { ...cell } : null))
  );
}

/**
 * Checks if a coordinate is within board bounds
 */
export function isWithinBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

/**
 * Returns whether a square is playable for the given variant
 * In Turkish Dama: all 64 squares are playable!
 * In Diagonal Checkers: only dark squares are playable ((row + col) % 2 === 1)
 */
export function isPlayableSquare(row: number, col: number, variant: GameVariant = 'turkish'): boolean {
  if (!isWithinBounds(row, col)) return false;
  if (variant === 'turkish') return true;
  return (row + col) % 2 === 1;
}

/**
 * Gets simple (non-capture) 1-step moves for a specific piece
 */
export function getPieceSimpleMoves(board: Board, pos: Position, variant: GameVariant = 'turkish'): Move[] {
  const piece = board[pos.row][pos.col];
  if (!piece) return [];

  const moves: Move[] = [];

  if (variant === 'turkish') {
    // Turkish Dama
    if (piece.type === 'king') {
      // Dama (Flying King): moves any number of empty squares horizontally and vertically
      const directions: Position[] = [
        { row: -1, col: 0 },
        { row: 1, col: 0 },
        { row: 0, col: -1 },
        { row: 0, col: 1 },
      ];

      for (const dir of directions) {
        let step = 1;
        while (true) {
          const targetRow = pos.row + dir.row * step;
          const targetCol = pos.col + dir.col * step;

          if (!isWithinBounds(targetRow, targetCol)) break;
          if (board[targetRow][targetCol] !== null) break; // Blocked by piece

          moves.push({
            from: { row: pos.row, col: pos.col },
            to: { row: targetRow, col: targetCol },
          });

          step++;
        }
      }
    } else {
      // Normal man: moves 1 square forward, left, or right (NO backward, NO diagonal!)
      const forwardDir = piece.color === 'red' ? -1 : 1;
      const directions: Position[] = [
        { row: forwardDir, col: 0 }, // Forward
        { row: 0, col: -1 },         // Left
        { row: 0, col: 1 },          // Right
      ];

      for (const dir of directions) {
        const targetRow = pos.row + dir.row;
        const targetCol = pos.col + dir.col;

        if (isWithinBounds(targetRow, targetCol) && board[targetRow][targetCol] === null) {
          const isKingPromotion =
            (piece.color === 'red' && targetRow === 0) ||
            (piece.color === 'black' && targetRow === BOARD_SIZE - 1);

          moves.push({
            from: { row: pos.row, col: pos.col },
            to: { row: targetRow, col: targetCol },
            isKingPromotion,
          });
        }
      }
    }
  } else {
    // Diagonal Checkers
    const directions: Position[] = [];

    if (piece.type === 'king') {
      directions.push(
        { row: -1, col: -1 },
        { row: -1, col: 1 },
        { row: 1, col: -1 },
        { row: 1, col: 1 }
      );
    } else if (piece.color === 'red') {
      directions.push({ row: -1, col: -1 }, { row: -1, col: 1 });
    } else {
      directions.push({ row: 1, col: -1 }, { row: 1, col: 1 });
    }

    for (const dir of directions) {
      const targetRow = pos.row + dir.row;
      const targetCol = pos.col + dir.col;

      if (isWithinBounds(targetRow, targetCol) && board[targetRow][targetCol] === null) {
        const isKingPromotion =
          piece.type === 'man' &&
          ((piece.color === 'red' && targetRow === 0) ||
            (piece.color === 'black' && targetRow === BOARD_SIZE - 1));

        moves.push({
          from: { row: pos.row, col: pos.col },
          to: { row: targetRow, col: targetCol },
          isKingPromotion,
        });
      }
    }
  }

  return moves;
}

/**
 * Gets all single-step capture moves available for a specific piece at (row, col)
 */
export function getPieceCaptures(board: Board, pos: Position, variant: GameVariant = 'turkish'): Move[] {
  const piece = board[pos.row][pos.col];
  if (!piece) return [];

  const captures: Move[] = [];

  if (variant === 'turkish') {
    // Turkish Dama Captures
    if (piece.type === 'king') {
      // Dama (Flying King):
      // In any of the 4 orthogonal directions, can jump over an enemy piece at any distance,
      // and land on ANY empty square beyond that enemy piece!
      const directions: Position[] = [
        { row: -1, col: 0 },
        { row: 1, col: 0 },
        { row: 0, col: -1 },
        { row: 0, col: 1 },
      ];

      for (const dir of directions) {
        let step = 1;
        let foundOpponent: Position | null = null;

        while (true) {
          const r = pos.row + dir.row * step;
          const c = pos.col + dir.col * step;

          if (!isWithinBounds(r, c)) break;
          const currentCell = board[r][c];

          if (!foundOpponent) {
            if (currentCell === null) {
              // Empty square before opponent, keep looking
              step++;
              continue;
            } else if (currentCell.color !== piece.color) {
              // Found enemy piece!
              foundOpponent = { row: r, col: c };
              step++;
              continue;
            } else {
              // Hit friendly piece, blocked in this direction
              break;
            }
          } else {
            // We already passed an opponent piece; every consecutive empty square is a valid landing square!
            if (currentCell === null) {
              captures.push({
                from: { row: pos.row, col: pos.col },
                to: { row: r, col: c },
                captured: foundOpponent,
              });
              step++;
            } else {
              // Hit another piece beyond the captured one, stop
              break;
            }
          }
        }
      }
    } else {
      // Normal man: jumps orthogonally forward, left, or right (NO backward, NO diagonal!)
      const forwardDir = piece.color === 'red' ? -1 : 1;
      const directions: Position[] = [
        { row: forwardDir, col: 0 }, // Forward jump
        { row: 0, col: -1 },         // Left jump
        { row: 0, col: 1 },          // Right jump
      ];

      for (const dir of directions) {
        const jumpOverRow = pos.row + dir.row;
        const jumpOverCol = pos.col + dir.col;
        const landRow = pos.row + dir.row * 2;
        const landCol = pos.col + dir.col * 2;

        if (isWithinBounds(landRow, landCol)) {
          const targetPiece = board[jumpOverRow][jumpOverCol];
          const landingSquare = board[landRow][landCol];

          if (
            targetPiece &&
            targetPiece.color !== piece.color &&
            landingSquare === null
          ) {
            const isKingPromotion =
              (piece.color === 'red' && landRow === 0) ||
              (piece.color === 'black' && landRow === BOARD_SIZE - 1);

            captures.push({
              from: { row: pos.row, col: pos.col },
              to: { row: landRow, col: landCol },
              captured: { row: jumpOverRow, col: jumpOverCol },
              isKingPromotion,
            });
          }
        }
      }
    }
  } else {
    // Diagonal Checkers Captures
    const directions: Position[] = [];

    if (piece.type === 'king') {
      directions.push(
        { row: -1, col: -1 },
        { row: -1, col: 1 },
        { row: 1, col: -1 },
        { row: 1, col: 1 }
      );
    } else if (piece.color === 'red') {
      directions.push({ row: -1, col: -1 }, { row: -1, col: 1 });
    } else {
      directions.push({ row: 1, col: -1 }, { row: 1, col: 1 });
    }

    for (const dir of directions) {
      const jumpOverRow = pos.row + dir.row;
      const jumpOverCol = pos.col + dir.col;
      const landRow = pos.row + dir.row * 2;
      const landCol = pos.col + dir.col * 2;

      if (isWithinBounds(landRow, landCol)) {
        const targetPiece = board[jumpOverRow][jumpOverCol];
        const landingSquare = board[landRow][landCol];

        if (
          targetPiece &&
          targetPiece.color !== piece.color &&
          landingSquare === null
        ) {
          const isKingPromotion =
            piece.type === 'man' &&
            ((piece.color === 'red' && landRow === 0) ||
              (piece.color === 'black' && landRow === BOARD_SIZE - 1));

          captures.push({
            from: { row: pos.row, col: pos.col },
            to: { row: landRow, col: landCol },
            captured: { row: jumpOverRow, col: jumpOverCol },
            isKingPromotion,
          });
        }
      }
    }
  }

  return captures;
}

/**
 * Finds all capture moves for a player
 */
export function getAllPlayerCaptures(board: Board, color: PieceColor, variant: GameVariant = 'turkish'): Move[] {
  const allCaptures: Move[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        const caps = getPieceCaptures(board, { row, col }, variant);
        allCaptures.push(...caps);
      }
    }
  }
  return allCaptures;
}

/**
 * Computes the maximum number of pieces that can be captured starting with a given move.
 * In Turkish Dama, the "Majority Capture Rule" (Çoğunluk Kuralı) states that
 * if multiple captures exist, players MUST choose the move that yields the maximum captures.
 */
export function getMaxCapturesFromMove(board: Board, move: Move, variant: GameVariant = 'turkish'): number {
  if (!move.captured) return 0;

  const { newBoard, hasFurtherJumps } = applyMove(board, move, variant);
  if (!hasFurtherJumps) {
    return 1;
  }

  const nextJumps = getPieceCaptures(newBoard, move.to, variant);
  let maxNext = 0;
  for (const nextMove of nextJumps) {
    const count = getMaxCapturesFromMove(newBoard, nextMove, variant);
    if (count > maxNext) {
      maxNext = count;
    }
  }

  return 1 + maxNext;
}

/**
 * Gets all legal moves for a player.
 * Enforces mandatory captures and maximum capture rule in Turkish Dama.
 */
export function getAllLegalMoves(
  board: Board,
  color: PieceColor,
  activePiecePos: Position | null = null,
  variant: GameVariant = 'turkish'
): Move[] {
  // If an active piece is currently in a multi-jump streak, only its captures are allowed
  if (activePiecePos) {
    const pieceCaptures = getPieceCaptures(board, activePiecePos, variant);
    if (variant === 'turkish' && pieceCaptures.length > 0) {
      // Calculate max capture sequence length for this active piece
      const scoredMoves = pieceCaptures.map((m) => ({
        move: m,
        count: getMaxCapturesFromMove(board, m, variant),
      }));
      const maxCount = Math.max(...scoredMoves.map((sm) => sm.count));
      return scoredMoves.filter((sm) => sm.count === maxCount).map((sm) => sm.move);
    }
    return pieceCaptures;
  }

  const allCaptures = getAllPlayerCaptures(board, color, variant);

  if (allCaptures.length > 0) {
    if (variant === 'turkish') {
      // Enforce Majority Capture Rule (Çoğunluk Kuralı)
      const scoredMoves = allCaptures.map((m) => ({
        move: m,
        count: getMaxCapturesFromMove(board, m, variant),
      }));
      const maxCount = Math.max(...scoredMoves.map((sm) => sm.count));
      return scoredMoves.filter((sm) => sm.count === maxCount).map((sm) => sm.move);
    }
    return allCaptures;
  }

  // No captures exist: simple moves are legal
  const allMoves: Move[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        const simpleMoves = getPieceSimpleMoves(board, { row, col }, variant);
        allMoves.push(...simpleMoves);
      }
    }
  }

  return allMoves;
}

/**
 * Gets legal moves for a specific selected piece
 */
export function getLegalMovesForPosition(
  board: Board,
  pos: Position,
  color: PieceColor,
  activePiecePos: Position | null = null,
  variant: GameVariant = 'turkish'
): Move[] {
  const allLegal = getAllLegalMoves(board, color, activePiecePos, variant);
  return allLegal.filter(
    (m) => m.from.row === pos.row && m.from.col === pos.col
  );
}

/**
 * Executes a move on the board and returns the new board state,
 * whether it resulted in a king promotion, and if there are more jumps available.
 */
export function applyMove(
  board: Board,
  move: Move,
  variant: GameVariant = 'turkish'
): {
  newBoard: Board;
  promotedToKing: boolean;
  hasFurtherJumps: boolean;
  capturedPiece: Piece | null;
} {
  const newBoard = cloneBoard(board);
  const piece = newBoard[move.from.row][move.from.col];

  if (!piece) {
    throw new Error('No piece at source square');
  }

  let capturedPiece: Piece | null = null;

  // Clear source square
  newBoard[move.from.row][move.from.col] = null;

  // Handle capture removal
  if (move.captured) {
    capturedPiece = newBoard[move.captured.row][move.captured.col];
    newBoard[move.captured.row][move.captured.col] = null;
  }

  // Check king promotion
  let promoted = false;
  if (piece.type === 'man') {
    if (
      (piece.color === 'red' && move.to.row === 0) ||
      (piece.color === 'black' && move.to.row === BOARD_SIZE - 1)
    ) {
      piece.type = 'king';
      promoted = true;
    }
  }

  // Place piece at destination
  newBoard[move.to.row][move.to.col] = piece;

  // Check further jumps:
  // In Turkish Dama & standard checkers, if a man is crowned during a jump, its turn ends immediately.
  let hasFurtherJumps = false;
  if (move.captured && !promoted) {
    const nextJumps = getPieceCaptures(newBoard, move.to, variant);
    if (nextJumps.length > 0) {
      hasFurtherJumps = true;
    }
  }

  return {
    newBoard,
    promotedToKing: promoted,
    hasFurtherJumps,
    capturedPiece,
  };
}

/**
 * Counts total pieces and kings for each player
 */
export function countPieces(board: Board): {
  redPieces: number;
  redKings: number;
  blackPieces: number;
  blackKings: number;
} {
  let redPieces = 0;
  let redKings = 0;
  let blackPieces = 0;
  let blackKings = 0;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r][c];
      if (p) {
        if (p.color === 'red') {
          redPieces++;
          if (p.type === 'king') redKings++;
        } else {
          blackPieces++;
          if (p.type === 'king') blackKings++;
        }
      }
    }
  }

  return { redPieces, redKings, blackPieces, blackKings };
}

/**
 * Checks if the game has ended (no pieces or no legal moves)
 */
export function checkGameStatus(
  board: Board,
  currentTurn: PieceColor,
  activePiecePos: Position | null = null,
  variant: GameVariant = 'turkish'
): 'playing' | 'red_won' | 'black_won' | 'draw' {
  const { redPieces, blackPieces } = countPieces(board);

  if (redPieces === 0) return 'black_won';
  if (blackPieces === 0) return 'red_won';

  // Check legal moves for current player
  const legalMoves = getAllLegalMoves(board, currentTurn, activePiecePos, variant);
  if (legalMoves.length === 0) {
    // Current player has no moves left -> opponent wins!
    return currentTurn === 'red' ? 'black_won' : 'red_won';
  }

  return 'playing';
}
