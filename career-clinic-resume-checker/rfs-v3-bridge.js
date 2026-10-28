/* My Career Company · Resume Fit Score™ v3 bridge
 * Converts RFSv3.analyse() output into the result shape renderResults() in script.js already uses,
 * so the existing UI keeps working with a handful of small edits (see INTEGRATION.md).
 * Load order: rfs-v3-content.js → rfs-v3-companies.js → rfs-v3-schools.js → fit-engine-v3.js → rfs-v3-bridge.js → jd-database.js → script.js
 */
(function (root) {
  'use strict';
  var ICONS = { CON: '📊', FIN: '📈', IB: '🏦', SAL: '💼', MKT: '🎯', PM: '📱', HR: '👥', GM: '🏛️', OPS: '⚙️', SCM: '🚚', PRC: '📣', LEG: '⚖️',
    BA: '🔬', ITS: '🖥️', CSM: '🤝', ENT: '🚀', HCM: '🏥', AGB: '🌾', RTL: '🛍️', RE: '🏢', PPD: '🏛', ESG: '🌱', ECM: '🛒', MED: '🎬', ENR: '⚡', INF: '🏗️', TEL: '📡', EDT: '🎓' };
  // 28 v3 domain codes → the 9 legacy role keys still used by DOMAIN_METADATA / ROLE_KEYWORDS elsewhere in script.js
  var LEGACY_KEY = { CON: 'consulting', FIN: 'finance', IB: 'finance', SAL: 'sales', MKT: 'marketing', PM: 'product', HR: 'hr', GM: 'genman', OPS: 'operations',
    SCM: 'operations', PRC: 'marketing', LEG: 'genman', BA: 'analytics', ITS: 'analytics', CSM: 'sales', ENT: 'genman', HCM: 'operations', AGB: 'sales',
    RTL: 'operations', RE: 'finance', PPD: 'genman', ESG: 'genman', ECM: 'sales', MED: 'marketing', ENR: 'operations', INF: 'operations', TEL: 'sales', EDT: 'sales' };
  var ready = false;
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function ph(s) { return esc(s).replace(/\[([^\]]+)\]/g, '<span class="highlight-placeholder">[$1]</span>'); }   // highlight user-input placeholders
  function ensureInit() {
    if (ready) return true;
    if (!root.RFSv3) throw new Error('fit-engine-v3.js is not loaded');
    var lib = root.JD_DATABASE && root.JD_DATABASE.LIBRARY;
    lib = (lib || []).filter(function (r) { return r && r.domainCode && r.levelCode && r.scoring && r.mustHave; });   // the 112 Level × Domain records
    if (lib.length < 100) throw new Error('JD Library v2 records not found on window.JD_DATABASE.LIBRARY (found ' + lib.length + ')');
    root.RFSv3.init(lib); ready = true; return true;
  }
  function levelLabel(code) {   // use the UI's own labels from jd-database.js (CAMPUS → "Fresher")
    var L = root.JD_DATABASE && root.JD_DATABASE.LEVELS, f = L && L.filter(function (x) { return x.code === code; })[0];
    return f ? f.label : (code.charAt(0) + code.slice(1).toLowerCase());
  }
  function bandOut(b) { return b === 'STRONG' ? 'strong' : b === 'MODERATE' ? 'moderate' : 'needs-work'; }
  function bandDesc(rep) {
    if (rep.gateNotice) return rep.gateNotice;
    var g = rep.gates[0];
    var lvl = levelLabel(rep.jd.level);
    var base = rep.band === 'STRONG' ? 'High fit for ' + rep.jd.title + ' (' + rep.jd.domainName + ' · ' + lvl + '): evidence, scope and role keywords match what shortlisters look for.'
      : rep.band === 'MODERATE' ? 'Good foundation for ' + rep.jd.domainName + ' at ' + lvl + ' level. The ranked fixes below are the fastest way to close the gap.'
      : 'Significant gaps against ' + rep.jd.title + ' (' + rep.jd.domainName + ' · ' + lvl + '). Work through the fixes and evidence-building suggestions before applying.';
    return g ? base + ' ' + g.text : base;
  }
  function strengthDetail(rep, v) {
    var d = rep.details;
    switch (v.key) {
      case 'skill': return 'Evidences ' + d.skill.mustHave + ' must-haves and ' + Math.round(100 * d.skill.coverage) + '% of the JD\'s weighted skills inside experience lines.';
      case 'role': return 'Titles and experience read as ' + rep.jd.domainName + ' (domain fit ' + d.role.domainFit + '%).';
      case 'exp': return rep.level.target === 'CAMPUS' ? 'Internship and project experience is relevant to ' + rep.jd.domainName + '.' : 'About ' + Math.round(d.exp.relevantMonths) + ' relevant months against a ' + d.exp.requiredMonths + '-month benchmark.';
      case 'impact': return Math.round(100 * d.impact.quantifiedShare) + '% of JD-relevant bullets carry outcome metrics.';
      case 'bullets': return 'Bullets lead with owned actions or results (IIM result-first style counts as strong).';
      case 'lead': return d.lead.peopleLeadership ? 'Clear people leadership' + (d.lead.teamSize ? ' (team of ' + d.lead.teamSize + ')' : '') + (d.lead.promotion ? ' and visible progression' : '') + '.' : 'Positions of responsibility and achievements with scale.';
      case 'edu': return 'Degree and credentials meet this JD\'s requirements.';
      case 'struct': return 'All expected sections and recruiter contact details are present.';
      case 'length': return 'Length and bullet discipline fit the ' + d.length.pageRule + ' norm for this level.';
      case 'ats': return 'Clean, parseable text with standard headings and dates.';
    }
    return '';
  }
  /* Main entry: call instead of scoreResume(textToAnalyze, numPages, state.targetRole, jdTextToAnalyze) */
  function score(o) {
    ensureInit();
    var jd, J = o.jdObject;
    var isBenchmark = o.jdTab === 'domain' && J && J.id && /^[A-Z]+-(CAMPUS|EARLY|MID|SENIOR)$/.test(J.id);
    var norm = function (t) { return String(t || '').replace(/\s+/g, ' ').trim(); };
    var edited = isBenchmark && o.jdText && root.JD_DATABASE && root.JD_DATABASE.formatJdText && norm(o.jdText) !== norm(root.JD_DATABASE.formatJdText(J));
    if (isBenchmark && !edited) jd = { mode: 'library', jdId: J.id };
    else if (isBenchmark && edited)   // user edited the loaded benchmark text: score their text, keep the chosen domain & level
      jd = { mode: 'custom', text: o.jdText, title: (J.titles && J.titles[0]) || '', domainOverride: J.domainCode, levelOverride: J.levelCode };
    else {
      var txt = o.jdText || o.jdUrl || '';
      var linkTab = o.jdTab === 'link' || /^\s*https?:\/\/\S+\s*$/.test(txt);
      // titles from the old parseJdLinkTitle() are mangled ("It M A"); for links the engine reads the URL itself
      var urlOnlyText = /^\s*https?:\/\/\S+\s*$/.test(txt);
      // page title from the JD reader (or a typed title) is used; file names and link-only titles are re-derived by the engine
      var ttl = (o.jdTitle && !/\.(pdf|docx?)$/i.test(o.jdTitle) && !(linkTab && urlOnlyText)) ? o.jdTitle : '';
      jd = { mode: 'custom', text: txt, title: ttl, url: linkTab ? (o.jdUrl || txt) : '', domainOverride: o.domainOverride || null, levelOverride: o.levelOverride || null };
    }
    var rep = root.RFSv3.analyse({ resumeText: o.text, pageCount: o.numPages, jd: jd,
      profile: { status: o.candidateType === 'college_student' ? 'College Student' : 'Working Professional', institution: o.institutionName || '' } });
    var d = rep.details;
    var dims = rep.vectors.map(function (v) { return { id: v.key, name: v.label, score: v.score, max: v.max, loss: Math.round((v.max - v.score) * 10) / 10, jdDependent: v.jdDependent }; });
    var strengths = rep.vectors.filter(function (v) { return v.pct >= 80; }).map(function (v) { return { id: v.key, name: v.label, score: v.score, max: v.max, detail: strengthDetail(rep, v) }; });
    var fixes = rep.priorityFixes.map(function (f, i) {
      var lvl = f.gain >= 3 ? 'high' : f.gain >= 1.5 ? 'medium' : 'low';
      return { priorityNum: 'Priority ' + f.rank, dimensionName: f.title, impactLevel: lvl, impactLabel: lvl === 'high' ? 'High Impact' : lvl === 'medium' ? 'Medium Impact' : 'Low Impact',
        advice: '<strong>Why:</strong> ' + esc(f.why) + '<br><strong>Do this:</strong> ' + ph(f.action) + (f.quote ? '<br><span class="fix-quote">&ldquo;' + esc(f.quote.length > 140 ? f.quote.slice(0, 139) + '…' : f.quote) + '&rdquo;</span>' : '') +
          '<br><em>Estimated gain: +' + f.gain + ' pts · ' + esc(f.effort) + '</em>', family: f.family, gain: f.gain };
    });
    var rewrites = rep.rewrites.map(function (w) {
      var why = [];
      if (w.needsInput.length) why.push('Fill in from your own records: ' + w.needsInput.join(', ') + '. Never use a number you cannot prove.');
      if (w.afterResultFirst) why.push('Result-first (IIM style) alternative: “' + w.afterResultFirst + '”.');
      if (w.jdTermsEvidenced.length) why.push('Evidences JD terms: ' + w.jdTermsEvidenced.join(', ') + '.');
      if (w.addIfTrue) why.push('If true, this bullet could also show: ' + w.addIfTrue + '.');
      w.notes.forEach(function (n) { why.push(n); });
      why.push(w.proof);
      return { before: w.before, after: ph(w.after), rationale: why.join(' '), afterResultFirst: w.afterResultFirst, needsInput: w.needsInput };
    });
    var target = rep.jd.domain, ds = rep.domainSuitability;
    var rows = ds.ranking.slice();
    if (!rows.some(function (x) { return x.code === target; })) {
      var tscore = ds.insight.targetScore;
      rows.push({ code: target, name: rep.jd.domainName, score: tscore, tier: ds.insight.targetTier, signals: [] });
    }
    var SIG = { title: 'Job titles', company: 'Employers', bullets: 'Experience bullets', intern: 'Internships & projects', spec: 'MBA specialisation', ug: 'UG degree', certs: 'Certifications', clubs: 'Clubs & competitions', college: 'Institute', skills: 'Skills list' };
    var domains = rows.map(function (x) {
      var tier = x.score >= 70 ? 'strong' : x.score >= 45 ? 'moderate' : 'developing';
      // concrete evidence per domain ("Role: Credit Manager (Axis Bank)", "Certification: CFA"), not generic category names
      return { key: x.code, code: x.code, legacyKey: LEGACY_KEY[x.code] || null, label: x.name, shortLabel: x.name, icon: ICONS[x.code] || '•', score: x.score, fitTier: tier, fitLabel: x.tier,
        matchedCount: (x.evidence || []).length, totalKeywords: 10, topSignals: (x.evidence && x.evidence.length ? x.evidence : x.signals.map(function (s) { return SIG[s] || s; })), isTarget: x.code === target };
    });
    var kwAll = function (arr) { return arr.map(function (x) { return x.t; }); };
    var pdisp = function (t) { var x = root.RFSv3._internal.disp(t); return x.charAt(0).toUpperCase() + x.slice(1); };
    var result = {
      engineVersion: rep.version, totalScore: rep.totalScore, band: bandOut(rep.band), bandLabel: rep.band === 'STRONG' ? 'Strong' : rep.band === 'MODERATE' ? 'Moderate' : 'Needs Work',
      bandDesc: bandDesc(rep), dimensions: dims, strengths: strengths, priorityFixes: fixes,
      roleKeywordScore: Math.round(15 * (rep.vectors[0].pct / 100)),
      detectedKeywords: kwAll(d.skill.matched).map(pdisp).concat(kwAll(d.skill.listedOnly).map(function (t) { return pdisp(t) + ' (skills list only)'; })),
      missingKeywords: kwAll(d.skill.gaps).map(pdisp),
      roleKeywordList: d.skill.matched.concat(d.skill.listedOnly, d.skill.gaps),
      isCustomJd: rep.jd.source !== 'library',
      domainSuitability: { domains: domains, highestDomain: domains[0], targetDomainKey: target, insight: ds.insight, confidence: ds.confidence, switcher: ds.switcher },
      rewrites: rewrites,
      contactDetails: { hasEmail: d.struct.contact.email, hasMobile: d.struct.contact.phone, hasLinkedIn: d.struct.contact.linkedin },
      detectedSectionsList: [], missingSectionsList: d.struct.missing.map(function (m) { return Array.isArray(m) ? m.join(' / ') : m; }),
      quantifiedBullets: [], unquantifiedBullets: (d.impact.unquantified || []).map(function (b) { return { clean: b.text }; }),
      foundStrongVerbs: [], weakBulletsFound: (d.bullets.weak || []).map(function (b) { return { clean: b.text, matchedPhrase: b.weakPhrase }; }),
      stats: { wordCount: d.length.words, bulletCount: d.bullets.n, quantShare: Math.round(100 * d.impact.quantifiedShare), idealLengthPct: Math.round(100 * d.length.bulletLengthOK),
               strongVerbShare: Math.round(100 * rep.vectors[4].pct / 100), estimatedPages: d.length.pages || Math.max(1, Math.ceil(d.length.words / 600)),
               jdWordCount: (o.jdText || '').split(/\s+/).filter(Boolean).length },
      // v3-only data for the new UI blocks
      jdNotice: (rep.advisories.filter(function (a) { return a.type === 'JD_THIN' || a.type === 'CONFIRM_DOMAIN'; })[0] || {}).text || '',
      v3: { jd: rep.jd, level: rep.level, candidate: rep.candidate, gates: rep.gates, advisories: rep.advisories, certifications: rep.certifications,
            projects: rep.projects, weights: rep.weights, bulletDiagnostics: rep.bulletDiagnostics, domainInsight: ds.insight },
      detectedDomain: target, targetRoleKey: LEGACY_KEY[target] || 'consulting', jdMode: jd.mode + (edited ? ' (edited benchmark)' : ''),
      badges: rep.badges || [], engineVersion: rep.version
    };
    // v3.3: ATS score, formatting detector, guides and LinkedIn optimizer render below the report (all in the browser)
    if (root.RFSDiagnostics && root.document) setTimeout(function () { try { root.RFSDiagnostics.run(rep, o.text); } catch (e) { console.warn('[RFS v3.3] diagnostics:', e); } }, 60);
    if (root.console && console.info) console.info('[RFS] engine ' + rep.version + ' · bridge ' + BRIDGE_VERSION + ' · top domains: ' + domains.slice(0, 3).map(function (x) { return x.key + ' ' + x.score; }).join(', '));
    return result;
  }
  /* Drop-in replacement for DOMAIN_METADATA[targetRoleKey] inside renderResults(): same fields, but personalised content. */
  function roleMeta(result) {
    var v = result.v3, j = v.jd;
    var certs = (v.certifications || []).map(function (c) { return c.name + ' — ' + c.why + ' · ' + c.cost + ' · ' + c.time + (c.note ? ' · ' + c.note : ''); });
    if (!certs.length) certs = ['No certification needed for this JD right now: your gaps are better closed with the projects below.'];
    if (v.certifications && v.certifications.conditionalNotes) certs.push('Only if your role involves a regulated activity: ' + v.certifications.conditionalNotes.join('; '));
    var projects = ((v.projects && v.projects.projects) || []).map(function (p) { return p.name + ' — ' + p.why + (p.weeks ? ' · ~' + p.weeks + ' weeks' : '') + (p.proof ? ' · Proof: ' + p.proof : ''); });
    ((v.projects && v.projects.competitions) || []).forEach(function (c) { projects.push('Competition: ' + c.name + ' (' + c.window + ') — ' + c.eligibility + '. ' + c.note + '.'); });
    return { label: j.domainName + (j.subArea ? ' · ' + j.subArea.label : j.industry ? ' · ' + (root.RFSv3.C.DOMAINS[j.industry] || {}).n : ''), shortLabel: j.domainName, icon: ICONS[j.domain] || '🎯',
             certifications: certs, projects: projects };
  }
  /* For JD intake handlers: returns the legacy role key (for state.targetRole) plus the full v3 detection. */
  function detectJd(text, title, url) {
    ensureInit();
    var isUrl = /^\s*https?:\/\/\S+\s*$/.test(text || '');
    if (isUrl && !url) { url = text; }
    var det = root.RFSv3.detectDomainFromJdV3(text || url || '', { title: (isUrl ? '' : title), url: url });
    return { legacyKey: LEGACY_KEY[det.domain] || 'consulting', code: det.domain, name: det.domainName, secondary: det.secondary, level: det.level,
             confidence: det.confidence, askUser: det.askUser, subArea: det.subArea, title: det.displayTitle, thin: det.thin,
             label: det.domainName + (det.subArea ? ' (' + det.subArea.label + ')' : det.secondary ? ' / ' + root.RFSv3.C.DOMAINS[det.secondary].n : '') + ' · ' + levelLabel(det.level) };
  }
  var BRIDGE_VERSION = 'bridge-3.3.0';
  // Column-aware text for one PDF page (fixes scrambled two-column resumes). Used by parsePdfFile() in script.js.
  function pageText(items, pageWidth) { return root.RFSDiagnostics ? root.RFSDiagnostics.pageText(items, pageWidth) : null; }
  function parseJobUrl(url) { ensureInit(); return root.RFSv3.parseJobUrl(url); }
  root.RFSv3Bridge = { score: score, roleMeta: roleMeta, detectJd: detectJd, parseJobUrl: parseJobUrl, LEGACY_KEY: LEGACY_KEY, ICONS: ICONS, VERSION: BRIDGE_VERSION, pageText: pageText };
})(typeof window !== 'undefined' ? window : this);


