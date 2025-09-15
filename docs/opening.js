import { initStarfield, resizeStarfield, updateStarfield, drawStarfield } from './starfield.js';
import { unlockAudio, bgm } from './audio.js';

const DPR = window.devicePixelRatio || 1;
let CSSW = 0, CSSH = 0;

const FALLBACK_AUDIO = 81; // Opening Titel länge 81 sekunden

const OPENING = {
  prologueShowSec: 3.0,   // "Vor langer Zeit..." sichtbar
  logoFlySec: 20.0,        // STAR WARS Logo fliegt (größer = langsamer)
  gapAfterLogoSec: -10.0,  // >0 = Pause nach Logo; 0 = direkt; <0 = Overlap
  crawlDurationSec: 92.0, // Dauer des Scrolls (größer = langsamer)
  keepAudioSync: false     // auf Audiolänge (~81s) skalieren?
};

export function setOpeningTiming(opts = {}) { 
    Object.assign(OPENING, opts); 
}

export function playStarWarsOpening({ onDone } = {}) {
    window.__openingActive = true;
    const root = document.getElementById('sw-opening');
    const starsC = document.getElementById('sw-stars');
    const audio = document.getElementById('sw-audio');
    const skip = document.getElementById('sw-skip');

    const prologue = document.getElementById('sw-prologue');
    const crawl = document.getElementById('sw-crawl');

    // Overlay sichtbar machen
    root.hidden = false;

    // Game-BGM pausieren, falls aktiv
    try { bgm.stop?.(0); } catch {}

    // Sternenhimmel initialisieren (eigener Canvas im Overlay)
    const ctx = starsC.getContext('2d');
    function resize(){
        CSSW = window.innerWidth;
        CSSH = window.innerHeight;

        // interne Auflösung (Device-Pixel) setzen
        starsC.width  = Math.round(CSSW * DPR);
        starsC.height = Math.round(CSSH * DPR);

        // in CSS-Pixeln zeichnen 
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

        // Sternenfeld mit CSS-Pixeln initialisieren
        resizeStarfield(CSSW, CSSH);
    }
    resize();
    window.addEventListener('resize', resize);

    // Sternenfeld Loop 
    let running = true, last = performance.now();
    function loop(t){
        if (!running) return;
        const dt = Math.min(0.05, (t - last)/1000); last = t;
        updateStarfield(dt);
        ctx.clearRect(0, 0, CSSW, CSSH);
        drawStarfield(ctx);
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    // Finish/Cleanup
    function finish(){
        try { audio.pause(); } catch {}
        audio.currentTime = 0;
        running = false;
        window.removeEventListener('resize', resize);
        document.removeEventListener('keydown', onKey);
        skip.removeEventListener('click', onSkip);
        audio.removeEventListener('ended', onEnd);
        root.hidden = true;

        window.__openingActive = false;
        onDone && onDone();

        // BGM wieder an
        bgm.start(600);
    }

    // sanftes Ausblenden des Opening-Tracks
    function fadeOutAudio(aud, ms = 700) {
        const start = aud.volume || 1;
        const t0 = performance.now();
        function step(t) {
            const k = Math.min(1, (t - t0) / ms);
            aud.volume = Math.max(0, start * (1 - k));
            if (k < 1) requestAnimationFrame(step);
            else {
            try { aud.pause(); } catch {}
            aud.currentTime = 0;
            aud.volume = start; // Reset für nächsten Start
            }
        }
        requestAnimationFrame(step);
    }


    function onSkip() {
        fadeOutAudio(500);
        finish();
    }

    function onKey(e) {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')
            onSkip();
    }

    function onEnd() {
        finish();
    }

    // Timeline Setup (Prolog -> Logo -> Crawl) - via CSS Variablen
    function startWithDuration(durSec){
  const audioDur = (isFinite(durSec) && durSec > 10) ? durSec : FALLBACK_AUDIO;

  const scale = OPENING.keepAudioSync
    ? (audioDur / (0.2 + OPENING.prologueShowSec + 3.4 + OPENING.logoFlySec + OPENING.crawlDurationSec))
    : 1;

  const prologueIn   = 0.2 * scale;
  const prologueShow = OPENING.prologueShowSec * scale;
  const logoIn       = 3.4 * scale;
  const logoFlyDur   = OPENING.logoFlySec * scale;
  const gap          = OPENING.gapAfterLogoSec * (OPENING.keepAudioSync ? scale : 1);
  const crawlDur     = Math.max(40, OPENING.crawlDurationSec * (OPENING.keepAudioSync ? scale : 1));

  const tPrologueOut = (prologueIn + prologueShow);
  const tLogoIn      = (prologueIn + prologueShow + 0.4 * scale);

  // Crawl-Start: nach Logo-Ende + gap (gap darf negativ sein → Overlap)
  const tCrawlIn     = tLogoIn + logoFlyDur + gap;
  const tCrawlMove   = tCrawlIn + 0.10; // kleiner Versatz

  // CSS Variablen setzen
  const rs = document.documentElement.style;
  rs.setProperty('--t-prologue-out', `${tPrologueOut}s`);
  rs.setProperty('--t-logo-in',      `${tLogoIn}s`);
  rs.setProperty('--t-logo-fly',     `${tLogoIn}s`);
  rs.setProperty('--logo-fly-dur',   `${logoFlyDur}s`);
  rs.setProperty('--t-crawl-in',     `${tCrawlIn}s`);
  rs.setProperty('--t-crawl-move',   `${tCrawlMove}s`);
  document.getElementById('sw-crawl').style.setProperty('--crawl-duration', `${crawlDur}s`);

  // optional: debug
  console.log('[Opening]',
    { tPrologueOut, tLogoIn, logoFlyDur, gap, tCrawlIn, crawlDur, scale, keepAudioSync: OPENING.keepAudioSync });

  // Audio + Events
  audio.currentTime = 0; audio.volume = 1;
  audio.play().catch(()=>{});
  skip.addEventListener('click', onSkip);
  document.addEventListener('keydown', onKey);
  audio.addEventListener('ended', onEnd);
}

        // Autoplay mit unlockAudio
            unlockAudio().finally(() => {
            if (isFinite(audio.duration) && audio.duration > 0) {
                startWithDuration(audio.duration);
            } else {
                audio.addEventListener('loadedmetadata', () => startWithDuration(audio.duration), { once:true});
                // Fallback
                setTimeout(()=> startWithDuration(FALLBACK_AUDIO), 1200);
            }
        });
}