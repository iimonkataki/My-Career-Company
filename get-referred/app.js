/* My Career Company · Get Referred™ portal · app shell + user flow (v2.1) */
import * as svc from './firebase-service.js?v=2.4';
import { REFERRAL_DEFAULT_COMPANIES, renderTripleMarquee, resolveCompanyLogo, makeMonogramDataUri } from '/js/company-logos.js?v=4.2';
import {
  validateRequest, buildRequestDoc, resolveFileType, validateFile, formatBytes, looksFirstPerson,
  shortRef, cleanText, NOTE_MAX, CORE_VERSION, MAX_RESUME_BYTES, MAX_COVER_BYTES,
} from './referral-core.js?v=2.0';
import { toast } from './ui.js?v=2.0';
import * as ext from './portal-ext.js?v=4.3'; // v4

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
  signingOutRejectedUser: false,
  allowedUsers: [],
  activeInviteContext: null,
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ===================== tabs ===================== */

function showTab(name) {
  // v3: five tabs. ext.canSee() decides what this visitor may open.
  const tabs = ['user', 'status', 'refer', 'admin', 'access'];
  const activeTab = tabs.includes(name) && ext.canSee(name) ? name : 'user';
  for (const t of tabs) {
    const btn = $('tab-' + t);
    const view = $('view-' + t);
    if (btn) {
      btn.setAttribute('aria-selected', String(activeTab === t));
      btn.classList.toggle('active', activeTab === t);
    }
    if (view) view.hidden = activeTab !== t;
  }

  if (activeTab === 'access') {
    loadAccessView();
  }
  ext.onTabShown(activeTab);

  const wanted = ext.hashFor(activeTab);
  if (location.hash !== wanted) history.replaceState(null, '', location.pathname + location.search + wanted);
}

$('tab-user').addEventListener('click', () => showTab('user'));
$('tab-admin').addEventListener('click', () => showTab('admin'));
if ($('tab-access')) $('tab-access').addEventListener('click', () => showTab('access'));
window.addEventListener('hashchange', () => showTab(ext.tabFromHash(location.hash)));

/* ===================== auth gate + top-right account widget ===================== */

function showLockedState() {
  const mainEl = $('main');
  const headerEl = $('siteHeader');
  const gate = $('authGateOverlay');
  const gateLoading = $('authGateLoading');
  const gateLoginCard = $('authGateLoginCard');
  const gateErrorCard = $('authGateErrorCard');
  const widget = $('headerUserWidget');
  const tabAdmin = $('tab-admin');
  const tabAccess = $('tab-access');
  const headerNav = $('headerNav');

  if (mainEl) mainEl.style.display = 'none';
  if (headerEl) headerEl.style.opacity = '0.4';
  if (gate) {
    gate.style.display = 'flex';
    gate.setAttribute('aria-hidden', 'false');
  }
  if (gateLoading) gateLoading.style.display = 'none';
  if (gateLoginCard) gateLoginCard.style.display = 'block';
  if (gateErrorCard) gateErrorCard.style.display = 'none';
  if (widget) widget.innerHTML = '';
  if (tabAdmin) {
    tabAdmin.hidden = true;
    tabAdmin.style.display = 'none';
  }
  if (tabAccess) {
    tabAccess.hidden = true;
    tabAccess.style.display = 'none';
  }
  if (headerNav) headerNav.classList.add('single-tab');
}

function showDeniedState(rejectedEmail) {
  const mainEl = $('main');
  const headerEl = $('siteHeader');
  const gate = $('authGateOverlay');
  const gateLoading = $('authGateLoading');
  const gateLoginCard = $('authGateLoginCard');
  const gateErrorCard = $('authGateErrorCard');
  const deniedEmailEl = $('authDeniedEmailText');
  const widget = $('headerUserWidget');
  const tabAdmin = $('tab-admin');
  const tabAccess = $('tab-access');
  const headerNav = $('headerNav');

  if (mainEl) mainEl.style.display = 'none';
  if (headerEl) headerEl.style.opacity = '0.4';
  if (gate) {
    gate.style.display = 'flex';
    gate.setAttribute('aria-hidden', 'false');
  }
  if (gateLoading) gateLoading.style.display = 'none';
  if (gateLoginCard) gateLoginCard.style.display = 'none';
  if (gateErrorCard) gateErrorCard.style.display = 'block';
  if (deniedEmailEl) deniedEmailEl.textContent = rejectedEmail || 'Unknown Account';
  if (widget) widget.innerHTML = '';
  if (tabAdmin) {
    tabAdmin.hidden = true;
    tabAdmin.style.display = 'none';
  }
  if (tabAccess) {
    tabAccess.hidden = true;
    tabAccess.style.display = 'none';
  }
  if (headerNav) headerNav.classList.add('single-tab');
}

