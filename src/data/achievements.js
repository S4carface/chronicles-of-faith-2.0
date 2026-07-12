export const ACHIEVEMENTS = [
  { id: "first_victory", name: "In the Beginning", icon: "star", description: "Complete your first Genesis run", verse: "Genesis 1:1", goldReward: 100 },
  { id: "righteous_run", name: "Righteous Run", icon: "cross", description: "Complete Genesis without losing any HP in a battle", verse: "Proverbs 4:12", goldReward: 150 },
  { id: "serpent_slayer", name: "Serpent Slayer", icon: "sword", art: "serpent", description: "Defeat the Serpent on your first try", verse: "Genesis 3:15", goldReward: 75 },
  { id: "scholar", name: "Scholar of the Word", icon: "book-open", description: "Answer 5 trivia questions correctly in one run", verse: "2 Timothy 3:16", goldReward: 75 },
  { id: "daily_devotion", name: "Daily Devotion", icon: "calendar", description: "Complete 3 daily challenges", verse: "Lamentations 3:23", goldReward: 75 },
  { id: "collector", name: "Collector of Faith", icon: "layers", description: "Unlock 15 different cards", verse: "Matthew 6:20", goldReward: 100 },
  { id: "walking_with_god", name: "Walking with God", icon: "footprints", description: "Play as both Adam and Noah", verse: "Genesis 5:24", goldReward: 100 },
  { id: "narrow_path", name: "The Narrow Path", icon: "route", description: "Complete a run taking only Battle rooms", verse: "Matthew 7:14", goldReward: 150 },
  { id: "by_faith_alone", name: "By Faith Alone", icon: "heart", description: "Win a battle using only scripture cards", verse: "Ephesians 2:8", goldReward: 75 },
  { id: "noah_unlocked", name: "Covenant Keeper", icon: "cloud-rain", description: "Unlock Noah as a playable hero", verse: "Genesis 9:13", goldReward: 125 },
  { id: "flood_survivor", name: "Flood Survivor", icon: "waves", art: "the_flood", description: "Defeat The Great Flood boss", verse: "Genesis 9:11", goldReward: 150 },
  { id: "babel_destroyer", name: "Tower Toppler", icon: "building-2", art: "babel_tower", description: "Defeat the Tower of Babel boss", verse: "Genesis 11:8", goldReward: 150 },
  { id: "sodom_judgment", name: "Escaped the Fire", icon: "flame", art: "sodom_gomorrah", description: "Defeat the Sodom & Gomorrah boss", verse: "Genesis 19:24", goldReward: 150 },
  { id: "divine_favor", name: "Divine Favor", icon: "sparkles", description: "Encounter 3 Divine Intervention rooms in one run", verse: "Exodus 33:14", goldReward: 75 },
  { id: "miracle_worker", name: "Miracle Worker", icon: "wand-2", description: "Play a Legendary card in battle", verse: "John 2:11", goldReward: 100 },
  { id: "low_score_champion", name: "Humble Victor", icon: "trophy", art: "victory_crest", description: "Score over 500 points in a single run", verse: "James 4:6", goldReward: 75 },
  { id: "unscathed", name: "Unscathed", icon: "shield-check", description: "Complete 3 battles without taking damage", verse: "Psalm 91:7", goldReward: 100 },
];

export const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));