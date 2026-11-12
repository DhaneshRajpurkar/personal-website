// The rotunda gate: the Separate → Moving → Eye unlock. Uses the shared camera (handcam.js).
// After unlocking, the camera stays on and hand navigation (handnav.js) takes over.
(function () {
  const { GestureLock, isOpenHand } = window.GestureCore;
  const gate = document.getElementById('gate');
  if (!gate) return;
  if (!window.rotunda || !window.rotunda.isLocked() || window.top !== window) { gate.remove(); return; }

  const btn = document.getElementById('camBtn');
  const card = document.getElementById('gateCard');
  const msg = document.getElementById('gateMsg');
  const hud = document.getElementById('hud');
  const canvas = document.getElementById('camView');
  const note = document.getElementById('hudNote');
  const steps = [...hud.querySelectorAll('.steps li')];
  const lock = new GestureLock();
  let smoothX = null, off = null;

  btn.addEventListener('click', async () => {
    btn.disabled = true; msg.textContent = 'Loading hand tracking…';
    try { await HandCam.start(); }
    catch (err) { btn.disabled = false; msg.textContent = HandCam.message(err); return; }
    card.hidden = true; hud.hidden = false;
    off = HandCam.on(frame);
  });
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) msg.textContent = HandCam.message({ code: 'unsupported' });

  function frame(hands, t) {
    HandCam.draw(canvas, hands);
    const r = lock.update(hands, t);
    if (r.pan !== null) {                    // steer with one open palm (mirrored: hand right → turn right)
      const x = 1 - r.pan;
      smoothX = smoothX === null ? x : smoothX + (x - smoothX) * 0.25;
      window.rotunda.pan(smoothX);
    }
    show(r, hands);
    if (r.unlocked) {
      off(); hud.classList.add('granted'); note.textContent = 'access granted';
      try { sessionStorage.setItem('handNav', 'on'); } catch (e) {}   // hands now drive the whole site
      setTimeout(() => window.rotunda.unlockAndEnter(), 700);
    }
  }

  function show(r, hands) {
    steps.forEach((li, i) => {
      li.classList.toggle('done', i < r.step);
      li.classList.toggle('active', i === r.step);
      li.querySelector('i').style.width = (i < r.step ? 100 : i === r.step ? r.progress * 100 : 0) + '%';
    });
    if (r.note && r.step > 0) note.textContent = r.note;
    else if (hands.length === 0) note.textContent = 'raise a hand into view';
    else if (hands.length === 1) note.textContent = isOpenHand(hands[0]) ? 'steering — face the door you want' : 'open your palm to steer';
    else note.textContent = r.note || 'cross your wrists, fingers spread, to begin';
  }
})();
