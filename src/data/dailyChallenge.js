import { ENEMIES, ENEMY_POOL, BOSSES } from "@/data/enemies";
import { CARDS } from "@/data/cards";
import { HERO_MAP } from "@/data/heroes";
import { TRIVIA_QUESTIONS } from "@/data/trivia";
import { createRng, pick } from "@/game/mapGenerator";

const DAILY_THEMES = [
  { title: "Abraham's Faith", description: "Trust in the Lord, even when the path seems impossible.", icon: "🤲", verse: "Genesis 22:12" },
  { title: "David's Courage", description: "Face the giant with nothing but faith and a sling.", icon: "🎯", verse: "1 Samuel 17:50" },
  { title: "Daniel's Prayer", description: "Stand firm in devotion, even in the lion's den.", icon: "🦁", verse: "Daniel 6:16" },
  { title: "Noah's Obedience", description: "Build faithfully, even when the world mocks.", icon: "🌊", verse: "Genesis 6:22" },
  { title: "Moses at the Sea", description: "The Lord will fight for you; you need only to be still.", icon: "🪄", verse: "Exodus 14:14" },
  { title: "Esther's Courage", description: "For such a time as this, step forward in bravery.", icon: "👑", verse: "Esther 4:14" },
  { title: "Peter's Redemption", description: "Even in failure, grace restores and calls anew.", icon: "🐓", verse: "Luke 22:61" },
  { title: "Paul's Endurance", description: "I have fought the good fight, I have finished the race.", icon: "⚓", verse: "2 Timothy 4:7" },
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

export function getDailySeed(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function getDailyChallenge(date = new Date()) {
  const seed = getDailySeed(date);
  const rng = createRng(seed);

  const theme = pick(rng, DAILY_THEMES);
  const allEnemies = [...ENEMY_POOL, ...BOSSES];
  const enemyId = pick(rng, allEnemies);
  const enemy = { ...ENEMIES[enemyId] };
  const rule = pick(rng, SPECIAL_RULES);
  const hero = HERO_MAP["adam"];
  const trivia = TRIVIA_QUESTIONS[Math.floor(rng() * TRIVIA_QUESTIONS.length)];

  let deck = [...hero.starterDeck];
  if (rule.startWithRare) {
    const rareCards = CARDS.filter(c => c.rarity === "rare");
    deck.push(pick(rng, rareCards).id);
  }

  const maxHp = Math.max(10, hero.maxHp + (rule.maxHpMod || 0));

  if (rule.enemyHpMult) {
    enemy.hp = Math.round(enemy.hp * rule.enemyHpMult);
  }

  const goldReward = enemy.isBoss ? 50 : 25 + Math.floor(rng() * 15);

  return {
    seed,
    date: seed,
    theme,
    enemyId,
    enemy,
    rule,
    hero,
    deck,
    maxHp,
    playerHp: maxHp,
    trivia,
    reward: { gold: goldReward },
  };
}