function showAuthorizedState(user) {
  const mainEl = $('main');
  const headerEl = $('siteHeader');
  const gate = $('authGateOverlay');
  const widget = $('headerUserWidget');
  const tabAdmin = $('tab-admin');
  const tabAccess = $('tab-access');
  const headerNav = $('headerNav');
  const admin = !!user && svc.isAdminEmail(user.email);

  if (gate) {
    gate.style.display = 'none';
    gate.setAttribute('aria-hidden', 'true');
  }
  if (mainEl) {
    mainEl.style.display = '';
    mainEl.style.visibility = 'visible';
  }
  if (headerEl) headerEl.style.opacity = '1';

  if (tabAdmin) {
    tabAdmin.hidden = !admin;
    tabAdmin.style.display = admin ? 'inline-flex' : 'none';
  }
  if (tabAccess) {
    tabAccess.hidden = !admin;
    tabAccess.style.display = admin ? 'inline-flex' : 'none';
  }
  if (headerNav) {
    headerNav.classList.toggle('single-tab', !admin);
  }

  if (widget) {
    const rawName = (user.displayName || user.email || 'CC').trim();
    const nameParts = rawName.includes('@')
      ? rawName.split('@')[0].split(/[._\-\s]+/).filter(Boolean)
      : rawName.split(/\s+/).filter(Boolean);
    const initials = (nameParts.length >= 2
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0])
      : (nameParts[0] || 'CC').substring(0, 2)
    ).toUpperCase();

    const avatarHtml = `<span class="auth-admin-avatar-initials">${escapeHtml(initials)}</span>`;
    const roleBadgeHtml = admin
      ? `<span class="auth-admin-tag cofounder-badge">👑 Co-Founder</span>`
      : `<span class="auth-admin-tag user-tag">👤 Verified User</span>`;

    widget.innerHTML = `
      <div class="auth-admin-pill" id="authAdminPill">
        <div class="auth-admin-avatar">${avatarHtml}</div>
        <div class="auth-admin-info">
          <span class="auth-admin-name">${escapeHtml(user.displayName || user.email || 'Verified User')}</span>
          ${roleBadgeHtml}
        </div>
        <button type="button" class="btn-admin-signout" id="adminSignOutBtn" title="Switch account / Sign Out">Sign Out</button>
      </div>
    `;

    const signoutBtn = $('adminSignOutBtn');
    if (signoutBtn) {
      signoutBtn.addEventListener('click', async () => {
        await svc.signOutUser();
        toast('Signed out');
      });
    }
  }

  // v4: forms start blank (hint text only); the candidate types their own name and email.
  renderSlip();
}

async function handleGoogleSignIn(errEl) {
  if (errEl) errEl.textContent = '';
  const gateLoading = $('authGateLoading');
  const gateLoadingText = $('authGateLoadingText');
  const gateLoginCard = $('authGateLoginCard');
  const gateErrorCard = $('authGateErrorCard');

  if (gateErrorCard) gateErrorCard.style.display = 'none';
  if (gateLoginCard) gateLoginCard.style.display = 'none';
  if (gateLoading) {
    gateLoading.style.display = 'flex';
    if (gateLoadingText) gateLoadingText.textContent = 'Opening Google Account Chooser...';
  }

  try {
    await svc.signInAdmin();
  } catch (e) {
    const code = (e && e.code) || '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      ext.showPublicState(); // v3: cancelling sign-in returns to the open portal
      return;
    }
    const msg = svc.friendlyError(e);
    if (errEl) errEl.textContent = msg;
    toast(msg, 'error');
    ext.showPublicState();
  }
}

if ($('gateGoogleSignInBtn')) {
  $('gateGoogleSignInBtn').addEventListener('click', () => handleGoogleSignIn());
}
if ($('gateTryAgainBtn')) {
  $('gateTryAgainBtn').addEventListener('click', () => handleGoogleSignIn());
}
if ($('admin-signin-btn')) {
  $('admin-signin-btn').addEventListener('click', () => handleGoogleSignIn($('admin-signin-err')));
}
if ($('team-signin')) {
  $('team-signin').addEventListener('click', () => {
    if (state.user && svc.isAdminEmail(state.user.email)) { showTab('admin'); window.scrollTo({ top: 0 }); return; }
    handleGoogleSignIn($('admin-signin-err'));
  });
}

