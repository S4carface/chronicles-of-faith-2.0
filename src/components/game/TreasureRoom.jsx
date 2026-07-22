import React, { useState, useEffect } from "react";
import { useGame } from "@/game/GameContext";
import { getCardById } from "@/data/cards";
import { ROOM_ART, PLACEHOLDER_ART, getNodeArt } from "@/data/art";
import { generateTreasureCard, RUN_DECK_MAX, DUPLICATE_GOLD_BONUS } from "@/game/deckRules";
import * as Sound from "@/game/soundManager";
import Card from "@/components/game/Card";
import CardDetailModal from "@/components/game/CardDetailModal";
import DeckFullModal from "@/components/game/DeckFullModal";
import { CARD_ART } from "@/data/art";
import { preloadImages } from "@/lib/imageAssets";
import SafeImage from "@/components/ui/SafeImage";
import { getCardRarity } from "@/data/cardRarity";

export default function TreasureRoom() {
  const { run, profile, updateRun, completeRoom, addCardToCollection, addCardToRunDeck, replaceCardInRun } = useGame();
  const node = run.currentNode;
  const [claimed, setClaimed] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [deckFullCard, setDeckFullCard] = useState(null);
  const [assetsReady, setAssetsReady] = useState(false);

  // Generate treasure card using treasure drop rates, honoring the one-shot
  // "Rare or better" reward and first-run Legendary gating.
  const [rewardCardId] = useState(
    () =>
      generateTreasureCard(Math.random, {
        rareOrBetter: run.nextCardRare === true,
        firstRun: !profile.genesisCompleted,
      }) || "sling_stone"
  );
  const card = getCardById(rewardCardId);

  // The upgraded reward has now been generated — consume the one-shot flag.
  useEffect(() => {
    if (run.nextCardRare) updateRun({ nextCardRare: false });
  }, []);

  useEffect(() => {
    Sound.stopMusic();
    let active = true;
    preloadImages([ROOM_ART.treasure, CARD_ART[rewardCardId]]).finally(() => {
      if (active) setAssetsReady(true);
    });
    return () => { active = false; };
  }, [rewardCardId]);

  const handleClaim = () => {
    Sound.sfx.reward();
    addCardToCollection(rewardCardId);
    setClaimed(true);
  };

  const handleContinue = () => {
    Sound.sfx.click();
    const collection = profile.cardCollection || {};
    const alreadyOwned = (collection[rewardCardId] || 0) > 1; // >1 because we just added one in claim
    if (alreadyOwned) {
      const goldBonus = DUPLICATE_GOLD_BONUS[card?.rarity] || 5;
      updateRun({ gold: (run.gold || 0) + goldBonus });
    }
    if (run.deck.length < RUN_DECK_MAX) {
      addCardToRunDeck(rewardCardId);
      preloadImages(run.map.flat().map(getNodeArt)).then(() => completeRoom(node.id));
    } else {
      setDeckFullCard(rewardCardId);
    }
  };

  const handleDeckFullReplace = (index) => {
    replaceCardInRun(index, deckFullCard);
    setDeckFullCard(null);
    preloadImages(run.map.flat().map(getNodeArt)).then(() => completeRoom(node.id));
  };

  const handleDeckFullSendToCollection = () => {
    setDeckFullCard(null);
    preloadImages(run.map.flat().map(getNodeArt)).then(() => completeRoom(node.id));
  };

  const handleDeckFullSkip = () => {
    setDeckFullCard(null);
    preloadImages(run.map.flat().map(getNodeArt)).then(() => completeRoom(node.id));
  };

  if (!card) return null;

  if (!assetsReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1A2744] to-[#0A0F1E] text-amber-200">
        <div className="rounded-xl border border-amber-400/35 bg-[#0F1A30]/90 px-6 py-4 text-center shadow-[0_0_24px_rgba(251,191,36,0.15)]">
          <span className="text-2xl text-amber-300/60">✦</span>
          <p className="mt-2 font-serif">Preparing your gift…</p>
        </div>
      </div>
    );
  }

  const collection = profile.cardCollection || {};
  const alreadyOwned = (collection[rewardCardId] || 0) > 0;
  const goldBonus = DUPLICATE_GOLD_BONUS[card.rarity] || 5;
  const rarity = getCardRarity(card.rarity);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "radial-gradient(ellipse at center, #1A2744 0%, #0A0F1E 100%)" }}>
      <div className="text-center mb-8">
        <div className="mb-4 flex justify-center animate-bounce">
          <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-amber-400/30" style={{ background: "#0F1A30" }}>
            <SafeImage src={ROOM_ART.treasure || PLACEHOLDER_ART} alt="Treasure" className="art-portrait" />
          </div>
        </div>
        <h2 className="text-3xl font-serif text-amber-200">A Gift from Above</h2>
        <p className="text-amber-100/50 text-sm mt-2 max-w-md">
          You have found a Biblical artifact. Claim it to add to your collection and deck.
        </p>
      </div>

      {/* Rarity label */}
      <div className="mb-3 text-center">
        <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border bg-slate-950/45" style={{ borderColor: rarity.borderColor, color: rarity.labelColor, boxShadow: `0 0 12px ${rarity.glowColor}` }}>{rarity.displayName}</span>
      </div>

      <style>{`@keyframes sacredCardReveal { from { opacity: 0; transform: scale(.96); filter: drop-shadow(0 0 0 rgba(251,191,36,0)); } to { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 14px rgba(251,191,36,.28)); } }`}</style>
      <div className={claimed ? "animate-pulse" : ""} onClick={() => { Sound.sfx.click(); setShowDetail(true); }} style={{ cursor: "pointer", animation: "sacredCardReveal 400ms ease-out both" }}>
        <Card card={card} />
      </div>

      <div className="mt-6 text-center max-w-sm">
        <p className="text-amber-100/70 text-sm italic mb-2">{card.description}</p>
        <p className="text-amber-300/60 text-xs">"{card.verse}"</p>
        {alreadyOwned && (
          <div className="mt-3 p-2 rounded-lg border border-amber-500/20 bg-amber-900/10">
            <p className="text-amber-200/70 text-[11px] font-semibold">⚠ Already Owned</p>
            <p className="text-amber-100/50 text-[10px]">Claiming this duplicate grants +{goldBonus} gold bonus.</p>
          </div>
        )}
      </div>

      {showDetail && (
        <CardDetailModal
          card={card}
          owned={claimed}
          justCollected={claimed}
          onClose={() => setShowDetail(false)}
        />
      )}

      {!claimed ? (
        <button
          onClick={handleClaim}
          className="mt-8 px-8 py-3 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-bold text-lg hover:bg-amber-600/40 transition"
        >
          Claim Treasure
        </button>
      ) : (
        <button
          onClick={handleContinue}
          className="mt-8 px-8 py-3 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-serif text-lg hover:bg-amber-600/40 transition animate-fade-in"
        >
          Continue →
        </button>
      )}

      {deckFullCard && (
        <DeckFullModal
          rewardCardId={deckFullCard}
          runDeck={run.deck}
          onReplace={handleDeckFullReplace}
          onSendToCollection={handleDeckFullSendToCollection}
          onSkip={handleDeckFullSkip}
        />
      )}
    </div>
  );
}
