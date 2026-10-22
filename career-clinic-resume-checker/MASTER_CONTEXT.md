# MY CAREER COMPANY — MASTER ECOSYSTEM CONTEXT DOCUMENT
**Universal Platform Blueprint, Architectural Specifications, Dual-Project Knowledge Base & AI Agent Operational Manual**  
*Optimized for Generative AI Models (Claude 3.5/3.7 Sonnet, ChatGPT GPT-4o/o1/o3, Gemini Pro/Ultra) and Enterprise Engineering Continuity*  
*Version: 2026.10-PRODUCTION · Ecosystem URLs: [www.mycareercompany.com](https://www.mycareercompany.com) & [www.mycareercompany.com/ResumeFitScore](https://www.mycareercompany.com/ResumeFitScore)*

---

```yaml
ecosystem:
  name: "My Career Company"
  tagline: "PEOPLE | GUIDANCE | OPPORTUNITIES"
  clinical_mantra: "Diagnose. Prepare. Practise. Perform."
  institutional_proposition: "You bring opportunities, we prepare students to convert them."
  version: "2026.10-PROD"
  git_repo: "https://github.com/iimonkataki/My-Career-Company.git"
  default_branch: "main"
  hosting_provider: "Firebase Hosting (Google Cloud Platform) + Cloudflare CDN Edge"
  project_id: "my-career-company"
  production_domains:
    primary_institutional: "https://www.mycareercompany.com"
    diagnostic_tool: "https://www.mycareercompany.com/ResumeFitScore"
    secondary_aliases:
      - "https://my-career-company.web.app"
      - "https://my-career-company.firebaseapp.com"
  core_entities:
    - project_1: "Institutional B2B Web Platform (11 Public Pages)"
    - project_2: "Resume Fit Score™ Clinical Diagnostic & Access Portal (3-View Web App)"
```

---

## TABLE OF CONTENTS
1. [AI System Persona & Model Consumption Directives](#1-ai-system-persona--model-consumption-directives)
2. [Executive Brand Foundation & Strategic Positioning](#2-executive-brand-foundation--strategic-positioning)
3. [Master Design System — Luxury Consulting Tokens](#3-master-design-system--luxury-consulting-tokens)
4. [Project 1: Institutional B2B Web Ecosystem (`www.mycareercompany.com`)](#4-project-1-institutional-b2b-web-ecosystem-wwwmycareercompanycom)
   - 4.1 [Page-by-Page Technical & Content Architecture](#41-page-by-page-technical--content-architecture)
   - 4.2 [Career Readiness Score™ (CRS) Telemetry Model](#42-career-readiness-score-crs-telemetry-model)
   - 4.3 [Personal Placement Plan™ (PPP) 30-Day Sprint](#43-personal-placement-plan-ppp-30-day-sprint)
   - 4.4 [Lead Capture Engine & Webhook Integrations](#44-lead-capture-engine--webhook-integrations)
5. [Project 2: Resume Fit Score™ Diagnostic Portal (`/ResumeFitScore`)](#5-project-2-resume-fit-score-diagnostic-portal-resumefitscore)
   - 5.1 [Architecture & Client-Side Zero-Data-Leak Guarantee](#51-architecture--client-side-zero-data-leak-guarantee)
   - 5.2 [Tri-Portal Multi-View Architecture](#52-tri-portal-multi-view-architecture)
   - 5.3 [Dual Intake Engine (Profile, Resume, Target JD)](#53-dual-intake-engine-profile-resume-target-jd)
   - 5.4 [8-Dimension Scoring Engine & Mathematical Rubric (100-Pt Index)](#54-8-dimension-scoring-engine--mathematical-rubric-100-pt-index)
   - 5.5 [Score Bands & The Mandatory Role-Keyword Gate](#55-score-bands--the-mandatory-role-keyword-gate)
   - 5.6 [Priority Fixes Engine (Ranked 01 to 04)](#56-priority-fixes-engine-ranked-01-to-04)
   - 5.7 [Context-Aware Bullet Rewrite Engine (Google XYZ / McKinsey STAR)](#57-context-aware-bullet-rewrite-engine-google-xyz--mckinsey-star)
   - 5.8 [Domain Identification & Transferable Suitability Algorithms](#58-domain-identification--transferable-suitability-algorithms)
   - 5.9 [28 Master Target Domains & 4 Career Levels Matrix (112 Benchmark JDs)](#59-28-master-target-domains--4-career-levels-matrix-112-benchmark-jds)
6. [Cloud Infrastructure, Security Governance & Storage](#6-cloud-infrastructure-security-governance--storage)
   - 6.1 [Cloud Firestore Data Schema & Collections](#61-cloud-firestore-data-schema--collections)
   - 6.2 [Firestore & Cloud Storage Security Rules](#62-firestore--cloud-storage-security-rules)
   - 6.3 [Firebase Edge Hosting & URL Routing (`firebase.json`)](#63-firebase-edge-hosting--url-routing-firebasejson)
   - 6.4 [Local Proxy Server & Email Dispatch API (`server.js`)](#64-local-proxy-server--email-dispatch-api-serverjs)
7. [Corporate Governance, Leadership Directory & Contact Channels](#7-corporate-governance-leadership-directory--contact-channels)
8. [Recruiter & Alumni Placement Ecosystem (50 Marquee Firms)](#8-recruiter--alumni-placement-ecosystem-50-marquee-firms)
9. [Pre-Engineered GenAI System Prompts & Operational Modes](#9-pre-engineered-genai-system-prompts--operational-modes)

---

## 1. AI System Persona & Model Consumption Directives

### 1.1 Instructions for LLMs (Claude 3.5/3.7, ChatGPT GPT-4o, Gemini 1.5/2.0)
When an AI model is initialized with this context file, it must adopt the **My Career Company Advisory Persona**:
- **Tone**: Consulting-grade, rigorous, empirical, academic yet actionable. Replicate the intellectual polish of premier Indian Institutes of Management (IIMs) and top-tier management consulting firms (McKinsey, BCG, Bain).
- **Style**: Direct, structured, data-driven, using top-down Minto Pyramid communication. Prefer clear bullet points, quantitative benchmarks, and structured tables. Avoid generic motivational filler, ungrounded superlatives, and marketing hype.
- **The Golden Rule on Placements**: **NEVER make guaranteed placement claims.** My Career Company strictly rejects speculative placement guarantees. The firm acts exclusively as a clinical readiness accelerator that prepares candidates to convert opportunities brought by institutions and placement committees.
- **Scoring Engine Governance**: In any resume diagnostic output, strictly enforce the **Mandatory Role-Keyword Gate**: a candidate who scores $\ge 75$ overall CANNOT receive a "Strong" rating if their Dimension 7 (Role-Keyword Match) score is below $5 / 15$. Their score band is capped at "Moderate".
- **Zero-Data-Leak Respect**: Recognize that the Resume Fit Score diagnostic is engineered to run client-side. When recommending architecture or code edits, never introduce third-party API transmissions for raw resume text without explicit consent.

---

## 2. Executive Brand Foundation & Strategic Positioning

### 2.1 The Core Mission & The "Readiness Gap"
**My Career Company** solves the structural disconnect between premier business school academic curricula (MBA, PGDM, EPGP, executive management programs in India) and the intense Day-0/Day-1 hiring benchmarks of Tier-1 recruiters.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               THE READINESS GAP MATRIX                                 │
├─────────────────────────────────────────┬──────────────────────────────────────────────┤
│ 4 Candidate Academic Inputs             │ 5 Tier-1 Recruiter Assessment Rubrics        │
├─────────────────────────────────────────┼──────────────────────────────────────────────┤
│ 1. Curriculum & Theoretical Knowledge   │ 1. Profile / Role Fit & Quantified Track     │
│ 2. Past Academic / Project Experience   │ 2. Commercial Acumen & Unit Economics        │
│ 3. Unmoderated Peer Placement Resources │ 3. Structured Thinking (MECE / Minto Pyramid)│
│ 4. Passive Industry Guest Lectures      │ 4. Executive Interview Presence & Synthesis  │
│                                         │ 5. Composure under Senior Partner Stress     │
└─────────────────────────────────────────┴──────────────────────────────────────────────┘
```

- **Mantra**: *"Diagnose. Prepare. Practise. Perform."*
- **Institutional Promise**: *"You bring opportunities, we prepare students to convert them."*
- **Collaborative Nature**: Operates as a strategic partner to Deans, Directors, and Student Placement Committees (PlaceComs)—never a competitor or disintermediating agency.

---

## 3. Master Design System — Luxury Consulting Tokens

Both web properties share a unified luxury consulting visual language designed to evoke elite executive education, high-end Swiss typography, and institutional credibility.

### 3.1 Color Token Matrix
```css
:root {
  /* Surface & Background Hierarchy */
  --color-bg-deep:        #05261F; /* Base body background, dark gates, footers */
  --color-forest:         #073D32; /* Primary brand forest green, hero sections */
  --color-forest-dark:    #041F19; /* Deepest contrast panels, inner cards */
  --color-surface:        #0A493D; /* Elevated intake panels, modal surfaces */
  --color-card:           #0D5245; /* Cards, dropzones, metric containers */
  --color-card-hover:     #105E50; /* Interactive hover elevation */

  /* Luxury Gold Accents */
  --color-gold:           #D4AF7C; /* Primary Champagne Gold CTA, score rings */
  --color-gold-light:     #F1DEC3; /* Stat counters, active badges, highlights */
  --color-gold-dark:      #A37F4B; /* Muted borders, outline focus rings */
  --color-gold-border:    rgba(212, 175, 124, 0.35); /* Card dividing lines */
  --color-gold-bright:    #F59E0B; /* Highlighted milestones & alerts */

  /* Text & Typography */
  --color-ivory:          #F8F6EF; /* Primary headings, high-contrast button labels */
  --color-white:          #FFFFFF; /* Light-mode contrast & pure white surfaces */
  --color-text-secondary: #D2D5CA; /* Subtitles, body paragraphs (Dark mode) */
  --color-text-muted:     #95A199; /* Captions, timestamps, inactive tabs */

  /* Diagnostic Status Tiers */
  --color-strong:         #2BB673; /* Score 75-100: Strong Fit */
  --color-moderate:       #E6A23C; /* Score 55-74: Moderate Fit */
  --color-needs-work:     #E75D5D; /* Score 0-54: Needs Work */

  /* Fonts & Typography */
  --font-family:          'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

### 3.2 Viewport & Mobile Responsive Standards
- **Viewport Rule**: `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover">`
- **Zero Horizontal Distortion Guarantee**:
  - No `100vw` units used anywhere in CSS. Substituted with strict `100%` and `max-width: 100%`.
  - `overflow-x: hidden; overflow-x: clip;` enforced globally on `html` and `body`.
  - Touch scrolling: `touch-action: pan-y pinch-zoom; -webkit-overflow-scrolling: touch;` on `body`.
  - Horizontally scrollable tab bars declare `touch-action: pan-x; -webkit-overflow-scrolling: touch;`.

---

## 4. Project 1: Institutional B2B Web Ecosystem (`www.mycareercompany.com`)

### 4.1 Page-by-Page Technical & Content Architecture

The main institutional platform comprises **11 dedicated web pages**, built with lightweight, semantic Vanilla HTML5, Vanilla CSS, and modular Vanilla JS for zero-dependency speed and edge-caching resilience.

| # | Route | File Name | Strategic Educational Objective | Core Interactive Components & Data Points |
|---|---|---|---|---|
| 1 | `/` | `index.html` | Executive Landing Page | Audience badge (`MBA`, `PGDM`, `EPGP`, `MDP`), Dean's Telemetry Gauge (calibrated at 68/100), 6-stage clinical methodology preview, 50-firm alumni logo marquee. |
| 2 | `/readiness-gap` | `readiness-gap.html` | Analytical Diagnosis | 4 Academic Disconnects vs 5 Recruiter Assessment Rubrics; side-by-side gap analysis visualizer. |
| 3 | `/framework` | `framework.html` | Clinical Methodology | 6-Stage Interactive Roadmap: Assess (01) &rarr; Diagnose (02) &rarr; Plan (03) &rarr; Prepare (04) &rarr; Simulate (05) &rarr; Improve (06) &rarr; READY. Dynamically updates stage activities and student deliverables. |
| 4 | `/career-clinic` | `career-clinic.html` | Flagship Product | 5-Day Career Accelerator for premier B-schools. 5 Module Cards: 01 Profile Architecture, 02 Professional Foundation, 03 Commercial Acumen & Casing, 04 Recruitment Simulation, 05 Gap Closure. Zero academic disruption delivery model. |
| 5 | `/career-clinic/readiness-score`<br>`/readiness-score` | `readiness-score.html` | Diagnostic Engine | Career Readiness Score™ (CRS) interactive circular gauge (68/100), 7 vector breakdowns, comprehensive clinical diagnostic audit panel. |
| 6 | `/career-clinic/placement-plan`<br>`/placement-plan` | `placement-plan.html` | Intervention Roadmap | Personal Placement Plan™ (PPP) architecture; 4 modules (PI, GD, Case Solving, Business Knowledge), 30-Day Sprint timetable with milestone deliverables. |
| 7 | `/students` | `students.html` | Student Candidate Portal | 5 Capability Pillars: Profile & Career, Business & Knowledge, Problem Solving, Communication & Interview, Practice & Industry. Converts candidates to "Placement-Ready". |
| 8 | `/institutions` | `institutions.html` | B2B Dean & PlaceCom Portal | Dual-stakeholder operational model (*"You bring opportunities, we prepare students to convert them"*). 4 pillars: Placement Team Partnership, Recruiter Connect, Student-to-Opportunity, Institutional Intelligence. |
| 9 | `/leadership` | `leadership.html` | Leadership & Governance | 4 Founding Leaders with verified premier IIM credentials, corporate executive track records, LinkedIn verification links, domain specialization. |
| 10 | `/experience` | `experience.html` | Empirical Credentials | Proven execution history: Pocket MBAs x FYREFL-I (1,200+ candidates trained at IIM Indore) and CIPMAT across 5 IIMs (Indore, Rohtak, Bodh Gaya, Ranchi, Jammu). |
| 11 | `/contact` | `contact.html` | Institutional Pilot Booking | Pilot Booking Intake Form, direct telephone/WhatsApp links, official email desks, instant Firestore sync and Google Sheets webhook forwarding. |

---

### 4.2 Career Readiness Score™ (CRS) Telemetry Model
The platform introduces the **Career Readiness Score™**, an institutional diagnostic framework quantifying student employability out of 100 points across 7 vectors:

```
                            CAREER READINESS SCORE™ (68/100)
┌──────────────────────────────────────────────┬────────────┬──────────────────────────────────────┐
│ Evaluation Vector                            │ Score      │ Clinical Diagnostic Audit            │
├──────────────────────────────────────────────┼────────────┼──────────────────────────────────────┤
│ 1. Resume & Profile Readiness                │  74 / 100  │ Clear ATS formatting; requires XYZ   │
│                                              │            │ quantified bullets on pre-MBA work.  │
│ 2. Communication & Articulation              │  61 / 100  │ Strong vocabulary; lacks executive   │
│                                              │            │ brevity and Minto Pyramid synthesis. │
│ 3. Business Knowledge & Commercial Acumen    │  78 / 100  │ Solid macro understanding; needs P&L │
│                                              │            │ levers and sector unit economics.    │
│ 4. Group Discussion (GD) Readiness (RISK)    │  57 / 100  │ Hesitant entry timing; struggles to  │
│                                              │            │ moderate and steer group consensus.  │
│ 5. Case Solving Rigor                        │  71 / 100  │ Methodical MECE trees; needs speed   │
│                                              │            │ conditioning on mental math.         │
│ 6. Personal Interview (PI) Composure (PRIORITY)│ 52 / 100 │ CRITICAL PRIORITY. Unstructured STAR │
│                                              │            │ storytelling; partner anxiety.       │
│ 7. Role & Domain Depth                       │  64 / 100  │ Developing Tier-1 consulting depth;  │
│                                              │            │ requires alumni mock immersion.      │
└──────────────────────────────────────────────┴────────────┴──────────────────────────────────────┘
```

---

### 4.3 Personal Placement Plan™ (PPP) 30-Day Sprint
A clinical intervention roadmap executed over 30 days to systematically eliminate candidate risk factors:
- **Milestone 01 (Days 1–7)**: 2 Proctored GD Simulations with peer moderation and dispute turnaround.
- **Milestone 02 (Days 8–16)**: 3 Structured Case Practices (Profitability, Market Entry, Value Chain Optimization).
- **Milestone 03 (Days 17–23)**: 2 Mock Personal Interviews (Blind interviews replicating partner-level intensity).
- **Milestone 04 (Days 24–27)**: 1 Comprehensive Resume Surgery (Line-by-line red-pen edit to achieve ATS & XYZ compliance).
- **Milestone 05 (Days 28–30)**: 1 Institutional Reassessment (Full re-scoring across all 7 dimensions to verify readiness delta).

---

### 4.4 Lead Capture Engine & Webhook Integrations
Inbound institutional pilot bookings submitted through `/contact` execute a multi-tier serverless sync:
1. **Cloud Firestore Sync**: Direct write to `institutional_leads` collection containing name, role, institution, email, phone, programme, cohort size, and ISO timestamp.
2. **Google Apps Script Webhook**:
   - Webhook URL: `https://script.google.com/macros/s/AKfycbxH9SO8xJ7jym99FZwHL9WkB2j1KDWbzppSrlCzD9UOqAEYxgS-aWiY-DF2dud7sG1k/exec`
   - Automatically appends lead data to the master executive Google Spreadsheet.
   - Dispatches automated confirmation and onboarding emails via authorized Google Workspace mail dispatch.

---

## 5. Project 2: Resume Fit Score™ Diagnostic Portal (`/ResumeFitScore`)

### 5.1 Architecture & Client-Side Zero-Data-Leak Guarantee
The Resume Fit Score™ portal provides candidates and institutional evaluators with instantaneous, rigorous resume analysis against target job descriptions.
- **Client-Side Privacy Guarantee**: All text extraction, PDF parsing (via PDF.js), DOCX parsing (via Mammoth.js), regular expressions, and scoring algorithms execute **100% in-browser**. Resumes are never passed to unvetted third-party LLMs.
- **Local Cache & Offline Resilience**: Local evaluations cache to `localStorage` under `CC_RESUME_ASSESSMENTS_V1`, `CC_UNIQUE_RESUMES_V1`, and `CC_UNIQUE_JDS_V1`.

---

### 5.2 Tri-Portal Multi-View Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                  RESUME FIT SCORE™ TRI-PORTAL MULTI-VIEW ARCHITECTURE                  │
├────────────────────────────┬─────────────────────────────┬─────────────────────────────┤
│ VIEW 1: DIAGNOSTIC ENGINE  │ VIEW 2: ARCHIVE REPOSITORY  │ VIEW 3: ACCESS & EVALUATORS │
├────────────────────────────┼─────────────────────────────┼─────────────────────────────┤
│ • Public / Whitelisted test│ • Co-Founders exclusive     │ • Co-Founders exclusive     │
│ • Dual Intake Engine       │ • Real-time Firestore sync  │ • Whitelist management      │
│ • 8-Dimension score meter  │ • Search, filter, export    │ • Grant/revoke evaluator    │
│ • Priority Fixes 01 - 04   │ • Resumes, JDs, Reports     │ • Automated email invite    │
│ • Contextual STAR Rewrites │ • Deduplicated SHA hashes   │   via serverless API        │
│ • Transferable Suitability │ • Candidate audit trails    │ • Evaluator audit logs      │
└────────────────────────────┴─────────────────────────────┴─────────────────────────────┘
```

---

### 5.3 Dual Intake Engine (Profile, Resume, Target JD)
The intake accepts three coordinated inputs:
1. **Candidate Profile**:
   - Status: College Student (MBA, PGDM, Masters) or Working Professional (Lateral / Executive MBA).
   - Institution Name: (e.g., IIM Ahmedabad, IIM Indore, XLRI, SPJIMR).
2. **Resume Input**:
   - File Upload: PDF (client-side text extraction via PDF.js) or DOCX (via Mammoth).
   - Raw Text Paste: Up to 50,000 characters with live word and character counters.
3. **Target Job Description Input** (3 Flexible Modes):
   - **Mode 1: Level & Domain Benchmark Library**: Select from 4 career levels $\times$ 28 domains (112 pre-compiled JDs).
   - **Mode 2: Share Job Link (URL)**: Paste live job posting URL with anti-SSRF protection.
   - **Mode 3: Upload / Paste Custom JD**: Paste specific job description text directly.

---

### 5.4 8-Dimension Scoring Engine & Mathematical Rubric (100-Pt Index)

$$\text{Total Composite Fit Score} = \sum_{i=1}^{8} \text{Dimension Score}_i \quad (\text{Max: } 100)$$

```
┌─────────────────────────────────────────────────────────────┬───────────┐
│ Evaluation Vector (Dimension)                               │ Max Score │
├─────────────────────────────────────────────────────────────┼───────────┤
│ 1. Contact & Recruiter Links                                │  10 pts   │
│ 2. Section Structure & Standard Headings                    │  15 pts   │
│ 3. Quantified Impact & Metrics Density                      │  20 pts   │
│ 4. Action Verbs vs Weak / Passive Phrases                   │  10 pts   │
│ 5. Bullet Quality & Word Length Discipline                  │  10 pts   │
│ 6. Resume Page Length Discipline                            │  10 pts   │
│ 7. Role & Domain Keyword Competency Match                   │  15 pts   │
│ 8. Formatting & ATS Parsing Compliance                      │  10 pts   │
├─────────────────────────────────────────────────────────────┼───────────┤
│ TOTAL COMPOSITE RESUME FIT SCORE                            │ 100 pts   │
└─────────────────────────────────────────────────────────────┴───────────┘
```

#### Detailed Dimension Mechanics:

1. **Dimension 1: Contact & Recruiter Links (Max: 10 pts)**
   - Professional Email (3 pts): Detected via `/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i`.
   - Indian Mobile Number (+91) (3 pts): Detected via `/(?:\+91[\s.-]?|91[\s.-]?|0)?[6-9]\d{4}[\s.-]?\d{5}\b/`.
   - Customized LinkedIn URL (4 pts): Detected via `/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|pub)\/[a-zA-Z0-9_-]+|\blinkedin(?:\.com)?\b/i`.

2. **Dimension 2: Section Structure & Standard Headings (Max: 15 pts)**
   - Education Section (3 pts): Matches `education`, `academics`, `scholastic achievements`.
   - Work Experience / Internships (3 pts): Matches `experience`, `work experience`, `internship`.
   - Projects / Capstones (2 pts): Matches `projects`, `academic projects`, `capstone`.
   - Scholastic Achievements & Awards (2 pts): Matches `achievements`, `honors`, `awards`.
   - Positions of Responsibility (PoR) (2 pts): Matches `positions of responsibility`, `por`, `leadership roles`.
   - Skills & Competencies (2 pts): Matches `skills`, `technical skills`, `core competencies`.
   - Certifications & Licensures (1 pt): Matches `certifications`, `certificates`, `licenses`.

3. **Dimension 3: Quantified Impact & Metrics Density (Max: 20 pts)**  
   *Highest single weight.* Measures commercial magnitude.
   - Algorithm isolates bullets and strips 4-digit calendar years (`/(?:19|20)\d{2}/g`).
   - Scans for percentages (`%`), financial currencies (`₹`, `Rs`, `INR`, `$`, `€`, `£`), denominations (`lakh`, `lac`, `crore`, `cr`, `million`, `mn`, `billion`, `bn`, `k`), multiples (`x`), and numbers.
   $$\text{Quant Share} = \frac{\text{Quantified Bullets}}{\text{Total Bullets}}$$
   $$\text{Score} = \min\left(20, \text{round}\left(\frac{\text{Quant Share}}{0.50} \times 20\right)\right)$$
   *(Full 20 marks awarded when $\ge 50\%$ of bullets are quantified).*

4. **Dimension 4: Action Verbs vs Weak / Passive Phrases (Max: 10 pts)**
   - Scans 100+ decisive action verbs: *Led, Spearheaded, Accelerated, Formulated, Streamlined, Orchestrated, Designed, Executed, Delivered, Optimized, Boosted, Generated, Structured...*
   $$\text{Strong Verb Share} = \frac{\text{Strong Verb Bullets}}{\text{Total Bullets}}$$
   $$\text{Base Score} = \min\left(10, \text{round}\left(\frac{\text{Strong Verb Share}}{0.60} \times 10\right)\right)$$
   - Weak Phrases Penalty (Deducts up to -4 pts): *Responsible for* (-1), *Worked on* (-1), *Helped with* (-1), *Assisted with* (-1), *Tasked with* (-1), *Handled* (-1), *Duties included* (-1), *Involved in / Part of* (-1).
   $$\text{Final Score} = \max(0, \min(10, \text{Base Score} - \min(4, \text{Weak Phrase Count})))$$

5. **Dimension 5: Bullet Quality & Length Discipline (Max: 10 pts)**
   - Consulting sweet spot: **10 to 30 words per bullet**.
   $$\text{Ideal Length Share} = \frac{\text{Bullets with 10–30 Words}}{\text{Total Bullets}}$$
   $$\text{Score} = \min\left(10, \text{round}\left(\frac{\text{Ideal Length Share}}{0.70} \times 10\right)\right)$$
   *(Full marks when $\ge 70\%$ of bullets satisfy length discipline).*

6. **Dimension 6: Resume Page Length Discipline (Max: 10 pts)**
   - Premier B-school 1-page rule enforcement.
   - When PDF page count available: Exactly 1 page = 10 pts, 2 pages = 5 pts, 3+ pages = 2 pts.
   - Text paste fallback: $\le 450$ words = 10 pts, $451-900$ words = 5 pts, $>900$ words = 2 pts.

7. **Dimension 7: Role & Domain Keyword Match (Max: 15 pts)**
   - Evaluates resume text against the 18 core competencies of the target domain/JD.
   $$\text{Score} = \min\left(15, \text{round}\left(\frac{\text{Detected Keywords}}{9} \times 15\right)\right)$$
   *(Full marks when $\ge 9$ out of 18 competencies are detected).*

8. **Dimension 8: Formatting & ATS Parsing Compliance (Max: 10 pts)**
   - Substantive content ($\ge 150$ words) = 3 pts.
   - Sentence fragments control ($< 25\%$ short lines $< 4$ words) = 2 pts.
   - Zero garbled / non-ASCII unicode artifacts (`\uFFFD`) = 2 pts.
   - Standard ATS section headings ($\ge 4$ headings) = 2 pts.
   - Chronological date consistency (valid 4-digit years) = 1 pt.

---

### 5.5 Score Bands & The Mandatory Role-Keyword Gate

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

> **The Mandatory Role-Keyword Gate Rule**:  
> In premier recruiting, a beautifully formatted resume devoid of role competencies will be rejected. If a candidate scores $\ge 75$ points overall but scores $< 5 / 15$ in Dimension 7 (Role-Keyword Match), the system automatically caps the rating at **Moderate** and displays an explicit institutional advisory warning.

---

### 5.6 Priority Fixes Engine (Ranked 01 to 04)
The diagnostic engine sorts all 8 dimensions in descending order of **Points Lost** ($\text{Points Lost} = \text{Max Points} - \text{Score Achieved}$).
- Ranks the top 4 lost-point dimensions as **Priority 01** (Highest Impact), **Priority 02**, **Priority 03**, and **Priority 04** (Tactical Polish).
- **Contextual Quote Extraction**: Rather than generic advice, the system extracts the candidate's *actual sentence* from their resume and illustrates the exact rewrite.

---

### 5.7 Context-Aware Bullet Rewrite Engine (Google XYZ / McKinsey STAR)
Transforms passive or unquantified bullets into executive impact statements using the formula:
$$\text{"Accomplished [X], as measured by [Y], by doing [Z]"}$$

#### Domain-Specific Metric Injection Templates:
- **Consulting**: `", cutting cycle turnaround time by [32% / ₹24 Lakh] across business units."`
- **Finance**: `", identifying [₹120 Crore] in M&A synergy value and sensitivity upside."`
- **Product Management**: `", driving [42%] user adoption and reducing onboarding drop-off by [26%]."`
- **Marketing**: `", reducing blended Customer Acquisition Cost (CAC) by [28%] while scaling LTV by [1.8x]."`
- **Operations & SCM**: `", reducing turnaround time (TAT) by [36%] and defect rates to [<0.5%]."`
- **Analytics & BI**: `", boosting predictive model accuracy to [92.4%] and saving [22 hours] of manual work weekly."`
- **Sales & BD**: `", securing [₹12.5 Crore] in enterprise contract value at [124%] quota attainment."`
- **General Management**: `", expanding business unit operating margins by [240 bps / ₹16 Crore] across 4 verticals."`
- **HR**: `", reducing annualized high-performer attrition by [22%] while lifting engagement scores by [18 points]."`

---

### 5.8 Domain Identification & Transferable Suitability Algorithms

#### 1. Identifying Domain from Target JD (`detectDomainFromJd`)
3-Tier weighted scoring:
- **Tier 1 (Fast Slug/Title Matching)**: +20 pts for explicit keyword strings in title/URL.
- **Tier 2 (Word-Bounded Title Keywords)**: +6 pts per match.
- **Tier 3 (Core Competency Vocabulary)**: +3 pts per match across 18 competency regexes.
- **Confidence Floor**: Highest-scoring domain must score $\ge 6$ pts to be assigned.

#### 2. Identifying Domain from Candidate Resume (`calculateDomainSuitability`)
Simultaneously evaluates the candidate's resume across **all 28 recruitment domains** to calculate transferable readiness:
$$\text{Kw Score} = \left(\frac{\text{Matched Domain Competencies}}{\text{Total Domain Keywords}}\right) \times 55$$
$$\text{Title Score} = \min(18, \text{Title Matches} \times 6)$$
$$\text{Raw Suitability Score} = \text{round}(\text{Kw Score} + \text{Title Score} + \text{Primary Title Bonus} + 10)$$
$$\text{Final Score} = \max(20, \min(98, \text{Raw Suitability Score}))$$
- **Primary Title Bonus (+25 pts)**: Awarded if the candidate's headline or work experience explicitly contains the domain's title.
- **Fit Tier**: Strong Fit ($\ge 70\%$), Moderate Fit ($45-69\%$), Developing Fit ($< 45\%$).
- **Synergy vs Pivot Insight**: Alerts the candidate whether their profile exhibits direct alignment (Synergy) or strong adjacent transferable strength (Pivot Opportunity).

---

### 5.9 28 Master Target Domains & 4 Career Levels Matrix (112 Benchmark JDs)

```
                       4 STANDARDIZED CAREER LEVELS
         ┌────────────┬─────────────┬─────────────┬─────────────┐
         │   CAMPUS   │    EARLY    │     MID     │   SENIOR    │
         │ (0-2 yrs)  │  (2-5 yrs)  │ (5-10 yrs)  │  (10+ yrs)  │
┌────────┼────────────┼─────────────┼─────────────┼─────────────┤
│ CON    │ CON-CAMPUS │ CON-EARLY   │ CON-MID     │ CON-SENIOR  │
│ FIN    │ FIN-CAMPUS │ FIN-EARLY   │ FIN-MID     │ FIN-SENIOR  │
│ IB     │ IB-CAMPUS  │ IB-EARLY    │ IB-MID      │ IB-SENIOR   │
│ ...    │ ...        │ ...         │ ...         │ ...         │
│ (28)   │ (28 JDs)   │ (28 JDs)    │ (28 JDs)    │ (28 JDs)    │
└────────┴────────────┴─────────────┴─────────────┴─────────────┘
  Total: 28 Domains x 4 Career Levels = 112 Consolidated Benchmark JDs
```

#### The 28 Master Domains:
| # | Code | Target Domain | Category | Representative Roles |
|---|---|---|---|---|
| 1 | `CON` | **Consulting** | Functional | Management Consultant, Strategy Analyst, Associate |
| 2 | `FIN` | **Finance** | Functional | Financial Analyst, FP&A Manager, Credit Analyst, Treasury |
| 3 | `IB` | **Investment Banking** | Functional | IB Analyst, Equity Research, M&A Associate, ECM/DCM |
| 4 | `SAL` | **Sales** | Functional | Enterprise Account Executive, B2B BD Lead, Key Account Manager |
| 5 | `MKT` | **Marketing** | Functional | Brand Manager, Digital Marketing Lead, Growth Marketer |
| 6 | `PM` | **Product Management** | Functional | Associate Product Manager (APM), Technical PM, Group PM |
| 7 | `HR` | **Human Resources** | Functional | HR Business Partner (HRBP), Talent Acquisition Lead, C&B |
| 8 | `GM` | **General Management** | Functional | Management Trainee (MT), Chief of Staff, BU Head |
| 9 | `OPS` | **Operations** | Functional | Operations Manager, Plant Head, Continuous Improvement |
| 10 | `SCM` | **Supply Chain** | Functional | Logistics Planner, Procurement Manager, S&OP Lead |
| 11 | `PRC` | **PR & Communications** | Functional | Corporate Communications, Media Relations, Brand PR |
| 12 | `LEG` | **Legal** | Functional | Corporate Counsel, Contracts Lead, Legal Compliance Officer |
| 13 | `BA` | **Business Analytics** | Functional | BI Analyst, Data Strategist, Quantitative Modeler |
| 14 | `ITS` | **IT & Systems** | Functional | IT Consultant, Enterprise Solutions Architect, Systems Lead |
| 15 | `CSM` | **Customer Success** | Functional | Customer Success Manager, Client Retention Director |
| 16 | `ENT` | **Entrepreneurship** | Functional | Founder Office Lead, Venture Builder, Incubation Associate |
| 17 | `HCM` | **Healthcare Management** | Industry | Hospital Operations Manager, Healthcare Consultant |
| 18 | `AGB` | **Agribusiness** | Industry | Agri-Value Chain Specialist, Rural Marketing Lead |
| 19 | `RTL` | **Retail Management** | Industry | Category Manager, Store Operations, Retail Merchandiser |
| 20 | `RE` | **Real Estate** | Industry | Asset Manager, Real Estate Development, Project Finance |
| 21 | `PPD` | **Public Policy & Development**| Industry | Policy Fellow, Government Advisory Consultant |
| 22 | `ESG` | **ESG & Sustainability** | Industry | Sustainability Auditor, Scope 1-3 Lead, ESG Reporting |
| 23 | `ECM` | **E-commerce** | Industry | D2C Growth Lead, Marketplace Category Manager, Quick-Commerce |
| 24 | `MED` | **Media & Entertainment** | Industry | Content Monetization Lead, Digital Media Strategist |
| 25 | `ENR` | **Energy** | Industry | Renewable Energy Analyst, Grid Transformation Consultant |
| 26 | `INF` | **Infrastructure** | Industry | Infrastructure Financing, Public-Private Partnership (PPP) |
| 27 | `TEL` | **Telecom** | Industry | 5G Enterprise Solutions Lead, Network Commercial Lead |
| 28 | `EDT` | **EdTech** | Industry | Academic Product Manager, Institutional Skilling Director |

---

## 6. Cloud Infrastructure, Security Governance & Storage

### 6.1 Cloud Firestore Data Schema & Collections

```
Firebase Project: my-career-company (496139507516)
├── institutional_leads/          # Inbound B2B pilot requests from /contact
│   └── {leadId}                  # name, email, phone, institution, role, cohortSize, submittedAt
│
├── resume_assessments/           # Full paired diagnostic reports
│   └── {assessmentId}            # candidateType, institution, totalScore, band, gateNotice,
│                                 # dimensions (8 items), detectedDomain, timestamp, reviewerEmail
│
├── unique_resumes/               # Deduplicated candidate CV raw text and metadata
│   └── {resumeHash}              # rawText, wordCount, pageCount, fileName, firstSeenAt, hash
│
├── unique_job_descriptions/      # Parsed custom & benchmark target JDs
│   └── {jdHash}                  # role, domain, level, fullText, wordCount, firstSeenAt, hash
│
├── allowed_users/                # Whitelist of authenticated evaluators
│   └── {userEmail}               # email, name, role, institution, grantedBy, grantedAt, isActive
│       └── invitations/          # Audit trail of dispatched access invitation emails
│
└── mail/                         # Firebase Trigger Email queue (auto-dispatched via cloud functions)
    └── {mailId}                  # to, message: { subject, html, text }
```

---

### 6.2 Firestore & Cloud Storage Security Rules
- **Public Write / Protected Read**: Anonymous visitors can submit institutional leads via `/contact`. Reads, updates, and deletes are strictly prohibited to public users.
- **Candidate Assessment Logging**: Authenticated sessions can append records to `resume_assessments`, `unique_resumes`, and `unique_job_descriptions`.
- **Co-Founder Administrative Whitelist**: Read, update, and delete access across assessments, resumes, JDs, and evaluator management is exclusively restricted to the 4 verified Co-Founder email addresses:
  - `upam.patra@gmail.com`
  - `iimonkataki@mycareercompany.com`
  - `ibonkataki@mycareercompany.com`
  - `anirbanroy@mycareercompany.com`

---

### 6.3 Firebase Edge Hosting & URL Routing (`firebase.json`)
The root `firebase.json` coordinates CDN edge rewrites, redirects, clean URLs, and sub-path mapping:

```json
{
  "hosting": {
    "public": ".",
    "cleanUrls": true,
    "trailingSlash": false,
    "redirects": [
      { "source": "/resumefitscore", "destination": "/ResumeFitScore", "type": 301 },
      { "source": "/resumefitscore/**", "destination": "/ResumeFitScore", "type": 301 }
    ],
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
    ]
  }
}
```

---

### 6.4 Local Proxy Server & Email Dispatch API (`server.js`)
For local staging and evaluator invitation automation, `server.js` hosts a zero-dependency Node.js HTTP server on port 3000:
- Resolves all MIME types (`.html`, `.css`, `.js`, `.json`, `.png`, `.pdf`, etc.).
- Normalizes `/resumefitscore` case-insensitively.
- Exposes `POST /api/send-access-email` and `POST /ResumeFitScore/api/send-access-email`: logs dispatch events from `support@mycareercompany.com` and automatically proxies payloads to the Google Apps Script webhook for Google Workspace email delivery.

---

## 7. Corporate Governance, Leadership Directory & Contact Channels

### 7.1 Founding Leadership Team
All founding partners hold verified credentials from premier Indian Institutes of Management (IIMs) and active corporate leadership roles:

1. **Anirban Roy** — *Founding Partner*
   - Academic Credential: **IIM Indore**
   - Corporate Position: Chief Digital Revenue Product Manager (ICICI Securities; Ex - Angel One, Share India)
   - Practice Specialization: Personal Interviews (PI), Corporate Business Cases, AI Placements
   - Official Email: `anirbanroy@mycareercompany.com`
   - LinkedIn: [Search Profile](https://www.linkedin.com/search/results/all/?keywords=Anirban%20Roy%20IIM%20Indore)

2. **Ibon Tarun Kataki** — *Founding Partner*
   - Academic Credential: **IIM Indore**
   - Corporate Position: Strategy & Finance Consultant (Accenture; Ex - Axis Bank)
   - Practice Specialization: Corporate Finance, Strategy, Consulting Casing, Agentic AI
   - Official Email: `ibonkataki@mycareercompany.com`
   - LinkedIn: [Search Profile](https://www.linkedin.com/search/results/all/?keywords=Ibon%20Tarun%20Kataki)

3. **Iimon Tarun Kataki** — *Founding Partner*
   - Academic Credential: **IIM Ranchi**
   - Corporate Position: Category & Business Manager (KONE; Ex - IndiaMART, VGL)
   - Practice Specialization: E-Commerce, Marketing Strategy, Category Management, Gen AI
   - Official Email: `iimonkataki@mycareercompany.com`
   - LinkedIn: [Search Profile](https://www.linkedin.com/search/results/all/?keywords=Iimon%20Tarun%20Kataki)

4. **Upam Patra** — *Founding Partner & Engineering Lead*
   - Academic Credential: **IIM Indore**
   - Corporate Position: Digital Product Manager (AU Small Finance Bank; Ex - Axis Bank)
   - Practice Specialization: Technology Architecture, Vibe Coding, AI & Full-Stack Systems
   - Official Email: `upam.patra@gmail.com`
   - LinkedIn: [Search Profile](https://www.linkedin.com/search/results/all/?keywords=Upam%20Patra%20IIM%20Indore)

### 7.2 Central Contact & Support Desks
- **Official Institutional Support Desk**: `support@mycareercompany.com`
- **Primary Telephone / WhatsApp Helpline**: `+91 8145295101`
- **Headquarters / Operations**: India

---

## 8. Recruiter & Alumni Placement Ecosystem (50 Marquee Firms)

The readiness rubrics, casing scenarios, and scoring benchmarks are derived from alumni representation across **50 marquee recruiters**:

```
┌─────────────────────────────────┬────────────────────────────────────────────────────────┐
│ Industry Recruitment Sector     │ Marquee Recruiters Represented in Ecosystem            │
├─────────────────────────────────┼────────────────────────────────────────────────────────┤
│ Strategy & Management Consulting│ McKinsey & Company, Boston Consulting Group (BCG),     │
│                                 │ Bain & Company, Accenture Strategy, Deloitte, PwC,     │
│                                 │ Ernst & Young (EY), Thoucentric, Vector Consulting,    │
│                                 │ Everest Group                                          │
├─────────────────────────────────┼────────────────────────────────────────────────────────┤
│ Investment Banking & Markets    │ Goldman Sachs, J.P. Morgan, Morgan Stanley,            │
│                                 │ Bank of America (BofA), Barclays, Deutsche Bank (DB),   │
│                                 │ Nomura, CLSA, Motilal Oswal                            │
├─────────────────────────────────┼────────────────────────────────────────────────────────┤
│ Commercial Banking & BFSI       │ HDFC Bank, ICICI Bank, Axis Bank, IndusInd Bank,       │
│                                 │ AU Small Finance Bank, Bandhan Bank, RBL Bank, HSBC,    │
│                                 │ American Express (Amex), Northern Arc, Angel One       │
├─────────────────────────────────┼────────────────────────────────────────────────────────┤
│ Ratings & Financial Analytics   │ CRISIL, ICRA                                           │
├─────────────────────────────────┼────────────────────────────────────────────────────────┤
│ Consumer Goods & FMCG / Retail  │ Unilever, AB InBev, L'Oréal, Diageo, KONE,             │
│                                 │ VGL (Vaibhav Global), Concentrix                       │
├─────────────────────────────────┼────────────────────────────────────────────────────────┤
│ Tech Giants & Enterprise Cloud  │ Google, Amazon, Salesforce                             │
├─────────────────────────────────┼────────────────────────────────────────────────────────┤
│ E-Commerce & Quick-Commerce     │ Zepto, Zomato, PhonePe, Paytm, Meesho, IndiaMART,      │
│                                 │ District, Tomorrow Capital                             │
├─────────────────────────────────┼────────────────────────────────────────────────────────┤
│ Energy & Infrastructure         │ GAIL                                                   │
└─────────────────────────────────┴────────────────────────────────────────────────────────┘
```

---

## 9. Pre-Engineered GenAI System Prompts & Operational Modes

When utilizing Claude, ChatGPT, or Gemini with this file, copy and paste the prompt templates below to initialize specialized copilot modes:

### Mode A: B-School Resume Diagnostic & ATS Evaluator Prompt
```text
You are the Chief Diagnostic Evaluator at My Career Company (www.mycareercompany.com/ResumeFitScore).
You adhere strictly to the 8-Dimension Evaluation Rubric (100-Point Index) and the Luxury Consulting Standards.
Evaluate the candidate's resume against the target Job Description or chosen Domain:
1. Contact & Recruiter Links (10 pts)
2. Section Structure & Standard Headings (15 pts)
3. Quantified Impact & Metrics Density (20 pts - 50% threshold)
4. Action Verbs vs Weak / Passive Phrases (10 pts - 60% threshold, -1 per weak phrase)
5. Bullet Quality & Length Discipline (10 pts - 10 to 30 words)
6. Page Length Discipline (10 pts - strictly 1 page / 450-550 words)
7. Role & Domain Keyword Competency Match (15 pts - 9/18 keywords threshold)
8. Formatting & ATS Parsing Compliance (10 pts)

CRITICAL GOVERNANCE RULE:
If the candidate's composite score >= 75 points but Dimension 7 (Role-Keywords) is < 5/15,
you MUST cap the rating at "MODERATE" and issue the Mandatory Role-Keyword Gate advisory warning.

Deliver output with:
- Composite Score & Band (Strong / Moderate / Needs Work)
- Vector Breakdown Table
- Top 4 Priority Fixes (Ranked 01 to 04 with candidate's actual extracted sentences)
- Context-Aware Bullet Rewrites using the Google XYZ / McKinsey STAR formula
- Domain Transferable Suitability Insight (Synergy vs Pivot)
```

### Mode B: Institutional B2B Advisory & Dean Proposal Copilot
```text
You are the Strategic Institutional Advisor for My Career Company (www.mycareercompany.com).
Your audience consists of Deans, Placement Chairpersons, and Directors of premier Indian management institutes (IIMs, IIT DoMs, XLRI, SPJIMR, NMIMS, Symbiosis).
Core Guidelines:
- Emphasize the institutional proposition: "You bring opportunities, we prepare students to convert them."
- Frame Career Clinic as an empirical partner to the placement cell that solves the 4 structural disconnects of the Readiness Gap without causing academic disruption.
- Highlight the 4 Founding Partners' verified IIM credentials and track record (1,200+ trained at IIM Indore x FYREFL-I and CIPMAT across 5 IIMs).
- NEVER promise guaranteed placements; enforce consulting rigor and measured diagnostic telemetry.
```

### Mode C: Full-Stack Engineering & Codebase Copilot
```text
You are the Principal Systems Architect for My Career Company's web applications.
Technical Stack:
- Project 1: Semantic HTML5, Vanilla CSS, Vanilla JS, Firebase Hosting, Cloud Firestore, Cloud Storage, Google Apps Script Webhook.
- Project 2 (/ResumeFitScore): Client-Side PDF.js, Mammoth.js, LocalStorage caching, Firebase Auth (Google OAuth Whitelist popup), Firestore repository synchronization, Node.js proxy server.
Rules:
- Strictly adhere to the Luxury Consulting Design System (Forest Green #05261F, #073D32, Champagne Gold #D4AF7C, Ivory #F8F6EF, Montserrat).
- Enforce the Zero Horizontal Distortion Guarantee (no 100vw, overflow-x: hidden/clip, touch-action: pan-y).
- Maintain client-side data privacy guarantees.
- Always provide clean, dependency-free, high-performance code.
```

---
*© 2026 My Career Company. Compiled for Generative AI ingestion, enterprise engineering continuity, and executive leadership.*
