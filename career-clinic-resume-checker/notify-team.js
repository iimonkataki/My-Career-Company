/**
 * Career Clinic — Evaluator Team Notification Script
 * Notifies the 4 permitted evaluators about the Firebase Repository Storage
 * and provides direct access links to the portal.
 * 
 * Usage:
 *   node notify-team.js
 */

const fs = require('fs');
const path = require('path');

const RECIPIENTS = [
  "upam.patra@gmail.com",
  "iimonkataki@mycareercompany.com",
  "anirbanroy@mycareercompany.com",
  "ibonkataki@mycareercompany.com"
];

const PORTAL_URL = "https://www.mycareercompany.com/ResumeFitScore";
const LOCAL_TEST_URL = "http://localhost:3000/ResumeFitScore";

const SUBJECT = "[Career Clinic] Resume Fit Score™ Repository & Storage Portal Access Activated";

const PLAIN_TEXT_BODY = `Dear Team,

The centralized institutional repository for Career Clinic's Resume Fit Score™ Diagnostic Engine is now linked to Google Firebase and active.

What has been configured:
• All uploaded candidate resumes (PDF, DOCX, text) are now archived with time saved and file metadata.
• All target Job Descriptions (custom uploads, pasted text, and curated B-School benchmarks) are logged.
• Complete 8-dimension diagnostic reports, fit scores (0-100), quantified bullet analysis, action verb ratios, and ATS compliance checks are stored with tags.
• Full evaluator tracking: Every evaluation is logged under the reviewer's authenticated Google ID.

Authorized Evaluator Access:
The following accounts have been granted administrative and evaluator access to the diagnostic engine and archive repository:
- upam.patra@gmail.com
- iimonkataki@mycareercompany.com
- anirbanroy@mycareercompany.com
- ibonkataki@mycareercompany.com

Portal Access Link:
${PORTAL_URL}

How to Access:
1. Open the portal link above.
2. Sign in with your authorized Google Account.
3. Switch between the "Diagnostic Engine" to run evaluations and the "Assessment Repository" to search, filter, view, and export past candidate evaluations.

Best regards,
Career Clinic Institutional Team
My Career Company
www.mycareercompany.com
`;

