// Player name validation, normalization, and safe-name generation.
// Strict family-friendly validation for a Bible game (ages 6–90+).
// Better to reject questionable names than allow inappropriate names on the leaderboard.

// --- Fallback names (never validated, used as safe display defaults) ---
const FALLBACK_NAMES = new Set([
  "Anonymous Pilgrim",
  "Faithful Player",
  "Anonymous Warrior", // legacy
  "",
]);
const PRIMARY_FALLBACK = "Anonymous Pilgrim";

// --- Leetspeak substitution map ---
const LEET_MAP = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t",
  "@": "a", "$": "s", "+": "t", "!": "i", "|": "i",
  "8": "b", "9": "g", "2": "z", "6": "g",
};

// --- Normalization for blocked-name checking ---
// Lowercase → leetspeak conversion → remove all non-alphabetic chars.
// Does NOT collapse repeats (that's done as variant checks in containsBlocked).
export function normalizeName(raw) {
  if (!raw) return "";
  let s = (raw || "").toLowerCase();
  let converted = "";
  for (const ch of s) {
    converted += LEET_MAP[ch] || ch;
  }
  return converted.replace(/[^a-z]/g, "");
}

function stripVowels(s) {
  return s.replace(/[aeiou]/g, "");
}

// --- Blocked terms ---

// Religious impersonation / disrespectful / sensitive names
const RELIGIOUS_BLOCKS = [
  "satan", "lucifer", "devil", "demon", "daemon", "antichrist",
  "god", "jesus", "christ", "holyspirit", "holyghost", "yahweh", "jehovah",
  "allah", "messiah", "bible", "quran", "koran", "torah",
];

// Reserved / official identity names — no impersonating admin, dev, or the game itself
// NOTE: "baseaa" is the normalized form of "base44" (leet: 4→a)
const RESERVED_BLOCKS = [
  "admin", "moderator", "developer", "baseaa", "basefortyfour", "chroniclesoffaith",
];

// Profanity / sexual / hate / slurs / drugs / violent / vulgar abbreviations
const PROFANITY_BLOCKS = [
  // profanity & vulgar
  "fuck", "shit", "bitch", "bastard", "asshole", "arsehole",
  "dick", "cock", "pussy", "cunt", "twat", "wanker", "prick", "bollocks",
  "motherfucker", "crap", "piss", "mf",
  // sexual
  "porn", "sex", "horny", "nude", "naked", "boob", "tits", "slut", "whore",
  "rape", "molest", "incest", "pedophile", "paedophile", "cum", "milf",
  "dildo", "anus", "genital", "vagina", "penis", "fuckme",
  // hate / slurs
  "nigger", "nigga", "nazi", "fag", "faggot", "retard", "spic", "chink",
  "kike", "kraut", "paki", "coon", "gook", "tranny", "dyke", "lesbo", "negro",
  // drugs
  "cocaine", "heroin", "crack", "meth", "lsd", "ecstasy", "mdma",
  "druglord", "stoned",
  // violent / threats
  "terrorist", "terrorism", "torture", "behead", "slaughter", "murder",
  // vulgar abbreviations
  "stfu", "wtf", "lmao", "lmfao", "thot", "gtfo",
  // profanity bypass spellings (fuk, fck, fk, fuq, phuck, etc.)
  "fuk", "fck", "fk", "fuq", "phuck", "phuk", "fuxk", "fux",
  "dumbass", "dumbazz", "bich", "b1tch",
  // suck variants + body parts + phrases (user-requested expansion)
  "suk", "suck", "sux", "succ", "suc", "sucka",
  "lick", "balls", "nuts", "ass", "buttplug",
  "killyourself", "kys",
  // phrase blocks (normalized — spaces/punctuation stripped by normalizeName)
  "sukmy", "suckmy", "sukme", "suckme",
  "sukballs", "suckballs", "myballs", "deeznuts",
];

const ALL_BLOCKS = [...RELIGIOUS_BLOCKS, ...PROFANITY_BLOCKS];

// Pre-compute vowel-stripped versions of 4+ char blocked terms, separated by category
// (for missing-vowel detection: "fck" matches stripped "fuck" → "fck")
const RELIGIOUS_VOWEL_STRIPPED = [...new Set(
  RELIGIOUS_BLOCKS
    .filter(t => t.length >= 4)
    .map(t => stripVowels(t))
    .filter(t => t.length >= 3)
)];
const PROFANITY_VOWEL_STRIPPED = [...new Set(
  PROFANITY_BLOCKS
    .filter(t => t.length >= 4)
    .map(t => stripVowels(t))
    .filter(t => t.length >= 3)
)];

// Check a set of terms against normalization variants (direct, collapse 3+→2, collapse 2+→1)
function checkTerms(normalized, terms) {
  const direct = normalized;
  const collapse3to2 = normalized.replace(/(.)\1{2,}/g, "$1$1");
  const collapseAll = normalized.replace(/(.)\1+/g, "$1");

  for (const term of terms) {
    if (direct.includes(term) || collapse3to2.includes(term)) return true;
  }
  for (const term of terms) {
    if (term.length >= 4 && collapseAll.includes(term)) return true;
  }
  return false;
}

