# Get Referred portal: setup guide (v2.0, free Spark plan)

Live address: **www.mycareercompany.com/getreferred**

**What v2 needs:** Firebase Hosting, Auth and Firestore (all free on your current Spark plan) plus one Google Apps Script (free with Google Workspace). It does **not** need the Blaze plan, Cloud Storage, Cloud Functions or any Firebase extension.

| How it works | |
|---|---|
| Resume and cover letter | Saved **inside Firestore**, split into pieces under 1 MB, in the same all-or-nothing save as the request |
| Emails | The **MCC Referral Mailer** Apps Script sends both emails from Gmail in one click (no new window) |
| Who can send | Only the 4 admins. The script checks each admin's Google sign-in with Google before sending |

---

## Step 1. Install with Antigravity (10 minutes)

Put `GetReferred_v2_BUNDLE.txt` in `C:\AntiGravity`, open `C:\AntiGravity` in Antigravity, and paste **Prompt 1**:

```
Please install the Get Referred portal v2 from the file GetReferred_v2_BUNDLE.txt in this folder. Do these steps in order.

1. Unpack: copy the lines between "#@#@ UNPACKER START" and "#@#@ UNPACKER END" in GetReferred_v2_BUNDLE.txt, exactly as they are, into a new file unpack-getreferred.cjs. Run: node unpack-getreferred.cjs GetReferred_v2_BUNDLE.txt
   It must print "All 14 files OK". If it reports any mismatch, stop and tell me.
2. git pull on main, then create a branch called getreferred-v2.
3. Copy GetReferred_v2/get-referred/ to get-referred/ (overwrite it if it exists), GetReferred_v2/test/getreferred/ to test/getreferred/, and GetReferred_v2/rules/, GetReferred_v2/apps-script/ and GetReferred_v2/docs/GETREFERRED_SETUP.md into docs/getreferred/. Change no other files except those named below.
4. In get-referred/firebase-config.js, replace every PASTE_FROM_EXISTING_SITE value (and check the other values) with the exact Firebase web config the live Resume Fit Score uses (search career-clinic-resume-checker/ for "apiKey"). Leave MAILER_URL as it is for now. Do not change ADMIN_EMAILS.
5. Copy docs/getreferred/apps-script/ReferralMailer.gs to ReferralMailer_READY.gs in the same folder, replacing PASTE_FIREBASE_WEB_API_KEY with that same apiKey. Open ReferralMailer_READY.gs in the editor for me.
6. In firebase.json "hosting": add the rewrite { "source": "/getreferred", "destination": "/get-referred/index.html" } above any "**" catch-all (skip if it is already there); add 301 redirects from "/GetReferred" and "/getReferred" to "/getreferred"; add "test/**", "docs/**", "GetReferred_v2/**", "GetReferred_v2_BUNDLE.txt" and "unpack-getreferred.cjs" to "ignore" (keep existing entries). Show me the diff.
7. Firestore rules: if firebase.json has a "firestore" section, ADD docs/getreferred/rules/firestore.getreferred.rules inside the existing "match /databases/{database}/documents" block (replace an older "Get Referred" block if there is one; change nothing else), show me the diff, then run: firebase deploy --only firestore:rules. If there is no "firestore" section, do not create one; tell me and I will paste the rules in the Firebase Console. No storage rules are needed; if storage rules contain an old "Get Referred" block, remove only that block.
8. Run: node test/getreferred/core.test.mjs (expect 32 passed, 0 failed) and node test/getreferred/mailer.test.mjs (expect 18 passed, 0 failed). Show me both summaries.
9. Run firebase emulators:start --only hosting and give me the link as http://localhost:5000/getreferred
10. STOP and wait for me. Do not commit GetReferred_v2/, the bundle, the unpacker or ReferralMailer_READY.gs. Do not deploy hosting.
```

**If the agent says the rules are managed in the Console:** Firebase Console → Firestore Database → **Rules** → paste the whole of `docs/getreferred/rules/firestore.getreferred.rules` on the line right after `match /databases/{database}/documents {` → **Publish**.

## Step 2. Create the email sender (10 minutes)

1. Sign in to Google as **support@mycareercompany.com** (the emails will come from this account) and open **script.google.com**.
2. Click **New project**. Rename it `MCC Referral Mailer`.
3. Delete everything in the editor. In Antigravity, open `ReferralMailer_READY.gs`, press **Ctrl+A**, **Ctrl+C**, and paste it into the Apps Script editor. Press **Ctrl+S**.
4. Pick **testSetup** in the toolbar and click **Run**. Google asks for permission: **Review permissions** → your account → **Advanced** → **Go to MCC Referral Mailer (unsafe)** → **Allow**. (This warning is normal for your own scripts.)
5. Click **Deploy** → **New deployment** → ⚙ → **Web app**. Set Execute as **Me** and Who has access **Anyone**. Click **Deploy** and **copy the Web app URL** (it ends with `/exec`).

Then paste **Prompt 2** in Antigravity, with your URL:

```
Set MAILER_URL in get-referred/firebase-config.js to: PASTE_URL_HERE
Then give me the local preview link again. Do not deploy.
```

**If you edit the script later:** Deploy → **Manage deployments** → ✏ → Version: **New version** → Deploy (keeps the same URL).
**If support@ isn't a mailbox you can sign in to:** do Step 2 from a founder account. If that Gmail has support@ under Settings → Accounts → "Send mail as", set `FROM_ALIAS = 'support@mycareercompany.com'` in the script.

