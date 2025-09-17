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

const num = (v, d=0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const clamp = (x,a,b) => Math.max(a, Math.min(b,x));

let ties = [];          // Array aller aktiver TIE-Fighter
let tieShots = [];      // Array aller aktiven TIE-Schüsse

// --- TIE Explosion FX --------------------------------------------------------
let tieExplos = []; // FX Objekte

const TIE_EX_SPARKS   = 18;    // Anzahl Funken
const TIE_EX_SHARDS   = 8;     // Anzahl Panel-Splitter
const TIE_EX_DRAG     = 0.86;  // Luft-/Weltraumwiderstand pro Sekunde
const TIE_EX_LIFE     = 0.9;   // Grundlebenszeit (Sek.)
const TIE_EX_MAX      = 150;   // Max FX-Objekte (Pool-Begrenzung)

function addFx(obj){
  if (tieExplos.length < TIE_EX_MAX) tieExplos.push(obj);
  else tieExplos[(Math.random()*tieExplos.length)|0] = obj;
}

export function spawnTieExplosion(src){
  const x = src.x, y = src.y, r = src.r || 24;

  // 1) Flash (heller Kern, sehr kurz)
  addFx({ k:'flash', x, y, r: r*1.2, age:0, life:0.10 });

  // 2) Stoßring (Shockwave)
  addFx({ k:'ring', x, y, r0:r*0.3, r1:r*3.0, age:0, life:0.35 });

  // 3) Ion-Funken (additiv, bläulich/grünlich)
  for (let i=0;i<TIE_EX_SPARKS;i++){
    const a = Math.random() * Math.PI*2;
    const v = r * (3.5 + Math.random()*2.5);
    addFx({
      k:'spark', x, y,
      vx: Math.cos(a)*v, vy: Math.sin(a)*v,
      age:0, life: TIE_EX_LIFE * (0.75 + Math.random()*0.5),
      s: 1.2 + Math.random()*1.8
    });
  }

  // 4) Panel-Splitter (kleine Rechtecke mit Rotation)
  for (let i=0;i<TIE_EX_SHARDS;i++){
    const a = Math.random() * Math.PI*2;
    const v = r * (2.0 + Math.random()*1.8);
    addFx({
      k:'shard', x, y,
      vx: Math.cos(a)*v, vy: Math.sin(a)*v,
      w: 4 + Math.random()*6, h: 2 + Math.random()*3,
      ang: Math.random()*Math.PI*2,
      av: (-3 + Math.random()*6), // Winkelgeschw.
      age:0, life: TIE_EX_LIFE * (0.9 + Math.random()*0.5)
    });
  }

  // Optional: Sound, falls vorhanden (aus deinem audio-Modul)
  // try { sfx?.explosion?.(); } catch {}
}

export function updateTieExplos(dt){
  const drag = Math.pow(TIE_EX_DRAG, dt);
  let w = 0;
  for (let i=0;i<tieExplos.length;i++){
    const p = tieExplos[i]; p.age += dt;
    if (p.age >= p.life){ continue; }

    if (p.k === 'spark' || p.k === 'shard'){
      p.vx *= drag; p.vy *= drag;
      p.x  += p.vx * dt; p.y += p.vy * dt;
      if (p.k === 'shard'){ p.ang += p.av * dt; }
    }
    tieExplos[w++] = p;
  }
  tieExplos.length = w;
}

export function drawTieExplos(ctx){
  if (tieExplos.length === 0) return;

  ctx.save();

  // 1) Additive Dinge zuerst (flash, ring, sparks)
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';

  for (let i=0;i<tieExplos.length;i++){
    const p = tieExplos[i];
    const k = p.age / p.life;

    if (p.k === 'flash'){
      const a = 1 - k; // schnell aus
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0,   `rgba(255,255,255,${0.95*a})`);
      g.addColorStop(0.4, `rgba(180,240,255,${0.6*a})`);
      g.addColorStop(1,   `rgba(0,0,0,0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    }
    else if (p.k === 'ring'){
      const r = p.r0 + (p.r1 - p.r0) * k;
      const a = 1 - k;
      ctx.lineWidth = Math.max(1, r*0.06);
      ctx.strokeStyle = `rgba(255,255,255,${0.25*a})`;
      ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.stroke();
    }
    else if (p.k === 'spark'){
      const a = 1 - k;
      const rad = 2.0 * p.s * (0.6 + 0.8*(1-k));
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
      g.addColorStop(0,   `rgba(200,255,230,${0.9*a})`);
      g.addColorStop(0.35,`rgba(120,255,160,${0.6*a})`);
      g.addColorStop(1,   `rgba(0,0,0,0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x,p.y,rad,0,Math.PI*2); ctx.fill();
    }
  }

  ctx.globalCompositeOperation = 'source-over';

  // 2) Opaque Splitter (kleine Panels)
  for (let i=0;i<tieExplos.length;i++){
    const p = tieExplos[i];
    if (p.k !== 'shard') continue;
    const k = p.age / p.life;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.ang);
    // dunkles Panel-Material + dünner heller Rand
    ctx.fillStyle   = `rgba(28,32,40,${1 - k})`;
    ctx.strokeStyle = `rgba(120,140,180,${0.8 * (1-k)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(-p.w/2, -p.h/2, p.w, p.h);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  ctx.globalCompositeOperation = prev;
  ctx.restore();
}


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
  if (dead) spawnTieExplosion(dead);
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
    type: 'tie',                        // Typkennung

    // FX
    mf: 0,                              // muzzle flash Timer
    hitFx: 0,                           // hit flash Timer
    wobble: Math.random()*Math.PI*2,    // phasenversatz fürs pulsieren
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
  const a = t.angle + rand(-TIE_AIM_JITTER, TIE_AIM_JITTER);

  const muzzleR = (typeof TIE_MUZZLE_OFFSET === 'number' && Number.isFinite(TIE_MUZZLE_OFFSET))
    ? TIE_MUZZLE_OFFSET
    : t.r * 0.45;

  const sx = t.x + Math.cos(a) * muzzleR;
  const sy = t.y + Math.sin(a) * muzzleR;

  tieShots.push({
    x: sx, y: sy,
    vx: Math.cos(a) * TIE_BULLET_SPEED,
    vy: Math.sin(a) * TIE_BULLET_SPEED,
    r: TIE_BULLET_RADIUS,
    ttl: TIE_BULLET_LIFE,
    life: TIE_BULLET_LIFE
  });

  t.mf = 0.07; // Flash
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

      t.mf    = Math.max(0, t.mf - dt);
      t.hitFx = Math.max(0, t.hitFx - dt);
      t.wobble += dt * 5.0; // sanftes Pulsieren fürs Triebwerk

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
  const drawRot = num(TIE_DRAW_ROT, 0);

  for (const t of ties) {
    const r = num(t.r, 20);

    // ---------- Welt: Engine-Glow (unter dem TIE) ----------
    {
      const a = t.angle + drawRot;
      const ex = t.x + Math.cos(a) * (-r * 0.7);
      const ey = t.y + Math.sin(a) * (-r * 0.7);

      const pulse = 0.7 + 0.3 * Math.sin(t.wobble || 0);
      const alpha = 0.22 * pulse;
      const size  = Math.max(1, r * (0.9 + 0.3 * pulse));

      if (Number.isFinite(ex) && Number.isFinite(ey)) {
        ctx.save();
        const prev = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, size);
        g.addColorStop(0.00, `rgba(150,190,255,${alpha})`);
        g.addColorStop(0.35, `rgba(90,160,255,${alpha*0.8})`);
        g.addColorStop(1.00, `rgba(0,0,0,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ex, ey, size, 0, Math.PI*2);
        ctx.fill();
        ctx.globalCompositeOperation = prev;
        ctx.restore();
      }
    }

    // ---------- Lokal: Rumpf & Effekte ----------
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.angle + drawRot);

    // I-Frames
    if (t.ifr > 0) {
      const blink = (Math.floor(performance.now() * 0.02) % 2) === 0;
      ctx.globalAlpha = blink ? 0.35 : 1.0;
    } else {
      ctx.globalAlpha = 1.0;
    }

    // Panels (fill + stroke)
    {
      const pGrad = ctx.createRadialGradient(0,0, r*0.2, 0,0, r*1.4);
      pGrad.addColorStop(0,   'rgba(40,46,60,1)');
      pGrad.addColorStop(1.0, 'rgba(22,26,34,1)');
      ctx.fillStyle = pGrad;
      ctx.strokeStyle = TIE_STROKE;
      ctx.lineWidth = TIE_LINE_WIDTH;

      ctx.beginPath(); ctx.rect(-r * 1.2, -r * 0.9, r * 0.5, r * 1.8); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.rect( r * 0.7,  -r * 0.9, r * 0.5, r * 1.8); ctx.fill(); ctx.stroke();

      ctx.lineWidth = Math.max(1, TIE_LINE_WIDTH * 0.7);
      ctx.beginPath();
      ctx.moveTo(-r * 1.2, -r * 0.6); ctx.lineTo(-r * 0.7, -r * 0.4);
      ctx.moveTo(-r * 1.2,  r * 0.6); ctx.lineTo(-r * 0.7,  r * 0.4);
      ctx.moveTo( r * 1.2, -r * 0.6); ctx.lineTo( r * 0.7, -r * 0.4);
      ctx.moveTo( r * 1.2,  r * 0.6); ctx.lineTo( r * 0.7,  r * 0.4);
      ctx.stroke();
    }

    // Cockpit-Ring
    ctx.lineWidth = TIE_LINE_WIDTH;
    ctx.strokeStyle = TIE_STROKE;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2); ctx.stroke();

    // Speichen
    ctx.lineWidth = Math.max(1, TIE_LINE_WIDTH * 0.9);
    ctx.beginPath();
    for (let i=0;i<6;i++){
      const a = i * (Math.PI/3);
      ctx.moveTo(0,0);
      ctx.lineTo(Math.cos(a)*r*0.45, Math.sin(a)*r*0.45);
    }
    ctx.stroke();

    // ---------- Mündungs-Flash in Kugel (sicher geclippt) ----------
    if (t.mf > 0) {
      const k  = clamp(t.mf / 0.07, 0, 1);
      const R  = r * 0.45;
      const fx = R * 1.02, fy = 0;
      const sz = Math.max(1, r * (0.30 + 0.25*(1-k)));

      const prev = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'lighter';

      try {
        ctx.save();
        ctx.beginPath(); ctx.arc(0, 0, R * 1.02, 0, Math.PI*2); ctx.clip();

        const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, sz);
        g.addColorStop(0.00, 'rgba(255,255,255,0.95)');
        g.addColorStop(0.35, (typeof TIE_LASER_GLOW_1 !== 'undefined' ? TIE_LASER_GLOW_1 : 'rgba(140,255,140,0.9)'));
        g.addColorStop(1.00, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(fx, fy, sz, 0, Math.PI*2); ctx.fill();
      } finally {
        ctx.restore(); // Clip garantiert zurücknehmen
        ctx.globalCompositeOperation = prev;
      }
    }

    ctx.restore(); // lokal
  }
}


