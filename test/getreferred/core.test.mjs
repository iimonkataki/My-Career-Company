// My Career Company · Get Referred · core logic tests
// Run from the repo root:  node test/getreferred/core.test.mjs
// Uses a synthetic fixture with fake names that mirrors the real sheet's layout and quirks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
// Load the browser module as ES code on any Node version (no package.json "type" needed).
const coreSrc = fs.readFileSync(path.join(here, '../../get-referred/referral-core.js'), 'utf8');
const core = await import('data:text/javascript;base64,' + Buffer.from(coreSrc).toString('base64'));
// Rules and mailer live in the package root, or in docs/getreferred/ once installed in the website repo.
function findFile(rel) {
  const tries = [path.join(here, '../..', rel), path.join(here, '../../docs/getreferred', rel)];
  const hit = tries.find((t) => fs.existsSync(t));
  if (!hit) throw new Error('Cannot find ' + rel + ' (looked in: ' + tries.join(' | ') + ')');
  return hit;
}
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + (e && e.message)); }
}

// ---- fixture: same shape SheetJS returns with {header:1, raw:true, defval:''} ----
const pocRows = [
  ['', 7, '', '', '', '', '', '', '', '', ''],                                     // row 1: COUNTUNIQUE cell
  ['Company', 'Referral POC', 'Status', 'Role', 'Contact Number of Referral POC', 'linkedin link of referral POC', '', '', '', '', ''],
  ['Acme Consulting', 'Asha Rao', 'Current employee', 'Strategy Consultant', 9876543210, '', '', '', '', '', ''],
  ['Acme Consulting', 'Bimal Das', 'Current employee', '', '', 'linkedin.com/in/bimal', '', '', '', '', ''],
  ['Acme Consulting', 'Chitra Iyer', 'Ex employee', '', '', '', '', '', '', '', 'Current employee'], // col K = validation list
  ['Acme Consulting', 'Dev Shah', 'Serving notice', '', '+91 98200 11111', '', '', '', '', '', 'Ex employee'],
  ['Globex ', 'Esha Paul', 'Current employee', '', '', '', '', '', '', '', 'Serving notice'],   // trailing space
  ['Globex', 'Farhan Ali', 'About to join', '', '', '', '', '', '', '', 'About to join'],
  ['Old Corp', 'Gita Sen', 'Ex employee', '', '', '', '', '', '', '', ''],
  ['P&G', 'Hari Om', 'current employee', '', 7.3374e9, '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', '', '', '', ''],
];
const coRows = [
  ['', 5, ''],
  ['S. No', 'Companies', 'Job Portal Link'],
  [1, 'Acme Consulting', 'acme.example.com/careers'],
  [2, 'Globex', ''],
  [3, 'Globex ', 'https://globex.example.com/jobs'],
  [4, 'Old Corp', 'not a link'],
  [5, 'P&G', ''],
  [6, 'Initech', 'https://initech.example.com'],
];
const industryRows = [['', ''], ['Industry', 'Count'], ['BFSI', 3]];
const sheets = { 'Referral POCs': pocRows, Companies: coRows, 'Companies by Industry': industryRows };

console.log('Get Referred core tests (' + core.CORE_VERSION + ')');

const parsed = core.parseDatabase(sheets);