svc.onAuth(async (user) => {
  if (!user) {
    state.user = null;
    if (state.signingOutRejectedUser) {
      state.signingOutRejectedUser = false;
      return;
    }
    if (state.adminMounted) {
      location.reload();
      return;
    }
    // v3: no sign-in needed for Get Referred and Refer and Earn
    ext.showPublicState();
    await ext.onAuthChanged(null);
    showTab(ext.tabFromHash(location.hash));
    return;
  }

  // v3: no global gate. Any Google account can use the portal; Status of Referrals needs access (see ext).
  state.user = user;
  showAuthorizedState(user);
  await ext.onAuthChanged(user);

  const admin = !!user && svc.isAdminEmail(user.email);
  if ($('team-signin')) $('team-signin').textContent = admin ? 'Open referral repository' : 'Team sign-in';

  if (admin) {
    if ($('admin-signin')) $('admin-signin').hidden = true;
    if (!state.adminMounted) {
      state.adminMounted = true;
      try {
        const mod = await import('./admin.js?v=2.4');
        await mod.mountAdmin($('admin-root'), { user, svc, ext });
      } catch (e) {
        state.adminMounted = false;
        console.error('[GetReferred] admin load failed', e);
        toast('Could not open the referral repository: ' + svc.friendlyError(e), 'error');
      }
    }
    showTab(ext.tabFromHash(location.hash));
  } else {
    if (state.adminMounted) { location.reload(); return; }
    if ($('admin-signin')) $('admin-signin').hidden = false;
    showTab(ext.tabFromHash(location.hash));
  }
});

/* ===================== candidate access management console ===================== */

async function loadAccessView() {
  if (!state.user || !svc.isAdminEmail(state.user.email)) return;
  const tbody = $('accessTableBody');
  const statTotal = $('accessStatTotal');
  const statCoFounders = $('accessStatCoFounders');
  const statEvaluators = $('accessStatEvaluators');
  const tableCount = $('accessTableCount');

  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 24px; color: var(--color-gold-light);">
          Loading authorized access whitelist...
        </td>
      </tr>
    `;
  }

  try {
    const users = await svc.fetchAllowedUsers();
    state.allowedUsers = users;
    const foundersCount = users.filter((u) => u.isFounder).length;
    const grantedCount = users.filter((u) => !u.isFounder).length;
    if (statTotal) statTotal.textContent = String(users.length);
    if (statCoFounders) statCoFounders.textContent = String(foundersCount);
    if (statEvaluators) statEvaluators.textContent = String(grantedCount);
    if (tableCount) tableCount.textContent = String(users.length);
    renderAccessTable(users, ($('accessSearchInput') && $('accessSearchInput').value) || '');
  } catch (err) {
    console.error('[GetReferred] loadAccessView failed', err);
    toast('Could not load access directory: ' + svc.friendlyError(err), 'error');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 24px; color: #FFA4A4;">
            Failed to load access whitelist: ${escapeHtml(svc.friendlyError(err))}
          </td>
        </tr>
      `;
    }
  }
}

