// Mathe
export const TAU = Math.PI * 2; // Für berechnungen





//              --- Spieler Schiff ---

// Gameplay (Ship)
export const TURN     = 4;        // Drehrate (rad/s)
export const THRUST   = 380;        // Schub (px/s²)
export const FRICTION = 0.7;        // lineare Dämpfung
export const INVINCIBLE_TIME = 2.0; // Sek. Unverwundbarkeit

// Bullets
export const FIRE_COOLDOWN = 0.22; // s
export const BULLET_SPEED  = 520;  // px/s
export const BULLET_RADIUS = 2.5;  // px
export const BULLET_LIFE   = 1.2;  // s
export const MAX_BULLETS   = 6;





//       --- Asteroiden ---
export const AST_INIT_COUNT = 6;    // Startanzahl der Asteroiden 
export const AST_SPEED_MIN  = 65;   // px/s
export const AST_SPEED_MAX  = 155;  // px/s
export const COUNT_STEP     = 2;    // + große Steine je Level
export const SPEED_STEP     = 0.12; // +12% Speed je Level

// Punkte für die Highscore 3 großer Asteroid 2 Mittel und 1 klein
export const POINTS = { 3: 20, 2: 50, 1: 100 };

// Asteroiden ab Level 6
export const AST_AMBIENT_COUNT      = 4;   // wie viele extra Asteroiden
export const AST_AMBIENT_RADIUS     = 48;  // Größe der extra Asteroiden
export const AST_AMBIENT_SAFE_DIST  = 160; // Mindestabstand zum Schiff (px)





//         --- Highscores ---
export const HISC_KEY = 'asteroids_hiscores'; 
export const HISC_MAX = 5;                    // Anzahl der Highscore plätze  




//                  --- Powerups ---
export const PUP_DROP_CHANCE    = 0.15; // 15% Chance beim Zerstören
export const PUP_MAX_ON_FIELD   = 3;    // max. gleichz. Pickups
export const PUP_TTL            = 10;   // Lebensdauer in s

// Rapid
export const PUP_RAPID_FACTOR   = 0.5;  // FIRE_COOLDOWN * 0.5
export const PUP_RAPID_DURATION = 10;    // s aktiv

// Schild
export const PUP_SHIELD_DURATION = 8;   // s Unverwundbarkeit

// SlowMo
export const PUP_SLOWMO_DURATION = 5.0;       // Sekunden
export const PUP_SLOWMO_FACTOR   = 0.35;      // <1 = langsamer (0.35 = 35% Speed)

// Multishot
export const PUP_MULTI2_DURATION = 8.0; // Sekunden
export const PUP_MULTI3_DURATION = 6.0; // Sekunden
export const MULTI_SPREAD_DEG = { 2: 12, 3: 16 }; // Streuwinkel pro Seite
export const PUP_MULTI_CD_FACTOR = { 1: 1.00, 2: 1.10, 3: 1.20 }; // etwas längerer Cooldown   
 
// Gewichtung, welche Powerups häufiger droppen
export const PUP_WEIGHTS = { 
    rapid: 2, 
    shield: 2, 
    oneup: 1,
    rocket: 2,
    slowmo: 2,
    multi2: 2,
    multi3: 1,
};






//    ---   Raketen   ---
export const ROCKET_PICKUP_AMMO  = 3;    // wie viele Raketen pro pickup
export const ROCKET_COOLDOWN     = 0.6;  // s zwischen Raketen
export const ROCKET_SPEED        = 320;  // px/s
export const ROCKET_ACCEL        = 420;  // optimaler schub (0 = aus)
export const ROCKET_TURN_RATE    = 4.2;  // rad/s (Lenkgeschwindigkeit)
export const ROCKET_LIFETIME     = 4.5;  // s
export const ROCKET_HIT_RADIUS   = 14;   // direkter Treffer
export const ROCKET_BLAST_RADIUS = 85;   // Splash Radius
export const ROCKET_BASE_DMG     = 24;   // Direktschaden
export const ROCKET_BLAST_DMG    = 16;   // Splash Schaden 

