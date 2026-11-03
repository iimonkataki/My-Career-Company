/* My Career Company · Get Referred portal · app shell + user flow (v2.0) */
import * as svc from './firebase-service.js?v=2.0';
import {
  validateRequest, buildRequestDoc, resolveFileType, validateFile, formatBytes, looksFirstPerson,
  shortRef, cleanText, NOTE_MAX, CORE_VERSION, MAX_RESUME_BYTES, MAX_COVER_BYTES,
} from './referral-core.js?v=2.0';
import { toast } from './ui.js?v=2.0';

const $ = (id) => document.getElementById(id);
const MIN_FILL_MS = 4000; // bots submit instantly; people take longer than this
const pageLoadedAt = Date.now();

const state = {
  companies: [],
  resumeFile: null,
  coverFile: null,
  company: null,
  submitting: false,
  adminMounted: false,
  user: null,
};

/* ===================== tabs ===================== */

function showTab(name) {
  const isAdmin = name === 'admin';
  $('tab-user').setAttribute('aria-selected', String(!isAdmin));
  $('tab-admin').setAttribute('aria-selected', String(isAdmin));
  $('view-user').hidden = isAdmin;
  $('view-admin').hidden = !isAdmin;
  const wanted = isAdmin ? '#admin' : '';
  if (location.hash !== wanted) history.replaceState(null, '', location.pathname + location.search + wanted);
}

$('tab-user').addEventListener('click', () => showTab('user'));
$('tab-admin').addEventListener('click', () => showTab('admin'));
window.addEventListener('hashchange', () => showTab(location.hash === '#admin' ? 'admin' : 'user'));

/* ===================== auth + admin ===================== */

async function doSignIn(errEl) {
  if (errEl) errEl.textContent = '';
  try {
    const user = await svc.signInAdmin();
    if (!svc.isAdminEmail(user.email)) {
      await svc.signOutUser();
      const msg = `${user.email} doesn't have admin access. Sign in with one of the four approved accounts.`;
      if (errEl) errEl.textContent = msg;
      toast(msg, 'error');
      return;
    }
    showTab('admin');
  } catch (e) {
    const msg = svc.friendlyError(e);
    if (errEl) errEl.textContent = msg;
    toast(msg, 'error');
  }
}

$('admin-signin-btn').addEventListener('click', () => doSignIn($('admin-signin-err')));
$('team-signin').addEventListener('click', () => {
  if (state.user && svc.isAdminEmail(state.user.email)) { showTab('admin'); window.scrollTo({ top: 0 }); return; }
  showTab('admin');
  doSignIn($('admin-signin-err'));
});
$('sign-out').addEventListener('click', async () => {
  await svc.signOutUser();
  toast('Signed out');
});

svc.onAuth(async (user) => {
  state.user = user;
  const admin = !!user && svc.isAdminEmail(user.email);
  $('tab-admin').hidden = !admin;
  $('session').hidden = !admin;
  $('session-email').textContent = admin ? user.email : '';
  $('team-signin').textContent = admin ? 'Open referral desk' : 'Team sign-in';
  if (admin) {
    $('admin-signin').hidden = true;
    if (!state.adminMounted) {
      state.adminMounted = true;
      try {
        const mod = await import('./admin.js?v=2.0');
        await mod.mountAdmin($('admin-root'), { user, svc });
      } catch (e) {
        state.adminMounted = false;
        console.error('[GetReferred] admin load failed', e);
        toast('Could not open the referral desk: ' + svc.friendlyError(e), 'error');
      }
    }
  } else {
    if (state.adminMounted) { location.reload(); return; } // clear admin data from the page on sign-out
    $('admin-signin').hidden = false;
    // A non-admin Google session (e.g. a Resume Fit Score evaluator) is left alone: the Admin tab simply stays hidden.
  }
});

/* ===================== companies ===================== */