## Step 3. Test (10 minutes)

Open `http://localhost:5000/getreferred` in normal Chrome (not Antigravity's preview).

1. Footer → **Team sign-in** with an admin account → **Admin** → **Companies & POCs** → upload your Excel → check "POCs with an email: N of 130" → **Publish**.
2. Same tab → **Email sending** → **Check connection** → it should say "Connected".
3. **Get referred** tab → submit a test request with **your own email** and a PDF.
4. **Admin** → open the request → **Email request** on any POC → type **your own other email** in "To" → **Send 2 emails**. Check that both emails arrive and the POC one has the resume attached.
5. Delete the test request.

## Step 4. Go live (5 minutes)

Paste **Prompt 3** in Antigravity:

```
Approved. Commit and push the getreferred-v2 branch (without GetReferred_v2/, the bundle, the unpacker or ReferralMailer_READY.gs), merge it into main, then run: firebase deploy --only hosting
```

Then Cloudflare → Caching → **Purge Everything**, open www.mycareercompany.com/getreferred and press Ctrl+F5. If anything is wrong: Firebase Console → Hosting → Release history → **Rollback**.

---

## Keeping the POC database up to date

In Google Sheets: File → Download → Microsoft Excel (.xlsx) → Admin → Companies & POCs → choose the file → Publish.

- The email column is found by its header (anything containing "email"). Column order doesn't matter.
- Before typing job portal links in the Companies sheet, paste column B as **values only** (it's a `=UNIQUE()` formula; links typed next to it shift onto the wrong companies when the list re-sorts).
- **Never put the Excel file inside the project folder.** Hosting publishes everything in it.

---

## Free-plan limits to know

| Limit | What it means here |
|---|---|
| Resume up to **2 MB**, cover letter up to **1 MB** | Keeps each save inside Firestore's limits. Most 1–2 page resumes are 100–500 KB |
| Firestore: **1 GiB** stored, 20K writes and 50K reads a day | Roughly 2,000+ requests with typical resumes. Delete closed requests to free space |
| Gmail via Apps Script: **1,500 recipients a day** on Google Workspace (100 on new Workspace accounts or gmail.com) | Each "Send 2 emails" uses 3 (POC, your CC, candidate). "Check connection" shows what's left today |

---

## How the data is protected

| Data | Where | Who can read |
|---|---|---|
| Company names, portal links, POC counts | `referral_public/companies` | Anyone (needed for the dropdown) |
| POC names, phones, emails, LinkedIn | `referral_private/pocs` | The 4 admins only |
| Referral requests | `referral_requests` | Visitors can only create; admins read/update/delete |
| Resume and cover letter pieces | `referral_files` | Visitors can only create them **in the same save as their request**; admins read/delete |
| Sending emails | Apps Script | Only a verified sign-in from one of the 4 admins |

To change the admin list, edit it in **three** places: `firebase-config.js`, the Firestore rules block and `ReferralMailer.gs` (then redeploy the script as a new version). The automated test checks they match.

---

## Troubleshooting

| You see | Fix |
|---|---|
| "Setup needed: paste the Firebase project config" | Prompt 1, step 4 wasn't done |
| Company list says "coming soon" | Nothing published yet: Admin → Companies & POCs → upload → Publish |
| "Permission denied" when submitting | Firestore rules not published, or pasted outside the `match /databases/{database}/documents` block |
| "Email sending is not set up yet" | MAILER_URL is empty: do Prompt 2 |
| "Could not reach the email service" | Deployment access isn't "Anyone", or the URL is wrong. Redeploy (Step 2.5) and run Prompt 2 again |
| "Mailer setup incomplete: paste the Firebase Web API key" | You pasted ReferralMailer.gs instead of ReferralMailer_READY.gs, or didn't redeploy as a new version |
| "Your sign-in could not be verified" | Sign out and in again. If it persists, the API key in the script doesn't match the website's apiKey |
| "This account is not allowed to send" | You're signed in with an account that isn't one of the 4 admins |
| "Gmail's daily sending limit is reached" | Wait until tomorrow, or use "Open POC email in Gmail" |
| Sign-in popup does nothing | Allow popups; use `localhost`; use normal Chrome |
| "Could not read this file" on database upload | Download the sheet again as .xlsx; the browser needs internet access to load the Excel reader |

---

## What was tested before delivery

- **32/32** logic tests, including checks that code, rules and mailer agree on file limits and the admin list.
- **18/18** mailer tests running the real `ReferralMailer.gs` with fake Google services: forged tokens, non-admins and unverified emails refused before anything is sent; exactly 2 emails with correct attachments, CC and reply-to; quota and bad-address handling.
- **71/71** browser checks on the real page with your Excel file, with Firestore rules simulated and the real mailer code answering the website. These cover a 1.9 MB resume split into 3 pieces and arriving **byte-identical** as an email attachment; visitors unable to read files or add pieces later; no new window when sending; the candidate not emailed twice; delete removing every piece; and the fallbacks when the mailer fails or isn't set up.
- **Not tested here:** the live Google services (real Apps Script deployment, real Gmail, Firebase's own rules engine). Step 3 checks those in 10 minutes.
