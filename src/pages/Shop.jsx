import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, Gem, Inbox, Coins, Lightbulb, PartyPopper } from "lucide-react";
import { useGame } from "@/game/GameContext";
import { getCardById, CARDS } from "@/data/cards";
import CardDetailModal from "@/components/game/CardDetailModal";
import * as Sound from "@/game/soundManager";

const ICON_MAP = {
  common: Inbox,
  rare: Package,
  legendary: Gem,
};

const SHOP_ITEMS = [
  { id: "shop_rare_card", name: "Rare Card Pack", icon: "rare", cost: 50, desc: "Get a random Rare card for your collection.", type: "card_pack", rarity: "rare" },
  { id: "shop_legendary_card", name: "Legendary Relic", icon: "legendary", cost: 120, desc: "Get a random Legendary card. Very rare!", type: "card_pack", rarity: "legendary" },
  { id: "shop_common_card", name: "Common Card Pack", icon: "common", cost: 20, desc: "Get a random Common card for your collection.", type: "card_pack", rarity: "common" },
];

export default function Shop() {
  const { profile, saveProfile, addCardsToCollection } = useGame();
  const [purchased, setPurchased] = useState(null);
  const [detailCard, setDetailCard] = useState(null);
  const gold = profile.gold || 0;

  useEffect(() => { Sound.playMusic("menu"); }, []);

  const handleBuy = (item) => {
    if (gold < item.cost) {
      Sound.sfx.click();
      return;
    }
    if (item.type === "card_pack") {
      const pool = CARDS.filter(c => c.rarity === item.rarity && !profile.collectedCards.includes(c.id));
      if (pool.length === 0) {
        setPurchased({ message: "You already own all cards of this rarity!" });
        return;
      }
      const card = pool[Math.floor(Math.random() * pool.length)];
      saveProfile({ gold: gold - item.cost });
      addCardsToCollection([card.id]);
      setPurchased({ message: `You got: ${card.name}!`, card });
      Sound.sfx.reward();
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ background: "linear-gradient(180deg, #0F1A30 0%, #1A2744 50%, #0A0F1E 100%)" }}>
      <div className="flex items-center justify-between mb-8">
        <Link to="/" onClick={() => Sound.sfx.click()} className="text-amber-100/60 hover:text-amber-200 transition text-sm">← Menu</Link>
        <div className="text-center">
          <h1 className="text-3xl font-serif text-amber-200">The Marketplace</h1>
          <p className="text-amber-100/60 text-xs mt-1">Buy card packs and relics</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-400/30 bg-amber-900/20">
          <Coins className="w-5 h-5 text-amber-300" />
          <span className="text-amber-200 font-bold text-lg">{gold}</span>
        </div>
      </div>

      <div className="max-w-md mx-auto mb-8 rounded-xl border-2 border-amber-500/15 p-4 text-center" style={{ background: "rgba(15,26,48,0.6)" }}>
        <div className="flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-amber-300/60 flex-shrink-0 mt-0.5" />
          <p className="text-amber-100/60 text-sm text-left">
            Earn gold by winning battles and completing runs. Spend it here to expand your card collection!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
        {SHOP_ITEMS.map((item) => {
          const canAfford = gold >= item.cost;
          const Icon = ICON_MAP[item.icon] || Package;
          return (
            <div
              key={item.id}
              className="p-6 rounded-xl border-2 text-center"
              style={{
                background: "linear-gradient(135deg, rgba(26,39,68,0.8) 0%, rgba(15,26,48,0.8) 100%)",
                borderColor: item.rarity === "legendary" ? "rgba(252,211,77,0.5)" : item.rarity === "rare" ? "rgba(52,211,153,0.5)" : "rgba(56,189,248,0.5)",
              }}
            >
              <div className="flex justify-center mb-3">
                <div className={`w-14 h-14 rounded-lg flex items-center justify-center border ${
                  item.rarity === "legendary" ? "border-amber-400/40 bg-amber-500/10" :
                  item.rarity === "rare" ? "border-emerald-400/40 bg-emerald-500/10" :
                  "border-sky-400/40 bg-sky-500/10"
                }`}>
                  <Icon className={`w-7 h-7 ${
                    item.rarity === "legendary" ? "text-amber-300" :
                    item.rarity === "rare" ? "text-emerald-300" : "text-sky-300"
                  }`} />
                </div>
              </div>
              <h3 className="font-serif text-amber-100 text-lg mb-1">{item.name}</h3>
              <p className="text-amber-100/50 text-xs mb-3">{item.desc}</p>
              <button
                onClick={() => handleBuy(item)}
                disabled={!canAfford}
                className={`w-full px-4 py-2 rounded-lg border-2 font-bold transition flex items-center justify-center gap-1.5 ${
                  canAfford
                    ? "border-amber-400/60 bg-amber-600/20 text-amber-100 hover:bg-amber-600/40"
                    : "border-slate-700/30 text-slate-500 cursor-not-allowed"
                }`}
              >
                <Coins className="w-4 h-4" />
                {canAfford ? `${item.cost} gold` : `Need ${item.cost} gold`}
              </button>
              {!canAfford && (
                <p className="text-amber-100/30 text-[9px] mt-1.5 text-center">Earn gold by winning battles</p>
              )}
            </div>
          );
        })}
      </div>

      {purchased && (
        <div className="max-w-md mx-auto rounded-xl border-2 border-emerald-400/40 bg-emerald-900/20 p-6 text-center animate-fade-in">
          <div className="flex justify-center mb-2">
            <PartyPopper className="w-8 h-8 text-emerald-400" />
          </div>
          <p className="text-emerald-200 text-lg font-serif mb-2">{purchased.message}</p>
          {purchased.card && (
            <button
              onClick={() => { Sound.sfx.click(); setDetailCard(purchased.card); }}
              className="text-amber-200 underline text-sm hover:text-amber-100"
            >
              View card details →
            </button>
          )}
          <button
            onClick={() => setPurchased(null)}
            className="block mx-auto mt-4 text-amber-100/60 text-sm hover:text-amber-200"
          >
            Close
          </button>
        </div>
      )}

      {detailCard && (
        <CardDetailModal
          card={detailCard}
          owned={true}
          onClose={() => setDetailCard(null)}
        />
      )}

      <p className="text-amber-100/50 text-xs mt-12 font-serif italic text-center max-w-md mx-auto">
        "The wealth of the rich is their fortified city, but poverty is the ruin of the poor." — Proverbs 10:15
      </p>
    </div>
  );
}