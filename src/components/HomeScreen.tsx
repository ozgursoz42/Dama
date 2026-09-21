import React from 'react';
import { Bot, Users, HelpCircle, Settings, Crown, Swords, Globe } from 'lucide-react';
import { GameMode, GameSettings, GameVariant } from '../types';

interface HomeScreenProps {
  onStartGame: (mode: GameMode) => void;
  onOpenOnlineLobby: () => void;
  onOpenRules: () => void;
  onOpenSettings: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartGame,
  onOpenOnlineLobby,
  onOpenRules,
  onOpenSettings,
  settings,
  onUpdateSettings,
}) => {
  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col items-center justify-between p-6 bg-[#0E0F12] text-zinc-100 overflow-hidden select-none">
      {/* Ambient Luxury Dark Vignette Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-zinc-950 to-black pointer-events-none" />
      
      {/* Subtle Board Lines Background Accent */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      {/* Header / Brand Emblem */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center pt-6 sm:pt-10 text-center">
        
        {/* Decorative Checkers Disc Art */}
        <div className="relative mb-5 flex items-center justify-center">
          {/* Outer Ring */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full wood-board-walnut p-2 shadow-[0_15px_35px_rgba(0,0,0,0.8)] border border-amber-400/30 flex items-center justify-center">
            {/* Dark Checker Disc */}
            <div className="w-full h-full rounded-full piece-black flex items-center justify-center relative">
              <div className="w-[75%] h-[75%] rounded-full piece-groove flex items-center justify-center">
                <Crown className="w-7 h-7 text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
              </div>
            </div>
          </div>
          
          {/* Overlapping Red Checker Disc */}
          <div className="absolute -bottom-1 -right-2 w-12 h-12 rounded-full piece-red shadow-2xl flex items-center justify-center border border-red-400/40">
            <div className="w-[70%] h-[70%] rounded-full piece-groove flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-amber-400/80" />
            </div>
          </div>
        </div>

        {/* Large DAMA Title */}
        <h1 className="font-cinzel text-5xl sm:text-6xl font-black tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-200 to-amber-500/90 drop-shadow-[0_4px_12px_rgba(245,158,11,0.2)] ml-2">
          DAMA
        </h1>
        
        <div className="flex items-center gap-3 my-2">
          <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-amber-400/60" />
          <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-amber-200/70">
            {settings.variant === 'turkish' ? 'TÜRK DAMASI (DÜZ & YANLAR)' : 'KLASİK ÇAPRAZ DAMA'}
          </p>
          <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-amber-400/60" />
        </div>
      </div>

      {/* Main Action Area */}
      <div className="relative z-10 w-full max-w-xs flex flex-col gap-3 py-2">
        
        {/* Game Variant Selector Pill */}
        <div className="p-1 rounded-2xl bg-zinc-950/90 border border-white/10 shadow-inner">
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => onUpdateSettings({ variant: 'turkish' })}
              className={`py-2 px-1 rounded-xl text-center transition-all ${
                settings.variant === 'turkish'
                  ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 font-medium'
              }`}
            >
              <div className="text-[11px] uppercase tracking-wider font-extrabold">Türk Daması</div>
              <div className="text-[9px] opacity-80">Düz & Yan (16 Taş)</div>
            </button>

            <button
              onClick={() => onUpdateSettings({ variant: 'diagonal' })}
              className={`py-2 px-1 rounded-xl text-center transition-all ${
                settings.variant === 'diagonal'
                  ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 font-medium'
              }`}
            >
              <div className="text-[11px] uppercase tracking-wider font-extrabold">Çapraz Dama</div>
              <div className="text-[9px] opacity-80">Çapraz (12 Taş)</div>
            </button>
          </div>
        </div>

        {/* Play vs AI Button */}
        <button
          id="btn-home-play-ai"
          onClick={() => onStartGame('ai')}
          className="group relative h-14 w-full rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-zinc-950 font-bold text-sm tracking-[0.15em] uppercase flex items-center justify-between px-5 shadow-[0_10px_25px_rgba(245,158,11,0.25)] border border-amber-300/40 active:scale-[0.98] transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-950/20 flex items-center justify-center text-zinc-950">
              <Bot className="w-5 h-5" />
            </div>
            <span className="font-cinzel font-black">YAPAY ZEKA İLE OYNA</span>
          </div>
          <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-zinc-950/20 text-zinc-950">
            {settings.difficulty.toUpperCase()}
          </span>
        </button>

        {/* Online Multiplayer Button */}
        <button
          id="btn-home-play-online"
          onClick={onOpenOnlineLobby}
          className="group h-13 w-full rounded-2xl bg-gradient-to-r from-emerald-950/70 via-zinc-900 to-zinc-900 hover:border-emerald-400/50 text-zinc-100 hover:text-white font-bold text-xs tracking-[0.15em] uppercase flex items-center justify-between px-5 border border-emerald-500/40 shadow-lg active:scale-[0.98] transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Globe className="w-4 h-4" />
            </div>
            <span className="font-cinzel font-bold text-emerald-200">ONLİNE OYNA</span>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-300 tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            CANLI
          </span>
        </button>

        {/* 2 Players Button */}
        <button
          id="btn-home-play-pvp"
          onClick={() => onStartGame('pvp')}
          className="group h-13 w-full rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-100 hover:text-white font-bold text-xs tracking-[0.15em] uppercase flex items-center justify-between px-5 border border-white/10 hover:border-amber-400/40 shadow-lg active:scale-[0.98] transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-amber-400">
              <Users className="w-4 h-4" />
            </div>
            <span className="font-cinzel font-bold">2 OYUNCU (AYNI CİHAZ)</span>
          </div>
          <span className="text-[10px] font-semibold text-zinc-400 tracking-wider">
            LOKAL
          </span>
        </button>

        {/* Secondary Buttons Row */}
        <div className="grid grid-cols-2 gap-3 mt-0.5">
          {/* How to Play */}
          <button
            id="btn-home-how-to-play"
            onClick={onOpenRules}
            className="h-12 rounded-2xl bg-zinc-950/80 hover:bg-zinc-900 text-zinc-300 hover:text-white text-[11px] font-semibold tracking-wider uppercase flex items-center justify-center gap-2 border border-white/5 hover:border-white/15 transition-all duration-200 active:scale-[0.98]"
          >
            <HelpCircle className="w-4 h-4 text-zinc-400" />
            <span>KURALLAR</span>
          </button>

          {/* Settings */}
          <button
            id="btn-home-settings"
            onClick={onOpenSettings}
            className="h-12 rounded-2xl bg-zinc-950/80 hover:bg-zinc-900 text-zinc-300 hover:text-white text-[11px] font-semibold tracking-wider uppercase flex items-center justify-center gap-2 border border-white/5 hover:border-white/15 transition-all duration-200 active:scale-[0.98]"
          >
            <Settings className="w-4 h-4 text-zinc-400" />
            <span>AYARLAR</span>
          </button>
        </div>

      </div>

      {/* Footer Rules Badge */}
      <div className="relative z-10 w-full max-w-sm flex items-center justify-center gap-3 text-[10px] font-medium tracking-widest uppercase text-zinc-500 pb-2">
        <span>8x8 Tahta</span>
        <span>•</span>
        <span>{settings.variant === 'turkish' ? 'Düz & Yan Hareket' : 'Çapraz Hareket'}</span>
        <span>•</span>
        <span>Zorunlu Taş Alma</span>
      </div>

    </div>
  );
};