const HTML_BODY = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${SUBJECT}</title>
  <style>
    body {
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #05261F;
      color: #F8F6EF;
      margin: 0;
      padding: 30px 15px;
    }
    .email-container {
      max-width: 650px;
      margin: 0 auto;
      background: #073D32;
      border: 1px solid rgba(212, 175, 124, 0.35);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 16px 40px rgba(0,0,0,0.5);
    }
    .email-header {
      background: #05261F;
      padding: 24px 30px;
      border-bottom: 2px solid #D4AF7C;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand-title {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 1px;
      color: #D4AF7C;
    }
    .brand-subtitle {
      font-size: 12px;
      color: #95A199;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-pill {
      background: rgba(212, 175, 124, 0.15);
      border: 1px solid rgba(212, 175, 124, 0.4);
      color: #D4AF7C;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
    }
    .email-body {
      padding: 30px;
      line-height: 1.7;
      color: #D2D5CA;
    }
    .email-greeting {
      font-size: 16px;
      font-weight: 600;
      color: #F8F6EF;
      margin-bottom: 16px;
    }
    .highlight-card {
      background: #0A493D;
      border: 1px solid rgba(212, 175, 124, 0.2);
      border-left: 4px solid #D4AF7C;
      padding: 16px 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .highlight-title {
      color: #D4AF7C;
      font-weight: 700;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .feature-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .feature-list li {
      padding: 6px 0;
      position: relative;
      padding-left: 24px;
      font-size: 13.5px;
    }
    .feature-list li::before {
      content: "✓";
      color: #D4AF7C;
      position: absolute;
      left: 0;
      font-weight: bold;
    }
    .accounts-box {
      background: #09372D;
      border-radius: 8px;
      padding: 14px 18px;
      margin: 18px 0;
      border: 1px solid rgba(212, 175, 124, 0.15);
    }
    .account-pill {
      display: inline-block;
      background: rgba(212, 175, 124, 0.12);
      border: 1px solid rgba(212, 175, 124, 0.3);
      color: #F8F6EF;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      margin: 4px 4px 4px 0;
      font-family: monospace;
    }
    .cta-container {
      text-align: center;
      margin: 30px 0 20px;
    }
    .btn-cta {
      display: inline-block;
      background: linear-gradient(135deg, #D4AF7C 0%, #B88E56 100%);
      color: #05261F !important;
      font-weight: 700;
      font-size: 15px;
      padding: 14px 32px;
      border-radius: 8px;
      text-decoration: none;
      box-shadow: 0 4px 16px rgba(212, 175, 124, 0.35);
      letter-spacing: 0.3px;
    }
    .email-footer {
      background: #05261F;
      padding: 20px 30px;
      border-top: 1px solid rgba(212, 175, 124, 0.15);
      text-align: center;
      font-size: 11.5px;
      color: #95A199;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div>
        <div class="brand-title">MY CAREER COMPANY</div>
        <div class="brand-subtitle">Career Clinic &bull; Resume Fit Score™ Engine</div>
      </div>
      <div class="badge-pill">REPOSITORY ACTIVE</div>
    </div>

    <div class="email-body">
      <div class="email-greeting">Dear Evaluator,</div>
      <p>
        The centralized institutional repository for <strong>Career Clinic's Resume Fit Score™</strong> portal is now linked to <strong>Google Firebase</strong> and fully active.
      </p>

      <div class="highlight-card">
        <div class="highlight-title">📌 What is automatically stored &amp; tracked:</div>
        <ul class="feature-list">
          <li><strong>All Uploaded Resumes:</strong> Original PDF/DOCX files and extracted text stored securely in Firebase.</li>
          <li><strong>All Target Job Descriptions:</strong> Uploaded JD files, pasted text, and institutional benchmark roles.</li>
          <li><strong>Full Calibrated Diagnostic Reports:</strong> Total scores (0-100), 8-dimension breakdown, quantified metric ratios, power verbs, and ATS compliance.</li>
          <li><strong>Structured Tagging &amp; Timestamps:</strong> Tagged by Domain, Score Band, File Format, and Evaluator Email.</li>
          <li><strong>User Attribution:</strong> Every test is linked with the exact reviewer's email and timestamp.</li>
        </ul>
      </div>

      <div class="accounts-box">
        <strong style="color: #D4AF7C; font-size: 13px;">👥 Authorized Evaluator Accounts:</strong><br>
        ${RECIPIENTS.map(e => `<span class="account-pill">${e}</span>`).join(' ')}
      </div>

      <div class="cta-container">
        <a href="${PORTAL_URL}" class="btn-cta" target="_blank">Access Resume Fit Score™ Portal &rarr;</a>
      </div>

      <p style="font-size: 12.5px; color: #95A199; text-align: center;">
        Direct link: <a href="${PORTAL_URL}" style="color: #D4AF7C;">${PORTAL_URL}</a>
      </p>
    </div>

    <div class="email-footer">
      &copy; 2026 My Career Company. Career Clinic &bull; Resume Fit Score™ Diagnostic Engine.<br>
      This notification was sent to authorized evaluators of My Career Company.
    </div>
  </div>
</body>
</html>`;

function main() {
  console.log("=================================================================");
  console.log("  CAREER CLINIC — RESUME FIT SCORE™ REPOSITORY NOTIFICATION");
  console.log("=================================================================\n");

  console.log(`[1/3] Target Recipients:`);
  RECIPIENTS.forEach(r => console.log(`      • ${r}`));

  console.log(`\n[2/3] Generating Email Preview Artifacts...`);
  const previewHtmlPath = path.join(__dirname, 'notification_email_preview.html');
  fs.writeFileSync(previewHtmlPath, HTML_BODY, 'utf8');
  console.log(`      ✓ Saved HTML Email preview to: ${previewHtmlPath}`);

  // Also save an EML format email file that can be opened in Outlook / Apple Mail / Thunderbird
  const emlContent = [
    `To: ${RECIPIENTS.join(', ')}`,
    `Subject: ${SUBJECT}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    HTML_BODY
  ].join('\r\n');

  const previewEmlPath = path.join(__dirname, 'notification_email_message.eml');
  fs.writeFileSync(previewEmlPath, emlContent, 'utf8');
  console.log(`      ✓ Saved EML message to: ${previewEmlPath}`);

  console.log(`\n[3/3] Direct Mailto Dispatch URL:`);
  const mailtoUrl = `mailto:${encodeURIComponent(RECIPIENTS.join(','))}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(PLAIN_TEXT_BODY)}`;
  console.log(`      ${mailtoUrl.substring(0, 120)}...`);

  console.log(`\n=================================================================`);
  console.log(`  SUMMARY:`);
  console.log(`  1. The 4 email IDs are whitelisted in auth-guard.js and firestore.rules.`);
  console.log(`  2. Repository storage service is configured to log all resumes, JDs,`);
  console.log(`     and reports with time saved, user email, and tags.`);
  console.log(`  3. The team can access the portal directly at:`);
  console.log(`     ${PORTAL_URL}`);
  console.log(`=================================================================\n`);
}

main();
