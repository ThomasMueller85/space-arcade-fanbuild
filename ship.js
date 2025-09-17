import { TURN, THRUST, FRICTION, EXHAUST_MAX, EXHAUST_RATE, EXHAUST_LIFE, EXHAUST_SPREAD, EXHAUST_KICK,
  EXHAUST_DRAG, EXHAUST_SIZE } from './config.js';
import { wrap } from './utils.js';

function rand(a=0,b=1){ return a + Math.random()*(b-a); }
function clamp(x,a,b){ return Math.max(a, Math.min(b,x)); }

function emitExhaust(ship, dt){
  const thr = clamp(ship.thruster ?? 0, 0, 1);
  if (thr <= 0.01) return;

  // Emissionsmenge skaliert mit Schub + Geschwindigkeit
  const speed = Math.hypot(ship.vx, ship.vy);
  const rate  = EXHAUST_RATE * (0.6 + 0.4*thr) * (1 + 0.002*speed);
  ship.__exhaustEmitAcc = (ship.__exhaustEmitAcc || 0) + rate * dt;
  let n = Math.floor(ship.__exhaustEmitAcc);
  ship.__exhaustEmitAcc -= n;

  const cos = Math.cos(ship.angle), sin = Math.sin(ship.angle);
  // Emissionspunkt: breite blaue Leiste (leicht zufällig)
  while (n-- > 0){
    const u = rand(-1, 1); // verteilte Segmente über die Leiste
    const ex = ship.x - cos * (ship.radius * 0.70) + (-sin) * (ship.radius * 0.35 * u);
    const ey = ship.y - sin * (ship.radius * 0.70) + ( cos) * (ship.radius * 0.35 * u);

    // Start-Impuls nach hinten + kleine Fächerstreuung
    const spread = (Math.random() - 0.5) * EXHAUST_SPREAD;
    const dirX = -cos + (-sin)*spread, dirY = -sin + (cos)*spread;
    const len = Math.hypot(dirX, dirY) || 1;
    const kick = EXHAUST_KICK * (0.6 + 0.4*thr) * rand(0.7, 1.0);

    const p = {
      x: ex, y: ey,
      vx: (dirX/len) * kick + ship.vx*0.15,
      vy: (dirY/len) * kick + ship.vy*0.15,
      life: EXHAUST_LIFE * rand(0.85, 1.2),
      age: 0,
      s: ship.radius * EXHAUST_SIZE * rand(0.8, 1.2),  // Größe
      t: Math.random() < 0.25 ? 'diamond' : 'glow'     // 25% "Shock Diamond"
    };
    const arr = ship.__exhaust;
    if (arr.length < EXHAUST_MAX) arr.push(p);
    else { arr[(Math.random()*arr.length)|0] = p; } // günstiges Reuse
  }
}

function updateExhaust(ship, dt){
  const arr = ship.__exhaust;
  if (!arr || arr.length === 0) return;
  const drag = Math.pow(EXHAUST_DRAG, dt); // framerate-sicher
  let w = 0;
  for (let i=0; i<arr.length; i++){
    const p = arr[i];
    p.age += dt;
    if (p.age >= p.life) continue;
    p.vx *= drag; p.vy *= drag;
    p.x  += p.vx * dt;
    p.y  += p.vy * dt;
    arr[w++] = p;
  }
  arr.length = w; // remove dead
}