function renderAccessTable(users, query = '') {
  const tbody = $('accessTableBody');
  if (!tbody) return;
  const q = String(query || '').trim().toLowerCase();
  const filtered = q
    ? users.filter((u) =>
        (u.email || '').toLowerCase().includes(q) ||
        (u.name || '').toLowerCase().includes(q) ||
        (u.institution || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q)
      )
    : users;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 28px; color: var(--color-text-muted);">No matching accounts found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((u) => {
    if (u.isFounder) {
      const displayName = u.name || u.email.split('@')[0];
      const initials = displayName.split(' ').map((w) => w[0]).join('').toUpperCase().substring(0, 2);
      const inst = u.institution || 'My Career Company';
      return `
        <tr class="access-row-founder">
          <td>
            <div class="access-user-cell">
              <div class="access-user-avatar" style="background: rgba(212, 175, 124, 0.25); color: var(--color-gold-light);">${escapeHtml(initials)}</div>
              <div>
                <div style="font-weight: 700; color: #FFF;">${escapeHtml(displayName)}</div>
                <div style="font-size: 11.5px; color: var(--color-gold-light); font-family: monospace;">${escapeHtml(u.email)}</div>
              </div>
            </div>
          </td>
          <td><span class="badge-founder">Co-Founder (Owner)</span></td>
          <td><span style="color: var(--color-text-secondary);">${escapeHtml(inst)}</span></td>
          <td><span style="color: var(--color-text-muted); font-size: 11.5px;">Permanent</span></td>
          <td><span class="status-active">● Active</span></td>
          <td><span class="action-locked">🔒 Primary Owner</span></td>
        </tr>
      `;
    }

    const displayName = u.name || u.email.split('@')[0];
    const initials = displayName.substring(0, 2).toUpperCase();
    const inst = u.institution || '—';
    const grantedDate = u.grantedAt
      ? new Date(u.grantedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Active';

    return `
      <tr class="access-row-granted" data-email="${escapeHtml(u.email)}">
        <td>
          <div class="access-user-cell">
            <div class="access-user-avatar" style="background: rgba(66, 133, 244, 0.2); color: #8AB4F8;">${escapeHtml(initials)}</div>
            <div>
              <div style="font-weight: 700; color: #FFF;">${escapeHtml(displayName)}</div>
              <div style="font-size: 11.5px; color: #8AB4F8; font-family: monospace;">${escapeHtml(u.email)}</div>
            </div>
          </div>
        </td>
        <td><span class="badge-granted">Granted User</span></td>
        <td><span style="color: var(--color-text-secondary);">${escapeHtml(inst)}</span></td>
        <td><span style="color: var(--color-text-muted); font-size: 11.5px;">${escapeHtml(grantedDate)}</span></td>
        <td><span class="status-active">● Active</span></td>
        <td>
          <button type="button" class="btn-resend" data-resend-email="${escapeHtml(u.email)}" data-resend-name="${escapeHtml(displayName)}" data-resend-inst="${escapeHtml(inst)}" title="Open invitation email">
            ✉️ Invite
          </button>
          <button type="button" class="btn-revoke" data-revoke-email="${escapeHtml(u.email)}" title="Revoke access for this user">
            Revoke
          </button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-resend-email]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const email = btn.getAttribute('data-resend-email');
      const name = btn.getAttribute('data-resend-name');
      const inst = btn.getAttribute('data-resend-inst');

      btn.disabled = true;
      const origHtml = btn.innerHTML;
      btn.innerHTML = 'Sending...';
      try {
        await svc.sendInvitationEmail(email, {
          name,
          institution: inst === '—' ? '' : inst,
          grantedBy: (state.user && state.user.email) || 'Co-Founder',
        });
        btn.innerHTML = '✓ Sent!';
        const statusEl = $('accessGrantStatus');
        if (statusEl) {
          statusEl.style.display = 'inline-flex';
          statusEl.className = 'access-grant-status success-banner';
          statusEl.innerHTML = `✓ <strong>Invitation Re-Dispatched:</strong> Automated email sent from <code>support@mycareercompany.com</code> to <strong>${escapeHtml(email)}</strong>.`;
        }
        openAccessInviteModal(email, name, inst === '—' ? '' : inst, true);
        setTimeout(() => {
          btn.disabled = false;
          btn.innerHTML = origHtml;
        }, 3000);
      } catch (err) {
        toast('Could not send invitation email: ' + svc.friendlyError(err), 'error');
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
    });
  });

  tbody.querySelectorAll('[data-revoke-email]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const email = btn.getAttribute('data-revoke-email');
      if (!email) return;
      if (!confirm(`Are you sure you want to revoke access for ${email}? This user will no longer be permitted to log into the portal.`)) return;
      btn.disabled = true;
      btn.textContent = 'Revoking…';
      try {
        await svc.revokeUserAccess(email);
        toast(`Revoked access for ${email}`);
        await loadAccessView();
      } catch (err) {
        toast('Could not revoke access: ' + svc.friendlyError(err), 'error');
        btn.disabled = false;
        btn.textContent = 'Revoke';
      }
    });
  });
}

function openAccessInviteModal(email, name = '', institution = '', autoDispatched = true) {
  const modal = $('accessInviteModal');
  if (!modal) return;
  const { subject, textBody } = svc.buildInvitationEmail(email, { name, institution });
  state.activeInviteContext = { email, name, institution, subject, textBody };

  if ($('inviteRecipientEmail')) $('inviteRecipientEmail').textContent = email;
  if ($('inviteToInput')) $('inviteToInput').value = email;
  if ($('inviteSubjectInput')) $('inviteSubjectInput').value = subject;
  if ($('inviteBodyTextarea')) $('inviteBodyTextarea').value = textBody;
  if ($('inviteDispatchStatusBadge')) {
    $('inviteDispatchStatusBadge').style.display = autoDispatched ? 'inline-flex' : 'none';
  }
  if ($('inviteCopySuccessNote')) $('inviteCopySuccessNote').style.display = 'none';
  modal.style.display = 'flex';
}

if ($('accessSearchInput')) {
  $('accessSearchInput').addEventListener('input', (e) => {
    renderAccessTable(state.allowedUsers, e.target.value);
  });
}

if ($('accessGrantForm')) {
  $('accessGrantForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = $('newAccessEmail');
    const nameInput = $('newAccessName');
    const instInput = $('newAccessInstitution');
    const submitBtn = $('btnGrantAccess');
    const statusEl = $('accessGrantStatus');

    const rawEmail = (emailInput && emailInput.value || '').trim().toLowerCase();
    const name = (nameInput && nameInput.value || '').trim();
    const institution = (instInput && instInput.value || '').trim();

    if (!rawEmail || !rawEmail.includes('@')) {
      toast('Please enter a valid Google Email ID.', 'error');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>⏳</span> GRANTING ACCESS & SENDING INVITATION...';
    }
    if (statusEl) statusEl.style.display = 'none';

    try {
      await svc.grantUserAccess(rawEmail, {
        name,
        institution,
        grantedBy: (state.user && state.user.email) || 'Co-Founder',
      });
      if (emailInput) emailInput.value = '';
      if (nameInput) nameInput.value = '';
      if (instInput) instInput.value = '';
      if (statusEl) {
        statusEl.style.display = 'inline-flex';
        statusEl.className = 'access-grant-status success-banner';
        statusEl.innerHTML = `✓ <strong>Access Granted:</strong> Automated welcome email sent from <code>support@mycareercompany.com</code> to <strong>${escapeHtml(rawEmail)}</strong>.`;
      }
      await loadAccessView();
      openAccessInviteModal(rawEmail, name, institution, true);
    } catch (err) {
      console.error('[GetReferred] grantUserAccess failed', err);
      toast('Could not grant access: ' + svc.friendlyError(err), 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="btn-icon">✉️</span> GRANT ACCESS &amp; SEND INVITATION';
      }
    }
  });
}

if ($('modalCloseAccessInviteBtn')) {
  $('modalCloseAccessInviteBtn').addEventListener('click', () => {
    if ($('accessInviteModal')) $('accessInviteModal').style.display = 'none';
  });
}
if ($('accessInviteModal')) {
  $('accessInviteModal').addEventListener('click', (e) => {
    if (e.target === $('accessInviteModal')) $('accessInviteModal').style.display = 'none';
  });
}
if ($('modalResendInviteAutomatedBtn')) {
  $('modalResendInviteAutomatedBtn').addEventListener('click', async () => {
    const ctx = state.activeInviteContext;
    if (!ctx || !ctx.email) return;
    const btn = $('modalResendInviteAutomatedBtn');
    btn.disabled = true;
    btn.textContent = 'Sending Automated Email…';
    try {
      await svc.sendInvitationEmail(ctx.email, {
        name: ctx.name,
        institution: ctx.institution,
        grantedBy: (state.user && state.user.email) || 'Co-Founder',
      });
      if ($('inviteDispatchStatusBadge')) $('inviteDispatchStatusBadge').style.display = 'inline-flex';
      toast(`Automated welcome email sent to ${ctx.email}`);
    } catch (err) {
      toast('Could not resend email: ' + svc.friendlyError(err), 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '🔄 Resend Automated Email Now';
    }
  });
}
if ($('modalCopyInviteEmailBtn')) {
  $('modalCopyInviteEmailBtn').addEventListener('click', async () => {
    const subj = ($('inviteSubjectInput') && $('inviteSubjectInput').value) || '';
    const body = ($('inviteBodyTextarea') && $('inviteBodyTextarea').value) || '';
    await navigator.clipboard.writeText(`Subject: ${subj}\n\n${body}`);
    if ($('inviteCopySuccessNote')) $('inviteCopySuccessNote').style.display = 'inline';
    toast('Invitation message copied');
  });
}
if ($('modalCopyPortalLinkBtn')) {
  $('modalCopyPortalLinkBtn').addEventListener('click', async () => {
    await navigator.clipboard.writeText('https://www.mycareercompany.com/getreferred');
    toast('Portal link copied');
  });
}
if ($('modalCloseNotifyBtn')) {
  $('modalCloseNotifyBtn').addEventListener('click', () => {
    if ($('teamNotifyModal')) $('teamNotifyModal').style.display = 'none';
  });
}
if ($('teamNotifyModal')) {
  $('teamNotifyModal').addEventListener('click', (e) => {
    if (e.target === $('teamNotifyModal')) $('teamNotifyModal').style.display = 'none';
  });
}
if ($('modalCopyEmailBtn')) {
  $('modalCopyEmailBtn').addEventListener('click', async () => {
    const subj = ($('notifySubjectInput') && $('notifySubjectInput').value) || '';
    const body = ($('notifyBodyTextarea') && $('notifyBodyTextarea').value) || '';
    await navigator.clipboard.writeText(`Subject: ${subj}\n\n${body}`);
    if ($('notifyCopySuccessNote')) $('notifyCopySuccessNote').style.display = 'inline';
    toast('Team notification copied');
  });
}

/* ===================== companies ===================== */

function renderGetReferredMarquee(companiesList) {
  const container = $('getReferredMarqueeContainer');
  if (!container) return;
  const listToRender = Array.isArray(companiesList) && companiesList.length > 0
    ? companiesList
    : REFERRAL_DEFAULT_COMPANIES;
  renderTripleMarquee(container, listToRender);
}

async function initCompanies() {
  const sel = $('company-select');
  renderGetReferredMarquee(REFERRAL_DEFAULT_COMPANIES);
  if (!svc.configured) {
    sel.innerHTML = '<option value="">Company list unavailable</option>';
    return;
  }
  try {
    const { companies } = await svc.loadCompanies();
    state.companies = companies;
    if (companies && companies.length > 0) {
      renderGetReferredMarquee(companies);
      if ($('heroCompanyCount')) {
        $('heroCompanyCount').textContent = String(companies.length);
      }
    } else if ($('heroCompanyCount')) {
      $('heroCompanyCount').textContent = String(REFERRAL_DEFAULT_COMPANIES.length);
    }
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

window.refreshGetReferredCompanies = initCompanies;

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
    ? `✓ We have ${n} verified referral contact${n === 1 ? '' : 's'} at ${c.name}.`
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
  const slipLogo = $('slip-company-logo'); // v4: company logo beside the name
  if (slipLogo) {
    if (state.company) {
      slipLogo.onerror = () => { slipLogo.onerror = null; slipLogo.src = makeMonogramDataUri(state.company.name); };
      slipLogo.src = resolveCompanyLogo(state.company.name, state.company.portalUrl || '') || makeMonogramDataUri(state.company.name);
      slipLogo.alt = state.company.name + ' logo';
      slipLogo.hidden = false;
    } else {
      slipLogo.hidden = true;
      slipLogo.removeAttribute('src');
    }
  }
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
    await svc.submitRequest(requestId, data, { resume, 'cover-letter': cover }, ext.submitExtras(requestId, data));
    setProgress(1, 'Done');
    showSuccess(requestId, state.company, data.jobId);
    ext.afterSubmit(requestId, data); // v3: "we have received your request" email
  } catch (err) {
    console.error('[GetReferred] submit failed', err);
    $('err-submit').textContent = `We couldn't send your request. ${svc.friendlyError(err)} If it keeps failing, email support@mycareercompany.com.`;
  } finally {
    state.submitting = false;
    btn.disabled = false;
    btn.innerHTML = 'Send Referral Request &rarr;';
    setTimeout(() => { $('upload-progress').hidden = true; }, 600);
  }
});

function showSuccess(requestId, company, jobId) {
  if ($('referralInputPanel')) $('referralInputPanel').hidden = true;
  if ($('referralMarqueeSection')) $('referralMarqueeSection').hidden = true;
  $('request-layout').hidden = true;
  const hero = document.querySelector('#view-user .hero');
  if (hero) hero.hidden = true;
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
  const hero = document.querySelector('#view-user .hero');
  if (hero) hero.hidden = false;
  if ($('referralInputPanel')) $('referralInputPanel').hidden = false;
  if ($('referralMarqueeSection')) $('referralMarqueeSection').hidden = false;
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

if ($('year')) $('year').textContent = String(new Date().getFullYear());
if (!svc.configured) {
  const b = $('config-banner');
  b.hidden = false;
  b.textContent = 'Setup needed: paste the Firebase project config into get-referred/firebase-config.js.';
}
ext.initExt({ svc, showTab, signIn: handleGoogleSignIn }); // v3
showTab(ext.tabFromHash(location.hash));
updateSteps();
renderSlip();
initCompanies();
console.info('[GetReferred] loaded', CORE_VERSION);
