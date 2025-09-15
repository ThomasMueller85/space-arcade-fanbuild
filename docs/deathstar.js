import { sfx } from "./audio.js";
import { dist2 } from "./utils.js";
import { SIZE, HP_MAX, WEAK_R, DWELL_TIME, WARP_DELAY, FIRE_INTERVAL, SHOT_SPEED, SHOT_R, CANNONS, SPAWN_FADE_TIME, CHARGE_TIME , FIRE_BURST_TIME, 
    BOSS_LASER_CORE, BOSS_LASER_GLOW_1, BOSS_LASER_GLOW_2, BOSS_LASER_TAIL, BOSS_LASER_HEAD, BOSS_LASER_TINT, BOSS_BLUR_PX, BOSS_TRAIL_TAPS, BOSS_LASER__BASE_LIFE
 } from "./config.js";

let boss = null;               // aktueller Deathstar-Boss (oder null, wenn keiner aktiv)
const shots = [];              // Boss-Projektile (Laser etc.)
let carryHP = null;            // gemerkte HP für „mitnehmen“ über Respawns/Warps

function randomSide() {
    return Math.floor(Math.random() * 4); // zufällige Seite 0..3 (oben/rechts/unten/links)
}

export function isDeathstarActive() {
    return !!boss;             // true, wenn ein Boss-Objekt existiert
}

export function getDeathstar() {
    return boss;               // Boss-Objekt nach außen geben (z. B. fürs Zeichnen/Kollision)
}

export function getDeathstarShots() {
    return shots;              // Array mit Boss-Schüssen (zum Updaten/Zeichnen)
}

export function resetDeathstar() {
    boss = null;               // Boss komplett weg
    carryHP = null;            // keine HP übernehmen
    shots.length = 0;          // alle aktiven Schüsse löschen
}

function warpToNewSide(W, H) {
  const side = randomSide();   // neue Bildschirmkante wählen
  const r = boss.r;            // Radius des Deathstars (halber Durchmesser)

  // Mittelpunkt direkt auf die Kante setzen → genau „halb im Bild“
  if (side === 0) { boss.x = W/2; boss.y = 0; }     // oben (Mitte)
  if (side === 1) { boss.x = W;   boss.y = H/2; }   // rechts (Mitte)
  if (side === 2) { boss.x = W/2; boss.y = H; }     // unten (Mitte)
  if (side === 3) { boss.x = 0;   boss.y = H/2; }   // links (Mitte)
  boss.side = side;                                 // Seite merken

  // Weakspot (Schwachstelle) neu in Richtung Spielfeldmitte setzen
  const dx = (W/2 - boss.x), dy = (H/2 - boss.y);   // Vektor Richtung Zentrum
  const len = Math.hypot(dx, dy) || 1;              // Länge (Guard gegen 0)
  boss.weak.x = boss.x + (dx/len) * (r - 24);       // Punkt auf der Kugeloberfläche (innen etwas versetzt)
  boss.weak.y = boss.y + (dy/len) * (r - 24);


  // Sichtbar & Phase zurücksetzen
  boss.visible = true;
  boss.phase = "spawn";                             // Startphase
  boss.t = 0; boss.fireT = 0; boss.fireDur = 0;     // alle Timer auf 0
}