// --- Rocket Trail ---
export const ROCKET_TRAIL_SPAWN = 0.028; // s; wie oft ein Ghost-Sample entsteht (~36 Hz)
export const ROCKET_TRAIL_TTL   = 0.36;  // s; Lebensdauer eines Ghosts
export const ROCKET_TRAIL_BASE  = 8;     // px; Grundradius des Ghosts
export const ROCKET_TRAIL_MAX   = 600;   // Obergrenze, um CPU zu schonen

// Seismic Schockwave 
export const SHOCKWAVE_SPEED      = 520;  // px/s
export const SHOCKWAVE_THICK      = 22;   // Strichdicke der Welle
export const SHOCKWAVE_DURATION   = 1.3; // s bis die Welle verschwindet
export const BLAST_RING_SHOW_TIME = 0.30; // s sichtbarer AoE-Ring (ROCKET_BLAST_RADIUS)

// Seismic Sound
export const SEISMIC_DELAY_MS     = 130;   // kurze Stille vor dem "BOOM"
export const SEISMIC_RUMBLE_MS    = 220;   // Gamepad Rumble Dauer
export const SEISMIC_DUCK_DROP    = 0.35;  // Musik kurz absenken 
export const SEISMIC_DUCK_HOLD    = 700;   // wie lange geduckt bleibt (ms)






//    ---  Boss UFO  ---
export const BOSS_EVERY = 5;      // Jede 5 Welle
export const UFO_RADIUS = 45;     // Größe des Ufos
export const UFO_MAX_SPEED = 165; // px/s
export const UFO_ACCEL = 250;     // px/s
export const UFO_SCORE = 500;     // Punkte für Kill
export const UFO_SAFE_DIST = 200; // Spawn Abstand zum Schiff
export const UFO_HP_BASE = 3;     // Lebenspunkte
export const UFO_HP_PER_TIER = 0; // plus 1 Leben je weiterem Boss
export const UFO_IFRAME = 2;      // unverwundbarkeit in sekunden 

// UFO FIRE
export const UFO_FIRE_LEVEL_MIN   = 10;     // ab diesem LEvel schießt das UFO
export const UFO_FIRE_COOLDOWN    = 0.9;    // Sekunden zwischen Schüssen
export const UFO_AIM_JITTER       = 0.08    // Zielrauschenp
export const UFO_MUZZLE_OFFSET    = 8;      // Starpunkt leicht vor der Nase
export const SHIP_IFRAME          = 0.8;    // Sekunden Unverwundbarkeit nach Treffer
export const UFO_BULLET_DMG       = 1;      // Schaden pro UFO-Treffer

// === UFO Laser Look & Timing ===
export const UFO_LASER_CORE    = '#22d3ee';                 // Kern (cyan)
export const UFO_LASER_GLOW_1  = 'rgba(34,211,238,0.95)';   // innerer Glow
export const UFO_LASER_GLOW_2  = 'rgba(34,211,238,0.55)';   // äußerer Glow
export const UFO_LASER_TINT    = 'rgba(80,240,255,0.20)';   // dezenter Schimmer

export const UFO_LASER_TAIL    = 1.10;  // Tail-Faktor (Länge nach hinten)
export const UFO_LASER_HEAD    = 0.16;  // kurzer Head nach vorn
export const UFO_BLUR_PX       = 1.2;   // Canvas-Blur in px
export const UFO_TRAIL_TAPS    = 2;     // „Geister“-Samples fürs Nachziehen
export const UFO_SHOT_SPEED    = 280;   // px/s
export const UFO_SHOT_RADIUS   = 2.2;   // px
export const UFO_SHOT_LIFE     = 2.0;   // s

// === UFO Streak (nur UFOs) ===
export const UFO_STREAK_START = 11;  // inkl.
export const UFO_STREAK_END   = 14;  // inkl.
export const UFO_STREAK_BASE  = 2;   // L11 
export const UFO_STREAK_STEP  = 1;   // pro Level +1 (L12=2, L13=3, L14=4)

