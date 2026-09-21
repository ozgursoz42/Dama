import React from 'react';
import { X, Volume2, VolumeX, Smartphone, Palette, Cpu, User, Swords } from 'lucide-react';
import { BoardTheme, Difficulty, GameSettings, GameVariant, PieceColor } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const difficulties: { id: Difficulty; label: string; desc: string }[] = [
    { id: 'easy', label: 'KOLAY', desc: 'Acemiler için' },
    { id: 'medium', label: 'ORTA', desc: 'Dengeli taktikçi' },
    { id: 'hard', label: 'ZOR', desc: 'Derin strateji' },
    { id: 'expert', label: 'USTA', desc: 'Turnuva seviyesi' },
  ];

  const themes: { id: BoardTheme; label: string; color: string }[] = [
    { id: 'walnut', label: 'Ceviz Ağacı', color: 'from-[#3a2012] to-[#201007]' },
    { id: 'mahogany', label: 'Maun Ağacı', color: 'from-[#421414] to-[#220707]' },
    { id: 'ebony', label: 'Abanoz Siyah', color: 'from-[#2a2c32] to-[#121316]' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        id="settings-modal"
        className="w-full max-w-md max-h-[90vh] rounded-3xl bg-[#18191E] border border-white/10 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h3 className="font-cinzel text-lg font-bold tracking-wider text-amber-200 uppercase">
              AYARLAR
            </h3>
            <p className="text-[11px] text-zinc-400">Oyun Modu, Tahta Görünümü ve Ses</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          
          {/* Game Variant: Turkish Dama vs Diagonal Checkers */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs font-bold tracking-wider text-zinc-300 uppercase">
              <Swords className="w-4 h-4 text-amber-400" />
              <span>DAMA TÜRÜ (HAREKET KURALI)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdateSettings({ variant: 'turkish' })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  settings.variant === 'turkish'
                    ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.15)]'
                    : 'bg-zinc-900/60 border-white/5 hover:border-white/15'
                }`}
              >
                <div
                  className={`text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 ${
                    settings.variant === 'turkish' ? 'text-amber-300' : 'text-zinc-200'
                  }`}
                >
                  <span>TÜRK DAMASI</span>
                </div>
                <div className="text-[10px] text-zinc-400 mt-1 leading-snug">
                  Düz ve yanlar (çapraz gidilemez), 16 taş, uçan dama.
                </div>
              </button>

              <button
                onClick={() => onUpdateSettings({ variant: 'diagonal' })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  settings.variant === 'diagonal'
                    ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.15)]'
                    : 'bg-zinc-900/60 border-white/5 hover:border-white/15'
                }`}
              >
                <div
                  className={`text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 ${
                    settings.variant === 'diagonal' ? 'text-amber-300' : 'text-zinc-200'
                  }`}
                >
                  <span>ÇAPRAZ DAMA</span>
                </div>
                <div className="text-[10px] text-zinc-400 mt-1 leading-snug">
                  Klasik çapraz hareket ve atlama, 12 taş.
                </div>
              </button>
            </div>
          </div>

          {/* AI Difficulty */}
          <div>
            <div className="flex items-center gap-2 mb-2.5 text-xs font-bold tracking-wider text-zinc-300 uppercase">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>Yapay Zeka Zorluğu</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {difficulties.map((diff) => {
                const active = settings.difficulty === diff.id;
                return (
                  <button
                    key={diff.id}
                    onClick={() => onUpdateSettings({ difficulty: diff.id })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      active
                        ? 'bg-amber-500/15 border-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.15)]'
                        : 'bg-zinc-900/60 border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div
                      className={`text-xs font-bold tracking-wider uppercase ${
                        active ? 'text-amber-300' : 'text-zinc-200'
                      }`}
                    >
                      {diff.label}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">{diff.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Board Theme */}
          <div>
            <div className="flex items-center gap-2 mb-2.5 text-xs font-bold tracking-wider text-zinc-300 uppercase">
              <Palette className="w-4 h-4 text-amber-400" />
              <span>Tahta Ahşap Kaplaması</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {themes.map((th) => {
                const active = settings.theme === th.id;
                return (
                  <button
                    key={th.id}
                    onClick={() => onUpdateSettings({ theme: th.id })}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                      active
                        ? 'bg-amber-500/15 border-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.15)]'
                        : 'bg-zinc-900/60 border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div
                      className={`w-full h-8 rounded-lg bg-gradient-to-br ${th.color} border border-white/10 shadow-inner`}
                    />
                    <span
                      className={`text-[11px] font-semibold text-center leading-tight ${
                        active ? 'text-amber-300' : 'text-zinc-300'
                      }`}
                    >
                      {th.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Player Color Preference in AI Mode */}
          <div>
            <div className="flex items-center gap-2 mb-2.5 text-xs font-bold tracking-wider text-zinc-300 uppercase">
              <User className="w-4 h-4 text-amber-400" />
              <span>Taş Renginiz (Yapay Zekaya Karşı)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdateSettings({ playerColor: 'red' })}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                  settings.playerColor === 'red'
                    ? 'bg-red-950/40 border-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                    : 'bg-zinc-900/60 border-white/5 hover:border-white/15'
                }`}
              >
                <div className="w-6 h-6 rounded-full piece-red shrink-0" />
                <div className="text-left">
                  <div className="text-xs font-bold text-red-200">KIRMIZI (İLK HAMLE)</div>
                  <div className="text-[10px] text-zinc-400">Aşağıdan yukarıya</div>
                </div>
              </button>

              <button
                onClick={() => onUpdateSettings({ playerColor: 'black' })}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                  settings.playerColor === 'black'
                    ? 'bg-zinc-800/60 border-zinc-400/80 shadow-[0_0_12px_rgba(255,255,255,0.1)]'
                    : 'bg-zinc-900/60 border-white/5 hover:border-white/15'
                }`}
              >
                <div className="w-6 h-6 rounded-full piece-black shrink-0" />
                <div className="text-left">
                  <div className="text-xs font-bold text-zinc-200">SİYAH (İKİNCİ)</div>
                  <div className="text-[10px] text-zinc-400">Yukarıdan aşağıya</div>
                </div>
              </button>
            </div>
          </div>

          {/* Sound & Haptics Toggles */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-950 flex items-center justify-center text-amber-400">
                  {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-200">Taş ve Tahta Sesleri</div>
                  <div className="text-[10px] text-zinc-400">Gerçekçi ahşap vuruş efektleri</div>
                </div>
              </div>
              <button
                onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  settings.soundEnabled ? 'bg-amber-500' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                    settings.soundEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-950 flex items-center justify-center text-amber-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-200">Titreşim (Haptik)</div>
                  <div className="text-[10px] text-zinc-400">Taş alma ve damaya çıkışta titreşim</div>
                </div>
              </div>
              <button
                onClick={() => onUpdateSettings({ hapticsEnabled: !settings.hapticsEnabled })}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  settings.hapticsEnabled ? 'bg-amber-500' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                    settings.hapticsEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-zinc-950/40">
          <button
            onClick={onClose}
            className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs tracking-widest uppercase transition-all duration-200"
          >
            AYARLARI KAYDET
          </button>
        </div>
      </div>
    </div>
  );
};