export function spawnDeathstar(level, W, H) {
    const side = randomSide();
    const r = SIZE * 0.5;

    // Center genau auf die Kante setzen => exakt die Hälfte sichtbar
    let x = 0, y = 0;
    if (side === 0) { x = W / 2; y = 0; }      // oben
    if (side === 1) { x = W;     y = H / 2; }  // rechts
    if (side === 2) { x = W / 2; y = H; }      // unten
    if (side === 3) { x = 0;     y = H / 2; }  // links

    // Schwachstelle Richtung Spielfeldmitte (liegt sichtbar)
    const dx = (W/2 - x);
    const dy = (H/2 - y);
    const len = Math.hypot(dx, dy) || 1;
    const wx = x + (dx/len) * (r - 24);
    const wy = y + (dy/len) * (r - 24);

    boss = {
        x, y, r,
        hp: carryHP ?? HP_MAX,

        // --- Phasen/Timer ---
        phase: "spawn",      // "spawn" -> "charge" -> "fire" -> (unsichtbar, warp)
        t: 0,                // allgemeiner Phasen-Timer
        fireT: 0,            // Intervalltimer fürs Schießen
        fireDur: 0,          // Dauer der Feuerphase
        warpT: 0,            // Countdown beim Warpen (unsichtbar)
        dwell: DWELL_TIME,   // (wird nicht mehr für Feuerlogik benutzt, darf bleiben)
        side,
        weak: { x: wx, y: wy, r: WEAK_R },
        visible: true,

        // Optik
        rot: 0,                     // aktuelle Drehung
        rotSpeed: 0.08,             // Drehgeschwindigkeit
        seed: (Math.random()*1e9)|0 // Zufalls-Seed für Effekte/Noise
    };
}
shots.length = 0;                   // sicherheitshalber Schussliste leeren 

export function damageDeathstar(amount){
  if (!boss) return false;          // kein Boss aktiv? dann nix zu tun

  boss.hp -= amount;                // Schaden abziehen
  console.log(amount);              // Debug: wie viel Schaden kam rein
  console.log(boss.hp);             // Debug: verbleibende HP

  if (boss.hp <= 0) {               // Boss down?
    // Boss tot
    sfx.explosion();                // Explosions-Sound abfeuern
    return true;                    // true zurück → „ist gestorben“
  }
  return false;                     // sonst: lebt noch
}

export function updateDeathstar(dt, W, H, ship){
  if (!boss) return;                // ohne Boss nichts updaten
  
  // Schüsse updaten (LEBENSDAUER & POSITION)
  for (let i = shots.length - 1; i >= 0; i--) {   // rückwärts, damit splice sicher ist
    const s = shots[i];
    s.x += s.vx * dt;                             // Bewegung X
    s.y += s.vy * dt;                             // Bewegung Y
    s.life -= dt;                                 // Lebenszeit runterzählen
    // rausfliegen/abgelaufen? dann weg
    if (s.life <= 0 || s.x < -50 || s.y < -50 || s.x > W + 50 || s.y > H + 50) {
      shots.splice(i, 1);
    }
  }


    // Warpfase (unsichtbar): Countdown läuft, dann an neue Seite „warpen“
  if (!boss.visible) {
    boss.warpT -= dt;                             // Warp-Timer runter
    if (boss.warpT <= 0) warpToNewSide(W, H);     // fertig? → neue Seite spawnen
    return;                                       // solange unsichtbar: Rest skippen
  }


  // optische Rotation
  boss.rot += boss.rotSpeed * dt;

  // --- PHASEN ---
  boss.t += dt;                           // phasen zeit hochzählen

    if (boss.phase === "spawn") {
    // Einblenden → danach „charge“
    if (boss.t >= SPAWN_FADE_TIME) {              // Fade-in fertig?
      boss.phase = "charge";                      // nächste Phase
      boss.t = 0;                                 // Phasen-Timer resetten
      boss.fireT = 0;                             // Schussintervall-Reset
      boss.fireDur = 0;                           // Schießdauer-Reset
      // (Optional) sfx für "aufladen" starten
      // sfx.bossCharge?.();
    }
    return;                                       // während spawn: kein Feuern
  }

  if (boss.phase === "charge") {
    // nur aufladen (Optik/Sound), noch keine Schüsse
    if (boss.t >= CHARGE_TIME) {                  // aufgeladen?
      boss.phase = "fire";                        // ab in die Feuerphase
      boss.t = 0;
      boss.fireT = 0;
      boss.fireDur = 0;
    }
    return;                                       // bis dahin: nicht schießen
  }

  if (boss.phase === "fire") {
    boss.fireT  += dt;                            // Zeit seit letztem Schuss
    boss.fireDur += dt;                           // Gesamtdauer der Feuerphase


    // Schüsse nur in dieser Phase, mit festem „Burst“-Takt
    if (boss.fireT >= FIRE_INTERVAL) {
      boss.fireT = 0;                             // Intervall zurücksetzen

      // Grundrichtung zum Bildzentrum (Kanonenbogen orientiert sich daran)
      const angToMid = Math.atan2((H/2 - boss.y), (W/2 - boss.x));
      const spread = Math.PI * 0.65;              // Bogenbreite für Mehrfach-Kanonen

      for (let i = 0; i < CANNONS; i++) {
        // Winkel pro Kanone gleichmäßig über den Bogen verteilen
        const a  = angToMid - spread/2 + (spread * (i / (CANNONS - 1)));
        // Mündungspunkt auf dem Rand der Kugel (leicht innen)
        const sx = boss.x + Math.cos(a) * (boss.r - 8);
        const sy = boss.y + Math.sin(a) * (boss.r - 8);

        // tatsächliches Ziel auf das Schiff ausrichten + leichte Streuung
        const aim = Math.atan2(ship.y - sy, ship.x - sx) + (Math.random()*0.18 - 0.09);

        shots.push({
        x: sx, y: sy,
        vx: Math.cos(aim) * SHOT_SPEED,
        vy: Math.sin(aim) * SHOT_SPEED,
        r: SHOT_R,
        life: BOSS_LASER__BASE_LIFE,           // verbleibend
        life0: BOSS_LASER__BASE_LIFE,          // konstant zum Normieren
        len: Math.max(36, Math.min(110, SHOT_SPEED * 0.14)), // Länge
        w: SHOT_R * 1.15                                     // Breite
        });
      }
    }


    // Ende der Feuerphase → sofort verschwinden & Warp vorbereiten
    if (boss.fireDur >= FIRE_BURST_TIME) {
        carryHP = boss.hp;                         // aktuelle HP mitnehmen
        boss.phase = "spawn";                      // nächste Seite startet wieder bei „spawn“
        boss.visible = false;                      // ausblenden
        boss.warpT = WARP_DELAY;                   // unsichtbarer Warp-Countdown
        // Schüsse fliegen weiter (kein Reset)
        return;                                    // wir sind fertig für diesen Frame
    }
  }
}

