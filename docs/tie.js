import { wrap, rand } from './utils.js';
import {
  TIE_RADIUS, TIE_BASE_SPEED, TIE_SPEED_PER_TIE, TIE_SPEED_ADD_MAX,
  TIE_SPAWN_BASE, TIE_SPAWN_PER_LEVEL, TIE_SPAWN_CAP,
  TIE_SAFE_DIST_FRACTION, TIE_STROKE, TIE_LINE_WIDTH,
  TIE_START_LEVEL, TIE_HP, TIE_IFRAME, TIE_FIRE_COOLDOWN, TIE_BULLET_SPEED, TIE_BULLET_RADIUS, TIE_BULLET_LIFE, TIE_AIM_JITTER,
  TIE_DRAW_ROT, TIE_MUZZLE_OFFSET, TIE_FORMATION_ENABLED, TIE_FORMATION_TURN_RATE, TIE_FORMATION_COHESION, TIE_LASER_CORE, TIE_LASER_GLOW_1,
  TIE_LASER_GLOW_2, TIE_LASER_GLOW_3, TIE_LASER_TAIL 
} from './config.js';
import { getFormationTarget } from './formation.js';
import { angleTo, turnTowards } from './steering.js';

let ties = [];          // Array aller aktiver TIE-Fighter
let tieShots = [];      // Array aller aktiven TIE-Schüsse

// Setzt alle TIE-Fighter zurück
export function resetTies() { 
    ties = []; 
}

// Liefert aktuelles Array aller TIE-Fighter
export function getTies()   { 
    return ties;
}

// Setzt alle TIE-Schüsse zurück
export function resetTieShots() { 
    tieShots = []; 
}

// Liefert aktuelles Array aller TIE Schüsse
export function getTieShots()   { 
    return tieShots; 
}

// Entfernt einen bestimmten Schuss
export function removeTieShotAt(i){ 
    tieShots.splice(i, 1); 
}

// Entfernt einen TIE Fighter und gibt inh zurück
export function destroyTieAt(i) {
  const dead = ties[i];
  ties.splice(i, 1);
  return dead;
}

// Erzeugt ein neues TIE Objekt an Position (x,y)
export function createTie(x, y) {
  return { 
    x, y, 
    vx: 0,                              // Geschwindigkeit x
    vy: 0,                              // Geschwindigkeit y
    r: TIE_RADIUS,                      // Radius für Darstellung/Kollision
    angle: 0,                           // Blickrichtung
    hp: TIE_HP,                         // Lebenspunkte
    ifr: 0,                             // I Frames (Unverwundbarkeit nach Treffer)
    cd: rand(0.4, TIE_FIRE_COOLDOWN),   // Schuss Cooldown zufällig initialisiert
    type: 'tie'                         // Typkennung
    };
}

// Spawnt Tie Fighter abhängig vom Level
export function spawnTies(level, w, h, player) {
  
  const n = Math.min(
    TIE_SPAWN_CAP,
    Math.max(1, Math.floor(TIE_SPAWN_BASE + (level - TIE_START_LEVEL) * TIE_SPAWN_PER_LEVEL))
  );

  // Sicherheitsradius um Spieler herum (keine Spawns zu nah)
  const safeR2 = (w * TIE_SAFE_DIST_FRACTION) ** 2;

  for (let i = 0; i < n; i++) {
    let x, y;
    do {
      x = Math.random() * w;
      y = Math.random() * h;
    } while ((x - player.x) ** 2 + (y - player.y) ** 2 < safeR2); // Abstand vom Spieler

    ties.push(createTie(x, y));
  }
  return { count: ties.length }; // Anzahl zurückgeben
}

