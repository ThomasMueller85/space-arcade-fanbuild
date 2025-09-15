import {
  ROCKET_SPEED, ROCKET_ACCEL, ROCKET_TURN_RATE, ROCKET_LIFETIME,
  ROCKET_HIT_RADIUS, ROCKET_BLAST_RADIUS, ROCKET_BASE_DMG, ROCKET_BLAST_DMG, TAU, SHOCKWAVE_SPEED, SHOCKWAVE_DURATION, SHOCKWAVE_THICK, BLAST_RING_SHOW_TIME,
  SEISMIC_DELAY_MS, SEISMIC_RUMBLE_MS, SEISMIC_DUCK_DROP, SEISMIC_DUCK_HOLD, ROCKET_TRAIL_SPAWN, ROCKET_TRAIL_TTL, ROCKET_TRAIL_BASE, ROCKET_TRAIL_MAX
} from './config.js';
import { dist2 } from './utils.js';
import { clamp } from './steering.js';
import { sfx, bgm } from'./audio.js';
import { addShipHitShake } from'./fx.js';
import { rumble } from'./controller.js';

// Array für aktive Raketen
const rockets = [];
// Bildschirmbreite für den Schockwellen Effekt , jede Welle x+y = länge und breite sowie t = Zeit 
const shockwaves = [];     // {x,y,t}
// Exlosionsringe 
const blastRings = [];     // {x,y,t}
// Partikelspuren der Rakete
const trails = [];         // { x, y, angle, t }

// Setzt alles von den Raketen zurück
export function resetRockets() {
    rockets.length = 0;     // alle Raketen löschen
    shockwaves.length = 0;  // alle Stoßwellen löschen
    blastRings.length = 0;  // alle Explosionsringe löschen
    trails.length = 0;      // alle Trail Partikel löschen
}

// Erzeugt eine neue Rakete, die aus der Schiffs-Nase abgefeuert wird
export function spawnRocketFromShip(ship) {
    // Richtung bestimmen, in die das Schiff aktuell zeigt
    const ang = ship.angle;

    // Cosinus/Sinus der Richtung einmal berechnen (spart doppelte Rechenarbeit)
    const cos = Math.cos(ang), sin = Math.sin(ang);

    // Neue Rakete in das rockets-Array einfügen
    rockets.push({
        // Startposition: leicht vor der Schiffsspitze (radius + 8px Abstand)
        x: ship.x + cos * (ship.radius + 8),
        y: ship.y + sin * (ship.radius + 8),

        // Anfangsgeschwindigkeit: nach vorne (in Blickrichtung) mit ROCKET_SPEED
        // (ROCKET_SPEED ist eine Konstante aus deiner config)
        vx: cos * ROCKET_SPEED,
        vy: sin * ROCKET_SPEED,

        // merkt sich ihre Blickrichtung (für Zeichnen/Trail)
        angle: ang,

        // Zeit-Akkumulator (Sekunden) — nützlich für Effekte, Lebensdauer, Animation
        t: 0,

        // Alive-Flag: true = fliegt noch; false = explodiert/entfernt
        alive: true,
    });
}

