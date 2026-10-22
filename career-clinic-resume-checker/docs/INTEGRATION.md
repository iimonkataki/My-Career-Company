# Resume Fit Score™ v3 — Integration Guide (career-clinic-resume-checker)

Everything still runs 100% in the browser. No new libraries, no API calls, no resume text leaves the device. The old engine stays in `script.js` as an automatic fallback, so you can roll back by removing the script tags.

## 1. Copy the files

```
career-clinic-resume-checker/
├── fit-engine-v3.js            ← scoring, fixes, rewrites, domain detection
├── rfs-v3-bridge.js            ← converts v3 output to the shape renderResults() already uses
└── data/
    ├── rfs-v3-content.js       ← verbs, synonyms, weights, certification & project catalogues (hand-edited)
    ├── rfs-v3-companies.js     ← 750 recruiters → domains (generated from the Recruiter Library)
    └── rfs-v3-schools.js       ← 1,256 B-schools → tier (generated from the B-School Library)
```
Regenerate the two generated files whenever the Excel libraries change: `python3 tools/build_data.py`.

## 2. index.html — add before the existing `script.js` tag

Use the same path style as your existing tags. With the `/ResumeFitScore/...` style:
```html
<script src="/ResumeFitScore/data/rfs-v3-content.js"></script>
<script src="/ResumeFitScore/data/rfs-v3-companies.js"></script>
<script src="/ResumeFitScore/data/rfs-v3-schools.js"></script>
<script src="/ResumeFitScore/fit-engine-v3.js"></script>
<script src="/ResumeFitScore/rfs-v3-bridge.js"></script>
```

## 3. firebase.json — add rewrites ABOVE the `/ResumeFitScore/**` catch-all

Without these, the catch-all rewrites the new script URLs to `index.html` and the engine silently fails to load. Add them to the root `firebase.json`, and to the sub-directory one if you deploy from there.
```json
{ "source": "/ResumeFitScore/fit-engine-v3.js", "destination": "/career-clinic-resume-checker/fit-engine-v3.js" },
{ "source": "/ResumeFitScore/rfs-v3-bridge.js", "destination": "/career-clinic-resume-checker/rfs-v3-bridge.js" },
{ "source": "/ResumeFitScore/data/rfs-v3-content.js", "destination": "/career-clinic-resume-checker/data/rfs-v3-content.js" },
{ "source": "/ResumeFitScore/data/rfs-v3-companies.js", "destination": "/career-clinic-resume-checker/data/rfs-v3-companies.js" },
{ "source": "/ResumeFitScore/data/rfs-v3-schools.js", "destination": "/career-clinic-resume-checker/data/rfs-v3-schools.js" },
```

## 4. script.js — six small edits (plus one in jd-database.js)

**Edit A · `handleExecuteDiagnostic()` — replace the scoring call.** Find:
```js
const diagnosticResult = scoreResume(textToAnalyze, numPages, state.targetRole, jdTextToAnalyze);
```
Replace with:
```js
let diagnosticResult;
try {
  diagnosticResult = window.RFSv3Bridge.score({
    text: textToAnalyze, numPages: numPages,
    candidateType: state.candidateType, institutionName: state.institutionName,
    jdTab: state.jdTab, jdObject: state.currentJdObject, jdText: jdTextToAnalyze,
    jdTitle: jdCustomTitle, jdUrl: state.jdUrl
  });
  state.targetRole = diagnosticResult.targetRoleKey;
} catch (e) {
  console.warn('[RFS v3] falling back to legacy engine:', e);
  diagnosticResult = scoreResume(textToAnalyze, numPages, state.targetRole, jdTextToAnalyze);
}
```

**Edit B · same function — stop forcing DOCX to "1 page".** Find `numPages = state.fileNumPages || 1;` and change it to `numPages = state.fileNumPages;`. DOCX files have no page count, so `|| 1` currently gives every DOCX full page-length marks. The same CV pasted as text is scored on word count instead.

**Edit C · `renderResults()` — personalised domain block, certifications and projects.** Find:
```js
const targetRoleKey = state.targetRole || 'consulting';
const roleMeta = DOMAIN_METADATA[targetRoleKey] || DOMAIN_METADATA['consulting'];
```
Replace with:
```js
const targetRoleKey = result.targetRoleKey || state.targetRole || 'consulting';
const roleMeta = (result.v3 && window.RFSv3Bridge)
  ? window.RFSv3Bridge.roleMeta(result)                       // JD-, level- and resume-specific certs & projects
  : (DOMAIN_METADATA[targetRoleKey] || DOMAIN_METADATA['consulting']);
```
The existing certification, project, banner, keyword-title and rewrite-tag code then renders the personalised content unchanged.

