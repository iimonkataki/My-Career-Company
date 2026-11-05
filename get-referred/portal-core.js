/* My Career Company · Get Referred™ · v4 portal core (pure logic, no DOM, no Firebase)
 * Used by portal-ext.js in the browser and by test/getreferred/portal-core.test.mjs in Node.
 */

export const PORTAL_VERSION = 'getreferred-portal-4.0.0';

export const TAB_ORDER = ['user', 'status', 'refer', 'admin', 'access'];
export const TAB_HASH = { user: '', status: '#status', refer: '#refer', admin: '#admin', access: '#access' };

export const POC_FORM_STATUSES = ['Current employee', 'Serving notice', 'About to join'];

// Personal mailbox domains that are not accepted as an "official work email".
export const FREE_EMAIL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in', 'yahoo.in', 'ymail.com', 'rediffmail.com',
  'outlook.com', 'outlook.in', 'hotmail.com', 'hotmail.co.in', 'live.com', 'live.in', 'msn.com',
  'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com', 'zoho.com', 'zohomail.in',
  'gmx.com', 'mail.com', 'yandex.com', 'tutanota.com',
];

export const MAX_PROOF_BYTES = 2 * 1024 * 1024; // 2 MB, same as the resume limit
export const PROOF_TYPES = {
  pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function lowerEmail(v) {
  return String(v || '').trim().toLowerCase();
}

export function isEmail(v) {
  const s = lowerEmail(v);
  return s.length <= 254 && EMAIL_RE.test(s);
}

export function emailDomain(v) {
  const s = lowerEmail(v);
  const i = s.lastIndexOf('@');
  return i > 0 ? s.slice(i + 1) : '';
}

export function isFreeEmail(v) {
  return FREE_EMAIL_DOMAINS.includes(emailDomain(v));
}

/** Document id of one POC's copy of a referral request. Must match the Firestore rules. */
export function assignmentId(requestId, pocEmail) {
  return `${requestId}__${lowerEmail(pocEmail)}`;
}

export function proofPieceId(aid, index) {
  return `${aid}_${index}`;
}

/**
 * Effective access for a signed-in email from its referral_allowed_users document.
 * Legacy documents (granted before v3, no flags) keep Get Referred access, as they had full portal access.
 * Must match grCanGR()/grCanRE()/grPrimary() in the Firestore rules.
 */
export function effectiveAccess(accessDoc, signedInEmail, isAdmin = false) {
  const email = lowerEmail(signedInEmail);
  if (isAdmin) return { gr: true, re: true, primaryEmail: email, isPoc: false, isAlias: false, exists: true, admin: true };
  if (!accessDoc) return { gr: false, re: false, primaryEmail: email, isPoc: false, isAlias: false, exists: false, admin: false };
  const gr = accessDoc.getReferredAccess === undefined ? true : accessDoc.getReferredAccess === true;
  const re = accessDoc.referAndEarnAccess === true;
  return {
    gr, re,
    primaryEmail: lowerEmail(accessDoc.primaryEmail) || email,
    isPoc: accessDoc.isPoc === true,
    isAlias: accessDoc.isAlias === true,
    exists: true,
    admin: false,
  };
}

/** Which tabs to show, in order. */
export function visibleTabs({ signedIn = false, isAdmin = false, access = null } = {}) {
  if (isAdmin) return [...TAB_ORDER];
  const tabs = ['user'];
  if (signedIn && access && (access.gr || access.re)) tabs.push('status');
  tabs.push('refer');
  return tabs;
}

export function tabFromHash(hash) {
  const h = String(hash || '').split('?')[0];
  const hit = Object.entries(TAB_HASH).find(([, v]) => v && v === h);
  return hit ? hit[0] : 'user';
}

/* ---------- candidate + POC status signals (v4: POC claims are verified) ----------
 * Candidate step 3 turns green when the candidate confirms the company's referral email, or a co-founder verifies the POC's claim.
 * POC step 2 turns green when a co-founder verifies their claim, or the candidate confirms (and this POC claimed it,
 * or is the only POC on the request). Otherwise a POC claim shows "Awaiting verification".
 */

export function candidateCanRespond(s) {
  return !!(s && s.mccSharedWithPoc === true && s.pocReferred !== true);
}

export function candidateSignals(s) {
  const third = s.pocReferred ? 'yes' : s.pocClaimed ? 'review' : 'pending';
  const how = s.pocReferred
    ? (s.candidateResponse === 'yes' ? 'Confirmed by you' : s.adminVerified ? 'Verified by My Career Company' : '')
    : s.pocClaimed ? 'The POC says they have referred you' : '';
  return [
    { key: 'sharedWithMcc', label: 'Have you shared your data with My Career Company?', state: 'yes', at: s.submittedAt || null },
    { key: 'mccSharedWithPoc', label: 'Has My Career Company shared your details with the POC?', state: s.mccSharedWithPoc ? 'yes' : 'no', at: s.mccSharedAt || null },
    { key: 'pocReferred', label: 'Has the POC put in the referral in the company portal?', state: third, at: s.pocReferredAt || null, note: how },
  ];
}

/** Is this POC's referral confirmed (green)? a = poc_assignments doc, s = candidate_status doc (may be null). */
export function pocGreen(a, s) {
  if (!a) return false;
  if (a.verified === true) return true;
  if (!s) return false;
  if (a.referred === true && s.pocReferred === true) return true;            // claim + (candidate yes | admin verify | v3 legacy)
  if (s.candidateResponse === 'yes' && (Number(s.pocsAssigned) || 1) <= 1) return true; // only POC on the request
  return false;
}

/** 'yes' | 'review' (claimed, awaiting verification) | 'pending' */
export function pocStage(a, s) {
  if (pocGreen(a, s)) return 'yes';
  return a && a.referred === true ? 'review' : 'pending';
}

export function pocSignals(a, s = null) {
  const stage = pocStage(a, s);
  return [
    { key: 'requestReceived', label: 'Have you received a request for referral from this candidate?', state: 'yes', at: a.assignedAt || null },
    {
      key: 'referred', label: 'Have you shared the details with the company and referred the candidate?', state: stage,
      at: stage === 'yes' ? (a.verifiedAt || (s && s.pocReferredAt) || a.referredAt || null) : a.referredAt || null,
      note: stage === 'review' ? 'Submitted. Awaiting confirmation by My Career Company or the candidate' : '',
    },
  ];
}

/** "Referrals given" milestone line for the POC section (counts confirmed referrals only). */
export function milestoneText(referredCount) {
  const n = Math.max(0, Number(referredCount) || 0);
  const next = (Math.floor(n / 10) + 1) * 10;
  const left = next - n;
  return `Referrals given: ${n}. ${left} more to your next My Career Company payout (every 10 referrals given).`;
}

/* ---------- co-founder dashboard helpers ---------- */

export function candidateStage(s) {
  if (s.pocReferred) return 'referred';
  if (s.pocClaimed) return 'review';
  if (s.mccSharedWithPoc) return 'shared';
  return 'new';
}

export const STAGE_LABELS = {
  new: 'Not shared with a POC yet', shared: 'Shared with POC', review: 'Awaiting verification', referred: 'Referred',
  pending: 'Waiting for POC', yes: 'Referred',
};

function hay(...v) { return v.map((x) => String(x || '').toLowerCase()).join(' '); }

/** Filters for the co-founder Status of Referrals view. */
export function filterSought(list, { q = '', company = '', stage = '' } = {}) {
  const t = q.trim().toLowerCase();
  return list.filter((s) => (!company || s.company === company)
    && (!stage || candidateStage(s) === stage)
    && (!t || hay(s.candidateName, s.candidateEmail, s.company, s.jobId, s.jobTitle).includes(t)));
}

export function filterGiven(list, statusById, { q = '', company = '', stage = '' } = {}) {
  const t = q.trim().toLowerCase();
  return list.filter((a) => (!company || a.company === company)
    && (!stage || pocStage(a, statusById[a.requestId]) === stage)
    && (!t || hay(a.candidateName, a.pocName, a.pocEmail, a.company, a.jobId).includes(t)));
}

export function dashboardCounts(statuses, assignments, statusById) {
  return {
    requests: statuses.length,
    shared: statuses.filter((s) => s.mccSharedWithPoc).length,
    awaiting: assignments.filter((a) => pocStage(a, statusById[a.requestId]) === 'review').length,
    referred: statuses.filter((s) => s.pocReferred).length,
  };
}

export function companiesOf(...lists) {
  return [...new Set(lists.flat().map((x) => x && x.company).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
}

/* ---------- documents written when a request is submitted (same batch as the request) ---------- */

export function firstNameOf(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  if (parts.length > 1 && parts[0].replace('.', '').length === 1) return parts[1];
  return parts[0];
}

/** Fields for candidate_status/{requestId}; the caller adds submittedAt = serverTimestamp(). */
export function candidateStatusFields(requestId, req) {
  const f = {
    requestId,
    candidateEmail: lowerEmail(req.email),
    candidateName: String(req.fullName || '').slice(0, 100),
    company: String(req.company || '').slice(0, 120),
    jobId: String(req.jobId || '').slice(0, 100),
    sharedWithMcc: true,
    mccSharedWithPoc: false,
    pocReferred: false,
  };
  if (req.jobTitle) f.jobTitle = String(req.jobTitle).slice(0, 150);
  return f;
}

/** Fields for referral_confirmations/{requestId}; the caller adds createdAt = serverTimestamp().
 * v4: also carries the details for the Get Referred Google Sheet (each one must equal the request, see the rules). */
export function confirmationFields(req) {
  const f = {
    email: lowerEmail(req.email),
    firstName: firstNameOf(req.fullName).slice(0, 60),
    fullName: String(req.fullName || ''),
    phone: String(req.phone || ''),
    company: String(req.company || '').slice(0, 120),
    jobId: String(req.jobId || '').slice(0, 100),
    note: String(req.recommendationNote || ''),
    resumeName: String((req.resume && req.resume.name) || ''),
    hasCoverLetter: !!(req.coverLetterFile || req.coverLetterText),
  };
  if (req.jobTitle) f.jobTitle = String(req.jobTitle).slice(0, 150);
  return f;
}

/** Fields for a new poc_assignments document (admin writes it after "Send 2 emails" succeeds). */
export function assignmentFields(req, poc, toEmail, adminEmail) {
  const f = {
    requestId: req.id,
    pocEmail: lowerEmail(toEmail),
    pocName: String((poc && poc.name) || '').slice(0, 100),
    company: String(req.company || '').slice(0, 120),
    candidateName: String(req.fullName || '').slice(0, 100),
    jobId: String(req.jobId || '').slice(0, 100),
    requestReceived: true,
    assignedBy: lowerEmail(adminEmail),
    referred: false,
    proofPieces: 0,
  };
  if (req.jobTitle) f.jobTitle = String(req.jobTitle).slice(0, 150);
  return f;
}

/* ---------- Refer and Earn questionnaire ---------- */

export function normalizeLinkedIn(v) {
  let s = String(v || '').trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try {
    const u = new URL(s);
    if (!/(^|\.)linkedin\.com$/i.test(u.hostname)) return '';
    if (!/^\/(in|pub)\//i.test(u.pathname)) return '';
    return 'https://www.linkedin.com' + u.pathname.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

export function normalizePhone(v) {
  const s = String(v || '').replace(/[\s\-().]/g, '');
  let m = s.match(/^(?:\+?91|0)?([6-9]\d{9})$/);
  if (m) return '+91 ' + m[1].slice(0, 5) + ' ' + m[1].slice(5);
  m = s.match(/^\+(\d{8,15})$/);
  return m ? '+' + m[1] : '';
}

export function validateSignup(form) {
  const errors = {};
  const name = String(form.fullName || '').trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 80) errors.fullName = 'Enter your full name.';
  const company = String(form.company || '').trim();
  if (!company || company.length > 120) errors.company = 'Choose or type your company.';
  if (!POC_FORM_STATUSES.includes(form.status)) errors.status = 'Confirm your current status at this company.';
  const role = String(form.role || '').trim();
  if (role.length < 2 || role.length > 100) errors.role = 'Enter your role or designation.';
  if (!normalizePhone(form.phone)) errors.phone = 'Enter a 10-digit mobile number, or include the country code.';
  if (!isEmail(form.workEmail)) errors.workEmail = 'Enter your official work email, like name@company.com.';
  else if (isFreeEmail(form.workEmail)) errors.workEmail = 'Use your official company email. Personal addresses (Gmail, Yahoo, Outlook…) are not accepted here.';
  if (!normalizeLinkedIn(form.linkedin)) errors.linkedin = 'Paste your LinkedIn profile link, like linkedin.com/in/your-name.';
  if (form.googleEmail && !isEmail(form.googleEmail)) errors.googleEmail = 'Enter a valid email address, or leave this blank.';
  if (String(form.city || '').length > 80) errors.city = 'Keep the city under 80 characters.';
  if (!form.consent) errors.consent = 'Tick the box so we can store your details and contact you.';
  if (!form.confirmEmployment) errors.confirmEmployment = 'Confirm that the details are accurate.';
  return { ok: Object.keys(errors).length === 0, errors };
}

/** The payload sent to the mailer (action referAndEarnSignup). The mailer validates it again. */
export function signupPayload(form) {
  return {
    fullName: String(form.fullName || '').trim().replace(/\s+/g, ' '),
    company: String(form.company || '').trim(),
    status: form.status,
    role: String(form.role || '').trim(),
    phone: normalizePhone(form.phone),
    workEmail: lowerEmail(form.workEmail),
    linkedin: normalizeLinkedIn(form.linkedin),
    googleEmail: lowerEmail(form.googleEmail),
    city: String(form.city || '').trim(),
    consent: true,
  };
}

/* ---------- Access tab ---------- */

/**
 * Builds the POC account list: one row per POC email from the published POC database,
 * merged with existing referral_allowed_users documents. POCs without an email are listed but cannot be switched on.
 */
export function buildPocAccounts(pocs, accessDocsByEmail) {
  const rows = new Map();
  const noEmail = [];
  for (const p of pocs || []) {
    const email = lowerEmail(p.email);
    if (!isEmail(email)) { noEmail.push({ name: p.name, company: p.company, status: p.status }); continue; }
    if (!rows.has(email)) rows.set(email, { email, name: p.name, companies: [], status: p.status });
    const r = rows.get(email);
    if (!r.companies.includes(p.company)) r.companies.push(p.company);
  }
  const out = [];
  for (const r of rows.values()) {
    const doc = accessDocsByEmail[r.email] || null;
    const acc = doc ? effectiveAccess(doc, r.email) : { gr: false, re: false };
    const aliases = Object.values(accessDocsByEmail)
      .filter((d) => d && d.isAlias === true && lowerEmail(d.primaryEmail) === r.email)
      .map((d) => lowerEmail(d.email || d.id));
    out.push({ ...r, company: r.companies.join(', '), gr: !!(doc && acc.gr), re: !!(doc && acc.re), hasDoc: !!doc, aliases });
  }
  out.sort((a, b) => a.company.localeCompare(b.company, 'en', { sensitivity: 'base' }) || a.name.localeCompare(b.name));
  noEmail.sort((a, b) => String(a.company).localeCompare(String(b.company)));
  return { rows: out, noEmail };
}

/**
 * Referral seekers: one row per email entered on the Get Referred form (from referral_requests), merged with
 * their referral_allowed_users document. No document = access OFF.
 */
export function buildSeekerAccounts(requests, accessDocsByEmail, isAdminEmail) {
  const rows = new Map();
  const t = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : v && v.seconds ? v.seconds * 1000 : 0);
  for (const r of requests || []) {
    const email = lowerEmail(r.email);
    if (!isEmail(email) || isAdminEmail(email)) continue;
    if (!rows.has(email)) rows.set(email, { email, name: '', phone: '', companies: [], requests: 0, lastAt: 0 });
    const row = rows.get(email);
    row.requests++;
    if (r.company && !row.companies.includes(r.company)) row.companies.push(r.company);
    const at = t(r.submittedAt);
    if (at >= row.lastAt) { row.lastAt = at; row.name = r.fullName || row.name; row.phone = r.phone || row.phone; }
  }
  return [...rows.values()].map((row) => {
    const doc = accessDocsByEmail[row.email] || null;
    const acc = doc ? effectiveAccess(doc, row.email) : { gr: false, re: false };
    return { ...row, company: row.companies.join(', '), gr: !!(doc && acc.gr), re: !!(doc && acc.re), hasDoc: !!doc };
  }).sort((a, b) => b.lastAt - a.lastAt);
}

/** Access document written when a co-founder switches a referral seeker on (merge). */
export function seekerAccessDoc(row, gr, re, adminEmail) {
  return {
    email: row.email,
    name: row.name || '',
    role: 'Referral seeker',
    institution: row.company || '',
    isSeeker: true,
    primaryEmail: row.email,
    getReferredAccess: !!gr,
    referAndEarnAccess: !!re,
    status: 'active',
    source: 'get_referred_form',
    grantedBy: lowerEmail(adminEmail),
  };
}

/** Other accounts: referral_allowed_users documents that are not POCs, aliases, seekers or co-founders. */
export function buildOtherAccounts(accessDocs, isAdminEmail, seekerEmails = new Set()) {
  return (accessDocs || [])
    .filter((d) => d && d.isPoc !== true && d.isAlias !== true && !isAdminEmail(d.email || d.id) && !seekerEmails.has(lowerEmail(d.email || d.id)))
    .map((d) => {
      const email = lowerEmail(d.email || d.id);
      const acc = effectiveAccess(d, email);
      return { email, name: d.name || '', institution: d.institution || '', gr: acc.gr, re: acc.re };
    })
    .sort((a, b) => a.email.localeCompare(b.email));
}

/** Access document written when a co-founder switches a POC on (merge). */
export function pocAccessDoc(row, gr, re, adminEmail) {
  return {
    email: row.email,
    name: row.name || '',
    role: 'Referral POC',
    institution: row.company || '',
    isPoc: true,
    primaryEmail: row.email,
    getReferredAccess: !!gr,
    referAndEarnAccess: !!re,
    status: 'active',
    source: 'poc_db',
    grantedBy: lowerEmail(adminEmail),
  };
}

/** Alias document: lets a POC sign in with another Google email and still see requests sent to the database email. */
export function aliasAccessDoc(aliasEmail, row, gr, re, adminEmail) {
  return {
    email: lowerEmail(aliasEmail),
    name: row.name || '',
    role: 'Referral POC (sign-in email)',
    institution: row.company || '',
    isPoc: true,
    isAlias: true,
    primaryEmail: row.email,
    getReferredAccess: !!gr,
    referAndEarnAccess: !!re,
    status: 'active',
    source: 'alias',
    grantedBy: lowerEmail(adminEmail),
  };
}

/* ---------- Refer and Earn live counts ---------- */

export function networkCounts(companies) {
  const list = Array.isArray(companies) ? companies : [];
  const pocs = list.reduce((n, c) => n + (Number(c.pocCount) || 0), 0);
  return { companies: list.length, pocs };
}

export function resolveProofType(file) {
  const m = String((file && file.name) || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = m ? m[1] : '';
  if (PROOF_TYPES[ext]) return PROOF_TYPES[ext];
  const t = (file && file.type) || '';
  return Object.values(PROOF_TYPES).includes(t) ? t : '';
}

export function validateProof(file) {
  if (!file) return '';
  if (!resolveProofType(file)) return 'Proof must be a PDF or an image (PNG, JPG or WEBP).';
  if (file.size > MAX_PROOF_BYTES) return 'Proof is larger than 2 MB. Crop the screenshot or save a smaller PDF.';
  if (file.size === 0) return 'That file looks empty. Choose it again.';
  return '';
}
