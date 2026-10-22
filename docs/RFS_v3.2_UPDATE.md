# Resume Fit Score™ v3.2 Update: JD Link Reader (includes all v3.1 fixes)

**What's new:** when a user pastes a job link, the website now **opens the page and reads the full JD text**, for all common kinds of job pages. The JD is then scored exactly like a pasted JD.

Why this needs a small server function: browsers block a website from reading another company's page (a security rule called CORS). So the reading happens in a Firebase Cloud Function, `fetchJd`, which deploys with your normal `firebase deploy`.

**Privacy is unchanged:** only the **job link** is sent to the function. The resume never leaves the user's browser.

---

## 1. What the reader handles

| Kind of job link | How it is read | Result |
|---|---|---|
| Company career sites (Deloitte, Big 4, banks, FMCG, IT, most corporates) | The structured job data pages publish for Google Jobs (schema.org JobPosting), or the page's job-description block | Full JD |
| Greenhouse, Lever, Workday, SmartRecruiters, Ashby | The platform's public job feed | Full JD |
| Naukri, LinkedIn | Best-effort public endpoints | Full JD when the site allows it; otherwise a clear message |
| Any other page | Main-content detection (finds the JD block, drops menus, cookie banners, footers and "similar jobs") | Full or partial JD |
| A link to a PDF or Word JD | File is passed to the PDF/Word reader already in your page | Full JD |
| Pages behind a login, bot protection, or that need scripts to show the job | Detected and explained | "We could not read this page (reason). Paste the JD text." The link title is used meanwhile; no domain is guessed |

Security: the function only opens public websites. Internal and cloud addresses, private IPs, odd ports, redirects into private networks and non-web links are all blocked. Only signed-in users who are co-founders or active in `allowed_users` can use it, limited to 30 links per user per 10 minutes. Logs record only the website name, never JD text.

---

## 2. Assumptions and limits (please review)

