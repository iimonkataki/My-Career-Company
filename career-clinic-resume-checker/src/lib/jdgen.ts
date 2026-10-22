// MyCareerCompany — Target JD generator v3 (Company × Domain × Level × Role).
// JD = BASE[domain, level] ⊕ ROLE[role, level] ⊕ OVERLAY[company → archetype] ⊕ CLASS[company, domain] ⊕ GATE[level]
import companiesRaw from "../data/jd-v3/companies.json";
import archetypesRaw from "../data/jd-v3/archetypes.json";
import rolesRaw from "../data/jd-v3/roles.json";
import baseRaw from "../data/jd-v3/base.json";
import hooksRaw from "../data/jd-v3/hooks.json";
import metaRaw from "../data/jd-v3/meta.json";

export const GENERATOR_VERSION = "jdgen-2026.10-v3";
export const DOMAINS: string[] = (metaRaw as any).domains;
export const LEVELS = ["CAMPUS", "EARLY", "MID", "SENIOR"] as const;
export type Level = (typeof LEVELS)[number];
export type RelClass = "C" | "I" | "A" | "X";
export const CLASS_LABEL: Record<RelClass, string> = { C: "CORE", I: "INTERNAL", A: "ADJACENT", X: "ATYPICAL" };

export interface Company {
  id: string; name: string; legal: string | null; sector: string; arche: string; industry: string | null;
  hired: string[]; top3: string[]; levels: string[]; levelEvidence: string | null; campus: string[]; internship: string[];
  confidence: string; status: string; libFlags: string | null; source: string; businessLines: string[] | null;
  programme: { name: string; levels: string[]; label: string } | null; companyEligibility: { text: string; label: string } | null;
  ladder: Record<string, string> | null; campusTitle: string | null; curatedFlags: string[]; curated: boolean;
  relevance: string; relevanceEvidence: string;
}
export interface Archetype {
  code: string; name: string; ladder: Record<string, string>; eligibility: { text: string; label: string }; regulatory: string;
  tools: string[]; conditionalCerts: string[]; businessLines: string[]; segments: string[]; metrics: string[]; locations: string;
  subSegments: string[]; relevance: Record<string, RelClass>;
}
export interface Role {
  id: string; domain: string; name: string; focus: string; byLevel: Record<string, { resp: string[]; title: string | null; source: string }>;
  entry: Level; skills: string[]; goodToHave: string | null; tools: string[]; atsKeywords: string[];
  certPreferred: string | null; certRequired: string | null; affinity: string[]; generic: boolean; origin: string;
}
export interface Base {
  id: string; domain: string; domainName: string; domainType: string; level: Level; levelLabel: string; experienceBand: string;
  titles: string[]; subAreas: string[]; summary: string; responsibilities: string[]; skills: { technical: string[]; behavioural: string[] };
  goodToHave: string; tools: string[]; experience: { text: string; minYears: number; maxYears: number; freshersEligible: boolean };
  education: string; academicCutOff: { code: string; note: string };
  certifications: { required: string; preferred: string; conditional: string[] }; atsKeywords: string[]; mustHave: string[];
  status: { code: string; label: string; note: string }; flags: string[];
  scoring: { mustHaveSkills: string[]; freshersRole: boolean; minExperienceMonths: number; roleFamily: string; requiredDegrees: string[];
    preferredSpecialisations: string[]; requiredCertifications: string[]; softSkills: string[] };
}

export const COMPANIES = companiesRaw as unknown as Company[];
export const ARCHETYPES = archetypesRaw as unknown as Archetype[];
export const ROLES = rolesRaw as unknown as Role[];
const BASE = baseRaw as unknown as Base[];
const HOOKS = hooksRaw as unknown as Record<string, { exec: string[]; lead: string[] }>;
const COMPANY = new Map(COMPANIES.map(c => [c.id, c]));
const ARCH = new Map(ARCHETYPES.map(a => [a.code, a]));
const ROLE = new Map(ROLES.map(r => [r.id, r]));
const BASEMAP = new Map(BASE.map(b => [`${b.domain}|${b.level}`, b]));

