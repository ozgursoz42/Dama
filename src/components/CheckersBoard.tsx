import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crown } from 'lucide-react';
import { Board, BoardTheme, Move, PieceColor, Position } from '../types';
import { BOARD_SIZE, isPlayableSquare } from '../utils/checkersLogic';

interface CheckersBoardProps {
  board: Board;
  currentTurn: PieceColor;
  theme: BoardTheme;
  selectedPos: Position | null;
  legalMovesForSelected: Move[];
  selectablePositions: Position[];
  multiJumpPiecePos: Position | null;
  lastMove: { from: Position; to: Position } | null;
  onSquareClick: (row: number, col: number) => void;
  isAiTurn: boolean;
  flipped?: boolean;
}

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const ROW_LABELS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export const CheckersBoard: React.FC<CheckersBoardProps> = ({
  board,
  theme,
  selectedPos,
  legalMovesForSelected,
  selectablePositions,
  multiJumpPiecePos,
  lastMove,
  onSquareClick,
  isAiTurn,
  flipped = false,
}) => {
  // Theme class mappings
  const boardFrameClass =
    theme === 'mahogany'
      ? 'wood-board-mahogany'
      : theme === 'ebony'
      ? 'wood-board-ebony'
      : 'wood-board-walnut';

  const darkSquareClass =
    theme === 'mahogany'
      ? 'square-dark-mahogany'
      : theme === 'ebony'
      ? 'square-dark-ebony'
      : 'square-dark-walnut';

  const lightSquareClass =
    theme === 'mahogany'
      ? 'square-light-mahogany'
      : theme === 'ebony'
      ? 'square-light-ebony'
      : 'square-light-walnut';

  // Helper to check if square is a legal destination
  const getLegalMoveForSquare = (row: number, col: number): Move | undefined => {
    return legalMovesForSelected.find(
      (m) => m.to.row === row && m.to.col === col
    );
  };

  // Helper to check if square has a selectable piece
  const isSelectable = (row: number, col: number): boolean => {
    if (isAiTurn) return false;
    return selectablePositions.some((p) => p.row === row && p.col === col);
  };

  // Helper to check if square is part of last move
  const isLastMoveSquare = (row: number, col: number): boolean => {
    if (!lastMove) return false;
    return (
      (lastMove.from.row === row && lastMove.from.col === col) ||
      (lastMove.to.row === row && lastMove.to.col === col)
    );
  };

  return (
    <div className="relative flex items-center justify-center p-1 w-full max-w-md mx-auto">
      {/* Outer Wooden Board Frame with Brass Bevels */}
      <div
        className={`relative w-full aspect-square rounded-2xl p-3 sm:p-3.5 ${boardFrameClass} select-none`}
        id="dama-board-container"
      >
        {/* Brass Corner Brackets */}
        <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-amber-400/40 rounded-tl-sm pointer-events-none" />
        <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-amber-400/40 rounded-tr-sm pointer-events-none" />
        <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-amber-400/40 rounded-bl-sm pointer-events-none" />
        <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-amber-400/40 rounded-br-sm pointer-events-none" />

        {/* Board Surface Grid with Inset Shadow */}
        <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl border border-black/60 grid grid-cols-8 grid-rows-8">
          {Array.from({ length: BOARD_SIZE }).map((_, dRow) =>
            Array.from({ length: BOARD_SIZE }).map((_, dCol) => {
              const row = flipped ? BOARD_SIZE - 1 - dRow : dRow;
              const col = flipped ? BOARD_SIZE - 1 - dCol : dCol;

              const isDark = (row + col) % 2 === 1;
              const piece = board[row][col];
              const isSelected =
                selectedPos?.row === row && selectedPos?.col === col;
              const legalMove = getLegalMoveForSquare(row, col);
              const isDestination = Boolean(legalMove);
              const isCaptureDestination = Boolean(legalMove?.captured);
              const selectable = isSelectable(row, col);
              const isMultiJumping =
                multiJumpPiecePos?.row === row && multiJumpPiecePos?.col === col;
              const isLastMove = isLastMoveSquare(row, col);

              return (
                <div
                  key={`sq-${row}-${col}`}
                  id={`square-${row}-${col}`}
                  onClick={() => onSquareClick(row, col)}
                  className={`relative flex items-center justify-center cursor-pointer transition-colors duration-200 ${
                    isDark ? darkSquareClass : lightSquareClass
                  } ${
                    isLastMove
                      ? 'after:absolute after:inset-0 after:bg-amber-400/10 after:pointer-events-none'
                      : ''
                  }`}
                >
                  {/* Subtle Coordinate Marks on Outer Squares */}
                  {dCol === 0 && (
                    <span className="absolute left-1 top-1 text-[9px] font-cinzel font-bold text-amber-200/30 pointer-events-none leading-none">
                      {ROW_LABELS[row]}
                    </span>
                  )}
                  {dRow === 7 && (
                    <span className="absolute right-1 bottom-1 text-[9px] font-cinzel font-bold text-amber-200/30 pointer-events-none leading-none">
                      {COL_LABELS[col]}
                    </span>
                  )}

                  {/* Piece Rendering */}
                  <AnimatePresence mode="wait">
                    {piece && (
                      <motion.div
                        key={`piece-${piece.id}`}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{
                          scale: isSelected ? 1.08 : 1,
                          opacity: 1,
                          y: isSelected ? -2 : 0,
                        }}
                        exit={{ scale: 0.5, opacity: 0, transition: { duration: 0.2 } }}
                        transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                        className={`relative w-[82%] h-[82%] rounded-full flex items-center justify-center cursor-pointer ${
                          piece.color === 'red' ? 'piece-red' : 'piece-black'
                        } ${
                          isSelected
                            ? 'ring-2 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.8)] z-20'
                            : isMultiJumping
                            ? 'ring-2 ring-amber-400 animate-gold-pulse z-20'
                            : selectable
                            ? 'ring-1 ring-amber-400/60 hover:ring-amber-400'
                            : ''
                        }`}
                      >
                        {/* Concentric Decorative Grooves */}
                        <div className="w-[74%] h-[74%] rounded-full piece-groove flex items-center justify-center">
                          <div className="w-[60%] h-[60%] rounded-full border border-white/10 flex items-center justify-center">
                            {/* Crown for King */}
                            {piece.type === 'king' && (
                              <motion.div
                                initial={{ rotate: -20, scale: 0 }}
                                animate={{ rotate: 0, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                              >
                                <Crown
                                  className={`w-4 h-4 sm:w-5 sm:h-5 drop-shadow-md ${
                                    piece.color === 'red'
                                      ? 'text-amber-300 fill-amber-300/80'
                                      : 'text-zinc-200 fill-zinc-200/70'
                                  }`}
                                />
                              </motion.div>
                            )}
                          </div>
                        </div>

                        {/* Mandatory Capture / Available Move Glow Indicator */}
                        {selectable && !isSelected && (
                          <div className="absolute -inset-0.5 rounded-full bg-amber-400/20 animate-pulse pointer-events-none" />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Destination Indicators */}
                  {isDestination && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                    >
                      {isCaptureDestination ? (
                        /* Pulsing capture target ring */
                        <div className="w-[70%] h-[70%] rounded-full border-2 border-dashed border-amber-400 bg-amber-400/25 flex items-center justify-center animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.6)]">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        </div>
                      ) : (
                        /* Clean movement target dot */
                        <div className="w-3.5 h-3.5 rounded-full bg-amber-400/90 shadow-[0_0_8px_rgba(251,191,36,0.8)] ring-2 ring-amber-300/50" />
                      )}
                    </motion.div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
