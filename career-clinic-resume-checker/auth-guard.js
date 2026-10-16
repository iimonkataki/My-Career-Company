/**
 * Career Clinic — Firebase Access Guard
 * Enforces strict email whitelist authentication for www.mycareercompany.com/ResumeFitScore
 * Features full Google Account Chooser popup with multi-account selection and "Add another account" support
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

    // 4. Update Header with Authorized Administrator Badge & Sign Out button
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