// Lässt einen TIE schießen
function fireFromTie(t){
  const a = t.angle + rand(-TIE_AIM_JITTER, TIE_AIM_JITTER);    // Zielwinkel + Streuung
  const ox = t.x + Math.sin(a) * TIE_MUZZLE_OFFSET;             // Mündungsversatz X (momentan nicht genutzt)
  const oy = t.y + Math.sin(a) * TIE_MUZZLE_OFFSET;             // Mündungsversatz Y (momentan nicht genutzt)
  tieShots.push({
    x: t.x + Math.cos(a) * t.r,                                 // Startpunkt Projektil (vorne am Schiff)
    y: t.y + Math.sin(a) * t.r,
    vx: Math.cos(a) * TIE_BULLET_SPEED,                         // Projektilgeschwindigkeit
    vy: Math.sin(a) * TIE_BULLET_SPEED,
    r: TIE_BULLET_RADIUS,                                       // Radius des Projektils
    ttl: TIE_BULLET_LIFE,                                       // Lebensdauer
    life: TIE_BULLET_LIFE                                       // für Prozentfortschritt / Fade
  });
}

// Bewegt & steuert alle TIE Fighter
export function updateTies(dt, w, h, player) {
    // Geschwindigkeit steigt leicht mit Anzahl der TIEs
  const add  = Math.min(TIE_SPEED_ADD_MAX, TIE_SPEED_PER_TIE * ties.length);
  const speed = TIE_BASE_SPEED + add;


  for (let i = 0; i < ties.length; i++) {
    const t = ties[i];

    t.ifr = Math.max(0, t.ifr - dt);    // Invuln Frames runterzählen
    t.cd = Math.max(0, t.cd - dt);      // Schuss Colldown runterzählen

    const target = getFormationTarget(i, ties, player);

    if (TIE_FORMATION_ENABLED && target) {
      // Slot seek
      const dx = target.x - t.x;
      const dy = target.y - t.y;
      const desireAngle = angleTo(dx, dy);

      // Blickrrichtung sanft anpassen
      t.angle = turnTowards(t.angle, desireAngle, TIE_FORMATION_TURN_RATE, dt);
      
      // Geschwindigkeit in Richtung Slot
      const dist = Math.hypot(dx, dy) || 1;
      const pull = Math.min(1, (TIE_FORMATION_COHESION * dist) / 60); // sanfte Dämpfung
      const vx = Math.cos(desireAngle) * speed * pull;
      const vy = Math.sin(desireAngle) * speed * pull;
    
    // Position aktualisieren
      t.vx = vx;
      t.vy = vy;

    } else {
      // Fallback direkt den Spieler Jagen
      const dx = player.x - t.x;
      const dy = player.y - t.y;
      t.angle = Math.atan2(dy, dx);
      t.vx = Math.cos(t.angle) * speed;
      t.vy = Math.sin(t.angle) * speed;
    }

    // Position
      t.x += t.vx * dt;
      t.y += t.vy * dt;

      wrap(t, w, h);

    // Schießen
      if (t.cd === 0) {
        fireFromTie(t);
        t.cd = TIE_FIRE_COOLDOWN * rand(0.8, 1.3);
    }
  }
}

// Bewegt & verwaltet alle TIE Schüsse
export function updateTieShots(dt, w, h){
  for (let i = tieShots.length - 1; i >= 0; i--){
    const s = tieShots[i];
    s.x += s.vx * dt;                       // Bewegung
    s.y += s.vy * dt;
    s.ttl -= dt;                            // Lebenszeit runter
    wrap(s, w, h);                          // Bildschirmrand Logik
    if (s.ttl <= 0) tieShots.splice(i, 1);  // löschen wenn abgelaufen
  }
}

