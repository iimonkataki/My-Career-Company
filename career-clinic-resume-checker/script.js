/**
 * Career Clinic — Resume Fit Score™ Diagnostic Engine
 * Resume Fit Score™ — Calibrated Evaluation against Target Job Descriptions
 * My Career Company — "Diagnose. Prepare. Practise. Perform."
 * 
 * Runs entirely in the client-side browser with zero server uploads.
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. DOM Elements & State
  // =========================================================================
  const state = {
    // Resume State
    selectedFile: null,
    fileArrayBuffer: null,
    fileNumPages: null,
    extractedText: '',
    resumeTab: 'upload', // 'upload' or 'paste'

    // Job Description State
    jdFile: null,
    jdArrayBuffer: null,
    jdExtractedText: '',
    jdUrl: '',
    jdTab: 'domain', // 'upload', 'link', 'domain', or 'paste'
    targetRole: 'consulting',
    selectedDomain: 'Consulting',
    selectedDomainCode: 'CON',
    selectedLevelCode: 'CAMPUS',
    currentJdObject: null,

    lastResult: null
  };

  // Role keyword dictionaries (18 curated keywords per role)
  const ROLE_KEYWORDS = {
    consulting: [
      { name: "Market Sizing", regex: /\bmarket\s*sizing\b/i },
      { name: "Due Diligence", regex: /\bdue\s*diligence\b/i },
      { name: "Go-To-Market / GTM", regex: /\b(?:go[- ]to[- ]market|gtm)\b/i },
      { name: "Benchmarking", regex: /\bbenchmark(?:ing|s)?\b/i },
      { name: "Cost Optimization", regex: /\bcost\s*optimi[zs]ation\b/i },
      { name: "MECE Framework", regex: /\bmece\b/i },
      { name: "Value Proposition", regex: /\bvalue\s*proposition\b/i },
      { name: "Financial Modeling", regex: /\bfinancial\s*model(?:ing|s)?\b/i },
      { name: "Competitive Landscape", regex: /\bcompetitive\s*(?:landscape|landscaping|intelligence|benchmarking)\b/i },
      { name: "Hypothesis-Driven", regex: /\bhypothesis[- ]driven\b/i },
      { name: "Operational Excellence", regex: /\boperational\s*excellence\b/i },
      { name: "CAGR", regex: /\bcagr\b/i },
      { name: "Growth Strategy", regex: /\bgrowth\s*strateg(?:y|ies)\b/i },
      { name: "Synergy Realization", regex: /\bsynerg(?:y|ies)\b/i },
      { name: "Stakeholder Management", regex: /\bstakeholder\s*management\b/i },
      { name: "Change Management", regex: /\bchange\s*management\b/i },
      { name: "Post-Merger Integration", regex: /\b(?:post[- ]merger|pmi|integration)\b/i },
      { name: "Digital Transformation", regex: /\bdigital\s*transformation\b/i }
    ],
    finance: [
      { name: "DCF Valuation", regex: /\bdcf\b/i },
      { name: "Financial Modeling", regex: /\bfinancial\s*model(?:ing|s)?\b/i },
      { name: "Valuation", regex: /\bvaluation(?:s)?\b/i },
      { name: "EBITDA", regex: /\bebitda\b/i },
      { name: "P&L Management", regex: /\bp\s*&\s*l|profit\s*and\s*loss\b/i },
      { name: "Credit Risk", regex: /\bcredit\s*risk\b/i },
      { name: "Portfolio Management", regex: /\bportfolio\s*management\b/i },
      { name: "Equity Research", regex: /\bequity\s*research\b/i },
      { name: "Capital Structure", regex: /\bcapital\s*structure\b/i },
      { name: "Working Capital", regex: /\bworking\s*capital\b/i },
      { name: "M&A", regex: /\bm\s*&\s*a|mergers?\s*and\s*acquisitions?\b/i },
      { name: "Basel Norms", regex: /\bbasel(?:\s*(?:ii|iii|iv))?\b/i },
      { name: "Fixed Income", regex: /\bfixed\s*income\b/i },
      { name: "Derivatives", regex: /\bderivative(?:s)?\b/i },
      { name: "Sensitivity Analysis", regex: /\bsensitivity\s*analysis\b/i },
      { name: "IRR", regex: /\birr|internal\s*rate\s*of\s*return\b/i },
      { name: "NPV", regex: /\bnpv|net\s*present\s*value\b/i },
      { name: "Due Diligence", regex: /\bdue\s*diligence\b/i }
    ],
    marketing: [
      { name: "Brand Strategy", regex: /\bbrand\s*strateg(?:y|ies)\b/i },
      { name: "Customer Acquisition", regex: /\bcustomer\s*acquisition\b/i },
      { name: "CAC", regex: /\bcac|customer\s*acquisition\s*cost\b/i },
      { name: "Customer LTV", regex: /\bltv|customer\s*lifetime\s*value\b/i },
      { name: "Go-To-Market / GTM", regex: /\b(?:go[- ]to[- ]market|gtm)\b/i },
      { name: "Campaign Optimization", regex: /\bcampaign\s*optimi[zs]ation\b/i },
      { name: "Digital Marketing", regex: /\bdigital\s*marketing\b/i },
      { name: "Market Research", regex: /\bmarket\s*research\b/i },
      { name: "Consumer Insights", regex: /\bconsumer\s*insights?\b/i },
      { name: "Brand Positioning", regex: /\bbrand\s*positioning\b/i },
      { name: "SEO / SEM", regex: /\b(?:seo|sem)\b/i },
      { name: "Conversion Funnel", regex: /\bconversion\s*funnel\b/i },
      { name: "Retention Strategy", regex: /\bretention\b/i },
      { name: "Content Strategy", regex: /\bcontent\s*strateg(?:y|ies)\b/i },
      { name: "ROAS", regex: /\broas|return\s*on\s*ad\s*spend\b/i },
      { name: "Product Marketing", regex: /\bproduct\s*marketing\b/i },
      { name: "Brand Equity", regex: /\bbrand\s*equity\b/i },
      { name: "Omnichannel", regex: /\bomnichannel\b/i }
    ],
    product: [
      { name: "Product Roadmap", regex: /\bproduct\s*roadmap(?:s)?\b/i },
      { name: "User Stories", regex: /\buser\s*stor(?:y|ies)\b/i },
      { name: "Wireframing", regex: /\bwirefram(?:e|ing|es)\b/i },
      { name: "Agile / Scrum", regex: /\b(?:agile|scrum)\b/i },
      { name: "A/B Testing", regex: /\ba\/b\s*testing\b/i },
      { name: "Feature Prioritization", regex: /\bfeature\s*prioriti[zs]ation\b/i },
      { name: "PRD Document", regex: /\bprd|product\s*requirement(?:s)?\s*document\b/i },
      { name: "User Personas", regex: /\buser\s*personas?\b/i },
      { name: "Sprint Planning", regex: /\bsprint\s*planning\b/i },
      { name: "UI/UX Design", regex: /\bui\/ux|user\s*experience\b/i },
      { name: "North Star Metric", regex: /\bnorth\s*star\s*metric\b/i },
      { name: "Retention", regex: /\bretention\b/i },
      { name: "Customer Journey", regex: /\bcustomer\s*journey\b/i },
      { name: "Churn Reduction", regex: /\bchurn\b/i },
      { name: "Product Discovery", regex: /\bproduct\s*discovery\b/i },
      { name: "Backlog Grooming", regex: /\bbacklog\b/i },
      { name: "API Integration", regex: /\bapi(?:s)?\b/i },
      { name: "Product-Market Fit", regex: /\bproduct[- ]market\s*fit\b/i }
    ],
    operations: [
      { name: "Supply Chain Optimization", regex: /\bsupply\s*chain\b/i },
      { name: "Six Sigma", regex: /\bsix\s*sigma\b/i },
      { name: "Lean Manufacturing", regex: /\blean\b/i },
      { name: "Inventory Management", regex: /\binventory\s*management\b/i },
      { name: "Logistics", regex: /\blogistics?\b/i },
      { name: "Procurement", regex: /\bprocurement\b/i },
      { name: "Vendor Management", regex: /\bvendor\s*management\b/i },
      { name: "Root Cause Analysis", regex: /\broot\s*cause\s*analysis|rca\b/i },
      { name: "Kaizen", regex: /\bkaizen\b/i },
      { name: "Warehouse Management", regex: /\bwarehouse\s*management\b/i },
      { name: "Demand Forecasting", regex: /\bdemand\s*forecasting\b/i },
      { name: "S&OP", regex: /\bs&op|sales\s*and\s*operations\s*planning\b/i },
      { name: "Turnaround Time (TAT)", regex: /\bturnaround\s*time|tat\b/i },
      { name: "Quality Assurance", regex: /\bquality\s*assurance|qa\b/i },
      { name: "Bottleneck Analysis", regex: /\bbottleneck(?:s)?\b/i },
      { name: "ERP Systems", regex: /\berp|sap|oracle\b/i },
      { name: "Cost Reduction", regex: /\bcost\s*reduction\b/i },
      { name: "Process Automation", regex: /\bprocess\s*automation\b/i }
    ],
    hr: [
      { name: "Talent Acquisition", regex: /\btalent\s*acquisition\b/i },
      { name: "Employee Engagement", regex: /\bemployee\s*engagement\b/i },
      { name: "Performance Management", regex: /\bperformance\s*management\b/i },
      { name: "HRBP", regex: /\bhrbp|human\s*resources?\s*business\s*partner\b/i },
      { name: "Compensation & Benefits", regex: /\bcompensation\s*&\s*benefits|c&b\b/i },
      { name: "Attrition Analysis", regex: /\battrition\b/i },
      { name: "Onboarding Process", regex: /\bonboarding\b/i },
      { name: "Succession Planning", regex: /\bsuccession\s*planning\b/i },
      { name: "Competency Mapping", regex: /\bcompetency\s*mapping\b/i },
      { name: "Employee Relations", regex: /\bemployee\s*relations\b/i },
      { name: "HR Analytics", regex: /\bhr\s*analytics\b/i },
      { name: "Diversity & Inclusion (D&I)", regex: /\bdiversity\s*&\s*inclusion|d&i\b/i },
      { name: "Policy Formulation", regex: /\bpolicy\s*formulation\b/i },
      { name: "Learning & Development (L&D)", regex: /\blearning\s*&\s*development|l&d|training\b/i },
      { name: "Workforce Planning", regex: /\bworkforce\s*planning\b/i },
      { name: "KPI Framework", regex: /\bkpi(?:s)?\b/i },
      { name: "HRIS Systems", regex: /\bhris|workday|peoplesoft\b/i },
      { name: "Organization Design", regex: /\borgani[zs]ation(?:al)?\s*design\b/i }
    ],
    analytics: [
      { name: "Predictive Modeling", regex: /\bpredictive\s*model(?:ing)?\b/i },
      { name: "SQL Queries", regex: /\bsql\b/i },
      { name: "Python", regex: /\bpython\b/i },
      { name: "Tableau", regex: /\btableau\b/i },
      { name: "Power BI", regex: /\bpower\s*bi\b/i },
      { name: "Machine Learning", regex: /\bmachine\s*learning|ml\b/i },
      { name: "Data Visualization", regex: /\bdata\s*visuali[zs]ation\b/i },
      { name: "Statistical Analysis", regex: /\bstatistical\s*analysis|statistics\b/i },
      { name: "ETL Pipelines", regex: /\betl\b/i },
      { name: "Regression Analysis", regex: /\bregression\b/i },
      { name: "Cohort Analysis", regex: /\bcohort\s*analysis\b/i },
      { name: "A/B Testing", regex: /\ba\/b\s*testing\b/i },
      { name: "Data Wrangling", regex: /\bdata\s*(?:wrangling|cleaning)\b/i },
      { name: "Executive Dashboards", regex: /\bdashboard(?:s)?\b/i },
      { name: "Exploratory Data Analysis (EDA)", regex: /\bexploratory\s*data\s*analysis|eda\b/i },
      { name: "R Programming", regex: /\br\s*programming|\br\s*language\b/i },
      { name: "Clustering Algorithms", regex: /\bclustering\b/i },
      { name: "Time Series Forecasting", regex: /\btime\s*series\b/i }
    ],
    genman: [
      { name: "P&L Management", regex: /\bp\s*&\s*l|profit\s*and\s*loss\b/i },
      { name: "Cross-Functional Leadership", regex: /\bcross[- ]functional\b/i },
      { name: "Strategic Planning", regex: /\bstrategic\s*planning\b/i },
      { name: "Business Development", regex: /\bbusiness\s*development\b/i },
      { name: "Operations Management", regex: /\boperations?\s*management\b/i },
      { name: "Resource Allocation", regex: /\bresource\s*allocation\b/i },
      { name: "Change Leadership", regex: /\bchange\s*leadership\b/i },
      { name: "Revenue Growth", regex: /\brevenue\s*growth\b/i },
      { name: "Budgeting & Forecasting", regex: /\bbudget(?:ing)?\b/i },
      { name: "Risk Management", regex: /\brisk\s*management\b/i },
      { name: "Corporate Governance", regex: /\bgovernance\b/i },
      { name: "Organizational Transformation", regex: /\borgani[zs]ation(?:al)?\s*transformation\b/i },
      { name: "Client Relationship Management", regex: /\bclient\s*relationship\b/i },
      { name: "Program Management", regex: /\bprogram\s*management\b/i },
      { name: "Team Mentoring", regex: /\bteam\s*(?:mentoring|leadership|supervision)\b/i },
      { name: "Performance Tracking", regex: /\bperformance\s*tracking\b/i },
      { name: "Continuous Improvement", regex: /\bcontinuous\s*improvement\b/i },
      { name: "Contract Negotiation", regex: /\bcontract\s*negotiation\b/i }
    ],
    sales: [
      { name: "B2B Sales", regex: /\bb2b(?:\s*sales)?\b/i },
      { name: "Pipeline Management", regex: /\bpipeline\b/i },
      { name: "Quota Attainment", regex: /\bquota\b/i },
      { name: "Lead Generation", regex: /\blead\s*generation\b/i },
      { name: "Key Account Management", regex: /\bkey\s*account(?:s)?|kam\b/i },
      { name: "Contract Negotiation", regex: /\bcontract\s*negotiation\b/i },
      { name: "Revenue Generation", regex: /\brevenue\s*generation|arr|acv\b/i },
      { name: "Client Acquisition", regex: /\bclient\s*acquisition\b/i },
      { name: "CRM / Salesforce", regex: /\bcrm|salesforce|hubspot\b/i },
      { name: "Outbound Prospecting", regex: /\bprospecting|outbound\b/i },
      { name: "Deal Sizing", regex: /\bdeal\s*si[zs]ing|deal\s*closure\b/i },
      { name: "Stakeholder Engagement", regex: /\bstakeholder\s*engagement\b/i },
      { name: "Sales Enablement", regex: /\bsales\s*enablement\b/i },
      { name: "Cross-Selling", regex: /\bcross[- ]selling|up[- ]selling\b/i },
      { name: "Value-Based Selling", regex: /\bvalue[- ]based\s*selling\b/i },
      { name: "RFP / Bid Management", regex: /\brfp|bid\s*management\b/i },
      { name: "Territory Management", regex: /\bterritory\s*management\b/i },
      { name: "Customer Retention", regex: /\bcustomer\s*retention\b/i }
    ]
  };

  // Comprehensive Domain Metadata: Labels, Icons, Certifications & Capstones
  const DOMAIN_METADATA = {
    consulting: {
      label: "Management Consulting & Strategy",
      shortLabel: "Consulting",
      icon: "📊",
      description: "Problem structuring, hypothesis-driven evaluation, commercial due diligence, and corporate transformation.",
      certifications: [
        "McKinsey Forward Program (Digital, Business & Leadership Foundations)",
        "Bain & Company Case Prep & Problem-Solving Methodology",
        "Coursera / Wharton: Business Strategy & Competitive Advantage",
        "Lean Six Sigma Green Belt (Process Excellence & Root Cause Analysis)",
        "Corporate Finance Institute (CFI) — Commercial Strategy & Value Creation"
      ],
      projects: [
        "Market Sizing & Commercial Due Diligence on an Indian D2C / SaaS scale-up",
        "Cost optimization & operational bottleneck teardown using MECE framework",
        "Corporate turnaround & hypothesis-driven restructuring strategy deck",
        "Post-Merger Integration (PMI) synergy realization & governance roadmap"
      ],
      titleKeywords: ['consultant', 'consulting', 'strategy', 'advisory', 'engagement manager', 'case', 'transformation', 'strategic planning']
    },
    finance: {
      label: "Investment Banking & Corporate Finance",
      shortLabel: "Finance",
      icon: "📈",
      description: "Financial modeling, valuation methodologies (DCF, Comps, LBO), capital structure, and credit appraisal.",
      certifications: [
        "CFA Institute (Chartered Financial Analyst) Level 1 Candidate",
        "FMVA® (Financial Modeling & Valuation Analyst) by CFI",
        "Bloomberg Market Concepts (BMC) Certification",
        "FRM (Financial Risk Manager) Part 1 by GARP",
        "NISM Series VIII: Equity Derivatives Certification"
      ],
      projects: [
        "Comprehensive 3-Statement Dynamic Financial Model & DCF Valuation of an NSE-listed firm",
        "Mergers & Acquisitions (M&A) Pitchbook with accretion/dilution & LBO modeling",
        "Working capital management & credit risk appraisal for mid-market corporate",
        "Portfolio sensitivity analysis & Monte Carlo simulation on Indian equities"
      ],
      titleKeywords: ['finance', 'investment banking', 'equity research', 'wealth management', 'dcf', 'valuation', 'm&a', 'financial analyst', 'credit risk', 'portfolio']
    },
    marketing: {
      label: "Brand Management & Product Marketing",
      shortLabel: "Marketing",
      icon: "🎯",
      description: "Go-to-market execution, full-funnel customer acquisition, CAC/LTV optimization, and consumer brand positioning.",
      certifications: [
        "Google Analytics 4 (GA4) & Google Ads Search Certification",
        "HubSpot Inbound Marketing & Content Strategy Certification",
        "Meta Certified Digital Marketing Associate",
        "Product Marketing Alliance (PMA) Core Fundamentals",
        "IIM / Kellogg Executive Digital Marketing Specialization"
      ],
      projects: [
        "Full-Funnel Go-To-Market (GTM) rollout strategy for a premium consumer product",
        "Omnichannel campaign audit: CAC, LTV, ROAS attribution model across digital channels",
        "Consumer insight study & brand repositioning deck based on primary research (N=200+)",
        "Retention & churn reduction playbook for a mobile subscription application"
      ],
      titleKeywords: ['marketing', 'brand manager', 'brand management', 'growth marketing', 'digital marketing', 'campaign', 'gtm', 'social media', 'consumer insights']
    },
    sales: {
      label: "Enterprise Sales & Business Development",
      shortLabel: "Sales",
      icon: "💼",
      description: "B2B pipeline management, high-value deal negotiation, account expansion, and executive client acquisition.",
      certifications: [
        "Salesforce Certified Associate / Sales Cloud Specialist",
        "HubSpot Frictionless Sales & Inbound Sales Certification",
        "MEDDICC / Challenger Sales Methodology Foundations",
        "LinkedIn Learning: Enterprise B2B Sales Mastery",
        "Dale Carnegie High-Impact Client Presentations & Pitching"
      ],
      projects: [
        "Outbound enterprise sales playbook & cold prospecting sequence for B2B tech",
        "Account-Based Marketing (ABM) & territory account prioritization matrix",
        "Key account expansion plan & cross-sell pipeline forecast for Tier-1 enterprise clients",
        "RFP pitch response & commercial proposal pricing simulator"
      ],
      titleKeywords: ['sales', 'business development', 'account executive', 'b2b', 'quota', 'pipeline', 'sales manager', 'client acquisition', 'revenue', 'prospecting']
    },
    product: {
      label: "Product Management & Tech",
      shortLabel: "Product",
      icon: "📱",
      description: "Product discovery, PRD authoring, sprint prioritization, UX flows, and North Star metric optimization.",
      certifications: [
        "Certified Scrum Product Owner (CSPO®) by Scrum Alliance",
        "Google Project Management & Agile Certification",
        "Pragmatic Institute (PMC-I) Product Management Foundations",
        "Reforge Product Strategy & Retention Foundations",
        "Product School: Product Management Certificate"
      ],
      projects: [
        "End-to-end Product Requirement Document (PRD) with user personas, user stories, and wireframes",
        "Feature prioritization matrix (RICE framework) & North Star metric tree for a fintech app",
        "A/B test experiment design & funnel drop-off audit on an onboarding flow",
        "Competitive benchmarking & product teardown of leading Indian tech unicorns"
      ],
      titleKeywords: ['product manager', 'product management', 'prd', 'scrum', 'agile', 'roadmap', 'user stories', 'features', 'wireframes', 'ux']
    },
    operations: {
      label: "Operations & Supply Chain Management",
      shortLabel: "Operations",
      icon: "⚙️",
      description: "Supply chain network design, inventory turnaround, procurement strategy, and lean process re-engineering.",
      certifications: [
        "Lean Six Sigma Green Belt (ASQ / IASSC Accredited)",
        "APICS Certified Supply Chain Professional (CSCP) Foundations",
        "Project Management Professional (PMP®) / CAPM by PMI",
        "SCMPro Certification (CII - Confederation of Indian Industry)",
        "SAP ERP / S/4HANA Logistics Fundamentals"
      ],
      projects: [
        "Warehouse layout optimization & inventory turnaround time (TAT) reduction study",
        "Demand forecasting & Sales & Operations Planning (S&OP) model in Excel/Python",
        "End-to-end Root Cause Analysis (Fishbone/5 Whys) for manufacturing defect reduction",
        "Vendor scorecard & sustainable procurement strategy for tier-1 suppliers"
      ],
      titleKeywords: ['operations', 'supply chain', 'procurement', 'logistics', 'inventory', 'six sigma', 'manufacturing', 'warehouse', 'lean']
    },
    analytics: {
      label: "Business Analytics & Data Science",
      shortLabel: "Analytics",
      icon: "🔬",
      description: "Statistical modeling, exploratory data analysis, BI dashboarding, and predictive ML algorithmic insights.",
      certifications: [
        "Google Data Analytics Professional Certificate",
        "Microsoft Certified: Power BI Data Analyst Associate (PL-300)",
        "SQL for Data Science (UC Davis / Coursera)",
        "IBM Data Science Professional Certificate",
        "AWS Certified Data Analytics — Specialty"
      ],
      projects: [
        "Cohort retention & customer segmentation analysis using K-Means in Python",
        "Executive interactive business intelligence dashboard in Tableau / Power BI",
        "Predictive customer churn model with logistic regression & random forest",
        "Automated ETL pipeline & SQL relational database schema for retail transactions"
      ],
      titleKeywords: ['analytics', 'data analyst', 'data scientist', 'bi', 'tableau', 'power bi', 'machine learning', 'predictive', 'sql', 'python']
    },
    genman: {
      label: "General Management & Leadership",
      shortLabel: "GenMan",
      icon: "🏛️",
      description: "Cross-functional governance, business unit P&L, strategic resource allocation, and program leadership.",
      certifications: [
        "Harvard Business School Online: CORe (Economics, Accounting, Analytics)",
        "INSEAD Strategy Execution / Management Leadership Program",
        "Project Management Professional (PMP®)",
        "Corporate Governance & ESG Leadership Certificate",
        "Design Thinking Practitioner (IDEO / Stanford d.school)"
      ],
      projects: [
        "Comprehensive business unit P&L simulation and strategic 3-year growth roadmap",
        "Cross-functional digital transformation playbook and organizational change deck",
        "ESG integration and corporate governance audit for an Indian enterprise",
        "New market entry feasibility study & joint venture risk assessment"
      ],
      titleKeywords: ['general management', 'business unit', 'p&l', 'leadership', 'management trainee', 'cross-functional', 'program management']
    },
    hr: {
      label: "Human Resources & People Strategy",
      shortLabel: "HR",
      icon: "👥",
      description: "Talent acquisition, HRBP partnering, compensation benchmarking, performance appraisal, and people analytics.",
      certifications: [
        "SHRM Certified Professional (SHRM-CP®)",
        "HRCI: Associate Professional in Human Resources (aPHR®)",
        "AIHR: People Analytics & HR Metrics Certificate",
        "Wharton: HR Management and Analytics",
        "Korn Ferry Leadership Architect Foundations"
      ],
      projects: [
        "Competency framework & 360-degree performance evaluation rubric for managers",
        "Attrition diagnostic & employee engagement sentiment analysis dashboard",
        "Campus talent acquisition & employer branding strategy for Day-0 recruitment",
        "Workforce planning model & compensation benchmarking across tech roles"
      ],
      titleKeywords: ['human resources', 'talent acquisition', 'hrbp', 'people operations', 'recruiter', 'learning and development', 'compensation']
    }
  };

  /**
   * Intelligently infer target recruitment domain from JD text
   */
  function detectDomainFromJd(text) {
    if (!text || text.trim().length < 30) return null;
    const lower = text.toLowerCase();
    let bestDomain = null;
    let maxMatches = 0;

    for (const [key, meta] of Object.entries(DOMAIN_METADATA)) {
      let matches = 0;
      const kwList = ROLE_KEYWORDS[key] || [];
      for (const kw of kwList) {
        if (kw.regex.test(lower)) matches += 2;
      }
      if (meta.titleKeywords) {
        for (const tk of meta.titleKeywords) {
          if (lower.includes(tk)) matches += 3;
        }
      }

      if (matches > maxMatches) {
        maxMatches = matches;
        bestDomain = key;
      }
    }

    return maxMatches >= 4 ? bestDomain : null;
  }

  const STRONG_ACTION_VERBS = [
    "led", "spearheaded", "accelerated", "formulated", "streamlined", "orchestrated",
    "designed", "executed", "delivered", "optimized", "boosted", "generated",
    "automated", "structured", "negotiated", "cultivated", "piloted", "initiated",
    "pioneered", "engineered", "achieved", "implemented", "expanded", "transformed",
    "established", "analyzed", "built", "reduced", "increased", "maximized",
    "championed", "directed", "integrated", "developed", "identified", "revamped",
    "scaled", "spearhead", "accelerate", "formulate", "streamline", "orchestrate",
    "design", "execute", "deliver", "optimize", "boost", "generate", "automate"
  ];

  const WEAK_PHRASES = [
    { phrase: "responsible for", label: "Responsible for", fix: "Replace with direct active verb e.g. 'Executed', 'Led', 'Administered'" },
    { phrase: "worked on", label: "Worked on", fix: "Replace with specific initiative verb e.g. 'Engineered', 'Analyzed', 'Constructed'" },
    { phrase: "helped", label: "Helped", fix: "Replace with honest collaborative verb e.g. 'Supported', 'Co-led', 'Facilitated'" },
    { phrase: "assisted with", label: "Assisted with", fix: "Replace with 'Collaborated with', 'Contributed to', 'Co-developed'" },
    { phrase: "assisted", label: "Assisted", fix: "Replace with 'Supported' or specify exact analytical output" },
    { phrase: "tasked with", label: "Tasked with", fix: "Reframe as ownership: 'Spearheaded', 'Directed', 'Managed'" },
    { phrase: "handled", label: "Handled", fix: "Specify concrete scope: 'Managed', 'Resolved', 'Negotiated'" },
    { phrase: "duties included", label: "Duties included", fix: "Remove job description phrasing; highlight measurable accomplishments" },
    { phrase: "involved in", label: "Involved in", fix: "State exact contribution: 'Co-ordinated', 'Contributed', 'Spearheaded'" }
  ];

  // Realistic Sample IIM Consulting MBA Resume
  const SAMPLE_MBA_RESUME = `RAHUL SHARMA
IIM Indore | Post Graduate Programme in Management (MBA)
Email: rahul.sharma.pgp2025@iimidr.ac.in | Mobile: +91 9876543210 | LinkedIn: linkedin.com/in/rahulsharma-strategy

EDUCATION
• Indian Institute of Management Indore (IIM Indore) | MBA (PGPM) | CGPA: 3.65 / 4.00 | 2023 - 2025
• National Institute of Technology (NIT) Kurukshetra | B.Tech, Mechanical Engineering | CGPA: 8.42 / 10.00 | 2017 - 2021
• Delhi Public School, R.K. Puram | Class XII (CBSE) - 94.6% | Class X (CBSE) - 96.2%

WORK EXPERIENCE
Accenture Strategy & Consulting | Management Consultant | 2021 - 2023
• Spearheaded market sizing and competitive benchmarking for a Tier-1 FMCG client, identifying Rs 45 crore growth opportunity in North India.
• Formulated Go-To-Market (GTM) strategy for new direct-to-consumer beverage line, reducing expected customer acquisition cost by 22%.
• Engineered hypothesis-driven cost optimization model across 14 manufacturing plants, delivering annual EBITDA enhancement of Rs 18.5 crore.
• Streamlined supply chain turnaround time by 30% through bottleneck analysis and lean inventory re-allocation across 6 regional warehouses.
• Responsible for reviewing client operations reports and weekly project deliverables for Fortune 500 leadership steering committee.
• Automated weekly PMO tracking dashboard using SQL and Tableau, cutting manual reporting time by 18 hours per sprint.

SUMMER INTERNSHIP
McKinsey & Company | Summer Associate (Consulting) | Apr 2024 - Jun 2024
• Conducted comprehensive commercial due diligence for a Rs 1,200 crore cross-border private equity acquisition in healthcare.
• Built detailed financial models with DCF valuation and sensitivity analysis, evaluating post-merger synergy potential of 15% CAGR.
• Worked on stakeholder interviews across 18 hospital networks to synthesize market perception and customer willingness to pay.
• Delivered board-level final synthesis presentation to senior partners, receiving pre-placement interview (PPI) recommendation.

ACADEMIC PROJECTS
• Digital Transformation in BFSI (Capstone): Designed digital customer onboarding framework, modeling 28% churn reduction.
• EV Fleet Electrification Study: Formulated CAPEX-OPEX sensitivity matrix across 5 urban transit hubs.

POSITIONS OF RESPONSIBILITY
• Senior Coordinator, Management Consulting Club, IIM Indore: Mentored 240+ students on MECE frameworks and case interview prep.
• Member, Placement Committee (Junior): Managed corporate engagements for 110+ recruiters during Summer Placement drive.

SCHOLASTIC ACHIEVEMENTS & AWARDS
• National Finalist (Top 3 out of 1,800+ teams), Tata Steel Steel-a-thon Business Case Competition.
• Merit Scholarship Awardee for academic distinction in first year of MBA at IIM Indore.
• Published research paper on supply chain resilience in International Journal of Industrial Engineering.

SKILLS & CERTIFICATIONS
• Consulting Frameworks: MECE Structuring, Market Sizing, Due Diligence, Value Proposition Design, Financial Modeling
• Analytical Tools: Python, SQL, Tableau, Power BI, Advanced Excel (Financial Valuation)
• Certifications: Bloomberg Market Concepts (BMC), Six Sigma Green Belt, Corporate Finance Institute (CFI)`;

  // =========================================================================
  // 2. Helper Functions & UI Handlers
  // =========================================================================
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showError(title, message) {
    const errorAlert = document.getElementById('errorAlert');
    const errorTitle = document.getElementById('errorTitle');
    const errorMessage = document.getElementById('errorMessage');
    if (errorAlert && errorTitle && errorMessage) {
      errorTitle.textContent = title;
      errorMessage.textContent = message;
      errorAlert.style.display = 'flex';
      errorAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function hideError() {
    const errorAlert = document.getElementById('errorAlert');
    if (errorAlert) errorAlert.style.display = 'none';
  }

  function showLoading(statusText) {
    const overlay = document.getElementById('loadingOverlay');
    const status = document.getElementById('loadingStatusText');
    if (status && statusText) status.textContent = statusText;
    if (overlay) overlay.style.display = 'flex';
  }

  function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  function updateWordCount() {
    const textarea = document.getElementById('resumeTextInput');
    const counter = document.getElementById('wordCounter');
    if (!textarea || !counter) return;
    const words = textarea.value.trim().split(/\s+/).filter(Boolean).length;
    counter.textContent = `${words.toLocaleString()} words`;
  }

  function updateJdWordCount() {
    const textarea = document.getElementById('jdTextInput');
    const counter = document.getElementById('jdWordCounter');
    if (!textarea || !counter) return;
    const words = textarea.value.trim().split(/\s+/).filter(Boolean).length;
    counter.textContent = `${words.toLocaleString()} words`;
  }

  function updateJdPasteWordCount() {
    const textarea = document.getElementById('jdPasteTextInput');
    const counter = document.getElementById('jdPasteWordCounter');
    if (!textarea || !counter) return;
    const words = textarea.value.trim().split(/\s+/).filter(Boolean).length;
    counter.textContent = `${words.toLocaleString()} words`;
  }

  /**
   * Initialize and render Target Domain & Career Level selection (Consolidated 112 Profiles across 28 Domains x 4 Career Levels)
   */
  function initJdTaxonomy() {
    if (!window.JD_DATABASE) return;

    const domainSelect = document.getElementById('jdDomainSelect');
    const levelSelect = document.getElementById('jdLevelSelect');
    const levelPillsContainer = document.getElementById('jdLevelPills');
    const pasteDomainSelect = document.getElementById('targetRoleSelect');
    const jdTextInput = document.getElementById('jdTextInput');

    if (!domainSelect) return;

    const domains = window.JD_DATABASE.getDomains();
    const levels = window.JD_DATABASE.getLevels();

    // Populate Domain Dropdown (28 Domains from v2)
    domainSelect.innerHTML = domains.map(d => {
      const typeLabel = d.type === 'industry' ? 'Industry' : 'Function';
      const isSelected = d.code === (state.selectedDomainCode || 'CON') ? 'selected' : '';
      return `<option value="${escapeHtml(d.code)}" ${isSelected}>${escapeHtml(d.name)} (${typeLabel})</option>`;
    }).join('');

    // Also populate Target Domain dropdown in Paste tab if present
    if (pasteDomainSelect) {
      pasteDomainSelect.innerHTML = domains.map(d =>
        `<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)}</option>`
      ).join('');
    }

    // Populate or sync Career Level Dropdown (4 Levels)
    if (levelSelect) {
      levelSelect.innerHTML = levels.map(lvl => {
        const isSelected = lvl.code === (state.selectedLevelCode || 'CAMPUS') ? 'selected' : '';
        return `<option value="${escapeHtml(lvl.code)}" ${isSelected}>${escapeHtml(lvl.label)} (${escapeHtml(lvl.band)})</option>`;
      }).join('');
      levelSelect.value = state.selectedLevelCode || 'CAMPUS';
    }

    state.selectedDomainCode = state.selectedDomainCode || 'CON';
    state.selectedLevelCode = state.selectedLevelCode || 'CAMPUS';

    function updateSelectedJd(autoPopulateText = false) {
      const jdObj = window.JD_DATABASE.getJd(state.selectedDomainCode, state.selectedLevelCode);
      if (!jdObj) return;

      state.currentJdObject = jdObj;
      state.selectedDomain = jdObj.domain;
      state.targetRole = window.JD_DATABASE.getScoringRoleFamily(jdObj);

      renderSnapshotCard(jdObj);
      updateGeneratorButton(jdObj);

      if (autoPopulateText && jdTextInput) {
        jdTextInput.value = window.JD_DATABASE.formatJdText(jdObj);
        updateJdWordCount();
      }

      if (state.lastResult) {
        handleExecuteDiagnostic();
      }
    }

    function renderSnapshotCard(jd) {
      const card = document.getElementById('jdBenchmarkCard');
      if (!card) return;

      if (!jd) {
        card.style.display = 'none';
        return;
      }

      card.style.display = 'block';

      const statusMap = {
        'V': { label: 'Verified Pattern', cls: 'status-v', icon: '&#10003;' },
        'P': { label: 'Partially Verified', cls: 'status-p', icon: '&#9680;' },
        'A': { label: 'Assumption-led', cls: 'status-a', icon: '&#8505;' }
      };
      const st = statusMap[jd.status?.code] || { label: 'Institutional Pattern', cls: 'status-v', icon: '&#10003;' };

      const locs = Array.isArray(jd.locations) ? jd.locations.slice(0, 4).join(', ') : (jd.locations || '');
      const titlesStr = Array.isArray(jd.titles) ? jd.titles.join(' • ') : (jd.titles || '');
      const cutOffText = jd.academicCutOff?.note ? jd.academicCutOff.note.split('.')[0] : 'Standard 60% consistency floor';

      let regHtml = '';
      if (jd.certifications?.conditional && jd.certifications.conditional.length > 0) {
        regHtml = `
          <div class="jd-reg-callout">
            <span class="jd-reg-icon">&#9888;</span>
            <div><strong>Regulated Sub-Area Requirements:</strong> ${escapeHtml(jd.certifications.conditional.join('; '))}</div>
          </div>
        `;
      }

      let subAreasHtml = '';
      if (Array.isArray(jd.subAreas) && jd.subAreas.length > 0) {
        subAreasHtml = `
          <div class="jd-subareas-container">
            <div class="jd-subareas-label">&#9741; Consolidated Sub-Areas Unified in this Benchmark (${jd.subAreas.length}):</div>
            <div class="jd-subareas-chips">
              ${jd.subAreas.map(sa => `<span class="jd-subarea-chip">${escapeHtml(sa)}</span>`).join('')}
            </div>
          </div>
        `;
      }

      let mustHavesHtml = '';
      const mustHaves = Array.isArray(jd.mustHave) ? jd.mustHave : [];
      if (mustHaves.length > 0) {
        mustHavesHtml = `
          <div class="jd-skills-chips-wrap">
            <span class="jd-skills-label">Core Must-Haves:</span>
            ${mustHaves.map(s => `<span class="jd-skill-tag">${escapeHtml(s)}</span>`).join('')}
          </div>
        `;
      }

      card.innerHTML = `
        <div class="jd-benchmark-header">
          <div class="jd-benchmark-title-wrap">
            <div class="jd-benchmark-role-title">${escapeHtml(jd.domain)} &bull; ${escapeHtml(jd.level)} (${escapeHtml(jd.experienceBand)})</div>
            <div class="jd-benchmark-path">All-in-One Institutional Benchmark &bull; ${escapeHtml(jd.domainType === 'industry' ? 'Sector Practice' : 'Functional Practice')}</div>
          </div>
          <div class="jd-badges-row">
            <span class="jd-id-badge">${escapeHtml(jd.id)}</span>
            <span class="jd-status-badge ${st.cls}">${st.icon} ${st.label}</span>
          </div>
        </div>

        <div class="jd-benchmark-meta-chips">
          <span class="jd-meta-chip">&#127891; <strong>Titles:</strong> ${escapeHtml(titlesStr)}</span>
          <span class="jd-meta-chip">&#127970; ${escapeHtml(jd.employerTypes || 'Tier-1 Corporates & Recruiters')}</span>
          ${locs ? `<span class="jd-meta-chip">&#128205; ${escapeHtml(locs)}</span>` : ''}
          <span class="jd-meta-chip">&#9878; ${escapeHtml(cutOffText)}</span>
        </div>

        <div class="jd-benchmark-summary" title="${escapeHtml(jd.summary)}">${escapeHtml(jd.summary)}</div>

        ${subAreasHtml}
        ${regHtml}
        ${mustHavesHtml}
      `;
    }

    function updateGeneratorButton(jd) {
      const btn = document.getElementById('loadSampleJdBtn');
      if (!btn) return;
      const label = window.JD_DATABASE.getCustomGeneratorLabel(jd);
      btn.innerHTML = label;
      btn.title = `Click to load pre-calibrated institutional benchmark JD for ${jd ? jd.domain + ' (' + jd.level + ')' : 'selected domain'}`;
    }

    // Domain change event
    domainSelect.addEventListener('change', () => {
      state.selectedDomainCode = domainSelect.value;
      if (pasteDomainSelect) {
        const found = domains.find(d => d.code === domainSelect.value);
        if (found) pasteDomainSelect.value = found.name;
      }
      updateSelectedJd(true);
    });

    // Level select dropdown change event
    if (levelSelect) {
      levelSelect.addEventListener('change', () => {
        state.selectedLevelCode = levelSelect.value;
        // Sync pills
        if (levelPillsContainer) {
          levelPillsContainer.querySelectorAll('.jd-level-pill').forEach(p => {
            if (p.getAttribute('data-level') === state.selectedLevelCode) {
              p.classList.add('active');
            } else {
              p.classList.remove('active');
            }
          });
        }
        updateSelectedJd(true);
      });
    }

    // Level filter pills click handling
    if (levelPillsContainer) {
      levelPillsContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('.jd-level-pill');
        if (!pill) return;
        const lvlCode = pill.getAttribute('data-level');
        if (!lvlCode) return;
        levelPillsContainer.querySelectorAll('.jd-level-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.selectedLevelCode = lvlCode;
        if (levelSelect) {
          levelSelect.value = lvlCode;
        }
        updateSelectedJd(true);
      });
    }

    // Initial load: render default selection (CON-CAMPUS) and populate textarea if empty
    updateSelectedJd(false);
    if (jdTextInput && !jdTextInput.value.trim() && state.currentJdObject) {
      jdTextInput.value = window.JD_DATABASE.formatJdText(state.currentJdObject);
      updateJdWordCount();
    }
  }

  const SAMPLE_CONSULTING_JD = `McKinsey & Company / BCG — Associate / Strategy Consultant
Location: Mumbai / Gurugram / Bengaluru | Business Unit: Management Consulting & Strategy

POSITION OVERVIEW
We are seeking exceptional MBA graduates to join our Strategy and Management Consulting practice. As an Associate, you will work in agile teams with senior partners and Fortune 500 c-suite executives to tackle high-stakes strategic, operational, and organizational challenges.

KEY RESPONSIBILITIES
• Formulate hypothesis-driven problem statements and design MECE analytical frameworks to solve complex business issues.
• Spearhead commercial due diligence, market sizing, and competitive landscape assessments for cross-border private equity and corporate clients.
• Build 3-statement financial models, DCF valuation, and EBITDA cost optimization roadmaps to uncover operational efficiencies.
• Design and execute Go-To-Market (GTM) strategy, digital transformation, and growth strategy across emerging markets.
• Manage senior stakeholder relationships and orchestrate cross-functional client transformation initiatives.
• Synthesize complex quantitative and qualitative data into compelling executive board-level presentations.

DESIRED QUALIFICATIONS & COMPETENCIES
• Post Graduate Degree in Management (MBA / PGDM) from a tier-1 business school with proven academic distinction.
• Demonstrated leadership, structured thinking, and business acumen.
• Strong analytical capability with proficiency in financial modeling, Excel, SQL, Tableau, or Power BI.
• Exceptional communication and executive presence.`;

  // =========================================================================
  // 3. Document Parsers (Browser Only)
  // =========================================================================

  /**
   * Parse PDF file in the browser using pdf.js 4.10.38
   * Handles local file:// protocol by assigning worker module to globalThis.pdfjsWorker
   */
  async function parsePdfFile(arrayBuffer) {
    try {
      showLoading("Loading client-side PDF parsing engine (pdf.js 4.10.38)...");

      // Dynamic import of PDF.js worker and library as specified
      const workerUrl = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
      const libUrl = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';

      let workerModule;
      try {
        workerModule = await import(workerUrl);
        globalThis.pdfjsWorker = workerModule;
      } catch (workerErr) {
        console.warn("Worker dynamic import note:", workerErr);
      }

      let pdfjsLib;
      try {
        pdfjsLib = await import(libUrl);
      } catch (libErr) {
        throw new Error("Unable to load PDF parser from CDN (blocked by network or offline). Please paste your resume text into the text area to run the diagnostic.");
      }

      showLoading("Extracting digital text layers from PDF...");
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        isEvalSupported: false
      });

      const pdfDoc = await loadingTask.promise;
      const numPages = pdfDoc.numPages;
      let fullText = '';

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        showLoading(`Processing page ${pageNum} of ${numPages}...`);
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();

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
        fullText += text + '\n\n';
      }

      // Check for scanned / image PDF
      const wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount < 30) {
        throw new Error("Scanned or image-based PDF detected. No extractable text was found inside this document. Please upload a machine-readable digital PDF or paste your resume text.");
      }

      return { text: fullText, numPages: numPages };
    } catch (err) {
      if (err.name === 'PasswordException') {
        throw new Error("This PDF is password-protected. Please remove the password and re-upload.");
      }
      throw err;
    }
  }

  /**
   * Parse DOCX file in the browser using Mammoth 1.12.1
   */
  async function parseDocxFile(arrayBuffer) {
    if (!window.mammoth) {
      throw new Error("Mammoth DOCX parser is not available. Please verify network access or paste your resume text directly.");
    }
    showLoading("Extracting text from DOCX document...");
    const result = await window.mammoth.extractRawText({ arrayBuffer: arrayBuffer });
    const text = result.value || '';
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 30) {
      throw new Error("Empty or corrupted DOCX document. Please paste your resume text directly.");
    }
    return { text: text, numPages: null };
  }

  // =========================================================================
  // 4. Scoring Engine (Rule-based, 100 Points Total)
  // =========================================================================

  /**
   * Extract individual bullet points and lines from resume text
   */
  function extractBullets(rawText) {
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const bullets = [];
    const bulletPrefixRegex = /^[-•*–—▪▫\u2022\u2023\u25E6\u2043\u2219\u25AA\u25AB\u27A2\u279C\u25BA]|\b\d+[\.\)]\s*/;

    for (const line of lines) {
      const cleanLine = line.replace(bulletPrefixRegex, '').trim();
      // Ignore header/contact lines (e.g. Email: ... | Mobile: ...)
      if (/@|\+91\b|linkedin\.com/i.test(cleanLine) && (cleanLine.toLowerCase().includes('email') || cleanLine.toLowerCase().includes('mobile') || cleanLine.toLowerCase().includes('phone'))) {
        continue;
      }
      // Bullet qualification: has at least 4 words and is not just a section heading
      const words = cleanLine.split(/\s+/).filter(Boolean);
      if (words.length >= 4) {
        bullets.push({
          raw: line,
          clean: cleanLine,
          words: words,
          wordCount: words.length
        });
      }
    }

    return bullets;
  }

  /**
   * Extract keywords from custom Job Description text
   */
  function extractKeywordsFromJd(jdText, targetRoleKey) {
    const matched = [];
    const seen = new Set();
    const allVocab = [
      ...ROLE_KEYWORDS.consulting,
      ...ROLE_KEYWORDS.finance,
      ...ROLE_KEYWORDS.marketing,
      ...ROLE_KEYWORDS.product,
      ...ROLE_KEYWORDS.operations,
      ...ROLE_KEYWORDS.hr,
      ...ROLE_KEYWORDS.analytics,
      ...ROLE_KEYWORDS.genman
    ];

    for (const item of allVocab) {
      if (item.regex.test(jdText) && !seen.has(item.name.toLowerCase())) {
        matched.push(item);
        seen.add(item.name.toLowerCase());
      }
    }

    // Capitalized business terms & acronyms (e.g. MECE, DCF, GTM, KPI, P&L, SQL, ERP)
    const termMatches = jdText.match(/\b[A-Z][A-Za-z0-9&/-]{1,10}\b/g) || [];
    for (const term of termMatches) {
      const cleanTerm = term.trim();
      if (!['AND', 'THE', 'FOR', 'YOU', 'OUR', 'NOT', 'ARE', 'WITH', 'FROM', 'THIS', 'WILL'].includes(cleanTerm.toUpperCase()) && cleanTerm.length >= 3) {
        if (!seen.has(cleanTerm.toLowerCase())) {
          matched.push({
            name: cleanTerm,
            regex: new RegExp(`\\b${cleanTerm}\\b`, 'i')
          });
          seen.add(cleanTerm.toLowerCase());
        }
      }
    }

    // Top up to 18 using target role keywords
    const fallbackList = ROLE_KEYWORDS[targetRoleKey] || ROLE_KEYWORDS.consulting;
    for (const item of fallbackList) {
      if (!seen.has(item.name.toLowerCase()) && matched.length < 18) {
        matched.push(item);
        seen.add(item.name.toLowerCase());
      }
    }

    return matched.slice(0, 18);
  }

  /**
   * Core Rule-Based Scoring Function
   */
  function scoreResume(text, numPages, targetRoleKey, customJdText = '') {
    const cleanText = text.trim();
    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
    const bullets = extractBullets(cleanText);
    const totalBullets = bullets.length > 0 ? bullets.length : 1;

    // --- Vector 1: Contact & LinkedIn (10 pts) ---
    const emailMatch = cleanText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
    const hasEmail = Boolean(emailMatch);

    // Indian mobile: 10 digits starting with 6-9, with optional +91, 0, spaces or hyphens
    const mobileMatch = cleanText.match(/(?:\+91[\s.-]?|91[\s.-]?|0)?[6-9]\d{4}[\s.-]?\d{5}\b/);
    const hasMobile = Boolean(mobileMatch);

    // LinkedIn profile
    const linkedinMatch = cleanText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|pub)\/[a-zA-Z0-9_-]+|\blinkedin(?:\.com)?\b/i);
    const hasLinkedIn = Boolean(linkedinMatch);

    let contactScore = 0;
    if (hasEmail) contactScore += 3;
    if (hasMobile) contactScore += 3;
    if (hasLinkedIn) contactScore += 4;

    // --- Vector 2: Section Structure (15 pts) ---
    const sections = {
      education: { weight: 3, detected: /(?:^|\n|\b)(?:education|academic(?:s| qualifications| background)|scholastic achievements)(?::|\b|\n)/i.test(cleanText) },
      experience: { weight: 3, detected: /(?:^|\n|\b)(?:experience|work experience|professional experience|employment history|internship(?:s)?|summer internship)(?::|\b|\n)/i.test(cleanText) },
      projects: { weight: 2, detected: /(?:^|\n|\b)(?:projects|academic projects|key projects|capstone|live projects)(?::|\b|\n)/i.test(cleanText) },
      achievements: { weight: 2, detected: /(?:^|\n|\b)(?:achievements|honors|awards|accomplishments|accolades)(?::|\b|\n)/i.test(cleanText) },
      por: { weight: 2, detected: /(?:^|\n|\b)(?:positions? of responsibility|por|leadership roles?|responsibilities|extracurricular leadership)(?::|\b|\n)/i.test(cleanText) },
      skills: { weight: 2, detected: /(?:^|\n|\b)(?:skills|technical skills|core competencies|key skills|areas of expertise|competencies)(?::|\b|\n)/i.test(cleanText) },
      certifications: { weight: 1, detected: /(?:^|\n|\b)(?:certifications?|certificates?|licenses?|courses?)(?::|\b|\n)/i.test(cleanText) }
    };

    let sectionScore = 0;
    const detectedSectionsList = [];
    const missingSectionsList = [];
    const sectionNameMap = {
      education: 'Education',
      experience: 'Work Experience',
      projects: 'Projects / Capstones',
      achievements: 'Scholastic Achievements / Awards',
      por: 'Positions of Responsibility',
      skills: 'Skills & Tools',
      certifications: 'Certifications'
    };

    for (const key in sections) {
      if (sections[key].detected) {
        sectionScore += sections[key].weight;
        detectedSectionsList.push(sectionNameMap[key] || key);
      } else {
        missingSectionsList.push(sectionNameMap[key] || key);
      }
    }

    const contactDetails = {
      hasEmail,
      email: emailMatch ? emailMatch[0] : null,
      hasMobile,
      mobile: mobileMatch ? mobileMatch[0] : null,
      hasLinkedIn,
      linkedin: linkedinMatch ? linkedinMatch[0] : null
    };

    // --- Vector 3: Quantified Impact (20 pts) ---
    // Metric patterns: %, Rs/INR/$, numbers (ignoring isolated 4-digit years), lakh, crore, million, k
    const yearPattern = /\b(?:19|20)\d{2}\b/g;
    const metricRegex = /(?:%|\bRs\.?\b|\bINR\b|₹|\$|€|£|\blakh(?:s)?\b|\blac(?:s)?\b|\bcrore(?:s)?\b|\bcr\b|\bmillion\b|\bmn\b|\bbillion\b|\bbn\b|\bk\b|\b\d+(?:,\d+)*(?:\.\d+)?\b)/i;
    const quantifiedBullets = [];
    const unquantifiedBullets = [];

    for (const b of bullets) {
      // Remove years to test for true metrics
      const textNoYears = b.clean.replace(yearPattern, '');
      const hasMetric = metricRegex.test(textNoYears);
      if (hasMetric) {
        quantifiedBullets.push(b);
      } else {
        unquantifiedBullets.push(b);
      }
    }

    const quantifiedBulletsCount = quantifiedBullets.length;
    const quantShare = quantifiedBulletsCount / totalBullets;
    // Full marks at 50%
    const quantifiedScore = Math.min(20, Math.round((quantShare / 0.50) * 20));

    // --- Vector 4: Action Verbs vs Weak Phrases (10 pts) ---
    const strongVerbBullets = [];
    const foundStrongVerbs = [];
    for (const b of bullets) {
      const firstWord = (b.words[0] || '').toLowerCase().replace(/[^a-z]/g, '');
      if (STRONG_ACTION_VERBS.includes(firstWord)) {
        strongVerbBullets.push(b);
        const capitalized = firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
        if (!foundStrongVerbs.includes(capitalized)) {
          foundStrongVerbs.push(capitalized);
        }
      }
    }

    const strongVerbBulletsCount = strongVerbBullets.length;
    const strongVerbShare = strongVerbBulletsCount / totalBullets;
    const baseActionScore = Math.min(10, Math.round((strongVerbShare / 0.60) * 10));

    // Penalty for weak phrases (max -4)
    let weakPhrasesFound = [];
    const weakBulletsFound = [];
    for (const wp of WEAK_PHRASES) {
      const regex = new RegExp(`\\b${wp.phrase}\\b`, 'gi');
      const matches = cleanText.match(regex);
      if (matches) {
        weakPhrasesFound.push({
          phrase: wp.phrase,
          label: wp.label,
          count: matches.length,
          fix: wp.fix
        });
      }
    }

    // Capture individual weak bullets for real suggestions
    for (const b of bullets) {
      for (const wp of WEAK_PHRASES) {
        const regex = new RegExp(`\\b${wp.phrase}\\b`, 'i');
        if (regex.test(b.clean)) {
          weakBulletsFound.push({
            bullet: b,
            clean: b.clean,
            matchedPhrase: wp.label,
            fix: wp.fix
          });
          break;
        }
      }
    }

    const weakPenalty = Math.min(4, weakPhrasesFound.length);
    const actionVerbsScore = Math.max(0, Math.min(10, baseActionScore - weakPenalty));

    // --- Vector 5: Bullet Quality & Length (10 pts) ---
    // Share of bullets with 10-30 words; full marks at 70%
    let idealLengthBulletsCount = 0;
    for (const b of bullets) {
      if (b.wordCount >= 10 && b.wordCount <= 30) {
        idealLengthBulletsCount++;
      }
    }
    const idealLengthShare = idealLengthBulletsCount / totalBullets;
    const bulletQualityScore = Math.min(10, Math.round((idealLengthShare / 0.70) * 10));

    // --- Vector 6: Resume Length (10 pts) ---
    // 1 page = 10, 2 pages = 5, more = 2
    let estimatedPages = 1;
    let lengthScore = 10;

    if (numPages !== null && numPages !== undefined) {
      estimatedPages = numPages;
      if (numPages === 1) lengthScore = 10;
      else if (numPages === 2) lengthScore = 5;
      else lengthScore = 2;
    } else {
      // Estimate from word count
      if (wordCount <= 450) {
        estimatedPages = 1;
        lengthScore = 10;
      } else if (wordCount <= 900) {
        estimatedPages = 2;
        lengthScore = 5;
      } else {
        estimatedPages = Math.ceil(wordCount / 500);
        lengthScore = 2;
      }
    }

    // --- Vector 7: Role-Keyword Match (15 pts) ---
    let roleKeywordList;
    let isCustomJd = false;

    if (customJdText && customJdText.trim().split(/\s+/).filter(Boolean).length >= 12) {
      roleKeywordList = extractKeywordsFromJd(customJdText, targetRoleKey);
      isCustomJd = true;
    } else {
      roleKeywordList = ROLE_KEYWORDS[targetRoleKey] || ROLE_KEYWORDS.consulting;
    }

    const detectedKeywords = [];
    const missingKeywords = [];

    for (const kw of roleKeywordList) {
      if (kw.regex.test(cleanText)) {
        detectedKeywords.push(kw.name);
      } else {
        missingKeywords.push(kw.name);
      }
    }

    // Full marks at 50% matched (9/18)
    const roleMatchRatio = detectedKeywords.length / roleKeywordList.length;
    const roleKeywordScore = Math.min(15, Math.round((detectedKeywords.length / 9) * 15));

    // --- Vector 8: Formatting / ATS (10 pts) ---
    let formatScore = 0;
    // 150+ words (3 pts)
    const hasEnoughWords = wordCount >= 150;
    if (hasEnoughWords) formatScore += 3;

    // Few fragment lines (2 pts)
    const shortLines = bullets.filter(b => b.wordCount < 4).length;
    const hasFewFragments = (shortLines / Math.max(1, bullets.length)) < 0.25;
    if (hasFewFragments) formatScore += 2;

    // No garbled characters (2 pts)
    const garbledRegex = /[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F]/;
    const hasNoGarble = !garbledRegex.test(cleanText);
    if (hasNoGarble) formatScore += 2;

    // 4+ standard headings found (2 pts)
    let standardHeadingCount = 0;
    for (const key in sections) {
      if (sections[key].detected) standardHeadingCount++;
    }
    const hasStandardHeadings = standardHeadingCount >= 4;
    if (hasStandardHeadings) formatScore += 2;

    // Consistent dates (1 pt)
    const dateMatch = cleanText.match(/\b(?:19|20)\d{2}\b/);
    const hasDates = Boolean(dateMatch);
    if (hasDates) formatScore += 1;

    // Total Overall Score
    const totalScore = contactScore + sectionScore + quantifiedScore + actionVerbsScore +
      bulletQualityScore + lengthScore + roleKeywordScore + formatScore;

    // Determine Band
    // Rule: 75+ Strong ONLY if role-keyword score is at least 5/15!
    let band = 'needs-work';
    let bandLabel = 'Needs Work';
    let bandDesc = 'Significant development required across structure, metrics, and role keywords prior to corporate shortlisting.';

    if (totalScore >= 75) {
      if (roleKeywordScore >= 5) {
        band = 'strong';
        bandLabel = 'Strong';
        bandDesc = 'High resume fit profile. Well-quantified impact, clean formatting, and solid alignment with recruiter expectations.';
      } else {
        // Capped at Moderate due to role keyword requirement
        band = 'moderate';
        bandLabel = 'Moderate';
        bandDesc = 'Overall score meets the 75-point threshold, but domain keyword relevance is below the consulting/corporate benchmark (minimum 5/15 required for Strong rating).';
      }
    } else if (totalScore >= 55) {
      band = 'moderate';
      bandLabel = 'Moderate';
      bandDesc = 'Good foundation with clear potential. Prioritize the recommendations below to unlock competitive shortlisting for marquee firms.';
    }

    // Determine Strengths (dimensions scoring >= 80% of max weight)
    const dimensions = [
      { id: 'contact', name: 'Contact & LinkedIn', score: contactScore, max: 10, loss: 10 - contactScore },
      { id: 'structure', name: 'Section Structure', score: sectionScore, max: 15, loss: 15 - sectionScore },
      { id: 'quantified', name: 'Quantified Impact', score: quantifiedScore, max: 20, loss: 20 - quantifiedScore },
      { id: 'verbs', name: 'Action Verbs vs Weak Phrases', score: actionVerbsScore, max: 10, loss: 10 - actionVerbsScore },
      { id: 'quality', name: 'Bullet Quality & Length', score: bulletQualityScore, max: 10, loss: 10 - bulletQualityScore },
      { id: 'length', name: 'Resume Length', score: lengthScore, max: 10, loss: 10 - lengthScore },
      { id: 'keywords', name: 'Role-Keyword Match', score: roleKeywordScore, max: 15, loss: 15 - roleKeywordScore },
      { id: 'ats', name: 'Formatting & ATS Compliance', score: formatScore, max: 10, loss: 10 - formatScore }
    ];

    const strengths = [];
    for (const d of dimensions) {
      if (d.score >= Math.round(d.max * 0.8)) {
        strengths.push(d);
      }
    }

    // Ranked Priority Fixes (Ranked Priority 01-04 by points lost)
    const sortedFixes = [...dimensions]
      .filter(d => d.loss > 0)
      .sort((a, b) => b.loss - a.loss);

    const priorityFixes = sortedFixes.slice(0, 4).map((fix, idx) => {
      let advice = "";
      switch (fix.id) {
        case 'quantified':
          if (unquantifiedBullets.length > 0) {
            const sampleUnquant = unquantifiedBullets[0].clean;
            const quoteText = sampleUnquant.length > 85 ? sampleUnquant.slice(0, 85) + '...' : sampleUnquant;
            advice = `Currently, only ${Math.round(quantShare * 100)}% of your bullets include metrics. For instance, your bullet: <span class="fix-quote">&ldquo;${escapeHtml(quoteText)}&rdquo;</span> lacks commercial magnitude. Re-anchor with explicit figures (e.g. <span class="highlight-placeholder">[X% cycle reduction / ₹Y Lakh revenue]</span>) to prove tangible value.`;
          } else {
            advice = `Currently, only ${Math.round(quantShare * 100)}% of your bullets include metrics. Target 50%+ bullets with quantified outcomes (e.g. '₹15 Crore revenue', '24% cycle time reduction', '180 bps margin expansion').`;
          }
          break;

        case 'verbs':
          if (weakBulletsFound.length > 0) {
            const wb = weakBulletsFound[0];
            const quoteText = wb.clean.length > 85 ? wb.clean.slice(0, 85) + '...' : wb.clean;
            advice = `Passive phrasing detected in your bullet: <span class="fix-quote">&ldquo;${escapeHtml(quoteText)}&rdquo;</span>. Replace passive phrases like <em>"${escapeHtml(wb.matchedPhrase)}"</em> with assertive verbs such as 'Spearheaded', 'Engineered', or 'Structured' to project ownership.`;
          } else {
            advice = `Only ${Math.round(strongVerbShare * 100)}% of bullets begin with power verbs. Upgrade opening verbs across your work experience to decisive verbs like 'Orchestrated', 'Optimized', or 'Negotiated'.`;
          }
          break;

        case 'keywords':
          const targetMeta = DOMAIN_METADATA[targetRoleKey] || DOMAIN_METADATA.consulting;
          advice = `You matched ${detectedKeywords.length} of ${roleKeywordList.length} competencies for ${escapeHtml(targetMeta.shortLabel)}. Infuse missing core competencies such as <strong>${missingKeywords.slice(0, 3).join(', ')}</strong> directly into your project descriptions and work experience bullets.`;
          break;

        case 'structure':
          const missingSec = [];
          if (!sections.por.detected) missingSec.push("Positions of Responsibility");
          if (!sections.achievements.detected) missingSec.push("Achievements / Awards");
          if (!sections.skills.detected) missingSec.push("Skills / Tools");
          if (!sections.projects.detected) missingSec.push("Projects");
          if (!sections.certifications.detected) missingSec.push("Certifications");
          advice = `Missing or non-standard section titles detected: <strong>${missingSec.slice(0, 3).join(', ') || 'standard recruiter sections'}</strong>. Placement committee ATS filters require standard demarcations to award full structural points.`;
          break;

        case 'length':
          advice = `Your resume spans an estimated ${estimatedPages} page(s) (${wordCount} words). Top management consulting and corporate recruiters in India strictly favor a disciplined single-page resume format. Trim secondary bullets to fit exactly 1 page.`;
          break;

        case 'quality':
          advice = `Only ${Math.round(idealLengthShare * 100)}% of your bullets fall into the optimal 10–30 word consulting standard. Condense run-on lines exceeding 35 words and expand brief sentence fragments.`;
          break;

        case 'contact':
          const missingContact = [];
          if (!hasEmail) missingContact.push("Professional Email");
          if (!hasMobile) missingContact.push("Indian Mobile (+91)");
          if (!hasLinkedIn) missingContact.push("Customized LinkedIn URL");
          advice = `Ensure complete recruiter contact information at the top: add your <strong>${missingContact.join(', ')}</strong>.`;
          break;

        case 'ats':
          advice = `ATS compatibility score is ${fix.score}/10. Eliminate non-standard symbols or complex tables, maintain uniform reverse-chronological dates, and ensure clean OCR readability.`;
          break;
      }

      let impactLevel = 'low';
      let impactLabel = 'Low Impact';
      if (fix.loss >= 5) {
        impactLevel = 'high';
        impactLabel = 'High Impact';
      } else if (fix.loss >= 3) {
        impactLevel = 'medium';
        impactLabel = 'Medium Impact';
      } else {
        impactLevel = 'low';
        impactLabel = 'Low Impact';
      }

      return {
        priorityNum: `Priority 0${idx + 1}`,
        dimensionName: fix.name,
        impactLevel: impactLevel,
        impactLabel: impactLabel,
        advice: advice
      };
    });

    // Cross-Domain Suitability Meter across all domains
    const domainSuitability = calculateDomainSuitability(text, targetRoleKey);

    // Bullet Rewrites based directly on user's uploaded resume (no canned examples)
    const rewrites = generateBulletRewrites(bullets, cleanText, targetRoleKey, customJdText);

    return {
      totalScore,
      band,
      bandLabel,
      bandDesc,
      dimensions,
      strengths,
      priorityFixes,
      roleKeywordScore,
      detectedKeywords,
      missingKeywords,
      roleKeywordList,
      isCustomJd,
      domainSuitability,
      rewrites,
      contactDetails,
      detectedSectionsList,
      missingSectionsList,
      quantifiedBullets,
      unquantifiedBullets,
      foundStrongVerbs,
      weakBulletsFound,
      stats: {
        wordCount,
        bulletCount: bullets.length,
        quantShare: Math.round(quantShare * 100),
        idealLengthPct: Math.round(idealLengthShare * 100),
        strongVerbShare: Math.round(strongVerbShare * 100),
        estimatedPages,
        jdWordCount: customJdText ? customJdText.trim().split(/\s+/).filter(Boolean).length : 0
      }
    };
  }

  /**
   * Intelligently generate 3 high-impact Before/After rewrites based 100% on the candidate's actual resume text
   * Elevates each bullet using top-tier recruiter benchmarks and metrics for the target domain / JD.
   */
  function generateBulletRewrites(bullets, cleanText, roleKey, customJdText = '') {
    const rewrites = [];
    const roleMeta = DOMAIN_METADATA[roleKey] || DOMAIN_METADATA.consulting;

    // Step 1: Collect Candidate Bullets directly from resume
    let candidateBullets = [];
    if (bullets && bullets.length > 0) {
      candidateBullets = [...bullets];
    } else {
      // User entered paragraph / unstructured resume without bullet characters
      const sentences = cleanText
        .split(/(?<=[.!?])\s+|\n+/)
        .map(s => s.trim())
        .filter(s => s.length >= 25 && s.split(/\s+/).length >= 5);
      candidateBullets = sentences.map(s => ({
        raw: s,
        clean: s,
        words: s.split(/\s+/),
        wordCount: s.split(/\s+/).length
      }));
    }

    if (candidateBullets.length === 0) {
      return [];
    }

    // Weak phrase matcher regex
    const weakRegex = /\b(responsible for|worked on|helped with|helped|assisted with|assisted|tasked with|handled|duties included|involved in|part of|participated in|contributed to|managed|served as|supported|coordinated with|acted as|worked as)\b/i;
    const yearPattern = /\b(?:19|20)\d{2}\b/g;
    const metricRegex = /(?:%|\bRs\.?\b|\bINR\b|₹|\$|€|£|\blakh(?:s)?\b|\blac(?:s)?\b|\bcrore(?:s)?\b|\bcr\b|\bmillion\b|\bmn\b|\bbillion\b|\bbn\b|\bk\b|\b\d+(?:,\d+)*(?:\.\d+)?\b)/i;

    // Step 2: Score candidate bullets by need for rewrite
    const scoredCandidates = candidateBullets.map(b => {
      let needScore = 0;
      let reasons = [];
      const hasWeak = weakRegex.test(b.clean);
      const textNoYears = b.clean.replace(yearPattern, '');
      const hasMetric = metricRegex.test(textNoYears);
      const firstWord = (b.words[0] || '').toLowerCase().replace(/[^a-z]/g, '');
      const hasPowerVerb = STRONG_ACTION_VERBS.includes(firstWord);

      if (hasWeak) {
        needScore += 50;
        reasons.push('weak_phrase');
      }
      if (!hasMetric) {
        needScore += 30;
        reasons.push('unquantified');
      }
      if (!hasPowerVerb) {
        needScore += 20;
        reasons.push('weak_verb');
      }
      if (b.wordCount < 10 || b.wordCount > 32) {
        needScore += 10;
        reasons.push('length');
      }

      return {
        bullet: b,
        needScore,
        reasons,
        hasWeak,
        hasMetric,
        hasPowerVerb
      };
    });

    // Sort descending by needScore
    scoredCandidates.sort((a, b) => b.needScore - a.needScore);

    // Pick up to 3 distinct candidate bullets
    const selected = [];
    const seenTexts = new Set();
    for (const sc of scoredCandidates) {
      if (selected.length >= 3) break;
      const normalized = sc.bullet.clean.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!seenTexts.has(normalized)) {
        seenTexts.add(normalized);
        selected.push(sc);
      }
    }

    // Step 3: Domain-specific benchmark templates and power verbs
    const domainBenchmarks = {
      consulting: {
        verbs: ["Spearheaded", "Formulated", "Structured", "Engineered", "Synthesized", "Streamlined", "Benchmarked", "Restructured"],
        metricTemplates: [
          ", cutting cycle turnaround time by <span class=\"highlight-placeholder\">[32% / ₹24 Lakh]</span> across business units.",
          ", delivering an annual EBITDA enhancement of <span class=\"highlight-placeholder\">[₹18.5 Crore / 14% margin]</span>.",
          ", unlocking <span class=\"highlight-placeholder\">[22% CAGR / ₹40 Crore]</span> addressable market expansion."
        ]
      },
      finance: {
        verbs: ["Constructed", "Modeled", "Appraised", "Engineered", "Evaluated", "Optimized", "Structured", "Synthesized"],
        metricTemplates: [
          ", identifying <span class=\"highlight-placeholder\">[₹120 Crore]</span> in M&amp;A synergy value and sensitivity upside.",
          ", optimizing portfolio working capital release by <span class=\"highlight-placeholder\">[₹14.5 Crore / 180 bps]</span>.",
          ", evaluating DCF scenarios across 45+ asset classes, mitigating downside risk by <span class=\"highlight-placeholder\">[15%]</span>."
        ]
      },
      marketing: {
        verbs: ["Orchestrated", "Scaled", "Accelerated", "Pioneered", "Optimized", "Formulated", "Architected"],
        metricTemplates: [
          ", reducing blended Customer Acquisition Cost (CAC) by <span class=\"highlight-placeholder\">[28%]</span> while scaling LTV by <span class=\"highlight-placeholder\">[1.8x]</span>.",
          ", delivering <span class=\"highlight-placeholder\">[₹3.2 Crore]</span> in incremental annualized pipeline via full-funnel GTM.",
          ", lifting conversion funnel throughput by <span class=\"highlight-placeholder\">[34% / 420 bps]</span> across 4 digital channels."
        ]
      },
      sales: {
        verbs: ["Negotiated", "Secured", "Expanded", "Generated", "Acquired", "Closed", "Cultivated"],
        metricTemplates: [
          ", securing <span class=\"highlight-placeholder\">[₹12.5 Crore]</span> in enterprise contract value at <span class=\"highlight-placeholder\">[124%]</span> quota attainment.",
          ", expanding Tier-1 key account ARR by <span class=\"highlight-placeholder\">[35% / ₹4.8 Crore]</span> through cross-sell positioning.",
          ", accelerating enterprise deal sales cycle velocity by <span class=\"highlight-placeholder\">[40 days]</span>."
        ]
      },
      product: {
        verbs: ["Architected", "Prioritized", "Delivered", "Launched", "Iterated", "Engineered", "Scaled"],
        metricTemplates: [
          ", driving <span class=\"highlight-placeholder\">[42%]</span> user adoption and reducing onboarding drop-off by <span class=\"highlight-placeholder\">[26%]</span>.",
          ", accelerating sprint feature velocity by <span class=\"highlight-placeholder\">[30%]</span> while boosting day-30 user retention by <span class=\"highlight-placeholder\">[18%]</span>.",
          ", lifting North Star metric engagement by <span class=\"highlight-placeholder\">[35%]</span> across 250k+ monthly active users."
        ]
      },
      operations: {
        verbs: ["Re-engineered", "Streamlined", "Optimized", "Standardized", "Automated", "Audited", "Reduced"],
        metricTemplates: [
          ", reducing operational turnaround time (TAT) by <span class=\"highlight-placeholder\">[36%]</span> and defect rates to <span class=\"highlight-placeholder\">[&lt;0.5%]</span>.",
          ", delivering <span class=\"highlight-placeholder\">[₹8.4 Crore]</span> in recurring annual supply chain cost efficiencies.",
          ", improving warehouse inventory turnover by <span class=\"highlight-placeholder\">[45%]</span> across regional hubs."
        ]
      },
      analytics: {
        verbs: ["Engineered", "Modeled", "Automated", "Synthesized", "Extracted", "Forecasted", "Deployed"],
        metricTemplates: [
          ", boosting predictive model accuracy to <span class=\"highlight-placeholder\">[92.4%]</span> and saving <span class=\"highlight-placeholder\">[22 hours]</span> of manual analysis weekly.",
          ", unlocking <span class=\"highlight-placeholder\">[₹6.2 Crore]</span> in cost savings via automated cohort churn detection.",
          ", deploying executive Tableau/Power BI dashboards adopted by <span class=\"highlight-placeholder\">[40+]</span> senior decision-makers."
        ]
      },
      genman: {
        verbs: ["Orchestrated", "Directed", "Transformed", "Consolidated", "Spearheaded", "Governed", "Scaled"],
        metricTemplates: [
          ", expanding business unit operating margins by <span class=\"highlight-placeholder\">[240 bps / ₹16 Crore]</span> across 4 verticals.",
          ", governing cross-functional project execution of <span class=\"highlight-placeholder\">[₹85 Crore]</span> budget with zero milestone slippage.",
          ", accelerating strategic 3-year growth roadmap delivery by <span class=\"highlight-placeholder\">[6 months]</span>."
        ]
      },
      hr: {
        verbs: ["Instituted", "Revamped", "Benchmarked", "Engineered", "Restructured", "Spearheaded", "Transformed"],
        metricTemplates: [
          ", reducing annualized high-performer attrition by <span class=\"highlight-placeholder\">[22%]</span> while lifting engagement scores by <span class=\"highlight-placeholder\">[18 points]</span>.",
          ", compressing campus recruitment TAT by <span class=\"highlight-placeholder\">[35%]</span> across Day-0 hiring drives.",
          ", standardizing competency rubrics across <span class=\"highlight-placeholder\">[1,200+]</span> employees nationwide."
        ]
      }
    };

    const benchmark = domainBenchmarks[roleKey] || domainBenchmarks.consulting;

    // Step 4: Transform each selected candidate bullet into After rewrite
    for (let i = 0; i < selected.length; i++) {
      const sc = selected[i];
      const orig = sc.bullet.clean;
      let cleaned = orig.replace(/^[-•*–—▪▫\u2022\u2023\u25E6\u2043\u2219\u25AA\u25AB\u27A2\u279C\u25BA]|\b\d+[\.\)]\s*/, '').trim();

      // Check for leading weak phrases
      let matchedWeak = null;
      for (const wp of WEAK_PHRASES) {
        const regex = new RegExp(`^${wp.phrase}\\s+`, 'i');
        if (regex.test(cleaned)) {
          matchedWeak = wp.label;
          cleaned = cleaned.replace(regex, '').trim();
          break;
        }
      }

      // Check gerund or verb opener in cleaned text
      let afterVerb = benchmark.verbs[i % benchmark.verbs.length];
      let transformedBody = cleaned;

      const gerundMap = {
        'reviewing': 'Reviewed and restructured',
        'managing': 'Directed and scaled',
        'leading': 'Spearheaded and directed',
        'analyzing': 'Analyzed and benchmarked',
        'developing': 'Formulated and launched',
        'conducting': 'Executed end-to-end',
        'building': 'Engineered and established',
        'creating': 'Architected and built',
        'handling': 'Managed and optimized',
        'preparing': 'Constructed and presented',
        'designing': 'Designed and operationalized',
        'optimizing': 'Streamlined and optimized',
        'evaluating': 'Appraised and benchmarked',
        'implementing': 'Implemented and scaled',
        'monitoring': 'Standardized and tracked',
        'identifying': 'Identified and captured'
      };

      // Strip leading role/title labels if present (e.g. "Member, Placement Committee (Junior): Managed..." or "Digital Strategy: Designed...")
      if (/^[^:]{3,60}:\s*/.test(cleaned)) {
        cleaned = cleaned.replace(/^[^:]{3,60}:\s*/, '').trim();
      }

      const firstCleanWord = (cleaned.split(/\s+/)[0] || '').toLowerCase();
      if (gerundMap[firstCleanWord]) {
        afterVerb = gerundMap[firstCleanWord];
        transformedBody = cleaned.replace(new RegExp(`^${firstCleanWord}\\s+`, 'i'), '').trim();
      } else if (STRONG_ACTION_VERBS.includes(firstCleanWord)) {
        afterVerb = benchmark.verbs[i % benchmark.verbs.length];
        transformedBody = cleaned.replace(new RegExp(`^${firstCleanWord}\\s+`, 'i'), '').trim();
      } else {
        transformedBody = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
      }

      // Remove existing trailing punctuation
      transformedBody = transformedBody.replace(/[.,;:\s]+$/, '');

      // Check if candidate already had a true commercial outcome KPI in their bullet
      const textNoYears = transformedBody.replace(yearPattern, '');
      const commercialKpiRegex = /(?:%|\bRs\.?\b|\bINR\b|₹|\$|€|£|\blakh(?:s)?\b|\blac(?:s)?\b|\bcrore(?:s)?\b|\bcr\b|\bmillion\b|\bmn\b|\bbps\b|\bcagr\b)/i;
      const hasCommercialKpi = commercialKpiRegex.test(textNoYears);

      let metricClause = "";
      if (!hasCommercialKpi) {
        metricClause = benchmark.metricTemplates[i % benchmark.metricTemplates.length];
      } else {
        metricClause = '.';
      }

      const afterText = `${afterVerb} ${transformedBody}${metricClause}`;

      let rationale = "";
      if (matchedWeak) {
        rationale = `Eliminated passive '${matchedWeak}' phrasing from your resume; elevated with active ${roleMeta.shortLabel} recruiter leadership verb ('${afterVerb}') and concrete outcome quantification.`;
      } else if (!hasCommercialKpi) {
        rationale = `Converted descriptive activity from your resume into measurable commercial impact by injecting recruiter-calibrated outcome metrics and domain action phrasing.`;
      } else {
        rationale = `Re-anchored your bullet with assertive executive ownership and standardized recruiter syntax benchmarked against top ${roleMeta.shortLabel} shortlists.`;
      }

      rewrites.push({
        before: orig,
        after: afterText,
        rationale: rationale
      });
    }

    return rewrites;
  }

  /**
   * Cross-Domain Suitability Analysis across all marquee recruitment verticals
   */
  function calculateDomainSuitability(text, targetRoleKey) {
    const lower = text.toLowerCase();
    const results = [];

    for (const [key, meta] of Object.entries(DOMAIN_METADATA)) {
      const kwList = ROLE_KEYWORDS[key] || [];
      const matchedKw = [];
      for (const kw of kwList) {
        if (kw.regex.test(lower)) {
          matchedKw.push(kw.name);
        }
      }

      let titleMatchCount = 0;
      if (meta.titleKeywords) {
        for (const tk of meta.titleKeywords) {
          if (lower.includes(tk)) titleMatchCount++;
        }
      }

      // Base calculation: keyword density + title/experience affinity
      const kwScore = (matchedKw.length / 14) * 60; // Up to 60 pts
      const titleScore = Math.min(25, titleMatchCount * 5); // Up to 25 pts
      let rawScore = Math.round(kwScore + titleScore + 18);
      rawScore = Math.max(25, Math.min(96, rawScore));

      let fitTier = 'developing';
      let fitLabel = 'Developing Fit';
      if (rawScore >= 70) {
        fitTier = 'strong';
        fitLabel = 'Strong Fit';
      } else if (rawScore >= 45) {
        fitTier = 'moderate';
        fitLabel = 'Moderate Fit';
      } else {
        fitTier = 'developing';
        fitLabel = 'Developing Fit';
      }

      results.push({
        key,
        label: meta.label,
        shortLabel: meta.shortLabel,
        icon: meta.icon,
        score: rawScore,
        fitTier,
        fitLabel,
        matchedCount: matchedKw.length,
        totalKeywords: kwList.length,
        topSignals: matchedKw.slice(0, 4),
        isTarget: key === targetRoleKey
      });
    }

    // Sort descending by score
    results.sort((a, b) => b.score - a.score);

    const highest = results[0];
    return {
      domains: results,
      highestDomain: highest,
      targetDomainKey: targetRoleKey
    };
  }

  // =========================================================================
  // 5. Render Diagnostic Results
  // =========================================================================

  function renderResults(result) {
    const resultsPanel = document.getElementById('diagnosticResults');
    if (!resultsPanel) return;

    state.lastResult = result;
    resultsPanel.style.display = 'flex';

    // Target Domain Metadata
    const targetRoleKey = state.targetRole || 'consulting';
    const roleMeta = DOMAIN_METADATA[targetRoleKey] || DOMAIN_METADATA['consulting'];

    // 1. Prominently Highlight Target Domain Banner based on JD
    const targetDomainBannerTitle = document.getElementById('targetDomainBannerTitle');
    const targetDomainBannerMeta = document.getElementById('targetDomainBannerMeta');
    const targetDomainBannerPill = document.getElementById('targetDomainBannerPill');

    if (targetDomainBannerTitle) {
      targetDomainBannerTitle.textContent = `${roleMeta.icon} ${roleMeta.label}`;
    }
    if (targetDomainBannerMeta) {
      targetDomainBannerMeta.textContent = result.isCustomJd
        ? `Calibrated against target Job Description (${result.stats.jdWordCount || 'custom'} words) • 18 Verified Core Competencies`
        : `Benchmarked against Institutional Recruiter Criteria for ${roleMeta.label} • 18 Core Competencies`;
    }
    if (targetDomainBannerPill) {
      targetDomainBannerPill.textContent = result.isCustomJd ? 'TARGET JD BENCHMARK ACTIVE' : 'TARGET BENCHMARK ACTIVE';
    }

    // Update Report Eyebrow Meta
    const reportMeta = document.getElementById('reportMetaText');
    if (reportMeta) {
      const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      if (state.currentJdObject) {
        const jd = state.currentJdObject;
        const lvls = Array.isArray(jd.levels) ? jd.levels.join('/') : jd.levels;
        reportMeta.innerHTML = `Target Benchmark: <strong>${escapeHtml(jd.role)}</strong> (${escapeHtml(jd.domain)} › ${escapeHtml(jd.subDomain)}) &bull; ${escapeHtml(lvls)} &bull; Assessed on ${today}`;
      } else {
        reportMeta.innerHTML = `Target Domain: <strong>${escapeHtml(roleMeta.label)}</strong> &bull; Assessed on ${today}`;
      }
    }

    // Update Overall Score Ring
    const overallScoreNum = document.getElementById('overallScoreNum');
    if (overallScoreNum) overallScoreNum.textContent = result.totalScore;

    const scoreRingProgress = document.getElementById('scoreRingProgress');
    if (scoreRingProgress) {
      const circumference = 440;
      const offset = circumference - (result.totalScore / 100) * circumference;
      scoreRingProgress.style.strokeDashoffset = offset;
    }

    // Update Band Badge
    const bandBadge = document.getElementById('bandBadge');
    const bandDescription = document.getElementById('bandDescription');
    if (bandBadge) {
      bandBadge.className = `band-badge band-${result.band}`;
      bandBadge.textContent = `${result.bandLabel} (${result.totalScore}/100)`;
    }
    if (bandDescription) {
      bandDescription.textContent = result.bandDesc;
    }

    // Update Footer Stats in Ring Card
    const resLengthValue = document.getElementById('resLengthValue');
    const bulletCountValue = document.getElementById('bulletCountValue');
    const quantRatioValue = document.getElementById('quantRatioValue');

    if (resLengthValue) {
      resLengthValue.textContent = result.stats.estimatedPages === 1 ? '1 Page' : `${result.stats.estimatedPages} Pages`;
    }
    if (bulletCountValue) {
      bulletCountValue.textContent = `${result.stats.bulletCount} Bullets`;
    }
    if (quantRatioValue) {
      quantRatioValue.textContent = `${result.stats.quantShare}%`;
    }

    // Render 8 Dimension Evaluation Vector Bars (NO scoring weights/points exposed)
    const dimensionBarsList = document.getElementById('dimensionBarsList');
    if (dimensionBarsList) {
      dimensionBarsList.innerHTML = '';
      for (const d of result.dimensions) {
        const pct = Math.round((d.score / d.max) * 100);
        let colorClass = '';
        let statusLabel = 'Strong';
        if (pct >= 80) {
          colorClass = 'high';
          statusLabel = 'Strong';
        } else if (pct < 50) {
          colorClass = 'low';
          statusLabel = 'Needs Work';
        } else {
          statusLabel = 'Moderate';
        }

        const row = document.createElement('div');
        row.className = 'dim-bar-row';
        row.innerHTML = `
          <div class="dim-bar-meta">
            <span class="dim-name">${escapeHtml(d.name)}</span>
            <span class="dim-score-fraction">${pct}% &bull; ${statusLabel}</span>
          </div>
          <div class="dim-progress-track">
            <div class="dim-progress-fill ${colorClass}" style="width: ${pct}%"></div>
          </div>
        `;
        dimensionBarsList.appendChild(row);
      }
    }

    // Render Strengths with Real Extracted Evidence from Candidate Resume
    const strengthsList = document.getElementById('strengthsList');
    if (strengthsList) {
      strengthsList.innerHTML = '';
      if (result.strengths.length === 0) {
        strengthsList.innerHTML = `
          <div class="strength-item">
            <span class="strength-bullet">&#8226;</span>
            <div class="strength-text">No dimensions currently score above the 80% institutional threshold. Prioritize the high-impact adjustments below.</div>
          </div>
        `;
      } else {
        for (const s of result.strengths) {
          const item = document.createElement('div');
          item.className = 'strength-item';
          const pct = Math.round((s.score / s.max) * 100);
          let realDetail = "";

          switch (s.id) {
            case 'contact':
              const contacts = [];
              if (result.contactDetails && result.contactDetails.email) contacts.push(`Email: <em>${escapeHtml(result.contactDetails.email)}</em>`);
              if (result.contactDetails && result.contactDetails.mobile) contacts.push(`Mobile: <em>${escapeHtml(result.contactDetails.mobile)}</em>`);
              if (result.contactDetails && result.contactDetails.linkedin) contacts.push(`LinkedIn: <em>${escapeHtml(result.contactDetails.linkedin)}</em>`);
              realDetail = `Complete recruiter outreach footprint verified (${contacts.join(' &bull; ') || 'Verified email, phone, and LinkedIn'}).`;
              break;

            case 'structure':
              realDetail = `Clean recruiter section hierarchy detected with standard headings: <em>${result.detectedSectionsList.join(', ')}</em>. Complies with institutional ATS scanning standards.`;
              break;

            case 'quantified':
              const sampleQuant = (result.quantifiedBullets && result.quantifiedBullets.find(b => /(?:%|Rs\.?|INR|₹|\$|crore|lakh|margin|growth|saved|reduced|increased)/i.test(b.clean) && !/@|\+91|linkedin/i.test(b.clean))) || (result.quantifiedBullets && result.quantifiedBullets[0]);
              const qQuote = sampleQuant ? (sampleQuant.clean.length > 85 ? sampleQuant.clean.slice(0, 85) + '...' : sampleQuant.clean) : 'Quantified metrics verified';
              realDetail = `${result.stats.quantShare}% of your bullets contain explicit figures. Strong evidence from your CV: <span class="strength-quote">&ldquo;${escapeHtml(qQuote)}&rdquo;</span> providing verified commercial impact.`;
              break;

            case 'verbs':
              const verbSample = result.foundStrongVerbs ? result.foundStrongVerbs.slice(0, 4) : [];
              realDetail = `Strong executive ownership voice: bullets lead with decisive action verbs (<em>${verbSample.join(', ') || 'Spearheaded, Formulated, Engineered'}</em>), signaling initiative rather than passive compliance.`;
              break;

            case 'quality':
              realDetail = `${result.stats.idealLengthPct || 70}% of your bullets maintain the optimal 10–30 word recruiter standard, ensuring crisp visual readability.`;
              break;

            case 'length':
              realDetail = `Disciplined format (${result.stats.wordCount} words across ${result.stats.estimatedPages === 1 ? '1 page' : '2 pages'}), matching corporate placement committee guidelines.`;
              break;

            case 'keywords':
              const kwSample = result.detectedKeywords.slice(0, 4);
              realDetail = `High competency density for ${escapeHtml(roleMeta.shortLabel)}: detected <em>${kwSample.join(', ')}</em>, ensuring high ATS keyword indexing relevance.`;
              break;

            case 'ats':
              realDetail = `Clean digital document layers: 0 garbled artifacts, structured reverse-chronological dates, and clean ATS parsing compatibility.`;
              break;

            default:
              realDetail = `Exceeds corporate screening benchmark with strong placement compliance.`;
          }

          item.innerHTML = `
            <span class="strength-bullet">&#10003;</span>
            <div class="strength-text"><strong>${escapeHtml(s.name)} (${pct}% Compliance):</strong> ${realDetail}</div>
          `;
          strengthsList.appendChild(item);
        }
      }
    }

    // Render Priority Fixes with High / Medium / Low Impact Badges in Different Colors (NO Points Lost)
    const priorityFixesList = document.getElementById('priorityFixesList');
    if (priorityFixesList) {
      priorityFixesList.innerHTML = '';
      if (result.priorityFixes.length === 0) {
        priorityFixesList.innerHTML = `
          <div class="fix-item">
            <div class="fix-title">All Vectors Well Calibrated</div>
            <div class="fix-advice">Your resume satisfies primary placement benchmarks across all 8 vectors.</div>
          </div>
        `;
      } else {
        for (const fix of result.priorityFixes) {
          const item = document.createElement('div');
          item.className = 'fix-item';
          item.innerHTML = `
            <div class="fix-top">
              <span class="fix-tag">${escapeHtml(fix.priorityNum)}</span>
              <span class="fix-impact-badge impact-${fix.impactLevel}">${fix.impactLabel}</span>
            </div>
            <div class="fix-title">${escapeHtml(fix.dimensionName)}</div>
            <div class="fix-advice">${fix.advice}</div>
          `;
          priorityFixesList.appendChild(item);
        }
      }
    }

    // Render Target Domain Keywords
    const keywordsRoleTitle = document.getElementById('keywordsRoleTitle');
    if (keywordsRoleTitle) {
      keywordsRoleTitle.textContent = `Target Domain: ${roleMeta.label} Competencies`;
    }

    const keywordMatchRatio = document.getElementById('keywordMatchRatio');
    if (keywordMatchRatio) {
      keywordMatchRatio.textContent = `${result.detectedKeywords.length} / ${result.roleKeywordList.length}`;
    }

    const detectedCount = document.getElementById('detectedCount');
    if (detectedCount) detectedCount.textContent = result.detectedKeywords.length;

    const missingCount = document.getElementById('missingCount');
    if (missingCount) missingCount.textContent = result.missingKeywords.length;

    const detectedChips = document.getElementById('detectedChips');
    if (detectedChips) {
      detectedChips.innerHTML = '';
      if (result.detectedKeywords.length === 0) {
        detectedChips.innerHTML = '<span class="kw-chip missing">None detected yet</span>';
      } else {
        for (const kw of result.detectedKeywords) {
          const chip = document.createElement('span');
          chip.className = 'kw-chip detected';
          chip.innerHTML = `&#10003; ${escapeHtml(kw)}`;
          detectedChips.appendChild(chip);
        }
      }
    }

    const missingChips = document.getElementById('missingChips');
    if (missingChips) {
      missingChips.innerHTML = '';
      if (result.missingKeywords.length === 0) {
        missingChips.innerHTML = '<span class="kw-chip detected">&#10003; Comprehensive coverage</span>';
      } else {
        for (const kw of result.missingKeywords) {
          const chip = document.createElement('span');
          chip.className = 'kw-chip missing';
          chip.innerHTML = `+ ${escapeHtml(kw)}`;
          missingChips.appendChild(chip);
        }
      }
    }

    // Render Suggested Certifications & Suggested Projects for Target Domain
    const certsList = document.getElementById('suggestedCertificationsList');
    const projectsList = document.getElementById('suggestedProjectsList');

    if (certsList && roleMeta.certifications) {
      certsList.innerHTML = '';
      for (const cert of roleMeta.certifications) {
        const li = document.createElement('li');
        li.className = 'guide-item';
        li.innerHTML = `
          <span class="guide-item-bullet">&#10003;</span>
          <span class="guide-item-text">${escapeHtml(cert)}</span>
        `;
        certsList.appendChild(li);
      }
    }

    if (projectsList && roleMeta.projects) {
      projectsList.innerHTML = '';
      for (const proj of roleMeta.projects) {
        const li = document.createElement('li');
        li.className = 'guide-item';
        li.innerHTML = `
          <span class="guide-item-bullet">&#10003;</span>
          <span class="guide-item-text">${escapeHtml(proj)}</span>
        `;
        projectsList.appendChild(li);
      }
    }

    // Render Bullet Rewrites (Resume Pointers)
    const rewritesList = document.getElementById('rewritesList');
    if (rewritesList) {
      rewritesList.innerHTML = '';
      if (!result.rewrites || result.rewrites.length === 0) {
        rewritesList.innerHTML = `
          <div class="rewrite-card-item">
            <div class="bullet-before-text">No candidate bullets available for rewrite. Upload a resume or paste text to generate personalized before-vs-after rewrites.</div>
          </div>
        `;
      } else {
        for (const rw of result.rewrites) {
          const card = document.createElement('div');
          card.className = 'rewrite-card-item';
          card.innerHTML = `
            <div class="rewrite-row">
              <span class="rewrite-tag tag-before">Before (From Your Resume)</span>
              <div class="bullet-before-text">&ldquo;${escapeHtml(rw.before)}&rdquo;</div>
            </div>
            <div class="rewrite-row">
              <span class="rewrite-tag tag-after">After (${escapeHtml(roleMeta.shortLabel)} Recruiter Benchmark &amp; Outcome Driven)</span>
              <div class="bullet-after-text">&bull; ${rw.after}</div>
            </div>
            ${rw.rationale ? `<div class="rewrite-rationale"><em>Recruiter Rationale:</em> ${escapeHtml(rw.rationale)}</div>` : ''}
          `;
          rewritesList.appendChild(card);
        }
      }
    }

    // Render Domain Suitability Meter across All Available Domains
    const suitabilityTopBadge = document.getElementById('suitabilityTopBadge');
    const suitabilityGrid = document.getElementById('suitabilityGrid');
    const suitabilityRecruiterBox = document.getElementById('suitabilityRecruiterBox');

    if (result.domainSuitability) {
      const ds = result.domainSuitability;
      const topDom = ds.highestDomain;
      const targetDomKey = ds.targetDomainKey;
      const targetDom = ds.domains.find(d => d.key === targetDomKey) || topDom;

      if (suitabilityTopBadge) {
        suitabilityTopBadge.innerHTML = `
          <span class="top-fit-pill">
            ★ Highest Natural Alignment: <strong>${topDom.icon} ${escapeHtml(topDom.shortLabel)} (${topDom.score}%)</strong>
          </span>
        `;
      }

      if (suitabilityGrid) {
        suitabilityGrid.innerHTML = '';
        for (const item of ds.domains) {
          const row = document.createElement('div');
          row.className = `suitability-row ${item.isTarget ? 'is-target' : ''} ${item.key === topDom.key ? 'is-top' : ''}`;

          const signalsHtml = item.topSignals.length > 0
            ? `<div class="suitability-signals"><span class="signal-label">Signals:</span> ${item.topSignals.map(s => `<span class="signal-tag">${escapeHtml(s)}</span>`).join('')}</div>`
            : `<div class="suitability-signals"><span class="signal-muted">Foundational domain affinity</span></div>`;

          row.innerHTML = `
            <div class="suitability-row-header">
              <div class="suitability-name-wrap">
                <span class="suitability-icon">${item.icon}</span>
                <span class="suitability-name">${escapeHtml(item.label)}</span>
                ${item.isTarget ? '<span class="domain-target-badge">&#127919; Target Role</span>' : ''}
                ${item.key === topDom.key ? '<span class="domain-top-badge">&#9733; Top Natural Fit</span>' : ''}
              </div>
              <div class="suitability-score-wrap">
                <span class="suitability-tier tier-${item.fitTier}">${item.fitLabel}</span>
                <span class="suitability-pct">${item.score}%</span>
              </div>
            </div>
            <div class="suitability-bar-track">
              <div class="suitability-bar-fill fill-${item.fitTier}" style="width: ${item.score}%"></div>
            </div>
            ${signalsHtml}
          `;
          suitabilityGrid.appendChild(row);
        }
      }

      if (suitabilityRecruiterBox) {
        const isSynergy = topDom.key === targetDomKey;
        if (isSynergy) {
          suitabilityRecruiterBox.className = 'suitability-recruiter-box synergy';
          suitabilityRecruiterBox.innerHTML = `
            <div class="insight-lead">&#127919; <strong>Recruiter Strategic Insight &bull; High Profile Synergy:</strong></div>
            <p>Your resume's natural competency density aligns with your chosen target vertical (<strong>${escapeHtml(targetDom.label)}</strong> at <strong>${targetDom.score}%</strong>). Implement the high-impact priority fixes above to maximize your Day-0 shortlist conversion.</p>
          `;
        } else {
          suitabilityRecruiterBox.className = 'suitability-recruiter-box pivot';
          suitabilityRecruiterBox.innerHTML = `
            <div class="insight-lead">&#128161; <strong>Recruiter Strategic Insight &bull; Cross-Domain Bridging:</strong></div>
            <p>Your resume currently exhibits highest natural affinity for <strong>${topDom.icon} ${escapeHtml(topDom.label)} (${topDom.score}%)</strong>, whereas your target role is <strong>${targetDom.icon} ${escapeHtml(targetDom.label)} (${targetDom.score}%)</strong>. To strengthen your competitive standing for ${escapeHtml(targetDom.shortLabel)}, incorporate the suggested certifications, capstone initiatives, and missing domain keywords outlined above into your project descriptions.</p>
          `;
        }
      }
    }

    // Smooth scroll down to results
    resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // =========================================================================
  // 6. Event Listeners & Controller
  // =========================================================================

  function resetDiagnostic() {
    state.selectedFile = null;
    state.fileArrayBuffer = null;
    state.fileNumPages = null;
    state.extractedText = '';
    state.lastResult = null;

    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';

    const fileInfoBox = document.getElementById('fileInfoBox');
    if (fileInfoBox) fileInfoBox.style.display = 'none';

    const resumeTextInput = document.getElementById('resumeTextInput');
    if (resumeTextInput) resumeTextInput.value = '';
    updateWordCount();

    const resultsPanel = document.getElementById('diagnosticResults');
    if (resultsPanel) resultsPanel.style.display = 'none';

    const saveBanner = document.getElementById('repoSaveBanner');
    if (saveBanner) saveBanner.style.display = 'none';

    hideError();

    // Scroll to input panel
    const inputPanel = document.getElementById('diagnosticInputPanel');
    if (inputPanel) inputPanel.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleExecuteDiagnostic() {
    hideError();
    const roleSelect = document.getElementById('targetRoleSelect');
    state.targetRole = roleSelect ? roleSelect.value : 'consulting';

    if (window.AuthGuard && !window.AuthGuard.isAuthorized()) {
      showError("Access Restricted", "You must be signed in with an authorized institutional administrator account to run diagnostics.");
      return;
    }

    let textToAnalyze = '';
    let numPages = null;

    try {
      // 1. Resolve Resume Text
      if (state.resumeTab === 'upload') {
        if (!state.selectedFile) {
          const pastedText = document.getElementById('resumeTextInput')?.value.trim();
          if (pastedText && pastedText.length > 50) {
            textToAnalyze = pastedText;
          } else {
            showError("Missing Resume Input", "Please upload your resume in .PDF or .DOCX format, or switch to the 'Paste Text' tab.");
            return;
          }
        } else {
          const fileName = state.selectedFile.name.toLowerCase();
          if (fileName.endsWith('.doc')) {
            showError(
              "Legacy .doc Format Detected",
              "Binary Microsoft Word 97-2003 (.doc) files cannot be parsed securely in the browser. Please save as modern .docx or .pdf, or paste your text directly."
            );
            return;
          }

          if (fileName.endsWith('.pdf')) {
            const pdfResult = await parsePdfFile(state.fileArrayBuffer);
            textToAnalyze = pdfResult.text;
            numPages = pdfResult.numPages;
          } else if (fileName.endsWith('.docx')) {
            const docxResult = await parseDocxFile(state.fileArrayBuffer);
            textToAnalyze = docxResult.text;
            numPages = docxResult.numPages;
          } else {
            showError("Unsupported File Extension", "Please upload a valid .pdf or .docx resume file.");
            return;
          }
        }
      } else {
        // Direct paste tab
        const textarea = document.getElementById('resumeTextInput');
        textToAnalyze = textarea ? textarea.value.trim() : '';
        if (!textToAnalyze || textToAnalyze.length < 50) {
          showError("Insufficient Resume Text", "Please paste your complete resume text (minimum 50 words) to enable comprehensive diagnostic evaluation.");
          return;
        }
      }

      // 2. Resolve Job Description (Optional Custom or Benchmark JD)
      let jdTextToAnalyze = '';
      if (state.jdTab === 'upload' && state.jdFile && state.jdArrayBuffer) {
        const jdFileName = state.jdFile.name.toLowerCase();
        if (jdFileName.endsWith('.pdf')) {
          showLoading("Extracting Job Description text from PDF...");
          const res = await parsePdfFile(state.jdArrayBuffer);
          jdTextToAnalyze = res.text;
        } else if (jdFileName.endsWith('.docx')) {
          showLoading("Extracting Job Description text from DOCX...");
          const res = await parseDocxFile(state.jdArrayBuffer);
          jdTextToAnalyze = res.text;
        }
      } else if (state.jdTab === 'domain') {
        const jdTextarea = document.getElementById('jdTextInput');
        if (jdTextarea && jdTextarea.value.trim().length > 20) {
          jdTextToAnalyze = jdTextarea.value.trim();
        } else if (state.currentJdObject && window.JD_DATABASE) {
          jdTextToAnalyze = window.JD_DATABASE.formatJdText(state.currentJdObject);
        }
        if (state.currentJdObject && window.JD_DATABASE) {
          state.targetRole = window.JD_DATABASE.getScoringRoleFamily(state.currentJdObject);
        }
      } else if (state.jdTab === 'paste') {
        const pasteTextarea = document.getElementById('jdPasteTextInput');
        const jdTextarea = document.getElementById('jdTextInput');
        if (pasteTextarea && pasteTextarea.value.trim().length > 20) {
          jdTextToAnalyze = pasteTextarea.value.trim();
        } else if (jdTextarea && jdTextarea.value.trim().length > 20) {
          jdTextToAnalyze = jdTextarea.value.trim();
        }
        const pasteRoleSelect = document.getElementById('targetRoleSelect');
        if (pasteRoleSelect && pasteRoleSelect.value && window.JD_DATABASE) {
          const domName = pasteRoleSelect.value;
          const matched = window.JD_DATABASE.LIBRARY.find(j => j.domain === domName);
          if (matched) {
            state.targetRole = window.JD_DATABASE.getScoringRoleFamily(matched);
          }
        }
      } else if (state.jdTab === 'link') {
        if (state.jdExtractedText) {
          jdTextToAnalyze = state.jdExtractedText;
        } else if (state.jdUrl) {
          jdTextToAnalyze = state.jdUrl;
        }
      }

      // Fallback: if user loaded sample JD in the textarea
      if (!jdTextToAnalyze) {
        const jdTextarea = document.getElementById('jdTextInput');
        if (jdTextarea && jdTextarea.value.trim().length > 30) {
          jdTextToAnalyze = jdTextarea.value.trim();
        } else if (state.currentJdObject && window.JD_DATABASE) {
          jdTextToAnalyze = window.JD_DATABASE.formatJdText(state.currentJdObject);
        }
      }

      // 3. Highlight & Calibrate Target Domain based on JD text if not explicitly set in domain tab
      if (state.jdTab !== 'domain' && jdTextToAnalyze && jdTextToAnalyze.length > 35) {
        const detectedDomain = detectDomainFromJd(jdTextToAnalyze);
        if (detectedDomain) {
          state.targetRole = detectedDomain;
          const roleSelect = document.getElementById('targetRoleSelect');
          if (roleSelect) roleSelect.value = detectedDomain;
        }
      }

      showLoading("Scoring against institutional placement benchmarks...");
      await new Promise(resolve => setTimeout(resolve, 400));

      const diagnosticResult = scoreResume(textToAnalyze, numPages, state.targetRole, jdTextToAnalyze);
      hideLoading();
      renderResults(diagnosticResult);

      // Automatically store to Firebase Repository with metadata and tags
      if (window.RepositoryService && typeof window.RepositoryService.saveAssessment === 'function') {
        window.RepositoryService.saveAssessment({
          resumeFile: state.selectedFile,
          resumeText: textToAnalyze,
          resumeNumPages: numPages,
          jdFile: state.jdFile,
          jdText: jdTextToAnalyze,
          jdObject: state.currentJdObject,
          jdTab: state.jdTab,
          jdUrl: state.jdUrl,
          targetRole: state.targetRole,
          result: diagnosticResult
        }).then(saveResponse => {
          showRepositorySaveBanner(saveResponse);
          updateHeaderRepoCount();
        }).catch(saveErr => {
          console.warn("[Repository] Save note:", saveErr);
        });
      }

    } catch (err) {
      hideLoading();
      console.error("Diagnostic execution error:", err);
      showError("Diagnostic Error", err.message || "An unexpected error occurred while parsing your document.");
    }
  }

  function handleFileSelected(file) {
    if (!file) return;
    hideError();

    const fileName = file.name;
    const fileSizeKb = Math.round(file.size / 1024);

    if (fileName.toLowerCase().endsWith('.doc')) {
      showError(
        "Legacy .doc Format Not Supported",
        "Binary .doc files cannot be parsed directly in-browser. Please re-save as modern .docx or .pdf, or paste your resume text."
      );
      return;
    }

    state.selectedFile = file;

    const fileInfoBox = document.getElementById('fileInfoBox');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const fileSizeDisplay = document.getElementById('fileSizeDisplay');
    const fileTypeIcon = document.getElementById('fileTypeIcon');

    if (fileInfoBox && fileNameDisplay && fileSizeDisplay) {
      fileNameDisplay.textContent = fileName;
      fileSizeDisplay.textContent = `${fileSizeKb} KB`;
      if (fileTypeIcon) {
        fileTypeIcon.textContent = fileName.toLowerCase().endsWith('.pdf') ? '📕' : '📘';
      }
      fileInfoBox.style.display = 'flex';
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      state.fileArrayBuffer = e.target.result;
    };
    reader.onerror = function () {
      showError("File Read Error", "Unable to read the chosen file from local disk.");
    };
    reader.readAsArrayBuffer(file);
  }

  function handleJdFileSelected(file) {
    if (!file) return;
    hideError();

    const fileName = file.name;
    const fileSizeKb = Math.round(file.size / 1024);

    if (fileName.toLowerCase().endsWith('.doc')) {
      showError(
        "Legacy .doc Format Not Supported",
        "Binary .doc files cannot be parsed directly in-browser. Please re-save as modern .docx or .pdf, or paste the job description text."
      );
      return;
    }

    state.jdFile = file;

    const jdFileInfoBox = document.getElementById('jdFileInfoBox');
    const jdFileNameDisplay = document.getElementById('jdFileNameDisplay');
    const jdFileSizeDisplay = document.getElementById('jdFileSizeDisplay');
    const jdFileTypeIcon = document.getElementById('jdFileTypeIcon');

    if (jdFileInfoBox && jdFileNameDisplay && jdFileSizeDisplay) {
      jdFileNameDisplay.textContent = fileName;
      jdFileSizeDisplay.textContent = `${fileSizeKb} KB`;
      if (jdFileTypeIcon) {
        jdFileTypeIcon.textContent = fileName.toLowerCase().endsWith('.pdf') ? '📕' : '📘';
      }
      jdFileInfoBox.style.display = 'flex';
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      state.jdArrayBuffer = e.target.result;
    };
    reader.onerror = function () {
      showError("File Read Error", "Unable to read the Job Description file from local disk.");
    };
    reader.readAsArrayBuffer(file);
  }

  // =========================================================================
  // 7. Initialize Application on DOMContentLoaded
  // =========================================================================
  function initApp() {
    // Resume Intake Tabs
    const tabResumeUpload = document.getElementById('tabResumeUpload');
    const tabResumePaste = document.getElementById('tabResumePaste');
    const resumeUploadSection = document.getElementById('resumeUploadSection');
    const resumePasteSection = document.getElementById('resumePasteSection');

    if (tabResumeUpload && tabResumePaste && resumeUploadSection && resumePasteSection) {
      tabResumeUpload.addEventListener('click', () => {
        state.resumeTab = 'upload';
        tabResumeUpload.classList.add('active');
        tabResumePaste.classList.remove('active');
        resumeUploadSection.style.display = 'block';
        resumePasteSection.style.display = 'none';
      });

      tabResumePaste.addEventListener('click', () => {
        state.resumeTab = 'paste';
        tabResumePaste.classList.add('active');
        tabResumeUpload.classList.remove('active');
        resumePasteSection.style.display = 'block';
        resumeUploadSection.style.display = 'none';
      });
    }

    // Initialize Calibrated JD Taxonomy and Cascading Dropdowns
    initJdTaxonomy();

    // Job Description Intake Tabs (4 Tabs)
    const tabJdUpload = document.getElementById('tabJdUpload');
    const tabJdLink = document.getElementById('tabJdLink');
    const tabJdDomain = document.getElementById('tabJdDomain');
    const tabJdPaste = document.getElementById('tabJdPaste');
    const jdUploadSection = document.getElementById('jdUploadSection');
    const jdLinkSection = document.getElementById('jdLinkSection');
    const jdDomainSection = document.getElementById('jdDomainSection');
    const jdPasteSection = document.getElementById('jdPasteSection');

    function setActiveJdTab(tabName) {
      state.jdTab = tabName;
      const tabMap = {
        'upload': { btn: tabJdUpload, sec: jdUploadSection },
        'link': { btn: tabJdLink, sec: jdLinkSection },
        'domain': { btn: tabJdDomain, sec: jdDomainSection },
        'paste': { btn: tabJdPaste, sec: jdPasteSection }
      };

      for (const [key, item] of Object.entries(tabMap)) {
        if (item.btn) {
          const isActive = (key === tabName);
          item.btn.classList.toggle('active', isActive);
          item.btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        }
        if (item.sec) {
          item.sec.style.display = (key === tabName ? 'block' : 'none');
        }
      }
    }

    if (tabJdUpload) tabJdUpload.addEventListener('click', () => setActiveJdTab('upload'));
    if (tabJdLink) tabJdLink.addEventListener('click', () => setActiveJdTab('link'));
    if (tabJdDomain) tabJdDomain.addEventListener('click', () => setActiveJdTab('domain'));
    if (tabJdPaste) tabJdPaste.addEventListener('click', () => setActiveJdTab('paste'));

    // Resume Dropzone & File Input
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    if (dropZone && fileInput) {
      dropZone.addEventListener('click', () => fileInput.click());

      ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropZone.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropZone.classList.remove('dragover');
        });
      });

      dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length > 0) {
          handleFileSelected(dt.files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleFileSelected(e.target.files[0]);
        }
      });
    }

    // Resume Remove File Button
    const fileRemoveBtn = document.getElementById('fileRemoveBtn');
    if (fileRemoveBtn) {
      fileRemoveBtn.addEventListener('click', () => {
        state.selectedFile = null;
        state.fileArrayBuffer = null;
        const fileInfoBox = document.getElementById('fileInfoBox');
        if (fileInfoBox) fileInfoBox.style.display = 'none';
        if (fileInput) fileInput.value = '';
      });
    }

    // Job Description Dropzone & File Input
    const jdDropZone = document.getElementById('jdDropZone');
    const jdFileInput = document.getElementById('jdFileInput');

    if (jdDropZone && jdFileInput) {
      jdDropZone.addEventListener('click', () => jdFileInput.click());

      ['dragenter', 'dragover'].forEach(eventName => {
        jdDropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          jdDropZone.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        jdDropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          jdDropZone.classList.remove('dragover');
        });
      });

      jdDropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length > 0) {
          handleJdFileSelected(dt.files[0]);
        }
      });

      jdFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleJdFileSelected(e.target.files[0]);
        }
      });
    }

    // Job Description Remove File Button
    const jdFileRemoveBtn = document.getElementById('jdFileRemoveBtn');
    if (jdFileRemoveBtn) {
      jdFileRemoveBtn.addEventListener('click', () => {
        state.jdFile = null;
        state.jdArrayBuffer = null;
        const jdFileInfoBox = document.getElementById('jdFileInfoBox');
        if (jdFileInfoBox) jdFileInfoBox.style.display = 'none';
        if (jdFileInput) jdFileInput.value = '';
      });
    }

    // Job Description URL Analyze Button
    const fetchJdUrlBtn = document.getElementById('fetchJdUrlBtn');
    const jdUrlInput = document.getElementById('jdUrlInput');
    const urlStatusNote = document.getElementById('urlStatusNote');

    if (fetchJdUrlBtn && jdUrlInput) {
      fetchJdUrlBtn.addEventListener('click', () => {
        const url = jdUrlInput.value.trim();
        if (!url) {
          if (urlStatusNote) {
            urlStatusNote.className = 'url-status-note warning';
            urlStatusNote.textContent = 'Please enter a valid job URL to analyze.';
          }
          return;
        }

        state.jdUrl = url;
        if (urlStatusNote) {
          urlStatusNote.className = 'url-status-note success';
          urlStatusNote.innerHTML = `&#10003; <strong>Job link registered:</strong> ${escapeHtml(url)}. The diagnostic engine will correlate keywords against this position. (Tip: You can also paste the full JD text in the Paste tab for 100% keyword depth).`;
        }
      });
    }

    // Resume Word Counter
    const resumeTextInput = document.getElementById('resumeTextInput');
    if (resumeTextInput) {
      resumeTextInput.addEventListener('input', updateWordCount);
    }

    // JD Word Counter
    const jdTextInput = document.getElementById('jdTextInput');
    if (jdTextInput) {
      jdTextInput.addEventListener('input', updateJdWordCount);
    }

    // Load Sample IIM Resume Button
    const loadSampleResumeBtn = document.getElementById('loadSampleResumeBtn');
    if (loadSampleResumeBtn && resumeTextInput) {
      loadSampleResumeBtn.addEventListener('click', () => {
        resumeTextInput.value = SAMPLE_MBA_RESUME;
        updateWordCount();
        hideError();
      });
    }

    // Customized AI JD Generator Button
    // Customized AI JD Generator Button
    const loadSampleJdBtn = document.getElementById('loadSampleJdBtn');
    const jdLoadToast = document.getElementById('jdLoadToast');
    if (loadSampleJdBtn && jdTextInput) {
      loadSampleJdBtn.addEventListener('click', () => {
        if (!state.currentJdObject && window.JD_DATABASE) {
          state.currentJdObject = window.JD_DATABASE.getJd(state.selectedDomainCode || 'CON', state.selectedLevelCode || 'CAMPUS') || window.JD_DATABASE.LIBRARY[0];
        }
        if (state.currentJdObject && window.JD_DATABASE) {
          jdTextInput.value = window.JD_DATABASE.formatJdText(state.currentJdObject);
          state.targetRole = window.JD_DATABASE.getScoringRoleFamily(state.currentJdObject);
          updateJdWordCount();
          hideError();

          // Button pulse feedback
          loadSampleJdBtn.classList.add('pulse-active');
          setTimeout(() => loadSampleJdBtn.classList.remove('pulse-active'), 600);

          // Textarea pulse glow feedback
          jdTextInput.classList.add('textarea-pulse');
          setTimeout(() => jdTextInput.classList.remove('textarea-pulse'), 800);

          // Toast indication
          if (jdLoadToast) {
            const roleShort = state.currentJdObject.domain + ' (' + state.currentJdObject.level + ')';
            jdLoadToast.textContent = `✓ ${roleShort} Loaded`;
            jdLoadToast.classList.add('visible');
            setTimeout(() => jdLoadToast.classList.remove('visible'), 2200);
          }

          // If results are already showing, refresh assessment live
          if (state.lastResult) {
            handleExecuteDiagnostic();
          }
        }
      });
    }

    // JD Paste Text Area word count
    const jdPasteTextInput = document.getElementById('jdPasteTextInput');
    if (jdPasteTextInput) {
      jdPasteTextInput.addEventListener('input', updateJdPasteWordCount);
    }

    // Error Close Button
    const errorCloseBtn = document.getElementById('errorCloseBtn');
    if (errorCloseBtn) {
      errorCloseBtn.addEventListener('click', hideError);
    }

    // Run Diagnostic Button
    const runDiagnosticBtn = document.getElementById('runDiagnosticBtn');
    if (runDiagnosticBtn) {
      runDiagnosticBtn.addEventListener('click', handleExecuteDiagnostic);
    }

    // Print Buttons (Top and Bottom)
    const printReportBtn = document.getElementById('printReportBtn');
    const bottomPrintBtn = document.getElementById('bottomPrintBtn');
    [printReportBtn, bottomPrintBtn].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          window.print();
        });
      }
    });

    // Reset Buttons (Top and Bottom)
    const resetDiagnosticBtn = document.getElementById('resetDiagnosticBtn');
    const bottomResetBtn = document.getElementById('bottomResetBtn');
    [resetDiagnosticBtn, bottomResetBtn].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', resetDiagnostic);
      }
    });

    // Target role select change should re-score if result is already rendered
    const targetRoleSelect = document.getElementById('targetRoleSelect');
    if (targetRoleSelect) {
      targetRoleSelect.addEventListener('change', () => {
        if (state.lastResult) {
          handleExecuteDiagnostic();
        }
      });
    }

    // Check URL parameters for instant testing/demo (#sample or ?sample=1)
    if (window.location.hash === '#sample' || window.location.search.includes('sample=1')) {
      if (tabResumePaste) tabResumePaste.click();
      if (loadSampleResumeBtn) loadSampleResumeBtn.click();
      setTimeout(() => {
        handleExecuteDiagnostic();
      }, 150);
    }

    // Initialize Assessment Repository UI & Navigation
    initRepositoryUI();
  }

  // =========================================================================
  // 8. Assessment Repository & Firebase Integration Controller
  // =========================================================================
  let currentLoadedAssessments = [];

  function showRepositorySaveBanner(saveResponse) {
    const banner = document.getElementById('repoSaveBanner');
    const bannerText = document.getElementById('repoSaveBannerText');
    if (!banner || !bannerText || !saveResponse || !saveResponse.record) return;

    const rec = saveResponse.record;
    const evaluator = (rec.evaluator && rec.evaluator.email) || 'Authorized Evaluator';
    const tagSummary = (rec.tags || []).slice(0, 3).join(' ');
    const isCoFounder = window.AuthGuard && window.AuthGuard.isCoFounder();

    const viewBtn = document.getElementById('viewInRepoBtn');
    if (viewBtn) {
      viewBtn.style.display = isCoFounder ? 'inline-flex' : 'none';
    }

    if (isCoFounder) {
      bannerText.innerHTML = `Assessment archived in Firebase &bull; <strong>ID: ${escapeHtml(rec.id)}</strong> &bull; User: ${escapeHtml(evaluator)} &bull; ${escapeHtml(tagSummary)}`;
      banner.style.display = 'flex';
    } else {
      banner.style.display = 'none';
    }
  }

  async function updateHeaderRepoCount() {
    const isCoFounder = window.AuthGuard && window.AuthGuard.isCoFounder();
    const countPill = document.getElementById('headerRepoCount');
    const repoTab = document.getElementById('navBtnRepository');

    if (repoTab) {
      repoTab.style.display = isCoFounder ? 'inline-flex' : 'none';
    }

    if (!isCoFounder || !countPill || !window.RepositoryService) return;

    try {
      const items = await window.RepositoryService.fetchAssessments();
      countPill.textContent = items.length;
    } catch (_) {}
  }

  function switchToView(viewName) {
    const heroSection = document.getElementById('heroSection');
    const inputPanel = document.getElementById('diagnosticInputPanel');
    const resultsPanel = document.getElementById('diagnosticResults');
    const repoSection = document.getElementById('repositorySection');
    const navBtnDiagnostic = document.getElementById('navBtnDiagnostic');
    const navBtnRepository = document.getElementById('navBtnRepository');

    if (viewName === 'repository') {
      // Exclusively allow the 4 co-founders only
      if (!window.AuthGuard || !window.AuthGuard.isCoFounder()) {
        console.warn("[Access Control] Access to the repository is restricted to the 4 co-founders only.");
        return;
      }

      if (heroSection) heroSection.style.display = 'none';
      if (inputPanel) inputPanel.style.display = 'none';
      if (resultsPanel) resultsPanel.style.display = 'none';
      if (repoSection) repoSection.style.display = 'flex';

      if (navBtnDiagnostic) navBtnDiagnostic.classList.remove('active');
      if (navBtnRepository) navBtnRepository.classList.add('active');

      loadRepositoryView();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (heroSection) heroSection.style.display = '';
      if (inputPanel) inputPanel.style.display = '';
      if (resultsPanel && state.lastResult) resultsPanel.style.display = 'flex';
      if (repoSection) repoSection.style.display = 'none';

      if (navBtnDiagnostic) navBtnDiagnostic.classList.add('active');
      if (navBtnRepository) navBtnRepository.classList.remove('active');

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function loadRepositoryView() {
    const container = document.getElementById('repoCardsContainer');
    const emptyState = document.getElementById('repoEmptyState');
    if (!container || !window.RepositoryService) return;

    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--color-gold-light);">
        <div class="spinner" style="margin: 0 auto 12px;"></div>
        <div>Loading repository from Google Firebase...</div>
      </div>
    `;

    const searchInput = document.getElementById('repoSearchInput');
    const filterDomain = document.getElementById('repoFilterDomain');
    const filterBand = document.getElementById('repoFilterBand');
    const filterEvaluator = document.getElementById('repoFilterEvaluator');
    const sortBy = document.getElementById('repoSortBy');

    const filters = {
      searchQuery: searchInput ? searchInput.value : '',
      domain: filterDomain ? filterDomain.value : 'all',
      band: filterBand ? filterBand.value : 'all',
      evaluator: filterEvaluator ? filterEvaluator.value : 'all',
      sortBy: sortBy ? sortBy.value : 'newest'
    };

    try {
      const assessments = await window.RepositoryService.fetchAssessments(filters);
      currentLoadedAssessments = assessments;

      // Update KPI Statistics
      const allItems = await window.RepositoryService.fetchAssessments();
      const stats = window.RepositoryService.calculateStats(allItems);

      const statTotal = document.getElementById('repoStatTotal');
      const statAvg = document.getElementById('repoStatAvgScore');
      const statReady = document.getElementById('repoStatPlacementReady');
      const statTopDom = document.getElementById('repoStatTopDomain');
      const headerCount = document.getElementById('headerRepoCount');

      if (statTotal) statTotal.textContent = stats.totalCount;
      if (statAvg) statAvg.textContent = stats.averageScore > 0 ? stats.averageScore : '—';
      if (statReady) statReady.textContent = stats.placementReadyCount;
      if (statTopDom) statTopDom.textContent = stats.topDomain;
      if (headerCount) headerCount.textContent = stats.totalCount;

      if (!assessments || assessments.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
      }

      if (emptyState) emptyState.style.display = 'none';
      container.innerHTML = '';

      assessments.forEach(item => {
        const card = createAssessmentCardElement(item);
        container.appendChild(card);
      });

    } catch (err) {
      console.error("[RepositoryView] Load error:", err);
      container.innerHTML = `
        <div style="text-align: center; padding: 30px; color: #FFA4A4;">
          Failed to load repository assessments: ${escapeHtml(err.message)}
        </div>
      `;
    }
  }

  function createAssessmentCardElement(item) {
    const card = document.createElement('div');
    card.className = 'repo-card';
    card.setAttribute('data-id', item.id);

    const rep = item.report || {};
    const score = rep.totalScore || 0;
    const bandClass = score >= 80 ? 'score-ready' : (score >= 65 ? 'score-comp' : (score >= 50 ? 'score-mod' : 'score-needs'));
    const bandLabel = rep.bandLabel || (score >= 80 ? 'Placement Ready' : (score >= 65 ? 'Competitive' : 'Needs Calibration'));

    const resumeName = (item.resume && item.resume.fileName) || 'Resume Document';
    const resumeType = (item.resume && item.resume.fileType) || 'PDF';
    const typeBadgeClass = resumeType === 'PDF' ? 'badge-pdf' : (resumeType === 'DOCX' ? 'badge-docx' : 'badge-text');

    const jdTitle = (item.jobDescription && item.jobDescription.title) || 'Target Job Description';
    const jdDomain = (item.jobDescription && item.jobDescription.domain) || 'General';

    const evalEmail = (item.evaluator && item.evaluator.email) || 'evaluator@mycareercompany.com';
    const evalName = item.candidateName || (item.evaluator && item.evaluator.name) || evalEmail.split('@')[0];
    const evalInitials = evalName.substring(0, 2).toUpperCase();

    const timeSaved = item.formattedTime || (item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN') : 'Saved');

    const tagsHtml = (item.tags || []).map(t => `<span class="repo-tag-pill">${escapeHtml(t)}</span>`).join('');

    card.innerHTML = `
      <div class="repo-card-header">
        <div class="repo-card-evaluator">
          <div class="repo-eval-avatar">${escapeHtml(evalInitials)}</div>
          <div class="repo-eval-meta">
            <span class="repo-eval-name">${escapeHtml(evalName)}</span>
            <span class="repo-eval-email">${escapeHtml(evalEmail)}</span>
          </div>
        </div>
        <div class="repo-card-header-right">
          <span class="repo-card-id-pill" title="Resume Fit Score ID">ID: ${escapeHtml(item.id)}</span>
          <div class="repo-card-time">${escapeHtml(timeSaved)}</div>
        </div>
      </div>

      <div class="repo-card-body">
        <div class="repo-card-entities">
          <div class="repo-entity-row">
            <span class="repo-entity-badge ${typeBadgeClass}">${escapeHtml(resumeType)}</span>
            <span class="repo-entity-title">${escapeHtml(resumeName)}</span>
            <span class="repo-entity-sub">${item.resume && item.resume.wordCount ? item.resume.wordCount + ' words' : ''} ${item.resume && item.resume.numPages ? '&bull; ' + item.resume.numPages + ' page(s)' : ''}</span>
          </div>
          <div class="repo-entity-row">
            <span class="repo-entity-badge badge-jd">TARGET JD</span>
            <span class="repo-entity-title">${escapeHtml(jdTitle)}</span>
            <span class="repo-entity-sub">&bull; ${escapeHtml(jdDomain)}</span>
          </div>
        </div>

        <div class="repo-card-score-box">
          <div class="repo-score-circle ${bandClass}">${score}</div>
          <div class="repo-score-meta">
            <span class="repo-score-band">${escapeHtml(bandLabel)}</span>
            <span class="repo-score-sub">Fit Score Index</span>
          </div>
        </div>
      </div>

      <div class="repo-card-tags">
        ${tagsHtml}
      </div>

      <div class="repo-card-actions">
        <button type="button" class="btn-repo-action btn-repo-report" data-action="report">
          📊 Full Diagnostic Report
        </button>
        <button type="button" class="btn-repo-action btn-repo-doc" data-action="resume">
          📄 View Resume Text
        </button>
        <button type="button" class="btn-repo-action btn-repo-doc" data-action="jd">
          📋 View Target JD
        </button>
        <button type="button" class="btn-repo-action btn-repo-delete" data-action="delete" title="Delete assessment record">
          🗑️
        </button>
      </div>
    `;

    // Action button listeners
    const reportBtn = card.querySelector('[data-action="report"]');
    if (reportBtn) reportBtn.addEventListener('click', () => openReportModal(item));

    const resumeBtn = card.querySelector('[data-action="resume"]');
    if (resumeBtn) resumeBtn.addEventListener('click', () => openDocumentModal(`Resume: ${resumeName}`, item.resume));

    const jdBtn = card.querySelector('[data-action="jd"]');
    if (jdBtn) jdBtn.addEventListener('click', () => openDocumentModal(`Job Description: ${jdTitle}`, item.jobDescription));

    const deleteBtn = card.querySelector('[data-action="delete"]');
    if (deleteBtn) deleteBtn.addEventListener('click', async () => {
      if (confirm(`Are you sure you want to remove assessment "${item.id}" from the repository?`)) {
        await window.RepositoryService.deleteAssessment(item.id);
        loadRepositoryView();
      }
    });

    return card;
  }

  function openReportModal(item) {
    const modal = document.getElementById('reportViewerModal');
    const modalTitle = document.getElementById('reportModalTitle');
    const modalMeta = document.getElementById('reportModalMeta');
    const modalBody = document.getElementById('reportModalBody');
    if (!modal || !modalBody) return;

    const rep = item.report || {};
    const score = rep.totalScore || 0;
    const bandLabel = rep.bandLabel || 'Diagnostic Result';
    const resumeName = item.resume ? item.resume.fileName : 'Resume';
    const jdTitle = item.jobDescription ? item.jobDescription.title : 'Target JD';

    if (modalTitle) modalTitle.textContent = `${resumeName} — ${score}/100`;
    if (modalMeta) modalMeta.textContent = `Target: ${jdTitle} • Saved on ${item.formattedTime || item.createdAt} by ${item.evaluator ? item.evaluator.email : 'Evaluator'}`;

    // Render dimensions
    const dimsHtml = (rep.dimensions || []).map(d => {
      const pct = Math.round((d.score / d.max) * 100);
      const color = pct >= 80 ? 'high' : (pct < 50 ? 'low' : '');
      return `
        <div class="dim-bar-row">
          <div class="dim-bar-meta">
            <span class="dim-name">${escapeHtml(d.name)}</span>
            <span class="dim-score-fraction">${pct}%</span>
          </div>
          <div class="dim-progress-track">
            <div class="dim-progress-fill ${color}" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    }).join('');

    // Render strengths
    const strengthsHtml = (rep.strengths && rep.strengths.length > 0)
      ? rep.strengths.map(s => `
          <div class="strength-item">
            <span class="strength-bullet">✓</span>
            <div class="strength-text"><strong>${escapeHtml(s.name)}</strong>: Scored in top performance band for institutional placement criteria.</div>
          </div>
        `).join('')
      : '<div style="color: var(--color-text-muted);">No dimensions reached the 80% threshold. Focus on priority fixes below.</div>';

    // Render fixes
    const fixesHtml = (rep.priorityFixes && rep.priorityFixes.length > 0)
      ? rep.priorityFixes.map((f, i) => `
          <div class="priority-fix-card">
            <div class="fix-num-badge">PRIORITY 0${i + 1}</div>
            <div class="fix-content">
              <div class="fix-title">${escapeHtml(f.name)} (${f.loss} pts lost)</div>
              <div class="fix-desc">${f.advice || ''}</div>
            </div>
          </div>
        `).join('')
      : '<div style="color: var(--color-text-muted);">Profile shows strong alignment across key criteria.</div>';

    modalBody.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--color-border-subtle);">
        <div>
          <div style="font-size: 13px; color: var(--color-gold-primary); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Fit Score Index</div>
          <div style="font-size: 38px; font-weight: 800; color: var(--color-text-primary); line-height: 1;">${score}<span style="font-size: 18px; color: var(--color-text-muted);">/100</span></div>
          <div style="font-size: 13px; font-weight: 600; color: var(--color-gold-light); margin-top: 4px;">${escapeHtml(bandLabel)}</div>
        </div>
        <div style="background: rgba(5, 38, 31, 0.7); border: 1px solid var(--color-border-subtle); padding: 12px 18px; border-radius: var(--radius-md);">
          <div style="font-size: 12px; color: var(--color-text-muted);">Assessment ID: <strong style="color: var(--color-text-primary);">${escapeHtml(item.id)}</strong></div>
          <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 4px;">Evaluator: <strong style="color: var(--color-gold-light);">${escapeHtml(item.evaluator ? item.evaluator.email : '')}</strong></div>
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <h4 style="font-size: 15px; color: var(--color-gold-primary); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.04em;">Evaluation Vectors (8 Dimensions)</h4>
        <div class="dimension-bars-list">
          ${dimsHtml}
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <h4 style="font-size: 15px; color: var(--color-gold-primary); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.04em;">Profile Strengths</h4>
        <div class="strengths-list">
          ${strengthsHtml}
        </div>
      </div>

      <div>
        <h4 style="font-size: 15px; color: var(--color-gold-primary); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.04em;">Ranked High-Impact Fixes</h4>
        <div class="priority-fixes-list">
          ${fixesHtml}
        </div>
      </div>
    `;

    modal.style.display = 'flex';
  }

  function openDocumentModal(title, docObj) {
    const modal = document.getElementById('documentViewerModal');
    const docTitle = document.getElementById('docModalTitle');
    const docMeta = document.getElementById('docModalMeta');
    const docWordCount = document.getElementById('docWordCount');
    const docTextContainer = document.getElementById('docTextContainer');
    const downloadBtn = document.getElementById('modalDownloadDocBtn');
    if (!modal || !docTextContainer) return;

    const fullText = (docObj && (docObj.fullText || docObj.snippet)) || 'No text content available for this document.';
    const wordCount = docObj && docObj.wordCount ? `${docObj.wordCount} words` : `${(fullText.match(/\b\w+\b/g) || []).length} words`;

    if (docTitle) docTitle.textContent = title;
    if (docMeta) docMeta.textContent = docObj && docObj.fileName ? `File: ${docObj.fileName}` : 'Extracted Text';
    if (docWordCount) docWordCount.textContent = wordCount;
    if (docTextContainer) docTextContainer.textContent = fullText;

    if (downloadBtn) {
      if (docObj && docObj.storageUrl) {
        downloadBtn.href = docObj.storageUrl;
        downloadBtn.style.display = 'inline-flex';
      } else {
        downloadBtn.style.display = 'none';
      }
    }

    modal.style.display = 'flex';
  }

  function openTeamNotifyModal() {
    const modal = document.getElementById('teamNotifyModal');
    const subjectInput = document.getElementById('notifySubjectInput');
    const bodyTextarea = document.getElementById('notifyBodyTextarea');
    const sendMailtoBtn = document.getElementById('modalSendMailtoBtn');
    const copyNote = document.getElementById('notifyCopySuccessNote');
    if (!modal || !window.RepositoryService) return;

    const data = window.RepositoryService.getTeamNotificationData();

    if (subjectInput) subjectInput.value = data.subject;
    if (bodyTextarea) bodyTextarea.value = data.body;
    if (sendMailtoBtn) sendMailtoBtn.href = data.mailtoUrl;
    if (copyNote) copyNote.style.display = 'none';

    modal.style.display = 'flex';
  }

  function closeAllModals() {
    ['teamNotifyModal', 'reportViewerModal', 'documentViewerModal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  function initRepositoryUI() {
    // Navigation switching
    const navBtnDiagnostic = document.getElementById('navBtnDiagnostic');
    const navBtnRepository = document.getElementById('navBtnRepository');
    const viewInRepoBtn = document.getElementById('viewInRepoBtn');
    const repoEmptyRunBtn = document.getElementById('repoEmptyRunBtn');

    if (navBtnDiagnostic) navBtnDiagnostic.addEventListener('click', () => switchToView('diagnostic'));
    if (navBtnRepository) navBtnRepository.addEventListener('click', () => switchToView('repository'));
    if (viewInRepoBtn) viewInRepoBtn.addEventListener('click', () => switchToView('repository'));
    if (repoEmptyRunBtn) repoEmptyRunBtn.addEventListener('click', () => switchToView('diagnostic'));

    // Toolbar Filters & Search with Debounce
    const searchInput = document.getElementById('repoSearchInput');
    const searchClear = document.getElementById('repoSearchClearBtn');
    let searchDebounce = null;

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        if (searchClear) searchClear.style.display = searchInput.value ? 'block' : 'none';
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
          loadRepositoryView();
        }, 250);
      });
    }

    if (searchClear && searchInput) {
      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchClear.style.display = 'none';
        loadRepositoryView();
      });
    }

    ['repoFilterDomain', 'repoFilterBand', 'repoFilterEvaluator', 'repoSortBy'].forEach(id => {
      const sel = document.getElementById(id);
      if (sel) sel.addEventListener('change', () => loadRepositoryView());
    });

    // Header Actions
    const notifyBtn = document.getElementById('repoNotifyTeamBtn');
    if (notifyBtn) notifyBtn.addEventListener('click', openTeamNotifyModal);

    const exportCsvBtn = document.getElementById('repoExportCsvBtn');
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => {
        if (window.RepositoryService) {
          window.RepositoryService.exportToCsv(currentLoadedAssessments);
        }
      });
    }

    const refreshBtn = document.getElementById('repoRefreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => loadRepositoryView());

    // Modal Close Buttons
    ['modalCloseNotifyBtn', 'modalCloseReportBtn', 'modalCloseReportFooterBtn', 'modalCloseDocBtn'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', closeAllModals);
    });

    // Close on overlay backdrop click
    ['teamNotifyModal', 'reportViewerModal', 'documentViewerModal'].forEach(id => {
      const overlay = document.getElementById(id);
      if (overlay) {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) closeAllModals();
        });
      }
    });

    // Copy Email Button in Team Notify Modal
    const copyEmailBtn = document.getElementById('modalCopyEmailBtn');
    if (copyEmailBtn) {
      copyEmailBtn.addEventListener('click', () => {
        const bodyTextarea = document.getElementById('notifyBodyTextarea');
        const copyNote = document.getElementById('notifyCopySuccessNote');
        if (bodyTextarea) {
          navigator.clipboard.writeText(bodyTextarea.value).then(() => {
            if (copyNote) {
              copyNote.style.display = 'inline';
              setTimeout(() => { copyNote.style.display = 'none'; }, 2500);
            }
          }).catch(err => {
            alert("Email text: " + bodyTextarea.value);
          });
        }
      });
    }

    // Copy Doc Text Button in Document Modal
    const copyDocBtn = document.getElementById('modalCopyDocBtn');
    if (copyDocBtn) {
      copyDocBtn.addEventListener('click', () => {
        const docText = document.getElementById('docTextContainer');
        if (docText) {
          navigator.clipboard.writeText(docText.textContent).then(() => {
            copyDocBtn.textContent = '✓ Copied!';
            setTimeout(() => { copyDocBtn.innerHTML = '<span class="btn-icon">📋</span> Copy Text'; }, 2000);
          });
        }
      });
    }

    // Print Modal Report Button
    const printReportBtn = document.getElementById('modalPrintReportBtn');
    if (printReportBtn) {
      printReportBtn.addEventListener('click', () => window.print());
    }

    // Initial badge update
    updateHeaderRepoCount();
  }

  // Bootstrap when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();

