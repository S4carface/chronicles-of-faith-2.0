import { ENEMIES, ENEMY_POOL } from "@/data/enemies";
import { CARDS } from "@/data/cards";
import { HERO_MAP } from "@/data/heroes";
import { TRIVIA_QUESTIONS } from "@/data/trivia";
import { createRng, pick } from "@/game/mapGenerator";

const DAILY_THEMES = [
  { title: "Abraham's Faith", description: "Trust in the Lord, even when the path seems impossible.", verse: "Genesis 22:12" },
  { title: "David's Courage", description: "Face the giant with nothing but faith and a sling.", verse: "1 Samuel 17:50" },
  { title: "Daniel's Prayer", description: "Stand firm in devotion, even in the lion's den.", verse: "Daniel 6:16" },
  { title: "Noah's Obedience", description: "Build faithfully, even when the world mocks.", verse: "Genesis 6:22" },
  { title: "Moses at the Sea", description: "The Lord will fight for you; you need only to be still.", verse: "Exodus 14:14" },
  { title: "Esther's Courage", description: "For such a time as this, step forward in bravery.", verse: "Esther 4:14" },
  { title: "Peter's Redemption", description: "Even in failure, grace restores and calls anew.", verse: "Luke 22:61" },
  { title: "Paul's Endurance", description: "I have fought the good fight, I have finished the race.", verse: "2 Timothy 4:7" },
];

const SPECIAL_RULES = [
  { id: "trial_of_faith", name: "Trial of Faith", description: "Start with 10 less HP, but gain +1 Faith energy each turn.", maxHpMod: -10, maxEnergy: 4 },
  { id: "shielded_foe", name: "Shielded Foe", description: "The enemy begins battle with 10 Block.", enemyStartBlock: 10 },
  { id: "blessed_beginning", name: "Blessed Beginning", description: "You begin with an extra Rare card in your deck.", startWithRare: true },
  { id: "fortified_start", name: "Fortified Start", description: "You begin battle with 8 Block.", playerStartBlock: 8 },
  { id: "abundant_faith", name: "Abundant Faith", description: "You start with 5 max Faith energy instead of 3.", maxEnergy: 5 },
  { id: "mighty_adversary", name: "Mighty Adversary", description: "The enemy has 30% more HP.", enemyHpMult: 1.3 },
  { id: "tactical_hand", name: "Tactical Hand", description: "You start with 7 cards in hand instead of 5.", extraDraw: 2 },
];

const DIFFICULTY_CONFIG = {
  easy: {
    label: "Easy",
    enemyHpRange: [20, 26],
    damageMult: 0.7,
    goldRange: [20, 35],
    desc: "A gentle trial. Suitable for all ages.",
  },
  normal: {
    label: "Normal",
    enemyHpRange: [28, 38],
    damageMult: 1.0,
    goldRange: [35, 55],
    desc: "A fair challenge. Requires strategy and defense.",
  },
  hard: {
    label: "Hard",
    enemyHpRange: [40, 55],
    damageMult: 1.35,
    goldRange: [55, 85],
    desc: "A true test. Every card choice matters.",
  },
};

const DIFFICULTY_ORDER = ["easy", "normal", "hard"];

export function getDailySeed(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function getDailyChallenge(date = new Date()) {
  const seed = getDailySeed(date);
  const rng = createRng(seed);

  // Deterministic difficulty rotation based on day of year
  const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
  const difficultyKey = DIFFICULTY_ORDER[dayOfYear % 3];
  const difficulty = DIFFICULTY_CONFIG[difficultyKey];

  const theme = pick(rng, DAILY_THEMES);
  const enemyId = pick(rng, ENEMY_POOL);
  const enemyBase = ENEMIES[enemyId];

  // Scale enemy HP to difficulty range
  const [minHp, maxHp] = difficulty.enemyHpRange;
  const enemyHp = minHp + Math.floor(rng() * (maxHp - minHp + 1));

  // Scale enemy attack damage
  const enemy = {
    ...enemyBase,
    hp: enemyHp,
    attacks: enemyBase.attacks.map(a => ({
      ...a,
      damage: Math.max(1, Math.round(a.damage * difficulty.damageMult)),
    })),
  };

  const rule = pick(rng, SPECIAL_RULES);
  const hero = HERO_MAP["adam"];
  const trivia = TRIVIA_QUESTIONS[Math.floor(rng() * TRIVIA_QUESTIONS.length)];

  let deck = [...hero.starterDeck];
  if (rule.startWithRare) {
    const rareCards = CARDS.filter(c => c.rarity === "rare");
    deck.push(pick(rng, rareCards).id);
  }

  const playerMaxHp = Math.max(10, hero.maxHp + (rule.maxHpMod || 0));

  // Apply rule-based enemy HP multiplier
  if (rule.enemyHpMult) {
    enemy.hp = Math.round(enemy.hp * rule.enemyHpMult);
  }

  const [minGold, maxGold] = difficulty.goldRange;
  const goldReward = minGold + Math.floor(rng() * (maxGold - minGold + 1));

  return {
    seed,
    date: seed,
    theme,
    enemyId,
    enemy,
    rule,
    hero,
    deck,
    maxHp: playerMaxHp,
    playerHp: playerMaxHp,
    trivia,
    reward: { gold: goldReward },
    difficulty: difficultyKey,
    difficultyLabel: difficulty.label,
    difficultyDesc: difficulty.desc,
  };
}