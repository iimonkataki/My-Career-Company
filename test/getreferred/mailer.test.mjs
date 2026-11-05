// My Career Company · Referral Mailer (Apps Script) tests
// Runs the real apps-script/ReferralMailer.gs inside Node with fake Google services.
// Run from the repo root:  node test/getreferred/mailer.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const mailerPath = [path.join(here, '../../apps-script/ReferralMailer.gs'), path.join(here, '../../docs/getreferred/apps-script/ReferralMailer.gs')].find((t) => fs.existsSync(t));
if (!mailerPath) throw new Error('Cannot find apps-script/ReferralMailer.gs (package root or docs/getreferred/).');
const SRC = fs.readFileSync(mailerPath, 'utf8');
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + (e && e.message)); }
}

// Fake token format for tests: "tok|<email>|<verified>"
function makeEnv({ apiKey = 'test-key', quota = 1500, fromAlias = '', firestoreDocs = {}, sheetId = 'SHEET123', grSheetId = '' } = {}) {
  const env = { sent: [], fetches: [], logs: [], rows: [], grRows: [], props: {}, cache: {}, created: [], shares: [] };
  if (sheetId) env.props.REFER_EARN_SHEET_ID = sheetId;
  if (grSheetId) env.props.GET_REFERRED_SHEET_ID = grSheetId;
  const mkSheet = (arr) => ({
    getLastRow: () => arr.length,
    appendRow: (r) => { arr.push(r); },
    setName() { return this; }, setFrozenRows() { return this; },
    getRange: () => ({ setFontWeight() { return this; }, setBackground() { return this; }, setFontColor() { return this; } }),
  });
  const sheet = mkSheet(env.rows);
  const grSheet = mkSheet(env.grRows);
  const ctx = {
    console: { log: (m) => env.logs.push(m) },
    UrlFetchApp: {
      fetch(url, opts) {
        env.fetches.push({ url, opts });
        if (url.startsWith('https://firestore.googleapis.com/')) {
          const p = decodeURIComponent(url.split('/documents/')[1].split('?')[0]);
          const d = firestoreDocs[p];
          if (!d) return { getResponseCode: () => 404, getContentText: () => '{}' };
          return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ name: p, fields: d }) };
        }
        const tok = JSON.parse(opts.payload).idToken;
        const [pfx, email, verified] = String(tok).split('|');
        if (pfx !== 'tok') return { getResponseCode: () => 400, getContentText: () => '{"error":{"message":"INVALID_ID_TOKEN"}}' };
        return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ users: [{ email, emailVerified: verified === 'true' }] }) };
      },
    },
    GmailApp: { sendEmail: (to, subject, body, opts) => env.sent.push({ to, subject, body, opts }) },
    MailApp: { getRemainingDailyQuota: () => quota - env.sent.length },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'support@mycareercompany.com' }) },
    Utilities: {
      base64Decode: (s) => Array.from(Buffer.from(s, 'base64')),
      newBlob: (bytes, type, name) => ({ bytes, type, name }),
      formatDate: (d) => new Date(d).toISOString().slice(0, 19).replace('T', ' '),
      DigestAlgorithm: { SHA_256: 'sha256' },
      computeDigest: (alg, s) => Array.from(Buffer.from(String(s))),
      base64EncodeWebSafe: (bytes) => Buffer.from(bytes).toString('base64url'),
      getUuid: () => 'abcd1234-0000-0000-0000-000000000000',
    },
    CacheService: { getScriptCache: () => ({ get: (k) => env.cache[k] || null, put: (k, v) => { env.cache[k] = v; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in env.props ? env.props[k] : null), setProperty: (k, v) => { env.props[k] = String(v); } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() { env.lockReleased = (env.lockReleased || 0) + 1; } }) },
    SpreadsheetApp: {
      openById: (id) => {
        if (id === env.props.REFER_EARN_SHEET_ID) return { getSheets: () => [sheet] };
        if (id === env.props.GET_REFERRED_SHEET_ID) return { getSheets: () => [grSheet] };
        throw new Error('no sheet');
      },
      create: (name) => { env.created.push(name); return { getSheets: () => [sheet], getId: () => 'NEWSHEET', getUrl: () => 'https://docs.google.com/spreadsheets/d/NEWSHEET/edit', addEditor: (e) => { if (e.endsWith('@gmail.com')) throw new Error('external sharing off'); env.shares.push(e); } }; },
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (text) => ({ text, mime: null, setMimeType(m) { this.mime = m; return this; } }),
    },
  };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  ctx.FIREBASE_API_KEY = apiKey;
  ctx.FROM_ALIAS = fromAlias;
  env.post = (body) => {
    const out = ctx.doPost({ postData: { contents: JSON.stringify(body) } });
    assert.equal(out.mime, 'application/json');
    return JSON.parse(out.text);
  };
  env.ctx = ctx;
  return env;
}

