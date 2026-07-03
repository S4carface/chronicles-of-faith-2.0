import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/game/GameContext";
import MapView from "@/components/game/MapView";
import BattleScreen from "@/components/game/BattleScreen";
import TreasureRoom from "@/components/game/TreasureRoom";
import DivineIntervention from "@/components/game/DivineIntervention";
import StoryChoiceRoom from "@/components/game/StoryChoiceRoom";
import RewardScreen from "@/components/game/RewardScreen";
import VictoryScreen from "@/components/game/VictoryScreen";
import DefeatScreen from "@/components/game/DefeatScreen";
import StoryNarration from "@/components/game/StoryNarration";
import RestRoom from "@/components/game/RestRoom";
import HeroSelect from "@/components/game/HeroSelect";

export default function Play() {
  const { run, selectNode, endRun } = useGame();
  const navigate = useNavigate();
  const [introShown, setIntroShown] = useState(false);

  // No active run — show hero selection
  if (!run) {
    return <HeroSelect />;
  }

  // Opening narration — auto-select first room on continue (player doesn't choose first room)
  if (run.phase === "map" && run.roomsCleared === 0 && !run.currentNode && !introShown) {
    return (
      <StoryNarration
        text={run.narrationText}
        onComplete={() => {
          setIntroShown(true);
          selectNode(run.map[0][0].id);
        }}
      />
    );
  }

  // Map view
  if (run.phase === "map") {
    return (
      <MapView
        map={run.map}
        currentNode={run.currentNode}
        onSelectNode={selectNode}
        onExit={() => { endRun(); navigate("/"); }}
      />
    );
  }

  // Battle
  if (run.phase === "battle") {
    return <BattleScreen />;
  }

  // Treasure
  if (run.phase === "treasure") {
    return <TreasureRoom />;
  }

  // Divine intervention
  if (run.phase === "divine") {
    return <DivineIntervention />;
  }

  // Story choice
  if (run.phase === "story") {
    return <StoryChoiceRoom />;
  }

  // Rest room (campfire)
  if (run.phase === "rest") {
    return <RestRoom />;
  }

  // Reward (post-battle: narration + trivia + card selection)
  if (run.phase === "reward") {
    return <RewardScreen />;
  }

  // Victory
  if (run.phase === "victory") {
    return <VictoryScreen />;
  }

  // Defeat
  if (run.phase === "defeat") {
    return <DefeatScreen />;
  }

  // Mystery room resolves to its real type
  if (run.phase === "mystery") {
    return null;
  }

  // Fallback
  return (
    <div className="min-h-screen flex items-center justify-center text-amber-200">
      <button onClick={() => { endRun(); navigate("/"); }} className="px-6 py-3 border border-amber-400/40 rounded-lg">
        Return to Menu
      </button>
    </div>
  );
}