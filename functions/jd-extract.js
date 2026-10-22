/* My Career Company · JD Link Reader (server side) · jd-extract.js
 * Opens a job-posting link and returns clean JD text. Only the JD link is sent here, never the resume.
 * Order of attempts:
 *   1. Known job-platform public APIs (Greenhouse, Lever, Workday, SmartRecruiters, Ashby; LinkedIn & Naukri best-effort)
 *   2. schema.org JobPosting JSON-LD embedded in the page (most career sites publish this for Google Jobs)
 *   3. Known job-description containers (class/id patterns)
 *   4. Main-content detection (Readability-style scoring)
 *   5. Page meta description (last resort, marked "partial")
 * PDF / DOCX JD links are returned as base64 so the browser parses them with the existing PDF.js / Mammoth code.
 * Zero dependencies: only Node 20 built-ins (fetch, dns, net).
 */
'use strict';
const dns = require('dns').promises;
const net = require('net');

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 12000;
const MAX_REDIRECTS = 5;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 MyCareerCompany-JDReader/1.0';

/* ------------------------------------------------------------------ 1. URL safety (blocks SSRF to internal networks) */
function ipIsPrivate(ip) {
  if (net.isIPv4(ip)) {
    const p = ip.split('.').map(Number);
    return p[0] === 10 || p[0] === 127 || p[0] === 0 || (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && p[1] === 168) || (p[0] === 100 && p[1] >= 64 && p[1] <= 127) || (p[0] === 192 && p[1] === 0 && p[2] === 0) ||
      (p[0] === 198 && (p[1] === 18 || p[1] === 19)) || p[0] >= 224;
  }
  if (net.isIPv6(ip)) {
    const x = ip.toLowerCase();
    if (x === '::1' || x === '::' || x.startsWith('fc') || x.startsWith('fd') || x.startsWith('fe80')) return true;
    const m = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(x); if (m) return ipIsPrivate(m[1]);
    return false;
  }
  return true;
}
async function assertPublicUrl(raw, lookup) {
  let u;
  try { u = new URL(String(raw || '').trim()); } catch (e) { throw err('invalid_url', 'That does not look like a full web link (it should start with https://).'); }
  if (!/^https?:$/.test(u.protocol)) throw err('invalid_url', 'Only http(s) job links can be read.');
  if (u.username || u.password) throw err('invalid_url', 'Links with embedded passwords are not allowed.');
  if (u.port && !['80', '443'].includes(u.port)) throw err('invalid_url', 'Only standard web ports are allowed.');
  const host = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local') || host === 'metadata.google.internal') throw err('invalid_url', 'That address is not a public website.');
  if (net.isIP(host)) { if (ipIsPrivate(host)) throw err('invalid_url', 'That address is not a public website.'); return u; }
  let addrs;
  try { addrs = await (lookup || dns.lookup)(host, { all: true }); } catch (e) { throw err('not_found', 'This website could not be found. Please check the link.'); }
  if (!addrs.length || addrs.some(a => ipIsPrivate(a.address))) throw err('invalid_url', 'That address is not a public website.');
  return u;
}
function err(reason, message) { const e = new Error(message); e.reason = reason; return e; }