// targets: Array von Objekten mit {x,y,radius?,hp?} (Asteroiden, Gegner, Boss, etc)
export function updateRockets(dt, targets, worldW, worldH) {
    // rückwärts durchs Array, damit splice() sauber klappt
    for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        if (!r.alive) { rockets.splice(i,1); continue; }   // tote Raketen direkt entsorgen

        r.t += dt;                                         // Lebenszeit hochzählen
        if (r.t > ROCKET_LIFETIME) {                       // zu alt? dann bumm machen …
            explode(r, targets);                           // Explosion an der Rakete
            rockets.splice(i,1);                           // Rakete löschen
            continue;                                      // weiter zur nächsten
        }

        // Ziel suchen: das nächste lebende Target
        const tgt = findNearestTarget(r, targets);
        if (tgt) {
            const dx = tgt.x - r.x;                        // Vektor zum Ziel (x)
            const dy = tgt.y - r.y;                        // Vektor zum Ziel (y)
            const desired = Math.atan2(dy, dx);            // Wunsch-Blickrichtung zur Zielposition
            // Winkel-Differenz in den Bereich [-PI, PI] normalisieren
            let dAng = normalizeAngle(desired - r.angle);
            // Drehgeschwindigkeit begrenzen 
            const maxTurn = ROCKET_TURN_RATE * dt;
            dAng = clamp(dAng, -maxTurn, maxTurn);
            r.angle += dAng;                               // sanft Richtung Ziel drehen
        }

        // Geschwindigkeit passend zum aktuellen Winkel ausrichten
        const cx = Math.cos(r.angle), sy = Math.sin(r.angle);
        if (ROCKET_ACCEL > 0) {
            r.vx += cx * ROCKET_ACCEL * dt;               // bisschen nach vorne anschubsen (x)
            r.vy += sy * ROCKET_ACCEL * dt;               // … und (y)
        }
        const vLen = Math.hypot(r.vx, r.vy);               // aktuelle Speed-Länge
        const targetV = ROCKET_SPEED;                      // Wunsch-Reisegeschwindigkeit
        // sanft auf konstante Reisegeschwindigkeit bringen (Richtung beibehalten)
        r.vx = (r.vx / (vLen || 1)) * targetV;
        r.vy = (r.vy / (vLen || 1)) * targetV;

        r.x += r.vx * dt;                                  // Position updaten (x)
        r.y += r.vy * dt;                                  // Position updaten (y)

        // pro Rakete alle ROCKET_TRAIL_SPAWN Sekunden einen Trail-Punkt droppen
        r.trailAcc = (r.trailAcc || 0) + dt;               // „Zeit seit letztem Trailpunkt“ mitzählen
        if (r.trailAcc >= ROCKET_TRAIL_SPAWN) {
            r.trailAcc -= ROCKET_TRAIL_SPAWN;              // wieder auf 0 setzen (mit Rest)
            // neuen Trail-Sample ablegen
            trails.push({ x: r.x, y: r.y, angle: r.angle, t: 0 });
            // Soft-Limit: wenn zu viele, die ältesten abschneiden
            if (trails.length > ROCKET_TRAIL_MAX) 
                trails.splice(0, trails.length - ROCKET_TRAIL_MAX);
        }

        // Bildschirm-Rand: auf die andere Seite „durchtunneln“
        if (worldW && worldH) {
            if (r.x < 0) r.x += worldW; else if (r.x >= worldW) r.x -= worldW;
            if (r.y < 0) r.y += worldH; else if (r.y >= worldH) r.y -= worldH;
        }

        // Direkter Treffer mit einem Target?
        const hit = firstDirectHit(r, targets);
        if (hit) {
            explode(r, targets, hit);                      // Explosion mit Treffer-Info (für Extra-Schaden o.ä.)
            rockets.splice(i,1);                           // Rakete weg
        }
    }
}

export function updateRocketFX(dt) {
  // Stoßwellen von hinten nach vorn durchgehen (rückwärts = sicheres Löschen)
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    shockwaves[i].t += dt;                           // Zeit seit Erzeugung hochzählen
    if (shockwaves[i].t > SHOCKWAVE_DURATION)        // zu lange sichtbar?
      shockwaves.splice(i, 1);                       // dann entfernen
  }

  // Explosions-Ringe genauso behandeln
  for (let i = blastRings.length - 1; i >= 0; i--) {
    blastRings[i].t += dt;                           // altern
    if (blastRings[i].t > BLAST_RING_SHOW_TIME)      // Zeit abgelaufen?
      blastRings.splice(i, 1);                       // weg damit
  }

  // --- Trails updaten ---
  for (let i = trails.length - 1; i >= 0; i--) {
    const g = trails[i];                             // einzelner Trail-Punkt
    g.t += dt;                                       // älter werden
    if (g.t > ROCKET_TRAIL_TTL)                      // Lebenszeit vorbei?
      trails.splice(i, 1);                           // Punkt löschen
  }
}

