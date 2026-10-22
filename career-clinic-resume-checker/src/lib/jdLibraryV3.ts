// Target JD Database v3 — Company × Domain × Level × Role, generated on demand by ./jdgen.
// Sample JDs skip LLM extraction: JDFacts are derived deterministically, so the same choice always scores the same way.
import { z } from "zod";
import { generate, listCompanies, listArchetypes, DOMAINS, LEVELS, GENERATOR_VERSION, COMPANIES, ARCHETYPES, ROLES, type JDCard } from "./jdgen";
import { JDFacts } from "./schemas";
import { normalise } from "./skills";
import { JD_LIBRARY } from "./jdLibrary";

export const LIBRARY_VERSION_V3 = "jdlib-2026.10-v3";
export { GENERATOR_VERSION };
const COMPANY_IDS = new Set(COMPANIES.map(c => c.id));
const ARCH_CODES = new Set(ARCHETYPES.map(a => a.code));
const ROLE_IDS = new Set(ROLES.map(r => r.id));

// Input from the picker (query string or form). companyId "other" requires an archetype; segment and role are optional.
export const SampleChoiceV3 = z.object({
  companyId: z.string().min(1).max(120).transform(s => s.trim().toLowerCase()),
  archetype: z.string().max(8).optional().transform(s => (s ? s.trim().toUpperCase() : undefined)),
  segment: z.string().max(60).optional(),
  domain: z.string().transform(s => s.trim().toUpperCase()),
  level: z.string().transform(s => s.trim().toUpperCase()),
  roleId: z.string().max(80).optional(),
}).superRefine((v, ctx) => {
  if (v.companyId === "other") { if (!v.archetype || !ARCH_CODES.has(v.archetype)) ctx.addIssue({ code: "custom", message: "For 'Other', choose a company type." }); }
  else if (!COMPANY_IDS.has(v.companyId)) ctx.addIssue({ code: "custom", message: "Unknown company. Choose one from the list or 'Other'." });
  if (!DOMAINS.includes(v.domain)) ctx.addIssue({ code: "custom", message: "Choose a target domain." });
  if (!(LEVELS as readonly string[]).includes(v.level as any)) ctx.addIssue({ code: "custom", message: "Choose a career level." });
  if (v.roleId && !ROLE_IDS.has(v.roleId)) ctx.addIssue({ code: "custom", message: "Unknown role." });
});
export type SampleChoiceV3 = z.infer<typeof SampleChoiceV3>;

export function getCardV3(choice: SampleChoiceV3): JDCard {
  const roleOk = choice.roleId && ROLES.find(r => r.id === choice.roleId)?.domain === choice.domain ? choice.roleId : undefined;
  return choice.companyId === "other"
    ? generate({ archetype: choice.archetype, segment: choice.segment, domain: choice.domain, level: choice.level as any, roleId: roleOk })
    : generate({ companyId: choice.companyId, domain: choice.domain, level: choice.level as any, roleId: roleOk });
}

// Picker data: companies (searchable), "Other" company types with segments, domains and levels.
export function getPickerDataV3() {
  const domainNames = new Map(JD_LIBRARY.map(j => [j.domainCode, j.domain]));
  return {
    libraryVersion: LIBRARY_VERSION_V3, generatorVersion: GENERATOR_VERSION,
    companies: listCompanies(), otherTypes: listArchetypes(),
    domains: DOMAINS.map(code => ({ code, name: domainNames.get(code) ?? code })),
    levels: [
      { code: "CAMPUS", label: "Campus", band: "0–2 years", hint: "Final-year MBA/PGDM/MMS student or recent graduate" },
      { code: "EARLY", label: "Early", band: "2–5 years", hint: "Early lateral; one-year MBA with under 5 years" },
      { code: "MID", label: "Mid", band: "5–10 years", hint: "Manager or senior manager" },
      { code: "SENIOR", label: "Senior", band: "10+ years", hint: "Head, director, P&L or function leader" },
    ],
  };
}

const stripParens = (s: string) => s.replace(/\s*\([^)]*\)/g, "").trim();
export function toJDFactsV3(c: JDCard): JDFacts {
  const must = c.mustHave.slice(0, 5);
  const seen = new Set(must.map(normalise));
  const preferred: string[] = [];
  for (const k of [...c.atsKeywords.slice(0, 25), ...c.skills.technical.map(stripParens)]) {
    const n = normalise(k);
    if (!n || seen.has(n) || k === c.companyName || k === c.sector) continue;   // company tokens are context, not skills
    seen.add(n); preferred.push(k);
  }
  return JDFacts.parse({
    title: c.title,
    roleFamily: c.scoring.roleFamily,
    freshersRole: c.scoring.freshersRole,
    minExperienceMonths: c.scoring.minExperienceMonths,
    requiredDegrees: c.scoring.requiredDegrees,
    preferredSpecialisations: c.scoring.preferredSpecialisations,
    requiredCertifications: [],                  // certifications are advisory notes, never knockouts
    hardSkills: [...must.map(name => ({ name, mustHave: true })), ...preferred.map(name => ({ name, mustHave: false }))],
    softSkills: c.scoring.softSkills,
  });
}

export function toJDTextV3(c: JDCard): string {
  return [
    `${c.title} · ${c.companyName} · ${c.domainName} — ${c.levelLabel} (${c.experienceBand})`,
    c.banner ? `Note: ${c.banner}` : "",
    `About the role: ${c.summary}`,
    `Key responsibilities:\n${c.responsibilities.map(r => `- ${r}`).join("\n")}`,
    `Technical skills: ${c.skills.technical.join("; ")}`,
    `Behavioural skills: ${c.skills.behavioural.join("; ")}`,
    `Good to have: ${c.goodToHave}`,
    `Tools: ${c.tools.join("; ")}`,
    `Experience: ${c.experience}`,
    `Education: ${c.education}`,
    `Academic criteria (${c.eligibility.code}, ${c.eligibility.label}): ${c.eligibility.note}`,
    `Certifications — required: ${c.certifications.required}`,
    `Certifications — preferred: ${c.certifications.preferred}`,
    c.certifications.conditional.length ? `Certifications — conditional:\n${c.certifications.conditional.map(x => `- ${x}`).join("\n")}` : "",
    `Keywords: ${c.atsKeywords.join(", ")}`,
    c.disclaimer,
  ].filter(Boolean).join("\n\n");
}

// Shown beside a result. Advisory only — never folded into the score.
export function sampleNotesV3(c: JDCard) {
  return { id: c.id, libraryVersion: LIBRARY_VERSION_V3, generatorVersion: GENERATOR_VERSION, company: c.companyName, domain: c.domainName, level: c.levelLabel,
    role: c.role, relevance: c.relevance, banner: c.banner, eligibility: c.eligibility, campusPresence: c.campusPresence,
    conditionalCertifications: c.certifications.conditional, flags: c.flags, disclaimer: c.disclaimer, baseStatus: c.baseStatus };
}

// Preview payload for the UI (scoring internals omitted).
export function toPreviewV3(c: JDCard) {
  const { scoring, fingerprint, ...rest } = c;
  return rest;
}
