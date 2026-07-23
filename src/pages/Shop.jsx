import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Gem,
  Inbox,
  Coins,
  Lightbulb,
  PartyPopper,
  Sparkles,
  LockKeyhole,
} from "lucide-react";
import { useGame } from "@/game/GameContext";
import { SHOP_ITEMS, isShopItemUnlocked, purchaseCardPack } from "@/game/shopRules";
import { getCardById } from "@/data/cards";
import CardDetailModal from "@/components/game/CardDetailModal";
import * as Sound from "@/game/soundManager";
import { getCardRarity } from "@/data/cardRarity";

const ICON_MAP = {
  common: Inbox,
  uncommon: Sparkles,
  rare: Package,
  legendary: Gem,
};

// `embedded` renders the Shop as a tab body inside the Cards hub (no back
// link, page title, or standalone background/Gold pill — the hub already
// supplies those). Standalone (embedded=false) preserves the original
// full-page look for direct rendering. Purchase logic and item data are
// identical either way (shared shopRules.js — no duplicated Shop logic).
export default function Shop({ embedded = false }) {
  const { profile, saveProfile, grantCard } = useGame();
  const [purchased, setPurchased] = useState(null);
  const [detailCard, setDetailCard] = useState(null);
  const gold = profile.gold || 0;

  useEffect(() => { if (!embedded) Sound.playMusic("menu"); }, [embedded]);

  const handleBuy = (item) => {
    const result = purchaseCardPack(item, profile, Math.random);

    if (!result.ok) {
      Sound.sfx.click();
      setPurchased({ message: result.message, isError: true });
      return;
    }

    // Exactly one gold deduction and one canonical card-or-Fragments grant per
    // successful purchase (the current card pack pool already excludes any
    // card the player owns, so this is a "card" grant today — routed through
    // the shared pipeline as a safety net if that pool logic ever changes).
    saveProfile({ gold: result.newGold });
    const grant = grantCard(result.cardId);
    setPurchased({
      message: result.message,
      card: getCardById(result.cardId),
      converted: grant.type === "fragments",
      fragmentAmount: grant.amount,
      isError: false,
    });
    Sound.sfx.reward();
  };

  const content = (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto mb-8">
        {SHOP_ITEMS.map((item) => {
          const isUnlocked = isShopItemUnlocked(item, profile);
          const canAfford = gold >= item.cost;
          const canPurchase = isUnlocked && canAfford;
          const Icon = ICON_MAP[item.icon] || Package;
          const rarity = getCardRarity(item.rarity);
          return (
            <div
  key={item.id}
  className={`p-6 rounded-xl border-2 text-center transition ${
    isUnlocked ? "" : "opacity-70"
  }`}
  style={{
    background:
      "linear-gradient(135deg, rgba(26,39,68,0.8) 0%, rgba(15,26,48,0.8) 100%)",
    borderColor: rarity.borderColor,
    boxShadow: `0 0 16px ${rarity.glowColor}`,
  }}
>
              <div className="flex justify-center mb-3">
                <div className="w-14 h-14 rounded-lg flex items-center justify-center border bg-slate-950/30" style={{ borderColor: rarity.borderColor, backgroundColor: `${rarity.shopBadgeColor}18` }}>
                  {isUnlocked ? (
  <Icon
    className="w-7 h-7"
    style={{ color: rarity.labelColor }}
  />
) : (
  <LockKeyhole className="w-7 h-7 text-slate-400" />
)}
                </div>
              </div>
              <h3 className="font-serif text-amber-100 text-lg mb-1">{item.name}</h3>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: rarity.labelColor }}>{rarity.displayName}</p>
              <p className="text-amber-100/50 text-xs mb-3">{item.desc}</p>
              <button
  onClick={() => handleBuy(item)}
  disabled={!canPurchase}
  className={`w-full px-4 py-2 rounded-lg border-2 font-bold transition flex items-center justify-center gap-1.5 ${
    canPurchase
      ? "border-amber-400/60 bg-amber-600/20 text-amber-100 hover:bg-amber-600/40"
      : "border-slate-700/30 text-slate-500 cursor-not-allowed"
  }`}
>
  {isUnlocked ? (
    <>
      <Coins className="w-4 h-4" />
      {canAfford ? `${item.cost} gold` : `Need ${item.cost} gold`}
    </>
  ) : (
    <>
      <LockKeyhole className="w-4 h-4" />
      Locked
    </>
  )}
</button>
              {!isUnlocked ? (
  <p className="text-slate-400 text-[10px] mt-2 text-center">
    {item.lockedText}
  </p>
) : !canAfford ? (
  <p className="text-amber-100/30 text-[9px] mt-1.5 text-center">
    Earn gold by winning battles
  </p>
) : (
  <p className="text-amber-100/30 text-[9px] mt-1.5 text-center">
    Contains one unowned card
  </p>
)}
            </div>
          );
        })}
      </div>

      {purchased && (
        <div
  className={`max-w-md mx-auto rounded-xl border-2 p-6 text-center animate-fade-in ${
    purchased.isError
      ? "border-red-400/40 bg-red-900/20"
      : "border-emerald-400/40 bg-emerald-900/20"
  }`}
>
          <div className="flex justify-center mb-2">
            {purchased.isError ? (
  <LockKeyhole className="w-8 h-8 text-red-300" />
) : (
  <PartyPopper className="w-8 h-8 text-emerald-400" />
)}
          </div>
          <p   className={`text-lg font-serif mb-2 ${     purchased.isError ? "text-red-200" : "text-emerald-200"   }`} >   {purchased.message} </p>
          {purchased.converted && (
            <p className="text-amber-200/80 text-sm mb-2">
              {purchased.card?.name} already owned — +{purchased.fragmentAmount} Card Fragments instead of another copy.
            </p>
          )}
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
    </>
  );

  // Embedded (Cards hub tab): no standalone page chrome — the hub already
  // supplies the background, title, and Gold display. Just the info blurb,
  // item grid, purchase feedback, modal, and verse.
  if (embedded) {
    return (
      <div>
        <div className="max-w-md mx-auto mb-6 rounded-xl border-2 border-amber-500/15 p-4 text-center" style={{ background: "rgba(15,26,48,0.6)" }}>
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-amber-300/60 flex-shrink-0 mt-0.5" />
            <p className="text-amber-100/60 text-sm text-left">
              Each pack contains one random card you do not already own. Stronger rarities require story progress and substantially more gold.
            </p>
          </div>
        </div>
        {content}
      </div>
    );
  }

  // Standalone (legacy/direct render) — original full-page look, unchanged.
  return (
    <div className="min-h-screen p-6" style={{ background: "linear-gradient(180deg, #0F1A30 0%, #1A2744 50%, #0A0F1E 100%)" }}>
      <div className="flex items-center justify-between mb-8">
        <Link to="/" onClick={() => Sound.sfx.click()} className="text-amber-100/60 hover:text-amber-200 transition text-sm">← Menu</Link>
        <div className="text-center">
          <h1 className="text-3xl font-serif text-amber-200">Marketplace</h1>
          <p className="text-amber-100/60 text-xs mt-1">   Open card packs and expand your collection </p>
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
            Each pack contains one random card you do not already own. Stronger rarities require story progress and substantially more gold.
          </p>
        </div>
      </div>

      {content}
    </div>
  );
}