export function drawRockets(ctx) {
  // jede aktive Rakete zeichnen
  for (const r of rockets) {
    const t = r.t || 0;                                         // Alter der Rakete (Fallback 0)

    ctx.save();                                                 // Canvas-Status sichern
    ctx.translate(r.x, r.y);                                    // Ursprung auf Raketenposition
    ctx.rotate(r.angle);                                        // in Flugrichtung drehen

    // --- waberndes Blau-Glow (additiv) ---
    const pulse = 1 + 0.15 * Math.sin(t * 8.0);                 // leichtes Pulsieren  (1 ± 0.15)
    const glowR = 18 * pulse;                                   // Glow-Radius abhängig vom Puls
    const prev = ctx.globalCompositeOperation;                  // aktuellen Blend-Modus merken
    ctx.globalCompositeOperation = 'lighter';                   // „additiv“: Farben addieren -> Leuchten
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);// radialer Verlauf um (0,0)
    grad.addColorStop(0.00, 'rgba(140,200,255,0.50)');        // heller Kern
    grad.addColorStop(0.55, 'rgba(80,150,255,0.30)');         // weicher Übergang
    grad.addColorStop(1.00, 'rgba(0,0,0,0)');                 // außen transparent
    ctx.fillStyle = grad;                                       // Verlauf als Füllfarbe setzen
    ctx.beginPath(); ctx.arc(0, 0, glowR, 0, TAU); ctx.fill();  // Glow-Kreis füllen
    ctx.globalCompositeOperation = prev;                        // Blend-Modus zurücksetzen

    // --- Körper mit Volumen (gefüllt + Outline) ---
    ctx.lineWidth = 2.5;                                        // Umrissstärke
    const hull = ctx.createLinearGradient(-12, 0, 12, 0);       // Verlauf entlang der Länge
    hull.addColorStop(0.00, '#111827');                       // sehr dunkel (Heck)
    hull.addColorStop(0.45, '#334155');                       // Mittelton
    hull.addColorStop(1.00, '#0b1220');                       // sehr dunkel (Nase)
    ctx.fillStyle = hull;                                       // Rumpf-Farbe
    ctx.strokeStyle = '#e2e8f0';                              // helle Outline

    ctx.beginPath();
    // Rumpf als spitzes, leicht bauchiges Polygon
    ctx.moveTo(12, 0);                               // Spitze der Rakete
    ctx.lineTo( 5,  3.4);                            // obere Kante
    ctx.lineTo(-7,  3.8);                            // Heck oben
    ctx.lineTo(-7, -3.8);                            // Heck unten
    ctx.lineTo( 5, -3.4);                            // untere Kante
    ctx.closePath();
    ctx.fill(); ctx.stroke();                        // füllen + umranden

    // Finnen (kleine Flügelchen), hellblau und dünn
    ctx.strokeStyle = '#93c5fd';
    ctx.beginPath();
    ctx.moveTo(-4, -6.5); ctx.lineTo(-1.2, -1.2); ctx.lineTo(-7.5, -2.0); // oben
    ctx.moveTo(-4,  6.5); ctx.lineTo(-1.2,  1.2); ctx.lineTo(-7.5,  2.0); // unten
    ctx.stroke();

    // kleine Glanzkante oben (Highlight) für „Metall-Look“
    ctx.strokeStyle = 'rgba(230,243,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(4, -2.2); ctx.lineTo(9, -1.2); ctx.stroke();

    // Exhaust-Flackern (Abgas-Zucken)
    const flick = (Math.sin(t * 40) > 0) ? 1 : -1;   // schnelles Hin-und-Her
    ctx.strokeStyle = '#60a5fa';                   // blaues Abgas
    ctx.beginPath(); 
    ctx.moveTo(-8, 0);                               // Start am Heck
    ctx.lineTo(-14 - 2 * flick, 0);                  // mal etwas länger, mal kürzer
    ctx.stroke();

    ctx.restore();                                   // Canvas-Status wiederherstellen
  }
}

