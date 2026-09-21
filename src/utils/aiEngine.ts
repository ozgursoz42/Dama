import { Board, Difficulty, GameVariant, Move, PieceColor, Position } from '../types';
import {
  applyMove,
  BOARD_SIZE,
  getAllLegalMoves,
  isPlayableSquare,
} from './checkersLogic';

// Positional center dominance matrix
const CENTER_WEIGHTS = [
  [1, 2, 2, 2, 2, 2, 2, 1],
  [2, 5, 6, 6, 6, 6, 5, 2],
  [2, 6, 8, 8, 8, 8, 6, 2],
  [2, 6, 9, 9, 9, 9, 6, 2],
  [2, 6, 9, 9, 9, 9, 6, 2],
  [2, 6, 8, 8, 8, 8, 6, 2],
  [2, 5, 6, 6, 6, 6, 5, 2],
  [1, 2, 2, 2, 2, 2, 2, 1],
];

/**
 * Heuristic evaluation function for a checkers/dama board state
 */
function evaluateBoard(board: Board, aiColor: PieceColor, variant: GameVariant = 'turkish'): number {
  let score = 0;
  let aiPieceCount = 0;
  let oppPieceCount = 0;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!isPlayableSquare(r, c, variant)) continue;
      const piece = board[r][c];
      if (!piece) continue;

      const isAi = piece.color === aiColor;
      const multiplier = isAi ? 1 : -1;
      if (isAi) aiPieceCount++;
      else oppPieceCount++;

      // In Turkish Dama, Dama (King/Rook) is extremely powerful because it flies across lines
      const kingValue = variant === 'turkish' ? 400 : 220;
      const baseValue = piece.type === 'king' ? kingValue : 100;
      score += baseValue * multiplier;

      // Positional center dominance bonus
      score += CENTER_WEIGHTS[r][c] * 2 * multiplier;

      // Men advancement bonus (encouraging promotion)
      if (piece.type === 'man') {
        const advancement = piece.color === 'red' ? (7 - r) * 5 : r * 5;
        score += advancement * multiplier;

        // Back rank protection: keeping home pieces guarded prevents opponent from making dama early
        if (
          (piece.color === 'red' && r >= 6) ||
          (piece.color === 'black' && r <= 1)
        ) {
          score += 8 * multiplier;
        }
      } else {
        // King activity bonus
        score += 15 * multiplier;
      }
    }
  }

  // Terminal states
  if (oppPieceCount === 0) return 10000;
  if (aiPieceCount === 0) return -10000;

  return score;
}

/**
 * Executes a full turn for AI, including chained multi-jumps if applicable.
 */
export function getAiTurnMoves(
  board: Board,
  aiColor: PieceColor,
  difficulty: Difficulty,
  variant: GameVariant = 'turkish'
): Move[] {
  const legalMoves = getAllLegalMoves(board, aiColor, null, variant);
  if (legalMoves.length === 0) return [];

  // Pick primary move based on difficulty
  let selectedMove: Move;

  switch (difficulty) {
    case 'easy':
      selectedMove = pickEasyMove(legalMoves);
      break;
    case 'medium':
      selectedMove = pickMediumMove(board, legalMoves, aiColor, variant);
      break;
    case 'hard':
      selectedMove = pickMinimaxMove(board, legalMoves, aiColor, 3, variant);
      break;
    case 'expert':
    default:
      selectedMove = pickMinimaxMove(board, legalMoves, aiColor, 4, variant);
      break;
  }

  return [selectedMove];
}

/**
 * Easy: 70% random, 30% heuristic
 */
function pickEasyMove(moves: Move[]): Move {
  const randomIndex = Math.floor(Math.random() * moves.length);
  return moves[randomIndex];
}

/**
 * Medium: 1-ply greedy evaluation
 */
function pickMediumMove(
  board: Board,
  moves: Move[],
  aiColor: PieceColor,
  variant: GameVariant
): Move {
  let bestScore = -Infinity;
  let bestMoves: Move[] = [];

  for (const move of moves) {
    const { newBoard } = applyMove(board, move, variant);
    const score = evaluateBoard(newBoard, aiColor, variant) + (Math.random() * 20 - 10);

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)] || moves[0];
}

/**
 * Minimax with Alpha-Beta Pruning
 */
function pickMinimaxMove(
  board: Board,
  moves: Move[],
  aiColor: PieceColor,
  depth: number,
  variant: GameVariant
): Move {
  let bestScore = -Infinity;
  let bestMoves: Move[] = [];

  // Sort captures first for alpha-beta cutoff
  const sortedMoves = [...moves].sort((a, b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0));

  for (const move of sortedMoves) {
    const { newBoard, hasFurtherJumps } = applyMove(board, move, variant);

    let score: number;
    if (hasFurtherJumps) {
      score = minimax(newBoard, depth, -Infinity, Infinity, true, aiColor, move.to, variant);
    } else {
      score = minimax(newBoard, depth - 1, -Infinity, Infinity, false, aiColor, null, variant);
    }

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)] || moves[0];
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiColor: PieceColor,
  activePos: Position | null,
  variant: GameVariant
): number {
  const currentColor = isMaximizing ? aiColor : (aiColor === 'red' ? 'black' : 'red');
  const legalMoves = getAllLegalMoves(board, currentColor, activePos, variant);

  if (legalMoves.length === 0) {
    return isMaximizing ? -9999 + depth : 9999 - depth;
  }

  if (depth <= 0) {
    return evaluateBoard(board, aiColor, variant);
  }

  legalMoves.sort((a, b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0));

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of legalMoves) {
      const { newBoard, hasFurtherJumps } = applyMove(board, move, variant);
      let evaluation: number;

      if (hasFurtherJumps) {
        evaluation = minimax(newBoard, depth, alpha, beta, true, aiColor, move.to, variant);
      } else {
        evaluation = minimax(newBoard, depth - 1, alpha, beta, false, aiColor, null, variant);
      }

      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of legalMoves) {
      const { newBoard, hasFurtherJumps } = applyMove(board, move, variant);
      let evaluation: number;

      if (hasFurtherJumps) {
        evaluation = minimax(newBoard, depth, alpha, beta, false, aiColor, move.to, variant);
      } else {
        evaluation = minimax(newBoard, depth - 1, alpha, beta, true, aiColor, null, variant);
      }

      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}
