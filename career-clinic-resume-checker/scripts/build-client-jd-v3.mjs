// scripts/build-client-jd-v3.mjs
// Compiles the v3 data layers and deterministic JD generator into a client-side bundle for index.html
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const DATA_DIR = "src/data/jd-v3";
const OUT_FILE = "jd-database-v3.js";

const companies = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "companies.json"), "utf8"));
const archetypes = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "archetypes.json"), "utf8"));
const roles = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "roles.json"), "utf8"));
const base = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "base.json"), "utf8"));
const hooks = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "hooks.json"), "utf8"));
const meta = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "meta.json"), "utf8"));

// Read the generator implementation from src/lib/jdgen.ts
let jdgenTs = fs.readFileSync("src/lib/jdgen.ts", "utf8");

// Remove imports of raw json files since we inject them
jdgenTs = jdgenTs.replace(/import\s+.*?from\s+["'].*?\.json["'];?\s*/g, "");

// Transpile with TypeScript
const transpiled = ts.transpileModule(jdgenTs, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    removeComments: false,
  }
}).outputText;

// Clean up export keywords inside the factory
const cleanTranspiled = transpiled
  .replace(/export\s+const\s+/g, "const ")
  .replace(/export\s+function\s+/g, "function ")
  .replace(/export\s+let\s+/g, "let ")
  .replace(/export\s*\{[^}]*\};?/g, "");

