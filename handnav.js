// Hand navigation that survives page changes and refreshes.
//
// How it stays alive: once the doors are unlocked, the top page becomes a "shell" that owns the camera,
// and every page of the site loads inside a full-screen frame within it. Clicking a link only changes
// the frame, so the camera never turns off. On a real refresh, the shell rebuilds itself and restarts
// the camera automatically (the browser remembers the permission, so it doesn't ask again on https).
//
// Gestures:  ☝ point = cursor · 🤏 pinch = click · ✋ high/low = scroll · ✋ swipe = next/prev door · ✊ hold = rotunda
// The mouse, keyboard and touch keep working the whole time.
(function () {
  const KEY = 'handNav';
  const isTop = window.top === window;
  const isOn = () => { try { return sessionStorage.getItem(KEY) === 'on'; } catch (e) { return false; } };
  const setOn = v => { try { v ? sessionStorage.setItem(KEY, 'on') : sessionStorage.removeItem(KEY); } catch (e) {} };

  const HandNav = window.HandNav = {
    // used by site.js for every in-site navigation it triggers
    go(href) { location.href = href; },
    get shell() { return false; },
  };

  if (!isTop) return client();

  // ------------------------------------------------------------------ shell (top page)
  let frameEl = null, built = false;

  HandNav.go = href => {
    if (built) frameEl.src = href;
    else if (isOn()) build(href);
    else location.href = href;
  };
  Object.defineProperty(HandNav, 'shell', { get: () => built });

  if (isOn()) build(location.href);                // refresh / new visit while hand mode is on

  function build(href) {
    built = true;
    document.documentElement.classList.add('shell');
    const ui = document.createElement('div');
    ui.className = 'hn-ui';
    ui.innerHTML = `
      <iframe class="hn-frame" title="Site"></iframe>
      <div class="hn-cursor" aria-hidden="true"><span></span></div>
      <div class="hn-toast" role="status"></div>
      <aside class="hn-dock" aria-label="Hand control">
        <div class="hn-top"><b class="hn-mode">starting camera…</b><button class="hn-min" type="button" aria-label="Minimize">–</button></div>
        <canvas width="200" height="150"></canvas>
        <ul class="hn-help">
          <li><b>☝</b> point up to move</li><li><b>🤏</b> pinch to click</li>
          <li><b>👉</b> point left / right: prev / next</li>
          <li><b>✌</b> flick two fingers: scroll</li>
          <li><b>✊</b> hold: back to the rotunda doors</li>
        </ul>
        <div class="hn-err" hidden><p></p><button class="btn" type="button">Retry camera</button></div>
        <button class="hn-off" type="button">Turn off hand control</button>
      </aside>`;
    document.body.appendChild(ui);

    frameEl = ui.querySelector('.hn-frame');
    const cursor = ui.querySelector('.hn-cursor');
    const dock = ui.querySelector('.hn-dock');
    const mode = ui.querySelector('.hn-mode');
    const canvas = ui.querySelector('canvas');
    const err = ui.querySelector('.hn-err');
    const toast = ui.querySelector('.hn-toast');
    let current = href, toastT = 0;

    frameEl.src = href;
    const post = m => { try { frameEl.contentWindow.postMessage({ hn: 1, ...m }, '*'); } catch (e) {} };
    const say = text => { toast.textContent = text; toast.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('on'), 2500); };

    // the framed page tells us where it is → keep the address bar and title in sync
    addEventListener('message', e => {
      if (e.source !== frameEl.contentWindow || !e.data || !e.data.hn) return;
      if (e.data.t === 'loc') {
        current = e.data.href; document.title = e.data.title;
        try { history.replaceState(null, '', e.data.href); } catch (x) {}
      }
      if (e.data.t === 'toast') say(e.data.text);
    });

    ui.querySelector('.hn-min').onclick = () => dock.classList.toggle('min');
    ui.querySelector('.hn-off').onclick = () => {
      setOn(false); HandCam.stop();
      try { history.replaceState(null, '', current); } catch (x) {}
      location.reload();                              // reload as a normal page (works even if only the #part differs)
    };
    err.querySelector('button').onclick = start;

    const nav = new GestureCore.NavGestures();
    HandCam.on((hands, t) => {
      if (!dock.classList.contains('min')) HandCam.draw(canvas, hands);
      const r = nav.update(hands, t);
      const W = innerWidth, H = innerHeight;

      if (r.mode === 'point' && r.cursor) {
        const x = r.cursor.x * W, y = r.cursor.y * H;
        cursor.style.transform = `translate(${x}px, ${y}px)`;
        cursor.classList.add('on');
        cursor.classList.toggle('pinch', r.pinching);
        post({ t: 'move', x, y });
        if (r.click) {
          post({ t: 'click', x, y });
          cursor.classList.remove('clicked'); void cursor.offsetWidth; cursor.classList.add('clicked');
        }
      } else cursor.classList.remove('on');

      if (r.flick) post({ t: 'fling', dir: r.flick, power: r.flickPower });
      if (r.swipe) { post({ t: 'swipe', dir: r.swipe }); say(r.swipe === 'next' ? 'next door →' : '← previous door'); }
      if (r.home) { post({ t: 'home' }); say('back to the rotunda'); }

      mode.textContent =
        !hands.length ? (HandCam.sleeping ? 'resting · raise a hand' : 'show a hand') :
        r.mode === 'point' ? (r.pinching ? 'click' : 'pointing') :
        r.mode === 'scroll' ? (r.flick ? (r.flick === 'down' ? 'scroll ↓' : 'scroll ↑') : 'flick ✌ up / down') :
        r.mode === 'side' ? (r.side === 'next' ? 'next door →' : '← previous door') + (r.sideProgress < 1 ? ' (hold)' : '') :
        r.mode === 'fist' ? 'hold fist → rotunda' : 'tracking';
      // the thin bar on top of the dock fills while you hold a fist or a sideways point
      dock.style.setProperty('--home', r.mode === 'fist' ? r.homeProgress : r.mode === 'side' ? r.sideProgress : 0);
    });

    async function start() {
      err.hidden = true; mode.textContent = 'starting camera…';
      try { await HandCam.start(); mode.textContent = 'show a hand'; }
      catch (e) { err.hidden = false; err.querySelector('p').textContent = HandCam.message(e) + ' Mouse and keyboard still work.'; mode.textContent = 'camera off'; }
    }
    start();
  }

  // ------------------------------------------------------------------ client (page inside the shell)
  function client() {
    const tell = m => { try { parent.postMessage({ hn: 1, ...m }, '*'); } catch (e) {} };
    const report = () => tell({ t: 'loc', href: location.href, title: document.title });
    if (document.readyState === 'loading') addEventListener('DOMContentLoaded', report); else report();
    addEventListener('hashchange', report);

    // inside the shell, page changes stay inside the frame
    HandNav.go = href => { location.href = href; };

    let hoverEl = null, vel = 0, glide = 0;
    function glideStep() {
      if (Math.abs(vel) < 0.5) { vel = 0; glide = 0; return; }
      scrollBy({ top: vel, behavior: 'instant' });   // 'instant': the site's smooth-scroll would fight each step
      vel *= 0.92;
      glide = requestAnimationFrame(glideStep);
    }
    const at = (x, y) => document.elementFromPoint(x, y);
    const pointer = (type, el, x, y) => el && el.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, pointerType: 'mouse', isPrimary: true, button: 0,
    }));

    addEventListener('message', e => {
      if (e.source !== parent || !e.data || !e.data.hn) return;
      const m = e.data;
      if (m.t === 'move') {
        const el = at(m.x, m.y);
        pointer('pointermove', el, m.x, m.y);
        const target = el && el.closest('a, button, [role="button"], input, select, textarea, label');
        if (target !== hoverEl) {
          if (hoverEl) hoverEl.classList.remove('hn-hover');
          hoverEl = target; if (hoverEl) hoverEl.classList.add('hn-hover');
        }
      }
      if (m.t === 'click') {
        const el = at(m.x, m.y); if (!el) return;
        pointer('pointerdown', el, m.x, m.y); pointer('pointerup', el, m.x, m.y);
        const target = el.closest('a, button, [role="button"], input, select, textarea, label') || el;
        if (target.tagName === 'A' && target.target === '_blank' && target.href && !target.href.endsWith('#')) {
          const w = window.open(target.href, '_blank', 'noopener');
          if (!w) tell({ t: 'toast', text: 'Your browser blocked the new tab. Click that link with the mouse.' });
          return;
        }
        if (target.focus) target.focus({ preventScroll: true });
        target.click();
      }
      // a flick adds speed; the page glides and slows down (flicks in a row build up speed)
      if (m.t === 'fling') {
        vel += (m.dir === 'down' ? 1 : -1) * 26 * (m.power || 1);
        if (!glide) glide = requestAnimationFrame(glideStep);
      }
      if (m.t === 'swipe') {
        if (window.rotunda && window.rotunda.turn) return window.rotunda.turn(m.dir === 'next' ? 1 : -1);
        const link = document.querySelector(`[data-nav="${m.dir}"]`);
        if (link) link.click();
      }
      if (m.t === 'home') {
        const hall = document.getElementById('hallway');
        if (hall && window.elevator) window.elevator.go(1);          // homepage: ride the elevator down
        else if (hall) hall.scrollIntoView({ behavior: 'smooth' });
        else location.href = 'index.html#hallway';
      }
    });
  }
})();
