// Procedural sound system using Web Audio API — no external files needed

let audioCtx = null;
let musicGain = null;
let sfxGain = null;
let musicEnabled = true;
let sfxEnabled = true;
let currentMusicNodes = [];
let musicTimeoutId = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.15;
    musicGain.connect(audioCtx.destination);
    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.3;
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

export const sfx = {
  cardPlay: () => playTone(440, 0.15, "triangle"),
  attack: () => { playTone(200, 0.1, "sawtooth", 0.2); setTimeout(() => playTone(150, 0.1, "sawtooth", 0.2), 50); },
  enemyAttack: () => { playTone(120, 0.2, "square", 0.15); setTimeout(() => playTone(80, 0.15, "sawtooth", 0.12), 100); },
  enemyWindUp: () => { playTone(90, 0.3, "sawtooth", 0.08); },
  heal: () => { playTone(523, 0.15, "sine", 0.2); setTimeout(() => playTone(659, 0.15, "sine", 0.2), 80); },
  shield: () => playTone(300, 0.2, "triangle", 0.15),
  miracle: () => { for (let i = 0; i < 4; i++) setTimeout(() => playTone(523 + i * 100, 0.2, "sine", 0.15), i * 60); },
  victory: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.3, "triangle", 0.2), i * 150)); },
  defeat: () => { [400, 300, 200, 100].forEach((f, i) => setTimeout(() => playTone(f, 0.3, "sawtooth", 0.15), i * 200)); },
  divine: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => playTone(f, 0.4, "sine", 0.12), i * 50)); },
  click: () => playTone(600, 0.05, "sine", 0.1),
  hover: () => playTone(800, 0.03, "sine", 0.05),
  achievement: () => { [659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => playTone(f, 0.25, "triangle", 0.15), i * 100)); },
  trivia_correct: () => { [523, 659, 784].forEach((f, i) => setTimeout(() => playTone(f, 0.15, "sine", 0.15), i * 80)); },
  trivia_wrong: () => playTone(200, 0.3, "sawtooth", 0.15),
  reward: () => { [523, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.2, "triangle", 0.15), i * 100)); },
};

export function stopMusic() {
  currentMusicNodes.forEach(n => { try { n.stop(); } catch (e) {} });
  currentMusicNodes = [];
  if (musicTimeoutId) {
    clearTimeout(musicTimeoutId);
    musicTimeoutId = null;
  }
}

export function playMusic(theme) {
  if (!musicEnabled) return;
  stopMusic();
  const ctx = getCtx();

  // Extended melodies with more notes for variety
  const themes = {
    menu: { 
      notes: [262, 330, 392, 523, 392, 330, 262, 196, 262, 330, 392, 523, 659, 523, 392, 330], 
      type: "sine", vol: 0.07, interval: 450 
    },
    eden: { 
      notes: [294, 370, 440, 494, 440, 370, 294, 247, 294, 370, 440, 494, 587, 494, 440, 370], 
      type: "sine", vol: 0.06, interval: 500 
    },
    battle: { 
      notes: [196, 247, 294, 196, 165, 196, 247, 294, 349, 294, 247, 196, 165, 196, 247, 294], 
      type: "triangle", vol: 0.06, interval: 320 
    },
    boss: { 
      notes: [131, 165, 196, 165, 131, 165, 196, 247, 196, 165, 131, 98, 131, 165, 196, 247], 
      type: "sawtooth", vol: 0.04, interval: 280 
    },
    victory: { 
      notes: [523, 659, 784, 1047, 784, 659, 523, 659, 784, 1047, 1319, 1047, 784, 659, 523, 392], 
      type: "triangle", vol: 0.09, interval: 380 
    },
    divine: { 
      notes: [523, 659, 784, 880, 1047, 880, 784, 659, 523, 587, 659, 784, 880, 1047, 880, 784], 
      type: "sine", vol: 0.07, interval: 420 
    },
  };

  const t = themes[theme] || themes.menu;
  let noteIdx = 0;

  function playNextNote() {
    if (!musicEnabled) return;
    const freq = t.notes[noteIdx % t.notes.length];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = t.type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(t.vol, ctx.currentTime + 0.08);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + t.interval / 1000 * 0.85);
    osc.connect(gain);
    gain.connect(musicGain);
    osc.start();
    osc.stop(ctx.currentTime + t.interval / 1000);
    currentMusicNodes.push(osc);
    noteIdx++;
    musicTimeoutId = setTimeout(playNextNote, t.interval);
  }

  playNextNote();
}