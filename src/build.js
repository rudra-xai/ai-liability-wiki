// Builds the static site from content/ into dist/. Run: node src/build.js
const fs = require('fs');
const path = require('path');
const { render, parseDoc, esc, slugify, inline } = require('./md');
const U = require('./util');
const { layout } = require('./layout');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist');
const readJSON = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const site = readJSON('site.json');
if (process.env.BASE_PATH) site.basePath = process.env.BASE_PATH;
if (!site.basePath.endsWith('/')) site.basePath += '/';
const base = site.basePath;
const now = new Date();
site.buildId = now.getTime().toString(36);
site.today = process.env.TODAY || U.localDay(now.toISOString(), site.timezone);
site.builtLabel = `${U.longDate(site.today)}, ${U.clock(now.toISOString(), site.timezone, site.timezoneLabel)}`;

// ---------- Load content ----------
const news = readJSON('content/news.json').sort((a, b) => b.published.localeCompare(a.published));
const opinions = readJSON('content/opinions.json').sort((a, b) => b.date.localeCompare(a.date));
const events = readJSON('content/events.json').sort((a, b) => a.date.localeCompare(b.date));
const videos = readJSON('content/videos.json').sort((a, b) => b.uploaded.localeCompare(a.uploaded));

const pages = []; // every wiki article and hub
const pageBySlug = {};
function loadDir(dir, urlFor) {
  const abs = path.join(ROOT, 'content', dir);
  for (const f of fs.readdirSync(abs).filter((f) => f.endsWith('.md')).sort()) {
    const { meta, body } = parseDoc(fs.readFileSync(path.join(abs, f), 'utf8'));
    const slug = meta.slug || f.replace(/\.md$/, '');
    const page = { ...meta, slug, body, dir, url: base + urlFor(slug, meta), out: urlFor(slug, meta) };
    if (pageBySlug[slug]) throw new Error(`Duplicate slug "${slug}" in content/${dir}/${f}`);
    pages.push(page);
    pageBySlug[slug] = page;
  }
}
loadDir('cases', (s) => `cases/${s}/`);
loadDir('legislation', (s) => `legislation/${s}/`);
loadDir('pages', (s, m) => (m.path !== undefined ? m.path : `wiki/${s}/`));

const resolve = (slug) => pageBySlug[slug] || pageBySlug[slugify(slug)] || null;
const md = (src) => render(src, { resolve, base });
const mdInline = (src) => inline(src, { resolve, base });

// ---------- Output helpers ----------
const written = [];
function write(rel, html) {
  const file = path.join(OUT, rel.endsWith('/') || rel === '' ? rel + 'index.html' : rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  written.push(rel);
}
const page = (rel, opts) => write(rel, layout(site, { path: rel, ...opts }));

const disclosure = '<div class="disclosure"><b>AI-GENERATED TEXT.</b> This page was generated using artificial intelligence.</div>';
const kicker = (t) => `<div class="kicker">${t}</div>`;
const sourcesLine = (item) => {
  const flags = (item.jurisdictions || []).map((j) => `<span class="flag" title="${esc(j)}">${U.flag(j)}</span>`).join(' ');
  const src = (item.sources || []).map((s) => `<a class="external" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`);
  const rel = (item.related || []).map((slug) => { const p = resolve(slug); return p ? `<a href="${p.url}">${esc(p.title)}</a>` : ''; }).filter(Boolean);
  return `<div class="sources">${flags} ${[...src, ...rel].join(' <span class="sep">•</span> ')}</div>`;
};
const lens = (item) => (item.lens ? `<p class="lens"><span>Coverage lens</span>${esc(item.lens)}</p>` : '');

function story(item, { lead = false, heading = 'h3' } = {}) {
  const h = lead ? 'h1' : heading;
  return `<article class="story${lead ? ' lead' : ''}" id="story-${esc(item.id)}" data-id="${esc(item.id)}" data-published="${esc(item.published)}">
  <${h} class="story-title"><span class="new-dot" hidden title="New since your last visit"></span>${esc(item.title)}</${h}>
  <p class="story-summary">${mdInline(item.summary)}</p>
  ${lens(item)}
  ${sourcesLine(item)}
</article>`;
}

// ---------- Sidebar widgets ----------
function opinionsCard(list) {
  return `<section class="card opinions" aria-labelledby="op-title">
  <h2 id="op-title" class="label">Opinions</h2>
  <p class="fine">Views are the authors’ own.</p>
  ${list.map((o) => `<article class="opinion">
    <h3><a class="external" href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.title)}</a></h3>
    <div class="byline">${esc(o.author)} · ${esc(o.outlet)}</div>
    <div class="byline date">${U.apDate(o.date)}</div>
    ${o.summary ? `<p>${esc(o.summary)}</p>` : ''}
  </article>`).join('')}
  <a class="more-link" href="${base}opinions/">All opinions →</a>
</section>`;
}