**Edit D · `renderResults()` strengths — use v3 evidence text.** Inside `for (const s of result.strengths)`, right after the `switch (s.id) { … }` block, add:
```js
if (s.detail) realDetail = escapeHtml(s.detail);
```

**Edit E · `renderResults()` suitability insight.** Replace the `if (suitabilityRecruiterBox) { … }` block with:
```js
if (suitabilityRecruiterBox) {
  const ins = ds.insight;
  if (ins) {
    const cls = ins.kind === 'SYNERGY' ? 'synergy' : 'pivot';
    const lead = { SYNERGY: 'High Profile Synergy', ADJACENT: 'Adjacent Domain Strength', PIVOT: 'Pivot Alert', DEVELOPING: 'Developing Fit' }[ins.kind];
    suitabilityRecruiterBox.className = 'suitability-recruiter-box ' + cls;
    suitabilityRecruiterBox.innerHTML = `<div class="insight-lead">&#127919; <strong>Recruiter Strategic Insight &bull; ${lead}:</strong></div><p>${escapeHtml(ins.message)} (${escapeHtml(ins.label)}, confidence ${escapeHtml(ds.confidence || '')}).</p>`;
  } else {
    /* keep the existing synergy / pivot code here */
  }
}
```

**Edit F · repository report modal — field names.** In `openReportModal()` the fixes template reads `f.name` and `f.loss`. v3 fixes use `dimensionName`. Change the title line to:
```js
<div class="fix-title">${escapeHtml(f.name || f.dimensionName)}${f.loss != null ? ' (' + f.loss + ' pts lost)' : ''}</div>
```
Also change the modal heading "Evaluation Vectors (8 Dimensions)" to `Evaluation Vectors (${(rep.dimensions || []).length} Dimensions)`.

**Edit G · `jd-database.js` — stop 32 JDs falling back to Consulting.** Today `getScoringRoleFamily()` returns `"other"` for GM, LEG, PRC, ENT, RE, PPD, ESG and ENR. `script.js` has no `"other"` entry, so the legacy fallback and every `DOMAIN_METADATA[state.targetRole]` lookup silently use Consulting. Replace the function with:
```js
function getScoringRoleFamily(j) {
  if (!j || !j.scoring || !j.scoring.roleFamily) return 'consulting';
  var f = j.scoring.roleFamily;
  if (f !== 'other') return f;
  // same mapping as RFSv3Bridge.LEGACY_KEY, so the legacy and v3 paths agree
  return ({ GM: 'genman', ENT: 'genman', PPD: 'genman', ESG: 'genman', LEG: 'genman', PRC: 'marketing', RE: 'finance', ENR: 'operations' })[j.domainCode] || 'genman';
}
```
v3 itself doesn't need this, because it uses all 28 domain codes directly. Edit G only fixes the fallback and the repository's `targetRole` field.

**No change needed for edited benchmark text.** If a user edits the benchmark JD loaded in the text box, the bridge compares it with `JD_DATABASE.formatJdText()`. It scores the edited text while keeping the selected domain and level (`result.jdMode` shows `"custom (edited benchmark)"`).

## 5. Optional but recommended

1. **JD intake labels.** In `handleJdFileSelected()`, `registerJdUrl()` and the detection block in `handleExecuteDiagnostic()`, replace `detectDomainFromJd(text, title, file)` with:
   ```js
   const det = window.RFSv3Bridge ? window.RFSv3Bridge.detectJd(text, title, state.jdUrl) : null;
   const detectedDomain = det ? det.legacyKey : detectDomainFromJd(text, title, file);
   ```
   In the link status note, show `det.label` (e.g. "ESG & Sustainability · Campus"). The legacy detector can only return 9 role families and cannot detect the 19 other domains.
2. **Low-confidence JDs.** When `result.v3.jd.askUser` is true, show "We read this JD as {domainName}. Change?" and re-run with `domainOverride: '<CODE>'` passed to `RFSv3Bridge.score()`.
3. **UI copy.** Replace "8-Dimension" and "18 Core Competencies" labels. The engine now uses 10 vectors and the JD's own skill list (`result.roleKeywordList.length` terms).
4. **New blocks.** Advisories (`result.v3.advisories`, e.g. over-qualified), gates (`result.v3.gates`) and the result-first rewrite alternative (`rewrite.afterResultFirst`) are in the result. Render them when convenient.

## 6. Test before deploying

```
node test/run-regression.js            # summary: current production logic vs v3
node test/run-regression.js --detail   # every vector, fix, certification, project and rewrite
```
Then, in the browser, open `/ResumeFitScore#sample`. With the CON-CAMPUS benchmark the sample resume should show 92 Strong. Switching the benchmark to LEG-CAMPUS should give about 63, and SAL-SENIOR about 45 with a level-gap note.
