/**
 * MY CAREER COMPANY — MULTI-PAGE PLATFORM
 * Master UI Controller & Interaction Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  initStickyHeader();
  initMobileMenu();
  highlightActiveNavLink();
  initFrameworkPage();
  initReadinessScorePage();
  initContactForm();
});

/* ==========================================================================
   01. Header & Navigation Controller
   ========================================================================== */
function initStickyHeader() {
  const header = document.getElementById('site-header');
  if (!header) return;

  const onScroll = () => {
    if (window.scrollY > 30) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-toggle-btn');
  const navMenu = document.getElementById('primary-nav');
  if (!toggleBtn || !navMenu) return;

  toggleBtn.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      toggleBtn.setAttribute('aria-expanded', 'false');
    });
  });
}

function highlightActiveNavLink() {
  const currentPath = window.location.pathname.toLowerCase().replace(/\/$/, "");
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const cleanHref = href.toLowerCase().replace(/\/$/, "");

    if (currentPath === cleanHref || 
        (currentPath === "" && (cleanHref === "/" || cleanHref === "index.html")) ||
        (currentPath.endsWith(cleanHref) && cleanHref !== "")) {
      link.classList.add('active');
    }
  });
}

/* ==========================================================================
   02. Framework Page: Interactive 6-Stage Roadmap
   ========================================================================== */
const FRAMEWORK_DATA = {
  assess: {
    index: "01",
    label: "01 | ASSESS",
    title: "Assess: Career Readiness Assessment",
    desc: "Baseline evaluation of candidate capabilities across 7 employability dimensions, alongside line-by-line Resume Audits and target Role Mapping.",
    activities: [
      "7-Dimension Baseline Diagnostic Audit",
      "Line-by-line Resume & ATS Vulnerability Review",
      "Target Role Mapping (Consulting, BFSI, Product, General Management)",
      "Proctored blind casing baseline evaluation"
    ],
    outputTitle: "Readiness Score + Gap Report",
    outputDesc: "Granular candidate baseline profile and institutional gap telemetry."
  },
  diagnose: {
    index: "02",
    label: "02 | DIAGNOSE",
    title: "Diagnose: Identify Skill & Profile Gaps",
    desc: "Deep-tier competency gap analysis isolating specific vulnerabilities in unstructured casing, commercial acumen, and high-pressure communication.",
    activities: [
      "Competency deficiency mapping vs Day-0 recruiter rubrics",
      "Vulnerability heatmaps identifying high-risk failure patterns",
      "Behavioral storyboarding and narrative gap assessment",
      "Group discussion intervention cadence and presence evaluation"
    ],
    outputTitle: "Diagnostic Benchmark & Gap Matrix",
    outputDesc: "Cohort-wide vulnerability heatmaps for placement cell intervention."
  },
  plan: {
    index: "03",
    label: "03 | PLAN",
    title: "Plan: Personalised Roadmap",
    desc: "Crafting bespoke Personal Placement Plans™ tailored to individual student gaps, target corporate sectors, and placement timelines.",
    activities: [
      "Custom Personal Placement Plan™ generation",
      "30-Day structured milestone roadmap allocation",
      "Target aspirational sector primer distribution",
      "Dedicated mentor and peer practice quadrant assignment"
    ],
    outputTitle: "Personal Placement Plan™ (PPP)",
    outputDesc: "Individualized 30-day intervention pathway and milestone schedule."
  },
  prepare: {
    index: "04",
    label: "04 | PREPARE",
    title: "Prepare: Learning & Guided Practice",
    desc: "Intensive clinical workshops converting theoretical academic inputs into applied boardroom problem solving and structured communication.",
    activities: [
      "Applied commercial acumen, P&L levers, and unit economics masterclasses",
      "The Minto Pyramid Principle & top-down synthesis drills",
      "Resume surgery: XYZ quantified impact statement formulation",
      "MECE problem breakdown and hypothesis tree construction"
    ],
    outputTitle: "Master CV & Business Toolkits",
    outputDesc: "ATS-vetted Master CV and sector strategy briefing repositories."
  },
  simulate: {
    index: "05",
    label: "05 | SIMULATE",
    title: "Simulate: GD + Case + PI Simulations",
    desc: "Realistic, proctored simulations replicating Day-0 recruiter intensity, partner cross-questioning, and strict time constraints.",
    activities: [
      "Proctored Mock GDs with consensus and mediation scoring",
      "Blind 1:1 Case Interviews conducted by seasoned IIM alumni",
      "Partner-level stress Mock PIs testing behavioral edge-cases",
      "Real-time evaluation rubrics mirroring actual recruiter scorecards"
    ],
    outputTitle: "Simulation Feedback & Rubrics",
    outputDesc: "Objective evaluator rubrics, video recordings, and rapid-iteration feedback."
  },
  improve: {
    index: "06",
    label: "06 | IMPROVE",
    title: "Improve: Feedback & Reassessment",
    desc: "Targeted remedial iteration, final score reassessment across all 7 dimensions, and psychological readiness conditioning.",
    activities: [
      "Targeted remedial coaching addressing simulation feedback",
      "Full cohort re-assessment to quantify readiness score delta",
      "Interview opening hook and partner gravitas calibration",
      "Placement ready sign-off and Dean's exit telemetry briefing"
    ],
    outputTitle: "Placement Ready Certification",
    outputDesc: "Validated placement readiness certification and final institutional report."
  }
};