// ---------- Main page sections ----------
function eventsCalendar() {
  const days = [];
  for (let i = 0; i < 7 && days.length < 5; i++) {
    const d = U.addDays(site.today, i);
    const list = events.filter((e) => e.date === d);
    if (list.length || (i < 5 && !['SATURDAY', 'SUNDAY'].includes(U.weekday(d)))) days.push({ d, list });
  }
  if (!days.length) return '';
  const range = `${U.longDate(days[0].d).replace(/, \d{4}$/, '')}–${days[days.length - 1].d.slice(8).replace(/^0/, '')}, ${days[0].d.slice(0, 4)}`;
  return `<section class="block events" aria-labelledby="ev-title">
  <div class="block-head"><h2 id="ev-title" class="label">Upcoming events</h2><span class="label dim">${esc(range)}</span></div>
  <div class="cal">${days.map(({ d, list }) => `<div class="cal-day" data-day="${d}">
    <div class="cal-head"><span class="cal-wd">${U.weekday(d)}</span><span class="cal-n">${Number(d.slice(8))}</span></div>
    ${list.length ? list.map(eventItem).join('') : '<p class="fine">Nothing scheduled.</p>'}
  </div>`).join('')}</div>
  <a class="more-link" href="${base}events/">All upcoming events →</a>
</section>`;
}
const eventItem = (e) => `<div class="event"><h3>${esc(e.title)}</h3><p>${esc(e.description)} ${e.source ? `<a class="external" href="${esc(e.source.url)}" target="_blank" rel="noopener">${esc(e.source.name)}</a>` : ''}</p></div>`;

const ytId = (url) => (url.match(/[?&]v=([\w-]{6,})/) || url.match(/youtu\.be\/([\w-]{6,})/) || [])[1];
const fmtSecs = (s) => { const m = Math.floor(s / 60); return `${m} MIN ${s % 60} SEC`; };
const stamp = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
function videoCard(v, { full = true } = {}) {
  const id = ytId(v.url);
  return `<article class="video">
  <a class="video-thumb external" href="${esc(v.url)}" target="_blank" rel="noopener" aria-label="Watch ${esc(v.title)} on YouTube">
    ${id ? `<img loading="lazy" src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="">` : ''}<span class="play-badge">▶</span>
  </a>
  <div class="video-body">
    <h3>${esc(v.title)}</h3>
    <div class="byline">${esc(v.channel)} · Uploaded ${esc(U.longDate(v.uploaded).toUpperCase())} · ${fmtSecs(v.seconds)}</div>
    <p>${esc(v.summary)}</p>
    <a class="btn-ghost external" href="${esc(v.url)}" target="_blank" rel="noopener">Watch on YouTube</a>
    ${full && v.moments && v.moments.length ? `<div class="moments"><div class="label">Key moments</div>${v.moments.map((m) => `<a class="moment external" href="${esc(v.url)}&t=${m.t}s" target="_blank" rel="noopener"><span>${stamp(m.t)}</span>${esc(m.label)}</a>`).join('')}<p class="fine">Selected from the publisher’s chapter list.</p></div>` : ''}
  </div>
</article>`;
}

const byUpdated = (a, b) => (b.updated || '').localeCompare(a.updated || '');
const cases = pages.filter((p) => p.dir === 'cases').sort(byUpdated);
const laws = pages.filter((p) => p.dir === 'legislation').sort(byUpdated);
const STATUS = { proposed: 'Proposed', enacted: 'Enacted', 'in-force': 'In force', withdrawn: 'Withdrawn', guidance: 'Guidance', pending: 'Pending' };

