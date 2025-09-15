import { AST_INIT_COUNT, COUNT_STEP, SPEED_STEP } from './config.js';

// Referenzen auf die DOM Elemente des Menüs
let root, levelInput, levelVal, infoDiv, startBtn;

// aktuell gewähltes Startlevel (Standard 1)
let selectedLevel = 1;

// Hilfsfunktion : Wert in Ganzzahl umwandeln 
function asInt(v, d=1){ 
  const n = parseInt(v,10); 
  return Number.isFinite(n)? n : d; 
}

// Info Anzeige im Menü aktualisieren
// liest aktuellen Levelwert aus
// berechnet Asteroidenanzahl + Speed Multiplikator
// schreibt Text ins Menü
function updateInfo(){
  selectedLevel = asInt(levelInput.value, 1);
  const count = AST_INIT_COUNT + (selectedLevel - 1) * COUNT_STEP;
  const speedMul = 1 + (selectedLevel - 1) * SPEED_STEP;
  levelVal.textContent = String(selectedLevel);
  infoDiv.textContent = `Steine: ${count} • Speed: +${Math.round((speedMul - 1) * 100)}%`;
}

// Setup des Menüs : DOM Elemente abfragen, Events binden
export function setupMenu(onStart){
  root       = document.getElementById('titleScreen');
  levelInput = document.getElementById('startLevel');     // Range/Number Input
  levelVal   = document.getElementById('startLevelVal');  // Anzeige Wert
  infoDiv    = document.getElementById('startInfo');      // Anzeige Info
  startBtn   = document.getElementById('btnStart');       // Start Button

  // Event binden
  levelInput.addEventListener('input', updateInfo);                   // beim verändern Level updaten
  startBtn.addEventListener('click', () => onStart(selectedLevel));   // klick auf start -> Spiel starten

  // Enter Taste startet Spiel (nur wenn Menü aktiv und kein Overlay offen)
  document.addEventListener('keydown', (e) => {
    if (!root || root.hidden) return;
    const ov = document.getElementById('overlay');
    if(ov && !ov.hidden) return; 
    if (e.key === 'Enter') onStart(selectedLevel);
  });

  // Menü Kontrolle
  updateInfo();
}

export function openMenu(){ 
    if (root) root.hidden = false; 
}
export function closeMenu(){ 
    if (root) root.hidden = true; 
}
export function isMenuOpen(){ 
    return root && !root.hidden; 
}
export function getSelectedLevel(){ 
    return selectedLevel; 
}
