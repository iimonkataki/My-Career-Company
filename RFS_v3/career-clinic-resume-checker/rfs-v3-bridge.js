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
    else jd = { mode: 'custom', text: o.jdText || o.jdUrl || '', title: o.jdTitle && !/\.(pdf|docx)$/i.test(o.jdTitle) ? o.jdTitle : '', url: o.jdUrl || '', domainOverride: o.domainOverride || null, levelOverride: o.levelOverride || null };
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
      return { key: x.code, label: x.name, shortLabel: x.name, icon: ICONS[x.code] || '•', score: x.score, fitTier: tier, fitLabel: x.tier,
        matchedCount: x.signals.length, totalKeywords: 10, topSignals: x.signals.map(function (s) { return SIG[s] || s; }), isTarget: x.code === target };
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
      v3: { jd: rep.jd, level: rep.level, candidate: rep.candidate, gates: rep.gates, advisories: rep.advisories, certifications: rep.certifications,
            projects: rep.projects, weights: rep.weights, bulletDiagnostics: rep.bulletDiagnostics, domainInsight: ds.insight },
      detectedDomain: target, targetRoleKey: LEGACY_KEY[target] || 'consulting', jdMode: jd.mode + (edited ? ' (edited benchmark)' : '')
    };
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
    return { label: j.domainName + (j.industry ? ' · ' + (root.RFSv3.C.DOMAINS[j.industry] || {}).n : ''), shortLabel: j.domainName, icon: ICONS[j.domain] || '🎯',
             certifications: certs, projects: projects };
  }
  /* For JD intake handlers: returns the legacy role key (for state.targetRole) plus the full v3 detection. */
  function detectJd(text, title, url) {
    ensureInit();
    var det = root.RFSv3.detectDomainFromJdV3(text || url || '', { title: title, url: url });
    return { legacyKey: LEGACY_KEY[det.domain] || 'consulting', code: det.domain, name: det.domainName, secondary: det.secondary, level: det.level,
             confidence: det.confidence, askUser: det.askUser, label: det.domainName + (det.secondary ? ' / ' + root.RFSv3.C.DOMAINS[det.secondary].n : '') + ' · ' + levelLabel(det.level) };
  }
  root.RFSv3Bridge = { score: score, roleMeta: roleMeta, detectJd: detectJd, LEGACY_KEY: LEGACY_KEY, ICONS: ICONS };
})(typeof window !== 'undefined' ? window : this);
