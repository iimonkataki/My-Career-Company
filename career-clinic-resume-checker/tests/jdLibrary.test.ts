import { describe, it, expect } from "vitest";
import { JD_LIBRARY, LEVEL_CODES, getTargetJD, getTargetJDFor, getPickerData, toJDFacts, toJDText } from "../src/lib/jdLibrary";
import { score } from "../src/lib/scoring";

const BANDS: Record<string, [number, number]> = { CAMPUS: [0, 2], EARLY: [2, 5], MID: [5, 10], SENIOR: [10, 20] };
const EXP_GATED = /\b(CFA charter|certified FRM|PMP|PgMP|SHRM-SCP|CBAP|CCBA|MRICS|FRICS|CFP)\b/;

describe("Level × Domain library integrity", () => {
  it("has 112 JDs: 28 domains × 4 levels, one per combination", () => {
    expect(JD_LIBRARY.length).toBe(112);
    const domains = [...new Set(JD_LIBRARY.map(j => j.domainCode))];
    expect(domains.length).toBe(28);
    for (const d of domains) for (const l of LEVEL_CODES) expect(getTargetJDFor(d, l)?.id).toBe(`${d}-${l}`);
    expect(new Set(JD_LIBRARY.map(j => j.id)).size).toBe(112);
  });
  it("experience bands match the level; freshers only at Campus", () => {
    for (const j of JD_LIBRARY) {
      expect(j.experience.minYears).toBe(BANDS[j.levelCode][0]);
      expect(j.experience.maxYears).toBe(BANDS[j.levelCode][1]);
      expect(j.scoring.freshersRole).toBe(j.levelCode === "CAMPUS");
      expect(j.scoring.minExperienceMonths).toBe(j.experience.minYears * 12);
    }
  });
  it("Campus JDs never require or prefer experience-gated credentials", () => {
    for (const j of JD_LIBRARY.filter(x => x.levelCode === "CAMPUS")) {
      expect(j.certifications.required).not.toMatch(EXP_GATED);
      expect(j.certifications.preferred).not.toMatch(EXP_GATED);
    }
  });
  it("Mid and Senior responsibilities are not copied from Campus", () => {
    for (const j of JD_LIBRARY.filter(x => x.levelCode === "MID" || x.levelCode === "SENIOR")) {
      const campus = getTargetJDFor(j.domainCode, "CAMPUS")!;
      expect(j.responsibilities.slice(1).filter(r => campus.responsibilities.includes(r)).length).toBe(0);
    }
  });
  it("ATS keywords are 15–25 with no duplicates; must-haves 3–5", () => {
    for (const j of JD_LIBRARY) {
      const k = j.atsKeywords.map(x => x.toLowerCase());
      expect(new Set(k).size).toBe(k.length);
      expect(k.length).toBeGreaterThanOrEqual(15);
      expect(k.length).toBeLessThanOrEqual(25);
      expect(j.mustHave.length).toBeGreaterThanOrEqual(3);
      expect(j.mustHave.length).toBeLessThanOrEqual(5);
    }
  });
  it("the degree knockout applies only at Campus", () => {
    for (const j of JD_LIBRARY.filter(x => x.levelCode !== "CAMPUS")) expect(j.scoring.requiredDegrees.length).toBe(0);
  });
});

describe("picker data and conversion", () => {
  it("picker data offers 4 levels and 28 domains", () => {
    const p = getPickerData();
    expect(p.levels.length).toBe(4);
    expect(p.domains.length).toBe(28);
    expect(Object.keys(p.domains[0].statusByLevel).length).toBe(4);
  });
  it("IDs are case-insensitive and unknown IDs return null", () => {
    expect(getTargetJD("con-campus")?.id).toBe("CON-CAMPUS");
    expect(getTargetJD("XXX-CAMPUS")).toBeNull();
    expect(getTargetJDFor("CON", "JUNIOR")).toBeNull();
  });
  it("every JD converts to valid JDFacts with at most 5 must-haves", () => {
    for (const j of JD_LIBRARY) {
      const f = toJDFacts(j);
      expect(f.hardSkills.filter(h => h.mustHave).length).toBeLessThanOrEqual(5);
      expect(f.hardSkills.length).toBeGreaterThan(10);
    }
  });
  it("JD text meets the 200-character minimum used by /api/check", () => {
    for (const j of JD_LIBRARY) expect(toJDText(j).length).toBeGreaterThan(200);
  });
  it("a Level × Domain JD scores deterministically through the existing scorer", () => {
    const jd = toJDFacts(getTargetJD("CON-CAMPUS")!);
    const resume = {
      headline: "MBA candidate",
      roles: [{ title: "Summer Intern – Strategy", org: "Example Co", type: "internship" as const, startYYYYMM: "2026-04", endYYYYMM: "2026-06",
        bullets: [{ id: "r0b0", text: "Built a market sizing model and financial modelling for a 3-city launch, cutting cost by 12%" }] }],
      education: [{ degree: "PGDM", specialisation: "Marketing", institute: "Example B-School", year: "2027" }],
      certifications: [], skillsListed: ["Excel", "PowerPoint", "financial modelling", "data analysis", "market sizing"],
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
