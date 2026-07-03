import React, { useState, useEffect } from "react";
import { useGame } from "@/game/GameContext";
import { getCardById } from "@/data/cards";
import { TREASURE_REWARDS } from "@/data/genesisRooms";
import { pick } from "@/game/mapGenerator";
import * as Sound from "@/game/soundManager";

export default function StoryChoiceRoom() {
  const { run, completeRoom, updateRun } = useGame();
  const node = run.currentNode;
  const story = node?.storyChoice;
  const [chosen, setChosen] = useState(null);
  const [resultText, setResultText] = useState("");

  useEffect(() => {
    Sound.playMusic("divine");
  }, []);

  if (!story) return null;

  const handleChoose = (choiceKey) => {
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
      updateRun({ deck: [...run.deck, "angel_lord"] });
    } else if (choice.effect.type === "card_upgrade") {
      updateRun({ nextCardRare: true });
    }

    if (choice.effect.cardReward) {
      const reward = pick(Math.random, TREASURE_REWARDS);
      updateRun({ deck: [...run.deck, reward] });
    }
    if (choice.effect.gold) {
      updateRun({ gold: run.gold + choice.effect.gold });
    }

    // Record story choice
    updateRun({ storyChoices: [...run.storyChoices, { id: story.id, choice: choiceKey }] });
  };

  const handleContinue = () => {
    Sound.sfx.click();
    const choice = chosen === "a" ? story.choice_a : story.choice_b;
    if (choice.effect.type === "miracle_card") {
      completeRoom(node.id, { cardId: "angel_lord" });
    } else {
      completeRoom(node.id);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "radial-gradient(ellipse at center, #1A1A2E 0%, #0A0A15 100%)" }}>
      <div className="text-center mb-8 max-w-2xl">
        <div className="text-6xl mb-4">{story.icon}</div>
        <p className="text-amber-100/50 text-sm italic mb-4">{story.narration}</p>
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
    </div>
  );
}