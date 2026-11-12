// Interactive resume viewer: renders resume.pdf with PDF.js (sharp at any zoom, real clickable links),
// with zoom, fit, full screen, drag-to-pan and download. If PDF.js can't load (offline, or the page was
// opened straight from a file), the picture of page 1 that's already in the page stays put.
// To update your resume: replace resume.pdf (and, if you like, media/resume-page.webp). Nothing else changes.
(function () {
  const box = document.getElementById('resumeViewer');
  if (!box) return;
  const stage = document.getElementById('rvStage'), pagesEl = document.getElementById('rvPages'), zoomEl = document.getElementById('rvZoom');
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  let doc = null, scale = 1, fit = true, rendering = 0;

  // ---- zoom (works on the fallback picture too) ----
  const fitScale = baseW => Math.min(1.6, (stage.clientWidth - 32) / baseW);
  function setZoom(next, keepFit) {
    fit = !!keepFit;
    scale = Math.max(.4, Math.min(3, next));
    zoomEl.textContent = Math.round(scale * 100) + '%';
    if (doc) render(); else pagesEl.style.setProperty('--w', Math.round(612 * scale) + 'px');
  }
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'in') setZoom(scale * 1.2);
    if (act === 'out') setZoom(scale / 1.2);
    if (act === 'fit') setZoom(fitScale(612), true);
    if (act === 'full') { if (document.fullscreenElement) document.exitFullscreen(); else (box.requestFullscreen || box.webkitRequestFullscreen || (() => {})).call(box); }
  });
  document.addEventListener('fullscreenchange', () => { box.classList.toggle('is-full', !!document.fullscreenElement); if (fit) setTimeout(() => setZoom(fitScale(612), true), 50); });
  stage.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); setZoom(scale * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); }, { passive: false });
  addEventListener('resize', () => { if (fit) setZoom(fitScale(612), true); });
  stage.addEventListener('keydown', e => { if (e.key === '+' || e.key === '=') setZoom(scale * 1.2); if (e.key === '-') setZoom(scale / 1.2); if (e.key === '0') setZoom(fitScale(612), true); });

  // ---- drag to pan when zoomed in ----
  let drag = null;
  stage.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.target.closest('a')) return; drag = { x: e.clientX, y: e.clientY, l: stage.scrollLeft, t: stage.scrollTop }; stage.classList.add('dragging'); });
  addEventListener('pointermove', e => { if (!drag) return; stage.scrollLeft = drag.l - (e.clientX - drag.x); stage.scrollTop = drag.t - (e.clientY - drag.y); });
  addEventListener('pointerup', () => { drag = null; stage.classList.remove('dragging'); });

  // ---- PDF.js ----
  async function render() {
    const id = ++rendering, dpr = Math.min(3, devicePixelRatio || 1);
    const frag = document.createDocumentFragment();
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n); if (id !== rendering) return;
      const vp = page.getViewport({ scale });
      const wrap = document.createElement('div'); wrap.className = 'rv-page'; wrap.style.width = vp.width + 'px'; wrap.style.height = vp.height + 'px';
      const c = document.createElement('canvas'); c.width = Math.floor(vp.width * dpr); c.height = Math.floor(vp.height * dpr);
      wrap.appendChild(c);
      await page.render({ canvasContext: c.getContext('2d'), viewport: page.getViewport({ scale: scale * dpr }) }).promise;
      if (id !== rendering) return;
      for (const a of await page.getAnnotations()) {                       // real, clickable links from the PDF
        if (a.subtype !== 'Link' || !a.url) continue;
        const [x1, y1, x2, y2] = vp.convertToViewportRectangle(a.rect);
        const link = document.createElement('a'); link.className = 'rv-link'; link.href = a.url; link.target = '_blank'; link.rel = 'noopener';
        if (/^mailto:|^tel:/i.test(a.url)) continue;
        Object.assign(link.style, { left: Math.min(x1, x2) + 'px', top: Math.min(y1, y2) + 'px', width: Math.abs(x2 - x1) + 'px', height: Math.abs(y2 - y1) + 'px' });
        link.setAttribute('aria-label', a.url); wrap.appendChild(link);
      }
      frag.appendChild(wrap);
    }
    if (id !== rendering) return;
    pagesEl.replaceChildren(frag);
    box.classList.add('live');
  }

  setZoom(fitScale(612), true);
  if (location.protocol === 'file:') return;                                 // PDF.js can't read local files: keep the picture
  const s = document.createElement('script'); s.src = PDFJS + 'pdf.min.js'; s.async = true;
  s.onload = async () => {
    try {
      const lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
      doc = await lib.getDocument({ url: 'resume.pdf', isEvalSupported: false }).promise;
      setZoom(fit ? fitScale((await doc.getPage(1)).getViewport({ scale: 1 }).width) : scale, fit);
    } catch (e) { doc = null; console.warn('resume viewer: using the picture instead', e); }
  };
  document.head.appendChild(s);
})();
