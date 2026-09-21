import React from 'react';
import { Trophy, Crown, RefreshCw, Home, Award } from 'lucide-react';
import { GameMode, GameStatus, PieceColor, GameVariant } from '../types';

interface GameOverModalProps {
  status: GameStatus;
  gameMode: GameMode;
  playerColor: PieceColor;
  moveCount: number;
  capturedByRed: number;
  capturedByBlack: number;
  onPlayAgain: () => void;
  onExitToMenu: () => void;
  variant?: GameVariant;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  status,
  gameMode,
  playerColor,
  moveCount,
  capturedByRed,
  capturedByBlack,
  onPlayAgain,
  onExitToMenu,
}) => {
  if (status === 'playing') return null;

  const isDraw = status === 'draw';
  const redWon = status === 'red_won';

  let title = '';
  let subtitle = '';
  let isWinnerUser = false;

  if (isDraw) {
    title = 'BERABERLİK';
    subtitle = 'İki taraf da eşit ustalıkla mücadele etti.';
  } else if (gameMode === 'ai') {
    const userWon = (redWon && playerColor === 'red') || (!redWon && playerColor === 'black');
    isWinnerUser = userWon;
    title = userWon ? 'TEBRİKLER! KAZANDINIZ' : 'YAPAY ZEKA KAZANDI';
    subtitle = userWon
      ? 'Üstün taktiksel vizyonunuzla yapay zekayı mağlup ettiniz.'
      : 'Yapay zeka bu maçı kazandı. Yeni bir stratejiyle rövanşı alın.';
  } else if (gameMode === 'online') {
    const userWon = (redWon && playerColor === 'red') || (!redWon && playerColor === 'black');
    isWinnerUser = userWon;
    title = userWon ? 'TEBRİKLER! KAZANDINIZ' : 'RAKİBİNİZ KAZANDI';
    subtitle = userWon
      ? 'Online maçta rakibinizi mağlup ederek zafere ulaştınız!'
      : 'Rakibiniz bu maçı kazandı. Rövanş isteyerek tekrar deneyin.';
  } else {
    title = redWon ? 'KIRMIZI KAZANDI' : 'SİYAH KAZANDI';
    subtitle = redWon
      ? 'Kırmızı oyuncu tahtayı ustalıkla kontrol ederek zafere ulaştı.'
      : 'Siyah oyuncu rakibini köşeye sıkıştırarak zafere ulaştı.';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        id="game-over-modal"
        className="w-full max-w-sm rounded-3xl bg-[#18191E] border border-amber-400/30 p-6 text-center shadow-2xl relative overflow-hidden"
      >
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* Trophy / Crown Icon Badge */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-zinc-900 border border-amber-400/40 flex items-center justify-center shadow-lg mb-4">
          {isDraw ? (
            <Award className="w-8 h-8 text-amber-400" />
          ) : isWinnerUser || redWon ? (
            <Crown className="w-8 h-8 text-amber-400 fill-amber-400/30" />
          ) : (
            <Trophy className="w-8 h-8 text-amber-400/80" />
          )}
        </div>

        {/* Title & Subtitle */}
        <h2 className="font-cinzel text-xl sm:text-2xl font-bold tracking-wider text-amber-200 uppercase mb-2">
          {title}
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto mb-5">
          {subtitle}
        </p>

        {/* Match Statistics */}
        <div className="grid grid-cols-3 gap-2 bg-zinc-900/90 border border-white/5 rounded-2xl p-3 mb-5">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
              Hamle
            </div>
            <div className="text-base font-bold text-zinc-200 mt-0.5">
              {moveCount}
            </div>
          </div>
          <div className="text-center border-x border-white/10">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
              Kırmızı Alma
            </div>
            <div className="text-base font-bold text-red-400 mt-0.5">
              {capturedByRed}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
              Siyah Alma
            </div>
            <div className="text-base font-bold text-zinc-300 mt-0.5">
              {capturedByBlack}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            id="btn-play-again"
            onClick={onPlayAgain}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-zinc-950 font-bold text-xs tracking-widest uppercase flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition-all duration-200"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{gameMode === 'online' ? 'RÖVANŞ İSTE' : 'YENİDEN OYNA'}</span>
          </button>

          <button
            id="btn-modal-exit"
            onClick={onExitToMenu}
            className="w-full h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 active:scale-98 transition-all duration-200"
          >
            <Home className="w-4 h-4 text-zinc-400" />
            <span>ANA MENÜ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
