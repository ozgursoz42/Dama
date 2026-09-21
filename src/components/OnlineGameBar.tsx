import React, { useState } from 'react';
import {
  Copy,
  Check,
  MessageSquare,
  Flag,
  Handshake,
  Users,
  Send,
  X,
  Radio,
  AlertCircle,
  Share2,
} from 'lucide-react';
import { OnlineRoomState, PieceColor } from '../types';

interface OnlineGameBarProps {
  roomState: OnlineRoomState;
  myColor: PieceColor | 'spectator' | null;
  onSendChat: (text: string) => void;
  onResign: () => void;
  onOfferDraw: () => void;
  onRespondDraw: (accepted: boolean) => void;
  onRequestRematch: () => void;
  onExit: () => void;
}

const QUICK_CHAT_OPTIONS = [
  '👏 Tebrikler!',
  '🤔 Düşünüyorum...',
  '⚔️ Güzel hamle!',
  '🔥 Harika oyun!',
  '⏳ Biraz bekle lütfen',
  '👍 Anlaştık',
];

export const OnlineGameBar: React.FC<OnlineGameBarProps> = ({
  roomState,
  myColor,
  onSendChat,
  onResign,
  onOfferDraw,
  onRespondDraw,
  onRequestRematch,
  onExit,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [showConfirmResign, setShowConfirmResign] = useState(false);

  const [isLinkCopied, setIsLinkCopied] = useState(false);

  const isPlayer = myColor === 'red' || myColor === 'black';
  const opponentColor: PieceColor | null = isPlayer ? (myColor === 'red' ? 'black' : 'red') : null;
  const opponent = opponentColor ? roomState.players[opponentColor] : null;
  const isWaitingOpponent = !roomState.players.red || !roomState.players.black;

  const getInviteUrl = () => {
    return `${window.location.origin}${window.location.pathname}?room=${roomState.roomId}`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomState.roomId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getInviteUrl());
    setIsLinkCopied(true);
    setTimeout(() => setIsLinkCopied(false), 2500);
  };

  const handleShare = async () => {
    const inviteUrl = getInviteUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'DAMA - Online Dama Maçı',
          text: `Dama oyunuma katıl! Oda Kodu: ${roomState.roomId}`,
          url: inviteUrl,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleSubmitChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput);
    setChatInput('');
  };

  return (
    <div className="w-full max-w-md mx-auto px-2 space-y-1 select-none">
      {/* Top Online Header Ribbon */}
      <div className="flex items-center justify-between px-1 py-1 rounded-2xl bg-zinc-900/80 border border-white/10 backdrop-blur-md">
        {/* Room Code Badge */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider pl-1.5">
            ODA:
          </span>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-950 border border-amber-400/40 hover:border-amber-400 text-amber-300 font-cinzel font-bold text-xs tracking-widest transition-colors"
            title="Oda kodunu kopyala"
          >
            <span>{roomState.roomId}</span>
            {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-60" />}
          </button>

          <button
            onClick={handleShare}
            className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            title="Paylaş"
          >
            <Share2 className="w-3 h-3" />
          </button>
        </div>

        {/* Action icons (Chat, Draw, Resign) */}
        <div className="flex items-center gap-1">
          {isPlayer && roomState.status === 'playing' && (
            <>
              {/* Offer Draw */}
              <button
                onClick={onOfferDraw}
                disabled={roomState.drawOfferedBy !== null}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-amber-300 transition-colors disabled:opacity-30"
                title="Beraberlik Teklif Et"
              >
                <Handshake className="w-3.5 h-3.5" />
              </button>

              {/* Resign */}
              <button
                onClick={() => setShowConfirmResign(true)}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-950/60 text-zinc-300 hover:text-red-400 transition-colors"
                title="Terk Et (Pes)"
              >
                <Flag className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* Toggle Chat */}
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="relative p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-amber-300 transition-colors"
            title="Sohbet / Tepkiler"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {roomState.chatMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>
        </div>
      </div>

      {/* Waiting for Opponent Banner */}
      {isWaitingOpponent && (
        <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-between text-xs text-amber-200 animate-pulse">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-400 animate-spin" />
            <div>
              <div className="font-bold">Rakip Bekleniyor...</div>
              <div className="text-[10px] text-amber-300/80">
                Oda kodunu ({roomState.roomId}) arkadaşınıza gönderin.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopyCode}
              className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-[10px] uppercase tracking-wider shadow-sm transition-colors"
            >
              {isCopied ? 'Kopyalandı!' : 'Kodu Kopyala'}
            </button>
            <button
              onClick={handleCopyLink}
              className="px-2.5 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-bold text-[10px] uppercase tracking-wider shadow-sm border border-amber-400/30 transition-colors"
            >
              {isLinkCopied ? 'Bağlantı Kopyalandı!' : 'Linki Kopyala'}
            </button>
          </div>
        </div>
      )}

      {/* Draw Offer Notification Alert */}
      {roomState.drawOfferedBy && isPlayer && roomState.drawOfferedBy !== myColor && roomState.status === 'playing' && (
        <div className="p-2.5 rounded-2xl bg-zinc-900 border border-amber-400 flex items-center justify-between gap-2 shadow-xl">
          <div className="text-xs text-amber-200">
            <span className="font-bold">Rakibiniz beraberlik teklif etti.</span> Kabul ediyor musunuz?
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onRespondDraw(true)}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase"
            >
              Kabul
            </button>
            <button
              onClick={() => onRespondDraw(false)}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold uppercase"
            >
              Reddet
            </button>
          </div>
        </div>
      )}

      {/* Resign Confirm Dialog */}
      {showConfirmResign && (
        <div className="p-2.5 rounded-2xl bg-red-950/90 border border-red-500/60 flex items-center justify-between gap-2 shadow-xl">
          <div className="text-xs text-red-200">
            <span className="font-bold">Oyunu terk etmek istediğinize emin misiniz?</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                onResign();
                setShowConfirmResign(false);
              }}
              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold uppercase"
            >
              Evet, Çekil
            </button>
            <button
              onClick={() => setShowConfirmResign(false)}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-[10px] font-bold uppercase"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Chat & Quick Messages Drawer */}
      {isChatOpen && (
        <div className="p-3 rounded-2xl bg-zinc-950 border border-white/10 shadow-2xl space-y-2.5 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <div className="text-xs font-bold text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Oyun İçi Sohbet & Tepkiler</span>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="text-zinc-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Reaction Buttons */}
          <div className="flex flex-wrap gap-1">
            {QUICK_CHAT_OPTIONS.map((txt) => (
              <button
                key={txt}
                onClick={() => onSendChat(txt)}
                className="px-2 py-1 rounded-lg bg-zinc-900 border border-white/5 hover:border-amber-400/40 text-[10.5px] text-zinc-300 hover:text-amber-200 transition-colors"
              >
                {txt}
              </button>
            ))}
          </div>

          {/* Message List */}
          <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] pr-1">
            {roomState.chatMessages.length === 0 ? (
              <div className="text-zinc-500 text-center py-2 text-[10px]">Henüz mesaj yok.</div>
            ) : (
              roomState.chatMessages.map((m) => (
                <div key={m.id} className="leading-tight">
                  <span
                    className={`font-bold ${
                      m.senderColor === 'red'
                        ? 'text-red-400'
                        : m.senderColor === 'black'
                        ? 'text-zinc-300'
                        : 'text-amber-400'
                    }`}
                  >
                    {m.sender}:{' '}
                  </span>
                  <span className="text-zinc-200">{m.text}</span>
                </div>
              ))
            )}
          </div>

          {/* Chat input form */}
          <form onSubmit={handleSubmitChat} className="flex gap-1.5 pt-1 border-t border-white/5">
            <input
              type="text"
              maxLength={80}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Mesaj yazın..."
              className="flex-1 h-7 px-2.5 rounded-lg bg-zinc-900 border border-white/10 text-[11px] text-zinc-200 outline-none focus:border-amber-400/60"
            />
            <button
              type="submit"
              className="px-3 h-7 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-[10px] uppercase tracking-wider transition-colors flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
