// ❌ ensureHighscoreDir rausnehmen
import { loadHighscoresFromFile } from './hiscore_io.js';

// Referenzen auf DOM Elemente für Overlays
let overlay, ovTitle, ovList, levelBanner, levelText, levelSub;

// gepufferte Highscore-HTML (wird bei openOverlay gesetzt)
let hiscoreRowsHTML = '<li>Noch keine Einträge.</li>';

// rendert Highscore Liste als HTML STRING
// list : Array mit Highscore Objekten
// max : maximale Anzahl Einträge
// gibt ein <li> HTML zurück
function renderHiscoreListHTML(list = [], max = 5) {
  if (!list.length) return '<li>Noch keine Einträge.</li>';
  return list.slice(0, max).map((s, i) =>
    `<li><span>${(i+1).toString().padStart(2,' ')}. ${s.name}</span><span>${s.score}</span></li>`
  ).join('');
}

export async function openHighscoresOverlayFromFile(
  max = 5,
  title = 'Highscores',
  withRestartHint = true,
  game = 'astoroids'
) {
  // Sofort sichtbares Overlay + Ladezustand
  ovTitle.textContent = title + (withRestartHint ? ' – Enter: Neustart' : '');
  ovList.innerHTML = '<li>Lade Highscores…</li>';
  overlay.hidden = false;

  try {
    // 🚀 Highscores vom Server laden
const response = await loadHighscoresFromFile(game);
console.log("🔍 Full Response:", response);


// richtige Liste finden
let list = [];
if (Array.isArray(response)) {
  console.log("✅ Direktes Array gefunden:", response);
  list = response;
} else if (Array.isArray(response.highscore)) {
  console.log("✅ response.highscore gefunden:", response.highscore);
  list = response.highscore;
} else if (Array.isArray(response[game])) {
  console.log(`✅ response['${game}'] gefunden:`, response[game]);
  list = response[game];
} else {
  console.log("⚠️ Keine passende Liste gefunden!", response);
}


// Puffer & DOM updaten
hiscoreRowsHTML = renderHiscoreListHTML(list, max);
ovList.innerHTML = hiscoreRowsHTML;

  } catch (e) {
    console.warn('Highscores laden fehlgeschlagen:', e);
    ovList.innerHTML = '<li>Highscores konnten nicht geladen werden.<br><small>Bitte prüfen, ob der Highscore-Server läuft.</small></li>';
  }
}

// DOM referenzen holen, 1x beim Import
function bindDom() {
  overlay      = document.getElementById('overlay');     // Overlay Hintergrund
  ovTitle      = document.getElementById('ovTitle');     // Titel im Overlay
  ovList       = document.getElementById('ovList');      // Highscore Liste
  levelBanner  = document.getElementById('levelBanner'); // Banner bei Levelstart
  levelText    = document.getElementById('levelText');   // "Level X"
  levelSub     = document.getElementById('levelSub');    // Details zum Level
}
bindDom();

// ---------- Public API ----------
export function setHighscores(list, max = 5) {
  hiscoreRowsHTML = renderHiscoreListHTML(list, max);
}

export function openOverlay(title, withRestartHint = true) {
  ovTitle.textContent = title + (withRestartHint ? ' – Enter: Neustart' : '');
  ovList.innerHTML = hiscoreRowsHTML;
  overlay.hidden = false;
}

export function closeOverlay() {
  overlay.hidden = true;
}

export function isOverlayOpen() {
  return !overlay.hidden;
}

export function showLevelBanner(lvl, detailsText = '') {
  levelText.textContent = `Level ${lvl}`;
  levelSub.textContent = detailsText || '';
  levelBanner.hidden = false;

  levelBanner.classList.remove('show');
  void levelBanner.offsetWidth;
  levelBanner.classList.add('show');

  setTimeout(() => { levelBanner.hidden = true; }, 2000);
}