function updatesBlock(title, list, labelFn, moreHref, moreText) {
  return `<section class="block updates" aria-label="${esc(title)}">
  <div class="block-head"><h2 class="label">${esc(title)}</h2></div>
  <div class="update-grid">${list.slice(0, 5).map((p) => `<a class="update" href="${p.url}">
    <span class="tag ${labelFn(p).cls}">${esc(labelFn(p).text)}</span>
    <h3>${esc(p.title)}</h3>
    <p>${esc(p.update || p.summary || '')}</p>
  </a>`).join('')}</div>
  <a class="more-link" href="${base}${moreHref}">${moreText} →</a>
</section>`;
}

const LIBRARY = [
  ['insurance', 'Insurance', 'AI coverage, policy exclusions, underwriting and insurance disputes', [['explore insurance', 'insurance/']]],
  ['cases', 'Cases', 'Active and resolved AI liability litigation', [['all cases', 'cases/'], ['case directory', 'cases/#case-directory'], ['hallucinations', 'cases/#ai-hallucinations-and-professional-responsibility']]],
  ['legislation', 'Legislation', 'Laws, bills, regulation and supervisory guidance by jurisdiction', [['all authorities', 'legislation/'], ['united states', 'legislation/#united-states'], ['international', 'legislation/#international'], ['topics', 'topics/']]],
  ['governance', 'Governance', 'Organizational oversight, AI risk management and voluntary frameworks', [['explore governance', 'governance/']]],
  ['policy', 'Policy', 'Policy choices, competing approaches and liability debates', [['explore policy', 'policy/']]],
  ['people', 'People', 'Scholars and practitioners shaping AI liability and insurance', [['explore people', 'people/']]],
  ['organizations', 'Organizations', 'Insurers, regulators, standards bodies and research groups', [['explore organizations', 'organizations/']]],
  ['ai-systems', 'AI systems', 'AI and algorithmic systems with documented legal or coverage significance', [['explore ai systems', 'ai-systems/']]],
];
function libraryBlock() {
  return `<section class="block library" aria-labelledby="lib-title">
  <div class="block-head"><h2 id="lib-title" class="label">The reference library</h2></div>
  <h3 class="lib-sub">Explore AI liability and the law</h3>
  <div class="lib-grid">${LIBRARY.map(([k, t, d, links]) => `<div class="lib-card"><h4>${t.toLowerCase()}</h4><p>${d}</p>${links.map(([l, u]) => `<a href="${base}${u}">${l} →</a>`).join('')}</div>`).join('')}</div>
</section>`;
}

function aboutBlock() {
  return `<section class="block about-box">
  <h2 class="label">ℹ️ About this wiki</h2>
  <div class="about-cols">
    <div><p>${esc(site.name)} is a resource tracking legal and insurance developments related to artificial intelligence, published by <a href="${esc(site.publisherUrl)}" target="_blank" rel="noopener">${esc(site.publisher)}</a>. We cover:</p>
    <ul><li>Court rulings and litigation over AI harms and errors</li><li>Federal, state and international legislation</li><li>Insurance coverage, exclusions and coverage disputes</li><li>Regulator guidance, settlements and governance frameworks</li></ul></div>
    <div><p>Entries include inline citations and links to primary sources where available.</p><p>This wiki is maintained by AI agents and is not legal or insurance advice. See our <a href="${base}terms/">Terms of Use</a> for more information.</p><a class="more-link" href="${base}special/all-pages/">All pages →</a></div>
  </div>
</section>`;
}

