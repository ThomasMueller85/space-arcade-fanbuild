import {
  TAU,
  PUP_DROP_CHANCE, PUP_MAX_ON_FIELD, PUP_TTL, PUP_RAPID_FACTOR, PUP_RAPID_DURATION, PUP_SHIELD_DURATION,
  PUP_WEIGHTS, PUP_SLOWMO_DURATION, PUP_SLOWMO_FACTOR, PUP_MULTI2_DURATION, PUP_MULTI3_DURATION, MULTI_SPREAD_DEG, PUP_MULTI_CD_FACTOR
} from './config.js';
import { rand, dist2, wrap } from './utils.js';
import { setAudioTimeScale } from './audio.js'

// Aktive Pickups auf dem Feld 
const pickups = []; 
// Restzeit des Rapid-Fire Effekts
let rapidTime = 0;  
// Zeit für den Slowmo Effekt
let slowmoTime = 0;

let multiTime  = 0; // Restzeit
let multiLevel = 1; // 1=normal, 2=double, 3=triple

// Setzt alle Powerups/Effekte zurück
export function resetPowerups() {
  pickups.length = 0;
  rapidTime = 0;
  slowmoTime = 0;
  multiTime = 0;
  multiLevel = 1;
}

// Typgewichtung aus config wählen

function chooseType(){
  const w = PUP_WEIGHTS;
  const sum = (w.rapid + w.shield + w.oneup + (w.rocket||0) + (w.slowmo||0) + (w.multi2||0) + (w.multi3||0)) || 1;
  let r = Math.random() * sum;
  if ((r -= w.rapid)  < 0) return 'rapid';
  if ((r -= w.shield) < 0) return 'shield';
  if ((r -= w.oneup)  < 0) return 'oneup';
  if ((r -= (w.rocket||0)) < 0) return 'rocket';
  if ((r -= (w.slowmo||0)) < 0) return 'slowmo';
  if ((r -= (w.multi2||0)) < 0) return 'multi2';
  return 'multi3';
}

// Chance basiert Pickup aus einem zerstörten Asteroiden droppen
// limitiert Gesamtzahl auf dem Feld
// initiale Flugrichtung/Speed zufällig 
export function maybeDropFromAsteroid(ast) {
  if (!ast) return;
  if (pickups.length >= PUP_MAX_ON_FIELD) return;
  if (Math.random() > PUP_DROP_CHANCE) return;

  const type = chooseType();
  const speed = rand(30, 70);
  const ang = rand(0, TAU);

  pickups.push({
    x: ast.x, y: ast.y,
    vx: Math.cos(ang) * speed,
    vy: Math.sin(ang) * speed,
    r: 10,                      // Basisradius fürs Zeichnen/Kollision
    ttl: PUP_TTL,               // Lebenszeit (Sekunden)
    type,                       // "rapid" | "shield" | "oneup"
    spin: rand(-1, 1)           // leichte Eigenrotation fürs Zeichnen
  });
}

// Bewegung/Verfall von Pickups & Ablauf von RapidFire
// dt in Sekunden 
// w/h Spielfeldgröße fürs wrap 
export function updatePowerups(dt, w, h) {
  // RapidFire Timer runterzählen
   if (rapidTime  > 0) rapidTime  = Math.max(0, rapidTime  - dt);

  const slowWas = slowmoTime > 0;
  if (slowmoTime > 0) slowmoTime = Math.max(0, slowmoTime - dt);
  if (slowWas && slowmoTime === 0) setAudioTimeScale(1, 200);

  const mWas = multiTime > 0;
  if (multiTime > 0) multiTime = Math.max(0, multiTime - dt);
  if (mWas && multiTime === 0) multiLevel = 1;

  // Pickups bewegen/ablaufen
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.995; // leichtes Ausrollen sanft
    p.vy *= 0.995; 
    wrap(p, w, h); // Bildschirmrand überqueren
    p.ttl -= dt;
    if (p.ttl <= 0) pickups.splice(i, 1);
  }
}

