# Google Sheets Real-Time Sync Guide
### My Career Company — Lead Generation Engine

Every submission through the **"Book an Institutional Pilot"** form automatically saves to **Cloud Firestore** (`institutional_leads`). If you also want every lead to append into a **Google Sheet** in real-time, follow this simple 2-minute setup:

---

### Step 1: Create a Google Sheet
1. Open [sheets.new](https://sheets.new) to create a new Google Sheet.
2. Name the sheet (e.g. `My Career Company - Institutional Leads`).

---

### Step 2: Add the Apps Script Webhook
1. In your Google Sheet menu, click **Extensions** &rarr; **Apps Script**.
2. Replace any existing code with the snippet below:

```javascript
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Automatically add header row if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Lead ID", "Submitted At", "Full Name", "Designation / Role", 
        "Institution", "Email", "Phone", 
        "Programme", "Cohort Size", "Notes / Objectives", "Source Page"
      ]);
      sheet.getRange(1, 1, 1, 11).setFontWeight("bold").setBackground("#073D32").setFontColor("#FFFFFF");
    }
    
    sheet.appendRow([
      data.leadId || '',
      data.submittedAt || new Date().toISOString(),
      data.name || '',
      data.role || '',
      data.institution || '',
      data.email || '',
      data.phone || '',
      data.programme || '',
      data.cohortSize || '',
      data.message || '',
      data.sourcePage || ''
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

---

### Step 3: Deploy as a Web App
1. Click the blue **Deploy** button (top right) &rarr; **New deployment**.
2. Click the gear icon next to "Select type" &rarr; select **Web app**.
3. Set the following options:
   - **Description**: `MCC Lead Ingestion`
   - **Execute as**: `Me`
   - **Who has access**: **`Anyone`** *(Required so the website form can POST to it)*
4. Click **Deploy** &rarr; **Authorize Access** (choose your Google account).
5. Copy the generated **Web App URL** (`https://script.google.com/macros/s/.../exec`).

---

### Step 4: Paste Web App URL in `js/firebase-leads.js`
In [`js/firebase-leads.js`](file:///c:/Users/IIMON%20TARUN%20KATAKI/Downloads/mycareercompany/js/firebase-leads.js), set:

```javascript
window.GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
```

Now, every time a Dean, Placement Chair, or Institutional Lead submits the form, it simultaneously saves to:
1. **Cloud Firestore** (`institutional_leads` collection)
2. **Google Sheet** (new row appended live)
3. **Local Storage** (browser offline safety backup)
