# Get Referred™ v4: setup guide

**What v4 adds** on top of your current v3 portal (nothing is removed):

| Area | Change |
|---|---|
| Get Referred page | "Why get referred with us" (6 benefits) and "How it works" (5 steps) boxes under the hero |
| Preview panel | Company logo next to the company name |
| Forms | Every box starts blank with hint text only; no Google name/email pre-fill; Refer and Earn has no pre-selected status |
| Confirmation email | Sent on submit to the email typed in the form: "received your details… working on it… will connect you to our referral POC soon" |
| Google Sheet | New "MCC Get Referred - Referral Requests" sheet gets a row for every submission |
| Access tab | Three categories: POC accounts, Referral seekers (automatic from the form, off by default), Other accounts |
| Status of Referrals | A POC's "Mark as referred" now shows **Awaiting verification**. The candidate is asked if the company has emailed them (Yes / Not yet, optional proof). A candidate **Yes** turns both sides green; otherwise a co-founder clicks **Verify** |
| Co-founder view | Summary cards, separate Referrals sought / given lists, search, company and status filters, View proof (POC and candidate), Verify, Show more |
| Phones | Tab bar scrolls sideways with a finger, with edge fades; the open tab slides into view. The Access tab no longer overflows the screen |

Everything stays on the **free Spark plan**.

---

## Step 1. Install with Antigravity (10 minutes)

Put `GetReferred_v4_BUNDLE.txt` in `C:\AntiGravity`, open that folder in Antigravity, and paste **Prompt 1**:

```
Please install the Get Referred v4 update from GetReferred_v4_BUNDLE.txt in this folder. Do these steps in order.

1. git pull on main, then create a branch called getreferred-v4.
2. Copy the lines between "#@#@ INSTALLER START" and "#@#@ INSTALLER END" in GetReferred_v4_BUNDLE.txt, exactly as they are, into a new file install-getreferred-v4.cjs in this folder.
3. Run: node install-getreferred-v4.cjs GetReferred_v4_BUNDLE.txt --check
   It must end with "CHECK ONLY: everything can be applied". If it says STOPPED, stop and show me the whole message. Do not edit files by hand to make it pass.
4. Run: node install-getreferred-v4.cjs GetReferred_v4_BUNDLE.txt
   It must end with "INSTALLED: 9 files written, 11 edits applied".
5. Run these and show me each summary line: node test/getreferred/core.test.mjs (expect 32 passed), node test/getreferred/mailer.test.mjs (expect 33 passed), node test/getreferred/portal-core.test.mjs (expect 28 passed).
6. Run: firebase deploy --only firestore:rules
7. Open docs/getreferred/apps-script/ReferralMailer_READY.gs in the editor for me.
8. Run firebase emulators:start --only hosting and give me the link http://localhost:5000/getreferred
9. STOP and wait for me. Do not commit getreferred-v4-backup/, GetReferred_v4_BUNDLE.txt or install-getreferred-v4.cjs. Do not deploy hosting.
```

The new rules also work with the current live pages, so deploying them first is safe.

## Step 2. Update the email sender (5 minutes)

Signed in to Google as **support@mycareercompany.com**:

1. Open **script.google.com** → **MCC Referral Mailer**.
2. Click in the code, press **Ctrl+A**, **Delete**. In Antigravity, in `ReferralMailer_READY.gs`, press **Ctrl+A**, **Ctrl+C**, paste into Apps Script, then press **Ctrl+S**.
3. In the toolbar choose **setupGetReferredSheet** → **Run**. If Google asks, click **Review permissions** → your account → **Advanced** → **Go to MCC Referral Mailer** → **Allow**.
4. Open **Execution log**: it shows `Created: https://docs.google.com/spreadsheets/...`. That is your **Get Referred requests sheet**, shared with the three @mycareercompany.com co-founders. If it couldn't share with upam.patra@gmail.com, open the sheet → **Share** → add it.
5. **Deploy** → **Manage deployments** → ✏ (Edit) → Version: **New version** → **Deploy**. Don't create a new deployment, or the URL will change.

Your existing Refer and Earn sheet is not touched.

## Step 3. Test (15 minutes)

Open `http://localhost:5000/getreferred` in normal Chrome. Use an **Incognito window** for the candidate and the POC.

