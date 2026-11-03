/* My Career Company · Get Referred portal · admin referral desk (v2.0)
 * Loaded only after an approved account signs in. Firestore rules enforce the same allow-list.
 */
import { h, add, clear, toast, formatDateTime, timeAgo, formatDay, copyText, downloadFile, loadScriptOnce } from './ui.js?v=2.0';
import {
  parseDatabase, sortPocs, buildReferralEmail, buildCandidateEmail, textToEmailHtml, gmailComposeUrl, duplicateKeys, toCsv,
  REQUEST_STATUSES, statusLabel, shortRef, formatBytes, phoneDigitsForWhatsApp, isValidEmail, firstName, fileExtension,
} from './referral-core.js?v=2.0';
import { ADMIN_NAMES, SUPPORT_EMAIL } from './firebase-config.js?v=2.0';

const SHEETJS_URL = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
const GMAIL_URL_LIMIT = 7500;

const STATUS_CLASS = {
  'Current employee': 'badge-current',
  'Serving notice': 'badge-notice',
  'About to join': 'badge-joining',
  'Ex employee': 'badge-ex',
};

export async function mountAdmin(root, { user, svc }) {
  const A = {
    user, svc, root,
    adminName: ADMIN_NAMES[String(user.email).toLowerCase()] || user.displayName || user.email,
    requests: [],
    pocs: [],
    pocMeta: null,
    companies: [],
    selectedId: null,
    view: 'requests',
    filters: { q: '', company: '', status: '' },
    dups: new Set(),
    parsed: null,
    parsedFileName: '',
    unsub: null,
  };

  clear(root);
  root.append(buildShell(A));
  await reloadDatabase(A);
  A.unsub = svc.watchRequests((list) => {
    A.requests = list;
    A.dups = duplicateKeys(list);
    renderRequestFilters(A);
    renderList(A);
    renderDetail(A);
    document.getElementById('count-requests').textContent = String(list.length);
  }, (err) => {
    console.error('[GetReferred] watchRequests', err);
    setListMessage(A, 'Could not load requests. ' + svc.friendlyError(err));
  });
}

/* ===================== shell ===================== */

function buildShell(A) {
  const subTab = (id, label, countId) => h('button', {
    class: 'subtab', type: 'button', role: 'tab', id: 'subtab-' + id, 'aria-selected': String(A.view === id),
    onclick: () => switchView(A, id),
  }, label, countId ? h('span', { class: 'subtab-count', id: countId }, '0') : null);

  return h('div', { class: 'admin' },
    h('div', { class: 'admin-head' },
      h('div', {},
        h('h2', { class: 'admin-title' }, 'Referral Repository'),
        h('p', { class: 'admin-sub' }, `Signed in as ${A.user.email}`)),
      h('div', { class: 'subtabs', role: 'tablist', 'aria-label': 'Admin sections' },
        subTab('requests', 'Requests', 'count-requests'),
        subTab('database', 'Companies & POCs'))),
    h('div', { id: 'admin-view-requests' }, buildRequestsView(A)),
    h('div', { id: 'admin-view-database', hidden: true }, buildDatabaseView(A)),
    buildEmailDialog(A));
}

function switchView(A, id) {
  A.view = id;
  ['requests', 'database'].forEach((v) => {
    document.getElementById('subtab-' + v).setAttribute('aria-selected', String(v === id));
    document.getElementById('admin-view-' + v).hidden = v !== id;
  });
  if (id === 'database') renderDatabase(A);
}

async function reloadDatabase(A) {
  try {
    const [pocData, pub] = await Promise.all([A.svc.loadPocs(), A.svc.loadCompanies()]);
    A.pocs = pocData.pocs;
    A.pocMeta = pocData;
    A.companies = pub.companies;
  } catch (e) {
    console.error('[GetReferred] load database', e);
    toast('Could not load the POC database. ' + A.svc.friendlyError(e), 'error');
  }
}

/* ===================== requests view ===================== */

function buildRequestsView(A) {
  const search = h('input', {
    type: 'search', id: 'req-search', placeholder: 'Search name, email, job ID or reference', 'aria-label': 'Search requests',
    oninput: (e) => { A.filters.q = e.target.value; renderList(A); },
  });
  const company = h('select', { id: 'req-company', 'aria-label': 'Filter by company', onchange: (e) => { A.filters.company = e.target.value; renderList(A); } });
  const status = h('select', { id: 'req-status', 'aria-label': 'Filter by status', onchange: (e) => { A.filters.status = e.target.value; renderList(A); } },
    h('option', { value: '' }, 'All statuses'),
    REQUEST_STATUSES.map((s) => h('option', { value: s.value }, s.label)));
  const exportBtn = h('button', { type: 'button', class: 'button button-ghost', onclick: () => exportCsv(A) }, 'Export CSV');

  return h('div', { class: 'requests' },
    h('div', { class: 'toolbar' }, search, company, status, exportBtn),
    h('div', { class: 'split' },
      h('div', { class: 'list-pane' }, h('ul', { class: 'req-list', id: 'req-list', 'aria-label': 'Referral requests' })),
      h('div', { class: 'detail-pane', id: 'req-detail', tabindex: '-1' },
        h('p', { class: 'empty-state' }, 'Select a request to see the candidate and the POCs to contact.'))));
}