1. **Live websites could not be tested from my environment**, which has no internet access. The reader was tested offline with 19 realistic sample pages plus security cases, and the full website flow was simulated. Your **local preview is the first live test**. Websites change their layouts; when one can't be read, users get a clear message, never wrong text.
2. **LinkedIn and Naukri** are read through unofficial public endpoints. They may block or change these, and their terms restrict automated access. The reader opens one page only, when a user asks; it doesn't crawl. Please confirm you're comfortable with this. The other platforms use their official public job feeds.
3. **Firebase plan:** Cloud Functions need the pay-as-you-go **Blaze** plan. Your Trigger Email setup suggests you may already be on it. At your volume, usage should stay within the monthly free allowance (verify on Firebase's pricing page), but **set a budget alert**.
4. **Access rule** follows your Master Context §6.1: co-founder emails, plus `allowed_users/{email}` where `isActive` is not false.
5. **Region:** `asia-south1` (Mumbai).
6. **JD text read from links is saved to `unique_job_descriptions`**, the same as pasted JDs.
7. **`jd-database-v3.js`** (company × domain × level JD database) is loaded by your page and is not changed by this update.
8. **Your `script.js` has changed** since the copy I saw (the Target company picker was added). Each edit says what to find. If the exact text differs, the agent shows you the closest match and asks first.

---

## 3. Steps and prompts

### Step 0 · One-time check (2 minutes)
Open console.firebase.google.com → **my-career-company**. The plan is shown at the bottom left.
- If it says **Spark**, click **Upgrade**, choose **Blaze** and add a billing account.
- Then go to **Usage and billing → Details & settings → Create budget**, enter ₹500, and turn on email alerts.

### Step 1 · Unzip
Extract `RFS_v3.2_update.zip` into `C:\AntiGravity\` so you have `C:\AntiGravity\RFS_v3.2`.

### Step 2 · Paste this prompt into the Antigravity agent
```
Please install the Resume Fit Score v3.2 update (JD link reader) from the RFS_v3.2 folder. Follow these steps in order and change nothing else.

1. Run git pull origin main, then: git checkout -b rfs-v3.2
2. Copy RFS_v3.2/career-clinic-resume-checker/* into career-clinic-resume-checker/ (overwrite files with the same name; this includes index.html).
   Copy RFS_v3.2/functions/ to a folder called functions/ at the repo root. If a functions/ folder already exists, STOP and show me what is in it first.
   Copy RFS_v3.2/test/* into test/, RFS_v3.2/docs/* into docs/ and RFS_v3.2/snippets/* into snippets/.
3. Run git diff career-clinic-resume-checker/index.html and confirm it only changes what docs/RFS_v3.2_UPDATE.md Section 4B lists. If anything else changed, stop and tell me.
4. In career-clinic-resume-checker/script.js apply Edits 1 to 6 and 8 to 11 from docs/RFS_v3.2_UPDATE.md Section 4C.
   Edits 1 to 6 may already be applied from v3.1: if the code already matches the "Replace with" version, skip that edit and tell me.
   If you cannot find the exact "Find" text, show me the closest match and ask before changing anything. No refactoring or reformatting.
5. In the ROOT firebase.json apply Edit 12 from Section 4D (functions block, the /api/fetch-jd rewrite as the FIRST rewrite, and the ignore entries). Show me the diff.
6. Do not modify jd-database.js or jd-database-v3.js. Tell me in one or two lines what jd-database-v3.js does.
7. Run: cd functions && npm install && cd ..
8. Run: node test/test-fetch-jd.js   (expect "19 / 19 JD-reader checks passed")
   Run: node test/run-regression.js  (expect "14 / 14 checks passed")
9. Start the local preview with: firebase emulators:start --only hosting,functions   and give me the http://localhost link.
10. Stop and wait for my approval. Do not commit, merge or deploy yet.
```

### Step 3 · Test on your computer
Open the local link in Chrome. If it starts with `127.0.0.1`, change that to `localhost`. Sign in, open the **Link** tab, and try:
- **The Deloitte link:** within a few seconds the note should say **"✓ JD read from the link: Deputy Manager | IT M&A | Delhi | … (≈200+ words) [Target Domain: Consulting (IT M&A · deal technology) · Early]"**.
- **A Naukri link, a company career-page link and a Workday or Greenhouse link:** each should say "JD read from the link".
- **A LinkedIn link:** it may say "We could not read this job page automatically (needs login)". That's expected; paste the text instead.
- **Run the diagnostic with the Deloitte link:** there should be no "paste the full JD" notice, and the banner should say "Calibrated against your target JD (… words)".

### Step 4 · Go live (paste into the agent)
```
Approved. Commit with message "Resume Fit Score v3.2: JD link reader", merge rfs-v3.2 into main and push to GitHub.
Then deploy with: firebase deploy --only functions:fetchJd,hosting
If the deploy asks to enable Google Cloud APIs or to set an artifact cleanup policy, accept the defaults. Show me the final output.
```
The first function deploy can take 3–5 minutes.

### Step 5 · Clear caches and check live
- In Cloudflare, go to **Caching → Purge Everything**.
- Open www.mycareercompany.com/ResumeFitScore and press **Ctrl+F5**.
- Repeat the Deloitte link test.

**If something breaks:** Firebase Console → Hosting → Release history → **Rollback**. To switch off only the link reader, remove the `/api/fetch-jd` rewrite from `firebase.json` and redeploy hosting. The site then falls back to reading the link title.

---

## 4. Changes

### 4A · Files copied
| Path | What |
|---|---|
| `career-clinic-resume-checker/fit-engine-v3.js` | Engine v3.2.0 (v3.1 fixes; uses the real page title when the JD is read from a link) |
| `career-clinic-resume-checker/rfs-v3-bridge.js` | Bridge v3.2.0 |
| `career-clinic-resume-checker/data/*.js` | Content (sub-areas, certifications, projects), companies, schools |
| `career-clinic-resume-checker/index.html` | Corrected copy (see 4B) |
| `functions/index.js`, `functions/jd-extract.js`, `functions/package.json` | **New:** the JD link reader Cloud Function (no extra libraries) |
| `test/test-fetch-jd.js` (+ updated regression tests) | 19 reader checks + 14 scoring checks |
| `snippets/v32-client.js` | The browser code below, for reference |

### 4B · `index.html` (ready-made; your 22 Oct 2026 file with only these changes)
| Line (approx.) | Before | After |
|---|---|---|
| 179 | Hero stat **8** Evaluation Vectors | **10** |
| 404 | Link placeholder "https://www.linkedin.com/jobs/view/... or company portal link" | "Paste a job link: company career page, Naukri, LinkedIn, Workday, Greenhouse, Lever…" |
| 406 | Button "Analyze Link" | "Read JD from Link" |
| 410 | "Enter the public job posting URL to analyze…" | "Paste the job link and we will open the page and read the full JD for you. Only the link is sent; your resume never leaves your browser." |
| 593 | `Target Domain: Consulting / Strategy • Assessed Today` | `Assessed today` |
| 614 | `…18 Verified Core Competencies` | `Calibrated against your target JD` |
| 671, 675 | `8 Scored Evaluation Vectors` | `10 Scored Evaluation Vectors` |
| 723 | `…18 core competencies… (Full marks at 50% matched).` | `…screen for the skills and must-haves listed below.` |
| 728 | `0 / 18` | `0 / 0` |
| 1324–1329 | v3 script tags + `script.js` | Same with `?v=3.2` (loads the new versions past browser/Cloudflare caches) |

### 4C · `script.js` edits

**Edits 1–6 are the v3.1 fixes** (skip any already applied).

### Edit 1 · `script.js` → `parsePdfFile()`: stop splitting words when reading PDFs
**Find:**
```js
        let lastY, text = '';
        for (const item of textContent.items) {
          if (lastY !== undefined && Math.abs(item.transform[5] - lastY) > 5) {
            text += '\n';
          } else if (text.length > 0 && !text.endsWith(' ')) {
            text += ' ';
          }
          text += item.str;
          lastY = item.transform[5];
        }
```
**Replace with:**
```js
        let lastY, lastXEnd, text = '';
        for (const item of textContent.items) {
          const x = item.transform[4], y = item.transform[5];
          const fontH = Math.abs(item.transform[3]) || Math.abs(item.transform[0]) || 10;
          if (lastY !== undefined && Math.abs(y - lastY) > fontH * 0.5) {
            text += '\n';
          } else if (lastXEnd !== undefined && text.length > 0 && !text.endsWith(' ') && !item.str.startsWith(' ')) {
            // add a space only where there is a visible gap; PDFs often split one word into several pieces ("M anaged", "202 4")
            if (x - lastXEnd > fontH * 0.18) text += ' ';
          }
          text += item.str;
          lastY = y;
          lastXEnd = x + (item.width || 0);
          if (item.hasEOL) { text += '\n'; lastY = undefined; lastXEnd = undefined; }
        }
```

### Edit 2 · `script.js` → `detectDomainFromJd()`: use the v3.1 detector everywhere (upload, link, paste)
**Find** the first line of the function:
```js
  function detectDomainFromJd(textOrUrl, optionalTitle = '', optionalFileName = '') {
```
**Insert directly below it:**
```js
    if (window.RFSv3Bridge) {
      try {
        const isUrl = /^\s*https?:\/\//.test(textOrUrl || '');
        return window.RFSv3Bridge.detectJd(isUrl ? '' : textOrUrl, optionalTitle, isUrl ? textOrUrl : '').legacyKey;
      } catch (e) { console.warn('[RFS v3.1] JD detection fallback:', e); }
    }
```

### Edit 3 · `script.js` → `parseJdLinkTitle()`: read job links correctly
**Find:**
```js
  function parseJdLinkTitle(url) {
    if (!url || typeof url !== 'string') return 'Target Job Link';
```
**Replace with:**
```js
  function parseJdLinkTitle(url) {
    if (!url || typeof url !== 'string') return 'Target Job Link';
    if (window.RFSv3Bridge && window.RFSv3Bridge.parseJobUrl) {
      try { const p = window.RFSv3Bridge.parseJobUrl(url); if (p && p.display) return p.display; } catch (_) { /* fall back below */ }
    }
