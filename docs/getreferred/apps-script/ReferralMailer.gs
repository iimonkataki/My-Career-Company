/**
 * My Career Company · Referral Mailer (Google Apps Script web app) · v2.0
 *
 * Sends the two referral emails straight from Gmail (no new window), for www.mycareercompany.com/getreferred:
 *   1) to the POC, with the resume (and cover letter) attached
 *   2) to the candidate, confirming their profile was shared
 *
 * Free: runs on your Google Workspace account. No Firebase Blaze plan, no Cloud Functions.
 *
 * SETUP (once), signed in as the account that should send the emails (recommended: support@mycareercompany.com):
 *   1. script.google.com → New project → name it "MCC Referral Mailer" → replace everything in Code.gs with this file.
 *   2. Paste your Firebase Web API key into FIREBASE_API_KEY below (same value as apiKey in firebase-config.js).
 *   3. Deploy → New deployment → type "Web app" → Execute as: Me → Who has access: Anyone → Deploy → Authorize.
 *   4. Copy the Web app URL (ends with /exec) into MAILER_URL in get-referred/firebase-config.js.
 *   After editing this script later: Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy.
 *   (Using "Manage deployments" keeps the same URL.)
 *
 * SECURITY: anyone can reach the URL, but every request must carry a valid Firebase sign-in token for one of
 * ADMIN_EMAILS. The token is checked with Google's Identity Toolkit API before anything is sent.
 */

var VERSION = 'referral-mailer-2.0.0';

// Same value as apiKey in get-referred/firebase-config.js (public by design).
var FIREBASE_API_KEY = 'PASTE_FIREBASE_WEB_API_KEY';

// Must match ADMIN_EMAILS in firebase-config.js and the Firestore rules.
var ADMIN_EMAILS = [
  'anirbanroy@mycareercompany.com',
  'ibonkataki@mycareercompany.com',
  'iimonkataki@mycareercompany.com',
  'upam.patra@gmail.com'
];

var SENDER_NAME = 'My Career Company';
// Optional: send as a Gmail "Send mail as" alias of the deploying account (e.g. 'support@mycareercompany.com').
// Leave empty to send from the account that deployed the script.
var FROM_ALIAS = '';
var SITE_REFERER = 'https://www.mycareercompany.com/';

var MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function doGet() {
  return json_({ ok: true, service: 'mcc-referral-mailer', version: VERSION });
}

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var admin = verifyAdmin_(req.idToken);
    if (req.action === 'ping') {
      return json_({ ok: true, version: VERSION, admin: admin, from: senderAddress_(), quotaLeft: MailApp.getRemainingDailyQuota() });
    }
    if (req.action === 'sendReferral') {
      return json_(sendReferral_(req, admin));
    }
    return json_({ ok: false, error: 'Unknown action.' });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

/** Checks the Firebase ID token with Google and returns the admin's email, or throws. */
function verifyAdmin_(idToken) {
  if (!idToken || typeof idToken !== 'string') throw new Error('Not signed in. Sign in again and retry.');
  if (!FIREBASE_API_KEY || FIREBASE_API_KEY.indexOf('PASTE') === 0) throw new Error('Mailer setup incomplete: paste the Firebase Web API key into FIREBASE_API_KEY in the Apps Script.');
  var res = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(FIREBASE_API_KEY), {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ idToken: idToken }),
    headers: { Referer: SITE_REFERER },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) throw new Error('Your sign-in could not be verified. Sign out, sign in again and retry.');
  var users = (JSON.parse(res.getContentText()) || {}).users || [];
  var u = users[0] || {};
  var email = String(u.email || '').toLowerCase();
  if (u.emailVerified !== true || ADMIN_EMAILS.indexOf(email) === -1) throw new Error('This account is not allowed to send referral emails.');
  return email;
}

function sendReferral_(req, admin) {
  var poc = req.poc || {};
  var cand = req.candidate || null;
  checkMessage_(poc, 'POC');
  if (poc.cc && !EMAIL_RE.test(String(poc.cc))) throw new Error('The CC address is not valid.');
  if (cand) checkMessage_(cand, 'candidate');

  var attachments = [];
  var total = 0;
  (poc.attachments || []).slice(0, 5).forEach(function (a) {
    if (!a || !a.base64 || !a.filename) return;
    var bytes = Utilities.base64Decode(String(a.base64));
    total += bytes.length;
    attachments.push(Utilities.newBlob(bytes, String(a.mimeType || 'application/octet-stream'), String(a.filename).slice(0, 120)));
  });
  if (total > MAX_ATTACHMENT_BYTES) throw new Error('Attachments are too large to email.');

  var needed = 1 + (poc.cc ? 1 : 0) + (cand ? 1 : 0);
  var left = MailApp.getRemainingDailyQuota();
  if (left < needed) throw new Error('Gmail\'s daily sending limit is reached (' + left + ' left). Try again tomorrow.');

  var pocOpts = { name: SENDER_NAME, replyTo: validOr_(poc.replyTo, admin), htmlBody: String(poc.html || ''), attachments: attachments };
  if (poc.cc) pocOpts.cc = String(poc.cc);
  if (FROM_ALIAS) pocOpts.from = FROM_ALIAS;
  if (!pocOpts.htmlBody) delete pocOpts.htmlBody;
  GmailApp.sendEmail(String(poc.to), String(poc.subject), String(poc.text), pocOpts);
  var sent = 1;

  if (cand) {
    var candOpts = { name: SENDER_NAME, replyTo: validOr_(cand.replyTo, admin), htmlBody: String(cand.html || '') };
    if (FROM_ALIAS) candOpts.from = FROM_ALIAS;
    if (!candOpts.htmlBody) delete candOpts.htmlBody;
    GmailApp.sendEmail(String(cand.to), String(cand.subject), String(cand.text), candOpts);
    sent = 2;
  }

  console.log(VERSION + ' sent=' + sent + ' ref=' + String(req.requestRef || '') + ' by=' + admin);
  return { ok: true, sent: sent, from: senderAddress_(), quotaLeft: MailApp.getRemainingDailyQuota() };
}

function checkMessage_(m, who) {
  if (!EMAIL_RE.test(String(m.to || ''))) throw new Error('The ' + who + ' email address is not valid.');
  if (!String(m.subject || '').trim()) throw new Error('The ' + who + ' email needs a subject.');
  if (!String(m.text || '').trim()) throw new Error('The ' + who + ' email needs a message.');
  if (String(m.text).length > 100000 || String(m.html || '').length > 300000) throw new Error('The ' + who + ' email is too long.');
}

function validOr_(email, fallback) {
  return EMAIL_RE.test(String(email || '')) ? String(email) : fallback;
}

function senderAddress_() {
  return FROM_ALIAS || Session.getEffectiveUser().getEmail();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Optional: run this once from the editor (Run ▶) to grant permissions and check your daily quota. */
function testSetup() {
  console.log('Sending account: ' + senderAddress_());
  console.log('Emails left today: ' + MailApp.getRemainingDailyQuota());
}
