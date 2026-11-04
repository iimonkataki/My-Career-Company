# Get Referred™ v3: setup guide

**What v3 adds** (on top of your current portal, without removing anything):

| | Who sees it | What it does |
|---|---|---|
| Get Referred | Everyone, no sign-in | Same form as today. Visitors no longer need to sign in. |
| Status of Referrals | Signed in with Google **and** access switched on | Candidates: 3 signals per request. POCs: 2 signals, and "Mark as referred" with optional proof. |
| Refer and Earn | Everyone, no sign-in | Advert with live counts, plus a form for new referral partners → Google Sheet. |
| Referral Repository, Access | The 4 co-founders | As today, plus live status inside each request and a new "Status of Referrals access" panel. |

**Emails:**
1. The candidate gets "My Career Company has received your referral request" right after submitting.
2. "Send 2 emails" sends the POC "You have received a referral request from My Career Company". It sends the candidate "Your details have been shared with the referral POC", and it updates both status screens.

Everything stays on the **free Spark plan**.

---

## Step 1. Install with Antigravity (10 minutes)

Put `GetReferred_v3_BUNDLE.txt` in `C:\AntiGravity`, open that folder in Antigravity, and paste **Prompt 1**:

```
Please install the Get Referred v3 update from GetReferred_v3_BUNDLE.txt in this folder. Do these steps in order.

1. git pull on main, then create a branch called getreferred-v3.
2. Copy the lines between "#@#@ INSTALLER START" and "#@#@ INSTALLER END" in GetReferred_v3_BUNDLE.txt, exactly as they are, into a new file install-getreferred-v3.cjs in this folder.
3. Run: node install-getreferred-v3.cjs GetReferred_v3_BUNDLE.txt --check
   It must end with "CHECK ONLY: everything can be applied". If it says STOPPED, stop and show me the whole message. Do not edit files by hand to make it pass.
4. Run: node install-getreferred-v3.cjs GetReferred_v3_BUNDLE.txt
   It must end with "INSTALLED: 10 files written, 28 edits applied".
5. Run these and show me each summary line: node test/getreferred/core.test.mjs (expect 32 passed), node test/getreferred/mailer.test.mjs (expect 30 passed), node test/getreferred/portal-core.test.mjs (expect 22 passed).
6. Run: firebase deploy --only firestore:rules
7. Open docs/getreferred/apps-script/ReferralMailer_READY.gs in the editor for me.
8. Run firebase emulators:start --only hosting and give me the link http://localhost:5000/getreferred
9. STOP and wait for me. Do not commit getreferred-v3-backup/, GetReferred_v3_BUNDLE.txt or install-getreferred-v3.cjs. Do not deploy hosting.
```

The new security rules are safe for the live site: the current live pages keep working with them.

## Step 2. Update the email sender (5 minutes)

Signed in to Google as **support@mycareercompany.com**:

1. Open **script.google.com** → open your **MCC Referral Mailer** project.
2. Click in the code, press **Ctrl+A**, **Delete**. In Antigravity, in `ReferralMailer_READY.gs`, press **Ctrl+A**, **Ctrl+C**, then paste into Apps Script. Press **Ctrl+S**.
3. In the toolbar, choose **setupReferAndEarnSheet** → **Run** → **Review permissions** → your account → **Advanced** → **Go to MCC Referral Mailer (unsafe)** → **Allow**. Google asks again because the script can now write to a Google Sheet.
4. Click **Execution log**. It shows `Created: https://docs.google.com/spreadsheets/...`: that is your **Refer and Earn sheet**, already shared with the three @mycareercompany.com co-founders. If the log says it couldn't share with upam.patra@gmail.com, open the sheet → **Share** → add that email.
5. **Deploy** → **Manage deployments** → ✏ (Edit) → Version: **New version** → **Deploy**. Do **not** create a new deployment, because that would change the URL.

## Step 3. Test (15 minutes)

Use normal Chrome at `http://localhost:5000/getreferred`. A **second, Incognito window** is handy for the candidate and POC.

1. **Open portal.** In Incognito you see **Get Referred** and **Refer and Earn**, no sign-in wall, and a **Sign in** button top right.
2. **Confirmation email.** Submit a test request with **your own email**. Within a minute you get "My Career Company has received your referral request".
3. **Refer and Earn.** Fill in the form with a work email (e.g. yourname@mycareercompany.com). A new row appears in the Refer and Earn sheet.
4. **Co-founder.** In the normal window, click **Sign in**. You see 5 tabs. Go to **Referral Repository → Companies & POCs**, upload your Referral Database Excel (with the POC email column), then click **Publish**.
5. **Access.** Go to **Access → Status of Referrals access → POC accounts**. Every POC with an email is listed, switched **off**. Pick a test POC, add **your own Gmail** in "Add another Google email", and switch **Refer and Earn** on. Then add the test candidate's email in **Grant Access to New User**, as before.
6. **Send.** In **Referral Repository**, open the test request, click **Email request** on that POC, change "To" to your own address, and click **Send 2 emails**.
   *Tip: for a full POC test, use a POC whose database email is yours. The POC's status is matched to the email the request was sent to.*