test('finds the POC and Companies sheets by header, ignores industry sheet', () => {
  assert.equal(parsed.stats.pocSheet, 'Referral POCs');
  assert.equal(parsed.stats.companiesSheet, 'Companies');
});
test('trims names and merges duplicates ("Globex " = "Globex")', () => {
  const g = parsed.companies.filter((c) => c.slug === 'globex');
  assert.equal(g.length, 1);
  assert.equal(g[0].pocCount, 2);
  assert.equal(g[0].portalUrl, 'https://globex.example.com/jobs');
});
test('hides companies with no POCs (Initech)', () => {
  assert.ok(!parsed.companies.some((c) => c.slug === 'initech'));
  assert.ok(parsed.issues.some((i) => i.text.includes('Initech')));
});
test('adds https:// to bare portal links and rejects junk', () => {
  assert.equal(parsed.companies.find((c) => c.slug === 'acme-consulting').portalUrl, 'https://acme.example.com/careers');
  assert.equal(parsed.companies.find((c) => c.slug === 'old-corp').portalUrl, '');
});
test('counts 8 POCs across 4 companies, sorted A-Z', () => {
  assert.equal(parsed.pocs.length, 8);
  assert.deepEqual(parsed.companies.map((c) => c.name), ['Acme Consulting', 'Globex', 'Old Corp', 'P&G']);
});
test('ignores the status validation list in column K', () => {
  assert.equal(parsed.pocs.find((p) => p.name === 'Chitra Iyer').status, 'Ex employee');
});
test('normalises status case and phone numbers', () => {
  const hari = parsed.pocs.find((p) => p.name === 'Hari Om');
  assert.equal(hari.status, 'Current employee');
  assert.equal(hari.phone, '7337400000');
  assert.equal(parsed.pocs.find((p) => p.name === 'Asha Rao').phone, '9876543210');
});
test('flags the missing email column as an error', () => {
  assert.ok(parsed.issues.some((i) => i.level === 'error' && /email/i.test(i.text)));
});
test('flags ex-employee-only companies', () => {
  assert.deepEqual(parsed.stats.exOnlyCompanies, ['Old Corp']);
});
test('reads an email column when present (any header containing "email")', () => {
  const rows = pocRows.map((r) => [...r]);
  rows[1].push('Email ID of Referral POC');
  rows[2].push('Asha.Rao@Example.com');
  rows[3].push('not-an-email');
  const p = core.parseDatabase({ 'Referral POCs': rows, Companies: coRows });
  assert.equal(p.pocs.find((x) => x.name === 'Asha Rao').email, 'asha.rao@example.com');
  assert.equal(p.pocs.find((x) => x.name === 'Bimal Das').email, '');
  assert.ok(!p.issues.some((i) => i.level === 'error'));
  assert.ok(p.issues.some((i) => i.text.includes('not-an-email')));
});
test('throws a clear error when no POC sheet exists', () => {
  assert.throws(() => core.parseDatabase({ Sheet1: [['a', 'b']] }), /POC sheet/);
});
test('sorts POCs: current, notice, joining, ex', () => {
  const s = core.sortPocs(parsed.pocs.filter((p) => p.companySlug === 'acme-consulting')).map((p) => p.status);
  assert.deepEqual(s, ['Current employee', 'Current employee', 'Serving notice', 'Ex employee']);
});

