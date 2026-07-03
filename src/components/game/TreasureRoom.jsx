import React, { useState, useEffect } from "react";
import { useGame } from "@/game/GameContext";
import { getCardById } from "@/data/cards";
import { pick } from "@/game/mapGenerator";
import { TREASURE_REWARDS } from "@/data/genesisRooms";
import Card from "@/components/game/Card";
import CardDetailModal from "@/components/game/CardDetailModal";
import { ROOM_ART, PLACEHOLDER_ART } from "@/data/art";
import * as Sound from "@/game/soundManager";

export default function TreasureRoom() {
  const { run, completeRoom } = useGame();
  const node = run.currentNode;
  const rewardCardId = node?.treasureReward || pick(Math.random, TREASURE_REWARDS);
  const card = getCardById(rewardCardId);
  const [claimed, setClaimed] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    Sound.playMusic("divine");
  }, []);

  const handleClaim = () => {
    Sound.sfx.reward();
    setClaimed(true);
  };

  const handleContinue = () => {
    Sound.sfx.click();
    completeRoom(node.id, { cardId: rewardCardId });
  };

  if (!card) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "radial-gradient(ellipse at center, #1A2744 0%, #0A0F1E 100%)" }}>
      <div className="text-center mb-8">
        <div className="mb-4 flex justify-center animate-bounce">
          <img src={ROOM_ART.treasure || PLACEHOLDER_ART} alt="Treasure" className="w-16 h-16 object-cover rounded-xl border-2 border-amber-400/30" />
        </div>
        <h2 className="text-3xl font-serif text-amber-200">A Gift from Above</h2>
        <p className="text-amber-100/50 text-sm mt-2 max-w-md">
          You have found a Biblical artifact. It has been added to your collection and deck.
        </p>
      </div>

      <div className={claimed ? "animate-pulse" : ""} onClick={() => { Sound.sfx.click(); setShowDetail(true); }} style={{ cursor: "pointer" }}>
        <Card card={card} />
      </div>

      <div className="mt-6 text-center max-w-sm">
        <p className="text-amber-100/70 text-sm italic mb-2">{card.description}</p>
        <p className="text-amber-300/60 text-xs">"{card.verse}"</p>
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
    </div>
  );
}