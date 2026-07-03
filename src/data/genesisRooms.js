// Genesis room definitions — used by the map generator to create branching paths

export const ROOM_TYPES = {
  BATTLE: "battle",
  TREASURE: "treasure",
  DIVINE: "divine",
  STORY: "story",
  MYSTERY: "mystery",
  BOSS: "boss",
  REST: "rest",
};

export const ROOM_ICONS = {
  [ROOM_TYPES.BATTLE]: "⚔️",
  [ROOM_TYPES.TREASURE]: "💎",
  [ROOM_TYPES.DIVINE]: "✨",
  [ROOM_TYPES.STORY]: "🍎",
  [ROOM_TYPES.MYSTERY]: "❓",
  [ROOM_TYPES.BOSS]: "💀",
  [ROOM_TYPES.REST]: "🔥",
};

export const ROOM_LABELS = {
  [ROOM_TYPES.BATTLE]: "Battle",
  [ROOM_TYPES.TREASURE]: "Treasure",
  [ROOM_TYPES.DIVINE]: "Divine Intervention",
  [ROOM_TYPES.STORY]: "Story Choice",
  [ROOM_TYPES.MYSTERY]: "Mystery",
  [ROOM_TYPES.BOSS]: "Boss",
  [ROOM_TYPES.REST]: "Campfire",
};

// Story choice scenarios for Genesis
export const STORY_CHOICES = [
  {
    id: "garden_fruit",
    prompt: "Eve offers you the forbidden fruit. What do you do?",
    icon: "🍎",
    narration: "The woman saw that the fruit of the tree was good for food and pleasing to the eye. — Genesis 3:6",
    choice_a: { label: "Resist the temptation", icon: "🛡️", effect: { type: "faith", value: 2, text: "You gain 2 Faith energy next battle." } },
    choice_b: { label: "Take the fruit", icon: "🍎", effect: { type: "power", value: -5, cardReward: true, text: "You lose 5 HP but gain a random card." } },
  },
  {
    id: "cains_choice",
    prompt: "Cain is angry. God warns him that sin is crouching at his door. What do you advise?",
    icon: "😡",
    narration: "If you do what is right, will you not be accepted? But if you do not do what is right, sin is crouching at your door. — Genesis 4:7",
    choice_a: { label: "Master the sin", icon: "✝️", effect: { type: "heal", value: 8, text: "You heal 8 HP through righteousness." } },
    choice_b: { label: "Let anger fester", icon: "🔥", effect: { type: "damage", value: -6, cardReward: true, text: "You take 6 damage but gain a rare card." } },
  },
  {
    id: "abrahams_test",
    prompt: "God commands Abraham to sacrifice Isaac. The knife is raised. What happens?",
    icon: "🔪",
    narration: "Abraham! Do not lay a hand on the boy. Now I know you fear God. — Genesis 22:12",
    choice_a: { label: "Trust and obey", icon: "🤲", effect: { type: "miracle_card", value: 0, text: "God provides — you receive a Legendary card!" } },
    choice_b: { label: "Question God", icon: "❓", effect: { type: "faith", value: 3, text: "You gain 3 Faith but the path is harder." } },
  },
  {
    id: "noahs_ark",
    prompt: "The rains begin to fall. The world mocks Noah. Do you help build the ark?",
    icon: "🚢",
    narration: "Noah did everything just as God commanded him. — Genesis 6:22",
    choice_a: { label: "Build faithfully", icon: "🔨", effect: { type: "block", value: 10, text: "You gain 10 block for the next battle." } },
    choice_b: { label: "Doubt and wait", icon: "🌧️", effect: { type: "damage", value: -4, gold: 20, text: "You lose 4 HP but find 20 gold." } },
  },
  {
    id: "babel_choice",
    prompt: "The people of Babel invite you to build a tower to heaven. What do you do?",
    icon: "🏰",
    narration: "Let us make a name for ourselves, lest we be scattered. — Genesis 11:4",
    choice_a: { label: "Refuse — glorify God", icon: "🙏", effect: { type: "heal", value: 6, text: "You heal 6 HP through humility." } },
    choice_b: { label: "Build the tower", icon: "🧱", effect: { type: "card_upgrade", value: 0, text: "Your next card reward is guaranteed Rare or better." } },
  },
];

// Treasure room rewards (card IDs)
export const TREASURE_REWARDS = [
  "sling_david", "righteous_aim", "parting_waters", "manna_heaven",
  "pillar_fire", "ark_covenant", "coat_colors", "jacobs_ladder",
  "lions_den", "burning_bush",
];

// Divine Intervention blessings
export const DIVINE_BLESSINGS = [
  { id: "manna", name: "Manna from Heaven", icon: "🌾", description: "Restore 15 HP immediately.", effect: { type: "heal", value: 15 } },
  { id: "covenant", name: "Covenant of Grace", icon: "🌈", description: "Next 3 cards cost 0 Faith.", effect: { type: "free_cards", value: 3 } },
  { id: "strength", name: "Divine Strength", icon: "💪", description: "Your next attack deals +10 damage.", effect: { type: "buff_attack", value: 10 } },
  { id: "wisdom", name: "Gift of Wisdom", icon: "🦉", description: "Draw 3 extra cards at the start of your next battle.", effect: { type: "draw", value: 3 } },
  { id: "angel", name: "Angel's Protection", icon: "👼", description: "Negate all damage for your next battle's first turn.", effect: { type: "shield", value: 999 } },
];

export const DAILY_THEMES = [
  { theme: "The Creation Story", seed: "creation", icon: "☀️" },
  { theme: "Noah and the Flood", seed: "flood", icon: "🌊" },
  { theme: "Abraham's Faith", seed: "abraham", icon: "🤲" },
  { theme: "Joseph's Journey", seed: "joseph", icon: "🧥" },
  { theme: "The Tower of Babel", seed: "babel", icon: "🏰" },
  { theme: "Cain and Abel", seed: "cain", icon: "🌾" },
  { theme: "Jacob's Dream", seed: "jacob", icon: "🪜" },
];