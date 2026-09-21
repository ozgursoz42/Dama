import React from 'react';
import { BoardTheme, GameVariant } from '../types';

interface EmptyBoardPreviewProps {
  theme: BoardTheme;
  variant: GameVariant;
}

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const ROW_LABELS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export const EmptyBoardPreview: React.FC<EmptyBoardPreviewProps> = ({ theme, variant }) => {
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

  return (
    <div className="relative my-2 sm:my-3 flex items-center justify-center">
      {/* Ambient Wooden Reflection & Subtle Glow */}
      <div className="absolute inset-0 bg-amber-500/10 rounded-2xl blur-xl pointer-events-none" />

      {/* Outer Wooden Board Frame with Brass Corners */}
      <div
        className={`relative w-44 h-44 sm:w-52 sm:h-52 aspect-square rounded-2xl p-2 sm:p-2.5 ${boardFrameClass} border border-amber-400/35 shadow-[0_15px_35px_rgba(0,0,0,0.85)] select-none transition-all duration-300`}
      >
        {/* Brass Corner Brackets */}
        <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-400/60 rounded-tl-sm pointer-events-none" />
        <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-amber-400/60 rounded-tr-sm pointer-events-none" />
        <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-amber-400/60 rounded-bl-sm pointer-events-none" />
        <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-amber-400/60 rounded-br-sm pointer-events-none" />

        {/* Top File Labels (A-H) */}
        <div className="flex justify-between px-2 mb-0.5 text-[7px] sm:text-[8px] font-bold text-amber-200/50 tracking-wider">
          {COL_LABELS.map((col) => (
            <span key={col} className="w-full text-center">{col}</span>
          ))}
        </div>

        {/* Middle Board Area with Rank Labels and 8x8 Grid */}
        <div className="flex items-center w-full h-[calc(100%-20px)] sm:h-[calc(100%-24px)]">
          {/* Left Rank Labels (8-1) */}
          <div className="flex flex-col justify-between pr-0.5 text-[7px] sm:text-[8px] font-bold text-amber-200/50 h-full">
            {ROW_LABELS.map((row) => (
              <span key={row} className="h-full flex items-center justify-center">{row}</span>
            ))}
          </div>

          {/* 8x8 Empty Checkers Grid (No Pieces) */}
          <div className="grid grid-cols-8 grid-rows-8 w-full h-full rounded-md overflow-hidden border border-black/60 shadow-inner bg-black/40">
            {Array.from({ length: 8 }).map((_, r) =>
              Array.from({ length: 8 }).map((_, c) => {
                const isDark = (r + c) % 2 === 1;
                return (
                  <div
                    key={`${r}-${c}`}
                    className={`relative w-full h-full border border-black/15 transition-colors ${
                      isDark ? darkSquareClass : lightSquareClass
                    }`}
                  />
                );
              })
            )}
          </div>

          {/* Right Rank Labels (8-1) */}
          <div className="flex flex-col justify-between pl-0.5 text-[7px] sm:text-[8px] font-bold text-amber-200/50 h-full">
            {ROW_LABELS.map((row) => (
              <span key={row} className="h-full flex items-center justify-center">{row}</span>
            ))}
          </div>
        </div>

        {/* Bottom File Labels (A-H) */}
        <div className="flex justify-between px-2 mt-0.5 text-[7px] sm:text-[8px] font-bold text-amber-200/50 tracking-wider">
          {COL_LABELS.map((col) => (
            <span key={col} className="w-full text-center">{col}</span>
          ))}
        </div>
      </div>
    </div>
  );
};