// Check vowel-stripped variants against vowel-stripped blocked terms
function checkVowelStripped(normalized, strippedTerms) {
  const variants = [
    stripVowels(normalized),
    stripVowels(normalized.replace(/(.)\1{2,}/g, "$1$1")),
    stripVowels(normalized.replace(/(.)\1+/g, "$1")),
  ];
  for (const term of strippedTerms) {
    for (const v of variants) {
      if (v.includes(term)) return true;
    }
  }
  return false;
}

// Returns "blocked" | null — all categories use the same user-facing message
function findBlockedType(normalized) {
  if (!normalized) return null;
  if (checkTerms(normalized, RESERVED_BLOCKS)) return "blocked";
  if (checkTerms(normalized, RELIGIOUS_BLOCKS) || checkVowelStripped(normalized, RELIGIOUS_VOWEL_STRIPPED)) return "blocked";
  if (checkTerms(normalized, PROFANITY_BLOCKS) || checkVowelStripped(normalized, PROFANITY_VOWEL_STRIPPED)) return "blocked";
  return null;
}

// --- Spam detection ---
function isSpam(raw) {
  if (raw.length < 4) return false;
  const noSpaces = raw.replace(/\s/g, "");
  if (noSpaces.length < 4) return false;
  const counts = {};
  for (const ch of noSpaces) {
    counts[ch] = (counts[ch] || 0) + 1;
  }
  const maxCount = Math.max(...Object.values(counts));
  return maxCount >= 4 && maxCount / noSpaces.length >= 0.7;
}

// Allow letters, numbers, spaces, hyphens, and underscores only
const ALLOWED_CHARS = /^[a-zA-Z0-9 _-]+$/;

const RESPECTFUL_NAME_ERROR = "Please choose a respectful family-friendly name.";
const LENGTH_ERROR = "Please choose a respectful family-friendly name.";

// --- Main validation ---
// Returns { valid, error, name }
export function validatePlayerName(raw) {
  if (!raw || typeof raw !== "string") {
    return { valid: false, error: LENGTH_ERROR };
  }

  let name = raw.trim().replace(/\s+/g, " ");

  if (name.length < 3 || name.length > 18) {
    return { valid: false, error: LENGTH_ERROR };
  }

  if (!ALLOWED_CHARS.test(name)) {
    return { valid: false, error: RESPECTFUL_NAME_ERROR };
  }

  // No emojis (defensive — regex above strips them, but be explicit)
  // eslint-disable-next-line no-control-regex
  const emojiRegex = /[\u{1F000}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{1F1E6}-\u{1F1FF}]|[\u{2190}-\u{2BFF}]|[\u{FE00}-\u{FE0F}]/u;
  if (emojiRegex.test(name)) {
    return { valid: false, error: RESPECTFUL_NAME_ERROR };
  }

  // Entirely numbers / punctuation not allowed
  if (!/[a-zA-Z]/.test(name)) {
    return { valid: false, error: RESPECTFUL_NAME_ERROR };
  }

  if (isSpam(name)) {
    return { valid: false, error: RESPECTFUL_NAME_ERROR };
  }

  const normalized = normalizeName(name);
  if (!normalized || normalized.length < 3) {
    return { valid: false, error: LENGTH_ERROR };
  }
  const blockedType = findBlockedType(normalized);
  if (blockedType === "blocked") {
    return { valid: false, error: RESPECTFUL_NAME_ERROR };
  }

  return { valid: true, name };
}

// --- Check if player needs to set a name ---
// Returns true if name is empty, a fallback, or fails validation.
// Use this (not validatePlayerName) to decide whether to show the name prompt.
export function needsPlayerName(raw) {
  if (!raw || FALLBACK_NAMES.has(raw)) return true;
  return !validatePlayerName(raw).valid;
}

// --- Safe name generation ---
const SAFE_NAME_BASES = [
  "FaithfulRunner", "LightSeeker", "GenesisHero", "CovenantKnight",
  "MercyWalker", "WisdomSeeker", "ArkBuilder", "GraceRunner",
  "TruthKeeper", "PsalmWarrior", "PilgrimOfFaith", "ChildOfLight",
];

export function generateSafeName() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const base = SAFE_NAME_BASES[Math.floor(Math.random() * SAFE_NAME_BASES.length)];
    const num = Math.floor(100 + Math.random() * 900);
    const candidate = `${base}${num}`;
    const result = validatePlayerName(candidate);
    if (result.valid) return result.name;
  }
  return "FaithfulRunner100";
}

// --- Sanitize existing names (for migration / display safety) ---
// Never returns an invalid name. Fallback names pass through.
export function sanitizePlayerName(raw) {
  if (!raw || FALLBACK_NAMES.has(raw)) return PRIMARY_FALLBACK;
  const result = validatePlayerName(raw);
  return result.valid ? result.name : PRIMARY_FALLBACK;
}