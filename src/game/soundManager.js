// Procedural sound system using Web Audio API
// Music: layered chord pads + harp arpeggios + bells for a sacred, reverent atmosphere
// SFX: distinct sound families per card type and enemy action
// Narration: voice via SpeechSynthesis API with music ducking

let audioCtx = null;
let musicGain = null;
let sfxGain = null;
let musicEnabled = true;
let sfxEnabled = true;
let musicVol = 0.5;
let sfxVol = 0.5;
let narrationVol = 0.5;
let currentMusicNodes = [];
let musicTimeoutId = null;
let musicTheme = null;
let duckedGain = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.15 * musicVol;
    musicGain.connect(audioCtx.destination);
    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.3 * sfxVol;
    sfxGain.connect(audioCtx.destination);
  }
  return audioCtx;
}

export function setMusicEnabled(enabled) {
  musicEnabled = enabled;
  if (!enabled) stopMusic();
}

export function setSfxEnabled(enabled) {
  sfxEnabled = enabled;
}

export function setMusicVolume(vol) {
  musicVol = vol;
  if (musicGain) {
    const ctx = getCtx();
    musicGain.gain.linearRampToValueAtTime(0.15 * vol, ctx.currentTime + 0.1);
  }
}

export function setSfxVolume(vol) {
  sfxVol = vol;
  if (sfxGain) {
    const ctx = getCtx();
    sfxGain.gain.linearRampToValueAtTime(0.3 * vol, ctx.currentTime + 0.1);
  }
}

export function setNarrationVolume(vol) {
  narrationVol = vol;
}

export function duckMusic() {
  if (musicGain && duckedGain === null) {
    const ctx = getCtx();
    duckedGain = musicGain.gain.value;
    musicGain.gain.linearRampToValueAtTime(duckedGain * 0.25, ctx.currentTime + 0.5);
  }
}

export function unDuckMusic() {
  if (musicGain && duckedGain !== null) {
    const ctx = getCtx();
    musicGain.gain.linearRampToValueAtTime(duckedGain, ctx.currentTime + 0.5);
    duckedGain = null;
  }
}

