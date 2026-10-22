/* node test/run-regression.js  — prints current-vs-v3 comparisons and checks the acceptance targets. */
var E = require('../career-clinic-resume-checker/fit-engine-v3.js'), LEG = require('./legacy-actual.js'), lib = require('./jd_library_v2.json'), F = require('./fixtures.js');
E.init(lib);
var TODAY = new Date(2026, 9, 22);
function rec(id) { return lib.filter(function (r) { return r.id === id; })[0]; }
var MATRIX = {
  R1_IIM_FRESHER_MKT: ['MKT-CAMPUS', 'CON-CAMPUS', 'FIN-CAMPUS', 'J1_ABM_FMCG', 'J5_MT_SALES_FMCG'],
  R2_TIER3_FRESHER_FIN: ['FIN-CAMPUS', 'MKT-CAMPUS', 'J3_CREDIT_ANALYST_NBFC'],
  R3_EARLY_IT_TO_PM: ['PM-EARLY', 'BA-EARLY', 'ITS-EARLY', 'J4_PRODUCT_ANALYST_GROWTH'],
  R4_MID_SALES: ['SAL-MID', 'MKT-MID', 'SAL-CAMPUS', 'J5_MT_SALES_FMCG', 'J8_QCOMM_CATEGORY'],
  R5_SENIOR_HR: ['HR-SENIOR', 'HR-MID', 'GM-SENIOR'],
  R6_XLRI_HR_FRESHER: ['HR-CAMPUS', 'MKT-CAMPUS', 'CON-CAMPUS', 'LEG-CAMPUS', 'J6_ESG_ANALYST']
};
var rows = [], v3Scores = [], perResume = {};
Object.keys(MATRIX).forEach(function (rk) {
  var r = F.resumes[rk];
  MATRIX[rk].forEach(function (jk) {
    var custom = F.customJds[jk];
    var jd = custom ? { mode: 'custom', text: custom.text } : { mode: 'library', jdId: jk };
    var rep = E.analyse({ resumeText: r.text, pageCount: r.pageCount, profile: r.profile, jd: jd, today: TODAY });
    var fam = custom ? (LEG.detectDomainFromJd(custom.text, '', '') || 'consulting') : LEG.getScoringRoleFamily(rec(jk));
    var old = LEG.scoreResume(r.text, r.pageCount, fam, custom ? custom.text : LEG.formatJdText(rec(jk)));
    rows.push({ resume: rk, jd: jk, oldTotal: old.totalScore, oldBand: old.band, oldD4: old.dims[3].score, oldD7: old.dims[6].score, v3: rep.totalScore, v3Band: rep.band, v5: rep.vectors[4].pct, rep: rep, old: old });
    v3Scores.push(rep.totalScore); (perResume[rk] = perResume[rk] || []).push(rep.totalScore);
  });
});
function pad(s, n) { s = String(s); return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length); }
console.log('\n=== FIT SCORE: current production code vs v3 ===');
console.log(pad('Resume', 22) + pad('Target JD', 26) + pad('Current', 9) + pad('Cur D4/10', 10) + pad('v3', 5) + pad('v3 band', 12) + 'v3 bullet strength');
rows.forEach(function (x) { console.log(pad(x.resume, 22) + pad(x.jd, 26) + pad(x.oldTotal, 9) + pad(x.oldD4, 10) + pad(x.v3, 5) + pad(x.v3Band, 12) + x.v5 + '%'); });
function sd(a) { var m = a.reduce(function (p, c) { return p + c; }, 0) / a.length; return Math.sqrt(a.reduce(function (p, c) { return p + (c - m) * (c - m); }, 0) / a.length); }
var old = rows.map(function (x) { return x.oldTotal; });
console.log('\nSD across all pairs — current: ' + sd(old).toFixed(1) + ' | v3: ' + sd(v3Scores).toFixed(1));
var spreads = Object.keys(perResume).map(function (k) { var a = perResume[k]; return Math.max.apply(null, a) - Math.min.apply(null, a); });
var oldSpreads = Object.keys(perResume).map(function (k) { var a = rows.filter(function (x) { return x.resume === k; }).map(function (x) { return x.oldTotal; }); return Math.max.apply(null, a) - Math.min.apply(null, a); });
console.log('Same resume, different JDs (max−min) — current: ' + oldSpreads.join(', ') + ' | v3: ' + spreads.join(', '));
console.log('Current D4 (action verbs) values: ' + rows.map(function (x) { return x.oldD4; }).join(' ') + '  (out of 10)');