// Archetypes whose title ladders are function-agnostic (safe to use for any CORE domain).
const LADDER_AGNOSTIC = new Set(["AR01","AR02","AR06","AR07","AR08","AR09","AR10","AR11","AR12","AR13","AR14","AR17","AR18","AR22","AR23","AR38","AR45"]);
// Domains whose regulated activities carry archetype-level conditional certifications.
const REGULATED_DOMAINS = new Set(["FIN","SAL","IB","LEG","HCM","MKT"]);
const ADJ_NAME: Record<string, string> = {
  CON:"Internal Strategy & Business Excellence", FIN:"Business Finance", IB:"Corporate Development & M&A", SAL:"Business Development", MKT:"Marketing & Communications",
  PM:"Digital Products & Platforms", HR:"People & Culture", GM:"Strategy & Planning", OPS:"Business Operations", SCM:"Procurement & Supply", PRC:"Corporate Communications",
  LEG:"Legal & Compliance", BA:"Business Analytics & MIS", ITS:"IT & Digital", CSM:"Client Servicing", ENT:"New Ventures & Innovation", HCM:"Healthcare Vertical",
  AGB:"Agri Sourcing & Rural Business", RTL:"Retail & Channel Business", RE:"Real Estate & Expansion", PPD:"CSR & Public Affairs", ESG:"Sustainability",
  ECM:"E-commerce & Digital Channels", MED:"Content & Media Partnerships", ENR:"Energy & New-energy Business", INF:"Projects & Infrastructure",
  TEL:"Connectivity & Telecom Business", EDT:"Learning & Education Business" };
const ADJ_ROLE: Record<string, string> = { IB:"GM:corporate-development", CON:"GM:business-and-corporate-strategy", ENT:"ENT:corporate-innovation-lab",
  PPD:"PPD:csr-and-development-programmes", ECM:"ECM:d2c-brand-management", AGB:"AGB:commodity-procurement", RE:"RTL:expansion-and-franchise", ESG:"ESG:brsr-and-esg-reporting" };
const DOMAIN_METRICS: Record<string, string[]> = {
  FIN:["forecast accuracy and variance","working capital and cash conversion","cost of funds and returns"], IB:["mandates won and closed","deal timelines","fee pool"],
  PM:["activation and retention","conversion","feature adoption"], HR:["attrition and engagement scores","time to hire","training effectiveness"],
  OPS:["SLA adherence and turnaround time","cost per unit","quality and safety incidents"], SCM:["OTIF and fill rate","inventory days","freight cost per unit"],
  PRC:["share of voice and sentiment","coverage quality","reputation scores"], LEG:["contract turnaround time","compliance breaches","litigation exposure"],
  BA:["model accuracy","dashboard adoption","decision impact"], ITS:["system uptime and SLAs","on-time, on-budget delivery","user adoption"],
  CSM:["net revenue retention","churn","customer health scores"], ENT:["pilot traction","unit economics","time to first revenue"],
  HCM:["bed occupancy and ALOS","patient satisfaction","prescription share"], AGB:["dealer coverage and liquidation","farmer reach","procurement cost and quality"],
  RTL:["like-for-like sales","sell-through","inventory turns"], RE:["pre-sales and collections","occupancy","project margins"],
  PPD:["programme outcomes","fund utilisation","beneficiary coverage"], ESG:["emissions intensity","ESG ratings","disclosure completeness"],
  ECM:["GMV and conversion","contribution margin","delivery SLAs"], MED:["reach and watch time","ad yield","subscriber growth"],
  ENR:["MW pipeline and commissioning","tariff competitiveness","plant availability"], INF:["schedule and cost variance","order inflow","safety"],
  TEL:["ARPU and churn","subscriber net adds","enterprise revenue"], EDT:["enrolments and CAC","completion","learner NPS"],
  CON:["client impact","engagement quality","proposal win rate"], GM:["growth and EBITDA","initiative delivery","capital returns"],
  SAL:["target achievement and market share","numeric distribution and coverage","collection efficiency"], MKT:["market share and brand health","campaign ROI","customer acquisition cost"] };
const DOMAIN_CUSTOMERS: Record<string, string[]> = {
  HCM:["patients and families","doctors and hospitals","insurers and TPAs"], AGB:["farmers and FPOs","dealers and distributors","processors and buyers"],
  RTL:["shoppers","brands and vendors","franchise partners"], RE:["home buyers and channel partners","corporate occupiers","investors"],
  ECM:["online shoppers","sellers and brands","logistics partners"], MED:["viewers and subscribers","advertisers and agencies","distribution partners"],
  ENR:["DISCOMs and C&I customers","industrial buyers","lenders and investors"], INF:["government and PSU clients","private developers","lenders"],
  TEL:["prepaid and postpaid subscribers","enterprise customers","retailers and distributors"], EDT:["students and working professionals","partner universities","parents"],
  PPD:["government departments","communities and NGOs","funders"], ESG:["investors and ratings agencies","suppliers","regulators"],
  HR:["employees and managers","candidates","business leaders"], LEG:["business teams","regulators","external counsel"], CSM:["customers","account teams","product teams"] };
