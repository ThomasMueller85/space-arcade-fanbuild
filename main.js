import { 
  INVINCIBLE_TIME, FIRE_COOLDOWN, POINTS, HISC_MAX, BOSS_EVERY, UFO_SCORE, TIE_SCORE, TIE_START_LEVEL,TIE_IFRAME, HYPER_KEY, 
  HYPER_THRUST_MUL, HYPER_COOLDOWN, ROCKET_PICKUP_AMMO, ROCKET_COOLDOWN, UFO_STREAK_START, UFO_STREAK_END, UFO_STREAK_BASE, UFO_STREAK_STEP } from './config.js';
import { sfx, bgm, unlockAudio, startBgmOnce, toggleMute, setAudioTimeScale } from './audio.js';
import { dist2, clearAll } from './utils.js';
import { showLevelBanner, openOverlay, closeOverlay, isOverlayOpen, setHighscores, openHighscoresOverlayFromFile
} from './overlays.js';
import {tryFire, getBullets, updateBullets, drawBullets, removeBulletAt, resetBullets
} from './bullets.js';
import {initField, getAsteroids, updateAsteroids, drawAsteroids,
  destroyAsteroidAt, resetAsteroids} from './asteroids.js';
import { createShip, resetShip, updateShip, drawShip } from './ship.js';
import { drawHUD } from './hud.js';
import { setupMenu, openMenu, closeMenu, isMenuOpen } from './menu.js';
import {updatePowerups, drawPowerups, maybeDropFromAsteroid, handlePickupCollision, fireCooldown, resetPowerups,
  getShieldDuration, getTimeScale, getShotOffsetsRad } from './powerups.js';
import {isUfoActive, spawnUfo, updateUfo, drawUfo,
  resetUfo, getUfo, damageUfo, expectedBossHP, getUfos } from './ufo.js';
import {resetTies, getTies, spawnTies, updateTies, drawTies, destroyTieAt,
  getTieShots, updateTieShots, drawTieShots, resetTieShots, updateTieExplos, drawTieExplos } from './tie.js';
import {addShipHitShake, updateFx, beginWorld, endWorld } from './fx.js';
import {ensureHighscoreDir, loadHighscoresFromFile, saveHighscoresToFile } from './hiscore_io.js';
import { startHyper, updateHyper, isHyperActive, drawHyperOverlay, cooldownLeft } from './hyper.js';
import { resizeStarfield, updateStarfield, drawStarfield } from './starfield.js';
import { resetUfoShots, updateUfoShots, drawUfoShots, getUfoShots } from './ufoShots.js';
import { readController, rumble } from "./controller.js";
import { isDeathstarActive, spawnDeathstar, updateDeathstar, drawDeathstar,
  resetDeathstar, getDeathstarShots, bulletHitsWeakSpot, damageDeathstar } from "./deathstar.js";
import { spawnRocketFromShip, updateRockets, drawRockets, drawRocketEffects, resetRockets, updateRocketFX, drawRocketTrails  } from './rockets.js';
import { playStarWarsOpening } from './opening.js';
import { handleBulletAsteroidHits, handleShipAsteroidHit, handleShipUfoHit, handleShipUfoBulletHits, handleBulletUfoHits, handleBulletTieHits,
  handleShipTieHit, handleShipTieBulletHits, handleShipDeathstarBulletHits } from './handle.js';


// Holt das Canvas Element
const canvas = document.getElementById('game');
// Fragt den 2D Zeichenkontext an
const ctx = canvas.getContext('2d');
// Schaut ob Retina display(1) oder normales(>1) 
const DPR = window.devicePixelRatio || 1;
// Fenstergröße in CSS Pixel
let CSS_W = 0, CSS_H = 0;
// aktuelles Level
let level = 1;
// sperre für das Levelsystem
let wavePending = false;
// leben des Spielers
let lives = 3;
// Spielzustand 
let gameOver = false;
// Aktueller Punktestand 
let score = 0;
// Anzahl der zerstörter Asteroiden
let destroyedCount = 0;
let padEdge = { pause:false, select:false, hyper:false };

let lastAudioTs = 1;

let playedGameOverSfx = false;

function ufoCountForLevel(lvl){
  return UFO_STREAK_BASE + (lvl - UFO_STREAK_START) * UFO_STREAK_STEP;
}
function inUfoStreak(lvl){
  return lvl >= UFO_STREAK_START && lvl <= UFO_STREAK_END;
}