// ---------- Main page ----------
function buildHome() {
  const [lead, ...rest] = news;
  const leadDay = U.localDay(lead.published, site.timezone);
  const sameDay = rest.filter((n) => U.localDay(n.published, site.timezone) === leadDay);
  const pool = sameDay.length >= 4 ? sameDay : rest.slice(0, 10);
  const groups = {};
  for (const n of pool) (groups[U.regionOf((n.jurisdictions || ['International'])[0])] ||= []).push(n);
  const regions = U.REGION_ORDER.filter((r) => groups[r]);
  const month = U.monthKey(leadDay);

  const body = `
<div class="home-grid">
  <div class="home-lead">
    ${disclosure}
    <div class="meta-row"><span class="live"><span class="pulse"></span>Last updated ${U.clock(lead.published, site.timezone, site.timezoneLabel)}</span><span class="breaking" data-breaking="${esc(lead.published)}" hidden>Breaking</span><span class="date">${esc(U.longDate(leadDay).toUpperCase())}</span></div>
    ${story(lead, { lead: true })}
    <div class="chips">${regions.map((r) => `<a class="chip" href="#news-${slugify(r)}">${esc(r.toLowerCase())}</a>`).join('')}</div>
    ${regions.map((r) => `<section class="region" id="news-${slugify(r)}"><h2 class="label">${esc(r)}</h2><div class="story-grid">${groups[r].map((n) => story(n)).join('')}</div></section>`).join('')}
    <p class="archive-links"><a href="${base}news/${month}/">all news for ${U.monthLabel(month).toLowerCase()} →</a> · <a href="${base}news/">browse news by year →</a></p>
  </div>
  <aside class="home-side">
    ${opinionsCard(opinions.slice(0, 5))}
  </aside>
</div>
${eventsCalendar()}
<section class="block videos" aria-labelledby="vid-title">
  <div class="block-head"><h2 id="vid-title" class="label">Featured videos</h2></div>
  ${videos.slice(0, 3).map((v, i) => videoCard(v, { full: i === 0 })).join('')}
  <a class="more-link" href="${base}videos/">Past featured videos →</a>
</section>
${updatesBlock('Latest case updates', cases, (p) => ({ text: p.updateKind || 'Case update', cls: '' }), 'cases/', 'All cases')}
${updatesBlock('Latest legislation updates', laws, (p) => ({ text: STATUS[p.status] || p.status, cls: `st-${p.status}` }), 'legislation/', 'All legislation &amp; regulation')}
${libraryBlock()}
${aboutBlock()}`;
  page('', { body, bodyClass: 'home', fullTitle: `${site.name} — ${site.publisher}`, description: site.tagline });
  write('latest.json', JSON.stringify({ build: site.buildId, lead: lead.id, published: lead.published }));
}

// ---------- News archives ----------
function buildNews() {
  const months = {};
  for (const n of news) (months[U.monthKey(U.localDay(n.published, site.timezone))] ||= []).push(n);
  const keys = Object.keys(months).sort().reverse();
  for (const k of keys) {
    const days = {};
    for (const n of months[k]) (days[U.localDay(n.published, site.timezone)] ||= []).push(n);
    const i = keys.indexOf(k);
    const body = `<div class="article">
  <div class="cat-chip">News</div>
  <h1 class="page-title">${esc(site.name)} News for ${U.monthLabel(k)}</h1>
  ${disclosure}
  <p class="lede">AI liability, insurance and law news first covered in ${U.monthLabel(k)}. Each story links to its sources and relevant wiki coverage where available.</p>
  ${Object.keys(days).sort().reverse().map((d) => `<section class="news-day" id="day-${Number(d.slice(8))}"><h2>${U.longDate(d)}</h2>${days[d].map((n) => story(n)).join('')}</section>`).join('')}
  <nav class="pager">${keys[i + 1] ? `<a href="${base}news/${keys[i + 1]}/">← ${U.monthLabel(keys[i + 1])}</a>` : '<span></span>'}<a href="${base}news/">All months</a>${keys[i - 1] ? `<a href="${base}news/${keys[i - 1]}/">${U.monthLabel(keys[i - 1])} →</a>` : '<span></span>'}</nav>
</div>`;
    page(`news/${k}/`, { title: `News for ${U.monthLabel(k)}`, body, bodyClass: 'news' });
  }
  const years = {};
  for (const k of keys) (years[k.slice(0, 4)] ||= []).push(k);
  page('news/', {
    title: 'News',
    body: `<div class="article"><h1 class="page-title">News</h1>${disclosure}
  <p class="lede">Daily coverage of AI liability, insurance and regulation, grouped by the month a story was first covered. Follow via <a href="${base}feed.xml">RSS</a>.</p>
  ${Object.keys(years).sort().reverse().map((y) => `<h2>${y}</h2><ul class="month-list">${years[y].map((k) => `<li><a href="${base}news/${k}/">${U.monthLabel(k)}</a> <span class="dim">${months[k].length} stories</span></li>`).join('')}</ul>`).join('')}
  <h2>Latest stories</h2>${news.slice(0, 12).map((n) => story(n)).join('')}
</div>`,
  });
}