function drawExhaust(ctx, ship){
  const arr = ship.__exhaust;
  if (!arr || arr.length === 0) return;

  const prevComp = ctx.globalCompositeOperation;
  const prevA    = ctx.globalAlpha;
  ctx.globalCompositeOperation = 'lighter';

  for (let i=0; i<arr.length; i++){
    const p = arr[i];
    const k = clamp(p.age / p.life, 0, 1);
    const a = (1 - k) * (0.75);        // alpha fällt über Lebenszeit ab
    const r = p.s * (0.6 + 1.2*k);     // wächst leicht

    if (p.t === 'diamond'){
      // kleine Stoßdiamanten: kurzer Strich
      ctx.save();
      ctx.globalAlpha = a * 0.9;
      ctx.beginPath();
      // Richtung entlang der Bewegung
      const ang = Math.atan2(p.vy, p.vx);
      const len = r * 3.0;
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);
      ctx.moveTo(-len*0.4, 0);
      ctx.lineTo( len*0.6, 0);
      ctx.strokeStyle = 'rgba(170,210,255,0.9)';
      ctx.lineWidth = Math.max(1, r*0.35);
      ctx.stroke();
      ctx.restore();
    } else {
      // weicher Glow
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0.00, `rgba(200,235,255,${a})`);
      g.addColorStop(0.35, `rgba(120,190,255,${a*0.75})`);
      g.addColorStop(1.00, `rgba(0,0,0,0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI*2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = prevA;
  ctx.globalCompositeOperation = prevComp;
}

// Erstellt das Schiff mit Startwerten
export function createShip() {
  return {
    x: 0, y: 0,             // Position
    angle: -Math.PI / 2,    // Blickrichtung
    radius: 30,             // Kollisions-/Zeigeradius
    vx: 0, vy: 0,           // Geschwindigkeit
    cooldown: 0,            // Schuss Cooldown
    inv: 0,                 // unverwundbarkeit
    rocketAmmo: 0,          // Anzahl Racketen
    rocketCD: 0,            // Rocket Cooldown

    // FX:
    __exhaust: [],         // Partikelspeicher
    __exhaustEmitAcc: 0,   // Emissions-Akkumulator
    thruster: 0,           // zur sicherheit
  };
}

// Setzt das schiff in die Mitte und löscht Bewegung/Timer
export function resetShip(ship, w, h) {
  ship.x = w / 2;
  ship.y = h / 2;
  ship.vx = 0;
  ship.vy = 0;
  ship.angle = -Math.PI / 2;
  ship.cooldown = 0;
  ship.rocketCD = 0;
}

// Physik-/Steuerupdate pro Frame
export function updateShip(ship, dt, inputs, w, h, thrustMul = 1) {
  const TM = Number.isFinite(thrustMul) ? thrustMul : 1;

  ship.rocketAmmo ??= 0;
  ship.rocketCD   ??= 0;

  if (inputs.left)  ship.angle -= TURN * dt;
  if (inputs.right) ship.angle += TURN * dt;

  ship.thruster ??= 0;                            // 0..1
  const target = inputs.up ? 1 : 0;               // Taste ↑ gedrückt?
  const EASE   = 10;                              // Reaktionsgeschwindigkeit
  ship.thruster += (target - ship.thruster) * Math.min(1, dt * EASE);

  // Beschleunigung in Blickrichtung
  if (inputs.up) {
    ship.vx += Math.cos(ship.angle) * THRUST * TM * dt;
    ship.vy += Math.sin(ship.angle) * THRUST * TM * dt;
  }

  // Reibung (Bremsen)
  const damp = Math.max(0, 1 - FRICTION * dt);
  ship.vx *= damp;
  ship.vy *= damp;

  // Position integrieren
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;

  if(!Number.isFinite(ship.x) || !Number.isFinite(ship.y)) {
    ship.x = w/2; ship.y = h/2; ship.vx = 0; ship.vy = 0;
  }

  // Am Rand wrappen
  wrap(ship, w, h);

  // Timer runterzählen
  ship.cooldown = Math.max(0, ship.cooldown - dt);
  ship.inv      = Math.max(0, ship.inv - dt);
  ship.rocketCD = Math.max(0, ship.rocketCD - dt);

  // --- Exhaust FX ---
  emitExhaust(ship, dt);
  updateExhaust(ship, dt);
}

// Zeichnet das Schiff als stilisierten Millennium-Falken
export function drawShip(ctx, s) {
  ctx.save();
  drawExhaust(ctx, s);
  ctx.translate(s.x, s.y);
  ctx.rotate(s.angle);


  const r = s.radius;           // Kollision bleibt Kreisradius
  const lineW = 2;

  // Unverwundbarkeits-Blinken
  ctx.lineWidth = lineW;
  if (s.inv > 0) {
    const blink = (Math.floor(s.inv * 10) % 2) === 0;
    ctx.globalAlpha = blink ? 0.35 : 1.0;
    ctx.strokeStyle = '#a9c1ff';
  } else {
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = '#eaeef7';
  }

  // -------- Hauptscheibe (Saucer) --------
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.98 * r, 0.90 * r, 0, 0, Math.PI * 2);
  ctx.stroke();

  // -------- Mandibeln + Mittelspalt (Front) --------
  // obere Mandibel (leicht spitz)
  ctx.beginPath();
  ctx.moveTo( 0.16 * r, -0.30 * r);
  ctx.lineTo( 0.98 * r, -0.18 * r);
  ctx.lineTo( 0.98 * r, -0.06 * r);
  ctx.lineTo( 0.16 * r, -0.10 * r);
  ctx.closePath();
  ctx.stroke();

  // untere Mandibel
  ctx.beginPath();
  ctx.moveTo( 0.16 * r,  0.10 * r);
  ctx.lineTo( 0.98 * r,  0.06 * r);
  ctx.lineTo( 0.98 * r,  0.18 * r);
  ctx.lineTo( 0.16 * r,  0.30 * r);
  ctx.closePath();
  ctx.stroke();

  // Mittelspalt-Linien (zwischen den Mandibeln)
  ctx.beginPath();
  ctx.moveTo(0.18 * r, -0.11 * r); ctx.lineTo(0.98 * r, -0.05 * r);
  ctx.moveTo(0.18 * r,  0.11 * r); ctx.lineTo(0.98 * r,  0.05 * r);
  ctx.stroke();

  // -------- Seitliches Cockpit + Korridor (Starboard) --------
  // Korridor (viereckig/leicht schräg)
  ctx.beginPath();
  ctx.moveTo(0.10 * r, 0.32 * r);
  ctx.lineTo(0.52 * r, 0.46 * r);
  ctx.lineTo(0.52 * r, 0.60 * r);
  ctx.lineTo(0.10 * r, 0.46 * r);
  ctx.closePath();
  ctx.stroke();

  // Cockpit (elliptische Kanzel am Ende)
  ctx.beginPath();
  ctx.ellipse(0.78 * r, 0.53 * r, 0.28 * r, 0.14 * r, -0.18, 0, Math.PI * 2);
  ctx.stroke();

  // Fensterstreben (Cockpit)
  ctx.beginPath();
  ctx.moveTo(0.62 * r, 0.485 * r); ctx.lineTo(0.94 * r, 0.58 * r);
  ctx.moveTo(0.62 * r, 0.575 * r); ctx.lineTo(0.94 * r, 0.48 * r);
  ctx.moveTo(0.70 * r, 0.53 * r);  ctx.lineTo(0.90 * r, 0.53 * r);
  ctx.stroke();

  // -------- Zentraler Turmring (Top/Bottom zusammengefasst) --------
  ctx.beginPath();
  ctx.arc(0, 0, 0.26 * r, 0, Math.PI * 2);
  ctx.stroke();

  // Vierfach-Geschütz (Kreuz)
  ctx.beginPath();
  ctx.moveTo(-0.18 * r, 0); ctx.lineTo(0.18 * r, 0);
  ctx.moveTo(0, -0.18 * r); ctx.lineTo(0, 0.18 * r);
  ctx.stroke();

  // -------- Sensor-Schüssel (oben-vorne rechts) --------
  ctx.beginPath();
  ctx.moveTo(0.22 * r, -0.36 * r); ctx.lineTo(0.36 * r, -0.46 * r); // Mast
  ctx.arc(0.46 * r, -0.52 * r, 0.10 * r, 0, Math.PI * 2);           // Dish
  ctx.stroke();

  // -------- Docking-Ringe links/rechts --------
  ctx.beginPath();
  ctx.arc(-0.06 * r, -0.80 * r, 0.18 * r, 0, Math.PI * 2);
  ctx.arc(-0.06 * r,  0.80 * r, 0.18 * r, 0, Math.PI * 2);
  ctx.stroke();

  // -------- Plating / Paneel-Linien (dezent) --------
  ctx.beginPath();
  // Radial-Linien
  ctx.moveTo(-0.65 * r, -0.55 * r); ctx.lineTo(0.32 * r, -0.34 * r);
  ctx.moveTo(-0.72 * r,  0.00 * r); ctx.lineTo(0.30 * r,  0.00 * r);
  ctx.moveTo(-0.65 * r,  0.55 * r); ctx.lineTo(0.32 * r,  0.34 * r);
  // Kreis-/Bogen-Segmente auf der Scheibe
  ctx.arc(0, 0, 0.62 * r, -2.4, 2.4);
  ctx.arc(0, 0, 0.78 * r, -2.5, 2.5);
  ctx.stroke();

  // -------- Breite blaue Heckdüse (Engine Bar) --------
  const t = performance.now() * 0.001;
  const base = 0.35 + 0.60 * (s.thruster ?? 0); // 0..1 → intensiver
  const wobble = 0.12 * Math.sin(t * 7.0);
  const glowAlpha = Math.max(0, Math.min(1, base + wobble));

  const prevOp = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';

  // Segmentierte Leiste: 7 leichte Überlappungs-Glows
  const segs = 7;
  for (let i = 0; i < segs; i++) {
    const u = (i / (segs - 1)) * 2 - 1;            // -1 .. +1
    const ex = -0.64 * r;                          // nach hinten
    const ey = u * 0.55 * r * 0.55;                // über die Breite verteilt
    const gr = ctx.createRadialGradient(ex, ey, 0, ex, ey, 0.32 * r);
    gr.addColorStop(0.00, `rgba(180,220,255,${0.85 * glowAlpha})`);
    gr.addColorStop(0.45, `rgba(120,180,255,${0.55 * glowAlpha})`);
    gr.addColorStop(1.00, `rgba(0,0,0,0)`);
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.ellipse(ex, ey, 0.28 * r, 0.12 * r, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = prevOp;
  ctx.restore();
}
