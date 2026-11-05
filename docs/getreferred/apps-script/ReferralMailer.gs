/**
 * My Career Company · Referral Mailer (Google Apps Script web app) · v4.0
 *
 * v4 adds: every Get Referred submission is also written to the "Get Referred - Referral Requests" Google Sheet
 * (run setupGetReferredSheet ONCE), and the confirmation email says we are working on the request.
 *
 * v3 adds (all free, no Firebase Blaze plan):
 *   - confirmRequest       (public)  "We have received your request" email right after a candidate submits
 *   - referAndEarnSignup   (public)  Refer and Earn questionnaire -> new Google Sheet
 *   - sendAccessNotice     (admin)   "You now have access to Status of Referrals" email
 *   - setupReferAndEarnSheet()       run ONCE from the editor to create and share the Google Sheet
 * Everything from v2 (ping, sendReferral) is unchanged.
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

var VERSION = 'referral-mailer-4.0.0';

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

// ---- v3 settings ----
var FIREBASE_PROJECT_ID = 'my-career-company';
var SUPPORT_EMAIL = 'support@mycareercompany.com';
var PORTAL_URL = 'https://www.mycareercompany.com/getreferred';
var CONFIRM_MAX_AGE_MS = 20 * 60 * 1000;   // confirmation must be requested within 20 minutes of submitting
var CONFIRM_DAILY_MAX = 300;               // at most 300 confirmation emails a day
var CONFIRM_PER_RECIPIENT_6H = 3;          // at most 3 confirmations to one address every 6 hours
var QUOTA_RESERVE = 100;                   // keep 100 sends a day free for the co-founders' "Send 2 emails"
var SIGNUP_PER_MINUTE_MAX = 20;
var SIGNUP_PER_EMAIL_6H = 2;
var SHEET_NAME = 'MCC Refer and Earn - Referral Partner Applications';
var SHEET_HEADERS = ['Timestamp (IST)', 'Submission ID', 'Full name', 'Company', 'Current status', 'Role / designation',
  'Phone', 'Official work email', 'Work email domain', 'LinkedIn profile', 'Google sign-in email (if different)', 'City',
  'Consent given', 'Review status', 'Added to Referral Database?', 'Notes'];
var FREE_EMAIL_DOMAINS = ['gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in', 'yahoo.in', 'ymail.com', 'rediffmail.com',
  'outlook.com', 'outlook.in', 'hotmail.com', 'hotmail.co.in', 'live.com', 'live.in', 'msn.com', 'icloud.com', 'me.com',
  'mac.com', 'aol.com', 'proton.me', 'protonmail.com', 'zoho.com', 'zohomail.in', 'gmx.com', 'mail.com', 'yandex.com', 'tutanota.com'];
var POC_STATUSES = ['Current employee', 'Serving notice', 'About to join'];
// ---- v4: Get Referred requests sheet ----
var GR_SHEET_NAME = 'MCC Get Referred - Referral Requests';
var GR_SHEET_HEADERS = ['Timestamp (IST)', 'Reference', 'Full name', 'Email', 'Phone', 'Company', 'Job ID', 'Job title',
  'Note of recommendation', 'Resume file', 'Cover letter', 'Request ID', 'Status access (switch on in Access tab)', 'Notes'];
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function doGet() {
  return json_({ ok: true, service: 'mcc-referral-mailer', version: VERSION });
}

function doPost(e) {
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    // v3 public actions (no sign-in needed; each one is tightly limited)
    if (req.action === 'confirmRequest') return json_(confirmRequest_(req));
    if (req.action === 'referAndEarnSignup') return json_(referAndEarnSignup_(req));
    var admin = verifyAdmin_(req.idToken);
    if (req.action === 'sendAccessNotice') return json_(sendAccessNotice_(req, admin));
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

/* =====================================================================================
 * v3 additions
 * ===================================================================================== */

function str_(v) { return v === null || v === undefined ? '' : String(v); }

