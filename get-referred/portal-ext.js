/* My Career Company · Get Referred™ · v3 extension
 * Adds: public Get Referred + Refer and Earn, Google sign-in only for Status of Referrals,
 * per-section access (Get Referred / Refer and Earn) in the Access tab, POC accounts from the POC database,
 * POC "mark as referred" with optional proof, the candidate confirmation email, and status recording.
 * Loaded by app.js. Uses the SAME module URLs (?v=2.0) as the existing files so nothing loads twice.
 */
import { h, add, clear, toast, formatDateTime, formatDay } from './ui.js?v=2.0';
import { splitIntoChunks, formatBytes, shortRef } from './referral-core.js?v=2.0';
import { MAILER_URL, SUPPORT_EMAIL } from './firebase-config.js?v=2.0';
import * as P from './portal-core.js?v=3.0';
import {
  doc, collection, getDoc, getDocs, setDoc, updateDoc, writeBatch, query, where, limit,
  serverTimestamp, arrayUnion, arrayRemove,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const $ = (id) => document.getElementById(id);

const X = {
  svc: null,
  showTab: null,
  signIn: null,
  user: null,
  isAdmin: false,
  access: P.effectiveAccess(null, ''),
  signInRequested: false,
  referRendered: false,
  accessMounted: false,
  companies: [],
  pageLoadedAt: Date.now(),
  authSeen: false,
  // The tab in the address when the page opened (e.g. #status from our emails). Read now, before app.js tidies the address.
  initialTab: P.tabFromHash(location.hash),
};

export const tabFromHash = P.tabFromHash;
export const hashFor = (tab) => P.TAB_HASH[tab] || '';

/* ===================== setup ===================== */

export function initExt({ svc, showTab, signIn }) {
  X.svc = svc;
  X.showTab = showTab;
  X.signIn = signIn;
  const tabStatus = $('tab-status');
  const tabRefer = $('tab-refer');
  if (tabStatus) tabStatus.addEventListener('click', () => showTab('status'));
  if (tabRefer) tabRefer.addEventListener('click', () => showTab('refer'));
  const back = $('authGateBackBtn');
  if (back) back.addEventListener('click', () => { X.signInRequested = false; hideOverlay(); });
  const cont = $('authGateContinueBtn');
  if (cont) cont.addEventListener('click', () => { X.signInRequested = false; hideOverlay(); showTab('user'); });
  applyTabVisibility();
  console.info('[GetReferred] v3 extension', P.PORTAL_VERSION);
}

function db() { return X.svc.getDb(); }

export function canSee(tab) {
  return P.visibleTabs({ signedIn: !!X.user, isAdmin: X.isAdmin, access: X.access }).includes(tab);
}

export function applyTabVisibility() {
  const tabs = P.visibleTabs({ signedIn: !!X.user, isAdmin: X.isAdmin, access: X.access });
  for (const t of P.TAB_ORDER) {
    const btn = $('tab-' + t);
    if (!btn) continue;
    const show = tabs.includes(t);
    btn.hidden = !show;
    btn.style.display = show ? 'inline-flex' : 'none';
  }
  const nav = $('headerNav');
  if (nav) nav.classList.toggle('single-tab', tabs.length < 2);
}

/* ===================== sign-in overlay (the existing Google gate, now only for Status of Referrals) ===================== */

function showOverlay(card) {
  const gate = $('authGateOverlay');
  if (!gate) return;
  gate.style.display = 'flex';
  gate.setAttribute('aria-hidden', 'false');
  if ($('authGateLoading')) $('authGateLoading').style.display = 'none';
  if ($('authGateLoginCard')) $('authGateLoginCard').style.display = card === 'login' ? 'block' : 'none';
  if ($('authGateErrorCard')) $('authGateErrorCard').style.display = card === 'denied' ? 'block' : 'none';
}

function hideOverlay() {
  const gate = $('authGateOverlay');
  if (!gate) return;
  gate.style.display = 'none';
  gate.setAttribute('aria-hidden', 'true');
}

export function openSignIn() {
  X.signInRequested = true;
  showOverlay('login');
}

/** Signed out: the portal is open; the header shows a sign-in button for Status of Referrals. */
export function showPublicState() {
  hideOverlay();
  const main = $('main');
  if (main) { main.style.display = ''; main.style.visibility = 'visible'; }
  const header = $('siteHeader');
  if (header) header.style.opacity = '1';
  const widget = $('headerUserWidget');
  if (widget) {
    clear(widget);
    widget.append(h('button', { type: 'button', class: 'btn-header-signin', id: 'headerSignInBtn', onclick: openSignIn, title: 'Sign in with Google to see Status of Referrals' },
      h('span', { class: 'btn-header-signin-icon', 'aria-hidden': 'true' }, '🔒'),
      h('span', {}, 'Sign in'),
      h('span', { class: 'btn-header-signin-sub' }, 'Status of Referrals')));
  }
  applyTabVisibility();
}

/** Called by app.js whenever the Google sign-in state changes. */
export async function onAuthChanged(user) {
  X.user = user || null;
  X.isAdmin = !!user && X.svc.isAdminEmail(user.email);
  X.access = P.effectiveAccess(null, user ? user.email : '');
  if (user && X.isAdmin) {
    X.access = P.effectiveAccess(null, user.email, true);
  } else if (user) {
    try {
      const snap = await getDoc(doc(db(), 'referral_allowed_users', P.lowerEmail(user.email)));
      X.access = P.effectiveAccess(snap.exists() ? snap.data() : null, user.email);
    } catch (e) {
      console.warn('[GetReferred] access lookup failed', e);
    }
  }
  applyTabVisibility();
  const firstCheck = !X.authSeen;
  X.authSeen = true;
  const wantedStatus = (firstCheck && X.initialTab === 'status') || P.tabFromHash(location.hash) === 'status';
  if (!user) {
    // Opening a #status link (e.g. from our emails) while signed out shows the sign-in card once, on page load.
    if (firstCheck && X.initialTab === 'status') openSignIn();
    return;
  }
  const allowed = X.isAdmin || X.access.gr || X.access.re;
  if (X.signInRequested || wantedStatus) {
    if (allowed) {
      X.signInRequested = false;
      hideOverlay();
      if (location.hash !== '#status') history.replaceState(null, '', location.pathname + location.search + '#status');
    } else {
      if ($('authDeniedEmailText')) $('authDeniedEmailText').textContent = user.email;
      showOverlay('denied');
    }
  }
}

/* ===================== tab rendering ===================== */

export function onTabShown(tab) {
  if (tab === 'status') renderStatus();
  else if (tab === 'refer') renderRefer();
  else if (tab === 'access') mountAccessPanel();
}

function panelHead(eyebrow, title, subtitle, actions) {
  return h('div', { class: 'access-header-panel gr-head' },
    h('div', { class: 'gr-head-row' },
      h('div', {},
        h('div', { class: 'access-header-eyebrow' }, eyebrow),
        h('h2', { class: 'access-title' }, title),
        subtitle ? h('p', { class: 'access-subtitle' }, subtitle) : null),
      actions ? h('div', { class: 'gr-head-actions' }, actions) : null));
}

const SIGNAL_TEXT = { yes: 'Yes', no: 'No', pending: 'Pending' };

function signalList(signals) {
  return h('ol', { class: 'gr-signals' }, signals.map((s, i) => h('li', { class: 'gr-signal is-' + s.state },
    h('span', { class: 'gr-signal-num', 'aria-hidden': 'true' }, s.state === 'yes' ? '✓' : String(i + 1)),
    h('span', { class: 'gr-signal-label' }, s.label),
    h('span', { class: 'gr-signal-state' }, SIGNAL_TEXT[s.state] + (s.state === 'yes' && s.at ? ` · ${formatDay(s.at)}` : '')))));
}

function sortByTime(list, field) {
  const t = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : v && v.seconds ? v.seconds * 1000 : 0);
  return [...list].sort((a, b) => t(b[field]) - t(a[field]));
}