function initFrameworkPage() {
  const nodes = document.querySelectorAll('.roadmap-node-btn[data-stage]');
  if (!nodes.length) return;

  const titleEl = document.getElementById('stage-title');
  const descEl = document.getElementById('stage-desc');
  const activitiesList = document.getElementById('stage-activities');
  const outputTitleEl = document.getElementById('stage-output-title');
  const outputDescEl = document.getElementById('stage-output-desc');

  nodes.forEach(node => {
    node.addEventListener('click', () => {
      const stageKey = node.getAttribute('data-stage');
      const data = FRAMEWORK_DATA[stageKey];
      if (!data) return;

      nodes.forEach(n => n.classList.remove('active'));
      node.classList.add('active');

      if (titleEl) titleEl.textContent = data.title;
      if (descEl) descEl.textContent = data.desc;
      if (activitiesList) {
        activitiesList.innerHTML = data.activities
          .map(act => `<li>▸ ${act}</li>`)
          .join('');
      }
      if (outputTitleEl) outputTitleEl.textContent = data.outputTitle;
      if (outputDescEl) outputDescEl.textContent = data.outputDesc;
    });
  });
}

/* ==========================================================================
   03. Career Readiness Score™ Page
   Circular Gauge Animation (68/100, Moderate, Consulting/Strategy)
   ========================================================================== */
function initReadinessScorePage() {
  const gaugeFill = document.getElementById('score-gauge-fill');
  if (!gaugeFill) return;

  // Circumference = 2 * PI * 82 ≈ 515.22
  const totalCircumference = 515.22;
  const targetScore = 68;
  const targetOffset = totalCircumference - (targetScore / 100) * totalCircumference;

  setTimeout(() => {
    gaugeFill.style.strokeDashoffset = targetOffset.toFixed(2);
  }, 300);

  // Interactive Dimension Cards
  const dimCards = document.querySelectorAll('.dim-bar-card');
  const detailBox = document.getElementById('score-detail-text');

  const DIM_TEXTS = {
    resume: "Resume & Profile (74/100): Clear ATS formatting; requires quantified XYZ impact bullets on pre-MBA work experience.",
    comm: "Communication (61/100): Strong vocabulary; lacks executive brevity and top-down Minto Pyramid synthesis.",
    biz: "Business Knowledge (78/100): Solid macroeconomic understanding; needs review on sector unit economics and margin levers.",
    gd: "GD Readiness (57/100): Hesitant entry timing in unstructured group discussions; struggles to steer group consensus.",
    case: "Case Solving (71/100): Methodical MECE issue trees; needs speed conditioning on rapid mental arithmetic.",
    pi: "Personal Interview (52/100): Critical priority. Unstructured behavioral STAR storytelling and anxiety under partner pressure.",
    role: "Role Readiness (64/100): Developing alignment with Tier-1 consulting partner expectations; requires mock immersion."
  };

  dimCards.forEach(card => {
    card.addEventListener('click', () => {
      dimCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const dimKey = card.getAttribute('data-dim');
      if (detailBox && DIM_TEXTS[dimKey]) {
        detailBox.textContent = DIM_TEXTS[dimKey];
      }
    });
  });
}

/* ==========================================================================
   04. Institutional Pilot / Contact Form
   ========================================================================== */
function initContactForm() {
  const form = document.getElementById('institutional-contact-form');
  const successState = document.getElementById('contact-success-state');
  if (!form || !successState) return;

  // If firebase-leads.js is handling submission, defer to it
  if (typeof window.submitInstitutionalLead === 'function') {
    return;
  }

  form.addEventListener('submit', (e) => {
    // If handled by firebase-leads.js listener, don't double handle
    if (e.defaultPrevented) return;
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting Enquiry...';
    }

    setTimeout(() => {
      form.style.display = 'none';
      successState.style.display = 'block';
    }, 600);
  });
}