function escHtml_(s) {
  return str_(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
}

/** Plain text -> simple branded HTML (paragraphs, line breaks, clickable links). */
function textToHtml_(text) {
  var paras = str_(text).split(/\n{2,}/).map(function (p) {
    var html = escHtml_(p).replace(/https?:\/\/[^\s<]+/g, function (u) {
      var m = u.match(/^(.*?)([).,;:!?]*)$/);
      return '<a href="' + m[1] + '" style="color:#073D32;">' + m[1] + '</a>' + m[2];
    });
    return '<p style="margin:0 0 14px 0;">' + html.replace(/\n/g, '<br>') + '</p>';
  }).join('');
  return '<div style="font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#2B2B2B;max-width:640px;">' +
    '<div style="border-top:4px solid #073D32;padding-top:16px;">' + paras + '</div>' +
    '<div style="border-top:1px solid #D4AF7C;margin-top:8px;padding-top:8px;font-size:12px;color:#6b7a72;">My Career Company · Career Clinic · Get Referred&trade;</div></div>';
}

function todayKey_() {
  return Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
}

/** Adds n to a per-day counter in Script Properties; returns the new value. Caller holds the lock. */
function bumpDaily_(name, n) {
  var props = PropertiesService.getScriptProperties();
  var key = name + '_' + todayKey_();
  var v = Number(props.getProperty(key) || 0) + n;
  props.setProperty(key, String(v));
  return v;
}

function readDaily_(name) {
  return Number(PropertiesService.getScriptProperties().getProperty(name + '_' + todayKey_()) || 0);
}

/** Reads one Firestore document as an unauthenticated visitor (security rules apply). Returns fields or null. */
function firestoreGetPublic_(path) {
  var url = 'https://firestore.googleapis.com/v1/projects/' + FIREBASE_PROJECT_ID + '/databases/(default)/documents/' + path +
    '?key=' + encodeURIComponent(FIREBASE_API_KEY);
  var res = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return null;
  var doc = JSON.parse(res.getContentText()) || {};
  return doc.fields || null;
}

function fsString_(fields, key) {
  var f = fields && fields[key];
  return f && f.stringValue !== undefined ? String(f.stringValue) : '';
}

function fsBool_(fields, key) {
  var f = fields && fields[key];
  return !!(f && f.booleanValue === true);
}

/** v4: one row per Get Referred submission in the Referral Requests sheet. Never blocks the email. */
function appendRequestRow_(id, f, email) {
  var sheetId = PropertiesService.getScriptProperties().getProperty('GET_REFERRED_SHEET_ID');
  if (!sheetId) return 'not_set_up';
  var cache = CacheService.getScriptCache();
  if (cache.get('sheet_' + id)) return 'duplicate';
  var sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
  if (sheet.getLastRow() === 0) sheet.appendRow(GR_SHEET_HEADERS);
  sheet.appendRow([
    Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss'), 'MCC-R-' + id.slice(0, 6).toUpperCase(),
    cell_(fsString_(f, 'fullName') || fsString_(f, 'firstName')), cell_(email), cell_(fsString_(f, 'phone')),
    cell_(fsString_(f, 'company')), cell_(fsString_(f, 'jobId')), cell_(fsString_(f, 'jobTitle')),
    cell_(fsString_(f, 'note').slice(0, 1500)), cell_(fsString_(f, 'resumeName')), fsBool_(f, 'hasCoverLetter') ? 'Yes' : 'No',
    id, 'Off', '',
  ]);
  cache.put('sheet_' + id, '1', 21600);
  return 'ok';
}

function fsTime_(fields, key) {
  var f = fields && fields[key];
  var t = f && f.timestampValue ? Date.parse(f.timestampValue) : NaN;
  return isNaN(t) ? 0 : t;
}

/**
 * confirmRequest (public): emails the candidate "we have received your request".
 * The browser sends ONLY the request id. The address is read from Firestore (referral_confirmations/{id}),
 * which is written in the same save as the request and is readable for 30 minutes only.
 */
