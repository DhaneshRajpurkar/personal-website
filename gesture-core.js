// Pure gesture logic: no camera, no page. Feed it MediaPipe hand landmarks every frame.
// Landmark numbers: 0 wrist · 4 thumb tip · 6/8 index PIP/tip · 9 middle knuckle ·
// 10/12 middle PIP/tip · 14/16 ring PIP/tip · 18/20 pinky PIP/tip.  (x, y are 0–1 of the camera image)
// "s" below = one hand-width (wrist → middle knuckle), so every rule works at any distance from the camera.
//
// The unlock, tuned from Dhanesh's own recording (gesture-recording.json):
//   1 SEPARATE  wrists crossed close together, fingers spread wide apart          (he held it ~1.5 s)
//   2 MOVING    hands swing ~140° around each other and pull apart                (~1 s)
//   3 EYE       fingertips of both hands meet on top, thumbs below, opening between (he held it ~3 s)
(function (root) {

// ---- tuning knobs ----
const SEPARATE = { wristsWithin: 1.0, tipsApart: 0.75, fingerGap: 0.5, holdMs: 300 };
const MOVING   = { turnDeg: 100, endApart: 1.6 };
const EYE      = { tipsTouch: 0.4, thumbsWithin: 1.1, openingAbove: 0.3, holdMs: 400 };
const STEP_TIMEOUT = 7000;   // ms allowed per step before starting over
const LOST_TIMEOUT = 1500;   // ms without two hands before starting over

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const handSize = h => dist(h[0], h[9]);          // wrist → middle knuckle
const palm = h => mid(h[0], h[9]);

const FINGERS = { index: [6, 8], middle: [10, 12], ring: [14, 16], pinky: [18, 20] };
// A straight finger's tip is much farther from the wrist than its middle joint; a curled one isn't.
function finger(h, name) {
  const [pip, tip] = FINGERS[name];
  const r = dist(h[tip], h[0]) / dist(h[pip], h[0]);
  return r > 1.12 ? 'up' : r < 1.0 ? 'down' : 'half';
}
const isOpenHand = h => ['index', 'middle', 'ring', 'pinky'].every(n => finger(h, n) === 'up');
// fingers splayed: index and middle straight, and big gaps between neighbouring fingertips
function isSpread(h) {
  const s = handSize(h);
  return finger(h, 'index') === 'up' && finger(h, 'middle') === 'up'
    && dist(h[8], h[12]) > SEPARATE.fingerGap * s && dist(h[12], h[16]) > SEPARATE.fingerGap * s;
}

const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const TIPS = [8, 12, 16];   // index, middle, ring fingertips

class GestureLock {
  constructor() { this.reset(); }

  reset() {
    this.step = 0;          // 0 separate · 1 moving · 2 eye · 3 unlocked
    this.holdSince = null; this.turn = 0; this.prev = null;
    this.stepStart = 0; this.lastTwo = 0;
  }

  advance(t) { this.step++; this.holdSince = null; this.stepStart = t; }

  // true once `ok` has stayed true for `ms`
  held(ok, t, ms) {
    if (!ok) { this.holdSince = null; return 0; }
    if (this.holdSince === null) this.holdSince = t;
    return Math.min(1, (t - this.holdSince) / ms);
  }

  // hands: array of 21-landmark arrays. t: time in ms. Returns what the page should show/do.
  update(hands, t) {
    const out = { step: this.step, progress: 0, pan: null, unlocked: false, note: '' };
    if (this.step === 3) return out;

    // one open hand = steer the camera
    if (hands.length === 1 && isOpenHand(hands[0])) out.pan = palm(hands[0]).x;

    const two = hands.length >= 2 ? [hands[0], hands[1]] : null;
    if (two) this.lastTwo = t;
    if (this.step > 0 && (t - this.stepStart > STEP_TIMEOUT || t - this.lastTwo > LOST_TIMEOUT)) {
      this.reset(); out.note = 'too slow, start again';
    }

    if (two) {
      const [a, b] = two;
      const s = (handSize(a) + handSize(b)) / 2;

      if (this.step === 0) {                                   // 1 SEPARATE
        const crossed = dist(a[0], b[0]) < SEPARATE.wristsWithin * s && dist(a[8], b[8]) > SEPARATE.tipsApart * s;
        const spread = isSpread(a) && isSpread(b);
        out.progress = this.held(crossed && spread, t, SEPARATE.holdMs);
        out.note = !crossed ? 'cross your wrists' : !spread ? 'spread your fingers wide' : 'hold…';
        if (out.progress >= 1) { this.advance(t); this.turn = 0; this.prev = [palm(a), palm(b)]; }

      } else if (this.step === 1) {                            // 2 MOVING
        let pa = palm(a), pb = palm(b);
        const [qa, qb] = this.prev;                            // keep each hand matched to itself
        if (dist(pa, qa) + dist(pb, qb) > dist(pa, qb) + dist(pb, qa)) [pa, pb] = [pb, pa];
        const delta = wrap(Math.atan2(pb.y - pa.y, pb.x - pa.x) - Math.atan2(qb.y - qa.y, qb.x - qa.x));
        if (Math.abs(delta) < Math.PI / 3) this.turn += delta; // ignore tracking glitches
        this.prev = [pa, pb];
        const turned = Math.abs(this.turn) * 180 / Math.PI;
        const apart = dist(a[0], b[0]) / s;
        out.progress = Math.min(1, turned / MOVING.turnDeg) * 0.8 + Math.min(1, apart / MOVING.endApart) * 0.2;
        out.note = turned < MOVING.turnDeg ? 'swing your hands around each other' : 'pull them apart';
        if (turned >= MOVING.turnDeg && apart >= MOVING.endApart) this.advance(t);

      } else if (this.step === 2) {                            // 3 EYE
        let best = Infinity, top = null;
        for (const i of TIPS) for (const j of TIPS) {
          const d = dist(a[i], b[j]);
          if (d < best) { best = d; top = mid(a[i], b[j]); }
        }
        const thumbs = mid(a[4], b[4]);
        const ok = best < EYE.tipsTouch * s
          && dist(a[4], b[4]) < EYE.thumbsWithin * s
          && (thumbs.y - top.y) > EYE.openingAbove * s;        // fingertips above thumbs = an opening
        out.progress = this.held(ok, t, EYE.holdMs);
        out.note = ok ? 'hold the eye…' : 'fingertips together on top, thumbs below';
        if (out.progress >= 1) { this.advance(t); out.unlocked = true; }
      }
    }
    out.step = this.step;
    return out;
  }
}

// ===== Navigation gestures (after the doors are unlocked) =====
//   ☝ index pointing UP            → move the cursor
//   🤏 pinch thumb + index          → click where the cursor is
//   👉 index pointing LEFT / RIGHT  → hold briefly: previous / next door (in the rotunda: turn)
//   ✌ index + middle up, FLICK them   → flick down = scroll down, flick up = scroll up (with glide)
//   ✊ fist, held                   → back to the rotunda
// Ring and pinky are ignored on purpose: the tracker often reads a relaxed ring/pinky as curled.
const NAV = {
  pinchOn: 0.35, pinchOff: 0.55, freezeAt: 0.6,   // thumb–index distance in hand-widths
  clickGapMs: 400,
  area: { x0: 0.15, x1: 0.85, y0: 0.12, y1: 0.72 }, // part of the camera view mapped to the whole screen
  smooth: 0.35,
  // flick: fingertips must move this far (hand-widths, relative to the wrist) within flickMs.
  // Moving the whole hand doesn't count. The bounce-back right after a flick is ignored for recoverMs.
  flickDist: 0.45, flickMs: 220, flickGapMs: 250, recoverMs: 500, flickArmMs: 400,
  settleMs: 400,                                     // ignore flicks right after a hand comes into view
  flickInvert: false,                                // true = flick up scrolls down (phone-style)
  sideRatio: 1.6, sideMin: 0.45, sideHoldMs: 450,  // pointing sideways: how flat, how long the finger, how long to hold
  fistMs: 700, homeGapMs: 2000,
};

class NavGestures {
  constructor() { this.reset(); }
  reset() {
    this.pinched = false; this.lastClick = 0; this.cur = null; this.lead = null;
    this.fistSince = null; this.lastHome = 0;
    this.armedUntil = 0; this.flickHist = []; this.lastFlick = 0; this.lastFlickDir = null; this.seenSince = null;
    this.sideDir = null; this.sideSince = null; this.sideFired = false;
  }

  // hands: MediaPipe landmarks (raw, un-mirrored camera). Cursor comes back in 0–1 screen units (mirrored).
  update(hands, t) {
    const out = { mode: 'none', cursor: this.cur, click: false, pinching: false, flick: null, flickPower: 0, swipe: null,
                  side: null, sideProgress: 0, home: false, homeProgress: 0 };
    if (!hands.length) {
      this.fistSince = null; this.pinched = false; this.lead = null; this.flickHist = []; this.armedUntil = 0; this.seenSince = null;
      this.sideDir = null; this.sideSince = null; this.sideFired = false; out.cursor = null; return out;
    }
    // follow the same hand frame to frame (nearest to where the lead hand was); else the biggest/closest one
    const h = this.lead
      ? hands.reduce((a, b) => dist(palm(b), this.lead) < dist(palm(a), this.lead) ? b : a)
      : hands.reduce((a, b) => handSize(b) > handSize(a) ? b : a);
    this.lead = palm(h);
    if (this.seenSince === null) this.seenSince = t;
    const calm = hands.length >= 2;                // two hands up = not navigating (e.g. doing the unlock)
    const s = handSize(h);
    const idx = finger(h, 'index'), mid2 = finger(h, 'middle');
    const ring = finger(h, 'ring'), pinky = finger(h, 'pinky');

    // ✌ flick to scroll. Fingertip height (relative to the wrist) is tracked every frame, so a flick counts
    //    whether the fingers start straight (flick down) or start curled and snap straight (flick up),
    //    as long as two fingers were up at the start or end of the motion.
    const twoUp = idx === 'up' && mid2 === 'up' && !this.pinched;
    if (twoUp) this.armedUntil = t + NAV.flickArmMs;
    const rel = (mid(h[8], h[12]).y - h[0].y) / s;   // fingertips' height above the wrist, in hand-widths
    this.flickHist.push({ t, rel, two: twoUp });
    while (this.flickHist.length && t - this.flickHist[0].t > NAV.flickMs) this.flickHist.shift();
    {
      const f = this.flickHist[0], d = rel - f.rel;
      let biggestStep = 0;                            // a real flick spreads over several frames; a one-frame jump is a tracker glitch
      for (let i = 1; i < this.flickHist.length; i++) biggestStep = Math.max(biggestStep, Math.abs(this.flickHist[i].rel - this.flickHist[i - 1].rel));
      const eligible = !this.pinched && (this.flickHist.some(x => x.two) || t < this.armedUntil);
      if (eligible && !calm && t - this.seenSince > NAV.settleMs && biggestStep <= 0.8 * Math.abs(d)
          && t - f.t >= 30 && Math.abs(d) > NAV.flickDist && t - this.lastFlick > NAV.flickGapMs) {
        const real = d > 0 ? 'down' : 'up';
        const bounce = this.lastFlickDir && real !== this.lastFlickDir && t - this.lastFlick < NAV.recoverMs;
        this.lastFlick = t; this.flickHist = [];
        if (!bounce) {
          out.flick = NAV.flickInvert ? (real === 'down' ? 'up' : 'down') : real;
          out.flickPower = Math.min(2.5, Math.abs(d) / NAV.flickDist);
          this.lastFlickDir = real;
        }
        out.mode = 'scroll';
        return out;
      }
    }
    // two fingers up (or mid-flick right after) = scroll mode: no cursor, no fist
    if (twoUp || (t < this.armedUntil && idx !== 'up')) { out.mode = 'scroll'; this.sideSince = null; this.sideFired = false; return out; }

    // ✊ fist → home
    if (!calm && idx !== 'up' && mid2 !== 'up' && ring !== 'up' && [idx, mid2, ring, pinky].filter(x => x === 'down').length >= 2) {
      out.mode = 'fist'; this.sideSince = null;
      if (this.fistSince === null) this.fistSince = t;
      out.homeProgress = Math.min(1, (t - this.fistSince) / NAV.fistMs);
      if (out.homeProgress >= 1 && t - this.lastHome > NAV.homeGapMs) { out.home = true; this.lastHome = t; this.fistSince = null; }
      return out;
    }
    this.fistSince = null;

    // 🤏 pinch (separate on/off distances so it doesn't flicker)
    const pinchD = dist(h[4], h[8]) / s;
    if (!this.pinched && pinchD < NAV.pinchOn) {
      this.pinched = true;
      if (!calm && t - this.lastClick > NAV.clickGapMs) { out.click = true; this.lastClick = t; }
    } else if (this.pinched && pinchD > NAV.pinchOff) this.pinched = false;
    out.pinching = this.pinched;

    if (idx !== 'up') { this.sideSince = null; this.sideFired = false; return out; }

    // 👉 index pointing sideways → previous / next (mirrored, so pointing to YOUR right = next)
    const dx = -(h[8].x - h[5].x), dy = h[8].y - h[5].y;
    const sideways = Math.abs(dx) > NAV.sideRatio * Math.abs(dy) && Math.abs(dx) > NAV.sideMin * s;
    if (sideways && !this.pinched) {
      out.mode = 'side';
      const dir = dx > 0 ? 'next' : 'prev';
      out.side = dir;
      if (dir !== this.sideDir) { this.sideDir = dir; this.sideSince = t; this.sideFired = false; }
      out.sideProgress = this.sideFired ? 1 : Math.min(1, (t - this.sideSince) / NAV.sideHoldMs);
      if (!calm && !this.sideFired && out.sideProgress >= 1) { out.swipe = dir; this.sideFired = true; }   // once per point
      return out;
    }
    this.sideDir = null; this.sideSince = null; this.sideFired = false;

    // ☝ pointing up: cursor follows the index fingertip; it freezes as a pinch closes so clicks land where you aimed
    out.mode = 'point';
    const A = NAV.area;
    const target = {
      x: Math.min(1, Math.max(0, ((1 - h[8].x) - A.x0) / (A.x1 - A.x0))),
      y: Math.min(1, Math.max(0, (h[8].y - A.y0) / (A.y1 - A.y0))),
    };
    if (!this.cur) this.cur = target;
    else if (pinchD > NAV.freezeAt && !this.pinched) {
      this.cur = { x: this.cur.x + (target.x - this.cur.x) * NAV.smooth, y: this.cur.y + (target.y - this.cur.y) * NAV.smooth };
    }
    out.cursor = this.cur;
    return out;
  }
}

const api = { GestureLock, NavGestures, NAV, isOpenHand, isSpread, finger, palm, handSize, SEPARATE, MOVING, EYE };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else root.GestureCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
