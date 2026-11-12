// Shared behavior for every page.
(function () {
  const root = document.documentElement;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // footer year
  const yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  // theme toggle (choice remembered per visitor)
  const toggle = document.getElementById('themeToggle');
  if (toggle) toggle.addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
  });

  // (project cards + filters are built by projects.js from projects-data.js)

  // home intro: reveal when the lock doors finish, or right away on click / key
  const intro = document.getElementById('intro');
  if (intro) {
    if (!root.classList.contains('intro')) intro.remove();
    else {
      let done = false;
      const finish = (fast) => {
        if (done) return; done = true;
        try { sessionStorage.setItem('introSeen', '1'); } catch (e) {}
        root.classList.add('revealed');
        intro.classList.add('gone');
        setTimeout(() => { intro.remove(); root.classList.remove('intro', 'revealed'); }, fast ? 300 : 1000);
      };
      // if the space reel plays first, the lock's clock starts only when the reel ends
      const startLock = () => setTimeout(() => finish(false), 2650);
      if (root.classList.contains('reel')) addEventListener('reeldone', startLock, { once: true });
      else startLock();
      intro.addEventListener('click', () => finish(true));
      addEventListener('keydown', () => { if (!root.classList.contains('reel')) finish(true); });
    }
  }

  // ===== Rotunda: doors in an arc around the viewer =====
  const rot = document.getElementById('rotunda');
  if (rot) {
    const world = document.getElementById('world');
    const doors = [...rot.querySelectorAll('.door')];
    const pods = [...rot.querySelectorAll('.pod')];
    const STEP = 32;          // degrees between doors
    const R = 300;            // distance from viewer to each door (px)
    const mid = (doors.length - 1) / 2;
    const angle = i => (mid - i) * STEP;   // positive = to the viewer's left
    let P = 285;              // camera perspective (px), set by fit()

    doors.forEach((d, i) => {
      d.style.transform = `rotateY(${angle(i)}deg) translateZ(${-R}px) translateY(-30px)`;
    });

    const fit = () => { P = rot.clientWidth < 640 ? 255 : 285; rot.style.perspective = P + 'px'; };
    fit(); addEventListener('resize', fit);

    const cur = { yaw: 0, pitch: 0, dolly: 0 };
    const tgt = { yaw: 0, pitch: 0, dolly: 0 };
    const look = { x: 0, y: 0 };
    let focus = null;         // index of the door being looked at
    let full = false;         // turn all the way to face it (keyboard / arrows / touch)
    let entering = false;
    let lastPointer = 'mouse';
    const hint = document.getElementById('hint');
    const btnL = rot.querySelector('.turn.l'), btnR = rot.querySelector('.turn.r');

    // stops the arrows / swipes walk through, left to right: suit, the doors, suit
    const podAngle = p => parseFloat(p.style.getPropertyValue('--a')) || 0;
    const stops = [...pods.map(p => ({ a: podAngle(p), pod: p })), ...doors.map((d, i) => ({ a: angle(i), i }))].sort((x, y) => y.a - x.a);
    let pod = null;           // the suit alcove being looked at, if any
    const stopIndex = () => pod ? stops.findIndex(s => s.pod === pod) : stops.findIndex(s => s.i === (focus === null ? Math.round(mid) : focus));
    const setFocus = (i, fully) => {
      focus = i; full = !!fully; if (i !== null) pod = null;
      doors.forEach((d, j) => d.classList.toggle('focus', j === i));
      const k = stopIndex(); btnL.disabled = k <= 0; btnR.disabled = k >= stops.length - 1;
    };
    const lookAtPod = p => { pod = p; focus = null; full = true; doors.forEach(d => d.classList.remove('focus'));
      const k = stopIndex(); btnL.disabled = k <= 0; btnR.disabled = k >= stops.length - 1; };

    const aim = () => {
      if (handYaw !== null && !entering) tgt.yaw = handYaw;            // steered by your hand
      else if (pod) tgt.yaw = podAngle(pod) - look.x * 4;              // admiring a suit
      else if (focus === null) tgt.yaw = -look.x * 22;                  // free look
      else tgt.yaw = angle(focus) * (full || entering ? 1 : 0.55) - (entering ? 0 : look.x * 4);
      tgt.pitch = entering ? 0 : look.y * 3;
    };

    const tick = () => {
      aim();
      const k = reduce ? 1 : (entering ? 0.07 : 0.09);
      let moved = false;
      for (const key of ['yaw', 'pitch', 'dolly']) {
        const d = tgt[key] - cur[key];
        if (Math.abs(d) > 0.01) { cur[key] += d * k; moved = true; }
      }
      if (moved || !world.style.transform) {
        world.style.transform =
          `translateZ(${P + cur.dolly}px) rotateX(${cur.pitch}deg) rotateY(${-cur.yaw}deg)`;
        // things far off to the side get stretched by the wide lens: fade them out past ~60°
        if (!entering) for (const s of stops) {
          const el = s.pod || doors[s.i], rel = Math.abs(s.a - cur.yaw);
          el.style.opacity = Math.max(0, Math.min(1, (64 - rel) / 12)).toFixed(2);
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // mouse: look around, hovering a door turns you toward it (it stays picked until you hover another)
    rot.addEventListener('pointermove', e => {
      lastPointer = e.pointerType;
      if (entering || e.pointerType !== 'mouse') return;
      const r = rot.getBoundingClientRect();
      look.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      look.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      const d = e.target.closest('.door'), p = e.target.closest('.pod');
      if (d) { const i = doors.indexOf(d); if (i !== focus || pod) setFocus(i, false); }
      else if (p && p !== pod) lookAtPod(p);
    });
    rot.addEventListener('pointerleave', e => {
      if (entering || e.pointerType !== 'mouse') return;
      look.x = look.y = 0; pod = null; setFocus(null);
    });
    rot.addEventListener('pointerdown', e => { lastPointer = e.pointerType; });

    // arrows / keys: step to the next door and face it fully
    const step = dir => {
      if (entering) return;
      const k = Math.max(0, Math.min(stops.length - 1, stopIndex() + dir)), s = stops[k];
      if (s.pod) lookAtPod(s.pod); else setFocus(s.i, true);
    };
    btnL.addEventListener('click', () => step(-1));
    btnR.addEventListener('click', () => step(1));
    rot.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); if (focus !== null) doors[focus].focus({ preventScroll: true }); }
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); if (focus !== null) doors[focus].focus({ preventScroll: true }); }
    });
    doors.forEach((d, i) => d.addEventListener('focus', () => { if (!entering) setFocus(i, true); }));

    // swipe to turn on touch screens
    let sx = null;
    rot.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    rot.addEventListener('touchend', e => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
    });

    // ---- the gesture gate: doors stay sealed until the hand sequence is done (once per visit) ----
    let locked = true;
    try { locked = sessionStorage.getItem('unlocked') !== '1'; } catch (e) {}
    rot.classList.toggle('locked', locked);
    const deny = d => {
      d.classList.remove('denied'); void d.offsetWidth; d.classList.add('denied');
      if (hint) hint.textContent = 'sealed — unlock it with your hands';
    };

    // click: turn to face, swing open, walk through, load the page
    doors.forEach((d, i) => d.addEventListener('click', e => {
      if (locked) {
        e.preventDefault();
        if (lastPointer !== 'mouse' && focus !== i) { setFocus(i, true); return; }
        deny(d); return;
      }
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;   // new tab etc. → normal link
      if (reduce) return;                                                    // no motion → just go
      e.preventDefault();
      if (entering) return;
      // on touch, the first tap turns you toward a door; the second tap goes in
      if (lastPointer !== 'mouse' && !(focus === i && full)) { setFocus(i, true); return; }
      enter(i);
    }));

    // what the camera module (gesture.js) uses to drive the room
    let handYaw = null;
    window.rotunda = {
      isLocked: () => locked,
      turn: dir => step(dir),
      // x: hand position across the camera, 0 = your left … 1 = your right (already mirrored)
      pan(x) {
        if (entering) return;
        const t = Math.max(-1, Math.min(1, (x - 0.5) / 0.3));
        const reach = pods.length ? Math.max(...pods.map(p => Math.abs(podAngle(p)))) : mid * STEP;
        handYaw = -t * reach;
        const i = Math.max(0, Math.min(doors.length - 1, Math.round(mid - handYaw / STEP)));
        pod = null; if (i !== focus || !full) setFocus(i, true);
      },
      unlockAndEnter() {
        locked = false; rot.classList.remove('locked');
        try { sessionStorage.setItem('unlocked', '1'); } catch (e) {}
        const i = focus === null ? Math.round(mid) : focus;
        if (reduce) { const h = doors[i].getAttribute('href'); window.HandNav ? HandNav.go(h) : (location.href = h); return; }
        enter(i);
      },
    };

    function enter(i) {
      const d = doors[i];
      entering = true; setFocus(i, true);
      if (hint) hint.textContent = '';
      d.classList.add('open');
      setTimeout(() => { tgt.dolly = R - 45; }, 380);
      const portal = document.createElement('div');
      portal.className = 'portal';
      document.body.appendChild(portal);
      setTimeout(() => portal.classList.add('on'), 900);
      setTimeout(() => {
        try { sessionStorage.setItem('viaDoor', '1'); } catch (err) {}
        (window.HandNav ? HandNav.go(d.getAttribute('href')) : location.href = d.getAttribute('href'));
      }, 1200);
    }

    btnL.disabled = false; btnR.disabled = false;
    const touchUI = matchMedia('(hover: none)').matches;
    const idleHint = () => locked
      ? (touchUI ? 'swipe to look around · the doors are sealed' : 'hover to look around · the doors are sealed')
      : (touchUI ? 'swipe to look around · tap a door twice to enter' : 'hover a door to turn toward it · click to walk through');
    if (hint) hint.textContent = idleHint();

    // coming back with the browser's Back button: reset the room
    addEventListener('pageshow', e => {
      if (!e.persisted) return;
      entering = false; tgt.dolly = cur.dolly = 0; look.x = look.y = 0;
      setFocus(null); btnL.disabled = btnR.disabled = false;
      doors.forEach(d => d.classList.remove('open'));
      document.querySelectorAll('.portal').forEach(p => p.remove());
      if (hint) hint.textContent = idleHint();
    });
  }
})();