// Zeichnet alle Powerups mit einfachem Icon Stil
// Rapid : stilisierter Blitz
// shild : Doppelring
// oneup : kleines Schiff
// Blinkt kurz vor ablauf
export function drawPowerups(ctx) {
  for (const p of pickups) {
    // Blinken, wenn kurz vor Ablauf
    const nearEnd = p.ttl < 2.2 ? (Math.floor(p.ttl * 10) % 2 === 0) : false;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.spin * (PUP_TTL - p.ttl)); // bisschen Bewegung

    // leichtes Pulsieren
    const pulse = 1 + 0.08 * Math.sin((PUP_TTL - p.ttl) * 6);
    const r = p.r * pulse;

    if (nearEnd) ctx.globalAlpha = 0.5;

    ctx.lineWidth = 2;

    if (p.type === 'rapid') {
      // ⚡ Blitz (vereinfacht)
      ctx.strokeStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(-r*0.4, -r*0.2);
      ctx.lineTo( 0,      -r);
      ctx.lineTo( r*0.25, -r*0.15);
      ctx.lineTo(-r*0.05, r*0.2);
      ctx.lineTo( r*0.2,   r);
      ctx.lineTo(-r*0.25,  r*0.15);
      ctx.closePath();
      ctx.stroke();
    } else if (p.type === 'shield') {
      // Doppelring
      ctx.strokeStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r*0.55, 0, TAU);
      ctx.stroke();
    } else if (p.type === 'slowmo') {
      // Uhr mit Zeigern + sanfter Glow
      const prev = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'lighter';
      const glowR = r * 1.3;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
      g.addColorStop(0.0, 'rgba(180,180,255,0.45)');
      g.addColorStop(1.0, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0,0,glowR,0,TAU); ctx.fill();
      ctx.globalCompositeOperation = prev;

      ctx.strokeStyle = '#a78bfa'; // lila
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0,0,r,0,TAU); ctx.stroke();     // Außenkreis
      ctx.beginPath(); ctx.arc(0,0,r*0.65,0,TAU); ctx.stroke(); // Innenkreis

      // Zeiger (laufen leicht)
      const t = (PUP_TTL - p.ttl);
      const aMin = t * 1.6, aHour = t * 0.25;
      ctx.beginPath(); ctx.moveTo(0,0);
      ctx.lineTo(Math.cos(aHour)*r*0.45, Math.sin(aHour)*r*0.45); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,0);
      ctx.lineTo(Math.cos(aMin)*r*0.75,  Math.sin(aMin)*r*0.75);  ctx.stroke();
      } else if (p.type === 'multi2' || p.type === 'multi3') {
       // Drei parallele „Kugeln“ (für multi2 zwei, für multi3 drei)
      const n = (p.type === 'multi2') ? 2 : 3;
      ctx.strokeStyle = '#f43f5e'; // rot-pink
      ctx.lineWidth = 2;
      const gap = r * 0.7;
      const start = -((n-1)/2) * gap;
      for (let k = 0; k < n; k++){
        const x = start + k*gap;
        ctx.beginPath();
        ctx.arc(x, 0, r*0.22, 0, TAU);
        ctx.stroke(); }
    } else if (p.type === 'rocket') {
      // --- Volumen + waberndes Blau-Glow ---
      const t = (PUP_TTL - p.ttl);
      const wobble = 1 + 0.20 * Math.sin(t * 6.0);

      // Additiver Glow hinter der Rakete
      const prev = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'lighter';
      const glowR = r * 1.35 * wobble;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
      g.addColorStop(0.00, 'rgba(140,200,255,0.55)');
      g.addColorStop(0.60, 'rgba(80,150,255,0.35)');
      g.addColorStop(1.00, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, glowR, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = prev;

      // Körper (gefüllt) + leichte Metall-Shader
      ctx.lineWidth = 2;
      const lg = ctx.createLinearGradient(-r, 0, r, 0);
      lg.addColorStop(0.00, '#0f172a'); // dunkel
      lg.addColorStop(0.50, '#334155'); // mittel
      lg.addColorStop(1.00, '#0f172a'); // dunkel
      ctx.fillStyle = lg;
      ctx.strokeStyle = '#e2e8f0';

      ctx.beginPath();
      // Nase → Rücken → Heck: "dicker" Querschnitt
      ctx.moveTo( 0.95 * r,  0);
      ctx.lineTo( 0.20 * r,  0.36 * r);
      ctx.lineTo(-0.58 * r,  0.30 * r);
      ctx.lineTo(-0.58 * r, -0.30 * r);
      ctx.lineTo( 0.20 * r, -0.36 * r);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Finnen (hellblau)
      ctx.strokeStyle = '#93c5fd';
      ctx.beginPath();
      ctx.moveTo(-0.30 * r, -0.55 * r);
      ctx.lineTo(-0.05 * r,  0);
      ctx.lineTo(-0.65 * r, -0.16 * r);
      ctx.moveTo(-0.30 * r,  0.55 * r);
      ctx.lineTo(-0.05 * r,  0);
      ctx.lineTo(-0.65 * r,  0.16 * r);
      ctx.stroke();

      // kleine Spitz-Highlight
      ctx.strokeStyle = 'rgba(230,243,255,0.85)';
      ctx.beginPath();
      ctx.moveTo(0.55 * r, -0.10 * r);
      ctx.lineTo(0.85 * r,  0.00 * r);
      ctx.stroke();
    } else {
      // oneup: kleines Schiff
      ctx.strokeStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(-r*0.8,  r*0.6);
      ctx.lineTo(-r*0.55, 0);
      ctx.lineTo(-r*0.8, -r*0.6);
      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();
  }
}