1. **Get Referred page.** In Incognito, under the hero you see "Why get referred with us" and "How it works". All boxes are empty with grey hints. Choose a company and its logo appears in the preview on the right.
2. **Submit.** Submit a test request with **your own email**. You get the confirmation email, and a row appears in the Get Referred sheet.
3. **Access.** In the normal window, click **Sign in** as a co-founder. Under **Access → Status of Referrals access → Referral seekers**, your test email is listed and switched off. Switch on **Get Referred**.
4. **Send.** In **Referral Repository**, open the request, click **Email request** to a test POC (as in v3, with your own Gmail linked as the POC's sign-in email), then **Send 2 emails**.
5. **POC.** Sign in as the POC and click **Mark as referred**, with optional proof. It shows **Awaiting verification**, not green.
6. **Candidate.** Sign in as the candidate. Step 3 asks "Have you received an official email…?". Answer **Yes** (proof optional). The candidate's step 3 turns green, and so does the POC's step 2.
7. **Co-founder check.** Repeat with a second request, but don't answer as the candidate. As a co-founder, go to **Status of Referrals → Awaiting your verification → ✓ Verify**. Both sides turn green.
8. **Phone.** On your phone (or a narrow window), the tabs scroll sideways with a finger.
9. Delete the test requests.

## Step 4. Go live (5 minutes)

Paste **Prompt 2**:

```
Approved. Commit and push the getreferred-v4 branch (without getreferred-v4-backup/, GetReferred_v4_BUNDLE.txt and install-getreferred-v4.cjs), merge it into main, then run: firebase deploy --only hosting
```

Then Cloudflare → Caching → **Purge Everything**, open www.mycareercompany.com/getreferred and press **Ctrl+F5**.

**To undo v4** (back to v3), paste:

```
Undo the Get Referred v4 update: run node install-getreferred-v4.cjs GetReferred_v4_BUNDLE.txt --restore, then firebase deploy --only firestore:rules,hosting
```

---

## How a referral turns green

| Situation | Candidate step 3 | POC step 2 |
|---|---|---|
| POC hasn't marked it | Pending | Pending, with "Mark as referred" |
| POC marked it, nobody has confirmed | Awaiting verification ("The POC says they have referred you") | Awaiting verification |
| Candidate answered **Yes** | **Yes** ("Confirmed by you") | **Yes**, if this POC marked it or is the only POC on the request |
| Co-founder clicked **Verify** | **Yes** ("Verified by My Career Company") | **Yes** |
| Candidate answered **Not yet** | Still pending (they can update later) | Unchanged |

The POC's "Referrals given" counter (for the payout every 10) counts only green referrals.

## Troubleshooting

| You see | Fix |
|---|---|
| "STOPPED … found it 0 times" | A file changed after the bundle was made. Share the file named in the message and ask Claude for an updated bundle |
| "Permission denied" when answering or verifying | Step 1.6 (deploy rules) wasn't done |
| No row in the Get Referred sheet | Run **setupGetReferredSheet** (Step 2.3) and redeploy as a **new version** (Step 2.5) |
| No confirmation email | Apps Script not redeployed as a new version. Check Apps Script → Executions |
| A seeker isn't in Access → Referral seekers | Click **🔄 Refresh** in the panel. Seekers come from submitted requests |
| The candidate doesn't see the "received the email?" question | It appears only after **Send 2 emails** has shared their details with a POC |

## Assumptions and notes

1. **Several POCs on one request:** a candidate "Yes" credits the POC(s) who marked it referred, or the only POC on the request. Otherwise use **Verify** on the right POC.
2. **A candidate's "Yes" is final**, and a POC can't verify their own referral. Only the co-founders can.
3. **Referral seekers start switched off.** You decide who can see Status of Referrals. The Access list reads from submitted requests; the Google Sheet is a copy of the same submissions for your team.
4. **The Sheet row and confirmation email** use a record the browser saves with the request. It is readable by its unique ID for 30 minutes only, and every field must match the request.
5. **"Request another referral"** still keeps the resume, name, email and phone during the same visit. A new visit always starts blank.
6. **Rules are deployed from the repo's `firestore.rules`.** Any rules edited directly in the Firebase Console since your last deploy would be replaced.
7. **Still open from before:** `institutional_leads` can be read by anyone, and the invitation webhook has no sign-in check.