/* ---------- Status of Referrals ---------- */

async function renderStatus() {
  const root = $('view-status');
  if (!root) return;
  clear(root);
  if (!X.user) {
    root.append(h('div', { class: 'signin-card' }, h('h2', {}, 'Status of Referrals'),
      h('p', {}, 'Sign in with Google to see the status of your referrals.'),
      h('button', { type: 'button', class: 'button button-primary', onclick: openSignIn }, 'Sign in with Google')));
    return;
  }
  const showSought = X.isAdmin || X.access.gr;
  const showGiven = X.isAdmin || X.access.re;
  const refresh = h('button', { type: 'button', class: 'btn-outline', onclick: () => renderStatus() }, '🔄 Refresh');
  root.append(panelHead('STATUS OF REFERRALS • LIVE TRACKER', 'Status of Referrals',
    X.isAdmin
      ? `Co-founder view: every active referral. Signed in as ${X.user.email}.`
      : `Signed in as ${X.user.email}. You see the sections your account has access to.`,
    refresh));
  const soughtBox = h('section', { class: 'gr-status-section', 'aria-labelledby': 'grSoughtTitle' });
  const givenBox = h('section', { class: 'gr-status-section', 'aria-labelledby': 'grGivenTitle' });
  if (showSought) root.append(soughtBox);
  if (showGiven) root.append(givenBox);
  if (!showSought && !showGiven) {
    root.append(h('p', { class: 'empty-state' }, 'Your account does not have access to any section yet.'));
    return;
  }
  if (showSought) renderSought(soughtBox);
  if (showGiven) renderGiven(givenBox);
}

async function renderSought(box) {
  clear(box).append(
    h('div', { class: 'gr-section-head' },
      h('h3', { class: 'gr-section-title', id: 'grSoughtTitle' }, 'Referrals sought'),
      h('p', { class: 'gr-section-sub' }, X.isAdmin ? 'Requests submitted by candidates.' : `Referral requests submitted with ${X.access.primaryEmail}.`)),
    h('p', { class: 'hint' }, 'Loading…'));
  try {
    const q = X.isAdmin
      ? query(collection(db(), 'candidate_status'), limit(200))
      : query(collection(db(), 'candidate_status'), where('candidateEmail', '==', X.access.primaryEmail), limit(100));
    const snap = await getDocs(q);
    const list = sortByTime(snap.docs.map((d) => ({ id: d.id, ...d.data() })), 'submittedAt');
    box.lastChild.remove();
    if (!list.length) {
      box.append(h('p', { class: 'empty-state' }, X.isAdmin
        ? 'No referral requests yet.'
        : `No referral requests found for ${X.access.primaryEmail}. Requests are matched to the email you entered on the Get Referred form.`));
      return;
    }
    box.append(h('div', { class: 'gr-cards' }, list.map((s) => h('article', { class: 'gr-card' },
      h('div', { class: 'gr-card-head' },
        h('div', {},
          h('p', { class: 'gr-card-title' }, s.company || 'Company'),
          h('p', { class: 'gr-card-meta' }, `Job ID ${s.jobId}${s.jobTitle ? ` · ${s.jobTitle}` : ''}`),
          X.isAdmin ? h('p', { class: 'gr-card-meta' }, `${s.candidateName || ''} · ${s.candidateEmail || ''}`) : null),
        h('span', { class: 'gr-card-date' }, `Submitted ${formatDay(s.submittedAt) || ''}`)),
      signalList(P.candidateSignals(s))))));
  } catch (e) {
    box.lastChild.textContent = 'Could not load your requests. ' + X.svc.friendlyError(e);
  }
}

