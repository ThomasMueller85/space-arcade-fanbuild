// hiscore_io.js
const HEADER = '# Asteroids Highscores v1\n';    // Kopfzeile für die Textdatei
const DB_NAME = 'asteroids-hs';                  // Name der IndexedDB
const STORE   = 'fs';                            // Objekt Store Name
const DIR_KEY = 'dirHandle';                     // Key unter dem das Dir Handle liegt
const FILE_NAME = 'highscores.txt';              // Zieldatei im Ordner

// ---------- Feature-Check ----------
function hasFS() {
  return !!(window.showDirectoryPicker && window.FileSystemHandle); 
}

// ---------- IndexedDB Mini-Helpers ----------
function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);                             // DB öffnen/erstellen
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);    // Store anlegen
    req.onsuccess = () => resolve(req.result);                          // DB Handle liefern
    req.onerror = () => reject(req.error);                              // Fehler weitergeben
  });
}

async function idbGet(key) {
  const db = await idbOpen();                       // DB öffnen
  return new Promise((resolve, reject) => {         
    const tx = db.transaction(STORE, 'readonly');   // Readonly Transaktion
    const st = tx.objectStore(STORE);               // Store holen
    const req = st.get(key);                        // Wert lesen
    req.onsuccess = () => resolve(req.result);      // Wert zurückgeben
    req.onerror = () => reject(req.error);          // Fehler weitergeben
  });
}

async function idbSet(key, val) {
  const db = await idbOpen();                       // DB öffnen
  return new Promise((resolve, reject) => {         
    const tx = db.transaction(STORE, 'readwrite');  // Schreib Transaktion
    const st = tx.objectStore(STORE);               // Store holen
    const req = st.put(val, key);                   // Wert speichern
    req.onsuccess = () => resolve();                // ok
    req.onerror = () => reject(req.error);          // Fehler weitergeben 
  });
}

// ---------- Parser/Serializer ----------
function parse(text) {
  const lines = text.split(/\r?\n/).filter(l => l && !l.startsWith('#'));               // Zeilen ohne Kommentare
  const arr = [];
  for (const line of lines) {
    const [tsStr, nameRaw, scoreStr] = line.split(';');                                 // Format: ts;name;score
    const ts    = Number(tsStr);                                                        // Zeitstempel als Zahl
    const score = Number(scoreStr);                                                     // Score als Zahl
    const name  = (nameRaw ?? 'PLAYER').trim();                                         // Name säubern, Default
    if (Number.isFinite(ts) && Number.isFinite(score)) arr.push({ ts, name, score });   // Nur gültige Zahlen 
  }
  return arr;     // Liste von Einträgen zurück                                  
}

function serialize(list, max = 5) {                                         
  const trimmed = list.slice(0, max);                                           // nur Top 5
  const body = trimmed.map(x => `${x.ts};${x.name};${x.score}`).join('\n');     // Zeilen bauen
  return HEADER + body + (body ? '\n' : '');                                    // Header + Body 
}

// ---------- Permission ----------
async function verifyPerm(handle, mode = 'readwrite') {
  // schon gewährt?
  const cur = await handle.queryPermission?.({ mode });     // aktueller Status abfragen
  if (cur === 'granted') return true;                       // Wenn bereits gewährt
  // anfragen (muss durch User-Geste getriggert sein)       
  const res = await handle.requestPermission?.({ mode });   // Berechtigung anfordern
  return res === 'granted';                                 // Erfolg ?
}

// ---------- Directory Handling ----------
let dirHandle = null;                                       // Gemerkter Ordner handle

export async function chooseHighscoreDir() {
  if (!hasFS()) throw new Error('File System Access API nicht verfügbar');          // Browser Support prüfen
  // User wählt den Asteroids-Ordner
  const handle = await window.showDirectoryPicker();                                // Ordner Auswahl öffnen
  const ok = await verifyPerm(handle, 'readwrite');                                 // Schreibrechte Prüfen/Anfordern
  if (!ok) throw new Error('Keine Schreibrechte für ausgewählten Ordner');          
  dirHandle = handle;                                                               // merken
  await idbSet(DIR_KEY, handle); // FileSystemDirectoryHandle ist serialisierbar    // Handle in IndexedDB
  return handle;                                                                    // zurückgeben
}

async function getSavedDir() {
  if (dirHandle) return dirHandle;          // breits im RAM?
  const saved = await idbGet(DIR_KEY);      // aus IndexedDB laden
  if (saved) dirHandle = saved;             // in RAM cachen
  return dirHandle;                         // ggf. null
}

export async function ensureHighscoreDir() {
  if (!hasFS()) return null;                                                // kein FS -> kein Ordner
  let handle = await getSavedDir();                                         // gespeicherten Ordner holen
  if (!handle) {
    // Erste Einrichtung: Benutzer soll den Asteroids-Ordner auswählen
    handle = await chooseHighscoreDir();                                    // Auswahl erzwingen
  } else {
    // Sicherstellen, dass Permission noch gültig ist   
    const ok = await verifyPerm(handle, 'readwrite');                       // Rechte prüfen
    if (!ok) {
      // erneut auswählen lassen
      handle = await chooseHighscoreDir();                                   // neu wählen
    }
    dirHandle = handle;                                                      // aktualisieren
  }
  return handle;                                                             // finaler handle
}

async function ensureHighscoreFile() {
  if (!hasFS()) return null;                                                 // kein FS -> keine Datei
  const dir = await ensureHighscoreDir();                                    // Ordner sicherstellen
  const fileHandle = await dir.getFileHandle(FILE_NAME, { create: true });   // Datei holen
  return fileHandle;                                                         // Datei Handle zurück
}

// ---------- Public API ----------
export async function loadHighscoresFromFile() {
  if (!hasFS()) {
    // Kein FS → leer zurück (du kannst optional Download-Fallback laden)
    return [];
  }
  const fh = await ensureHighscoreFile();       // Datei Handle holen
  const file = await fh.getFile();              // Datei lesen
  const text = await file.text();               // Inhalt als Text
  return parse(text);                           // In Objekt parsen
}

export async function saveHighscoresToFile(list, max = 5) {
  if (!hasFS()) {                                       
    // Fallback: als Download anbieten
    downloadHighscores(list, max);                          // Datei als Download erzeugen
    return;
  }
  const fh = await ensureHighscoreFile();                   // Datei Handle holen
  const writable = await fh.createWritable();               // Writable Stream öffnen
  await writable.write(serialize(list, max));               // Text Schreiben
  await writable.close();                                   // Stream schließen
}

export function downloadHighscores(list, max = 5) {
  const text = serialize(list, max);                        // Text generieren
  const blob = new Blob([text], { type: 'text/plain' });    // Blob aus Text
  const a = document.createElement('a');                    // Download Link erstellen
  a.href = URL.createObjectURL(blob);                       // Blob URL setzen
  a.download = FILE_NAME;                                   // Deteiname
  document.body.appendChild(a);                             // ins DOM hängen (für klick)
  a.click();                                                // Download starten
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);    // Aufräumen
}

