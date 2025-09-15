import {
  TIE_FORMATION_ENABLED, TIE_FORMATION_TYPE, TIE_FORMATION_SPACING,
  TIE_FORMATION_DISTANCE, TIE_FORMATION_MAX_SQUAD
} from './config.js';
import { buildSlots } from './formationPatterns.js';
import { rotatePoint, angleTo } from './steering.js';

// einfache Ein-Squad-Logik
let cachedType  = null;
let cachedCount = 0;
let slotCache = [];

// Liefert Slot Ziel (x, y) + gewünschte Blickrichtung (angle) für TIE mit Index i (in der Reihenfolge des TIE Arrays)
export function getFormationTarget (i, ties, player) {
    if (!TIE_FORMATION_ENABLED) return null;

    const count = Math.min(ties.length, TIE_FORMATION_MAX_SQUAD);
    if (count === 0 || i >= count) return null;

    // Formation orientiert sich am Spieler (immer auf ihn zu)
    const dx = player.x - (ties[0]?.x ?? player.x);
    const dy = player.y - (ties[0]?.y ?? player.y);
    const facing = angleTo(dx, dy);

    // Mitte liegt hinter dem Spieler (im Rücken des Jägerschwarms)
    const cx = player.x - Math.cos(facing) * TIE_FORMATION_DISTANCE;
    const cy = player.y - Math.sin(facing) * TIE_FORMATION_DISTANCE;

    // Slots bei bedarf neu aufbauen (Typ/Anzahl/Spacing)
    if (cachedType !== TIE_FORMATION_TYPE || cachedCount !== count) {
        slotCache = buildSlots(TIE_FORMATION_TYPE, count, TIE_FORMATION_SPACING);
        cachedType = TIE_FORMATION_TYPE;
        cachedCount = count;
    }

    // Index -> Slot
    const local = slotCache[i]; 
    const world = rotatePoint(local.x, local.y, facing);
    return {
        x: cx + world.x,
        y: cy + world.y,
        angle: facing
    };
}