7. **Candidate view.** In Incognito, sign in as the candidate. **Status of Referrals** shows Yes / Yes / Pending.
8. **POC view.** Sign in as the POC, open **Referrals given**, and click **Mark as referred** (proof is optional). The candidate now sees Yes / Yes / Yes, and the Repository shows "referred" with **View proof**.
9. Delete the test request.

## Step 4. Go live (5 minutes)

Paste **Prompt 2**:

```
Approved. Commit and push the getreferred-v3 branch (without getreferred-v3-backup/, GetReferred_v3_BUNDLE.txt and install-getreferred-v3.cjs), merge it into main, then run: firebase deploy --only hosting
```

Then go to Cloudflare → Caching → **Purge Everything**, open www.mycareercompany.com/getreferred and press **Ctrl+F5**.

**To undo everything**, paste:

```
Undo the Get Referred v3 update: run node install-getreferred-v3.cjs GetReferred_v3_BUNDLE.txt --restore, then firebase deploy --only firestore:rules,hosting
```

---

## Day-to-day

- **A new referral partner fills in Refer and Earn:** check the sheet, add them to the Referral Database (with their email), re-upload it in **Companies & POCs**, then switch them on in **Access**.
- **A POC can't see a request:** check that (a) Refer and Earn is on for them, (b) they sign in with the database email or a linked sign-in email, and (c) the request was emailed to that same address.
- **A POC's work email isn't a Google account:** they can create one free with their existing email (accounts.google.com/signup → "For my personal use" → "Use your existing email"). Or you add their Gmail under "Add another Google email". The "✉️ Send" button emails them these instructions.
- **Anyone you grant through the old "Grant Access" form** gets Get Referred status access automatically.

## Troubleshooting

| You see | Fix |
|---|---|
| "STOPPED … expected the original text once, found it 0 times" | A file changed after you made the bundle. Share the file named in the message and ask Claude for an updated bundle |
| "Permission denied" on Status of Referrals or when submitting | Step 1.6 (deploy rules) wasn't done |
| No confirmation email after submitting | Apps Script not updated, or not redeployed as a **new version** (Step 2.5). Check Apps Script → Executions |
| Refer and Earn says "The Refer and Earn sheet is not set up yet" | Run **setupReferAndEarnSheet** once (Step 2.3) |
| A signed-in user sees "No Status access yet" | Switch on their access in **Access → Status of Referrals access** |
| The POC list in Access is empty | Publish the Referral Database with the POC email column (**Companies & POCs**) |
| Co-founder tabs are cut off on a narrow screen | Swipe the tab bar sideways (phones), or widen the window |

## Assumptions and notes

1. **Access records** live in your existing `referral_allowed_users` list, with two new switches. Accounts you granted before v3 keep Get Referred status access, and Refer and Earn starts off for everyone. POC accounts are only created when you switch one on.
2. **One existing rule was tightened.** Today any signed-in Google account can read the whole access list. With POCs in it, that would expose every POC email, so each person can now read only their own record. The co-founders still read everything.
3. **The confirmation email needs no Google Cloud setup.** The browser sends only the request reference, and the script reads the address from a record that can be read only for 30 minutes after submitting. It sends at most 3 to one address every 6 hours and 300 a day, and always keeps 100 sends a day free for your "Send 2 emails".
4. **Status matching uses emails.** Candidates are matched by the email on their request. POCs are matched by the email the request was sent to (normally their database email) or a linked sign-in email. If you type a different "To" address when sending, add it as a sign-in email for that POC.
5. **The Refer and Earn form** offers Current employee, Serving notice and About to join, but not Ex employee, because it confirms current employment. Personal email domains (Gmail, Yahoo, Outlook…) are refused as the work email.
6. **Proof uploads** (PDF/PNG/JPG/WEBP, up to 2 MB) are stored in Firestore like resumes and are visible only to the co-founders.
7. **Firestore rules are deployed from the repo's `firestore.rules`.** If anyone edited rules directly in the Firebase Console since your last deploy, those console edits would be replaced. Check the Console's rules history first if unsure.
8. **Not changed, but worth fixing separately:** `institutional_leads` can be read by anyone (`allow read: if true`), and the invitation-email webhook accepts requests without a sign-in check.
