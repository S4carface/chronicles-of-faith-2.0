// Player name validation, normalization, and safe-name generation.

// --- Normalization for blocked-name checking ---
// Lowercase, remove spaces/dots/underscores/hyphens/special chars, convert leetspeak.
export function normalizeName(raw) {
  let s = (raw || "").toLowerCase();
  const leetMap = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };
  let out = "";
  for (const ch of s) {
    if (leetMap[ch]) out += leetMap[ch];
    else if (/[a-z0-9]/.test(ch)) out += ch;
    // everything else (spaces, dots, underscores, hyphens, specials, emojis) is dropped
  }
  return out;
}

// --- Blocked terms ---
// Religious impersonation / disrespectful
const RELIGIOUS_BLOCKS = [
  "satan", "lucifer", "devil", "demon", "antichrist", "hell",
  "god", "jesus", "christ", "holyspirit", "holyghost", "yahweh", "jehovah", "allah", "allah",
];

// Profanity / sexual / hate / slurs / drugs / vulgar abbreviations
const PROFANITY_BLOCKS = [
  // common profanity & vulgar
  "fuck", "shit", "bitch", "bastard", "asshole", "arsehole", "dick", "cock", "pussy", "cunt",
  "twat", "wanker", "prick", "bollocks", "motherfucker", "mf",
  // sexual
  "porn", "sex", "sexy", "horny", "nude", "nudes", "naked", "boob", "boobs", "tit", "tits",
  "slut", "whore", "rape", "molest", "incest", "pedophile", "paedophile", "cum", "milf", "dildo",
  // hate / slurs
  "nigger", "nigga", "nazi", "fag", "faggot", "retard", "retarded", "spic", "chink", "kike",
  "kraut", "paki", "coon", "gook", "tranny", "dyke", "lesbo",
  // drugs
  "weed", "cocaine", "cocaine", "heroin", "crack", "meth", "lsd", "ecstasy", "mdma",
  "dealer", "druglord",
  // vulgar abbreviations
  "stfu", "wtf", "lmao", "lmfao", "af", "thot", "gtfo",
];

const ALL_BLOCKS = [...RELIGIOUS_BLOCKS, ...PROFANITY_BLOCKS];

function containsBlocked(normalized) {
  for (const term of ALL_BLOCKS) {
    if (normalized.includes(term)) return true;
  }
  return false;
}

// --- Spam detection ---
// Repeated character spam like "aaaaaa", "xxxxx", "!!!!!!"
function isSpam(raw) {
  if (raw.length < 4) return false;
  const noSpaces = raw.replace(/\s/g, "");
  if (noSpaces.length < 4) return false;
  // Count the most frequent character
  const counts = {};
  for (const ch of noSpaces) {
    counts[ch] = (counts[ch] || 0) + 1;
  }
  const maxCount = Math.max(...Object.values(counts));
  // If one character makes up 70%+ of the string (and at least 4 occurrences), it's spam
  return maxCount >= 4 && maxCount / noSpaces.length >= 0.7;
}

const ALLOWED_CHARS = /^[a-zA-Z0-9 \-_]+$/;

// --- Main validation ---
// Returns { valid, error }
export function validatePlayerName(raw) {
  if (!raw || typeof raw !== "string") {
    return { valid: false, error: "Please choose a respectful player name for the community leaderboard." };
  }

  // Trim and collapse multiple spaces
  let name = raw.trim().replace(/\s+/g, " ");

  if (name.length < 3 || name.length > 18) {
    return { valid: false, error: "Please choose a respectful player name for the community leaderboard." };
  }

  // Only allow letters, numbers, spaces, hyphens, underscores — no emojis or specials
  if (!ALLOWED_CHARS.test(name)) {
    return { valid: false, error: "Please choose a respectful player name for the community leaderboard." };
  }

  // No emojis (defensive — allowed regex already strips them, but be explicit)
  // eslint-disable-next-line no-control-regex
  const emojiRegex = /[\u{1F000}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{1F1E6}-\u{1F1FF}]/u;
  if (emojiRegex.test(name)) {
    return { valid: false, error: "Please choose a respectful player name for the community leaderboard." };
  }

  // Entirely numbers not allowed
  if (/^[0-9\s\-_]+$/.test(name) && !/[a-zA-Z]/.test(name)) {
    return { valid: false, error: "Please choose a respectful player name for the community leaderboard." };
  }

  // Spam characters
  if (isSpam(name)) {
    return { valid: false, error: "Please choose a respectful player name for the community leaderboard." };
  }

  // Normalize + blocked-name check
  const normalized = normalizeName(name);
  if (!normalized || normalized.length < 3) {
    return { valid: false, error: "Please choose a respectful player name for the community leaderboard." };
  }
  if (containsBlocked(normalized)) {
    return { valid: false, error: "Please choose a respectful player name for the community leaderboard." };
  }

  return { valid: true, name };
}

// --- Safe name generation ---
const SAFE_NAME_BASES = [
  "FaithRunner",
  "LightSeeker",
  "GenesisHero",
  "CovenantKnight",
  "MercyWalker",
  "WisdomSeeker",
  "ArkBuilder",
  "GraceRunner",
  "TruthKeeper",
  "PsalmWarrior",
];

export function generateSafeName() {
  // Generate until validation passes (always should, but guarantees it)
  for (let attempt = 0; attempt < 10; attempt++) {
    const base = SAFE_NAME_BASES[Math.floor(Math.random() * SAFE_NAME_BASES.length)];
    const num = Math.floor(100 + Math.random() * 900); // 3-digit number
    const candidate = `${base}${num}`;
    const result = validatePlayerName(candidate);
    if (result.valid) return result.name;
  }
  // Absolute fallback
  return "FaithRunner100";
}

// --- Sanitize existing names (for migration / display safety) ---
// If a stored name is invalid, return "Anonymous Warrior".
export function sanitizePlayerName(raw) {
  if (!raw || raw === "Anonymous Warrior") return "Anonymous Warrior";
  const result = validatePlayerName(raw);
  return result.valid ? result.name : "Anonymous Warrior";
}