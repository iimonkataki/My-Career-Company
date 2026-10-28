/* Offline tests for the v3.3 ATS diagnostics module. Run: node test/test-ats.js */
'use strict';
const path = require('path'), fs = require('fs');
const D = require(path.join(__dirname, '..', 'career-clinic-resume-checker', 'rfs-v3-bridge.js'));
const E = require(path.join(__dirname, '..', 'career-clinic-resume-checker', 'fit-engine-v3.js'));
E.init(require(path.join(__dirname, 'jd_library_v2.json')));
const F = require(path.join(__dirname, 'fixtures.js'));
const T = new Date(2026, 9, 28);
let pass = 0, n = 0; const ok = (name, cond, info) => { n++; if (cond) pass++; console.log((cond ? '✔ PASS  ' : '✘ FAIL  ') + name + (info ? '  →  ' + info : '')); };
// helpers to fake PDF.js text items (x, y in points; width estimated from characters)
const item = (s, x, y, h = 10) => ({ str: s, transform: [h, 0, 0, h, x, y], width: s.length * h * 0.5, fontName: 'g_d0_f1' });
const words = (line, x, y, h = 10) => { const out = []; let cx = x; line.split(' ').forEach(w => { out.push(item(w, cx, y, h)); cx += (w.length + 1) * h * 0.5; }); return out; };
(async () => {
  // 1. single column, word-level items, right-aligned dates → no gutter, order preserved
  let its = [], y = 780;
  ['Razorpay | Product Manager – Payments', '• Launched UPI AutoPay mandates for subscription merchants growing monthly mandate volume from 0.4M to 2.1M in 9 months',
   '• Wrote PRDs and user stories for the checkout revamp and prioritised the roadmap with three engineering squads using RICE scoring',
   'Cred | Associate Product Manager', '• Owned the rewards catalogue and defined success metrics such as DAU MAU and redemption rate for nine shipped features',
   '• Conducted more than forty user interviews to find onboarding drop-offs; the redesign cut time to first reward by thirty five percent',
   'EDUCATION', 'B.Tech Computer Science NIT Trichy', 'SKILLS', 'Product roadmap PRD A/B testing SQL Mixpanel Amplitude Jira Figma'].forEach((l, i) => {
    its = its.concat(words(l, 40, y)); if (i === 0 || i === 3) its.push(item('Apr 2023 – Present', 480, y)); y -= 16; });
  ok('Single column with right-aligned dates is NOT treated as two columns', D.findGutter(D.pageText ? its.map(i => ({ s: i.str, x: i.transform[4], y: i.transform[5], w: i.width, h: 10 })) : [], 595) === null);
  ok('Single-column text keeps line order', /Payments Apr 2023/.test(D.pageText(its, 595).split('\n')[0]));
  // 2. two-column: left sidebar (contact, skills, education) + right main (experience)
  let tc = []; y = 780;
  const left = ['RAHUL MEHTA', 'rahul@gmail.com', '+91 98200 11223', 'SKILLS', 'SQL', 'Mixpanel', 'Amplitude', 'Jira', 'Figma', 'EDUCATION', 'B.Tech CSE', 'NIT Trichy 2021'];
  const right = ['EXPERIENCE', 'Razorpay | Product Manager | Apr 2023 – Present', '• Launched UPI AutoPay mandates growing volume from 0.4M to 2.1M', '• Wrote PRDs and user stories; prioritised the roadmap using RICE',
    '• Ran 14 A/B tests with Mixpanel and SQL lifting conversion 6.5%', 'Cred | Associate Product Manager | Jul 2021 – Mar 2023', '• Owned rewards catalogue; shipped 9 features in sprints', '• Conducted 40 user interviews; cut time-to-reward 35%', '• Defined DAU/MAU and redemption metrics'];
  for (let i = 0; i < Math.max(left.length, right.length); i++) { if (left[i]) tc = tc.concat(words(left[i], 30, y)); if (right[i]) tc = tc.concat(words(right[i], 210, y)); y -= 16; }
  const two = D.pageText(tc, 595);
  ok('Two-column page is detected and read column by column', /^RAHUL MEHTA\n/.test(two) && two.indexOf('EXPERIENCE') > two.indexOf('NIT Trichy 2021'));
  const naive = []; for (let i = 0; i < Math.max(left.length, right.length); i++) naive.push((left[i] || '') + ' ' + (right[i] || ''));
  const score = t => { const r = E.analyse({ resumeText: t, pageCount: 1, profile: { status: 'Working Professional' }, jd: { mode: 'library', jdId: 'PM-EARLY' }, today: T }); return r.domainSuitability.ranking.find(x => x.code === 'PM').score; };
  const sNaive = score(naive.join('\n')), sFixed = score(two);
  ok('PM resume in a two-column PDF scores well in Product Management after the column fix', sFixed >= 70 && sFixed > sNaive, 'scrambled ' + sNaive + ' → column-aware ' + sFixed);
  // 3. DOCX structure detector (real zip, deflate)
  const buf = Buffer.from(require('./ats-sample-docx.js'), 'base64'); const fileD = { name: 'Rahul_Resume.docx', size: buf.length, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length) };
  const fd = await D.analyseFile(fileD);
  ok('DOCX: tables, text boxes, 2 columns, images and header-only contact detected', fd.docxTables === 1 && fd.textBoxes >= 1 && fd.columns && fd.images >= 1 && fd.headerFooterContact, JSON.stringify({ t: fd.docxTables, tb: fd.textBoxes, c: fd.columns, i: fd.images, hf: fd.headerFooterContact, fonts: fd.unsafeFonts, err: fd.error }));
  // 4. PDF detector with a simulated PDF.js
  global.pdfjsLib = { getDocument: () => ({ promise: Promise.resolve({ numPages: 1, getPage: async () => ({ view: [0, 0, 595, 842], getTextContent: async () => ({ items: tc.concat([item('rahul@gmail.com', 400, 825)]), styles: { g_d0_f1: { fontFamily: 'sans-serif' } } }), getAnnotations: async () => [{ subtype: 'Link', url: 'https://www.linkedin.com/in/rahul-mehta-8b2a91c4' }] }) }) }) };
  const fp = await D.analyseFile({ name: 'resume.pdf', size: 3.1 * 1048576, arrayBuffer: async () => new ArrayBuffer(8) });
  ok('PDF: two-column page, hidden link and >2.5 MB size detected', fp.multiColumnPages === 1 && fp.hiddenLinks.length === 1 && fp.sizeMB > 2.5, JSON.stringify({ mc: fp.multiColumnPages, links: fp.hiddenLinks.length, mb: fp.sizeMB.toFixed(1) }));
  // 5. ATS score: clean resume vs problem resume
  const pmText = F.resumes.PM1_FINTECH_PM.text;
  const repPM = E.analyse({ resumeText: pmText, pageCount: 1, profile: { status: 'Working Professional' }, jd: { mode: 'library', jdId: 'PM-EARLY' }, today: T });
  const clean = D.atsScore({ kind: 'pdf', sizeMB: 0.1, pages: 1, chars: 2000, multiColumnPages: 0, tableRows: 0, privateUse: 0, unsafeFonts: [], hiddenLinks: [], checked: ['layout'] }, D.textChecks(pmText), repPM);
  const bad = D.atsScore(fd, D.textChecks(pmText), repPM);
  ok('ATS score: clean single-column resume scores Strong', clean.score >= 80, clean.score + ' ' + clean.band + ' ' + JSON.stringify(clean.parts));
  ok('ATS score: tables + text boxes + 2 columns + header contact scores much lower and lists each issue', bad.score <= clean.score - 25 && ['TABLES', 'TEXT_BOXES', 'MULTI_COLUMN', 'HEADER_CONTACT'].every(id => bad.issues.some(i => i.id === id)), bad.score + ' ' + bad.band);
  const img = D.atsScore({ kind: 'pdf', sizeMB: 0.4, imageOnly: true, checked: [] }, D.textChecks(''), repPM);
  ok('ATS score: scanned / image-only PDF is capped at 40', img.score <= 40 && img.issues[0].id === 'IMAGE_ONLY', String(img.score));
  const allSug = [clean, bad, img].map(a => a.suggestions.map(s => s.t + ' ' + s.d).join(' ')).join(' ');
  ok('No "headline" or "add your title" advice in ATS suggestions', !/headline|under your name|job title to your/i.test(allSug));
  const r7 = F.resumes.R7_CONSULT_MA_CREDIT_PDFSPLIT, rep7 = E.analyse({ resumeText: r7.text, pageCount: 1, profile: r7.profile, jd: { mode: 'custom', text: F.customJds.J9_DELOITTE_IT_MA.text }, today: T });
  const a7 = D.atsScore(null, D.textChecks(r7.text), rep7);
  ok('ATS suggestions name missing JD skills and skills shown only in the Skills list', a7.suggestions.some(s => /Add "/.test(s.t)), a7.suggestions.slice(0, 3).map(s => s.t).join(' | '));
  // 6. LinkedIn optimizer
  const liPdfText = ['Contact', 'rahul@gmail.com', 'www.linkedin.com/in/rahulmehta (LinkedIn)', 'Top Skills', 'Product Management', 'SQL', 'A/B Testing', 'Rahul Mehta', 'Product Manager at Razorpay | Payments | ex-CRED', 'Bengaluru, Karnataka, India',
    'Summary', 'Product manager with 5 years in fintech. Launched UPI AutoPay mandates that grew volume from 0.4M to 2.1M. I write PRDs, run A/B tests and work with engineering on the roadmap. Looking for senior product roles in payments and lending, where I can own a product line and its P&L.',
    'Experience', 'Razorpay', 'Product Manager', 'April 2023 - Present (3 years 7 months)', 'Launched UPI AutoPay for subscription merchants; mandate volume grew 5x', 'Ran 14 A/B tests on checkout; conversion up 6.5%',
    'Cred', 'Associate Product Manager', 'July 2021 - March 2023', 'Owned rewards catalogue; shipped 9 features', 'Education', 'National Institute of Technology, Tiruchirappalli', 'B.Tech, Computer Science · (2017 - 2021)'].join('\n');
  const li = D.parseLinkedInPdfText(liPdfText);
  ok('LinkedIn PDF parsed: headline, About, experience, top skills, custom URL', /Product Manager at Razorpay/.test(li.headline) && /UPI AutoPay/.test(li.about) && /Cred/.test(li.experience) && /SQL/.test(li.skills) && li.slug === 'rahulmehta', JSON.stringify({ h: li.headline, s: li.skills, slug: li.slug }));
  const ls = D.scoreLinkedIn(li, repPM, { photo: true });
  ok('LinkedIn score is produced with checklist and suggestions (no URL fetching)', ls.score > 40 && ls.checklist.length >= 15, ls.score + ' ' + ls.band + ' · ' + ls.suggestions.slice(0, 2).join(' | '));
  const weak = D.scoreLinkedIn({ headline: 'Student at IIM', about: '', experience: '', skills: '' }, repPM, {});
  ok('A thin LinkedIn profile scores low with specific fixes', weak.score < 35 && weak.suggestions.length >= 5, weak.score + ' · ' + weak.suggestions.length + ' fixes');
  // 7. HTML is well-formed and escapes user text
  const html = D.buildHtml({ ats: bad, badges: [{ label: 'Founder / venture experience', text: '<script>x</script>' }] }) + D.liHtml(ls);
    ok('Diagnostics HTML escapes user text', html.indexOf('<script>') < 0);
  console.log(pass + ' / ' + n + ' ATS-diagnostics checks passed');
  if (pass !== n) process.exitCode = 1;
})();
