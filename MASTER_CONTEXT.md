# MY CAREER COMPANY — MASTER ECOSYSTEM CONTEXT FILE
**Complete Platform Architecture, Technical Specifications, Scoring Logics, JD Databases & Operations Manual**  
*Compiled for Engineering, Advisory, Operations, and AI Agent Continuity*  
*Version: 2026.10-PROD · Live at: [www.mycareercompany.com](https://www.mycareercompany.com) & [www.mycareercompany.com/ResumeFitScore](https://www.mycareercompany.com/ResumeFitScore)*

---

## 1. Executive Mission & Brand Identity

### 1.1 Organizational Mission
**My Career Company** is an institutional career-readiness partner and B-School clinical accelerator. Its core mandate is solving the critical **Readiness Gap** between premier business school academic curricula (MBA, PGDM, EPGP, executive programs in India) and Tier-1 recruiter hiring standards across Management Consulting, Investment Banking, Product Management, General Management, Corporate Strategy, and Marquee FMCG/Tech firms.

- **Tagline**: *"PEOPLE | GUIDANCE | OPPORTUNITIES"*
- **Clinical Philosophy**: *"Diagnose. Prepare. Practise. Perform."*
- **Institutional Proposition**: *"You bring opportunities, we prepare students to convert them."*
- **Advisory Governance**: Non-speculative, consulting-grade preparation. Never makes guaranteed-placement claims; enforces rigorous empirical assessment metrics.

### 1.2 Visual Identity & Design System Tokens

Both web properties share a unified luxury consulting aesthetic inspired by IIM Executive Education, McKinsey, and top-tier management advisory firms.

| Token Name | CSS Variable | Hex / Value | Strategic UI Purpose |
|---|---|---|---|
| **Deep Forest Deep** | `--color-bg-deep` / `--color-forest-deep` | `#05261F` | Base background, login gate, footers, dark section fills |
| **Primary Forest Green**| `--color-bg-primary` / `--color-forest` | `#073D32` | Primary branding, hero blocks, site headers, cards |
| **Surface Green** | `--color-bg-surface` | `#0A493D` | Elevated surfaces, intake panels, modal surfaces |
| **Card Green** | `--color-bg-card` | `#0D5245` | Component containers, dropzones, metric boxes |
| **Card Hover** | `--color-bg-card-hover` | `#105E50` | Interactive card hover states, active selections |
| **Champagne Gold** | `--color-gold-primary` / `--color-gold` | `#D4AF7C` | Primary CTAs, score meters, accents, active tabs |
| **Light Gold** | `--color-gold-light` | `#F1DEC3` | Stat counters, high-visibility badges, card titles |
| **Dark Gold** | `--color-gold-dark` | `#A37F4B` | Subtle borders, active outline focus rings |
| **Ivory White** | `--color-text-primary` / `--color-ivory`| `#F8F6EF` | Primary headings, button text, clean background cards |
| **Secondary Text** | `--color-text-secondary` | `#D2D5CA` | Descriptive paragraphs, subtitles, table text |
| **Muted Text** | `--color-text-muted` | `#95A199` | Timestamps, footnote disclaimers, inactive tabs |
| **Strong Green** | `--color-strong` | `#2BB673` | Strong fit score band (75-100), verified badges |
| **Moderate Amber** | `--color-moderate` | `#E6A23C` | Moderate fit score band (55-74), advisory warnings |
| **Needs Work Red** | `--color-needs-work` | `#E75D5D` | Needs Work band (0-54), critical priority fixes |
| **Primary Font** | `--font-family` | `Montserrat, sans-serif`| Universal typography across all headings, stats & body |

### 1.3 Viewport & Mobile Webview Responsive Standards
- **Viewport Meta**: `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover">`
- **Containment Guarantees**:
  - Zero `100vw` units (replaced with strict `100%` and `max-width: 100%`) to prevent horizontal clipping in mobile browsers and in-app webviews (WhatsApp, LinkedIn, Instagram).
  - Global `overflow-x: hidden; overflow-x: clip;` on `html` and `body` to stop horizontal jitter and wobble.
  - Native momentum touch: `touch-action: pan-y pinch-zoom; -webkit-overflow-scrolling: touch;` on body.
  - Horizontally scrollable elements (`.header-nav`, `.mini-tabs`, `.jd-level-pills`, `.access-table-container`) explicitly declare `touch-action: pan-x; -webkit-overflow-scrolling: touch;`.

---

## 2. Infrastructure, Hosting & Repository Architecture

### 2.1 Workspace Structure
The monorepo is hosted at **`C:\AntiGravity`** (Git repository: `https://github.com/iimonkataki/My-Career-Company.git`, branch `main`).

```
C:\AntiGravity\
├── index.html                    # Root Landing Page (www.mycareercompany.com)
├── readiness-gap.html            # /readiness-gap
├── framework.html                # /framework
├── career-clinic.html            # /career-clinic
├── readiness-score.html          # /career-clinic/readiness-score & /readiness-score
├── placement-plan.html           # /career-clinic/placement-plan & /placement-plan
├── students.html                 # /students
├── institutions.html             # /institutions
├── leadership.html               # /leadership
├── experience.html               # /experience
├── contact.html                  # /contact (Pilot Booking & Lead Capture)
├── firebase.json                 # Production Firebase Hosting Rewrites & Headers
├── firestore.rules               # Cloud Firestore Security Rules
├── firestore.indexes.json        # Database Composite Indexes
├── storage.rules                 # Cloud Storage Access Rules
├── css/
│   └── style.css                 # Master Design System for 11 institutional pages
├── js/
│   ├── app.js                    # Mobile nav, accordion drawers, interactive gauges
│   └── firebase-leads.js         # Lead submission engine syncing with Firestore
├── assets/                       # Brand logos, avatars, icons, favicons
└── career-clinic-resume-checker/ # www.mycareercompany.com/ResumeFitScore
    ├── index.html                # 3-View Diagnostic, Repository & Access Application
    ├── style.css                 # Dedicated CSS for Resume Fit Score Portal
    ├── script.js                 # 8-Dimension Evaluation Engine, Parser, Rewrites
    ├── jd-database.js            # 112 Level x Domain JDs + 137 Role JDs Library
    ├── repository-service.js     # Firestore sync, deduplication, offline cache
    ├── auth-guard.js             # Google OAuth Popup, Whitelist, Access CRUD
    ├── notify-team.js            # Evaluator alert script
    ├── brand-logo.png            # Official institutional header emblem
    └── firebase.json             # Sub-directory Firebase configuration
```

### 2.2 Firebase Production Environment
- **Project ID**: `my-career-company`
- **Project Number**: `496139507516`
- **Auth Domain**: `my-career-company.firebaseapp.com`
- **Storage Bucket**: `my-career-company.firebasestorage.app`
- **Analytics Measurement ID**: `G-6GK1XN2NKZ`
- **Live Edge CDN URLs**:
  - `https://www.mycareercompany.com`
  - `https://my-career-company.web.app`
  - `https://my-career-company.firebaseapp.com`

### 2.3 Edge URL Routing & Rewrites (`firebase.json`)
```json
{
  "hosting": {
    "public": ".",
    "cleanUrls": true,
    "trailingSlash": false,
    "rewrites": [
      { "source": "/career-clinic", "destination": "/career-clinic.html" },
      { "source": "/career-clinic/readiness-score", "destination": "/readiness-score.html" },
      { "source": "/career-clinic/placement-plan", "destination": "/placement-plan.html" },
      { "source": "/readiness-gap", "destination": "/readiness-gap.html" },
      { "source": "/framework", "destination": "/framework.html" },
      { "source": "/students", "destination": "/students.html" },
      { "source": "/institutions", "destination": "/institutions.html" },
      { "source": "/leadership", "destination": "/leadership.html" },
      { "source": "/experience", "destination": "/experience.html" },
      { "source": "/contact", "destination": "/contact.html" },
      { "source": "/readiness-score", "destination": "/readiness-score.html" },
      { "source": "/placement-plan", "destination": "/placement-plan.html" },
      { "source": "/ResumeFitScore/style.css", "destination": "/career-clinic-resume-checker/style.css" },
      { "source": "/ResumeFitScore/script.js", "destination": "/career-clinic-resume-checker/script.js" },
      { "source": "/ResumeFitScore/repository-service.js", "destination": "/career-clinic-resume-checker/repository-service.js" },
      { "source": "/ResumeFitScore/jd-database.js", "destination": "/career-clinic-resume-checker/jd-database.js" },
      { "source": "/ResumeFitScore/auth-guard.js", "destination": "/career-clinic-resume-checker/auth-guard.js" },
      { "source": "/ResumeFitScore", "destination": "/career-clinic-resume-checker/index.html" },
      { "source": "/ResumeFitScore/**", "destination": "/career-clinic-resume-checker/index.html" }
    ],
    "redirects": [
      { "source": "/resumefitscore", "destination": "/ResumeFitScore", "type": 301 },
      { "source": "/resumefitscore/**", "destination": "/ResumeFitScore", "type": 301 }
    ]
  }
}
```

---

## 3. The 11 Institutional Pages (`www.mycareercompany.com`)

| # | Route | Title | Core Narrative & Value Proposition | Key Elements & Interactivity |
|---|---|---|---|---|
| 1 | `/` | Home | Executive overview of My Career Company's mission and institutional partnerships. | Hero banner, Dean's Telemetry dashboard preview, 6-stage clinical methodology preview, sub-hero CTA. |
| 2 | `/readiness-gap` | Readiness Gap | Dissects the 4 structural disconnects between academic CGPA and recruiter shortlisting. | 4 Gap Cards (CV Metric Vacuum, Narrative Incoherence, Commercial Blindness, Casing Deficit). |
| 3 | `/framework` | Clinical Framework | The proprietary 6-stage clinical intervention model. | Interactive stages: Assess &rarr; Diagnose &rarr; Plan &rarr; Prepare &rarr; Simulate &rarr; Improve. |
| 4 | `/career-clinic` | Career Clinic | Flagship 5-Day Career Accelerator for premier B-School cohorts. | 5 Module Cards (Assessment, Preparation, Practice, Simulation, Feedback), Dean's Telemetry metrics. |
| 5 | `/career-clinic/readiness-score` | Readiness Score | The Career Readiness Score™ diagnostic methodology. | Animated circular gauge calibrated at 68/100, 7 vector breakdowns, rubric matrix. |
| 6 | `/career-clinic/placement-plan` | Placement Plan | Personal Placement Plan™ (PPP) roadmap. | 4 structured modules, 30-day preparation sprint timeline, deliverable checklist. |
| 7 | `/students` | Student Pillars | 5 core capability pillars required for Day-0 conversion. | 5 Pillars: CV Architecture, Personal Narrative, Commercial Acumen, Case Rigor, Group Discussion. |
| 8 | `/institutions` | Institutions | Institutional collaboration model for Deans and Placement Committees. | Dual-Stakeholder model (*"You bring opportunities, we prepare students to convert them"*), batch analytics. |
| 9 | `/leadership` | Leadership | Founding leadership profiles with verified premier IIM credentials. | 4 Founding Leader Cards (Anirban Roy, Ibon Tarun Kataki, Iimon Tarun Kataki, Upam Patra) + LinkedIn links. |
| 10 | `/experience` | Experience | Proven empirical track record and enterprise execution credentials. | Pocket MBAs x FYREFL-I and CIPMAT™ case studies, corporate validation metrics. |
| 11 | `/contact` | Book Pilot | Institutional onboarding and pilot scheduling portal. | Pilot Booking Form, direct contact phone, official emails, Firestore lead sync engine. |

---

## 4. Resume Fit Score™ Portal (`/ResumeFitScore`)

### 4.1 Architecture & Core Philosophy
The Resume Fit Score™ Diagnostic Engine evaluates a candidate's resume against institutional benchmarks and target Job Descriptions.
- **Client-Side Privacy (Zero-Leak)**: All text extraction, PDF parsing (via PDF.js), regex scanning, keyword matching, and scoring algorithms run **100% locally inside the browser**. Resumes are never transmitted to unvetted third-party LLMs.
- **Multi-View Navigation**:
  1. `navBtnDiagnostic`: The 8-dimension clinical diagnostic scoring engine.
  2. `navBtnRepository`: Secured archive of all candidate resumes, paired JDs, and diagnostic evaluations (visible exclusively to authorized Co-Founders).
  3. `navBtnAccess`: Access management console for managing authorized evaluators and auto-dispatching invitation emails (visible exclusively to Co-Founders).

### 4.2 Candidate Profiling (Dual Intake A)
Before uploading, candidates declare their institutional status:
1. **College Student (MBA / PGDM / Masters)**: Calibrated for campus placements, Summer Internships, and Day-0/Day-1 recruitment. Focuses on academic projects, internships, leadership roles (PoR), and CGPA.
2. **Working Professional (Lateral / Executive MBA)**: Calibrated for lateral recruitment. Evaluates tenure, business impact metrics (P&L, revenue, CAGR), team leadership, and domain competencies.
- **Institution Name Input**: Captures the candidate's university or business school (e.g. *IIM Ahmedabad, IIM Indore, SPJIMR, XLRI, MDI*).

### 4.3 Resume Intake (Dual Intake B)
- **Upload PDF / DOCX**: Drag-and-drop or file selector. Leverages client-side PDF.js with OCR fallback heuristics for raw character extraction.
- **Paste Resume Text**: Direct raw-text intake supporting up to 50,000 characters.

### 4.4 Target JD Intake (Dual Intake C — 3 Selection Modes)
1. **Domain & Career Level Library (Default / Recommended)**:
   - **Career Level Selector**: 4 Levels — `CAMPUS`, `EARLY` (1–3 yrs), `MID` (4–8 yrs), `SENIOR` (9+ yrs).
   - **Target Domain Dropdown**: 28 Curated Domains (Consulting, Investment Banking, Product Management, General Management, etc.).
   - Maps directly to precomputed `JDFacts` in `jd-database.js`. Requires zero network overhead or LLM extraction.
2. **Share JD Link**:
   - Takes any HTTPS career page or job board URL (e.g., LinkedIn, Naukri, Greenhouse, Lever).
   - Enforces an SSRF guard (blocks private IPs, `127.0.0.1`, loopback, link-local addresses).
3. **Upload or Paste JD**:
   - Accepts custom corporate JD files (PDF/DOCX) or raw job description text.

---

## 5. Scoring Engine & Algorithmic Rubric (100-Point Index)

The Resume Fit Score™ calculates an objective score out of **100 points** distributed across **8 Evaluation Vectors**:

$$\text{Total Fit Score} = \sum_{i=1}^{8} \text{Dimension Score}_i \quad (\text{Max: } 100)$$

```
┌─────────────────────────────────────────────────────────────┬───────────┐
│ Evaluation Vector (Dimension)                               │ Max Score │
├─────────────────────────────────────────────────────────────┼───────────┤
│ 1. Contact & Recruiter Links                                │  10 pts   │
│ 2. Section Structure & Standard Headings                    │  15 pts   │
│ 3. Quantified Impact & Metrics Density                      │  20 pts   │
│ 4. Action Verbs vs Passive Phrasing                         │  10 pts   │
│ 5. Bullet Quality & Word Length Discipline                  │  10 pts   │
│ 6. Resume Page Length Discipline                            │  10 pts   │
│ 7. Role & Domain Keyword Competency Match                   │  15 pts   │
│ 8. Formatting & ATS Parsing Compliance                      │  10 pts   │
├─────────────────────────────────────────────────────────────┼───────────┤
│ TOTAL COMPOSITE RESUME FIT SCORE                            │ 100 pts   │
└─────────────────────────────────────────────────────────────┴───────────┘
```

---

### 5.1 Deep-Dive: The 8 Scoring Vectors

#### Dimension 1: Contact & Recruiter Links (Max: 10 pts)
Recruiters and ATS scanners must immediately identify the candidate.
- **Professional Email** (3 pts): Detected via `/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/`.
- **Indian Mobile (+91)** (3 pts): Detected via `/(?:\+91[\-\s]?)?[6-9]\d{9}\b/`.
- **Customized LinkedIn URL** (4 pts): Detected via `/linkedin\.com\/in\/[a-zA-Z0-9_-]+/i`. Generic `linkedin.com` without a custom vanity slug awards only 2 pts.

#### Dimension 2: Section Structure & Standard Headings (Max: 15 pts)
Standard recruiter sections allow instant eye-tracking and ATS parsing.
- **Education Section** (3 pts): `EDUCATION`, `ACADEMIC BACKGROUND`, `QUALIFICATIONS`.
- **Work Experience / Internships** (3 pts): `EXPERIENCE`, `EMPLOYMENT`, `WORK HISTORY`, `INTERNSHIPS`.
- **Positions of Responsibility (PoR)** (3 pts): `POSITIONS OF RESPONSIBILITY`, `LEADERSHIP`, `COLLEGE COMMITTEES`.
- **Achievements & Awards** (2 pts): `ACHIEVEMENTS`, `HONORS`, `AWARDS`, `EXTRACURRICULAR`.
- **Skills & Tools** (2 pts): `SKILLS`, `TECHNICAL COMPETENCIES`, `TOOLS`, `FRAMEWORKS`.
- **Projects / Certifications** (2 pts): `PROJECTS`, `ACADEMIC INITIATIVES`, `CERTIFICATIONS`.

#### Dimension 3: Quantified Impact & Metrics Density (Max: 20 pts)
*The highest-weighted single vector.* Measures commercial magnitude.
- **Quantification Algorithm**: Scans every bullet point for numbers, percentages (`%`), financial currencies (`₹`, `INR`, `Rs`, `$`, `USD`, `Cr`, `Crore`, `Lakh`, `LPA`, `k`, `M`, `B`), basis points (`bps`), multiples (`x`, `fold`), and performance gains.
- **Scoring Scale**:
  - $\ge 50\%$ of bullets contain metrics: **20 pts (Full Score)**
  - $40\% - 49\%$ of bullets quantified: **16 pts**
  - $30\% - 39\%$ of bullets quantified: **12 pts**
  - $20\% - 29\%$ of bullets quantified: **8 pts**
  - $< 20\%$ of bullets quantified: **4 pts**

#### Dimension 4: Action Verbs vs Weak Phrases (Max: 10 pts)
Measures leadership ownership versus passive execution.
- **Power Action Verbs Dictionary** (100+ decisive verbs): *Spearheaded, Engineered, Orchestrated, Formulated, Accelerated, Streamlined, Negotiated, Championed, Restructured, Pioneered, Optimized, Built, Deployed, Standardized...*
- **Weak / Passive Phrases Penalized**: *Helped with, Responsible for, Worked on, Assisted in, Tasked with, Involved in, Participated in, Supported the...*
- **Scoring Scale**:
  - $\ge 70\%$ bullets start with decisive action verbs AND zero weak phrases: **10 pts**
  - $50\% - 69\%$ action verbs OR 1 weak phrase: **7 pts**
  - $30\% - 49\%$ action verbs OR 2 weak phrases: **4 pts**
  - $< 30\%$ action verbs OR $\ge 3$ weak phrases: **2 pts**

#### Dimension 5: Bullet Quality & Length Discipline (Max: 10 pts)
Recruiters spend 6 seconds per resume; bullets must follow consulting brevity.
- **Ideal Word Count**: **10 to 30 words per bullet**.
- **Run-on Bullets**: $> 35$ words (dilutes impact; penalized).
- **Fragment Bullets**: $< 4$ words (lacks substance; penalized).
- **Scoring Scale**:
  - $\ge 75\%$ bullets in the 10–30 word sweet spot: **10 pts**
  - $60\% - 74\%$ ideal bullets: **7 pts**
  - $40\% - 59\%$ ideal bullets: **5 pts**
  - $< 40\%$ ideal bullets: **2 pts**

#### Dimension 6: Resume Page Length Discipline (Max: 10 pts)
Top Indian management institutes strictly enforce a 1-page rule.
- **Calculation**: Total words scanned ($\sim 450-550$ words per standard page).
- **Scoring Scale**:
  - Exactly 1 Page ($\le 550$ words): **10 pts**
  - 1.5 Pages ($551 - 750$ words): **6 pts** (Risks spilling to page 2)
  - 2 Pages ($751 - 1000$ words): **4 pts** (Acceptable only for 8+ yrs senior profiles)
  - $> 2$ Pages ($> 1000$ words): **2 pts** (Critical violation for management candidates)

#### Dimension 7: Role & Domain Keyword Match (Max: 15 pts)
Evaluates alignment against the chosen Target JD or Domain Benchmark.
- **Mechanism**: Extracts 18 key role competencies from the JD. Evaluates exact and fuzzy regex presence across the resume text.
- **Scoring Scale**:
  - Matches $\ge 12$ competencies: **15 pts**
  - Matches $9 - 11$ competencies: **12 pts**
  - Matches $6 - 8$ competencies: **9 pts**
  - Matches $3 - 5$ competencies: **5 pts**
  - Matches $< 3$ competencies: **2 pts**

#### Dimension 8: Formatting & ATS Compliance (Max: 10 pts)
Ensures machine readability and standard encoding.
- **No Garbled / Non-ASCII Artifacts** (2 pts): Scans for `\uFFFD` and invalid control characters.
- **Reverse Chronological Dates Present** (2 pts): Detects valid 4-digit years (`19\d{2}|20\d{2}`).
- **Few Short Fragment Lines** (2 pts): Checks that line-break formatting did not fragment sentences.
- **At least 4 Standard Headings Found** (2 pts): Confirms ATS section parser can tokenize blocks.
- **Clean Margins & Line Count** (2 pts): Confirms document density is balanced.

---

### 5.2 Score Bands & The Critical Role-Keyword Gate

```
┌─────────────────┬──────────────┬───────────────────────────────────────────────────────────────┐
│ Band Name       │ Score Range  │ Institutional Rating & Gate Conditions                        │
├─────────────────┼──────────────┼───────────────────────────────────────────────────────────────┤
│ ★ STRONG        │ 75 – 100 pts │ High resume fit. Marquee corporate shortlisting readiness.    │
│                 │              │ MANDATORY GATE: Role-Keyword score MUST be >= 5/15!           │
│                 │              │ (If total >= 75 but keywords < 5, score is CAPPED at Moderate)│
├─────────────────┼──────────────┼───────────────────────────────────────────────────────────────┤
│ ◆ MODERATE      │ 55 – 74 pts  │ Good foundation. Clear potential; requires priority fixes in  │
│                 │              │ metrics or competencies before Day-0 interviews.              │
├─────────────────┼──────────────┼───────────────────────────────────────────────────────────────┤
│ ▲ NEEDS WORK    │  0 – 54 pts  │ Significant development required across structure, metrics,   │
│                 │              │ and ATS compliance prior to committee submission.             │
└─────────────────┴──────────────┴───────────────────────────────────────────────────────────────┘
```

> **The Role-Keyword Gate Rule**:  
> In premier management consulting and corporate recruiting, a resume that is beautifully formatted but completely divorced from the target role's competencies will be rejected. Therefore, if a resume scores $\ge 75$ overall but scores $< 5/15$ in Dimension 7 (Role-Keyword Match), the system **automatically caps the band at Moderate** with an explicit institutional warning:
> *"Overall score meets the 75-point threshold, but domain keyword relevance is below the benchmark (minimum 5/15 required for Strong rating)."*

---

### 5.3 Priority Fixes Generator (Ranked 01 to 04)
The diagnostic engine sorts all 8 dimensions in descending order of **Points Lost** ($\text{Points Lost} = \text{Max Points} - \text{Score Achieved}$).
- It extracts the **Top 4 point-loss dimensions** and formats them as:
  - **Priority 01** (Highest Impact, Loss $\ge 5$ pts)
  - **Priority 02** (High/Medium Impact, Loss $\ge 3$ pts)
  - **Priority 03** (Medium Impact)
  - **Priority 04** (Tactical Polish)
- **Contextual Quote Extraction**: For unquantified bullets or passive verbs, the system extracts the candidate's *actual sentence* from their resume and demonstrates the exact rewrite rather than displaying generic placeholder advice.

---

### 5.4 Cross-Domain Suitability Meter
Evaluates the candidate's resume simultaneously across **all 28 industry domains** to identify transferrable competencies and pivot suitability:
- Calculates a normalized keyword overlap index against the competency dictionaries of every domain.
- Displays a visual comparative meter showing:
  - **Primary Fit**: The user's targeted role (e.g. *Consulting: 82%*).
  - **Secondary Pivots**: Adjacent domains where the candidate has strong unexploited readiness (e.g. *Corporate Strategy: 78%*, *Product Management: 71%*, *Venture Capital: 64%*).

---

### 5.5 Context-Aware Bullet Rewrite Engine
Transforms weak bullets into consulting-grade impact statements following the **Google XYZ / McKinsey STAR Formula**:
$$\text{"Accomplished [X], as measured by [Y], by doing [Z]"}$$

1. Identifies the candidate's actual unquantified bullet from the text.
2. Identifies the action verb and core business noun.
3. Injects industry-calibrated metric anchors (e.g., `[X% cycle time reduction / ₹Y Lakh revenue / Z bps margin expansion]`).
4. Replaces weak phrases (*"helped with"*) with executive verbs (*"Spearheaded", "Engineered", "Restructured"*).

---

## 6. Target JD Database & Benchmark Library

The repository houses two generations of curated Indian Management Placement Job Descriptions:

### 6.1 Database v2: Career Level × Target Domain Matrix (Active Default)
- **Source File**: `career-clinic-resume-checker/jd-database.js` / `jd_library_v2.json`
- **Total Records**: **112 Consolidated JDs**
- **Architecture**: **28 Target Domains × 4 Career Levels** (`CAMPUS`, `EARLY`, `MID`, `SENIOR`).
- **Identifier Schema**: `[DOMAIN_CODE]-[LEVEL]` (e.g., `CON-CAMPUS`, `FIN-EARLY`, `PM-MID`, `HR-SENIOR`).

```
                              4 CAREER LEVELS
         ┌────────────┬─────────────┬─────────────┬─────────────┐
         │   CAMPUS   │    EARLY    │     MID     │   SENIOR    │
         │ (0-1 yrs)  │  (1-3 yrs)  │  (4-8 yrs)  │  (9+ yrs)   │
┌────────┼────────────┼─────────────┼─────────────┼─────────────┤
│ CON    │ CON-CAMPUS │ CON-EARLY   │ CON-MID     │ CON-SENIOR  │
│ FIN    │ FIN-CAMPUS │ FIN-EARLY   │ FIN-MID     │ FIN-SENIOR  │
│ PM     │ PM-CAMPUS  │ PM-EARLY    │ PM-MID      │ PM-SENIOR   │
│ ...    │ ...        │ ...         │ ...         │ ...         │
│ (28)   │ (28 JDs)   │ (28 JDs)    │ (28 JDs)    │ (28 JDs)    │
└────────┴────────────┴─────────────┴─────────────┴─────────────┘
  Total: 28 x 4 = 112 Curated Benchmark Job Descriptions
```

#### The 28 Master Target Domains

| # | Code | Target Domain Name | Typical Hiring Roles & Target Profiles |
|---|---|---|---|
| 1 | `CON` | **Management Consulting** | Management Consultant, Strategy Analyst, Associate |
| 2 | `FIN` | **Investment Banking & Capital Markets** | IB Analyst, Equity Research, M&A Associate |
| 3 | `BFSI`| **Commercial & Retail Banking** | Credit Analyst, Relationship Manager, Branch Banking |
| 4 | `PM` | **Product Management** | Associate Product Manager (APM), Technical PM |
| 5 | `TECH`| **Software, Cloud & Tech Strategy** | IT Consultant, Solutions Architect, Digital Transformation |
| 6 | `DATA`| **Analytics & Data Science** | Business Analyst, Data Strategist, BI Lead |
| 7 | `FMCG`| **FMCG & Consumer Goods** | Area Sales Manager (ASM), Brand Manager, MT |
| 8 | `ECOM`| **E-Commerce & Quick Commerce** | Category Manager, D2C Growth Lead, Operations |
| 9 | `OPS` | **Supply Chain & Operations** | Procurement Manager, Logistics Planner, Plant Ops |
| 10 | `CORP`| **Corporate Strategy & Planning** | Strategy Lead, Chief of Staff, MD/CEO Office |
| 11 | `GEN` | **General Management & Leadership** | Management Trainee (MT), Leadership Development Program |
| 12 | `VENT`| **Venture Capital & Private Equity** | Investment Analyst, Portfolio Associate, Deal Sourcing |
| 13 | `HR` | **Human Resources & Talent Strategy**| HR Business Partner (HRBP), Talent Acquisition, Comp & Benefits |
| 14 | `MKT` | **Brand Management & Digital Marketing** | Digital Marketing Lead, Performance Marketing, Growth |
| 15 | `B2B` | **Enterprise Sales & B2B Strategy** | Key Account Manager, Enterprise Solutions, BD |
| 16 | `AGRI`| **Agribusiness & Rural Management** | Agri-Value Chain Manager, Rural Marketing, Agri-Credit |
| 17 | `AUTO`| **Automotive & EV Mobility** | EV Strategy Analyst, Channel Operations, Product Planner |
| 18 | `RETA`| **Retail & Fashion Merchandising** | Retail Store Manager, Visual Merchandiser, Buyer |
| 19 | `HEAL`| **Healthcare & Hospital Management** | Hospital Administrator, Healthcare Consultant, Ops Lead |
| 20 | `PHAR`| **Pharmaceuticals & Lifesciences**| Pharma Brand Manager, Clinical Regulatory Analyst |
| 21 | `INFR`| **Infrastructure & Real Estate** | Project Finance Analyst, Real Estate Asset Manager |
| 22 | `ENER`| **Energy, Power & Clean Tech** | Renewable Energy Analyst, ESG Consultant, Grid Strategist |
| 23 | `SUST`| **ESG, Climate & Sustainability** | Sustainability Auditor, Scope 1-3 Lead, ESG Reporting |
| 24 | `TELE`| **Telecommunications & Networks** | 5G Enterprise Solutions, Telecom Product Specialist |
| 25 | `AERO`| **Aerospace, Aviation & Defence** | Aviation Fleet Planner, Defence Procurement Specialist |
| 26 | `PUBL`| **Public Policy & Government Advisory**| Government Consultant, Smart Cities Fellow, Policy Analyst |
| 27 | `MEDI`| **Media, Entertainment & Gaming** | Content Strategist, Gaming Community Monetization |
| 28 | `EDTE`| **Education Technology & Skilling** | Academic Product Manager, B2B Institutional Lead |

---

### 6.2 Database Record Contract (Data Schema)
Each record in `jd-database.js` adheres to the following specification:

```javascript
{
  id: "CON-CAMPUS",
  version: "jdlib-2026.10-v2",
  level: "CAMPUS",             // "CAMPUS" | "EARLY" | "MID" | "SENIOR"
  domainCode: "CON",
  domain: "Consulting",
  title: "Management Consultant — Campus Entry",
  status: "V",                 // "V" (Verified) | "P" (Pending) | "A" (Advisory)
  academicCutoff: "AC-C",      // Academic cut-off tier
  regulatoryFlags: [],         // Regulatory or legal warnings
  mandatoryCertifications: [], // Hard regulatory requirements (e.g. NISM, Bar Council)
  preferredCertifications: ["Lean Six Sigma", "CFA Level 1"],
  keywords: [
    "Market Sizing", "Due Diligence", "Go-To-Market / GTM", 
    "Competitive Benchmarking", "Cost Optimization", "MECE Framework",
    "Value Proposition", "Financial Modeling", "Hypothesis-Driven",
    "Operational Excellence", "Growth Strategy", "Stakeholder Management"
  ],
  coreCompetencies: [
    { name: "Structured Problem Solving", weight: 0.25 },
    { name: "Executive Communication", weight: 0.25 },
    { name: "Quantitative Modeling", weight: 0.25 },
    { name: "Commercial Acumen", weight: 0.25 }
  ],
  fullText: "..."              // Complete consulting-grade job description
}
```

---

## 7. Cloud Firestore Collections & Security Governance

### 7.1 Firestore Collections Architecture

```
Cloud Firestore (my-career-company)
├── institutional_leads/          # Inbound pilot bookings from /contact
│   └── {leadId}                  # name, email, phone, institution, role, cohortSize, code
│
├── resume_assessments/           # Generated Fit Score reports
│   └── {assessmentId}            # candidateType, institution, totalScore, band, dimensions, timestamp
│
├── unique_resumes/               # Deduplicated candidate CV text & hashes
│   └── {resumeHash}              # rawText, wordCount, pageCount, firstSeenAt, hash
│
├── unique_job_descriptions/      # Custom & benchmark JDs analyzed
│   └── {jdHash}                  # role, domain, level, fullText, hash
│
├── allowed_users/                # Whitelist of authenticated evaluators
│   └── {userEmail}               # email, name, role, institution, grantedBy, grantedAt
│       └── invitations/          # Audit trail of email invitations dispatched
│
└── mail/                         # Firebase Trigger Email queue
    └── {mailId}                  # to, message: { subject, html, text }
```

### 7.2 Cloud Firestore Security Rules (`firestore.rules`)
- **`institutional_leads`**: Public creates permitted (form submissions); read/update/delete strictly prohibited to unauthorized users.
- **`resume_assessments`**, **`unique_resumes`**, **`unique_job_descriptions`**: Creates permitted from verified client sessions; reads restricted to authenticated evaluators.
- **`allowed_users`**: Reads and writes restricted strictly to authorized Co-Founders.

---

## 8. Authentication & Institutional Access Control

### 8.1 Evaluator Whitelist & Co-Founders
The platform implements Google OAuth 2.0 (`signInWithPopup`) with custom parameters (`prompt: select_account`) to allow evaluators to select from active Google accounts or add a new account.

#### Permitted Co-Founders (Full Administrative & Repository Access)
```javascript
const CO_FOUNDER_EMAILS = [
  "upam.patra@gmail.com",
  "iimonkataki@mycareercompany.com",
  "ibonkataki@mycareercompany.com",
  "anirbanroy@mycareercompany.com",
  "anirbanroy@mycareercompanny.com"
];
```
- **Co-Founder Privileges**:
  - Full access to Diagnostic Engine.
  - Access to the **Assessment Repository** tab (search, filter, view all candidate resumes, paired JDs, and past evaluations).
  - Access to the **Access Management** tab (view permitted evaluators, grant new access, revoke access, trigger official invitation emails).
  - Visual Gold Role Badge in header: `👑 Co-Founder`.

#### Verified Evaluators / Candidates
- Evaluators added via the Access Management console or Firestore `allowed_users` collection.
- Can sign in and run diagnostic evaluations.
- **Cannot see or access the Assessment Repository or Access tabs**.
- Visual Role Badge in header: `👤 Verified User`.

---

## 9. Webhooks & Notification Integrations

### 9.1 Google Apps Script Webhook (Live Inbound & Email Dispatch)
- **Production Webhook URL**:
  `https://script.google.com/macros/s/AKfycbxH9SO8xJ7jym99FZwHL9WkB2j1KDWbzppSrlCzD9UOqAEYxgS-aWiY-DF2dud7sG1k/exec`
- **Authentication**: Runs authenticated under `support@mycareercompany.com` with `MailApp.sendEmail` and Google Sheets API permissions.
- **Actions Supported**:
  1. `sendAccessInvitation`: Dispatches official HTML onboarding emails to newly whitelisted evaluators with direct login links.
  2. `leadIngestion`: Appends inbound pilot booking leads from `/contact` to the master institutional spreadsheet and fires instant alerts to the founders.

### 9.2 Master Lead & Alert Recipient Distribution
Whenever an institutional lead is submitted or an administrative alert is fired:
- `anirbanroy@mycareercompany.com`
- `ibonkataki@mycareercompany.com`
- `iimonkataki@mycareercompany.com`
- `support@mycareercompany.com`

---

## 10. Master Directory of Links, Contacts & Endpoints

| Category | Item | Value / URL |
|---|---|---|
| **Primary Website** | Live Portal Root | [https://www.mycareercompany.com](https://www.mycareercompany.com) |
| **Diagnostic Tool** | Resume Fit Score™ Engine | [https://www.mycareercompany.com/ResumeFitScore](https://www.mycareercompany.com/ResumeFitScore) |
| **Direct Route** | 5-Day Career Clinic | [https://www.mycareercompany.com/career-clinic](https://www.mycareercompany.com/career-clinic) |
| **Direct Route** | Institutional Pilot Booking | [https://www.mycareercompany.com/contact](https://www.mycareercompany.com/contact) |
| **Direct Route** | Leadership Team | [https://www.mycareercompany.com/leadership](https://www.mycareercompany.com/leadership) |
| **Direct Route** | Clinical Framework | [https://www.mycareercompany.com/framework](https://www.mycareercompany.com/framework) |
| **Direct Route** | Readiness Gap Analysis | [https://www.mycareercompany.com/readiness-gap](https://www.mycareercompany.com/readiness-gap) |
| **Direct Route** | Student Pillars | [https://www.mycareercompany.com/students](https://www.mycareercompany.com/students) |
| **Direct Route** | Institutional Model | [https://www.mycareercompany.com/institutions](https://www.mycareercompany.com/institutions) |
| **Direct Route** | Experience & Track Record | [https://www.mycareercompany.com/experience](https://www.mycareercompany.com/experience) |
| **Firebase App** | Edge Hosting Mirror | [https://my-career-company.web.app](https://my-career-company.web.app) |
| **Firebase Console**| Cloud Console | [https://console.firebase.google.com/project/my-career-company](https://console.firebase.google.com/project/my-career-company) |
| **Source Control** | GitHub Repository | [https://github.com/iimonkataki/My-Career-Company](https://github.com/iimonkataki/My-Career-Company) |
| **Direct Desk** | Official Phone / WhatsApp | `+91 8145295101` |
| **Institutional Desk**| Official Email | `support@mycareercompany.com` |
| **Co-Founder** | Anirban Roy | `anirbanroy@mycareercompany.com` |
| **Co-Founder** | Ibon Tarun Kataki | `ibonkataki@mycareercompany.com` |
| **Co-Founder** | Iimon Tarun Kataki | `iimonkataki@mycareercompany.com` |
| **Co-Founder** | Upam Patra | `upam.patra@gmail.com` |

---
*© 2026 My Career Company. Confidential institutional documentation.*