// ---------- Simple listing pages ----------
function buildLists() {
  page('opinions/', {
    title: 'Opinions',
    body: `<div class="article"><h1 class="page-title">Opinions</h1>${disclosure}<p class="lede">Commentary on AI liability, insurance and regulation from outside writers. Views are the authors’ own; inclusion is not endorsement.</p>
  ${opinions.map((o) => `<article class="opinion wide"><h3><a class="external" href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.title)}</a></h3><div class="byline">${esc(o.author)} · ${esc(o.outlet)} · ${U.apDate(o.date)}</div>${o.summary ? `<p>${esc(o.summary)}</p>` : ''}</article>`).join('')}</div>`,
  });
  const upcoming = events.filter((e) => e.date >= site.today);
  const byDay = {};
  for (const e of upcoming) (byDay[e.date] ||= []).push(e);
  page('events/', {
    title: 'Upcoming events',
    body: `<div class="article"><h1 class="page-title">Upcoming events</h1>${disclosure}<p class="lede">Hearings, comment deadlines, effective dates and conferences relevant to AI liability and insurance. Times are local to the event unless stated.</p>
  ${Object.keys(byDay).map((d) => `<section class="news-day" data-day="${d}"><h2>${U.weekday(d).charAt(0) + U.weekday(d).slice(1).toLowerCase()}, ${U.longDate(d)}</h2>${byDay[d].map(eventItem).join('')}</section>`).join('') || '<p>No upcoming events are listed.</p>'}</div>`,
  });
  page('videos/', {
    title: 'Featured video archive',
    body: `<div class="article"><h1 class="page-title">Featured video archive</h1>${disclosure}<p class="lede">Talks, interviews and hearings on AI liability, insurance and regulation previously featured on the main page.</p>${videos.map((v) => videoCard(v)).join('')}</div>`,
  });
}

