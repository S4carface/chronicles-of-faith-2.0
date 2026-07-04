import React, { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, RotateCcw } from "lucide-react";
import { useGame } from "@/game/GameContext";
import { getCardById } from "@/data/cards";
import { TREASURE_REWARDS } from "@/data/genesisRooms";
import { pick } from "@/game/mapGenerator";
import { STORY_ART, PLACEHOLDER_ART } from "@/data/art";
import { generateTreasureCard, RUN_DECK_MAX } from "@/game/deckRules";
import * as Sound from "@/game/soundManager";
import DeckFullModal from "@/components/game/DeckFullModal";

export default function StoryChoiceRoom() {
  const { run, completeRoom, updateRun, profile, addCardToCollection, addCardToRunDeck, replaceCardInRun } = useGame();
  const node = run.currentNode;
  const story = node?.storyChoice;
  const [chosen, setChosen] = useState(null);
  const [resultText, setResultText] = useState("");
  const [narrationOn, setNarrationOn] = useState(profile.settings.narration !== false);
  const [deckFullCard, setDeckFullCard] = useState(null);
  const narratedRef = useRef(null);

  useEffect(() => {
    Sound.playMusic("story");
    if (narrationOn && !narratedRef.current && story?.narration) {
      narratedRef.current = true;
      Sound.speakNarration(story.narration + " " + story.prompt, (profile.settings.narrationVolume ?? 50) / 100);
    }
    return () => Sound.stopNarration();
  }, []);

  if (!story) return null;

  const replayNarration = () => {
    Sound.speakNarration(story.narration + " " + story.prompt, (profile.settings.narrationVolume ?? 50) / 100);
  };

  const toggleNarration = () => {
    if (narrationOn) {
      Sound.stopNarration();
      setNarrationOn(false);
    } else {
      setNarrationOn(true);
      replayNarration();
    }
  };

  const handleChoose = (choiceKey) => {
    Sound.stopNarration();
    const choice = choiceKey === "a" ? story.choice_a : story.choice_b;
    Sound.sfx.click();
    setChosen(choiceKey);
    setResultText(choice.effect.text);

    // Apply effects
    if (choice.effect.type === "faith") {
      updateRun({ buffAttack: run.buffAttack + choice.effect.value });
    } else if (choice.effect.type === "heal") {
      updateRun({ playerHp: Math.min(run.maxHp, run.playerHp + choice.effect.value) });
    } else if (choice.effect.type === "damage") {
      updateRun({ playerHp: Math.max(1, run.playerHp + choice.effect.value) });
    } else if (choice.effect.type === "block") {
      updateRun({ buffAttack: run.buffAttack + choice.effect.value });
    } else if (choice.effect.type === "miracle_card") {
      // Add to collection + run deck (with 15 cap)
      addCardToCollection("angel_lord");
      if (run.deck.length < RUN_DECK_MAX) {
        addCardToRunDeck("angel_lord");
      }
    } else if (choice.effect.type === "card_upgrade") {
      updateRun({ nextCardRare: true });
    }

    if (choice.effect.cardReward) {
      const reward = generateTreasureCard(Math.random) || pick(Math.random, TREASURE_REWARDS);
      addCardToCollection(reward);
      if (run.deck.length < RUN_DECK_MAX) {
        addCardToRunDeck(reward);
      }
    }
    if (choice.effect.gold) {
      updateRun({ gold: run.gold + choice.effect.gold });
    }

    // Record story choice
    updateRun({ storyChoices: [...run.storyChoices, { id: story.id, choice: choiceKey }] });
  };

  const handleContinue = () => {
    Sound.stopNarration();
    Sound.sfx.click();
    completeRoom(node.id);
  };

  const handleDeckFullReplace = (index) => {
    replaceCardInRun(index, deckFullCard);
    setDeckFullCard(null);
    completeRoom(node.id);
  };

  const handleDeckFullSendToCollection = () => {
    setDeckFullCard(null);
    completeRoom(node.id);
  };

  const handleDeckFullSkip = () => {
    setDeckFullCard(null);
    completeRoom(node.id);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative" style={{ background: "radial-gradient(ellipse at center, #1A1A2E 0%, #0A0A15 100%)" }}>
      {/* Narration controls */}
      <div className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 flex gap-2 z-10">
        <button
          onClick={toggleNarration}
          className="w-9 h-9 rounded-full border border-amber-500/30 bg-slate-900/60 flex items-center justify-center text-amber-200 hover:bg-amber-500/20 transition"
        >
          {narrationOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
        {narrationOn && (
          <button
            onClick={replayNarration}
            className="w-9 h-9 rounded-full border border-amber-500/30 bg-slate-900/60 flex items-center justify-center text-amber-200 hover:bg-amber-500/20 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="text-center mb-8 max-w-2xl">
        <div className="mb-4 flex justify-center">
          <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-amber-400/30" style={{ background: "#0F1A30" }}>
            <img src={STORY_ART[story.id] || PLACEHOLDER_ART} alt={story.id} className="art-portrait" />
          </div>
        </div>
        {story.summary && (
          <div className="mb-4 px-4 py-2 rounded-lg border border-amber-400/25 bg-amber-900/10 inline-block">
            <p className="text-amber-300/50 text-[9px] uppercase tracking-widest mb-0.5">Quick Summary</p>
            <p className="text-amber-100/70 text-sm font-serif">{story.summary}</p>
          </div>
        )}
        <p className="text-amber-100/40 text-xs italic mb-4">{story.narration}</p>
        <h2 className="text-2xl md:text-3xl font-serif text-amber-100 leading-relaxed">{story.prompt}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
        {["a", "b"].map((key) => {
          const choice = key === "a" ? story.choice_a : story.choice_b;
          return (
            <button
              key={key}
              onClick={() => !chosen && handleChoose(key)}
              disabled={chosen !== null}
              className={`p-6 rounded-xl border-2 text-center transition-all duration-300 ${
                chosen === key
                  ? "border-amber-300 bg-amber-500/20 scale-105"
                  : chosen !== null
                  ? "border-slate-700/30 opacity-30"
                  : "border-amber-500/30 bg-amber-900/10 hover:border-amber-400/60 hover:bg-amber-500/10 hover:scale-105 cursor-pointer"
              }`}
              style={{ background: "linear-gradient(135deg, rgba(26,39,68,0.8) 0%, rgba(15,26,48,0.8) 100%)" }}
            >
              <div className="text-3xl mb-3">{choice.icon}</div>
              <p className="font-serif text-amber-100 text-lg">{choice.label}</p>
            </button>
          );
        })}
      </div>

      {chosen && resultText && (
        <div className="mt-8 text-center animate-fade-in">
          <p className="text-amber-200 text-lg font-serif mb-6">{resultText}</p>
          <button
            onClick={handleContinue}
            className="px-10 py-3 rounded-lg border-2 border-amber-400/60 bg-amber-600/20 text-amber-100 font-serif text-lg hover:bg-amber-600/40 transition"
          >
            Continue →
          </button>
        </div>
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