const BL_HINT: Record<string, RegExp> = {
  AGB:/agri|farm|dairy|crop|seed|fertili|rural|milk/i, HCM:/health|hospital|pharma|diagnos|medic|nutrition|clinic/i, RTL:/retail|store|fashion|brand|jewel|eyecare/i,
  ECM:/e-commerce|online|marketplace|digital|quick|app/i, MED:/media|content|stream|tv|sports|entertain|music|Hotstar/i, ENR:/energy|power|solar|renew|oil|gas|fuel|refin|LPG/i,
  INF:/infra|port|road|airport|construction|EPC|metro|cement|steel/i, TEL:/telecom|mobile|broadband|connect|Jio|Airtel|5G/i, EDT:/educat|learning|degree|test-prep|upskill/i,
  RE:/real estate|residential|commercial|office|propert|malls/i, FIN:/financ|bank|lending|insurance|wealth|asset|capital|payment|card|loan/i,
  IB:/banking|capital markets|M&A|advisory|markets|securities/i };
// Company types whose archetype KPIs are customer/commercial metrics (safe to reuse for Sales and Marketing lines).
const COMMERCIAL_ARCH = new Set(["AR11","AR14","AR15","AR16","AR17","AR19","AR20","AR21","AR24","AR28","AR29","AR30","AR31","AR32","AR33","AR36","AR44"]);
const LOC_PHRASE: Record<string, string> = { SAL:"assigned territories", AGB:"assigned territories", TEL:"assigned circles", OPS:"assigned sites", SCM:"the supply network", HR:"assigned locations" };
const TRAINEE = /Trainee|\(APM\)|Founder's Office \(Startup\)|Product Analytics|Analyst$/;
const VAGUE_SKILL = /^(operations|sales|execution|communication|coordination|analytics|data|process|finance|research)$/i;
const LEVEL_LABEL: Record<Level, string> = { CAMPUS:"Campus", EARLY:"Early", MID:"Mid", SENIOR:"Senior" };
const LEVEL_FRAME: Record<Level, string> = {
  CAMPUS:"At Campus level, it suits final-year MBA/PGDM/MMS students and recent graduates working as individual contributors under guidance.",
  EARLY:"At Early level (2–5 years), it calls for independent ownership of a workstream, accounts or a business area.",
  MID:"At Mid level (5–10 years), it calls for leading a team and owning a budget, portfolio or policy area.",
  SENIOR:"At Senior level (10+ years), it calls for setting strategy and owning a P&L or function at CXO and board level." };
const SCOPE: Record<Level, string> = {
  CAMPUS:"Work as an individual contributor: analyse, execute and deliver assigned tasks under the guidance of a manager.",
  EARLY:"Own a workstream, set of accounts or business area end to end, guiding 1–3 junior colleagues where needed.",
  MID:"Lead a team of 4–15 people and own a budget, portfolio or policy area.",
  SENIOR:"Set strategy and own a P&L or function, working with the CXO team and board." };
const EXP_GATED = /\b(CFA charter|certified FRM|PMP|PgMP|SHRM-SCP|CBAP|CCBA|MRICS|FRICS|CFP)\b/;