function drawBossShots(ctx, arr){
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Motion-Blur (Fallback: kein filter, wenn nicht unterstützt)
  const canFilter = typeof ctx.filter === 'string';
  if (canFilter) ctx.filter = `blur(${BOSS_BLUR_PX}px)`;

  for (const s of arr){
    const ang = Math.atan2(s.vy, s.vx);
    const p   = Math.max(0, Math.min(1, s.life / (s.life0 || s.life)));

    // Länge/Spitze aus Config:
    const L  = s.len * BOSS_LASER_TAIL * (0.85 + 0.5 * (1 - p)); // älter = länger
    const Hd = s.len * BOSS_LASER_HEAD;
    const Wg = (s.w || s.r) * 3.5;   // Glow-Breite
    const Wc = (s.w || s.r) * 1.3;   // Core-Breite

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(ang);

    // dezente Ghost-Trails (Nachzieheffekt)
    const taps = Math.max(0, Math.floor(BOSS_TRAIL_TAPS));
    for (let k = taps; k > 0; k--){
      const a = k / (taps + 1);
      const fade = 0.18 * a;
      ctx.globalAlpha = fade;
      ctx.lineCap = 'round';

      let gg = ctx.createLinearGradient(-L*(1+a*0.35), 0, Hd, 0);
      gg.addColorStop(0.00, 'rgba(0,0,0,0)');
      gg.addColorStop(0.15, BOSS_LASER_GLOW_2);
      gg.addColorStop(0.70, BOSS_LASER_GLOW_1);
      gg.addColorStop(1.00, '#ffffff');

      ctx.strokeStyle = gg;
      ctx.lineWidth = Wg * (0.9 - 0.3*a);
      ctx.beginPath(); ctx.moveTo(-L*(1+a*0.35), 0); ctx.lineTo(Hd, 0); ctx.stroke();
    }

    // Haupt-Glow
    ctx.globalAlpha = 0.95;
    ctx.lineCap = 'round';
    let g = ctx.createLinearGradient(-L, 0, Hd, 0);
    g.addColorStop(0.00, 'rgba(0,0,0,0)');
    g.addColorStop(0.15, BOSS_LASER_GLOW_2);
    g.addColorStop(0.70, BOSS_LASER_GLOW_1);
    g.addColorStop(1.00, '#ffffff');
    ctx.strokeStyle = g;
    ctx.lineWidth = Wg;
    ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(Hd, 0); ctx.stroke();

    // Core
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = BOSS_LASER_CORE;
    ctx.lineWidth = Wc;
    ctx.beginPath(); ctx.moveTo(-L * 0.55, 0); ctx.lineTo(Hd, 0); ctx.stroke();

    // Spitze
    const tip = ctx.createRadialGradient(0,0, Wc*0.15, 0,0, Wc*1.3);
    tip.addColorStop(0, '#ffffff');
    tip.addColorStop(0.4, BOSS_LASER_GLOW_1);
    tip.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = tip;
    ctx.beginPath(); ctx.arc(0, 0, Wc*1.3, 0, Math.PI*2); ctx.fill();

    // Ionisierungs-Schimmer (verwendet BOSS_LASER_TINT)
    ctx.globalAlpha = 0.28;
    ctx.lineWidth   = Math.max(1, Wc * 0.35);
    ctx.strokeStyle = BOSS_LASER_TINT;
    ctx.beginPath(); ctx.moveTo(-L*0.25, 0); ctx.lineTo(Hd*0.9, 0); ctx.stroke();

    ctx.restore();
  }

  if (canFilter) ctx.filter = 'none';
  ctx.restore();
}


