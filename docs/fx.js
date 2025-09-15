import {
  SHAKE_DECAY, SHAKE_MAX_XY, SHAKE_MAX_ROT, SHAKE_TRAUMA_POW, SHAKE_SHIPHIT_ECHO, SHAKE_SHIPHIT_ECHO_DELAY, SHAKE_POWER_SHIPHIT
} from './config.js';

// wie stark die Kamera durchgeschüttelt werden soll (0 = ruhig / 1 = maximal )
let trauma = 0;

// addieren eine Shake Menge x und begrenzen bei 1
export function addShake(x) {
    trauma = Math.min(1, trauma + Math.max(0, x || 0));
}

export function addShipHitShake() {
  // Hauptimpuls beim Treffer
  addShake(SHAKE_POWER_SHIPHIT);
  // kurzes Nachbeben nach einer kleinen Verzögerung
  setTimeout(() => addShake(SHAKE_SHIPHIT_ECHO), SHAKE_SHIPHIT_ECHO_DELAY);
}

export function updateFx(dt) {
    // trauma baut sich mit der Zeit ab
    trauma = Math.max(0, trauma - SHAKE_DECAY * dt);
}

function currentAmount() {
    // Effektstärke = Trauma
    return Math.pow(trauma, SHAKE_TRAUMA_POW);
}

export function beginWorld(ctx) {
    if (trauma <= 0) return;        // Kein Trauma = kein shake nötig
    const a = currentAmount();      // aktuelle Shake stärke
    // zufällige Verschiebung in X/Y
    const dx = (Math.random() * 2 - 1) * SHAKE_MAX_XY * a;
    const dy = (Math.random() * 2 - 1) * SHAKE_MAX_XY * a;
    // kleine zufallsrotation
    const rot = (Math.random() * 2 - 1) * SHAKE_MAX_ROT * a;

    ctx.save();                     // Canvas Status sichern
    ctx.translate(dx, dy);          // Bild verschieben
    ctx.rotate(rot);                // Bild kippen
}

export function endWorld(ctx) {
    ctx.restore?.();                // ursprünglichen Canvas Status zurückholen
}