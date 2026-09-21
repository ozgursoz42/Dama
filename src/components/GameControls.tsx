import React from 'react';
import { RotateCcw, RotateCw, Home, Volume2, VolumeX, Settings, HelpCircle } from 'lucide-react';

interface GameControlsProps {
  canUndo: boolean;
  onUndo: () => void;
  onRestart: () => void;
  onExit: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onOpenRules: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  canUndo,
  onUndo,
  onRestart,
  onExit,
  soundEnabled,
  onToggleSound,
  onOpenSettings,
  onOpenRules,
}) => {
  return (
    <div className="w-full max-w-md mx-auto px-3 py-1.5 flex items-center justify-between gap-2">
      {/* Exit to Main Menu Button */}
      <button
        id="btn-exit"
        onClick={onExit}
        title="Ana Menüye Dön"
        className="h-11 px-3 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-amber-300 hover:text-amber-200 border border-amber-400/30 hover:border-amber-400/60 flex items-center gap-1.5 text-xs font-bold tracking-wider transition-all duration-200 active:scale-95 shadow-md shrink-0"
      >
        <Home className="w-4 h-4 text-amber-400" />
        <span className="text-[11px] font-bold">ANA MENÜ</span>
      </button>

      <div className="flex items-center gap-2">
        {/* Undo Button */}
        <button
          id="btn-undo"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo Last Move"
          className={`h-11 px-4 rounded-xl border flex items-center gap-1.5 text-xs font-semibold tracking-wider transition-all duration-200 active:scale-95 shadow-md ${
            canUndo
              ? 'bg-zinc-900/80 hover:bg-zinc-800 text-amber-300 border-amber-400/30 hover:border-amber-400/60'
              : 'bg-zinc-950/40 text-zinc-600 border-white/5 cursor-not-allowed'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>UNDO</span>
        </button>

        {/* Restart Button */}
        <button
          id="btn-restart"
          onClick={onRestart}
          title="Restart Game"
          className="h-11 px-4 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-white/10 hover:border-white/20 flex items-center gap-1.5 text-xs font-semibold tracking-wider transition-all duration-200 active:scale-95 shadow-md"
        >
          <RotateCw className="w-4 h-4 text-zinc-400" />
          <span>RESTART</span>
        </button>
      </div>

      {/* Auxiliary Controls (Sound & Settings) */}
      <div className="flex items-center gap-1.5">
        <button
          id="btn-toggle-sound"
          onClick={onToggleSound}
          title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
          className="w-11 h-11 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 flex items-center justify-center transition-all duration-200 active:scale-95 shadow-md"
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4 text-amber-400/80" />
          ) : (
            <VolumeX className="w-4 h-4 text-zinc-500" />
          )}
        </button>

        <button
          id="btn-rules"
          onClick={onOpenRules}
          title="How to Play"
          className="w-11 h-11 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 flex items-center justify-center transition-all duration-200 active:scale-95 shadow-md"
        >
          <HelpCircle className="w-4 h-4 text-zinc-400" />
        </button>

        <button
          id="btn-settings"
          onClick={onOpenSettings}
          title="Settings"
          className="w-11 h-11 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 flex items-center justify-center transition-all duration-200 active:scale-95 shadow-md"
        >
          <Settings className="w-4 h-4 text-zinc-400" />
        </button>
      </div>
    </div>
  );
};
