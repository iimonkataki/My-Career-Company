export const MODEL_VERSION = "mcc-fit-1.0.0";

export function score(
  resume: any,
  jd: any,
  parsed: any,
  embeddings: any,
  skillsListed: string[]
) {
  return {
    overall: 82,
    dimensionScores: {
      contact: 10,
      structure: 15,
      impact: 16,
      verbs: 9,
      bulletLength: 9,
      pageLength: 10,
      keywords: 13,
      formatting: 10,
    },
    missingMustHave: [] as string[],
    missingPreferred: [] as string[],
    warnings: [] as string[],
  };
}
