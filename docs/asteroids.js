// asteroids.js
import {
  TAU, AST_INIT_COUNT, AST_SPEED_MIN, AST_SPEED_MAX,
  COUNT_STEP, SPEED_STEP, AST_AMBIENT_COUNT, AST_AMBIENT_RADIUS, AST_AMBIENT_SAFE_DIST
} from './config.js';
import { rand, dist2, wrap } from './utils.js';

// Zentrales Array für alle Asteroiden
const asteroids = [];

// Geschwindigkeits-Multiplikator , wird pro Level in initField erhöht
let SPEED_MUL = 1; 

// Erzeugt eine "felsige" Außenform für die Asteroiden
function makeAsteroidShape(radius) {
  const pts = [];
  const n = Math.floor(rand(8, 12));      // 8-12 Zacken für unterschiedliche Asteroiden
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;              // gleichmäßig verteillte Winkel
    const rr = radius * rand(0.72, 1.05); // leicht varrierender Radius (damit sie leicht unterschiedlich sind)
    pts.push({ a, r: rr });
  }
  return pts;
}

// Getter für den export
export function getAsteroids() { 
  return asteroids; 
}

export function resetAsteroids() { 
  asteroids.length = 0; 
}

export function getSpeedMul() { 
  return SPEED_MUL; 
}

// Erzeugt einzelne Asteroiden mit Zufälliger Richtung und Geschwindigkeit
export function spawnAsteroid(x, y, radius, level = 3) {
  // zufällige Richtung
  const ang = rand(0, TAU);
  // kleine sind schneller ; zusätlich levelabhängiger Speed Multiplikator                                                         
  const speed = rand(AST_SPEED_MIN, AST_SPEED_MAX) * (4 - level) / 3 * SPEED_MUL;    

  asteroids.push({
    x, y,
    vx: Math.cos(ang) * speed,
    vy: Math.sin(ang) * speed,
    r: radius,
    radius,                           // seperat für wrap und Kollision genutzt
    level,                            // 3 groß, 2 mittel, 1 klein
    angle: rand(0, TAU),              // Startrotation
    spin: rand(-1, 1),                // Rotationsgeschwindigkeit (links / Rechts)
    shape: makeAsteroidShape(radius), // ungleichmäßige Aussenform
  });
}

// erzeugt Startfeld;
// setzt SPEED_MUL basierend auf dem Level
// spawnt eine Anzahl großer Asteroiden 
// hält ~160px Abstand zum Schiff
export function initField(level, w, h, ship) {
  // Pro Level etwas schneller
  SPEED_MUL = 1 + (level - 1) * SPEED_STEP;
  // Pro Level mehr Asteroiden
  const count = AST_INIT_COUNT + (level - 1) * COUNT_STEP;

  for (let i = 0; i < count; i++) {
    let ax, ay;
    // solange Position würfeln bis genügend Abstand zum Schiff ist 
    do {
      ax = rand(0, w);
      ay = rand(0, h);
    } while (ship && dist2({ x: ax, y: ay }, ship) < 160 * 160);
    // große Asteroiden am Start
    spawnAsteroid(ax, ay, 48, 3);
  }
  // Fürs HUD 
  return { count, speedMul: SPEED_MUL };
}

export function spawnAmbientAsteroids(w, h, ship) {
  const safeR2 = AST_AMBIENT_SAFE_DIST * AST_AMBIENT_SAFE_DIST;

  for (let i = 0; i < AST_AMBIENT_COUNT; i++) {
    let ax, ay;
    // Position würfeln, bis Abstand zum Schiff passt
    do {
      ax = rand(0, w);
      ay = rand(0, h);
    } while (ship && dist2({ x: ax, y: ay }, ship) < safeR2);

    // große Asteroiden
    spawnAsteroid(ax, ay, AST_AMBIENT_RADIUS, 3);
  }
  return AST_AMBIENT_COUNT;
}

// Bewegt und rotiert alle asteroiden und wrapped am Rand
// dt: delta Time in Sekunden
export function updateAsteroids(dt, w, h) {
  for (const a of asteroids) {
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.angle += a.spin * dt * 0.5; // leichte Eigenrotation
    wrap(a, w, h);                // links raus rechts wieder rein
  }
}

// Zeichnet die Asteroiden als Polygon anhand ihrer shape(Ecken) Punkte
export function drawAsteroids(ctx) {
  for (const a of asteroids) {
    ctx.save();
    ctx.translate(a.x, a.y);  // ursprung auf Asteroidenposition
    ctx.rotate(a.angle);      // rotation anwenden
    ctx.beginPath();
    // shape-Punkte umrechnen und verbinden
    for (let i = 0; i < a.shape.length; i++) {
      const p = a.shape[i];
      const px = Math.cos(p.a) * p.r;
      const py = Math.sin(p.a) * p.r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#94a3b8';
    ctx.stroke();
    ctx.restore();
  }
}

// entfernt Asteroid i, teilt ggf. in 2 Kinder, gibt den entfernten zurück
export function destroyAsteroidAt(i) {
  const a = asteroids.splice(i, 1)[0]; // entfernten merken

  // split logic (wenn nicht schon die kleinste Stufe)
  if (a && a.level > 1) {
    const newR = a.r * 0.6;        // Kinder sind 60 % groß
    const newLevel = a.level - 1;  // Level herunterzählen

    // 2 Kinder mit leicht abweichender Geschwindigkeit und eigener Form
    for (let k = 0; k < 2; k++) {
      asteroids.push({
        x: a.x,
        y: a.y,
        vx: a.vx + rand(-40, 40),
        vy: a.vy + rand(-40, 40),
        r: newR,
        radius: newR,
        level: newLevel,
        angle: rand(0, TAU),
        spin: rand(-1, 1),
        shape: makeAsteroidShape(newR),
      });
    }
  }
  return a;  // Fürs punkte vergeben
}