function playTone(freq, duration, type = "sine", vol = 0.3, target = null) {
  if (!sfxEnabled && target === sfxGain) return;
  if (!musicEnabled && target === musicGain) return;
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(target || sfxGain);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

// === SOUND EFFECTS ===
// Card type-specific sound families + enemy action sounds
export const sfx = {
  // UI
  click: () => playTone(600, 0.05, "sine", 0.1),
  hover: () => playTone(800, 0.03, "sine", 0.05),

  // Card play base
  cardPlay: () => playTone(440, 0.1, "triangle", 0.12),

  // Attack cards — sharp, impactful, energetic
  attack: () => {
    playTone(180, 0.08, "sawtooth", 0.18);
    setTimeout(() => playTone(120, 0.1, "sawtooth", 0.14), 40);
  },
  hit: () => {
    playTone(140, 0.1, "sawtooth", 0.16);
    setTimeout(() => playTone(90, 0.08, "square", 0.1), 40);
  },

  // Defense cards — solid, shielding, protective
  defense: () => {
    playTone(220, 0.12, "triangle", 0.16);
    setTimeout(() => playTone(330, 0.15, "sine", 0.1), 50);
  },
  shield: () => {
    playTone(220, 0.12, "triangle", 0.16);
    setTimeout(() => playTone(330, 0.15, "sine", 0.1), 50);
  },

  // Scripture cards — airy, sacred, reverent
  scripture: () => {
    [523, 659, 784].forEach((f, i) => setTimeout(() => playTone(f, 0.25, "sine", 0.1), i * 50));
    setTimeout(() => playTone(1047, 0.35, "sine", 0.06), 150);
  },
  heal: () => {
    playTone(523, 0.12, "sine", 0.16);
    setTimeout(() => playTone(659, 0.12, "sine", 0.16), 70);
    setTimeout(() => playTone(784, 0.25, "sine", 0.12), 140);
  },

  // Miracle cards — divine, majestic
  miracle: () => {
    for (let i = 0; i < 5; i++) setTimeout(() => playTone(523 + i * 131, 0.25, "sine", 0.1), i * 45);
    setTimeout(() => playTone(2093, 0.4, "sine", 0.05), 225);
  },

  // Enemy action sounds — distinct families
  enemyAttack: () => {
    playTone(120, 0.12, "sawtooth", 0.16);
    setTimeout(() => playTone(80, 0.1, "square", 0.1), 70);
  },
  enemyDefend: () => {
    playTone(160, 0.15, "triangle", 0.1);
    setTimeout(() => playTone(200, 0.12, "sine", 0.08), 70);
  },
  enemyHeal: () => {
    playTone(392, 0.15, "sine", 0.1);
    setTimeout(() => playTone(523, 0.2, "sine", 0.08), 80);
  },
  enemyCurse: () => {
    playTone(100, 0.25, "sawtooth", 0.08);
    setTimeout(() => playTone(70, 0.35, "square", 0.06), 120);
  },
  enemyWindUp: () => playTone(90, 0.25, "sawtooth", 0.05),

  // Counter deflect — metallic clang when Counter retaliates
  deflect: () => {
    playTone(1200, 0.06, "square", 0.12);
    setTimeout(() => playTone(900, 0.08, "triangle", 0.1), 30);
    setTimeout(() => playTone(1600, 0.05, "sine", 0.06), 60);
  },

  // Draw card — parchment/page flip sound
  drawCard: () => {
    playTone(2000, 0.04, "sawtooth", 0.04);
    setTimeout(() => playTone(1500, 0.06, "sawtooth", 0.03), 30);
    setTimeout(() => playTone(1000, 0.08, "triangle", 0.04), 60);
  },
  // Gain Faith — bright sparkle/chime
  gainFaith: () => {
    playTone(880, 0.08, "sine", 0.08);
    setTimeout(() => playTone(1320, 0.12, "sine", 0.08), 60);
  },

  // Results
  victory: () => {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.25, "triangle", 0.16), i * 130));
    setTimeout(() => playTone(1319, 0.4, "sine", 0.12), 520);
  },
  defeat: () => {
    [400, 300, 200, 100].forEach((f, i) => setTimeout(() => playTone(f, 0.25, "sawtooth", 0.12), i * 180));
  },
  divine: () => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => playTone(f, 0.35, "sine", 0.1), i * 45));
  },
  achievement: () => {
    [659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => playTone(f, 0.2, "triangle", 0.12), i * 90));
  },
  trivia_correct: () => {
    [523, 659, 784].forEach((f, i) => setTimeout(() => playTone(f, 0.12, "sine", 0.12), i * 70));
  },
  trivia_wrong: () => playTone(200, 0.25, "sawtooth", 0.12),
  reward: () => {
    [523, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.15, "triangle", 0.12), i * 90));
  },
};

export function stopMusic() {
  currentMusicNodes.forEach(n => { try { n.stop(); } catch (e) {} });
  currentMusicNodes = [];
  if (musicTimeoutId) {
    clearTimeout(musicTimeoutId);
    musicTimeoutId = null;
  }
}

// Chord pad — multiple sustained oscillators for warm background
function playChordPad(freqs, duration, vol, type = "sine") {
  const ctx = getCtx();
  freqs.forEach(freq => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.5);
    gain.gain.linearRampToValueAtTime(vol * 0.7, ctx.currentTime + duration * 0.7);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(musicGain);
    osc.start();
    osc.stop(ctx.currentTime + duration);
    currentMusicNodes.push(osc);
  });
}

// Harp-like arpeggiated note
function playHarpNote(freq, duration, vol) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(musicGain);
  osc.start();
  osc.stop(ctx.currentTime + duration);
  currentMusicNodes.push(osc);
}

// Soft bell tone — adds sacred atmosphere
function playBell(freq, vol) {
  const ctx = getCtx();
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.value = freq;
  osc2.type = "sine";
  osc2.frequency.value = freq * 2;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(musicGain);
  osc1.start();
  osc2.start();
  osc1.stop(ctx.currentTime + 1.5);
  osc2.stop(ctx.currentTime + 1.5);
  currentMusicNodes.push(osc1, osc2);
}

