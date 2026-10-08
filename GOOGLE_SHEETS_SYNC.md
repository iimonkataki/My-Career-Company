# Google Sheets & Email Notification Engine
### My Career Company — "Book Institutional Pilot" Lead Ingestion

This guide and script configure:
1. **A dedicated Google Spreadsheet** where all submissions from the "Book Institutional Pilot" form are captured in real-time in structured tabular format.
2. **Instant Email Alerts** sent immediately to:
   - `anirbanroy@mycareercompany.com`
   - `ibonkataki@mycareercompany.com`
   - `iimonkataki@mycareercompany.com`
   - `support@mycareercompany.com`
3. **One-Click Firestore Cloud Backup Sync** to pull any historical or mobile-stored records from Cloud Firestore.
4. **Custom Spreadsheet Menu** (`🚀 My Career Company`) with a built-in **"📧 Send Test Email Alert"** button to verify deliverability in seconds.

---

## 3-Minute Setup Instructions

### Step 1: Create Your Dedicated Google Spreadsheet
1. Open [Google Sheets](https://sheets.new) in your browser.
2. Title the spreadsheet: **`My Career Company — Institutional Pilot Leads`**.

### Step 2: Paste the Apps Script Code
1. In your Google Sheet, click **Extensions** → **Apps Script** in the top menu.
2. Delete any boilerplate code inside the editor.
3. Paste the entire script below into `Code.gs`.
4. Click the **Save** icon (diskette) or press `Ctrl + S`.

### Step 3: Deploy as a Web App
1. At the top right of Apps Script, click **Deploy** → **New deployment**.
2. Click the gear icon (⚙️) next to *Select type* and choose **Web app**.
3. Fill in the fields:
   - **Description**: `MCC Pilot Lead Webhook & Email Alerts`
   - **Execute as**: **`Me`** (`iimonkataki@mycareercompany.com` / your Google account)
   - **Who has access**: **`Anyone`** *(critical: allows the website form to submit leads)*
4. Click **Deploy**.
5. Click **Authorize access** and choose your Google account. *(If Google displays "Google hasn't verified this app", click "Advanced" → "Go to Untitled project (unsafe)" → "Allow")*.
6. Copy the **Web App URL** (format: `https://script.google.com/macros/s/.../exec`).

> **Note**: Share your new Web App URL with Antigravity, and it will be updated in `js/firebase-leads.js` and deployed to `www.mycareercompany.com` immediately!

---

## Complete Drop-in Google Apps Script (`Code.gs`)

```javascript
/**
 * ============================================================================
 * MY CAREER COMPANY — INSTITUTIONAL PILOT LEAD & EMAIL ENGINE
 * Captured Fields: Full Name, Role, Institution, Email, Phone, Programme,
 *                  Cohort Size, Placement Objectives, Lead ID, Timestamp
 * Target Recipients: anirbanroy@mycareercompany.com, ibonkataki@mycareercompany.com,
 *                    iimonkataki@mycareercompany.com, support@mycareercompany.com
 * ============================================================================
 */

// NOTIFICATION RECIPIENT LIST
var NOTIFICATION_RECIPIENTS = [
  "anirbanroy@mycareercompany.com",
  "ibonkataki@mycareercompany.com",
  "iimonkataki@mycareercompany.com",
  "support@mycareercompany.com"
].join(",");

// 1. WEBHOOK ENDPOINT: Receives live form submissions from www.mycareercompany.com
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var sheet = getOrCreateLeadSheet();
    var data = {};

    // Parse incoming payload (supports JSON, text/plain, and URL-encoded forms)
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    // Format IST Timestamp
    var timestampStr = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss");
    var leadId = data.leadId || ("MCC-" + Utilities.getUuid().substring(0, 6).toUpperCase());
    var submittedAt = data.submittedAt ? formatToIST(data.submittedAt) : timestampStr;

    // Append lead row in exact tabular order
    sheet.appendRow([
      leadId,
      submittedAt,
      data.name || "",
      data.role || "",
      data.institution || "",
      data.email || "",
      "'" + (data.phone || ""), // Prefix with apostrophe so Sheets preserves +91 formatting
      data.programme || "",
      data.cohortSize || "",
      data.message || "",
      data.sourcePage || "/contact",
      "New Enquiry"
    ]);

    // Format and beautify spreadsheet
    formatLeadSheet(sheet);

    // Send immediate email notification to leadership & support team
    try {
      sendLeadEmailNotification({
        leadId: leadId,
        submittedAt: submittedAt,
        name: data.name || "Institutional Lead",
        role: data.role || "Not specified",
        institution: data.institution || "Not specified",
        email: data.email || "",
        phone: data.phone || "",
        programme: data.programme || "Not specified",
        cohortSize: data.cohortSize || "Not specified",
        message: data.message || "No specific objectives stated.",
        sourcePage: data.sourcePage || "/contact"
      });
    } catch (emailErr) {
      Logger.log("Email notification error (sheet entry preserved): " + emailErr.message);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      leadId: leadId,
      message: "Lead recorded in Google Sheets and notification emails dispatched."
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("doPost Error: " + error.message);
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.message
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

// 2. HEALTH CHECK (Browser GET verification)
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "My Career Company — Pilot Lead Ingestion & Email Engine",
    recipients: NOTIFICATION_RECIPIENTS,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

// 3. EMAIL NOTIFICATION DISPATCHER
function sendLeadEmailNotification(lead) {
  var spreadsheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  var subject = "🎯 New Pilot Request: " + lead.name + " (" + lead.institution + ")";

  // Plain Text Version
  var plainTextBody = 
    "MY CAREER COMPANY — NEW INSTITUTIONAL PILOT REQUEST\n\n" +
    "A new consultation or pilot inquiry has been submitted via www.mycareercompany.com.\n\n" +
    "--------------------------------------------------\n" +
    "LEAD DETAILS:\n" +
    "--------------------------------------------------\n" +
    "• Reference Code: " + lead.leadId + "\n" +
    "• Received Time: " + lead.submittedAt + " (IST)\n" +
    "• Full Name: " + lead.name + "\n" +
    "• Designation / Role: " + lead.role + "\n" +
    "• Business School / University: " + lead.institution + "\n" +
    "• Official Email: " + lead.email + "\n" +
    "• Contact Phone: " + lead.phone + "\n" +
    "• Cohort / Programme: " + lead.programme + "\n" +
    "• Estimated Cohort Size: " + lead.cohortSize + "\n" +
    "• Specific Focus / Objectives: " + lead.message + "\n\n" +
    "View complete tabular records in Google Sheets:\n" +
    spreadsheetUrl + "\n";

  // Branded HTML Version
  var htmlBody = 
    '<!DOCTYPE html>' +
    '<html><head><meta charset="utf-8"></head><body style="margin:0; padding:0; background:#F4F1EA; font-family:\'Segoe UI\', Arial, sans-serif; color:#1C2826;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EA; padding:24px 0;">' +
    '<tr><td align="center">' +
    '  <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF; border-radius:12px; overflow:hidden; border:1px solid #E5DFD3; box-shadow:0 4px 16px rgba(0,0,0,0.06);">' +
    
    '    <!-- HEADER BANNER -->' +
    '    <tr><td style="background:#073D32; padding:24px 32px; border-bottom:3px solid #C8A97E;">' +
    '      <table width="100%" cellpadding="0" cellspacing="0">' +
    '        <tr>' +
    '          <td>' +
    '            <div style="font-size:11px; letter-spacing:0.18em; text-transform:uppercase; color:#C8A97E; font-weight:700;">INSTITUTIONAL ADVISORY DESK</div>' +
    '            <h1 style="color:#FFFFFF; font-size:22px; margin:6px 0 0 0; font-weight:700; letter-spacing:-0.02em;">New Institutional Pilot Request</h1>' +
    '          </td>' +
    '          <td align="right">' +
    '            <div style="background:rgba(200,169,126,0.18); border:1px solid #C8A97E; padding:6px 12px; border-radius:6px; color:#FFFFFF; font-size:11px; font-weight:700; letter-spacing:0.05em;">' +
                   lead.leadId +
    '            </div>' +
    '          </td>' +
    '        </tr>' +
    '      </table>' +
    '    </td></tr>' +

    '    <!-- HIGHLIGHT SUMMARY -->' +
    '    <tr><td style="padding:24px 32px 12px 32px; background:#FAF8F5; border-bottom:1px solid #EFEAE1;">' +
    '      <div style="font-size:16px; font-weight:700; color:#073D32; margin-bottom:4px;">' +
             escapeHtml(lead.name) + ' &bull; ' + escapeHtml(lead.role) +
    '      </div>' +
    '      <div style="font-size:14px; color:#5A6563; font-weight:600;">' +
             '🏛️ ' + escapeHtml(lead.institution) +
    '      </div>' +
    '    </td></tr>' +

    '    <!-- TABULAR LEAD BREAKDOWN -->' +
    '    <tr><td style="padding:24px 32px;">' +
    '      <table width="100%" cellpadding="8" cellspacing="0" style="font-size:13px; border-collapse:collapse;">' +
    '        <tr style="border-bottom:1px solid #F0ECE4;">' +
    '          <td width="35%" style="color:#7A8583; font-weight:600;">Official Institutional Email</td>' +
    '          <td width="65%" style="color:#073D32; font-weight:600;"><a href="mailto:' + escapeHtml(lead.email) + '" style="color:#073D32; text-decoration:none;">' + escapeHtml(lead.email) + '</a></td>' +
    '        </tr>' +
    '        <tr style="border-bottom:1px solid #F0ECE4;">' +
    '          <td style="color:#7A8583; font-weight:600;">Contact Phone / WhatsApp</td>' +
    '          <td style="color:#073D32; font-weight:600;"><a href="tel:' + escapeHtml(lead.phone) + '" style="color:#073D32; text-decoration:none;">' + escapeHtml(lead.phone) + '</a></td>' +
    '        </tr>' +
    '        <tr style="border-bottom:1px solid #F0ECE4;">' +
    '          <td style="color:#7A8583; font-weight:600;">Cohort / Programme</td>' +
    '          <td style="color:#1C2826;">' + escapeHtml(lead.programme) + '</td>' +
    '        </tr>' +
    '        <tr style="border-bottom:1px solid #F0ECE4;">' +
    '          <td style="color:#7A8583; font-weight:600;">Estimated Cohort Size</td>' +
    '          <td style="color:#1C2826;">' + escapeHtml(lead.cohortSize) + '</td>' +
    '        </tr>' +
    '        <tr style="border-bottom:1px solid #F0ECE4;">' +
    '          <td style="color:#7A8583; font-weight:600;">Received Timestamp</td>' +
    '          <td style="color:#5A6563;">' + escapeHtml(lead.submittedAt) + ' IST</td>' +
    '        </tr>' +
    '      </table>' +

    '      <!-- OBJECTIVES / MESSAGE BLOCK -->' +
    '      <div style="margin-top:20px; padding:16px; background:#FAF8F5; border-left:4px solid #C8A97E; border-radius:4px;">' +
    '        <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:#7A8583; font-weight:700; margin-bottom:6px;">Placement Objectives &amp; Focus:</div>' +
    '        <div style="font-size:13.5px; line-height:1.6; color:#1C2826;">' +
               nl2br(escapeHtml(lead.message)) +
    '        </div>' +
    '      </div>' +

    '      <!-- QUICK ACTION BUTTONS -->' +
    '      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">' +
    '        <tr>' +
    '          <td align="center" style="padding:4px;">' +
    '            <a href="mailto:' + escapeHtml(lead.email) + '?subject=Re:%20Institutional%20Pilot%20Request%20-%20My%20Career%20Company" style="display:inline-block; padding:12px 20px; background:#073D32; color:#FFFFFF; text-decoration:none; border-radius:6px; font-size:13px; font-weight:600;">📧 Reply to Lead</a>' +
    '          </td>' +
    '          <td align="center" style="padding:4px;">' +
    '            <a href="tel:' + escapeHtml(lead.phone) + '" style="display:inline-block; padding:12px 20px; background:#C8A97E; color:#073D32; text-decoration:none; border-radius:6px; font-size:13px; font-weight:600;">📞 Call Contact</a>' +
    '          </td>' +
    '          <td align="center" style="padding:4px;">' +
    '            <a href="' + spreadsheetUrl + '" style="display:inline-block; padding:12px 20px; background:#FAF8F5; border:1px solid #D5CEBF; color:#073D32; text-decoration:none; border-radius:6px; font-size:13px; font-weight:600;">📊 Open Google Sheet</a>' +
    '          </td>' +
    '        </tr>' +
    '      </table>' +

    '    </td></tr>' +

    '    <!-- FOOTER -->' +
    '    <tr><td style="background:#073D32; padding:16px 32px; text-align:center; color:#A8B5B2; font-size:11px;">' +
    '      My Career Company &bull; <a href="https://www.mycareercompany.com" style="color:#C8A97E; text-decoration:none;">www.mycareercompany.com</a><br>' +
    '      Automated telemetry delivered to anirbanroy, ibonkataki, iimonkataki &amp; support.' +
    '    </td></tr>' +

    '  </table>' +
    '</td></tr>' +
    '</table>' +
    '</body></html>';

  MailApp.sendEmail({
    to: NOTIFICATION_RECIPIENTS,
    subject: subject,
    body: plainTextBody,
    htmlBody: htmlBody,
    name: "My Career Company Leads"
  });
}

// 4. SPREADSHEET BUILDER & TABLE BEAUTIFIER
function getOrCreateLeadSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Lead ID",
      "Timestamp (IST)",
      "Full Name",
      "Designation / Role",
      "Business School / University",
      "Official Institutional Email",
      "Contact Phone",
      "Cohort / Programme",
      "Estimated Cohort Size",
      "Specific Focus or Objectives",
      "Source Page",
      "Status"
    ]);
    formatLeadSheet(sheet);
  }

  return sheet;
}

function formatLeadSheet(sheet) {
  var lastRow = Math.max(sheet.getLastRow(), 1);
  var lastCol = 12;

  // Header Styling: Deep Forest Green (#073D32) and White Bold Text
  var headerRange = sheet.getRange(1, 1, 1, lastCol);
  headerRange.setBackground("#073D32")
             .setFontColor("#FFFFFF")
             .setFontWeight("bold")
             .setFontSize(10)
             .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 38);

  // Freeze top header row
  sheet.setFrozenRows(1);

  // Format data rows if they exist
  if (lastRow > 1) {
    var dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
    dataRange.setFontSize(9.5)
             .setVerticalAlignment("middle");

    // Wrap text on Objectives / Message column (Col 10)
    sheet.getRange(2, 10, lastRow - 1, 1).setWrap(true);
    sheet.setColumnWidth(10, 280);
  }

  // Auto-resize other columns for clean presentation
  for (var c = 1; c <= lastCol; c++) {
    if (c !== 10) {
      sheet.autoResizeColumn(c);
      // Add minimum readable padding
      if (sheet.getColumnWidth(c) < 110) {
        sheet.setColumnWidth(c, 120);
      }
    }
  }
}

// 5. DIRECT FIREBASE FIRESTORE SYNC (Pulls any existing database records)
function syncLeadsFromFirebase() {
  var projectId = "my-career-company";
  var apiKey = "AIzaSyC6DQ6wzXjRywCMhTBUXTiuIsRF-QWpLIg";
  var firestoreUrl = "https://firestore.googleapis.com/v1/projects/" + projectId + "/databases/(default)/documents/institutional_leads?pageSize=100&key=" + apiKey;

  try {
    var response = UrlFetchApp.fetch(firestoreUrl, { muteHttpExceptions: true });
    var statusCode = response.getResponseCode();

    if (statusCode !== 200) {
      SpreadsheetApp.getUi().alert("Firebase Sync Note (" + statusCode + "): " + response.getContentText());
      return;
    }

    var json = JSON.parse(response.getContentText());
    if (!json.documents || json.documents.length === 0) {
      SpreadsheetApp.getUi().alert("No leads found in Firebase Firestore collection 'institutional_leads'.");
      return;
    }

    var sheet = getOrCreateLeadSheet();

    // Deduplicate against existing Lead IDs in Column A
    var existingIds = [];
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      existingIds = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(String);
    }

    var newCount = 0;
    json.documents.forEach(function(doc) {
      var f = doc.fields || {};
      var leadId = f.leadId ? f.leadId.stringValue : (doc.name ? doc.name.split("/").pop() : "");

      if (existingIds.indexOf(String(leadId)) !== -1) {
        return;
      }

      sheet.appendRow([
        leadId,
        f.submittedAt ? formatToIST(f.submittedAt.stringValue) : Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss"),
        f.name ? f.name.stringValue : "",
        f.role ? f.role.stringValue : "",
        f.institution ? f.institution.stringValue : "",
        f.email ? f.email.stringValue : "",
        "'" + (f.phone ? f.phone.stringValue : ""),
        f.programme ? f.programme.stringValue : "",
        f.cohortSize ? f.cohortSize.stringValue : "",
        f.message ? f.message.stringValue : "",
        f.sourcePage ? f.sourcePage.stringValue : "/contact",
        "Synced from Firebase"
      ]);
      newCount++;
    });

    formatLeadSheet(sheet);
    SpreadsheetApp.getUi().alert("Sync Complete!\n\nImported " + newCount + " new lead(s) from Firebase.");

  } catch (err) {
    SpreadsheetApp.getUi().alert("Sync Failed: " + err.message);
  }
}

// 6. CUSTOM SPREADSHEET MENU
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 My Career Company')
    .addItem('🔄 Sync Leads from Firebase Now', 'syncLeadsFromFirebase')
    .addItem('📧 Send Test Email Alert', 'sendTestLeadEmail')
    .addItem('🎨 Beautify Headers & Columns', 'formatActiveSheet')
    .addItem('🧪 Insert Sample Test Lead', 'insertTestLead')
    .addToUi();
}

function formatActiveSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  formatLeadSheet(sheet);
  SpreadsheetApp.getUi().alert("Headers and column formatting refreshed!");
}

// 7. TEST UTILITIES
function sendTestLeadEmail() {
  sendLeadEmailNotification({
    leadId: "MCC-TEST-" + Utilities.getUuid().substring(0, 4).toUpperCase(),
    submittedAt: Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss"),
    name: "Prof. Anirban Roy (Test Entry)",
    role: "Chairperson - Placements",
    institution: "Indian Institute of Management (IIM Sample)",
    email: "support@mycareercompany.com",
    phone: "+91 8145295101",
    programme: "2-Year MBA / PGDM Flagship",
    cohortSize: "120 - 250 Students",
    message: "Test lead to verify email delivery across anirbanroy, ibonkataki, iimonkataki, and support.",
    sourcePage: "/contact"
  });
  SpreadsheetApp.getUi().alert("Test email alert successfully sent to:\n" + NOTIFICATION_RECIPIENTS.split(",").join("\n"));
}

function insertTestLead() {
  var sheet = getOrCreateLeadSheet();
  var testId = "MCC-" + Utilities.getUuid().substring(0, 6).toUpperCase();
  var now = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss");

  sheet.appendRow([
    testId,
    now,
    "Dr. Test Placement Chair",
    "Chairperson - Placements",
    "IIM Sample Institution",
    "placements@iim-sample.ac.in",
    "'+91 8145295101",
    "2-Year MBA / PGDM Flagship",
    "120 - 250 Students",
    "Pilot diagnostic inquiry for upcoming cohort.",
    "/contact",
    "Sample Test"
  ]);

  formatLeadSheet(sheet);
  SpreadsheetApp.getUi().alert("Sample test lead (" + testId + ") inserted into sheet!");
}

// 8. STRING HELPERS
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function nl2br(text) {
  if (!text) return "";
  return String(text).replace(/\n/g, "<br>");
}

function formatToIST(dateInput) {
  try {
    var d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      return Utilities.formatDate(d, "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss");
    }
  } catch (e) {}
  return String(dateInput);
}
```
