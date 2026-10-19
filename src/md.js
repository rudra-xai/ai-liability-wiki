// Small Markdown subset used by wiki articles. No dependencies.
// Supports: ## / ### headings, paragraphs, - and 1. lists, > quotes, | tables |,
// **bold**, *italic*, `code`, [text](url), [[slug]] / [[slug|text]] wiki links,
// footnote refs [^1] with definitions "[^1]: source text".

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const slugify = (s) => String(s).toLowerCase()
  .replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function inline(text, ctx) {
  let s = esc(text);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, slug, label) => {
    const page = ctx.resolve(slug.trim());
    const text = label || (page ? page.title : slug);
    return page
      ? `<a href="${page.url}">${text}</a>`
      : `<a class="new" href="${ctx.base}special/all-pages/" title="Page does not exist yet">${text}</a>`;
  });
  s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+|\/[^)\s]*)\)/g, (_, t, u) =>
    `<a href="${u.startsWith('/') ? ctx.base + u.slice(1) : u}"${u.startsWith('http') ? ' class="external" rel="noopener" target="_blank"' : ''}>${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/\[\^([\w-]+)\]/g, (_, id) => {
    if (!ctx.refOrder.includes(id)) ctx.refOrder.push(id);
    const n = ctx.refOrder.indexOf(id) + 1;
    const tip = ctx.refText[id] ? ` title="${esc(ctx.refText[id].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'))}"` : '';
    return `<sup class="ref"><a href="#ref-${id}"${tip}>[${n}]</a></sup>`;
  });
  return s;
}

function render(src, opts = {}) {
  const ctx = { resolve: opts.resolve || (() => null), base: opts.base || '/', refOrder: [], refText: {} };
  const lines = src.replace(/\r/g, '').split('\n');

  // Pull footnote definitions out first so tooltips can use them.
  const body = [];
  for (const line of lines) {
    const m = line.match(/^\[\^([\w-]+)\]:\s*(.+)$/);
    if (m) ctx.refText[m[1]] = m[2]; else body.push(line);
  }

  const out = [];
  const toc = [];
  let para = [];
  let list = null; // { tag, items }
  let table = null;

  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '), ctx)}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i, ctx)}</li>`).join('')}</${list.tag}>`); list = null; } };
  const flushTable = () => {
    if (!table) return;
    const [head, ...rows] = table.filter((r) => !/^\s*\|?\s*:?-{2,}/.test(r));
    const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    out.push(`<div class="table-wrap"><table class="wikitable"><thead><tr>${cells(head).map((c) => `<th>${inline(c, ctx)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c, ctx)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
    table = null;
  };
  const flushAll = () => { flushPara(); flushList(); flushTable(); };

  for (const line of body) {
    let m;
    if (!line.trim()) { flushAll(); continue; }
    if ((m = line.match(/^(#{2,4})\s+(.+)$/))) {
      flushAll();
      const level = m[1].length;
      const id = slugify(m[2]);
      if (level <= 3) toc.push({ level, id, text: m[2] });
      out.push(`<h${level} id="${id}">${inline(m[2], ctx)}</h${level}>`);
      continue;
    }
    if (/^\s*\|/.test(line)) { flushPara(); flushList(); (table ||= []).push(line); continue; }
    if ((m = line.match(/^\s*[-*]\s+(.+)$/)) || (m = line.match(/^\s*\d+\.\s+(.+)$/))) {
      flushPara(); flushTable();
      const tag = /^\s*\d/.test(line) ? 'ol' : 'ul';
      if (!list || list.tag !== tag) { flushList(); list = { tag, items: [] }; }
      list.items.push(m[1]);
      continue;
    }
    if ((m = line.match(/^>\s?(.*)$/))) { flushAll(); out.push(`<blockquote>${inline(m[1], ctx)}</blockquote>`); continue; }
    if (list && /^\s{2,}\S/.test(line)) { list.items[list.items.length - 1] += ' ' + line.trim(); continue; }
    flushList(); flushTable();
    para.push(line.trim());
  }
  flushAll();

  let refs = '';
  if (ctx.refOrder.length) {
    refs = `<ol class="references">${ctx.refOrder.map((id) =>
      `<li id="ref-${id}">${inline(ctx.refText[id] || 'Source missing.', { ...ctx, refOrder: [...ctx.refOrder] })}</li>`).join('')}</ol>`;
  }
  return { html: out.join('\n'), toc, refs, refCount: ctx.refOrder.length };
}

// "---" front matter holding a JSON object, then Markdown.
function parseDoc(raw) {
  const m = raw.replace(/^﻿/, '').match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  return { meta: JSON.parse(m[1]), body: m[2] };
}

module.exports = { render, parseDoc, esc, slugify, inline: (t, o = {}) => inline(t, { resolve: o.resolve || (() => null), base: o.base || '/', refOrder: [], refText: {} }) };
