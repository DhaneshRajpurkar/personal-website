// Unlock demonstration: when a visitor first reaches the sealed rotunda, two animated hands (Dhanesh's own
// recorded gesture, media/demo-data.js) show the Separate → Moving → Eye unlock, step by step.
// Plays twice, then closes by itself. "Watch how it's done" in the gate card replays it.
(function () {
  const demo = document.getElementById('demo');
  const rot = document.getElementById('rotunda');
  const D = window.UNLOCK_DEMO;
  if (!demo || !rot) return;
  const locked = () => window.rotunda && window.rotunda.isLocked();
  if (!D || !locked() || window.top !== window) { demo.remove(); const b = document.getElementById('demoBtn'); if (b) b.remove(); return; }

  const canvas = document.getElementById('demoView'), ctx = canvas.getContext('2d');
  const chips = [...demo.querySelectorAll('.demo-steps li')];
  const tip = document.getElementById('demoTip');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BONES = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
  const PALM = [0, 1, 5, 9, 13, 17];
  const TIPS = [4, 8, 12, 16, 20];
  const LOOPS = 2, HOLD_MS = 700;
  const frameMs = 1000 / D.fps, clipMs = D.frames * frameMs;

  // sharp on high-density screens
  function size() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const pt = (f, h, j) => { const i = ((f * 2 + h) * 21 + j) * 2; return [D.pts[i], D.pts[i + 1]]; };
  const css = n => getComputedStyle(demo).getPropertyValue(n).trim();

  function draw(f, done) {
    const w = canvas.clientWidth, h = canvas.clientHeight, s = Math.min(w, h) / 1000 * 1.05;
    const ox = w / 2 - 500 * s, oy = h / 2 - 500 * s, P = (x, y) => [ox + x * s, oy + y * s];
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = css('--grid') || 'rgba(255,255,255,.05)'; ctx.lineWidth = 1;   // faint grid, like the rest of the site
    for (let x = (w / 2) % 24; x < w; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = (h / 2) % 24; y < h; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    const cols = [css('--accent') || '#34c5ae', css('--accent-2') || '#e9a24a'];
    for (let hd = 0; hd < 2; hd++) {
      const p = j => P(...pt(f, hd, j));
      const hs = Math.hypot(p(0)[0] - p(9)[0], p(0)[1] - p(9)[1]);          // hand size on screen
      ctx.lineCap = ctx.lineJoin = 'round';
      // the hand's body: palm + thick soft fingers
      ctx.globalAlpha = .22; ctx.fillStyle = ctx.strokeStyle = cols[hd];
      ctx.beginPath(); PALM.forEach((j, i) => { const q = p(j); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.fill();
      ctx.lineWidth = hs * .3;
      for (const [a, b] of BONES) { ctx.beginPath(); ctx.moveTo(...p(a)); ctx.lineTo(...p(b)); ctx.stroke(); }
      // the skeleton on top
      ctx.globalAlpha = 1; ctx.lineWidth = Math.max(1.5, hs * .05);
      for (const [a, b] of BONES) { ctx.beginPath(); ctx.moveTo(...p(a)); ctx.lineTo(...p(b)); ctx.stroke(); }
      for (let j = 0; j < 21; j++) {
        const q = p(j), r = TIPS.includes(j) ? Math.max(2.5, hs * .075) : Math.max(1.5, hs * .04);
        ctx.fillStyle = TIPS.includes(j) ? '#fff' : cols[hd];
        ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, Math.PI * 2); ctx.fill();
      }
    }
    // in the Eye step, the opening between the hands lights up as the ring
    const eyeFrom = D.steps[2].from;
    if (f >= eyeFrom) {
      const k = Math.min(1, (f - eyeFrom) / 18) * (done ? 1.25 : 1);
      const top = [0, 1].map(hd => P(...pt(f, hd, 12))), th = [0, 1].map(hd => P(...pt(f, hd, 4)));
      const cx = (top[0][0] + top[1][0] + th[0][0] + th[1][0]) / 4, cy = (top[0][1] + top[1][1] + th[0][1] + th[1][1]) / 4;
      const r = Math.hypot(top[0][0] - th[0][0], top[0][1] - th[0][1]) * .22 * k;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.6);
      g.addColorStop(0, `rgba(52,197,174,${.45 * k})`); g.addColorStop(1, 'rgba(52,197,174,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#34c5ae'; ctx.lineWidth = 2; ctx.globalAlpha = k;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }

  function label(f, done) {
    let i = 0; while (i < D.steps.length - 1 && f >= D.steps[i + 1].from) i++;
    chips.forEach((c, k) => { c.classList.toggle('on', k === i && !done); c.classList.toggle('done', k < i || done); });
    tip.textContent = done ? 'unlocked — the door you face opens' : D.steps[i].tip;
    demo.classList.toggle('granted', !!done);
  }

  let raf = 0, t0 = 0, auto = false, open = false;
  function play(isAuto) {
    auto = isAuto; open = true;
    demo.hidden = false; requestAnimationFrame(() => demo.classList.add('show'));
    size(); t0 = performance.now();
    try { sessionStorage.setItem('demoSeen', '1'); } catch (e) {}
    cancelAnimationFrame(raf);
    if (reduce) { draw(D.frames - 1, true); label(D.frames - 1, true); return; }   // no motion: just the final pose
    raf = requestAnimationFrame(tick);
  }
  function tick(now) {
    const e = now - t0, per = clipMs + HOLD_MS, loop = Math.floor(e / per), le = e - loop * per;
    if (loop >= LOOPS) { if (auto) close(); else { draw(D.frames - 1, true); label(D.frames - 1, true); } return; }
    const f = Math.min(D.frames - 1, Math.floor(le / frameMs)), done = le >= clipMs;
    try { draw(f, done); label(f, done); } catch (err) { console.error(err); close(); return; }   // never freeze on screen
    raf = requestAnimationFrame(tick);
  }
  function close() {
    if (!open) return; open = false;
    cancelAnimationFrame(raf);
    demo.classList.remove('show');
    setTimeout(() => { if (!open) demo.hidden = true; }, 350);
  }

  // while the demo is open, the mouse / swipes shouldn't turn the room behind it
  for (const ev of ['pointermove', 'touchstart', 'touchend']) demo.addEventListener(ev, e => e.stopPropagation(), { passive: true });
  demo.querySelector('.demo-x').addEventListener('click', close);
  demo.addEventListener('click', e => { if (e.target === demo) close(); });
  addEventListener('keydown', e => { if (open && e.key === 'Escape') close(); });
  const tryBtn = document.getElementById('demoTry');
  tryBtn.addEventListener('click', () => { close(); const b = document.getElementById('camBtn'); if (b && !b.disabled) b.click(); });
  const again = document.getElementById('demoBtn');
  if (again) again.addEventListener('click', () => play(false));
  addEventListener('resize', () => { if (open) size(); });

  // first arrival at the rotunda (after the intro), once per visit
  let seen = false; try { seen = sessionStorage.getItem('demoSeen') === '1'; } catch (e) {}
  if (!seen && 'IntersectionObserver' in window) {
    const html = document.documentElement;
    let visible = false, fired = false;
    const tryStart = () => {
      if (fired || !visible || html.classList.contains('intro') || html.classList.contains('reel') || html.classList.contains('riding') || !locked()) return;
      fired = true; io.disconnect(); mo.disconnect();
      setTimeout(() => { if (locked() && document.getElementById('hud').hidden) play(true); }, 500);
    };
    const io = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; tryStart(); }, { threshold: .55 });
    const mo = new MutationObserver(tryStart);                  // e.g. the rotunda was already on screen when the intro ended
    io.observe(rot); mo.observe(html, { attributes: true, attributeFilter: ['class'] });
  }
})();
