import {
  TAU, BULLET_SPEED, BULLET_RADIUS, BULLET_LIFE, MAX_BULLETS
} from './config.js';
import { wrap } from './utils.js';

// internes Bullet-Array
const bullets = [];

// Zum externen Lesen (z. B. für Kollisionen)
export function getBullets() {
  return bullets;
}

// Ein einzelnes Bullet entfernen (Index aus Kollision)
export function removeBulletAt(i) {
  bullets.splice(i, 1);
}

// Alles leeren (z. B. im Restart)
export function resetBullets() {
  bullets.length = 0;
}

// Versucht zu feuern. Gibt true zurück, wenn ein Bullet erzeugt wurde.
export function tryFire(ship, angleOffset = 0, lateral = 0) {
  // Schusslimit
  if (bullets.length >= MAX_BULLETS) return false;

  // Vorwärts-/Quer-Vektoren aus (Schiffs-)Winkel + Offset
  const ang = ship.angle + angleOffset;
  const cos = Math.cos(ang), sin = Math.sin(ang);
  const px = -sin, py = cos; // Quer (links/rechts), nützlich für "breitere" Salven

  // Start an der Schiffsnase + optional leichter seitlicher Versatz
  const noseX = ship.x + cos * (ship.radius + 6) + px * lateral;
  const noseY = ship.y + sin * (ship.radius + 6) + py * lateral;

  // Geschwindigkeit (Richtung + kleiner Anteil Schiffstempo)
  const vx = cos * BULLET_SPEED + ship.vx * 0.2;
  const vy = sin * BULLET_SPEED + ship.vy * 0.2;

  bullets.push({
    x: noseX, y: noseY,
    vx, vy,
    r: BULLET_RADIUS,
    radius: BULLET_RADIUS,
    life: BULLET_LIFE
  });
  return true;
}


// Bewegung / LEbensdauer Handling für alle Bullets
export function updateBullets(dt, w, h) {
  // Rückwärts damit splice keine Indizes verschiebt
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    // Position mittels Geschwindigkeit integrieren
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    // Bildschirmrand übertritt
    wrap(b, w, h);
    // Lebendsdauer runterzählen
    b.life -= dt;
    // Abgelaufende Bullets entfernen
    if (b.life <= 0) bullets.splice(i, 1);
  }
}

export function drawBullets(ctx) {
  // Schleife über alle aktuell vorhandenen Bullets im Array "bullets"
      for (const b of bullets) {
          // Aktueller Canvas speichern
          ctx.save();

          // Radialen Farbverlauf erzeugen
          // Mittelpunkt = Bullet-Position, Innenradius = 0, Außenradius = Bullet-Radius
          const gradient = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
          gradient.addColorStop(0, '#aaffaa');   // heller grüner Kern
          gradient.addColorStop(0.6, '#22ff22'); // sattes Grün
          gradient.addColorStop(1, '#0a660a');   // dunkler Rand

          // Glow Effekt einstellung 
          ctx.shadowBlur = 8;   // Weichzeichnen für glow
          ctx.shadowColor = '#33ff33'

          // Beginnt einen neuen Pfad , damit jedes Bullet einzeln gezeichnet wird
          ctx.beginPath();
          // zeichnet das Bullet als kleinen Kreis an die Koordinaten b.x / b.y
          ctx.arc(b.x, b.y, b.r, 0, TAU);
          // Farbe der Bullets
          ctx.fillStyle = gradient;    
          // Füllt die Bullets mit der Farbe
          ctx.fill();

          // Rand
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#ccffcc'
          ctx.stroke();

          ctx.restore();
      }
}