// ---------- Articles ----------
function infobox(p) {
  if (!p.info) return '';
  const label = { case: 'Case information', legislation: 'Authority information' }[p.category] || 'Key facts';
  return `<aside class="infobox"><div class="label">${label}</div><dl>${Object.entries(p.info).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${mdInline(String(v))}</dd>`).join('')}</dl></aside>`;
}

function hubList(p) {
  const members = pages.filter((x) => x !== p && (x.category === p.hubFor || (x.hubs || []).includes(p.slug)));
  const sections = p.sections || [...new Set(members.map((m) => m.section || 'Other'))];
  return sections.map((s, i) => {
    const list = members.filter((m) => (m.section || 'Other') === s || (m.hubSections && m.hubSections[p.slug] === s));
    if (!list.length) return '';
    return `<section class="hub-sec" id="${slugify(s)}"><h2><span class="num">${String(i + 1).padStart(2, '0')}</span>${esc(s)}</h2>
    <div class="hub-rows">${list.map((m) => `<div class="hub-row"><a href="${m.url}">${esc(m.title)}</a><p>${m.jurisdiction ? `<span class="dim">${(esc(m.jurisdiction) + (m.court ? ' · ' + esc(m.court) : '')).replace(/\.?$/, '.')}</span> ` : ''}${esc(m.summary || '')}</p></div>`).join('')}</div></section>`;
  }).join('');
}

function directory(kind) {
  if (kind === 'cases') {
    return `<section class="hub-sec" id="case-directory"><h2><span class="num">◆</span>Case directory</h2><div class="table-wrap"><table class="wikitable sortable"><thead><tr><th>Case</th><th>Court</th><th>Filed</th><th>Status</th><th>Updated</th></tr></thead><tbody>${cases.map((c) => `<tr><td><a href="${c.url}">${esc(c.title)}</a></td><td>${esc(c.court || '')}</td><td data-sort="${esc(c.filed || '')}">${c.filed ? U.longDate(c.filed) : ''}</td><td>${esc(c.statusText || '')}</td><td data-sort="${esc(c.updated || '')}">${c.updated ? U.apDate(c.updated) : ''}</td></tr>`).join('')}</tbody></table></div></section>`;
  }
  const groups = {};
  for (const l of laws) (groups[l.region] ||= []).push(l);
  return Object.keys(groups).sort((a, b) => (a === 'United States' ? -1 : b === 'United States' ? 1 : a.localeCompare(b))).map((g) => `<section class="hub-sec" id="${slugify(g)}"><h2><span class="num">◆</span>${esc(g)}</h2><div class="table-wrap"><table class="wikitable sortable"><thead><tr><th>Authority</th><th>Jurisdiction</th><th>Status</th><th>Updated</th></tr></thead><tbody>${groups[g].map((l) => `<tr><td><a href="${l.url}">${esc(l.title)}</a></td><td>${U.flag(l.jurisdiction)} ${esc(l.jurisdiction)}</td><td><span class="tag st-${l.status}">${esc(STATUS[l.status] || l.status)}</span></td><td data-sort="${esc(l.updated || '')}">${l.updated ? U.apDate(l.updated) : ''}</td></tr>`).join('')}</tbody></table></div></section>`).join('');
}

function buildArticles() {
  for (const p of pages) {
    const r = md(p.body);
    let content = r.html;
    if (p.hubFor || p.directory) {
      const list = (p.hubFor ? hubList(p) : '') + (p.directory ? directory(p.directory) : '');
      content = content.includes('<p>{{list}}</p>') ? content.replace('<p>{{list}}</p>', list) : content + list;
    }
    const related = news.filter((n) => (n.related || []).includes(p.slug)).slice(0, 6);
    const toc = r.toc.filter((t) => t.level === 2);
    const showToc = toc.length >= 3 && !p.hubFor;
    const cat = { case: 'Case', legislation: 'Legislation', insurance: 'Insurance', governance: 'Governance', policy: 'Policy', person: 'Person', organization: 'Organization', 'ai-system': 'AI system', topic: 'Topic', about: 'About' }[p.category] || p.category;
    const body = `<div class="article${p.info ? ' has-infobox' : ''}${showToc ? ' has-toc' : ''}" data-slug="${esc(p.slug)}">
  ${showToc ? `<nav class="toc" aria-label="Contents"><details open><summary class="label">Contents</summary><ol>${toc.map((t) => `<li><a href="#${t.id}">${mdInline(t.text)}</a></li>`).join('')}${r.refCount ? '<li><a href="#references">References</a></li>' : ''}</ol></details></nav>` : ''}
  <div class="article-main">
    ${cat && !p.hideCategory ? `<div class="cat-chip">${esc(cat)}</div>` : ''}
    <h1 class="page-title">${esc(p.title)}</h1>
    ${p.noDisclosure ? '' : disclosure}
    <div class="article-body">
      ${infobox(p)}
      ${content}
      ${related.length ? `<h2 id="in-the-news">In the news</h2>${related.map((n) => `<p class="in-news"><span class="dim">${U.apDate(U.localDay(n.published, site.timezone))}</span> ${esc(n.title)} — ${(n.sources || []).map((s) => `<a class="external" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join(', ')}</p>`).join('')}` : ''}
      ${r.refCount ? `<h2 id="references">References</h2>${r.refs}` : ''}
    </div>
    <div class="page-foot">${p.categories ? `<div class="cats"><span class="label">Categories:</span> ${p.categories.map((c) => { const h = resolve(c); return h ? `<a href="${h.url}">${esc(h.title)}</a>` : esc(c); }).join(' · ')}</div>` : ''}${p.updated ? `<div class="dim">This page was last updated on ${U.longDate(p.updated)}.</div>` : ''}</div>
  </div>
</div>`;
    page(p.out, { title: p.title, description: p.summary, body, bodyClass: `article-page cat-${p.category || 'page'}` });
  }
}

