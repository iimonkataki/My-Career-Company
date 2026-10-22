/**
 * Career Clinic — Firebase Access Guard
 * Enforces strict email whitelist authentication for www.mycareercompany.com/ResumeFitScore
 * Features full Google Account Chooser popup with multi-account selection and "Add another account" support
 */

(function () {
  'use strict';

  // 1. Permitted Co-Founders (Exclusive Repository & Database Access)
  const CO_FOUNDER_EMAILS = [
    "upam.patra@gmail.com",
    "iimonkataki@mycareercompany.com",
    "ibonkataki@mycareercompany.com",
    "anirbanroy@mycareercompany.com",
    "anirbanroy@mycareercompanny.com"
  ].map(e => e.toLowerCase().trim());

  // 2. Permitted Evaluators & Candidates for Diagnostic Engine Access
  // Users added here or in Firestore 'allowed_users' collection can sign in & test their Fit Score,
  // but CANNOT see or access the Assessment Repository tab or database.
  let ADDITIONAL_PERMITTED_EMAILS = [];

  // Toggle: set to true to allow any authenticated Google account to test their Fit Score
  let ALLOW_ANY_AUTHENTICATED_FOR_FIT_SCORE = false;

  function isCoFounder(email) {
    if (!email) return false;
    return CO_FOUNDER_EMAILS.includes(email.toLowerCase().trim());
  }

  // 2. Firebase Project Configuration for My Career Company
  // Uses official my-career-company.firebaseapp.com authDomain to match Google OAuth 2.0 registered redirect URIs
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyC6DQ6wzXjRywCMhTBUXTiuIsRF-QWpLIg",
    authDomain: "my-career-company.firebaseapp.com",
    projectId: "my-career-company",
    storageBucket: "my-career-company.firebasestorage.app",
    messagingSenderId: "496139507516",
    appId: "1:496139507516:web:ca32dda9e9822c1c45f039",
    measurementId: "G-6GK1XN2NKZ"
  };

  let currentUser = null;
  let isAuthorized = false;

  // Initialize Firebase App & Local Persistence
  let auth = null;
  if (typeof firebase !== 'undefined') {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }
      auth = firebase.auth();
      // Ensure persistent login across browser tabs, reloads, and devices
      auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(err => {
        console.warn("[AuthGuard] Persistence setup note:", err);
      });
    } catch (err) {
      console.error("[AuthGuard] Firebase initialization error:", err);
    }
  }

  async function isEmailPermitted(email) {
    if (!email) return false;
    const clean = email.toLowerCase().trim();

    // 1. Co-Founders are always permitted
    if (isCoFounder(clean)) return true;

    // 2. Open Fit Score check if enabled
    if (ALLOW_ANY_AUTHENTICATED_FOR_FIT_SCORE) return true;

    // 3. Statically listed permitted users/candidates
    if (ADDITIONAL_PERMITTED_EMAILS.map(e => e.toLowerCase().trim()).includes(clean)) return true;

    // 4. Dynamically permitted users stored in Firestore 'allowed_users' collection
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
      try {
        const docSnap = await firebase.firestore().collection('allowed_users').doc(clean).get();
        if (docSnap && docSnap.exists) return true;
      } catch (_) {}
    }

    return false;
  }

  /**
   * DOM Elements
   */
  function getElements() {
    return {
      gate: document.getElementById('authGateOverlay'),
      gateLoading: document.getElementById('authGateLoading'),
      gateLoadingText: document.getElementById('authGateLoadingText'),
      gateLoginCard: document.getElementById('authGateLoginCard'),
      gateErrorCard: document.getElementById('authGateErrorCard'),
      deniedEmailText: document.getElementById('authDeniedEmailText'),
      signInBtn: document.getElementById('gateGoogleSignInBtn'),
      tryAgainBtn: document.getElementById('gateTryAgainBtn'),
      appContainer: document.getElementById('mainApp'),
      siteHeader: document.getElementById('siteHeader'),
      headerUserWidget: document.getElementById('headerUserWidget')
    };
  }

  /**
   * Google Sign-In with Full Account Chooser Popup
   * Opens Google's account chooser modal listing all logged-in Google accounts
   * as well as the "+ Add another account" button.
   */
  async function signInWithGoogle() {
    if (!auth) {
      alert("Firebase Authentication service is loading. Please refresh and try again.");
      return;
    }

    const els = getElements();
    if (els.gateErrorCard) els.gateErrorCard.style.display = 'none';
    if (els.gateLoginCard) els.gateLoginCard.style.display = 'none';
    if (els.gateLoading) {
      els.gateLoading.style.display = 'flex';
      if (els.gateLoadingText) {
        els.gateLoadingText.textContent = 'Opening Google Account Chooser...';
      }
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    // Forces Google to render the complete multi-account selector screen with "+ Add another account"
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    try {
      // Opens the Google Account Chooser popup
      const result = await auth.signInWithPopup(provider);
      if (result && result.user) {
        handleAuthStateChanged(result.user);
      }
    } catch (error) {
      console.warn("[AuthGuard] Google sign-in note:", error.code, error.message);

      // If user voluntarily closed the popup, return gracefully to login state
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        showLockedState();
        return;
      }

      // If popup was blocked by browser, seamlessly fallback to redirect
      if (error.code === 'auth/popup-blocked') {
        try {
          if (els.gateLoadingText) {
            els.gateLoadingText.textContent = 'Redirecting to Google Sign-In...';
          }
          await auth.signInWithRedirect(provider);
          return;
        } catch (redirectErr) {
          console.error("[AuthGuard] Redirect error:", redirectErr);
          alert("Google sign-in could not be completed: " + redirectErr.message);
          showLockedState();
          return;
        }
      }

      alert("Google sign-in could not be completed: " + error.message);
      showLockedState();
    }
  }

  /**
   * Sign Out
   */
  async function signOut() {
    try {
      if (auth) {
        await auth.signOut();
      }
    } catch (err) {
      console.warn("[AuthGuard] Sign out error:", err);
    }
    currentUser = null;
    isAuthorized = false;
    showLockedState();
  }

  /**
   * Handle Firebase Auth State Change
   */
  async function handleAuthStateChanged(user) {
    if (!user) {
      currentUser = null;
      isAuthorized = false;
      showLockedState();
      return;
    }

    const email = (user.email || '').toLowerCase().trim();
    const permitted = await isEmailPermitted(email);

    if (permitted) {
      // Access Granted! Unlocks home page diagnostic dashboard
      currentUser = user;
      isAuthorized = true;
      showAuthorizedState(user);
    } else {
      // Access Denied! Unapproved email
      currentUser = null;
      isAuthorized = false;
      if (auth) {
        await auth.signOut();
      }
      showDeniedState(email);
    }
  }

  function showLockedState() {
    const els = getElements();
    if (els.appContainer) {
      els.appContainer.style.display = 'none';
    }
    if (els.siteHeader) els.siteHeader.style.opacity = '0.4';
    if (els.gate) {
      els.gate.style.display = 'flex';
      els.gate.setAttribute('aria-hidden', 'false');
    }
    if (els.gateLoading) els.gateLoading.style.display = 'none';
    if (els.gateLoginCard) els.gateLoginCard.style.display = 'block';
    if (els.gateErrorCard) els.gateErrorCard.style.display = 'none';
    if (els.headerUserWidget) {
      els.headerUserWidget.innerHTML = '';
    }
    const repoTab = document.getElementById('navBtnRepository');
    if (repoTab) repoTab.style.display = 'none';
    const accessTab = document.getElementById('navBtnAccess');
    if (accessTab) accessTab.style.display = 'none';
    const headerNav = document.getElementById('headerNav');
    if (headerNav) headerNav.classList.add('single-tab');
    const viewInRepoBtn = document.getElementById('viewInRepoBtn');
    if (viewInRepoBtn) viewInRepoBtn.style.display = 'none';
    const accessSection = document.getElementById('accessSection');
    if (accessSection) accessSection.style.display = 'none';
  }

  function showDeniedState(rejectedEmail) {
    const els = getElements();
    if (els.appContainer) {
      els.appContainer.style.display = 'none';
    }
    if (els.siteHeader) els.siteHeader.style.opacity = '0.4';
    if (els.gate) {
      els.gate.style.display = 'flex';
      els.gate.setAttribute('aria-hidden', 'false');
    }
    if (els.gateLoading) els.gateLoading.style.display = 'none';
    if (els.gateLoginCard) els.gateLoginCard.style.display = 'none';
    if (els.gateErrorCard) {
      els.gateErrorCard.style.display = 'block';
      if (els.deniedEmailText) {
        els.deniedEmailText.textContent = rejectedEmail || 'Your Google account';
      }
    }
    const repoTab = document.getElementById('navBtnRepository');
    if (repoTab) repoTab.style.display = 'none';
    const accessTab = document.getElementById('navBtnAccess');
    if (accessTab) accessTab.style.display = 'none';
    const headerNav = document.getElementById('headerNav');
    if (headerNav) headerNav.classList.add('single-tab');
    const viewInRepoBtn = document.getElementById('viewInRepoBtn');
    if (viewInRepoBtn) viewInRepoBtn.style.display = 'none';
    const accessSection = document.getElementById('accessSection');
    if (accessSection) accessSection.style.display = 'none';
  }

  function showAuthorizedState(user) {
    const els = getElements();
    const userEmail = (user.email || '').toLowerCase().trim();
    const userIsCoFounder = isCoFounder(userEmail);

    // Exclusively show repository tab and access tab ONLY to the 4 co-founders
    const repoTab = document.getElementById('navBtnRepository');
    const accessTab = document.getElementById('navBtnAccess');
    const headerNav = document.getElementById('headerNav');
    const viewInRepoBtn = document.getElementById('viewInRepoBtn');
    const repoSection = document.getElementById('repositorySection');
    const accessSection = document.getElementById('accessSection');

    if (repoTab) {
      repoTab.style.display = userIsCoFounder ? 'inline-flex' : 'none';
    }
    if (accessTab) {
      accessTab.style.display = userIsCoFounder ? 'inline-flex' : 'none';
    }
    if (headerNav) {
      headerNav.classList.toggle('single-tab', !userIsCoFounder);
    }
    if (viewInRepoBtn) {
      viewInRepoBtn.style.display = userIsCoFounder ? 'inline-flex' : 'none';
    }
    if (!userIsCoFounder) {
      if (repoSection) repoSection.style.display = 'none';
      if (accessSection) accessSection.style.display = 'none';
    }

    // Immediately notify application that auth has succeeded so header counts and sync activate
    try {
      window.dispatchEvent(new CustomEvent('cc-auth-authorized', {
        detail: { user, isCoFounder: userIsCoFounder }
      }));
    } catch (_) {}

    // 1. Completely hide the Auth Gate Overlay
    if (els.gate) {
      els.gate.style.display = 'none';
      els.gate.setAttribute('aria-hidden', 'true');
    }

    // 2. Reveal the main application / diagnostic tool (natural flex layout)
    if (els.appContainer) {
      els.appContainer.style.display = '';
      els.appContainer.style.visibility = 'visible';
    }

    // 3. Restore full header brightness
    if (els.siteHeader) {
      els.siteHeader.style.opacity = '1';
    }

    // 4. Update Header with Role Badge (Co-Founder vs Verified User) & Sign Out button
    if (els.headerUserWidget) {
      const initials = (user.displayName || user.email || 'CC')
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

      const avatarHtml = user.photoURL
        ? `<img src="${user.photoURL}" alt="${user.displayName}" class="auth-admin-avatar-img">`
        : `<span class="auth-admin-avatar-initials">${initials}</span>`;

      const roleBadgeHtml = userIsCoFounder
        ? `<span class="auth-admin-tag cofounder-badge">👑 Co-Founder</span>`
        : `<span class="auth-admin-tag user-tag">👤 Verified User</span>`;

      els.headerUserWidget.innerHTML = `
        <div class="auth-admin-pill" id="authAdminPill">
          <div class="auth-admin-avatar">${avatarHtml}</div>
          <div class="auth-admin-info">
            <span class="auth-admin-name">${escapeHtml(user.displayName || 'Administrator')}</span>
            ${roleBadgeHtml}
          </div>
          <button type="button" class="btn-admin-signout" id="adminSignOutBtn" title="Switch account / Sign Out">Sign Out</button>
        </div>
      `;

      const signoutBtn = document.getElementById('adminSignOutBtn');
      if (signoutBtn) {
        signoutBtn.addEventListener('click', signOut);
      }
    }

    // Ensure page scrolls to top so user is immediately at the home diagnostic hero
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (_) {}
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Allowed Users CRUD methods for Access Tab
   */
  async function fetchAllowedUsers() {
    const list = [];
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
      try {
        const snap = await firebase.firestore().collection('allowed_users').get();
        snap.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() });
        });
      } catch (err) {
        console.warn("[AuthGuard] Fetch allowed_users note:", err);
      }
    }
    // Fallback/cache in localStorage
    try {
      const cached = JSON.parse(localStorage.getItem('CC_ALLOWED_USERS_CACHE') || '[]');
      const map = new Map();
      list.forEach(item => map.set(item.email || item.id, item));
      cached.forEach(item => {
        const k = item.email || item.id;
        if (!map.has(k)) map.set(k, item);
      });
      const merged = Array.from(map.values());
      localStorage.setItem('CC_ALLOWED_USERS_CACHE', JSON.stringify(merged));
      return merged;
    } catch (_) {
      return list;
    }
  }

  function buildInvitationEmail(cleanEmail, metadata = {}) {
    const recipientGreeting = metadata.name && metadata.name.trim() ? metadata.name.trim() : 'Colleague';
    const institutionText = metadata.institution && metadata.institution.trim() && metadata.institution.trim() !== '—'
      ? ` for ${metadata.institution.trim()}`
      : '';
    const subject = `[Career Clinic] Access Granted to Resume Fit Score™ Portal${institutionText}`;
    const portalUrl = 'https://www.mycareercompany.com/ResumeFitScore';

    const plainText = `Dear ${recipientGreeting},

You have been granted official access to the Career Clinic — Resume Fit Score™ Portal by My Career Company.

You can now sign in with this Google account (${cleanEmail}) and access the Diagnostic Engine to evaluate candidate resumes against calibrated recruiter benchmarks across 28 recruitment domains.

Access Link: ${portalUrl}

Key Features Available to You:
• Calibrated evaluation against verified placement benchmarks
• Multi-format CV intake (.PDF, .DOCX, and direct text)
• Cross-domain suitability calibration & bullet rewrites
• Target JD correlation and competitive placement readiness scoring

If you have any questions or require assistance, please reach out to the administrative team at My Career Company.

Best regards,
Career Clinic Institutional Evaluation Team
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
        <div style="font-size:11.5px;color:#95A199;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;">Career Clinic &bull; Resume Fit Score™ Portal</div>
      </div>
    </div>
    <div style="padding:28px;line-height:1.7;color:#D2D5CA;">
      <div style="font-size:16px;font-weight:600;color:#F8F6EF;margin-bottom:14px;">Dear ${escapeHtml(recipientGreeting)},</div>
      <p style="margin:0 0 16px;">
        You have been granted official access to the <strong>Career Clinic — Resume Fit Score™ Portal</strong> by <strong>My Career Company</strong>.
      </p>
      <p style="margin:0 0 16px;">
        You can now sign in with this Google account (<strong style="color:#D4AF7C;">${escapeHtml(cleanEmail)}</strong>) and access the Diagnostic Engine to evaluate candidate resumes against calibrated recruiter benchmarks across 28 recruitment domains.
      </p>
      <div style="background:#0A493D;border:1px solid rgba(212,175,124,0.22);border-left:4px solid #D4AF7C;padding:16px 20px;border-radius:8px;margin:20px 0;">
        <div style="color:#D4AF7C;font-weight:700;font-size:13px;margin-bottom:8px;">📌 Key Features Available to You:</div>
        <ul style="margin:0;padding-left:18px;color:#E0E4DB;font-size:13px;line-height:1.75;">
          <li>Calibrated evaluation against verified placement benchmarks</li>
          <li>Multi-format CV intake (.PDF, .DOCX, and direct text)</li>
          <li>Cross-domain suitability calibration &amp; bullet rewrites</li>
          <li>Target JD correlation and competitive placement readiness scoring</li>
        </ul>
      </div>
      <div style="text-align:center;margin:28px 0 24px;">
        <a href="${portalUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#D4AF7C 0%,#B88E56 100%);color:#05261F !important;font-weight:800;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;box-shadow:0 4px 16px rgba(212,175,124,0.35);letter-spacing:0.3px;">Access Resume Fit Score™ Portal &rarr;</a>
      </div>
      <p style="font-size:12.5px;color:#95A199;text-align:center;margin:0 0 8px;">
        Direct link: <a href="${portalUrl}" style="color:#D4AF7C;" target="_blank">${portalUrl}</a>
      </p>
    </div>
    <div style="background:#05261F;padding:18px 28px;border-top:1px solid rgba(212,175,124,0.15);text-align:center;font-size:11.5px;color:#95A199;line-height:1.5;">
      &copy; 2026 My Career Company. Sent automatically from <strong>support@mycareercompany.com</strong>.<br>
      Career Clinic &bull; Resume Fit Score™ Diagnostic Engine.
    </div>
  </div>
</body>
</html>`;

    return {
      to: [cleanEmail],
      from: 'Career Clinic <support@mycareercompany.com>',
      replyTo: 'support@mycareercompany.com',
      message: {
        subject: subject,
        text: plainText,
        html: html
      },
      metadata: {
        sender: 'support@mycareercompany.com',
        recipientEmail: cleanEmail,
        recipientName: metadata.name || '',
        institution: metadata.institution || '',
        portalUrl: portalUrl,
        dispatchedAt: new Date().toISOString()
      }
    };
  }

  // Google Apps Script Webhook (runs authenticated under support@mycareercompany.com with MailApp.sendEmail authorization)
  const GOOGLE_APPS_SCRIPT_WEBHOOK = "https://script.google.com/macros/s/AKfycbxH9SO8xJ7jym99FZwHL9WkB2j1KDWbzppSrlCzD9UOqAEYxgS-aWiY-DF2dud7sG1k/exec";

  async function sendInvitationEmail(cleanEmail, metadata = {}) {
    const emailPayload = buildInvitationEmail(cleanEmail, metadata);
    const recipient = (cleanEmail || '').toLowerCase().trim();

    // 1. Dispatch over internet via Google Apps Script Webhook (sends native email from support@mycareercompany.com)
    let webhookSuccess = false;
    try {
      if (typeof fetch === 'function') {
        const webhookPayload = {
          action: "sendAccessInvitation",
          type: "access_invitation",
          to: recipient,
          recipientEmail: recipient,
          email: recipient,
          recipientName: metadata.name ? metadata.name.trim() : "",
          name: metadata.name ? metadata.name.trim() : "",
          institution: metadata.institution ? metadata.institution.trim() : "",
          subject: emailPayload.message.subject,
          text: emailPayload.message.text,
          html: emailPayload.message.html,
          portalUrl: emailPayload.metadata.portalUrl || "https://www.mycareercompany.com/ResumeFitScore",
          submittedAt: new Date().toISOString()
        };

        // Note: mode 'no-cors' with 'text/plain;charset=utf-8' ensures cross-origin POST succeeds in all browsers without CORS rejection
        await fetch(GOOGLE_APPS_SCRIPT_WEBHOOK, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify(webhookPayload)
        });
        webhookSuccess = true;
        console.log("[AuthGuard] Official invitation email dispatched via Google Apps Script Webhook to:", recipient);
      }
    } catch (whErr) {
      console.warn("[AuthGuard] Google Apps Script webhook dispatch notice:", whErr);
    }

    // 2. Also forward to local server / proxy endpoint if present
    try {
      if (typeof fetch === 'function') {
        fetch('/api/send-access-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailPayload)
        }).catch(() => {});
      }
    } catch (_) {}

    // 3. Queue in Firestore 'mail' collection (Firebase Trigger Email extension standard)
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
      try {
        await firebase.firestore().collection('mail').add({
          ...emailPayload,
          webhookDispatched: webhookSuccess,
          dispatchedAt: new Date().toISOString()
        });
      } catch (mailErr) {
        console.warn("[AuthGuard] Trigger Email queue note:", mailErr);
      }

      // Also record in allowed_users invitation audit sub-collection
      try {
        await firebase.firestore().collection('allowed_users').doc(recipient)
          .collection('invitations').add({
            ...emailPayload,
            webhookDispatched: webhookSuccess,
            dispatchedAt: new Date().toISOString()
          });
      } catch (_) {}
    }

    return emailPayload;
  }

  async function grantUserAccess(email, metadata = {}) {
    if (!email) throw new Error("A valid email address is required.");
    const clean = email.toLowerCase().trim();
    if (!clean.includes('@') || !clean.includes('.')) {
      throw new Error("Please enter a valid email address format.");
    }

    const payload = {
      email: clean,
      name: metadata.name ? metadata.name.trim() : '',
      role: metadata.role || 'Evaluator / Candidate',
      institution: metadata.institution ? metadata.institution.trim() : '',
      grantedAt: new Date().toISOString(),
      grantedBy: currentUser ? currentUser.email : 'System',
      status: 'active',
      emailDispatched: true,
      emailDispatchedFrom: 'support@mycareercompany.com',
      lastEmailSentAt: new Date().toISOString()
    };

    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
      try {
        await firebase.firestore().collection('allowed_users').doc(clean).set(payload);
      } catch (err) {
        console.warn("[AuthGuard] Write allowed_users note:", err);
      }
    }

    // Automatically send official invitation email from support@mycareercompany.com
    await sendInvitationEmail(clean, metadata);

    // Cache locally
    try {
      const cached = JSON.parse(localStorage.getItem('CC_ALLOWED_USERS_CACHE') || '[]');
      const filtered = cached.filter(u => (u.email || u.id) !== clean);
      filtered.unshift(payload);
      localStorage.setItem('CC_ALLOWED_USERS_CACHE', JSON.stringify(filtered));
    } catch (_) {}

    return payload;
  }

  async function revokeUserAccess(email) {
    if (!email) throw new Error("Email is required.");
    const clean = email.toLowerCase().trim();
    if (isCoFounder(clean)) {
      throw new Error("Cannot revoke access for primary Co-Founder account.");
    }

    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
      try {
        await firebase.firestore().collection('allowed_users').doc(clean).delete();
      } catch (err) {
        console.warn("[AuthGuard] Delete allowed_users note:", err);
      }
    }

    try {
      const cached = JSON.parse(localStorage.getItem('CC_ALLOWED_USERS_CACHE') || '[]');
      const filtered = cached.filter(u => (u.email || u.id) !== clean);
      localStorage.setItem('CC_ALLOWED_USERS_CACHE', JSON.stringify(filtered));
    } catch (_) {}

    return true;
  }

  /**
   * Initialize Auth Listeners on Load
   */
  function init() {
    const els = getElements();

    if (els.signInBtn) {
      els.signInBtn.addEventListener('click', signInWithGoogle);
    }
    if (els.tryAgainBtn) {
      els.tryAgainBtn.addEventListener('click', signInWithGoogle);
    }

    if (auth) {
      // Handle redirect result if arriving back from a redirect flow
      auth.getRedirectResult().then((result) => {
        if (result && result.user) {
          handleAuthStateChanged(result.user);
        }
      }).catch((error) => {
        console.warn("[AuthGuard] Redirect result note:", error);
      });

      // Observe session state (triggers on cached session from localStorage or upon sign-in)
      auth.onAuthStateChanged(handleAuthStateChanged);
    }
  }

  // Export globally
  window.AuthGuard = {
    isAuthorized: () => isAuthorized,
    isCoFounder: () => currentUser ? isCoFounder(currentUser.email) : false,
    getCurrentUser: () => currentUser,
    signInWithGoogle: signInWithGoogle,
    signOut: signOut,
    coFounderEmails: CO_FOUNDER_EMAILS,
    getAdditionalPermittedEmails: () => [...ADDITIONAL_PERMITTED_EMAILS],
    addPermittedEmail: (email) => {
      if (email && !ADDITIONAL_PERMITTED_EMAILS.includes(email.toLowerCase().trim())) {
        ADDITIONAL_PERMITTED_EMAILS.push(email.toLowerCase().trim());
      }
    },
    setAllowAnyAuthenticated: (val) => { ALLOW_ANY_AUTHENTICATED_FOR_FIT_SCORE = Boolean(val); },
    fetchAllowedUsers: fetchAllowedUsers,
    grantUserAccess: grantUserAccess,
    revokeUserAccess: revokeUserAccess,
    sendInvitationEmail: sendInvitationEmail,
    buildInvitationEmail: buildInvitationEmail
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
