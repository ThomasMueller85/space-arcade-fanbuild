import {
  UFO_FORMATION_ENABLED, UFO_FORMATION_TYPE, UFO_FORMATION_SPACING,
  UFO_FORMATION_DISTANCE, UFO_FORMATION_MAX_SQUAD
} from './config.js';
import { buildSlots } from './formationPatterns.js';
import { rotatePoint, angleTo } from './steering.js';

let cachedType  = null;
let cachedCount = 0;
let slotCache   = [];

// Liefert Zielslot {x,y,angle} für UFO i
export function getUfoFormationTarget(i, ufos, player){
  if (!UFO_FORMATION_ENABLED) return null;

  const count = Math.min(ufos.length, UFO_FORMATION_MAX_SQUAD);
  if (count === 0 || i >= count) return null;

  // Ausrichtung auf den Spieler
  const dx = player.x - (ufos[0]?.x ?? player.x);
  const dy = player.y - (ufos[0]?.y ?? player.y);
  const facing = angleTo(dx, dy);

  // Formationszentrum hinter dem Spieler
  const cx = player.x - Math.cos(facing) * UFO_FORMATION_DISTANCE;
  const cy = player.y - Math.sin(facing) * UFO_FORMATION_DISTANCE;

  // Slots ggf. neu erzeugen
  if (cachedType !== UFO_FORMATION_TYPE || cachedCount !== count) {
    slotCache  = buildSlots(UFO_FORMATION_TYPE, count, UFO_FORMATION_SPACING);
    cachedType = UFO_FORMATION_TYPE;
    cachedCount= count;
  }

  const local = slotCache[i];
  const world = rotatePoint(local.x, local.y, facing);
  return { x: cx + world.x, y: cy + world.y, angle: facing };
}
