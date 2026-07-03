// Procedural sound system using Web Audio API — no external files needed

let audioCtx = null;
let musicGain = null;
let sfxGain = null;
let musicEnabled = true;
let sfxEnabled = true;
let currentMusicNodes = [];

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
  enemyAttack: () => { playTone(120, 0.2, "square", 0.15); },
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
}

export function playMusic(theme) {
  if (!musicEnabled) return;
  stopMusic();
  const ctx = getCtx();

  const themes = {
    menu: { notes: [262, 330, 392, 523], type: "sine", vol: 0.08, interval: 500 },
    eden: { notes: [294, 370, 440, 494], type: "sine", vol: 0.06, interval: 600 },
    battle: { notes: [196, 247, 294, 196], type: "triangle", vol: 0.07, interval: 350 },
    boss: { notes: [131, 165, 196, 165], type: "sawtooth", vol: 0.05, interval: 300 },
    victory: { notes: [523, 659, 784, 1047], type: "triangle", vol: 0.1, interval: 400 },
    divine: { notes: [523, 659, 784, 880, 1047], type: "sine", vol: 0.08, interval: 400 },
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
    gain.gain.linearRampToValueAtTime(t.vol, ctx.currentTime + 0.1);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + t.interval / 1000 * 0.8);
    osc.connect(gain);
    gain.connect(musicGain);
    osc.start();
    osc.stop(ctx.currentTime + t.interval / 1000);
    currentMusicNodes.push(osc);
    noteIdx++;
    setTimeout(playNextNote, t.interval);
  }

  playNextNote();
}