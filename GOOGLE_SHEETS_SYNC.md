# Google Sheets & Email Notification Engine
### My Career Company — "Book Institutional Pilot" Lead Ingestion

This upgraded version features **Intelligent Column Mapping**:
- Automatically reads your spreadsheet's existing column header names and maps each field (`Full Name`, `Designation / Role`, `Business School / University`, `Official Institutional Email`, `Contact Phone`, `Cohort / Programme`, `Estimated Cohort Size`, `Specific Focus or Placement Objectives`) to its exact matching column.
- Eliminates any column shifting or misalignment.
- Fixes phone number formatting (no visible apostrophes).
- Includes a **`🧹 Reset Headers & Re-sync All Leads from Database`** menu button that instantly formats the sheet and re-imports all real leads from Cloud Firestore.

---

## How to Update Your Apps Script (1 Minute)

1. Open your Google Sheet.
2. Click **Extensions** → **Apps Script**.
3. Replace all code in `Code.gs` with the complete script below.
4. Click **Save** (💾).
5. Click **Deploy** (top right) → **Manage deployments**.
6. Click the **Pencil icon** (Edit) on the active deployment:
   - Change **Version** to: **`New version`**.
   - Click **Deploy**.
7. In your Google Sheet, refresh the page (`F5`), click the **`🚀 My Career Company`** menu at the top, and select **`🧹 Reset Headers & Re-sync All Leads from Database`**.

---

## Complete Drop-In Google Apps Script (`Code.gs`)