const ADMIN = 'tok|ibonkataki@mycareercompany.com|true';
const pdfB64 = Buffer.from('%PDF-1.4 test resume bytes').toString('base64');
const goodSend = () => ({
  action: 'sendReferral', idToken: ADMIN, requestRef: 'MCC-R-ABC123',
  poc: {
    to: 'manjul@example.com', cc: 'ibonkataki@mycareercompany.com', replyTo: 'ibonkataki@mycareercompany.com',
    subject: 'Referral request at Accenture: Riya Sharma (Job ID R1)', text: 'Hi Manjul,\n\nDetails…', html: '<p>Hi Manjul,</p>',
    attachments: [{ filename: 'Riya_Sharma_Resume.pdf', mimeType: 'application/pdf', base64: pdfB64 }],
  },
  candidate: { to: 'riya@example.com', replyTo: 'support@mycareercompany.com', subject: 'Your referral request for Accenture has been shared', text: 'Hi Riya,…', html: '<p>Hi Riya,</p>' },
});

console.log('Referral Mailer tests');

test('doGet answers with service name and version', () => {
  const env = makeEnv();
  const out = JSON.parse(env.ctx.doGet().text);
  assert.equal(out.ok, true);
  assert.equal(out.service, 'mcc-referral-mailer');
});
test('refuses requests with no sign-in token', () => {
  const env = makeEnv();
  const out = env.post({ action: 'ping' });
  assert.equal(out.ok, false);
  assert.match(out.error, /Not signed in/);
  assert.equal(env.fetches.length, 0);
});
test('refuses to run until the API key is pasted', () => {
  const env = makeEnv({ apiKey: 'PASTE_FIREBASE_WEB_API_KEY' });
  assert.match(env.post({ action: 'ping', idToken: ADMIN }).error, /FIREBASE_API_KEY/);
});
test('refuses a forged or expired token', () => {
  const env = makeEnv();
  const out = env.post({ ...goodSend(), idToken: 'forged-token' });
  assert.equal(out.ok, false);
  assert.match(out.error, /could not be verified/);
  assert.equal(env.sent.length, 0);
});
test('refuses a valid Google account that is not an admin', () => {
  const env = makeEnv();
  const out = env.post({ ...goodSend(), idToken: 'tok|someone@gmail.com|true' });
  assert.match(out.error, /not allowed/);
  assert.equal(env.sent.length, 0);
});
test('refuses an admin email that is not verified', () => {
  const env = makeEnv();
  assert.match(env.post({ ...goodSend(), idToken: 'tok|ibonkataki@mycareercompany.com|false' }).error, /not allowed/);
});
test('verifies the token with Identity Toolkit using the key and site referer', () => {
  const env = makeEnv();
  env.post({ action: 'ping', idToken: ADMIN });
  const f = env.fetches[0];
  assert.ok(f.url.startsWith('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=test-key'));
  assert.equal(f.opts.headers.Referer, 'https://www.mycareercompany.com/');
  assert.equal(JSON.parse(f.opts.payload).idToken, ADMIN);
});
test('ping returns the sending account, admin and quota', () => {
  const env = makeEnv();
  const out = env.post({ action: 'ping', idToken: 'tok|UPAM.PATRA@gmail.com|true' });
  assert.equal(out.ok, true);
  assert.equal(out.admin, 'upam.patra@gmail.com');
  assert.equal(out.from, 'support@mycareercompany.com');
  assert.equal(out.quotaLeft, 1500);
});
test('sendReferral sends exactly 2 emails: POC with attachment, then candidate', () => {
  const env = makeEnv();
  const out = env.post(goodSend());
  assert.equal(out.ok, true, out.error);
  assert.equal(out.sent, 2);
  assert.equal(env.sent.length, 2);
  const [poc, cand] = env.sent;
  assert.equal(poc.to, 'manjul@example.com');
  assert.equal(poc.opts.cc, 'ibonkataki@mycareercompany.com');
  assert.equal(poc.opts.replyTo, 'ibonkataki@mycareercompany.com');
  assert.equal(poc.opts.name, 'My Career Company');
  assert.equal(poc.opts.htmlBody, '<p>Hi Manjul,</p>');
  assert.equal(poc.opts.attachments.length, 1);
  assert.equal(poc.opts.attachments[0].name, 'Riya_Sharma_Resume.pdf');
  assert.equal(poc.opts.attachments[0].type, 'application/pdf');
  assert.equal(Buffer.from(poc.opts.attachments[0].bytes).toString(), '%PDF-1.4 test resume bytes');
  assert.equal(cand.to, 'riya@example.com');
  assert.equal(cand.opts.replyTo, 'support@mycareercompany.com');
  assert.ok(!cand.opts.attachments, 'candidate email has no attachments');
  assert.equal(out.quotaLeft, 1498);
});
test('candidate email is optional', () => {
  const env = makeEnv();
  const out = env.post({ ...goodSend(), candidate: null });
  assert.equal(out.sent, 1);
  assert.equal(env.sent.length, 1);
});
test('invalid POC address sends nothing', () => {
  const env = makeEnv();
  const b = goodSend(); b.poc.to = 'not-an-email';
  assert.match(env.post(b).error, /POC email address is not valid/);
  assert.equal(env.sent.length, 0);
});
test('invalid candidate address sends nothing (checked before the POC email goes)', () => {
  const env = makeEnv();
  const b = goodSend(); b.candidate.to = 'bad';
  assert.match(env.post(b).error, /candidate email address is not valid/);
  assert.equal(env.sent.length, 0);
});
test('empty subject is refused', () => {
  const env = makeEnv();
  const b = goodSend(); b.poc.subject = '  ';
  assert.match(env.post(b).error, /needs a subject/);
});
test('stops before sending when the daily Gmail quota is too low', () => {
  const env = makeEnv({ quota: 2 });
  assert.match(env.post(goodSend()).error, /daily sending limit/);
  assert.equal(env.sent.length, 0);
});
test('bad replyTo falls back to the signed-in admin', () => {
  const env = makeEnv();
  const b = goodSend(); b.poc.replyTo = 'nope';
  env.post(b);
  assert.equal(env.sent[0].opts.replyTo, 'ibonkataki@mycareercompany.com');
});
test('FROM_ALIAS is used when set', () => {
  const env = makeEnv({ fromAlias: 'support@mycareercompany.com' });
  env.post(goodSend());
  assert.equal(env.sent[0].opts.from, 'support@mycareercompany.com');
  assert.equal(env.sent[1].opts.from, 'support@mycareercompany.com');
});
test('unknown action is refused', () => {
  assert.match(makeEnv().post({ action: 'deleteEverything', idToken: ADMIN }).error, /Unknown action/);
});
test('never crashes on a non-JSON body', () => {
  const env = makeEnv();
  const out = JSON.parse(env.ctx.doPost({ postData: { contents: 'not json' } }).text);
  assert.equal(out.ok, false);
});


