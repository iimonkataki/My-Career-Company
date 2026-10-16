/**
 * Career Clinic — Firebase Access Guard
 * Enforces strict email whitelist authentication for www.mycareercompany.com/ResumeFitScore
 * Optimized for cross-device persistence (Desktop, iOS Safari, Android, iPadOS)
 */

(function () {
  'use strict';

  // 1. Permitted Administrator Emails (Strict Whitelist)
  const PERMITTED_EMAILS = [
    "upam.patra@gmail.com",
    "iimonkataki@mycareercompany.com",
    "ibonkataki@mycareercompany.com",
    "anirbanroy@mycareercompany.com"
  ].map(e => e.toLowerCase().trim());

  // 2. Dynamic Same-Origin authDomain
  // Using window.location.hostname on mycareercompany.com eliminates cross-site storage
  // partitioning (ITP) issues on iPhone/Safari/mobile Chrome so login journeys always complete!
  const currentHost = (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname : '';
  const isCustomDomain = currentHost.includes('mycareercompany.com');
  const authDomain = isCustomDomain ? currentHost : "my-career-company.firebaseapp.com";

  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyC6DQ6wzXjRywCMhTBUXTiuIsRF-QWpLIg",
    authDomain: authDomain,
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
      // Enforce persistent session in localStorage across reloads, restarts, and tabs
      auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(err => {
        console.warn("[AuthGuard] Persistence setup note:", err);
      });
    } catch (err) {
      console.error("[AuthGuard] Firebase initialization error:", err);
    }
  }

  function isEmailPermitted(email) {
    if (!email) return false;
    return PERMITTED_EMAILS.includes(email.toLowerCase().trim());
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
   * Universal Cross-Device Google Sign-In
   * Attempts instant popup first; seamlessly falls back to same-origin redirect
   * if popups are blocked by mobile browser privacy settings.
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
        els.gateLoadingText.textContent = 'Connecting to Google Sign-In...';
      }
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      // 1. Try popup first (fastest, keeps user on the page across desktop & modern mobile)
      const result = await auth.signInWithPopup(provider);
      if (result && result.user) {
        handleAuthStateChanged(result.user);
        return;
      }
    } catch (popupErr) {
      console.warn("[AuthGuard] Popup sign-in note:", popupErr.code, popupErr.message);

      // If user voluntarily closed the popup, return to login state gracefully
      if (popupErr.code === 'auth/popup-closed-by-user') {
        showLockedState();
        return;
      }

      // 2. If popup was blocked or unsupported, seamlessly fall back to full redirect
      if (els.gateLoadingText) {
        els.gateLoadingText.textContent = 'Redirecting to Google Sign-In...';
      }

      try {
        await auth.signInWithRedirect(provider);
      } catch (redirectErr) {
        console.error("[AuthGuard] Redirect error:", redirectErr);
        if (redirectErr.code === 'auth/unauthorized-domain') {
          alert("Domain Authorization Required: Please verify that " + window.location.hostname + " is listed in Firebase Console > Authentication > Settings > Authorized Domains.");
        } else {
          alert("Google sign-in could not be completed: " + (redirectErr.message || popupErr.message));
        }
        showLockedState();
      }
    }
  }

  /**
   * Sign Out
   */
  async function signOut() {
    if (auth) {
      await auth.signOut();
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

    if (isEmailPermitted(email)) {
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
    if (els.headerUserWidget) els.headerUserWidget.innerHTML = '';
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
  }

  function showAuthorizedState(user) {
    const els = getElements();

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

    // 4. Update Header with Authorized Administrator Badge
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

      els.headerUserWidget.innerHTML = `
        <div class="auth-admin-pill" id="authAdminPill">
          <div class="auth-admin-avatar">${avatarHtml}</div>
          <div class="auth-admin-info">
            <span class="auth-admin-name">${escapeHtml(user.displayName || 'Administrator')}</span>
            <span class="auth-admin-tag">🛡️ Authorized Admin</span>
          </div>
          <button type="button" class="btn-admin-signout" id="adminSignOutBtn" title="Sign Out">Sign Out</button>
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
      // Handle redirect result when landing back from Google sign-in
      auth.getRedirectResult().then((result) => {
        if (result && result.user) {
          handleAuthStateChanged(result.user);
        }
      }).catch((error) => {
        console.warn("[AuthGuard] Redirect result note:", error);
        if (error.code === 'auth/unauthorized-domain') {
          alert("Domain Authorization Required: Please add " + window.location.hostname + " in Firebase Console > Authentication > Settings > Authorized Domains.");
        }
      });

      // Observe session state (triggers on cached session from localStorage or upon sign-in)
      auth.onAuthStateChanged(handleAuthStateChanged);
    }
  }

  // Export globally
  window.AuthGuard = {
    isAuthorized: () => isAuthorized,
    getCurrentUser: () => currentUser,
    signInWithGoogle: signInWithGoogle,
    signOut: signOut,
    permittedEmails: PERMITTED_EMAILS
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
