/* My Career Company · Get Referred portal · Firebase service (v2.0)
 * Free Spark plan only: Auth + Firestore. No Cloud Storage, no Cloud Functions, no extensions.
 * Files live in Firestore (split into pieces). Emails go through a Google Apps Script web app.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, doc, collection, getDoc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy, limit, serverTimestamp, arrayUnion, Timestamp, writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig, ADMIN_EMAILS, MAILER_URL } from './firebase-config.js?v=2.0';
import { splitIntoChunks, fileChunkId } from './referral-core.js?v=2.0';

export const COL_REQUESTS = 'referral_requests';
export const COL_FILES = 'referral_files';
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

/* ---------- auth ---------- */

export function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(String(email).toLowerCase());
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