let paused = false;
const pauseEl = document.getElementById('pauseOverlay');

function setPaused(on){
  if (paused === on) return;
  paused = on;
  if (paused) {
    pauseEl.hidden = false;
    // Safety: Schub-Sound aus
    sfx.thrust.stop?.();
    // Musik sanft aus
    bgm.stop?.(300);
  } else {
    pauseEl.hidden = true;
    // Musik wieder starten 
    bgm.start(300);
  }
}

let hiscores = [];

// --- Datei-I/O Wrapper (zentral) ---
async function ladeHighscores() {
  try {
    await ensureHighscoreDir();                 // Asteroids-Ordner wählen/prüfen
    hiscores = await loadHighscoresFromFile();  // highscores.txt lesen
    hiscores.sort((a,b) => b.score - a.score);
  } catch (e) {
    console.warn('Highscores laden fehlgeschlagen:', e);
    hiscores = [];
  }
  setHighscores(hiscores, HISC_MAX);            // Overlay-Puffer aktualisieren
}

async function speichereHighscores() {
  try {
    await saveHighscoresToFile(hiscores, HISC_MAX); // highscores.txt schreiben
  } catch (e) {
    console.warn('Highscores speichern fehlgeschlagen:', e);
  }
  setHighscores(hiscores, HISC_MAX);               // Overlay-Puffer aktualisieren
}

// besten Score (Platz 1) zurückgeben sonst 0
function bestScore() { 
    return hiscores.length ? hiscores[0].score : 0; 
}

// Flag: verhindert, dass der Score mehrfach gespeichert wird
let scoreSaved = false;
async function recordHighScoreOnce() {
  if (scoreSaved) return;

  const name = prompt('Name für Highscore?', 'PLAYER') || 'PLAYER';

  hiscores.push({ name, score, ts: Date.now() });
  hiscores.sort((a,b) => b.score - a.score);

  await speichereHighscores();   // schreibt TXT + aktualisiert Overlay-Puffer
  scoreSaved = true;
}

// ----- Schiff ------  
// Spieler Schiff erstellen
const ship = createShip();

// ------ Größen ------
function resize() {
    // Aktuelle Fenstergröße in CSS-Pixel
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;

    // Interne Canvasgröße in Gerätepixel
    canvas.width =  Math.round(cssW * DPR);
    canvas.height = Math.round(cssH * DPR);

    // Skalierung des Zeichenkontexts (Ab hier zeichen wir in CSS Pixel wird intern auf Gerätepixel umgerechnet)
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // Schönere Linienenden und -ecken
    ctx.lineJoin = 'round';
    ctx.lineCap  = 'round';

    // Css Maße für die Spiellogik
    CSS_W = cssW;
    CSS_H = cssH;

    // Schiff in die Mitte setzen bei Spielstart
    resetShip(ship, cssW, cssH);

    resizeStarfield(CSS_W, CSS_H);
}

// Wenn Fenstergröße sich ändert = neu skalieren und anpassen
window.addEventListener('resize', resize);
// und sowieso beim Start aufrufen damit alles richtig ist
resize();

function beginGameAtLevel(startLvl) {
  level = startLvl;

  resetRockets();
  resetDeathstar();
  resetBullets();
  resetAsteroids();
  resetTies();
  resetTieShots();
  resetShip(ship, CSS_W, CSS_H);
  resetUfoShots();

  if (level === 15) {
    spawnDeathstar(level, CSS_W, CSS_H);
    showLevelBanner(level, "Endboss: Todesstern");
    sfx.level();
  } else if (inUfoStreak(level)) {
    const n = ufoCountForLevel(level);
    spawnUfo(level, CSS_W, CSS_H, ship, n);
    showLevelBanner(level, `UFO-Streak: ${n}x UFO • HP je ${expectedBossHP(level)}`);
    sfx.level();
  } else if (level % BOSS_EVERY === 0) {
    // UFO-Boss
    spawnUfo(level, CSS_W, CSS_H, ship);
    showLevelBanner(level, `Boss: UFO • HP ${expectedBossHP(level)}`);
    sfx.level();
  } else if (level >= TIE_START_LEVEL) {
    spawnTies(level, CSS_W, CSS_H, ship);
    showLevelBanner(level, `TIEs gesichtet!`);
    sfx.level();
  } else {
    const info = initField(level, CSS_W, CSS_H, ship);
    showLevelBanner(level, `Steine: ${info.count} • Speed: +${Math.round((info.speedMul - 1) * 100)}%`);
    sfx.level();
  }

  // BGM passend wählen (aber nur die Spur, Start-Fade kommt nach dem Opening)
  if (level === 15 || inUfoStreak(level) || (level % BOSS_EVERY === 0)) {
    bgm.toBoss(0);
  } else if (level >= TIE_START_LEVEL) {
    bgm.toTie(0);
  } else {
    bgm.toMain(0);
  }
}

