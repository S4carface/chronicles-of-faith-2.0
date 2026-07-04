// Scripture reference verbalization + TTS text sanitization.
// Converts Bible citations like "Genesis 3:1" into spoken form
// "Genesis chapter 3, verse 1" before sending to SpeechSynthesis.

// Full names for numbered books — "1 Samuel" → "First Samuel"
const NUMBER_PREFIX = { "1": "First", "2": "Second", "3": "Third" };

// Full book names that should be spoken differently than written
// (e.g. "Psalm 23" → "Psalms chapter 23")
const FULL_NAME_ADJUSTMENTS = {
  "Psalm": "Psalms",
  "Revelations": "Revelation",
  "Psalms": "Psalms",
};

// Common book abbreviations → full spoken names
const BOOK_ABBREVS = {
  "Gen": "Genesis", "Ex": "Exodus", "Lev": "Leviticus", "Num": "Numbers",
  "Deut": "Deuteronomy", "Josh": "Joshua", "Judg": "Judges", "Ruth": "Ruth",
  "Sam": "Samuel", "Kgs": "Kings", "Chron": "Chronicles", "Ezra": "Ezra",
  "Neh": "Nehemiah", "Esth": "Esther", "Job": "Job", "Ps": "Psalms",
  "Pss": "Psalms", "Prov": "Proverbs", "Eccl": "Ecclesiastes", "Song": "Song of Solomon",
  "Isa": "Isaiah", "Jer": "Jeremiah", "Lam": "Lamentations", "Ezek": "Ezekiel",
  "Dan": "Daniel", "Hos": "Hosea", "Joel": "Joel", "Amos": "Amos",
  "Obad": "Obadiah", "Jonah": "Jonah", "Mic": "Micah", "Nah": "Nahum",
  "Hab": "Habakkuk", "Zeph": "Zephaniah", "Hag": "Haggai", "Zech": "Zechariah",
  "Mal": "Malachi",
  "Matt": "Matthew", "Mark": "Mark", "Luke": "Luke", "John": "John",
  "Acts": "Acts", "Rom": "Romans",
  "Cor": "Corinthians", "Gal": "Galatians", "Eph": "Ephesians",
  "Phil": "Philippians", "Col": "Colossians", "Thess": "Thessalonians",
  "Tim": "Timothy", "Titus": "Titus", "Phlm": "Philemon",
  "Heb": "Hebrews", "Pet": "Peter", "Jude": "Jude", "Rev": "Revelation",
};

// Latin / scholarly abbreviations that TTS engines mispronounce.
// Expanded to plain English so the narrator reads them naturally.
const ABBREV_EXPANSIONS = [
  [/\bv\.\s*(\d+)/gi, "verse $1"],
  [/\bvv\.\s*(\d+)/gi, "verses $1"],
  [/\bvs\.\s*(\d+)/gi, "verse $1"],
  [/\bcf\./gi, "compare"],
  [/\bi\.e\./gi, "that is"],
  [/\be\.g\./gi, "for example"],
  [/\bn\.t\./gi, "New Testament"],
  [/\bo\.t\./gi, "Old Testament"],
  [/\bkjv\b/gi, "King James Version"],
  [/\besv\b/gi, "English Standard Version"],
  [/\bniv\b/gi, "New International Version"],
  [/\bnasb\b/gi, "New American Standard Bible"],
];

// Sanitize text for TTS: expand abbreviations, remove stray symbols
// that engines read literally (e.g. "per diem" from mispronounced tokens).
export function sanitizeForTTS(text) {
  let cleaned = text;
  for (const [pattern, replacement] of ABBREV_EXPANSIONS) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  // Replace em-dashes and en-dashes with comma pauses (avoids odd readings)
  cleaned = cleaned.replace(/—/g, ", ").replace(/–/g, " through ");
  // Collapse multiple spaces
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
}

// Resolve a book name (possibly abbreviated or numbered) to its spoken form.
function resolveBookName(bookNum, rawName) {
  // Try numbered abbreviation: "1 Pet" → "First Peter"
  if (bookNum) {
    const key = `${bookNum} ${rawName}`;
    if (BOOK_ABBREVS[key]) {
      return `${NUMBER_PREFIX[bookNum] || ""} ${BOOK_ABBREVS[key]}`.trim();
    }
    // Check if the raw name itself is a known abbreviation
    if (BOOK_ABBREVS[rawName]) {
      return `${NUMBER_PREFIX[bookNum] || ""} ${BOOK_ABBREVS[rawName]}`.trim();
    }
    // Fallback: "1 Samuel" → "First Samuel"
    return `${NUMBER_PREFIX[bookNum] || ""} ${rawName}`.trim();
  }
  // No number prefix — resolve abbreviation or full-name adjustment
  return BOOK_ABBREVS[rawName] || FULL_NAME_ADJUSTMENTS[rawName] || rawName;
}

// Convert Bible references in text to natural spoken form.
// Examples:
//   "Genesis 3:1"          → "Genesis chapter 3, verse 1"
//   "Genesis 1:1–3"        → "Genesis chapter 1, verses 1 through 3"
//   "1 Peter 5:7"          → "First Peter chapter 5, verse 7"
//   "1 Samuel 17:40"       → "First Samuel chapter 17, verse 40"
//   "Song of Solomon 1:1"  → "Song of Solomon chapter 1, verse 1"
export function verbalizeScriptureReference(text) {
  // Pattern: optional number prefix, book name (possibly multi-word with "of"),
  // then chapter:verse with optional verse range (hyphen or en-dash).
  const refRegex = /(?:([1-3])\s+)?((?:[A-Z][a-z]+)(?:\s+of\s+[A-Z][a-z]+)?)\s+(\d+):(\d+)(?:\s*[-–]\s*(\d+))?/g;

  return text.replace(refRegex, (match, bookNum, bookName, chapter, verse1, verse2) => {
    const spokenName = resolveBookName(bookNum, bookName);
    const verseText = verse2
      ? `verses ${verse1} through ${verse2}`
      : `verse ${verse1}`;
    return `${spokenName} chapter ${chapter}, ${verseText}`;
  });
}

// Full pipeline: sanitize + verbalize — call right before TTS.
export function prepareTextForNarration(text) {
  return sanitizeForTTS(verbalizeScriptureReference(text));
}

// Pick a SpeechSynthesis voice based on user preference.
// preference: "male" | "female" | "system" (or null/undefined for system default)
export function pickVoice(preference) {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const enVoices = voices.filter((v) => v.lang && v.lang.startsWith("en"));
  const useVoices = enVoices.length > 0 ? enVoices : voices;

  // "system" or null → use the OS default voice (first English voice)
  if (!preference || preference === "system" || preference === "default") {
    return useVoices[0];
  }

  if (preference === "male") {
    const male = useVoices.find((v) =>
      /male|david|daniel|alex|george|fred|thomas|james|oliver|arthur|google uk english male/i.test(v.name)
    );
    if (male) return male;
  }

  if (preference === "female") {
    const female = useVoices.find((v) =>
      /female|samantha|victoria|karen|moira|tessa|kate|serena|fiona|google uk english female|google us english/i.test(v.name)
    );
    if (female) return female;
  }

  // Fallback to first available
  return useVoices[0];
}