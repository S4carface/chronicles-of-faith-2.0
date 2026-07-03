export const ACHIEVEMENTS = [
  { id: "first_victory", name: "In the Beginning", icon: "🌟", description: "Complete your first Genesis run", verse: "Genesis 1:1" },
  { id: "righteous_run", name: "Righteous Run", icon: "✝️", description: "Complete Genesis without losing any HP in a battle", verse: "Proverbs 4:12" },
  { id: "serpent_slayer", name: "Serpent Slayer", icon: "🐍", description: "Defeat the Serpent on your first try", verse: "Genesis 3:15" },
  { id: "scholar", name: "Scholar of the Word", icon: "📖", description: "Answer 5 trivia questions correctly in one run", verse: "2 Timothy 3:16" },
  { id: "daily_devotion", name: "Daily Devotion", icon: "📅", description: "Complete 3 daily challenges", verse: "Lamentations 3:23" },
  { id: "collector", name: "Collector of Faith", icon: "🃏", description: "Unlock 15 different cards", verse: "Matthew 6:20" },
  { id: "walking_with_god", name: "Walking with God", icon: "🚶", description: "Play as both Adam and Noah", verse: "Genesis 5:24" },
  { id: "narrow_path", name: "The Narrow Path", icon: "🛤️", description: "Complete a run taking only Battle rooms", verse: "Matthew 7:14" },
  { id: "by_faith_alone", name: "By Faith Alone", icon: "🙏", description: "Win a battle using only scripture cards", verse: "Ephesians 2:8" },
  { id: "noah_unlocked", name: "Covenant Keeper", icon: "🌈", description: "Unlock Noah as a playable hero", verse: "Genesis 9:13" },
  { id: "flood_survivor", name: "Flood Survivor", icon: "🌊", description: "Defeat The Great Flood boss", verse: "Genesis 9:11" },
  { id: "babel_destroyer", name: "Tower Toppler", icon: "🗼", description: "Defeat the Tower of Babel boss", verse: "Genesis 11:8" },
  { id: "divine_favor", name: "Divine Favor", icon: "✨", description: "Encounter 3 Divine Intervention rooms in one run", verse: "Exodus 33:14" },
  { id: "miracle_worker", name: "Miracle Worker", icon: " miracles", description: "Play a Legendary card in battle", verse: "John 2:11" },
  { id: "low_score_champion", name: "Humble Victor", icon: "🥇", description: "Score over 500 points in a single run", verse: "James 4:6" },
  { id: "unscathed", name: "Unscathed", icon: "🛡️", description: "Complete 3 battles without taking damage", verse: "Psalm 91:7" },
];

export const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));