// ---- validation ----
const okFile = { name: 'Riya_Resume.pdf', type: 'application/pdf', size: 120000 };
const goodForm = {
  resumeFile: okFile, companySlug: 'acme-consulting', jobId: ' R0012345 ', jobTitle: 'Business Analyst',
  fullName: 'Riya  Sharma', email: 'Riya@Example.com', phone: '98765 43210',
  note: 'Riya is a final-year MBA student with two years in brand marketing and a strong analytics record.',
  coverMode: 'none', coverFile: null, coverText: '', consent: true,
};
test('accepts a complete form', () => {
  const v = core.validateRequest(goodForm);
  assert.equal(v.ok, true, JSON.stringify(v.errors));
});
test('rejects missing fields with specific messages', () => {
  const v = core.validateRequest({ coverMode: 'none' });
  for (const k of ['resume', 'company', 'jobId', 'fullName', 'email', 'phone', 'note', 'consent']) assert.ok(v.errors[k], 'missing error for ' + k);
  assert.ok(!v.errors.cover && !v.errors.jobTitle, 'optional fields must not error');
});
test('rejects wrong file type, resume over 2 MB, cover letter over 1 MB', () => {
  assert.match(core.validateFile({ name: 'a.png', type: 'image/png', size: 10 }, { required: true, label: 'Resume' }), /PDF or Word/);
  assert.match(core.validateFile({ name: 'a.pdf', type: 'application/pdf', size: 2 * 1024 * 1024 + 1 }, { label: 'Resume', maxBytes: core.MAX_RESUME_BYTES }), /2\.0 MB/);
  assert.equal(core.validateFile({ name: 'a.pdf', type: 'application/pdf', size: 2 * 1024 * 1024 }, { label: 'Resume', maxBytes: core.MAX_RESUME_BYTES }), '');
  assert.ok(core.validateRequest({ ...goodForm, coverMode: 'file', coverFile: { name: 'c.pdf', type: 'application/pdf', size: 1024 * 1024 + 1 } }).errors.cover);
  assert.ok(core.validateRequest({ ...goodForm, resumeFile: { name: 'r.pdf', type: 'application/pdf', size: 3 * 1024 * 1024 } }).errors.resume);
  assert.equal(core.resolveFileType({ name: 'CV.DOCX', type: '' }), core.ALLOWED_FILE_TYPES.docx);
});
test('phone formats: Indian with/without +91, international, junk', () => {
  assert.equal(core.normalizeCandidatePhone('9876543210'), '+91 98765 43210');
  assert.equal(core.normalizeCandidatePhone('+91-98765-43210'), '+91 98765 43210');
  assert.equal(core.normalizeCandidatePhone('098765 43210'), '+91 98765 43210');
  assert.equal(core.normalizeCandidatePhone('+44 7700 900123'), '+447700900123');
  assert.equal(core.normalizeCandidatePhone('12345'), '');
  assert.equal(core.normalizeCandidatePhone('5876543210'), '');
});
test('third-person check flags "I" and "my" but not names', () => {
  assert.equal(core.looksFirstPerson('I am a strong fit because my work'), true);
  assert.equal(core.looksFirstPerson('Riya is a strong fit. Her work at Ivy Labs is excellent.'), false);
});
test('cover letter text over limit is rejected; optional file validated', () => {
  assert.ok(core.validateRequest({ ...goodForm, coverMode: 'text', coverText: 'x'.repeat(6001) }).errors.cover);
  assert.ok(core.validateRequest({ ...goodForm, coverMode: 'file', coverFile: { name: 'c.exe', type: '', size: 9 } }).errors.cover);
  assert.equal(core.validateRequest({ ...goodForm, coverMode: 'file', coverFile: null }).ok, true);
});

