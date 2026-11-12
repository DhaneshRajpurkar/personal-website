// Builds the Projects page and each project's detail page from projects-data.js: the cards, the filter buttons
// (one per tag), the full write-ups, and a friendly error box if something in the data needs fixing.
// You shouldn't need to edit this file.
(function () {
  const grid = document.getElementById('projectGrid');       // projects.html
  const detail = document.getElementById('projectDetail');   // project.html
  if (!grid && !detail) return;
  const list = window.PROJECTS;
  const problems = [];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = u => /^(https?:|mailto:|media\/|\.\/|#)/i.test(String(u || '').trim()) ? String(u).trim() : null;
  const paras = t => (Array.isArray(t) ? t : [t]).filter(x => x != null && String(x).trim()).map(x => `<p>${esc(x)}</p>`).join('');
  const slug = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-');
  const hasDetail = p => !!(p && ((Array.isArray(p.sections) && p.sections.length) || (Array.isArray(p.gallery) && p.gallery.length) || p.video));
  const pageUrl = p => 'project.html?p=' + encodeURIComponent(p._id);

  // ---------- check the data ----------
  if (!Array.isArray(list)) {
    problems.push('projects-data.js didn\'t load, or has a typo that stops it running (often a missing comma or quote). Open the browser console (F12) to see the line number.');
  } else {
    const ids = {};
    list.forEach((p, i) => {
      const name = p && p.title ? `"${p.title}"` : `project #${i + 1}`;
      for (const f of ['title', 'kind', 'summary']) if (!p || !String(p[f] || '').trim()) problems.push(`${name}: "${f}" is missing.`);
      if (!p) return;
      if (!Array.isArray(p.tags)) problems.push(`${name}: "tags" must be a list, like ["hardware"].`);
      if (p.links && !Array.isArray(p.links)) problems.push(`${name}: "links" must be a list of { label, url }.`);
      (Array.isArray(p.links) ? p.links : []).forEach((l, j) => {
        if (!l || !l.label || !safeUrl(l.url)) problems.push(`${name}: link #${j + 1} needs a label and a url starting with https://`);
      });
      if (p.sections && !Array.isArray(p.sections)) problems.push(`${name}: "sections" must be a list of { heading, text }.`);
      (Array.isArray(p.sections) ? p.sections : []).forEach((s, j) => {
        if (!s || !String(s.heading || '').trim()) problems.push(`${name}: section #${j + 1} needs a "heading".`);
        if (s && s.bullets && !Array.isArray(s.bullets)) problems.push(`${name}: section #${j + 1}: "bullets" must be a list, like ["one", "two"].`);
        for (const im of s ? [].concat(s.image || [], s.images || []) : []) if (!im || !safeUrl(im.src)) problems.push(`${name}: section #${j + 1}: every image needs a "src", like "media/projects/${slug(p.id || p.title)}/photo.jpg".`);
      });
      if (p.gallery && !Array.isArray(p.gallery)) problems.push(`${name}: "gallery" must be a list of { src, caption }.`);
      (Array.isArray(p.gallery) ? p.gallery : []).forEach((g, j) => {
        if (!g || !safeUrl(g.src)) problems.push(`${name}: gallery photo #${j + 1} needs a "src", like "media/projects/photo.jpg".`);
      });
      if (p.video && !safeUrl(p.video)) problems.push(`${name}: "video" should be a link starting with https://`);
      p._id = slug(p.id || p.title) || 'project-' + (i + 1);
      if (ids[p._id]) problems.push(`${name}: two projects share the page id "${p._id}". Give one of them a different "id".`);
      ids[p._id] = true;
    });
  }
  const host = grid || detail;
  if (problems.length) {
    const box = document.createElement('div');
    box.className = 'data-error';
    box.innerHTML = '<b>Something in projects-data.js needs fixing</b><ul>' + problems.map(m => `<li>${esc(m)}</li>`).join('') + '</ul>';
    host.before(box);
    if (!Array.isArray(list)) return;
  }
  const projects = list.filter(p => p && p.title);
  const tagsOf = p => Array.isArray(p.tags) ? p.tags.map(t => String(t).toLowerCase().trim()).filter(Boolean) : [];
  const linksOf = p => (Array.isArray(p.links) ? p.links : []).filter(l => l && l.label && safeUrl(l.url));
  const chips = p => Array.isArray(p.tools) && p.tools.length ? `<div class="chips">${p.tools.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : '';
  const linkRow = (p, cls) => { const L = linksOf(p); return L.length ? `<div class="${cls}">${L.map(l => `<a class="${cls === 'cta' ? 'btn' : 'more'}" href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener">${esc(l.label)} →</a>`).join('')}</div>` : ''; };

  // ---------- Projects page: cards + filters (every card opens its project's page) ----------
  if (grid) {
    const cards = projects.map(p => {
      const img = p.image && safeUrl(p.image);
      const meta = [p.status, p.year].filter(Boolean).map(esc).join(' · ');
      const el = document.createElement('article');
      el.className = 'card has-page' + (img ? ' has-img' : '');
      el.dataset.tags = tagsOf(p).join(' ');
      el.innerHTML =
        (img ? `<div class="card-img"><img src="${esc(img)}" alt="${esc(p.imageAlt || p.title)}" loading="lazy"></div>` : '') +
        `<span class="kind">${esc(p.kind)}</span>` +
        `<h3><a class="card-link" href="${pageUrl(p)}">${esc(p.title)}</a></h3>` +
        (meta ? `<span class="meta">${meta}</span>` : '') +
        `<p>${esc(p.summary)}</p>` +
        chips(p) +
        `<div class="links-row"><a class="more story" href="${pageUrl(p)}">${hasDetail(p) ? 'Read the full story' : 'Open project'} →</a></div>`;
      el.addEventListener('click', e => { if (!e.target.closest('a, button') && !getSelection().toString()) location.href = pageUrl(p); });
      grid.appendChild(el);
      return el;
    });

    const bar = document.getElementById('projectFilters');
    if (bar) {
      const order = ['hardware', 'software', 'ai'];
      const used = [...new Set(cards.flatMap(c => c.dataset.tags.split(' ').filter(Boolean)))]
        .sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99) || a.localeCompare(b));
      const label = t => t === 'ai' ? 'AI' : t.charAt(0).toUpperCase() + t.slice(1);
      bar.innerHTML = ['all', ...used].map(t => `<button data-f="${esc(t)}" aria-pressed="${t === 'all'}">${t === 'all' ? 'All' : esc(label(t))}</button>`).join('');
      const btns = [...bar.querySelectorAll('button')];
      btns.forEach(b => b.addEventListener('click', () => {
        btns.forEach(x => x.setAttribute('aria-pressed', x === b));
        const f = b.dataset.f;
        cards.forEach(c => c.classList.toggle('hidden', f !== 'all' && !c.dataset.tags.split(' ').includes(f)));
      }));
    }
    return;
  }

  // ---------- Article page: project.html?p=<id> ----------
  const want = new URLSearchParams(location.search).get('p') || '';
  const i = projects.findIndex(q => q._id === want), p = projects[i];
  const head = document.getElementById('projectHead');
  if (!p) {
    head.querySelector('h1').textContent = 'Project not found';
    detail.innerHTML = `<p class="lede">There's no project called "${esc(want)}". It may have been renamed.</p><p><a class="btn" href="projects.html">← All projects</a></p>`;
    return;
  }
  document.title = `${p.title} — Dhanesh Rajpurkar`;
  head.querySelector('.num').textContent = p.kind;
  head.querySelector('h1').textContent = p.title;

  const sectionsData = (Array.isArray(p.sections) ? p.sections : []).filter(s => s && s.heading);
  const words = [p.summary, ...sectionsData.flatMap(s => [].concat(s.text || [], s.bullets || []))].join(' ').split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 220));
  const meta = [p.status, p.year, p.dates, p.team, sectionsData.length ? `${minutes} min read` : ''].filter(Boolean).map(esc).join(' · ');

  const figure = (im, cls = '') => im && safeUrl(im.src) ? `<figure class="pd-fig ${cls}"><a href="${esc(safeUrl(im.src))}" target="_blank" rel="noopener"><img src="${esc(safeUrl(im.src))}" alt="${esc(im.alt || im.caption || p.title)}" loading="lazy"></a>${im.caption ? `<figcaption>${esc(im.caption)}</figcaption>` : ''}</figure>` : '';
  const ytId = u => { const m = String(u || '').match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/); return m && m[1]; };
  let video = '';
  if (p.video && safeUrl(p.video)) {
    const id = ytId(p.video);
    video = id
      ? `<div class="pd-video"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="${esc(p.title)} video" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`
      : `<p><a class="btn" href="${esc(safeUrl(p.video))}" target="_blank" rel="noopener">▶ Watch the video</a></p>`;
  }
  const sections = sectionsData.map(s => {
    const imgs = [].concat(s.images || []).filter(im => im && safeUrl(im.src));
    return `<section class="pd-sec"><h2>${esc(s.heading)}</h2>${paras(s.text)}` +
      (Array.isArray(s.bullets) && s.bullets.length ? `<ul>${s.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : '') +
      (s.quote ? `<blockquote class="pd-quote">${esc(s.quote)}</blockquote>` : '') +
      figure(s.image, s.image && s.image.wide ? 'wide' : '') +
      (imgs.length ? `<div class="pd-row n${Math.min(imgs.length, 3)}">${imgs.map(im => figure(im)).join('')}</div>` : '') +
      (s.after ? paras(s.after) : '') + '</section>';
  }).join('');
  const gallery = (Array.isArray(p.gallery) ? p.gallery : []).filter(g => g && safeUrl(g.src));
  const img = p.image && safeUrl(p.image);
  const facts = [
    p.role ? `<div><h3>My role</h3><p>${esc(p.role)}</p></div>` : '',
    Array.isArray(p.tools) && p.tools.length ? `<div><h3>Tools &amp; parts</h3>${chips(p)}</div>` : '',
    linksOf(p).length ? `<div><h3>Links</h3>${linkRow(p, 'pd-links')}</div>` : '',
  ].filter(Boolean).join('');

  detail.innerHTML =
    `<article class="pd-article">` +
    (meta ? `<p class="pd-meta">${meta}</p>` : '') +
    `<p class="lede">${esc(p.summary)}</p>` +
    (facts ? `<div class="pd-facts">${facts}</div>` : '') +
    (img ? figure({ src: img, alt: p.imageAlt || p.title, caption: p.imageCaption }, 'cover') : '') +
    video +
    (sections || '<p class="pd-empty">The full write-up for this project is coming soon.</p>') +
    (gallery.length ? `<section class="pd-sec"><h2>Gallery</h2><div class="pd-gallery">${gallery.map(g => figure(g)).join('')}</div></section>` : '') +
    `</article>`;

  // previous / next project, so pointing left/right with your hand moves between articles
  const prev = document.querySelector('[data-nav="prev"]'), next = document.querySelector('[data-nav="next"]');
  if (projects.length > 1) {
    const a = projects[(i - 1 + projects.length) % projects.length], b = projects[(i + 1) % projects.length];
    prev.href = pageUrl(a); prev.innerHTML = `<small>previous project</small>← ${esc(a.title)}`;
    next.href = pageUrl(b); next.innerHTML = `<small>next project</small>${esc(b.title)} →`;
  }
})();
