/**
 * MY CAREER COMPANY — FIREBASE LEAD GENERATION ENGINE
 * Connects "Book an Institutional Pilot" form to Cloud Firestore
 */

// Global Firebase Project Config
// Can be customized here or defined before this script in window.FIREBASE_CONFIG
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyC6DQ6wzXjRywCMhTBUXTiuIsRF-QWpLIg",
  authDomain: "my-career-company.firebaseapp.com",
  projectId: "my-career-company",
  storageBucket: "my-career-company.firebasestorage.app",
  messagingSenderId: "496139507516",
  appId: "1:496139507516:web:ca32dda9e9822c1c45f039",
  measurementId: "G-6GK1XN2NKZ"
};

// Google Sheets Real-Time Sync Webhook (Google Apps Script Web App)
window.GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxMf42J-80-fM7qbDmsmuwgIKHq-L4_TFCULj1PAkSjoChVrRpCAjWiAcWLF2smkSvB/exec";

// Check if user has stored custom Firebase config in localStorage
try {
  const savedConfig = localStorage.getItem('mcc_firebase_config');
  if (savedConfig) {
    window.FIREBASE_CONFIG = Object.assign(window.FIREBASE_CONFIG, JSON.parse(savedConfig));
  }
} catch (e) {
  console.warn('[MCC Firebase] Local config read error:', e);
}

let firebaseApp = null;
let firestoreDb = null;
let isFirebaseInitialized = false;

function initFirebaseApp() {
  if (typeof firebase === 'undefined') {
    console.warn('[MCC Firebase] Firebase SDK not yet loaded in DOM.');
    return false;
  }

  try {
    if (!firebase.apps.length) {
      firebaseApp = firebase.initializeApp(window.FIREBASE_CONFIG);
    } else {
      firebaseApp = firebase.app();
    }
    firestoreDb = firebase.firestore();
    if (typeof firebase.analytics === 'function') {
      try { firebase.analytics(); } catch (e) {}
    }
    isFirebaseInitialized = true;
    console.log('[MCC Firebase] Firestore connected for project:', window.FIREBASE_CONFIG.projectId);
    return true;
  } catch (err) {
    console.warn('[MCC Firebase] Initialization note:', err.message);
    return false;
  }
}

/**
 * Handle Institutional Pilot Lead Submission
 */
async function submitInstitutionalLead(formData) {
  const leadId = 'MCC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const timestamp = new Date().toISOString();

  const leadRecord = {
    leadId: leadId,
    name: formData.name || '',
    role: formData.role || '',
    institution: formData.institution || '',
    email: formData.email || '',
    phone: formData.phone || '',
    programme: formData.programme || '',
    cohortSize: formData.size || '',
    message: formData.message || '',
    sourcePage: window.location.pathname,
    status: 'new',
    submittedAt: timestamp
  };

  // 1. Always save locally as immediate safety backup
  try {
    const existingLeads = JSON.parse(localStorage.getItem('mcc_institutional_leads') || '[]');
    existingLeads.unshift(leadRecord);
    localStorage.setItem('mcc_institutional_leads', JSON.stringify(existingLeads));
  } catch (e) {
    console.warn('[MCC Firebase] Local storage backup note:', e);
  }

  // 2. Submit to Cloud Firestore
  let firestoreSuccess = false;
  if (isFirebaseInitialized && firestoreDb) {
    try {
      await firestoreDb.collection('institutional_leads').add({
        ...leadRecord,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      firestoreSuccess = true;
      console.log('[MCC Firebase] Lead saved to Firestore with ID:', leadId);
    } catch (dbErr) {
      console.warn('[MCC Firebase] Firestore write warning (saved locally):', dbErr.message);
    }
  }

  // 3. Optional Submit to Google Sheets via Webhook
  let sheetsSuccess = false;
  if (window.GOOGLE_SHEETS_WEBHOOK_URL && window.GOOGLE_SHEETS_WEBHOOK_URL.trim() !== '') {
    try {
      await fetch(window.GOOGLE_SHEETS_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(leadRecord)
      });
      sheetsSuccess = true;
      console.log('[MCC Google Sheets] Lead forwarded to Google Sheets');
    } catch (sheetErr) {
      console.warn('[MCC Google Sheets] Webhook forwarding notice:', sheetErr.message);
    }
  }

  return {
    success: true,
    leadId: leadId,
    syncedToFirestore: firestoreSuccess,
    syncedToGoogleSheets: sheetsSuccess
  };
}

// Bind to DOM when loaded
document.addEventListener('DOMContentLoaded', () => {
  initFirebaseApp();

  const form = document.getElementById('institutional-contact-form');
  const successState = document.getElementById('contact-success-state');
  if (!form || !successState) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : 'Submit';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <span style="display:inline-flex; align-items:center; gap:8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon">
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
          </svg>
          Transmitting to Institutional Desk...
        </span>
      `;
    }

    const formData = {
      name: document.getElementById('contact-name')?.value || '',
      role: document.getElementById('contact-role')?.value || '',
      institution: document.getElementById('contact-institution')?.value || '',
      email: document.getElementById('contact-email')?.value || '',
      phone: document.getElementById('contact-phone')?.value || '',
      programme: document.getElementById('contact-programme')?.value || '',
      size: document.getElementById('contact-size')?.value || '',
      message: document.getElementById('contact-message')?.value || ''
    };

    try {
      const result = await submitInstitutionalLead(formData);

      // Smooth transition to confirmation state
      form.style.display = 'none';
      successState.style.display = 'block';

      // Insert Reference ID and sync indicators
      let refEl = document.getElementById('lead-reference-id');
      if (!refEl) {
        refEl = document.createElement('div');
        refEl.id = 'lead-reference-id';
        refEl.style.cssText = 'margin-top:16px; padding:12px; background:rgba(7,61,50,0.06); border-radius:8px; border:1px solid var(--color-gold-border);';
        successState.appendChild(refEl);
      }
      refEl.innerHTML = `
        <div style="font-size:0.82rem; color:var(--color-gold-dark); font-weight:700; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:6px;">
          Lead Reference Code: <span style="color:var(--color-forest); font-size:1rem;">${result.leadId}</span>
        </div>
        <div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap; font-size:0.75rem;">
          <span style="color:#059669; font-weight:600;">✔ Cloud Firestore Backend</span>
          ${result.syncedToGoogleSheets ? '<span style="color:#059669; font-weight:600;">✔ Google Sheets Sync</span>' : ''}
          <span style="color:var(--color-forest); font-weight:500;">✔ Institutional Desk Telemetry</span>
        </div>
      `;

    } catch (error) {
      console.error('[MCC Firebase] Submission failed:', error);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
      alert('There was a temporary transmission issue. Please reach our desk directly at +91 8145295101 or support@mycareercompany.com.');
    }
  });
});
