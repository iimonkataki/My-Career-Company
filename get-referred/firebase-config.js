/* My Career Company · Get Referred portal · configuration (v2.0)
 *
 * 1) firebaseConfig: copy the SAME values the live Resume Fit Score uses
 *    (search the repo for "apiKey" inside career-clinic-resume-checker/). Project: my-career-company.
 *    These web keys are public by design; security comes from the Firestore rules.
 * 2) MAILER_URL: the web app URL of the "MCC Referral Mailer" Apps Script
 *    (looks like https://script.google.com/macros/s/AKfy.../exec). See docs/GETREFERRED_SETUP.md, Part B.
 * 3) ADMIN_EMAILS: the only accounts that see the Admin tab. If you change this list, change it in
 *    the Firestore rules AND in apps-script/ReferralMailer.gs too. The automated test checks they match.
 */

export const firebaseConfig = {
  apiKey: 'AIzaSyC6DQ6wzXjRywCMhTBUXTiuIsRF-QWpLIg',
  authDomain: 'my-career-company.firebaseapp.com',
  projectId: 'my-career-company',
  storageBucket: 'my-career-company.firebasestorage.app',
  messagingSenderId: '496139507516',
  appId: '1:496139507516:web:ca32dda9e9822c1c45f039',
};

export const MAILER_URL = 'https://script.google.com/macros/s/AKfycbwHpyr1tUddSifJdxod3N-rAyvJyLAqPJqKne9xwY_B4yLifz7Er15ddXbqqD87gUEv5g/exec';

export const ADMIN_EMAILS = [
  'anirbanroy@mycareercompany.com',
  'ibonkataki@mycareercompany.com',
  'iimonkataki@mycareercompany.com',
  'upam.patra@gmail.com',
];

/* Names used in the email sign-off. Edit freely. */
export const ADMIN_NAMES = {
  'anirbanroy@mycareercompany.com': 'Anirban Roy',
  'ibonkataki@mycareercompany.com': 'Ibon Tarun Kataki',
  'iimonkataki@mycareercompany.com': 'Iimon Tarun Kataki',
  'upam.patra@gmail.com': 'Upam Patra',
};

export const SUPPORT_EMAIL = 'support@mycareercompany.com';
