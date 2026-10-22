# Resume Fit Score™ v3 — Diagnosis & Fix Report
*My Career Company · /ResumeFitScore · October 2026 · Engine RFS-3.0.0*

## Summary

The current engine gives similar scores and similar advice to everyone for structural reasons, and the code in `script.js` confirms each one.

- **Six of the eight dimensions are scored against the whole page instead of the evidence.** Contact, Sections, Quantified Impact, Bullet Length, Page Length and ATS max out for almost any complete MBA CV. Your own `SAMPLE_MBA_RESUME` earns 75 of 100 points before the JD is considered, and scores 80–92 against Consulting, Marketing, Legal, General Management, ESG and Senior Sales alike, "Strong" for all but ESG.
- **"Action Verbs vs Weak Phrases" is close to unwinnable.** It counts every line of 4+ words as a bullet and requires 60% of those lines to start with one of 49 American-spelled verbs. Across 25 test resume–JD pairs it scored 0–5 out of 10. Your sample scores 2/10, and with Word's standard bullet symbol it scores 0/10.
- **Experience level is never used,** and 19 of the 28 domains have no rules of their own. Certifications and projects are fixed lists per role family, and rewrites use fixed verbs and fixed outcome lines.

v3 rebuilds all of these as a deterministic, client-side engine fed by your own JD Library, Recruiter Library and B-School Library. It plugs into the existing UI through a small bridge, and the old engine stays as an automatic fallback.

---

## 1. What is wrong — confirmed in `script.js`

All figures come from running your actual functions (copied verbatim into `test/legacy-actual.js`) on your sample resume and nine test profiles.

| Area | Root cause in code | Effect |
|---|---|---|
| **Action verbs (D4)** | `extractBullets()` treats every line of 4+ words as a bullet: education rows, role headers, skills lines, even "SCHOLASTIC ACHIEVEMENTS & AWARDS". `strongVerbShare` must reach 60% of *all* those lines. `STRONG_ACTION_VERBS` has 49 entries, all American spellings: no *analysed, optimised, organised, managed, created, conducted, launched, grew, won, secured*. Result-first IIM bullets ("₹1.8 Cr opportunity…", "Winner, …") can never count. The glyph regex misses Word's Symbol-font bullet (U+F0B7) and "●", so the first "word" is the glyph. Then −1 for each weak phrase *anywhere* in the text, including "handled" | Your sample: 27 "bullets", 7 strong openers → **2/10**. Same CV with Word bullets → **0/10**. 25 test pairs: **0–5/10** |
| **Same score across JDs** | D1, D2, D3, D5, D6, D8 = 75 pts, all JD-independent. Section regexes match words anywhere ("experience" in a summary counts as the Experience section). D3 counts *any* number, including CGPA and percentages. D8's "fragment" check can never fail because fragments are already filtered out. Level is never used | Same resume across 6 JDs moved only 3–12 points. A 2-year consulting CV is "Strong" for Legal (89) and Senior Sales (87) |
| **Role keywords (D7)** | Even library JDs are run through `extractKeywordsFromJd()`, which adds every capitalised word of the `formatJdText()` output as a "competency". That includes the template's own labels: "Campus", "Target", "Typical", "Sub-areas", "GM-CAMPUS" | Noise inflates D7 for everyone. Missing-keyword chips show filler words |
| **32 JDs default to Consulting** (confirmed in `jd-database.js`) | `getScoringRoleFamily()` returns `scoring.roleFamily` unchanged. For GM, Legal, PR & Comms, Entrepreneurship, Real Estate, Public Policy, ESG and Energy that value is `"other"`, which `script.js` has no entry for, so every lookup falls back to Consulting. Even GM never uses the existing `genman` list | These 32 JDs get Consulting keywords, the Consulting banner, Consulting certifications and projects, and Consulting rewrite templates. The suitability box can never find the target, so it prints "highest affinity for X, whereas your target role is X" |
| **Priority fixes** | Ranked only by raw points lost. D4 is structurally low, so "Action Verbs" is Priority 01 for almost every user. There are 8 fixed advice templates per dimension. Four fixes always show, even trivial ones ("add a Certifications heading") | Same top fixes for everyone |
| **Certifications & projects** | Rendered straight from `DOMAIN_METADATA[role].certifications/projects`: 5 + 4 fixed items per family. Some entries are not certifications ("Bain Case Prep"), and "AWS Certified Data Analytics – Specialty" was retired by AWS in 2024 | Identical for every user in a family, regardless of level, JD gaps or what the CV already shows |
| **Bullet rewrites** | `generateBulletRewrites()` picks from *all* lines (including headers, education and skills), treats "Managed" as weak, replaces the user's verb with the i-th canned verb, and appends the i-th canned outcome with specific-looking numbers | Actual outputs: "Secured b.Sc. \| Kerala University \| 2016, expanding Tier-1 key account ARR by [35% / ₹4.8 Crore]…", "Spearheaded reviewing client operations reports…", "Appraised participated in college fest, evaluating DCF scenarios…" |
| **Domain suitability (resume)** | Only 9 families. Title keywords match anywhere in the text: "sql", "python", "tableau" count as Analytics *titles*; "leadership" counts as General Management. 18 keywords per family, a floor of 20 and +10 for everyone. No use of employers, internships, specialisation, college or level | IIM marketing fresher's top domain = **Analytics 40**. Tier-3 finance CV = **every domain 20**. XLRI HR fresher's top = Analytics |
| **Domain detection (JD)** | Only 9 families can be returned. Raw additive counts over the whole JD, including boilerplate. No level detection | Gets plain-title JDs right (ABM, Credit Analyst). Misses "Management Trainee – Sales" (→ General Management), and ESG / Hospital / Quick-commerce JDs (→ Operations / Analytics) |

