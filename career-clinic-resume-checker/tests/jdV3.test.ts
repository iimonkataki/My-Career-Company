import { describe, it, expect } from "vitest";
import { COMPANIES, ARCHETYPES, ROLES, DOMAINS, LEVELS, generate } from "../src/lib/jdgen";
import { SampleChoiceV3, getCardV3, getPickerDataV3, toJDFactsV3, toJDTextV3, sampleNotesV3 } from "../src/lib/jdLibraryV3";
import { score } from "../src/lib/scoring";

const EXP_GATED = /\b(CFA charter|certified FRM|PMP|PgMP|SHRM-SCP|CBAP|CCBA|MRICS|FRICS|CFP)\b(?! \(candidate)/;
const pick = (n: number) => COMPANIES[(n * 97) % COMPANIES.length];

describe("v3 database coverage", () => {
  it("has 835 companies, 45 company types, 236 roles and every domain has roles", () => {
    expect(COMPANIES.length).toBe(835);
    expect(ARCHETYPES.length).toBe(45);
    expect(ROLES.length).toBe(236);
    for (const d of DOMAINS) expect(ROLES.filter(r => r.domain === d).length).toBeGreaterThanOrEqual(6);
  });
  it("every company × domain × level generates a card for 40 sampled companies (4,480 cards)", () => {
    let n = 0;
    for (let i = 0; i < 40; i++) for (const d of DOMAINS) for (const l of LEVELS) { const c = generate({ companyId: pick(i).id, domain: d, level: l }); expect(c.responsibilities.length).toBeGreaterThanOrEqual(8); n++; }
    expect(n).toBe(4480);
  });
  it("generation is deterministic", () => {
    const a = generate({ companyId: "hindustan-unilever", domain: "MKT", level: "CAMPUS" });
    const b = generate({ companyId: "hindustan-unilever", domain: "MKT", level: "CAMPUS" });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("personalisation", () => {
  it("JDs differ by company for the same domain and level, and name the company", () => {
    const ids = ["hindustan-unilever", "itc", "nestle-india", "dabur", "marico"];
    const cards = ids.map(id => generate({ companyId: id, domain: "MKT", level: "CAMPUS" }));
    expect(new Set(cards.map(c => c.fingerprint)).size).toBe(ids.length);
    for (const c of cards) { expect(c.summary).toContain(c.companyName); expect(c.responsibilities.filter(r => r.includes(c.companyName)).length).toBeGreaterThanOrEqual(2); }
  });
  it("uses company programmes and verified eligibility where they exist", () => {
    expect(generate({ companyId: "hindustan-unilever", domain: "MKT", level: "CAMPUS" }).title).toContain("UFLP");
    expect(generate({ companyId: "itc", domain: "SAL", level: "CAMPUS" }).title).toContain("AUT");
    const coal = generate({ companyId: "coal-india", domain: "HR", level: "CAMPUS" });
    expect(coal.eligibility.note).toContain("60%");
    expect(coal.eligibility.source).toBe("Company-specific");
    expect(generate({ companyId: "tcs", domain: "ITS", level: "CAMPUS" }).eligibility.note).toContain("backlog");
  });
  it("classes reframe atypical and adjacent domains with banners", () => {
    const adj = generate({ companyId: "tata-administrative-services", domain: "IB", level: "EARLY" });
    expect(adj.relevance.class).toBe("A"); expect(adj.title).toContain("Corporate Development");
    const inh = generate({ companyId: "hindustan-unilever", domain: "LEG", level: "SENIOR" });
    expect(inh.relevance.class).toBe("I"); expect(inh.banner ?? "").toContain("In-house");
    const x = generate({ companyId: "1lattice", domain: "TEL", level: "CAMPUS" });
    expect(x.relevance.class).toBe("X"); expect(x.banner ?? "").toContain("Atypical");
  });
  it("switching role changes the title and responsibilities", () => {
    const base = generate({ companyId: "goldman-sachs", domain: "IB", level: "CAMPUS" });
    const alt = generate({ companyId: "goldman-sachs", domain: "IB", level: "CAMPUS", roleId: base.roleOptions[1].id });
    expect(alt.title).not.toBe(base.title);
    expect(alt.responsibilities.join("|")).not.toBe(base.responsibilities.join("|"));
  });
  it("'Other' works for every company type and never names a real company", () => {
    for (const a of ARCHETYPES) {
      const c = generate({ archetype: a.code, segment: a.subSegments[0], domain: "FIN", level: "EARLY" });
      expect(c.disclaimer).toMatch(/not an official JD of any company/);
      expect(c.companyName).toBe(`Other – ${a.name}`);
    }
  });
});

describe("rules and conversion", () => {
  it("no experience-gated credential is required at Campus; no pay figures appear", () => {
    for (let i = 0; i < 60; i++) for (const d of DOMAINS) {
      const c = generate({ companyId: pick(i).id, domain: d, level: "CAMPUS" });
      expect(c.certifications.required).not.toMatch(EXP_GATED);
      expect(JSON.stringify(c)).not.toMatch(/\d\s?LPA|₹\s?\d[\d.,]*\s?(L\b|lakh)/i);
    }
  });
  it("degree knockout applies only to CORE Campus JDs", () => {
    for (let i = 0; i < 30; i++) for (const d of DOMAINS) for (const l of LEVELS) {
      const c = generate({ companyId: pick(i).id, domain: d, level: l });
      if (c.relevance.class !== "C" || l !== "CAMPUS") expect(c.scoring.requiredDegrees.length).toBe(0);
    }
  });
  it("validates picker input and rejects unknown companies, missing type for Other, and bad levels", () => {
    expect(SampleChoiceV3.safeParse({ companyId: "Hindustan-Unilever", domain: "mkt", level: "campus" }).success).toBe(true);
    expect(SampleChoiceV3.safeParse({ companyId: "no-such-co", domain: "MKT", level: "CAMPUS" }).success).toBe(false);
    expect(SampleChoiceV3.safeParse({ companyId: "other", domain: "MKT", level: "CAMPUS" }).success).toBe(false);
    expect(SampleChoiceV3.safeParse({ companyId: "other", archetype: "ar11", domain: "SAL", level: "MID" }).success).toBe(true);
    expect(SampleChoiceV3.safeParse({ companyId: "itc", domain: "MKT", level: "JUNIOR" }).success).toBe(false);
  });
  it("picker data lists companies, company types, 28 domains and 4 levels", () => {
    const p = getPickerDataV3();
    expect(p.companies.length).toBe(835); expect(p.otherTypes.length).toBe(45); expect(p.domains.length).toBe(28); expect(p.levels.length).toBe(4);
  });
  it("cards convert to valid JDFacts and text; company names are not treated as skills", () => {
    const choice = SampleChoiceV3.parse({ companyId: "swiggy", domain: "PM", level: "EARLY" });
    const card = getCardV3(choice);
    const f = toJDFactsV3(card);
    expect(f.hardSkills.filter(h => h.mustHave).length).toBeLessThanOrEqual(5);
    expect(f.hardSkills.some(h => h.name === "Swiggy")).toBe(false);
    expect(toJDTextV3(card).length).toBeGreaterThan(200);
    expect(sampleNotesV3(card).disclaimer).toMatch(/Illustrative sample/);
  });
  it("a company JD scores deterministically through the existing scorer", () => {
    const jd = toJDFactsV3(getCardV3(SampleChoiceV3.parse({ companyId: "hindustan-unilever", domain: "MKT", level: "CAMPUS" })));
    const resume = {
      headline: "MBA candidate (Marketing)",
      roles: [{ title: "Summer Intern – Brand Management", org: "Example FMCG", type: "internship" as const, startYYYYMM: "2026-04", endYYYYMM: "2026-06",
        bullets: [{ id: "r0b0", text: "Built a launch plan using consumer insights and market share data, lifting trial by 9% in two pilot cities" }] }],
      education: [{ degree: "PGDM", specialisation: "Marketing", institute: "Example B-School", year: "2027" }],
      certifications: [], skillsListed: ["marketing strategy", "consumer insights", "digital marketing", "Nielsen", "brand management"],
      sectionsFound: ["Education", "Experience", "Skills", "Projects", "Achievements", "Positions of Responsibility"],
    };
    const parsed = { text: "word ".repeat(450), pages: 1, layout: { multiColumn: false, scanned: false, tablesLikely: false, contactOnlyInHeaderFooter: false } };
    const emb = { jdSkills: jd.hardSkills.map(() => [1, 0, 0]), resumeSkills: resume.skillsListed.map(() => [0, 1, 0]), jdTitle: [1, 0, 0], resumeTitles: [[0, 1, 0]] };
    const a = score(resume, jd, parsed, emb, resume.skillsListed);
    const b = score(resume, jd, parsed, emb, resume.skillsListed);
    expect(a.overall).toBe(b.overall);
    expect(a.overall).toBeGreaterThanOrEqual(0);
    expect(a.overall).toBeLessThanOrEqual(100);
  });
});
