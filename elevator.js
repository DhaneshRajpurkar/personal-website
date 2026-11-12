// The elevator: the homepage is one house with two floors. The lab is the top floor, the rotunda is the basement.
// Going between them (scroll, swipe, keys, the call buttons, the hand gestures) closes the elevator doors, rides
// down (or up) with the floor counter ticking, and opens onto the other floor. With reduced motion it just jumps.
(function () {
  const html = document.documentElement;
  const hall = document.getElementById('hallway'), lab = document.getElementById('lab'), el = document.getElementById('elevator');
  if (!hall || !lab || !el) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FLOORS = [{ n: '3', name: 'LAB' }, { n: '2', name: '' }, { n: '1', name: '' }, { n: 'B1', name: 'ROTUNDA' }];
  const elFloor = document.getElementById('elFloor'), elName = document.getElementById('elName'), elArrow = document.getElementById('elArrow');
  const buttons = [...el.querySelectorAll('.el-panel b')];

  const hallTop = () => hall.getBoundingClientRect().top + scrollY;          // the basement starts here
  const jump = f => scrollTo({ top: f ? hallTop() : 0, behavior: 'instant' });
  let floor = 0, riding = false, rides = 0, wheelLock = false, lastWheel = 0, ready = false;
  const settle = () => { floor = scrollY >= hallTop() - innerHeight * .5 ? 1 : 0; };
  settle();
  addEventListener('load', () => setTimeout(() => { settle(); ready = true; }, 300));

  // not while the opening scene plays or the unlock demo is open
  const blocked = () => html.classList.contains('reel') || html.classList.contains('intro') ||
    (document.getElementById('demo') && !document.getElementById('demo').hidden);

  const show = i => { elFloor.textContent = FLOORS[i].n; elName.textContent = FLOORS[i].name; };
  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));

  function go(to) {
    if (riding || blocked()) return;
    if (to === floor && Math.abs(scrollY - (to ? hallTop() : 0)) < 4) return;
    if (reduce) { jump(to); floor = to; return; }
    riding = true; wheelLock = true; rides++;
    const down = to === 1, seq = down ? [0, 1, 2, 3] : [3, 2, 1, 0];
    const move = rides === 1 ? 1700 : 1000;                       // the first ride is the scenic one
    html.classList.add('riding');
    el.hidden = false; el.classList.toggle('up', !down);
    elArrow.textContent = down ? '▼' : '▲';
    show(seq[0]); buttons.forEach(b => b.classList.toggle('lit', +b.dataset.f === seq[3]));
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on', 'closed')));   // doors slide shut
    at(700, () => { jump(to); floor = to; el.classList.add('moving'); });                         // behind the doors, change floor
    for (let i = 1; i < 4; i++) at(700 + move * i / 3, () => show(seq[i]));
    at(700 + move, () => { el.classList.remove('moving'); el.classList.add('arrive'); });          // stop, settle, ding
    at(1050 + move, () => {
      el.classList.remove('closed');                                                                // doors open
      const room = down ? hall : lab;
      room.classList.add('step-out'); setTimeout(() => room.classList.remove('step-out'), 1100);
    });
    at(1800 + move, () => {
      el.classList.remove('on', 'arrive', 'up'); el.hidden = true;
      html.classList.remove('riding'); riding = false;
      if (down) { const r = document.getElementById('rotunda'); if (r) r.focus({ preventScroll: true }); }
    });
  }
  window.elevator = { go, get floor() { return floor; }, get riding() { return riding; } };

  // mouse wheel / trackpad. After a ride, keep swallowing the trackpad's leftover momentum until it pauses.
  addEventListener('wheel', e => {
    const now = performance.now(), gap = now - lastWheel; lastWheel = now;
    if (riding) { e.preventDefault(); return; }
    if (wheelLock) { if (gap < 250) { e.preventDefault(); return; } wheelLock = false; }
    if (e.ctrlKey || blocked()) return;
    if (e.deltaY > 0 && floor === 0) { e.preventDefault(); go(1); }
    else if (e.deltaY < 0 && floor === 1 && scrollY <= hallTop() + 4) { e.preventDefault(); go(0); }
  }, { passive: false });

  // touch: a vertical swipe at the edge of a floor (sideways swipes still turn the rotunda)
  let ty = 0, tx = 0, tdone = false;
  addEventListener('touchstart', e => { ty = e.touches[0].clientY; tx = e.touches[0].clientX; tdone = false; }, { passive: true });
  addEventListener('touchmove', e => {
    if (riding) { e.preventDefault(); return; }
    if (tdone || blocked()) return;
    const dy = e.touches[0].clientY - ty, dx = e.touches[0].clientX - tx;
    if (Math.abs(dy) < Math.abs(dx)) return;
    if (floor === 0 && dy < 0) { e.preventDefault(); if (dy < -40) { tdone = true; go(1); } }
    else if (floor === 1 && dy > 0 && scrollY <= hallTop() + 4) { e.preventDefault(); if (dy > 40) { tdone = true; go(0); } }
  }, { passive: false });

  // keyboard
  const SCROLL_KEYS = [' ', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'];
  addEventListener('keydown', e => {
    if (riding) { if (SCROLL_KEYS.includes(e.key)) e.preventDefault(); return; }
    if (blocked() || e.altKey || e.ctrlKey || e.metaKey || (e.target.closest && e.target.closest('input, textarea, select, button, [contenteditable]'))) return;
    if (floor === 0 && ['ArrowDown', 'PageDown', ' ', 'End'].includes(e.key)) { e.preventDefault(); go(1); }
    else if (floor === 1 && (e.key === 'Home' || (['ArrowUp', 'PageUp'].includes(e.key) && scrollY <= hallTop() + 4))) { e.preventDefault(); go(0); }
  });

  // links / call buttons that point at a floor
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const h = a.getAttribute('href');
    if (h === '#hallway' || h === 'index.html#hallway') { e.preventDefault(); go(1); }
    else if (h === '#lab') { e.preventDefault(); go(0); }
  }, true);

  // anything else that scrolls the page (scrollbar drag, hand-gesture flicks): take the elevator instead
  addEventListener('scroll', () => {
    if (!ready || riding || blocked()) return;
    if (floor === 0 && scrollY > 80) go(1);
    else if (floor === 1 && scrollY < hallTop() - 80) go(0);
  }, { passive: true });
})();
