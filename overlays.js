import { ensureHighscoreDir, loadHighscoresFromFile } from './hiscore_io.js';

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

export async function openHighscoresOverlayFromFile(max = 5, title = 'Highscores', withRestartHint = true) {
  // Sofort sichtbares Overlay + Ladezustand
  ovTitle.textContent = title + (withRestartHint ? ' – Enter: Neustart' : '');
  ovList.innerHTML = '<li>Lade Highscores…</li>';
  overlay.hidden = false;

  try {
    // Ordner sicherstellen (fragt beim ersten Mal nach dem Asteroids-Ordner)
    await ensureHighscoreDir();
    const list = await loadHighscoresFromFile();

    // Puffer & DOM updaten
    hiscoreRowsHTML = renderHiscoreListHTML(list, max);
    ovList.innerHTML = hiscoreRowsHTML;
  } catch (e) {
    console.warn('Highscores laden fehlgeschlagen:', e);
    ovList.innerHTML = '<li>Highscores konnten nicht geladen werden.<br><small>Tipp: Wähle deinen Asteroids-Ordner (Chromium + https/localhost), dann wird „highscores.txt“ dort gespeichert und gelesen.</small></li>';
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

// Overlay öffnen (z.B. Game Over oder Highscores)
// title : Titeltext oben
// withRestartHint : zeigt "Enter : Neustart" an
export function openOverlay(title, withRestartHint = true) {
  ovTitle.textContent = title + (withRestartHint ? ' – Enter: Neustart' : '');
  ovList.innerHTML = hiscoreRowsHTML;
  overlay.hidden = false;
}

// Overlay schließen
export function closeOverlay() {
  overlay.hidden = true;
}

// Abfragen, ob Overlay offen ist
export function isOverlayOpen() {
  return !overlay.hidden;
}

// Kurzes Banner einblenden beim Levelstart
export function showLevelBanner(lvl, detailsText = '') {
  // Text setzen
  levelText.textContent = `Level ${lvl}`;
  levelSub.textContent = detailsText || '';

  // Banner sichtbar machen
  levelBanner.hidden = false;

  // CSS Animation zurücksetzen 
  levelBanner.classList.remove('show'); // Animation reset
  void levelBanner.offsetWidth;         // Reflow
  levelBanner.classList.add('show');

  // Nach vorgegebener Zeit ausblenden
  setTimeout(() => { levelBanner.hidden = true; }, 2000);
}