console.log('\n=== JD DOMAIN DETECTION: current vs v3 ===');
Object.keys(F.customJds).forEach(function (k) {
  var o = LEG.detectDomainFromJd(F.customJds[k].text, '', ''), n = E.detectDomainFromJdV3(F.customJds[k].text);
  console.log(pad(k, 38) + 'current → ' + pad(String(o), 14) + ' | v3 → ' + n.domain + (n.secondary ? ' (+' + n.secondary + ')' : '') + ' · ' + n.confidence + ' · level ' + n.level + ' [' + n.levelBasis + ']');
});

console.log('\n=== RESUME DOMAIN SUITABILITY (top 3): current vs v3 ===');
Object.keys(F.resumes).forEach(function (k) {
  var o = LEG.calculateDomainSuitability(F.resumes[k].text, 'consulting').slice(0, 3).map(function (x) { return x.key + ' ' + x.score; });
  var rep = rows.filter(function (x) { return x.resume === k; })[0].rep;
  var n = rep.domainSuitability.ranking.slice(0, 3).map(function (x) { return x.code + ' ' + x.score; });
  console.log(pad(k, 22) + 'current: ' + pad(o.join(' | '), 34) + ' v3: ' + n.join(' | ') + ' · conf ' + rep.domainSuitability.confidence);
});

var CHECK = process.argv.indexOf('--detail') >= 0;
if (CHECK) {
  rows.forEach(function (x) {
    var r = x.rep;
    console.log('\n──────── ' + x.resume + ' × ' + x.jd + ' → ' + r.totalScore + ' ' + r.band + (r.gateNotice ? ' [GATE] ' : '') + ' | JD ' + r.jd.domain + '/' + r.jd.level + ' | user ' + r.level.user);
    r.vectors.forEach(function (v) { console.log('   ' + pad(v.id + ' ' + v.label, 50) + pad(v.score + '/' + v.max, 12) + v.pct + '%'); });
    r.gates.forEach(function (g) { console.log('   GATE ' + g.code + ': ' + g.text); });
    r.advisories.forEach(function (g) { console.log('   ADVISORY ' + g.type + ': ' + g.text); });
    console.log('   Suitability: ' + r.domainSuitability.insight.kind + ' — ' + r.domainSuitability.insight.message);
    r.priorityFixes.forEach(function (f) { console.log('   FIX ' + f.rank + ' [' + f.family + ' +' + f.gain + '] ' + f.title + '\n        why: ' + f.why + '\n        do:  ' + f.action); });
    r.certifications.forEach(function (c) { console.log('   CERT ' + c.name + ' — ' + c.why + ' (' + c.cost + ', ' + c.time + ')'); });
    (r.projects.projects || []).forEach(function (p) { console.log('   PROJECT ' + p.name + ' — ' + p.why); });
    (r.projects.competitions || []).forEach(function (p) { console.log('   COMPETITION ' + p.name + ' — ' + p.window + ' · ' + p.eligibility); });
    r.rewrites.forEach(function (w) { console.log('   REWRITE [' + w.weakness + ']\n      before: ' + w.before + '\n      after:  ' + w.after + (w.afterResultFirst ? '\n      result-first: ' + w.afterResultFirst : '') + (w.notes.length ? '\n      note: ' + w.notes.join(' ') : '')); });
  });
}
module.exports = rows;
