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
  {
  id: "tactical_hand",
  name: "Prepared Spirit",
  description: "Begin battle with 1 additional Faith.",
  maxEnergy: 4
},
];

// Daily HP is derived from the enemy's OWN base HP (respecting its design)
// scaled by a bounded per-difficulty multiplier, then clamped into a target
// band, then (for surviving modifiers) any HP bonus, then a hard safety cap.
// This keeps a fixed-starter-deck challenge clearable in ~6-12 turns and
// prevents the old bug where base HP was discarded for a 40-55 range and then
// multiplied again (Cain 32 -> 64).
const DIFFICULTY_CONFIG = {
  easy: {
    label: "Easy",
    hpMult: 0.95,
    hpBand: [28, 36],
    damageMult: 0.8,
    goldRange: [20, 35],
    desc: "A gentle trial. Suitable for all ages.",
  },
  normal: {
    label: "Normal",
    hpMult: 1.15,
    hpBand: [34, 42],
    damageMult: 1.0,
    goldRange: [35, 55],
    desc: "A fair challenge. Requires strategy and defense.",
  },
  hard: {
    label: "Hard",
    hpMult: 1.35,
    hpBand: [40, 50],
    damageMult: 1.2,
    goldRange: [55, 85],
    desc: "A true test. Every card choice matters.",
  },
};

const DIFFICULTY_ORDER = ["easy", "normal", "hard"];

// Absolute ceiling on a Daily enemy's final HP for the fixed starter deck, so
// even a modifier-boosted enemy stays winnable in ~6-12 turns of competent play.
const DAILY_HP_SAFETY_CAP = 52;

// Pure enemy-buff modifiers with NO compensating player benefit. These must not
// stack onto Hard days (see audit): they are deterministically rerolled to a
// neutral / player-benefiting modifier there.
const ENEMY_ONLY_RULE_IDS = new Set(["mighty_adversary", "shielded_foe"]);

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Plain ISO date key (YYYY-MM-DD) — used for leaderboard/profile bookkeeping.
export function getDailySeed(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

// Deterministic RNG seed for the challenge itself: daily_challenge_YYYY_MM_DD.
// Same date always yields the same seed, which yields the same challenge
// and the same card draw order / enemy behavior for every player.
export function getDailyChallengeSeed(date = new Date()) {
  return `daily_challenge_${getDailySeed(date).replace(/-/g, "_")}`;
}

// Day-of-year computed purely from the UTC date — the SAME UTC date key used by
// the seed. Previously this used local date methods, so players near UTC
// midnight in non-UTC time zones could get a different difficulty rotation than
// the (UTC) seed implied. Deriving it from UTC guarantees that the same
// displayed daily date yields identical difficulty everywhere.
export function getUtcDayOfYear(date = new Date()) {
  const year = date.getUTCFullYear();
  const startOfYear = Date.UTC(year, 0, 0); // Dec 31 prev year — matches classic (y,0,0)
  const utcMidnight = Date.UTC(year, date.getUTCMonth(), date.getUTCDate());
  return Math.floor((utcMidnight - startOfYear) / 86400000);
}

export function getDailyChallenge(date = new Date()) {
  const dateKey = getDailySeed(date);
  const seed = getDailyChallengeSeed(date);
  const rng = createRng(seed);

  // Deterministic difficulty rotation — derived from the SAME UTC date as the
  // seed (see getUtcDayOfYear), so every player worldwide gets the same
  // difficulty for a given displayed daily date.
  const dayOfYear = getUtcDayOfYear(date);
  const difficultyKey = DIFFICULTY_ORDER[dayOfYear % 3];
  const difficulty = DIFFICULTY_CONFIG[difficultyKey];

  const theme = pick(rng, DAILY_THEMES);
  const enemyId = pick(rng, ENEMY_POOL);
  const enemyBase = ENEMIES[enemyId];

  // Enemy HP: respect the enemy's OWN base HP, scale by a bounded difficulty
  // multiplier, add a tiny deterministic day-to-day wobble, then clamp into the
  // difficulty's target band.
  const baseHp = enemyBase.hp;
  let enemyHp = Math.round(baseHp * difficulty.hpMult) + (Math.floor(rng() * 3) - 1);
  enemyHp = clamp(enemyHp, difficulty.hpBand[0], difficulty.hpBand[1]);

  // Scale enemy attack damage (recoil / effects preserved via spread).
  const enemy = {
    ...enemyBase,
    hp: enemyHp,
    attacks: enemyBase.attacks.map(a => ({
      ...a,
      damage: Math.max(1, Math.round(a.damage * difficulty.damageMult)),
    })),
  };

  // Modifier selection. Hard days must not stack an uncompensated enemy-only
  // buff — if one is rolled there, deterministically reroll (via the seeded
  // rng, never Math.random) to a neutral / player-benefiting modifier.
  let rule = pick(rng, SPECIAL_RULES);
  if (difficultyKey === "hard" && ENEMY_ONLY_RULE_IDS.has(rule.id)) {
    const compensatedRules = SPECIAL_RULES.filter((r) => !ENEMY_ONLY_RULE_IDS.has(r.id));
    rule = pick(rng, compensatedRules);
  }

  const hero = HERO_MAP["adam"];
  const trivia = TRIVIA_QUESTIONS[Math.floor(rng() * TRIVIA_QUESTIONS.length)];

  let deck = [...hero.starterDeck];
  if (rule.startWithRare) {
    const rareCards = CARDS.filter(c => c.rarity === "rare");
    deck.push(pick(rng, rareCards).id);
  }

  const playerMaxHp = Math.max(10, hero.maxHp + (rule.maxHpMod || 0));

  // Apply any surviving modifier HP bonus (enemy-only HP buffs only reach here
  // on Easy/Normal), then enforce the absolute safety cap.
  if (rule.enemyHpMult) {
    enemy.hp = Math.round(enemy.hp * rule.enemyHpMult);
  }
  enemy.hp = Math.min(enemy.hp, DAILY_HP_SAFETY_CAP);

  // Hard-day compensating economy. Simulation showed +1 Faith alone is
  // insufficient against draw-disruption enemies (e.g. Cain's Mark of Cain
  // skip-draw starves the small fixed deck), so Hard days also draw 2 cards per
  // turn. Both are applied only because one alone was insufficient; Easy/Normal
  // are unchanged. Rule-based Faith bonuses still apply and are never reduced.
  const baseFaith = rule.maxEnergy || 3;
  const startFaith = difficultyKey === "hard" ? Math.max(baseFaith, 4) : baseFaith;
  const drawPerTurn = difficultyKey === "hard" ? 2 : 1;

  const [minGold, maxGold] = difficulty.goldRange;
  const goldReward = minGold + Math.floor(rng() * (maxGold - minGold + 1));

  return {
    seed,
    date: dateKey,
    theme,
    enemyId,
    enemy,
    rule,
    hero,
    deck,
    maxHp: playerMaxHp,
    playerHp: playerMaxHp,
    startFaith,
    drawPerTurn,
    trivia,
    reward: { gold: goldReward },
    difficulty: difficultyKey,
    difficultyLabel: difficulty.label,
    difficultyDesc: difficulty.desc,
  };
}