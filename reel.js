// Opening scene (plays once per visit, before the doors open):
//   starry night → a flipbook: pages flip superfast, each one a moment later — panning down the sky to a
//   valley, a dark hill, the hill becoming a pencil sketch of Dhanesh's head, his head lifting — until he
//   looks straight out. The flipping stops; a small ring already sits on his iris. It glows for 1 s, then the
//   face zooms into the ring (the ring stays on the eye and grows with it) → hand-off to the ring "unlock" in #intro.
// The head motion uses 34 frames: his 4 photos plus in-between frames made with optical flow.
// Click or any key skips it. Visitors who prefer reduced motion never see it.
(function () {
  const root = document.documentElement;
  const reel = document.getElementById('reel');
  if (!reel) return;
  if (!root.classList.contains('reel')) { reel.remove(); return; }

  const canvas = reel.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeIn = t => t * t * t;
  const rngFrom = seed => {                                // seeded random (same stars every time)
    seed = (Math.imul(seed ^ 0x9e3779b9, 2654435761) >>> 0) % 2147483646 + 1;
    const next = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < 5; i++) next();
    return next;
  };

  // ---------- the footage ----------
  const FW = 900, FH = 1100;                               // sketch frame size (the in-betweens are the same shape, smaller)
  const N = 34;                                            // head frames 0–33 (33 = looking straight out)
  // which eye to dive into: found automatically on the last pose (media/eyes.js, made by find_eyes.py).
  // The zoom steers so that point ends dead-centre, wherever the photo sits in the frame.
  // If the data is missing or out of range, fall back to the middle of the face.
  const ok = p => p && isFinite(p.x) && isFinite(p.y) && p.x > 0 && p.x < 900 && p.y > 0 && p.y < 1100;
  const ED = window.EYE_DATA || {};
  const EYE = ok(ED.eye) ? ED.eye : { x: 534, y: 522 };
  const EYES_MID = ok(ED.eyesMid) ? ED.eyesMid : { x: 441, y: 514 };
  const IRIS_R = isFinite(ED.irisR) ? ED.irisR : 18;
  const files = [...Array.from({ length: N }, (_, i) => 'vf_' + String(i).padStart(2, '0')), 'sk_4a', 'sk_4b', 'hill'];
  const imgs = {};

  // ---------- the flipbook: one entry per page ----------
  // pan: how far down the sky (0–1) · hill: dark hill shown (0–1) · ink: how much the sketch has drawn in (0–1)
  // frame: which head frame · land: how much of the landscape is still visible
  const pages = [];
  for (let i = 0; i < 12; i++) pages.push({ pan: ease((i + 1) / 12), dur: lerp(120, 62, i / 11) });
  pages.push({ pan: 1, hill: .5, dur: 62 }, { pan: 1, hill: 1, dur: 62 });
  for (const ink of [.25, .5, .75, 1]) pages.push({ pan: 1, hill: 1, ink, frame: 0, dur: 62 });
  for (let f = 1; f < N - 1; f++) pages.push({ pan: 1, hill: clamp(1 - f / 8), ink: 1, frame: f, land: clamp(1 - f / 14), dur: 62 });
  pages.push({ pan: 1, hill: 0, ink: 1, frame: N - 1, land: 0, ring: true, dur: 62 });
  const pageAt = []; { let a = 0; for (const p of pages) { pageAt.push(a); a += p.dur; } }
  const FLIPBOOK = pageAt[pageAt.length - 1] + pages[pages.length - 1].dur;

  const T = { sky: 1300, book: FLIPBOOK, glow: 1000, dive: 1400 };
  const at = {}; { let a = 0; for (const k in T) { at[k] = a; a += T[k]; } at.end = a; }

  // ---------- layout + the painted world (sky on top, valley at the bottom) ----------
  let W = 0, H = 0, DPR = 1, F = null, world = null, worldH = 0, stars = [], pageShown = -1;
  // two page buffers: the page turning away, and the page underneath. When the next flip starts, the page that was
  // underneath becomes the one turning away, so each page is painted only once.
  let pageCanvas = document.createElement('canvas'), pctx = pageCanvas.getContext('2d');
  let underCanvas = document.createElement('canvas'), uctx = underCanvas.getContext('2d');
  function layout() {
    // soft pencil art doesn't need retina resolution; cap the pixel count so big screens stay smooth
    DPR = Math.max(.75, Math.min(1.25, window.devicePixelRatio || 1, Math.sqrt(2.4e6 / (innerWidth * innerHeight))));
    W = innerWidth; H = innerHeight;
    for (const c of [canvas, pageCanvas, underCanvas]) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); pctx.setTransform(DPR, 0, 0, DPR, 0, 0); uctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    pageShown = -1;
    const fh = Math.min(H * 1.08, W * 1.25 * FH / FW), fw = fh * FW / FH;
    F = { x: W / 2 - fw / 2, y: H - fh * 0.86, w: fw, h: fh, s: fh / FH };
    buildWorld();
  }
  function buildWorld() {
    worldH = Math.round(H * 2.3);
    world = document.createElement('canvas'); world.width = W; world.height = worldH;
    const g = world.getContext('2d'), r = rngFrom(7);
    const sky = g.createLinearGradient(0, 0, 0, worldH);
    sky.addColorStop(0, '#02030a'); sky.addColorStop(.45, '#061024'); sky.addColorStop(.78, '#0d1d3c'); sky.addColorStop(.9, '#1b2a4a'); sky.addColorStop(1, '#05070c');
    g.fillStyle = sky; g.fillRect(0, 0, W, worldH);
    g.save(); g.translate(W * .5, worldH * .28); g.rotate(-.42);             // milky way
    for (let i = 0; i < 70; i++) {
      const x = (r() - .5) * W * 1.6, y = (r() - .5) * H * .22, rad = 60 + r() * 160;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, i % 3 ? 'rgba(150,170,255,.07)' : 'rgba(255,190,220,.05)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 1800; i++) { g.globalAlpha = .25 + r() * .6; g.fillStyle = '#fff'; g.fillRect((r() - .5) * W * 1.6, (r() - .5) * r() * H * .3, .9, .9); }
    g.restore(); g.globalAlpha = 1;
    for (let i = 0; i < 900; i++) { const y = Math.pow(r(), 1.3) * worldH * .82;
      g.globalAlpha = .2 + r() * .55; g.fillStyle = r() < .12 ? '#ffe2c0' : r() < .2 ? '#cfe0ff' : '#fff';
      g.fillRect(r() * W, y, r() < .05 ? 1.6 : 1, r() < .05 ? 1.6 : 1); }
    g.globalAlpha = 1;
    stars = Array.from({ length: 140 }, () => ({ x: r() * W, y: Math.pow(r(), 1.4) * worldH * .8, s: 1 + r() * 1.6, p: r() * TAU, f: 1 + r() * 2 }));
    const vy = worldH - H, groundY = vy + F.y + F.h * 0.76;
    const glow = g.createRadialGradient(W / 2, groundY - H * .05, 0, W / 2, groundY, W * .7);
    glow.addColorStop(0, 'rgba(52,197,174,.16)'); glow.addColorStop(.5, 'rgba(90,70,160,.08)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = glow; g.fillRect(0, groundY - H * .6, W, H * .8);
    ridge(g, groundY - H * .2, H * .07, '#0b1428', r, 9);
    ridge(g, groundY - H * .11, H * .06, '#070d1b', r, 14);
    g.fillStyle = '#04070d'; g.beginPath(); g.moveTo(0, groundY - H * .1);
    g.quadraticCurveTo(W * .25, groundY + H * .02, W * .5, groundY); g.quadraticCurveTo(W * .75, groundY + H * .02, W, groundY - H * .1);
    g.lineTo(W, worldH); g.lineTo(0, worldH); g.fill();
  }
  function ridge(g, y, amp, color, r, n) {
    const pts = Array.from({ length: n + 1 }, (_, i) => [i / n * W, y - r() * amp - Math.sin(i * 1.7) * amp * .3]);
    g.fillStyle = color; g.beginPath(); g.moveTo(0, worldH); g.lineTo(0, pts[0][1]);
    for (let i = 1; i <= n; i++) { const [x, yy] = pts[i], [px, py] = pts[i - 1]; g.quadraticCurveTo(px + (x - px) * .5, Math.min(py, yy) - amp * .25, x, yy); }
    g.lineTo(W, worldH); g.fill();
  }

  // ---------- drawing ----------
  function sky(c, y, now, alpha = 1) {
    c.drawImage(world, 0, y, W, H, 0, 0, W, H);
    for (const s of stars) {
      const sy = s.y - y; if (sy < -4 || sy > H) continue;
      c.globalAlpha = clamp(.45 + .55 * Math.sin(now / 1000 * s.f + s.p)); c.fillStyle = '#fff';
      c.fillRect(s.x - s.s * .6, sy - s.s * .6, s.s * 1.2, s.s * 1.2);
    }
    c.globalAlpha = 1;
    if (alpha < 1) { c.fillStyle = `rgba(2,3,8,${1 - alpha})`; c.fillRect(0, 0, W, H); }
  }
  function head(c, im, alpha, R) {
    if (!im || alpha <= 0) return;
    c.globalAlpha = alpha; c.drawImage(im, R.x, R.y, R.w, R.h);   // the soft glow is baked into the images (a live blur was far too slow)
    c.globalAlpha = 1;
  }
  // one moment of the story, drawn onto any canvas (the screen, or the page that's about to flip away)
  function scene(c, p, now) {
    c.fillStyle = '#020308'; c.fillRect(0, 0, W, H);
    const endY = worldH - H, land = p.land === undefined ? 1 : p.land;
    sky(c, lerp(H * .04, endY, p.pan || 0), now, .15 + .85 * land);
    const R = F;
    if (p.hill) { c.globalAlpha = p.hill; c.drawImage(imgs.hill, R.x, R.y, R.w, R.h); c.globalAlpha = 1; }
    if (p.ink) head(c, imgs['vf_' + String(p.frame).padStart(2, '0')], p.ink, R);
    if (p.ring) { const e = eyeAt(1); ring(c, e.x, e.y, IRIS_R * F.s, 1, now / 1000, 0); }
    // paper look: a faint inner margin on every page
    c.strokeStyle = 'rgba(255,255,255,.07)'; c.lineWidth = 2; c.strokeRect(14, 14, W - 28, H - 28);
  }
  function ringSpot() { const k = Math.max(W, H) / 1000; return { x: W / 2, y: H / 2 + 45 * k, r: 60 * k }; }   // = the ring in #intro
  // the ring; `glow` 0–1 adds a bright halo and a hot core (used for the 1-second glow)
  function ring(c, x, y, r, a, t, glow) {
    c.save(); c.globalAlpha = a;
    const halo = r * (2.4 + glow * 3.2);
    const g = c.createRadialGradient(x, y, r * .2, x, y, halo);
    g.addColorStop(0, `rgba(52,197,174,${.35 + glow * .45})`); g.addColorStop(.35, `rgba(52,197,174,${.12 + glow * .25})`); g.addColorStop(1, 'rgba(52,197,174,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, halo, 0, TAU); c.fill();
    if (glow > 0) {                                       // light bloom across the frame, like a lens flare
      c.globalCompositeOperation = 'lighter';
      const fl = c.createLinearGradient(x - r * 14, y, x + r * 14, y);
      fl.addColorStop(0, 'rgba(52,197,174,0)'); fl.addColorStop(.5, `rgba(180,255,240,${.35 * glow})`); fl.addColorStop(1, 'rgba(52,197,174,0)');
      c.fillStyle = fl; c.fillRect(x - r * 14, y - Math.max(1, r * .06), r * 28, Math.max(2, r * .12));
      c.globalCompositeOperation = 'source-over';
    }
    c.strokeStyle = glow > 0 ? `rgb(${52 + 160 * glow | 0},${197 + 50 * glow | 0},${174 + 70 * glow | 0})` : '#34c5ae';
    const lw = Math.max(1.5, r * (.08 + glow * .04));
    c.save(); c.globalAlpha = a * (.18 + glow * .25); c.lineWidth = lw * (4 + glow * 4);   // cheap soft edge (instead of shadowBlur)
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke(); c.restore();
    c.lineWidth = lw; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
    c.strokeStyle = 'rgba(233,162,74,.8)'; c.lineWidth = Math.max(1, r * .03);
    for (let i = 0; i < 12; i++) { const a2 = i / 12 * TAU + t * 1.5; c.beginPath();
      c.moveTo(x + Math.cos(a2) * r * .72, y + Math.sin(a2) * r * .72); c.lineTo(x + Math.cos(a2) * r * .92, y + Math.sin(a2) * r * .92); c.stroke(); }
    c.restore();
  }
  // where the iris is on screen when the face is zoomed by z and the iris has been moved to `anchor`
  function eyeAt(z, anchor) {
    const e0 = { x: F.x + EYE.x * F.s, y: F.y + EYE.y * F.s };
    if (z === 1 || !anchor) return e0;
    return anchor;
  }
  function faceRect(z, anchor) {                          // the face drawn so its iris lands on `anchor`
    return { x: anchor.x - EYE.x * F.s * z, y: anchor.y - EYE.y * F.s * z, w: F.w * z, h: F.h * z };
  }
  // the page on top (already drawn on pageCanvas) turning over from the right edge, lifting as it goes
  function turn(k, left) {
    const ang = easeIn(k) * Math.PI / 2, sx = Math.cos(ang), lift = Math.sin(ang);
    if (sx > .01) {
      const skew = lift * .14;
      ctx.save();
      ctx.setTransform(DPR * sx, -DPR * skew, 0, DPR, 0, 0);
      ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
      ctx.drawImage(pageCanvas, 0, 0, W, H);
      const sh = ctx.createLinearGradient(0, 0, W, 0);
      sh.addColorStop(0, `rgba(0,0,0,${k * .35})`); sh.addColorStop(.75, `rgba(0,0,0,${k * .55})`);
      sh.addColorStop(.97, `rgba(255,255,255,${.06 + lift * .35})`); sh.addColorStop(1, `rgba(255,255,255,${.25 + lift * .5})`);
      ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H);
      ctx.restore();
      const ex = W * sx, cast = ctx.createLinearGradient(ex, 0, ex + 90, 0);
      cast.addColorStop(0, `rgba(0,0,0,${.65 * (1 - k * .6)})`); cast.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save(); ctx.transform(1, -skew, 0, 1, 0, 0); ctx.fillStyle = cast; ctx.fillRect(ex, 0, 90, H + W * .2); ctx.restore();
    }
    const spine = ctx.createLinearGradient(0, 0, 26, 0); spine.addColorStop(0, 'rgba(0,0,0,.6)'); spine.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = spine; ctx.fillRect(0, 0, 26, H);
    for (let j = 1; j <= Math.min(6, left); j++) { ctx.fillStyle = `rgba(255,255,255,${.16 - j * .02})`; ctx.fillRect(W - j * 3, 0, 1, H); }
  }

  // ---------- main loop ----------
  let start = null, raf = 0, ended = false;

  function frame(now) {
    if (ended) return;
    try { step(now); } catch (err) { console.warn('intro skipped:', err); done(); }
  }
  function step(now) {
    if (start === null) start = now;
    if (failed) return done();
    if (!ready && now - start > T.sky) start = now - T.sky;   // drawings not ready yet: hold on the sky a moment longer
    const e = now - start;

    if (e < at.book) {                                   // 1. starry night, a slow drift + a shooting star
      const u = e / T.sky;
      sky(ctx, u * H * .04, now);
      if (u > .45 && u < .8) { const k = (u - .45) / .35, sx = W * (.75 - k * .45), sy = H * (.12 + k * .2);
        const gr = ctx.createLinearGradient(sx, sy, sx + 140, sy - 60); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = gr; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 140, sy - 60); ctx.stroke(); }
      if (u < .15) { ctx.fillStyle = `rgba(0,0,0,${1 - u / .15})`; ctx.fillRect(0, 0, W, H); }

    } else if (e < at.glow) {                            // 2. the flipbook: every page is the next moment
      const fe = e - at.book; let i = pages.length - 1;
      while (i > 0 && fe < pageAt[i]) i--;
      if (i !== pageShown) {                             // a new page starts turning: paint the one that's leaving
        if (pageShown === i - 1 && i > 0) {             // usual case: what was underneath now turns away
          [pageCanvas, underCanvas] = [underCanvas, pageCanvas]; [pctx, uctx] = [uctx, pctx];
        } else scene(pctx, i === 0 ? { pan: 0 } : pages[i - 1], now);   // first page, or a skipped frame
        scene(uctx, pages[i], now);
        pageShown = i;
      }
      ctx.drawImage(underCanvas, 0, 0, W, H);            // the page underneath
      turn(clamp((fe - pageAt[i]) / pages[i].dur), pages.length - i);

    } else if (e < at.dive) {                            // 3. the flipping has stopped: the ring on his iris glows for 1 s
      const u = (e - at.glow) / T.glow;
      const glow = Math.sin(Math.PI * clamp(u / .55)) * .85 + clamp((u - .55) / .45) * .55;   // swell, ease back, build again
      ctx.fillStyle = '#020308'; ctx.fillRect(0, 0, W, H);
      const R = faceRect(1, eyeAt(1)), c2 = clamp(u / .5);
      head(ctx, imgs['vf_' + (N - 1)], 1 - c2, R);                       // last flip page → the sharper drawing
      head(ctx, imgs[Math.floor(now / 110) % 2 ? 'sk_4b' : 'sk_4a'], c2 * .85, R);
      const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .2, W / 2, H / 2, Math.max(W, H) * .6);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${.6 * u})`);
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
      const ep = eyeAt(1);
      ring(ctx, ep.x, ep.y, IRIS_R * F.s * (1 + glow * .12), 1, now / 1000, glow);

    } else if (e < at.end) {                             // 4. the face zooms into the ring; the ring rides on the iris
      const u = (e - at.dive) / T.dive;
      const spot = ringSpot(), r0 = IRIS_R * F.s, zRing = spot.r / r0;      // zoom at which the ring reaches full size
      const z = Math.pow(zRing * 6, easeIn(clamp(u)));                       // keeps going past it: the face flies by
      const k = ease(clamp(Math.log(z) / Math.log(zRing)));                  // iris travels to the ring's final spot
      const e0 = eyeAt(1), anchor = { x: lerp(e0.x, spot.x, k), y: lerp(e0.y, spot.y, k) };
      ctx.fillStyle = '#020308'; ctx.fillRect(0, 0, W, H);
      const fade = clamp(1 - (Math.log(z) - Math.log(zRing)) / Math.log(4));  // face fades once it's past the ring
      head(ctx, imgs[Math.floor(now / 110) % 2 ? 'sk_4b' : 'sk_4a'], .85 * fade, faceRect(z, anchor));
      const glow = .55 * (1 - k);
      ring(ctx, anchor.x, anchor.y, Math.min(spot.r, r0 * z), 1, now / 1000, glow);
    } else {
      const s = ringSpot(); ctx.fillStyle = '#020308'; ctx.fillRect(0, 0, W, H); ring(ctx, s.x, s.y, s.r, 1, now / 1000, 0);
      return done();
    }
    raf = requestAnimationFrame(frame);
  }

  function done() {
    if (ended) return; ended = true;
    cancelAnimationFrame(raf);
    try { sessionStorage.setItem('reelSeen', '1'); } catch (e) {}
    reel.classList.add('out');
    root.classList.remove('reel');                       // lets the ring unlock in #intro start
    dispatchEvent(new Event('reeldone'));
    setTimeout(() => reel.remove(), 500);
  }
  const skip = e => { if (!ended) { e.stopImmediatePropagation(); e.preventDefault(); done(); } };
  reel.addEventListener('click', skip);
  addEventListener('keydown', skip, { capture: true });

  layout();
  addEventListener('resize', layout);
  // Load every drawing in the background while the starry sky plays (the sky needs none of them).
  // Each one becomes an ImageBitmap: decoded once and kept ready, so the flipbook never stalls re-decoding.
  let ready = false, failed = false;
  const load = n => new Promise(res => {
    const im = new Image(); im.src = `media/${n}.webp`;
    const loaded = new Promise((y, x) => { im.onload = y; im.onerror = x; });
    // decode() can stall in some browsers: whichever finishes first wins, and give up on one image after 8 s
    Promise.race([im.decode ? im.decode().catch(() => loaded) : loaded, new Promise((_, x) => setTimeout(x, 8000))])
      .then(() => window.createImageBitmap ? createImageBitmap(im).catch(() => im) : im)
      .then(b => { imgs[n] = b; res(true); }, () => res(false));
  });
  (async () => {                                          // 4 at a time, so the sky isn't fighting 37 decodes at once
    const q = files.slice(), out = [];
    await Promise.all([0, 1, 2, 3].map(async () => { while (q.length) out.push(await load(q.shift())); }));
    if (out.includes(false)) failed = true; else ready = true;
  })();
  setTimeout(() => { if (!ready) { failed = true; done(); } }, 9000);   // very slow connection: go straight to the unlock
  // safety net: whatever happens (a stuck tab, an old browser, an error), never leave visitors on a black screen
  const total = T.sky + T.book + T.glow + T.dive;
  setTimeout(() => done(), total + 9000);
  raf = requestAnimationFrame(frame);
})();
