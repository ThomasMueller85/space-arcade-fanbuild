export function clamp (v, a, b) {return Math.max(a, Math.min(b, v)); }

export function lerp (a, b, t) {return a + (b - a) * t;}

export function angleTo ( dx, dy ) {return Math.atan2 (dy, dx); }

export function rotatePoint (px, py, ang) {
    const c = Math.cos(ang), s = Math.sin (ang);
    return { x: px * c - py * s, y: px * s + py * c};
}

// sanfte Winkel Annäherung
export function turnTowards (current, target, rate, dt) {
    let da = ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const maxStep = rate * dt;
    da = clamp(da, -maxStep, +maxStep);
    return current + da;
}