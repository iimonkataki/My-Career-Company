# My Career Company

> **PEOPLE | GUIDANCE | OPPORTUNITIES**  
> *Consulting-grade career readiness & placement acceleration platform engineered for MBA, PGDM, EPGP, and executive education business schools.*

[![Platform](https://img.shields.io/badge/Platform-Multi--Page%20Web-073D32?style=flat-square)](https://my-career-company.web.app)
[![Hosting](https://img.shields.io/badge/Hosting-Firebase%20Hosting-D4AF7C?style=flat-square)](https://my-career-company.web.app)
[![Database](https://img.shields.io/badge/Database-Cloud%20Firestore-FFA000?style=flat-square)](https://console.firebase.google.com/project/my-career-company/firestore)
[![Design](https://img.shields.io/badge/Design-Consulting%20Grade%20Executive-073D32?style=flat-square)](#visual-identity)

---

## Executive Overview

**My Career Company** is an institutional career-readiness partner designed to solve the critical **Readiness Gap** between business school academic curricula and Tier-1 recruiter expectations. 

Through its flagship **Career Clinic** 5-day accelerator, the platform equips management students with consulting-grade casing rigor, structured top-down communication (Minto Pyramid), commercial acumen, and Day-0 personal interview gravitas.

---

## Visual Identity & Brand System

Built around a luxury consulting color hierarchy and clean typography:

| Token | Hex | Role |
|---|---|---|
| **Deep Forest Green** | `#073D32` | Hero sections, global headers/footers, high-contrast containers |
| **Champagne Gold** | `#D4AF7C` | Luxury accents, score tracks, pill borders, primary CTAs |
| **Warm Ivory** | `#F8F6EF` | Alternating section blocks, cards, and input backgrounds |
| **Deep Charcoal** | `#1C2421` | High-contrast typography and executive readability |
| **Typography** | Montserrat | Clean geometric sans-serif across all headings, titles, and body |

---

## Architecture & Multi-Page Sitemap

This repository is constructed as an **11-page institutional platform** where each core concept from the advisory pitch deck has its own dedicated page:

| # | Route | File | Institutional Purpose |
|---|---|---|---|
| 1 | `/` | `index.html` | Executive landing, telemetry previews, and framework overview |
| 2 | `/readiness-gap` | `readiness-gap.html` | Disconnect analysis: Student Inputs vs Recruiter Expectations |
| 3 | `/framework` | `framework.html` | Interactive 6-Stage clinical methodology (Assess &rarr; Diagnose &rarr; Plan &rarr; Prepare &rarr; Simulate &rarr; Improve) |
| 4 | `/career-clinic` | `career-clinic.html` | Flagship 5-Day Career Clinic accelerator & Dean's Telemetry |
| 5 | `/career-clinic/readiness-score` | `readiness-score.html` | Career Readiness Score™ gauge (68/100) + 7 diagnostic dimensions |
| 6 | `/career-clinic/placement-plan` | `placement-plan.html` | Personal Placement Plan™ (4 modules + 30-day action roadmap) |
| 7 | `/students` | `students.html` | 5 Student capability pillars (Resume, Narrative, Acumen, GD, Case) |
| 8 | `/institutions` | `institutions.html` | Dual-stakeholder alignment (*"You bring opportunities, we prepare students to convert them"*) |
| 9 | `/leadership` | `leadership.html` | Founding profiles with verified IIM alumni credentials |
| 10 | `/experience` | `experience.html` | Proven track record: Pocket MBAs x FYREFL-I & CIPMAT™ |
| 11 | `/contact` | `contact.html` | Institutional pilot booking & partnership onboarding |

---

## Technology Stack

- **Core**: Vanilla HTML5, modern semantic structures, responsive meta tags.
- **Styling**: Tailored CSS custom properties (`css/style.css`) with zero third-party framework overhead.
- **Interactions**: Vanilla JavaScript (`js/app.js`) powering sticky headers, mobile menu drawers, dynamic framework inspection, and circular gauges.
- **Backend & Database**: 
  - **Cloud Firestore**: Real-time lead ingestion (`js/firebase-leads.js`) writing to the `institutional_leads` collection.
  - **Firebase Analytics**: Real-time telemetry (`G-6GK1XN2NKZ`).
  - **Firebase Hosting**: Production global edge CDN hosting with clean URLs and custom routing rewrites (`firebase.json`).

---

## Lead Generation Engine (Cloud Firestore)

Every submission through the **"Book an Institutional Pilot"** form on `/contact` triggers the Firebase Lead Generation Engine:
1. **Client-Side Validation**: Ensures complete contact details, role, cohort size, and institutional email.
2. **Firestore Sync**: Inserts document into collection `institutional_leads` with `serverTimestamp()`.
3. **Reference Code**: Generates a verifiable institutional reference ID (e.g. `MCC-4K9L2P`).
4. **Local Fallback**: Saves an offline snapshot in `localStorage` ensuring zero lead loss during network interruptions.
5. **Security**: Governed by [`firestore.rules`](./firestore.rules) (public creates permitted, unauthorized reads prohibited).

---

## Local Development

To run the multi-page platform locally with clean URL routing:

```powershell
# Start the local PowerShell HTTP server
powershell -ExecutionPolicy Bypass -File .\server.ps1
```

Visit: **`http://localhost:8080/`**

---

## Deployment to Firebase Hosting

The project is pre-configured with the Firebase CLI:

```powershell
# 1. Authenticate with your Google Account (one-time)
.\firebase login

# 2. Deploy to Firebase Hosting and Firestore Security Rules
.\firebase deploy --project my-career-company
```

Live Production Domain:
**`https://my-career-company.web.app`**

---

## Institutional Governance

- **Advisory Integrity**: My Career Company operates strictly as an institutional career-readiness partner. We do not make speculative guaranteed-placement claims.
- **Data Confidentiality**: All student diagnostic reports, assessment rubrics, and institutional telemetries are held under institutional non-disclosure agreements.

---

© 2026 My Career Company. All rights reserved.
