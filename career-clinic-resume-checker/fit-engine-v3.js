/* My Career Company · Resume Fit Score™ Engine v3 (RFS-3.0.0)
 * Drop-in replacement for the scoring, fixes, rewrites and domain logic in career-clinic-resume-checker/script.js.
 * 100% client-side, dependency-free, deterministic (same resume + JD → same output). No resume text leaves the browser.
 *
 * Browser:  <script src="data/rfs-v3-content.js"></script> <script src="data/rfs-v3-companies.js"></script>
 *           <script src="data/rfs-v3-schools.js"></script> <script src="fit-engine-v3.js"></script>
 *           RFSv3.init(jdLibraryArray);  // the 112 records from jd_library_v2.json, once on page load
 *           var report = RFSv3.analyse({ resumeText, pageCount, profile:{status, institution}, jd:{ mode:'library', jdId:'MKT-CAMPUS' } });
 * Node:     var RFSv3 = require('./fit-engine-v3.js'); RFSv3.init(require('./jd_library_v2.json'));
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./data/rfs-v3-content.js'), require('./data/rfs-v3-companies.js'), require('./data/rfs-v3-schools.js'));
  } else {
    root.RFSv3 = factory(root.RFS_CONTENT, root.RFS_COMPANIES, root.RFS_SCHOOLS);
  }
})(this, function (C, COMPANIES, SCHOOLS) {
  'use strict';
  var VERSION = 'RFS-3.2.0';
  var DCODES = Object.keys(C.DOMAINS);
  var LEVEL_ORDER = ['CAMPUS', 'EARLY', 'MID', 'SENIOR'];

  /* ============================================================ 0. Small utilities */
  function clip(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function sat(x, half) { return x <= 0 ? 0 : x / (x + half); }
  function round(x, d) { var p = Math.pow(10, d || 0); return Math.round(x * p) / p; }
  function uniq(a) { var s = {}, o = []; a.forEach(function (x) { if (!s[x]) { s[x] = 1; o.push(x); } }); return o; }
  function words(s) { return (s || '').split(/\s+/).filter(Boolean); }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'); }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function trimQuote(s, n) { s = (s || '').trim(); n = n || 140; return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; }
  function levelFromMonths(m) { return m < 24 ? 'CAMPUS' : m < 60 ? 'EARLY' : m < 120 ? 'MID' : 'SENIOR'; }
  function familyOf(d) { return (C.DOMAINS[d] || {}).f || 'general'; }
  function domName(d) { return (C.DOMAINS[d] || {}).n || d; }

  /* Canonical form used for ALL matching (applied identically to resume text, JD text and lexicon terms), so British and
   * American spellings, curly quotes and dash variants never cause misses. Display always uses the original text. */
  function canon(s) {
    s = (s || '').toLowerCase()
      .replace(/[\u2018\u2019\u02bc\u0060]/g, "'").replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2010-\u2015\u2212]/g, '-').replace(/[\u00a0\u2007\u202f]/g, ' ')
      .replace(/[éè]/g, 'e').replace(/\s+/g, ' ');
    return s
      .replace(/([a-z]{2,})is(e|es|ed|ing|ation|ations|er|ers)\b/g, '$1iz$2')
      .replace(/([a-z])ys(e|es|ed|ing)\b/g, '$1yz$2')
      .replace(/(behavi|lab|col|fav|hon|harb|neighb|hum)our/g, '$1or')
      .replace(/programme/g, 'program').replace(/modell/g, 'model').replace(/centre\b/g, 'center')
      .replace(/catalogue/g, 'catalog').replace(/fulfilment/g, 'fulfillment').replace(/travell/g, 'travel')
      .replace(/licence/g, 'license').replace(/defence/g, 'defense').replace(/judgement/g, 'judgment');
  }

  /* Phrase compiler: '*' stem wildcard, '~' up-to-3-word gap, '(a|b)' alternatives, hyphen/space/slash tolerant. */
  var _reCache = {};
  function compilePhrase(variant) {
    var key = variant;
    if (_reCache[key]) return _reCache[key];
    var v = canon(variant).trim();
    var parts = v.split(/(\([^)]*\)\??)/);
    var body = parts.map(function (p) {
      if (!p) return '';
      if (/^\(.*\)\??$/.test(p)) {
        var opt = /\?$/.test(p), inner = p.replace(/^\(|\)\??$/g, '');
        return '(?:' + inner.split('|').map(function (x) { return esc(x.trim()).replace(/ /g, '\\s+'); }).join('|') + ')' + (opt ? '?' : '');
      }
      return p.split('~').map(function (seg) {
        return words(seg).map(function (w) {
          return esc(w).replace(/-/g, '[\\s-]?').replace(/\\\*/g, '[a-z0-9]*');
        }).join('[\\s/-]+');
      }).join('(?:[\\s,/-]+[^\\s]+){0,3}[\\s,/-]+');
    }).join('').replace(/^\[\\s\/-\]\+|\[\\s\/-\]\+$/g, '');
    var pre = /^[a-z0-9]/.test(v) ? '(?:^|[^a-z0-9&])' : '';
    var re = new RegExp(pre + body + '(?![a-z0-9])');
    _reCache[key] = re;
    return re;
  }
  function anyMatch(text, variants) { for (var i = 0; i < variants.length; i++) { if (compilePhrase(variants[i]).test(text)) return true; } return false; }

  /* ============================================================ 1. Lexicon index built from the JD Library (single source of truth) */
  var IDX = null;
  function splitLibTerm(t) {
    var s = String(t || '').replace(/a\/b/gi, 'a~b').replace(/\(e\.g\.[^)]*\)/gi, '');
    var keep = [];
    s = s.replace(/\(([^)]*)\)/g, function (_, inner) {
      var parts = inner.split(/,|;|\bor\b/);
      if (/[A-Z]{2,}/.test(inner) && parts.every(function (p) { return words(p).length <= 2; })) keep = keep.concat(parts);
      return '';
    });
    var out = s.split(/\s+or\s+|;|,|\s\/\s/).concat(keep).map(function (x) {
      var o = x.replace(/a~b/g, 'A/B').replace(/\b(basics|fundamentals)$/i, '').replace(/[.\s]+$/, '').trim();
      var l = o.toLowerCase(); if (l && !DISPLAY[l]) DISPLAY[l] = o.charAt(0).toUpperCase() === o.charAt(0) && o.length > 1 ? o : o.charAt(0).toUpperCase() + o.slice(1);
      return l;
    });
    return out.filter(function (x) { return x && x.length > 1 && !/^(e\.?g|etc)$/.test(x); });
  }
  var DISPLAY = {};
  var ACRO = /\b(it|hr|hrm|m&a|pmi|pmo|imo|tsa|erp|sap|crm|sql|kpi|okr|gtm|cma|npa|esg|ghg|brsr|gri|tcfd|fp&a|p&l|dcf|lbo|ecm|dcm|ipo|roi|roas|cac|ltv|seo|sem|ga4|sdlc|uat|brd|prd|rca|kam|b2b|d2c|nps|csat|nrr|otif|s&op|abm|asm)\b/g;
  function disp(t) { if (DISPLAY[t]) return DISPLAY[t]; var x = String(t || '').replace(ACRO, function (m) { return m.toUpperCase(); }); return x.charAt(0).toUpperCase() + x.slice(1); }
  function variantsFor(term) {
    var syn = C.SYN[term] || [];
    return uniq([term].concat(syn));
  }
  function init(library) {
    if (!library || !library.length) throw new Error('RFSv3.init needs the JD Library array (jd_library_v2.json)');
    var dom = {}, generic = {};
    C.LEVEL_GENERIC_TERMS.forEach(function (t) { generic[t] = 1; });
    DCODES.forEach(function (d) { dom[d] = { terms: {}, titles: {}, rec: {} }; });
    library.forEach(function (r) {
      var D = dom[r.domainCode]; if (!D) return;
      D.rec[r.levelCode] = r;
      function add(list, w) {
        (list || []).forEach(function (t) {
          splitLibTerm(t).forEach(function (x) { if (!generic[x]) D.terms[x] = Math.max(D.terms[x] || 0, w); });
        });
      }
      add(r.mustHave, 3); add(r.atsKeywords, 1.5); add(r.skills && r.skills.technical, 1.2); add(r.tools, 1);
      (r.titles || []).forEach(function (t) { splitLibTerm(t).forEach(function (x) { D.titles[x] = 1; }); });
    });
    C.SUBAREAS.forEach(function (sa) { sa.terms.forEach(function (t) { if (dom[sa.d] && !dom[sa.d].terms[t]) dom[sa.d].terms[t] = 1.2; }); });
    // document frequency across the 28 domains → IDF (generic terms like Excel/CRM get ~0 weight in domain detection)
    var df = {};
    DCODES.forEach(function (d) { Object.keys(dom[d].terms).forEach(function (t) { df[t] = (df[t] || 0) + 1; }); });
    var idf = {}; Object.keys(df).forEach(function (t) { idf[t] = Math.max(0.1, Math.log(DCODES.length / df[t])); });
    DCODES.forEach(function (d) {
      var tw = Object.keys(dom[d].terms).map(function (t) { return dom[d].terms[t] * idf[t]; }).sort(function (a, b) { return b - a; });
      dom[d].norm = tw.slice(0, 10).reduce(function (a, b) { return a + b; }, 0) || 1;
      var amb = {}; C.AMBIGUOUS_TITLES.forEach(function (a) { amb[a] = 1; });
      dom[d].strongTitles = uniq((C.TITLES[d] || []).concat(Object.keys(dom[d].titles).filter(function (t) {
        var nDom = DCODES.filter(function (o) { return o !== d && (o in dom) && dom[o].titles[t]; }).length;
        return !amb[t] && nDom === 0 && words(t).length >= 2;
      })));
    });
    var allTerms = uniq([].concat.apply([], DCODES.map(function (d) { return Object.keys(dom[d].terms); })).concat(Object.keys(C.SYN)));
    var companies = COMPANIES.map(function (c) {
      return { c: c, res: c.a.map(function (a) {
        return c.cs ? new RegExp('(?:^|[^A-Za-z0-9])' + esc(a) + '(?![A-Za-z0-9])') : new RegExp('(?:^|[^a-z0-9])' + esc(a.toLowerCase()) + '(?![a-z0-9])');
      }), len: Math.max.apply(null, c.a.map(function (a) { return a.length; })) };
    });
    var schools = SCHOOLS.map(function (s) {
      return { s: s, res: s.a.filter(function (a) { return a.length >= 4; }).map(function (a) { return new RegExp('(?:^|[^a-z0-9])' + esc(canon(a)) + '(?![a-z0-9])'); }) };
    });
    IDX = { dom: dom, idf: idf, df: df, allTerms: allTerms, library: library, companies: companies, schools: schools };
    return IDX;
  }
  function need() { if (!IDX) throw new Error('Call RFSv3.init(jdLibrary) first'); return IDX; }
  function termHit(text, term) { return anyMatch(text, variantsFor(term)); }
  function domainLexScore(text, d) {
    // IDF-weighted share of a domain's top terms present in the text (0..1). Ignores generic level terms.
    var D = IDX.dom[d], s = 0, hits = [];
    Object.keys(D.terms).forEach(function (t) {
      if (termHit(text, t)) { s += D.terms[t] * IDX.idf[t]; hits.push(t); }
    });
    return { s: clip(s / D.norm, 0, 1), hits: hits };
  }

  /* ============================================================ 1b. Text repair (PDF extraction artefacts) */
  // PDF.js often splits one word into several text items, so a resume arrives as "M anaged", "202 4", "Level I I", "50 +".
  // Without repair, verbs and dates are missed: bullets look verb-less (→ bad rewrites) and roles are not found (→ wrong level).
  var KNOWN = null;
  function knownWords() {
    if (KNOWN) return KNOWN;
    KNOWN = {};
    C.STRONG_VERBS.concat(C.NEUTRAL_VERBS, ['assisted', 'achieved', 'analysed', 'analyzed', 'implemented', 'improved', 'identified', 'initiated', 'increased', 'introduced',
      'automated', 'awarded', 'appointed', 'audited', 'advised', 'aligned', 'interviewed', 'involved', 'acquired', 'authored', 'issued', 'activated', 'architected', 'and', 'across', 'internship'])
      .forEach(function (w) { KNOWN[w.toLowerCase()] = 1; });
    return KNOWN;
  }
  function repairText(t) {
    var K = knownWords();
    return String(t || '')
      .replace(/\u00ad/g, '')                                                     // soft hyphens
      .replace(/(^|[^A-Za-z])([B-HJ-Z]) ([a-z]{2,})\b/g, '$1$2$3')              // "M anaged" → "Managed" (A and I are real words, handled below)
      .replace(/(^|[^A-Za-z])([AI]) ([a-z]{3,})\b/g, function (m, p, a, b) { return K[(a + b).toLowerCase()] ? p + a + b : m; })
      .replace(/\b((?:19|20)\d) (\d)\b/g, '$1$2')                               // "202 4" → "2024"
      .replace(/\b(19|20) (\d{2})\b/g, '$1$2')                                   // "20 24" → "2024"
      .replace(/\b(Level|LEVEL|level|Series|Part)\s+(I|V)\s+(I|V)(?:\s+(I))?\b/g, function (m, l, a, b, c2) { return l + ' ' + a + b + (c2 || ''); })  // "Level I I" → "Level II"
      .replace(/(\d) \+(?=\s|$|[^\d])/g, '$1+')                                 // "50 +" → "50+"
      .replace(/(\d) %/g, '$1%')
      .replace(/\b([A-Z]) ?& ?([A-Z])\b/g, '$1&$2')                               // "M & A" → "M&A", "P & L" → "P&L"
      .replace(/[ \t]+([,;:!?)])/g, '$1').replace(/\( +/g, '(')                  // stray spaces before punctuation
      .replace(/[ \t]{2,}/g, ' ');
  }

  /* ============================================================ 1c. Job-link parser (client-side; the JD page itself cannot be fetched by the browser) */
  function titleCaseIfLower(tokens) {
    var allLower = tokens.join(' ') === tokens.join(' ').toLowerCase();
    return !allLower ? tokens : tokens.map(function (w) { return /^(it|hr|m&a|pmi|fp&a|cfo|ceo|coo|vp|avp|b2b|d2c|ai|ml|sap|erp|crm|esg|gtm|kam|sme|msme|bfsi|fmcg|apm|ecm|dcm|ipo|nbfc|hrbp|abm|asm|rsm|kpo|bpo|gcc|saas|ux|ui|sql|ca|cfa|frm)$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1); });
  }
  function parseJobUrl(url) {
    var out = { url: url, host: '', company: null, designation: '', fn: '', location: '', department: '', experience: '', title: '', display: '', slugOnly: true };
    if (!url) return out;
    var u = String(url).trim(), host = '', path = u;
    var m = /^https?:\/\/([^/?#]+)([^?#]*)/i.exec(u);
    if (m) { host = m[1].toLowerCase().replace(/^www\./, ''); path = m[2]; }
    out.host = host;
    try { path = decodeURIComponent(path); } catch (e) { /* keep raw */ }
    var rawSegs = path.split('/').filter(Boolean);
    var segs = rawSegs.filter(function (x) { return !/^(jobs?|j|job-listings?|job-details?|view|posting|careers?|position|detail|details|apply|v|en|in|en-in|en_us|opening|openings|vacancy|search)$/i.test(x) && !/^\d+$/.test(x)
      && !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(x) && !/^[0-9a-z]{16,}$/i.test(x) || (/[a-z]-[a-z]/i.test(x) && x.length > 20 && /[aeiou]/i.test(x) && !/^[0-9a-f-]+$/i.test(x)); });
    // ATS-hosted links (lever, greenhouse, ashby, …) carry the employer as the first path segment
    if (/(^|\.)(lever|greenhouse|ashbyhq|workable|smartrecruiters|recruitee|freshteam)\./.test(host) && rawSegs[0]) out.company = rawSegs[0].charAt(0).toUpperCase() + rawSegs[0].slice(1);
    segs = segs.filter(function (x) { return !(out.company && x.toLowerCase() === out.company.toLowerCase()); });
    var seg = segs.sort(function (a, b) { return b.length - a.length; })[0] || '';
    var toks = seg.split(/[-_+]+/).filter(Boolean).filter(function (t) { return !/^\d{5,}$/.test(t) && !/^[0-9a-f]{12,}$/i.test(t); });
    while (toks.length && /^(job|jobs|listings?|listing|details?|opening|vacancy|careers?)$/i.test(toks[0])) toks.shift();
    // experience like "0-2-years" (job-board slugs)
    var tj = toks.join(' ').toLowerCase(), ex = /\b(\d{1,2}) (\d{1,2}) (years?|yrs?)\b/.exec(tj);
    if (ex) { out.experience = ex[1] + '–' + ex[2] + ' years'; toks = toks.filter(function (t, i) { return !(/^\d{1,2}$/.test(t) || /^(years?|yrs?)$/i.test(t)); }); }
    // company from host (career sites) or from slug tokens (job boards)
    var boards = C.JOB_BOARDS.test('.' + host);
    if (host && !boards) { var lab = host.split('.'); var core = lab.length > 2 ? lab[lab.length - 2] : lab[0]; var co = matchCompany(core); out.company = co ? co.n : core.charAt(0).toUpperCase() + core.slice(1); }
    var lowerToks = toks.map(function (t) { return t.toLowerCase(); });
    // split around cities (Deloitte-style: City-Title-City-Department; job boards: title-company-city)
    var cityAt = [];
    for (var i = 0; i < lowerToks.length; i++) {
      for (var c = 0; c < C.CITIES.length; c++) {
        var cw = C.CITIES[c].split(' ');
        if (lowerToks.slice(i, i + cw.length).join(' ') === C.CITIES[c]) { cityAt.push([i, cw.length]); i += cw.length - 1; break; }
      }
    }
    var titleToks = toks, deptToks = [];
    if (cityAt.length) {
      out.location = titleCaseIfLower(toks.slice(cityAt[0][0], cityAt[0][0] + cityAt[0][1])).join(' ');
      if (cityAt[0][0] === 0 && cityAt.length > 1) { titleToks = toks.slice(cityAt[0][1], cityAt[1][0]); deptToks = toks.slice(cityAt[1][0] + cityAt[1][1]); }
      else if (cityAt[0][0] === 0) { titleToks = toks.slice(cityAt[0][1]); }
      else { titleToks = toks.slice(0, cityAt[0][0]); deptToks = toks.slice(cityAt[0][0] + cityAt[0][1]); }
    }
    // job-board slugs often put the company before the city: strip a recognised company from the end of the title
    if (boards && titleToks.length > 2) {
      for (var k = 1; k <= Math.min(4, titleToks.length - 2); k++) {
        var tail = titleToks.slice(titleToks.length - k).join(' ').toLowerCase(), hit = null;
        IDX.companies.some(function (o) { if (o.c.a.some(function (a) { return a.toLowerCase() === tail; })) { hit = o.c; return true; } return false; });
        if (hit) { out.company = hit.n; titleToks = titleToks.slice(0, titleToks.length - k); break; }
      }
    }
    // designation = up to the last title head word ("Deputy Manager"); the rest is the function ("IT M&A")
    var lt = titleToks.map(function (t) { return t.toLowerCase(); }), headAt = -1;
    lt.forEach(function (t, i) { if (C.TITLE_HEADS.indexOf(t) >= 0 && i <= 4) headAt = i; });
    var desig = headAt >= 0 ? titleToks.slice(0, headAt + 1) : titleToks, fn = headAt >= 0 ? titleToks.slice(headAt + 1) : [];
    out.designation = titleCaseIfLower(desig).join(' ');
    out.fn = titleCaseIfLower(fn).join(' ');
    var dept = titleCaseIfLower(deptToks);
    if (dept.length > 1 && /&/.test(dept[0]) && /^[A-Z][a-z]/.test(dept[1])) { dept = [dept[0] + '-' + dept[1]].concat(dept.slice(2)); }   // "M&A-Deal Transformation"
    out.department = dept.join(' ');
    out.title = [out.designation, out.fn].filter(Boolean).join(' ');
    out.display = (out.designation || out.fn) ? [out.designation, out.fn, boards || /lever|greenhouse|ashby/.test(host) ? out.company : '', out.location, out.department].filter(Boolean).join(' | ') : ''
    out.display = out.display
      || (out.company ? 'Job posting at ' + out.company : host ? 'Job posting at ' + host : 'Target job link');
    out.readable = !!(out.designation || out.fn);
    if (out.experience) out.display += ' | ' + out.experience;
    out.detectText = [out.title, out.fn, out.department, out.experience, out.company || ''].join(' \n ');
    return out;
  }

  /* ============================================================ 2. Resume parsing */
  var GLYPH = /^\s*(?:[•▪●◦■□➢➤►▸✓✔❖◆○∙·♦\u2022\u25aa\u25cf\uf0b7\uf0a7\uf0d8*>]|[-–—](?=\s)|\(?\d{1,2}[.)](?=\s)|\(?[a-h][.)](?=\s))\s*/i;
  var HEADINGS = [
    ['education', /^(education(al)?( qualifications?| background| details)?|academic (qualifications?|background|details|profile|credentials|record)|academics|scholastic profile|qualifications?)$/],
    ['internship', /^((summer|corporate|winter|industrial|management) )?(internships?|training)( experience| projects?)?$|^(sip|summer internship project|internship & live projects)$/],
    ['experience', /^((work|professional|relevant|industry|corporate|full-? ?time|pre-mba|post-mba) )?(experience|employment( history)?|work history|career (history|summary))$|^work experience$/],
    ['projects', /^((academic|key|live|major|selected|consulting|capstone|industry|other) )?(projects?|capstones?)( undertaken)?$/],
    ['por', /^(positions? of responsibilit(y|ies)|por|leadership( roles?| experience| (and|&) responsibilities)?|responsibilities held|positions held)$/],
    ['achievements', /^((scholastic|academic|key|professional|other|notable) )?(achievements?|accomplishments|honors?( (and|&) awards)?|awards( (and|&) (recognitions?|achievements|honors))?|recognitions?|accolades)( (and|&) (awards|honors|certifications))?$/],
    ['extracurricular', /^(extra-? ?curricular( activities| achievements)?|co-? ?curricular( activities)?|activities|volunteering|social (work|initiatives)|sports( (and|&) culturals?)?)$/],
    ['skills', /^((technical|key|core|it|computer|software|professional|functional) )?(skills?|competenc(y|ies)|proficienc(y|ies)|tools|skill set)( (and|&) (tools|certifications|interests|competencies|expertise))?$|^areas of expertise$|^(key )?expertise$/],
    ['certifications', /^(certifications?|certificates?|licen[cs]es?( (and|&) certifications)?|courses?( (and|&) certifications)?|professional (certifications|courses|development|qualifications?|credentials)|online courses|credentials|(technical|other) qualifications|certifications? (and|&) (trainings?|courses|awards|achievements)|trainings? (and|&) certifications?)$/],
    ['summary', /^((professional|career|executive) )?(summary|profile|objective|about me|snapshot)$/],
    ['interests', /^(interests?|hobbies( (and|&) interests)?|personal (details|information|profile)|languages?)$/]
  ];
  var CONTENT = { experience: 1, internship: 1, projects: 1, por: 1, achievements: 1, extracurricular: 1 };
  var MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
  var DT = "(?:(jan|feb|mar|apr|may|jun|jul|aug|sept|sep|oct|nov|dec)[a-z]*\\.?[\\s'’,-]*((?:19|20)\\d{2}|\\d{2})|(\\d{1,2})[/.-]((?:19|20)\\d{2}|\\d{2})|((?:19|20)\\d{2}))";
  var RANGE_RE = new RegExp(DT + "\\s*(?:-|–|—|to|till|until)\\s*(?:" + DT + "|(present|current|now|till date|to date|date|ongoing))", 'i');
  var SINGLE_DATE_RE = new RegExp("\\b(jan|feb|mar|apr|may|jun|jul|aug|sept|sep|oct|nov|dec)[a-z]*\\.?[\\s'’,-]*((?:19|20)\\d{2}|\\d{2})\\b", 'i');
  function ym(mon, yr, mm, yr2, yOnly) {
    if (mon) { var y = +yr; if (y < 100) y += 2000; return y * 12 + MON[mon.toLowerCase().slice(0, 4) === 'sept' ? 'sept' : mon.toLowerCase().slice(0, 3)]; }
    if (mm) { var y2 = +yr2; if (y2 < 100) y2 += 2000; return y2 * 12 + (clip(+mm, 1, 12) - 1); }
    if (yOnly) return (+yOnly) * 12 + 5;
    return null;
  }
  function parseRange(line, todayYM) {
    var m = RANGE_RE.exec(line); if (!m) return null;
    var a = ym(m[1], m[2], m[3], m[4], m[5]);
    var b = m[11] ? todayYM : ym(m[6], m[7], m[8], m[9], m[10]);
    if (a == null || b == null || b < a) return null;
    var months = b - a + 1;
    if (m[5] && m[10] && !m[1] && !m[6]) months = Math.max(1, (+m[10] - +m[5]) * 12);  // year-only ranges
    return { start: a, end: b, months: clip(months, 1, 480), text: m[0] };
  }
  function durationMonths(line) {
    var m = /\b(\d{1,2})\s*(months?|mos?)\b/i.exec(line); if (m) return +m[1];
    var w = /\b(\d{1,2})\s*weeks?\b/i.exec(line); if (w) return Math.max(1, Math.round(+w[1] / 4.3));
    return 0;
  }
  function headingOf(line) {
    var raw = line.replace(GLYPH, '').replace(/[:|]+\s*$/, '').trim();
    if (!raw || raw.length > 60 || words(raw).length > 6) return null;
    var c = canon(raw).replace(/[^a-z&\- ]/g, ' ').replace(/\s+/g, ' ').trim();
    for (var i = 0; i < HEADINGS.length; i++) if (HEADINGS[i][1].test(c)) return HEADINGS[i][0];
    return null;
  }
  function inlineHeading(line) {
    var m = /^\s*([A-Za-z &\-]{3,40})\s*[:\-–]\s+(.{3,})$/.exec(line);
    if (!m) return null;
    var h = headingOf(m[1]);
    return h && (h === 'skills' || h === 'certifications' || h === 'interests' || h === 'summary') ? { h: h, rest: m[2] } : null;
  }
  function matchCompany(line) {
    var best = null, lc = canon(line);
    IDX.companies.forEach(function (o) {
      for (var i = 0; i < o.res.length; i++) {
        if (o.res[i].test(o.c.cs ? line : lc)) { var L = o.c.a[i].length; if (!best || L > best.len) best = { c: o.c, len: L }; }
      }
    });
    return best && best.c;
  }
  function looksLikeRoleHeader(line, inRoleSection) {
    if (GLYPH.test(line)) return false;
    var w = words(line).length;
    if (RANGE_RE.test(line) && w <= 18) return true;
    if (SINGLE_DATE_RE.test(line) && w <= 12 && /\b(intern|internship|summer|trainee|analyst|associate|manager|executive|engineer|consultant|officer)\b/i.test(line)) return true;
    if (inRoleSection && w <= 12 && !/[.;]$/.test(line.trim()) && /\s[|–—-]\s|,\s/.test(line) && matchCompany(line)) return true;
    return false;
  }

  function parseResume(text, opts) {
    need(); opts = opts || {};
    var today = opts.today || new Date(); var todayYM = today.getFullYear() * 12 + today.getMonth();
    var raw = repairText(String(text || '').replace(/\r/g, '').replace(/\t/g, '  '));
    var lines = raw.split('\n').map(function (l) { return l.replace(/\s+$/, ''); });
    var R = { raw: raw, canon: canon(raw), lines: [], sections: {}, bullets: [], roles: [], headers: [] };
    var section = 'header', glyphCount = 0, contentLines = 0;
    lines.forEach(function (l) { if (l.trim() && GLYPH.test(l)) glyphCount++; if (l.trim()) contentLines++; });
    var glyphDoc = contentLines > 0 && glyphCount / contentLines >= 0.25;
    var cur = null, role = null, prevHeaderLine = null;
    function pushSection(s, l) { (R.sections[s] = R.sections[s] || []).push(l); }
    lines.forEach(function (l0) {
      var l = l0.trim(); if (!l) { cur = null; return; }
      var h = headingOf(l);
      if (h) { section = h; cur = null; role = null; R.headers.push(h); return; }
      var ih = inlineHeading(l);
      if (ih && !CONTENT[section]) { pushSection(ih.h, ih.rest); return; }
      pushSection(section, l);
      if (!CONTENT[section]) { cur = null; return; }
      var isRoleSec = section === 'experience' || section === 'internship';
      if (looksLikeRoleHeader(l, isRoleSec)) {
        var rg = parseRange(l, todayYM);
        // two-line headers (Company line, then Title | Dates line) merge into one role
        if (role && role.bullets.length === 0 && !role.range && rg) { role.header += ' | ' + l; role.range = rg; }
        else {
          role = { header: l, range: rg, section: section, bullets: [], company: null };
          R.roles.push(role);
        }
        cur = null; prevHeaderLine = l; return;
      }
      var hasGlyph = GLYPH.test(l0);
      var body = l.replace(GLYPH, '').trim();
      var startsNew = hasGlyph || !cur || (!glyphDoc && /^[A-Z0-9₹$(]/.test(body) && /[.;!?)]$|\d$|[a-z]$/.test(cur.text) && !/^(and|with|by|to|for|in|of|across|resulting|leading|while|through|using|&)\b/i.test(body));
      if (!startsNew || (glyphDoc && !hasGlyph && cur && !/^[A-Z][a-z]+ed\b/.test(body))) {
        if (cur) { cur.text += ' ' + body; return; }
      }
      // A non-glyph line in a glyph document right after a role header is usually the job title line.
      if (glyphDoc && !hasGlyph && role && role.bullets.length === 0 && words(body).length <= 8 && isRoleSec) { role.header += ' | ' + body; return; }
      cur = { text: body, section: section, role: isRoleSec ? role : null, glyph: hasGlyph };
      R.bullets.push(cur);
      if (cur.role) cur.role.bullets.push(cur);
    });
    R.bullets = R.bullets.filter(function (b) { return words(b.text).length >= 4; });
    R.bullets.forEach(function (b, i) { b.id = 'B' + (i + 1); b.c = canon(b.text); });
    R.roles.forEach(function (r) { r.bullets = r.bullets.filter(function (b) { return words(b.text).length >= 4; }); });
    // ---- roles: company, title, internship, months
    R.roles.forEach(function (r) {
      r.company = matchCompany(r.header);
      if (r.company) { var hc = canon(r.header); r.companyAlias = r.company.a.slice().sort(function (x, y) { return y.length - x.length; }).filter(function (a) { return new RegExp('(?:^|[^a-z0-9])' + esc(canon(a)) + '(?![a-z0-9])').test(hc); })[0] || null; }
      var hdr = canon(r.header);
      r.isIntern = r.section === 'internship' || /\b(intern|internship|summer|sip|live project|winter project)\b/.test(hdr);
      r.months = r.range ? r.range.months : (durationMonths(r.header) || (r.isIntern ? 2 : 12));
      if (r.isIntern) r.months = Math.min(r.months, 6);
      r.endYM = r.range ? r.range.end : todayYM - 12;
      var t = hdr;
      if (r.company) r.company.a.slice().sort(function (x, y) { return y.length - x.length; }).forEach(function (a) { t = t.replace(canon(a), ' '); });
      if (r.range) t = t.replace(canon(r.range.text), ' ');
      r.titleText = t.replace(/\b(pvt|ltd|limited|private|india|inc|llp)\b\.?/g, ' ').replace(/[|,()–—-]+/g, ' ').replace(/\s+/g, ' ').trim();
    });
    // ---- experience
    var ft = R.roles.filter(function (r) { return !r.isIntern; }).map(function (r) { return [r.endYM - r.months + 1, r.endYM]; }).sort(function (a, b) { return a[0] - b[0]; });
    var merged = [];
    ft.forEach(function (iv) { var last = merged[merged.length - 1]; if (last && iv[0] <= last[1] + 1) last[1] = Math.max(last[1], iv[1]); else merged.push(iv.slice()); });
    R.fullTimeMonths = merged.reduce(function (a, iv) { return a + (iv[1] - iv[0] + 1); }, 0);
    var stated = /(\d{1,2})\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:work |professional |total )?experience/.exec(R.canon);
    if (stated && R.fullTimeMonths < +stated[1] * 12 - 6) R.fullTimeMonths = +stated[1] * 12;
    R.internMonths = R.roles.filter(function (r) { return r.isIntern; }).reduce(function (a, r) { return a + r.months; }, 0);
    R.isStudent = (opts.profile && /student/i.test(opts.profile.status || '')) || /\b(mba|pgdm|pgp|mms)\b[^\n]{0,60}\b(20(2[5-9])|pursuing|ongoing|expected|candidate|class of)\b/.test(R.canon);
    R.userLevel = levelFromMonths(R.fullTimeMonths);
    // ---- education, school, specialisation
    var eduText = canon((R.sections.education || []).join('\n') + '\n' + (R.sections.header || []).slice(0, 8).join('\n'));
    var degText = eduText.replace(/\./g, '');
    R.degrees = {
      mba: /\b(mba|pgdm|pgp|mms|pgdba|epgp|pgpx|post graduate (diploma|program) in (business )?management|master of (business administration|management studies))\b/.test(degText),
      ca: /\b(chartered accountant|ca (final|inter\w*|qualified))\b/.test(degText) || /\bca\b/.test(degText) && /\bicai\b/.test(degText)
    };
    R.ug = []; R.ugLabel = []; C.UG_DEGREE.forEach(function (u, i) { if (u[0].test(degText) || u[0].test(R.canon.replace(/\./g, ''))) { R.ug.push(u[1]); R.ugLabel.push(C.UG_LABEL[i] || 'UG degree'); } });
    R.school = null;
    IDX.schools.forEach(function (o) {
      o.res.forEach(function (re) { if (re.test(eduText) && (!R.school || o.s.t < R.school.t)) R.school = o.s; });
    });
    if (!R.school && opts.profile && opts.profile.institution) {
      var inst = canon(opts.profile.institution);
      IDX.schools.forEach(function (o) { o.res.forEach(function (re) { if (re.test(inst) && !R.school) R.school = o.s; }); });
    }
    R.spec = [];
    var specSrc = [];
    var sm, specRes = [/speciali[sz]ation\s*(?:in|[:\-])?\s*([a-z &,/]+)/g, /\bmajors?\s*(?:in|[:\-])\s*([a-z &,/]+)/g,
      /\b(?:mba|pgdm|pgp|mms|pgdba)\s*(?:\(|-|in\b|,)\s*([a-z &,/]+)\)?/g];
    specRes.forEach(function (re) { while ((sm = re.exec(degText))) specSrc.push(sm[1]); });
    specSrc.forEach(function (s) {
      var parts = s.split(/,|&|\band\b|\//);
      parts.forEach(function (p) {
        p = p.trim(); if (!p) return;
        for (var i = 0; i < C.SPECIALISATION.length; i++) {
          if (new RegExp('\\b' + esc(C.SPECIALISATION[i][0]) + '\\b').test(p)) { R.spec.push(C.SPECIALISATION[i]); break; }
        }
      });
    });
    // ---- certifications, clubs, contact
    R.certIds = []; R.certDom = [];
    C.CERT_SIGNALS.forEach(function (c) { if (c[0].test(R.canon)) { R.certIds.push(c[2]); R.certDom.push(c[1]); } });
    var actText = canon(['por', 'extracurricular', 'achievements', 'projects', 'internship'].map(function (k) { return (R.sections[k] || []).join('\n'); }).join('\n'));
    R.clubDom = []; R.clubLabel = []; C.CLUB_SIGNALS.forEach(function (c) { var cm = c[0].exec(actText); if (cm) { R.clubDom.push(c[1]); R.clubLabel.push(disp(cm[0]).replace(/\b([a-z])/g, function (x) { return x.toUpperCase(); }).replace(/\bHr\b/g, 'HR')); } });
    R.contact = {
      email: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(raw),
      phone: /(?:\+91[\s.-]?|91[\s.-]?|0)?[6-9]\d{4}[\s.-]?\d{5}\b/.test(raw),
      linkedin: /linkedin\.com\/(in|pub)\/[a-z0-9_-]+/i.test(raw) || /\blinkedin\b/i.test(raw)
    };
    R.skillsText = canon((R.sections.skills || []).join('\n') + '\n' + (R.sections.certifications || []).join('\n'));
    R.summaryText = canon((R.sections.summary || []).join('\n') + '\n' + (R.sections.header || []).join('\n'));
    R.wordCount = words(raw).length;
    R.pageCount = opts.pageCount || null;
    R.headline = (R.sections.header || []).slice(0, 4).join(' | ');
    return R;
  }

  /* ============================================================ 3. JD profile (library record or custom text) */
  var JD_HEAD = {
    resp: /^(key )?(responsibilities|duties|what you('|wi)?ll do|what you will do|what will you do|roles? (and|&) responsibilities|the role|about the role|job description|your role|your (work|job) profile|work profile|job profile|role overview|position overview|your responsibilities|engagement delivery|key result areas|kras?|accountabilities|day to day)/,
    req: /^(requirements|qualifications|eligibility|skills( (required|needed|&|and) .*)?|what (we|we're|we are) looking for|who you are|must[- ]haves?|required|(desired|preferred|required|minimum|basic|key) (skills|profile|qualifications?|experience|requirements)|qualifications? (and|&) (experience|skills)|candidate profile|experience|preferred|good to have|nice to have|key skills|you have|you bring|what you('ll| will) bring|you should have|ideal candidate|competencies)/,
    boiler: /^(about (us|the company|the team|[a-z]+ ?[a-z]*)$|who we are|our (story|mission|culture|values)|benefits|perks|what we offer|why (join|us|work)|equal opportunit|eeo|diversity|disclaimer|how to apply|compensation|salary|ctc|life at)/
  };
  function jdZones(text, titleHint) {
    var lines = String(text || '').replace(/\r/g, '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    var Z = { title: '', resp: [], req: [], body: [], prefLines: [], mustLines: [] }, zone = 'body', titleSet = false;
    if (titleHint) { Z.title = titleHint; titleSet = true; }
    lines.forEach(function (l, i) {
      var c = canon(l).replace(GLYPH, '');
      var tm = /^(job title|title|role|position|designation)\s*[:\-–]\s*(.+)$/.exec(c);
      if (tm && !titleSet) { Z.title = l.replace(/^[^:\-–]+[:\-–]\s*/, ''); titleSet = true; return; }
      var short = words(c).length <= 7 && c.length < 70;
      var bare = c.replace(/[:|]+\s*$/, '');
      if (short && JD_HEAD.boiler.test(bare)) { zone = 'boiler'; return; }
      if (short && JD_HEAD.resp.test(bare)) { zone = 'resp'; return; }
      if (short && JD_HEAD.req.test(bare)) { zone = /preferred|good to have|nice to have/.test(bare) ? 'pref' : 'req'; return; }
      if (/equal opportunity employer|we are an equal|apply now|click here/.test(c)) return;
      var metaLine = /^(location|entity|company|date|job requisition( id)?|req(uisition)? id|job id|employment type|work mode|salary|ctc|experience)\s*:{1,2}/.test(c);
      if (!titleSet && i < 3 && !metaLine && words(c.replace(/\|/g, ' ')).length <= (/\|/.test(c) ? 18 : 12) && !/[.]$/.test(c)) { Z.title = l; titleSet = true; return; }
      if (zone === 'boiler') return;
      if (zone === 'pref') { Z.req.push(c); Z.prefLines.push(c); return; }
      if (zone === 'req') { Z.req.push(c); if (/\b(must|required|mandatory|essential|should have|need to have|minimum|at least)\b/.test(c)) Z.mustLines.push(c); if (/\b(preferred|good to have|nice to have|plus|desirable|bonus|advantage)\b/.test(c)) Z.prefLines.push(c); return; }
      if (zone === 'resp') { Z.resp.push(c); return; }
      Z.body.push(c);
      if (/\b(must|required|mandatory|essential)\b/.test(c)) Z.mustLines.push(c);
      if (/\b(preferred|good to have|nice to have|desirable)\b/.test(c)) Z.prefLines.push(c);
    });
    Z.titleC = canon(Z.title);
    Z.respC = Z.resp.join('\n'); Z.reqC = Z.req.join('\n'); Z.bodyC = Z.body.join('\n');
    Z.allC = [Z.titleC, Z.respC, Z.reqC, Z.bodyC].join('\n');
    return Z;
  }
  function titleDomainScore(titleC, d) {
    var D = IDX.dom[d];
    for (var i = 0; i < D.strongTitles.length; i++) if (compilePhrase(D.strongTitles[i]).test(titleC)) return 1;
    var fw = C.TITLE_FUNCTION_WORDS;
    var hybrid = /\b(product analyst|business analyst|research analyst|relationship manager|program manager|account manager|associate consultant)\b/.test(titleC);
    for (var j = 0; j < fw.length; j++) { if (fw[j][1] === d && compilePhrase(fw[j][0]).test(titleC)) { return firstFunctionWord(titleC) === d ? (hybrid ? 0.4 : 0.85) : 0.3; } }
    return 0;
  }
  function firstFunctionWord(titleC) {   // the most specific function word wins ("product marketing" → MKT, not PM)
    var fw = C.TITLE_FUNCTION_WORDS;
    for (var j = 0; j < fw.length; j++) if (compilePhrase(fw[j][0]).test(titleC)) return fw[j][1];
    return null;
  }
  function detectLevelFromJd(allC, titleC) {
    var m = /(\d{1,2})\s*(?:\+|plus)?\s*(?:-|–|to)?\s*(\d{1,2})?\s*\+?\s*(?:years?|yrs?)/.exec(allC);
    var minY = m ? +m[1] : null, maxY = m && m[2] ? +m[2] : null;
    var lvl = null, basis = '';
    if (/\b(intern(ship)?|fresher|freshers|final[- ]year|campus|graduate trainee|management trainee|class of 20\d\d|20(2[6-9]) batch|0\s*-\s*(1|2)\s*years?)\b/.test(allC) && (minY == null || minY <= 1)) { lvl = 'CAMPUS'; basis = 'campus/fresher wording'; }
    if (minY != null && !lvl) { lvl = minY >= 10 ? 'SENIOR' : minY >= 5 ? 'MID' : minY >= 2 ? 'EARLY' : 'CAMPUS'; basis = minY + (maxY ? '–' + maxY : '+') + ' years required'; }
    if (!lvl) {
      if (/\b(chief|head of|head -|vp|vice president|director|cxo|general manager|business head|national head)\b/.test(titleC)) { lvl = 'SENIOR'; basis = 'senior title'; }
      else if (/\b(senior manager|principal|group product manager|regional (sales )?manager|lead)\b/.test(titleC)) { lvl = 'MID'; basis = 'senior-manager title'; }
      else if (/\b(assistant|deputy) manager\b/.test(titleC)) { lvl = 'EARLY'; basis = 'assistant / deputy manager title (typically 2–6 yrs in India)'; }
      else if (/\b(assistant|associate|trainee|analyst|executive|intern|junior|officer|apm)\b/.test(titleC)) { lvl = 'CAMPUS'; basis = 'entry-level title'; }
      else if (/\b(manager|senior|specialist|consultant)\b/.test(titleC)) { lvl = 'EARLY'; basis = 'manager / senior title'; }
      else { lvl = 'CAMPUS'; basis = 'no experience stated (default)'; }
    }
    return { level: lvl, minYears: minY, maxYears: maxY, basis: basis };
  }
  /* detectDomainFromJd v3: zone-weighted, IDF-weighted, title-dictionary driven, boilerplate stripped, function vs industry. */
  function detectSubArea(d, titleC, allC) {
    // sub-areas are listed most-specific first: the first one with a title hit, or 2+ body hits, wins
    for (var i = 0; i < C.SUBAREAS.length; i++) {
      var sa = C.SUBAREAS[i]; if (sa.d !== d) continue;
      var re = new RegExp(sa.re.source, 'g');
      var nt = ((titleC || '').match(re) || []).length, nb = ((allC || '').match(re) || []).length;
      if (nt >= 1 || nb >= 2) return { key: sa.key, label: sa.label };
    }
    return null;
  }
  /* detectDomainFromJdV3: zone-weighted IDF lexicons + title dictionary + context rules + employer prior + sub-area. */
  function detectDomainFromJdV3(text, opts) {
    need(); opts = opts || {};
    var src = repairText(String(text || ''));
    var urlOnly = /^\s*https?:\/\/\S+\s*$/.test(src);
    var link = (opts.url || urlOnly) ? parseJobUrl(opts.url || src.trim()) : null;
    if (urlOnly) src = link.detectText;                       // the browser cannot open the JD page: read the link slug
    var titleHint = opts.title && !/\b[a-z] [a-z] [a-z]\b/i.test(opts.title) ? opts.title : '';   // ignore mangled legacy titles ("It M A")
    var Z = jdZones(src, titleHint || (urlOnly && link && link.title) || '');
    var noZones = !Z.resp.length && !Z.req.length;
    var W = noZones ? { title: 0.40, resp: 0, req: 0, body: 0.60 } : { title: 0.40, resp: 0.30, req: 0.22, body: 0.08 };
    var ctxText = Z.allC + '\n' + (link ? canon(link.detectText) : '');
    // employer prior from the career-site host or an "Entity:/Company:" line (Recruiter Library)
    var employer = null;
    if (link && link.company) employer = matchCompany(link.company);
    if (!employer) { var head = String(text || '').split('\n').slice(0, 15).join(' '); var em = /\b(entity|company|employer|organi[sz]ation)\s*[:\-]\s*([^\n|]{3,60})/i.exec(head); if (em) employer = matchCompany(em[2]); }
    var scores = DCODES.map(function (d) {
      var t = titleDomainScore(Z.titleC, d);
      var tl = domainLexScore(Z.titleC, d).s;
      var r = Z.respC ? domainLexScore(Z.respC, d) : { s: 0, hits: [] };
      var q = Z.reqC ? domainLexScore(Z.reqC, d) : { s: 0, hits: [] };
      var b = Z.bodyC ? domainLexScore(Z.bodyC, d) : { s: 0, hits: [] };
      var title = Math.max(t, 0.6 * tl);
      var s = W.title * title + W.resp * r.s + W.req * q.s + W.body * b.s;
      if (C.DOMAINS[d].t === 'industry' && t === 0) s *= 0.85;
      return { d: d, s: s, title: title, evidence: uniq(r.hits.concat(q.hits, b.hits)).slice(0, 6) };
    });
    var rulesHit = [];
    C.JD_CONTEXT_RULES.forEach(function (rule) {
      if (!rule[0].test(ctxText)) return;
      rulesHit.push(rule[0].source.slice(0, 40));
      scores.forEach(function (x) { if (rule[1][x.d]) x.s = Math.max(0, x.s + rule[1][x.d]); });
    });
    if (employer) scores.forEach(function (x) { x.s += employer.t.indexOf(x.d) >= 0 ? 0.08 : employer.c.indexOf(x.d) >= 0 ? 0.03 : 0; });
    scores.sort(function (a, b) { return b.s - a.s; });
    var top = scores[0], second = scores[1];
    var margin = top.s > 0 ? (top.s - second.s) / top.s : 0;
    var conf = top.s < 0.10 ? 'LOW' : margin >= 0.30 ? 'HIGH' : margin >= 0.12 ? 'MEDIUM' : 'LOW';
    if (conf === 'HIGH' && second.s >= 0.5 * top.s) conf = 'MEDIUM';
    var thin = words(Z.allC).length < 60;
    if (link && urlOnly && !link.readable) { conf = 'LOW'; }
    if (thin && conf === 'HIGH') conf = 'MEDIUM';             // a title alone is never "high confidence"
    var industry = scores.filter(function (x) { return C.DOMAINS[x.d].t === 'industry' && x.d !== top.d && x.s >= 0.25 * top.s && x.s > 0.06; })[0] || null;
    var lv = detectLevelFromJd(Z.allC + (link && link.experience ? '\n' + link.experience.replace('–', '-') : ''), Z.titleC);
    var sub = detectSubArea(top.d, Z.titleC, ctxText);
    return {
      domain: top.d, domainName: domName(top.d), score: round(top.s, 3), confidence: conf,
      secondary: second.s >= 0.5 * top.s ? second.d : null, industry: industry ? industry.d : null, subArea: sub,
      evidence: top.evidence, title: Z.title, displayTitle: (!urlOnly && titleHint) || (link && urlOnly ? link.display : '') || Z.title || (link ? link.display : ''), link: link, employer: employer ? employer.n : null, thin: thin,
      level: lv.level, levelBasis: lv.basis, minYears: lv.minYears, maxYears: lv.maxYears, rules: rulesHit,
      ranking: scores.slice(0, 5).map(function (x) { return { d: x.d, s: round(x.s, 3) }; }), zones: Z,
      askUser: conf === 'LOW'
    };
  }
  var GENERIC_JD_WORDS = { writing: 1, strategy: 1, consulting: 1, operations: 1, sales: 1, marketing: 1, finance: 1, analytics: 1, compliance: 1, reporting: 1,
    communication: 1, leadership: 1, management: 1, content: 1, media: 1, retail: 1, energy: 1, telecom: 1, edtech: 1, healthcare: 1, sustainability: 1, esg: 1 };
  function recordFor(d, level) { var D = IDX.dom[d]; return D.rec[level] || D.rec.CAMPUS || D.rec[Object.keys(D.rec)[0]]; }
  function parseCertList(s) {
    if (!s || /^none/i.test(s)) return [];
    return String(s).split(/;|,(?![^(]*\))/).map(function (x) { return x.replace(/\(.*?\)/g, '').replace(/\bonce\b.*$/i, '').trim(); }).filter(function (x) { return x && !/^none/i.test(x); });
  }
  function buildJdProfile(jd) {
    need(); jd = jd || {};
    var P = { source: jd.mode || 'library', terms: [], tools: [] };
    if ((jd.mode || 'library') === 'library') {
      var rec = jd.record || IDX.library.filter(function (r) { return r.id === jd.jdId; })[0];
      if (!rec) throw new Error('Unknown jdId ' + jd.jdId);
      P.rec = rec; P.id = rec.id; P.domain = rec.domainCode; P.level = rec.levelCode; P.title = rec.titles[0];
      P.titles = rec.titles; P.confidence = 'HIGH'; P.secondary = null; P.industry = rec.domainType === 'industry' ? rec.domainCode : null;
      var seen = {};
      function addT(list, w, kind) { (list || []).forEach(function (t) { splitLibTerm(t).forEach(function (x) { if (!seen[x] && C.LEVEL_GENERIC_TERMS.indexOf(x) < 0) { seen[x] = 1; P.terms.push({ t: x, w: w, kind: kind }); } }); }); }
      addT(rec.mustHave, 3, 'must'); addT(rec.atsKeywords, 1.5, 'keyword'); addT(rec.tools, 1, 'tool');
      P.minMonths = (rec.scoring && rec.scoring.minExperienceMonths) || (rec.experience.minYears || 0) * 12;
      P.maxYears = rec.experience.maxYears; P.freshers = !!rec.experience.freshersEligible;
      P.requiredDegrees = (rec.scoring && rec.scoring.requiredDegrees) || [];
      P.prefSpec = (rec.scoring && rec.scoring.preferredSpecialisations) || [];
      P.certPreferred = parseCertList(rec.certifications.preferred); P.certRequired = parseCertList(rec.certifications.required);
      P.certConditional = rec.certifications.conditional || [];
      P.goodToHave = rec.goodToHave || '';
      P.displayTitle = rec.domain + ' · ' + rec.level + ' benchmark (' + rec.titles.slice(0, 2).join(' / ') + ')'; P.thin = false; P.subArea = null;
      return P;
    }
    // custom JD (URL text or pasted / uploaded)
    var det = detectDomainFromJdV3(jd.text, { title: jd.title, url: jd.url });
    var Z = det.zones;
    P.det = det; P.domain = jd.domainOverride || det.domain; P.level = jd.levelOverride || det.level; P.title = det.title || recordFor(P.domain, P.level).titles[0];
    P.displayTitle = det.displayTitle || P.title; P.thin = det.thin; P.employer = det.employer; P.link = det.link;
    P.subArea = (jd.domainOverride && jd.domainOverride !== det.domain) ? detectSubArea(P.domain, det.zones.titleC, det.zones.allC) : det.subArea;
    P.confidence = det.confidence; P.secondary = det.secondary; P.industry = det.industry; P.askUser = det.askUser && !jd.domainOverride;
    P.rec = recordFor(P.domain, P.level); P.id = 'CUSTOM:' + P.domain + '-' + P.level; P.titles = [P.title].concat(P.rec.titles);
    var found = [];
    IDX.allTerms.forEach(function (t) {
      if (C.LEVEL_GENERIC_TERMS.indexOf(t) >= 0) return;
      if (GENERIC_JD_WORDS[t] && !Z.mustLines.some(function (l) { return termHit(l, t); })) return;   // "strategy", "writing"… from boilerplate are not skills
      var inReq = Z.reqC && termHit(Z.reqC, t), inResp = Z.respC && termHit(Z.respC, t), inBody = Z.bodyC && termHit(Z.bodyC, t), inTitle = termHit(Z.titleC, t);
      if (!(inReq || inResp || inBody || inTitle)) return;
      var must = Z.mustLines.some(function (l) { return termHit(l, t); });
      var pref = !must && Z.prefLines.some(function (l) { return termHit(l, t); });
      found.push({ t: t, kind: must ? 'must' : pref ? 'preferred' : 'keyword', idf: IDX.idf[t] || 1.5, zone: inReq ? 'req' : inResp ? 'resp' : 'body' });
    });
    // drop terms that are just synonyms of a longer found term
    found.sort(function (a, b) { return b.idf - a.idf; });
    var musts = found.filter(function (x) { return x.kind === 'must'; });
    if (musts.length === 0) found.filter(function (x) { return x.zone === 'req'; }).slice(0, 5).forEach(function (x) { x.kind = 'must'; });
    // de-duplicate overlapping terms: (1) a compound term matched only via a generic synonym ("real estate financial modelling"
    // on a consulting JD); (2) a generic term that only occurs inside a longer found term ("accounting" inside "GHG accounting")
    var allJ = Z.allC;
    function occ(t) { var re = compilePhrase(t); return (allJ.match(new RegExp(re.source, 'g')) || []).length; }
    found = found.filter(function (x) {
      var cx = canon(x.t);
      if (words(cx).length >= 2 && !compilePhrase(x.t).test(allJ) && found.some(function (y) { var cy = canon(y.t); return y !== x && cy !== cx && cx.indexOf(cy) >= 0; })) return false;
      var longer = found.filter(function (y) { var cy = canon(y.t); return y !== x && cy !== cx && cy.indexOf(cx) >= 0 && compilePhrase(y.t).test(allJ); });
      if (longer.length && occ(x.t) <= longer.reduce(function (a, y) { return a + occ(y.t); }, 0)) return false;
      return true;
    });
    // keep must-haves first (max 8), then keywords (max 16), then preferred (max 6), each by rarity
    var rank = { must: 0, keyword: 1, preferred: 2 }, caps = { must: 8, keyword: 16, preferred: 6 }, used = { must: 0, keyword: 0, preferred: 0 };
    found.sort(function (a, b) { return (rank[a.kind] - rank[b.kind]) || (b.idf - a.idf); });
    found.forEach(function (x) {
      if (x.kind === 'must' && used.must >= caps.must) x.kind = 'keyword';
      if (used[x.kind] >= caps[x.kind]) return;
      used[x.kind]++;
      P.terms.push({ t: x.t, w: x.kind === 'must' ? 3 : x.kind === 'preferred' ? 0.75 : 1.5, kind: x.kind });
    });
    // sub-area skills (e.g. IT M&A: IT due diligence, PMI, Day 1, IT synergies). On a thin JD (link only / a few lines) the core
    // sub-area skills act as must-haves; on a full JD they are extra keywords unless the JD itself marks them as required.
    if (P.subArea) {
      var pack = C.SUBAREAS.filter(function (x) { return x.key === P.subArea.key; })[0], haveS = {};
      P.terms.forEach(function (x) { haveS[x.t] = 1; });
      pack.terms.forEach(function (t) {
        var coreT = pack.core.indexOf(t) >= 0, inReqZ = Z.reqC && termHit(Z.reqC, t);
        if (haveS[t]) { if (coreT && (P.thin || inReqZ)) P.terms.forEach(function (x) { if (x.t === t) { x.kind = 'must'; x.w = Math.max(x.w, P.thin ? 2.25 : 3); } }); return; }
        var core = pack.core.indexOf(t) >= 0;
        P.terms.push({ t: t, w: P.thin ? (core ? 2.25 : 1.2) : (core ? 1.2 : 0.75), kind: P.thin && core ? 'must' : 'keyword', fromSubArea: true });
      });
    }
    if (P.terms.length < 6 || P.thin) {   // thin JD → blend with the matching library benchmark at reduced weight
      var have = {}; P.terms.forEach(function (x) { have[x.t] = 1; });
      (P.rec.mustHave || []).concat(P.subArea ? [] : (P.rec.atsKeywords || []).slice(0, 8)).forEach(function (t) { splitLibTerm(t).forEach(function (x) { if (!have[x] && C.LEVEL_GENERIC_TERMS.indexOf(x) < 0) { have[x] = 1; P.terms.push({ t: x, w: 0.75, kind: 'keyword', fromLibrary: true }); } }); });
      P.blended = true;
    }
    P.terms = P.terms.slice(0, 32);
    var minY = det.minYears; P.minMonths = minY != null ? minY * 12 : (P.rec.scoring.minExperienceMonths || 0); P.maxYears = det.maxYears || P.rec.experience.maxYears;
    P.freshers = P.level === 'CAMPUS';
    P.requiredDegrees = /\b(mba|pgdm|post ?graduate|pgp)\b/.test(Z.allC) ? ['MBA', 'PGDM'] : [];
    P.prefSpec = P.rec.scoring.preferredSpecialisations || [];
    P.certPreferred = parseCertList(P.rec.certifications.preferred); P.certRequired = []; P.certConditional = P.rec.certifications.conditional || [];
    ['cfa', 'frm', 'nism', 'six sigma', 'pmp', 'shrm', 'ca ', 'cma', 'power bi', 'google ads', 'sap'].forEach(function (k) { if (Z.mustLines.some(function (l) { return l.indexOf(k) >= 0; })) P.certRequired.push(k.trim().toUpperCase()); });
    P.goodToHave = Z.prefLines.join('; ');
    return P;
  }

  /* ============================================================ 4. Bullet classifier (replaces "Action Verbs vs Weak Phrases") */
  var STRONG = {}, NEUTRAL = {};
  C.STRONG_VERBS.forEach(function (v) { STRONG[canon(v)] = 1; });
  C.NEUTRAL_VERBS.forEach(function (v) { NEUTRAL[canon(v)] = 1; });
  var WEAK_RE = new RegExp('^(?:\\S+\\s+){0,2}?(?:' + C.WEAK_OPENERS.map(function (w) { return esc(canon(w)); }).join('|') + ')\\b');
  var RF_RE = new RegExp('^(?:[₹$€£]|rs\\.?\\s?\\d|inr\\s?\\d|\\d|' + C.RESULT_FIRST_OPENERS.map(function (w) { return esc(canon(w)); }).join('|') + ')');
  var NOUN_ACH_RE = /\b(winner|won|finalist|semi-finalist|runner-?up|rank(ed)?|top \d+|\d+(st|nd|rd|th)\b|gold|silver|medal|scholar(ship)?|award(ed)?|recipient|topper|percentile|air \d+|dean'?s list|selected (as|for|among)|promoted|fast-?tracked|pre-placement (offer|interview)|ppo|ppi)\b/;
  function verbLemma(tok) {
    var t = tok.replace(/[^a-z-]/g, '').replace(/^(co-|re-)/, function (p) { return p; });
    if (STRONG[t] || NEUTRAL[t]) return t;
    var base = t.replace(/^co-/, '').replace(/^re-/, 're');
    if (STRONG[base]) return base;
    // gerunds / present tense → past ("leading" → "led" is irregular; handled by map)
    var irr = { leading: 'led', building: 'built', driving: 'drove', winning: 'won', growing: 'grew', making: 'made', running: 'ran', spearheading: 'spearheaded', cutting: 'cut', writing: 'wrote', leads: 'led', drives: 'drove', builds: 'built', grows: 'grew', manages: 'managed', managing: 'managed', handling: 'handled', heading: 'headed', owning: 'owned', delivering: 'delivered' };
    if (irr[t]) return irr[t];
    var cands = [t.replace(/ing$/, 'ed'), t.replace(/ing$/, 'ted'), t.replace(/ing$/, 'ed').replace(/eed$/, 'ed'), t.replace(/ing$/, 'ied'), t.replace(/es$/, 'ed'), t.replace(/s$/, 'ed'), t.replace(/e?s$/, 'd'), t + 'd', t + 'ed'];
    for (var i = 0; i < cands.length; i++) if (STRONG[cands[i]] || NEUTRAL[cands[i]]) return cands[i];
    return null;
  }
  var METRIC_OUTCOME = /(?:[₹$€£]\s?\d|\brs\.?\s?\d|\binr\s?\d|\d[\d,.]*\s?(?:%|x\b|pp\b|bps\b|percent|lakhs?|lacs?|l\b|crores?|cr\b|mn\b|million|bn\b|billion|k\b)|\b(?:rank(?:ed)?\s*#?\d|#\d+\b|top \d+%?|\d+(?:st|nd|rd|th)\b|\d+ of \d+|\d+\s*(?:hours?|hrs|days?|weeks?|minutes?)\b|from \d[\d,.]*\s*\S*\s*to \d))/;
  var METRIC_BASELINE = /\bfrom\s+[₹$]?\d[\d,.]*\S*\s+(?:\S+\s+){0,3}to\s+[₹$]?\d|\bvs\.?\s+\d|\byoy\b|\(\s*\d[\d,.]*\s*(%|x)\s*\)|\bover\s+(the\s+)?(last|previous)\b|\bfrom\s+[₹$]?\d/;
  var METRIC_SCALE = /\b\d[\d,.]*\+?\s*(?:k\s+)?(?:\w+\s+){0,2}(?:clients?|customers?|users?|outlets?|stores?|dealers?|distributors?|retailers?|skus?|sites?|plants?|branches?|cities|states|districts|villages|employees?|members?|students?|participants?|attendees?|teams?|respondents?|interviews?|recruiters?|accounts?|merchants?|farmers?|reports?|dashboards?|projects?|campaigns?|events?|hires?|candidates?|vendors?|suppliers?|regions?|depots?|countries|markets?|products?|features?|tests?|transactions?|beds?|patients?|subscribers?|speakers?|creators?|grades?|managers?|asms?)\b/;
  function stripDates(c) { return c.replace(new RegExp(DT, 'gi'), ' ').replace(/\b(19|20)\d{2}\b/g, ' ').replace(/\b\d{1,2}\s*(months?|mos)\b/g, ' '); }
  function metricOf(bulletC) {
    var c = stripDates(bulletC);
    var outcome = METRIC_OUTCOME.test(c), base = METRIC_BASELINE.test(c), scale = METRIC_SCALE.test(c);
    var q = outcome ? (base ? 1 : 0.85) : scale ? 0.5 : 0;
    return { q: q, outcome: outcome, baseline: base, scale: scale };
  }
  var ADV_RE = new RegExp('^(?:' + C.ADVERBS.join('|') + ')\\s+');
  var NOT_VERB_ED = { based: 1, need: 1, speed: 1, seed: 1, feed: 1, bed: 1, red: 1, shed: 1, hundred: 1, limited: 1, detailed: 1, varied: 1, advanced: 1, skilled: 1, talented: 1, dedicated: 1, interested: 1, experienced: 1, related: 1, united: 1, listed: 1, unlisted: 1, deed: 1, breed: 1, greed: 1, reed: 1, weed: 1, bleed: 1 };
  function looseVerb(tok) {   // past-tense words not in the dictionaries ("cleared", "spearheaded-like" variants) still count as verbs
    var t = (tok || '').replace(/[^a-z-]/g, '');
    return verbLemma(t) || (/^[a-z]{4,}ed$/.test(t) && !NOT_VERB_ED[t] ? t : null);
  }
  function classifyBullet(b) {
    var c = b.c.replace(/^[^a-z0-9₹$]+/, '').replace(ADV_RE, '');
    // IIM PoR style "Head, Marketing Club (IIM X): led 14-member team…" → judge the clause after the colon
    var pc = /^[^:]{3,80}:\s+(.+)$/.exec(c);
    if (pc && verbLemma(words(pc[1])[0] || '')) { b.porPrefix = true; c = pc[1]; }
    var toks = words(c);
    var m = metricOf(c);
    var cls, pts;
    var lead = null;
    for (var i = 0; i < Math.min(3, toks.length); i++) { lead = verbLemma(toks[i]); if (lead) break; }
    var loose = !lead && looseVerb(toks[0]);
    b.credential = C.CREDENTIAL_LINE.test(c);
    if (b.credential) { cls = 'NOUN_PHRASE_ACHIEVEMENT'; pts = 0.85; }
    else if (WEAK_RE.test(c)) { cls = 'WEAK'; pts = m.outcome ? 0.45 : 0.2; }
    else if (RF_RE.test(c) && (m.outcome || NOUN_ACH_RE.test(c))) { cls = 'RESULT_FIRST'; pts = 1; }
    else if (NOUN_ACH_RE.test(toks.slice(0, 5).join(' '))) { cls = 'NOUN_PHRASE_ACHIEVEMENT'; pts = 0.85; }
    else if (lead && STRONG[lead]) { cls = m.outcome ? 'STRONG_VERB_RESULT' : 'STRONG_VERB'; pts = m.outcome ? 1 : (m.scale ? 0.8 : 0.72); }
    else if (lead && NEUTRAL[lead]) { cls = 'NEUTRAL'; pts = m.outcome ? 0.72 : m.scale ? 0.6 : 0.5; }
    else if (loose) { cls = 'NEUTRAL'; lead = loose; pts = m.outcome ? 0.75 : m.scale ? 0.62 : 0.55; }
    else { cls = 'NO_VERB'; pts = m.outcome ? 0.7 : m.scale ? 0.5 : 0.4; }
    if (C.FIRST_PERSON.test(c)) pts -= 0.05;
    b.cls = cls; b.pts = clip(pts, 0, 1); b.metric = m; b.lead = lead;
    b.weakPhrase = cls === 'WEAK' ? (WEAK_RE.exec(c) || [''])[0].trim() : null;
    return b;
  }

  /* ============================================================ 5. Domain suitability (resume → 28 domains) */
  var SIG_W = {
    CAMPUS: { title: .06, company: .06, bullets: .18, intern: .26, spec: .14, ug: .07, certs: .06, clubs: .09, college: .03, skills: .05 },
    EARLY:  { title: .22, company: .14, bullets: .24, intern: .10, spec: .08, ug: .05, certs: .06, clubs: .05, college: .01, skills: .05 },
    MID:    { title: .28, company: .17, bullets: .26, intern: .03, spec: .05, ug: .03, certs: .06, clubs: .02, college: 0, skills: .10 },
    SENIOR: { title: .30, company: .18, bullets: .26, intern: 0, spec: .03, ug: .02, certs: .05, clubs: .01, college: 0, skills: .15 }
  };
  function bfsiRetail(s) { return (s || '').replace(/\bretail (banking|bank|assets|asset|lending|liabilities|broking|investors?|loans?|credit)\b/g, 'retailbanking $1'); }
  function roleTitleDomain(role) {
    var t = bfsiRetail(role.titleText || ''), out = {}, named = false;
    DCODES.forEach(function (d) { var s = titleDomainScore(t, d); if (s) { out[d] = s; if (s >= 0.85) named = true; } });
    if (/\b(transaction (advisory|services)|deal (advisory|transformation)|deals|due diligence|post[- ]merger|integration (and|&) separation|carve-?outs?|valuation (and|&) modell?ing)\b/.test(t)) {
      out.CON = Math.max(out.CON || 0, 0.9); if (out.IB) out.IB = Math.min(out.IB, 0.5); named = true;
    }
    // Generic titles (Analyst, Associate, Consultant, Manager, Intern, MT…) that name no function are resolved through the
    // company's hiring profile, in its hiring order. Titles that already name a function are never re-assigned.
    if (!named && role.company && C.AMBIGUOUS_TITLES.some(function (a) { return compilePhrase(a).test(t); })) {
      var order = [0.7, 0.45, 0.3];
      role.company.t.forEach(function (d, i) { out[d] = Math.max(out[d] || 0, order[i] || 0.25); });
    }
    return out;
  }
  function recencyW(role, todayYM) { var yrs = Math.max(0, (todayYM - role.endYM) / 12); return Math.exp(-0.35 * yrs) * Math.min(1, 0.4 + role.months / 24); }
  function calculateDomainSuitabilityV3(R, opts) {
    opts = opts || {};
    var today = opts.today || new Date(), todayYM = today.getFullYear() * 12 + today.getMonth();
    var lvl = R.userLevel, W = SIG_W[lvl];
    if (R.isStudent && lvl !== 'CAMPUS') { W = {}; Object.keys(SIG_W.CAMPUS).forEach(function (k) { W[k] = 0.5 * SIG_W.CAMPUS[k] + 0.5 * SIG_W[lvl][k]; }); }
    var S = {}, EV = {}; DCODES.forEach(function (d) { S[d] = { title: 0, company: 0, bullets: 0, intern: 0, spec: 0, ug: 0, certs: 0, clubs: 0, college: 0, skills: 0 }; EV[d] = {}; });
    function ev(d, k, txt) { if (txt && !(EV[d][k] || []).some(function (x) { return x === txt; })) (EV[d][k] = EV[d][k] || []).push(txt); }
    function pretty(t) { return (t || '').replace(/\s+/g, ' ').trim().replace(/\b([a-z])/g, function (m) { return m.toUpperCase(); }).replace(/\b(It|Hr|Hrm|M&a|Pmi|Fp&a|Sme|Kam|Asm|Rsm|Bd|Erp|Sap|Crm|Esg|Pmo|Hrbp|Ta)\b/g, function (m) { return m.toUpperCase(); }); }
    function coName(r) { return r.companyAlias || (r.company ? r.company.n.split(' / ')[0] : ''); }
    var ft = R.roles.filter(function (r) { return !r.isIntern; }), it = R.roles.filter(function (r) { return r.isIntern; });
    var wsum = ft.reduce(function (a, r) { return a + recencyW(r, todayYM); }, 0) || 1;
    ft.forEach(function (r) {
      var w = recencyW(r, todayYM) / wsum, td = roleTitleDomain(r), bt = bfsiRetail(canon(r.bullets.map(function (b) { return b.text; }).join('\n')));
      DCODES.forEach(function (d) {
        if (td[d]) S[d].title += w * td[d];
        var blx = bt ? domainLexScore(bt + '\n' + (r.titleText || ''), d) : { s: 0, hits: [] }, bl = blx.s;
        if (bt) S[d].bullets += w * bl;
        if (bl > 0.05) ev(d, 'bullets', blx.hits.slice(0, 3).map(disp).join(', '));
        if (td[d] >= 0.3) ev(d, 'title', pretty(r.titleText) + (r.company ? ' (' + coName(r) + ')' : ''));
        if (r.company) {
          var cv = r.company.i === d ? 0.8 : r.company.t.indexOf(d) >= 0 ? 1 : r.company.c.indexOf(d) >= 0 ? 0.45 : 0;
          var agrees = (td[d] || 0) >= 0.3 || bl >= 0.12 || r.company.i === d;   // a company hiring HR MBAs does not make a sales manager an HR profile
          S[d].company += w * cv * (agrees ? 1 : 0.2);
          if (cv && agrees) ev(d, 'company', coName(r));
        }
      });
    });
    var projTxt = canon((R.sections.projects || []).join('\n'));
    it.forEach(function (r, i) {
      var td = roleTitleDomain(r), bt = bfsiRetail(canon(r.bullets.map(function (b) { return b.text; }).join('\n')));
      var k = i === 0 ? 1 : 0.5;
      DCODES.forEach(function (d) {
        var co = r.company ? (r.company.t.indexOf(d) >= 0 ? 1 : r.company.c.indexOf(d) >= 0 ? 0.4 : 0) : 0;
        var ilx = domainLexScore(bt + '\n' + r.titleText, d).s, iAgree = (td[d] || 0) >= 0.3 || ilx >= 0.12;   // an HR intern at an FMCG firm is not Marketing evidence
        var v = 0.4 * (td[d] || 0) + 0.25 * co * (iAgree ? 1 : 0.2) + 0.35 * ilx;
        S[d].intern = Math.min(1, S[d].intern + k * v);
        if (v > 0.15 && iAgree) ev(d, 'intern', 'Internship: ' + pretty(r.titleText) + (r.company ? ' (' + coName(r) + ')' : ''));
      });
    });
    if (projTxt) DCODES.forEach(function (d) { var px = domainLexScore(projTxt, d); S[d].intern = Math.min(1, S[d].intern + 0.35 * px.s); if (px.s > 0.1) ev(d, 'intern', 'Projects: ' + px.hits.slice(0, 2).map(disp).join(', ')); });
    R.spec.forEach(function (sp, i) { var k = i === 0 ? 1 : 0.6; Object.keys(sp[1]).forEach(function (d) { S[d].spec = Math.max(S[d].spec, k * sp[1][d]); if (sp[1][d] >= 0.6) ev(d, 'spec', 'MBA specialisation: ' + pretty(sp[0])); }); });
    R.ug.forEach(function (m, i) { Object.keys(m).forEach(function (d) { S[d].ug = Math.max(S[d].ug, m[d]); if (m[d] >= 0.5) ev(d, 'ug', R.ugLabel[i]); }); });
    R.certDom.forEach(function (m, i) { Object.keys(m).forEach(function (d) { S[d].certs = Math.min(1, S[d].certs + m[d]); if (m[d] >= 0.6) ev(d, 'certs', 'Certification: ' + (C.CERT_LABEL[R.certIds[i]] || R.certIds[i])); }); });
    R.clubDom.forEach(function (m, i) { Object.keys(m).forEach(function (d) { S[d].clubs = Math.min(1, S[d].clubs + 0.6 * m[d]); if (m[d] >= 0.6) ev(d, 'clubs', 'Club / competition: ' + R.clubLabel[i]); }); });
    if (R.school && R.school.e) R.school.d.forEach(function (d, i) { S[d].college = Math.max(S[d].college, [1, 0.7, 0.5, 0.4][i] || 0.3); ev(d, 'college', 'Institute strength: ' + R.school.n); });
    if (R.skillsText) DCODES.forEach(function (d) { var sx = domainLexScore(R.skillsText, d); S[d].skills = sx.s; if (sx.s > 0.08) ev(d, 'skills', 'Skills: ' + sx.hits.slice(0, 3).map(disp).join(', ')); });
    // No full-time roles (fresher): redistribute title/company/bullets weight to internships & projects
    var Wl = Object.assign({}, W);
    if (!ft.length) { Wl.intern += Wl.title + Wl.company + Wl.bullets * 0.5; Wl.bullets *= 0.5; Wl.title = 0; Wl.company = 0; }
    var out = DCODES.map(function (d) {
      var E = 0, contrib = [];
      Object.keys(Wl).forEach(function (k) { var v = Wl[k] * S[d][k]; E += v; if (S[d][k] > 0.05) contrib.push([k, v]); });
      contrib.sort(function (a, b) { return b[1] - a[1]; });
      var evidence = [];
      contrib.forEach(function (x) { (EV[d][x[0]] || []).slice(0, x[0] === 'title' ? 2 : 1).forEach(function (t) { if (evidence.length < 4) evidence.push(x[0] === 'bullets' ? 'Experience: ' + t : x[0] === 'title' ? 'Role: ' + t : x[0] === 'company' ? 'Employer: ' + t : t); }); });
      return { d: d, name: domName(d), score: Math.round(100 * (1 - Math.exp(-3.4 * E))), E: E, signals: contrib.slice(0, 3).map(function (x) { return x[0]; }), evidence: evidence, raw: S[d] };
    }).sort(function (a, b) { return b.score - a.score; });
    out.forEach(function (x) { x.tier = x.score >= 70 ? 'Strong Fit' : x.score >= 45 ? 'Moderate Fit' : 'Developing Fit'; });
    var top = out[0], second = out[1], nSig = top.signals.length;
    var conf = (top.score - second.score >= 15 && nSig >= 3) ? 'HIGH' : (top.score - second.score >= 7 || nSig >= 2) ? 'MEDIUM' : 'LOW';
    // Past (roles) vs emerging (MBA specialisation, internships, certifications, clubs) → career-switcher detection
    function argmax(keys) { var b = null, bv = 0; DCODES.forEach(function (d) { var v = keys.reduce(function (a, k) { return a + S[d][k]; }, 0); if (v > bv) { bv = v; b = d; } }); return bv > 0.35 ? b : null; }
    var past = ft.length ? argmax(['title', 'company', 'bullets']) : null, emerging = argmax(['spec', 'intern', 'certs', 'clubs']);
    return { ranking: out, top: out.slice(0, 3), confidence: conf, userLevel: lvl, pastDomain: past, emergingDomain: emerging,
             switcher: !!(past && emerging && past !== emerging && C.DOMAINS[past].adj.indexOf(emerging) < 0) };
  }
  var SIG_LABEL = { title: 'job titles', company: 'employers', bullets: 'experience bullets', intern: 'internships & projects', spec: 'MBA specialisation',
    ug: 'undergraduate degree', certs: 'certifications', clubs: 'clubs & competitions', college: 'institute strengths', skills: 'skills list' };
  function suitabilityInsight(DS, target, R) {
    var t = DS.ranking.filter(function (x) { return x.d === target; })[0], top = DS.ranking[0];
    var emerging = R.userLevel === 'CAMPUS' && !R.fullTimeMonths;
    var label = emerging ? 'Emerging ' + t.tier.replace(' Fit', '').toLowerCase() + ' fit' : t.tier;
    var kind, msg;
    if (top.d === target || top.score - t.score <= 8) { kind = 'SYNERGY'; msg = 'Direct alignment: your ' + (t.signals.map(function (k) { return SIG_LABEL[k]; }).join(', ') || 'profile') + ' point to ' + domName(target) + '.'; }
    else if (C.DOMAINS[top.d].adj.indexOf(target) >= 0 && top.score - t.score <= 20) { kind = 'ADJACENT'; msg = 'Your strongest evidence is in ' + top.name + ' (' + top.score + '), an adjacent domain. Frame transferable bullets in ' + domName(target) + ' language.'; }
    else if (t.score < 45 && top.score >= 55) { kind = 'PIVOT'; msg = 'Pivot alert: your profile reads ' + top.name + ' (' + top.score + ') more than ' + domName(target) + ' (' + t.score + '). Either target ' + top.name + ' roles or build ' + domName(target) + ' evidence first (see projects & certifications).'; }
    else { kind = 'DEVELOPING'; msg = domName(target) + ' evidence is still thin across titles, internships and bullets. Prioritise the fixes and projects below.'; }
    if (DS.switcher) msg += ' Career-switch pattern detected: past roles in ' + domName(DS.pastDomain) + ', MBA signals point to ' + domName(DS.emergingDomain) + '.';
    return { kind: kind, label: label, message: msg, targetScore: t.score, targetTier: t.tier, topDomain: top.d };
  }

  /* ============================================================ 6. Fit Score vectors */
  function skillEvidence(R, term) {
    var inBullet = R.bullets.some(function (b) { return (b.section !== 'achievements') && termHit(b.c, term); });
    if (inBullet) return 1;
    if (R.bullets.some(function (b) { return termHit(b.c, term); }) || termHit(R.summaryText, term)) return 0.85;
    if (termHit(R.skillsText, term)) return 0.55;
    if (termHit(R.canon, term)) return 0.5;
    return 0;
  }
  function computeVectors(R, P) {
    var V = {}, det = {};
    var content = R.bullets.filter(function (b) { return CONTENT[b.section]; });
    content.forEach(classifyBullet);
    var jdText = P.terms.map(function (x) { return x.t; }).join(' ');
    content.forEach(function (b) {
      var rel = 0; P.terms.forEach(function (x) { if (termHit(b.c, x.t)) rel += x.w; });
      b.rel = clip(rel / 4.5, 0, 1); b.relW = 0.3 + 0.7 * b.rel;
    });
    // V1 JD skill & must-have match
    var sw = 0, sc = 0, mustN = 0, mustHit = 0, gaps = [], listedOnly = [], matched = [];
    P.terms.forEach(function (x) {
      var ev = skillEvidence(R, x.t); sw += x.w; sc += x.w * ev;
      if (x.kind === 'must') { mustN++; if (ev > 0) mustHit++; }
      if (ev === 0) gaps.push(x); else if (ev <= 0.55) listedOnly.push(x); else matched.push(x);
    });
    var cov = sw ? sc / sw : 0;
    var stuffed = (R.sections.skills || []).join(',').split(/,|\||;/).length > 32;
    V.skill = clip(Math.pow(Math.min(1, cov / 0.8), 0.9) - (stuffed ? 0.08 : 0), 0, 1);
    det.skill = { coverage: round(cov, 2), mustHave: mustHit + '/' + mustN, mustShare: mustN ? mustHit / mustN : 1, gaps: gaps, listedOnly: listedOnly, matched: matched, stuffed: stuffed };
    // V2 role & domain alignment
    var DS = calculateDomainSuitabilityV3(R, { today: P._today });
    var dfit = DS.ranking.filter(function (x) { return x.d === P.domain; })[0];
    var titles = R.roles.map(function (r) { return { t: r.titleText, r: r }; });
    var tAlign = 0, tBest = null;
    var jdTitleC = canon(P.title || '');
    titles.forEach(function (o) {
      var s = titleDomainScore(o.t, P.domain) || (roleTitleDomain(o.r)[P.domain] || 0);
      var w = o.r.isIntern ? (P.level === 'CAMPUS' ? 0.9 : 0.5) : 1;
      if (jdTitleC && o.t && words(jdTitleC).filter(function (x) { return x.length > 3 && o.t.indexOf(x) >= 0; }).length >= 2) s = Math.max(s, 1);
      if (s * w > tAlign) { tAlign = s * w; tBest = o; }
    });
    if (termHit(R.summaryText, P.title || '') || titleDomainScore(R.summaryText, P.domain) >= 0.85) tAlign = Math.max(tAlign, 0.75);
    V.role = clip(0.5 * tAlign + 0.5 * (dfit.score / 100) / 0.85, 0, 1);
    det.role = { titleAlign: round(tAlign, 2), bestTitle: tBest ? tBest.t : null, domainFit: dfit.score };
    // V3 experience & level fit
    function roleRel(r) { var td = roleTitleDomain(r)[P.domain] || 0; var co = r.company ? (r.company.t.indexOf(P.domain) >= 0 ? 1 : r.company.c.indexOf(P.domain) >= 0 ? 0.5 : 0) : 0;
      var lx = domainLexScore(canon(r.bullets.map(function (b) { return b.text; }).join(' ')), P.domain).s; var adj = 0;
      if (r.company && C.DOMAINS[P.domain].adj.some(function (a) { return r.company.t.indexOf(a) >= 0; })) adj = 0.5;
      return clip(Math.max(td, co, lx * 1.4, adj, 0.25), 0, 1); }
    var relMonths = 0, relIntern = 0;
    R.roles.forEach(function (r) { var rr = roleRel(r); if (r.isIntern) relIntern = Math.max(relIntern, rr); relMonths += r.months * rr * (r.isIntern ? 0.5 : 1); });
    var liveProj = (R.sections.projects || []).filter(function (l) { return domainLexScore(canon(l), P.domain).s > 0.05; }).length;
    relMonths += Math.min(2, liveProj) * 0.5;
    var reqM = P.minMonths || 0, gapM = reqM - R.fullTimeMonths;
    if (P.level === 'CAMPUS') {
      V.exp = clip(0.15 + 0.55 * relIntern + 0.15 * Math.min(1, liveProj / 2) + 0.15 * Math.min(1, R.fullTimeMonths / 12) + (R.fullTimeMonths && roleRelMax() > 0.6 ? 0.15 : 0), 0, 1);
    } else {
      V.exp = clip(reqM ? relMonths / reqM : 1, 0, 1);
    }
    function roleRelMax() { return R.roles.filter(function (r) { return !r.isIntern; }).reduce(function (a, r) { return Math.max(a, roleRel(r)); }, 0); }
    var overq = P.maxYears && R.fullTimeMonths > (P.maxYears * 12 + 36);
    det.exp = { userMonths: R.fullTimeMonths, internMonths: R.internMonths, relevantMonths: round(relMonths, 1), requiredMonths: reqM, gapMonths: gapM, overqualified: !!overq, bestInternRelevance: round(relIntern, 2) };
    // V4 quantified impact (content bullets only, JD-relevance weighted)
    var qN = 0, qD = 0;
    content.forEach(function (b) { qD += b.relW; if (b.metric.q >= 0.5) qN += b.relW; });
    var share = qD ? qN / qD : 0;
    var top5 = content.slice().sort(function (a, b) { return b.rel - a.rel; }).slice(0, 5);
    var depth = top5.length ? top5.reduce(function (a, b) { return a + b.metric.q; }, 0) / top5.length : 0;
    var fin = familyOf(P.domain) === 'finance';
    V.impact = content.length ? clip(0.65 * Math.min(1, share / (fin ? 0.45 : 0.55)) + 0.35 * depth, 0, 1) : 0;
    det.impact = { quantifiedShare: round(share, 2), depthTop5: round(depth, 2), unquantified: content.filter(function (b) { return b.metric.q === 0; }) };
    // V5 bullet strength
    var leads = {}; content.forEach(function (b) { if (b.lead) leads[b.lead] = (leads[b.lead] || 0) + 1; });
    var rep = Object.keys(leads).reduce(function (a, k) { return a + Math.max(0, leads[k] - 2) * 0.03; }, 0);
    var mean = content.length ? content.reduce(function (a, b) { return a + b.pts * b.relW; }, 0) / content.reduce(function (a, b) { return a + b.relW; }, 0) : 0;
    V.bullets = content.length ? clip(0.15 + 0.85 * clip(mean - Math.min(0.09, rep), 0, 1), 0, 1) : 0;
    var hist = {}; content.forEach(function (b) { hist[b.cls] = (hist[b.cls] || 0) + 1; });
    det.bullets = { mean: round(mean, 2), classes: hist, weak: content.filter(function (b) { return b.cls === 'WEAK'; }), repeated: Object.keys(leads).filter(function (k) { return leads[k] > 2; }), n: content.length };
    // V6 leadership, PoR & achievements
    var porLines = (R.sections.por || []).concat(R.sections.extracurricular || []);
    var por = 0;
    porLines.forEach(function (l) {
      var c = canon(l), t = /\b(head|president|general secretary|secretary|captain|founder|co-founder|chair(person)?|convener|placement committee|placecom)\b/.test(c) ? 1 : /\b(coordinator|co-ordinator|lead|core (team|member)|vice president|manager|organizer)\b/.test(c) ? 0.7 : /\b(member|volunteer\w*|participa\w*)\b/.test(c) ? 0.3 : 0.2;
      if (METRIC_SCALE.test(c) || /₹|budget|sponsor/.test(c)) t += 0.25;
      por += t;
    });
    var achLines = (R.sections.achievements || []).concat(porLines, (R.sections.extracurricular || []));
    var ach = 0;
    uniq(achLines).forEach(function (l) {
      var c = canon(l), nat = /\b(national|all india|pan-india|international|global)\b/.test(c);
      if (/\b(winner|won|1st|first prize|champion)\b/.test(c)) ach += nat ? 1 : 0.5;
      else if (/\b(finalist|semi-finalist|runner-?up|top \d+)\b/.test(c)) ach += nat ? 0.75 : 0.45;
      else if (/\b(rank|percentile|topper|gold medal|merit|scholarship|dean'?s list|air \d+)\b/.test(c)) ach += 0.55;
      else if (/\b(state|national|district)[ -]level\b/.test(c)) ach += 0.5;
      if (/\b(pre-placement (offer|interview)|ppo|ppi)\b/.test(c)) ach += 0.6;
    });
    R.bullets.forEach(function (b) { if (b.section === 'internship' && /\b(pre-placement (offer|interview)|ppo|ppi)\b/.test(b.c)) ach += 0.6; });
    (R.sections.certifications || []).concat(R.sections.achievements || []).forEach(function (l) {   // "Cleared CFA Level II", "FRM Part I" …
      var c = canon(l); if (C.CREDENTIAL_LINE.test(c) || /\b(cfa|frm|caia)\b[^\n]{0,20}\b(level|part) ?(ii|iii|2|3)\b|\b(chartered accountant|ca final|cma final)\b/.test(c)) ach += 0.55;
    });
    var allC = R.canon;
    var people = /\b(team of \d+|\d+[- ]member|led (a )?(\d+[- ]member )?team|managed (a )?team|direct reports?|mentored \d+|supervised \d+|led \d+)\b/.test(allC) ? 1 : 0;
    var teamSize = +((/\b(\d+)[- ]member\b|\bteam of (\d+)\b/.exec(allC) || [])[1] || (/\bteam of (\d+)\b/.exec(allC) || [])[1] || 0);
    var owner = /\b(managed (a|an|the)? ?(portfolio|book|workstream|client portfolio|key accounts?|accounts?|territory|region|brand|category|programme|program|project)|owned (the|a)?|independently (managed|led|ran)|led the [a-z ]{0,25}(workstream|programme|program|project|integration|implementation)|p&l|profit (and|&) loss|budget of|people budget|₹\s?\d[\d,.]*\s?(cr|crore)[^.]{0,30}(p&l|budget|portfolio|revenue|business)|head (of|-|–)|business head)\b/.test(allC) ? 1 : 0;
    var promo = /\bpromoted\b|\bfast-?tracked\b/.test(allC) || (function () { var byCo = {}; R.roles.forEach(function (r) { if (r.company && !r.isIntern) byCo[r.company.n] = (byCo[r.company.n] || 0) + 1; }); return Object.keys(byCo).some(function (k) { return byCo[k] > 1; }); })();
    var L = P.level;
    if (L === 'CAMPUS') V.lead = clip(0.55 * sat(por, 1.2) * 1.45 + 0.45 * sat(ach, 1.0) * 1.5 + (people ? 0.08 : 0), 0, 1);
    else if (L === 'EARLY') V.lead = clip(0.30 * sat(por + ach, 1.2) * 1.45 + 0.40 * people + 0.30 * (promo || owner ? 1 : 0), 0, 1);
    else V.lead = clip(0.45 * (people ? (teamSize >= 10 || L === 'MID' ? 1 : 0.7) : 0) + 0.30 * owner + 0.15 * (promo ? 1 : 0) + 0.10 * sat(ach, 0.8) * 1.5, 0, 1);
    det.lead = { porScore: round(por, 2), achievementScore: round(ach, 2), peopleLeadership: !!people, teamSize: teamSize, ownership: !!owner, promotion: !!promo, porLines: porLines };
    // V7 education & credentials (CGPA cut-offs and college tier are advisory only and never scored, per the JD Library rules)
    var degOK = !P.requiredDegrees.length || R.degrees.mba || (R.degrees.ca && P.requiredDegrees.some(function (x) { return /chartered|^ca$/i.test(x); }));
    var specOK = !P.prefSpec.length ? 1 : R.spec.some(function (sp) { return P.prefSpec.some(function (ps) { return canon(ps).indexOf(sp[0]) >= 0 || sp[0].indexOf(canon(ps)) >= 0 || sp[1][P.domain] >= 0.8; }); }) ? 1 : (R.spec.length ? 0.3 : 0.5);
    var jdCertsC = canon(P.certPreferred.join(' ; ') + ' ' + P.certRequired.join(' ; '));
    var heldRel = R.certDom.filter(function (m) { return (m[P.domain] || 0) >= 0.6; }).length;
    var heldPref = C.CERT_SIGNALS.filter(function (c) { return R.certIds.indexOf(c[2]) >= 0 && c[0].test(jdCertsC); }).length;
    var certScore = P.certPreferred.length ? clip(0.35 + 0.65 * Math.min(1, heldPref + 0.5 * heldRel), 0, 1) : (heldRel ? 1 : 0.7);
    var reqMissing = P.certRequired.filter(function (x) { return !anyMatch(R.canon, [x.toLowerCase()]); });
    if (L === 'CAMPUS') V.edu = 0.45 * (degOK ? 1 : 0) + 0.25 * specOK + 0.30 * certScore;
    else if (L === 'EARLY') V.edu = 0.40 * (degOK ? 1 : 0.5) + 0.15 * specOK + 0.45 * certScore;
    else V.edu = 0.5 * (degOK ? 1 : 0.7) + 0.5 * certScore;
    det.edu = { degreeOK: degOK, specialisationMatch: specOK, certScore: round(certScore, 2), heldRelevant: heldRel, requiredMissing: reqMissing, cgpaNote: 'Academic cut-offs are shown as advice only and are not scored.' };
    // V8 structure, sections & contact (level-aware expectations; a Certifications heading is never required)
    var hs = {}; R.headers.forEach(function (h) { hs[h] = 1; });
    var expect = L === 'CAMPUS' ? ['education', ['internship', 'experience'], ['projects', 'por'], ['achievements', 'extracurricular', 'por'], 'skills']
      : L === 'EARLY' ? ['experience', 'education', 'skills'] : ['experience', 'education', ['skills', 'certifications', 'summary']];
    var got = expect.filter(function (e) { return Array.isArray(e) ? e.some(function (x) { return hs[x]; }) : hs[e]; }).length;
    var contact = (R.contact.email ? 0.4 : 0) + (R.contact.phone ? 0.35 : 0) + (R.contact.linkedin ? 0.25 : 0);
    V.struct = clip(0.35 * contact + 0.65 * got / expect.length, 0, 1);
    det.struct = { contact: R.contact, sectionsFound: got + '/' + expect.length, missing: expect.filter(function (e) { return !(Array.isArray(e) ? e.some(function (x) { return hs[x]; }) : hs[e]); }) };
    // V9 length & bullet discipline (IIM one-pagers run ~500–650 words; seniors may use 2 pages)
    var pages = R.pageCount, wc = R.wordCount, pg;
    var maxP = (L === 'CAMPUS' || L === 'EARLY') ? 1 : 2;
    if (pages) pg = pages <= maxP ? 1 : pages === maxP + 1 ? 0.5 : 0.2;
    else pg = wc <= (maxP === 1 ? 650 : 1100) ? 1 : wc <= (maxP === 1 ? 950 : 1500) ? 0.55 : 0.25;
    var bl = content.length ? content.filter(function (b) { var n = words(b.text).length; return n >= 8 && n <= 32; }).length / content.length : 0;
    V.length = clip(0.5 * pg + 0.5 * Math.min(1, bl / 0.7), 0, 1);
    det.length = { pages: pages, words: wc, pageRule: maxP + ' page' + (maxP > 1 ? 's' : ''), bulletLengthOK: round(bl, 2), longBullets: content.filter(function (b) { return words(b.text).length > 32; }) };
    // V10 ATS parse health
    var garbled = /[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(R.raw);
    var shortLines = R.raw.split('\n').filter(function (l) { return l.trim() && words(l).length < 3; }).length / Math.max(1, R.raw.split('\n').filter(function (l) { return l.trim(); }).length);
    var ats = (wc >= 150 ? 0.3 : wc >= 80 ? 0.15 : 0) + (garbled ? 0 : 0.25) + (R.headers.length >= 3 ? 0.2 : R.headers.length * 0.06) + (shortLines < 0.35 ? 0.15 : 0.05) + (RANGE_RE.test(R.raw) || SINGLE_DATE_RE.test(R.raw) ? 0.1 : 0);
    V.ats = clip(ats, 0, 1);
    det.ats = { garbled: garbled, shortLineShare: round(shortLines, 2), headings: R.headers.length, words: wc };
    return { V: V, det: det, DS: DS, content: content };
  }
  function weightsFor(level, domain) {
    var base = C.LEVEL_WEIGHTS[level], mult = C.FAMILY_MULT[familyOf(domain)] || {}, w = {}, sum = 0;
    Object.keys(base).forEach(function (k) { w[k] = base[k] * (mult[k] || 1); sum += w[k]; });
    Object.keys(w).forEach(function (k) { w[k] = 100 * w[k] / sum; });
    return w;
  }
  function bandOf(score) { for (var i = 0; i < C.BANDS.length; i++) if (score >= C.BANDS[i].min) return C.BANDS[i]; return C.BANDS[C.BANDS.length - 1]; }

  /* ============================================================ 7. Bullet rewrites (deterministic, no invented numbers) */
  var IRR_PAST = { writing: 'Wrote', making: 'Made', running: 'Ran', building: 'Built', getting: 'Got', doing: 'Did', selling: 'Sold', leading: 'Led', setting: 'Set', driving: 'Drove', meeting: 'Met', bringing: 'Brought', teaching: 'Taught', winning: 'Won', cutting: 'Cut', putting: 'Put', taking: 'Took', giving: 'Gave', finding: 'Found', keeping: 'Kept', holding: 'Held', speaking: 'Spoke' };
  var IRR_GER = { led: 'leading', built: 'building', drove: 'driving', ran: 'running', made: 'making', wrote: 'writing', won: 'winning', sold: 'selling', cut: 'cutting', set: 'setting', met: 'meeting', grew: 'growing', did: 'doing', got: 'getting' };
  function gerundToPast(w) {
    var lw = w.toLowerCase();
    if (IRR_PAST[lw]) return IRR_PAST[lw];
    if (!/ing$/.test(lw)) return null;
    var stem = lw.slice(0, -3);
    if (/([bcdfghjklmnpqrstvwz])\1$/.test(stem) && !/(ll|ss|ff)$/.test(stem)) return cap(stem + 'ed');            // planning → planned
    if (/[^aeiou]y$/.test(stem)) return cap(stem.slice(0, -1) + 'ied');
    if (/(at|iz|is|ur|v|g|c|s|z|ys|yz|ag|in|ar|iv|ag)$/.test(stem) && !/(ss|ng)$/.test(stem)) return cap(stem + 'ed').replace(/eed$/, 'ed');  // creating → created, analysing → analysed
    return cap(stem + 'ed');
  }
  function pastToGerund(w) {
    var lw = w.toLowerCase();
    if (IRR_GER[lw]) return IRR_GER[lw];
    if (/ied$/.test(lw)) return lw.replace(/ied$/, 'ying');
    if (/([bcdfghjklmnpqrstvwz])\1ed$/.test(lw)) return lw.replace(/([bcdfghjklmnpqrstvwz])ed$/, 'ing');
    if (/ed$/.test(lw)) return lw.replace(/ed$/, 'ing');
    return lw;
  }
  function objectType(c) {
    var best = '_any', bn = 0;
    C.OBJECT_TYPES.forEach(function (o) { var re = new RegExp(o[1].source, 'g'), n = (c.match(re) || []).length; if (n > bn) { bn = n; best = o[0]; } });
    return best;
  }
  var OBJ_VERB = { research: 'Conducted', campaign: 'Executed', model: 'Built', sales: 'Managed', process: 'Improved', hiring: 'Ran', people: 'Ran', delivery: 'Delivered', product: 'Built', data: 'Built', event: 'Organised', strategy: 'Developed', _any: 'Delivered' };
  function proofHint(section) {
    return section === 'internship' ? 'Keep your internship guide\'s email or certificate confirming these numbers (PlaceCom verifies every CV point).'
      : section === 'experience' ? 'Keep a manager email from an official ID, an appraisal letter or a dashboard screenshot for these numbers.'
      : section === 'por' || section === 'extracurricular' ? 'Keep the club / committee head\'s or faculty confirmation.'
      : 'Keep the project report or faculty sign-off.';
  }
  // verb chosen from the activity noun at the start of a bullet ("annual reviews…" → "Conducted annual reviews…")
  var NOUN_VERB = [[/\b(reviews?|audits?|analysis|analyses|research|surveys?|interviews?|assessments?|due diligence|diligence|benchmarking|studies|study)\b/, 'Conducted'],
    [/\b(reports?|notes?|memos?|presentations?|decks?|proposals?|plans?|checklists?|documentation|budgets?|forecasts?)\b/, 'Prepared'],
    [/\b(models?|dashboards?|trackers?|tools?|templates?|frameworks?|playbooks?|databases?|pipelines?)\b/, 'Built'],
    [/\b(campaigns?|activations?|launch(es)?)\b/, 'Executed'], [/\b(events?|fests?|conclaves?|workshops?|sessions?|webinars?)\b/, 'Organised'],
    [/\b(monitoring|tracking|reconciliations?|onboarding|recruitment|hiring|training|operations)\b/, 'Ran'],
    [/\b(negotiations?|implementation|migration|rollout|integration|transformation)\b/, 'Led']];
  function nounVerb(c) { for (var i = 0; i < NOUN_VERB.length; i++) if (NOUN_VERB[i][0].test(c)) return NOUN_VERB[i][1]; return null; }
  function bulletFamily(b, P) {   // outcome language follows what the bullet is about (a credit bullet gets finance outcomes) …
    var jdHits = P.terms.filter(function (x) { return (x.kind === 'must' || x.fromSubArea) && termHit(b.c, x.t); }).length;
    var best = P.domain, bs = domainLexScore(b.c, P.domain).s + 0.15 * jdHits;
    DCODES.forEach(function (d) { var x = domainLexScore(b.c, d).s; if (x > bs + 0.08) { bs = x; best = d; } });
    return familyOf(best);                                                       // … the JD domain only wins ties
  }
  function semicolonTail(core) {   // "…segment; Credit analysis, Industry tracking, Due diligence" → "…segment, covering credit analysis, industry tracking and due diligence"
    var m = /^(.{12,}?)\s*;\s*([A-Za-z][^;]{3,90})$/.exec(core);
    if (!m) return core;
    var items = m[2].split(/\s*,\s*|\s+and\s+/).filter(Boolean);
    if (items.length < 2 || items.some(function (x) { return words(x).length > 4 || looseVerb(canon(words(x)[0])); })) return core;
    var low = items.map(function (x) { return /^[A-Z]{2,}/.test(x) ? x : x.charAt(0).toLowerCase() + x.slice(1); });
    return m[1] + ', covering ' + low.slice(0, -1).join(', ') + ' and ' + low[low.length - 1];
  }
  function rewriteBullet(b, P) {
    var fam = bulletFamily(b, P), t = b.text.replace(/[.;\s]+$/, ''), needs = [], notes = [];
    var core = t.replace(new RegExp('^(?:' + C.ADVERBS.join('|') + ')\\s+', 'i'), function (x) { return ''; }), m;
    core = core.charAt(0).toUpperCase() + core.slice(1);
    core = semicolonTail(core);
    var ownershipCheck = false;
    if ((m = /^(?:was\s+)?(?:responsible for|in charge of|tasked with|duties included?|looked after)\s+/i.exec(core))) core = core.slice(m[0].length);
    else if ((m = /^(?:worked (?:on|with|as)|involved in|engaged in|dealt with)\s+/i.exec(core))) core = core.slice(m[0].length);
    else if ((m = /^(?:helped|assisted|supported)\s+(?:(?:the|a|my|our)\s+)?([\w&'\/ -]{2,40}?)\s+(?:in|with|to|on|for)\s+/i.exec(core))) {
      core = core.slice(m[0].length) + ' for the ' + m[1].trim(); ownershipCheck = true;     // "Assisted the product owner in preparing X" → "Prepared X for the product owner"
    }
    else if ((m = /^(?:helped|assisted)(?:\s+(?:in|with|to))?\s+/i.exec(core))) { core = core.slice(m[0].length); ownershipCheck = true; }
    else if ((m = /^(?:was\s+)?(?:part of|member of)\s+(?:the|a|an)?\s*([\w& -]{0,30}?)(?:team|group|committee|cell)\s*(?:that|which|for|to)?\s*/i.exec(core))) {
      core = core.slice(m[0].length) + ' as part of a [N]-member ' + (m[1] ? m[1].trim() + ' ' : '') + 'team'; needs.push('[N] team size');
    }
    else if ((m = /^(?:participated in|attended)\s+/i.exec(core))) { core = core.slice(m[0].length); ownershipCheck = true; }
    var pm = /^(?:a |an |the )?(?:project|study|report|assignment)\s+(?:on|regarding|about|of)\s+/i.exec(core);
    if (pm) core = (/^\w+ analysis\b/i.test(core.slice(pm[0].length)) ? 'Conducted ' : 'Analysed ') + core.slice(pm[0].length);
    else if ((m = /^(?:learnt|learned|got exposure to|gained exposure to|exposure to)\s+/i.exec(core))) { core = 'Applied ' + core.slice(m[0].length) + ' to [real task]'; needs.push('[real task] where you applied it'); }
    var prefix = '';
    var pr = /^([^:]{3,80}):\s+(.+)$/.exec(core);                                       // "Coordinator, HR Club (XLRI): organised …"
    if (pr && /^[a-z]+ed\b|^[a-z]+ing\b|^(led|built|ran|won|grew|drove|made)\b/i.test(pr[2])) { prefix = pr[1] + ': '; core = pr[2].charAt(0).toUpperCase() + pr[2].slice(1); }
    var semi = /^([^;]{6,80});\s*([a-z]+ed\b.+)$/i.exec(core);                                                    // "HRBP for X; cut time-to-fill …"
    if (semi && verbLemma(canon(words(semi[2])[0])) && !verbLemma(canon(words(semi[1])[0]))) core = cap(semi[2]) + ' (' + semi[1] + ')';
    var toks = words(core), first = toks[0] || '';
    var verb;
    if (/ing$/i.test(first)) { verb = gerundToPast(first); toks[0] = verb; }
    else if (looseVerb(canon(first)) && /ed$|^(led|built|drove|ran|made|wrote|won|sold|grew|cut|set)$/i.test(first)) { verb = cap(first); toks[0] = verb; }
    else if (/^(applied|as)$/i.test(first)) { verb = cap(first); }
    else {
      // add a verb ONLY when the bullet clearly names an activity we can describe honestly; otherwise leave it for the user
      var ot = objectType(canon(core)), nv = nounVerb(canon(toks.slice(0, 5).join(' ')));
      if (/^[a-z]+ed$/i.test(first)) return null;
      if (nv) verb = nv; else if (ot !== '_any' && OBJ_VERB[ot]) verb = OBJ_VERB[ot]; else return null;   // no honest verb → leave the bullet alone
      toks.unshift(verb);
      if (toks[1] && /^[A-Z][a-z]+$/.test(toks[1]) && toks[2] && /^[a-z]/.test(toks[2])) toks[1] = toks[1].toLowerCase();   // keep acronyms & proper nouns
    }
    if (toks[1] && /^[A-Z][a-z]+$/.test(toks[1]) && toks[2] && /^[a-z]/.test(toks[2])) toks[1] = toks[1].toLowerCase();
    for (var ti = 1; ti < toks.length - 1; ti++) if (/^(and|&)$/i.test(toks[ti]) && /ing$/i.test(toks[ti + 1]) && toks[ti + 1].length > 5) toks[ti + 1] = gerundToPast(toks[ti + 1]).toLowerCase();
    if (NEUTRAL[canon(verb.toLowerCase())] && C.DOMAIN_VERBS[fam]) notes.push('If you owned the outcome, a stronger ' + domName(P.domain) + ' verb: ' + C.DOMAIN_VERBS[fam].slice(0, 3).join(' / ') + '.');
    core = toks.join(' ');
    core = core.charAt(0).toUpperCase() + core.slice(1);
    var hasMetric = b.metric && b.metric.outcome, hasScale = b.metric && b.metric.scale;
    var obj = objectType(b.c), famT = C.OUTCOME[fam] || {}, used = P._usedClauses || (P._usedClauses = {});
    if (fam === 'finance' && /\b(portfolio|loan book|borrowers?|firms|exposure)\b/.test(b.c)) obj = 'portfolio';
    var options = [famT[obj], famT._any, C.OUTCOME._default._any].filter(Boolean);
    var tpl = options.filter(function (o) { return !used[o.a]; })[0] || options[0];
    used[tpl.a] = 1;
    var after = core, rf = null;
    if (!hasMetric) {
      var clause = hasScale ? tpl.v : tpl.a, longB = words(core).length > 20 || /;/.test(core);
      after = prefix + core + (longB ? ' — ' + tpl.r.charAt(0).toLowerCase() + tpl.r.slice(1) : clause);
      var gtoks = toks.slice(); gtoks[0] = pastToGerund(gtoks[0] || '');
      for (var gi = 1; gi < gtoks.length - 1; gi++) if (/^(and|&)$/i.test(gtoks[gi]) && /ed$/i.test(gtoks[gi + 1]) && verbLemma(canon(gtoks[gi + 1]))) gtoks[gi + 1] = pastToGerund(gtoks[gi + 1]);
      rf = prefix + tpl.r + ' by ' + gtoks.join(' ');
      ((longB ? tpl.r : clause).match(/\[[^\]]+\]/g) || []).forEach(function (x) { needs.push(x); });
    } else {
      after = prefix + core;
      if (b.cls === 'WEAK' || b.cls === 'NEUTRAL' || b.cls === 'NO_VERB') notes.push('Metric kept as written; the line now opens with what you did.');
    }
    var scope = C.LEVEL_SCOPE[P.level];
    if (scope && !/\b(team|member|\d+ (people|reports))\b/i.test(after) && (P.level === 'MID' || P.level === 'SENIOR')) needs.push('Scope if true: "' + scope.trim() + '"');
    if (ownershipCheck) notes.push('Ownership check: keep "Supported…" if this was mainly someone else\'s work. Overclaiming fails PlaceCom verification and interviews.');
    var w2 = words(after.replace(/^[^:]{3,80}:\s+/, ''));
    if (w2.length > 1 && looseVerb(canon(w2[0])) && looseVerb(canon(w2[1])) && !/^(and|&)$/i.test(w2[1])) return null;   // never "Delivered managed…"
    if (canon(after.replace(/\[[^\]]*\]/g, '')).replace(/[^a-z]/g, '') === canon(b.text).replace(/[^a-z]/g, '')) return null;     // nothing improved
    var evid = P.terms.filter(function (x) { return termHit(b.c, x.t); }).map(function (x) { return x.t; }).slice(0, 4);
    var gapCand = (b._gapHint || null);
    return { bulletId: b.id, section: b.section, before: b.text, after: after, afterResultFirst: rf,
      framework: rf ? 'Google XYZ (action → measure → how) · IIM result-first variant' : 'Verb upgrade (metric already present)',
      needsInput: uniq(needs), jdTermsEvidenced: evid, addIfTrue: gapCand, notes: notes, proof: proofHint(b.section), weakness: b.cls };
  }
  function buildRewrites(R, P, VX) {
    var L = P.level, n = (L === 'MID' || L === 'SENIOR') ? 4 : 3, perRole = {}, out = [];
    var gapTerms = VX.det.skill.gaps.concat(VX.det.skill.listedOnly).filter(function (x) { return x.kind === 'must' || x.kind === 'keyword'; });
    P._usedClauses = {};
    var cands = VX.content.filter(function (b) {
      if (b.section === 'achievements' || b.credential || b.cls === 'RESULT_FIRST' || b.cls === 'NOUN_PHRASE_ACHIEVEMENT') return false;
      if (b.metric.q >= 0.85 && (b.cls === 'STRONG_VERB_RESULT' || b.cls === 'STRONG_VERB')) return false;
      if (b.cls === 'STRONG_VERB' && b.metric.scale && b.rel < 0.35) return false;   // already strong & low JD relevance → leave it alone
      return true;
    }).map(function (b) {
      var vis = (b.section === 'internship' || (b.role && R.roles.indexOf(b.role) === 0)) ? 1 : b.section === 'experience' ? 0.85 : b.section === 'projects' ? 0.8 : 0.65;
      b._prio = (0.45 * b.rel + 0.55 * (1 - 0.5 * b.pts - 0.5 * b.metric.q)) * vis;
      // a JD gap term this bullet could evidence IF true (shared vocabulary with the bullet's domain); never inserted automatically
      var g = gapTerms.filter(function (x) { return domainLexScore(b.c, P.domain).s > 0 && variantsFor(x.t).some(function (v) { return words(canon(v)).some(function (w) { return w.length > 4 && b.c.indexOf(w.replace(/\*/g, '')) >= 0; }); }); })[0];
      b._gapHint = g ? g.t : null;
      return b;
    }).sort(function (a, b) { return b._prio - a._prio; });
    cands.forEach(function (b) {
      if (out.length >= n || b._prio < 0.12) return;
      var key = b.role ? R.roles.indexOf(b.role) : b.section;
      if ((perRole[key] || 0) >= 2) return;
      var rw = rewriteBullet(b, P);
      if (!rw) return;
      perRole[key] = (perRole[key] || 0) + 1;
      out.push(rw);
    });
    return out;
  }

  /* ============================================================ 8. Certifications, projects & competitions */
  var CERT_JD_RE = { CFA1: /\bcfa\b/, FRM1: /\bfrm\b/, NISM8: /nism[^;]*(viii|\b8\b)|equity derivatives/, NISM15: /nism[^;]*(xv|\b15\b)|research analyst/, NISM5A: /nism[^;]*v-?a|mutual[- ]fund distribution/,
    GADS: /google ads|google analytics|ga4/, META: /meta blueprint/, HUBSPOT: /hubspot/, PL300: /power bi|pl-?300/, TABLEAU: /tableau/, GDA: /google data analytics/, LSSGB: /six sigma|green belt|lean/,
    CSCP: /cscp/, CPIM: /cpim/, SHRMCP: /shrm/, ECBA: /ecba|iiba/, CSPO: /cspo|pspo|scrum|product owner/, SAP: /\bsap\b/, PMP: /\bpmp\b/, CAPM: /capm/, SFDC: /salesforce/, ESGC: /\bgri\b|esg|brsr/, IC38: /ic-?38|irdai/, NABH: /nabh/, SQLC: /\bsql\b/, PYDS: /python/, FMOD: /financial model/ };
  function userSuggestLevel(R) { return R.isStudent ? 'CAMPUS' : R.userLevel; }
  function gapTermList(VX) { return VX.det.skill.gaps.concat(VX.det.skill.listedOnly); }
  function suggestCertifications(R, P, VX) {
    var ul = userSuggestLevel(R);
    var custom = P.source !== 'library';
    var jdC = canon(custom ? [P.certRequired.join(' ; '), P.goodToHave, P.det ? P.det.zones.reqC : ''].join(' ; ') : [P.certPreferred.join(' ; '), P.certRequired.join(' ; '), P.goodToHave].join(' ; '));
    var benchC = canon(P.certPreferred.join(' ; '));
    var subCerts = P.subArea ? (C.SUBAREAS.filter(function (x) { return x.key === P.subArea.key; })[0] || {}).certs || [] : [];
    var hasL2 = /\bcfa\b[^.\n]{0,60}\blevel (ii|2)\b|\blevel (ii|2)\b[^.\n]{0,40}\bcfa\b|\bchartered financial analyst\b[^.\n]{0,40}\blevel (ii|2)\b/.test(R.canon);
    var ACT = { NISM15: /research report|publish(ing)? research|equity research|initiat\w* coverage/, NISM5A: /mutual fund|amfi|wealth/, NISM8: /derivativ|f&o|dealing|trading desk|broking/, IC38: /insurance|bancassurance/ };
    var gaps = gapTermList(VX).map(function (x) { return x.t; });
    var jdAllC = P.det ? P.det.zones.allC : canon(P.rec.responsibilities.join(' ') + ' ' + P.rec.summary);
    var out = C.CERTS.filter(function (c) {
      if (c.lv.indexOf(ul) < 0 && !(ul === 'CAMPUS' && R.fullTimeMonths >= 24 && c.lv.indexOf('EARLY') >= 0)) return false;
      if (R.certIds.indexOf(c.id) >= 0 || (c.id === 'GADS' && R.certIds.indexOf('GADS') >= 0)) return false;
      if (c.gate && R.fullTimeMonths < c.gate) return false;
      if (c.needs === 'CFA_L2' && !hasL2) return false;
      if (c.id === 'CFA1' && hasL2) return false;
      if (ACT[c.id] && !ACT[c.id].test(jdAllC) && !(CERT_JD_RE[c.id] && CERT_JD_RE[c.id].test(jdC))) return false;
      return true;
    }).map(function (c) {
      var inJD = CERT_JD_RE[c.id] ? CERT_JD_RE[c.id].test(jdC) : false;
      var inBench = !inJD && CERT_JD_RE[c.id] ? CERT_JD_RE[c.id].test(benchC) : false;
      var inSub = subCerts.indexOf(c.id) >= 0;
      var dom = c.d.indexOf(P.domain) >= 0 ? 1 : (P.secondary && c.d.indexOf(P.secondary) >= 0) || (P.industry && c.d.indexOf(P.industry) >= 0) ? 0.7 : C.DOMAINS[P.domain].adj.some(function (a) { return c.d.indexOf(a) >= 0; }) ? 0.35 : 0;
      var covered = c.covers.filter(function (t) { return gaps.some(function (g) { return g === t || canon(g).indexOf(canon(t)) >= 0 || canon(t).indexOf(canon(g)) >= 0; }); });
      var cov = Math.min(1, covered.length / 2);
      var cr = c.cr === 1 ? 1 : c.cr === 2 ? 0.6 : 0.3;
      var heavy = /USD 1,|\$1,|~300|~240|100–150|80–120/.test(c.cost + ' ' + c.time);
      var quick = /week|days|free/i.test(c.time + c.cost) ? 1 : 0.4;
      if (inSub) dom = 1;
      var s = 0.32 * (inJD ? 1 : 0) + 0.22 * (inSub ? 1 : 0) + (custom ? 0.08 : 0.3) * (inBench ? 1 : 0) + 0.18 * dom + 0.16 * cov + 0.06 * cr + 0.04 * (ul === 'CAMPUS' ? quick : 1);
      if (P.subArea && !inSub && !inJD && !cov) s *= 0.5;                       // generic domain certs rank below role-specific ones
      if (dom === 0 && !inJD) s = 0;
      if (!inJD && !inSub && !covered.length && !(dom === 1 && c.cr === 1)) s = 0;
      var why = inJD ? (custom ? 'Mentioned in this JD' : 'Listed as preferred for the ' + P.id + ' benchmark')
        : covered.length ? 'Closes your gap in ' + covered.slice(0, 2).map(disp).join(' & ') + (inSub ? ' (core for ' + P.subArea.label + ' roles)' : '')
        : inSub ? 'Relevant for ' + P.subArea.label + ' roles'
        : inBench ? 'Commonly preferred for ' + domName(P.domain) + ' roles at this level'
        : 'Recognised ' + domName(P.domain) + ' credential that recruiters filter on';
      return { id: c.id, name: c.n, why: why, cost: c.cost, time: c.time, credibility: ['', 'High', 'Medium', 'Low'][c.cr], note: c.note, verify: c.v, score: round(s, 3), heavy: heavy, inJD: inJD, covers: covered };
    }).filter(function (x) { return x.score >= 0.3; }).sort(function (a, b) { return b.score - a.score; });
    var picked = [], heavyUsed = false;
    out.forEach(function (x) { if (picked.length >= 3) return; if (x.heavy && heavyUsed) return; if (x.heavy) heavyUsed = true; picked.push(x); });
    picked.forEach(function (x) { x.planner = C.PLANNER_HOOKS.certs; });
    if (P.certConditional && P.certConditional.length) picked.conditionalNotes = P.certConditional.slice(0, 3);
    return picked;
  }
  function suggestProjects(R, P, VX) {
    var ul = userSuggestLevel(R), gaps = gapTermList(VX), gapNames = gaps.map(function (x) { return x.t; });
    var subKey = P.subArea ? (C.SUBAREAS.filter(function (x) { return x.key === P.subArea.key; })[0] || {}).projects : null;
    if (ul === 'MID' || ul === 'SENIOR' || (!R.isStudent && R.userLevel !== 'CAMPUS' && R.userLevel !== 'EARLY')) {
      var g = gapNames.slice(0, 2);
      var samples = (C.PROJECTS[subKey] || C.PROJECTS[P.domain] || []).filter(function (p) { return p.lv.indexOf(ul) >= 0 || p.lv.indexOf('MID') >= 0; }).map(function (p) {
        var hit = p.s.filter(function (x) { return gapNames.some(function (gn) { return gn === x || canon(gn).indexOf(canon(x)) >= 0 || canon(x).indexOf(canon(gn)) >= 0; }); });
        return { name: 'Work sample: ' + p.n, why: hit.length ? 'Shows ' + hit.slice(0, 3).map(disp).join(', ') + ', which your resume does not yet evidence' : 'Interview-ready proof for ' + (P.subArea ? P.subArea.label : domName(P.domain)) + ' roles', weeks: p.w, proof: p.proof, hits: hit.length };
      }).sort(function (a, b) { return b.hits - a.hits; }).slice(0, 2);
      return { mode: 'INITIATIVE', projects: samples.concat([{ name: C.INITIATIVES[ul] || C.INITIATIVES._default,
        why: g.length ? 'Your resume does not yet evidence ' + g.map(disp).join(' & ') + ', which ' + (P.title || 'the role') + ' asks for. Use a real initiative to show it.' : 'Senior screens read scope and outcomes, not coursework.',
        evidence: 'Before/after metric, team size, budget, stakeholder level', planner: C.PLANNER_HOOKS.oneToOne }]).slice(0, 3), competitions: [] };
    }
    var pool = [];
    function addPool(d, k) { (C.PROJECTS[d] || []).forEach(function (p) { pool.push({ p: p, d: C.PROJECTS[d] && C.DOMAINS[d] ? d : P.domain, k: k }); }); }
    if (subKey && subKey !== P.domain) addPool(subKey, 1.15);
    addPool(P.domain, 1); if (P.secondary) addPool(P.secondary, 0.7); if (P.industry && P.industry !== P.domain) addPool(P.industry, 0.7);
    var scored = pool.filter(function (x) { return x.p.lv.indexOf(ul) >= 0 || (ul === 'EARLY' && x.p.lv.indexOf('CAMPUS') >= 0); }).map(function (x) {
      var hit = x.p.s.filter(function (s) { return gapNames.some(function (g) { return g === s || canon(g).indexOf(canon(s)) >= 0 || canon(s).indexOf(canon(g)) >= 0; }); });
      var already = x.p.s.filter(function (s) { return termHit(R.canon, s); }).length / x.p.s.length;
      var sc = 0.5 * Math.min(1, hit.length / 2) + 0.3 * x.k + 0.2 * (1 - already);
      return { name: x.p.n, domain: domName(x.d), closes: hit, weeks: x.p.w, proof: x.p.proof, score: round(sc, 3),
        why: hit.length ? 'Builds evidence for ' + hit.slice(0, 3).map(disp).join(', ') + ' (missing, or only in your skills list)' : 'Core ' + domName(x.d) + ' proof-of-work for ' + C.LEVELS[ul].n + '-level roles' };
    }).sort(function (a, b) { return b.score - a.score; });
    var projects = scored.slice(0, 3);
    projects.forEach(function (p) { p.planner = C.PLANNER_HOOKS.rewrite; });
    var tier = R.school ? R.school.t : 3;
    var comps = R.isStudent || ul === 'CAMPUS' ? C.COMPETITIONS.filter(function (c) {
      var dm = c.d.indexOf(P.domain) >= 0 || (P.secondary && c.d.indexOf(P.secondary) >= 0);
      if (!dm) return false;
      if (c.open === 'invite' && tier > 1) return false;
      return true;
    }).map(function (c) { return { name: c.n, window: c.win, eligibility: c.open === 'all' ? 'Open to MBA/PGDM students' : c.open === 'invite' ? 'Invite-only B-schools; check with your PlaceCom' : 'Listed campuses; check if yours is on the list', verify: c.v, note: 'Verify current season dates before applying' }; }).slice(0, 2) : [];
    return { mode: 'PROJECT', projects: projects, competitions: comps };
  }

  /* ============================================================ 9. Priority Fixes engine (ranked by points recoverable, one per family, always evidence-cited) */
  function buildFixes(R, P, VX, w, report) {
    var V = VX.V, det = VX.det, L = P.level, d = P.domain, fam = familyOf(d), dn = domName(d), jt = P.title || dn, out = [];
    var sw = P.terms.reduce(function (a, x) { return a + x.w; }, 0) || 1, cov = det.skill.coverage;
    function v1(c) { return Math.pow(Math.min(1, c / 0.8), 0.9); }
    function add(f) { if (f && f.gain >= 0.8) out.push(f); }
    var bestBullet = VX.content.slice().sort(function (a, b) { return b.rel - a.rel; })[0];
    // 1. JD terms only in the Skills list → move into a bullet
    if (det.skill.listedOnly.length) {
      var lo = det.skill.listedOnly.slice().sort(function (a, b) { return b.w - a.w; }).slice(0, 3);
      var dc = lo.reduce(function (a, x) { return a + x.w * 0.45; }, 0) / sw;
      var target = VX.content.filter(function (b) { return domainLexScore(b.c, d).s > 0; }).sort(function (a, b) { return b.rel - a.rel; })[0] || bestBullet;
      add({ family: 'JD_EVIDENCE', vector: 'V1', gain: w.skill * (v1(cov + dc) - v1(cov)),
        title: 'Prove ' + lo.map(function (x) { return disp(x.t); }).join(', ') + ' inside a bullet',
        why: jt + ' lists ' + (lo.some(function (x) { return x.kind === 'must'; }) ? 'must-haves' : 'keywords') + ' that appear only in your Skills section. Recruiter keyword search and the shortlisting panel both look for them in experience lines.',
        action: target ? 'Add the tool or skill where you actually used it, for example in: "' + trimQuote(target.text) + '". Name it and attach the outcome.' : 'Add one bullet showing where you used each one, with an outcome.',
        quote: target ? target.text : null, jdPhrase: lo.map(function (x) { return disp(x.t); }), effort: '10 min' });
    }
    // 2. Must-haves with no evidence at all
    var mg = det.skill.gaps.filter(function (x) { return x.kind === 'must'; }).slice(0, 2);
    if (mg.length) {
      var dc2 = mg.reduce(function (a, x) { return a + x.w; }, 0) / sw;
      add({ family: 'MUST_HAVE_GAP', vector: 'V1', gain: w.skill * (v1(cov + dc2) - v1(cov)) * 0.5,
        title: 'Close the must-have gap: ' + mg.map(function (x) { return disp(x.t); }).join(' & '),
        why: (P.thin ? 'These are core skills for ' + (P.subArea ? P.subArea.label : dn) + ' roles at ' + C.LEVELS[L].n + ' level (inferred from the job title, because the link could not be read)' : 'These are must-haves for ' + jt + ' (' + dn + ' · ' + C.LEVELS[L].n + ')') + ', and nothing in your resume shows them yet.',
        action: (L === 'CAMPUS' ? 'If you have done this in an internship, live project or course project, add one bullet that shows it with a result. If not, use the project or certification cards below to build the evidence before applying.'
          : 'If you have owned this, add one bullet per role with its scale and outcome (volume, ₹, %, compliance result). If it sits with another team, name your part in it. Otherwise flag it as a development area before applying.'),
        quote: null, jdPhrase: mg.map(function (x) { return disp(x.t); }), effort: L === 'CAMPUS' ? '2–4 weeks (project)' : '1 week' });
    }
    // 3. Quantify the most JD-relevant unquantified bullets
    var uq = det.impact.unquantified.slice().sort(function (a, b) { return b.rel - a.rel; }).slice(0, 2);
    if (uq.length) {
      var qD = VX.content.reduce(function (a, b) { return a + b.relW; }, 0) || 1;
      var newShare = det.impact.quantifiedShare + uq.reduce(function (a, b) { return a + b.relW; }, 0) / qD;
      var tgt = fam === 'finance' ? 0.45 : 0.55;
      var dv = 0.65 * (Math.min(1, newShare / tgt) - Math.min(1, det.impact.quantifiedShare / tgt)) + 0.35 * (0.85 - det.impact.depthTop5) * (uq.length / 5);
      add({ family: 'QUANTIFY', vector: 'V4', gain: w.impact * Math.max(0, dv),
        title: 'Put a number on your ' + (uq[0].section === 'internship' ? 'internship' : uq[0].section === 'experience' ? 'most relevant work' : uq[0].section) + ' bullets',
        why: (L === 'CAMPUS' ? 'Campus shortlists for ' + dn : dn + ' screens at ' + C.LEVELS[L].n + ' level') + ' compare outcomes, not activities. ' + Math.round(100 * (1 - det.impact.quantifiedShare)) + '% of your JD-relevant bullets have no outcome metric.',
        action: 'Rewrite "' + trimQuote(uq[0].text, 110) + '"' + (uq[1] ? ' and "' + trimQuote(uq[1].text, 80) + '"' : '') + ' with one of: ' + ((P.subArea && C.METRIC_MENU_SUB[P.subArea.key]) || C.METRIC_MENU[d]) + '. Use only numbers you can prove.',
        quote: uq[0].text, jdPhrase: null, effort: '15 min' });
    }
    // 4. Weak openers (only bullet openers count)
    var wk = det.bullets.weak;
    if (wk.length) {
      var nC = VX.content.length || 1;
      var dmean = wk.reduce(function (a, b) { return a + (0.78 - b.pts) * b.relW; }, 0) / VX.content.reduce(function (a, b) { return a + b.relW; }, 0);
      var phrases = uniq(wk.map(function (b) { return b.weakPhrase; })).slice(0, 3);
      add({ family: 'WEAK_OPENERS', vector: 'V5', gain: w.bullets * 0.85 * dmean,
        title: wk.length + ' bullet' + (wk.length > 1 ? 's open' : ' opens') + ' with passive phrasing',
        why: '"' + phrases.join('", "') + '" read as attendance, not ownership. Panels skim the first 3–4 words of each line.',
        action: 'Lead with the action you owned or the result, e.g. ' + (C.DOMAIN_VERBS[fam] || C.DOMAIN_VERBS.general).slice(0, 4).join(', ') + '. Start with: "' + trimQuote(wk[0].text, 110) + '". See the rewrites below.',
        quote: wk[0].text, jdPhrase: null, effort: '10 min' });
    }
    // 5. Verb repetition
    if (det.bullets.repeated.length) {
      add({ family: 'VERB_VARIETY', vector: 'V5', gain: w.bullets * 0.03 * det.bullets.repeated.length + 0.8,
        title: 'Vary repeated lead verbs (' + det.bullets.repeated.slice(0, 2).join(', ') + ')',
        why: 'The same opener used more than twice flattens a one-page CV and hides the range of your work.',
        action: 'Swap a few for ' + dn + ' verbs: ' + (C.DOMAIN_VERBS[fam] || []).join(', ') + '.', quote: null, jdPhrase: null, effort: '5 min' });
    }
    // (Headline / title-alignment suggestions were removed in v3.1 at the founders' request; title alignment is still scored in V2.)
    // 7. Internship framing (Campus)
    var intern = R.roles.filter(function (r) { return r.isIntern; })[0];
    if (L === 'CAMPUS' && intern && det.exp.bestInternRelevance < 0.6) {
      add({ family: 'INTERNSHIP_FRAMING', vector: 'V3', gain: w.exp * 0.55 * (0.7 - det.exp.bestInternRelevance) * 0.8,
        title: 'Reframe your ' + (intern.company ? intern.company.n : 'summer') + ' internship toward ' + dn,
        why: 'For Campus roles the summer internship is the main experience signal. Yours currently reads as ' + (intern.titleText || 'general') + ' rather than ' + dn + '.',
        action: 'Lead the internship block with its most ' + dn + '-relevant result, add a one-line project objective, and name the JD terms you genuinely used' + (det.skill.listedOnly[0] ? ' (e.g. ' + det.skill.listedOnly[0].t + ')' : '') + '.',
        quote: intern.bullets[0] ? intern.bullets[0].text : null, jdPhrase: null, effort: '20 min' });
    }
    // 8. Leadership / scope
    if (V.lead < 0.6) {
      var porNoScale = det.lead.porLines.filter(function (l) { return !METRIC_SCALE.test(canon(l)) && !/₹/.test(l); })[0];
      var txt = L === 'CAMPUS'
        ? (porNoScale ? { t: 'Add scale to your position of responsibility', a: 'Quantify "' + trimQuote(porNoScale, 100) + '": team size, budget (₹), reach / participants and the outcome. If you were a member, name your specific contribution.' }
                      : { t: 'Add a Positions of Responsibility / achievements block', a: 'List 2–3 PoRs, competitions or ranks with scale (team size, participants, ranking out of N). Campus shortlists use them as tie-breakers.' })
        : L === 'EARLY' ? { t: 'Show ownership scope in each role', a: 'State what you owned in each role: ' + (C.OWNERSHIP[fam] || C.OWNERSHIP.general) + '. Add promotions with dates' + (bestBullet ? '. Start with "' + trimQuote(bestBullet.text, 90) + '"' : '') + '.' }
        : { t: 'State team size and ₹ budget / P&L for every role', a: (L === 'SENIOR' ? 'Senior screens read P&L or function scope first: ' : 'Mid-level screens read team and budget scope first: ') + 'add "led an [N]-member team", "₹[X] Cr P&L / budget" and promotions to each role header line.' };
      add({ family: 'LEADERSHIP_SCOPE', vector: 'V6', gain: w.lead * (0.75 - V.lead) * 0.7, title: txt.t,
        why: dn + ' recruiters at ' + C.LEVELS[L].n + ' level look for ' + (L === 'CAMPUS' ? 'leadership spikes and competition results.' : L === 'EARLY' ? 'evidence that you owned a workstream and guided others.' : 'team leadership and budget ownership.'),
        action: txt.a, quote: porNoScale || null, jdPhrase: null, effort: '10 min' });
    }
    // 9. Experience / level mismatch → advisory plus a level-appropriate benchmark (cannot be fixed by editing)
    if (det.exp.gapMonths >= 18) {
      var alt = recordFor(d, levelFromMonths(R.fullTimeMonths));
      report.advisories.push({ type: 'LEVEL_GAP', text: jt + ' expects about ' + Math.round(P.minMonths / 12) + '+ years; your resume shows ' + round(R.fullTimeMonths / 12, 1) + ' years of full-time experience. Treat this as a stretch application, or benchmark against ' + alt.id + '.' });
    }
    if (det.exp.overqualified) report.advisories.push({ type: 'OVERQUALIFIED', text: 'Your experience is well above this JD\'s band (' + P.maxYears + ' yrs max). Recruiters may screen you out as over-qualified. Consider the ' + recordFor(d, levelFromMonths(R.fullTimeMonths)).id + ' benchmark.' });
    // 10. Certification gap (only when the JD values one)
    if (P.certPreferred.length && det.edu.certScore < 0.7 && report._certs && report._certs[0]) {
      add({ family: 'CERT_GAP', vector: 'V7', gain: w.edu * 0.30 * (1 - det.edu.certScore) * 0.6 + 0.5,
        title: 'Add a JD-valued credential: ' + report._certs[0].name,
        why: report._certs[0].why + '. ' + (L === 'CAMPUS' ? 'At Campus level an in-progress credential with a date ("exam booked: Dec 2026") is a credible signal.' : 'It strengthens the credentials line recruiters filter on.'),
        action: 'Start it this month and list it with a status and date. Cost ' + report._certs[0].cost + ', about ' + report._certs[0].time + '.', quote: null, jdPhrase: P.certPreferred.slice(0, 2), effort: report._certs[0].time });
    }
    // 11. Specialisation not stated (Campus/Early)
    if ((L === 'CAMPUS' || L === 'EARLY') && !R.spec.length && P.prefSpec.length) {
      add({ family: 'SPECIALISATION', vector: 'V7', gain: w.edu * 0.25 * 0.5 + 0.4, title: 'State your MBA specialisation',
        why: 'The JD prefers a ' + P.prefSpec.join(' / ') + ' specialisation and your education line does not state one.',
        action: 'Write it in the degree line, e.g. "MBA – ' + P.prefSpec[0] + '" (only if true).', quote: null, jdPhrase: P.prefSpec, effort: '1 min' });
    }
    // 12. Structure & contact
    if (V.struct < 0.85) {
      var miss = det.struct.missing.map(function (m) { return Array.isArray(m) ? m.join(' / ') : m; });
      var ct = []; if (!det.struct.contact.email) ct.push('email'); if (!det.struct.contact.phone) ct.push('mobile'); if (!det.struct.contact.linkedin) ct.push('LinkedIn URL');
      add({ family: 'STRUCTURE', vector: 'V8', gain: w.struct * (0.95 - V.struct),
        title: miss.length ? 'Add the missing section' + (miss.length > 1 ? 's' : '') + ': ' + miss.join(', ') : 'Complete your contact line',
        why: (L === 'CAMPUS' ? 'Campus CVs are read bucket by bucket (Academics, Internships, Projects/PoR, Achievements).' : 'Lateral CVs need Experience, Education and Skills to parse cleanly.') + (ct.length ? ' Missing contact details: ' + ct.join(', ') + '.' : ''),
        action: miss.length ? 'Create clearly labelled headings for ' + miss.join(', ') + ' and move existing content under them.' : 'Add ' + ct.join(', ') + ' to the header line.', quote: null, jdPhrase: null, effort: '5 min' });
    }
    // 13. Generic objective / filler (common on Tier-2/3 CVs)
    var fill = C.FILLER.filter(function (f) { return new RegExp('\\b' + esc(f) + '\\b').test(R.summaryText); });
    if (fill.length || /\b(to work in a reputed|seeking a challenging|utili[sz]e my skills)\b/.test(R.summaryText)) {
      add({ family: 'OBJECTIVE', vector: 'V8', gain: 1.2, title: 'Replace the generic objective with a 1-line flag line',
        why: 'Objective statements' + (fill.length ? ' with words like "' + fill.slice(0, 2).join('", "') + '"' : '') + ' use prime space without evidence. Panels read the top third of page 1 most closely.',
        action: 'Replace it with 3 proof points from different buckets, e.g. "' + dn + ' internship at [company] · [rank/competition] · [certification]".', quote: (R.sections.summary || [])[0] || null, jdPhrase: null, effort: '5 min' });
    }
    // 14. Length
    if (V.length < 0.8) {
      var lb = det.length.longBullets[0];
      add({ family: 'LENGTH', vector: 'V9', gain: w.length * (0.95 - V.length),
        title: det.length.pages && det.length.pages > (L === 'CAMPUS' || L === 'EARLY' ? 1 : 2) ? 'Cut to ' + det.length.pageRule : 'Tighten long bullets',
        why: 'Your CV runs ' + (det.length.pages ? det.length.pages + ' page(s)' : det.length.words + ' words') + '; the norm at ' + C.LEVELS[L].n + ' level is ' + det.length.pageRule + '.' + (lb ? ' Some bullets run past 2 lines.' : ''),
        action: lb ? 'Split or trim: "' + trimQuote(lb.text, 100) + '". Drop low-relevance lines (hobbies, school-level activities) first.' : 'Drop low-relevance lines (hobbies, generic skills, school-level activities) and keep bullets to one or two lines.', quote: lb ? lb.text : null, jdPhrase: null, effort: '20 min' });
    }
    // 15. Parse health
    if (V.ats < 0.6) add({ family: 'PARSE', vector: 'V10', gain: w.ats * (0.95 - V.ats) + 1, title: 'Your file may not parse cleanly',
      why: 'We extracted ' + det.ats.words + ' words and ' + det.ats.headings + ' headings' + (det.ats.garbled ? ', with garbled characters' : '') + '. Recruiter ATS tools may see the same.',
      action: 'Export a single-column PDF from Word or Google Docs (not a scan or image), with standard headings and dates as "Mon YYYY – Mon YYYY".', quote: null, jdPhrase: null, effort: '15 min' });
    out.sort(function (a, b) { return b.gain - a.gain; });
    var fams = {}, picked = [];
    out.forEach(function (f) { if (picked.length >= 4 || fams[f.family]) return; fams[f.family] = 1; picked.push(f); });
    picked.forEach(function (f, i) { f.rank = ('0' + (i + 1)); f.impact = i === 0 ? 'Highest impact' : f.gain >= 3 ? 'High impact' : f.gain >= 1.5 ? 'Medium impact' : 'Tactical polish'; f.gain = round(f.gain, 1); });
    return picked;
  }

  /* ============================================================ 10. Orchestration */
  function analyse(input) {
    need(); input = input || {};
    var today = input.today || new Date();
    var R = parseResume(input.resumeText, { pageCount: input.pageCount, profile: input.profile, today: today });
    var P = buildJdProfile(input.jd); P._today = today;
    var VX = computeVectors(R, P);
    var w = weightsFor(P.level, P.domain);
    var vectors = C.VECTORS.map(function (v) { return { id: v.id, key: v.key, label: v.label, score: round(w[v.key] * VX.V[v.key], 1), max: round(w[v.key], 1), pct: Math.round(100 * VX.V[v.key]), jdDependent: v.jd }; });
    var raw = vectors.reduce(function (a, v) { return a + v.score; }, 0);
    var gates = [], capAt = 100;
    if (VX.V.ats < 0.45) { capAt = Math.min(capAt, 60); gates.push({ code: 'PARSE', text: 'Resume text could not be parsed reliably. Score capped at 60 until the file is fixed.' }); }
    if (VX.det.exp.gapMonths >= 18) { capAt = Math.min(capAt, 69); gates.push({ code: 'LEVEL_GAP', text: 'Experience is ' + round(VX.det.exp.gapMonths / 12, 1) + ' years below this JD\'s minimum. Score capped at 69.' }); }
    if (VX.det.exp.overqualified && P.level === 'CAMPUS') { capAt = Math.min(capAt, 72); gates.push({ code: 'OVERQUALIFIED', text: 'Your ' + round(R.fullTimeMonths / 12, 1) + ' years of experience is far above this campus-level JD. Score capped at 72; benchmark against a ' + C.LEVELS[R.userLevel].n + '-level JD instead.' }); }
    if (!VX.det.edu.degreeOK && P.requiredDegrees.length) { capAt = Math.min(capAt, 69); gates.push({ code: 'DEGREE', text: 'This JD requires an MBA/PGDM (or equivalent) and none was detected in your education section.' }); }
    if (VX.det.edu.requiredMissing.length) { capAt = Math.min(capAt, 69); gates.push({ code: 'CREDENTIAL', text: 'Required credential not found: ' + VX.det.edu.requiredMissing.join(', ') + '.' }); }
    var total = Math.round(Math.min(raw, capAt));
    var band = bandOf(total), gateNotice = null;
    if (band.name === 'STRONG' && VX.det.skill.mustShare < 0.4) {   // Mandatory Role-Keyword Gate (governance rule, preserved)
      band = C.BANDS[1];
      gateNotice = 'Overall score meets the 75-point threshold, but role-keyword relevance is below the benchmark (fewer than 40% of this JD\'s must-haves are evidenced). Rating capped at Moderate.';
    }
    var report = { version: VERSION, generatedAt: today.toISOString(), advisories: [],
      level: { user: R.userLevel, userMonths: R.fullTimeMonths, internMonths: R.internMonths, isStudent: R.isStudent, target: P.level },
      jd: { id: P.id, source: P.source, title: P.displayTitle || P.title, subArea: P.subArea || null, thin: !!P.thin, employer: P.employer || null, domain: P.domain, domainName: domName(P.domain), secondary: P.secondary, industry: P.industry,
            confidence: P.confidence, askUser: !!P.askUser, level: P.level, blendedWithLibrary: !!P.blended,
            mustHave: P.terms.filter(function (x) { return x.kind === 'must'; }).map(function (x) { return disp(x.t); }), evidence: P.det ? P.det.evidence : null, levelBasis: P.det ? P.det.levelBasis : 'library' },
      candidate: { school: R.school ? { name: R.school.n, tier: R.school.t } : null, specialisation: R.spec.map(function (s) { return s[0]; }), certifications: R.certIds,
                   roles: R.roles.map(function (r) { return { company: r.company ? r.company.n : null, title: r.titleText, months: r.months, internship: r.isIntern }; }) },
      totalScore: total, rawScore: round(raw, 1), band: band.name, bandSymbol: band.sym, gateNotice: gateNotice, gates: gates,
      vectors: vectors, weights: w,
      details: JSON.parse(JSON.stringify(VX.det, function (k, v) { return ((k === 'role' && v && v.bullets) || k === 'c' || k === '_prio' || k === '_gapHint' || k === 'company') ? undefined : v; })) };   // Firestore-safe (no cycles)
    if (P.thin) report.advisories.push({ type: 'JD_THIN', text: (P.link && !P.link.readable ? 'We could not read a job title from this link.' : 'We could only read the job title from this link (' + (P.displayTitle || P.title) + ').') +
      ' Websites cannot open other companies\' job pages from your browser, so skills were inferred from the title' + (P.subArea ? ' and the ' + P.subArea.label + ' benchmark' : ' and the ' + domName(P.domain) + ' benchmark') + '. Paste the full JD text for an exact match.' });
    if (P.askUser) report.advisories.push({ type: 'CONFIRM_DOMAIN', text: 'We are not fully sure this JD is ' + domName(P.domain) + '. Please confirm the target domain.' });
    report.domainSuitability = { ranking: VX.DS.ranking.slice(0, 6).map(function (x) { return { code: x.d, name: x.name, score: x.score, tier: x.tier, signals: x.signals, evidence: x.evidence }; }),
      confidence: VX.DS.confidence, insight: suitabilityInsight(VX.DS, P.domain, R), pastDomain: VX.DS.pastDomain, emergingDomain: VX.DS.emergingDomain, switcher: VX.DS.switcher };
    report._certs = suggestCertifications(R, P, VX);
    report.certifications = report._certs;
    report.projects = suggestProjects(R, P, VX);
    report.rewrites = buildRewrites(R, P, VX);
    report.priorityFixes = buildFixes(R, P, VX, w, report);
    report.bulletDiagnostics = VX.content.map(function (b) { return { id: b.id, section: b.section, class: b.cls, points: round(b.pts, 2), metric: b.metric.q, jdRelevance: round(b.rel, 2), text: trimQuote(b.text, 90) }; });
    delete report._certs;
    return report;
  }

  return { _internal: { canon: canon, compilePhrase: compilePhrase, termHit: termHit, domainLexScore: domainLexScore, splitLibTerm: splitLibTerm,
           variantsFor: variantsFor, disp: function (t) { return disp(t); }, levelFromMonths: levelFromMonths, familyOf: familyOf, domName: domName, recordFor: recordFor, clip: clip, sat: sat,
           round: round, uniq: uniq, words: words, esc: esc, cap: cap, trimQuote: trimQuote, GLYPH: GLYPH, idx: function () { return IDX; } },
           VERSION: VERSION, init: init, analyse: analyse, parseJobUrl: function (u) { need(); return parseJobUrl(u); }, repairText: repairText, parseResume: parseResume, buildJdProfile: buildJdProfile, detectDomainFromJdV3: detectDomainFromJdV3,
           calculateDomainSuitabilityV3: calculateDomainSuitabilityV3, classifyBullet: classifyBullet, weightsFor: weightsFor, C: C };
});