// ---- request document must only use keys allowed by the Firestore rules ----
const rulesText = fs.readFileSync(findFile('rules/firestore.getreferred.rules'), 'utf8');
const hasOnly = rulesText.match(/d\.keys\(\)\.hasOnly\(\[([\s\S]*?)\]\)/)[1].match(/'([^']+)'/g).map((s) => s.slice(1, -1));
const hasAll = rulesText.match(/d\.keys\(\)\.hasAll\(\[([\s\S]*?)\]\)/)[1].match(/'([^']+)'/g).map((s) => s.slice(1, -1));
const company = parsed.companies[0];
const uploads = { resume: { name: 'Riya_Resume.pdf', size: 120000, type: 'application/pdf', chunks: 1 } };
test('request doc keys are a subset of the rules allow-list', () => {
  const doc = { ...core.buildRequestDoc({ ...goodForm, coverMode: 'text', coverText: 'Dear team' }, company, { ...uploads, coverLetter: { ...uploads.resume } }), status: 'new', submittedAt: 'x' };
  for (const k of Object.keys(doc)) assert.ok(hasOnly.includes(k), `key "${k}" is not in the rules hasOnly list`);
  for (const k of hasAll) assert.ok(k in doc, `required key "${k}" missing from request doc`);
});
test('request doc values satisfy the rule limits', () => {
  const doc = core.buildRequestDoc(goodForm, company, uploads);
  assert.equal(doc.fullName, 'Riya Sharma');
  assert.equal(doc.email, 'riya@example.com');
  assert.equal(doc.jobId, 'R0012345');
  assert.equal(doc.phone, '+91 98765 43210');
  assert.ok(doc.recommendationNote.length >= 40 && doc.recommendationNote.length <= 1500);
  assert.deepEqual(Object.keys(doc.resume).sort(), ['chunks', 'name', 'size', 'type'], 'resume meta keys must match isFileMeta in the rules');
  assert.equal(doc.consent, true);
  assert.ok(!('coverLetterText' in doc) && !('coverLetterFile' in doc), 'optional keys must be absent when empty');
});
test('file limits in code match the rules (2 MB, 1 MB, 3 pieces, 950,000 chars)', () => {
  assert.ok(rulesText.includes('isFileMeta(d.resume, ' + core.MAX_RESUME_BYTES + ')'));
  assert.ok(rulesText.includes('isFileMeta(d.coverLetterFile, ' + core.MAX_COVER_BYTES + ')'));
  assert.ok(rulesText.includes('m.chunks <= ' + core.MAX_CHUNKS));
  assert.ok(rulesText.includes('f.data.size() <= ' + core.CHUNK_CHARS));
  assert.ok(rulesText.includes('f.index <= ' + (core.MAX_CHUNKS - 1)));
});
test('a 2 MB file fits in 3 pieces, each under the 1 MiB document limit', () => {
  const b64len = Math.ceil(core.MAX_RESUME_BYTES / 3) * 4;
  const pieces = core.splitIntoChunks('A'.repeat(b64len));
  assert.equal(pieces.length, 3);
  assert.ok(pieces.every((p) => p.length <= core.CHUNK_CHARS && p.length + 200 < 1048576));
  assert.equal(pieces.join('').length, b64len);
  assert.equal(core.fileChunkId('abc123XYZ0', 'cover-letter', 1), 'abc123XYZ0_cover-letter_1');
  const cover = core.splitIntoChunks('B'.repeat(Math.ceil(core.MAX_COVER_BYTES / 3) * 4));
  assert.ok(cover.length <= 2);
});
test('worst-case submit stays under Firestore\'s 10 MiB request limit', () => {
  const total = Math.ceil(core.MAX_RESUME_BYTES / 3) * 4 + Math.ceil(core.MAX_COVER_BYTES / 3) * 4 + 20000;
  assert.ok(total < 10 * 1024 * 1024 * 0.6, total);
});
test('service writes pieces with the exact keys the rules allow', () => {
  const svcSrc = fs.readFileSync(path.join(here, '../../get-referred/firebase-service.js'), 'utf8');
  assert.ok(svcSrc.includes('{ requestId, kind, index, data: piece }'));
  assert.ok(rulesText.includes("f.keys().hasOnly(['requestId', 'kind', 'index', 'data'])"));
  assert.ok(!/firebase-storage/.test(svcSrc), 'v2 must not use Cloud Storage');
});
test('admin list is identical in config, firestore rules and the Apps Script mailer', () => {
  const cfg = fs.readFileSync(path.join(here, '../../get-referred/firebase-config.js'), 'utf8');
  const st = fs.readFileSync(findFile('apps-script/ReferralMailer.gs'), 'utf8').split('var SENDER_NAME')[0];
  const pick = (src) => (src.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || []).filter((e) => !e.startsWith('support@')).map((e) => e.toLowerCase());
  const a = [...new Set(pick(cfg.split('ADMIN_NAMES')[0]))].sort();
  assert.deepEqual([...new Set(pick(rulesText))].sort(), a);
  assert.deepEqual([...new Set(pick(st))].sort(), a);
  assert.equal(a.length, 4);
});

