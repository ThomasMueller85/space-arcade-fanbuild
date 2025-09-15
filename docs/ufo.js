import { TAU, BOSS_EVERY, UFO_RADIUS, UFO_MAX_SPEED, UFO_ACCEL, UFO_HP_BASE, UFO_HP_PER_TIER, UFO_SAFE_DIST, UFO_IFRAME,
  UFO_FIRE_LEVEL_MIN, UFO_FIRE_COOLDOWN, UFO_FORMATION_ENABLED, UFO_FORMATION_TURN_RATE, UFO_FORMATION_COHESION
} from './config.js';
import { rand, wrap } from './utils.js';
import { fireUfoShot } from './ufoShots.js';
import { getUfoFormationTarget } from './ufoFormation.js';
import { angleTo, turnTowards }   from './steering.js';

export function expectedBossHP(level){
  const tier = Math.floor((level - 1) / BOSS_EVERY);
  return UFO_HP_BASE + tier * UFO_HP_PER_TIER;
}

// mehrere UFOs
let ufos = []; // [{x,y,vx,vy,r,hp,t,inv,cd,canShoot},...]

export function resetUfo(){ ufos = []; }
export function isUfoActive(){ return ufos.length > 0; }
export function getUfos(){ return ufos; }
export function getUfo(){ return ufos[0] || null; }

// einzelne UFO-Instanz erzeugen
function makeUfo(level, w, h, ship){
  // Spawn am Rand, Mindestabstand zum Schiff
  let x=0, y=0;
  const side = Math.floor(rand(0,4));
  if (side === 0){ x = 0;   y = rand(0,h); }
  if (side === 1){ x = w;   y = rand(0,h); }
  if (side === 2){ x = rand(0,w); y = 0;   }
  if (side === 3){ x = rand(0,w); y = h;   }

  if (ship){
    const dx = x - ship.x, dy = y - ship.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < UFO_SAFE_DIST){
      x = ship.x + (dx/d) * UFO_SAFE_DIST;
      y = ship.y + (dy/d) * UFO_SAFE_DIST;
    }
  }

  return {
    x, y,
    vx: 0, vy: 0,
    r: UFO_RADIUS,
    hp: expectedBossHP(level),
    t: 0,
    inv: 0,
    cd: rand(0.2, UFO_FIRE_COOLDOWN),
    canShoot: level >= UFO_FIRE_LEVEL_MIN
  };
}

// NEU: kann count>1 (Default 1)
export function spawnUfo(level, w, h, ship, count = 1){
  for (let i = 0; i < count; i++){
    ufos.push(makeUfo(level, w, h, ship));
  }
}

export function updateUfo(dt, w, h, ship){
  if (!ufos.length || !ship) return;

  for (let i = 0; i < ufos.length; i++){
    const ufo = ufos[i];

    ufo.t  += dt;
    ufo.inv = Math.max(0, ufo.inv - dt);
    ufo.cd  = Math.max(0, (ufo.cd ?? 0) - dt);

    const target = getUfoFormationTarget(i, ufos, ship);

    if (UFO_FORMATION_ENABLED && target) {
      // --- Formation-Seek (wie bei den TIEs, aber UFO-bezogen) ---
      const dx = target.x - ufo.x;
      const dy = target.y - ufo.y;

      const desiredAngle = angleTo(dx, dy);
      // aktuelle Flugrichtung aus der Velocity ableiten
      const curHeading = (ufo.vx || ufo.vy) ? Math.atan2(ufo.vy, ufo.vx) : desiredAngle;

      // sanft Richtung Slot drehen
      const newHeading = turnTowards(curHeading, desiredAngle, UFO_FORMATION_TURN_RATE, dt);

      const dist = Math.hypot(dx, dy) || 1;
      // „Pull“ in den Slot (dämpfen, damit es nicht zappelt)
      const pull = Math.min(1, (UFO_FORMATION_COHESION * dist) / 60);

      const speed = UFO_MAX_SPEED * 0.92; // leicht unter MaxSpeed, fühlt sich smoother an
      ufo.vx = Math.cos(newHeading) * speed * pull;
      ufo.vy = Math.sin(newHeading) * speed * pull;

    } else {
      // --- Fallback: dein bisheriges Wobble-Chase ---
      const dx = ship.x - ufo.x;
      const dy = ship.y - ufo.y;
      const baseAng = Math.atan2(dy, dx);
      const wobble  = Math.sin(ufo.t * 2.1) * 0.12;
      const ang     = baseAng + wobble;

      ufo.vx += Math.cos(ang) * UFO_ACCEL * dt;
      ufo.vy += Math.sin(ang) * UFO_ACCEL * dt;

      const sp = Math.hypot(ufo.vx, ufo.vy);
      if (sp > UFO_MAX_SPEED){
        const k = UFO_MAX_SPEED / sp;
        ufo.vx *= k; ufo.vy *= k;
      }
    }

    // Bewegung + Wrap
    ufo.x += ufo.vx * dt;
    ufo.y += ufo.vy * dt;
    wrap(ufo, w, h);

    // Feuern wie gehabt
    if (ufo.canShoot && ufo.cd === 0){
      fireUfoShot(ufo, ship);
      ufo.cd = UFO_FIRE_COOLDOWN + rand(0.85, 1.25);
    }
  }
}


export function drawUfo(ctx){
  for (const ufo of ufos){
    ctx.save();
    ctx.translate(ufo.x, ufo.y);

    if (ufo.inv > 0) {
      const blink = (Math.floor(ufo.t * 12) % 2) === 0;
      ctx.globalAlpha = blink ? 0.35 : 1.0;
    } else {
      ctx.globalAlpha = 1.0;
    }

    ctx.lineWidth = 2;

    // Teller
    ctx.beginPath();
    ctx.ellipse(0, 0, ufo.r, ufo.r*0.6, 0, 0, TAU);
    ctx.strokeStyle = '#e5e7eb';
    ctx.stroke();

    // Kuppel
    ctx.beginPath();
    ctx.ellipse(0, -ufo.r*0.25, ufo.r*0.55, ufo.r*0.38, 0, 0, TAU);
    ctx.strokeStyle = '#a9c1ff';
    ctx.stroke();

    // Lichter
    const dots = 6;
    for (let i = 0; i < dots; i++){
      const a = (i/dots) * TAU + ufo.t * 1.2;
      const rx = Math.cos(a) * (ufo.r*0.78);
      const ry = Math.sin(a) * (ufo.r*0.45);
      ctx.beginPath();
      ctx.arc(rx, ry, 2.1, 0, TAU);
      ctx.fillStyle = '#22d3ee';
      ctx.globalAlpha = 0.7 + 0.3*Math.sin(ufo.t*3 + i);
      ctx.fill();
    }

    ctx.restore();
  }
}

// gezielt ein UFO schädigen
export function damageUfo(target, dmg = 1){
  if (!target) return false;
  if (target.inv > 0) return false;

  target.hp -= dmg;
  if (target.hp <= 0){
    const idx = ufos.indexOf(target);
    if (idx !== -1) ufos.splice(idx, 1);
    return target; // dead-Objekt zurück für Drops/Score
  }
  target.inv = UFO_IFRAME;
  return false;
}