/* ------------------------------------------------------------------ 2. Fetch with redirects re-checked, timeout and size cap */
async function safeFetch(url, opts, deps) {
  opts = opts || {}; deps = deps || {};
  const fetchImpl = deps.fetch || fetch;
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const u = await assertPublicUrl(current, deps.lookup);
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetchImpl(u.toString(), { method: 'GET', redirect: 'manual', signal: ctrl.signal,
        headers: Object.assign({ 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,application/pdf;q=0.8,*/*;q=0.5', 'Accept-Language': 'en-IN,en;q=0.9' }, opts.headers || {}) });
    } catch (e) { clearTimeout(t); throw err(e.name === 'AbortError' ? 'timeout' : 'network', e.name === 'AbortError' ? 'The job page took too long to respond.' : 'The job page could not be reached.'); }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) { clearTimeout(t); current = new URL(res.headers.get('location'), u).toString(); continue; }
    const len = Number(res.headers.get('content-length') || 0);
    if (len > MAX_BYTES) { clearTimeout(t); throw err('too_large', 'The job page is too large to read.'); }
    const reader = res.body && res.body.getReader ? res.body.getReader() : null;
    let buf;
    if (reader) {
      const chunks = []; let total = 0;
      for (;;) { const r = await reader.read(); if (r.done) break; total += r.value.length; if (total > MAX_BYTES) { clearTimeout(t); try { reader.cancel(); } catch (_) {} throw err('too_large', 'The job page is too large to read.'); } chunks.push(r.value); }
      buf = Buffer.concat(chunks.map(c => Buffer.from(c)));
    } else { buf = Buffer.from(await res.arrayBuffer()); }
    clearTimeout(t);
    return { status: res.status, finalUrl: u.toString(), contentType: (res.headers.get('content-type') || '').toLowerCase(), body: buf };
  }
  throw err('too_many_redirects', 'The job link redirected too many times.');
}

/* ------------------------------------------------------------------ 3. Tiny tolerant HTML parser + HTML→text */
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const SKIP = new Set(['script', 'style', 'noscript', 'template', 'svg', 'iframe', 'textarea', 'select', 'canvas', 'object']);
const BLOCK = new Set(['p', 'div', 'section', 'article', 'main', 'header', 'footer', 'aside', 'nav', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'hr', 'dl', 'dt', 'dd', 'blockquote', 'pre', 'form', 'fieldset', 'figure', 'figcaption', 'address']);
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', bull: '•', hellip: '…', trade: '™', reg: '®', copy: '©', middot: '·', rarr: '→', larr: '←', laquo: '«', raquo: '»', deg: '°', times: '×', rupee: '₹', inr: '₹', euro: '€', pound: '£' };
function decodeEntities(s) {
  return String(s || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') { const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return isFinite(cp) && cp > 0 && cp < 0x110000 ? String.fromCodePoint(cp) : m; }
    const k = e.toLowerCase(); return ENT[k] !== undefined ? ENT[k] : m;
  });
}
function parseAttrs(s) {
  const out = {}; const re = /([^\s=/"'<>]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g; let m;
  while ((m = re.exec(s || ''))) { let v = m[2] || ''; if (/^["']/.test(v)) v = v.slice(1, -1); out[m[1].toLowerCase()] = decodeEntities(v); }
  return out;
}
function parseHtml(html) {
  const root = { tag: '#root', attrs: {}, children: [], parent: null };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\/\s*([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|([^<]+|<)/g;
  let m;
  while ((m = re.exec(html))) {
    const cur = stack[stack.length - 1];
    if (m[4] !== undefined) { cur.children.push({ text: m[4] }); continue; }
    if (m[1]) {                                       // closing tag: pop to the matching open tag if it exists
      const t = m[1].toLowerCase();
      for (let i = stack.length - 1; i > 0; i--) if (stack[i].tag === t) { stack.length = i; break; }
      continue;
    }
    if (!m[2]) continue;                              // comments, doctype, CDATA
    const tag = m[2].toLowerCase(), attrs = parseAttrs(m[3]);
    if (SKIP.has(tag)) {                              // skip the whole raw block
      const end = html.toLowerCase().indexOf('</' + tag, re.lastIndex);
      const node = { tag, attrs, children: [], parent: cur, raw: end >= 0 ? html.slice(re.lastIndex, end) : '' };
      cur.children.push(node);
      if (end >= 0) { const close = html.indexOf('>', end); re.lastIndex = close >= 0 ? close + 1 : html.length; }
      continue;
    }
    if (tag === 'p' || tag === 'li') {                // implicit close of an open <p>/<li> sibling
      const top = stack[stack.length - 1];
      if (top.tag === tag || (tag === 'p' && top.tag === 'p')) stack.pop();
    }
    const node = { tag, attrs, children: [], parent: stack[stack.length - 1] };
    stack[stack.length - 1].children.push(node);
    if (!VOID.has(tag) && !/\/\s*$/.test(m[3] || '')) stack.push(node);
  }
  return root;
}
function walk(node, fn) { fn(node); (node.children || []).forEach(c => { if (c.tag) walk(c, fn); }); }
function textOf(node) {
  const parts = [];
  (function rec(n) {
    if (n.text !== undefined) { parts.push(decodeEntities(n.text)); return; }
    if (SKIP.has(n.tag)) return;
    if (n.tag === 'br') { parts.push('\n'); return; }
    const block = BLOCK.has(n.tag);
    if (block) parts.push('\n');
    if (n.tag === 'li') parts.push('• ');
    if (/^h[1-6]$/.test(n.tag) || n.tag === 'dt') parts.push('\n');
    (n.children || []).forEach(rec);
    if (n.tag === 'td' || n.tag === 'th') parts.push(' ');
    if (block) parts.push('\n');
  })(node);
  return tidy(parts.join(''));
}
function tidy(s) {
  return String(s || '').replace(/\r/g, '').replace(/[ \t\u00a0\u2007\u202f]+/g, ' ')
    .split('\n').map(l => l.trim()).filter((l, i, a) => l || (a[i - 1] && a[i - 1].trim()))
    .join('\n').replace(/\n{3,}/g, '\n\n').replace(/^(•\s*)+$/gm, '').replace(/\n\n(?=• )/g, '\n').trim();
}
function htmlToText(html) { return textOf(parseHtml(String(html || ''))); }
function wordCount(s) { return (String(s || '').match(/\S+/g) || []).length; }

/* ------------------------------------------------------------------ 4. Extraction strategies */
const JD_CUES = /\b(responsibilit|requirement|qualification|experience|skills?|what you('|wi)?ll do|what you will do|about the (role|job)|job description|key result|eligibility|must have|good to have|role overview|your profile|desired)/i;
function jsonLdJob(html) {
  const re = /<script[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi; let m; const found = [];
  while ((m = re.exec(html))) {
    let raw = m[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g, '');
    let data; try { data = JSON.parse(raw); } catch (e) { try { data = JSON.parse(raw.replace(/[\u0000-\u001f]+/g, ' ')); } catch (e2) { continue; } }
    (function scan(x) {
      if (!x || typeof x !== 'object') return;
      if (Array.isArray(x)) { x.forEach(scan); return; }
      const t = x['@type']; const types = Array.isArray(t) ? t : [t];
      if (types.some(v => /jobposting/i.test(String(v)))) found.push(x);
      if (x['@graph']) scan(x['@graph']);
    })(data);
  }
  if (!found.length) return null;
  const j = found.sort((a, b) => String(b.description || '').length - String(a.description || '').length)[0];
  const str = v => (v == null ? '' : typeof v === 'string' ? v : Array.isArray(v) ? v.map(str).filter(Boolean).join('; ') : typeof v === 'object' ? (v.name || v.value || v.description || v.addressLocality || '') : String(v));
  const loc = [].concat(j.jobLocation || []).map(l => { const a = (l && l.address) || {}; return [a.addressLocality, a.addressRegion, a.addressCountry && str(a.addressCountry)].filter(Boolean).join(', '); }).filter(Boolean).join(' / ');
  const exp = typeof j.experienceRequirements === 'object' && j.experienceRequirements && j.experienceRequirements.monthsOfExperience ? Math.round(j.experienceRequirements.monthsOfExperience / 12) + '+ years of experience' : str(j.experienceRequirements);
  const sections = [
    htmlToText(decodeEntities(str(j.description))),
    j.responsibilities ? 'Responsibilities\n' + htmlToText(str(j.responsibilities)) : '',
    j.qualifications ? 'Qualifications\n' + htmlToText(str(j.qualifications)) : '',
    j.skills ? 'Skills\n' + htmlToText(str(j.skills)) : '',
    j.educationRequirements ? 'Education\n' + str(j.educationRequirements) : '',
    exp ? 'Experience\n' + exp : ''
  ].filter(Boolean);
  return { title: decodeEntities(str(j.title)).trim(), company: decodeEntities(str(j.hiringOrganization)).trim(), location: loc, text: tidy(sections.join('\n\n')), source: 'json-ld' };
}
const SELECTOR_RE = /(job[-_ ]?description|jobdescription|job[-_]desc\b|\bjd[-_]?(content|container|details|desc)|description__text|show-more-less-html|posting-description|job[-_]?details|jobdetails|vacancy[-_]?description|position[-_]?description|job[-_]?body|section--description|job-detail-description|jobsearch-jobdescriptiontext|styles_job-desc|job-content|jobdisplay|req-description|rtltextaligneligible)/i;
function bySelector(root) {
  let best = null, bw = 0;
  walk(root, n => {
    if (!n.attrs) return;
    const key = (n.attrs.class || '') + ' ' + (n.attrs.id || '') + ' ' + (n.attrs.itemprop || '') + ' ' + (n.attrs['data-testid'] || '') + ' ' + (n.attrs['data-automation-id'] || '');
    if (!SELECTOR_RE.test(key) && n.attrs.itemprop !== 'description') return;
    const t = textOf(n), w = wordCount(t);
    if (w > bw) { bw = w; best = t; }
  });
  return bw >= 40 ? { text: best, source: 'selector' } : null;
}
function byReadability(root) {
  const scores = new Map();
  const linkLen = n => { let s = 0; walk(n, x => { if (x.tag === 'a') s += textOf(x).length; }); return s; };
  walk(root, n => {
    if (!n.tag || !['p', 'li', 'td', 'pre', 'div', 'span', 'dd'].includes(n.tag)) return;
    const own = (n.children || []).filter(c => c.text !== undefined).map(c => c.text).join(' ').trim();
    const t = n.tag === 'div' || n.tag === 'span' ? own : textOf(n);
    if (t.length < 25) return;
    const pts = 1 + (t.match(/,/g) || []).length + Math.min(3, Math.floor(t.length / 100)) + (JD_CUES.test(t) ? 2 : 0);
    const p = n.parent, g = p && p.parent;
    if (p && p.tag) scores.set(p, (scores.get(p) || 0) + pts);
    if (g && g.tag) scores.set(g, (scores.get(g) || 0) + pts / 2);
  });
  let best = null, bs = 0;
  scores.forEach((s, n) => {
    if (['nav', 'header', 'footer', 'aside', 'form'].includes(n.tag)) return;
    const key = (n.attrs.class || '') + ' ' + (n.attrs.id || '');
    if (/(nav|menu|footer|header|cookie|banner|sidebar|related|similar|share|social|breadcrumb|modal|popup|newsletter)/i.test(key)) return;
    const t = textOf(n); if (!t) return;
    const ld = Math.min(1, linkLen(n) / Math.max(1, t.length));
    const sc = s * (1 - ld) * (JD_CUES.test(t) ? 1.3 : 1);
    if (sc > bs) { bs = sc; best = n; }
  });
  if (!best) return null;
  let node = best, text = textOf(node);
  if (wordCount(text) < 150 && node.parent && node.parent.tag && JD_CUES.test(textOf(node.parent))) { const pt = textOf(node.parent); if (wordCount(pt) < 3 * wordCount(text) + 300) { node = node.parent; text = pt; } }
  return wordCount(text) >= 40 ? { text, source: 'readability' } : null;
}
function metaOf(html, name) {
  const re = new RegExp('<meta[^>]+(?:property|name)\\s*=\\s*["\']' + name.replace(/[:.]/g, '\\$&') + '["\'][^>]*>', 'i');
  const m = re.exec(html); if (!m) return '';
  const c = /content\s*=\s*("([^"]*)"|'([^']*)')/i.exec(m[0]); return c ? decodeEntities(c[2] || c[3] || '').trim() : '';
}
function pageTitle(html, root) {
  const og = metaOf(html, 'og:title'); if (og) return og;
  let h1 = ''; walk(root, n => { if (!h1 && n.tag === 'h1') h1 = textOf(n); });
  if (h1) return h1;
  const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html); return t ? decodeEntities(t[1]).replace(/\s+/g, ' ').trim() : '';
}
function classifyFailure(status, html, text) {
  const low = String(html || '').slice(0, 200000).toLowerCase(), words = wordCount(text);
  if ([401, 403, 429, 451, 999].includes(status) || /cf-chl|captcha|verify you are (a )?human|access denied|request blocked|unusual traffic/.test(low)) {
    return { reason: 'blocked', message: 'this website blocks automatic reading (bot protection)' };
  }
  if (words < 150 && /(authwall|sign in to (view|see|continue)|log ?in to (view|see|continue|apply)|please (log|sign) ?in|join now to see)/.test(low)) {
    return { reason: 'login_required', message: 'this page needs you to be logged in to see the full job' };
  }
  if (words < 60 && ((low.match(/<script/g) || []).length > 5 || /id=["'](root|app|__next|__nuxt)["']/.test(low))) {
    return { reason: 'needs_javascript', message: 'this page only shows the job after running scripts in a browser' };
  }
  if (status >= 400) return { reason: 'http_' + status, message: 'the job page returned an error (HTTP ' + status + ')' };
  return null;
}
function extractFromHtml(html, finalUrl, status) {
  const root = parseHtml(html);
  const ld = jsonLdJob(html);
  const title = (ld && ld.title) || pageTitle(html, root);
  const sel = bySelector(root);
  const rd = (!ld || wordCount(ld.text) < 120) && (!sel || wordCount(sel.text) < 120) ? byReadability(root) : null;
  const cands = [ld, sel, rd].filter(c => c && c.text);
  let pick = cands.sort((a, b) => (JD_CUES.test(b.text) - JD_CUES.test(a.text)) || (wordCount(b.text) - wordCount(a.text)))[0];
  if (sel && pick !== sel && wordCount(sel.text) >= 0.6 * wordCount(pick.text)) pick = sel;  // a named JD container beats generic detection
  if (ld && pick !== ld && wordCount(ld.text) >= 0.7 * wordCount(pick.text)) pick = ld;      // the structured JobPosting beats both when nearly as complete
  if (!pick) {
    const md = metaOf(html, 'og:description') || metaOf(html, 'description');
    const fail = classifyFailure(status, html, md);
    if (fail) return Object.assign({ ok: false, title }, fail);
    if (wordCount(md) >= 15) return { ok: true, title, text: md, words: wordCount(md), source: 'meta', quality: 'partial' };
    return { ok: false, title, reason: 'no_text', message: 'no job description text was found on this page' };
  }
  const fail = wordCount(pick.text) < 60 ? classifyFailure(status, html, pick.text) : null;
  if (fail) return Object.assign({ ok: false, title }, fail);
  const company = (ld && ld.company) || metaOf(html, 'og:site_name');
  const firstLine = (pick.text.split('\n')[0] || '').trim().toLowerCase();
  const header = [firstLine === title.toLowerCase() ? '' : title, company && !title.toLowerCase().includes(company.toLowerCase()) ? company : '', ld && ld.location].filter(Boolean).join(' | ');
  const text = tidy((header ? header + '\n' : '') + pick.text);
  const w = wordCount(pick.text);
  const quality = (pick.source === 'json-ld' && w >= 60) || (pick.source === 'selector' && w >= 80) || (w >= 120 && JD_CUES.test(pick.text)) ? 'full' : 'partial';
  return { ok: true, title, company, location: ld ? ld.location : '', text, words: wordCount(text), source: pick.source, quality, finalUrl };
}

/* ------------------------------------------------------------------ 5. Job platforms with public JSON (more reliable than the HTML) */
function platformRoute(u) {
  const h = u.hostname.toLowerCase(), seg = u.pathname.split('/').filter(Boolean);
  let m;
  if (/(^|\.)greenhouse\.io$/.test(h)) {
    const i = seg.indexOf('jobs'), id = i > 0 ? seg[i + 1] : (u.searchParams.get('gh_jid') || ''), board = i > 0 ? seg[i - 1] : (u.searchParams.get('for') || '');
    if (board && /^\d+$/.test(id)) return { name: 'greenhouse', api: 'https://boards-api.greenhouse.io/v1/boards/' + board + '/jobs/' + id,
      parse: j => ({ title: j.title, location: j.location && j.location.name, company: board, text: htmlToText(decodeEntities(j.content || '')) }) };
  }
  if ((m = /^jobs(\.eu)?\.lever\.co$/.exec(h)) && seg.length >= 2) {
    return { name: 'lever', api: 'https://api' + (m[1] || '') + '.lever.co/v0/postings/' + seg[0] + '/' + seg[1],
      parse: j => ({ title: j.text, company: seg[0], location: j.categories && j.categories.location,
        text: tidy([j.descriptionPlain || htmlToText(j.description || ''), (j.lists || []).map(l => (l.text || '') + '\n' + htmlToText(l.content || '')).join('\n\n'), j.additionalPlain || htmlToText(j.additional || '')].filter(Boolean).join('\n\n')) }) };
  }
  if ((m = /^([\w-]+)\.wd\d+\.myworkdayjobs\.com$/.exec(h))) {
    const s = seg.slice(/^[a-z]{2}-[a-z]{2}$/i.test(seg[0] || '') ? 1 : 0), ji = s.indexOf('job');
    if (ji > 0) return { name: 'workday', api: 'https://' + h + '/wday/cxs/' + m[1] + '/' + s[0] + '/' + s.slice(ji).join('/'),
      parse: j => { const p = j.jobPostingInfo || {}; return { title: p.title, location: p.location, company: (j.hiringOrganization && j.hiringOrganization.name) || m[1], text: htmlToText(p.jobDescription || '') }; } };
  }
  if (/^(jobs|careers)\.smartrecruiters\.com$/.test(h) && seg.length >= 2 && (m = /^(\d+)/.exec(seg[1]))) {
    return { name: 'smartrecruiters', api: 'https://api.smartrecruiters.com/v1/companies/' + seg[0] + '/postings/' + m[1],
      parse: j => { const sct = (j.jobAd && j.jobAd.sections) || {}; return { title: j.name, company: j.company && j.company.name, location: j.location && [j.location.city, j.location.country].filter(Boolean).join(', '),
        text: tidy(['jobDescription', 'qualifications', 'additionalInformation'].map(k => sct[k] ? (sct[k].title || '') + '\n' + htmlToText(sct[k].text || '') : '').filter(Boolean).join('\n\n')) }; } };
  }
  if (h === 'jobs.ashbyhq.com' && seg.length >= 2) {
    return { name: 'ashby', api: 'https://api.ashbyhq.com/posting-api/job-board/' + seg[0] + '?includeCompensation=false',
      parse: j => { const job = (j.jobs || []).filter(x => x.id === seg[1])[0]; return job ? { title: job.title, company: seg[0], location: job.location, text: job.descriptionPlain || htmlToText(job.descriptionHtml || '') } : null; } };
  }
  if (/(^|\.)linkedin\.com$/.test(h)) {         // best effort: LinkedIn's public guest view; often rate-limited
    const id = u.searchParams.get('currentJobId') || ((m = /(\d{8,})\/?$/.exec(u.pathname)) && m[1]);
    if (id) return { name: 'linkedin', api: 'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/' + id, html: true };
  }
  if (/(^|\.)naukri\.com$/.test(h) && (m = /-(\d{9,})(?:\?|$)/.exec(u.pathname + (u.search ? '?' : '')))) {   // best effort
    return { name: 'naukri', api: 'https://www.naukri.com/jobapi/v4/job/' + m[1], headers: { appid: '109', systemid: 'Naukri' },
      parse: j => { const d = j.jobDetails || {}; const sk = d.keySkills ? [].concat(d.keySkills.preferred || [], d.keySkills.other || []).map(x => x.label || x).join(', ') : '';
        return { title: d.title, company: d.companyDetail && d.companyDetail.name, location: (d.locations || []).map(l => l.label).join(', '),
          text: tidy([htmlToText(d.description || ''), d.minimumExperience != null ? 'Experience\n' + d.minimumExperience + '–' + d.maximumExperience + ' years' : '', sk ? 'Key skills\n' + sk : ''].filter(Boolean).join('\n\n')) }; } };
  }
  return null;
}

/* ------------------------------------------------------------------ 6. Main entry */
async function extractJob(url, deps) {
  deps = deps || {};
  let u;
  try { u = await assertPublicUrl(url, deps.lookup); } catch (e) { return { ok: false, reason: e.reason || 'invalid_url', message: e.message }; }
  const route = platformRoute(u);
  if (route) {
    try {
      const r = await safeFetch(route.api, { headers: Object.assign({ Accept: route.html ? 'text/html' : 'application/json' }, route.headers || {}) }, deps);
      if (r.status === 200) {
        const body = r.body.toString('utf8');
        const out = route.html ? extractFromHtml(body, url, r.status) : (function () { try { return route.parse(JSON.parse(body)); } catch (e) { return null; } })();
        if (out && (out.ok !== false) && wordCount(out.text) >= 40) {
          const text = out.ok === undefined ? tidy([out.title, out.company, out.location].filter(Boolean).join(' | ') + '\n' + out.text) : out.text;
          return { ok: true, title: out.title || '', company: out.company || '', location: out.location || '', text, words: wordCount(text), source: 'platform:' + route.name, quality: 'full', finalUrl: url };   // official feed = complete JD
        }
      }
    } catch (e) { /* fall back to reading the page itself */ }
  }
  let r;
  try { r = await safeFetch(u.toString(), {}, deps); } catch (e) { return { ok: false, reason: e.reason || 'network', message: e.message }; }
  const ct = r.contentType;
  if (/application\/pdf/.test(ct) || (/\.pdf($|\?)/i.test(r.finalUrl) && /octet-stream/.test(ct))) {
    return { ok: true, kind: 'pdf', base64: r.body.toString('base64'), title: decodeURIComponent(r.finalUrl.split('/').pop().split('?')[0] || 'JD.pdf'), source: 'file', quality: 'full', finalUrl: r.finalUrl };
  }
  if (/officedocument\.wordprocessingml/.test(ct) || (/\.docx($|\?)/i.test(r.finalUrl) && /octet-stream/.test(ct))) {
    return { ok: true, kind: 'docx', base64: r.body.toString('base64'), title: decodeURIComponent(r.finalUrl.split('/').pop().split('?')[0] || 'JD.docx'), source: 'file', quality: 'full', finalUrl: r.finalUrl };
  }
  if (/application\/json/.test(ct)) {
    let j; try { j = JSON.parse(r.body.toString('utf8')); } catch (e) { j = null; }
    const t = j ? tidy(htmlToText(JSON.stringify(j).replace(/\\n/g, '\n'))) : '';
    return wordCount(t) >= 60 ? { ok: true, title: '', text: t, words: wordCount(t), source: 'json', quality: 'partial', finalUrl: r.finalUrl } : { ok: false, reason: 'no_text', message: 'no job description text was found at this link' };
  }
  const html = r.body.toString('utf8');
  const out = extractFromHtml(html, r.finalUrl, r.status);
  if (out.ok) out.finalUrl = r.finalUrl;
  return out;
}

module.exports = { extractJob, extractFromHtml, htmlToText, parseHtml, assertPublicUrl, platformRoute, ipIsPrivate, jsonLdJob, wordCount };