async function renderGiven(box) {
  clear(box).append(
    h('div', { class: 'gr-section-head' },
      h('h3', { class: 'gr-section-title', id: 'grGivenTitle' }, 'Referrals given'),
      h('p', { class: 'gr-section-sub' }, X.isAdmin ? 'Requests sent to referral POCs.' : `Referral requests My Career Company has sent to ${X.access.primaryEmail}.`)),
    h('p', { class: 'hint' }, 'Loading…'));
  try {
    const q = X.isAdmin
      ? query(collection(db(), 'poc_assignments'), limit(200))
      : query(collection(db(), 'poc_assignments'), where('pocEmail', '==', X.access.primaryEmail), limit(100));
    const snap = await getDocs(q);
    const list = sortByTime(snap.docs.map((d) => ({ id: d.id, ...d.data() })), 'assignedAt');
    box.lastChild.remove();
    if (!X.isAdmin) box.append(h('p', { class: 'gr-milestone' }, P.milestoneText(list.filter((a) => a.referred).length)));
    if (!list.length) {
      box.append(h('p', { class: 'empty-state' }, X.isAdmin
        ? 'No requests have been sent to POCs yet.'
        : 'No referral requests have been sent to you yet. They appear here as soon as we email you one.'));
      return;
    }
    box.append(h('div', { class: 'gr-cards' }, list.map((a) => givenCard(a, box))));
  } catch (e) {
    box.lastChild.textContent = 'Could not load your referral requests. ' + X.svc.friendlyError(e);
  }
}

function givenCard(a, box) {
  const card = h('article', { class: 'gr-card' },
    h('div', { class: 'gr-card-head' },
      h('div', {},
        h('p', { class: 'gr-card-title' }, a.candidateName || 'Candidate'),
        h('p', { class: 'gr-card-meta' }, `${a.company} · Job ID ${a.jobId}${a.jobTitle ? ` · ${a.jobTitle}` : ''}`),
        X.isAdmin ? h('p', { class: 'gr-card-meta' }, `POC: ${a.pocName || ''} · ${a.pocEmail}`) : null),
      h('span', { class: 'gr-card-date' }, `Received ${formatDay(a.assignedAt) || ''}`)),
    signalList(P.pocSignals(a)));
  if (!a.referred && !X.isAdmin) {
    const actions = h('div', { class: 'gr-card-actions' });
    const btn = h('button', { type: 'button', class: 'btn-primary gr-mark-btn', onclick: () => { btn.hidden = true; actions.append(markForm(a, box)); } }, 'Mark as referred');
    actions.append(btn);
    card.append(actions);
  }
  if (a.referred && a.proofPieces) card.append(h('p', { class: 'hint' }, `Proof uploaded: ${a.proofName || 'file'}.`));
  return card;
}

function markForm(a, box) {
  const err = h('p', { class: 'field-error', role: 'alert' });
  const confirm = h('input', { type: 'checkbox', id: 'grConfirm_' + a.id });
  const file = h('input', { type: 'file', accept: '.pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp', 'aria-label': 'Proof of referral (optional)' });
  const save = h('button', { type: 'button', class: 'btn-primary' }, 'Confirm referral');
  file.addEventListener('change', () => { err.textContent = P.validateProof(file.files && file.files[0]); });
  const form = h('div', { class: 'gr-mark-form' },
    h('label', { class: 'consent' }, confirm,
      h('span', {}, `I confirm I have referred ${a.candidateName} for Job ID ${a.jobId} in ${a.company}'s referral portal.`)),
    h('div', { class: 'form-group' },
      h('span', { class: 'form-label' }, 'Proof of referral ', h('span', { class: 'optional' }, 'optional')),
      file,
      h('p', { class: 'hint' }, 'A screenshot or email of the submitted referral (PDF, PNG, JPG or WEBP, up to 2 MB). Crop out anything your company does not allow you to share.')),
    h('div', { class: 'gr-card-actions' }, save), err);
  save.addEventListener('click', async () => {
    err.textContent = '';
    if (!confirm.checked) { err.textContent = 'Tick the box to confirm you have referred the candidate.'; return; }
    const f = file.files && file.files[0];
    const ferr = P.validateProof(f);
    if (ferr) { err.textContent = ferr; return; }
    save.disabled = true;
    save.textContent = 'Saving…';
    try {
      await markReferred(a, f || null);
      toast('Marked as referred. Thank you!');
      renderGiven(box);
    } catch (e) {
      console.error('[GetReferred] mark referred failed', e);
      err.textContent = 'Could not save. ' + X.svc.friendlyError(e);
      save.disabled = false;
      save.textContent = 'Confirm referral';
    }
  });
  return form;
}

async function markReferred(a, file) {
  let pieces = [];
  const meta = {};
  if (file) {
    const b64 = await X.svc.fileToBase64(file);
    pieces = splitIntoChunks(b64);
    if (pieces.length > 3) throw new Error('Proof file is too large.');
    meta.proofName = String(file.name).slice(0, 200);
    meta.proofType = P.resolveProofType(file);
    meta.proofSize = file.size;
  }
  const b = writeBatch(db());
  b.update(doc(db(), 'poc_assignments', a.id), { referred: true, referredAt: serverTimestamp(), proofPieces: pieces.length, ...meta });
  b.update(doc(db(), 'candidate_status', a.requestId), { pocReferred: true, pocReferredAt: serverTimestamp() });
  pieces.forEach((data, i) => b.set(doc(db(), 'poc_proofs', P.proofPieceId(a.id, i)), { assignmentId: a.id, index: i, data }));
  await b.commit();
}

/* ---------- Refer and Earn ---------- */