> Two corrections to my previous message. The master context docs describe a few details that differ from the live code. The live detector does not treat the word "digital" alone as Marketing, and it does classify Credit Analyst correctly.

---

## 2. The v3 engine

### 2.1 Fit Score: 10 vectors, weighted by the target JD's level

| # | Vector | Campus | Early | Mid | Senior | What it measures |
|---|---|---|---|---|---|---|
| V1 | JD Skill & Must-Have Match | 22 | 24 | 22 | 20 | Weighted coverage of the JD's must-haves (×3), keywords (×1.5) and tools. Credit is 1.0 in an experience bullet, 0.55 if only in the Skills list |
| V2 | Role & Domain Alignment | 5 | 10 | 12 | 14 | Title alignment plus domain suitability for the JD's domain |
| V3 | Experience & Level Fit | 11 | 10 | 12 | 12 | Relevant months vs JD minimum; Campus uses internship and project relevance |
| V4 | Quantified Impact | 14 | 15 | 15 | 15 | Outcome metrics (₹, %, x, rank, time, before→after) in content bullets only, weighted by JD relevance |
| V5 | Bullet Strength | 10 | 9 | 8 | 7 | Per-bullet classifier (below) |
| V6 | Leadership, PoR & Achievements | 12 | 10 | 11 | 13 | Campus: PoR tier and scale, competitions, ranks, PPO/PPI. Mid/Senior: team size, P&L/budget, promotions |
| V7 | Education & Credentials | 9 | 7 | 5 | 4 | Degree gate, specialisation and JD-preferred certifications. CGPA and college tier are **not scored**, per the JD Library rule "advice only" |
| V8 | Structure, Sections & Contact | 7 | 6 | 6 | 6 | Level-specific expected sections; a Certifications heading is never required |
| V9 | Length & Bullet Discipline | 5 | 5 | 5 | 5 | 1 page for Campus/Early (≤650 words) and 2 for Mid/Senior; bullets of 8–32 words |
| V10 | ATS Parse Health | 5 | 4 | 4 | 4 | Garbled text, headings, dates, line fragmentation |

The JD-dependent share is 38–46 points, up from 15. Weights are then adjusted by role family and renormalised. For example, consulting gives Leadership ×1.25; finance gives Credentials ×1.3 and Impact ×0.9 (deal or model scope counts); sales gives Impact ×1.3; analytics gives Skills ×1.25.

**Gates:**
- Your Role-Keyword governance rule is kept: Strong is capped to Moderate when fewer than 40% of must-haves are evidenced.
- A JD minimum 18+ months above the candidate's experience caps the score at 69.
- An experienced profile applying to a Campus JD (over-qualified) caps it at 72.
- A missing required degree or credential caps it at 69.
- An unparseable file caps it at 60.

The bands are unchanged (75 / 55).

### 2.2 Bullet Strength (replaces Action Verbs vs Weak Phrases)
Only real bullets in Experience, Internship, Project, PoR and Achievement sections are scored. Wrapped lines are re-joined, and all glyphs are handled, including Word's U+F0B7.

| Class | Example | Points |
|---|---|---|
| Strong verb + outcome | "Grew revenue ₹185 Cr → ₹246 Cr…" | 1.00 |
| Result-first (IIM) | "₹1.8 Cr opportunity sized via…" | 1.00 |
| Noun-phrase achievement | "National Semi-finalist, HUL L.I.M.E…", "Promoted…", "PPI…" | 0.85 |
| Strong verb, scale only / none | "Managed 26 distributors…" | 0.80 / 0.72 |
| Neutral verb | "Prepared…", "Coordinated…" | 0.50–0.72 |
| Weak opener (first 4 words only) | "Responsible for…", "Worked on…" | 0.20 (0.45 with a metric) |

