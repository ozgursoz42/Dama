import React, { useState } from 'react';
import { X, CheckCircle2, Shield, Crown, ArrowUp, MoveHorizontal, Swords, Zap } from 'lucide-react';
import { GameVariant } from '../types';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialVariant?: GameVariant;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({
  isOpen,
  onClose,
  initialVariant = 'turkish',
}) => {
  const [activeTab, setActiveTab] = useState<GameVariant>(initialVariant);

  if (!isOpen) return null;

  const turkishRules = [
    {
      icon: <ArrowUp className="w-5 h-5 text-amber-400" />,
      title: 'DÜZ VE YANLARA HAREKET (ÇAPRAZ YASAKTIR)',
      desc: 'Taşlar yalnızca İLERİ, SAĞA ve SOLA 1 kare gidebilir. Çapraz hareket veya geriye hareket kesinlikle yasaktır!',
    },
    {
      icon: <Swords className="w-5 h-5 text-red-400" />,
      title: 'ZORUNLU TAŞ ALMA',
      desc: 'İleri, sağ veya solda bitişikteki rakip taşın üzerinden atlayarak arkasındaki boş kareye basılır ve taş yenir. Taş alma kesinlikle zorunludur.',
    },
    {
      icon: <Zap className="w-5 h-5 text-amber-300" />,
      title: 'ÇOĞUNLUK KURALI (EN ÇOK TAŞ ALMA)',
      desc: 'Farklı yönlerde taş alma imkanı varsa, oyuncu EN FAZLA sayıda taş alabileceği yolu seçmek zorundadır.',
    },
    {
      icon: <Crown className="w-5 h-5 text-amber-400" />,
      title: 'DAMA TAŞI (UÇAN KALE)',
      desc: 'Karşı son sıraya ulaşan taş DAMA olur. Dama taşı, satrançtaki kale gibi önü boş olan her yöne (ileri, geri, sağ, sol) sınırsız kare gidebilir ve uzaktan taş atlayabilir.',
    },
    {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      title: 'ÇOKLU TAŞ ALMA SERİSİ',
      desc: 'Taş aldıktan sonra taşın ulaştığı kareden yeni bir taş alma imkanı varsa, hamle devam eder ve tüm taşlar sırayla toplanır.',
    },
    {
      icon: <Shield className="w-5 h-5 text-zinc-300" />,
      title: 'KAZANMA VE BERABERLİK',
      desc: 'Rakibin tüm taşlarını alan veya rakibin hamle yapabileceği hiçbir kare bırakmayan oyuncu oyunu kazanır.',
    },
  ];

  const diagonalRules = [
    {
      icon: <ArrowUp className="w-5 h-5 text-amber-400" />,
      title: 'ÇAPRAZ HAREKET (DIAGONAL)',
      desc: 'Normal taşlar koyu kareler üzerinde yalnızca ileriye doğru 1 kare çapraz hareket edebilir.',
    },
    {
      icon: <Swords className="w-5 h-5 text-red-400" />,
      title: 'ZORUNLU ÇAPRAZ TAŞ ALMA',
      desc: 'Çaprazdaki rakip taşın üzerinden atlayıp boş kareye geçerek taş yenir. Taş alma hamlesi zorunludur.',
    },
    {
      icon: <Crown className="w-5 h-5 text-amber-300" />,
      title: 'KRAL / DAMA TERFİSİ',
      desc: 'Karşı kenara ulaşan taş Kral olur ve artık hem ileri hem geri 4 yönde çapraz hareket edebilir.',
    },
    {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      title: 'ARDIŞIK ÇAPRAZ ATLAMA',
      desc: 'Taş aldıktan sonra başka bir çapraz atlama imkanı varsa, sıra değişmeden ardışık atlayışlar tamamlanır.',
    },
    {
      icon: <Shield className="w-5 h-5 text-zinc-300" />,
      title: 'KAZANMA KOŞULU',
      desc: 'Rakibin tüm taşlarını bitiren veya rakibi hamlesiz bırakan kazanır.',
    },
  ];

  const currentRules = activeTab === 'turkish' ? turkishRules : diagonalRules;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        id="how-to-play-modal"
        className="w-full max-w-md max-h-[85vh] rounded-3xl bg-[#18191E] border border-white/10 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h3 className="font-cinzel text-lg font-bold tracking-wider text-amber-200 uppercase">
              NASIL OYNANIR?
            </h3>
            <p className="text-[11px] text-zinc-400">Dama Kuralları ve Taktikleri</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: Türk Daması vs Çapraz Dama */}
        <div className="px-5 pt-3 pb-1 border-b border-white/5">
          <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-950 border border-white/5">
            <button
              onClick={() => setActiveTab('turkish')}
              className={`py-2 rounded-lg text-xs font-bold tracking-wider transition-all ${
                activeTab === 'turkish'
                  ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              TÜRK DAMASI (Düz & Yan)
            </button>
            <button
              onClick={() => setActiveTab('diagonal')}
              className={`py-2 rounded-lg text-xs font-bold tracking-wider transition-all ${
                activeTab === 'diagonal'
                  ? 'bg-amber-500 text-zinc-950 shadow-md font-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              ÇAPRAZ DAMA (Klasik)
            </button>
          </div>
        </div>

        {/* Rules Content */}
        <div className="p-5 overflow-y-auto space-y-3">
          {currentRules.map((rule, idx) => (
            <div
              key={idx}
              className="flex gap-3.5 p-3 rounded-2xl bg-zinc-900/60 border border-white/5"
            >
              <div className="w-9 h-9 rounded-xl bg-zinc-950 border border-white/10 flex items-center justify-center shrink-0">
                {rule.icon}
              </div>
              <div className="text-left">
                <h4 className="text-[11px] font-bold tracking-wider text-zinc-200 mb-0.5">
                  {rule.title}
                </h4>
                <p className="text-[11.5px] text-zinc-400 leading-relaxed">
                  {rule.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-zinc-950/40">
          <button
            onClick={onClose}
            className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs tracking-widest uppercase transition-all duration-200"
          >
            ANLADIM / OYUNA DÖN
          </button>
        </div>
      </div>
    </div>
  );
};
