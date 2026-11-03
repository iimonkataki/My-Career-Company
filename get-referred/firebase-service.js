/* My Career Company · Get Referred portal · Firebase service (v2.0)
 * Free Spark plan only: Auth + Firestore. No Cloud Storage, no Cloud Functions, no extensions.
 * Files live in Firestore (split into pieces). Emails go through a Google Apps Script web app.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, doc, collection, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy, limit, serverTimestamp, arrayUnion, Timestamp, writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig, ADMIN_EMAILS, MAILER_URL } from './firebase-config.js?v=2.0';
import { splitIntoChunks, fileChunkId } from './referral-core.js?v=2.0';

export const COL_REQUESTS = 'referral_requests';
export const COL_FILES = 'referral_files';
export const COL_ALLOWED_USERS = 'referral_allowed_users';
export const DOC_PUBLIC_COMPANIES = ['referral_public', 'companies'];
export const DOC_PRIVATE_POCS = ['referral_private', 'pocs'];

export const configured = !Object.values(firebaseConfig).some((v) => String(v).startsWith('PASTE'));
export const mailerConfigured = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(String(MAILER_URL || ''));

let app = null, auth = null, db = null;
if (configured) {
  app = initializeApp(firebaseConfig); // default app: shares Google sign-in with /ResumeFitScore on the same domain
  auth = getAuth(app);
  db = getFirestore(app);
}

function need() {
  if (!configured) throw new Error('Firebase is not configured. Paste the project config into get-referred/firebase-config.js.');
}

/* ---------- auth & access whitelist ---------- */

export function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(String(email).toLowerCase().trim());
}

export async function isEmailPermitted(email) {
  if (!email) return false;
  const clean = String(email).toLowerCase().trim();
  if (isAdminEmail(clean)) return true;
  if (!configured || !db) return false;
  try {
    const snap = await getDoc(doc(db, COL_ALLOWED_USERS, clean));
    if (snap && snap.exists()) return true;
  } catch (err) {
    console.warn('[GetReferred] Check allowed user note:', err);
  }
  return false;
}

export function onAuth(cb) {
  if (!configured) { cb(null); return () => {}; }
  return onAuthStateChanged(auth, cb);
}

export async function signInAdmin() {
  need();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const res = await signInWithPopup(auth, provider);
  return res.user;
}

export async function signOutUser() {
  if (configured) await signOut(auth);
}

/* ---------- access whitelist management (Co-Founders only) ---------- */

const GOOGLE_APPS_SCRIPT_WEBHOOK = 'https://script.google.com/macros/s/AKfycbxH9SO8xJ7jym99FZwHL9WkB2j1KDWbzppSrlCzD9UOqAEYxgS-aWiY-DF2dud7sG1k/exec';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function fetchAllowedUsers() {
  need();
  const list = [];
  try {
    const snap = await getDocs(collection(db, COL_ALLOWED_USERS));
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() });
    });
  } catch (err) {
    console.warn('[GetReferred] Fetch referral_allowed_users note:', err);
  }
  try {
    const cached = JSON.parse(localStorage.getItem('CC_GETREFERRED_ALLOWED_USERS_CACHE') || '[]');
    const map = new Map();
    list.forEach((item) => map.set(item.email || item.id, item));
    cached.forEach((item) => {
      const k = item.email || item.id;
      if (!map.has(k)) map.set(k, item);
    });
    const merged = Array.from(map.values());
    localStorage.setItem('CC_GETREFERRED_ALLOWED_USERS_CACHE', JSON.stringify(merged));
    return merged;
  } catch (_) {
    return list;
  }
}