/* ===== My Career Company · Resume Fit Score v3.3 · ATS diagnostics (100% in the browser) ===================
 * ATS Score (parse-ability 40 · structure 25 · searchability 35), formatting-mistake detector (PDF text positions + DOCX XML),
 * ATS optimizer suggestions, common-mistakes and fonts guides, LinkedIn optimizer (LinkedIn "Save to PDF" file or pasted text).
 * Nothing here sends data anywhere: files are read locally. A LinkedIn URL is never opened (LinkedIn's User Agreement
 * prohibits scraping); it is only checked for a custom slug.
 * ========================================================================================================== */
(function (root) {
  'use strict';
  var VERSION = 'ats-1.0.0';
  var doc = root.document;

  /* ---------------------------------------------------------------- 1. Column-aware PDF text (fixes scrambled two-column resumes) */
  function normItems(items) {
    var out = [];
    (items || []).forEach(function (it) {
      if (!it || typeof it.str !== 'string') return;
      var tr = it.transform || [1, 0, 0, 1, 0, 0], h = Math.abs(tr[3]) || Math.abs(tr[0]) || 10;
      if (!it.str.trim()) return;
      out.push({ s: it.str, x: tr[4], y: tr[5], w: it.width || it.str.length * h * 0.5, h: h, font: it.fontName || '' });
    });
    return out;
  }
  function groupRows(its) {
    var sorted = its.slice().sort(function (a, b) { return (b.y - a.y) || (a.x - b.x); }), rows = [];
    sorted.forEach(function (it) {
      var r = rows.length ? rows[rows.length - 1] : null;
      if (r && Math.abs(r.y - it.y) <= Math.max(2, 0.45 * Math.min(r.h, it.h))) r.items.push(it);
      else rows.push({ y: it.y, h: it.h, items: [it] });
    });
    rows.forEach(function (r) { r.items.sort(function (a, b) { return a.x - b.x; }); });
    return rows;
  }
  function rowText(r) {
    var t = '', last = null;
    r.items.forEach(function (it) {
      if (last) { var gap = it.x - (last.x + last.w); if (gap > 0.18 * it.h && !/\s$/.test(t) && !/^\s/.test(it.s)) t += ' '; }
      t += it.s; last = it;
    });
    return t.replace(/\s+$/, '');
  }
  // A two-column page has a vertical gutter: most rows that have text on both sides of it show a wide gap there.
  function findGutter(its, W) {
    if (its.length < 16) return null;
    var minX = Infinity, maxX = -Infinity;
    its.forEach(function (i) { minX = Math.min(minX, i.x); maxX = Math.max(maxX, i.x + i.w); });
    W = W || maxX; var span = maxX - minX; if (span < 200) return null;
    var rows = groupRows(its), totalChars = its.reduce(function (a, i) { return a + i.s.length; }, 0), best = null;
    for (var f = 0.22; f <= 0.72; f += 0.01) {
      var g = minX + f * span, two = 0, good = 0, crossing = 0, crossRows = 0, lc = 0, rc = 0, lRows = 0, rRows = 0;
      rows.forEach(function (r) {
        var L = r.items.filter(function (i) { return i.x + i.w <= g + 1; }), Rr = r.items.filter(function (i) { return i.x >= g - 1; });
        var X = r.items.filter(function (i) { return i.x < g - 1 && i.x + i.w > g + 1; });
        crossing += X.length; if (X.length) crossRows++; L.forEach(function (i) { lc += i.s.length; }); Rr.forEach(function (i) { rc += i.s.length; });
        if (L.length) lRows++; if (Rr.length) rRows++;
        if (L.length && Rr.length && !X.length) { two++; var gap = Rr[0].x - Math.max.apply(null, L.map(function (i) { return i.x + i.w; })); if (gap >= Math.max(10, 0.8 * r.h)) good++; }
      });
      // a real gutter is crossed by (almost) no row; long single-column lines cross it
      var ok = crossing / its.length < 0.04 && crossRows <= Math.max(1, 0.08 * rRows) && lRows >= 6 && rRows >= 6 && lc / totalChars >= 0.12 && rc / totalChars >= 0.25 && (two === 0 || good / two >= 0.85);
      if (ok) { var sc = Math.min(lRows, rRows) - crossing * 3; if (!best || sc > best.sc) best = { g: g, sc: sc, f: f }; }
    }
    return best ? best.g : null;
  }
  function pageText(items, pageWidth) {
    var its = normItems(items); if (!its.length) return '';
    var g = findGutter(its, pageWidth);
    var toText = function (arr) { return groupRows(arr).map(rowText).join('\n'); };
    if (g === null) return toText(its);
    return toText(its.filter(function (i) { return i.x + i.w <= g + 1; })) + '\n' + toText(its.filter(function (i) { return i.x + i.w > g + 1; }));
  }

  /* ---------------------------------------------------------------- 2. Tiny zip reader for .docx (uses the browser's DecompressionStream) */
  async function inflateRaw(u8) {
    if (typeof DecompressionStream === 'undefined') throw new Error('no DecompressionStream');
    var ds = new DecompressionStream('deflate-raw'), w = ds.writable.getWriter(); w.write(u8); w.close();
    var buf = await new Response(ds.readable).arrayBuffer(); return new Uint8Array(buf);
  }
  async function unzip(arrayBuffer) {
    var u8 = new Uint8Array(arrayBuffer), dv = new DataView(arrayBuffer), eocd = -1;
    for (var i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('not a zip');
    var n = dv.getUint16(eocd + 10, true), off = dv.getUint32(eocd + 16, true), entries = {};
    for (var k = 0; k < n; k++) {
      if (dv.getUint32(off, true) !== 0x02014b50) break;
      var method = dv.getUint16(off + 10, true), csize = dv.getUint32(off + 20, true), nl = dv.getUint16(off + 28, true), el = dv.getUint16(off + 30, true), cl = dv.getUint16(off + 32, true), lho = dv.getUint32(off + 42, true);
      var name = new TextDecoder().decode(u8.subarray(off + 46, off + 46 + nl));
      entries[name] = { method: method, csize: csize, lho: lho };
      off += 46 + nl + el + cl;
    }
    return {
      names: Object.keys(entries),
      text: async function (name) {
        var e = entries[name]; if (!e) return null;
        var lnl = dv.getUint16(e.lho + 26, true), lel = dv.getUint16(e.lho + 28, true), start = e.lho + 30 + lnl + lel;
        var data = u8.subarray(start, start + e.csize);
        var out = e.method === 0 ? data : await inflateRaw(data);
        return new TextDecoder().decode(out);
      }
    };
  }

  /* ---------------------------------------------------------------- 3. File-level analysis (layout facts the plain text cannot show) */
  var SAFE_FONTS = /(calibri|carlito|arial|helvetica|liberation|georgia|cambria|caladea|times|garamond|palatino|book ?antiqua|tahoma|verdana|aptos|segoe|trebuchet|roboto|open ?sans|lato|source ?sans|noto|dejavu|gill ?sans|century|franklin|symbol|wingdings)/i;
  var EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, PHONE_RE = /(\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b|\+\d{1,3}[\s-]?\d{3,4}[\s-]?\d{3,4}[\s-]?\d{3,4}/;
  async function analyseFile(file) {
    var info = { name: file.name, sizeMB: file.size / 1048576, kind: /\.pdf$/i.test(file.name) ? 'pdf' : /\.docx$/i.test(file.name) ? 'docx' : /\.doc$/i.test(file.name) ? 'doc' : 'other', checked: [] };
    var buf = await file.arrayBuffer();
    try {
      if (info.kind === 'pdf' && root.pdfjsLib) {
        var pdf = await root.pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        info.pages = pdf.numPages; info.chars = 0; info.multiColumnPages = 0; info.tableRows = 0; info.privateUse = 0; info.fonts = {}; info.links = [];
        var bandOnlyContact = true, anyContact = false, allText = '';
        for (var p = 1; p <= Math.min(pdf.numPages, 4); p++) {
          var page = await pdf.getPage(p), tc = await page.getTextContent(), view = page.view, W = view[2] - view[0], H = view[3] - view[1];
          var its = normItems(tc.items), txt = pageText(tc.items, W); allText += txt + '\n';
          info.chars += its.reduce(function (a, i) { return a + i.s.length; }, 0);
          if (findGutter(its, W) !== null) info.multiColumnPages++;
          its.forEach(function (i) {
            info.privateUse += (i.s.match(/[\uE000-\uF8FF]/g) || []).length;
            var st = tc.styles && tc.styles[i.font], fam = ((st && st.fontFamily) || '') + ' ' + i.font;
            info.fonts[fam.replace(/^[A-Z]{6}\+/, '').trim()] = 1;
            if (EMAIL_RE.test(i.s) || PHONE_RE.test(i.s)) { anyContact = true; var yRel = (i.y - view[1]) / H; if (yRel > 0.07 && yRel < 0.93) bandOnlyContact = false; }
          });
          // table-like rows: 3+ separate text blocks with wide gaps, repeated on several consecutive rows
          var rows = groupRows(its), run = 0;
          rows.forEach(function (r) {
            var blocks = 1; for (var b = 1; b < r.items.length; b++) if (r.items[b].x - (r.items[b - 1].x + r.items[b - 1].w) > 18) blocks++;
            run = blocks >= 3 ? run + 1 : 0; if (run >= 3) info.tableRows++;
          });
          try { (await page.getAnnotations()).forEach(function (a) { if (a.subtype === 'Link' && a.url) info.links.push(a.url); }); } catch (e) { /* ignore */ }
        }
        info.headerFooterContact = anyContact && bandOnlyContact;
        info.imageOnly = info.chars / Math.max(1, Math.min(pdf.numPages, 4)) < 200;
        info.hiddenLinks = info.links.filter(function (u) { var core = u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''); return core.length > 6 && allText.indexOf(core.split('?')[0]) < 0 && !/^mailto:|^tel:/.test(u); });
        info.unsafeFonts = Object.keys(info.fonts).filter(function (f) { return f && !SAFE_FONTS.test(f) && !/^g_d\d|^f\d+$|^t\d+$/i.test(f); });
        info.checked = ['layout', 'columns', 'tables', 'header/footer', 'fonts', 'icons', 'links', 'scanned'];
      } else if (info.kind === 'docx') {
        var z = await unzip(buf), xml = (await z.text('word/document.xml')) || '';
        info.docxTables = (xml.match(/<w:tbl>|<w:tbl /g) || []).length;
        info.textBoxes = (xml.match(/<w:txbxContent|<wps:txbx|<v:textbox/g) || []).length;
        var cols = xml.match(/<w:cols [^>]*w:num="(\d+)"/g) || []; info.columns = cols.some(function (c) { return +/w:num="(\d+)"/.exec(c)[1] > 1; });
        info.images = (xml.match(/<w:drawing|<w:pict/g) || []).length + z.names.filter(function (n) { return /^word\/media\//.test(n); }).length;
        var hf = '';
        for (var j = 0; j < z.names.length; j++) if (/^word\/(header|footer)\d*\.xml$/.test(z.names[j])) hf += ' ' + ((await z.text(z.names[j])) || '').replace(/<w:instrText[^>]*>[\s\S]*?<\/w:instrText>/g, '').replace(/<[^>]+>/g, ' ');
        var bodyText = xml.replace(/<[^>]+>/g, ' ');
        info.headerFooterContact = (EMAIL_RE.test(hf) || PHONE_RE.test(hf)) && !(EMAIL_RE.test(bodyText) && PHONE_RE.test(bodyText));
        info.headerFooterText = hf.replace(/\s+/g, ' ').trim().slice(0, 120);
        var fonts = {}; (xml.match(/w:ascii="([^"]+)"/g) || []).forEach(function (m) { fonts[/"([^"]+)"/.exec(m)[1]] = 1; });
        info.fonts = fonts; info.unsafeFonts = Object.keys(fonts).filter(function (f) { return !SAFE_FONTS.test(f); });
        info.checked = ['tables', 'text boxes', 'columns', 'header/footer', 'images', 'fonts'];
      }
    } catch (e) { info.error = String(e && e.message || e); }
    return info;
  }

  /* ---------------------------------------------------------------- 4. Text-level checks */
  var HEAD = {
    experience: /^(work |professional |relevant )?(experience|employment( history)?|work history|internships?|summer internship|professional background|career history)\b/i,
    education: /^(education|academic (qualifications|background|details|credentials)|academics|scholastic)/i,
    skills: /^((technical|key|core|professional|it) )?(skills|competencies|skill set|expertise|tools)/i,
    summary: /^(summary|profile|professional summary|career objective|objective|about me|profile summary)/i,
    projects: /^(projects|academic projects|live projects|key projects)/i,
    achievements: /^(achievements|awards|honou?rs|accomplishments|scholastic achievements)/i
  };
  var ACRONYMS = { seo: 'search engine optimisation', sem: 'search engine marketing', crm: 'customer relationship management', erp: 'enterprise resource planning', kpi: 'key performance indicator',
    okr: 'objectives and key results', prd: 'product requirements document', gtm: 'go-to-market', 'fp&a': 'financial planning and analysis', dcf: 'discounted cash flow', 'm&a': 'mergers and acquisitions',
    'p&l': 'profit and loss', saas: 'software as a service', ux: 'user experience', ml: 'machine learning', 'l&d': 'learning and development', scm: 'supply chain management', 's&op': 'sales and operations planning',
    esg: 'environmental, social and governance', pmo: 'project management office', rca: 'root cause analysis', nps: 'net promoter score', roi: 'return on investment', cac: 'customer acquisition cost', ltv: 'lifetime value', sdlc: 'software development life cycle', uat: 'user acceptance testing' };
  function esc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function textChecks(text) {
    var lines = String(text || '').split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean), low = String(text || '').toLowerCase();
    var heads = {}; lines.forEach(function (l) { if (l.length <= 45) Object.keys(HEAD).forEach(function (k) { if (HEAD[k].test(l.replace(/[:\-–|•]+$/, '').trim())) heads[k] = true; }); });
    var months = (text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*'?\d{2,4}\b/gi) || []).length;
    var numeric = (text.match(/\b(0?[1-9]|1[0-2])\/(19|20)\d{2}\b/g) || []).length, apostrophe = (text.match(/[’']\d{2}\b/g) || []).length;
    var singleDigit = (text.match(/\b[1-9]\/(19|20)\d{2}\b/g) || []).length, yearRanges = (text.match(/\b(19|20)\d{2}\s*[–-]\s*((19|20)\d{2}|present)\b/gi) || []).length;
    var symbols = (text.match(/[^\x00-\x7F₹–—’‘“”•·…€£°×]/g) || []).length, longParas = lines.filter(function (l) { return l.split(/\s+/).length > 45; });
    var skillsBlock = (function () { var i = lines.findIndex(function (l) { return HEAD.skills.test(l) && l.length <= 45; }); if (i < 0) return []; var out = [];
      for (var j = i + 1; j < lines.length && j < i + 12; j++) { if (Object.keys(HEAD).some(function (k) { return HEAD[k].test(lines[j]) && lines[j].length <= 45; })) break; out = out.concat(lines[j].replace(/^[^:]{0,30}:\s*/, '').split(/,|\||;|•/)); }
      return out.map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 1 && s.length < 40; }); })();
    var acr = []; Object.keys(ACRONYMS).forEach(function (a) {
      var hasA = new RegExp('(^|[^a-z])' + esc(a) + '([^a-z]|$)').test(low), hasF = low.indexOf(ACRONYMS[a].replace('optimisation', 'optimi')) >= 0 || low.indexOf(ACRONYMS[a]) >= 0;
      if (hasA && !hasF) acr.push(a);
    });
    return { heads: heads, contact: { email: EMAIL_RE.test(text), phone: PHONE_RE.test(text), linkedin: /linkedin\.com\/in\//i.test(text) },
      dates: { months: months, numeric: numeric, apostrophe: apostrophe, singleDigit: singleDigit, yearOnly: Math.max(0, yearRanges - Math.floor(months / 2)) },
      symbolRatio: symbols / Math.max(1, text.length), longParas: longParas, skills: skillsBlock, acronymsWithoutFullForm: acr, words: (text.match(/\S+/g) || []).length };
  }

  /* ---------------------------------------------------------------- 5. ATS score + issues + optimizer suggestions */
  function band(s) { return s >= 80 ? 'Strong' : s >= 65 ? 'Good, with gaps' : s >= 50 ? 'Needs work' : 'Rebuild'; }
  function atsScore(fileInfo, tc, rep) {
    var issues = [], parse = 40, structure = 0, search = 0, cap = 100;
    function issue(id, sev, pts, title, why, fix) { issues.push({ id: id, severity: sev, title: title, why: why, fix: fix }); parse -= pts; }
    var fi = fileInfo || {};
    if (!fileInfo) { parse = rep && rep.details && rep.details.ats && rep.details.ats.garbled ? 20 : 34; }
    else {
      if (fi.imageOnly) { issue('IMAGE_ONLY', 'critical', 40, 'Your PDF has little or no selectable text', 'It looks scanned or exported as an image (common with Canva/design exports). ATS cannot read text inside images.', 'Re-create the resume in Word or Google Docs and export a text-based PDF (you should be able to select the text).'); cap = 40; }
      if (fi.multiColumnPages || fi.columns) issue('MULTI_COLUMN', 'high', 12, 'Two-column layout', 'Many ATS read left to right across columns, mixing your sidebar into your experience.', 'Use a single column. Move sidebar content (skills, education, contact) into normal sections.');
      if (fi.docxTables || fi.tableRows >= 3) issue('TABLES', 'high', 8, 'Tables or grid layout', 'Text inside table cells is often read out of order or dropped.', 'Replace tables with plain lines and bullets; use tab stops for dates.');
      if (fi.textBoxes) issue('TEXT_BOXES', 'high', 10, 'Text boxes / shapes', 'Text inside text boxes is frequently skipped or moved by parsers.', 'Move that text into the main body of the document.');
      if (fi.headerFooterContact) issue('HEADER_CONTACT', 'high', 10, 'Contact details only in the page header/footer', 'Several ATS ignore headers and footers, so your email/phone may not be captured.', 'Put your name, phone, email and LinkedIn as the first lines of the body.');
      if (fi.images || fi.privateUse > 3) issue('IMAGES_ICONS', 'medium', 4, 'Images, icons or skill bars', 'Graphics cannot be read; icon fonts turn into junk characters.', 'Replace icons with words (e.g. "Email:") and skill bars with plain skill names.');
      if (fi.unsafeFonts && fi.unsafeFonts.length) issue('FONTS', 'low', 2, 'Uncommon font(s): ' + fi.unsafeFonts.slice(0, 2).join(', '), 'Uncommon or decorative fonts can map to wrong characters in some parsers.', 'Use Calibri, Arial, Georgia, Cambria or Garamond at 10–12 pt.');
      if (fi.sizeMB > 2.5) issue('FILE_SIZE', 'high', 6, 'File larger than 2.5 MB (' + fi.sizeMB.toFixed(1) + ' MB)', 'Greenhouse documents that it cannot parse resumes larger than 2.5 MB.', 'Remove images and re-export; a text resume is usually under 300 KB.');
      if (fi.kind === 'doc' || fi.kind === 'other') issue('FILE_TYPE', 'medium', 5, 'Old or unusual file type', 'Some ATS handle only .docx or text-based .pdf reliably.', 'Upload a .docx or a text-based .pdf.');
      if (fi.hiddenLinks && fi.hiddenLinks.length) issue('HIDDEN_LINKS', 'low', 1, 'Links hidden behind words', 'If a parser keeps only text, a link labelled "LinkedIn" loses its address.', 'Print the address itself, e.g. linkedin.com/in/your-name.');
      if (fi.error) issues.push({ id: 'FILE_READ', severity: 'info', title: 'Some layout checks could not run', why: 'The file could not be fully inspected in this browser.', fix: 'Results below are based on the extracted text.' });
    }
    if (tc.symbolRatio > 0.02) issue('SYMBOLS', 'low', 3, 'Decorative symbols', 'Fancy bullets and symbols can turn into question marks or boxes.', 'Use simple bullets (• or –).');
    parse = Math.max(0, parse);
    // structure (25)
    structure += (tc.heads.experience ? 6 : 0) + (tc.heads.education ? 5 : 0) + (tc.heads.skills ? 3 : 0);
    structure += (tc.contact.email ? 3 : 0) + (tc.contact.phone ? 3 : 0) + (tc.contact.linkedin ? 1 : 0);
    var d = tc.dates, styles = (d.months > 0 ? 1 : 0) + (d.numeric > 0 ? 1 : 0) + (d.apostrophe > 0 ? 1 : 0);
    structure += (styles <= 1 && !d.singleDigit ? 2 : 0) + (d.months + d.numeric > 0 ? 2 : 0);
    if (!tc.heads.experience) issues.push({ id: 'HEAD_EXP', severity: 'high', title: 'No standard "Experience" / "Internships" heading found', why: 'ATS sort your content into fields using standard headings.', fix: 'Use headings such as "Work Experience", "Internships", "Education", "Skills", "Projects".' });
    if (!tc.heads.education) issues.push({ id: 'HEAD_EDU', severity: 'medium', title: 'No standard "Education" heading found', why: 'Your degree may not be captured as education.', fix: 'Add a section titled "Education".' });
    if (!tc.contact.email || !tc.contact.phone) issues.push({ id: 'CONTACT', severity: 'high', title: 'Email or phone number not found in the text', why: 'Recruiters cannot contact you if the ATS does not capture these.', fix: 'Add your email and a 10-digit mobile number (+91) in the first lines.' });
    if (styles > 1 || d.singleDigit || d.apostrophe) issues.push({ id: 'DATES', severity: 'medium', title: 'Mixed or unclear date formats', why: 'ATS calculate your experience from dates; mixed formats cause errors.', fix: 'Use one style everywhere, e.g. "Jan 2023 – Mar 2025".' });
    if (tc.longParas.length) issues.push({ id: 'PARAGRAPHS', severity: 'low', title: tc.longParas.length + ' long paragraph(s) instead of bullets', why: 'Dense paragraphs are harder to parse and to scan.', fix: 'Split into bullets of 1–2 lines, each starting with an action verb.' });
    // searchability (35) from the engine's JD analysis
    var det = (rep && rep.details) || {}, sk = det.skill || {}, matched = (sk.matched || []).length, listed = (sk.listedOnly || []).length, gaps = sk.gaps || [];
    var total = matched + listed + gaps.length;
    search += 12 * (sk.mustShare !== undefined ? sk.mustShare : 0);
    search += 10 * (matched + listed ? matched / (matched + listed) : 0);
    search += 6 * Math.min(1, (det.role && det.role.titleAlign) || 0);
    search += 3 * Math.max(0, 1 - 0.34 * tc.acronymsWithoutFullForm.length);
    var nSk = tc.skills.length; search += nSk >= 13 && nSk <= 25 ? 4 : nSk >= 8 && nSk <= 40 ? 2 : nSk > 40 ? 1 : 0;
    var score = Math.min(cap, Math.round(parse + structure + search));
    // optimizer suggestions (never a headline/title suggestion)
    var sug = [];
    gaps.filter(function (g) { return g.kind === 'must'; }).concat(gaps.filter(function (g) { return g.kind !== 'must'; })).slice(0, 4).forEach(function (g) {
      sug.push({ t: 'Add "' + g.t + '" where you have genuinely used it', d: 'This JD skill is missing from your resume. If you have done it, write a bullet in your most relevant role: what you did with ' + g.t + ' and the result (use real numbers only).' }); });
    (sk.listedOnly || []).slice(0, 3).forEach(function (g) { sug.push({ t: 'Show "' + g.t + '" in a bullet, not only in Skills', d: 'Recruiter searches and ATS rankings weigh skills shown in context. Add one bullet that proves it.' }); });
    tc.acronymsWithoutFullForm.slice(0, 3).forEach(function (a) { sug.push({ t: 'Write "' + a.toUpperCase() + '" in full once', d: 'Recruiters may search either form. Write it once as "' + ACRONYMS[a].replace(/\b\w/g, function (m) { return m.toUpperCase(); }) + ' (' + a.toUpperCase() + ')".' }); });
    if (nSk && (nSk < 8 || nSk > 40)) sug.push({ t: nSk < 8 ? 'List more relevant skills (aim for 13–25)' : 'Trim your skills list (aim for 13–25)', d: 'Keep tools and methods the JD asks for; drop generic words like "MS Office" if space is tight.' });
    issues.filter(function (i) { return i.severity !== 'info'; }).forEach(function (i) { sug.push({ t: i.title, d: i.fix }); });
    return { score: score, band: band(score), parts: { parse: Math.round(parse), structure: structure, search: Math.round(search) }, issues: issues, suggestions: sug.slice(0, 10), fileChecked: !!fileInfo, checked: fi.checked || [] };
  }

  /* ---------------------------------------------------------------- 6. Static guides */
  var COMMON_MISTAKES = [
    ['Scanned or image-only PDF (incl. many Canva exports)', 'No text layer: nothing can be read.', 'Export a text-based PDF from Word/Google Docs.', 'ATS vendor documented'],
    ['Two-column or sidebar layouts', 'Text is read across columns and mixed up.', 'Use one column.', 'ATS vendor documented'],
    ['Tables and grids', 'Cells are read out of order or dropped.', 'Use plain lines and bullets.', 'ATS vendor documented'],
    ['Text boxes and shapes', 'Content is skipped or moved.', 'Keep all text in the body.', 'ATS vendor documented'],
    ['Contact details in the header/footer', 'Many ATS skip headers and footers.', 'Put contact details in the first lines of the body.', 'ATS vendor documented'],
    ['Images, icons, logos, skill bars, charts', 'Graphics are unreadable; icon fonts become junk characters.', 'Use words, not pictures.', 'ATS vendor documented'],
    ['Creative section headings ("My Journey", "What I Bring")', 'The ATS cannot map them to Experience, Education or Skills.', 'Use standard headings.', 'Industry guidance'],
    ['Unclear or mixed date formats (’21, 1/21, year only)', 'Years of experience are miscalculated.', 'Use "Jan 2023 – Mar 2025" everywhere.', 'Industry guidance'],
    ['Missing or non-standard job titles', 'Recruiters search by title.', 'Use the standard title of your role (internal title in brackets if needed).', 'ATS vendor documented'],
    ['Acronyms without the full form', 'A recruiter may search the other form.', 'Write both once: "Search Engine Optimisation (SEO)".', 'Industry guidance'],
    ['Decorative fonts and fancy bullets', 'Characters can turn into boxes or question marks.', 'Use standard fonts and • or – bullets.', 'Industry guidance'],
    ['Keyword stuffing or white text', 'Recruiters reject it on sight; it looks dishonest.', 'Use keywords only where true and in context.', 'Industry guidance'],
    ['Very large files (> 2.5 MB) or unusual file types', 'Some ATS cannot parse them.', 'Use .docx or text-based .pdf under 2.5 MB.', 'ATS vendor documented']
  ];
  var FONT_GUIDE = [
    ['Fonts', 'Calibri, Arial, Georgia, Cambria, Garamond, Helvetica, Times New Roman, Tahoma, Verdana'],
    ['Font size', 'Body 10–12 pt · section headings 12–14 pt · name 14–18 pt'],
    ['Layout', 'Single column; no tables, text boxes, graphics or skill bars'],
    ['Section headings', 'Summary (optional) · Work Experience / Internships · Education · Skills · Projects · Achievements · Positions of Responsibility'],
    ['Dates', 'One style everywhere: "Jan 2023 – Mar 2025"'],
    ['Bullets', 'Simple • or –; start with an action verb; add a number where true; 1–2 lines each'],
    ['Length', '1 page for freshers and campus placements; 1–2 pages for 2–10 years; up to 2 pages for senior roles'],
    ['Margins and spacing', '0.5–1 inch margins; 1.0–1.15 line spacing (convention, not an ATS rule)'],
    ['File', 'Text-based PDF or .docx under 2.5 MB; name it Firstname_Lastname_Resume.pdf'],
    ['Photo', 'Usually leave it out, unless your institute\'s placement format asks for one']
  ];

  /* ---------------------------------------------------------------- 7. LinkedIn optimizer (PDF export or pasted text; never fetched) */
  var LI_HEADS = /^(contact|top skills|languages|certifications|honors-awards|honors|publications|patents|projects|summary|about|experience|education|volunteer experience|skills)$/i;
  function parseLinkedInPdfText(text) {
    var lines = String(text || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean), sec = {}, cur = '_top';
    lines.forEach(function (l) { if (LI_HEADS.test(l)) { cur = l.toLowerCase(); sec[cur] = sec[cur] || []; } else (sec[cur] = sec[cur] || []).push(l); });
    var slug = (/linkedin\.com\/in\/([A-Za-z0-9\-_%]+)/i.exec(text) || [])[1] || '';
    // headline: the lines after the name, before the location line, in the block preceding "Summary"/"Experience"
    var top = [], keys = Object.keys(sec), lastSide = -1;
    ['contact', 'top skills', 'languages', 'certifications', 'honors-awards', 'honors', 'publications', 'patents'].forEach(function (k) { var i = keys.indexOf(k); if (i > lastSide) lastSide = i; });
    var block = lastSide >= 0 ? sec[keys[lastSide]] : sec._top || [];
    var headIdx = block.findIndex(function (l, i) { return i > 0 && /\b(at|@|\||manager|analyst|student|engineer|consultant|mba|pgdm|associate|lead|head|officer|specialist|intern|founder|developer|executive|director)\b/i.test(l) && l.length > 12; });
    var headline = '';
    if (headIdx > 0) { headline = block[headIdx]; if (block[headIdx + 1] && !/,|india|area|district/i.test(block[headIdx + 1]) && block[headIdx + 1].length > 15) headline += ' ' + block[headIdx + 1]; }
    return { headline: headline, about: (sec.summary || sec.about || []).join(' '), experience: (sec.experience || []).join('\n'), education: (sec.education || []).join('\n'),
      skills: (sec['top skills'] ? sec['top skills'].slice(0, 3) : (sec.skills || [])).join(', '), slug: slug, fromPdf: true };   // the PDF lists at most 3 top skills
  }
  function scoreLinkedIn(li, rep, extra) {
    extra = extra || {};
    var jd = (rep && rep.jd) || {}, det = (rep && rep.details) || {}, sk = det.skill || {};
    var targetTerms = [].concat(sk.matched || [], sk.listedOnly || [], sk.gaps || []).map(function (x) { return x.t; });
    var bench = /benchmark \(([^/)]+)/.exec(String(jd.title || ''));                       // library mode: "Domain · Level benchmark (Product Manager / …)"
    var roleTitle = (bench ? bench[1] : String(jd.title || '').split('|')[0].replace(/\(.*?\)/g, '')).trim();
    var title = roleTitle.toLowerCase();
    var pretty = function (t) { return /^[a-z&/]{2,4}$/.test(t) ? t.toUpperCase() : t.charAt(0).toUpperCase() + t.slice(1); };
    var domainWord = String(jd.domainName || '').toLowerCase();
    function has(text, term) { return new RegExp('(^|[^a-z0-9])' + esc(term.toLowerCase()) + '([^a-z0-9]|$)').test(String(text || '').toLowerCase()); }
    var hl = li.headline || '', ab = li.about || '', ex = li.experience || '', skl = li.skills || '';
    var c = [], s = { headline: 0, about: 0, experience: 0, skills: 0, completeness: 0 }, sug = [];
    function chk(part, pts, ok, label, tip) { if (ok) s[part] += pts; c.push({ part: part, ok: !!ok, label: label }); if (!ok && tip) sug.push(tip); }
    var titleWords = title.split(/\s+/).filter(function (w) { return w.length > 2 && !/^(and|the|for|with)$/.test(w); });
    var hlTitle = titleWords.length && titleWords.filter(function (w) { return has(hl, w); }).length >= Math.ceil(titleWords.length * 0.6) || has(hl, domainWord);
    var hlSkills = targetTerms.filter(function (t) { return has(hl, t); });
    chk('headline', 8, hlTitle, 'Headline names your target role', 'LinkedIn headline (the line under your name on LinkedIn): name the role you want, e.g. "' + (roleTitle || 'Product Manager') + ' | ' + (targetTerms.slice(0, 2).map(pretty).join(' · ') || 'key skills') + '".');
    chk('headline', 6, hlSkills.length >= 2, 'Headline has 2+ target skills', 'Add 2–3 target skills to your LinkedIn headline (e.g. ' + targetTerms.slice(0, 3).map(pretty).join(', ') + ').');
    chk('headline', 3, hl.length > 0 && hl.length <= 220, 'Headline within 220 characters', hl.length > 220 ? 'Shorten your LinkedIn headline to 220 characters or fewer.' : 'Add a LinkedIn headline.');
    chk('headline', 3, hl && !/^(student|looking for|seeking|open to|aspiring)\b/i.test(hl.trim()), 'Headline is specific (not just "Student" / "Looking for opportunities")', 'Replace generic headline words with your target role and proof (skills, domain, a number).');
    var abHits = targetTerms.filter(function (t) { return has(ab, t); });
    chk('about', 5, ab.length >= 600, 'About section has substance (600+ characters; 1,200–2,600 is ideal)', 'Write an About section of 1,200–2,600 characters: who you are, what you have done (with numbers), what you want next.');
    chk('about', 3, ab && (hlTitle ? targetTerms.some(function (t) { return has(ab.slice(0, 300), t); }) || has(ab.slice(0, 300), domainWord) : has(ab.slice(0, 300), domainWord)), 'About opens with your target domain in the first 300 characters', 'Open your About section with your target role/domain; only the first ~300 characters show before "see more".');
    chk('about', 4, abHits.length >= 3, 'About uses 3+ target keywords', 'Use target keywords naturally in About: ' + targetTerms.filter(function (t) { return !has(ab, t); }).slice(0, 4).map(pretty).join(', ') + '.');
    chk('about', 3, /\d/.test(ab), 'About includes a measurable result', 'Add one quantified achievement to About (real numbers only).');
    var exLines = ex.split('\n').filter(function (l) { return l.trim().length > 25; });
    chk('experience', 6, exLines.length >= 3, 'Experience has 3+ descriptive lines', 'Add 3–5 bullet lines under your most recent role on LinkedIn (copy your strongest resume bullets).');
    chk('experience', 6, /\d+\s?(%|cr|lakh|k\b|x\b|\+)|₹/i.test(ex), 'Experience shows numbers', 'Add numbers to LinkedIn experience lines (%, ₹, counts, time saved).');
    var roles = (rep && rep.candidate && rep.candidate.roles) || [], coNames = roles.map(function (r) { return r.company; }).filter(Boolean);
    var consistent = coNames.length ? coNames.filter(function (n) { return has(ex, n.split(' / ')[0].split(' ')[0]); }).length / coNames.length : (ex ? 1 : 0);
    chk('experience', 8, consistent >= 0.7, 'LinkedIn experience matches your resume employers', 'Make sure every employer and title on your resume also appears on LinkedIn with the same dates; recruiters cross-check.');
    var skList = skl.split(/,|\n|·|\|/).map(function (x) { return x.trim(); }).filter(Boolean), skHits = targetTerms.filter(function (t) { return skList.some(function (x) { return x.toLowerCase().indexOf(t.toLowerCase()) >= 0; }); });
    chk('skills', 9, skHits.length >= Math.min(5, Math.max(2, Math.round(targetTerms.length * 0.3))), 'Skills section covers target JD skills', 'Add these to LinkedIn Skills (you can list up to 100): ' + targetTerms.filter(function (t) { return skHits.indexOf(t) < 0; }).slice(0, 6).map(pretty).join(', ') + '.');
    chk('skills', 6, li.fromPdf ? skList.length >= 3 : skList.length >= 10, li.fromPdf ? 'Top skills set (the PDF shows only your top skills)' : '10+ relevant skills listed', 'List 25–50 relevant skills on LinkedIn and pin your top 3 to match your target role.');
    chk('completeness', 5, !!hl, 'Headline present'); chk('completeness', 5, !!ab, 'About present'); chk('completeness', 6, !!ex, 'Experience present');
    chk('completeness', 4, !!li.education || /education/i.test(li.raw || ''), 'Education present', 'Add your education (degree, institute, years).');
    var slug = li.slug || ((/linkedin\.com\/in\/([A-Za-z0-9\-_%]+)/i.exec(extra.url || '') || [])[1] || '');
    chk('completeness', 3, slug && !/-[a-z0-9]{6,}$/i.test(slug) && !/\d{4,}/.test(slug), 'Custom profile URL', 'Set a custom LinkedIn URL (Edit public profile & URL), e.g. linkedin.com/in/firstname-lastname.');
    chk('completeness', 3, skList.length >= 5 || li.fromPdf, 'Skills present');
    chk('completeness', 2, !!extra.photo, 'Professional photo', 'Add a clear professional photo; profiles with photos get more views.');
    chk('completeness', 1, !!extra.banner, 'Custom banner', 'Add a simple banner related to your field.');
    chk('completeness', 1, !!extra.openToWork, 'Open to Work set (recruiters only, if you prefer)', 'Turn on "Open to work" for recruiters with your target titles and cities.');
    var score = Math.round(s.headline + s.about + s.experience + s.skills + s.completeness);
    return { score: score, band: score >= 75 ? 'Strong' : score >= 55 ? 'Good, with gaps' : 'Significant gaps', parts: s, checklist: c, suggestions: sug.slice(0, 8) };
  }

  /* ---------------------------------------------------------------- 8. UI */
  var CSS = '.rfsd-wrap{margin:28px 0;display:grid;gap:22px}.rfsd-card{padding:24px 26px}.rfsd-eyebrow{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#D9B27C;font-weight:700;margin-bottom:6px}' +
    '.rfsd-h{font-size:22px;font-weight:700;margin:0 0 6px}.rfsd-sub{opacity:.8;margin:0 0 16px;font-size:14px}.rfsd-score{display:flex;gap:26px;align-items:center;flex-wrap:wrap}' +
    '.rfsd-big{font-size:54px;font-weight:800;line-height:1}.rfsd-big small{font-size:18px;opacity:.7}.rfsd-band{display:inline-block;margin-top:8px;padding:4px 12px;border-radius:999px;border:1px solid rgba(217,178,124,.6);color:#D9B27C;font-weight:700;font-size:13px}' +
    '.rfsd-bars{flex:1;min-width:260px;display:grid;gap:10px}.rfsd-bar{font-size:13px}.rfsd-bar i{display:block;height:7px;border-radius:6px;background:rgba(255,255,255,.12);margin-top:4px;overflow:hidden}.rfsd-bar i b{display:block;height:100%;background:#D9B27C}' +
    '.rfsd-list{list-style:none;padding:0;margin:14px 0 0;display:grid;gap:10px}.rfsd-list li{padding:12px 14px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);font-size:14px;line-height:1.5}' +
    '.rfsd-chip{display:inline-block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:2px 8px;border-radius:6px;margin-right:8px;background:rgba(255,255,255,.1)}' +
    '.rfsd-critical,.rfsd-high{background:rgba(229,83,83,.25);color:#ffb4b4}.rfsd-medium{background:rgba(217,178,124,.25);color:#f1d3a6}.rfsd-low,.rfsd-info{background:rgba(120,200,160,.2);color:#bfead3}' +
    '.rfsd-ok{color:#8fe0b4}.rfsd-no{color:#ffb4b4}.rfsd-grid2{display:grid;grid-template-columns:minmax(150px,220px) 1fr;gap:8px 16px;font-size:14px}.rfsd-grid2 div:nth-child(odd){font-weight:700;color:#D9B27C}' +
    '.rfsd-table{width:100%;border-collapse:collapse;font-size:13.5px}.rfsd-table td,.rfsd-table th{padding:9px 10px;border-bottom:1px solid rgba(255,255,255,.1);text-align:left;vertical-align:top}.rfsd-table th{color:#D9B27C;font-size:12px;text-transform:uppercase;letter-spacing:.06em}' +
    '.rfsd-in{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.18);color:inherit;font:inherit;font-size:14px;margin:4px 0 10px}' +
    '.rfsd-row{display:flex;gap:14px;flex-wrap:wrap;align-items:center;font-size:14px;margin:6px 0 12px}.rfsd-btn{padding:10px 18px;border-radius:8px;border:1px solid #D9B27C;background:#D9B27C;color:#123;font-weight:700;cursor:pointer}' +
    '.rfsd-note{font-size:12.5px;opacity:.75;margin-top:8px}.rfsd-badge{padding:12px 16px;border-radius:10px;border:1px dashed rgba(217,178,124,.6);font-size:14px}@media print{.rfsd-li-inputs{display:none}}';
  function h(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function bar(label, v, max) { return '<div class="rfsd-bar">' + h(label) + ' · ' + v + ' / ' + max + '<i><b style="width:' + Math.round(100 * v / max) + '%"></b></i></div>'; }
  function buildHtml(m) {
    var a = m.ats, out = '';
    if (m.badges && m.badges.length) out += m.badges.map(function (b) { return '<div class="rfsd-badge">★ <strong>' + h(b.label) + ':</strong> ' + h(b.text) + '</div>'; }).join('');
    out += '<section class="score-card rfsd-card" id="rfsdAts"><div class="rfsd-eyebrow">ATS readiness</div><h3 class="rfsd-h">ATS Score</h3><p class="rfsd-sub">Can an applicant tracking system read your resume, and will recruiter searches find you? (This is not a pass/fail: most ATS help recruiters search and rank; automatic rejections usually come from screening questions.)</p>' +
      '<div class="rfsd-score"><div><div class="rfsd-big">' + a.score + '<small>/100</small></div><span class="rfsd-band">' + h(a.band) + '</span></div><div class="rfsd-bars">' +
      bar('Parse-ability (layout, file, fonts)', a.parts.parse, 40) + bar('Structure (headings, contact, dates)', a.parts.structure, 25) + bar('Searchability (JD skills in context, acronyms, skills list)', a.parts.search, 35) + '</div></div>' +
      (a.fileChecked ? '<p class="rfsd-note">File checks run on your uploaded file: ' + h(a.checked.join(', ')) + '.</p>' : '<p class="rfsd-note">Upload a PDF or Word resume to run the layout checks (columns, tables, text boxes, header/footer, fonts).</p>') +
      '<h4 style="margin:18px 0 0">Formatting issues found in your resume</h4>' +
      (a.issues.length ? '<ul class="rfsd-list">' + a.issues.map(function (i) { return '<li><span class="rfsd-chip rfsd-' + h(i.severity) + '">' + h(i.severity) + '</span><strong>' + h(i.title) + '</strong><br>' + h(i.why) + '<br><em>Fix:</em> ' + h(i.fix) + '</li>'; }).join('') + '</ul>' : '<ul class="rfsd-list"><li><span class="rfsd-chip rfsd-low">ok</span>No ATS formatting problems detected.</li></ul>') + '</section>';
    out += '<section class="score-card rfsd-card"><div class="rfsd-eyebrow">ATS optimizer</div><h3 class="rfsd-h">ATS Optimizer Suggestions</h3><p class="rfsd-sub">Do these in order. Only add a skill where it is true for you.</p>' +
      (a.suggestions.length ? '<ul class="rfsd-list">' + a.suggestions.map(function (s, i) { return '<li><strong>' + (i + 1) + '. ' + h(s.t) + '</strong><br>' + h(s.d) + '</li>'; }).join('') + '</ul>' : '<p>No changes needed for ATS readability.</p>') + '</section>';
    out += '<section class="score-card rfsd-card"><div class="rfsd-eyebrow">Avoid these</div><h3 class="rfsd-h">Common ATS formatting mistakes</h3><p class="rfsd-sub">Mistakes that applicant tracking systems often cannot read. Check your resume against each one.</p><table class="rfsd-table"><tr><th>Mistake</th><th>Why it fails</th><th>Do this instead</th></tr>' +
      COMMON_MISTAKES.map(function (r) { return '<tr><td>' + h(r[0]) + '</td><td>' + h(r[1]) + '</td><td>' + h(r[2]) + '</td></tr>'; }).join('') + '</table></section>';
    out += '<section class="score-card rfsd-card"><div class="rfsd-eyebrow">Formatting guide</div><h3 class="rfsd-h">Best resume fonts &amp; formatting</h3><div class="rfsd-grid2">' + FONT_GUIDE.map(function (r) { return '<div>' + h(r[0]) + '</div><div>' + h(r[1]) + '</div>'; }).join('') + '</div></section>';
    out += '<section class="score-card rfsd-card" id="rfsdLinkedIn"><div class="rfsd-eyebrow">LinkedIn</div><h3 class="rfsd-h">LinkedIn Profile Optimizer</h3><p class="rfsd-sub">Upload your LinkedIn profile PDF (on LinkedIn: Me → View profile → Resources → Save to PDF), or paste your sections below. Checked against your target JD. Everything stays in your browser.</p>' +
      '<div class="rfsd-li-inputs"><input type="file" id="rfsdLiFile" accept=".pdf" class="rfsd-in"><input type="text" id="rfsdLiUrl" class="rfsd-in" placeholder="Your LinkedIn URL (optional, only checked for a custom name; not opened)">' +
      '<input type="text" id="rfsdLiHeadline" class="rfsd-in" placeholder="LinkedIn headline (the line under your name)"><textarea id="rfsdLiAbout" class="rfsd-in" rows="4" placeholder="About section"></textarea>' +
      '<textarea id="rfsdLiExp" class="rfsd-in" rows="4" placeholder="Experience (roles and description lines)"></textarea><textarea id="rfsdLiSkills" class="rfsd-in" rows="2" placeholder="Skills (comma separated)"></textarea>' +
      '<div class="rfsd-row"><label><input type="checkbox" id="rfsdLiPhoto"> I have a profile photo</label><label><input type="checkbox" id="rfsdLiBanner"> I have a custom banner</label><label><input type="checkbox" id="rfsdLiOpen"> "Open to work" is on</label></div>' +
      '<button type="button" class="rfsd-btn" id="rfsdLiRun">Analyse my LinkedIn profile</button></div><div id="rfsdLiResult"></div></section>';
    return out;
  }
  function liHtml(r) {
    return '<div class="rfsd-score" style="margin-top:18px"><div><div class="rfsd-big">' + r.score + '<small>/100</small></div><span class="rfsd-band">' + h(r.band) + '</span></div><div class="rfsd-bars">' +
      bar('Headline', r.parts.headline, 20) + bar('About', r.parts.about, 15) + bar('Experience', r.parts.experience, 20) + bar('Skills alignment', r.parts.skills, 15) + bar('Profile completeness', r.parts.completeness, 30) + '</div></div>' +
      '<ul class="rfsd-list">' + r.checklist.map(function (c) { return '<li><span class="' + (c.ok ? 'rfsd-ok' : 'rfsd-no') + '">' + (c.ok ? '✓' : '✗') + '</span> ' + h(c.label) + '</li>'; }).join('') + '</ul>' +
      (r.suggestions.length ? '<h4 style="margin:16px 0 0">What to improve on LinkedIn</h4><ul class="rfsd-list">' + r.suggestions.map(function (s, i) { return '<li><strong>' + (i + 1) + '.</strong> ' + h(s) + '</li>'; }).join('') + '</ul>' : '');
  }
  function ensureHost() {
    var host = doc.getElementById('rfsExtraDiagnostics');
    if (!host) { var anchor = doc.querySelector('.disclaimer-banner') || doc.getElementById('domainSuitabilityCard'); if (!anchor || !anchor.parentNode) return null;
      host = doc.createElement('div'); host.id = 'rfsExtraDiagnostics'; anchor.parentNode.insertBefore(host, anchor.classList && anchor.classList.contains('disclaimer-banner') ? anchor : anchor.nextSibling); }
    if (!doc.getElementById('rfsd-css')) { var st = doc.createElement('style'); st.id = 'rfsd-css'; st.textContent = CSS; doc.head.appendChild(st); }
    host.className = 'rfsd-wrap'; return host;
  }
  var lastFile = null, last = { rep: null, text: '' };
  function wireLinkedIn() {
    var g = function (id) { return doc.getElementById(id); };
    var f = g('rfsdLiFile');
    if (f) f.addEventListener('change', async function () {
      var file = f.files && f.files[0]; if (!file || !root.pdfjsLib) return;
      try {
        var pdf = await root.pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise, t = '';
        for (var p = 1; p <= pdf.numPages; p++) { var pg = await pdf.getPage(p), tc = await pg.getTextContent(); t += pageText(tc.items, pg.view[2] - pg.view[0]) + '\n'; }
        var li = parseLinkedInPdfText(t);
        g('rfsdLiHeadline').value = li.headline; g('rfsdLiAbout').value = li.about; g('rfsdLiExp').value = li.experience; g('rfsdLiSkills').value = li.skills;
        if (li.slug && !g('rfsdLiUrl').value) g('rfsdLiUrl').value = 'linkedin.com/in/' + li.slug;
        f.dataset.fromPdf = '1'; f.dataset.education = li.education ? '1' : '';
      } catch (e) { g('rfsdLiResult').innerHTML = '<p class="rfsd-note">This PDF could not be read. Please paste your sections instead.</p>'; }
    });
    var run = g('rfsdLiRun');
    if (run) run.addEventListener('click', function () {
      var li = { headline: g('rfsdLiHeadline').value.trim(), about: g('rfsdLiAbout').value.trim(), experience: g('rfsdLiExp').value.trim(), skills: g('rfsdLiSkills').value.trim(),
        fromPdf: !!(f && f.dataset.fromPdf), education: f && f.dataset.education ? 'yes' : '' };
      if (!li.headline && !li.about && !li.experience) { g('rfsdLiResult').innerHTML = '<p class="rfsd-note">Upload your LinkedIn PDF or paste at least your headline, About and experience.</p>'; return; }
      var r = scoreLinkedIn(li, last.rep, { url: g('rfsdLiUrl').value, photo: g('rfsdLiPhoto').checked, banner: g('rfsdLiBanner').checked, openToWork: g('rfsdLiOpen').checked });
      g('rfsdLiResult').innerHTML = liHtml(r);
    });
  }
  async function run(rep, resumeText) {
    if (!doc) return;
    last = { rep: rep, text: resumeText || '' };
    var tc = textChecks(resumeText || ''), host = ensureHost(); if (!host) return;
    var badges = (rep && rep.badges) || [];
    host.innerHTML = buildHtml({ ats: atsScore(null, tc, rep), badges: badges }); wireLinkedIn();
    if (lastFile) {
      var fi = await analyseFile(lastFile);
      var keep = ['rfsdLiHeadline', 'rfsdLiAbout', 'rfsdLiExp', 'rfsdLiSkills', 'rfsdLiUrl'].map(function (id) { var el = doc.getElementById(id); return el ? el.value : ''; });
      host.innerHTML = buildHtml({ ats: atsScore(fi, tc, rep), badges: badges }); wireLinkedIn();
      ['rfsdLiHeadline', 'rfsdLiAbout', 'rfsdLiExp', 'rfsdLiSkills', 'rfsdLiUrl'].forEach(function (id, i) { var el = doc.getElementById(id); if (el) el.value = keep[i]; });
    }
  }
  if (doc) {   // remember the resume file the user picks (input or drag-and-drop) so layout checks can read it locally
    doc.addEventListener('change', function (e) { var t = e.target; if (t && t.id === 'fileInput' && t.files && t.files[0]) lastFile = t.files[0]; }, true);
    doc.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (!f || !/\.(pdf|docx?)$/i.test(f.name)) return;
      for (var n = e.target, i = 0; n && i < 8; n = n.parentNode, i++) { if (n.querySelector && n.querySelector('#jdFileInput') && !n.querySelector('#fileInput')) return; if (n.querySelector && n.querySelector('#fileInput')) { lastFile = f; return; } }
    }, true);
  }
  root.RFSDiagnostics = { VERSION: VERSION, pageText: pageText, findGutter: findGutter, unzip: unzip, analyseFile: analyseFile, textChecks: textChecks, atsScore: atsScore,
    parseLinkedInPdfText: parseLinkedInPdfText, scoreLinkedIn: scoreLinkedIn, buildHtml: buildHtml, liHtml: liHtml, run: run, COMMON_MISTAKES: COMMON_MISTAKES, FONT_GUIDE: FONT_GUIDE,
    _setFile: function (f) { lastFile = f; } };
  if (typeof module === 'object' && module.exports) module.exports = root.RFSDiagnostics;
})(typeof self !== 'undefined' ? self : typeof globalThis !== 'undefined' ? globalThis : this);
