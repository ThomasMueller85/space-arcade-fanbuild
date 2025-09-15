// --- Mapping der Sound-Dateien ---
export const SND = {
  shoot:     'sounds/shoot.wav',
  explosion: 'sounds/explosion.wav',
  thrust:    'sounds/thrust_loop.wav',
  level:     'sounds/level.wav',
  pickup:    'sounds/pickup.wav',
  gameover:  'sounds/gameover.wav',
  music:     'sounds/titelmelody.m4a',
  boss:      'sounds/ufo_boss.m4a',
  tie:       'sounds/tie_theme.m4a',
  seismic:   'sounds/seismic_charge.m4a',
};

// Pool für globale Kontrolle (mute/unlock)
const __allAudio = [];

// Polyphoner One-Shot
function makeOneShot(url, volume = 0.6, poly = 6) {
  const pool = Array.from({ length: poly }, () => {
    const a = new Audio(url);
    a.preload = 'auto';
    __allAudio.push(a);
    return a;
  });

  let vol = volume;
  pool.forEach(a => a.volume = vol);
  let i = 0;

  const play = function () {
    const a = pool[i];
    i = (i + 1) % pool.length;
    a.volume = vol;
    try { a.currentTime = 0; a.play(); } catch {}
  };
  play.setVolume = (v) => { vol = v; pool.forEach(a => a.volume = vol); };
  return play;
}

// Linearer Fader
function fadeTo(audio, target, ms, onDone){
  const start = audio.volume, t0 = performance.now();
  function step(t){
    const k = Math.min(1, (t - t0)/ms);
    const next = start + (target - start) * k;
    audio.volume = Math.max(0, Math.min(1, next)); // clamp [0..1]
    if (k < 1) requestAnimationFrame(step); else onDone && onDone();
  }
  requestAnimationFrame(step);
}

// Loop (BGM/Thrust) mit Ducking
function makeLoop(url, volume = 0.2) {
  const a = new Audio(url);
  a.preload = 'auto';
  a.loop = true;
  a.volume = 0;
  a.crossOrigin = 'anonymous';
  __allAudio.push(a);

  return {
    start(fadeMs = 400){ a.play().then(()=>fadeTo(a, volume, fadeMs)).catch(()=>{}); },
    stop(fadeMs = 400){ fadeTo(a, 0, fadeMs, () => a.pause()); },
    setVolume(v){ volume = v; a.volume = v; },
    duck(drop = 0.1, holdMs = 500){
      const base = volume;
      const from = a.volume;
      const to = Math.max(0, from - drop);
      fadeTo(a, to, 120, () => setTimeout(() => fadeTo(a, base, 160), holdMs));
    }
  };
}

// ---------- Public API ----------

// SFX Instanzen
export const sfx = {
  shoot:     makeOneShot(SND.shoot,     0.17, 6),
  explosion: makeOneShot(SND.explosion, 0.10, 8),
  level:     makeOneShot(SND.level,     0.30, 2),
  pickup:    makeOneShot(SND.pickup,    0.38, 2),
  gameover:  makeOneShot(SND.gameover,  0.50, 1),
  thrust:    makeLoop   (SND.thrust,    0.08),
  seismic:   makeOneShot(SND.seismic,   1.0, 2)
};

// === BGM-Switcher: Main , Boss , Tie ===
const bgmMain = makeLoop(SND.music, 0.55);
const bgmTie = makeLoop(SND.tie, 0.55);
const bgmBoss = makeLoop(SND.boss,  0.55);
let activeLoop = bgmMain;

export const bgm = {
  start(fade=400){ activeLoop.start(fade); },
  stop(fade=400){ activeLoop.stop(fade); },
  duck(drop=0.1, hold=500){ activeLoop.duck(drop, hold); },
  toBoss(fade=400){
    if (activeLoop === bgmBoss) return;
    bgmMain.stop(fade);
    bgmTie.stop(fade);
    activeLoop = bgmBoss;
    bgmBoss.start(fade);
  },
  toTie(fade=400){
    if(activeLoop === bgmTie) return;
    bgmBoss.stop(fade);
    bgmMain.stop(fade);
    activeLoop = bgmTie;
    bgmTie.start(fade);
  },
  toMain(fade=400){
    if (activeLoop === bgmMain) return;
    bgmBoss.stop(fade);
    bgmTie.stop(fade);
    activeLoop = bgmMain;
    bgmMain.start(fade);
  }
};

// Autoplay-Policy: beim ersten User-Input freischalten
let audioUnlocked = false;
export function unlockAudio() {
  if (audioUnlocked) return Promise.resolve();
  audioUnlocked = true;
  const tasks = __allAudio.map(a => {
    a.muted = true;
    return a.play().then(() => {
      if (!a.loop) { a.pause(); a.currentTime = 0; } // Loops laufen still weiter
      a.muted = false;
    }).catch(() => { a.muted = false; });
  });
  return Promise.allSettled(tasks);
}

// BGM nur einmal starten (nimmt jeweils den aktiven Track)
let bgmStarted = false;
export function startBgmOnce(fadeMs = 800) {
  if (!bgmStarted) { bgm.start(fadeMs); bgmStarted = true; }
}

// Globales Mute
let muted = false;
export function toggleMute() {
  muted = !muted;
  for (const a of __allAudio) a.muted = muted;
}

// --- SLOWMO EFFEKT ---

// globale Playback Rate
// Merkt sich, wie schnell alle sounds abgespielt werden sollen
// 1 = normal, <1 = langsamer, >1 schneller
let __audioTimeScale = 1;

// sanftes runterfahren 
function rampPlaybackRate(audio, target, ms = 120) {
  const start = audio.playbackRate || 1;                // aktuelle Geschwindigkeit
  const t0 = performance.now();                         // Starzeitpunkt 

  // Pitch nicht erhalten (filmischer "waaah"-Effekt)
  // sorgt dafür dass die Tönhöhe sich mit ändert 
  if ('preservesPitch' in audio) audio.preservesPitch = false;
  if ('mozPreservesPitch' in audio) audio.mozPreservesPitch = false;
  if ('webkitPreservesPitch' in audio) audio.webkitPreservesPitch = false;

  function step(t) {
    const k = Math.min(1, (t - t0) / ms);           // Fortschritt 0..1
    const cur = start + (target - start) * k;       // linearer Übergang
    audio.playbackRate = cur;                       // aktuelle Rate setzen
    if (k < 1) requestAnimationFrame(step);         // weitermachen bis Ziel erreicht
  }
  requestAnimationFrame(step);                      // Animationsloop starten
}

export function setAudioTimeScale(scale, rampMS = 120){

  // skaliert nur zwischen 0.5 und 1.0 da es sonst zu Ton fehlern kommen kann
  const clamped = Math.max(0.5, Math.min(1.0, scale || 1));

  // Wenn sich nichts ändert abbrechen
  if (Math.abs(clamped - __audioTimeScale) < 0.01) return;
  
  // neuen Wert merken
  __audioTimeScale = clamped;

  // Alle Audios auf neue Rate anpassen
  for (const a of __allAudio) rampPlaybackRate(a, __audioTimeScale, rampMS);
}

// aktuellen Wert zurückgeben (Für Hud und Debug)
export function getAudioTimeScale() {
  return __audioTimeScale;
}