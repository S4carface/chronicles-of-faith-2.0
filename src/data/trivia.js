// Bible trivia questions for Genesis — organized by difficulty tier
// Difficulty 1 = easy (early rooms), 2 = medium, 3 = hard (later rooms/boss)

export const TRIVIA_QUESTIONS = [
  // ===== DIFFICULTY 1 (Easy — Creation & Early Genesis) =====
  { q: "What did God create on the first day?", options: ["Light", "Animals", "Humans", "Stars"], answer: 0, verse: "Genesis 1:3", difficulty: 1 },
  { q: "What did God use to create Eve?", options: ["Adam's rib", "Dust", "Water", "A leaf"], answer: 0, verse: "Genesis 2:22", difficulty: 1 },
  { q: "What fruit did Eve eat in the Garden?", options: ["Apple (traditionally)", "Grape", "Fig", "The Bible doesn't specify"], answer: 3, verse: "Genesis 3:6", difficulty: 1 },
  { q: "What was the name of Adam and Eve's first son?", options: ["Abel", "Cain", "Seth", "Noah"], answer: 1, verse: "Genesis 4:1", difficulty: 1 },
  { q: "Who built the ark?", options: ["Moses", "Abraham", "Noah", "David"], answer: 2, verse: "Genesis 6:14", difficulty: 1 },
  { q: "How many days did it rain during the Flood?", options: ["7", "12", "40", "100"], answer: 2, verse: "Genesis 7:12", difficulty: 1 },
  { q: "What was the sign of God's covenant after the Flood?", options: ["A star", "A rainbow", "A dove", "Fire"], answer: 1, verse: "Genesis 9:13", difficulty: 1 },
  { q: "What did God create humans from?", options: ["Water", "Dust of the ground", "Light", "Nothing"], answer: 1, verse: "Genesis 2:7", difficulty: 1 },
  { q: "What did God call the light and darkness?", options: ["Good and Bad", "Day and Night", "Sun and Moon", "Morning and Evening"], answer: 1, verse: "Genesis 1:5", difficulty: 1 },
  { q: "What river flowed out of Eden?", options: ["Nile", "Four rivers", "Jordan", "Euphrates only"], answer: 1, verse: "Genesis 2:10", difficulty: 1 },
  { q: "What did God do on the seventh day?", options: ["Created man", "Rested", "Created animals", "Created light"], answer: 1, verse: "Genesis 2:2", difficulty: 1 },
  { q: "Where did God place Adam after creating him?", options: ["Eden", "Egypt", "Babel", "Canaan"], answer: 0, verse: "Genesis 2:15", difficulty: 1 },
  { q: "What did God use to create the animals?", options: ["Water", "The ground", "Light", "Air"], answer: 1, verse: "Genesis 2:19", difficulty: 1 },
  { q: "What did the serpent say to Eve?", options: ["Eat this fruit", "Did God really say...?", "You will die", "God is angry"], answer: 1, verse: "Genesis 3:1", difficulty: 1 },
  { q: "What did Adam and Eve use to cover themselves?", options: ["Animal skins", "Fig leaves", "Bark", "Nothing"], answer: 1, verse: "Genesis 3:7", difficulty: 1 },
  { q: "Who was Adam and Eve's third son?", options: ["Seth", "Cain", "Abel", "Enoch"], answer: 0, verse: "Genesis 4:25", difficulty: 1 },

  // ===== DIFFICULTY 2 (Medium — Noah, Abraham, Babel) =====
  { q: "How old was Noah when the flood came?", options: ["500", "600", "700", "900"], answer: 1, verse: "Genesis 7:6", difficulty: 2 },
  { q: "How many people were on the ark?", options: ["2", "4", "6", "8"], answer: 3, verse: "Genesis 7:13", difficulty: 2 },
  { q: "What did the Tower of Babel builders use as mortar?", options: ["Clay", "Bitumen (tar)", "Stone", "Wood"], answer: 1, verse: "Genesis 11:3", difficulty: 2 },
  { q: "What did God do at Babel?", options: ["Destroyed the tower", "Confused their languages", "Sent a plague", "Scattered them with fire"], answer: 1, verse: "Genesis 11:7", difficulty: 2 },
  { q: "Who was Abraham's wife?", options: ["Sarah", "Rebecca", "Rachel", "Leah"], answer: 0, verse: "Genesis 11:29", difficulty: 2 },
  { q: "How old was Abraham when Isaac was born?", options: ["75", "90", "100", "120"], answer: 2, verse: "Genesis 21:5", difficulty: 2 },
  { q: "Who was Jacob's twin brother?", options: ["Esau", "Ishmael", "Lot", "Laban"], answer: 0, verse: "Genesis 25:25", difficulty: 2 },
  { q: "What did Esau sell for a bowl of stew?", options: ["His sword", "His birthright", "His land", "His coat"], answer: 1, verse: "Genesis 25:33", difficulty: 2 },
  { q: "What did God ask Abraham to sacrifice?", options: ["His son Isaac", "His flock", "His wealth", "His home"], answer: 0, verse: "Genesis 22:2", difficulty: 2 },
  { q: "What did God provide as a substitute for Isaac?", options: ["A lamb", "A ram", "A dove", "A goat"], answer: 1, verse: "Genesis 22:13", difficulty: 2 },
  { q: "What was Abraham's original name?", options: ["Abram", "Abramah", "Ab", "Abiram"], answer: 0, verse: "Genesis 17:5", difficulty: 2 },
  { q: "What did God promise Abraham about his descendants?", options: ["They would be rich", "They would be as numerous as the stars", "They would be kings", "They would live forever"], answer: 1, verse: "Genesis 15:5", difficulty: 2 },
  { q: "Who was Abraham's nephew that traveled with him?", options: ["Lot", "Laban", "Esau", "Nahor"], answer: 0, verse: "Genesis 12:5", difficulty: 2 },
  { q: "What happened to Lot's wife when she looked back?", options: ["She died", "She turned into a pillar of salt", "She was blinded", "She fell"], answer: 1, verse: "Genesis 19:26", difficulty: 2 },
  { q: "How many sons did Noah have?", options: ["2", "3", "5", "7"], answer: 1, verse: "Genesis 6:10", difficulty: 2 },
  { q: "What were the names of Noah's sons?", options: ["Shem, Ham, Japheth", "Cain, Abel, Seth", "Jacob, Esau, Ishmael", "Abraham, Isaac, Jacob"], answer: 0, verse: "Genesis 6:10", difficulty: 2 },

  // ===== DIFFICULTY 3 (Hard — Jacob, Joseph, later Genesis) =====
  { q: "How many sons did Jacob have?", options: ["10", "12", "7", "14"], answer: 1, verse: "Genesis 35:22", difficulty: 3 },
  { q: "What was Joseph's special gift?", options: ["Strength", "Interpreting dreams", "Healing", "Prophecy"], answer: 1, verse: "Genesis 41:16", difficulty: 3 },
  { q: "What did Joseph's father give him that made his brothers jealous?", options: ["Land", "A coat of many colors", "Gold", "A sword"], answer: 1, verse: "Genesis 37:3", difficulty: 3 },
  { q: "What did the brothers do to Joseph?", options: ["Sold him into slavery", "Killed him", "Sent him away", "Imprisoned him"], answer: 0, verse: "Genesis 37:28", difficulty: 3 },
  { q: "Where was Joseph sold into slavery?", options: ["Egypt", "Canaan", "Babylon", "Midian"], answer: 0, verse: "Genesis 37:36", difficulty: 3 },
  { q: "Who bought Joseph after he was taken to Egypt?", options: ["Pharaoh", "Potiphar", "The priest", "A merchant"], answer: 1, verse: "Genesis 39:1", difficulty: 3 },
  { q: "What did Joseph interpret for Pharaoh?", options: ["A prophecy", "Dreams of seven fat and seven lean cows", "A vision of war", "An angel's message"], answer: 1, verse: "Genesis 41:25", difficulty: 3 },
  { q: "How many years of plenty did Joseph predict?", options: ["3", "5", "7", "10"], answer: 2, verse: "Genesis 41:29", difficulty: 3 },
  { q: "Who was Jacob's favorite wife?", options: ["Leah", "Rachel", "Bilhah", "Zilpah"], answer: 1, verse: "Genesis 29:30", difficulty: 3 },
  { q: "What did Jacob see in his dream at Bethel?", options: ["Angels ascending and descending a ladder", "A burning bush", "A flood", "A star"], answer: 0, verse: "Genesis 28:12", difficulty: 3 },
  { q: "How did Jacob deceive his father Isaac?", options: ["By wearing Esau's clothes and goat skin", "By hiding", "By lying about his age", "By sending a messenger"], answer: 0, verse: "Genesis 27:15-16", difficulty: 3 },
  { q: "What did Jacob wrestle with?", options: ["A lion", "An angel/God", "A bear", "His brother"], answer: 1, verse: "Genesis 32:24", difficulty: 3 },
  { q: "What was Jacob's name changed to?", options: ["Israel", "Isaac", "Abraham", "Judah"], answer: 0, verse: "Genesis 32:28", difficulty: 3 },
  { q: "Which of Joseph's brothers wanted to save him?", options: ["Reuben", "Judah", "Simeon", "Levi"], answer: 0, verse: "Genesis 37:21", difficulty: 3 },
  { q: "What did Joseph's brothers finally do when they met him in Egypt?", options: ["Bowed down to him", "Fought him", "Ran away", "Ignored him"], answer: 0, verse: "Genesis 42:6", difficulty: 3 },
  { q: "How old was Joseph when he died?", options: ["100", "110", "120", "90"], answer: 1, verse: "Genesis 50:22", difficulty: 3 },
  { q: "What did Joseph tell his brothers about their actions?", options: ["You meant evil, but God meant it for good", "You will be punished", "I forgive you not", "Leave Egypt now"], answer: 0, verse: "Genesis 50:20", difficulty: 3 },
  { q: "Who was the father of the twelve tribes?", options: ["Abraham", "Isaac", "Jacob", "Joseph"], answer: 2, verse: "Genesis 49:28", difficulty: 3 },
];

// Pick a question appropriate for the current room depth
export function getQuestionForRoomDepth(roomsCleared) {
  let difficulty;
  if (roomsCleared <= 2) difficulty = 1;
  else if (roomsCleared <= 4) difficulty = 2;
  else difficulty = 3;

  const pool = TRIVIA_QUESTIONS.filter(q => q.difficulty === difficulty);
  if (pool.length === 0) return TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];
  return pool[Math.floor(Math.random() * pool.length)];
}