const bundleCode = `/**
 * My Career Company — Calibrated Target Job Description Database v3 (Browser Edition)
 * Version: jdlib-2026.10-v3 | Generator: jdgen-2026.10-v3
 * 835 Companies × 45 Archetypes × 28 Domains × 4 Levels × 236 Roles
 * Pre-compiled for instant client-side execution in www.mycareercompany.com/ResumeFitScore
 */
(function (root, factory) {
  var exported = factory();
  if (typeof globalThis !== 'undefined') {
    globalThis.JD_DATABASE_V3 = exported;
  }
  if (typeof window !== 'undefined') {
    window.JD_DATABASE_V3 = exported;
  }
  if (typeof module === 'object' && module && module.exports) {
    module.exports = exported;
  }
  if (typeof define === 'function' && define.amd) {
    define([], function () { return exported; });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var companiesRaw = ${JSON.stringify(companies)};
  var archetypesRaw = ${JSON.stringify(archetypes)};
  var rolesRaw = ${JSON.stringify(roles)};
  var baseRaw = ${JSON.stringify(base)};
  var hooksRaw = ${JSON.stringify(hooks)};
  var metaRaw = ${JSON.stringify(meta)};

  var DOMAIN_NAMES_MAP = {
    CON: "Consulting", FIN: "Finance", IB: "Investment Banking", CB: "Corporate Banking",
    PEVC: "Private Equity & Venture Capital", MKT: "Marketing", SAL: "Sales & Business Development",
    PM: "Product Management", OPS: "Operations", SCM: "Supply Chain Management",
    HR: "Human Resources", GM: "General Management", BA: "Business Analytics",
    ITS: "IT Services & Digital", CSM: "Customer Success", ENT: "Entrepreneurship & Innovation",
    HCM: "Healthcare Management", AGB: "Agribusiness", RTL: "Retail Management",
    RE: "Real Estate Management", PPD: "Public Policy & Development", ESG: "Sustainability & ESG",
    ECM: "E-Commerce", MED: "Media & Entertainment", ENR: "Energy Management",
    INF: "Infrastructure Management", TEL: "Telecom Management", EDT: "Education Technology"
  };

${cleanTranspiled}

  function normalise(s) {
    return (s || "").trim().toLowerCase().replace(/\\s+/g, " ");
  }

  function stripParens(s) {
    return (s || "").replace(/\\s*\\([^)]*\\)/g, "").trim();
  }

  function toJDText(c) {
    if (!c) return "";
    var lines = [
      c.title + " · " + c.companyName + " · " + c.domainName + " — " + c.levelLabel + " (" + c.experienceBand + ")",
      c.banner ? "Note: " + c.banner : "",
      "About the role: " + c.summary,
      "Key responsibilities:\\n" + (c.responsibilities || []).map(function(r) { return "- " + r; }).join("\\n"),
      "Technical skills: " + (c.skills && c.skills.technical ? c.skills.technical.join("; ") : ""),
      "Behavioural skills: " + (c.skills && c.skills.behavioural ? c.skills.behavioural.join("; ") : ""),
      "Good to have: " + (c.goodToHave || "Relevant internships and projects"),
      "Tools: " + ((c.tools || []).join("; ") || "Standard industry suite"),
      "Experience: " + (c.experience || ""),
      "Education: " + (c.education || ""),
      "Academic criteria (" + (c.eligibility ? c.eligibility.code + ", " + c.eligibility.label : "AC-C") + "): " + (c.eligibility ? c.eligibility.note : "Standard 60% floor"),
      "Certifications — required: " + (c.certifications ? c.certifications.required : "None"),
      "Certifications — preferred: " + (c.certifications ? c.certifications.preferred : "None typically"),
      (c.certifications && c.certifications.conditional && c.certifications.conditional.length) ?
        "Certifications — conditional:\\n" + c.certifications.conditional.map(function(x) { return "- " + x; }).join("\\n") : "",
      "Keywords: " + ((c.atsKeywords || []).join(", ") || ""),
      c.disclaimer || ""
    ];
    return lines.filter(Boolean).join("\\n\\n");
  }

  function toJDFacts(c) {
    if (!c) return null;
    var must = (c.mustHave || []).slice(0, 5);
    var seen = new Set(must.map(normalise));
    var preferred = [];
    var pool = (c.atsKeywords || []).slice(0, 25).concat(
      c.skills && c.skills.technical ? c.skills.technical.map(stripParens) : []
    );
    for (var i = 0; i < pool.length; i++) {
      var k = pool[i];
      var n = normalise(k);
      if (!n || seen.has(n) || k === c.companyName || k === c.sector) continue;
      seen.add(n);
      preferred.push(k);
    }
    return {
      title: c.title,
      roleFamily: c.scoring ? c.scoring.roleFamily : "consulting",
      freshersRole: c.scoring ? c.scoring.freshersRole : true,
      minExperienceMonths: c.scoring ? c.scoring.minExperienceMonths : 0,
      requiredDegrees: c.scoring ? c.scoring.requiredDegrees : [],
      preferredSpecialisations: c.scoring ? c.scoring.preferredSpecialisations : [],
      requiredCertifications: [],
      hardSkills: must.map(function(name) { return { name: name, mustHave: true }; })
        .concat(preferred.map(function(name) { return { name: name, mustHave: false }; })),
      softSkills: c.scoring ? c.scoring.softSkills : []
    };
  }

  function getDomainsList() {
    return DOMAINS.map(function(code) {
      return { code: code, name: DOMAIN_NAMES_MAP[code] || code };
    });
  }

  function getLevelsList() {
    return [
      { code: "CAMPUS", label: "Fresher (0–2 yrs)", band: "0–2 years", hint: "Freshers & MBA Final-Year Students" },
      { code: "EARLY", label: "Early (2–5 yrs)", band: "2–5 years", hint: "Early lateral / 2–5 years experience" },
      { code: "MID", label: "Mid (5–10 yrs)", band: "5–10 years", hint: "Mid Management / 5–10 years experience" },
      { code: "SENIOR", label: "Senior (10+ yrs)", band: "10+ years", hint: "Senior Executive / CXO / P&L" }
    ];
  }

  return {
    VERSION: 'jdlib-2026.10-v3',
    GENERATOR_VERSION: GENERATOR_VERSION,
    COMPANIES: COMPANIES,
    ARCHETYPES: ARCHETYPES,
    ROLES: ROLES,
    DOMAINS: DOMAINS,
    LEVELS: LEVELS,
    getCompanies: listCompanies,
    getArchetypes: listArchetypes,
    getDomains: getDomainsList,
    getLevels: getLevelsList,
    getRolesFor: rolesFor,
    generate: generate,
    toJDText: toJDText,
    toJDFacts: toJDFacts
  };
});
`;

fs.writeFileSync(OUT_FILE, bundleCode, "utf8");
console.log(`Successfully built ${OUT_FILE} (${Math.round(bundleCode.length / 1024)} KB)`);