// ---------- deterministic helpers ----------
export function seed(s: string): number { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
const pick = <T,>(arr: T[], n: number) => arr[n % arr.length];
const firstAlt = (s: string) => s.split(" / ")[0].split(" · ")[0].trim();
const stripSuffix = (s: string) => s.replace(/\s+[–-]\s+.*$/, "").trim();
const lcFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const ucFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const dedupe = (arr: string[]) => { const seen = new Set<string>(); return arr.filter(x => { const k = x.toLowerCase().trim(); if (!k || seen.has(k)) return false; seen.add(k); return true; }); };
const PROPER = /^(Indian|PSU|FMCG|Big|EPC|ESG|AMC|NBFC|GCC|IT|SaaS|PR|E-commerce|Global|Domestic)\b/;
export const smartLower = (s: string) => s.split(" ").map(w => /^[A-Z0-9&-]{2,}$/.test(w) || /^[A-Z][a-z]*[A-Z]/.test(w) ? w : w.toLowerCase()).join(" ");
const aName = (n: string) => { const t = PROPER.test(n) ? n : lcFirst(n); return `${/^[aeiouAEIOU]/.test(t) || /^(FMCG|NBFC|ESG|EPC|AMC|IT)\b/.test(t) ? "an" : "a"} ${t}`; };
const article = (w: string) => (/^[aeiouAEIOU]/.test(w) ? "an" : "a");
const regToken = (r: string) => (r.match(/\b[A-Z][A-Z&]{1,}[A-Za-z]*\b/) || [""])[0];
const CRED = /(NISM-Series-[A-Z0-9-]+|IC-38|ICSI|Bar Council|AIBE|CISA|\bCA\b|\bCMA\b)/;
const FINSERV = new Set(["AR08","AR09","AR10","AR11","AR12","AR13","AR14","AR15","AR16","AR17","AR18","AR45"]);
const possessive = (co: string) => co === "the company" ? "the company's" : co.endsWith("s") ? `${co}'` : `${co}'s`;

// ---------- context ----------
export interface Context { kind: "company" | "other"; id: string; name: string; company: Company | null; arche: Archetype; sector: string;
  businessLines: string[]; segment: string | null; customers: string[]; }
export function contextFor(input: { companyId?: string; archetype?: string; segment?: string }): Context {
  if (input.companyId && input.companyId !== "other") {
    const c = COMPANY.get(input.companyId); if (!c) throw new Error(`Unknown company ${input.companyId}`);
    const a = ARCH.get(c.arche)!;
    const bl = c.businessLines?.length ? c.businessLines : [`${smartLower(c.sector)} business`];
    return { kind: "company", id: c.id, name: c.name, company: c, arche: a, sector: c.sector, businessLines: bl, segment: null, customers: a.segments };
  }
  const a = ARCH.get(input.archetype || "") ; if (!a) throw new Error("For 'Other', choose a company type (archetype).");
  const seg = input.segment && a.subSegments.includes(input.segment) ? input.segment : null;
  const bl = seg ? [`${smartLower(seg)} business`, ...a.businessLines] : a.businessLines;
  const segIdx = seg ? Math.min(a.subSegments.indexOf(seg), a.segments.length - 1) : 0;
  const segments = seg ? [a.segments[segIdx], ...a.segments.filter((_, i) => i !== segIdx)] : a.segments;
  return { kind: "other", customers: segments, id: `other-${a.code}${seg ? "-" + seg.toLowerCase().replace(/[^a-z0-9]+/g, "-") : ""}`, name: "the company", company: null, arche: a, sector: a.name, businessLines: bl, segment: seg };
}
export function relevanceOf(ctx: Context, domain: string): { cls: RelClass; evidence: string } {
  const i = DOMAINS.indexOf(domain); if (i < 0) throw new Error(`Unknown domain ${domain}`);
  if (ctx.company) {
    const legend = (metaRaw as any).evidenceLegend as Record<string, string>;
    return { cls: ctx.company.relevance[i] as RelClass, evidence: legend[ctx.company.relevanceEvidence.split(" ")[i]] || "" };
  }
  const cls = (ctx.arche.relevance[domain] as RelClass) || (["CON","IB","ENT","PPD"].includes(domain) ? "A" :
    ["HCM","AGB","RTL","RE","ECM","MED","ENR","INF","TEL","EDT"].includes(domain) ? "X" : "I");
  return { cls, evidence: `Archetype default (${ctx.arche.name}) – INFERENCE` };
}

// ---------- roles ----------
export function rolesFor(ctx: Context, domain: string, level: Level = "CAMPUS"): Role[] {
  const all = ROLES.filter(r => r.domain === domain);
  const matched = all.filter(r => r.affinity.includes(ctx.arche.code));
  const generic = all.filter(r => r.generic && !matched.includes(r));
  let list = [...matched, ...generic];
  if (!list.length) list = all.slice(0, 6);
  const { cls } = relevanceOf(ctx, domain);
  if (cls === "A" && ADJ_ROLE[domain]) { const adj = ROLE.get(ADJ_ROLE[domain]); if (adj) list = [adj, ...list.filter(r => r.id !== adj.id)]; }
  // Best fit first: archetype position in the role's affinity list, then the role's catalogue order.
  const lvi = LEVELS.indexOf(level);
  const rank = (r: Role) => { const i = r.affinity.indexOf(ctx.arche.code);
    return (i < 0 ? 99 : i) + (LEVELS.indexOf(r.entry) > lvi ? 50 : 0) + (TRAINEE.test(r.name) ? (lvi >= 2 ? 50 : lvi === 1 ? 5 : 0) : 0); };
  const head = cls === "A" && ADJ_ROLE[domain] ? list.slice(0, 1) : [];
  let rest = (head.length ? list.slice(1) : list).map((r, i) => ({ r, k: rank(r) * 100 + i })).sort((x, y) => x.k - y.k).map(x => x.r);
  // Among roles tied for best fit, rotate deterministically by company so peers in the same sector feature different roles.
  const best = rest.length ? rank(rest[0]) : 0;
  const tied = rest.filter(r => rank(r) === best && best < 99);
  if (tied.length > 1 && !(ctx.company?.curated)) {
    const k = seed(`${ctx.id}|${domain}|feature`) % tied.length;
    rest = [...tied.slice(k), ...tied.slice(0, k), ...rest.filter(r => !tied.includes(r))];
  }
  return [...head, ...rest].slice(0, 8);
}

// ---------- the card ----------
export interface JDCard {
  id: string; generatorVersion: string; contextKind: "company" | "other"; companyId: string; companyName: string; sector: string; archetype: { code: string; name: string };
  domain: string; domainName: string; level: Level; levelLabel: string; experienceBand: string;
  relevance: { class: RelClass; label: string; evidence: string }; banner: string | null;
  title: string; role: { id: string; name: string }; roleOptions: { id: string; name: string; title: string; focus: string }[];
  summary: string; responsibilities: string[]; skills: { technical: string[]; behavioural: string[] }; goodToHave: string; tools: string[];
  experience: string; education: string; eligibility: { code: string; note: string; label: string; source: string }; locations: string;
  campusPresence: string[]; certifications: { required: string; preferred: string; conditional: string[] };
  atsKeywords: string[]; mustHave: string[]; flags: string[]; disclaimer: string; fingerprint: string;
  scoring: { freshersRole: boolean; minExperienceMonths: number; roleFamily: string; requiredDegrees: string[]; preferredSpecialisations: string[]; softSkills: string[] };
  baseStatus: { code: string; label: string };
}

function titleFor(ctx: Context, cls: RelClass, level: Level, base: Base, role: Role, domain: string): string {
  const baseTitle = stripSuffix(firstAlt(base.titles[0] || "Associate"));
  if (cls === "A") return `${baseTitle} – ${ADJ_NAME[domain]}`;
  const ownTitle = role.byLevel[level]?.title || null;   // e.g. "Assistant Brand Manager" from the role library
  if (cls === "C") {
    const c = ctx.company;
    let lt: string | null = null;
    if (c?.ladder?.[level.charAt(0)]) lt = c.ladder[level.charAt(0)];
    else if (level === "CAMPUS" && c?.campusTitle) lt = c.campusTitle;
    else if (LADDER_AGNOSTIC.has(ctx.arche.code)) lt = ctx.arche.ladder[level.charAt(0)];
    if (lt) return `${firstAlt(lt)} – ${role.name}`;
    if (ownTitle) return ownTitle;
    return `${baseTitle} – ${role.name}`;
  }
  if (ownTitle) return `${ownTitle}${cls === "I" && !/in-house/i.test(ownTitle) ? " (in-house)" : ""}`;
  const sharesWord = role.name.split(/[\s/&(),-]+/).some(w => w.length >= 5 && baseTitle.toLowerCase().includes(w.toLowerCase()));
  const core = sharesWord ? baseTitle : `${baseTitle} – ${role.name}`;
  return `${core}${cls === "I" && !/in-house/i.test(core) ? " (in-house)" : ""}`;
}

interface Slots { bls: string[]; segs: string[]; metrics: string[]; loc: string; }
function slotsFor(ctx: Context, domain: string, cls: RelClass): Slots {
  const native = cls === "C" && ctx.arche.relevance[domain] === "C";
  const hint = BL_HINT[domain];
  const matched = hint ? ctx.businessLines.filter(b => hint.test(b)) : [];
  const bls = matched.length ? matched : (hint && ctx.kind === "company" ? [ctx.businessLines[0]] : ctx.businessLines);
  // HR and Legal serve internal stakeholders, so their "customers" never come from the company type.
  const segs = DOMAIN_CUSTOMERS[domain] && (!native || domain === "HR" || domain === "LEG") ? DOMAIN_CUSTOMERS[domain] : ctx.customers;
  const commercial = COMMERCIAL_ARCH.has(ctx.arche.code);
  const useArchMetric = native && (["CON","GM","BA"].includes(domain) || (commercial && ["SAL","MKT"].includes(domain)));
  return { bls, segs, metrics: useArchMetric ? ctx.arche.metrics : DOMAIN_METRICS[domain] || ctx.arche.metrics, loc: LOC_PHRASE[domain] || "assigned locations" };
}
function fill(tpl: string, ctx: Context, n: number, sl: Slots): string {
  const a = ctx.arche;
  if (!/\{co\}/.test(tpl)) tpl = /\{bl\}/.test(tpl) ? tpl.replace("{bl}", "{co}'s {bl}") : /\{seg\}/.test(tpl) ? `${tpl} at {co}` : `${tpl} for {co}'s {bl}`;
  return tpl.replace(/\{co\}'s/g, possessive(ctx.name)).replace(/\{co\}/g, ctx.name)
    .replace(/\{bl\}/g, pick(sl.bls, n)).replace(/\{seg\}/g, pick(sl.segs, n >>> 3))
    .replace(/\{metric\}/g, pick(sl.metrics, n >>> 5)).replace(/\{reg\}/g, a.regulatory).replace(/\{loc\}/g, sl.loc)
    .replace(/\{tool\}/g, pick(a.tools, n >>> 7));
}

export function generate(input: { companyId?: string; archetype?: string; segment?: string; domain: string; level: Level; roleId?: string }): JDCard {
  const ctx = contextFor(input);
  const { domain, level } = input;
  const base = BASEMAP.get(`${domain}|${level}`); if (!base) throw new Error(`No base JD for ${domain}|${level}`);
  const { cls, evidence } = relevanceOf(ctx, domain);
  const options = rolesFor(ctx, domain, level);
  const role = (input.roleId && ROLE.get(input.roleId)) || options[0];
  const s = seed(`${ctx.id}|${domain}|${level}|${role.id}`);
  const co = ctx.name, coP = possessive(co);
  const execBand = level === "CAMPUS" || level === "EARLY";

  // Summary
  const sl = slotsFor(ctx, domain, cls);
  const bl0 = sl.bls[0];
  const seg0 = sl.segs[0];
  const prog = ctx.company?.programme && level === "CAMPUS" && cls === "C" ? ` within the ${ctx.company.programme.name.split(" – ")[0].split(";")[0]}` : "";
  const where = ctx.kind === "company" ? `${co} (${ctx.sector})` : `${aName(ctx.arche.name)}${ctx.segment ? ` (${ctx.segment})` : ""}`;
  const lead = {
    C: `${role.name} role at ${where}, working on ${bl0} for ${seg0}${prog}.`,
    I: `In-house ${base.domainName.toLowerCase()} role (${role.name}) at ${where}, supporting ${coP} ${bl0}.`,
    A: `Closest equivalent at ${where} to ${article(base.domainName)} ${base.domainName} role: ${ADJ_NAME[domain]}, supporting ${coP} ${bl0}.`,
    X: `${ctx.kind === "company" ? co : "This type of company"} rarely hires MBAs into ${base.domainName}; this extrapolated JD describes the closest ${role.name} role, linked to ${bl0}.`,
  }[cls];
  const summary = `${lead} ${role.focus} ${LEVEL_FRAME[level]}`;

  // Responsibilities: scope + 3 company hooks + role / base duties
  const hookDomain = cls === "A" && ADJ_ROLE[domain] ? role.domain : domain;
  const hk = HOOKS[hookDomain][execBand ? "exec" : "lead"];
  const start = s % hk.length;
  const hooks = cls === "X"
    ? [`Apply ${base.domainName.toLowerCase()} skills where ${co === "the company" ? "the company" : co} needs them, for example in ${bl0} serving ${seg0}`]
    : [0, 1, 2].map(i => fill(hk[(start + i) % hk.length], ctx, s + i * 7919, hookDomain === domain ? sl : slotsFor(ctx, hookDomain, "C")));
  let roleLines: string[];
  const rl = role.byLevel[level] || role.byLevel[LEVELS.slice(0, LEVELS.indexOf(level) + 1).reverse().find(l => role.byLevel[l]) || role.entry];
  const rot = <T,>(arr: T[], k: number, n: number) => arr.length <= n ? arr.slice() : [...arr.slice(k % arr.length), ...arr.slice(0, k % arr.length)].slice(0, n);
  if (execBand) roleLines = rot(rl?.resp || [], s >>> 9, 5);
  else {
    const own = role.byLevel[level] ? role.byLevel[level].resp.slice(0, 3) : [
      `Set direction and standards for ${role.name.toLowerCase()} across ${coP} ${pick(sl.bls, s >>> 2)}`,
      `Coach the team that will ${lcFirst((role.byLevel[role.entry]?.resp[0] || role.focus).replace(/\.$/, ""))}`];
    roleLines = [...own, ...rot(base.responsibilities.slice(1), s >>> 11, 4)];
  }
  let responsibilities = dedupe([SCOPE[level], ...hooks, ...roleLines]);
  if (responsibilities.length < 8) responsibilities = dedupe([...responsibilities, ...base.responsibilities.slice(1)]);
  responsibilities = responsibilities.slice(0, 10);

  // Skills, tools, keywords, must-haves
  const technical = dedupe([...role.skills.slice(0, 4).map(ucFirst), ...base.skills.technical]).slice(0, 8);
  const behavioural = base.skills.behavioural;
  const tools = dedupe([...role.tools, ...ctx.arche.tools]).slice(0, 7);
  const coTokens = ctx.kind === "company"
    ? [co, ctx.sector, ctx.company?.programme ? (ctx.company.programme.name.match(/\(([A-Z]{2,6})\)/)?.[1] || "") : "", regToken(ctx.arche.regulatory)]
    : [ctx.arche.name, ctx.segment || "", regToken(ctx.arche.regulatory)];
  const atsKeywords = dedupe([...coTokens.filter(Boolean), ...role.atsKeywords, ...base.atsKeywords]).slice(0, 25);
  const roleMust = role.skills.find(k => !VAGUE_SKILL.test(k.trim())) || "";
  const mustHave = dedupe([...base.mustHave.slice(0, 4), ucFirst(roleMust)]).slice(0, 5);

  // Eligibility precedence: company (verified/secondary) > archetype > base level norm
  let elig = { code: base.academicCutOff.code, note: base.academicCutOff.note, label: "See note", source: "Base domain × level norm" };
  const notifBased = ["AR13", "AR23", "AR38"].includes(ctx.arche.code);
  if (cls === "C" && (level === "CAMPUS" || (level === "EARLY" && notifBased))) {
    if (ctx.company?.companyEligibility) elig = { code: base.academicCutOff.code, note: ctx.company.companyEligibility.text, label: ctx.company.companyEligibility.label, source: "Company-specific" };
    else elig = { code: base.academicCutOff.code, note: ctx.arche.eligibility.text, label: ctx.arche.eligibility.label, source: `Archetype norm (${ctx.arche.name})` };
  } else if (notifBased && cls === "C") {
    elig = { ...elig, note: `${elig.note} Lateral PSU, bank and regulator posts are notification-based, with post-qualification experience and age limits (e.g., one 2025-26 PSU notice: Manager 8 years and age ≤35) – SECONDARY.`, label: "SECONDARY" };
  }

  // Certifications (level-gated)
  let required = base.certifications.required;
  if (role.certRequired && cls === "C") required = /^None/.test(required) ? role.certRequired : `${required}; ${role.certRequired}`;
  if (level === "CAMPUS" && EXP_GATED.test(required)) required = required.replace(EXP_GATED, m => `${m} (candidate / in progress only at Campus)`);
  const basePref = base.certifications.preferred;
  const acr = (x: string) => (x.match(/\b[A-Z][A-Z0-9-]{1,}\b/g) || [x.split(/[\s(]/)[0]]);
  const extraPref = (role.certPreferred || "").split(";").map(x => x.trim()).filter(x => x && !acr(x).some(k => basePref.includes(k)));
  const preferred = [basePref, ...extraPref].filter(Boolean).join("; ");
  let baseCond = base.certifications.conditional;
  if ((domain === "FIN" || domain === "SAL") && !FINSERV.has(ctx.arche.code)) baseCond = baseCond.filter(c => !/NISM|IRDAI|IC-38/.test(c));
  const archCond = REGULATED_DOMAINS.has(domain) && cls === "C" ? ctx.arche.conditionalCerts.filter(c => { const k = (c.match(CRED) || [""])[0]; return !k || !baseCond.some(b => b.includes(k)); }) : [];
  const conditional = dedupe([...baseCond, ...archCond]);

  // Flags
  const flags: string[] = [];
  const banner = cls === "X" ? `FLAG — Atypical: ${ctx.kind === "company" ? co : "this company type"} rarely hires MBAs into ${base.domainName}; this JD is extrapolated.`
    : cls === "A" ? `Closest equivalent role at ${ctx.kind === "company" ? co : "this company type"}: ${ADJ_NAME[domain]} (not a classic ${base.domainName} role).`
    : cls === "I" ? `In-house function: ${base.domainName} supports ${coP} business; smaller team and internal clients.` : null;
  if (ctx.company && !ctx.company.levels.includes(level)) flags.push(`${co} is not recorded as hiring MBAs at ${LEVEL_LABEL[level]} level in the library; this level is extrapolated.`);
  if (ctx.company?.confidence === "Low") flags.push(`${co} is not yet matched to a placement report (library confidence: Low) – confirm MBA hiring before relying on this JD.`);
  if (LEVELS.indexOf(level) < LEVELS.indexOf(role.entry)) flags.push(`${role.name} is rarely hired at ${LEVEL_LABEL[level]} level; the JD shows the closest entry route.`);
  if (ctx.company && !ctx.company.curated) flags.push("Company-specific business lines are not yet curated; personalisation uses the library sector and company type (INFERENCE).");
  flags.push(...(ctx.company?.curatedFlags || []));
  // Library notes are shown unless they contain pay figures (compensation is excluded from JDs by design).
  if (ctx.company?.libFlags && !/(₹|LPA|lakh|\bCTC\b|salary|stipend)/i.test(ctx.company.libFlags)) flags.push(`Library note: ${ctx.company.libFlags}`);
  if (base.status.code === "A") flags.push(`Base ${base.domainName} JD at ${LEVEL_LABEL[level]} level is assumption-led (A).`);
  flags.push(`Relevance class ${CLASS_LABEL[cls]} – basis: ${evidence}.`);

  const title = titleFor(ctx, cls, level, base, role, domain);
  const disclaimer = ctx.kind === "company"
    ? `Illustrative sample based on ${coP} public hiring patterns — not an official JD.`
    : `Illustrative sample for a ${ctx.arche.name.toLowerCase()} — not an official JD of any company.`;
  const fpText = [title, summary, ...responsibilities.slice(0, 4), elig.note, required].join("|");
  const fingerprint = seed(fpText).toString(16).padStart(8, "0") + seed("#" + fpText + "#").toString(16).padStart(8, "0");   // 64-bit
  return {
    id: `${ctx.id}|${domain}|${level}|${role.id}`, generatorVersion: GENERATOR_VERSION, contextKind: ctx.kind, companyId: ctx.id, companyName: ctx.kind === "company" ? co : `Other – ${ctx.arche.name}`,
    sector: ctx.sector, archetype: { code: ctx.arche.code, name: ctx.arche.name },
    domain, domainName: base.domainName, level, levelLabel: LEVEL_LABEL[level], experienceBand: base.experienceBand,
    relevance: { class: cls, label: CLASS_LABEL[cls], evidence }, banner, title, role: { id: role.id, name: role.name },
    roleOptions: options.map(r => ({ id: r.id, name: r.name, title: titleFor(ctx, cls, level, base, r, domain), focus: r.focus })),
    summary, responsibilities, skills: { technical, behavioural }, goodToHave: role.goodToHave && !base.goodToHave.toLowerCase().includes(role.goodToHave.toLowerCase().split(";")[0].trim()) ? `${ucFirst(role.goodToHave.replace(/\.$/, ""))}; ${lcFirst(base.goodToHave)}` : base.goodToHave,
    tools, experience: base.experience.text, education: base.education, eligibility: elig, locations: ctx.arche.locations,
    campusPresence: ctx.company ? [...ctx.company.campus, ...ctx.company.internship.map(x => `${x} (internships)`)] : [],
    certifications: { required, preferred, conditional }, atsKeywords, mustHave, flags, disclaimer, fingerprint,
    scoring: { freshersRole: base.scoring.freshersRole, minExperienceMonths: base.scoring.minExperienceMonths, roleFamily: base.scoring.roleFamily,
      // Degree gate only for CORE campus roles (same rule as v2); never for INTERNAL/ADJACENT/ATYPICAL extrapolations.
      requiredDegrees: cls === "C" ? base.scoring.requiredDegrees : [], preferredSpecialisations: base.scoring.preferredSpecialisations, softSkills: base.scoring.softSkills },
    baseStatus: { code: base.status.code, label: base.status.label },
  };
}

// Convenience for pickers
export function listCompanies() { return COMPANIES.map(c => ({ id: c.id, name: c.name, sector: c.sector, archetype: c.arche })); }
export function listArchetypes() { return ARCHETYPES.map(a => ({ code: a.code, name: a.name, segments: a.subSegments })); }