async function renderRefer() {
  if (X.referRendered) return;
  const root = $('view-refer');
  if (!root) return;
  X.referRendered = true;
  clear(root);
  const statCompanies = h('div', { class: 'stat-num', id: 'reStatCompanies' }, '50+');
  const statPocs = h('div', { class: 'stat-num', id: 'reStatPocs' }, '100+');

  const reasons = [
    ['💰', 'Get paid when your referral is hired', 'Most employers pay a referral bonus when someone you refer is successfully hired, typically about ₹10,000 to ₹50,000, paid by your employer under its own policy.'],
    ['🎁', 'Plus payouts from My Career Company', 'On top of your company\'s bonus, My Career Company gives you a payout after every 10 referrals you give.'],
    ['🎯', 'Pre-screened candidates only', 'Every request comes with a resume, the exact Job ID and a recommendation note, so referring takes minutes.'],
    ['🤝', 'You stay in control', 'You review each request and decide whether to refer. No targets, no obligations.'],
    ['📈', 'Track everything in one place', 'See every request in Status of Referrals and mark referrals as done.'],
  ];

  const steps = [
    ['Join the network', 'Fill in the short form below with your official work email.'],
    ['Get activated', 'Our team verifies your details and switches on your referral partner account.'],
    ['Receive candidates', 'We email you pre-screened candidates for open roles at your company.'],
    ['Refer and earn', 'Refer them in your company\'s portal, mark it done here, and earn on every successful referral.'],
  ];

  add(root,
    h('div', { class: 'hero-section hero re-hero' },
      h('div', { class: 'hero-content' },
        h('div', { class: 'hero-eyebrow' }, 'REFER AND EARN • MY CAREER COMPANY REFERRAL PARTNER NETWORK'),
        h('h1', { class: 'hero-title' }, 'Open doors at your company. Get rewarded for it.'),
        h('p', { class: 'hero-subtitle' }, 'Join My Career Company\'s network of referral partners and refer pre-screened, motivated candidates into roles at the company you work for.'),
        h('a', { href: '#refer-form', class: 'btn-primary re-cta', onclick: (e) => { e.preventDefault(); const f = $('refer-form'); if (f) f.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, 'Join the network →')),
      h('div', { class: 'hero-stats' },
        h('div', { class: 'stat-card' }, statCompanies, h('div', { class: 'stat-label' }, 'Partner Companies')),
        h('div', { class: 'stat-card' }, statPocs, h('div', { class: 'stat-label' }, 'Referral Partners')),
        h('div', { class: 'stat-card' }, h('div', { class: 'stat-num' }, '₹10K–50K*'), h('div', { class: 'stat-label' }, 'Typical company bonus per successful hire')),
        h('div', { class: 'stat-card' }, h('div', { class: 'stat-num' }, 'Every 10'), h('div', { class: 'stat-label' }, 'Referrals given earns a payout from us')))),

    h('section', { class: 're-section', 'aria-labelledby': 'reWhyTitle' },
      h('div', { class: 'referral-marquee-header' },
        h('span', { class: 'referral-marquee-eyebrow' }, 'WHY REFER WITH US'),
        h('h2', { class: 'referral-marquee-title', id: 'reWhyTitle' }, 'Earn twice for helping great candidates')),
      h('div', { class: 're-reasons' }, reasons.map(([icon, title, text]) => h('div', { class: 're-reason' },
        h('span', { class: 're-reason-icon', 'aria-hidden': 'true' }, icon),
        h('h3', { class: 're-reason-title' }, title),
        h('p', { class: 're-reason-text' }, text))))),

    h('section', { class: 're-section', 'aria-labelledby': 'reHowTitle' },
      h('div', { class: 'referral-marquee-header' },
        h('span', { class: 'referral-marquee-eyebrow' }, 'HOW IT WORKS'),
        h('h2', { class: 'referral-marquee-title', id: 'reHowTitle' }, 'Four simple steps')),
      h('ol', { class: 're-steps' }, steps.map(([title, text], i) => h('li', { class: 're-step' },
        h('span', { class: 're-step-num', 'aria-hidden': 'true' }, String(i + 1)),
        h('div', {}, h('p', { class: 're-step-title' }, title), h('p', { class: 're-step-text' }, text)))))),

    h('p', { class: 're-fineprint' }, '* Referral bonuses are set and paid by your employer under its own policy; amounts, eligibility and timing vary by company and role, and are usually paid after the candidate joins. My Career Company does not set or guarantee employer bonuses. My Career Company\'s payouts are separate, are made after every 10 referrals given (a "referral given" means you have referred the candidate in your company\'s official referral portal), and are subject to our programme terms. Please make sure taking part is consistent with your employer\'s policies.'),

    referForm());

  try {
    const { companies } = await X.svc.loadCompanies();
    X.companies = companies || [];
    const c = P.networkCounts(X.companies);
    if (c.companies) statCompanies.textContent = String(c.companies);
    if (c.pocs) statPocs.textContent = String(c.pocs);
    const dl = $('reCompanyList');
    if (dl) { clear(dl); X.companies.forEach((co) => dl.append(h('option', { value: co.name }))); }
  } catch (e) {
    console.warn('[GetReferred] refer counts', e);
  }
}

function field(id, label, input, { optional = false, hint = '' } = {}) {
  return h('div', { class: 'form-group re-field' },
    h('label', { class: 'form-label', for: id }, label, optional ? h('span', { class: 'optional' }, ' optional') : h('span', { class: 'required-star' }, ' *')),
    input,
    hint ? h('p', { class: 'hint' }, hint) : null,
    h('p', { class: 'field-error', id: 'reErr_' + id, role: 'alert' }));
}

function referForm() {
  const input = (id, attrs = {}) => h('input', { id, class: 'form-input-text', ...attrs });
  const statusGroup = h('div', { class: 're-radios', role: 'radiogroup', 'aria-labelledby': 'reStatusLabel' },
    P.POC_FORM_STATUSES.map((s, i) => h('label', { class: 're-radio' },
      h('input', { type: 'radio', name: 'reStatus', value: s, checked: i === 0 }), h('span', {}, s))));
  const err = h('p', { class: 'field-error', id: 'reErr_submit', role: 'alert' });
  const submit = h('button', { type: 'submit', class: 'btn-primary', id: 'reSubmitBtn' }, 'Join the referral network →');
  const form = h('form', { id: 'refer-form', class: 'diagnostic-input-panel re-form', novalidate: true },
    h('div', { class: 'panel-header' },
      h('div', { class: 'panel-step' }, 'REFERRAL PARTNER APPLICATION'),
      h('h2', { class: 'panel-title' }, 'Join as a referral partner'),
      h('p', { class: 'panel-subtext' }, 'Tell us where you work. Our team reviews every application and adds approved partners to the My Career Company referral network.')),
    h('div', { class: 'hp', 'aria-hidden': 'true' }, h('label', { for: 'reWebsite' }, 'Website'), h('input', { type: 'text', id: 'reWebsite', tabindex: '-1', autocomplete: 'off' })),
    h('div', { class: 're-grid' },
      field('reName', 'Full name', input('reName', { type: 'text', maxlength: '80', autocomplete: 'name' })),
      field('reCompany', 'Company you work for', h('input', { id: 'reCompany', class: 'form-input-text', type: 'text', maxlength: '120', list: 'reCompanyList', autocomplete: 'organization', placeholder: 'Start typing, or enter your company' }),
        { hint: 'Pick from our partner list or type a new company.' }),
      h('datalist', { id: 'reCompanyList' }),
      h('div', { class: 'form-group re-field re-span' },
        h('span', { class: 'form-label', id: 'reStatusLabel' }, 'I confirm my current status at this company is', h('span', { class: 'required-star' }, ' *')),
        statusGroup,
        h('p', { class: 'field-error', id: 'reErr_status', role: 'alert' })),
      field('reRole', 'Role / designation', input('reRole', { type: 'text', maxlength: '100', autocomplete: 'organization-title', placeholder: 'For example Senior Consultant' })),
      field('rePhone', 'Phone number', input('rePhone', { type: 'tel', maxlength: '20', autocomplete: 'tel', inputmode: 'tel', placeholder: '+91 98765 43210' })),
      field('reWorkEmail', 'Official work email', input('reWorkEmail', { type: 'email', maxlength: '254', autocomplete: 'email', inputmode: 'email', placeholder: 'name@company.com' }),
        { hint: 'Your company email, so we can verify where you work. Referral requests are sent here. Personal emails are not accepted.' }),
      field('reLinkedin', 'LinkedIn profile link', input('reLinkedin', { type: 'url', maxlength: '300', placeholder: 'linkedin.com/in/your-name' })),
      field('reGoogle', 'Google sign-in email', input('reGoogle', { type: 'email', maxlength: '254', placeholder: 'yourname@gmail.com' }),
        { optional: true, hint: 'Only if you will sign in with a different Google account than your work email.' }),
      field('reCity', 'City / office location', input('reCity', { type: 'text', maxlength: '80' }), { optional: true })),
    h('label', { class: 'consent' }, h('input', { type: 'checkbox', id: 'reConsent' }),
      h('span', {}, 'I agree that My Career Company may store these details, verify my employment, add me to its referral partner database and email me referral requests for my company. I can ask for my data to be corrected or deleted at any time by writing to ',
        h('a', { href: 'mailto:' + SUPPORT_EMAIL }, SUPPORT_EMAIL), '.')),
    h('p', { class: 'field-error', id: 'reErr_consent', role: 'alert' }),
    h('label', { class: 'consent' }, h('input', { type: 'checkbox', id: 'reConfirm' }),
      h('span', {}, 'I confirm the details above are accurate and that I currently work at this company.')),
    h('p', { class: 'field-error', id: 'reErr_confirmEmployment', role: 'alert' }),
    h('div', { class: 'submit-row' }, submit),
    err);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    ['fullName', 'company', 'status', 'role', 'phone', 'workEmail', 'linkedin', 'googleEmail', 'city', 'consent', 'confirmEmployment', 'submit']
      .forEach((k) => { const el = $('reErr_' + (ERR_IDS[k] || k)); if (el) el.textContent = ''; });
    const checked = form.querySelector('input[name="reStatus"]:checked');
    const data = {
      fullName: $('reName').value, company: $('reCompany').value, status: checked ? checked.value : '',
      role: $('reRole').value, phone: $('rePhone').value, workEmail: $('reWorkEmail').value,
      linkedin: $('reLinkedin').value, googleEmail: $('reGoogle').value, city: $('reCity').value,
      consent: $('reConsent').checked, confirmEmployment: $('reConfirm').checked,
    };
    const v = P.validateSignup(data);
    if (!v.ok) {
      Object.entries(v.errors).forEach(([k, msg]) => { const el = $('reErr_' + (ERR_IDS[k] || k)); if (el) el.textContent = msg; });
      const first = Object.keys(v.errors)[0];
      const target = $(FOCUS_IDS[first]);
      if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => target.focus({ preventScroll: true }), 300); }
      return;
    }
    submit.disabled = true;
    submit.textContent = 'Sending…';
    try {
      const out = await callPublicMailer('referAndEarnSignup', {
        data: P.signupPayload(data), hp: $('reWebsite').value, t: Date.now() - X.pageLoadedAt,
      });
      clear(form).append(h('div', { class: 'success re-success' },
        h('div', { class: 'success-badge' }, '✓ APPLICATION RECEIVED'),
        h('h2', {}, 'Thank you for joining'),
        h('p', {}, `We've received your details${out.submissionId && out.submissionId !== 'ignored' ? ` (reference ${out.submissionId})` : ''}. Our team will verify them and activate your referral partner account.`),
        h('p', { class: 'fine-print' }, `Once you're activated, referral requests arrive at ${P.lowerEmail(data.workEmail)}, and you can track them in Status of Referrals.`)));
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e2) {
      err.textContent = 'We couldn\'t send your application. ' + ((e2 && e2.message) || '') + ` If it keeps failing, email ${SUPPORT_EMAIL}.`;
      submit.disabled = false;
      submit.textContent = 'Join the referral network →';
    }
  });
  return form;
}

