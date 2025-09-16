const HEADER = '# Highscores v1\n';
const FILE_NAME = 'highscores.txt';

// ---------- Parser/Serializer ----------
function parseServerData(data, game) {
  console.log("📥 parseServerData Input:", data);

  let arr = [];
  if (Array.isArray(data.highscore)) {
    arr = data.highscore;
  } else {
    return [];
  }

  return arr.map(entry => ({
    name: entry.name ?? 'PLAYER',
    score: Number(entry.score ?? 0)
  })).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}


function serialize(list, max = 5) {
  const trimmed = list.slice(0, max);
  const body = trimmed.map(x => `${x.ts};${x.name};${x.score ?? x.zeit}`).join('\n');
  return HEADER + body + (body ? '\n' : '');
}

// ---------- Public API ----------
export async function loadHighscoresFromFile(game = "astoroids") {
  try {
    const res = await fetch(`/highscore/${game}`);
    if (!res.ok) throw new Error("HTTP-Fehler beim Laden");
    const data = await res.json();
    console.log(`🔍 Highscore Response (${game}):`, data);

    return parseServerData(data, game);
  } catch (err) {
    console.error(`Fehler beim Laden der ${game}-Highscores:`, err);
    return [];
  }
}export async function saveHighscoresToFile(list, game = "astoroids", max = 5) {
  // Defensive: falls caller (list, max) übergeben hat -> swap
  if (typeof game === 'number') {
    console.warn('saveHighscoresToFile: 2. Parameter ist Number -> treat as max, use default game "astoroids".');
    max = game;
    game = "astoroids";
  }
  max = Number(max) || 5;

  // sortieren
  const sorted = (game === "snake")
    ? [...list].sort((a, b) => (a.zeit ?? 0) - (b.zeit ?? 0))
    : [...list].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const trimmed = sorted.slice(0, max);

  // Payload: KEY muss das spiel sein (z.B. "astoroids")
  const payload = { highscore: trimmed };

  // LOGS + Stacktrace um zu sehen, wer die Funktion aufruft
  console.log('📤 Speichere Highscores ->', `/highscore/${game}`, 'game type:', typeof game, 'max:', max);
  console.log('📤 payload:', payload);
  console.trace();

  try {
    const res = await fetch(`/highscore/${game}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // lese Antworttext zur Diagnose
    const text = await res.text();
    console.log('⤴ Server antwortet:', res.status, res.ok, text);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    // direkt verifizieren: nochmal vom Server laden und loggen
    try {
      const verify = await loadHighscoresFromFile(game);
      console.log('🔁 Verify load after save:', verify);
    } catch (e) {
      console.warn('Fehler bei Verifikation nach Save:', e);
    }

  } catch (err) {
    console.error('Fehler beim Speichern der Highscores (fallback download):', err);
    // Fallback: Datei zum Download anbieten
    downloadHighscores(list, max);
  }
}




export function downloadHighscores(list, max = 5) {
  const text = serialize(list, max);
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = FILE_NAME;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

// Aliase für Kompatibilität
export const loadHighscores  = loadHighscoresFromFile;
export const saveHighscores  = saveHighscoresToFile;