setupMenu(async (startLevel) => {
  // Highscores laden wie gehabt
  await ladeHighscores();

  // Titelmenü schließen, Audio entsperren
  closeMenu();
  await unlockAudio();

  // Spiel pausieren, BGM leise
  setPaused(true);        // zeigt dein Pause-Overlay nicht, aber stoppt Updates und BGM
  bgm.stop?.(300);

  // Opening spielen – nutzt deinen starfield-Canvas im Overlay + Opening-Audio
  playStarWarsOpening({
    onDone: () => {
      // Nach dem Opening: Spiel starten
      setPaused(false);
      beginGameAtLevel(startLevel);

      // BGM sanft rein
      startBgmOnce(800);
    }
  });
});

// Menü beim Laden zeigen
openMenu();

// ------- Eingabe ---------

// Set speichert aktuell gedrückte Taste (ArrowLeft,ArrowRight,ArrowUp,"" )
const keys = new Set();

// Beim drücken Tastenbefehl aus dem Event holen ggf. scrollen etc verhindern und in Set speichern
window.addEventListener('keydown', (e) => {
  const { key } = e;
  if (["ArrowLeft","ArrowRight","ArrowUp"," "].includes(key)) e.preventDefault();

  unlockAudio().then(() => { if (!window.__openingActive) startBgmOnce(800); });  

  if (key === 'ArrowUp' && !paused) sfx.thrust.start();
  
  if (key === 'm' || key === 'M') toggleMute();
  if (key === 'Enter' && gameOver) restart();
  if ((key === 'b' || key === 'B') && !paused && !isMenuOpen()) {tryFireRocket(ship); }
  if (key === 'p' || key === 'P') setPaused(!paused); 
  if (key.toLowerCase() === HYPER_KEY && !paused) {
    startHyper(ship);
  }
  if (key === 'h' || key === 'H') {
  if (isOverlayOpen()) closeOverlay();
  else {
    // Lädt highscores.txt beim Öffnen (User-Geste vorhanden)
    openHighscoresOverlayFromFile(HISC_MAX, 'Highscores', !isMenuOpen());
  }
}
  keys.add(key);
}, { passive: false });

// beim loslassen Key wieder aus dem Set entfernen 
window.addEventListener('keyup', (e) => {
    const {key} = e;

    if (key === 'ArrowUp') sfx.thrust.stop(); // schub stoppen
    keys.delete(key);
});

function restart() {

    closeOverlay();
    // Grundzustand
    lives = 3;
    score = 0;
    destroyedCount = 0;
    gameOver = false;
    scoreSaved= false;

    // Spielfeld
    level = 1;
    wavePending = false;

    // Objekte leeren
    resetBullets();
    resetTies();
    resetRockets();

    resetShip(ship, CSS_W, CSS_H);
    ship.inv = 0;

    resetBullets();
    resetUfo();
    resetAsteroids();
    resetPowerups();
    const info = initField(level, CSS_W, CSS_H, ship);
    showLevelBanner(level, `Steine: ${info.count} • Speed: +${Math.round((info.speedMul - 1) * 100)}%`);
    sfx.level(); 
    playedGameOverSfx = false;
    bgm.toMain(0); bgm.start(800); bgm.toTie(800); 

}

function tryFireRocket(s = ship) {
  if (!s) return false;               
  s.rocketAmmo ??= 0;
  s.rocketCD   ??= 0;

  if (s.rocketAmmo > 0 && s.rocketCD === 0) {
    spawnRocketFromShip(s);
    s.rocketAmmo -= 1;
    s.rocketCD = ROCKET_COOLDOWN;
    sfx.shoot?.();
    rumble(0.4, 160);
    return true;
  }
  return false;
}
// --------- Spielschleife oder Render-Schleife ---------

// Letzter Zeitstempel 
let last = performance.now(); 

