/**
 * One-time Email Dispatcher to Permitted Evaluator IDs
 * 
 * Target IDs:
 *   - upam.patra@gmail.com
 *   - iimonkataki@mycareercompany.com
 *   - anirbanroy@mycareercompany.com
 *   - ibonkataki@mycareercompany.com
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const RECIPIENTS = [
  "upam.patra@gmail.com",
  "iimonkataki@mycareercompany.com",
  "anirbanroy@mycareercompany.com",
  "ibonkataki@mycareercompany.com"
];

const SUBJECT = "[Career Clinic] Resume Fit Score™ Repository & Database Access Activated";

const BODY_TEXT = `Dear Team,

The centralized institutional repository for Career Clinic's Resume Fit Score™ Diagnostic Engine is now linked to Google Firebase and active.

What has been configured:
• All uploaded candidate resumes (PDF, DOCX, text) are now archived with time saved and file metadata.
• All target Job Descriptions (custom uploads, pasted text, and curated B-School benchmarks) are logged.
• Complete 8-dimension diagnostic reports, fit scores (0-100), quantified bullet analysis, action verb ratios, and ATS compliance checks are stored with tags.
• Full evaluator tracking: Every evaluation is logged under the reviewer's authenticated Google ID.

NOTE: Going forward, you will NOT receive recurring email alerts whenever a candidate or someone uses the resume checker. You can simply use the links below whenever you wish to review, search, or export candidate entries and reports.

Where to Check All Entries & Database Going Forward:
1. In the Web Portal (Assessment Repository):
https://www.mycareercompany.com/ResumeFitScore
(Sign in with your permitted Google ID and click the 'Assessment Repository' tab in the top navigation bar to search, filter by role/score, view full reports, download resumes, and export to CSV).

2. In Google Firebase Console (Database & Files):
• Firestore Database: https://console.firebase.google.com/project/my-career-company/firestore/databases/-default-/data/~2Fresume_assessments
• Storage Files: https://console.firebase.google.com/project/my-career-company/storage/my-career-company.firebasestorage.app/files

Permitted Access Accounts:
- upam.patra@gmail.com
- iimonkataki@mycareercompany.com
- anirbanroy@mycareercompany.com
- ibonkataki@mycareercompany.com

Best regards,
Career Clinic Institutional Team
My Career Company
www.mycareercompany.com
`;

// Build mailto URI
const toStr = RECIPIENTS.join(',');
const mailtoUri = `mailto:${toStr}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY_TEXT)}`;

// Save updated EML
const emlContent = [
  `To: ${RECIPIENTS.join(', ')}`,
  `Subject: ${SUBJECT}`,
  `MIME-Version: 1.0`,
  `Content-Type: text/plain; charset=UTF-8`,
  ``,
  BODY_TEXT
].join('\r\n');

fs.writeFileSync(path.join(__dirname, 'notification_email_message.eml'), emlContent, 'utf8');

console.log("===============================================================");
console.log("  ONE-TIME EMAIL NOTIFICATION TO PERMITTED REVIEWERS");
console.log("===============================================================\n");
console.log("Recipients:");
RECIPIENTS.forEach(r => console.log(`  • ${r}`));
console.log("\nSubject:");
console.log(`  ${SUBJECT}`);
console.log("\nGenerated EML Message File:");
console.log(`  ${path.join(__dirname, 'notification_email_message.eml')}`);

// Launch system mail client
exec(`start "" "${mailtoUri}"`, (err) => {
  if (err) {
    console.log("\nMail client launch note:", err.message);
  } else {
    console.log("\n✓ System email client launched with pre-addressed recipients, subject & body.");
  }
  console.log("\n===============================================================");
  console.log("  NO recurring emails will be sent on future resume checks.");
  console.log("  Permitted IDs can access all entries anytime via the portal link.");
  console.log("===============================================================\n");
});