export function drawDeathstar(ctx) {
  if (!boss) return;                       // kein Boss aktiv? dann gibt's nichts zu zeichnen

  // --- Schüsse ---
  ctx.save();                              // Canvas-Zustand merken
  drawBossShots(ctx, shots);
  ctx.restore();                           // Zustand zurücksetzen (falls Farben/Alpha geändert wurden)


  if (!boss.visible) return;               // Boss ggf. unsichtbar (Warp-Phase) → hier aufhören

  const { x, y, r, rot, seed } = boss;     // Kurzschreibweise: Position, Radius, Rotation, Zufalls-Seed

  // pseudo-zufällige Zahl für Deko (Fenster etc.)
  function rand(i) {
    const t = Math.sin(seed + i * 374761.9) * 43758.5453; // deterministische "Noise"-Formel
    return t - Math.floor(t);                             // nur Nachkommaanteil behalten (0..1)
  }

  ctx.save();       // neuer Zeichenkontext

  // --- Schattierung (Radial-Gradient, Licht oben/links) ---
  const gx = x - r * 0.35;                 // Lichtquelle etwas links/oben vom Zentrum
  const gy = y - r * 0.35;
  const grad = ctx.createRadialGradient(gx, gy, r * 0.2, x, y, r); // weicher Lichtverlauf
  grad.addColorStop(0,   "#8c8c96");       // hell im Licht
  grad.addColorStop(0.6, "#5a5a64");       // mittig
  grad.addColorStop(1,   "#3a3a44");       // dunkel am Rand

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);        // der „Planet“ als Kreis
  ctx.fillStyle = grad;                    // Verlauf füllen
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = "#777a84";             // dezenter Rand
  ctx.stroke();

  // --- Äquator-Graben ---
  ctx.save();
  ctx.translate(x, y);                      // Ursprung auf die Kugel
  ctx.rotate(rot * 0.6);                    // mitdrehen (langsamer als Hauptrotation)
  ctx.beginPath();
  ctx.lineWidth = Math.max(10, r * 0.18);   // Grabenbreite relativ zum Radius
  ctx.strokeStyle = "#2b2b33";              // dunkle Nut
  ctx.moveTo(-r * 0.95, 0);
  ctx.lineTo( r * 0.95, 0);
  ctx.stroke();

  // Fensterlichter entlang des Grabens
  const lights = 28;                         // wie viele Spots wir prüfen
  for (let i = 0; i < lights; i++) {
    const t = -r * 0.9 + (i / (lights - 1)) * (r * 1.8); // Position entlang der Linie
    if (rand(i) > 0.65) {                    // nur manche leuchten (pseudo-zufällig)
      ctx.fillStyle = "rgba(220,220,240,0.9)";
      ctx.fillRect(t - 3, -1.2, 6, 2.4);     // kleines Rechteck als „Fenster“
    }
  }
  ctx.restore();

  // --- Superlaser-Schüssel ---
  const dishAngle = rot * 0.9 + Math.PI * 0.18; // leicht versetzt & mit Rotation
  const dishOff   = r * 0.48;                    // Abstand vom Zentrum (liegt „auf“ der Kugel)
  const dx = Math.cos(dishAngle) * dishOff;      // Schüssel-Offset X
  const dy = Math.sin(dishAngle) * dishOff;      // Schüssel-Offset Y
  const dishR = r * 0.28;                        // Schüsselradius

  const g2 = ctx.createRadialGradient(x+dx, y+dy, dishR*0.15, x+dx, y+dy, dishR);
  g2.addColorStop(0,   "#2b2b33");               // dunkel in der Mitte (Hohlform)
  g2.addColorStop(0.65,"#3c3c46");               // weicher Verlauf
  g2.addColorStop(1,   "rgba(30,30,36,0.0)");    // nach außen ausblenden
  ctx.beginPath();
  ctx.arc(x+dx, y+dy, dishR, 0, Math.PI*2);      // Schüssel-Kreis
  ctx.fillStyle = g2;
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = 0.6;                         // etwas transparenter
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#70727c";
  for (let i = 0; i < 5; i++) {                  // konzentrische Ringe für Struktur
    ctx.beginPath();
    ctx.arc(x+dx, y+dy, dishR*(0.2 + 0.15*i), 0, Math.PI*2);
    ctx.stroke();
  }
  ctx.restore();

  // Laser-"Emitter" in der Mitte der Schüssel (grünlich)
  ctx.beginPath();
  ctx.arc(x+dx, y+dy, dishR*0.08, 0, Math.PI*2);
  ctx.fillStyle = "rgba(120,255,150,0.8)";
  ctx.fill();

  // --- Paneel-/Meridian-Linien ---
  ctx.save();
  ctx.globalAlpha = 0.18;           // sehr subtil
  ctx.translate(x, y);
  ctx.rotate(rot);                  // mit der Kugel rotieren 
  ctx.strokeStyle = "#b2b4be";
  ctx.lineWidth = 1;

  for (let i = -4; i <= 4; i++) {              // mehrere „Breitenkreise“ (Meridiane)
    const rr = r * (1 - Math.abs(i) * 0.12);   // kleiner je weiter weg von der Mitte
    ctx.beginPath();
    ctx.arc(0, 0, rr, 0, Math.PI*2);
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {                // 8 „Längsstrahlen“ (wie Längengrade)
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.stroke();
  }
  ctx.restore();

  // --- Weakspot (glühend) ---
  const t = performance.now() * 0.006;         // Zeit für Puls
  const puls = 0.6 + Math.sin(t) * 0.4;        // 0.2..1.0
  ctx.shadowColor = "rgba(255,70,70,0.9)";      // roter Glow
  ctx.shadowBlur = 24 + puls * 18;              // pulsiert
  ctx.beginPath();
  ctx.arc(boss.weak.x, boss.weak.y, boss.weak.r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,80,80,0.95)";       // Kern füllen
  ctx.fill();
  ctx.shadowBlur = 0;                           // Glow wieder aus


  // --- HP-Balken Richtung Spielfeldmitte ---
  const vx = (ctx.canvas.width  / 2) - x;       // Vektor zur Bildschirmmitte
  const vy = (ctx.canvas.height / 2) - y;
  const vlen = Math.hypot(vx, vy) || 1;         // Länge (Guard)
  const nx = vx / vlen, ny = vy / vlen;         // Normalisiert (nur Richtung)

  const bx = x + nx * (r + 16);                 // Balken-Position etwas außerhalb der Kugel
  const by = y + ny * (r + 16);

  const barW = 120, barH = 10;                  // Größe des HP-Balkens
  ctx.fillStyle = "#111";                       // Hintergrund dunkel
  ctx.fillRect(bx - barW/2, by - barH/2, barW, barH);

  const hpw = Math.max(0, (boss.hp / HP_MAX) * barW); // Breite der HP-Füllung (clamped)
  ctx.fillStyle = "#ff5050";                   // rot = Schaden/HP
  ctx.fillRect(bx - barW/2, by - barH/2, hpw, barH);

  // --- kleines Highlight oben links (Lichtkante) ---
  ctx.beginPath();
  ctx.arc(x, y, r, -2.4, -0.9);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(220,220,230,0.25)";
  ctx.stroke();

// === Overlays je nach Phase ===
if (boss.phase === "spawn") {
  // Warp-Ringe: expandierender Ring, leichtes Flimmern während Spawn-Fade
  const k = Math.min(1, boss.t / SPAWN_FADE_TIME);  // 0..1 Fortschritt
  const ringR = boss.r * (0.9 + k * 0.4);           // wächst leicht

  ctx.save();
  ctx.globalAlpha = 0.35 * (1 - Math.abs(2*k - 1)); // auf/abblenden (Dreiecksfunktion)
  ctx.beginPath();
  ctx.arc(boss.x, boss.y, ringR, 0, Math.PI*2);
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(180,220,255,0.85)";
  ctx.stroke();
  ctx.restore();
}

if (boss.phase === "charge") {
  // grüner „Auflade“-Glow in der Schüssel (nimmt zu bis zum Feuerstart)
  const dishAngle = boss.rot * 0.9 + Math.PI * 0.18;
  const dishOff   = boss.r * 0.48;
  const dx = Math.cos(dishAngle) * dishOff;
  const dy = Math.sin(dishAngle) * dishOff;
  const dishR = boss.r * 0.28;

  const k = Math.min(1, boss.t / CHARGE_TIME); // 0..1 Ladefortschritt
  ctx.save();
  ctx.shadowColor = "rgba(120,255,150,0.9)";
  ctx.shadowBlur = 18 + 36 * k;               // mehr Glow je näher am Feuer
  ctx.globalAlpha = 0.35 + 0.45 * k;           // immer sichtbarer
  ctx.beginPath();
  ctx.arc(boss.x+dx, boss.y+dy, dishR*0.45, 0, Math.PI*2);
  ctx.fillStyle = "rgba(120,255,150,0.7)";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

if (boss.phase === "fire") {
  // kurzer Mündungs-Glow + Scanlines (Impuls beim Feuern)
  const dishAngle = boss.rot * 0.9 + Math.PI * 0.18;
  const dishOff   = boss.r * 0.48;
  const dx = Math.cos(dishAngle) * dishOff;
  const dy = Math.sin(dishAngle) * dishOff;
  const dishR = boss.r * 0.28;

  const k = Math.min(1, boss.fireDur / FIRE_BURST_TIME); // 0..1 über die Feuerdauer
  ctx.save();
  ctx.shadowColor = "rgba(150,255,180,1)";                // kräftiger, hellerer Glow
  ctx.shadowBlur = 28 + 18 * Math.sin(performance.now() * 0.025); // leichtes Flimmern
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(boss.x+dx, boss.y+dy, dishR*0.52, 0, Math.PI*2);
  ctx.fillStyle = "rgba(160,255,190,0.85)";
  ctx.fill();
  ctx.shadowBlur = 0;

  // radiale „Scanlines“ für Energie-Look
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = "rgba(160,255,190,0.85)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const a = i * (Math.PI*2/6) + k * 1.2;                // leicht rotierend mit k
    ctx.beginPath();
    ctx.moveTo(boss.x+dx, boss.y+dy);
    ctx.lineTo(boss.x+dx + Math.cos(a)*dishR*0.85,
               boss.y+dy + Math.sin(a)*dishR*0.85);
    ctx.stroke();
  }
  ctx.restore();
}
}

// Kollisions-Helper: Bullet trifft Schwachstelle
export function bulletHitsWeakSpot(b) {
  if (!boss || !boss.visible) return false;         // kein Boss/unsichtbar → kein Treffer
  const rr = (boss.weak.r + b.r) ** 2;              // Summe der Radien (Kreis/Kreis-Kollision) im Quadrat
  return dist2(boss.weak, b) < rr;                  // wenn Abstand^2 < rr → Treffer true
}