```

### Edit 4 · `script.js` → `registerJdUrl()`: correct domain label, no "Stored in…" text
**Find:**
```js
        const domLabel = (detectedDomain && DOMAIN_METADATA[detectedDomain]) ? DOMAIN_METADATA[detectedDomain].shortLabel : 'General';
        urlStatusNote.innerHTML = `&#10003; <strong>Job link registered:</strong> ${escapeHtml(parsedTitle)} [Target Domain: ${domLabel}]. Stored in unique JDs repository.`;
```
**Replace with:**
```js
        const det = window.RFSv3Bridge ? window.RFSv3Bridge.detectJd(url, '', url) : null;
        const domLabel = det ? det.label : ((detectedDomain && DOMAIN_METADATA[detectedDomain]) ? DOMAIN_METADATA[detectedDomain].shortLabel : 'General');
        urlStatusNote.innerHTML = `&#10003; <strong>Job link registered:</strong> ${escapeHtml(parsedTitle)} [Target Domain: ${escapeHtml(domLabel)}]` +
          (det && det.thin ? `<br><span style="opacity:.85">Tip: for an exact match, paste the full JD text in the Paste tab.</span>` : '');
```

### Edit 5 · `script.js` → `renderResults()`: report header shows only the date
**Find** the whole block that starts with:
```js
    const reportMeta = document.getElementById('reportMetaText');
    if (reportMeta) {
```
and ends with the closing `}` of that `if`. It contains `Target Benchmark:` and `Target Domain:`.
**Replace the whole block with:**
```js
    const reportMeta = document.getElementById('reportMetaText');
    if (reportMeta) {
      const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      reportMeta.textContent = `Assessed on ${today}`;
    }
