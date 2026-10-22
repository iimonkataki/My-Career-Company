// MyCareerCompany — Target JD Library v2: one consolidated JD per Career Level × Target Domain.
// Source of truth: src/data/jd-library.v2.json (extracted from the Antigravity context file by `npm run jd:extract`).
// Server-side module (large JSON). Client components must use /api/jds.
import { z } from "zod";
import raw from "../data/jd-library.v2.json";
import { JDFacts } from "./schemas";
import { normalise } from "./skills";

export const LIBRARY_VERSION = "jdlib-2026.10-v2";
export const LEVEL_CODES = ["CAMPUS", "EARLY", "MID", "SENIOR"] as const;
export type LevelCode = (typeof LEVEL_CODES)[number];
export const LEVELS: { code: LevelCode; label: string; band: string; hint: string }[] = [
  { code: "CAMPUS", label: "Campus", band: "0–2 years", hint: "Final-year MBA/PGDM/MMS students and recent graduates (internship-only profiles welcome)" },
  { code: "EARLY", label: "Early", band: "2–5 years", hint: "Early lateral professionals; EPGP / one-year MBA with under 5 years' experience" },
  { code: "MID", label: "Mid", band: "5–10 years", hint: "Managers and senior managers; EPGP with 5–10 years; manager-level MDP" },
  { code: "SENIOR", label: "Senior", band: "10+ years", hint: "Heads, directors, P&L and function leaders; executive education and senior MDP" },
];
export const STATUS_CODES = ["V", "P", "A"] as const;
export const CUTOFF_CODES = ["AC-C", "AC-E", "AC-M", "AC-L", "N/A"] as const;
export const ROLE_FAMILIES = ["consulting", "product", "marketing", "sales", "finance", "analytics", "operations", "hr", "other"] as const;
export const SAMPLE_DISCLAIMER =
  "Sample JDs are illustrative composites for resume-matching practice. They are not live vacancies, and a high match does not guarantee shortlisting or placement.";

export const TargetJD = z.object({
  id: z.string().regex(/^[A-Z]{2,3}-(CAMPUS|EARLY|MID|SENIOR)$/),
  domain: z.string().min(2),
  domainCode: z.string().min(2).max(3),
  domainType: z.enum(["function", "industry", "founder"]),
  level: z.enum(["Campus", "Early", "Mid", "Senior"]),
  levelCode: z.enum(LEVEL_CODES),
  experienceBand: z.string(),
  titles: z.array(z.string()).min(1),
  subAreas: z.array(z.string()).min(1),
  employerTypes: z.string(),
  locations: z.array(z.string()).min(1),
  summary: z.string().min(80),
  responsibilities: z.array(z.string()).min(8).max(12),
  skills: z.object({ technical: z.array(z.string()).min(1), behavioural: z.array(z.string()).min(1) }),
  goodToHave: z.string(),
  tools: z.array(z.string()),
  experience: z.object({ text: z.string(), minYears: z.number().min(0), maxYears: z.number().min(0), freshersEligible: z.boolean() }),
  education: z.string(),
  academicCutOff: z.object({ code: z.enum(CUTOFF_CODES), note: z.string() }),
  certifications: z.object({ required: z.string(), preferred: z.string(), conditional: z.array(z.string()) }),
  atsKeywords: z.array(z.string()).min(15).max(25),
  mustHave: z.array(z.string()).min(1).max(5),
  status: z.object({ code: z.enum(STATUS_CODES), label: z.string(), note: z.string() }),
  flags: z.array(z.string()),
  scoring: z.object({
    roleFamily: z.enum(ROLE_FAMILIES),
    freshersRole: z.boolean(),
    minExperienceMonths: z.number().int().min(0),
    requiredDegrees: z.array(z.string()),
    preferredSpecialisations: z.array(z.string()),
    requiredCertifications: z.array(z.string()),
    mustHaveSkills: z.array(z.string()).max(5),
    softSkills: z.array(z.string()),
  }),
});
export type TargetJD = z.infer<typeof TargetJD>;

// Validate once at module load: a malformed library must fail tests/build, not a user request.
export const JD_LIBRARY: readonly TargetJD[] = Object.freeze(z.array(TargetJD).parse(raw as unknown));
const BY_ID = new Map(JD_LIBRARY.map(j => [j.id, j] as const));

