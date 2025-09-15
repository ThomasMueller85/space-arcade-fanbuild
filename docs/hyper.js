import { HYPER_DURATION, HYPER_COOLDOWN, HYPER_THRUST_MUL, HYPER_INV_BONUS, HYPER_STARS, HYPER_STAR_MAXLEN, HYPER_TUNNEL_FOCUS, HYPER_KICK } from './config.js';

let active = false; // Flag: ist Hyper aktiv?
let tLeft  = 0;     // Restdauer für die aktuelle Hyper aktivierung
let cdLeft = 0;     // Rest-Cooldown
let stars  = [];    // Array von Screen-Sternen 

// gibt den Hyper status zurück Aktiv oder nicht
export function isHyperActive() {
    return active;
}

// Multiplikator für den Schub 
export function thrustMul() {
    return active ? HYPER_THRUST_MUL : 1;
}

// Gibt die verbleibene Zeit für den Cooldowns zurück
export function cooldownLeft() {
    return cdLeft;
}

// Startet den Hyper Modus für ein Schiff
export function startHyper(ship) {
    // abbrechen , falls Hyper bereits aktiv ist oder noch im Cooldown
    if (active || cdLeft > 0) return false;
    active = true;                     // Hyper aktivieren
    tLeft = HYPER_DURATION;            // Dauer setzen
    cdLeft = HYPER_COOLDOWN;           // Cooldown starten

    // Bonus : Schiff bekommt kurz Unverwundbarkeit
    ship.inv = Math.max(ship.inv, HYPER_INV_BONUS);

    // kleines "Kickstart" Manöver -> Extra geschwindigkeit 
    const a = ship.angle;
    ship.vx += Math.cos(a) * HYPER_KICK;
    ship.vy += Math.sin(a) * HYPER_KICK;

    // Sterne für den Tunnel Effekt neu generieren 
    stars.length = 0;
    for (let i = 0; i < HYPER_STARS; i++){
        const rx = (Math.random() * 2-1) * (0.25 + (1 - HYPER_TUNNEL_FOCUS));
        const ry = (Math.random() * 2-1) * (0.25 + (1 - HYPER_TUNNEL_FOCUS));
        stars.push({ x: rx, y: ry, seed: Math.random()});
    }
    return true;   // Hyper erfolgreich gestartet
}

// Aktualisiert Hyper Status (pro Frame)
export function updateHyper(dt) {
    if (cdLeft > 0) cdLeft = Math.max(0, cdLeft - dt);      // Cooldown runterzählen
    if (!active) return;                                    // wenn inaktiv -> Fertig
    tLeft -= dt;                                            // Dauer runterzählen
    if (tLeft <= 0){                                        
        active = false;                                     // Zeit abgelaufen -> Hyper aus
    }
}

// Zeichnet den Hyperdrive Overlay Effekt 
export function drawHyperOverlay(ctx, angle, cssW, cssH){
    if(!active) return;                  // Nur Zeichnen wenn aktiv

    // Fortschritt der Hyper aktivierung (0 = Start, 1 = Ende)
    const p = 1 - (tLeft / HYPER_DURATION);     

    // Easing Funktion : beschleunigt Effekt optisch
    const ease = (x)=>-Math.pow(1-x,3);
    const amt = ease(p);

    // Bildschirmmitte + Blickrichtugn des Schiffs
    const cx = cssW/2, cy = cssH/2;
    const dirx = Math.cos(angle), diry = Math.sin(angle);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; // Additiver Blend (heller Effekt)
    ctx.lineCap = 'round';                    // runde Linienenden

    // Alle Sterne zeichnen -> jeder als Lichtstreifen
    for (const s of stars){
        // Startpunkt in Screen_Pixeln
        const sx = cx + s.x * cssW * 0.7;
        const sy = cy + s.y * cssH * 0.7;

        // Streifenlänge hängt von Fortschritt + Zufallsfaktor ab
        const jitter = 0.75 + s.seed * 0.5;
        const L = HYPER_STAR_MAXLEN * amt * jitter;

        // Linie orientiert an Blickrichtung (dirx, diry)
        const ex1 = sx - dirx * L * 0.5;
        const ey1 = sy - diry * L * 0.5;
        const ex2 = sx + dirx * L;
        const ey2 = sy + diry * L;

        // Farbe/Alpha 
        ctx.strokeStyle = `rgba(180,210,255,${0.35 + 0.65*amt})`;
        ctx.lineWidth = 2 + 4 * amt * (0.3 + s.seed*0.7);

        ctx.beginPath();
        ctx.moveTo(ex1, ey1);
        ctx.lineTo(ex2, ey2);
        ctx.stroke();
    }



    // zentraler "Tunnel-Glow"
    const grad = ctx.createRadialGradient(cx, cy, 0,
         cx, cy, Math.max(cssW, cssH)*0.5);
    grad.addColorStop(0.0, `rgba(120,180,255,${0.45*amt})`);           // Kern leuchtet stark             
    grad.addColorStop(0.4, `rgba( 40, 80,160,${0.12*amt})`);           // sanftes Blau außen
    grad.addColorStop(1.0, 'rgba(0,0,0,0)');                         // Übergang ins Nichts
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.rect(0,0,cssW,cssH);
    ctx.fill();

    ctx.restore();
}