```

### Edit 6 · `script.js` → `renderResults()`: banner subtitle (no "1 words", no "18 competencies")
**Find:**
```js
    if (targetDomainBannerMeta) {
      targetDomainBannerMeta.textContent = result.isCustomJd
        ? `Calibrated against target Job Description (${result.stats.jdWordCount || 'custom'} words) • 18 Verified Core Competencies`
        : `Benchmarked against Institutional Recruiter Criteria for ${roleMeta.label} • 18 Core Competencies`;
    }
```
**Replace with:**
```js
    if (targetDomainBannerMeta) {
      const nSkills = (result.roleKeywordList || []).length;
      if (result.v3 && result.v3.jd && result.v3.jd.thin) {
        targetDomainBannerMeta.textContent = `Read from the job link title · ${nSkills} benchmark skills used · Paste the full JD text for an exact match`;
      } else if (result.v3) {
        targetDomainBannerMeta.textContent = result.isCustomJd
          ? `Calibrated against your target JD (${result.stats.jdWordCount} words) · ${nSkills} JD skills & must-haves`
          : `Benchmarked against the ${result.v3.jd.id} profile · ${nSkills} JD skills & must-haves`;
      } else {
        targetDomainBannerMeta.textContent = result.isCustomJd
          ? `Calibrated against target Job Description (${result.stats.jdWordCount || 'custom'} words)`
          : `Benchmarked against Institutional Recruiter Criteria for ${roleMeta.label}`;
      }
    }
```

**Edits 8–11 are new in v3.2 (JD link reader).**

### Edit 8 · `script.js`: new helper that asks the reader to open the link
**Where:** directly after the end of the `parseJdLinkTitle()` function (same level as `parsePdfFile`).
**Insert:**
```js
  async function fetchJdFromLink(url) {
    state.jdLinkPending = true;
    try {
      let token = null;
      try { const u = window.firebase && firebase.auth && firebase.auth().currentUser; if (u) token = await u.getIdToken(); } catch (_) { /* not signed in */ }
      const resp = await fetch('/api/fetch-jd', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}),
        body: JSON.stringify({ url })     // only the link is sent; the resume never leaves the browser
      });
      let job = null;
      try { job = await resp.json(); } catch (_) { job = { ok: false, reason: 'service', message: 'the JD reader service is not available (HTTP ' + resp.status + ')' }; }
      if (job && job.ok && (job.kind === 'pdf' || job.kind === 'docx') && job.base64) {   // JD links that point to a PDF / Word file
        const bin = atob(job.base64), bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const parsed = job.kind === 'pdf' ? await parsePdfFile(bytes.buffer, false) : await parseDocxFile(bytes.buffer, false);
        job.text = parsed.text; job.words = parsed.text.trim().split(/\s+/).length; job.title = job.title.replace(/\.(pdf|docx)$/i, '');
      }
      if (job && job.ok && job.text) { state.jdLinkText = job.text; state.jdLinkTitle = job.title || ''; }
      return job;
    } catch (err) {
      console.warn('[JD link reader] failed:', err);
      return { ok: false, reason: 'network', message: 'the job page could not be read' };
    } finally {
      state.jdLinkPending = false;
    }
  }
