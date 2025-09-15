export function rand(min, max) {
    // Math.random erzeugt eine zufallszahl zwischen 0 und 1 
    // Multipliziert mit (max - min) -> ergibt den Bereich auf die gewünschte größe
    // + min sorgt dafür das er nicht min ist 
    return Math.random() * (max - min) + min;
}

export function dist2(a, b) {
    // Abstand in x Richtung (Differenz der X Koordinaten)
    const dx = a.x - b.x, 
    // Abstand in y Richtung (Differenz der Y Koordinaten)
    dy = a.y - b.y;

    // gibt die quadrierte Distanz zurück
    return dx * dx + dy * dy;
}

// Wrap an Bildschirmrändern (achtet auf .radius oder .r)
export function wrap(obj, w, h) {
  const rad = (obj.radius ?? obj.r ?? 0);
  if (obj.x < -rad) obj.x = w + rad;
  if (obj.x >  w + rad) obj.x = -rad;
  if (obj.y < -rad) obj.y = h + rad;
  if (obj.y >  h + rad) obj.y = -rad;
}

// Canvas komplett löschen (transform-neutral)
export function clearAll(ctx, canvas) {
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}
