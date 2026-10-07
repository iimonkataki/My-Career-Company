# Complete Google Apps Script for Google Sheets
### My Career Company — Dual Real-Time & Firestore Lead Sync

This script provides complete two-way synchronization:
1. **Real-Time Webhook (`doPost`)**: Appends leads as soon as someone submits the form on `www.mycareercompany.com/contact`.
2. **Direct Firebase Database Sync (`syncLeadsFromFirebase`)**: Pulls any leads already sitting in your Cloud Firestore database into the sheet with 1 click.
3. **Custom Menu in Google Sheets**: Adds a **`🚀 My Career Company`** menu to your spreadsheet for manual sync, formatting, and test leads.

---

### Complete Code (Copy & Replace Everything in Apps Script)

```javascript
/**
 * MY CAREER COMPANY — GOOGLE SHEETS & FIREBASE LEAD ENGINE
 * Entire drop-in script for Google Apps Script
 * Project: my-career-company
 */

// 1. Webhook: Receives real-time submissions from www.mycareercompany.com
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var sheet = getOrCreateLeadSheet();
    var data = {};

    // Parse incoming payload (handles JSON, text/plain, and URL-encoded forms)
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

    // Append lead row
    sheet.appendRow([
      data.leadId || ("MCC-" + Utilities.getUuid().substring(0, 6).toUpperCase()),
      data.submittedAt || timestampStr,
      data.name || "",
      data.role || "",
      data.institution || "",
      data.email || "",
      data.phone || "",
      data.programme || "",
      data.cohortSize || "",
      data.message || "",
      data.sourcePage || "/contact",
      "New Enquiry"
    ]);

    // Format table
    formatLeadSheet(sheet);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      leadId: data.leadId,
      message: "Lead successfully recorded in Google Sheets"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.message
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

// 2. Health check endpoint for testing in browser
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "My Career Company Lead Ingestion Webhook",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

// 3. Direct Firebase Database Sync: Pulls all documents from Cloud Firestore
function syncLeadsFromFirebase() {
  var projectId = "my-career-company";
  var firestoreUrl = "https://firestore.googleapis.com/v1/projects/" + projectId + "/databases/(default)/documents/institutional_leads?pageSize=100";

  try {
    var response = UrlFetchApp.fetch(firestoreUrl, { muteHttpExceptions: true });
    var statusCode = response.getResponseCode();

    if (statusCode !== 200) {
      SpreadsheetApp.getUi().alert("Firebase Error (" + statusCode + "): " + response.getContentText());
      return;
    }

    var json = JSON.parse(response.getContentText());
    if (!json.documents || json.documents.length === 0) {
      SpreadsheetApp.getUi().alert("No leads found in Firebase Firestore collection 'institutional_leads'.");
      return;
    }

    var sheet = getOrCreateLeadSheet();

    // Collect existing Lead IDs from Column A to prevent duplicate rows
    var existingIds = [];
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      existingIds = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(String);
    }

    var newCount = 0;
    json.documents.forEach(function(doc) {
      var f = doc.fields || {};
      var leadId = f.leadId ? f.leadId.stringValue : (doc.name ? doc.name.split("/").pop() : "");

      // Skip duplicates
      if (existingIds.indexOf(String(leadId)) !== -1) {
        return;
      }

      sheet.appendRow([
        leadId,
        f.submittedAt ? f.submittedAt.stringValue : (f.createdAt ? f.createdAt.timestampValue : Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss")),
        f.name ? f.name.stringValue : "",
        f.role ? f.role.stringValue : "",
        f.institution ? f.institution.stringValue : "",
        f.email ? f.email.stringValue : "",
        f.phone ? f.phone.stringValue : "",
        f.programme ? f.programme.stringValue : "",
        f.cohortSize ? f.cohortSize.stringValue : "",
        f.message ? f.message.stringValue : "",
        f.sourcePage ? f.sourcePage.stringValue : "/contact",
        "Synced from Firebase"
      ]);
      newCount++;
    });

    formatLeadSheet(sheet);

    SpreadsheetApp.getUi().alert("Firebase Sync Complete!\n\nImported " + newCount + " new lead(s) into your Google Sheet.");

  } catch (err) {
    SpreadsheetApp.getUi().alert("Sync Failed: " + err.message);
  }
}

// 4. Custom Menu in Google Sheets
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 My Career Company')
    .addItem('🔄 Sync Leads from Firebase Now', 'syncLeadsFromFirebase')
    .addItem('🎨 Beautify Headers & Columns', 'formatActiveSheet')
    .addItem('🧪 Insert Sample Test Lead', 'insertTestLead')
    .addToUi();
}

// Helper: Ensure the Sheet and Headers exist
function getOrCreateLeadSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Lead ID",
      "Timestamp (IST)",
      "Full Name",
      "Designation / Role",
      "Business School / Institution",
      "Institutional Email",
      "Contact Phone",
      "Cohort / Programme",
      "Cohort Size",
      "Objectives / Message",
      "Source Page",
      "Status"
    ]);
    formatLeadSheet(sheet);
  }

  return sheet;
}

// Helper: Style the header row in Deep Forest Green (#073D32) and Champagne Gold accents
function formatLeadSheet(sheet) {
  var lastRow = Math.max(sheet.getLastRow(), 1);
  var lastCol = 12;

  // Header styling: #073D32 background, white text
  var headerRange = sheet.getRange(1, 1, 1, lastCol);
  headerRange.setBackground("#073D32")
             .setFontColor("#FFFFFF")
             .setFontWeight("bold")
             .setFontSize(10)
             .setVerticalAlignment("middle");

  sheet.setRowHeight(1, 36);

  // Auto-resize columns
  for (var c = 1; c <= lastCol; c++) {
    sheet.autoResizeColumn(c);
  }
}

function formatActiveSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  formatLeadSheet(sheet);
  SpreadsheetApp.getUi().alert("Table headers and column widths updated!");
}

// Helper: Quick local test lead generator
function insertTestLead() {
  var sheet = getOrCreateLeadSheet();
  var testId = "MCC-" + Utilities.getUuid().substring(0, 6).toUpperCase();
  var now = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss");

  sheet.appendRow([
    testId,
    now,
    "Dr. Test Chairperson",
    "Chairperson - Placements",
    "IIM Test Ecosystem",
    "placements@iim-test.ac.in",
    "+91 8145295101",
    "2-Year MBA / PGDM Flagship",
    "120 - 250 Students",
    "Institutional Pilot inquiry for upcoming graduating batch",
    "/contact",
    "Test Record"
  ]);

  formatLeadSheet(sheet);
  SpreadsheetApp.getUi().alert("Test lead " + testId + " added successfully!");
}
```