export function playMusic(theme) {
  if (!musicEnabled) return;
  stopMusic();
  musicTheme = theme;
  getCtx();

  const themes = {
    // Main menu — warm, inviting, sacred
    menu: {
      chords: [[262, 330, 392], [196, 247, 294], [220, 277, 330], [262, 330, 392]],
      melody: [523, 587, 659, 784, 659, 587, 523, 392, 440, 523, 587, 659, 784, 880, 784, 659],
      padVol: 0.04, melodyVol: 0.06, padType: "sine",
      chordInterval: 2000, melodyInterval: 380, useBells: true,
    },
    // Eden / exploration — peaceful, gentle
    eden: {
      chords: [[294, 370, 440], [247, 294, 370], [330, 415, 494], [294, 370, 440]],
      melody: [587, 659, 740, 880, 740, 659, 587, 494, 523, 587, 659, 740, 880, 988, 880, 740],
      padVol: 0.035, melodyVol: 0.05, padType: "sine",
      chordInterval: 2200, melodyInterval: 420, useBells: false,
    },
    // Map exploration — mysterious, adventurous
    map: {
      chords: [[220, 277, 330], [196, 247, 294], [247, 294, 370], [220, 277, 330]],
      melody: [440, 523, 587, 659, 587, 523, 440, 330, 392, 440, 523, 587, 659, 784, 659, 523],
      padVol: 0.035, melodyVol: 0.05, padType: "sine",
      chordInterval: 2400, melodyInterval: 400, useBells: true,
    },
    // Battle — tense, driving
    battle: {
      chords: [[196, 247, 294], [165, 196, 247], [175, 220, 262], [196, 247, 294]],
      melody: [294, 349, 392, 440, 392, 349, 294, 247, 262, 294, 349, 392, 440, 494, 440, 349],
      padVol: 0.04, melodyVol: 0.05, padType: "sawtooth",
      chordInterval: 1500, melodyInterval: 280, useBells: false,
    },
    // Boss — dark, ominous
    boss: {
      chords: [[131, 165, 196], [98, 131, 165], [117, 147, 175], [131, 165, 196]],
      melody: [196, 233, 262, 311, 262, 233, 196, 165, 175, 196, 233, 262, 311, 349, 311, 233],
      padVol: 0.04, melodyVol: 0.05, padType: "sawtooth",
      chordInterval: 1400, melodyInterval: 250, useBells: false,
    },
    // Victory — triumphant, warm
    victory: {
      chords: [[523, 659, 784], [392, 494, 587], [440, 554, 659], [523, 659, 784]],
      melody: [784, 880, 988, 1047, 988, 880, 784, 659, 698, 784, 880, 988, 1047, 1175, 1047, 880],
      padVol: 0.04, melodyVol: 0.07, padType: "sine",
      chordInterval: 1800, melodyInterval: 350, useBells: true,
    },
    // Divine — angelic, ethereal
    divine: {
      chords: [[523, 659, 784, 1047], [587, 740, 880, 1175], [523, 659, 784, 1047], [494, 622, 740, 988]],
      melody: [1047, 1175, 1319, 1568, 1319, 1175, 1047, 880, 988, 1047, 1175, 1319, 1568, 1760, 1568, 1319],
      padVol: 0.035, melodyVol: 0.05, padType: "sine",
      chordInterval: 2500, melodyInterval: 400, useBells: true,
    },
    // Defeat — somber, mournful
    defeat: {
      chords: [[196, 247, 294], [175, 220, 262], [165, 196, 247], [196, 247, 294]],
      melody: [294, 247, 196, 165, 196, 247, 220, 196, 175, 196, 247, 220, 196, 165, 147, 131],
      padVol: 0.035, melodyVol: 0.045, padType: "sine",
      chordInterval: 2400, melodyInterval: 500, useBells: false,
    },
    // Story / scripture — reverent, contemplative
    story: {
      chords: [[262, 330, 392], [220, 277, 330], [196, 247, 294], [262, 330, 392]],
      melody: [523, 587, 659, 523, 587, 659, 784, 659, 587, 523, 587, 659, 784, 880, 784, 659],
      padVol: 0.035, melodyVol: 0.055, padType: "sine",
      chordInterval: 2400, melodyInterval: 450, useBells: true,
    },
  };

  const t = themes[theme] || themes.menu;
  let chordIdx = 0;
  let melodyIdx = 0;
  let step = 0;
  const chordEvery = Math.ceil(t.chordInterval / t.melodyInterval);

  function playNext() {
    if (!musicEnabled || musicTheme !== theme) return;

    // Play chord pad on schedule
    if (step % chordEvery === 0) {
      const chord = t.chords[chordIdx % t.chords.length];
      playChordPad(chord, (t.chordInterval / 1000) * 1.3, t.padVol, t.padType);
      if (t.useBells && chordIdx % 2 === 0) {
        playBell(chord[0] * 2, t.padVol * 0.5);
      }
      chordIdx++;
    }

    // Play melody note
    const freq = t.melody[melodyIdx % t.melody.length];
    playHarpNote(freq, (t.melodyInterval / 1000) * 0.9, t.melodyVol);

    melodyIdx++;
    step++;
    musicTimeoutId = setTimeout(playNext, t.melodyInterval);
  }

  playNext();
}

