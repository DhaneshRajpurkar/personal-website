// One camera + hand tracker for the whole site. Video stays in the visitor's browser.
// HandCam.start()  → turns the camera on and loads tracking (safe to call twice)
// HandCam.on(fn)   → fn(hands, timeMs) every new camera frame; returns an "unsubscribe" function
// HandCam.draw(canvas, hands) → mirrored preview with the hand skeleton
// HandCam.stop()   → camera light off
(function () {
  const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2';
  const MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

  const listeners = new Set();
  let landmarker = null, CONN = [], stream = null, starting = null, lastT = -1, raf = 0;
  const video = document.createElement('video');
  video.playsInline = true; video.muted = true;

  function fail(code, cause) { const e = new Error(code); e.code = code; e.cause = cause; return e; }

  async function start() {
    if (stream && landmarker) return;
    if (starting) return starting;
    starting = (async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw fail('unsupported');
      try {
        // 320×240 is plenty for hand tracking (the model shrinks frames smaller than this anyway); a quarter of the pixels of 640×480
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 30 }, facingMode: 'user' }, audio: false });
      } catch (e) {
        throw fail(e && e.name === 'NotAllowedError' ? 'blocked' : 'nocamera', e);
      }
      if (!landmarker) {
        try {
          const { FilesetResolver, HandLandmarker } = await import(`${MP}/vision_bundle.mjs`);
          const fileset = await FilesetResolver.forVisionTasks(`${MP}/wasm`);
          const opts = { runningMode: 'VIDEO', numHands: 2, minHandDetectionConfidence: 0.6, minTrackingConfidence: 0.5 };
          try {
            landmarker = await HandLandmarker.createFromOptions(fileset, { ...opts, baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' } });
          } catch (e) {
            landmarker = await HandLandmarker.createFromOptions(fileset, { ...opts, baseOptions: { modelAssetPath: MODEL, delegate: 'CPU' } });
          }
          CONN = HandLandmarker.HAND_CONNECTIONS;
        } catch (e) {
          stream.getTracks().forEach(t => t.stop()); stream = null;
          throw fail('load', e);
        }
      }
      video.srcObject = stream;
      await video.play();
      cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    })();
    try { await starting; } finally { starting = null; }
  }

  // Lighter tracking: ~20 checks a second while a hand is in view, and a "sleep" pace of ~3 a second when no hand
  // has been seen for a moment. Raising a hand wakes it up within about a third of a second.
  const ACTIVE_MS = 50, SLEEP_MS = 330, SLEEP_AFTER_MS = 1500;
  let lastRun = 0, lastHand = 0;
  function loop() {
    if (!stream) return;
    try {
      const t = performance.now();
      const gap = t - lastHand > SLEEP_AFTER_MS ? SLEEP_MS : ACTIVE_MS;
      if (video.readyState >= 2 && video.currentTime !== lastT && t - lastRun >= gap - 4) {
        lastT = video.currentTime; lastRun = t;
        const hands = landmarker.detectForVideo(video, t).landmarks || [];
        if (hands.length) lastHand = t;
        for (const fn of [...listeners]) { try { fn(hands, t); } catch (e) { console.error(e); } }
      }
    } catch (e) { console.error(e); }      // one bad frame shouldn't stop tracking
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    cancelAnimationFrame(raf);
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null;
  }

  function draw(canvas, hands) {
    const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    ctx.save();
    ctx.translate(w, 0); ctx.scale(-1, 1);               // mirror, like a selfie camera
    if (video.readyState >= 2) ctx.drawImage(video, 0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, 0, w, h);
    const css = getComputedStyle(document.documentElement);
    ctx.strokeStyle = css.getPropertyValue('--accent').trim() || '#34c5ae';
    ctx.fillStyle = css.getPropertyValue('--accent-2').trim() || '#e9a24a';
    ctx.lineWidth = 2;
    for (const lm of hands) {
      ctx.beginPath();
      for (const c of CONN) { ctx.moveTo(lm[c.start].x * w, lm[c.start].y * h); ctx.lineTo(lm[c.end].x * w, lm[c.end].y * h); }
      ctx.stroke();
      for (const i of [4, 8, 12, 16, 20]) { ctx.beginPath(); ctx.arc(lm[i].x * w, lm[i].y * h, 3, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }

  const messages = {
    unsupported: 'This browser can’t use the camera here. Open the site over https in Chrome, Edge, Firefox or Safari.',
    blocked: 'Camera access was blocked. Allow it in your browser’s address bar, then try again.',
    nocamera: 'No camera found.',
    load: 'Hand tracking couldn’t load. Check your connection and try again.',
  };

  window.HandCam = {
    start, stop, draw,
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    get running() { return !!stream; },
    get sleeping() { return !!stream && performance.now() - lastHand > SLEEP_AFTER_MS; },
    message: err => messages[err && err.code] || ('Something went wrong (' + (err && err.message || err) + ').'),
  };
})();