// === UFO-Formation ===
export const UFO_FORMATION_ENABLED    = true;     // Formation an/aus
export const UFO_FORMATION_TYPE       = 'vee';    // z.B. 'vee' | 'line' | 'block' (muss von buildSlots unterstützt werden)
export const UFO_FORMATION_SPACING    = 48;       // Abstand zwischen Slots (px)
export const UFO_FORMATION_DISTANCE   = 260;      // Abstand hinter dem Spieler (px)
export const UFO_FORMATION_MAX_SQUAD  = 6;        // Max. UFOs im Squad

export const UFO_FORMATION_TURN_RATE  = 3.2;      // wie schnell die Ausrichtung zum Slot gedreht wird (rad/s)
export const UFO_FORMATION_COHESION   = 1.25;     // wie stark sie in den Slot "gezogen" werden (Dämpfung)






//                --- TIE-Fighter  ---
export const TIE_START_LEVEL     = 6;   // ab diesem Level TIEs spawnen
export const TIE_SCORE           = 500; // Punkte pro TIE

// Bewegung & Größe
export const TIE_RADIUS          = 18;  // Kollisions-/Zeichnungsradius
export const TIE_BASE_SPEED      = 50;  // Grundspeed (px/s)
export const TIE_SPEED_PER_TIE   = 6;   // zusätzl. Speed pro gleichzeitigem TIE
export const TIE_SPEED_ADD_MAX   = 80;  // Deckel für Zusatzspeed

// Spawn-Wave-Größe
export const TIE_SPAWN_BASE      = 4;   // Basisanzahl in Level TIE_START_LEVEL
export const TIE_SPAWN_PER_LEVEL = 1; // Zuwachs je Level darüber
export const TIE_SPAWN_CAP       = 8;   // maximale TIEs pro Wave

// Spawn-Sicherheit
export const TIE_SAFE_DIST_FRACTION = 0.20; // Abstand zum Spieler relativ zur Breite (0.2 = 20% der Breite)

// Anzeige (Farben/Linien) – optional, für einheitlichen Look
export const TIE_STROKE          = '#cfd3db';
export const TIE_LINE_WIDTH      = 2;

// --- TIE Haltbarkeit ---
export const TIE_HP      = 2;    // Trefferpunkte je TIE
export const TIE_IFRAME  = 1;  // Unverwundbarkeit nach Treffer (Sek.)

// --- TIE Schüsse ---
export const TIE_FIRE_COOLDOWN = 2;  // s zwischen Schüssen je TIE
export const TIE_BULLET_SPEED  = 250;  // px/s
export const TIE_BULLET_RADIUS = 2.5;  // px
export const TIE_BULLET_LIFE   = 1.2;  // s
export const TIE_AIM_JITTER    = 0.12; // Zielrauschen (rad)

export const TIE_LASER_CORE   = '#ff3b3b';     // Kern
export const TIE_LASER_GLOW_1 = 'rgba(255,60,60,0.85)';
export const TIE_LASER_GLOW_2 = 'rgba(255,150,150,0.55)';
export const TIE_LASER_GLOW_3 = 'rgba(255,60,60,0.0)'; // transparentes Tail-Ende
export const TIE_LASER_TAIL   = 18;            // Tail-Länge (px) -> gern tweaken

// --- TIE Ausrichtung & Mündung ---
export const TIE_DRAW_ROT       = Math.PI / 2; // Rotations-Offset beim Zeichnen (90°)
export const TIE_MUZZLE_OFFSET  = 0;           // Schuss-Startabstand vom Zentrum (px)

// Formation 
export const TIE_FORMATION_ENABLED   = true;    // an/aus
export const TIE_FORMATION_TYPE      = 'wedge'; // 'wedge' 'line' 'box'
export const TIE_FORMATION_SPACING   = 28;      // Abstand zwischen Slots (px)
export const TIE_FORMATION_DISTANCE  = 140;     // Abstand der Formationsmitte hinter dem Spieler
export const TIE_FORMATION_TURN_RATE = 8;       // wie "snappy" die Richtung geändert wird (höher = schneller)
export const TIE_FORMATION_COHESION  = 0.8;     // wie stark sie am "slot" kleben (0..1)
export const TIE_FORMATION_MAX_SQUAD = 12;      // optional Max Ties in Formation
 