```

### Edit 9 · `script.js`: register the link and read it immediately
**Where:** the function that runs when the user pastes a link or clicks the link button, `registerJdUrl()` (inside `initApp`, next to the `jdUrlInput` / `urlStatusNote` code).
**Replace the whole function with:**
```js
    async function registerJdUrl() {
      if (!jdUrlInput) return;
      const url = jdUrlInput.value.trim();
      if (!url || !/^https?:\/\/[^\s/]+\.[^\s]+/i.test(url)) {
        if (urlStatusNote) {
          urlStatusNote.className = 'url-status-note warning';
          urlStatusNote.innerHTML = '&#9888; Please paste a full job link starting with https://';
        }
        return;
      }
      if (url === state.jdLinkFetchedUrl && (state.jdLinkPending || state.jdLinkText)) return;   // already read / being read
      state.jdUrl = url;
      state.jdLinkFetchedUrl = url;
      state.jdLinkText = '';
      state.jdLinkTitle = '';
      const parsedTitle = parseJdLinkTitle(url);
      if (urlStatusNote) {
        urlStatusNote.className = 'url-status-note';
        urlStatusNote.innerHTML = '&#8987; Reading the job page… <span style="opacity:.8">' + escapeHtml(parsedTitle) + '</span>';
      }
      const job = await fetchJdFromLink(url);
      if (state.jdLinkFetchedUrl !== url) return;                       // the user changed the link meanwhile
      const det = window.RFSv3Bridge ? window.RFSv3Bridge.detectJd(state.jdLinkText || url, state.jdLinkText ? state.jdLinkTitle : '', url) : null;
      const unclear = !!(det && det.askUser && !state.jdLinkText);                 // nothing readable: don't guess a domain
      const detectedDomain = det ? det.legacyKey : detectDomainFromJd(state.jdLinkText || url, parsedTitle);
      if (detectedDomain && !unclear) state.targetRole = detectedDomain;
      const domLabel = unclear ? 'not clear from the link yet' : det ? det.label : ((detectedDomain && DOMAIN_METADATA[detectedDomain]) ? DOMAIN_METADATA[detectedDomain].shortLabel : 'General');
      const shownTitle = state.jdLinkTitle || parsedTitle;
      if (urlStatusNote) {
        if (job && job.ok && state.jdLinkText) {
          urlStatusNote.className = 'url-status-note success';
          urlStatusNote.innerHTML = '&#10003; <strong>JD read from the link:</strong> ' + escapeHtml(shownTitle) +
            (job.company && shownTitle.toLowerCase().indexOf(String(job.company).toLowerCase()) < 0 ? ' · ' + escapeHtml(job.company) : '') +
            ' (' + (job.words || 0) + ' words) [Target Domain: ' + escapeHtml(domLabel) + ']' +
            (job.quality === 'partial' ? '<br><span style="opacity:.85">Only part of the page could be read. For an exact match, paste the full JD text in the Paste tab.</span>' : '');
        } else {
          urlStatusNote.className = 'url-status-note warning';
          urlStatusNote.innerHTML = '&#9888; <strong>We could not read this job page automatically</strong> (' + escapeHtml((job && job.message) || 'unknown error') + ').' +
            ' Using the link title for now: ' + escapeHtml(parsedTitle) + ' [Target Domain: ' + escapeHtml(domLabel) + '].' +
            '<br><span style="opacity:.85">For an exact match, copy the JD text from the page and paste it in the Paste tab.</span>';
        }
      }
      const profileOnReg = (typeof syncProfileFromInputs === 'function') ? syncProfileFromInputs() : { candidateType: state.candidateType, institutionName: state.institutionName };
      if (window.RepositoryService && typeof window.RepositoryService.recordJobDescription === 'function') {
        window.RepositoryService.recordJobDescription({
          url: url, title: shownTitle, text: state.jdLinkText || undefined, domain: det ? det.name : (state.targetRole || 'general'), tab: 'link',
          candidateType: profileOnReg.candidateType, institutionName: profileOnReg.institutionName
        }).then(() => { if (typeof updateHeaderRepoCount === 'function') updateHeaderRepoCount(); })
          .catch(err => console.warn('[Repository] Link JD record note:', err));
      }
    }
