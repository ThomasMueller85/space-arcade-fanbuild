// ufoShots.js
import { wrap, rand } from './utils.js';
import {
  UFO_SHOT_SPEED, UFO_SHOT_RADIUS, UFO_SHOT_LIFE,
  UFO_LASER_CORE, UFO_LASER_GLOW_1, UFO_LASER_GLOW_2, UFO_LASER_TINT,
  UFO_LASER_TAIL, UFO_LASER_HEAD, UFO_BLUR_PX, UFO_TRAIL_TAPS,
} from './config.js';

let shots = [];

export function getUfoShots(){ return shots; }
export function resetUfoShots(){ shots.length = 0; }

// vom UFO auf das Schiff feuern
export function fireUfoShot(ufo, ship){
  if (!ufo || !ship) return;

  const a  = Math.atan2(ship.y - ufo.y, ship.x - ufo.x);
  const ox = Math.cos(a) * (ufo.r - 2);   // Mündungsversatz leicht nach vorn
  const oy = Math.sin(a) * (ufo.r - 2);

  const baseLife = UFO_SHOT_LIFE;
  const baseLen  = Math.max(28, Math.min(96, UFO_SHOT_SPEED * 0.12));

  shots.push({
    x: ufo.x + ox,
    y: ufo.y + oy,
    vx: Math.cos(a) * UFO_SHOT_SPEED,
    vy: Math.sin(a) * UFO_SHOT_SPEED,
    r: UFO_SHOT_RADIUS,
    life: baseLife,      // verbleibend
    life0: baseLife,     // Referenz (für Ausfaden/Tail)
    len: baseLen,        // Basis-Länge
    w: UFO_SHOT_RADIUS * 1.15 // Basis-Breite
  });
}

export function updateUfoShots(dt, w, h){
  for (let i = shots.length - 1; i >= 0; i--){
    const s = shots[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;

    // Bildschirm-Rand-Logik (Wrap oder Offscreen killen – hier: Wrap)
    wrap(s, w, h);

    if (s.life <= 0) shots.splice(i, 1);
  }
}

export function drawUfoShots(ctx){
  if (!shots.length) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Motion-Blur (wenn unterstützt)
  const canFilter = typeof ctx.filter === 'string';
  if (canFilter) ctx.filter = `blur(${UFO_BLUR_PX}px)`;

  for (const s of shots){
    const ang = Math.atan2(s.vy, s.vx);
    const p   = Math.max(0, Math.min(1, s.life / (s.life0 || s.life)));

    const L  = s.len * UFO_LASER_TAIL * (0.85 + 0.5 * (1 - p)); // älter = länger
    const Hd = s.len * UFO_LASER_HEAD;
    const Wg = (s.w || s.r) * 3.2;   // Glow-Breite
    const Wc = (s.w || s.r) * 1.25;  // Core-Breite

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(ang);

    // Ghost-Trails (leichter Nachzieheffekt)
    const taps = Math.max(0, Math.floor(UFO_TRAIL_TAPS));
    for (let k = taps; k > 0; k--){
      const a = k / (taps + 1);
      const fade = 0.16 * a;
      ctx.globalAlpha = fade;
      ctx.lineCap = 'round';

      let gg = ctx.createLinearGradient(-L*(1+a*0.35), 0, Hd, 0);
      gg.addColorStop(0.00, 'rgba(0,0,0,0)');
      gg.addColorStop(0.15, UFO_LASER_GLOW_2);
      gg.addColorStop(0.70, UFO_LASER_GLOW_1);
      gg.addColorStop(1.00, '#ffffff');

      ctx.strokeStyle = gg;
      ctx.lineWidth   = Wg * (0.9 - 0.3*a);
      ctx.beginPath(); ctx.moveTo(-L*(1+a*0.35), 0); ctx.lineTo(Hd, 0); ctx.stroke();
    }

    // Haupt-Glow
    ctx.globalAlpha = 0.95;
    ctx.lineCap = 'round';
    let g = ctx.createLinearGradient(-L, 0, Hd, 0);
    g.addColorStop(0.00, 'rgba(0,0,0,0)');
    g.addColorStop(0.15, UFO_LASER_GLOW_2);
    g.addColorStop(0.70, UFO_LASER_GLOW_1);
    g.addColorStop(1.00, '#ffffff');
    ctx.strokeStyle = g;
    ctx.lineWidth   = Wg;
    ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(Hd, 0); ctx.stroke();

    // Core
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = UFO_LASER_CORE;
    ctx.lineWidth   = Wc;
    ctx.beginPath(); ctx.moveTo(-L*0.55, 0); ctx.lineTo(Hd, 0); ctx.stroke();

    // Spitze (glühend)
    const tip = ctx.createRadialGradient(0,0, Wc*0.12, 0,0, Wc*1.2);
    tip.addColorStop(0, '#ffffff');
    tip.addColorStop(0.4, UFO_LASER_GLOW_1);
    tip.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = tip;
    ctx.beginPath(); ctx.arc(0, 0, Wc*1.2, 0, Math.PI*2); ctx.fill();

    // feiner Schimmer
    ctx.globalAlpha = 0.26;
    ctx.lineWidth   = Math.max(1, Wc * 0.33);
    ctx.strokeStyle = UFO_LASER_TINT;
    ctx.beginPath(); ctx.moveTo(-L*0.25, 0); ctx.lineTo(Hd*0.9, 0); ctx.stroke();

    ctx.restore();
  }

  if (canFilter) ctx.filter = 'none';
  ctx.restore();
}