```javascript
/**
 * ============================================================================
 * MY CAREER COMPANY — BULLETPROOF DYNAMIC LEAD & EMAIL ENGINE
 * Automatic Column Header Detection + Multi-Inbox Email Alerts
 * Recipients: anirbanroy@mycareercompany.com, ibonkataki@mycareercompany.com,
 *             iimonkataki@mycareercompany.com, support@mycareercompany.com
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
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Pilot Leads") || ss.getSheetByName("Leads") || ss.getSheets()[0];
    var data = {};

    // Parse incoming payload
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var timestampStr = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss");
    var leadId = data.leadId || ("MCC-" + Utilities.getUuid().substring(0, 6).toUpperCase());
    var submittedAt = data.submittedAt ? formatToIST(data.submittedAt) : timestampStr;

    // Dynamically insert lead mapped to actual column headers
    appendMappedLeadRow(sheet, data, leadId, submittedAt);

    // Send instant branded email notification to leadership & support team
    try {
      sendLeadEmailNotification({
        leadId: leadId,
        submittedAt: submittedAt,
        name: data.name || data.fullName || "Institutional Lead",
        role: data.role || data.designation || "Not specified",
        institution: data.institution || data.bSchool || "Not specified",
        email: data.email || "",
        phone: data.phone || "",
        programme: data.programme || data.program || "Not specified",
        cohortSize: data.cohortSize || data.size || "Not specified",
        message: data.message || data.objectives || "No specific objectives stated.",
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

// 2. DYNAMIC COLUMN MAPPING ROW INSERTER
function appendMappedLeadRow(sheet, data, leadId, submittedAt) {
  var lastRow = sheet.getLastRow();

  // If sheet is completely empty, initialize standard headers
  if (lastRow === 0) {
    createStandardHeaders(sheet);
    lastRow = 1;
  }

  var numCols = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, numCols).getValues()[0];
  var row = new Array(numCols).fill("");
  var hasMatched = false;

  for (var i = 0; i < numCols; i++) {
    var h = String(headers[i] || "").trim().toLowerCase();

    if (h.includes("time") || h.includes("date")) {
      row[i] = submittedAt;
      hasMatched = true;
    } else if (h.includes("lead id") || h.includes("reference") || h === "id") {
      row[i] = leadId;
      hasMatched = true;
    } else if (h.includes("name")) {
      row[i] = data.name || data.fullName || "";
      hasMatched = true;
    } else if (h.includes("role") || h.includes("designation")) {
      row[i] = data.role || data.designation || "";
      hasMatched = true;
    } else if (h.includes("institution") || h.includes("school") || h.includes("university")) {
      row[i] = data.institution || data.bSchool || "";
      hasMatched = true;
    } else if (h.includes("email")) {
      row[i] = data.email || "";
      hasMatched = true;
    } else if (h.includes("phone") || h.includes("contact") || h.includes("mobile")) {
      row[i] = String(data.phone || "");
      hasMatched = true;
    } else if (h.includes("programme") || h.includes("program") || h.includes("cohort /")) {
      row[i] = data.programme || data.program || "";
      hasMatched = true;
    } else if (h.includes("size") || h.includes("cohort size")) {
      row[i] = data.cohortSize || data.size || "";
      hasMatched = true;
    } else if (h.includes("objective") || h.includes("focus") || h.includes("message") || h.includes("concern")) {
      row[i] = data.message || data.objectives || "";
      hasMatched = true;
    } else if (h.includes("source") || h.includes("page")) {
      row[i] = data.sourcePage || "/contact";
      hasMatched = true;
    } else if (h.includes("status")) {
      row[i] = "New Enquiry";
      hasMatched = true;
    }
  }

  // Fallback if headers were unrecognized
  if (!hasMatched) {
    row = [
      submittedAt,
      data.name || "",
      data.role || "",
      data.institution || "",
      data.email || "",
      String(data.phone || ""),
      data.programme || "",
      data.cohortSize || data.size || "",
      data.message || "",
      leadId,
      "New Enquiry"
    ];
  }

  sheet.appendRow(row);

  // Set plain text format on phone column so leading + is preserved cleanly
  var newRowIndex = sheet.getLastRow();
  for (var c = 0; c < numCols; c++) {
    var colHeader = String(headers[c] || "").trim().toLowerCase();
    if (colHeader.includes("phone") || colHeader.includes("mobile") || colHeader.includes("contact")) {
      sheet.getRange(newRowIndex, c + 1).setNumberFormat("@");
    }
  }

  formatLeadSheet(sheet);
}

// 3. STANDARD HEADER BUILDER
function createStandardHeaders(sheet) {
  sheet.clear();
  sheet.appendRow([
    "Timestamp (IST)",
    "Full Name",
    "Designation / Role",
    "Business School / University",
    "Official Institutional Email",
    "Contact Phone",
    "Cohort / Programme",
    "Estimated Cohort Size",
    "Specific Focus or Placement Objectives",
    "Lead Reference ID",
    "Status"
  ]);
  formatLeadSheet(sheet);
}

function formatLeadSheet(sheet) {
  var lastRow = Math.max(sheet.getLastRow(), 1);
  var lastCol = Math.max(sheet.getLastColumn(), 11);

  // Header styling: Deep Forest Green (#073D32) and White Bold text
  var headerRange = sheet.getRange(1, 1, 1, lastCol);
  headerRange.setBackground("#073D32")
             .setFontColor("#FFFFFF")
             .setFontWeight("bold")
             .setFontSize(10)
             .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 38);
  sheet.setFrozenRows(1);

  if (lastRow > 1) {
    var dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
    dataRange.setFontSize(9.5).setVerticalAlignment("middle");

    // Wrap text on message / objectives column if found
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    for (var i = 0; i < lastCol; i++) {
      var h = String(headers[i] || "").toLowerCase();
      if (h.includes("objective") || h.includes("message") || h.includes("focus")) {
        sheet.getRange(2, i + 1, lastRow - 1, 1).setWrap(true);
        sheet.setColumnWidth(i + 1, 280);
      } else {
        sheet.autoResizeColumn(i + 1);
        if (sheet.getColumnWidth(i + 1) < 110) {
          sheet.setColumnWidth(i + 1, 120);
        }
      }
    }
  }
}

// 4. EMAIL NOTIFICATION DISPATCHER
function sendLeadEmailNotification(lead) {
  var spreadsheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  var subject = "🎯 New Pilot Request: " + lead.name + " (" + lead.institution + ")";

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

// 5. CLEAN UP & RE-SYNC ALL LEADS FROM FIREBASE
function resetAndResyncAllLeads() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Pilot Leads") || ss.getSheetByName("Leads") || ss.getSheets()[0];
  
  createStandardHeaders(sheet);

  var projectId = "my-career-company";
  var apiKey = "AIzaSyC6DQ6wzXjRywCMhTBUXTiuIsRF-QWpLIg";
  var firestoreUrl = "https://firestore.googleapis.com/v1/projects/" + projectId + "/databases/(default)/documents/institutional_leads?pageSize=100&key=" + apiKey;

  try {
    var response = UrlFetchApp.fetch(firestoreUrl, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) {
      SpreadsheetApp.getUi().alert("Firebase Error: " + response.getContentText());
      return;
    }

    var json = JSON.parse(response.getContentText());
    if (!json.documents || json.documents.length === 0) {
      SpreadsheetApp.getUi().alert("No leads found in Firebase.");
      return;
    }

    var count = 0;
    json.documents.forEach(function(doc) {
      var f = doc.fields || {};
      var data = {
        name: f.name ? f.name.stringValue : "",
        role: f.role ? f.role.stringValue : "",
        institution: f.institution ? f.institution.stringValue : "",
        email: f.email ? f.email.stringValue : "",
        phone: f.phone ? f.phone.stringValue : "",
        programme: f.programme ? f.programme.stringValue : "",
        cohortSize: f.cohortSize ? f.cohortSize.stringValue : (f.size ? f.size.stringValue : ""),
        message: f.message ? f.message.stringValue : "",
        sourcePage: f.sourcePage ? f.sourcePage.stringValue : "/contact"
      };

      var leadId = f.leadId ? f.leadId.stringValue : (doc.name ? doc.name.split("/").pop() : "MCC-UNKNOWN");
      var timeStr = f.submittedAt ? formatToIST(f.submittedAt.stringValue) : Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss");

      appendMappedLeadRow(sheet, data, leadId, timeStr);
      count++;
    });

    SpreadsheetApp.getUi().alert("Cleaned & Resynced Successfully!\n\nImported " + count + " real lead(s) into your sheet.");

  } catch (err) {
    SpreadsheetApp.getUi().alert("Resync Failed: " + err.message);
  }
}

// 6. HEALTH CHECK
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "My Career Company — Dynamic Lead & Email Engine",
    recipients: NOTIFICATION_RECIPIENTS,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

// 7. CUSTOM SPREADSHEET MENU
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 My Career Company')
    .addItem('🧹 Reset Headers & Re-sync All Leads from Database', 'resetAndResyncAllLeads')
    .addItem('📧 Send Test Email Alert', 'sendTestLeadEmail')
    .addItem('🎨 Beautify Headers & Columns', 'formatActiveSheet')
    .addToUi();
}

function formatActiveSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  formatLeadSheet(sheet);
  SpreadsheetApp.getUi().alert("Headers and column formatting refreshed!");
}

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
  SpreadsheetApp.getUi().alert("Test email alert sent to:\n" + NOTIFICATION_RECIPIENTS.split(",").join("\n"));
}

// 8. STRING HELPERS
function escapeHtml(text) {
  if (!text) return "";
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
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
