/* My Career Company · Cloud Function "fetchJd" · opens a JD link and returns the JD text.
 * Called by the Resume Fit Score page at POST /api/fetch-jd (Firebase Hosting rewrite → this function).
 * Privacy: receives ONLY the JD link. The resume never leaves the user's browser.
 * Access: signed-in users who are co-founders or active in Firestore `allowed_users/{email}`.
 */
'use strict';
const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions, logger } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const { extractJob } = require('./jd-extract');

admin.initializeApp();
setGlobalOptions({ region: 'asia-south1', maxInstances: 5 });

const CO_FOUNDERS = ['upam.patra@gmail.com', 'iimonkataki@mycareercompany.com', 'ibonkataki@mycareercompany.com', 'anirbanroy@mycareercompany.com'];
const LIMIT = 30, WINDOW_MS = 10 * 60 * 1000;            // 30 links per user per 10 minutes (per server instance)
const hits = new Map();
const IN_EMULATOR = process.env.FUNCTIONS_EMULATOR === 'true';

async function authorise(req) {
  const m = /^Bearer\s+(.+)$/i.exec(req.get('Authorization') || '');
  if (!m) return { code: 401, message: 'Please sign in again to read job links.' };
  let user;
  try { user = await admin.auth().verifyIdToken(m[1]); } catch (e) { return { code: 401, message: 'Your sign-in has expired. Please sign in again.' }; }
  const email = String(user.email || '').toLowerCase();
  if (CO_FOUNDERS.includes(email)) return { user, email };
  if (IN_EMULATOR) { logger.warn('[fetchJd] emulator: skipping allowed_users check for ' + email); return { user, email }; }
  try {
    const doc = await admin.firestore().collection('allowed_users').doc(email).get();
    if (doc.exists && doc.get('isActive') !== false) return { user, email };
  } catch (e) { logger.error('[fetchJd] allowed_users lookup failed', e.message); }
  return { code: 403, message: 'Your account does not have access to the JD reader.' };
}
function rateLimited(uid) {
  const now = Date.now(), list = (hits.get(uid) || []).filter(t => now - t < WINDOW_MS);
  if (list.length >= LIMIT) { hits.set(uid, list); return true; }
  list.push(now); hits.set(uid, list); return false;
}

exports.fetchJd = onRequest({ timeoutSeconds: 30, memory: '256MiB', cors: [/mycareercompany\.com$/, /^https?:\/\/localhost(:\d+)?$/, /^https?:\/\/127\.0\.0\.1(:\d+)?$/] }, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false, reason: 'method', message: 'Use POST.' }); return; }
  const a = await authorise(req);
  if (a.code) { res.status(a.code).json({ ok: false, reason: 'auth', message: a.message }); return; }
  if (rateLimited(a.user.uid)) { res.status(429).json({ ok: false, reason: 'rate_limited', message: 'Too many job links in a short time. Please wait a few minutes.' }); return; }
  const url = String((req.body && req.body.url) || '').trim().slice(0, 2000);
  const started = Date.now();
  let out;
  try { out = await extractJob(url); } catch (e) { out = { ok: false, reason: 'error', message: 'the job page could not be read' }; }
  let host = ''; try { host = new URL(url).hostname; } catch (_) {}
  logger.info('[fetchJd]', { host, ok: out.ok, reason: out.reason || null, source: out.source || null, words: out.words || 0, ms: Date.now() - started });   // no JD text in logs
  res.status(200).json(out);
});