const ERR_IDS = { fullName: 'reName', company: 'reCompany', role: 'reRole', phone: 'rePhone', workEmail: 'reWorkEmail', linkedin: 'reLinkedin', googleEmail: 'reGoogle', city: 'reCity' };
const FOCUS_IDS = { fullName: 'reName', company: 'reCompany', status: 'reStatusLabel', role: 'reRole', phone: 'rePhone', workEmail: 'reWorkEmail', linkedin: 'reLinkedin', googleEmail: 'reGoogle', city: 'reCity', consent: 'reConsent', confirmEmployment: 'reConfirm' };

async function callPublicMailer(action, payload) {
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(String(MAILER_URL || ''))) throw new Error('The email service is not set up yet.');
  let res;
  try {
    res = await fetch(MAILER_URL, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }), redirect: 'follow',
    });
  } catch {
    throw new Error('Could not reach the email service. Check your connection.');
  }
  let out;
  try { out = await res.json(); } catch { throw new Error('The email service sent an unexpected reply.'); }
  if (!out || out.ok !== true) throw new Error((out && out.error) || 'The email service refused the request.');
  return out;
}

/* ---------- Get Referred submit hooks ---------- */

/** Extra documents saved in the SAME batch as a new referral request (see firebase-service submitRequest). */
export function submitExtras(requestId, data) {
  return [
    { col: 'candidate_status', id: requestId, data: P.candidateStatusFields(requestId, data), serverTime: ['submittedAt'] },
    { col: 'referral_confirmations', id: requestId, data: P.confirmationFields(data), serverTime: ['createdAt'] },
  ];
}

