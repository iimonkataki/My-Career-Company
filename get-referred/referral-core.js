/* My Career Company · Get Referred portal · core logic (v2.0)
 * Pure functions only: no DOM, no Firebase. Imported by the browser app and by Node tests.
 */

export const CORE_VERSION = 'getreferred-core-2.0.0';

/* Files are stored inside Firestore (free Spark plan, no Cloud Storage), split into pieces.
 * Limits must match rules/firestore.getreferred.rules. */
export const MAX_RESUME_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_COVER_BYTES = 1 * 1024 * 1024;  // 1 MB
export const CHUNK_CHARS = 950000;               // base64 characters per Firestore document (limit is 1 MiB)
export const MAX_CHUNKS = 3;
export const NOTE_MIN = 40;
export const NOTE_MAX = 1500;
export const COVER_TEXT_MAX = 6000;

export const ALLOWED_FILE_TYPES = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export const POC_STATUSES = ['Current employee', 'Serving notice', 'About to join', 'Ex employee'];

export const REQUEST_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'poc_emailed', label: 'POC emailed' },
  { value: 'referred', label: 'Referred' },
  { value: 'not_a_fit', label: 'Not a fit' },
  { value: 'closed', label: 'Closed' },
];

/* ---------- small text helpers ---------- */

export function cleanText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isNaN(value)) return '';
  return String(value).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

export function slugify(name) {
  return cleanText(name)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function firstName(fullName) {
  const parts = cleanText(fullName).split(' ').filter(Boolean);
  if (!parts.length) return '';
  // Skip a leading single-letter initial ("S Andrew Gangte" -> "Andrew")
  if (parts.length > 1 && parts[0].replace('.', '').length === 1) return parts[1];
  return parts[0];
}

export function shortRef(id) {
  return 'MCC-R-' + String(id || '').slice(0, 6).toUpperCase();
}

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/* ---------- field normalisers ---------- */

export function normalizeStatus(raw) {
  const s = cleanText(raw).toLowerCase();
  if (!s) return 'Unknown';
  if (/^(ex|former|previous|past)/.test(s) || s.includes('ex-employee') || s.includes('ex employee')) return 'Ex employee';
  if (s.includes('notice')) return 'Serving notice';
  if (s.includes('about to') || s.includes('joining') || s.includes('to join')) return 'About to join';
  if (s.includes('current') || s === 'employed' || s === 'working') return 'Current employee';
  return cleanText(raw);
}

export function normalizePhone(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '';
    return Math.round(value).toString();
  }
  const s = cleanText(value);
  // Excel sometimes stores long numbers as "7.337403087E9"
  if (/^\d+(\.\d+)?e\+?\d+$/i.test(s)) return Math.round(Number(s)).toString();
  return s.replace(/\.0$/, '');
}

export function phoneDigitsForWhatsApp(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 10) d = '91' + d;
  return d.length >= 10 && d.length <= 15 ? d : '';
}

export function normalizeUrl(value) {
  let s = cleanText(value);
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) {
    if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(s)) s = 'https://' + s;
    else return '';
  }
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : '';
  } catch {
    return '';
  }
}

