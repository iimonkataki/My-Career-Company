// My Career Company · Get Referred v3 · portal logic tests
// Run from the repo root:  node test/getreferred/portal-core.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const load = async (rel) => import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync(path.join(here, '../..', rel), 'utf8')).toString('base64'));
const P = await load('get-referred/portal-core.js');
function findFile(rel) {
  const tries = [path.join(here, '../..', rel), path.join(here, '../../docs/getreferred', rel)];
  const hit = tries.find((t) => fs.existsSync(t));
  if (!hit) throw new Error('Cannot find ' + rel);
  return hit;
}

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + (e && e.message)); }
}
console.log('Get Referred v3 portal tests (' + P.PORTAL_VERSION + ')');

test('tabs: visitor sees Get Referred + Refer and Earn only', () => {
  assert.deepEqual(P.visibleTabs({ signedIn: false }), ['user', 'refer']);
});
test('tabs: signed in without access still sees only the two public tabs', () => {
  assert.deepEqual(P.visibleTabs({ signedIn: true, access: P.effectiveAccess(null, 'a@b.com') }), ['user', 'refer']);
});
test('tabs: signed in with Get Referred or Refer and Earn access adds Status of Referrals in position 2', () => {
  assert.deepEqual(P.visibleTabs({ signedIn: true, access: { gr: true, re: false } }), ['user', 'status', 'refer']);
  assert.deepEqual(P.visibleTabs({ signedIn: true, access: { gr: false, re: true } }), ['user', 'status', 'refer']);
});
test('tabs: co-founders see all five in the agreed order', () => {
  assert.deepEqual(P.visibleTabs({ signedIn: true, isAdmin: true }), ['user', 'status', 'refer', 'admin', 'access']);
});
test('hash routing', () => {
  assert.equal(P.tabFromHash('#status'), 'status');
  assert.equal(P.tabFromHash('#refer'), 'refer');
  assert.equal(P.tabFromHash('#admin'), 'admin');
  assert.equal(P.tabFromHash('#access'), 'access');
  assert.equal(P.tabFromHash(''), 'user');
  assert.equal(P.tabFromHash('#nonsense'), 'user');
});
test('access: legacy grant (no flags) keeps Get Referred access, not Refer and Earn', () => {
  const a = P.effectiveAccess({ email: 'x@y.com', status: 'active' }, 'X@Y.com');
  assert.equal(a.gr, true); assert.equal(a.re, false); assert.equal(a.primaryEmail, 'x@y.com');
});
test('access: explicit flags win; alias resolves to the POC database email', () => {
  const a = P.effectiveAccess({ getReferredAccess: false, referAndEarnAccess: true, isAlias: true, primaryEmail: 'Poc@Acme.com' }, 'poc.personal@gmail.com');
  assert.deepEqual([a.gr, a.re, a.primaryEmail, a.isAlias], [false, true, 'poc@acme.com', true]);
});
test('access: rules use the same defaults (getReferredAccess true, referAndEarnAccess false, primaryEmail = own email)', () => {
  const rules = fs.readFileSync(findFile('rules/firestore.getreferred.v3.rules'), 'utf8');
  assert.ok(rules.includes("grAcc().get('getReferredAccess', true) == true"));
  assert.ok(rules.includes("grAcc().get('referAndEarnAccess', false) == true"));
  assert.ok(rules.includes("grAcc().get('primaryEmail', grEmail())"));
});
test('ids match the rules: assignment = requestId__email, proof = assignmentId_index', () => {
  assert.equal(P.assignmentId('abc123', 'Manjul@Example.COM'), 'abc123__manjul@example.com');
  assert.equal(P.proofPieceId('abc123__m@e.com', 2), 'abc123__m@e.com_2');
  const rules = fs.readFileSync(findFile('rules/firestore.getreferred.v3.rules'), 'utf8');
  assert.ok(rules.includes("rid + '__' + grPrimary()"));
  assert.ok(rules.includes("request.resource.data.assignmentId + '_' + string(request.resource.data.index)"));
});
test('candidate signals: yes / no / pending, then yes / yes / yes', () => {
  assert.deepEqual(P.candidateSignals({ mccSharedWithPoc: false, pocReferred: false }).map((s) => s.state), ['yes', 'no', 'pending']);
  assert.deepEqual(P.candidateSignals({ mccSharedWithPoc: true, pocReferred: true }).map((s) => s.state), ['yes', 'yes', 'yes']);
  assert.equal(P.candidateSignals({})[0].label, 'Have you shared your data with My Career Company?');
  assert.equal(P.candidateSignals({})[1].label, 'Has My Career Company shared your details with the POC?');
  assert.equal(P.candidateSignals({})[2].label, 'Has the POC put in the referral in the company portal?');
});
test('POC signals: received yes, referred pending until marked', () => {
  assert.deepEqual(P.pocSignals({ referred: false }).map((s) => s.state), ['yes', 'pending']);
  assert.deepEqual(P.pocSignals({ referred: true }).map((s) => s.state), ['yes', 'yes']);
  assert.equal(P.pocSignals({})[1].label, 'Have you shared the details with the company and referred the candidate?');
});
test('milestone line counts to the next multiple of 10', () => {
  assert.equal(P.milestoneText(0), 'Referrals given: 0. 10 more to your next My Career Company payout (every 10 referrals given).');
  assert.equal(P.milestoneText(13), 'Referrals given: 13. 7 more to your next My Career Company payout (every 10 referrals given).');
  assert.equal(P.milestoneText(20), 'Referrals given: 20. 10 more to your next My Career Company payout (every 10 referrals given).');
});
test('status + confirmation records only use keys the rules allow', () => {
  const rules = fs.readFileSync(findFile('rules/firestore.getreferred.v3.rules'), 'utf8');
  const keyList = (marker) => rules.slice(rules.indexOf(marker)).match(/keys\(\)\.hasOnly\(\[([\s\S]*?)\]\)/)[1].match(/'([^']+)'/g).map((s) => s.slice(1, -1));
  const statusKeys = keyList('match /candidate_status/');
  const confKeys = keyList('match /referral_confirmations/');
  const req = { email: 'Riya@Example.com', fullName: 'Riya Sharma', company: 'Acme', jobId: 'R1', jobTitle: 'Analyst' };
  for (const k of [...Object.keys(P.candidateStatusFields('abcdefghij1234567890', req)), 'submittedAt']) assert.ok(statusKeys.includes(k), 'status key ' + k);
  for (const k of [...Object.keys(P.confirmationFields(req)), 'createdAt']) assert.ok(confKeys.includes(k), 'confirmation key ' + k);
  assert.equal(P.candidateStatusFields('x', req).candidateEmail, 'riya@example.com');
  assert.equal(P.confirmationFields(req).firstName, 'Riya');
});
test('signup: valid partner passes; payload normalised', () => {
  const form = { fullName: ' Asha  Rao ', company: 'Accenture', status: 'Current employee', role: 'Consultant', phone: '98765 43210',
    workEmail: 'Asha.Rao@Accenture.com', linkedin: 'linkedin.com/in/asha-rao/', googleEmail: '', city: 'Pune', consent: true, confirmEmployment: true };
  const v = P.validateSignup(form);
  assert.equal(v.ok, true, JSON.stringify(v.errors));
  const p = P.signupPayload(form);
  assert.deepEqual([p.fullName, p.phone, p.workEmail, p.linkedin], ['Asha Rao', '+91 98765 43210', 'asha.rao@accenture.com', 'https://www.linkedin.com/in/asha-rao']);
});
test('signup: personal email, bad LinkedIn, ex-employee status and missing ticks are refused', () => {
  const v = P.validateSignup({ fullName: 'A', company: '', status: 'Ex employee', role: '', phone: '12', workEmail: 'asha@gmail.com', linkedin: 'facebook.com/asha', consent: false, confirmEmployment: false });
  for (const k of ['fullName', 'company', 'status', 'role', 'phone', 'workEmail', 'linkedin', 'consent', 'confirmEmployment']) assert.ok(v.errors[k], 'expected error ' + k);
  assert.match(v.errors.workEmail, /official company email/);
});
test('signup: mailer accepts the same statuses and free-email list', () => {
  const gs = fs.readFileSync(findFile('apps-script/ReferralMailer.gs'), 'utf8');
  for (const s of P.POC_FORM_STATUSES) assert.ok(gs.includes(`'${s}'`), 'mailer status ' + s);
  for (const d of P.FREE_EMAIL_DOMAINS) assert.ok(gs.includes(`'${d}'`), 'mailer free domain ' + d);
});
test('POC accounts: one row per email, default off, POCs without email listed separately, aliases attached', () => {
  const pocs = [
    { company: 'Accenture', name: 'Manjul Kapoor', status: 'Current employee', email: 'manjul@accenture.com' },
    { company: 'Accenture', name: 'Ibon Kataki', status: 'Current employee', email: '' },
    { company: 'KPMG', name: 'Anjan B', status: 'About to join', email: 'Anjan@kpmg.com' },
    { company: 'Wells Fargo', name: 'Anjan B', status: 'Serving notice', email: 'anjan@kpmg.com' },
  ];
  const docs = {
    'anjan@kpmg.com': { email: 'anjan@kpmg.com', isPoc: true, getReferredAccess: false, referAndEarnAccess: true },
    'anjan.b@gmail.com': { email: 'anjan.b@gmail.com', isAlias: true, primaryEmail: 'anjan@kpmg.com' },
  };
  const { rows, noEmail } = P.buildPocAccounts(pocs, docs);
  assert.equal(rows.length, 2);
  const m = rows.find((r) => r.email === 'manjul@accenture.com');
  assert.deepEqual([m.gr, m.re, m.hasDoc], [false, false, false], 'default OFF');
  const a = rows.find((r) => r.email === 'anjan@kpmg.com');
  assert.deepEqual([a.gr, a.re, a.company, a.aliases], [false, true, 'KPMG, Wells Fargo', ['anjan.b@gmail.com']]);
  assert.deepEqual(noEmail.map((n) => n.name), ['Ibon Kataki']);
});
test('other accounts exclude POCs, aliases and co-founders; legacy grants show Get Referred on', () => {
  const docs = [
    { id: 'cand@x.com', email: 'cand@x.com', status: 'active' },
    { id: 'poc@y.com', email: 'poc@y.com', isPoc: true },
    { id: 'alias@g.com', email: 'alias@g.com', isAlias: true },
    { id: 'ibonkataki@mycareercompany.com', email: 'ibonkataki@mycareercompany.com' },
  ];
  const rows = P.buildOtherAccounts(docs, (e) => e === 'ibonkataki@mycareercompany.com');
  assert.deepEqual(rows.map((r) => [r.email, r.gr, r.re]), [['cand@x.com', true, false]]);
});
test('access documents written by the Access tab', () => {
  const row = { email: 'manjul@accenture.com', name: 'Manjul Kapoor', company: 'Accenture' };
  const d = P.pocAccessDoc(row, false, true, 'Ibon@MyCareerCompany.com');
  assert.deepEqual([d.isPoc, d.getReferredAccess, d.referAndEarnAccess, d.primaryEmail, d.grantedBy, d.status], [true, false, true, 'manjul@accenture.com', 'ibon@mycareercompany.com', 'active']);
  const al = P.aliasAccessDoc('M.Kapoor@gmail.com', row, false, true, 'x@y.com');
  assert.deepEqual([al.email, al.isAlias, al.primaryEmail, al.referAndEarnAccess], ['m.kapoor@gmail.com', true, 'manjul@accenture.com', true]);
  assert.ok(Object.values(d).every((v) => v !== undefined) && Object.values(al).every((v) => v !== undefined), 'Firestore rejects undefined values');
});
test('network counts for the Refer and Earn advert', () => {
  assert.deepEqual(P.networkCounts([{ pocCount: 4 }, { pocCount: 2 }, { pocCount: 0 }]), { companies: 3, pocs: 6 });
  assert.deepEqual(P.networkCounts(null), { companies: 0, pocs: 0 });
});
test('proof: PDF/images up to 2 MB', () => {
  assert.equal(P.validateProof(null), '');
  assert.equal(P.validateProof({ name: 'shot.PNG', type: '', size: 1000 }), '');
  assert.match(P.validateProof({ name: 'a.exe', type: '', size: 10 }), /PDF or an image/);
  assert.match(P.validateProof({ name: 'a.pdf', type: 'application/pdf', size: 2 * 1024 * 1024 + 1 }), /2 MB/);
  assert.equal(P.resolveProofType({ name: 'x.jpeg' }), 'image/jpeg');
});
test('Refer and Earn copy follows the founders\' bonus wording', () => {
  const ext = fs.readFileSync(path.join(here, '../../get-referred/portal-ext.js'), 'utf8');
  assert.ok(ext.includes('typically about ₹10,000 to ₹50,000, paid by your employer under its own policy'));
  assert.ok(ext.includes('My Career Company gives you a payout after every 10 referrals you give'));
  assert.ok(!/₹\s?\d[\d,]*\s*(per|for every|after every) 10/i.test(ext), 'no MCC payout amount disclosed');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