/** After the request is saved: send the "we have received your request" email (never blocks the success screen). */
export function afterSubmit(requestId, data) {
  const box = $('success');
  let note = $('grConfirmNote');
  if (box && !note) {
    note = h('p', { class: 'hint', id: 'grConfirmNote' });
    const text = $('success-text');
    if (text && text.parentNode) text.parentNode.insertBefore(note, text.nextSibling);
  }
  if (note) note.textContent = `Sending a confirmation email to ${P.lowerEmail(data.email)}…`;
  callPublicMailer('confirmRequest', { requestId })
    .then(() => { if (note) note.textContent = `We've emailed a confirmation to ${P.lowerEmail(data.email)}.`; })
    .catch((e) => {
      console.warn('[GetReferred] confirmation email', e);
      if (note) note.textContent = 'Your request is saved. The confirmation email could not be sent right now, but our team has your request.';
    });
}

/* ---------- Referral Repository hooks (co-founders) ---------- */

/** Records that the POC and candidate were emailed: creates the POC's assignment and updates the candidate's status. */
export async function onPocEmailed({ request: r, poc, to, adminEmail }) {
  const aid = P.assignmentId(r.id, to);
  const aRef = doc(db(), 'poc_assignments', aid);
  const sRef = doc(db(), 'candidate_status', r.id);
  const [aSnap, sSnap] = await Promise.all([getDoc(aRef), getDoc(sRef)]);
  const b = writeBatch(db());
  if (aSnap.exists()) b.update(aRef, { assignedAt: serverTimestamp(), assignedBy: P.lowerEmail(adminEmail) });
  else b.set(aRef, { ...P.assignmentFields(r, poc, to, adminEmail), assignedAt: serverTimestamp() });
  if (sSnap.exists()) b.update(sRef, { mccSharedWithPoc: true, mccSharedAt: serverTimestamp() });
  else b.set(sRef, { ...P.candidateStatusFields(r.id, r), submittedAt: r.submittedAt || serverTimestamp(), mccSharedWithPoc: true, mccSharedAt: serverTimestamp() });
  await b.commit();
}

/** Live status panel shown inside a request in the Referral Repository. */
export function adminStatusPanel(r) {
  const box = h('section', { class: 'detail-section gr-admin-status' }, h('h4', {}, 'Live referral status'), h('p', { class: 'hint' }, 'Loading…'));
  (async () => {
    try {
      const [sSnap, aSnap] = await Promise.all([
        getDoc(doc(db(), 'candidate_status', r.id)),
        getDocs(query(collection(db(), 'poc_assignments'), where('requestId', '==', r.id), limit(20))),
      ]);
      clear(box).append(h('h4', {}, 'Live referral status'));
      if (sSnap.exists()) box.append(signalList(P.candidateSignals(sSnap.data())));
      else box.append(h('p', { class: 'hint' }, 'No status record yet. It is created when this request is emailed to a POC.'));
      aSnap.docs.forEach((d) => {
        const a = { id: d.id, ...d.data() };
        const line = h('p', { class: 'gr-admin-poc' },
          `${a.pocName || a.pocEmail}: ${a.referred ? `referred on ${formatDateTime(a.referredAt)}` : `request received ${formatDay(a.assignedAt)}, referral pending`}`);
        if (a.referred && a.proofPieces) {
          line.append(' ', h('button', { type: 'button', class: 'button button-ghost button-small', onclick: () => openProof(a) }, 'View proof'));
        }
        box.append(line);
      });
    } catch (e) {
      clear(box).append(h('h4', {}, 'Live referral status'), h('p', { class: 'hint' }, 'Could not load status. ' + X.svc.friendlyError(e)));
    }
  })();
  return box;
}

async function openProof(a) {
  const tab = a.proofType === 'application/pdf' || String(a.proofType).startsWith('image/') ? window.open('', '_blank') : null;
  try {
    const parts = await Promise.all(Array.from({ length: a.proofPieces }, (_, i) => getDoc(doc(db(), 'poc_proofs', P.proofPieceId(a.id, i)))));
    if (parts.some((p) => !p.exists())) throw new Error('Part of the proof file is missing.');
    const blob = X.svc.base64ToBlob(parts.map((p) => p.data().data).join(''), a.proofType || 'application/octet-stream');
    const url = URL.createObjectURL(blob);
    if (tab) tab.location.href = url;
    else { const l = h('a', { href: url, download: a.proofName || 'proof' }); document.body.append(l); l.click(); l.remove(); }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    if (tab) tab.close();
    toast('Could not open proof: ' + X.svc.friendlyError(e), 'error');
  }
}

/* ---------- Access tab: per-section access, POC accounts ---------- */

function toggle(checked, label, onchange, disabled = false) {
  const input = h('input', { type: 'checkbox', role: 'switch', 'aria-label': label, checked, disabled });
  input.addEventListener('change', () => onchange(input));
  return h('label', { class: 'gr-switch' + (disabled ? ' is-disabled' : '') }, input, h('span', { class: 'gr-switch-track', 'aria-hidden': 'true' }));
}

const AX = { pocRows: [], noEmail: [], others: [], docsByEmail: {}, view: 'poc', q: '', filter: 'all' };