// Render Funktion
function render(now){

    // Render Zeit in Sekunden auf max. 33ms um sprünge zu vermeiden
    const dt = Math.min(0.033, (now - last)/ 1000);
    last = now;

    const ts = getTimeScale();
    const dts = dt * ts;

    if (Math.abs(ts - lastAudioTs) > 0.01) {
      console.log('SlowMo ts ->', ts);
      setAudioTimeScale(ts, 220); // sanftes Rampen
      lastAudioTs = ts;
    }


    let pad = readController();
    if (pad) {
      // Pause-Toggle (Flanke)
      if (pad.pause && !padEdge.pause) setPaused(!paused);
      padEdge.pause = pad.pause;

      // Mute-Toggle (Select/Back)
      if (pad.select && !padEdge.select) toggleMute();
      padEdge.select = pad.select;

      // Hyper (einmalig, wenn nicht pausiert)
      if (pad.hyper && !padEdge.hyper && !paused) startHyper(ship);
      padEdge.hyper = pad.hyper;

      // Rocket 
      if (pad && pad.rocket) {
      tryFireRocket(ship); // COOLDOWN + AMMO regeln das Spam-Problem
      }
    }

    const hState = {
    lives, score, destroyedCount, gameOver,
    CSS_W, CSS_H, ship
  };

  

    // erst mal alles löschen 
    clearAll(ctx, canvas);

    updateStarfield(dts);
    drawStarfield(ctx);

    updateFx(dts);

    updateHyper(dts);

    updateDeathstar(dts, CSS_W, CSS_H, ship);

    if (isMenuOpen()) { requestAnimationFrame(render); return; }

    if (paused) {
    drawHUD(ctx, { 
      lives,
      score, 
      level, 
      destroyed: destroyedCount, 
      best: bestScore(),
      hyper: {
      active: isHyperActive(),
      cd: cooldownLeft(),       // Rest-Cooldown in Sekunden
      cdMax: HYPER_COOLDOWN,    // Gesamter Cooldown
      key: HYPER_KEY            // Taste z.B. 'l'
      },
      rockets: { ammo: ship.rocketAmmo,
      cd: ship.rocketCD,
      cdMax: ROCKET_COOLDOWN, 
      key: 'B' } 
    });

    requestAnimationFrame(render);
    return;
    }

    if (isMenuOpen()) {
    // Titelbild liegt als DOM-Overlay darüber; Spiel pausiert
    requestAnimationFrame(render);
    return;
    }

    beginWorld(ctx);

    // Eingaben fürs Schiff
    const inputs = {
        left:  keys.has('ArrowLeft'),
        right: keys.has('ArrowRight'),
        up:    keys.has('ArrowUp')
    };

    
    pad = pad || readController();
    if (pad) {
    const DEAD = 0.25;
    if (pad.x < -DEAD) inputs.left = true;
    else if (pad.x > DEAD) inputs.right = true;

    // Thrust LT
    if (pad.thrust) inputs.up = true;

    if (!paused) {
      if (pad.thrust && !keys.has('ArrowUp')) sfx.thrust.start();
      else if (!keys.has('ArrowUp')) sfx.thrust.stop();
    }

    // Schießen RT (nicht den Pause/Mute/Hyper-Teil hier reindrücken!)
    if (pad.shoot && ship.cooldown === 0) {
      const offs = getShotOffsetsRad();
      let firedAny = false;
      for (const off of offs) firedAny = tryFire(ship, off) || firedAny;
      if (firedAny) {
        sfx.shoot();
        rumble(0.2, 100);
        ship.cooldown = fireCooldown(FIRE_COOLDOWN);
      }
    }
  }

    const thrustMul = isHyperActive() ? HYPER_THRUST_MUL : 1;
    // Schiff bewegen/physik
    updateShip(ship, dt, inputs, CSS_W, CSS_H, thrustMul);

    // Schießen (Cooldown kommt aus ship)
    if (keys.has(' ') && ship.cooldown === 0) {
    const offs = getShotOffsetsRad();
    let firedAny = false;
    for (const off of offs) firedAny = tryFire(ship, off) || firedAny;
    if (firedAny) {
      sfx.shoot();
      rumble(0.2, 100);
      ship.cooldown = fireCooldown(FIRE_COOLDOWN);
    }
  }

    // Bullets erstellen
    updateBullets(dt, CSS_W, CSS_H);

    // Asteroiden erstellen
    updateAsteroids(dts, CSS_W, CSS_H);

    // Ufo erstellen
    updateUfo(dts, CSS_W, CSS_H, ship);
    updateUfoShots(dts, CSS_W, CSS_H);
    handleShipUfoBulletHits(hState, {
      INVINCIBLE_TIME, dist2, getUfoShots, addShipHitShake, rumble
    });

    updateTies(dts, CSS_W, CSS_H, ship);

    updateTieShots(dts, CSS_W, CSS_H);
    updateTieExplos(dt);

    const targets = [];

// 1) Asteroiden (Wrapper mit eigenem hp + onKilled)
const asts = getAsteroids();
for (const a of asts) {
  targets.push({
    x: a.x, y: a.y, radius: a.r, hp: 1,
    onKilled: () => {
      const arr = getAsteroids();            // aktuellen Stand holen
      const idx = arr.indexOf(a);            // Index zur Kill-Zeit bestimmen
      if (idx === -1) return;                // schon weg? dann nix tun
      const dead = destroyAsteroidAt(idx);   // jetzt sicher zerstören
      if (!dead) return;                     // Safety
      score += POINTS[dead.level] || 0;
      destroyedCount += 1;
      maybeDropFromAsteroid(dead);
    }
  });
}

// 2) TIEs (direkt-Objekt, aber mit radius-Feld + onKilled, hp kommt aus TIE selbst)
const ties = getTies();
for (const t of ties) {
  targets.push({
    x: t.x, y: t.y, radius: t.r, hp: t.hp,   // hp kommt vom TIE
    onKilled: () => {
      const arr = getTies();
      const idx = arr.indexOf(t);
      if (idx === -1) return;
      const dead = destroyTieAt(idx);
      if (!dead) return;
      sfx.explosion();
      score += TIE_SCORE;
      destroyedCount += 1;
      maybeDropFromAsteroid({ x: dead.x, y: dead.y });
    }
  });
}

// UFO (Wrapper: hp separat – bei Kill hart beenden)
if (isUfoActive()) {
  for (const u of getUfos()){
    targets.push({
      x: u.x, y: u.y, radius: u.r, hp: u.hp ?? 50,
      onKilled: () => {
        const dead = damageUfo(u, 9999);
        if (!dead) return;
        sfx.explosion();
        score += UFO_SCORE;
        destroyedCount += 1;
        maybeDropFromAsteroid({ x: dead.x, y: dead.y });
        if (!isUfoActive()) bgm.toMain(600);
      }
    });
  }
}


    updateRockets(dt, targets, CSS_W, CSS_H);
    updateRocketFX(dt);

    // Treffer berechnen 
    handleBulletAsteroidHits(hState, {
      sfx, POINTS, dist2, getAsteroids, getBullets, removeBulletAt, destroyAsteroidAt, maybeDropFromAsteroid
    });

    // Ufo treffer berechnen
    handleBulletUfoHits(hState, {
      sfx, bgm, UFO_SCORE, dist2, getBullets, getUfos, removeBulletAt, damageUfo, isUfoActive, maybeDropFromAsteroid
    });

    handleShipDeathstarBulletHits(hState, {
      INVINCIBLE_TIME, dist2, getDeathstarShots, addShipHitShake, rumble
    });

    // Wenn GameOver Highscores speichern
   if (gameOver && !playedGameOverSfx) {
        playedGameOverSfx = true;     // Flag als "einmalig" Schalter

        sfx.gameover();               // Sound
        bgm.stop(800);                // Musik ausblenden

        recordHighScoreOnce();        // Score speichern (idempotent via scoreSaved)
        setHighscores(hiscores, HISC_MAX);   // Overlay-Liste aktualisieren

    if (!isOverlayOpen()) openOverlay('Game Over', true); // Overlay zeigen
    }

    // Spieler Leben
    handleShipAsteroidHit(hState, {
      INVINCIBLE_TIME, dist2, getAsteroids, addShipHitShake, rumble
    });

    handleShipTieBulletHits(hState, {
      INVINCIBLE_TIME, dist2, getTieShots, addShipHitShake, rumble
    });

    handleBulletTieHits(hState, {
      sfx, TIE_SCORE, TIE_IFRAME, dist2, getBullets, getTies, removeBulletAt, destroyTieAt, maybeDropFromAsteroid
    });

    // Ufo leben
    handleShipUfoHit(hState, {
      INVINCIBLE_TIME, dist2, isUfoActive, getUfos, addShipHitShake, rumble
    });

    handleShipTieHit(hState, {
      INVINCIBLE_TIME, dist2, getTies, addShipHitShake, rumble
    });

    ({ lives, score, destroyedCount, gameOver } = hState);

    updatePowerups(dt, CSS_W, CSS_H);

    const got = handlePickupCollision(ship);
    if (got) {
        sfx.pickup();
        rumble(0.4, 200);
        if (got.type === 'shield') {
            ship.inv += getShieldDuration(); // z. B. +4s Unverwundbarkeit
        } else if (got.type === 'oneup') {
        lives += 1;
        } else if (got.type === 'rapid') {
        } else if (got.type === 'rocket') {
          ship.rocketAmmo += ROCKET_PICKUP_AMMO;
        }
    }

    // Spiel Level
    const enemiesCleared = (!isUfoActive() &&
    !isDeathstarActive() && 
    getAsteroids().length === 0 && getTies().length === 0);
    if (!wavePending && enemiesCleared) {
        wavePending = true;
        setTimeout(() => {
            level += 1;  
            if (level === 15) {
              // Death Star spawnen
              resetDeathstar();          // Safety
              resetUfo(); 
              resetUfoShots();
              resetAsteroids(); 
              resetTies(); 
              spawnDeathstar(level, CSS_W, CSS_H);
              showLevelBanner(level, "Endboss: Todesstern");
              sfx.level();
              bgm.toBoss(450);
            } else if (inUfoStreak(level)) {
              const n = ufoCountForLevel(level);
              spawnUfo(level, CSS_W, CSS_H, ship, n);
              showLevelBanner(level, `UFO-Streak: ${n}x UFO • HP je ${expectedBossHP(level)}`);
              sfx.level();
              bgm.toBoss(450);            
            } else if (level % BOSS_EVERY === 0) {
              spawnUfo(level, CSS_W, CSS_H, ship);
              showLevelBanner(level, `Boss: UFO • HP ${expectedBossHP(level)}`);
              sfx.level();
              bgm.toBoss(450);
            } else if (level >= TIE_START_LEVEL) { 
              spawnTies(level, CSS_W, CSS_H, ship);
              showLevelBanner(level, `TIEs gesichtet!`);
              sfx.level();
              bgm.toTie(450);
            } else {
              const info = initField(level, CSS_W, CSS_H, ship);
              showLevelBanner(level, `Steine: ${info.count} • Speed: +${Math.round((info.speedMul - 1) * 100)}%`);
              sfx.level();
              bgm.toMain(450);
            }
            bgm.duck(0.06, 450); 
            wavePending = false;  // Sperre wieder aktivieren
        }, 800)                   // kurze Pause
    }

    // Asteroiden zeichnen
    drawAsteroids(ctx);

    drawTieExplos(ctx); 

    drawTies(ctx);

    drawTieShots(ctx);

    drawUfo(ctx);
    drawUfoShots(ctx);

    // Powerups
    drawPowerups(ctx);

    drawRocketTrails(ctx);
    drawRockets(ctx);
    drawRocketEffects(ctx);

    // Bullets zeichnen 
    drawBullets(ctx);

    // Schiff Zeichnen
    drawShip(ctx, ship);

    drawDeathstar(ctx);

    if (isDeathstarActive()) {
    const bs = getBullets();
    for (let j = bs.length - 1; j >= 0; j--) {
      const b = bs[j];
      if (bulletHitsWeakSpot(b)) {
        removeBulletAt(j);
        const dead = damageDeathstar(1); // nur Weakspot macht Schaden
        if (dead) {
          sfx.explosion();
          rumble(1.0, 500);
          score += 5000;       // dicker Bonus
          destroyedCount += 1; // zählt als “Feind”
          resetDeathstar();
          bgm.toMain(600);
          showLevelBanner(level, "Todesstern zerstört!");
        }
      break; // pro Frame max. 1 Treffer
    }
  }
}

    endWorld(ctx);

    drawHyperOverlay(ctx, ship.angle, CSS_W, CSS_H)

    // Lives, Score, Level, etc zeichnen
    drawHUD(ctx, {
      lives,
      score,
      level,
      destroyed: destroyedCount,
      best: bestScore(),
      hyper: {
        active: isHyperActive(),
        cd: cooldownLeft(),      // Rest-Cooldown in s
        cdMax: HYPER_COOLDOWN,   // Gesamter Cooldown in s
        key: HYPER_KEY           // z. B. 'l'
      },
      rockets: { ammo: ship.rocketAmmo, 
      cd: ship.rocketCD, 
      cdMax: ROCKET_COOLDOWN, 
      key: 'B' }
});

    // nächsten Frame anfordern 
    requestAnimationFrame(render);
}

// Denn Loop starten 
requestAnimationFrame(render);