function confirmRequest_(req) {
  var id = str_(req.requestId);
  if (!/^[A-Za-z0-9]{15,40}$/.test(id)) throw new Error('Invalid request reference.');
  var cache = CacheService.getScriptCache();
  if (cache.get('conf_' + id)) return { ok: true, sent: 0, duplicate: true };

  var f = firestoreGetPublic_('referral_confirmations/' + id);
  if (!f) throw new Error('Request not found, or the confirmation window has closed.');
  var email = fsString_(f, 'email').toLowerCase();
  var created = fsTime_(f, 'createdAt');
  if (!EMAIL_RE.test(email)) throw new Error('The request has no valid email address.');
  if (!created || Date.now() - created > CONFIRM_MAX_AGE_MS) throw new Error('This confirmation request has expired.');

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  var sheetResult = 'error';
  try {
    if (cache.get('conf_' + id)) return { ok: true, sent: 0, duplicate: true };
    try { sheetResult = appendRequestRow_(id, f, email); }
    catch (sheetErr) { console.log(VERSION + ' sheet append failed: ' + sheetErr); }
    var perKey = 'conf_to_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email)).slice(0, 40);
    var perCount = Number(cache.get(perKey) || 0);
    if (perCount >= CONFIRM_PER_RECIPIENT_6H) throw new Error('Too many confirmation emails to this address. Try again later.');
    if (readDaily_('conf') >= CONFIRM_DAILY_MAX) throw new Error('Daily confirmation limit reached.');
    if (MailApp.getRemainingDailyQuota() <= QUOTA_RESERVE) throw new Error('Email quota is reserved for the team today.');

    var t = buildConfirmationEmail_({
      firstName: fsString_(f, 'firstName'), company: fsString_(f, 'company'),
      jobId: fsString_(f, 'jobId'), jobTitle: fsString_(f, 'jobTitle'), email: email, ref: 'MCC-R-' + id.slice(0, 6).toUpperCase(),
    });
    var opts = { name: SENDER_NAME, replyTo: SUPPORT_EMAIL, htmlBody: textToHtml_(t.text) };
    if (FROM_ALIAS) opts.from = FROM_ALIAS;
    GmailApp.sendEmail(email, t.subject, t.text, opts);

    cache.put('conf_' + id, '1', 21600);
    cache.put(perKey, String(perCount + 1), 21600);
    bumpDaily_('conf', 1);
  } finally {
    lock.releaseLock();
  }
  return { ok: true, sent: 1, sheet: sheetResult };
}

function buildConfirmationEmail_(d) {
  var name = (d.firstName || '').replace(/[\r\n<>]/g, '').slice(0, 60) || 'there';
  var company = (d.company || '').replace(/[\r\n]/g, ' ').slice(0, 120);
  var job = (d.jobTitle ? d.jobTitle.replace(/[\r\n]/g, ' ').slice(0, 150) + ' (Job ID ' : 'Job ID ') + (d.jobId || '').replace(/[\r\n]/g, ' ').slice(0, 100) + (d.jobTitle ? ')' : '');
  var subject = 'My Career Company has received your referral request – ' + company;
  var lines = [
    'Hi ' + name + ',',
    '',
    'Thank you for your referral request. My Career Company has received your details for ' + job + ' at ' + company + ', and our team is working on it.',
    '',
    'What happens next',
    'We will connect you with our referral POC at ' + company + ' soon. You will get a second email from us as soon as your details have been shared with the POC.',
    '',
    'Track your request',
    'Sign in with Google at ' + PORTAL_URL + '#status using ' + d.email + ' once our team has enabled Status of Referrals for your account.',
    '',
    'Please note: the referral POC decides whether to refer you, so a referral is not guaranteed.',
    '',
    'Your reference: ' + d.ref,
    '',
    'Didn\'t submit this request? Reply to this email and we will delete it.',
    '',
    'Warm regards,',
    'My Career Company',
    'support@mycareercompany.com',
  ];
  return { subject: subject, text: lines.join('\n') };
}

