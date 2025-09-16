// Bündelt alle Kollisionen/Hit-Handler an einem Ort.

export function handleBulletAsteroidHits(state, {
  sfx, POINTS, dist2, getAsteroids, getBullets, removeBulletAt, destroyAsteroidAt, maybeDropFromAsteroid
}) {
  const asts = getAsteroids();
  const bullets = getBullets();

  outer: for (let i = asts.length - 1; i >= 0; i--) {
    const a = asts[i];
    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j];
      const r2 = (a.r + b.r) ** 2;
      if (dist2(a, b) < r2) {
        sfx.explosion();
        removeBulletAt(j);
        const dead = destroyAsteroidAt(i);
        state.score += (POINTS[dead.level] || 0);
        state.destroyedCount += 1;
        maybeDropFromAsteroid(dead);
        break outer;
      }
    }
  }
}

export function handleShipUfoBulletHits(state, {
  dist2, getUfoShots, addShipHitShake, rumble, INVINCIBLE_TIME
}) {
  const { ship } = state;
  if (state.gameOver || ship.inv > 0) return;

  const shots = getUfoShots();
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    const r2 = (s.r + ship.radius) ** 2;
    if (dist2(s, ship) < r2) {
      state.lives -= 1;
      addShipHitShake();
      rumble(1.0, 500);
      ship.x = state.CSS_W / 2;
      ship.y = state.CSS_H / 2;
      ship.vx = ship.vy = 0;
      ship.angle = -Math.PI / 2;
      ship.inv = INVINCIBLE_TIME;
      shots.splice(i, 1);
      if (state.lives < 0) state.gameOver = true;
      break;
    }
  }
}

export function handleShipAsteroidHit(state, {
  INVINCIBLE_TIME, dist2, getAsteroids, addShipHitShake, rumble}) {
  const { ship } = state;
  if (state.gameOver || ship.inv > 0) return;

  for (const a of getAsteroids()) {
    const r2 = (a.r + ship.radius) ** 2;
    if (dist2(a, ship) < r2) {
      state.lives -= 1;
      addShipHitShake?.();
      rumble?.(1.0, 500);
      ship.x = state.CSS_W / 2;
      ship.y = state.CSS_H / 2;
      ship.vx = ship.vy = 0;
      ship.angle = -Math.PI / 2;
      ship.inv = INVINCIBLE_TIME;
      if (state.lives < 0) state.gameOver = true;
      break;
    }
  }
}

export function handleShipUfoHit(state, {
  INVINCIBLE_TIME, dist2, isUfoActive, getUfos, addShipHitShake, rumble
}) {
  const { ship } = state;
  if (state.gameOver || ship.inv > 0 || !isUfoActive()) return;

  for (const u of getUfos()) {
    const r2 = (u.r + ship.radius) ** 2;
    if (dist2(u, ship) < r2) {
      state.lives -= 1;
      addShipHitShake();
      rumble(1.0, 500);
      ship.x = state.CSS_W / 2;
      ship.y = state.CSS_H / 2;
      ship.vx = ship.vy = 0;
      ship.angle = -Math.PI / 2;
      ship.inv = INVINCIBLE_TIME;
      if (state.lives < 0) state.gameOver = true;
      return;
    }
  }
}

export function handleBulletUfoHits(state, {
  sfx, bgm, UFO_SCORE, dist2, getBullets, getUfos, removeBulletAt, damageUfo, isUfoActive, maybeDropFromAsteroid
}) {
  if (!isUfoActive()) return;
  const bs = getBullets();
  const ufos = getUfos();

  outer: for (let j = bs.length - 1; j >= 0; j--) {
    const b = bs[j];
    for (const u of ufos) {
      const r2 = (u.r + b.r) ** 2;
      if (dist2(u, b) < r2) {
        removeBulletAt(j);
        const dead = damageUfo(u, 1);
        if (dead) {
          sfx.explosion();
          state.score += UFO_SCORE;
          state.destroyedCount += 1;
          maybeDropFromAsteroid({ x: dead.x, y: dead.y });
          if (!isUfoActive()) bgm.toMain(600);
        }
        break outer;
      }
    }
  }
}

export function handleBulletTieHits(state, {
  sfx, TIE_SCORE, TIE_IFRAME, dist2, getBullets, getTies, removeBulletAt, destroyTieAt, maybeDropFromAsteroid
}) {
  const bs = getBullets();
  const ts = getTies();

  for (let i = ts.length - 1; i >= 0; i--) {
    const t = ts[i];
    for (let j = bs.length - 1; j >= 0; j--) {
      const b = bs[j];
      const r2 = (t.r + b.r) ** 2;
      if (dist2(t, b) < r2) {
        removeBulletAt(j);

        if (t.ifr > 0) continue;

        t.hp -= 1;
        if (t.hp <= 0) {
          const dead = destroyTieAt(i);
          sfx.explosion();
          state.score += TIE_SCORE;
          state.destroyedCount += 1;
          if (dead) maybeDropFromAsteroid({ x: dead.x, y: dead.y });
        } else {
          t.ifr = TIE_IFRAME;
        }
        break;
      }
    }
  }
}

export function handleShipTieHit(state, {
  INVINCIBLE_TIME, dist2, getTies, addShipHitShake, rumble
}) {
  const { ship } = state;
  if (state.gameOver || ship.inv > 0) return;

  for (const t of getTies()) {
    const r2 = (t.r + ship.radius) ** 2;
    if (dist2(t, ship) < r2) {
      state.lives -= 1;
      addShipHitShake();
      rumble(1.0, 500);
      ship.x = state.CSS_W / 2;
      ship.y = state.CSS_H / 2;
      ship.vx = ship.vy = 0;
      ship.angle = -Math.PI / 2;
      ship.inv = INVINCIBLE_TIME;
      if (state.lives < 0) state.gameOver = true;
      break;
    }
  }
}

export function handleShipTieBulletHits(state, {
  INVINCIBLE_TIME, dist2, getTieShots, addShipHitShake, rumble
}) {
  const { ship } = state;
  if (state.gameOver || ship.inv > 0) return;

  const shots = getTieShots();
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    const r2 = (s.r + ship.radius) ** 2;
    if (dist2(s, ship) < r2) {
      state.lives -= 1;
      addShipHitShake();
      rumble(1.0, 500);
      ship.x = state.CSS_W / 2;
      ship.y = state.CSS_H / 2;
      ship.vx = ship.vy = 0;
      ship.angle = -Math.PI / 2;
      ship.inv = INVINCIBLE_TIME;
      shots.splice(i, 1);
      if (state.lives < 0) state.gameOver = true;
      break;
    }
  }
}

export function handleShipDeathstarBulletHits(state, {
  INVINCIBLE_TIME, dist2, getDeathstarShots, addShipHitShake, rumble
}) {
  const { ship } = state;
  if (state.gameOver || ship.inv > 0) return;

  const ds = getDeathstarShots();
  for (let i = ds.length - 1; i >= 0; i--) {
    const s = ds[i];
    const r2 = (s.r + ship.radius) ** 2;
    if (dist2(s, ship) < r2) {
      state.lives -= 1;
      addShipHitShake();
      rumble(1.0, 500);
      ship.x = state.CSS_W / 2;
      ship.y = state.CSS_H / 2;
      ship.vx = ship.vy = 0;
      ship.angle = -Math.PI / 2;
      ship.inv = INVINCIBLE_TIME;
      ds.splice(i, 1);
      if (state.lives < 0) state.gameOver = true;
      break;
    }
  }
}