Other rules:
- Verbs are matched by lemma, and British and American spellings are both handled through a dictionary of 188 strong and 31 neutral verbs.
- IIM PoR lines ("Head, Club: led…") are judged by the clause after the colon.
- A repetition penalty applies, and the score has a 15% floor.

Results: a decent IIM CV scores about 85%, the Tier-3 duties-style CV 43%, and your sample 87%.

### 2.3 Domain detection

**From the JD (all 28 domains):**
- The JD is split into zones: title (0.40), responsibilities (0.30), requirements (0.22), body (0.08). "About us", benefits and EEO text are stripped.
- Term weights are IDF-weighted lexicons built from your 112 JD records, so generic terms like Excel or CRM count for almost nothing.
- Title dictionaries recognise function words inside generic titles, e.g. "Management Trainee – **Sales**". Hybrid titles such as "Product Analyst" are decided by the body text.
- The output is a primary domain, a secondary and an industry, each with confidence (Low triggers "please confirm").
- Level comes from the years stated, with a title fallback ("Assistant Brand Manager" → Campus). Link-only JDs are read from the URL slug.

**From the resume (Domain Suitability Meter):** ten signals, weighted by the user's level.

| Signal | Campus | Early | Mid | Senior |
|---|---|---|---|---|
| Job titles (recency-decayed) | .06 | .22 | .28 | .30 |
| Employers (Recruiter Library, only when title/bullets agree) | .06 | .14 | .17 | .18 |
| Experience-bullet vocabulary | .18 | .24 | .26 | .26 |
| Internships & projects | .26 | .10 | .03 | 0 |
| MBA specialisation | .14 | .08 | .05 | .03 |
| UG degree | .07 | .05 | .03 | .02 |
| Certifications | .06 | .06 | .06 | .05 |
| Clubs & competitions | .09 | .05 | .02 | .01 |
| Institute strengths (only the 170 evidence-based tags) | .03 | .01 | 0 | 0 |
| Skills list | .05 | .05 | .10 | .15 |

How the signals are applied:
- **MBA students with prior experience** use a 50/50 blend of Campus and their own level's weights.
- **Generic titles** (Analyst, Associate, Manager, Intern…) borrow the company's hiring profile, but only when the title names no function.
- **College tags:** 86% of the B-School Library's "best domain" entries are the default "Marketing; Finance; HR", so they are ignored.
- **Retail banking:** "Retail banking/assets" is treated as BFSI, not Retail.
- **Output:** all 28 domains with Strong / Moderate / Developing tiers, a confidence level, a past-vs-emerging switcher flag, and a Synergy / Adjacent / Pivot / Developing insight.

### 2.4 Priority Fixes
- **Candidates:** 15 fix families, each triggered by a detected gap: JD terms only in Skills, missing must-haves, quantification, weak openers, verb repetition, title/headline, internship framing, leadership scope, level mismatch, certification gap, specialisation, sections and contact, generic objective, length, and parse issues.
- **Ranking:** by estimated points recovered (weight × gap × feasibility), at most one per family. Fixes worth under 0.8 points are dropped. If only one or two fixes matter, only one or two are shown.
- **Personalisation:** every fix quotes the user's own bullet and/or the JD's own must-haves, uses that domain's metric menu and verbs, and is written for the user's level. For example, Mid/Senior users get "state team size and ₹ budget" instead of "add a PoR".

