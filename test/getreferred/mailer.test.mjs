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
function makeEnv({ apiKey = 'test-key', quota = 1500, fromAlias = '' } = {}) {
  const env = { sent: [], fetches: [], logs: [] };
  const ctx = {
    console: { log: (m) => env.logs.push(m) },
    UrlFetchApp: {
      fetch(url, opts) {
        env.fetches.push({ url, opts });
        const tok = JSON.parse(opts.payload).idToken;
        const [p, email, verified] = String(tok).split('|');
        if (p !== 'tok') return { getResponseCode: () => 400, getContentText: () => '{"error":{"message":"INVALID_ID_TOKEN"}}' };
        return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ users: [{ email, emailVerified: verified === 'true' }] }) };
      },
    },
    GmailApp: { sendEmail: (to, subject, body, opts) => env.sent.push({ to, subject, body, opts }) },
    MailApp: { getRemainingDailyQuota: () => quota - env.sent.length },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'support@mycareercompany.com' }) },
    Utilities: {
      base64Decode: (s) => Array.from(Buffer.from(s, 'base64')),
      newBlob: (bytes, type, name) => ({ bytes, type, name }),
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

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