export function getTargetJD(id: string): TargetJD | null {
  return BY_ID.get(id.trim().toUpperCase()) ?? null;
}
export function getTargetJDFor(domainCode: string, level: string): TargetJD | null {
  return getTargetJD(`${domainCode}-${level}`);
}

// ---------- Picker data: two dropdowns (Career Level, Target Domain) ----------
export interface DomainOption { code: string; name: string; type: TargetJD["domainType"]; statusByLevel: Record<LevelCode, string> }
export function listDomains(): DomainOption[] {
  const out: DomainOption[] = [];
  for (const j of JD_LIBRARY) {
    let d = out.find(x => x.code === j.domainCode);
    if (!d) { d = { code: j.domainCode, name: j.domain, type: j.domainType, statusByLevel: {} as Record<LevelCode, string> }; out.push(d); }
    d.statusByLevel[j.levelCode] = j.status.code;
  }
  return out; // library order (B1 Consulting … B28 EdTech)
}
export function getPickerData() {
  return { libraryVersion: LIBRARY_VERSION, levels: LEVELS, domains: listDomains(), disclaimer: SAMPLE_DISCLAIMER };
}

// ---------- Conversion for the deterministic scorer ----------
// Sample JDs skip LLM extraction; their JDFacts are precomputed, so the same resume always gets the same score.
const stripParens = (s: string) => s.replace(/\s*\([^)]*\)/g, "").trim();
export function toJDFacts(j: TargetJD): JDFacts {
  const must = j.scoring.mustHaveSkills;
  const seen = new Set(must.map(normalise));
  const preferred: string[] = [];
  for (const k of [...j.atsKeywords, ...j.skills.technical.map(stripParens)]) {
    const n = normalise(k);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    preferred.push(k);
  }
  return JDFacts.parse({
    title: `${j.domain} — ${j.level} (${j.titles.join(" / ")})`,
    roleFamily: j.scoring.roleFamily,
    freshersRole: j.scoring.freshersRole,
    minExperienceMonths: j.scoring.minExperienceMonths,
    requiredDegrees: j.scoring.requiredDegrees,
    preferredSpecialisations: j.scoring.preferredSpecialisations,
    requiredCertifications: j.scoring.requiredCertifications,
    hardSkills: [...must.map(name => ({ name, mustHave: true })), ...preferred.map(name => ({ name, mustHave: false }))],
    softSkills: j.scoring.softSkills,
  });
}

// Plain-text JD used for the suggestions prompt and for display or download.
export function toJDText(j: TargetJD): string {
  return [
    `${j.domain} — ${j.level} (${j.experienceBand}) · Sample JD ${j.id}`,
    `Typical titles: ${j.titles.join(", ")}`,
    `Sub-areas covered: ${j.subAreas.join(", ")}`,
    `About the role: ${j.summary}`,
    `Key responsibilities:\n${j.responsibilities.map(r => `- ${r}`).join("\n")}`,
    `Technical skills: ${j.skills.technical.join("; ")}`,
    `Behavioural skills: ${j.skills.behavioural.join("; ")}`,
    `Good to have: ${j.goodToHave}`,
    `Tools: ${j.tools.join("; ")}`,
    `Experience: ${j.experience.text}`,
    `Education: ${j.education}`,
    `Academic criteria (${j.academicCutOff.code}): ${j.academicCutOff.note}`,
    `Certifications — required: ${j.certifications.required}`,
    `Certifications — preferred: ${j.certifications.preferred}`,
    j.certifications.conditional.length ? `Certifications — conditional:\n${j.certifications.conditional.map(c => `- ${c}`).join("\n")}` : "",
    `Keywords: ${j.atsKeywords.join(", ")}`,
  ].filter(Boolean).join("\n\n");
}

// Notes the UI shows beside a sample-JD result. Advisory only — never folded into the score.
export function sampleNotes(j: TargetJD) {
  return {
    id: j.id, libraryVersion: LIBRARY_VERSION, domain: j.domain, level: j.level,
    status: j.status, academicCutOff: j.academicCutOff,
    conditionalCertifications: j.certifications.conditional,
    flags: j.flags, disclaimer: SAMPLE_DISCLAIMER,
  };
}