### 2.5 Certifications, projects and competitions
- **Certifications:** drawn from a 29-item India catalogue with cost, time, credibility and a verify link.
  - Each is scored by whether the JD prefers it (from your library's `certifications.preferred`), whether it closes the user's actual gaps, domain fit and credibility.
  - Conditional regulatory credentials (NISM XV, V-A, VIII, IC-38) appear only when the JD involves that activity.
  - Experience-gated ones (PMP, CCBA and others) follow your library's rules.
  - Items the CV already shows are dropped, and at most one expensive credential is suggested.
  - If nothing closes a gap, the UI says so instead of padding the list.
- **Projects:** a 50-project bank across all 28 domains, ranked by the user's gaps, with time and proof artefact. Mid/Senior users get workplace initiatives instead of student projects.
- **Competitions:** filtered by domain, with invite-only ones shown only to Tier-1 schools, and always labelled "verify current season dates".

### 2.6 Bullet rewrites
- **Selection:** only bullets that need work are rewritten. Headers, education rows, achievements and already-strong bullets are excluded, and at most two are taken per role.
- **Cleanup:** weak openers are removed honestly. "Helped the credit team in analysing…" becomes "Analysed … for the credit team", with an ownership check. Gerunds are converted and the user's verb is kept.
- **Outcome clause:** chosen by role family × object type (hiring, research, campaign, sales, process, delivery and others). It never repeats a count the bullet already has and is never reused within one report.
- **Placeholders:** used only, such as [X%] or [₹X Cr], listed as "fill in from your own records", with a PlaceCom proof reminder.
- **Result-first alternative:** every rewrite also comes with an IIM-style result-first version.

---

## 3. Test results (`node test/run-regression.js`)

| Resume | JD | Current | v3 |
|---|---|---|---|
| Your SAMPLE_MBA_RESUME | CON / MKT / LEG / GM / ESG CAMPUS · SAL-SENIOR | 92 / 85 / 87 / 85 / 80 / 89 (Strong except ESG) | **92 / 66 / 64 / 80 / 62 / 46** (SAL-SENIOR gated: level gap) |
| IIM marketing fresher | MKT-CAMPUS / FIN-CAMPUS | 86 / 83 | 89 / 69 |
| Tier-3 finance fresher | Credit Analyst JD / MKT-CAMPUS | 47 / 44 | 57 / 36 |
| 8-yr Regional Sales Manager | SAL-MID / SAL-CAMPUS | 73 / 76 | **85 / 68** (over-qualified) |
| 13-yr Head HR | HR-SENIOR | 66 | **85** |
| XLRI HR fresher | HR-CAMPUS / LEG-CAMPUS / ESG JD | 74 / 66 / 67 | 73 / 54 / 55 |

| Check | Current | v3 |
|---|---|---|
| Action-verb dimension across 25 pairs | 0–5 / 10 | Bullet Strength 40–95% (tracks bullet quality) |
| Same resume, different JDs (spread) | 3–10 pts | 16–25 pts |
| JD domain correct (8 test JDs) | 4 of 8 | 8 of 8 (plus level) |
| Resume top domain correct (6 profiles) | 3 of 6 | 6 of 6 |
| Distinct fix types across 25 reports | Same top fix (Action Verbs) almost everywhere | 10 fix families. The most common, "must-have gap", names different JD terms each time |

---

## 4. Updated "Mode A" prompt (replace §9 in the Master Ecosystem Context)

```text
You are the Chief Diagnostic Evaluator at My Career Company (www.mycareercompany.com/ResumeFitScore).
Apply the Resume Fit Score v3 rubric. Weights depend on the TARGET JD level (Campus/Early/Mid/Senior):
V1 JD Skill & Must-Have Match 20–24 · V2 Role & Domain Alignment 5–14 · V3 Experience & Level Fit 10–12 ·
V4 Quantified Impact 14–15 · V5 Bullet Strength 7–10 · V6 Leadership, PoR & Achievements 10–13 ·
V7 Education & Credentials 4–9 · V8 Structure & Contact 6–7 · V9 Length & Bullet Discipline 5 · V10 ATS Parse Health 4–5.
Rules: score only real bullets; result-first IIM bullets and noun-phrase achievements count as strong; weak phrases count only
as openers; never score CGPA or college tier; Campus/Early = 1 page, Mid/Senior = 2 pages.
Gates: Strong requires ≥40% of the JD's must-haves evidenced (else cap at Moderate); experience 18+ months below the JD
minimum → cap 69; over-qualified for a Campus JD → cap 72; missing required degree/credential → cap 69.
Output: score and band; vector table; up to 4 priority fixes ranked by points recoverable, each quoting the candidate's own
sentence and the JD's own requirement; rewrites using placeholders only ([X%], [₹X Cr]) — never invent numbers, employers,
tools or outcomes; certifications/projects only where they close a stated JD gap; domain suitability across the 28 MCC
domains with Synergy / Adjacent / Pivot insight. Never promise placement.
```

---

## 5. Limits and next steps

1. **Weights are calibrated priors, not fitted on outcomes.** Once you have about 300 assessments with shortlist outcomes or reviewer ratings, run the calibration plan already in your Master Project Context (§9): Spearman ≥ 0.6 against reviewers, and keep weights within ±50% of these priors.
2. **`jd-database.js` has been checked.** `JD_DATABASE.LIBRARY` holds the 112 v2 records the engine was tested against, and the "before" numbers in this report now use your real `formatJdText()` and `getScoringRoleFamily()`. `getScoringRoleFamily()` returns `"other"` for 32 JDs; INTEGRATION.md Edit G fixes this for the legacy fallback path. The bridge also honours edits: if a user changes the loaded benchmark text, v3 scores their edited text while keeping the chosen domain and level.
3. **Prices and competition windows are dated October 2026** and marked "verify" in `rfs-v3-content.js`. Re-check them each placement season, along with the PMI rule change on 1 Dec 2026.
4. **Test data is synthetic.** Before go-live, run 20–30 real (consented) CVs from your Repository through `test/run-regression.js` and have a founder review the fixes and rewrites.
5. **Track after launch:**
   - per-level score standard deviation (≥ 10)
   - share of identical top fixes across users (< 10%)
   - rewrites containing numbers not in the original (must be 0)
   - share of JDs flagged low-confidence