// ---------- Special pages, search, feeds ----------
function buildSpecial() {
  const all = pages.slice().sort((a, b) => a.title.localeCompare(b.title));
  page('special/all-pages/', {
    title: 'All pages',
    body: `<div class="article"><h1 class="page-title">All pages</h1><div class="all-pages">${all.map((p) => `<a href="${p.url}">${esc(p.title)}</a>`).join('')}</div></div>`,
  });
  const changes = [
    ...pages.filter((p) => p.updated).map((p) => ({ d: p.updated, t: p.title, u: p.url, what: p.update || 'Page updated', kind: p.category })),
    ...news.map((n) => ({ d: U.localDay(n.published, site.timezone), t: n.title, u: `${base}news/${U.monthKey(U.localDay(n.published, site.timezone))}/#story-${n.id}`, what: 'News story added', kind: 'news' })),
  ].sort((a, b) => b.d.localeCompare(a.d));
  const byDay = {};
  for (const c of changes) (byDay[c.d] ||= []).push(c);
  page('special/recent-changes/', {
    title: 'Recent changes',
    body: `<div class="article"><h1 class="page-title">Recent changes</h1><p class="lede">Track the most recent changes to the wiki on this page.</p>${Object.keys(byDay).slice(0, 30).map((d) => `<h2>${U.longDate(d)}</h2><ul class="changes">${byDay[d].map((c) => `<li><span class="tag">${esc(c.kind)}</span> <a href="${c.u}">${esc(c.t)}</a> <span class="dim">— ${esc(c.what)}</span></li>`).join('')}</ul>`).join('')}</div>`,
  });
  page('special/random/', { title: 'Random page', body: '<div class="article"><h1 class="page-title">Random page</h1><p data-random>Picking a page…</p></div>' });
  page('search/', { title: 'Search', body: `<div class="article"><h1 class="page-title">Search</h1><form class="search-page-form" action="${base}search/"><input type="search" name="q" id="search-page-input" placeholder="Search ${esc(site.name)}" aria-label="Search"><button class="btn">Search</button></form><div id="search-page-results"></div></div>` });
  page('404.html', { title: 'Page not found', body: `<div class="article"><h1 class="page-title">Page not found</h1><p class="lede">There is currently no page at this address. <a href="${base}search/">Search the wiki</a> or return to the <a href="${base}">main page</a>.</p></div>` });

  const index = [
    ...pages.map((p) => ({ t: p.title, u: p.url, c: p.category || 'page', s: (p.summary || '').slice(0, 220), k: [p.jurisdiction, p.court, p.section].filter(Boolean).join(' ') })),
    ...news.map((n) => ({ t: n.title, u: `${base}news/${U.monthKey(U.localDay(n.published, site.timezone))}/#story-${n.id}`, c: 'news', s: n.summary.slice(0, 220), k: (n.jurisdictions || []).join(' ') })),
  ];
  write('search-index.json', JSON.stringify(index));

  const x = (s) => esc(s).replace(/&#39;/g, "'");
  const siteUrl = site.siteUrl.replace(/\/$/, '');
  write('feed.xml', `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>${x(site.name)} News</title><link>${siteUrl}/</link><description>${x(site.tagline)}</description>
${news.slice(0, 50).map((n) => `<item><title>${x(n.title)}</title><link>${siteUrl}/news/${U.monthKey(U.localDay(n.published, site.timezone))}/#story-${n.id}</link><guid isPermaLink="false">${x(n.id)}</guid><pubDate>${new Date(n.published).toUTCString()}</pubDate><description>${x(n.summary)}</description></item>`).join('\n')}
</channel></rss>`);
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${written.filter((w) => w.endsWith('/') || w === '').map((w) => `<url><loc>${siteUrl}/${w}</loc></url>`).join('')}</urlset>`);
  write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);
  write('.nojekyll', '');
}

// ---------- Run ----------
fs.rmSync(OUT, { recursive: true, force: true });
buildHome();
buildNews();
buildLists();
buildArticles();
buildSpecial();
fs.cpSync(path.join(ROOT, 'assets'), path.join(OUT, 'assets'), { recursive: true });
console.log(`Built ${written.length} files into dist/ (${pages.length} wiki pages, ${news.length} news stories) at base "${base}".`);
