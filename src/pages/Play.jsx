import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/game/GameContext";
import MapView from "@/components/game/MapView";
import BattleScreen from "@/components/game/BattleScreen";
import BossPreparation from "@/components/game/BossPreparation";
import TreasureRoom from "@/components/game/TreasureRoom";
import DivineIntervention from "@/components/game/DivineIntervention";
import StoryChoiceRoom from "@/components/game/StoryChoiceRoom";
import RewardScreen from "@/components/game/RewardScreen";
import VictoryScreen from "@/components/game/VictoryScreen";
import DefeatScreen from "@/components/game/DefeatScreen";
import StoryNarration from "@/components/game/StoryNarration";
import RestRoom from "@/components/game/RestRoom";
import HeroSelect from "@/components/game/HeroSelect";
import DailyTrivia from "@/components/game/DailyTrivia";
import DailyResultScreen from "@/components/game/DailyResultScreen";

export default function Play() {
  const { run, selectNode, endRun, saveAndExit } = useGame();
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
        summary={run.narrationSummary}
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
        onExit={() => { saveAndExit(); navigate("/"); }}
        fogOfWar={run.fogOfWar}
        playerHp={run.playerHp}
        maxHp={run.maxHp}
        difficulty={run.difficulty}
      />
    );
  }

// Boss preparation
if (run.phase === "bossPrep") {
  return <BossPreparation />;
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

  // Daily: trivia after victory
  if (run.phase === "reward" && run.isDaily) {
    return <DailyTrivia />;
  }

  // Daily: results screen
  if (run.phase === "dailyResult") {
    return <DailyResultScreen />;
  }

  // Daily: defeat routes to results
  if (run.phase === "defeat" && run.isDaily) {
    return <DailyResultScreen />;
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
      <button onClick={() => { saveAndExit(); navigate("/"); }} className="px-6 py-3 border border-amber-400/40 rounded-lg">
        Save &amp; Exit to Menu
      </button>
    </div>
  );
}