async function mountAccessPanel() {
  if (!X.isAdmin) return;
  const host = $('view-access');
  if (!host) return;
  let panel = $('grAccessPanel');
  if (!panel) {
    panel = h('div', { class: 'access-table-container gr-access-panel', id: 'grAccessPanel' });
    const addCard = host.querySelector('.access-add-card');
    if (addCard && addCard.nextSibling) host.insertBefore(panel, addCard.nextSibling);
    else host.append(panel);
  }
  await loadAccessData();
  renderAccessPanel();
}

async function loadAccessData() {
  const [pocData, accSnap] = await Promise.all([X.svc.loadPocs(), getDocs(collection(db(), 'referral_allowed_users'))]);
  const docs = accSnap.docs.map((d) => ({ id: d.id, ...d.data(), email: P.lowerEmail(d.data().email || d.id) }));
  AX.docsByEmail = Object.fromEntries(docs.map((d) => [d.email, d]));
  const built = P.buildPocAccounts(pocData.pocs || [], AX.docsByEmail);
  AX.pocRows = built.rows;
  AX.noEmail = built.noEmail;
  AX.others = P.buildOtherAccounts(docs, (e) => X.svc.isAdminEmail(e));
}

function renderAccessPanel() {
  const panel = $('grAccessPanel');
  if (!panel) return;
  clear(panel);
  const pocOn = AX.pocRows.filter((r) => r.gr || r.re).length;
  const search = h('input', { type: 'search', class: 'repo-search-input', placeholder: 'Search name, company or email…', value: AX.q, 'aria-label': 'Search accounts' });
  search.addEventListener('input', () => { AX.q = search.value; drawRows(); });
  const filter = h('select', { class: 'repo-select', 'aria-label': 'Filter accounts' },
    [['all', 'All'], ['on', 'Access on'], ['off', 'Access off']].map(([v, t]) => h('option', { value: v, selected: AX.filter === v }, t)));
  filter.addEventListener('change', () => { AX.filter = filter.value; drawRows(); });
  const tabBtn = (id, label) => h('button', {
    type: 'button', class: 'repo-cat-tab' + (AX.view === id ? ' active' : ''), 'aria-pressed': String(AX.view === id),
    onclick: () => { AX.view = id; renderAccessPanel(); },
  }, label);
  const body = h('div', { class: 'gr-access-body' });
  add(panel,
    h('div', { class: 'access-table-header gr-access-head' },
      h('div', {},
        h('h3', { class: 'access-table-title' }, 'Status of Referrals access'),
        h('p', { class: 'access-add-sub' }, 'Switch on what each account can see in Status of Referrals. Get Referred = their own referral requests. Refer and Earn = referral requests sent to them as a POC. Everyone can use the Get Referred and Refer and Earn tabs without signing in.')),
      h('button', { type: 'button', class: 'btn-outline', onclick: async () => { await loadAccessData(); renderAccessPanel(); toast('Access list refreshed'); } }, '🔄 Refresh')),
    h('div', { class: 'repo-category-tabs gr-access-tabs' },
      tabBtn('poc', `🏢 POC accounts (${AX.pocRows.length} · ${pocOn} on)`),
      tabBtn('other', `👤 Candidates & other accounts (${AX.others.length})`)),
    h('div', { class: 'gr-access-tools' }, search, filter),
    body);

  function match(r) {
    const q = AX.q.trim().toLowerCase();
    if (AX.filter === 'on' && !(r.gr || r.re)) return false;
    if (AX.filter === 'off' && (r.gr || r.re)) return false;
    if (!q) return true;
    return [r.name, r.email, r.company, r.institution, ...(r.aliases || [])].some((v) => String(v || '').toLowerCase().includes(q));
  }

  function drawRows() {
    clear(body);
    if (AX.view === 'poc') {
      const rows = AX.pocRows.filter(match);
      body.append(h('div', { class: 'gr-table-wrap' }, h('table', { class: 'access-table gr-table' },
        h('thead', {}, h('tr', {}, ['POC', 'Company', 'Get Referred', 'Refer and Earn', 'Sign-in emails', 'Email'].map((t) => h('th', { scope: 'col' }, t)))),
        h('tbody', {}, rows.length ? rows.map(pocRow) : h('tr', {}, h('td', { colspan: '6', class: 'empty-state' }, 'No POC accounts match.'))))));
      if (AX.noEmail.length) {
        body.append(h('details', { class: 'gr-noemail' },
          h('summary', {}, `${AX.noEmail.length} POC${AX.noEmail.length === 1 ? '' : 's'} have no email in the Referral Database, so they can't be switched on yet`),
          h('ul', {}, AX.noEmail.map((p) => h('li', {}, `${p.name} · ${p.company}`))),
          h('p', { class: 'hint' }, 'Add their "Email ID of Referral POC" in the Google Sheet, then re-upload it in Referral Repository → Companies & POCs.')));
      }
    } else {
      const rows = AX.others.filter(match);
      body.append(h('div', { class: 'gr-table-wrap' }, h('table', { class: 'access-table gr-table' },
        h('thead', {}, h('tr', {}, ['Account', 'Get Referred', 'Refer and Earn', 'Email'].map((t) => h('th', { scope: 'col' }, t)))),
        h('tbody', {}, rows.length ? rows.map(otherRow) : h('tr', {}, h('td', { colspan: '4', class: 'empty-state' }, 'No accounts yet. Use "Grant Access to New User" above to add one.'))))));
    }
  }
  drawRows();
}

function noticeButton(email, name, kind, enabled) {
  const btn = h('button', { type: 'button', class: 'btn-resend', disabled: !enabled, title: enabled ? 'Email sign-in instructions' : 'Switch on access first' }, '✉️ Send');
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      await X.svc.callMailer('sendAccessNotice', { to: email, name, kind: kind() });
      btn.textContent = '✓ Sent';
      toast(`Sign-in email sent to ${email}`);
    } catch (e) {
      toast('Could not send: ' + X.svc.friendlyError(e), 'error');
      btn.textContent = '✉️ Send';
      btn.disabled = false;
    }
  });
  return btn;
}

