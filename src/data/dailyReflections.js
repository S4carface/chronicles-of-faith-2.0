// Daily Reflection content — warm, simple, readable in under 30 seconds.
// One entry per day, selected deterministically by date seed so all players see the same reflection.

const REFLECTIONS = [
  {
    verse: "His mercies are new every morning.",
    reference: "Lamentations 3:23",
    reflection: "Every day gives us another chance to choose courage, patience, and faith. Today's challenge is not just about winning, but learning to trust God under pressure.",
    prayer: "Lord, help me think clearly, act with courage, and learn something good today. Amen.",
  },
  {
    verse: "The Lord is my shepherd; I shall not want.",
    reference: "Psalm 23:1",
    reflection: "A shepherd guides, protects, and provides. No matter what comes today, you are not alone — God is walking with you through every moment.",
    prayer: "Lord, lead me today. Help me trust You even when I feel unsure. Amen.",
  },
  {
    verse: "Be strong and courageous. Do not be afraid.",
    reference: "Deuteronomy 31:6",
    reflection: "Courage doesn't mean you feel no fear — it means you take the next step anyway. God's strength shows up when we move forward in faith.",
    prayer: "Lord, give me courage for today. Help me be brave even when things are hard. Amen.",
  },
  {
    verse: "Trust in the Lord with all your heart.",
    reference: "Proverbs 3:5",
    reflection: "We like to figure things out on our own. But some answers only come when we let go and trust God to lead the way.",
    prayer: "Lord, I trust You with today. Help me not lean only on my own understanding. Amen.",
  },
  {
    verse: "I can do all things through Christ who strengthens me.",
    reference: "Philippians 4:13",
    reflection: "You are stronger than you think — not because of your own power, but because God gives strength to those who ask. Today, ask.",
    prayer: "Lord, strengthen me for what's ahead. Help me give my best today. Amen.",
  },
  {
    verse: "Cast all your anxiety on Him because He cares for you.",
    reference: "1 Peter 5:7",
    reflection: "Worry tries to carry what only God can hold. When the pressure builds, take a breath and hand it over — you were never meant to carry it alone.",
    prayer: "Lord, I give You my worries today. Help me rest in Your care. Amen.",
  },
  {
    verse: "The Lord will fight for you; you need only to be still.",
    reference: "Exodus 14:14",
    reflection: "Sometimes the bravest thing you can do is stand firm and trust. You don't have to win every battle on your own — God fights for you.",
    prayer: "Lord, help me be still and trust You. Fight for me today. Amen.",
  },
  {
    verse: "This is the day that the Lord has made; let us rejoice and be glad in it.",
    reference: "Psalm 118:24",
    reflection: "Today is a gift, even if it brings challenges. Joy doesn't come from perfect moments — it comes from knowing God is in them.",
    prayer: "Lord, help me find joy in today. Thank You for this moment. Amen.",
  },
  {
    verse: "Commit your way to the Lord; trust in Him, and He will act.",
    reference: "Psalm 37:5",
    reflection: "When you give your plans to God, He works in ways you can't always see. Do your best today, and let Him handle the rest.",
    prayer: "Lord, I commit today to You. Guide my steps and help me trust. Amen.",
  },
  {
    verse: "For nothing will be impossible with God.",
    reference: "Luke 1:37",
    reflection: "What feels impossible to you is not impossible for God. Today's challenge may look big, but God is bigger.",
    prayer: "Lord, help me believe that nothing is too hard for You. Amen.",
  },
  {
    verse: "Wait for the Lord; be strong, and let your heart take courage.",
    reference: "Psalm 27:14",
    reflection: "Waiting is hard, but it's not wasted. God uses quiet moments to grow our faith. Take courage — good things are coming.",
    prayer: "Lord, help me wait with a brave heart. Give me patience today. Amen.",
  },
  {
    verse: "The Lord is my light and my salvation — whom shall I fear?",
    reference: "Psalm 27:1",
    reflection: "Fear grows in the dark, but God's light pushes it out. You don't have to be afraid of what's ahead when God is walking with you.",
    prayer: "Lord, be my light today. Take away my fear and give me peace. Amen.",
  },
  {
    verse: "And let us not grow weary of doing good.",
    reference: "Galatians 6:9",
    reflection: "Doing the right thing can feel tiring, but it always matters. Every good choice you make plants a seed — even if you can't see it yet.",
    prayer: "Lord, help me keep doing good today. Give me strength to not give up. Amen.",
  },
  {
    verse: "The Lord is close to the brokenhearted.",
    reference: "Psalm 34:18",
    reflection: "When you feel hurt or low, God draws near. You are never too far, too broken, or too small for His care.",
    prayer: "Lord, thank You for being close when I need You most. Amen.",
  },
];

// Deterministic daily reflection — same for all players on the same date
export function getDailyReflection(date = new Date()) {
  const seed = date.toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }
  const idx = Math.abs(hash) % REFLECTIONS.length;
  return REFLECTIONS[idx];
}