export function drawRocketEffects(ctx) {
  // AoE-Ring (Explosionsradius als pulsierender Kreis)
  for (const b of blastRings) {
    const a = Math.max(0, 1 - b.t / BLAST_RING_SHOW_TIME);  // altersprüfung
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.55 * a;                      // verblasst mit der Zeit
    ctx.lineWidth = 2 + 10 * a;                             // dicker am Anfang
    ctx.strokeStyle = '#60a5fa';                          // bläuliche Kontur
    ctx.beginPath();
    ctx.arc(b.x, b.y, ROCKET_BLAST_RADIUS, 0, TAU);         // fester Radius
    ctx.stroke();
    ctx.restore();
  }

  // --- Seismic Shockwave ---
  for (const s of shockwaves) {
    const life = s.t / SHOCKWAVE_DURATION;                  // 0..1 Fortschritt der Welle
    const R    = Math.max(0, s.t * SHOCKWAVE_SPEED);        // Radius wächst linear mit der Zeit
    const fade = Math.max(0, 1 - life);                     // transparenz über Lebenszeit

    ctx.save();
    const prev = ctx.globalCompositeOperation;              // aktueller Blendmodus merken
    ctx.globalCompositeOperation = 'lighter';               // hellere leuchtende Kanten

    // Weicher Glow: nur wenn Radius > 0.5 sichtbar
    if (R > 0.5) {
      ctx.globalAlpha = 0.18 * fade;                                        // leichter Schein
      ctx.lineWidth = SHOCKWAVE_THICK * (0.85 + 0.25 * Math.sin(s.t * 12)); // kleine schwankungen in der Dicke
      ctx.strokeStyle = '#9bd1ff';                                        // weiches Blau
      ctx.beginPath();
      ctx.arc(s.x, s.y, R, 0, TAU);
      ctx.stroke();
    }

    // Harte Front (helle, scharfe Außenkante)
    ctx.globalAlpha = 0.85 * fade;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#e6f3ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, Math.max(0.5, R + 1.5), 0, TAU);  // leicht größer als Glow
    ctx.stroke();

    // Innerer dunkler Rand nur, wenn R groß genug
    if (R > 3.5) {
      ctx.globalAlpha = 0.25 * fade;
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#1f3b54';
      ctx.beginPath();
      ctx.arc(s.x, s.y, R - 3, 0, TAU);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = prev;                // Blendmodus zurück
    ctx.restore();
  }
}

export function drawRocketTrails(ctx) {
  // Älteste zuerst zeichnen → schöneres Überblenden
  ctx.save();
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';         // additiv für Glow

  for (let i = 0; i < trails.length; i++) {
    const g = trails[i];
    const u = Math.min(1, g.t / ROCKET_TRAIL_TTL);  // 0..1 altersprüfung
    const alpha = (1 - u) * (1 - u) * 0.65;         // weich ausblenden
    if (alpha <= 0.01) continue;                    // unsichtbar dann skippen

    const rad = ROCKET_TRAIL_BASE * (1 + 0.9 * u);  // wächst leicht mit dem alter
    const stretch = 1.7 + 0.4 * (1 - u);            // länglicher am Anfang

    ctx.save();
    ctx.translate(g.x, g.y);                        // auf Trail Punkt springen
    ctx.rotate(g.angle);                            // in Flugrichtung drehen
    ctx.scale(stretch, 1);                          // Ellipse durch stretch in x

    // Radialer Glow (ellipse durch scale)
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
    grad.addColorStop(0.00, `rgba(140,200,255,${0.50 * alpha})`);   // heller Kern
    grad.addColorStop(0.55, `rgba(80,150,255,${0.28 * alpha})`);    // weicher übergang
    grad.addColorStop(1.00, `rgba(0,0,0,0)`);                     // außen transparent

    ctx.globalAlpha = 1;                    // alpha steckt im Gradient
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, TAU);             // Kreis (wirkt als Ellipse durch scale)
    ctx.fill();

    // schlanke Kernlinie für „Hot Core“ in der mitte
    ctx.globalAlpha = 0.35 * alpha;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#e6f3ff';
    ctx.beginPath();
    ctx.moveTo(-rad * 0.8, 0);              // etwas länger nach hinten
    ctx.lineTo( rad * 0.6, 0);              // kürzer nach vorn
    ctx.stroke();

    ctx.restore();
  }

  ctx.globalCompositeOperation = prev;      // Blendmodus zurück
  ctx.restore();
}