```
The button and paste listeners that call `registerJdUrl()` need no change; the function is now `async`.

### Edit 10 · `script.js` → `handleExecuteDiagnostic()`: use the text read from the link
**Find:**
```js
      } else if (state.jdTab === 'link') {
        if (state.jdExtractedText) {
          jdTextToAnalyze = state.jdExtractedText;
        } else if (state.jdUrl) {
          jdTextToAnalyze = state.jdUrl;
        }
      }
```
**Replace with:**
```js
      } else if (state.jdTab === 'link') {
        if (state.jdUrl && state.jdLinkFetchedUrl !== state.jdUrl) {      // link typed but not read yet → read it now
          state.jdLinkFetchedUrl = state.jdUrl; state.jdLinkText = ''; state.jdLinkTitle = '';
          if (typeof showLoading === 'function') showLoading('Reading the job page from your link...');
          await fetchJdFromLink(state.jdUrl);
        }
        for (let i = 0; i < 100 && state.jdLinkPending; i++) await new Promise(r => setTimeout(r, 200));   // wait up to 20 s if still reading
        jdTextToAnalyze = state.jdLinkText || state.jdUrl || '';
      }
```
**And in the same function, find:**
```js
        jdCustomTitle = parseJdLinkTitle(state.jdUrl);
```
**Replace with:**
```js
        jdCustomTitle = (state.jdTab === 'link' && state.jdLinkTitle) ? state.jdLinkTitle : parseJdLinkTitle(state.jdUrl);
```

### Edit 11 · `script.js`: clear the link state when starting over
**Where:** the reset code for "Check Another Resume" (where `state.jdUrl` is cleared).
**Add next to it:**
```js
      state.jdLinkText = ''; state.jdLinkTitle = ''; state.jdLinkFetchedUrl = ''; state.jdLinkPending = false;
```

### 4D · Edit 12 · ROOT `firebase.json`
1. **Add a top-level `functions` block** next to `"hosting"`:
```json
  "functions": [
    { "source": "functions", "codebase": "default", "ignore": ["node_modules", ".git", "*.local"] }
  ],
```
2. **Add this as the FIRST entry of `hosting.rewrites`** (above every other rewrite):
```json
      { "source": "/api/fetch-jd", "function": { "functionId": "fetchJd", "region": "asia-south1" } },
```
3. **Add these entries to `hosting.ignore`**, keeping the existing ones. Your hosting publishes the whole repo folder (`"public": "."`), so without these the function code and tests would become public files.
```json
      "functions/**", "test/**", "tools/**", "docs/**", "snippets/**", "RFS_v3*", "RFS_v3*/**", "unpack-rfs.js"
```

---

## 5. How to check it worked
1. `node test/test-fetch-jd.js` → **19 / 19 JD-reader checks passed**. These cover career sites, Greenhouse, Lever, Workday, SmartRecruiters, Ashby, Naukri, LinkedIn login wall, script-only page, bot protection, PDF link and 6 security cases.
2. `node test/run-regression.js` → **14 / 14 checks passed** (all fixes from your feedback document).
3. Browser console on the local link: `RFSv3.VERSION` → **"RFS-3.2.0"**, and `RFSv3Bridge.VERSION` → **"bridge-3.2.0"**.
4. On the live site after deploy, Firebase Console → Functions → `fetchJd` → Logs shows one line per link read, with website name, success/failure and word count only.