// ---- email draft ----
test('POC email: "referral request at <company> from <candidate>", all details, no links to files', () => {
  const r = { ...core.buildRequestDoc({ ...goodForm, coverMode: 'text', coverText: 'Dear hiring team, ...' }, company, uploads) };
  const e = core.buildReferralEmail({ request: r, poc: { name: 'S Andrew Gangte' }, company, adminName: 'Ibon Tarun Kataki' });
  assert.equal(e.subject, 'Referral request at Acme Consulting: Riya Sharma (Job ID R0012345)');
  assert.ok(e.text.startsWith('Hi Andrew,'));
  assert.ok(e.text.includes('You have a new referral request at Acme Consulting from Riya Sharma'));
  for (const x of ['R0012345', 'riya@example.com', '+91 98765 43210', 'Business Analyst', 'https://acme.example.com/careers', 'Dear hiring team', 'Attached: resume.', 'Ibon Tarun Kataki']) assert.ok(e.text.includes(x), 'missing ' + x);
  const withFile = core.buildReferralEmail({ request: { ...r, coverLetterText: undefined, coverLetterFile: { name: 'c.pdf' } }, poc: { name: 'Asha Rao' }, company });
  assert.ok(withFile.text.includes('Attached: resume and cover letter.'));
  assert.ok(e.html.includes('<a href="https://acme.example.com/careers"'));
});
test('candidate email: confirms sharing, no guarantee, does not name the POC', () => {
  const r = core.buildRequestDoc(goodForm, company, uploads);
  const e = core.buildCandidateEmail({ request: r, company, adminName: 'Ibon Tarun Kataki', ref: 'MCC-R-ABC123' });
  assert.equal(e.subject, 'Your referral request for Acme Consulting has been shared');
  assert.ok(e.text.startsWith('Hi Riya,'));
  for (const x of ['job ID R0012345 (Business Analyst)', "isn't guaranteed", 'MCC-R-ABC123', 'Ibon Tarun Kataki']) assert.ok(e.text.includes(x), 'missing ' + x);
  assert.ok(!e.text.includes('Andrew') && !e.text.includes('Asha'), 'must not name a POC');
  assert.ok(!/you have been referred/i.test(e.text), 'must not claim the referral is done');
});
test('email HTML escapes user text', () => {
  const html = core.textToEmailHtml('<script>alert(1)</script> & "x"');
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
});
test('Gmail compose link encodes every field', () => {
  const u = new URL(core.gmailComposeUrl({ to: 'a@b.com', cc: 'c@d.com', subject: 'Hi & bye', body: 'Line 1\nLine 2' }));
  assert.equal(u.searchParams.get('to'), 'a@b.com');
  assert.equal(u.searchParams.get('su'), 'Hi & bye');
  assert.equal(u.searchParams.get('body'), 'Line 1\nLine 2');
});

// ---- admin helpers ----
test('duplicate detection: same email + company + job ID', () => {
  const d = core.duplicateKeys([
    { id: '1', email: 'A@x.com', companySlug: 'acme', jobId: 'R1' },
    { id: '2', email: 'a@x.com ', companySlug: 'acme', jobId: 'r1' },
    { id: '3', email: 'a@x.com', companySlug: 'acme', jobId: 'R2' },
  ]);
  assert.deepEqual([...d].sort(), ['1', '2']);
});
test('CSV escapes quotes, commas, newlines and formula injection', () => {
  const csv = core.toCsv([['a,b', 'say "hi"', 'x\ny', '=HYPERLINK("bad")']]);
  assert.equal(csv, '"a,b","say ""hi""","x\ny","\'=HYPERLINK(""bad"")"');
});
test('WhatsApp digits and short reference', () => {
  assert.equal(core.phoneDigitsForWhatsApp('7337403087'), '917337403087');
  assert.equal(core.phoneDigitsForWhatsApp('+91 98200 11111'), '919820011111');
  assert.equal(core.phoneDigitsForWhatsApp(''), '');
  assert.equal(core.shortRef('abCdef123'), 'MCC-R-ABCDEF');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
