import React, { useMemo } from "react";
import { Swords, Shield, BookOpen, Heart, X } from "lucide-react";
import { useGame } from "@/game/GameContext";
import { getCardById } from "@/data/cards";
import { validateDeck, DECK_SIZE } from "@/game/deckRules";
import { CARD_ART, PLACEHOLDER_ART } from "@/data/art";
import * as Sound from "@/game/soundManager";
import RarityCardFrame from "@/components/ui/RarityCardFrame";
import { getCardRarity } from "@/data/cardRarity";

const TYPE_COLORS = {
  attack: "text-red-300",
  defense: "text-blue-300",
  scripture: "text-emerald-300",
  miracle: "text-yellow-200",
};

export default function DeckBuilderTab() {
  const { profile, removeFromActiveDeck } = useGame();
  const activeDeck = profile.activeDeck || [];
  const validation = useMemo(() => validateDeck(activeDeck), [activeDeck]);
  const stats = validation.stats;

  return (
    <div>
      {/* Explanation */}
      <div className="max-w-2xl mx-auto mb-4 text-center">
        <p className="text-amber-100/50 text-xs lg:text-sm italic mb-1">
          These are the cards you bring into battle.
        </p>
        <p className="text-amber-100/40 text-[10px] lg:text-xs">
          Max 2 copies of Common or Uncommon · Max 1 copy of Rare or Legendary per deck
        </p>
      </div>

      {/* Deck count + validation */}
      <div className="max-w-2xl mx-auto mb-4 text-center">
        <p className="text-amber-100/70 text-sm font-serif">
          Active Deck: <span className={`font-bold ${activeDeck.length === DECK_SIZE ? "text-emerald-300" : "text-amber-300"}`}>{activeDeck.length} / {DECK_SIZE}</span>
        </p>
        {validation.valid ? (
          <p className="text-emerald-300/80 text-xs mt-1">✓ Deck is ready.</p>
        ) : (
          <div className="mt-2 p-2 rounded-lg border border-red-400/30 bg-red-900/15">
            <p className="text-red-300 text-xs font-bold">Your deck needs {DECK_SIZE} cards before you can start.</p>
            <ul className="text-red-300/70 text-[10px] mt-1 list-disc list-inside">
              {validation.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Deck balance */}
      <div className="max-w-2xl mx-auto mb-4 grid grid-cols-4 gap-2">
        <BalanceCard icon={Swords} label="Attack" value={stats.attack} max={4} color="text-red-300" />
        <BalanceCard icon={Shield} label="Defense" value={stats.defense} max={4} color="text-blue-300" />
        <BalanceCard icon={BookOpen} label="Scripture" value={stats.scripture} color="text-emerald-300" />
        <BalanceCard icon={Heart} label="Healing" value={stats.healing} max={3} color="text-yellow-200" />
      </div>

      {/* Deck cards with remove buttons */}
      {activeDeck.length === 0 ? (
        <p className="text-amber-100/50 text-center text-sm py-8">Your deck is empty. Go to the Collection tab to add cards.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-w-3xl mx-auto pb-12">
          {activeDeck.map((cardId, idx) => {
            const card = getCardById(cardId);
            if (!card) return null;
            const rarity = getCardRarity(card.rarity);
            return (
              <div key={idx} className="flex flex-col items-center">
                <RarityCardFrame rarity={rarity.key} enableTilt={false} className="w-20 h-36 rounded-lg border-2 bg-gradient-to-b from-slate-800 to-slate-900 p-1.5 flex flex-col items-center justify-between overflow-hidden">
                  <div className="text-[8px] text-amber-300/60 w-full text-right">{card.cost} ✨</div>
                  <div className="w-12 h-12 rounded overflow-hidden" style={{ background: "#0F1A30" }}>
                    <img src={CARD_ART[card.id] || PLACEHOLDER_ART} alt={card.name} className="art-portrait" />
                  </div>
                  <div className="text-[9px] font-serif text-amber-100 text-center leading-tight">{card.name}</div>
                  <div className="text-[7px] uppercase font-bold" style={{ color: rarity.labelColor }}>{rarity.displayName}</div>
                  <div className={`text-[7px] uppercase font-bold ${TYPE_COLORS[card.type] || "text-amber-300/50"}`}>{card.type}</div>
                </RarityCardFrame>
                <button
                  onClick={() => { Sound.sfx.click(); removeFromActiveDeck(idx); }}
                  aria-label={`Remove ${card.name} from deck`}
                  className="mt-1 flex min-h-11 w-full items-center justify-center gap-1 rounded-lg border border-red-400/20 px-2 text-[11px] text-red-300/70 transition hover:border-red-400/40 hover:text-red-200"
                >
                  <X className="h-3 w-3" /> Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BalanceCard({ icon: Icon, label, value, max, color }) {
  return (
    <div className="text-center p-2 rounded-lg border border-amber-500/10 bg-slate-900/30">
      <Icon className={`mx-auto mb-1 h-4 w-4 ${color}`} />
      <p className={`text-lg font-bold ${color}`}>{value}{max ? `/${max}` : ""}</p>
      <p className="text-amber-100/40 text-[9px] uppercase tracking-wide">{label}</p>
    </div>
  );
}
