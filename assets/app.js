// Client features: theme, drawer, search, new-story dots, breaking-label expiry,
// calendar "today", main-page refresh, TOC, sortable tables.
(function () {
  const S = window.SITE || { base: '/' };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } },
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---- Theme: light / dark / system ----
  const mq = matchMedia('(prefers-color-scheme: dark)');
  function applyTheme(pref) {
    const dark = pref === 'dark' || (pref === 'system' && mq.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.themePref = pref;
    $$('[data-theme-set]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.themeSet === pref)));
  }
  applyTheme(store.get('theme') || 'system');
  $$('[data-theme-set]').forEach((b) => b.addEventListener('click', () => { store.set('theme', b.dataset.themeSet); applyTheme(b.dataset.themeSet); }));
  mq.addEventListener('change', () => applyTheme(store.get('theme') || 'system'));

  // ---- Drawer ----
  const drawer = $('#drawer'), scrim = $('#scrim'), menuBtn = $('#menu-btn');
  function setDrawer(open) {
    if (open) { drawer.hidden = false; scrim.hidden = false; void drawer.offsetWidth; drawer.classList.add('open'); drawer.querySelector('a').focus(); }
    else { drawer.classList.remove('open'); scrim.hidden = true; setTimeout(() => { drawer.hidden = true; }, 200); }
    menuBtn.setAttribute('aria-expanded', String(open));
  }
  menuBtn.addEventListener('click', () => setDrawer(true));
  $('#drawer-close').addEventListener('click', () => { setDrawer(false); menuBtn.focus(); });
  scrim.addEventListener('click', () => setDrawer(false));

  // ---- More menu ----
  const moreBtn = $('#more-btn'), moreMenu = $('#more-menu');
  moreBtn.addEventListener('click', (e) => { e.stopPropagation(); moreMenu.hidden = !moreMenu.hidden; moreBtn.setAttribute('aria-expanded', String(!moreMenu.hidden)); });
  document.addEventListener('click', (e) => { if (!moreMenu.hidden && !moreMenu.contains(e.target)) { moreMenu.hidden = true; moreBtn.setAttribute('aria-expanded', 'false'); } });

  // ---- Search ----
  let indexPromise;
  const loadIndex = () => (indexPromise ||= fetch(S.base + 'search-index.json').then((r) => r.json()).catch(() => []));
  function search(index, q) {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return index.map((d) => {
      const t = d.t.toLowerCase(), hay = (d.t + ' ' + d.s + ' ' + d.k + ' ' + d.c).toLowerCase();
      let score = 0;
      for (const w of terms) { if (!hay.includes(w)) return null; score += t.includes(w) ? (t.startsWith(w) ? 6 : 4) : 1; }
      if (d.c !== 'news') score += 1;
      return { d, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score).map((x) => x.d);
  }
  const resultHTML = (d) => `<a href="${d.u}"><span class="sr-cat">${esc(d.c)}</span>${esc(d.t)}<span class="sr-sum">${esc(d.s)}</span></a>`;
  const overlay = $('#search-overlay'), input = $('#search-input'), results = $('#search-results');
  function openSearch() { overlay.hidden = false; input.focus(); loadIndex(); }
  function closeSearch() { overlay.hidden = true; }
  $('#search-btn').addEventListener('click', openSearch);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSearch(); });
  let active = -1;
  input.addEventListener('input', async () => {
    const idx = await loadIndex();
    const hits = search(idx, input.value).slice(0, 8);
    active = -1;
    results.innerHTML = hits.map((d) => `<li>${resultHTML(d)}</li>`).join('') + (input.value.trim() ? `<li><a href="${S.base}search/?q=${encodeURIComponent(input.value)}"><span class="sr-cat">all</span>Search for “${esc(input.value)}”</a></li>` : '');
  });
  input.addEventListener('keydown', (e) => {
    const links = $$('a', results);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
      links.forEach((l, i) => l.classList.toggle('active', i === active));
    } else if (e.key === 'Enter' && active >= 0 && links[active]) { e.preventDefault(); location.href = links[active].href; }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeSearch(); if (drawer.classList.contains('open')) setDrawer(false); moreMenu.hidden = true; }
    if ((e.key === '/' || (e.key === 'k' && (e.ctrlKey || e.metaKey))) && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
  });
  const pageResults = $('#search-page-results');
  if (pageResults) {
    const q = new URLSearchParams(location.search).get('q') || '';
    $('#search-page-input').value = q;
    if (q) loadIndex().then((idx) => {
      const hits = search(idx, q);
      pageResults.innerHTML = `<p class="dim">${hits.length} result${hits.length === 1 ? '' : 's'} for “${esc(q)}”</p><ul class="search-results">${hits.map((d) => `<li>${resultHTML(d)}</li>`).join('')}</ul>`;
    });
  }

  // ---- Random page ----
  const rnd = $('[data-random]');
  if (rnd) loadIndex().then((idx) => { const pages = idx.filter((d) => d.c !== 'news'); if (pages.length) location.replace(pages[Math.floor(Math.random() * pages.length)].u); });

  // ---- New-story dots: newer than the last visit, and within the "new" window ----
  const stories = $$('.story[data-published]');
  if (stories.length) {
    const lastVisit = Number(store.get('lastVisit') || 0);
    const windowMs = (S.newStoryHours || 24) * 3600e3;
    stories.forEach((s) => {
      const t = Date.parse(s.dataset.published);
      if (Date.now() - t < windowMs && t > lastVisit) { const dot = $('.new-dot', s); if (dot) dot.hidden = false; }
    });
    // Mark as seen a little later, so a quick reload still shows the dots.
    setTimeout(() => store.set('lastVisit', String(Date.now())), 15000);
  }

  // ---- Breaking label expires after N hours ----
  $$('[data-breaking]').forEach((el) => { if (Date.now() - Date.parse(el.dataset.breaking) < (S.breakingHours || 6) * 3600e3) el.hidden = false; });

  // ---- Calendar: highlight today, dim past days (in the site's time zone) ----
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: S.tz || 'America/New_York' }).format(new Date());
  $$('[data-day]').forEach((d) => {
    if (d.dataset.day === today) d.classList.add('today');
    else if (d.dataset.day < today) d.classList.add(d.classList.contains('cal-day') ? 'past' : 'past-day');
  });
  $$('.past-day').forEach((d) => { d.hidden = true; });

  // ---- Main page refresh: check for a newer build, offer (or do) a reload ----
  if (document.body.classList.contains('home')) {
    const current = document.body.dataset.build;
    setInterval(() => {
      fetch(S.base + 'latest.json?t=' + Date.now(), { cache: 'no-store' }).then((r) => r.json()).then((j) => {
        if (j.build === current) return;
        if (document.hidden) { location.reload(); return; }
        if (!$('.refresh-pill')) {
          const b = document.createElement('button');
          b.className = 'refresh-pill'; b.textContent = 'New stories — refresh';
          b.addEventListener('click', () => location.reload());
          document.body.appendChild(b);
        }
      }).catch(() => {});
    }, (S.refreshMinutes || 5) * 60e3);
  }

  // ---- TOC scroll-spy ----
  const tocLinks = $$('.toc a');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    const map = new Map(tocLinks.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { tocLinks.forEach((a) => a.classList.remove('active')); const a = map.get(en.target.id); if (a) a.classList.add('active'); }
    }), { rootMargin: '-80px 0px -70% 0px' });
    map.forEach((_, id) => { const h = document.getElementById(id); if (h) io.observe(h); });
    if (matchMedia('(max-width: 1080px)').matches) { const d = $('.toc details'); if (d) d.open = false; }
  }

  // ---- Sortable tables ----
  $$('table.sortable').forEach((t) => $$('th', t).forEach((th, i) => th.addEventListener('click', () => {
    const body = t.tBodies[0], dir = th.dataset.dir === 'asc' ? -1 : 1;
    $$('th', t).forEach((h) => delete h.dataset.dir); th.dataset.dir = dir === 1 ? 'asc' : 'desc';
    const key = (r) => { const c = r.cells[i]; return (c.dataset.sort || c.textContent).trim().toLowerCase(); };
    Array.from(body.rows).sort((a, b) => key(a).localeCompare(key(b)) * dir).forEach((r) => body.appendChild(r));
  })));
})();