// Zeichnet alle TIE Schüsse
export function drawTieShots(ctx){
  ctx.save();
  // Additives Blending sorgt für schönes „Aufglühen“
  ctx.globalCompositeOperation = 'lighter';

  for (const s of tieShots){
    // Ausrichtung entlang Flugrichtung
    const ang = Math.atan2(s.vy, s.vx);

    // Fortschritt 0..1 (für leichtes Ausfaden/Tail-Skalierung)
    const p = Math.max(0, Math.min(1, s.ttl / s.life));

    // Tail-Länge dynamisch: frische Schüsse = kürzer, später länger
    const tail = (typeof TIE_LASER_TAIL !== 'undefined' ? TIE_LASER_TAIL : 18) * (0.75 + 0.5 * (1 - p));
    const coreW = s.r * 1.2;   // Kern-Linienstärke
    const glowW = s.r * 3.2;   // Glow-Linienstärke

    // Lokales Koordinatensystem am Projektil
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(ang);

    // ----- Outer Glow (dicke, weiche Linie mit Gradient) -----
    const g = ctx.createLinearGradient(-tail, 0, s.r, 0);
    g.addColorStop(0.00, (typeof TIE_LASER_GLOW_3 !== 'undefined' ? TIE_LASER_GLOW_3 : 'rgba(255,60,60,0.0)'));
    g.addColorStop(0.25, (typeof TIE_LASER_GLOW_2 !== 'undefined' ? TIE_LASER_GLOW_2 : 'rgba(255,150,150,0.55)'));
    g.addColorStop(0.70, (typeof TIE_LASER_GLOW_1 !== 'undefined' ? TIE_LASER_GLOW_1 : 'rgba(255,60,60,0.85)'));
    g.addColorStop(1.00, '#ffffff');

    ctx.lineCap = 'round';
    ctx.strokeStyle = g;
    ctx.globalAlpha = 0.95;              // Grundhelligkeit
    ctx.lineWidth = glowW;               // dicker Glow
    ctx.beginPath();
    ctx.moveTo(-tail, 0);
    ctx.lineTo(0, 0);
    ctx.stroke();

    // ----- Core (heller Kernstreifen) -----
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = (typeof TIE_LASER_CORE !== 'undefined' ? TIE_LASER_CORE : '#ff3b3b');
    ctx.lineWidth = coreW;
    ctx.beginPath();
    ctx.moveTo(-tail * 0.6, 0);
    ctx.lineTo(0, 0);
    ctx.stroke();

    // ----- Hot tip (kleiner, glühender Punkt an der Spitze) -----
    const tip = ctx.createRadialGradient(0, 0, coreW * 0.1, 0, 0, coreW * 1.2);
    tip.addColorStop(0, '#ffffff');
    tip.addColorStop(0.4, (typeof TIE_LASER_GLOW_1 !== 'undefined' ? TIE_LASER_GLOW_1 : 'rgba(255,60,60,0.85)'));
    tip.addColorStop(1, 'rgba(255,60,60,0)');
    ctx.fillStyle = tip;
    ctx.beginPath();
    ctx.arc(0, 0, coreW * 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // lokal
  }

  ctx.restore(); // global
}


// Zeichnet alle TIE Fighter
export function drawTies(ctx) {
  for (const t of ties) {
    ctx.save();
    ctx.translate(t.x, t.y);                // Ursprung auf TIE setzen
    ctx.rotate(t.angle + TIE_DRAW_ROT);     // ausrichten 


    const r = t.r;
    ctx.lineWidth = TIE_LINE_WIDTH;
    ctx.strokeStyle = TIE_STROKE;

    // Blinken solange IFrames nach treffer
    if (t.ifr > 0) {
      const blink = (Math.floor(performance.now() * 0.02) % 2) === 0;
      ctx.globalAlpha = blink ? 0.35 : 1.0;
    }

    // Solarpanels
    ctx.beginPath();
    ctx.rect(-r * 1.2, -r * 0.9, r * 0.5, r * 1.8);
    ctx.rect( r * 0.7,  -r * 0.9, r * 0.5, r * 1.8);
    ctx.stroke();

    // Streben
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, -r * 0.8); ctx.lineTo(-r * 0.2, -r * 0.3);
    ctx.moveTo(-r * 0.7,  r * 0.8); ctx.lineTo(-r * 0.2,  r * 0.3);
    ctx.moveTo( r * 0.2, -r * 0.3); ctx.lineTo( r * 0.7, -r * 0.8);
    ctx.moveTo( r * 0.2,  r * 0.3); ctx.lineTo( r * 0.7,  r * 0.8);
    ctx.stroke();

    // Cockpit
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}
