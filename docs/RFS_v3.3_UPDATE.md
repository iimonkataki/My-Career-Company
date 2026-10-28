# Resume Fit Score™ v3.3: Update Notes

## What this update does
1. **Fixes "0% in Product Management" and similar errors.**
   - Two-column PDFs are now read column by column (scrambled text was the most likely cause).
   - Title variants are recognised for every domain, for example PM, APM, Senior PM, Product Owner, TPM, ASM, KAM, HRBP, FP&A.
   - An evidence floor stops a resume with real domain vocabulary from ever showing about 0%.
   - All 27 domains are returned, so the results page always finds the right one.
2. **Removes Entrepreneurship from domain suitability.** Founder experience now shows as a badge instead.
3. **Removes the JD link option from Input C.** It is hidden; Upload JD, Paste JD and Choose company/domain/level stay as they are.
4. **Adds new sections to the diagnostic page:**
   - ATS Score: parse-ability 40, structure 25, searchability 35.
   - Formatting issues found in your resume: two columns, tables, text boxes, contact in the header/footer, images/icons, fonts, file size, scanned PDF, dates, headings, contact, symbols.
   - ATS Optimizer Suggestions (no headline advice).
   - Common ATS formatting mistakes.
   - Best resume fonts & formatting.
   - LinkedIn Profile Optimizer, from LinkedIn's "Save to PDF" file or pasted text.

Everything runs in the browser. No server, Firebase or `firebase.json` change is needed.

## Assumptions and limits (please review)
- **I did not have your friend's resume.** I tested four PM resume styles, unusual PM titles and a scrambled two-column PDF; all now score 60–91 in Product Management.
  - If that resume still scores low, open the new **ATS Score** card: it will show whether the PDF is two-column or scanned.
  - In the browser console (F12) you should see the line `[RFS] engine RFS-3.3.0 …`. If it is missing, the website is still using the old engine.
- **LinkedIn profiles are not read from a URL.** LinkedIn's User Agreement prohibits scraping, and profiles need a login. Users upload LinkedIn's own "Save to PDF" file or paste their sections. The URL box only checks whether the URL is a custom one.
- **LinkedIn suggestions do mention the LinkedIn headline** (the line under your name on LinkedIn). This is a LinkedIn field, not the resume headline you asked to remove. Tell me if you want it removed too.
- **Weights are starting values.** This covers ATS 40/25/35, LinkedIn 20/15/20/15/30, and the 80/65/50 bands, which follow competitor practice. Calibrate them on about 150–300 real resumes rated by your team.
- **Some layout checks are heuristics:**
  - Column detection, table detection and header/footer contact detection in PDFs use text positions.
  - In Word files these checks are exact (they read the file's XML).
  - Old `.doc` files only get text checks.
- **"ATS rejects 75% of resumes" is a myth** and is not used anywhere. The ATS card says the score is about readability and search, not pass/fail.
- **The v3.2 JD-link reader is no longer needed.** If you installed it, it stays, unused. If you didn't, skip it.

## Changes on the website
**Files replaced** (in `career-clinic-resume-checker/`): `fit-engine-v3.js`, `rfs-v3-bridge.js` (now also contains the ATS module), `data/rfs-v3-content.js`, `data/rfs-v3-companies.js`, `data/rfs-v3-schools.js`, `index.html`.

**`index.html` changes** (your 22 Oct file plus the earlier v3.1/v3.2 text fixes):
- The "Share a JD link" tab is hidden.
- The Input C description reads "Upload or paste a JD, or choose a domain benchmark".
- A new empty `<div id="rfsExtraDiagnostics"></div>` sits above the disclaimer.
- Script tags use `?v=3.3`.

**`script.js`: 4 small edits.** Edits 2–4 may already be in place from v3.1; if so, skip them.

### Edit 1 · `script.js` → `parsePdfFile()`: read two-column PDFs correctly (new)
**Find**, inside the loop over pages:
```js
        const textContent = await page.getTextContent();
```
**Add directly below it:**
```js
        const rfsPageText = (window.RFSv3Bridge && window.RFSv3Bridge.pageText) ? window.RFSv3Bridge.pageText(textContent.items, page.view[2] - page.view[0]) : null;
```
**Then find** the line in the same loop that adds the page's `text` to the full text (for example `fullText += text + '\n';`) and **add directly above it:**
```js
        if (rfsPageText) text = rfsPageText;   // v3.3: read two-column resumes column by column
```
(If `text` is declared with `const`, change it to `let`. If the variable names differ, use the matching ones.)

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

### Edit 3 · `script.js` → `renderResults()`: report header shows only the date
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

### Edit 4 · `script.js` → `renderResults()`: banner subtitle (no "1 words", no "18 competencies")
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

## How to check it worked
1. `node test/run-regression.js` should end with **"20 / 20 checks passed (incl. v3.3)"**.
2. `node test/test-ats.js` should end with **"15 / 15 ATS-diagnostics checks passed"**.
3. In the browser, run a diagnostic. Press F12 → Console; you should see `[RFS] engine RFS-3.3.0 · bridge bridge-3.3.0 · top domains: …`.
4. Below the domain suitability meter you should see the ATS Score, Formatting issues, ATS Optimizer Suggestions, Common mistakes, Fonts & formatting and LinkedIn Optimizer sections.
5. On the landing page, Input C shows only "Choose company, domain & level" and "Upload or paste a JD".