export function isValidEmail(email) {
  const s = cleanText(email);
  return s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

/** Accepts Indian mobiles (with or without +91 / 0) and international numbers starting with + */
export function normalizeCandidatePhone(raw) {
  const s = cleanText(raw).replace(/[\s\-().]/g, '');
  let m = s.match(/^(?:\+?91|0)?([6-9]\d{9})$/);
  if (m) return '+91 ' + m[1].slice(0, 5) + ' ' + m[1].slice(5);
  m = s.match(/^\+(\d{8,15})$/);
  if (m) return '+' + m[1];
  return '';
}

export function looksFirstPerson(note) {
  const s = ' ' + String(note || '') + ' ';
  return /[\s("'](I|I'm|I am|I've|I'd|I'll)[\s,.;:!?'")]/.test(s) ||
    /[\s("'](my|me|myself|mine)[\s,.;:!?'")]/i.test(s);
}

export function fileExtension(name) {
  const m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

/** Returns the MIME type we will upload with, or '' if the file type is not allowed. */
export function resolveFileType(file) {
  const ext = fileExtension(file && file.name);
  if (ALLOWED_FILE_TYPES[ext]) return ALLOWED_FILE_TYPES[ext];
  const t = (file && file.type) || '';
  return Object.values(ALLOWED_FILE_TYPES).includes(t) ? t : '';
}

export function validateFile(file, { required = false, label = 'File', maxBytes = MAX_RESUME_BYTES } = {}) {
  if (!file) return required ? `Add your ${label.toLowerCase()}.` : '';
  if (!resolveFileType(file)) return `${label} must be a PDF or Word file (.pdf, .doc or .docx).`;
  if (file.size > maxBytes) return `${label} is ${formatBytes(file.size)}. Keep it under ${formatBytes(maxBytes)} (in Word or your PDF app, use "Save as PDF" with a smaller file size).`;
  if (file.size === 0) return `${label} looks empty. Choose the file again.`;
  return '';
}

/** Splits a base64 string into Firestore-sized pieces. */
export function splitIntoChunks(b64, size = CHUNK_CHARS) {
  const out = [];
  for (let i = 0; i < b64.length; i += size) out.push(b64.slice(i, i + size));
  return out;
}

/** Document id for one piece of a file: {requestId}_{kind}_{index}. Must match the rules. */
export function fileChunkId(requestId, kind, index) {
  return `${requestId}_${kind}_${index}`;
}

/* ---------- request validation (mirrors firestore rules) ---------- */

export function validateRequest(form) {
  const errors = {};
  const resumeErr = validateFile(form.resumeFile, { required: true, label: 'Resume', maxBytes: MAX_RESUME_BYTES });
  if (resumeErr) errors.resume = resumeErr;

  if (!form.companySlug) errors.company = 'Choose the company you want to be referred to.';

  const jobId = cleanText(form.jobId);
  if (!jobId) errors.jobId = 'Paste the job ID from the job posting.';
  else if (jobId.length > 100) errors.jobId = 'Job ID looks too long. Paste only the ID.';

  if (cleanText(form.jobTitle).length > 150) errors.jobTitle = 'Keep the job title under 150 characters.';

  const name = cleanText(form.fullName);
  if (name.length < 2) errors.fullName = 'Enter your full name.';
  else if (name.length > 100) errors.fullName = 'Keep your name under 100 characters.';

  if (!isValidEmail(form.email)) errors.email = 'Enter a valid email address, like name@example.com.';

  if (!normalizeCandidatePhone(form.phone)) errors.phone = 'Enter a 10-digit mobile number, or include the country code (for example +44…).';

  const note = String(form.note || '').trim();
  if (note.length < NOTE_MIN) errors.note = `Write at least ${NOTE_MIN} characters (you have ${note.length}).`;
  else if (note.length > NOTE_MAX) errors.note = `Keep the note under ${NOTE_MAX} characters.`;

  if (form.coverMode === 'file') {
    const e = validateFile(form.coverFile, { required: false, label: 'Cover letter', maxBytes: MAX_COVER_BYTES });
    if (e) errors.cover = e;
  } else if (String(form.coverText || '').length > COVER_TEXT_MAX) {
    errors.cover = `Keep the cover letter under ${COVER_TEXT_MAX} characters.`;
  }

  if (!form.consent) errors.consent = 'Tick the box so we can share your details with the referral contact.';

  return { ok: Object.keys(errors).length === 0, errors };
}

/** Builds the Firestore document a visitor creates. Keys must match the firestore rules allow-list. */
export function buildRequestDoc(form, company, uploads) {
  const doc = {
    fullName: cleanText(form.fullName),
    email: cleanText(form.email).toLowerCase(),
    phone: normalizeCandidatePhone(form.phone),
    company: company.name,
    companySlug: company.slug,
    jobId: cleanText(form.jobId),
    recommendationNote: String(form.note || '').trim(),
    resume: uploads.resume,
    consent: true,
    source: 'getreferred-web-v1',
  };
  const jobTitle = cleanText(form.jobTitle);
  if (jobTitle) doc.jobTitle = jobTitle;
  const coverText = form.coverMode === 'text' ? String(form.coverText || '').trim() : '';
  if (coverText) doc.coverLetterText = coverText;
  if (uploads.coverLetter) doc.coverLetterFile = uploads.coverLetter;
  if (company.portalUrl) doc.portalUrl = company.portalUrl;
  return doc;
}

/* ---------- database parsing (Excel / Google Sheets export) ---------- */

const H = {
  company: /^(company|companies|company name|organisation|organization)$/,
  name: /^((referral )?poc( name)?|name|referrer( name)?|referral contact( name)?)$/,
  status: /status/,
  role: /^(role|designation|title|position|current role)/,
  phone: /(contact number|phone|mobile|whatsapp|contact no)/,
  email: /(e-?mail)/,
  linkedin: /linkedin/,
  portal: /(portal|career|jobs? (page|site|link)|website|url|link)/,
};

function headerKey(cell) {
  return cleanText(cell).toLowerCase();
}

function mapColumns(headerRow, wanted) {
  const map = {};
  headerRow.forEach((cell, i) => {
    const h = headerKey(cell);
    if (!h) return;
    for (const key of wanted) {
      if (map[key] !== undefined) continue;
      if (key === 'phone' && (H.linkedin.test(h) || H.email.test(h))) continue;
      if (key === 'portal' && H.linkedin.test(h)) continue;
      if (H[key].test(h)) { map[key] = i; break; }
    }
  });
  return map;
}

function findHeader(rows, mustHave) {
  const limit = Math.min(rows.length, 15);
  for (let r = 0; r < limit; r++) {
    const row = rows[r] || [];
    const cols = mapColumns(row, Object.keys(H));
    if (mustHave.every((k) => cols[k] !== undefined)) return { index: r, cols: mapColumns(row, mustHave.concat(Object.keys(H).filter((k) => !mustHave.includes(k)))) };
  }
  return null;
}

/**
 * sheets: { [sheetName]: Array<Array<any>> } — rows as returned by SheetJS sheet_to_json(ws, {header:1, raw:true})
 * Returns { companies, pocs, issues, stats }. Throws if no POC sheet can be found.
 */
export function parseDatabase(sheets) {
  const names = Object.keys(sheets || {});
  const issues = [];

  // 1. Find the POC sheet: needs Company + POC name columns. Prefer a sheet whose name mentions POC/referral.
  const pocCandidates = names
    .map((n) => ({ n, hdr: findHeader(sheets[n] || [], ['company', 'name']) }))
    .filter((x) => x.hdr)
    .sort((a, b) => Number(/poc|referr/i.test(b.n)) - Number(/poc|referr/i.test(a.n)));
  if (!pocCandidates.length) {
    throw new Error('Could not find the POC sheet. It needs a header row with "Company" and "Referral POC" columns.');
  }
  const pocSheet = pocCandidates[0];

  // 2. Find the Companies sheet: Company + portal/link column, not the POC sheet, not an industry summary.
  const coCandidates = names
    .filter((n) => n !== pocSheet.n && !/industry/i.test(n))
    .map((n) => ({ n, hdr: findHeader(sheets[n] || [], ['company']) }))
    .filter((x) => x.hdr)
    .sort((a, b) => Number(/compan/i.test(b.n)) - Number(/compan/i.test(a.n)));
  const coSheet = coCandidates[0] || null;
  if (!coSheet) issues.push({ level: 'warn', text: 'No "Companies" sheet found, so job portal links will be empty.' });
  else if (coSheet.hdr.cols.portal === undefined) issues.push({ level: 'warn', text: `The "${coSheet.n}" sheet has no "Job Portal Link" column, so portal links will be empty.` });

  const pc = pocSheet.hdr.cols;
  if (pc.email === undefined) issues.push({ level: 'error', text: 'The POC sheet has no email column. Add a column called "Email ID of Referral POC" so the portal can email POCs.' });
  if (pc.status === undefined) issues.push({ level: 'warn', text: 'The POC sheet has no "Status" column.' });

  // 3. Companies (display names + portal links)
  const companyMap = new Map(); // slug -> {name, slug, portalUrl}
  if (coSheet) {
    const rows = sheets[coSheet.n];
    const cc = coSheet.hdr.cols;
    const seen = new Map();
    for (let r = coSheet.hdr.index + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const name = cleanText(row[cc.company]);
      if (!name) continue;
      const slug = slugify(name);
      if (!slug) continue;
      const rawLink = cc.portal !== undefined ? cleanText(row[cc.portal]) : '';
      const portalUrl = normalizeUrl(rawLink);
      if (rawLink && !portalUrl) issues.push({ level: 'warn', text: `${name}: job portal link "${rawLink}" is not a valid web address, so it was skipped.` });
      if (seen.has(slug)) {
        seen.set(slug, seen.get(slug) + 1);
        const existing = companyMap.get(slug);
        if (!existing.portalUrl && portalUrl) existing.portalUrl = portalUrl;
        continue;
      }
      seen.set(slug, 1);
      companyMap.set(slug, { name, slug, portalUrl });
    }
    for (const [slug, count] of seen) {
      if (count > 1) issues.push({ level: 'info', text: `${companyMap.get(slug).name} is listed ${count} times in the Companies sheet (often a trailing space). Merged into one.` });
    }
  }

  // 4. POCs
  const rows = sheets[pocSheet.n];
  const pocs = [];
  const pocKeys = new Set();
  for (let r = pocSheet.hdr.index + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const company = cleanText(row[pc.company]);
    const name = cleanText(row[pc.name]);
    if (!company && !name) continue;
    if (!company || !name) {
      issues.push({ level: 'warn', text: `Row ${r + 1} of "${pocSheet.n}" has ${company ? 'no POC name' : 'no company'}, so it was skipped.` });
      continue;
    }
    const companySlug = slugify(company);
    const key = companySlug + '|' + name.toLowerCase();
    if (pocKeys.has(key)) {
      issues.push({ level: 'info', text: `${name} at ${company} appears twice. Kept the first row.` });
      continue;
    }
    pocKeys.add(key);
    const rawEmail = pc.email !== undefined ? cleanText(row[pc.email]) : '';
    const email = isValidEmail(rawEmail) ? rawEmail.toLowerCase() : '';
    if (rawEmail && !email) issues.push({ level: 'warn', text: `${name} (${company}): email "${rawEmail}" is not valid, so it was left blank.` });
    const statusRaw = pc.status !== undefined ? row[pc.status] : '';
    const status = normalizeStatus(statusRaw);
    if (cleanText(statusRaw) && !POC_STATUSES.includes(status)) issues.push({ level: 'info', text: `${name} (${company}): status "${cleanText(statusRaw)}" is not one of the four standard values.` });
    const linkedinRaw = pc.linkedin !== undefined ? cleanText(row[pc.linkedin]) : '';
    pocs.push({
      company,
      companySlug,
      name,
      status,
      role: pc.role !== undefined ? cleanText(row[pc.role]) : '',
      phone: pc.phone !== undefined ? normalizePhone(row[pc.phone]) : '',
      email,
      linkedin: normalizeUrl(linkedinRaw),
    });
    if (!companyMap.has(companySlug)) {
      companyMap.set(companySlug, { name: company, slug: companySlug, portalUrl: '' });
      if (coSheet) issues.push({ level: 'info', text: `${company} has POCs but is missing from the Companies sheet. Added it without a portal link.` });
    }
  }

  // 5. Counts, hidden companies, sort
  const countBySlug = new Map();
  for (const p of pocs) countBySlug.set(p.companySlug, (countBySlug.get(p.companySlug) || 0) + 1);
  const companies = [];
  for (const c of companyMap.values()) {
    const pocCount = countBySlug.get(c.slug) || 0;
    if (!pocCount) {
      issues.push({ level: 'warn', text: `${c.name} has no POCs, so it is hidden from the company list.` });
      continue;
    }
    companies.push({ ...c, pocCount });
  }
  companies.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

  const exOnly = companies
    .filter((c) => pocs.filter((p) => p.companySlug === c.slug).every((p) => p.status === 'Ex employee'))
    .map((c) => c.name);

  const stats = {
    pocSheet: pocSheet.n,
    companiesSheet: coSheet ? coSheet.n : '',
    companies: companies.length,
    pocs: pocs.length,
    pocsWithEmail: pocs.filter((p) => p.email).length,
    pocsWithPhone: pocs.filter((p) => p.phone).length,
    pocsWithLinkedin: pocs.filter((p) => p.linkedin).length,
    companiesWithPortal: companies.filter((c) => c.portalUrl).length,
    exOnlyCompanies: exOnly,
  };
  if (exOnly.length) issues.push({ level: 'info', text: `Only ex-employee POCs at: ${exOnly.join(', ')}. Ex-employees usually can't refer through the company's system.` });

  return { companies, pocs, issues, stats };
}

export function sortPocs(pocs) {
  const rank = (s) => { const i = POC_STATUSES.indexOf(s); return i === -1 ? 99 : i; };
  return [...pocs].sort((a, b) => rank(a.status) - rank(b.status) || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
}

/* ---------- email drafting ---------- */

/** Email to the POC: "You have a referral request at {company} from {candidate}". Resume is attached by the mailer. */
export function buildReferralEmail({ request, poc, company, adminName }) {
  const cand = request.fullName;
  const candFirst = firstName(cand) || 'the candidate';
  const pocFirst = firstName(poc && poc.name) || 'there';
  const companyName = (company && company.name) || request.company;
  const portal = request.portalUrl || (company && company.portalUrl) || '';

  const subject = `Referral request at ${companyName}: ${cand} (Job ID ${request.jobId})`;

  const lines = [];
  lines.push(`Hi ${pocFirst},`);
  lines.push('');
  lines.push(`You have a new referral request at ${companyName} from ${cand}, shared through My Career Company.`);
  lines.push('');
  lines.push(`Candidate: ${cand}`);
  if (request.jobTitle) lines.push(`Role: ${request.jobTitle}`);
  lines.push(`Job ID: ${request.jobId}`);
  if (portal) lines.push(`Job portal: ${portal}`);
  lines.push(`Email: ${request.email}`);
  lines.push(`Phone: ${request.phone}`);
  lines.push('');
  lines.push(`Why we're recommending ${candFirst}:`);
  lines.push(request.recommendationNote);
  lines.push('');
  if (request.coverLetterText) {
    lines.push('Cover letter:');
    lines.push(request.coverLetterText);
    lines.push('');
  }
  lines.push(request.coverLetterFile ? 'Attached: resume and cover letter.' : 'Attached: resume.');
  lines.push('');
  lines.push(`If the profile looks like a fit, could you refer ${candFirst} for job ID ${request.jobId} through ${companyName}'s referral system? If it isn't a fit, a quick reply helps us let ${candFirst} know.`);
  lines.push('');
  lines.push('Thank you for your help.');
  lines.push('');
  lines.push('Best regards,');
  lines.push(adminName || 'My Career Company');
  lines.push('My Career Company');
  lines.push('www.mycareercompany.com');

  const text = lines.join('\n');
  return { subject, text, html: textToEmailHtml(text) };
}

/** Email to the candidate confirming their profile was shared. Does not name the POC or promise a referral. */
export function buildCandidateEmail({ request, company, adminName, ref }) {
  const candFirst = firstName(request.fullName) || 'there';
  const companyName = (company && company.name) || request.company;
  const job = request.jobTitle ? `job ID ${request.jobId} (${request.jobTitle})` : `job ID ${request.jobId}`;

  const subject = `Your referral request for ${companyName} has been shared`;
  const lines = [];
  lines.push(`Hi ${candFirst},`);
  lines.push('');
  lines.push(`Good news: we've shared your profile with our referral contact at ${companyName} for ${job}.`);
  lines.push('');
  lines.push('What happens next');
  lines.push(`Our contact will review your resume and, if it's a good fit, refer you through ${companyName}'s referral system. This usually takes a few days. The decision is theirs, so a referral isn't guaranteed.`);
  lines.push('');
  lines.push('While you wait');
  lines.push(`- Watch your inbox (and spam folder) for emails from ${companyName}'s careers team, and respond quickly if they ask you to complete an application.`);
  lines.push('- Keep preparing for the role: research the company, the team and the interview process.');
  lines.push('- Please don\'t contact the referrer directly. Reply to this email if you have a question.');
  lines.push('');
  if (ref) lines.push(`Your reference: ${ref}`);
  lines.push('');
  lines.push('All the best,');
  lines.push(adminName || 'My Career Company');
  lines.push('My Career Company');
  lines.push('www.mycareercompany.com');

  const text = lines.join('\n');
  return { subject, text, html: textToEmailHtml(text) };
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function textToEmailHtml(text) {
  const linkify = (escaped) => escaped.replace(/https?:\/\/[^\s<]+/g, (u) => {
    const m = u.match(/^(.*?)([).,;:!?]*)$/); // keep trailing punctuation outside the link
    return `<a href="${m[1]}" style="color:#073D32;">${m[1]}</a>${m[2]}`;
  });
  const paras = String(text).split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px 0;">${linkify(escapeHtml(p)).replace(/\n/g, '<br>')}</p>`).join('');
  return `<div style="font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#2B2B2B;max-width:640px;">` +
    `<div style="border-top:4px solid #073D32;padding-top:16px;">${paras}</div>` +
    `<div style="border-top:1px solid #D4AF7C;margin-top:8px;padding-top:8px;font-size:12px;color:#6b7a72;">Sent via the My Career Company referral desk.</div></div>`;
}

export function gmailComposeUrl({ to, cc, subject, body }) {
  const p = new URLSearchParams();
  p.set('view', 'cm');
  p.set('fs', '1');
  if (to) p.set('to', to);
  if (cc) p.set('cc', cc);
  if (subject) p.set('su', subject);
  if (body) p.set('body', body);
  return 'https://mail.google.com/mail/?' + p.toString();
}

/* ---------- admin helpers ---------- */

export function duplicateKeys(requests) {
  const count = new Map();
  for (const r of requests) {
    const k = [cleanText(r.email).toLowerCase(), r.companySlug, cleanText(r.jobId).toLowerCase()].join('|');
    count.set(k, (count.get(k) || 0) + 1);
  }
  const dups = new Set();
  for (const r of requests) {
    const k = [cleanText(r.email).toLowerCase(), r.companySlug, cleanText(r.jobId).toLowerCase()].join('|');
    if (count.get(k) > 1) dups.add(r.id);
  }
  return dups;
}

export function toCsv(rows) {
  const esc = (v) => {
    let s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return rows.map((r) => r.map(esc).join(',')).join('\r\n');
}

export function statusLabel(value) {
  const s = REQUEST_STATUSES.find((x) => x.value === value);
  return s ? s.label : value || 'New';
}
