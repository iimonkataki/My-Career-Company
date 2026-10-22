// Extracts the six v3 data layers from the Antigravity context file, verifies counts and checksums,
// and writes src/data/jd-v3/*.json. Usage: node scripts/extract-jd-database-v3.mjs [path/to/context.md]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const src = process.argv[2] ?? "docs/MyCareerCompany_JD_Database_v3_Antigravity_Context.md";
const outDir = "src/data/jd-v3";
const md = fs.readFileSync(src, "utf8");
const LAYERS = ["companies", "archetypes", "roles", "base", "hooks", "meta"];

fs.mkdirSync(outDir, { recursive: true });
for (const name of LAYERS) {
  const tag = `JDV3_${name.toUpperCase()}`;
  const block = md.match(new RegExp(`<!-- ${tag}_START -->\\s*\`\`\`json\\s*([\\s\\S]*?)\`\`\`\\s*<!-- ${tag}_END -->`));
  if (!block) throw new Error(`${name}: JSON block not found between the ${tag}_START/END markers.`);
  const data = JSON.parse(block[1]);
  const expectedSha = md.match(new RegExp(`${tag}_SHA256:\\s*([a-f0-9]{64})`))?.[1];
  const expectedCount = Number(md.match(new RegExp(`${tag}_COUNT:\\s*(\\d+)`))?.[1]);
  const count = Array.isArray(data) ? data.length : Object.keys(data).length;
  if (count !== expectedCount) throw new Error(`${name}: expected ${expectedCount} entries, found ${count}.`);
  const sha = crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
  if (sha !== expectedSha) throw new Error(`${name}: checksum mismatch (${sha} vs ${expectedSha}). The block was edited or truncated.`);
  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(data) + "\n");
  console.log(`Wrote ${outDir}/${name}.json: ${count} entries, sha256 ${sha.slice(0, 12)}…`);
}
