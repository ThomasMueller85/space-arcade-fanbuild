export function drawHUD(ctx, { lives, score, level, destroyed, best, hyper, rockets }) {
  ctx.save();

  // Panel Größe
  const x = 10, y = 10;
  const w = 200, h = 245; // ← etwas höher, damit eine Zeile mehr reinpasst
  const pad = 10;
  const r = 12;

  // Hintergrund & Rahmen
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.strokeStyle = '#4a6a91';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.stroke();

  // Text & Startposition
  ctx.fillStyle = '#eaeef7';
  ctx.font = '14px system-ui';

  let yy = y + pad + 16;
  const lh = 20;

  // ❤️ Lives
  ctx.fillText(`❤️ Lives: ${Math.max(lives, 0)}`, x + pad, yy);

  // 🏆 Score
  yy += lh;
  ctx.fillText(`🏆 Score: ${score}`, x + pad, yy);

  // 🚀 Level
  yy += lh;
  ctx.fillText(`🚀 Level: ${level}`, x + pad, yy);

  // 💙 Seismic-Rockets (NEU – falls vorhanden)
  if (rockets) {
    yy += lh;
    drawSeismicHUDLine(ctx, x + pad, yy, rockets);
  }

  // 💥 Destroyed
  yy += lh;
  ctx.fillText(`💥 Destroyed: ${destroyed}`, x + pad, yy);

  // ⭐ Best
  yy += lh;
  ctx.fillText(`⭐ Best: ${best}`, x + pad, yy);

  // Hinweise …
  ctx.fillStyle = '#a9c1ff';
  yy += lh + 6;
  ctx.fillText('H: Highscores anzeigen', x + pad, yy);
  yy += lh;
  ctx.fillText('M: Sound an/aus', x + pad, yy);
  yy += lh;
  ctx.fillText('P: Pause', x + pad, yy);

  // Hyper …
  if (hyper) {
    yy += lh;
    const ready   = !hyper.active && (hyper.cd <= 0);
    const cdLeft  = Math.max(0, hyper.cd || 0);
    const cdTotal = Math.max(0.0001, hyper.cdMax || 0.0001);
    const prog    = Math.max(0, Math.min(1, 1 - cdLeft / cdTotal));

    let label, color;
    if (hyper.active) { label = `⚡ Hyper (${(hyper.key||'').toUpperCase()}): ACTIVE`; color = '#00e5ff'; }
    else if (ready)   { label = `⚡ Hyper (${(hyper.key||'').toUpperCase()}): READY`;  color = '#7CFC00'; }
    else              { label = `⚡ Hyper (${(hyper.key||'').toUpperCase()}): ${cdLeft.toFixed(1)}s`; color = '#ffcc66'; }

    ctx.fillStyle = color;
    ctx.fillText(label, x + pad, yy);

    const barX = x + pad;
    const barY = yy + 6;
    const barW = w - pad * 2;
    const barH = 6;

    ctx.strokeStyle = '#4a6a91';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(barX, barY + 8, barW, barH, 3);
    ctx.stroke();

    const fillW = barW * (hyper.active ? 1 : prog);
    ctx.fillStyle = hyper.active ? 'rgba(0,229,255,0.8)' : (ready ? 'rgba(124,252,0,0.7)' : 'rgba(255,204,102,0.7)');
    ctx.beginPath();
    ctx.roundRect(barX, barY + 8, fillW, barH, 3);
    ctx.fill();

    ctx.fillStyle = '#eaeef7';
  }

  ctx.restore();
}

function drawSeismicHUDLine(ctx, x, y, rockets) {
  const t = performance.now() * 0.001;

  // 1) Icon mit blauem Glow
  drawSeismicIcon(ctx, x + 10, y - 6, 9, t); // (cx, cy, size, t)

  // 2) Text „Seismic-Rockets: n“
  ctx.fillStyle = '#eaeef7';
  ctx.fillText(`Seismic-Rockets: ${Math.max(0, rockets.ammo|0)}`, x + 24, y);

  // 3) Kleiner CD-Balken (optional)
  if (rockets.cd > 0 && rockets.cdMax > 0) {
    const barX = x + 24, barY = y + 6;
    const barW = 90,     barH = 4;
    const prog = 1 - Math.min(1, rockets.cd / rockets.cdMax);

    ctx.strokeStyle = '#4a6a91';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(96,165,250,0.85)'; // blau
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * prog, barH, 2);
    ctx.fill();
  }
}

function drawSeismicIcon(ctx, cx, cy, size, t) {
  // Additiver Glow
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  const pulse = 1 + 0.25 * Math.sin(t * 6.0);
  const glowR = size * 1.2 * pulse;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
  g.addColorStop(0.00, 'rgba(140,200,255,0.55)');
  g.addColorStop(0.60, 'rgba(80,150,255,0.35)');
  g.addColorStop(1.00, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = prev;

  // Körper mit Volumen
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineWidth = 2;
  const lg = ctx.createLinearGradient(-size, 0, size, 0);
  lg.addColorStop(0.00, '#111827');
  lg.addColorStop(0.50, '#334155');
  lg.addColorStop(1.00, '#0b1220');
  ctx.fillStyle = lg;
  ctx.strokeStyle = '#e2e8f0';

  ctx.beginPath();
  ctx.moveTo( size, 0);
  ctx.lineTo( size*0.36,  size*0.32);
  ctx.lineTo(-size*0.62,  size*0.26);
  ctx.lineTo(-size*0.62, -size*0.26);
  ctx.lineTo( size*0.36, -size*0.32);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Finnen
  ctx.strokeStyle = '#93c5fd';
  ctx.beginPath();
  ctx.moveTo(-size*0.34, -size*0.52); ctx.lineTo(-size*0.08, 0); ctx.lineTo(-size*0.66, -size*0.16);
  ctx.moveTo(-size*0.34,  size*0.52); ctx.lineTo(-size*0.08, 0); ctx.lineTo(-size*0.66,  size*0.16);
  ctx.stroke();

  // Highlight
  ctx.strokeStyle = 'rgba(230,243,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(size*0.32, -size*0.18); ctx.lineTo(size*0.66, -size*0.08);
  ctx.stroke();

  ctx.restore();
}