//             --- Schütteleffekt bei Treffern  ---
export const SHAKE_DECAY          = 1.8;  // Trauma-Abbau pro Sekunde
export const SHAKE_MAX_XY         = 16;   // max. Versatz in px
export const SHAKE_MAX_ROT        = 0.02; // max. Rotation in rad
export const SHAKE_TRAUMA_POW     = 2.0;  // nonlineare Kurve: intensity = trauma^POW

// typische „Stöße“ für Events 
export const SHAKE_POWER_ASTEROID = 0.20;
export const SHAKE_POWER_TIE      = 0.25;
export const SHAKE_POWER_SHIPHIT  = 0.90;
export const SHAKE_POWER_BOSS     = 0.80;

export const SHAKE_SHIPHIT_ECHO    = 0.45; // Stärke des Nachbebens
export const SHAKE_SHIPHIT_ECHO_DELAY = 50; // ms bis zum Echo






//          --- Hyperdrive ---
export const HYPER_KEY          = 'l';  // Taste für Lightspeed
export const HYPER_DURATION     = 1;    // s aktiv
export const HYPER_COOLDOWN     = 8.0;  // s Sperre nach Nutzung
export const HYPER_THRUST_MUL   = 2.6;  // Multiplikator für THRUST
export const HYPER_INV_BONUS    = 2;  // s Unverwundbarkeit

export const HYPER_STARS        = 140;  // Anzahl Sternenstreifen 
export const HYPER_STAR_MAXLEN  = 380;  // px maximale Streifenlänge
export const HYPER_TUNNEL_FOCUS = 0.65; // 0..1: je kleiner, desto mehr auf mitte gebündelt
export const HYPER_KICK         = 200;  // extra beschleunigung für Hyperspeed







//       ---   Starfield (Hintergrund)   ---
export const STARFIELD_COUNT       = 148; // Anzahl Sterne
export const STARFIELD_LAYERS      = 3;   // Tiefenebenen für leichte unterschiede
export const STARFIELD_TWINKLE_MIN = 1.0; // Hz: min "Blink" Frequenz
export const STARFIELD_TWINKLE_MAX = 2.2; // Hz: max "Blink" Frequenz
export const STARFIELD_MIN_R       = 0.8; // px: kleinste Sterne
export const STARFIELD_MAX_R       = 2.4; // px: größte Sterne
export const STARFIELD_DRIFT       = 6;   // px/s: sehr langsames Linksdriften (Das all bewegt sich)






//           --- Todestern (deathstar) ---
export const SIZE              = 620;   // Durchmesser (riesig)
export const HP_MAX            = 25;    // Lebenspunkte
export const WEAK_R            = 45;    // Radius der Schwachstelle
export const DWELL_TIME        = 6.0;   // Sekunden pro “Auftauchen”
export const WARP_DELAY        = 0.6;   // kleine Ausblendpause beim Warpen
export const FIRE_INTERVAL     = 1;     // Schussfrequenz pro Kanone
export const SHOT_SPEED        = 160;   // Projektilgeschwindigkeit
export const SHOT_R            = 5;     // Projektilradius
export const CANNONS           = 4;     // Anzahl Kanonen
export const SPAWN_FADE_TIME   = 0.5;   // Einblenden beim Auftauchen
export const CHARGE_TIME       = 2.5;   // Aufladen (kein Feuer)
export const FIRE_BURST_TIME   = 1.0;   // aktive Feuerphase

// Todestern Bullets
export const BOSS_LASER_CORE   = '#ff3b3b';
export const BOSS_LASER_GLOW_1 = 'rgba(255,120,120,0.95)';
export const BOSS_LASER_GLOW_2 = 'rgba(255,60,60,0.55)';
export const BOSS_LASER_TINT   = 'rgba(255,30,30,0.18)'; 
export const BOSS_LASER_TAIL   = 1.15;                      // Tail-Faktor (Länge * Faktor)
export const BOSS_LASER_HEAD   = 0.18;                      // kurzer Head nach vorn
export const BOSS_LASER__BASE_LIFE = 3.5;    
// Motion-Blur
export const BOSS_BLUR_PX  = 1.4;   // Gaussian blur in px (Canvas filter)
export const BOSS_TRAIL_TAPS = 3;   // zusätzliche „Geister“-Samples entlang Flugrichtung