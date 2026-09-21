import React from 'react';
import { Crown, Bot, User, AlertCircle, RefreshCw, Home } from 'lucide-react';
import { GameMode, PieceColor, Difficulty, GameVariant } from '../types';

interface ScoreBoardProps {
  currentTurn: PieceColor;
  gameMode: GameMode;
  difficulty: Difficulty;
  isAiThinking: boolean;
  playerColor: PieceColor;
  redPieces: number;
  redKings: number;
  blackPieces: number;
  blackKings: number;
  capturedByRed: number;
  capturedByBlack: number;
  isMandatoryCaptureActive: boolean;
  variant: GameVariant;
  onToggleVariant?: () => void;
  onExitToHome?: () => void;
  customRedName?: string;
  customBlackName?: string;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  currentTurn,
  gameMode,
  difficulty,
  isAiThinking,
  playerColor,
  redPieces,
  redKings,
  blackPieces,
  blackKings,
  capturedByRed,
  capturedByBlack,
  isMandatoryCaptureActive,
  variant,
  onToggleVariant,
  onExitToHome,
  customRedName,
  customBlackName,
}) => {
  const isRedTurn = currentTurn === 'red';
  const isBlackTurn = currentTurn === 'black';

  const getRedName = () => {
    if (customRedName) return customRedName;
    if (gameMode === 'ai') {
      return playerColor === 'red' ? 'SİZ' : 'YAPAY ZEKA';
    }
    return 'KIRMIZI';
  };

  const getBlackName = () => {
    if (customBlackName) return customBlackName;
    if (gameMode === 'ai') {
      return playerColor === 'black' ? 'SİZ' : `YZ (${difficulty.toUpperCase()})`;
    }
    return 'SİYAH';
  };

  return (
    <div className="w-full max-w-md mx-auto px-2 py-1">
      {/* Top Subheader showing Menu, Active Variant, and Mode */}
      <div className="flex items-center justify-between px-1 mb-1.5 gap-1.5">
        {onExitToHome && (
          <button
            id="btn-scoreboard-home"
            onClick={onExitToHome}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900 border border-white/10 hover:border-amber-400/60 text-zinc-300 hover:text-amber-300 text-[10.5px] font-bold tracking-wider uppercase transition-colors shrink-0"
            title="Ana Menüye Dön"
          >
            <Home className="w-3.5 h-3.5 text-amber-400" />
            <span>ANA MENÜ</span>
          </button>
        )}

        <button
          onClick={onToggleVariant}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-white/10 hover:border-amber-400/50 text-amber-300 text-[10.5px] font-bold tracking-wider uppercase transition-colors truncate"
          title="Dama türünü değiştirmek için tıklayın"
        >
          <span>{variant === 'turkish' ? '🇹🇷 TÜRK DAMASI' : '⚔️ ÇAPRAZ DAMA'}</span>
          <RefreshCw className="w-2.5 h-2.5 opacity-60 shrink-0" />
        </button>

        <span className="text-[10px] text-zinc-400 font-medium tracking-wide shrink-0">
          {gameMode === 'ai' ? `YZ: ${difficulty.toUpperCase()}` : '2 OYUNCU'}
        </span>
      </div>

      <div className="bg-[#18191E]/90 border border-white/10 rounded-2xl p-2 shadow-xl backdrop-blur-md flex items-center justify-between">
        
        {/* Red Player Card */}
        <div
          className={`flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all duration-300 ${
            isRedTurn
              ? 'bg-red-950/50 border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
              : 'bg-transparent border border-transparent opacity-70'
          }`}
        >
          {/* Piece Avatar */}
          <div className="relative">
            <div className="w-7 h-7 rounded-full piece-red flex items-center justify-center shadow-md">
              {redKings > 0 && <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300/60" />}
            </div>
            {isRedTurn && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
            )}
          </div>

          <div className="text-left">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold tracking-wider text-red-200">
                {getRedName()}
              </span>
              {gameMode === 'ai' && playerColor === 'red' && (
                <User className="w-3 h-3 text-red-400" />
              )}
            </div>
            <div className="text-[11px] font-medium text-white/60 flex items-center gap-2">
              <span>{redPieces} Taş</span>
              {capturedByRed > 0 && (
                <span className="text-emerald-400 font-semibold">+{capturedByRed}</span>
              )}
            </div>
          </div>
        </div>

        {/* Center Turn / Status Capsule */}
        <div className="flex flex-col items-center justify-center px-1">
          {isAiThinking ? (
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-medium animate-pulse">
              <Bot className="w-3.5 h-3.5" />
              <span>Düşünüyor...</span>
            </div>
          ) : isMandatoryCaptureActive ? (
            <div className="flex items-center gap-1 text-amber-400 text-[10px] font-bold tracking-wider uppercase animate-bounce">
              <AlertCircle className="w-3 h-3" />
              <span>Taş Al!</span>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-[9px] font-semibold uppercase tracking-widest text-white/40">
                SIRA
              </div>
              <div
                className={`text-xs font-bold uppercase tracking-wider ${
                  isRedTurn ? 'text-red-400' : 'text-zinc-300'
                }`}
              >
                {isRedTurn ? 'Kırmızı' : 'Siyah'}
              </div>
            </div>
          )}
        </div>

        {/* Black Player Card */}
        <div
          className={`flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all duration-300 ${
            isBlackTurn
              ? 'bg-zinc-800/80 border border-zinc-500/40 shadow-[0_0_15px_rgba(255,255,255,0.1)]'
              : 'bg-transparent border border-transparent opacity-70'
          }`}
        >
          <div className="text-right">
            <div className="flex items-center justify-end gap-1">
              {gameMode === 'ai' && playerColor !== 'black' && (
                <Bot className="w-3 h-3 text-zinc-400" />
              )}
              <span className="text-xs font-bold tracking-wider text-zinc-200">
                {getBlackName()}
              </span>
            </div>
            <div className="text-[11px] font-medium text-white/60 flex items-center justify-end gap-2">
              {capturedByBlack > 0 && (
                <span className="text-emerald-400 font-semibold">+{capturedByBlack}</span>
              )}
              <span>{blackPieces} Taş</span>
            </div>
          </div>

          {/* Piece Avatar */}
          <div className="relative">
            <div className="w-7 h-7 rounded-full piece-black flex items-center justify-center shadow-md">
              {blackKings > 0 && <Crown className="w-3.5 h-3.5 text-zinc-200 fill-zinc-200/50" />}
            </div>
            {isBlackTurn && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-zinc-300"></span>
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