export function buildInvitationEmail(cleanEmail, metadata = {}) {
  const recipientGreeting = metadata.name && metadata.name.trim() ? metadata.name.trim() : 'Colleague';
  const institutionText = metadata.institution && metadata.institution.trim() && metadata.institution.trim() !== '—'
    ? ` for ${metadata.institution.trim()}`
    : '';
  const subject = `[Career Clinic] Access Granted to Get Referred™ Portal${institutionText}`;
  const portalUrl = 'https://www.mycareercompany.com/getreferred';

  const plainText = `Dear ${recipientGreeting},

You have been granted official access to the Career Clinic — Get Referred™ Portal by My Career Company.

You can now sign in with this Google account (${cleanEmail}) and submit your profile for direct corporate referrals through our verified IIM Alumni & corporate referral network.

Access Link: ${portalUrl}

Key Features Available to You:
• Direct referral routing to verified IIM Alumni & corporate contacts across partner companies
• Step-by-step referral dossier builder with live preview slip
• Resume & cover letter submission for target job requisitions
• Direct careers portal links & verified POC network coverage

If you have any questions or require assistance, please reach out to the administrative team at My Career Company.

Best regards,
Career Clinic Institutional Referral Team
My Career Company
www.mycareercompany.com`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="font-family:'Montserrat',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#05261F;color:#F8F6EF;margin:0;padding:28px 16px;">
  <div style="max-width:620px;margin:0 auto;background:#073D32;border:1px solid rgba(212,175,124,0.35);border-radius:12px;overflow:hidden;box-shadow:0 16px 40px rgba(0,0,0,0.5);">
    <div style="background:#05261F;padding:22px 28px;border-bottom:2px solid #D4AF7C;display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div style="font-size:18px;font-weight:800;letter-spacing:1px;color:#D4AF7C;">MY CAREER COMPANY</div>
        <div style="font-size:11.5px;color:#95A199;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;">Career Clinic &bull; Get Referred™ Portal</div>
      </div>
    </div>
    <div style="padding:28px;line-height:1.7;color:#D2D5CA;">
      <div style="font-size:16px;font-weight:600;color:#F8F6EF;margin-bottom:14px;">Dear ${escapeHtml(recipientGreeting)},</div>
      <p style="margin:0 0 16px;">
        You have been granted official access to the <strong>Career Clinic — Get Referred™ Portal</strong> by <strong>My Career Company</strong>.
      </p>
      <p style="margin:0 0 16px;">
        You can now sign in with this Google account (<strong style="color:#D4AF7C;">${escapeHtml(cleanEmail)}</strong>) and submit your profile for direct corporate referrals through our verified IIM Alumni &amp; corporate referral network.
      </p>
      <div style="background:#0A493D;border:1px solid rgba(212,175,124,0.22);border-left:4px solid #D4AF7C;padding:16px 20px;border-radius:8px;margin:20px 0;">
        <div style="color:#D4AF7C;font-weight:700;font-size:13px;margin-bottom:8px;">📌 Key Features Available to You:</div>
        <ul style="margin:0;padding-left:18px;color:#E0E4DB;font-size:13px;line-height:1.75;">
          <li>Direct referral routing to verified IIM Alumni &amp; corporate contacts across partner companies</li>
          <li>Step-by-step referral dossier builder with live preview slip</li>
          <li>Resume &amp; cover letter submission for target job requisitions</li>
          <li>Direct careers portal links &amp; verified POC network coverage</li>
        </ul>
      </div>
      <div style="text-align:center;margin:28px 0 24px;">
        <a href="${portalUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#D4AF7C 0%,#B88E56 100%);color:#05261F !important;font-weight:800;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;box-shadow:0 4px 16px rgba(212,175,124,0.35);letter-spacing:0.3px;">Access Get Referred™ Portal &rarr;</a>
      </div>
      <p style="font-size:12.5px;color:#95A199;text-align:center;margin:0 0 8px;">
        Direct link: <a href="${portalUrl}" style="color:#D4AF7C;" target="_blank">${portalUrl}</a>
      </p>
    </div>
    <div style="background:#05261F;padding:18px 28px;border-top:1px solid rgba(212,175,124,0.15);text-align:center;font-size:11.5px;color:#95A199;line-height:1.5;">
      &copy; 2026 My Career Company. Sent automatically from <strong>support@mycareercompany.com</strong>.<br>
      Career Clinic &bull; Get Referred™ Portal.
    </div>
  </div>
</body>
</html>`;

  return {
    to: [cleanEmail],
    from: 'Career Clinic <support@mycareercompany.com>',
    replyTo: 'support@mycareercompany.com',
    message: {
      subject,
      text: plainText,
      html,
    },
    metadata: {
      sender: 'support@mycareercompany.com',
      recipientEmail: cleanEmail,
      recipientName: metadata.name || '',
      institution: metadata.institution || '',
      portalUrl,
      dispatchedAt: new Date().toISOString(),
    },
  };
}

export async function sendInvitationEmail(cleanEmail, metadata = {}) {
  const emailPayload = buildInvitationEmail(cleanEmail, metadata);
  const recipient = (cleanEmail || '').toLowerCase().trim();

  let webhookSuccess = false;
  try {
    if (typeof fetch === 'function') {
      const webhookPayload = {
        action: 'sendAccessInvitation',
        type: 'access_invitation',
        to: recipient,
        recipientEmail: recipient,
        email: recipient,
        recipientName: metadata.name ? metadata.name.trim() : '',
        name: metadata.name ? metadata.name.trim() : '',
        institution: metadata.institution ? metadata.institution.trim() : '',
        subject: emailPayload.message.subject,
        text: emailPayload.message.text,
        html: emailPayload.message.html,
        portalUrl: emailPayload.metadata.portalUrl || 'https://www.mycareercompany.com/getreferred',
        submittedAt: new Date().toISOString(),
      };

      await fetch(GOOGLE_APPS_SCRIPT_WEBHOOK, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(webhookPayload),
      });
      webhookSuccess = true;
    }
  } catch (whErr) {
    console.warn('[GetReferred] Invitation webhook dispatch notice:', whErr);
  }

  if (configured && db) {
    try {
      await addDoc(collection(db, 'mail'), {
        ...emailPayload,
        webhookDispatched: webhookSuccess,
        dispatchedAt: new Date().toISOString(),
      });
    } catch (_) {}

    try {
      await addDoc(collection(db, COL_ALLOWED_USERS, recipient, 'invitations'), {
        ...emailPayload,
        webhookDispatched: webhookSuccess,
        dispatchedAt: new Date().toISOString(),
      });
    } catch (_) {}
  }

  return emailPayload;
}

export async function grantUserAccess(email, metadata = {}) {
  need();
  if (!email) throw new Error('A valid email address is required.');
  const clean = String(email).toLowerCase().trim();
  if (!clean.includes('@') || !clean.includes('.')) {
    throw new Error('Please enter a valid email address format.');
  }

  const payload = {
    email: clean,
    name: metadata.name ? metadata.name.trim() : '',
    role: metadata.role || 'Candidate / Referral User',
    institution: metadata.institution ? metadata.institution.trim() : '',
    grantedAt: new Date().toISOString(),
    grantedBy: auth && auth.currentUser ? auth.currentUser.email : 'System',
    status: 'active',
    emailDispatched: true,
    emailDispatchedFrom: 'support@mycareercompany.com',
    lastEmailSentAt: new Date().toISOString(),
  };

  await setDoc(doc(db, COL_ALLOWED_USERS, clean), payload);
  await sendInvitationEmail(clean, metadata);

  try {
    const cached = JSON.parse(localStorage.getItem('CC_GETREFERRED_ALLOWED_USERS_CACHE') || '[]');
    const filtered = cached.filter((u) => (u.email || u.id) !== clean);
    filtered.unshift(payload);
    localStorage.setItem('CC_GETREFERRED_ALLOWED_USERS_CACHE', JSON.stringify(filtered));
  } catch (_) {}

  return payload;
}

export async function revokeUserAccess(email) {
  need();
  if (!email) throw new Error('Email is required.');
  const clean = String(email).toLowerCase().trim();
  if (isAdminEmail(clean)) {
    throw new Error('Cannot revoke access for primary Co-Founder account.');
  }

  try {
    await deleteDoc(doc(db, COL_ALLOWED_USERS, clean));
  } catch (err) {
    console.warn('[GetReferred] Delete referral_allowed_users note:', err);
  }

  try {
    const cached = JSON.parse(localStorage.getItem('CC_GETREFERRED_ALLOWED_USERS_CACHE') || '[]');
    const filtered = cached.filter((u) => (u.email || u.id) !== clean);
    localStorage.setItem('CC_GETREFERRED_ALLOWED_USERS_CACHE', JSON.stringify(filtered));
  } catch (_) {}

  return true;
}

/* ---------- files <-> base64 ---------- */

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(new Error('Could not read the file. Choose it again.'));
    r.readAsDataURL(file);
  });
}

export function base64ToBlob(b64, type) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

/* ---------- public: companies + submit ---------- */

export async function loadCompanies() {
  need();
  const snap = await getDoc(doc(db, ...DOC_PUBLIC_COMPANIES));
  if (!snap.exists()) return { companies: [], updatedAt: null };
  const d = snap.data();
  return { companies: Array.isArray(d.companies) ? d.companies : [], updatedAt: d.updatedAt || null };
}

export function newRequestId() {
  need();
  return doc(collection(db, COL_REQUESTS)).id;
}

/** Reads a File and returns { meta, chunks } ready for submitRequest. */
export async function prepareFile(file, contentType) {
  const b64 = await fileToBase64(file);
  const chunks = splitIntoChunks(b64);
  return { meta: { name: String(file.name).slice(0, 200), size: file.size, type: contentType, chunks: chunks.length }, chunks };
}

/**
 * Saves the request and every file piece in ONE atomic batch, so a request never exists without its files.
 * files: { resume: {meta, chunks}, 'cover-letter'?: {meta, chunks} }
 */
export async function submitRequest(requestId, data, files) {
  need();
  const batch = writeBatch(db);
  batch.set(doc(db, COL_REQUESTS, requestId), { ...data, status: 'new', submittedAt: serverTimestamp() });
  for (const [kind, f] of Object.entries(files)) {
    if (!f) continue;
    f.chunks.forEach((piece, index) => {
      batch.set(doc(db, COL_FILES, fileChunkId(requestId, kind, index)), { requestId, kind, index, data: piece });
    });
  }
  await batch.commit();
}

/* ---------- admin ---------- */

export function watchRequests(cb, onError) {
  need();
  const q = query(collection(db, COL_REQUESTS), orderBy('submittedAt', 'desc'), limit(500));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, onError);
}

export async function loadPocs() {
  need();
  const snap = await getDoc(doc(db, ...DOC_PRIVATE_POCS));
  if (!snap.exists()) return { pocs: [], updatedAt: null, updatedBy: '', stats: null, issues: [] };
  const d = snap.data();
  return { pocs: d.pocs || [], updatedAt: d.updatedAt || null, updatedBy: d.updatedBy || '', stats: d.stats || null, issues: d.issues || [], fileName: d.fileName || '' };
}

/** Publishes a parsed database: public company list + private POC list, in one atomic batch. */
export async function publishDatabase(parsed, adminEmail, fileName) {
  need();
  const batch = writeBatch(db);
  batch.set(doc(db, ...DOC_PUBLIC_COMPANIES), {
    companies: parsed.companies.map((c) => ({ name: c.name, slug: c.slug, portalUrl: c.portalUrl || '', pocCount: c.pocCount })),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, ...DOC_PRIVATE_POCS), {
    pocs: parsed.pocs,
    stats: parsed.stats,
    issues: parsed.issues.slice(0, 200),
    fileName: String(fileName || '').slice(0, 200),
    updatedAt: serverTimestamp(),
    updatedBy: adminEmail,
  });
  await batch.commit();
}

/** Reassembles a stored file. kind: 'resume' | 'cover-letter'. Returns base64. */
export async function readFileBase64(requestId, kind, meta) {
  need();
  const n = (meta && meta.chunks) || 0;
  if (!n) throw new Error('No file stored for this request.');
  const parts = await Promise.all(Array.from({ length: n }, (_, i) => getDoc(doc(db, COL_FILES, fileChunkId(requestId, kind, i)))));
  if (parts.some((p) => !p.exists())) throw new Error('Part of this file is missing.');
  return parts.map((p) => p.data().data).join('');
}

export async function fileBlob(requestId, kind, meta) {
  return base64ToBlob(await readFileBase64(requestId, kind, meta), meta.type);
}

export async function updateRequest(id, patch, adminEmail) {
  need();
  await updateDoc(doc(db, COL_REQUESTS, id), { ...patch, updatedAt: serverTimestamp(), updatedBy: adminEmail });
}

export async function logEmail(id, entry, extraPatch = {}) {
  need();
  await updateDoc(doc(db, COL_REQUESTS, id), {
    emailLog: arrayUnion({ ...entry, at: Timestamp.now() }),
    ...extraPatch,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteRequest(req) {
  need();
  const batch = writeBatch(db);
  for (const [kind, meta] of [['resume', req.resume], ['cover-letter', req.coverLetterFile]]) {
    const n = (meta && meta.chunks) || 0;
    for (let i = 0; i < n; i++) batch.delete(doc(db, COL_FILES, fileChunkId(req.id, kind, i)));
  }
  batch.delete(doc(db, COL_REQUESTS, req.id));
  await batch.commit();
}

/* ---------- mailer (Google Apps Script web app, sends from Gmail) ---------- */

/**
 * Calls the Apps Script mailer with the admin's Firebase ID token (the script verifies it before sending).
 * Uses a text/plain body so the browser sends it without a CORS preflight.
 */
export async function callMailer(action, payload = {}) {
  need();
  if (!mailerConfigured) throw Object.assign(new Error('Email sending is not set up yet. Paste the Apps Script web app URL into MAILER_URL in firebase-config.js.'), { code: 'mailer/not-configured' });
  if (!auth.currentUser) throw Object.assign(new Error('Sign in again to send emails.'), { code: 'mailer/no-user' });
  const idToken = await auth.currentUser.getIdToken();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90000);
  let res;
  try {
    res = await fetch(MAILER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, idToken, ...payload }),
      redirect: 'follow',
      signal: ctrl.signal,
    });
  } catch (e) {
    throw Object.assign(new Error(e.name === 'AbortError' ? 'The email service took too long to answer. Check Gmail\'s Sent folder before trying again.' : 'Could not reach the email service. Check your connection, and that the Apps Script is deployed with access set to "Anyone".'), { code: 'mailer/network' });
  } finally {
    clearTimeout(timer);
  }
  let out;
  try { out = await res.json(); } catch { throw Object.assign(new Error('The email service sent an unexpected reply. Redeploy the Apps Script as a web app and update MAILER_URL.'), { code: 'mailer/bad-response' }); }
  if (!out || out.ok !== true) throw Object.assign(new Error((out && out.error) || 'The email service refused the request.'), { code: 'mailer/refused' });
  return out;
}

export function friendlyError(err) {
  const code = (err && err.code) || '';
  if (code.startsWith('mailer/')) return err.message;
  if (code.includes('permission-denied') || code.includes('unauthorized')) return 'Permission denied. The security rules may not be published yet, or this account is not an admin.';
  if (code.includes('unavailable') || code.includes('network')) return 'Network problem. Check your connection and try again.';
  if (code.includes('invalid-argument') || code.includes('resource-exhausted')) return 'The files are too large to save. Use a smaller PDF (under 2 MB) and try again.';
  if (code === 'auth/popup-blocked') return 'The sign-in popup was blocked. Allow popups for this site and try again.';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'Sign-in was cancelled.';
  if (code === 'auth/unauthorized-domain') return 'This web address is not authorised for Google sign-in. Add it under Firebase Authentication → Settings → Authorized domains.';
  return (err && err.message) || 'Something went wrong.';
}