async function initCompanies() {
  const sel = $('company-select');
  if (!svc.configured) {
    sel.innerHTML = '<option value="">Company list unavailable</option>';
    return;
  }
  try {
    const { companies } = await svc.loadCompanies();
    state.companies = companies;
    sel.textContent = '';
    if (!companies.length) {
      sel.append(new Option('Company list coming soon', ''));
      $('err-company').textContent = 'The company list is being updated. Please check back shortly.';
      return;
    }
    sel.append(new Option('Select a company', ''));
    for (const c of companies) sel.append(new Option(c.name, c.slug));
  } catch (e) {
    console.error('[GetReferred] companies', e);
    sel.textContent = '';
    sel.append(new Option('Could not load companies', ''));
    $('err-company').textContent = 'We could not load the company list. Refresh the page to try again.';
  }
}

$('company-select').addEventListener('change', (e) => {
  state.company = state.companies.find((c) => c.slug === e.target.value) || null;
  $('err-company').textContent = '';
  renderPortal();
  updateSteps();
  renderSlip();
});

function renderPortal() {
  const c = state.company;
  const card = $('portal-card');
  if (!c) { card.hidden = true; return; }
  card.hidden = false;
  $('portal-company').textContent = c.name;
  const link = $('portal-link');
  if (c.portalUrl) {
    link.href = c.portalUrl;
    link.textContent = `Open ${c.name} careers`;
  } else {
    link.href = 'https://www.google.com/search?q=' + encodeURIComponent(c.name + ' careers India job openings');
    link.textContent = `Search ${c.name} careers`;
  }
  const n = c.pocCount || 0;
  $('portal-meta').textContent = n
    ? `We have ${n} referral contact${n === 1 ? '' : 's'} at ${c.name}.`
    : '';
}

/* ===================== files ===================== */

function setResume(file) {
  const err = validateFile(file, { required: true, label: 'Resume', maxBytes: MAX_RESUME_BYTES });
  $('err-resume').textContent = err;
  if (err) { state.resumeFile = null; $('resume-input').value = ''; }
  else state.resumeFile = file;
  $('resume-chip').hidden = !state.resumeFile;
  $('resume-drop').hidden = !!state.resumeFile;
  if (state.resumeFile) {
    $('resume-name').textContent = file.name;
    $('resume-size').textContent = formatBytes(file.size);
  }
  updateSteps();
  renderSlip();
}

$('resume-input').addEventListener('change', (e) => setResume(e.target.files[0] || null));
$('resume-remove').addEventListener('click', () => {
  state.resumeFile = null;
  $('resume-input').value = '';
  setResume(null);
  $('err-resume').textContent = '';
  $('resume-input').focus();
});