/** Neutralises spreadsheet formula injection (=, +, -, @ at the start of a cell). */
function cell_(v) {
  var s = str_(v).replace(/[\r\n\t]+/g, ' ').trim().slice(0, 300);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function cleanPhone_(v) {
  var s = str_(v).replace(/[\s\-().]/g, '');
  var m = s.match(/^(?:\+?91|0)?([6-9]\d{9})$/);
  if (m) return '+91 ' + m[1].slice(0, 5) + ' ' + m[1].slice(5);
  m = s.match(/^\+(\d{8,15})$/);
  return m ? '+' + m[1] : '';
}

function cleanLinkedIn_(v) {
  var s = str_(v).trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  var m = s.match(/^https?:\/\/([^\/?#]+)(\/[^?#]*)?/i);
  if (!m || !/(^|\.)linkedin\.com$/i.test(m[1]) || !/^\/(in|pub)\//i.test(m[2] || '')) return '';
  return 'https://www.linkedin.com' + m[2].replace(/\/+$/, '');
}

/** referAndEarnSignup (public): appends one questionnaire answer to the Refer and Earn Google Sheet. */
function referAndEarnSignup_(req) {
  if (str_(req.hp)) return { ok: true, submissionId: 'ignored' };          // honeypot filled: pretend success
  if (Number(req.t || 0) < 4000) return { ok: true, submissionId: 'ignored' }; // filled impossibly fast
  var d = req.data || {};
  var name = str_(d.fullName).replace(/\s+/g, ' ').trim();
  var company = str_(d.company).trim();
  var status = str_(d.status);
  var role = str_(d.role).trim();
  var phone = cleanPhone_(d.phone);
  var work = str_(d.workEmail).trim().toLowerCase();
  var linkedin = cleanLinkedIn_(d.linkedin);
  var google = str_(d.googleEmail).trim().toLowerCase();
  var city = str_(d.city).trim();
  var domain = work.split('@')[1] || '';
  if (name.length < 2 || name.length > 80) throw new Error('Enter your full name.');
  if (!company || company.length > 120) throw new Error('Choose or type your company.');
  if (POC_STATUSES.indexOf(status) === -1) throw new Error('Confirm your current status at this company.');
  if (role.length < 2 || role.length > 100) throw new Error('Enter your role or designation.');
  if (!phone) throw new Error('Enter a valid phone number.');
  if (!EMAIL_RE.test(work)) throw new Error('Enter your official work email.');
  if (FREE_EMAIL_DOMAINS.indexOf(domain) !== -1) throw new Error('Use your official company email, not a personal one.');
  if (!linkedin) throw new Error('Enter your LinkedIn profile link.');
  if (google && !EMAIL_RE.test(google)) throw new Error('The Google sign-in email is not valid.');
  if (d.consent !== true) throw new Error('Consent is required.');

  var sheetId = PropertiesService.getScriptProperties().getProperty('REFER_EARN_SHEET_ID');
  if (!sheetId) throw new Error('The Refer and Earn sheet is not set up yet. Run setupReferAndEarnSheet once in the Apps Script editor.');

  var cache = CacheService.getScriptCache();
  var minuteKey = 'su_min_' + Math.floor(Date.now() / 60000);
  var emailKey = 'su_em_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, work)).slice(0, 40);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  var submissionId = 'RE-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  try {
    var perMinute = Number(cache.get(minuteKey) || 0);
    if (perMinute >= SIGNUP_PER_MINUTE_MAX) throw new Error('Too many sign-ups right now. Please try again in a minute.');
    var perEmail = Number(cache.get(emailKey) || 0);
    if (perEmail >= SIGNUP_PER_EMAIL_6H) throw new Error('We already have your details. Our team will be in touch.');
    var sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
    if (sheet.getLastRow() === 0) sheet.appendRow(SHEET_HEADERS);
    sheet.appendRow([
      Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss'), submissionId, cell_(name), cell_(company),
      cell_(status), cell_(role), cell_(phone), cell_(work), cell_(domain), cell_(linkedin), cell_(google), cell_(city),
      'Yes', 'New', 'No', '',
    ]);
    cache.put(minuteKey, String(perMinute + 1), 120);
    cache.put(emailKey, String(perEmail + 1), 21600);
  } finally {
    lock.releaseLock();
  }
  return { ok: true, submissionId: submissionId };
}

/** sendAccessNotice (admin): "You now have access to Status of Referrals" with sign-in instructions. */
function sendAccessNotice_(req, admin) {
  var to = str_(req.to).trim().toLowerCase();
  if (!EMAIL_RE.test(to)) throw new Error('The email address is not valid.');
  var kind = ['poc', 'candidate', 'both'].indexOf(req.kind) === -1 ? 'candidate' : req.kind;
  var name = str_(req.name).replace(/[\r\n<>]/g, '').trim().split(/\s+/)[0] || 'there';
  if (MailApp.getRemainingDailyQuota() < 1) throw new Error('Gmail\'s daily sending limit is reached. Try again tomorrow.');
  var what = kind === 'poc'
    ? 'You can now see the referral requests My Career Company sends you, and mark each one as referred once you have submitted it in your company\'s referral portal (uploading proof is optional).'
    : kind === 'both'
      ? 'You can now track your own referral requests, see the referral requests My Career Company sends you, and mark them as referred.'
      : 'You can now track the progress of your referral requests: when your details are shared with the referral POC, and when the POC has referred you.';
  var lines = [
    'Hi ' + name + ',',
    '',
    'You now have access to Status of Referrals on the My Career Company Get Referred™ portal.',
    '',
    what,
    '',
    'How to sign in',
    '1. Open ' + PORTAL_URL + '#status',
    '2. Click "Sign in" and choose Google, using this email address: ' + to,
    '3. If ' + to + ' is not a Google account yet, you can create one for free with your existing email: go to accounts.google.com/signup, choose "For my personal use", then "Use your existing email". Or reply to this email with another Google address you would like to use.',
    '',
    'Warm regards,',
    'My Career Company',
    'support@mycareercompany.com',
  ];
  var subject = 'You now have access to Status of Referrals – My Career Company';
  var opts = { name: SENDER_NAME, replyTo: SUPPORT_EMAIL, htmlBody: textToHtml_(lines.join('\n')) };
  if (FROM_ALIAS) opts.from = FROM_ALIAS;
  GmailApp.sendEmail(to, subject, lines.join('\n'), opts);
  console.log(VERSION + ' access notice to=' + to + ' kind=' + kind + ' by=' + admin);
  return { ok: true, sent: 1, quotaLeft: MailApp.getRemainingDailyQuota() };
}

/** Creates (once) a Google Sheet with the given headers, shares it with the co-founders, stores its id. */
function setupSheet_(propKey, name, headers, tabName) {
  var props = PropertiesService.getScriptProperties();
  var existing = props.getProperty(propKey);
  if (existing) {
    console.log('Sheet already set up: https://docs.google.com/spreadsheets/d/' + existing + '/edit');
    return existing;
  }
  var ss = SpreadsheetApp.create(name);
  var sheet = ss.getSheets()[0];
  sheet.setName(tabName);
  sheet.appendRow(headers);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#073D32').setFontColor('#F8F6EF');
  var me = Session.getEffectiveUser().getEmail().toLowerCase();
  ADMIN_EMAILS.forEach(function (email) {
    if (email === me) return;
    try { ss.addEditor(email); console.log('Shared with ' + email); }
    catch (err) { console.log('Could not share with ' + email + ': ' + err + '. Share it manually from the Sheet\'s Share button.'); }
  });
  props.setProperty(propKey, ss.getId());
  console.log('Created: ' + ss.getUrl());
  return ss.getId();
}

/** v4: run ONCE from the editor (choose setupGetReferredSheet, click Run). Creates the Get Referred requests sheet. */
function setupGetReferredSheet() {
  return setupSheet_('GET_REFERRED_SHEET_ID', GR_SHEET_NAME, GR_SHEET_HEADERS, 'Referral requests');
}

/**
 * Run ONCE from the Apps Script editor (choose setupReferAndEarnSheet, click Run).
 * Creates the Refer and Earn Google Sheet in this account's Drive and shares it with the co-founders.
 */
function setupReferAndEarnSheet() {
  var props = PropertiesService.getScriptProperties();
  var existing = props.getProperty('REFER_EARN_SHEET_ID');
  if (existing) {
    console.log('Sheet already set up: https://docs.google.com/spreadsheets/d/' + existing + '/edit');
    return existing;
  }
  var ss = SpreadsheetApp.create(SHEET_NAME);
  var sheet = ss.getSheets()[0];
  sheet.setName('Applications');
  sheet.appendRow(SHEET_HEADERS);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, SHEET_HEADERS.length).setFontWeight('bold').setBackground('#073D32').setFontColor('#F8F6EF');
  var me = Session.getEffectiveUser().getEmail().toLowerCase();
  ADMIN_EMAILS.forEach(function (email) {
    if (email === me) return;
    try { ss.addEditor(email); console.log('Shared with ' + email); }
    catch (err) { console.log('Could not share with ' + email + ': ' + err + '. Share it manually from the Sheet\'s Share button.'); }
  });
  props.setProperty('REFER_EARN_SHEET_ID', ss.getId());
  console.log('Created: ' + ss.getUrl());
  return ss.getId();
}