function renderRequestFilters(A) {
  const sel = document.getElementById('req-company');
  const current = A.filters.company;
  const names = [...new Map(A.requests.map((r) => [r.companySlug, r.company])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  add(clear(sel), h('option', { value: '' }, 'All companies'), names.map(([slug, name]) => h('option', { value: slug }, name)));
  sel.value = names.some(([s]) => s === current) ? current : '';
  A.filters.company = sel.value;
}

function filteredRequests(A) {
  const q = A.filters.q.trim().toLowerCase();
  return A.requests.filter((r) => {
    if (A.filters.company && r.companySlug !== A.filters.company) return false;
    if (A.filters.status && (r.status || 'new') !== A.filters.status) return false;
    if (!q) return true;
    return [r.fullName, r.email, r.phone, r.jobId, r.jobTitle, r.company, shortRef(r.id)].some((v) => String(v || '').toLowerCase().includes(q));
  });
}

function setListMessage(A, text) {
  clear(document.getElementById('req-list')).append(h('li', { class: 'empty-state' }, text));
}

function renderList(A) {
  const list = document.getElementById('req-list');
  const items = filteredRequests(A);
  clear(list);
  if (!A.requests.length) { setListMessage(A, 'No referral requests yet. They appear here as soon as someone submits the form.'); return; }
  if (!items.length) { setListMessage(A, 'No requests match these filters.'); return; }
  for (const r of items) {
    const st = r.status || 'new';
    list.append(h('li', {},
      h('button', {
        type: 'button', class: 'req-item' + (r.id === A.selectedId ? ' is-selected' : ''), 'aria-current': r.id === A.selectedId ? 'true' : null,
        onclick: () => selectRequest(A, r.id),
      },
      h('span', { class: 'req-item-top' },
        h('span', { class: 'req-name' }, r.fullName),
        h('span', { class: 'chip chip-' + st }, statusLabel(st))),
      h('span', { class: 'req-item-mid' }, `${r.company}, job ID ${r.jobId}`),
      h('span', { class: 'req-item-foot' },
        h('span', {}, timeAgo(r.submittedAt)),
        A.dups.has(r.id) ? h('span', { class: 'chip chip-dup' }, 'Possible duplicate') : null))));
  }
}

function selectRequest(A, id) {
  A.selectedId = id;
  renderList(A);
  renderDetail(A);
  const pane = document.getElementById('req-detail');
  if (window.matchMedia('(max-width: 900px)').matches) pane.scrollIntoView({ behavior: 'smooth', block: 'start' });
  pane.focus({ preventScroll: true });
}

/* ===================== detail ===================== */

function pocsFor(A, slug) {
  return sortPocs(A.pocs.filter((p) => p.companySlug === slug));
}

function companyFor(A, slug) {
  return A.companies.find((c) => c.slug === slug) || null;
}

function row(label, ...value) {
  return h('div', { class: 'kv' }, h('dt', {}, label), h('dd', {}, ...value));
}

function renderDetail(A) {
  const pane = document.getElementById('req-detail');
  const r = A.requests.find((x) => x.id === A.selectedId);
  // Live updates re-render this pane; keep any notes the admin is typing.
  const active = document.activeElement;
  const keep = active && active.dataset && r && active.dataset.notesFor === r.id
    ? { value: active.value, start: active.selectionStart, end: active.selectionEnd } : null;
  clear(pane);
  if (!r) { pane.append(h('p', { class: 'empty-state' }, 'Select a request to see the candidate and the POCs to contact.')); return; }

  const company = companyFor(A, r.companySlug);
  const portal = r.portalUrl || (company && company.portalUrl) || '';
  const pocs = pocsFor(A, r.companySlug);
  const st = r.status || 'new';

  const statusSel = h('select', {
    'aria-label': 'Request status',
    onchange: async (e) => {
      try { await A.svc.updateRequest(r.id, { status: e.target.value }, A.user.email); toast('Status updated'); }
      catch (err) { toast(A.svc.friendlyError(err), 'error'); e.target.value = st; }
    },
  }, REQUEST_STATUSES.map((s) => h('option', { value: s.value, selected: s.value === st }, s.label)));

  const fileButton = (kind, meta, label) => h('button', {
    type: 'button', class: 'button button-ghost button-small',
    onclick: async (e) => {
      const b = e.currentTarget;
      b.disabled = true;
      const tab = meta.type === 'application/pdf' ? window.open('', '_blank') : null; // open now so popup blockers allow it
      try {
        const url = URL.createObjectURL(await A.svc.fileBlob(r.id, kind, meta));
        if (tab) tab.location.href = url;
        else { const a = h('a', { href: url, download: meta.name }); document.body.append(a); a.click(); a.remove(); }
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } catch (err) { if (tab) tab.close(); toast(A.svc.friendlyError(err), 'error'); }
      finally { b.disabled = false; }
    },
  }, label);

  const wa = phoneDigitsForWhatsApp(r.phone);

  add(pane,
    h('button', { type: 'button', class: 'link-button back-link', onclick: () => { A.selectedId = null; renderList(A); renderDetail(A); document.getElementById('req-list').scrollIntoView({ behavior: 'smooth' }); } }, 'Back to list'),
    h('div', { class: 'detail-head' },
      h('div', {},
        h('h3', { class: 'detail-name' }, r.fullName),
        h('p', { class: 'detail-meta' }, `${r.company}, job ID ${r.jobId}${r.jobTitle ? ` (${r.jobTitle})` : ''}`),
        h('p', { class: 'detail-meta muted' }, `${shortRef(r.id)}, submitted ${formatDateTime(r.submittedAt)}`)),
      h('label', { class: 'status-field' }, h('span', { class: 'label' }, 'Status'), statusSel)),

    A.dups.has(r.id) ? h('p', { class: 'banner banner-warn' }, 'Another request has the same email, company and job ID.') : null,

    h('section', { class: 'detail-section' },
      h('h4', {}, 'Candidate'),
      h('dl', { class: 'kv-list' },
        row('Email', h('a', { href: 'mailto:' + r.email }, r.email)),
        row('Phone', h('a', { href: 'tel:' + String(r.phone).replace(/\s/g, '') }, r.phone),
          wa ? h('a', { class: 'inline-action', href: `https://wa.me/${wa}`, target: '_blank', rel: 'noopener noreferrer' }, 'WhatsApp') : null),
        row('Job portal', portal ? h('a', { href: portal, target: '_blank', rel: 'noopener noreferrer' }, portal) : h('span', { class: 'muted' }, 'No link in the database')),
        row('Resume', r.resume ? h('span', { class: 'file-line' }, `${r.resume.name} (${formatBytes(r.resume.size)})`, fileButton('resume', r.resume, 'Open resume')) : h('span', { class: 'muted' }, 'Missing')),
        row('Cover letter',
          r.coverLetterFile ? h('span', { class: 'file-line' }, `${r.coverLetterFile.name} (${formatBytes(r.coverLetterFile.size)})`, fileButton('cover-letter', r.coverLetterFile, 'Open cover letter'))
            : r.coverLetterText ? h('details', { class: 'cover-details' }, h('summary', {}, 'Show cover letter'), h('p', { class: 'prewrap' }, r.coverLetterText))
              : h('span', { class: 'muted' }, 'Not included')))),

    h('section', { class: 'detail-section' },
      h('h4', {}, 'Note of recommendation'),
      h('p', { class: 'prewrap note-text' }, r.recommendationNote)),

    h('section', { class: 'detail-section' },
      h('h4', {}, `Referral POCs at ${r.company}`, h('span', { class: 'count' }, String(pocs.length))),
      pocs.length ? h('div', { class: 'poc-list' }, pocs.map((p) => pocCard(A, r, p)))
        : h('p', { class: 'banner banner-warn' }, `No POCs for ${r.company} in the published database. Upload the latest file under Companies & POCs.`)),

    emailHistory(A, r),

    h('section', { class: 'detail-section' },
      h('h4', {}, 'Admin notes'),
      (() => {
        const ta = h('textarea', { rows: '3', 'aria-label': 'Admin notes', maxlength: '3000', placeholder: 'Visible to admins only', dataset: { notesFor: r.id } });
        ta.value = keep ? keep.value : (r.adminNotes || '');
        if (keep) setTimeout(() => { ta.focus({ preventScroll: true }); ta.setSelectionRange(keep.start, keep.end); }, 0);
        const save = h('button', {
          type: 'button', class: 'button button-ghost button-small',
          onclick: async () => {
            try { await A.svc.updateRequest(r.id, { adminNotes: ta.value.slice(0, 3000) }, A.user.email); toast('Notes saved'); }
            catch (err) { toast(A.svc.friendlyError(err), 'error'); }
          },
        }, 'Save notes');
        return h('div', { class: 'notes' }, ta, save);
      })()),

    h('section', { class: 'detail-section danger-zone' },
      h('button', {
        type: 'button', class: 'button button-danger',
        onclick: async () => {
          if (!window.confirm(`Delete ${r.fullName}'s request and uploaded files? This can't be undone.`)) return;
          try { await A.svc.deleteRequest(r); A.selectedId = null; toast('Request deleted'); }
          catch (err) { toast(A.svc.friendlyError(err), 'error'); }
        },
      }, 'Delete request and files')));
}

function pocCard(A, r, p) {
  const badge = h('span', { class: 'badge ' + (STATUS_CLASS[p.status] || 'badge-unknown') }, p.status || 'Unknown');
  const log = (r.emailLog || []).filter((e) => e.pocName === p.name);
  const last = log[log.length - 1];
  const wa = phoneDigitsForWhatsApp(p.phone);

  const contact = [];
  contact.push(row('Email', p.email ? h('a', { href: 'mailto:' + p.email }, p.email) : h('span', { class: 'muted' }, 'Not in database')));
  contact.push(row('Phone', p.phone ? h('a', { href: 'tel:' + p.phone }, p.phone) : h('span', { class: 'muted' }, 'Not in database')));
  if (p.linkedin) contact.push(row('LinkedIn', h('a', { href: p.linkedin, target: '_blank', rel: 'noopener noreferrer' }, 'Open profile')));

  return h('article', { class: 'poc-card' + (p.status === 'Ex employee' ? ' is-ex' : '') },
    h('div', { class: 'poc-head' },
      h('div', {}, h('p', { class: 'poc-name' }, p.name), p.role ? h('p', { class: 'poc-role' }, p.role) : null),
      badge),
    h('dl', { class: 'kv-list kv-compact' }, contact),
    h('div', { class: 'poc-actions' },
      h('button', { type: 'button', class: 'button button-primary button-small', onclick: () => openEmail(A, r, p) }, p.email ? 'Email request' : 'Add email and send'),
      wa ? h('a', {
        class: 'button button-ghost button-small', target: '_blank', rel: 'noopener noreferrer',
        href: `https://wa.me/${wa}?text=` + encodeURIComponent(`Hi ${firstName(p.name)}, this is ${A.adminName} from My Career Company. I've emailed you a referral request for ${r.fullName} at ${r.company} (job ID ${r.jobId}). Could you take a look?`),
      }, 'WhatsApp') : null,
      last ? h('span', { class: 'poc-sent' }, `${last.mode === 'gmail' ? 'Drafted in Gmail' : 'Emailed'} ${formatDay(last.at)}`) : null));
}

function emailHistory(A, r) {
  const log = r.emailLog || [];
  if (!log.length) return null;
  const list = h('ul', { class: 'history' });
  for (const e of [...log].reverse()) {
    const who = ADMIN_NAMES[String(e.sentBy || '').toLowerCase()] || e.sentBy || 'An admin';
    if (e.mode === 'gmail') {
      list.append(h('li', {}, `${who} opened a Gmail draft to ${e.pocName}${e.to ? ` (${e.to})` : ''} on ${formatDateTime(e.at)}.`));
    } else {
      list.append(h('li', {}, `${who} emailed ${e.pocName}${e.to ? ` (${e.to})` : ''} on ${formatDateTime(e.at)}. `,
        h('span', { class: 'history-state', dataset: { state: 'SUCCESS' } }, e.candidateNotified ? 'Candidate notified.' : 'Candidate not emailed.')));
    }
  }
  return h('section', { class: 'detail-section' }, h('h4', {}, 'Email history'), list);
}

/* ===================== email dialog ===================== */

function buildEmailDialog(A) {
  const f = (id, label, el) => h('div', { class: 'field' }, h('label', { class: 'label', for: id }, label), el);
  const tab = (id, label) => h('button', { type: 'button', class: 'subtab', role: 'tab', id: 'mailtab-' + id, 'aria-selected': String(id === 'poc'), onclick: () => showMailTab(id) }, label);
  const dlg = h('dialog', { class: 'email-dialog', id: 'email-dialog', 'aria-labelledby': 'email-dialog-title' },
    h('form', { method: 'dialog', class: 'email-form', onsubmit: (e) => e.preventDefault() },
      h('div', { class: 'dialog-head' },
        h('h3', { id: 'email-dialog-title' }, 'Email referral request'),
        h('button', { type: 'button', class: 'link-button', onclick: () => dlg.close() }, 'Close')),
      h('p', { class: 'dialog-sub', id: 'email-context' }),
      h('p', { class: 'banner banner-warn', id: 'mailer-missing', hidden: true },
        'Email sending is not set up yet, so "Send" is off. Ask the agent to paste the Apps Script URL into MAILER_URL (setup guide, Part B). Until then, use "Open POC email in Gmail".'),
      h('div', { class: 'subtabs mail-tabs', role: 'tablist', 'aria-label': 'Drafts' }, tab('poc', 'Email to POC'), tab('candidate', 'Email to candidate')),

      h('div', { id: 'mailpane-poc', class: 'mail-pane' },
        f('mail-to', 'To', h('input', { type: 'email', id: 'mail-to', autocomplete: 'off' })),
        h('p', { class: 'field-error', id: 'mail-to-err', role: 'alert' }),
        f('mail-cc', 'CC', h('input', { type: 'email', id: 'mail-cc', autocomplete: 'off' })),
        f('mail-subject', 'Subject', h('input', { type: 'text', id: 'mail-subject', maxlength: '300' })),
        f('mail-body', 'Message', h('textarea', { id: 'mail-body', rows: '14' })),
        h('p', { class: 'hint', id: 'mail-attach' })),

      h('div', { id: 'mailpane-candidate', class: 'mail-pane', hidden: true },
        h('label', { class: 'consent' }, h('input', { type: 'checkbox', id: 'cand-send' }), h('span', { id: 'cand-send-label' }, 'Also email the candidate')),
        h('p', { class: 'hint', id: 'cand-note' }),
        f('cand-to', 'To', h('input', { type: 'email', id: 'cand-to', autocomplete: 'off' })),
        h('p', { class: 'field-error', id: 'cand-to-err', role: 'alert' }),
        f('cand-subject', 'Subject', h('input', { type: 'text', id: 'cand-subject', maxlength: '300' })),
        f('cand-body', 'Message', h('textarea', { id: 'cand-body', rows: '14' }))),

      h('div', { class: 'dialog-actions' },
        h('button', { type: 'button', class: 'button button-primary', id: 'mail-send' }, 'Send 2 emails'),
        h('button', { type: 'button', class: 'button button-ghost', id: 'mail-gmail', hidden: true }, 'Open POC email in Gmail'),
        h('button', { type: 'button', class: 'button button-ghost', id: 'mail-copy' }, 'Copy POC email'),
        h('p', { class: 'mail-summary', id: 'mail-summary' })),
      h('p', { class: 'mail-status', id: 'mail-status', role: 'status', 'aria-live': 'polite' })));
  return dlg;
}

function showMailTab(id) {
  ['poc', 'candidate'].forEach((t) => {
    document.getElementById('mailtab-' + t).setAttribute('aria-selected', String(t === id));
    document.getElementById('mailpane-' + t).hidden = t !== id;
  });
}

async function openEmail(A, r, p) {
  const dlg = document.getElementById('email-dialog');
  const $ = (id) => document.getElementById(id);
  const company = companyFor(A, r.companySlug) || { name: r.company, portalUrl: r.portalUrl || '' };
  const ready = A.svc.mailerConfigured;

  // ---- POC draft
  const poc = buildReferralEmail({ request: r, poc: p, company, adminName: A.adminName });
  $('email-context').textContent = `To ${p.name} (${p.status}) about ${r.fullName}, ${r.company}, job ID ${r.jobId}.`;
  $('mail-to').value = p.email || '';
  $('mail-to-err').textContent = p.email ? '' : 'This POC has no email in the database. Type it here, and add it to the sheet later.';
  $('mail-cc').value = A.user.email;
  $('mail-subject').value = poc.subject;
  $('mail-body').value = poc.text;
  const safe = String(r.fullName).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'Candidate';
  const files = [];
  if (r.resume) files.push({ kind: 'resume', meta: r.resume, filename: `${safe}_Resume.${fileExtension(r.resume.name) || 'pdf'}` });
  if (r.coverLetterFile) files.push({ kind: 'cover-letter', meta: r.coverLetterFile, filename: `${safe}_Cover_Letter.${fileExtension(r.coverLetterFile.name) || 'pdf'}` });
  $('mail-attach').textContent = files.length ? `Attached: ${files.map((x) => `${x.filename} (${formatBytes(x.meta.size)})`).join(', ')}.` : 'No files to attach.';

  // ---- candidate draft
  const cand = buildCandidateEmail({ request: r, company, adminName: A.adminName, ref: shortRef(r.id) });
  const already = (r.emailLog || []).find((e) => e.candidateNotified);
  $('cand-send').checked = !already;
  $('cand-note').textContent = already
    ? `The candidate was already emailed on ${formatDay(already.at)} (when ${already.pocName} was contacted). Tick the box only if you want to email them again.`
    : 'Sent from the same account as the POC email. It doesn\'t name the POC.';
  $('cand-to').value = r.email;
  $('cand-to-err').textContent = '';
  $('cand-subject').value = cand.subject;
  $('cand-body').value = cand.text;

  // ---- state
  $('mailer-missing').hidden = ready;
  $('mail-gmail').hidden = ready;
  $('mail-status').textContent = '';
  $('mail-status').dataset.state = '';
  const send = $('mail-send');
  const updateSummary = () => {
    const n = $('cand-send').checked ? 2 : 1;
    send.textContent = n === 2 ? 'Send 2 emails' : 'Send email to POC';
    $('mail-summary').textContent = n === 2 ? 'Sends the POC email (with attachments) and the candidate email from Gmail.' : 'Sends the POC email only.';
  };
  $('cand-send').onchange = updateSummary;
  updateSummary();
  send.disabled = !ready;
  showMailTab('poc');
  if (!dlg.open) dlg.showModal();

  const readDrafts = () => {
    const to = $('mail-to').value.trim();
    const cc = $('mail-cc').value.trim();
    if (!isValidEmail(to)) { showMailTab('poc'); $('mail-to-err').textContent = 'Enter a valid email address for the POC.'; $('mail-to').focus(); return null; }
    if (cc && !isValidEmail(cc)) { showMailTab('poc'); $('mail-status').textContent = 'The CC address is not valid.'; return null; }
    $('mail-to-err').textContent = '';
    const out = { poc: { to, cc, subject: $('mail-subject').value.trim(), text: $('mail-body').value } };
    if ($('cand-send').checked) {
      const cto = $('cand-to').value.trim();
      if (!isValidEmail(cto)) { showMailTab('candidate'); $('cand-to-err').textContent = 'Enter a valid email address for the candidate.'; $('cand-to').focus(); return null; }
      $('cand-to-err').textContent = '';
      out.candidate = { to: cto, subject: $('cand-subject').value.trim(), text: $('cand-body').value };
    }
    if (!out.poc.subject || !out.poc.text.trim() || (out.candidate && (!out.candidate.subject || !out.candidate.text.trim()))) {
      $('mail-status').textContent = 'Subjects and messages can\'t be empty.';
      return null;
    }
    return out;
  };

  send.onclick = async () => {
    const d = readDrafts();
    if (!d) return;
    send.disabled = true;
    $('mail-status').dataset.state = '';
    try {
      $('mail-status').textContent = 'Attaching files…';
      const attachments = [];
      for (const x of files) attachments.push({ filename: x.filename, mimeType: x.meta.type, base64: await A.svc.readFileBase64(r.id, x.kind, x.meta) });
      $('mail-status').textContent = 'Sending from Gmail…';
      const res = await A.svc.callMailer('sendReferral', {
        requestRef: shortRef(r.id),
        poc: { ...d.poc, html: textToEmailHtml(d.poc.text), replyTo: A.user.email, attachments },
        candidate: d.candidate ? { ...d.candidate, html: textToEmailHtml(d.candidate.text), replyTo: SUPPORT_EMAIL } : null,
      });
      try {
        await A.svc.logEmail(r.id, { pocName: p.name, to: d.poc.to, sentBy: A.user.email, mode: 'mailer', candidateNotified: !!d.candidate },
          (r.status || 'new') === 'new' ? { status: 'poc_emailed' } : {});
      } catch (e) { console.warn('[GetReferred] email sent but log failed', e); }
      const n = res.sent || (d.candidate ? 2 : 1);
      $('mail-status').dataset.state = 'SUCCESS';
      $('mail-status').textContent = `Sent ${n} email${n === 1 ? '' : 's'} from ${res.from || 'Gmail'}.${typeof res.quotaLeft === 'number' ? ` ${res.quotaLeft} sends left today.` : ''}`;
      send.textContent = 'Sent';
      toast(`Sent ${n} email${n === 1 ? '' : 's'}`);
    } catch (e) {
      $('mail-status').dataset.state = 'ERROR';
      $('mail-status').textContent = 'Not sent. ' + A.svc.friendlyError(e);
      $('mail-gmail').hidden = false;
      send.disabled = !ready;
    }
  };

  $('mail-gmail').onclick = async () => {
    const d = readDrafts();
    if (!d) return;
    const body = d.poc.text + '\n\n(Resume: open it from the referral desk and attach it to this email.)';
    let url = gmailComposeUrl({ to: d.poc.to, cc: d.poc.cc, subject: d.poc.subject, body });
    if (url.length > GMAIL_URL_LIMIT) {
      await copyText(body);
      url = gmailComposeUrl({ to: d.poc.to, cc: d.poc.cc, subject: d.poc.subject, body: 'The message was too long for a link. It is copied to your clipboard: paste it here.' });
      toast('Message copied. Paste it into the Gmail draft.');
    }
    window.open(url, '_blank', 'noopener');
    try { await A.svc.logEmail(r.id, { pocName: p.name, to: d.poc.to, sentBy: A.user.email, mode: 'gmail', candidateNotified: false }); } catch (e) { console.warn(e); }
    $('mail-status').textContent = 'Opened a Gmail draft for the POC. Attach the resume yourself. The candidate was not emailed.';
  };

  $('mail-copy').onclick = async () => {
    const ok = await copyText(`Subject: ${$('mail-subject').value}\n\n${$('mail-body').value}`);
    toast(ok ? 'POC email copied' : 'Could not copy. Select the text and copy it manually.', ok ? 'info' : 'error');
  };
}

/* ===================== export ===================== */

function exportCsv(A) {
  const rows = [['Reference', 'Submitted', 'Status', 'Name', 'Email', 'Phone', 'Company', 'Job ID', 'Job title', 'Note of recommendation', 'Cover letter (text)', 'Resume file', 'Cover letter file', 'POCs emailed', 'Admin notes']];
  for (const r of filteredRequests(A)) {
    rows.push([
      shortRef(r.id), formatDateTime(r.submittedAt), statusLabel(r.status || 'new'), r.fullName, r.email, r.phone, r.company, r.jobId, r.jobTitle || '',
      r.recommendationNote, r.coverLetterText || '', r.resume ? r.resume.name : '', r.coverLetterFile ? r.coverLetterFile.name : '',
      (r.emailLog || []).map((e) => e.pocName).join('; '), r.adminNotes || '',
    ]);
  }
  const stamp = new Date().toISOString().slice(0, 10);
  downloadFile(`referral_requests_${stamp}.csv`, toCsv(rows));
  toast(`Exported ${rows.length - 1} request${rows.length === 2 ? '' : 's'}`);
}

/* ===================== database view ===================== */

function buildDatabaseView(A) {
  const input = h('input', {
    type: 'file', id: 'db-file', accept: '.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv',
    'aria-describedby': 'db-howto', onchange: (e) => handleDbFile(A, e.target.files[0]),
  });
  return h('div', { class: 'db' },
    h('section', { class: 'card' },
      h('h3', {}, 'Update the POC database'),
      h('ol', { class: 'howto', id: 'db-howto' },
        h('li', {}, 'In Google Sheets, open the Referral Database and choose File, then Download, then Microsoft Excel (.xlsx).'),
        h('li', {}, 'Choose that file below and check the summary.'),
        h('li', {}, 'Select Publish. The company list on the public page and the POC details here update straight away.')),
      h('label', { class: 'label', for: 'db-file' }, 'Database file'),
      input,
      h('div', { id: 'db-preview' })),
    h('section', { class: 'card' },
      h('h3', {}, 'Published data'),
      h('div', { id: 'db-current' })),
    h('section', { class: 'card' },
      h('h3', {}, 'Email sending'),
      h('p', { id: 'mailer-state' }, A.svc.mailerConfigured
        ? 'The Gmail sender (Apps Script) is set up. Check the connection after any change to the script.'
        : 'Not set up yet. Follow Part B of the setup guide, then paste the web app URL into MAILER_URL in firebase-config.js.'),
      h('div', { class: 'preview-actions', style: 'margin-top:14px;' },
        h('button', {
          type: 'button', class: 'button button-ghost', disabled: !A.svc.mailerConfigured,
          onclick: async (e) => {
            const b = e.currentTarget; const out = document.getElementById('mailer-state');
            b.disabled = true; out.textContent = 'Checking…';
            try {
              const res = await A.svc.callMailer('ping');
              out.textContent = `Connected. Emails go out from ${res.from}. Sends left today: ${res.quotaLeft}. Your sign-in was accepted as ${res.admin}.`;
            } catch (err) { out.textContent = 'Not connected. ' + A.svc.friendlyError(err); }
            finally { b.disabled = false; }
          },
        }, 'Check connection'))));
}

async function handleDbFile(A, file) {
  const preview = clear(document.getElementById('db-preview'));
  A.parsed = null;
  if (!file) return;
  preview.append(h('p', { class: 'hint' }, 'Reading the file…'));
  try {
    const XLSX = await loadScriptOnce(SHEETJS_URL, 'XLSX');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const sheets = {};
    for (const name of wb.SheetNames) {
      sheets[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: '', blankrows: true });
    }
    A.parsed = parseDatabase(sheets);
    A.parsedFileName = file.name;
    renderPreview(A);
  } catch (e) {
    console.error('[GetReferred] parse', e);
    clear(preview).append(h('p', { class: 'banner banner-error' }, 'Could not read this file. ' + (e.message || '') + ' Download the sheet again as .xlsx and retry.'));
  }
}

function summarySentence(s) {
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  return `${plural(s.companies, 'company', 'companies')} and ${plural(s.pocs, 'POC', 'POCs')}. ` +
    `POCs with an email: ${s.pocsWithEmail} of ${s.pocs}. With a phone number: ${s.pocsWithPhone}. With a LinkedIn link: ${s.pocsWithLinkedin}. ` +
    `Companies with a job portal link: ${s.companiesWithPortal} of ${s.companies}.`;
}

function issueList(issues) {
  if (!issues || !issues.length) return h('p', { class: 'hint' }, 'No issues found.');
  const order = { error: 0, warn: 1, info: 2 };
  const sorted = [...issues].sort((a, b) => order[a.level] - order[b.level]);
  return h('details', { class: 'issues', open: issues.some((i) => i.level === 'error') },
    h('summary', {}, `${issues.length} note${issues.length === 1 ? '' : 's'} about this data`),
    h('ul', {}, sorted.map((i) => h('li', { class: 'issue-' + i.level }, i.text))));
}

function renderPreview(A) {
  const preview = clear(document.getElementById('db-preview'));
  const p = A.parsed;
  const hasError = p.issues.some((i) => i.level === 'error');
  preview.append(
    h('div', { class: 'preview' },
      h('p', {}, h('strong', {}, A.parsedFileName), `: ${summarySentence(p.stats)}`),
      issueList(p.issues),
      hasError ? h('p', { class: 'banner banner-warn' }, 'You can still publish. Emails can be typed in manually until the sheet has an email column.') : null,
      h('div', { class: 'preview-actions' },
        h('button', {
          type: 'button', class: 'button button-primary',
          onclick: async (e) => {
            const b = e.currentTarget;
            b.disabled = true;
            b.textContent = 'Publishing…';
            try {
              await A.svc.publishDatabase(A.parsed, A.user.email, A.parsedFileName);
              await reloadDatabase(A);
              A.parsed = null;
              document.getElementById('db-file').value = '';
              clear(document.getElementById('db-preview')).append(h('p', { class: 'banner banner-ok' }, 'Published. The public company list and POC details are now up to date.'));
              renderDatabase(A);
              renderDetail(A);
              toast('Database published');
            } catch (err) {
              b.disabled = false;
              b.textContent = 'Publish';
              toast(A.svc.friendlyError(err), 'error');
            }
          },
        }, 'Publish'),
        h('button', { type: 'button', class: 'button button-ghost', onclick: () => { A.parsed = null; document.getElementById('db-file').value = ''; clear(document.getElementById('db-preview')); } }, 'Cancel'))));
}

function renderDatabase(A) {
  const box = clear(document.getElementById('db-current'));
  const meta = A.pocMeta;
  if (!meta || !meta.updatedAt) {
    box.append(h('p', { class: 'empty-state' }, 'Nothing published yet. Upload the database file above to fill the company list.'));
    return;
  }
  add(box,
    h('p', {}, `Last published ${formatDateTime(meta.updatedAt)} by ${meta.updatedBy || 'an admin'}${meta.fileName ? ` from ${meta.fileName}` : ''}.`),
    meta.stats ? h('p', {}, summarySentence(meta.stats)) : null,
    issueList(meta.issues));

  const search = h('input', { type: 'search', placeholder: 'Search companies or POCs', 'aria-label': 'Search companies or POCs' });
  const list = h('div', { class: 'co-list' });
  const draw = () => {
    const q = search.value.trim().toLowerCase();
    clear(list);
    const companies = A.companies.length ? A.companies : [];
    let shown = 0;
    for (const c of companies) {
      const pocs = pocsFor(A, c.slug);
      if (q && !c.name.toLowerCase().includes(q) && !pocs.some((p) => p.name.toLowerCase().includes(q))) continue;
      shown++;
      const withEmail = pocs.filter((p) => p.email).length;
      list.append(h('details', { class: 'co-item' },
        h('summary', {},
          h('span', { class: 'co-name' }, c.name),
          h('span', { class: 'co-stat' }, `${pocs.length} POC${pocs.length === 1 ? '' : 's'}`),
          h('span', { class: 'co-stat' + (withEmail ? '' : ' is-missing') }, `${withEmail} with email`),
          h('span', { class: 'co-stat' + (c.portalUrl ? '' : ' is-missing') }, c.portalUrl ? 'Portal link' : 'No portal link')),
        h('div', { class: 'co-body' },
          c.portalUrl ? h('p', {}, h('a', { href: c.portalUrl, target: '_blank', rel: 'noopener noreferrer' }, c.portalUrl)) : null,
          h('table', { class: 'poc-table' },
            h('thead', {}, h('tr', {}, ['Name', 'Status', 'Role', 'Phone', 'Email', 'LinkedIn'].map((t) => h('th', { scope: 'col' }, t)))),
            h('tbody', {}, pocs.map((p) => h('tr', {},
              h('td', {}, p.name),
              h('td', {}, h('span', { class: 'badge ' + (STATUS_CLASS[p.status] || 'badge-unknown') }, p.status)),
              h('td', {}, p.role || '—'),
              h('td', {}, p.phone || '—'),
              h('td', {}, p.email || '—'),
              h('td', {}, p.linkedin ? h('a', { href: p.linkedin, target: '_blank', rel: 'noopener noreferrer' }, 'Profile') : '—'))))))));
    }
    if (!shown) list.append(h('p', { class: 'empty-state' }, 'No companies or POCs match.'));
  };
  search.addEventListener('input', draw);
  box.append(search, list);
  draw();
}