// Helper 
function normalizeAngle(a) {
   // Solange der Winkel größer als +π ist (also > 180°),
   // zieh eine volle Umdrehung (TAU = 2π) ab.
   // → damit wird z. B. 200° zu -160° normalisiert.
   while (a > Math.PI) a -= TAU;

   // Solange der Winkel kleiner als -π ist (also < -180°),
   // addiere eine volle Umdrehung dazu.
   // → damit wird z. B. -250° zu +110°.
   while (a < -Math.PI) a += TAU;

   // Jetzt liegt der Winkel garantiert im Bereich [-π, +π].
   return a;
}


function findNearestTarget(r, targets) {
    let best = null, bestD2 = Infinity;                 // bisher kein Ziel, Abstand^2 = unendlich groß
    for (const t of targets) {                          // alle potenziellen Ziele durchgehen
        if (!t || t.hp === 0) continue;                 // null/undef oder schon tot? überspringen
        const d2 = (t.x - r.x) ** 2 + (t.y - r.y) ** 2; // Abstand im Quadrat (billiger als sqrt)
        if (d2 < bestD2) {bestD2 = d2; best = t; }      // wenn näher: das neue „beste“ Ziel merken
    }
    return best;                                        // nächstes Ziel zurückgeben (oder null)
}

function firstDirectHit(r, targets) {
    for (const t of targets) {                          // alle Ziele checken
        if (!t) continue;                               // null/undef raus
        const rr = (t.radius || 20) + ROCKET_HIT_RADIUS;// „Treffer-Radius“ = Zielradius + Raketenradius
        if (dist2(r, t) <= rr * rr) return t;           // wenn Distanz^2 <= (Summe Radien)^2 → Treffer!
    }
    return null;                                        // sonst keiner getroffen
}

function explode(r, targets, primary = null) {
    // Audio + Visual "BOOM"
  setTimeout(() => {                                    // Effekte mit Verzögerung (z. B. kurze Zündschnur)
    // sichtbare Wellen genau beim Boom starten
    shockwaves.push({ x: r.x, y: r.y, t: 0 });         // große, expandierende Druckwelle
    blastRings.push({ x: r.x, y: r.y, t: 0 });         // dekorativer AoE-Ring

    // Sound + Musik ducken
    sfx.seismic?.();                                   // BUMM-Sound (Optional-Chaining falls nicht vorhanden)
    bgm.duck(SEISMIC_DUCK_DROP, SEISMIC_DUCK_HOLD);    // Hintergrundmusik kurz leiser machen

    // Screen-Shake Spike (doppelt getriggert = knackig)
    addShipHitShake();                                  // kurzer Kameraruckler
    addShipHitShake();                                  // zweimal für extra Punch

    // Controller-Rumble
    rumble(1.0, SEISMIC_RUMBLE_MS);                    // vibrieren: Stärke 1.0, Dauer X ms
  }, SEISMIC_DELAY_MS);                                 // so viele Millisekunden warten bis es „BOOM“ macht

  // --- Schaden wie gehabt (SOFORT) ---
  if (primary && typeof primary.hp === 'number') {     // direkt getroffener Gegner (z. B. Nose-Hit)
    primary.hp -= ROCKET_BASE_DMG;                     // Basis-Schaden abziehen
    if (primary.hp <= 0 && typeof primary.onKilled === 'function') primary.onKilled(); // Kill-Callback
  }

  for (const t of targets) {                            // Splash-Damage im Umkreis
    if (!t) continue;
    const d = Math.hypot(t.x - r.x, t.y - r.y);        // echter Abstand (hier ist sqrt ok)
    if (d <= ROCKET_BLAST_RADIUS) {                    // nur innerhalb des Explosionsradius
      const falloff = 1 - (d / ROCKET_BLAST_RADIUS);   // linear weniger Schaden je weiter weg (1..0)
      const dmg = Math.max(0, ROCKET_BLAST_DMG * falloff); // nie negativ
      if (typeof t.hp === 'number') {
        t.hp -= dmg;                                   // Schaden anwenden
        if (t.hp <= 0 && typeof t.onKilled === 'function') t.onKilled(); // optionaler Kill-Hook
      }
    }
  }
}
