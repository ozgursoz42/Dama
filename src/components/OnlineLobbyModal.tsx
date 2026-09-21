import React, { useState, useEffect } from 'react';
import {
  X,
  Globe,
  Users,
  Zap,
  PlusCircle,
  LogIn,
  RefreshCw,
  Copy,
  Check,
  Swords,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { GameVariant, OnlineRoomSummary } from '../types';

interface OnlineLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  activeRooms: OnlineRoomSummary[];
  isLoadingRooms: boolean;
  onRefreshRooms: () => void;
  onCreateRoom: (variant: GameVariant, playerName: string, preferredColor: 'red' | 'black' | 'random') => void;
  onQuickMatch: (variant: GameVariant, playerName: string) => void;
  onJoinRoom: (roomId: string, playerName: string) => void;
  defaultVariant: GameVariant;
  errorMessage: string | null;
}

export const OnlineLobbyModal: React.FC<OnlineLobbyModalProps> = ({
  isOpen,
  onClose,
  isConnected,
  activeRooms,
  isLoadingRooms,
  onRefreshRooms,
  onCreateRoom,
  onQuickMatch,
  onJoinRoom,
  defaultVariant,
  errorMessage,
}) => {
  const [tab, setTab] = useState<'quick' | 'create' | 'join' | 'rooms'>('quick');
  const [playerName, setPlayerName] = useState(() => {
    try {
      return localStorage.getItem('dama_player_name') || `Oyuncu_${Math.floor(100 + Math.random() * 900)}`;
    } catch {
      return 'Oyuncu_1';
    }
  });
  const [selectedVariant, setSelectedVariant] = useState<GameVariant>(defaultVariant);
  const [preferredColor, setPreferredColor] = useState<'red' | 'black' | 'random'>('random');
  const [roomCodeInput, setRoomCodeInput] = useState('');

  // Persist player name
  const handleNameChange = (val: string) => {
    setPlayerName(val);
    try {
      localStorage.setItem('dama_player_name', val);
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    if (isOpen) {
      onRefreshRooms();
    }
  }, [isOpen, onRefreshRooms]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div
        id="online-lobby-modal"
        className="w-full max-w-lg rounded-3xl bg-[#16171B] border border-amber-400/30 shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-zinc-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-cinzel text-base font-bold tracking-wider text-amber-200 uppercase">
                  ONLİNE ÇOK OYUNCULU
                </h3>
                <span
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                    isConnected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-red-500/20 text-red-300 border border-red-500/40'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                  {isConnected ? 'CANLI' : 'BAĞLANIYOR'}
                </span>
              </div>
              <p className="text-[10.5px] text-zinc-400">Gerçek rakiplerle Türk Daması veya Çapraz Dama oyna</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Player Name Strip */}
        <div className="px-5 py-2.5 bg-zinc-900/40 border-b border-white/5 flex items-center justify-between gap-3">
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 shrink-0">
            OYUNCU ADINIZ:
          </label>
          <input
            type="text"
            value={playerName}
            maxLength={18}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Adınızı girin..."
            className="flex-1 max-w-[200px] h-8 px-3 rounded-lg bg-zinc-950 border border-white/10 focus:border-amber-400/80 text-xs font-semibold text-amber-200 outline-none transition-colors"
          />
        </div>

        {/* Error message if any */}
        {errorMessage && (
          <div className="px-5 py-2 bg-red-950/40 border-b border-red-500/30 text-red-300 text-xs text-center font-medium">
            {errorMessage}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 p-2 bg-zinc-950/80 border-b border-white/5 gap-1 text-[11px] font-bold tracking-wider uppercase">
          <button
            onClick={() => setTab('quick')}
            className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 ${
              tab === 'quick'
                ? 'bg-amber-500 text-zinc-950 shadow-md font-extrabold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>HIZLI</span>
          </button>

          <button
            onClick={() => setTab('create')}
            className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 ${
              tab === 'create'
                ? 'bg-amber-500 text-zinc-950 shadow-md font-extrabold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>ODA KUR</span>
          </button>

          <button
            onClick={() => setTab('join')}
            className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 ${
              tab === 'join'
                ? 'bg-amber-500 text-zinc-950 shadow-md font-extrabold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>KATIL</span>
          </button>

          <button
            onClick={() => {
              setTab('rooms');
              onRefreshRooms();
            }}
            className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 ${
              tab === 'rooms'
                ? 'bg-amber-500 text-zinc-950 shadow-md font-extrabold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>ODALAR</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* TAB 1: QUICK MATCH */}
          {tab === 'quick' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-400/20 text-center">
                <Zap className="w-6 h-6 text-amber-400 mx-auto mb-1.5" />
                <h4 className="font-cinzel text-sm font-bold text-amber-200 uppercase">
                  Anında Rakip Bul
                </h4>
                <p className="text-[11px] text-zinc-300 mt-1">
                  Saniyeler içinde boşta bekleyen bir oyuncuyla eşleşin ya da hemen yeni bir maç başlatın.
                </p>
              </div>

              {/* Variant selection */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Dama Türü:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedVariant('turkish')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedVariant === 'turkish'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.15)]'
                        : 'bg-zinc-900/60 border-white/5 text-zinc-300 hover:border-white/15'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase">🇹🇷 Türk Daması</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Düz ve yanlar (16 Taş)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedVariant('diagonal')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedVariant === 'diagonal'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.15)]'
                        : 'bg-zinc-900/60 border-white/5 text-zinc-300 hover:border-white/15'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase">⚔️ Çapraz Dama</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Klasik çapraz (12 Taş)</div>
                  </button>
                </div>
              </div>

              <button
                id="btn-start-quick-match"
                onClick={() => onQuickMatch(selectedVariant, playerName)}
                disabled={!isConnected}
                className="w-full h-13 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-zinc-950 font-bold text-xs tracking-widest uppercase flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition-all"
              >
                <Zap className="w-4 h-4" />
                <span>HIZLI MAÇ BUL VE OYNA</span>
              </button>
            </div>
          )}

          {/* TAB 2: CREATE ROOM */}
          {tab === 'create' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Oyun Türü:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedVariant('turkish')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedVariant === 'turkish'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-zinc-900/60 border-white/5 text-zinc-300'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase">🇹🇷 Türk Daması</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">16 Taş, Düz & Yanlar</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedVariant('diagonal')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedVariant === 'diagonal'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-zinc-900/60 border-white/5 text-zinc-300'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase">⚔️ Çapraz Dama</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">12 Taş, Çapraz Atlama</div>
                  </button>
                </div>
              </div>

              {/* Color preference */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Taş Rengi Tercihiniz:
                </label>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <button
                    type="button"
                    onClick={() => setPreferredColor('random')}
                    className={`p-2.5 rounded-xl border font-bold transition-all ${
                      preferredColor === 'random'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-zinc-900/60 border-white/5 text-zinc-400'
                    }`}
                  >
                    🎲 Rastgele
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferredColor('red')}
                    className={`p-2.5 rounded-xl border font-bold transition-all ${
                      preferredColor === 'red'
                        ? 'bg-red-950/50 border-red-500 text-red-300'
                        : 'bg-zinc-900/60 border-white/5 text-zinc-400'
                    }`}
                  >
                    🔴 Kırmızı
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferredColor('black')}
                    className={`p-2.5 rounded-xl border font-bold transition-all ${
                      preferredColor === 'black'
                        ? 'bg-zinc-800 border-zinc-400 text-zinc-200'
                        : 'bg-zinc-900/60 border-white/5 text-zinc-400'
                    }`}
                  >
                    ⚫ Siyah
                  </button>
                </div>
              </div>

              <button
                id="btn-create-room-action"
                onClick={() => onCreateRoom(selectedVariant, playerName, preferredColor)}
                disabled={!isConnected}
                className="w-full h-13 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-zinc-950 font-bold text-xs tracking-widest uppercase flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>ÖZEL ODA OLUŞTUR</span>
              </button>
            </div>
          )}

          {/* TAB 3: JOIN ROOM WITH CODE */}
          {tab === 'join' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-white/5 text-center">
                <LogIn className="w-6 h-6 text-amber-400 mx-auto mb-1.5" />
                <h4 className="font-cinzel text-sm font-bold text-amber-200 uppercase">
                  Oda Koduyla Katıl
                </h4>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Arkadaşınızın paylaştığı 6 haneli oda kodunu buraya girerek doğrudan maçına katılın.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  6 Haneli Oda Kodu:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder="Örn: TK4821"
                  className="w-full h-13 text-center tracking-[0.3em] font-cinzel text-xl font-bold rounded-2xl bg-zinc-950 border border-amber-400/40 focus:border-amber-400 text-amber-200 outline-none"
                />
              </div>

              <button
                id="btn-join-room-code"
                onClick={() => onJoinRoom(roomCodeInput, playerName)}
                disabled={!isConnected || roomCodeInput.trim().length < 4}
                className="w-full h-13 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 disabled:opacity-40 text-zinc-950 font-bold text-xs tracking-widest uppercase flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>ODAYA GİRİŞ YAP</span>
              </button>
            </div>
          )}

          {/* TAB 4: ACTIVE ROOMS LIST */}
          {tab === 'rooms' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Bekleyen Masalar ({activeRooms.length})
                </span>
                <button
                  onClick={onRefreshRooms}
                  disabled={isLoadingRooms}
                  className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-semibold transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRooms ? 'animate-spin' : ''}`} />
                  <span>Yenile</span>
                </button>
              </div>

              {activeRooms.length === 0 ? (
                <div className="p-8 rounded-2xl bg-zinc-950/60 border border-white/5 text-center text-zinc-400 text-xs">
                  Şu an açık oda bulunmuyor. Yeni bir oda kurabilir ya da "Hızlı Eşleş" ile maç başlatabilirsiniz!
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {activeRooms.map((r) => (
                    <div
                      key={r.roomId}
                      className="p-3 rounded-2xl bg-zinc-900/70 border border-white/10 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-cinzel text-xs font-bold text-amber-300 tracking-wider">
                            #{r.roomId}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-semibold">
                            {r.variant === 'turkish' ? 'Türk Daması' : 'Çapraz Dama'}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-1">
                          Kurucu: <span className="text-zinc-200 font-medium">{r.hostName}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => onJoinRoom(r.roomId, playerName)}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-[11px] tracking-wider uppercase shadow-md transition-colors"
                      >
                        {r.playerCount < 2 ? 'KATIL' : 'İZLE'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="p-3.5 border-t border-white/10 bg-zinc-950/70 flex items-center justify-between text-[11px] text-zinc-400 px-5">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Gerçek Zamanlı WebSocket Sunucusu</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white font-semibold transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
