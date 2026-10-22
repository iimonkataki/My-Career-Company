# Antigravity Agent Rules

## Target JD Database v3 rules
- Data source of truth: src/data/jd-v3/*.json, generated ONLY by `npm run jd:extract:v3` from the context file. Never hand-edit
  these files in the app repo; edit the context file (or the build pipeline) and re-extract.
- JDs are generated at request time by src/lib/jdgen.ts. It is deterministic: the same company, domain, level and role
  always produce the same JD. Never add randomness, timestamps or LLM calls to it.
- Sample JDs never go through LLM JD extraction; JDFacts come from toJDFactsV3().
- Every JD shown to users carries its disclaimer, class banner (if any), eligibility label and flags. Never hide them.
- Eligibility and certifications are advice only; never knockouts. Must-have skills are the only knockouts.
- Never show compensation, and never imply guaranteed interviews or placement.
- Company names may appear only inside generated JDs with the "Illustrative sample … not an official JD" disclaimer.