// === VOICE NARRATION via SpeechSynthesis API ===

// Convert Bible references to natural spoken format
// "Genesis 3:1" → "Genesis chapter 3, verse 1"
// "1 Samuel 17:40" → "First Samuel chapter 17, verse 40"
// "Genesis 4:5-7" → "Genesis chapter 4, verses 5 through 7"
const BOOK_ABBREVS = {
  "1 Thess": "First Thessalonians",
  "2 Thess": "Second Thessalonians",
  "1 Tim": "First Timothy",
  "2 Tim": "Second Timothy",
  "1 Cor": "First Corinthians",
  "2 Cor": "Second Corinthians",
  "1 Pet": "First Peter",
  "2 Pet": "Second Peter",
  "1 John": "First John",
  "2 John": "Second John",
  "3 John": "Third John",
};

const NUMBER_PREFIX = { "1": "First", "2": "Second", "3": "Third" };

export function verbalizeScriptureReference(text) {
  const refRegex = /(?:(\d)\s+)?([A-Z][a-zA-Z]+)\s+(\d+):(\d+)(?:[-–](\d+))?/g;
  return text.replace(refRegex, (match, bookNum, bookName, chapter, verse1, verse2) => {
    let spokenName = bookName;
    if (bookNum) {
      const key = `${bookNum} ${bookName}`;
      if (BOOK_ABBREVS[key]) {
        spokenName = BOOK_ABBREVS[key];
      } else {
        spokenName = `${NUMBER_PREFIX[bookNum] || ""} ${bookName}`.trim();
      }
    }
    const verseText = verse2
      ? `verses ${verse1} through ${verse2}`
      : `verse ${verse1}`;
    return `${spokenName} chapter ${chapter}, ${verseText}`;
  });
}

function pickVoice(preference) {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const enVoices = voices.filter(v => v.lang && v.lang.startsWith("en"));
  const useVoices = enVoices.length > 0 ? enVoices : voices;

  if (preference === "male") {
    const male = useVoices.find(v => /male|david|daniel|alex|george|fred|thomas|james|oliver|arthur|google uk english male/i.test(v.name));
    if (male) return male;
  }
  if (preference === "female") {
    const female = useVoices.find(v => /female|samantha|victoria|karen|moira|tessa|kate|serena|fiona|google uk english female|google us english/i.test(v.name));
    if (female) return female;
  }
  return useVoices[0];
}

export function speakNarration(text, volume, voicePreference) {
  if (!window.speechSynthesis) return;
  stopNarration();
  const vol = volume !== undefined ? volume : narrationVol;
  if (vol <= 0) return;

  duckMusic();

  const spokenText = verbalizeScriptureReference(text);
  const utterance = new SpeechSynthesisUtterance(spokenText);
  utterance.volume = vol;
  utterance.rate = 0.85;
  utterance.pitch = 1;

  const voice = pickVoice(voicePreference);
  if (voice) {
    utterance.voice = voice;
  }

  utterance.onend = () => unDuckMusic();
  utterance.onerror = () => unDuckMusic();
  window.speechSynthesis.speak(utterance);
}

export function stopNarration() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    unDuckMusic();
  }
}