const drop = $('resume-drop');
['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
drop.addEventListener('drop', (e) => {
  const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (f) setResume(f);
});

function coverMode() {
  const r = document.querySelector('input[name="cover-mode"]:checked');
  return r ? r.value : 'none';
}

document.querySelectorAll('input[name="cover-mode"]').forEach((r) => r.addEventListener('change', () => {
  const m = coverMode();
  $('cover-file-wrap').hidden = m !== 'file';
  $('cover-text-wrap').hidden = m !== 'text';
  $('err-cover').textContent = '';
  renderSlip();
}));

$('cover-input').addEventListener('change', (e) => {
  const f = e.target.files[0] || null;
  const err = validateFile(f, { label: 'Cover letter', maxBytes: MAX_COVER_BYTES });
  $('err-cover').textContent = err;
  state.coverFile = err ? null : f;
  if (err) e.target.value = '';
  renderSlip();
});

/* ===================== steps + live slip ===================== */

function updateSteps() {
  const hasResume = !!state.resumeFile;
  const hasCompany = hasResume && !!state.company;
  $('step-2').disabled = !hasResume;
  ['step-3', 'step-4', 'step-5'].forEach((id) => { $(id).disabled = !hasCompany; });
  $('step-1').classList.toggle('is-done', hasResume);
  $('step-2').classList.toggle('is-done', hasCompany);
}

function setSlip(id, value, emptyText) {
  const el = $(id);
  const v = cleanText(value);
  el.textContent = v || emptyText;
  el.classList.toggle('is-empty', !v);
}

function renderSlip() {
  setSlip('slip-company', state.company && state.company.name, 'Not chosen yet');
  const jobId = cleanText($('job-id').value);
  const title = cleanText($('job-title').value);
  setSlip('slip-job', jobId ? (title ? `${jobId} · ${title}` : jobId) : '', '—');
  setSlip('slip-name', $('full-name').value, 'Your name');
  setSlip('slip-resume', state.resumeFile && state.resumeFile.name, 'Not added');
  const m = coverMode();
  const coverVal = m === 'file' ? (state.coverFile ? state.coverFile.name : '') : m === 'text' && cleanText($('cover-text').value) ? 'Written in the form' : '';
  setSlip('slip-cover', coverVal, 'Not included');
  const note = $('note').value.trim();
  setSlip('slip-note', note.length > 280 ? note.slice(0, 277) + '…' : note, 'Your note of recommendation appears here.');
}

['job-id', 'job-title', 'full-name', 'cover-text'].forEach((id) => $(id).addEventListener('input', renderSlip));

$('note').addEventListener('input', () => {
  const v = $('note').value;
  $('note-count').textContent = `${v.length} / ${NOTE_MAX}`;
  $('note-person').textContent = looksFirstPerson(v)
    ? 'This reads like the first person ("I", "my"). Rewrite it as if someone else is recommending you.'
    : '';
  renderSlip();
});

// Clear a field's error as soon as the person edits it
[['job-id', 'err-jobId'], ['job-title', 'err-jobTitle'], ['full-name', 'err-fullName'], ['email', 'err-email'],
  ['phone', 'err-phone'], ['note', 'err-note'], ['cover-text', 'err-cover'], ['consent', 'err-consent']]
  .forEach(([input, err]) => $(input).addEventListener('input', () => { $(err).textContent = ''; }));
$('consent').addEventListener('change', () => { $('err-consent').textContent = ''; });

/* ===================== submit ===================== */

const ERR_FIELDS = { resume: 'err-resume', company: 'err-company', jobId: 'err-jobId', jobTitle: 'err-jobTitle', fullName: 'err-fullName', email: 'err-email', phone: 'err-phone', note: 'err-note', cover: 'err-cover', consent: 'err-consent' };
const FOCUS_FIELDS = { resume: 'resume-input', company: 'company-select', jobId: 'job-id', jobTitle: 'job-title', fullName: 'full-name', email: 'email', phone: 'phone', note: 'note', cover: 'cover-input', consent: 'consent' };

function readForm() {
  return {
    resumeFile: state.resumeFile,
    companySlug: state.company ? state.company.slug : '',
    jobId: $('job-id').value,
    jobTitle: $('job-title').value,
    fullName: $('full-name').value,
    email: $('email').value,
    phone: $('phone').value,
    note: $('note').value,
    coverMode: coverMode(),
    coverFile: coverMode() === 'file' ? state.coverFile : null,
    coverText: $('cover-text').value,
    consent: $('consent').checked,
  };
}

function showErrors(errors) {
  Object.values(ERR_FIELDS).forEach((id) => { $(id).textContent = ''; });
  for (const [k, msg] of Object.entries(errors)) if (ERR_FIELDS[k]) $(ERR_FIELDS[k]).textContent = msg;
  const first = Object.keys(FOCUS_FIELDS).find((k) => errors[k]);
  if (first) {
    const el = $(FOCUS_FIELDS[first]);
    const target = first === 'resume' ? $('resume-drop') : el;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (el && !el.closest('fieldset').disabled) setTimeout(() => el.focus({ preventScroll: true }), 300);
  }
}

function setProgress(fraction, label) {
  $('upload-progress').hidden = false;
  $('upload-bar').style.width = Math.round(Math.max(0, Math.min(1, fraction)) * 100) + '%';
  $('upload-label').textContent = label;
}

$('referral-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (state.submitting) return;
  $('err-submit').textContent = '';

  const form = readForm();
  const { ok, errors } = validateRequest(form);
  if (!ok) { showErrors(errors); return; }

  // Bot traps: hidden field filled, or the form was completed impossibly fast.
  if ($('website').value || Date.now() - pageLoadedAt < MIN_FILL_MS) {
    showSuccess('BOT' + Math.random().toString(36).slice(2, 8), state.company);
    return;
  }
  if (!svc.configured) { $('err-submit').textContent = 'The portal is not connected yet. Please try again later.'; return; }

  state.submitting = true;
  const btn = $('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Sending…';
  try {
    const requestId = svc.newRequestId();
    setProgress(0.15, 'Preparing your resume…');
    const resume = await svc.prepareFile(form.resumeFile, resolveFileType(form.resumeFile));
    let cover = null;
    if (form.coverFile) {
      setProgress(0.3, 'Preparing your cover letter…');
      cover = await svc.prepareFile(form.coverFile, resolveFileType(form.coverFile));
    }
    setProgress(0.45, 'Sending your request…');
    const data = buildRequestDoc(form, state.company, { resume: resume.meta, coverLetter: cover ? cover.meta : null });
    await svc.submitRequest(requestId, data, { resume, 'cover-letter': cover });
    setProgress(1, 'Done');
    showSuccess(requestId, state.company, data.jobId);
  } catch (err) {
    console.error('[GetReferred] submit failed', err);
    $('err-submit').textContent = `We couldn't send your request. ${svc.friendlyError(err)} If it keeps failing, email support@mycareercompany.com.`;
  } finally {
    state.submitting = false;
    btn.disabled = false;
    btn.textContent = 'Send referral request';
    setTimeout(() => { $('upload-progress').hidden = true; }, 600);
  }
});

function showSuccess(requestId, company, jobId) {
  $('request-layout').hidden = true;
  document.querySelector('#view-user .hero').hidden = true;
  $('success').hidden = false;
  $('success-ref').textContent = shortRef(requestId);
  $('success-text').textContent = `We'll share your profile with our referral contact at ${company ? company.name : 'the company'}${jobId ? ` for job ID ${jobId}` : ''}.`;
  $('success').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$('another-btn').addEventListener('click', () => {
  // Keep resume, name, email, phone. Clear the job-specific fields.
  state.company = null;
  $('company-select').value = '';
  ['job-id', 'job-title', 'note', 'cover-text'].forEach((id) => { $(id).value = ''; });
  $('note-count').textContent = `0 / ${NOTE_MAX}`;
  $('note-person').textContent = '';
  $('consent').checked = false;
  state.coverFile = null;
  $('cover-input').value = '';
  document.querySelector('input[name="cover-mode"][value="none"]').checked = true;
  $('cover-file-wrap').hidden = true;
  $('cover-text-wrap').hidden = true;
  renderPortal();
  updateSteps();
  renderSlip();
  $('success').hidden = true;
  document.querySelector('#view-user .hero').hidden = false;
  $('request-layout').hidden = false;
  $('company-select').focus();
});

/* ===================== slip placement ===================== */
// Desktop: the slip sits beside the form. Mobile: it moves into step 5 as a review before sending.
const slipEl = $('slip');
const slipHome = document.querySelector('.slip-col');
const step5Body = $('step-5').querySelector('.step-body');
const narrow = window.matchMedia('(max-width: 900px)');
function placeSlip() {
  if (narrow.matches) step5Body.insertBefore(slipEl, step5Body.querySelector('.consent'));
  else slipHome.append(slipEl);
}
narrow.addEventListener('change', placeSlip);
placeSlip();

/* ===================== boot ===================== */

$('year').textContent = String(new Date().getFullYear());
if (!svc.configured) {
  const b = $('config-banner');
  b.hidden = false;
  b.textContent = 'Setup needed: paste the Firebase project config into get-referred/firebase-config.js.';
}
showTab(location.hash === '#admin' ? 'admin' : 'user');
updateSteps();
renderSlip();
initCompanies();
console.info('[GetReferred] loaded', CORE_VERSION);