/* ===================== v3 actions ===================== */
const RID = 'AbCdEfGhIjKlMnOpQrSt';
const confDoc = (minsAgo = 1, extra = {}) => ({
  email: { stringValue: 'riya.sharma@example.com' }, firstName: { stringValue: 'Riya' },
  company: { stringValue: 'Accenture' }, jobId: { stringValue: 'R00245871' }, jobTitle: { stringValue: 'Business Analyst' },
  createdAt: { timestampValue: new Date(Date.now() - minsAgo * 60000).toISOString() }, ...extra,
});

test('v3 confirmRequest: public, reads the address from Firestore (not the browser), sends one fixed email', () => {
  const env = makeEnv({ firestoreDocs: { ['referral_confirmations/' + RID]: confDoc() } });
  const out = env.post({ action: 'confirmRequest', requestId: RID, to: 'attacker@evil.com' });
  assert.equal(out.ok, true, out.error);
  assert.equal(env.sent.length, 1);
  const m = env.sent[0];
  assert.equal(m.to, 'riya.sharma@example.com', 'recipient comes from Firestore only');
  assert.equal(m.subject, 'My Career Company has received your referral request – Accenture');
  assert.ok(m.body.includes('My Career Company has received your details for Business Analyst (Job ID R00245871) at Accenture, and our team is working on it.'));
  assert.ok(m.body.includes('We will connect you with our referral POC at Accenture soon.'));
  assert.ok(m.body.includes('MCC-R-ABCDEF') && m.body.includes('getreferred#status'));
  assert.equal(m.opts.replyTo, 'support@mycareercompany.com');
  const f = env.fetches.find((x) => x.url.startsWith('https://firestore.googleapis.com/'));
  assert.ok(f.url.includes('/projects/my-career-company/databases/(default)/documents/referral_confirmations/' + RID + '?key=test-key'));
  assert.equal(env.fetches.filter((x) => x.url.includes('identitytoolkit')).length, 0, 'no sign-in needed');
});
test('v3 confirmRequest: a second call for the same request sends nothing', () => {
  const env = makeEnv({ firestoreDocs: { ['referral_confirmations/' + RID]: confDoc() } });
  env.post({ action: 'confirmRequest', requestId: RID });
  const out = env.post({ action: 'confirmRequest', requestId: RID });
  assert.equal(out.duplicate, true);
  assert.equal(env.sent.length, 1);
});
test('v3 confirmRequest: refuses unknown, expired or malformed requests', () => {
  const env = makeEnv({ firestoreDocs: { ['referral_confirmations/' + RID]: confDoc(25) } });
  assert.match(env.post({ action: 'confirmRequest', requestId: RID }).error, /expired/);
  assert.match(env.post({ action: 'confirmRequest', requestId: 'NoSuchRequestId12345' }).error, /not found/);
  assert.match(env.post({ action: 'confirmRequest', requestId: '../../referral_private/pocs' }).error, /Invalid/);
  assert.equal(env.sent.length, 0);
});
test('v3 confirmRequest: per-address and quota limits', () => {
  const docs = {};
  for (let i = 0; i < 5; i++) docs['referral_confirmations/' + RID.slice(0, 19) + i] = confDoc();
  const env = makeEnv({ firestoreDocs: docs });
  const res = [0, 1, 2, 3].map((i) => env.post({ action: 'confirmRequest', requestId: RID.slice(0, 19) + i }));
  assert.equal(env.sent.length, 3, 'at most 3 to one address per 6 hours');
  assert.match(res[3].error, /Too many/);
  const low = makeEnv({ quota: 100, firestoreDocs: { ['referral_confirmations/' + RID]: confDoc() } });
  assert.match(low.post({ action: 'confirmRequest', requestId: RID }).error, /reserved/);
});
const signup = (over = {}) => ({ action: 'referAndEarnSignup', t: 9000, hp: '', data: {
  fullName: 'Asha Rao', company: 'Accenture', status: 'Current employee', role: 'Consultant', phone: '+91 98765 43210',
  workEmail: 'asha.rao@accenture.com', linkedin: 'https://www.linkedin.com/in/asha-rao', googleEmail: 'asha@gmail.com', city: 'Pune', consent: true, ...over } });
