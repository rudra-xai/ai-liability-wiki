// Page shell: <head>, header, navigation drawer, search overlay and footer.
const { esc } = require('./md');

const icon = {
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  system: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/></svg>',
  more: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 8.5c-2 0-3.5 1.6-3.5 3.5s1.5 3.5 3.5 3.5c3 0 6-7 9-7 2 0 3.5 1.6 3.5 3.5s-1.5 3.5-3.5 3.5c-3 0-6-7-9-7z"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

function nav(base) {
  const group = (title, items) => `<div class="nav-group"><div class="nav-title">${title}</div><ul>${items.map(([t, u]) => `<li><a href="${base}${u}">${t}</a></li>`).join('')}</ul></div>`;
  return group('Navigation', [['Main page', ''], ['News', 'news/'], ['Opinions', 'opinions/'], ['Upcoming events', 'events/'], ['Featured videos', 'videos/']])
    + group('Reference library', [['Insurance', 'insurance/'], ['Cases', 'cases/'], ['Legislation &amp; regulation', 'legislation/'], ['Governance', 'governance/'], ['Policy', 'policy/'], ['People', 'people/'], ['Organizations', 'organizations/'], ['AI systems', 'ai-systems/'], ['AI liability by topic', 'topics/']])
    + group('Tools', [['Recent changes', 'special/recent-changes/'], ['Random page', 'special/random/'], ['All pages', 'special/all-pages/'], ['Search', 'search/'], ['RSS feed', 'feed.xml']])
    + group('About', [['About this wiki', 'about/'], ['Terms of use', 'terms/'], ['Privacy policy', 'privacy/'], ['Disclaimer', 'disclaimer/']]);
}

function layout(site, { title, description, body, path = '', bodyClass = '', fullTitle }) {
  const base = site.basePath;
  const w = site.wordmark;
  const pageTitle = fullTitle || (title ? `${title} - ${site.name}` : site.name);
  const canonical = site.siteUrl.replace(/\/$/, '') + '/' + path;
  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(description || site.tagline)}">
<meta property="og:title" content="${esc(pageTitle)}">
<meta property="og:description" content="${esc(description || site.tagline)}">
<meta property="og:site_name" content="${esc(site.name)}">
<link rel="canonical" href="${canonical}">
<link rel="alternate" type="application/rss+xml" title="${esc(site.name)} news" href="${base}feed.xml">
<link rel="icon" href="${base}assets/favicon.svg" type="image/svg+xml">
<script>(function(){try{var t=localStorage.getItem('theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.dataset.themePref=t}catch(e){}})()</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Martian+Mono:wght@400;600;700&family=Tektur:wght@700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${base}assets/style.css?v=${site.buildId}">
</head>
<body class="${bodyClass}" data-base="${base}" data-build="${site.buildId}">
<a class="skip" href="#content">Skip to content</a>
<header class="topbar">
  <div class="topbar-in">
    <button class="icon-btn" id="menu-btn" aria-label="Open navigation" aria-expanded="false" aria-controls="drawer">${icon.menu}</button>
    <a class="wordmark" href="${base}">${esc(w.before)}<em>${esc(w.em)}</em>${esc(w.after)}<sup>${esc(w.sup)}</sup></a>
    <div class="topbar-tools">
      <button class="icon-btn" id="search-btn" aria-label="Search">${icon.search}</button>
      <div class="theme-switch" role="radiogroup" aria-label="Color theme">
        <button role="radio" data-theme-set="light" aria-label="Light">${icon.sun}</button>
        <button role="radio" data-theme-set="dark" aria-label="Dark">${icon.moon}</button>
        <button role="radio" data-theme-set="system" aria-label="Match system">${icon.system}</button>
      </div>
      <div class="more-wrap">
        <button class="icon-btn" id="more-btn" aria-label="More tools" aria-expanded="false">${icon.more}</button>
        <div class="more-menu" id="more-menu" hidden>
          <a href="${base}special/recent-changes/">Recent changes</a>
          <a href="${base}special/random/">Random page</a>
          <a href="${base}special/all-pages/">All pages</a>
          <a href="${base}feed.xml">RSS feed</a>
          <a href="${esc(site.publisherUrl)}" target="_blank" rel="noopener">${esc(site.publisher)} ↗</a>
        </div>
      </div>
    </div>
  </div>
</header>
<div class="scrim" id="scrim" hidden></div>
<nav class="drawer" id="drawer" aria-label="Site" hidden>
  <div class="drawer-head"><span class="wordmark small">${esc(w.before)}<em>${esc(w.em)}</em>${esc(w.after)}</span><button class="icon-btn" id="drawer-close" aria-label="Close navigation">${icon.close}</button></div>
  ${nav(base)}
</nav>
<div class="search-overlay" id="search-overlay" hidden>
  <div class="search-box" role="dialog" aria-label="Search the wiki">
    <form action="${base}search/" method="get" class="search-form">
      ${icon.search}<input id="search-input" name="q" type="search" placeholder="Search ${esc(site.name)}" autocomplete="off" aria-label="Search">
      <kbd>Esc</kbd>
    </form>
    <ul class="search-results" id="search-results"></ul>
  </div>
</div>
<main id="content" class="${bodyClass === 'home' ? 'home-main' : 'page-main'}">
${body}
</main>
<footer class="site-footer">
  <div class="footer-in">
    <div class="footer-brand">
      <img src="${base}assets/rudra-x-ai-logo.png" alt="${esc(site.publisher)}" class="footer-logo" width="180" height="auto">
      <p>${esc(site.tagline)} Not legal or insurance advice.</p>
    </div>
    <div class="footer-links">
      <a href="${base}about/">About</a><a href="${base}terms/">Terms of use</a><a href="${base}privacy/">Privacy policy</a><a href="${base}disclaimer/">Disclaimer</a><a href="${base}special/all-pages/">All pages</a>
      <a href="mailto:${esc(site.contactEmail)}">Contact</a><a href="${esc(site.bookCallUrl)}" target="_blank" rel="noopener">Book a call</a>
    </div>
    <div class="footer-meta">Built ${esc(site.builtLabel)} · Maintained by AI agents for ${esc(site.publisher)}</div>
  </div>
</footer>
<script>window.SITE=${JSON.stringify({ base, breakingHours: site.breakingHours, newStoryHours: site.newStoryHours, refreshMinutes: site.refreshMinutes, tz: site.timezone })};</script>
<script src="${base}assets/app.js?v=${site.buildId}" defer></script>
</body>
</html>
`;
}

module.exports = { layout, icon };