function pocRow(row) {
  const admin = X.user.email;
  const save = async (gr, re, input) => {
    input.disabled = true;
    try {
      const b = writeBatch(db());
      const base = { ...P.pocAccessDoc(row, gr, re, admin), updatedAt: serverTimestamp() };
      if (!row.hasDoc) base.grantedAt = new Date().toISOString();
      b.set(doc(db(), 'referral_allowed_users', row.email), base, { merge: true });
      row.aliases.forEach((al) => b.set(doc(db(), 'referral_allowed_users', al), { getReferredAccess: !!gr, referAndEarnAccess: !!re, updatedAt: serverTimestamp() }, { merge: true }));
      await b.commit();
      row.gr = !!gr; row.re = !!re; row.hasDoc = true;
      toast(`${row.name}: ${gr || re ? 'access updated' : 'access switched off'}`);
      renderAccessPanel();
    } catch (e) {
      toast('Could not update access: ' + X.svc.friendlyError(e), 'error');
      input.checked = !input.checked;
      input.disabled = false;
    }
  };
  const aliasInput = h('input', { type: 'email', class: 'form-input-text gr-alias-input', placeholder: 'Add another Google email', 'aria-label': `Add a sign-in email for ${row.name}` });
  const aliasAdd = h('button', { type: 'button', class: 'btn-outline gr-alias-add' }, 'Add');
  aliasAdd.addEventListener('click', async () => {
    const al = P.lowerEmail(aliasInput.value);
    if (!P.isEmail(al)) { toast('Enter a valid email address.', 'error'); return; }
    if (al === row.email || row.aliases.includes(al)) { toast('That email is already linked.', 'error'); return; }
    if (X.svc.isAdminEmail(al)) { toast('Co-founder emails cannot be used here.', 'error'); return; }
    const existing = AX.docsByEmail[al];
    if (existing && existing.isAlias !== true) { toast(`${al} already has its own account. Remove it first or use another email.`, 'error'); return; }
    aliasAdd.disabled = true;
    try {
      const b = writeBatch(db());
      b.set(doc(db(), 'referral_allowed_users', al), { ...P.aliasAccessDoc(al, row, row.gr, row.re, admin), grantedAt: new Date().toISOString(), updatedAt: serverTimestamp() }, { merge: true });
      const primary = { alternateEmails: arrayUnion(al), updatedAt: serverTimestamp() };
      if (!row.hasDoc) Object.assign(primary, P.pocAccessDoc(row, row.gr, row.re, admin), { grantedAt: new Date().toISOString() });
      b.set(doc(db(), 'referral_allowed_users', row.email), primary, { merge: true });
      await b.commit();
      await loadAccessData();
      renderAccessPanel();
      toast(`${al} can now sign in as ${row.name}`);
    } catch (e) {
      toast('Could not add the email: ' + X.svc.friendlyError(e), 'error');
      aliasAdd.disabled = false;
    }
  });
  const aliasChips = row.aliases.map((al) => h('span', { class: 'gr-alias-chip' }, al,
    h('button', {
      type: 'button', class: 'gr-alias-remove', 'aria-label': `Remove ${al}`,
      onclick: async () => {
        if (!window.confirm(`Remove ${al} as a sign-in email for ${row.name}?`)) return;
        try {
          const b = writeBatch(db());
          b.delete(doc(db(), 'referral_allowed_users', al));
          b.set(doc(db(), 'referral_allowed_users', row.email), { alternateEmails: arrayRemove(al), updatedAt: serverTimestamp() }, { merge: true });
          await b.commit();
          await loadAccessData();
          renderAccessPanel();
        } catch (e) { toast('Could not remove: ' + X.svc.friendlyError(e), 'error'); }
      },
    }, '×')));
  return h('tr', {},
    h('td', { 'data-label': 'POC' }, h('div', { class: 'gr-cell-name' }, row.name), h('div', { class: 'gr-cell-email' }, row.email),
      row.status ? h('div', { class: 'gr-cell-status' }, row.status) : null),
    h('td', { 'data-label': 'Company' }, row.company),
    h('td', { 'data-label': 'Get Referred' }, toggle(row.gr, `Get Referred access for ${row.name}`, (i) => save(i.checked, row.re, i))),
    h('td', { 'data-label': 'Refer and Earn' }, toggle(row.re, `Refer and Earn access for ${row.name}`, (i) => save(row.gr, i.checked, i))),
    h('td', { 'data-label': 'Sign-in emails' }, h('div', { class: 'gr-alias-list' }, aliasChips), h('div', { class: 'gr-alias-row' }, aliasInput, aliasAdd)),
    h('td', { 'data-label': 'Email' }, noticeButton(row.email, row.name, () => (row.gr && row.re ? 'both' : row.re ? 'poc' : 'candidate'), row.gr || row.re)));
}

function otherRow(row) {
  const save = async (gr, re, input) => {
    input.disabled = true;
    try {
      await setDoc(doc(db(), 'referral_allowed_users', row.email), { getReferredAccess: !!gr, referAndEarnAccess: !!re, updatedAt: serverTimestamp() }, { merge: true });
      row.gr = !!gr; row.re = !!re;
      toast(`${row.email}: access updated`);
      renderAccessPanel();
    } catch (e) {
      toast('Could not update access: ' + X.svc.friendlyError(e), 'error');
      input.checked = !input.checked;
      input.disabled = false;
    }
  };
  return h('tr', {},
    h('td', { 'data-label': 'Account' }, h('div', { class: 'gr-cell-name' }, row.name || row.email.split('@')[0]), h('div', { class: 'gr-cell-email' }, row.email),
      row.institution ? h('div', { class: 'gr-cell-status' }, row.institution) : null),
    h('td', { 'data-label': 'Get Referred' }, toggle(row.gr, `Get Referred access for ${row.email}`, (i) => save(i.checked, row.re, i))),
    h('td', { 'data-label': 'Refer and Earn' }, toggle(row.re, `Refer and Earn access for ${row.email}`, (i) => save(row.gr, i.checked, i))),
    h('td', { 'data-label': 'Email' }, noticeButton(row.email, row.name, () => (row.gr && row.re ? 'both' : row.re ? 'poc' : 'candidate'), row.gr || row.re)));
}

export { shortRef };
