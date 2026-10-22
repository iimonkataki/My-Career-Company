import { z } from "zod";

export const JDFacts = z.object({
  title: z.string(),
  roleFamily: z.string(),
  freshersRole: z.boolean(),
  minExperienceMonths: z.number(),
  requiredDegrees: z.array(z.string()),
  preferredSpecialisations: z.array(z.string()),
  requiredCertifications: z.array(z.string()),
  hardSkills: z.array(z.object({ name: z.string(), mustHave: z.boolean() })),
  softSkills: z.array(z.string()),
});
export type JDFacts = z.infer<typeof JDFacts>;

export const ResumeFacts = z.object({
  headline: z.string().optional(),
  roles: z.array(z.object({
    title: z.string(),
    org: z.string(),
    type: z.enum(["internship", "full-time", "part-time", "contract"]).optional(),
    startYYYYMM: z.string().optional(),
    endYYYYMM: z.string().optional(),
    bullets: z.array(z.object({ id: z.string(), text: z.string() })),
  })),
  education: z.array(z.object({
    degree: z.string(),
    specialisation: z.string(),
    institute: z.string(),
    year: z.string().optional(),
  })),
  certifications: z.array(z.string()),
  skillsListed: z.array(z.string()),
  sectionsFound: z.array(z.string()),
});
export type ResumeFacts = z.infer<typeof ResumeFacts>;

export const Suggestions = z.any();