// zum sammeln der Powerups
export function handlePickupCollision(ship){
  for (let i = pickups.length - 1; i >= 0; i--){
    const p = pickups[i];
    const r2 = (p.r + ship.radius) ** 2;
    if (dist2(p, ship) < r2){
      pickups.splice(i, 1);
      if (p.type === 'rapid')   rapidTime  = PUP_RAPID_DURATION;
      if (p.type === 'slowmo') { slowmoTime = PUP_SLOWMO_DURATION; setAudioTimeScale(PUP_SLOWMO_FACTOR); }
      if (p.type === 'multi2') { 
        // wenn schon x3 aktiv, nur Zeit verlängern
        if (multiLevel < 3) multiLevel = 2;
        multiTime = Math.max(multiTime, PUP_MULTI2_DURATION);
      }
      if (p.type === 'multi3') { 
        multiLevel = 3; 
        multiTime = Math.max(multiTime, PUP_MULTI3_DURATION);
      }
      return { type: p.type };
    }
  }
  return null;
}

// Liefert den aktiven Cooldown (Rapid verkürzt)
export function fireCooldown(base) {
  const rapidMul = (rapidTime > 0) ? PUP_RAPID_FACTOR : 1;
  const multiMul = PUP_MULTI_CD_FACTOR[multiLevel] || 1;
  return base * rapidMul * multiMul * getTimeScale();
}

// Für HUD 
export function getRapidRemaining() { 
    return Math.max(0, rapidTime);
}
export function getShieldDuration() { 
    return PUP_SHIELD_DURATION; 
} // Konstante nach außen

export function getTimeScale() {
  return (slowmoTime > 0) ? PUP_SLOWMO_FACTOR : 1;
}

export function getSlowmoRemaining() {
  return Math.max(0, slowmoTime);
}

export const getMultiLevel = () => multiLevel;

// Liefert Winkel-Offsets für Multishot in Radiant
export function getShotOffsetsRad(){
  if (multiLevel <= 1) return [0];
  const deg = MULTI_SPREAD_DEG[multiLevel] || 12;
  const spread = deg * Math.PI / 180;
  if (multiLevel === 2) return [-spread/2, +spread/2];
  // 3
  return [-spread, 0, +spread];
}