test('v3 referAndEarnSignup: public, appends one row with headers to the sheet', () => {
  const env = makeEnv();
  const out = env.post(signup());
  assert.equal(out.ok, true, out.error);
  assert.match(out.submissionId, /^RE-[A-Z0-9]{8}$/);
  assert.equal(env.rows.length, 2, 'header row + data row');
  assert.equal(env.rows[0][0], 'Timestamp (IST)');
  const r = JSON.parse(JSON.stringify(env.rows[1])); // rows come from the script sandbox
  // Phone starts with '+', so it is stored as "'+91…" (Sheets hides the apostrophe and keeps it as text, not a formula)
  assert.deepEqual(r.slice(2, 12), ['Asha Rao', 'Accenture', 'Current employee', 'Consultant', "'+91 98765 43210", 'asha.rao@accenture.com', 'accenture.com', 'https://www.linkedin.com/in/asha-rao', 'asha@gmail.com', 'Pune']);
  assert.deepEqual(r.slice(12, 15), ['Yes', 'New', 'No']);
  assert.ok(env.lockReleased >= 1, 'lock released');
  assert.equal(env.sent.length, 0, 'no email sent for sign-ups');
});
test('v3 referAndEarnSignup: blocks formula injection in any cell', () => {
  const env = makeEnv();
  env.post(signup({ fullName: '=HYPERLINK("http://evil","x")', role: '+cmd', city: '@SUM(1)' }));
  const r = env.rows[1];
  assert.ok(r[2].startsWith("'=") && r[5].startsWith("'+") && r[11].startsWith("'@"), JSON.stringify(r));
});
test('v3 referAndEarnSignup: re-validates on the server (personal email, bad LinkedIn, status, consent)', () => {
  const env = makeEnv();
  assert.match(env.post(signup({ workEmail: 'asha@gmail.com' })).error, /official company email/);
  assert.match(env.post(signup({ linkedin: 'facebook.com/asha' })).error, /LinkedIn/);
  assert.match(env.post(signup({ status: 'Ex employee' })).error, /status/);
  assert.match(env.post(signup({ consent: false })).error, /Consent/);
  assert.equal(env.rows.length, 0);
});
test('v3 referAndEarnSignup: honeypot / too-fast submissions are silently dropped', () => {
  const env = makeEnv();
  assert.equal(env.post({ ...signup(), hp: 'spam' }).ok, true);
  assert.equal(env.post({ ...signup(), t: 500 }).ok, true);
  assert.equal(env.rows.length, 0);
});
test('v3 referAndEarnSignup: one work email at most twice per 6 hours; clear error if sheet not set up', () => {
  const env = makeEnv();
  env.post(signup()); env.post(signup());
  assert.match(env.post(signup()).error, /already have your details/);
  const none = makeEnv({ sheetId: '' });
  assert.match(none.post(signup()).error, /setupReferAndEarnSheet/);
});
test('v3 sendAccessNotice: admin only; fixed template with sign-in steps', () => {
  const env = makeEnv();
  assert.match(env.post({ action: 'sendAccessNotice', idToken: 'tok|someone@gmail.com|true', to: 'x@y.com' }).error, /not allowed/);
  const out = env.post({ action: 'sendAccessNotice', idToken: ADMIN, to: 'Manjul@Accenture.com', name: 'Manjul Kapoor', kind: 'poc' });
  assert.equal(out.ok, true, out.error);
  const m = env.sent[0];
  assert.equal(m.to, 'manjul@accenture.com');
  assert.equal(m.subject, 'You now have access to Status of Referrals – My Career Company');
  assert.ok(m.body.startsWith('Hi Manjul,') && m.body.includes('mark each one as referred') && m.body.includes('Use your existing email') && m.body.includes('getreferred#status'));
});
test('v3 setupReferAndEarnSheet: creates once, shares with co-founders, survives external-sharing block', () => {
  const env = makeEnv({ sheetId: '' });
  const id = env.ctx.setupReferAndEarnSheet();
  assert.equal(id, 'NEWSHEET');
  assert.equal(env.props.REFER_EARN_SHEET_ID, 'NEWSHEET');
  assert.deepEqual(env.shares.sort(), ['anirbanroy@mycareercompany.com', 'ibonkataki@mycareercompany.com', 'iimonkataki@mycareercompany.com']);
  assert.ok(env.logs.some((l) => l.includes('Could not share with upam.patra@gmail.com')), 'gmail share failure is logged, not fatal');
  assert.equal(env.ctx.setupReferAndEarnSheet(), 'NEWSHEET', 'second run reuses the sheet');
  assert.equal(env.created.length, 1);
});
test('v4 confirmRequest also writes the request to the Get Referred sheet (once)', () => {
  const doc = confDoc(1, { fullName: { stringValue: 'Riya Sharma' }, phone: { stringValue: '+91 98765 43210' },
    note: { stringValue: '=Riya is a strong fit.' }, resumeName: { stringValue: 'Riya_CV.pdf' }, hasCoverLetter: { booleanValue: true } });
  const env = makeEnv({ grSheetId: 'GRSHEET', firestoreDocs: { ['referral_confirmations/' + RID]: doc } });
  const out = env.post({ action: 'confirmRequest', requestId: RID });
  assert.equal(out.ok, true, out.error);
  assert.equal(out.sheet, 'ok');
  assert.equal(env.grRows.length, 2, 'header + row');
  assert.equal(env.grRows[0][0], 'Timestamp (IST)');
  const r = JSON.parse(JSON.stringify(env.grRows[1]));
  assert.deepEqual(r.slice(1, 13), ['MCC-R-ABCDEF', 'Riya Sharma', 'riya.sharma@example.com', "'+91 98765 43210", 'Accenture', 'R00245871', 'Business Analyst',
    "'=Riya is a strong fit.", 'Riya_CV.pdf', 'Yes', RID, 'Off']);
  env.post({ action: 'confirmRequest', requestId: RID });
  assert.equal(env.grRows.length, 2, 'no duplicate row');
  assert.equal(env.sent.length, 1);
});
test('v4 sheet problems never block the confirmation email; rate limits never block the sheet', () => {
  const none = makeEnv({ firestoreDocs: { ['referral_confirmations/' + RID]: confDoc() } });
  const out = none.post({ action: 'confirmRequest', requestId: RID });
  assert.equal(out.ok, true); assert.equal(out.sheet, 'not_set_up'); assert.equal(none.sent.length, 1);
  const low = makeEnv({ quota: 100, grSheetId: 'GRSHEET', firestoreDocs: { ['referral_confirmations/' + RID]: confDoc() } });
  assert.match(low.post({ action: 'confirmRequest', requestId: RID }).error, /reserved/);
  assert.equal(low.grRows.length, 2, 'row saved even when email is held back');
});
test('v4 setupGetReferredSheet creates the requests sheet once and shares it', () => {
  const env = makeEnv({ sheetId: 'SHEET123' });
  assert.equal(env.ctx.setupGetReferredSheet(), 'NEWSHEET');
  assert.equal(env.props.GET_REFERRED_SHEET_ID, 'NEWSHEET');
  assert.equal(env.props.REFER_EARN_SHEET_ID, 'SHEET123', 'Refer and Earn sheet untouched');
  assert.deepEqual(env.created, ['MCC Get Referred - Referral Requests']);
  assert.equal(env.shares.length, 3);
  env.ctx.setupGetReferredSheet();
  assert.equal(env.created.length, 1);
});
test('v3 keeps v2 behaviour: sendReferral still admin-only and unchanged', () => {
  const env = makeEnv();
  assert.match(env.post({ ...goodSend(), idToken: 'forged' }).error, /could not be verified/);
  assert.equal(env.post(goodSend()).sent, 2);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
