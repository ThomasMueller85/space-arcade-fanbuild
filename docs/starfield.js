import {
  STARFIELD_COUNT, STARFIELD_LAYERS,
  STARFIELD_TWINKLE_MIN, STARFIELD_TWINKLE_MAX,
  STARFIELD_MIN_R, STARFIELD_MAX_R, STARFIELD_DRIFT
} from './config.js';

let stars = [];     // Array für alle Sterne im Sternenhimmel
let W = 0, H = 0;   // aktuelle Breite/Höhe des Spielfelds
let T = 0;          // Zeit-Accumulator (für Twinkle-Effekt)

// Initialisiert den Sternenhimmel mit zufälligen Sternen
export function initStarfield(w, h) {
  W = w; H = h;                            // Spielfeldgröße merken
  stars.length = 0;                        // Array leeren
  const L = Math.max(1, STARFIELD_LAYERS); // Anzahl Layer (mindestens 1)

  // Schleife über Anzahl der zu erstellenden Sterne
  for (let i = 0; i < STARFIELD_COUNT; i++) {
    const layer = Math.floor(Math.random() * L);                                                           // Layer auswählen (0 .. L-1)
    const size  = STARFIELD_MIN_R + Math.random() * (STARFIELD_MAX_R - STARFIELD_MIN_R);                   // Sternradius zufällig
    const r     = size * (1 + layer * 0.25);                                                               // Layer beeinflusst Größe (näher = größer)
    const tw    = STARFIELD_TWINKLE_MIN + Math.random() * (STARFIELD_TWINKLE_MAX - STARFIELD_TWINKLE_MIN); // Twinkle-Frequenz
    const phase = Math.random() * Math.PI * 2;                                                             // Startphase fürs Blinken
    const base  = 0.35 + Math.random() * 0.35;                                                             // Grundhelligkeit
    const amp   = 0.20 + Math.random() * 0.45;                                                             // Amplitude fürs Blinken
    const drift = STARFIELD_DRIFT * (0.3 + (layer / Math.max(1, L - 1)) * 0.7);                            // Scrollgeschwindigkeit je Layer

    // Stern ins Array einfügen
    stars.push({
      x: Math.random() * W,  // Startposition X
      y: Math.random() * H,  // Startposition Y
      r, layer, tw, phase, base, amp, drift
    });
  }
}

// Bei Fensteränderung alles neu initialisieren
export function resizeStarfield(w, h) {
  initStarfield(w, h);
}

// Aktualisiert die Position der Sterne über die Zeit
export function updateStarfield(dt) {
  T += dt;                               // Zeit hochzählen (für Twinkle-Effekt)
  for (const s of stars) {
    s.x -= s.drift * dt;                 // Stern nach links verschieben
    if (s.x < -s.r) s.x += W + s.r * 2;  // Wrap-around: links raus → rechts wieder rein
  }
}

// Zeichnet alle Sterne
export function drawStarfield(ctx) {
  //console.log('stars:', stars.length); // Debug-Ausgabe: Anzahl Sterne
  ctx.save();
  for (const s of stars) {
    // Alpha-Wert berechnen: Basishelligkeit + Sinus für Twinkle
    const alpha = Math.max(0, Math.min(1, s.base + Math.sin(T * s.tw + s.phase) * s.amp)) * 0.95;
    const rr = Math.max(0.5, s.r); // Radius niemals kleiner als 0.5

    // Radialer Farbverlauf (Glüheffekt)
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, rr);
    g.addColorStop(0.00, `rgba(220,235,255,${alpha})`);        // hellblau-weiß im Zentrum
    g.addColorStop(0.50, `rgba(150,180,255,${alpha * 0.55})`); // weicher Übergang
    g.addColorStop(1.00, 'rgba(0,0,0,0)');                     // außen transparent
    ctx.fillStyle = g;

    // Stern als Kreis zeichnen und füllen
    ctx.beginPath();
    ctx.arc(s.x, s.y, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}