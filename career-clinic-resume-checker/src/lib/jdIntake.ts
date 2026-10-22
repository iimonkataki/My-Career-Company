// Resolves the Target JD for /api/check from one of: sample (Career Level × Target Domain), link (URL), upload (PDF/DOCX), paste (text).
import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { MAX_BYTES, sniffType } from "./security";
import { parseResume } from "./parse";
import { getTargetJD, getTargetJDFor, toJDFacts, toJDText, sampleNotes, LIBRARY_VERSION } from "./jdLibrary";
import { SampleChoiceV3, getCardV3, toJDFactsV3, toJDTextV3, sampleNotesV3, LIBRARY_VERSION_V3 } from "./jdLibraryV3";
import type { JDFacts } from "./schemas";

export type JDSource = "sample" | "link" | "upload" | "paste";

export class JDInputError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export interface ResolvedJD {
  source: JDSource;
  text: string;                       // full JD text (untrusted unless source === "sample")
  facts: JDFacts | null;              // precomputed for sample JDs; null → run LLM extraction as before
  sampleId: string | null;
  libraryVersion: string | null;
  urlHost: string | null;             // store the host only, never the page HTML
  notes: ReturnType<typeof sampleNotes> | ReturnType<typeof sampleNotesV3> | null;
}

const MIN_JD_CHARS = 200;
const MAX_JD_CHARS = 20_000;
const LINK_TIMEOUT_MS = 8_000;
const LINK_MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;

export async function resolveJD(form: FormData): Promise<ResolvedJD> {
  const source = String(form.get("jdSource") ?? "paste") as JDSource;
  switch (source) {
    case "sample": {
      // v3 picker: company (or "other" + company type) × domain × level, optional role.
      if (form.get("jdCompany")) {
        const parsed = SampleChoiceV3.safeParse({
          companyId: String(form.get("jdCompany") ?? ""), archetype: (form.get("jdArchetype") as string) || undefined,
          segment: (form.get("jdSegment") as string) || undefined, domain: String(form.get("jdDomain") ?? ""),
          level: String(form.get("jdLevel") ?? ""), roleId: (form.get("jdRole") as string) || undefined });
        if (!parsed.success) throw new JDInputError(parsed.error.issues[0]?.message ?? "Choose a company, domain and level.");
        const card = getCardV3(parsed.data);
        return { source, text: toJDTextV3(card), facts: toJDFactsV3(card), sampleId: card.id, libraryVersion: LIBRARY_VERSION_V3, urlHost: null, notes: sampleNotesV3(card) };
      }
      // v2 picker (kept for compatibility): jdId (e.g. "CON-CAMPUS"); jdDomain + jdLevel are accepted as a fallback.
      const j = getTargetJD(String(form.get("jdId") ?? "")) ??
        getTargetJDFor(String(form.get("jdDomain") ?? ""), String(form.get("jdLevel") ?? ""));
      if (!j) throw new JDInputError("Choose a career level and a target domain.");
      return { source, text: toJDText(j), facts: toJDFacts(j), sampleId: j.id, libraryVersion: LIBRARY_VERSION, urlHost: null, notes: sampleNotes(j) };
    }
    case "link": {
      const { text, host } = await fetchJobPage(String(form.get("jdUrl") ?? "").trim());
      return external(source, text, host);
    }
    case "upload": {
      const f = form.get("jdFile");
      if (!(f instanceof File) || f.size === 0) throw new JDInputError("Attach the JD as a PDF or DOCX file.");
      if (f.size > MAX_BYTES) throw new JDInputError("The JD file must be 2 MB or smaller.");
      const buf = Buffer.from(await f.arrayBuffer());
      const type = sniffType(buf);
      if (!type) throw new JDInputError("Upload the JD as PDF or DOCX (no macro-enabled files).");
      return external(source, (await parseResume(buf, type)).text, null);
    }
    case "paste":
      return external(source, String(form.get("jd") ?? ""), null);
    default:
      throw new JDInputError("Unknown JD source.");
  }
}

function external(source: JDSource, raw: string, urlHost: string | null): ResolvedJD {
  const text = raw.replace(/\r/g, "").trim().slice(0, MAX_JD_CHARS);
  if (text.length < MIN_JD_CHARS) {
    throw new JDInputError(source === "link"
      ? "We couldn't read enough of that page. Some job boards need a login or block automated access. Paste the JD text or upload it instead."
      : "The JD looks too short. Include the full job description (at least 200 characters).");
  }
  return { source, text, facts: null, sampleId: null, libraryVersion: null, urlHost, notes: null };
}

// ---------- Link intake with SSRF protection ----------
async function fetchJobPage(input: string): Promise<{ text: string; host: string }> {
  let url: URL;
  try { url = new URL(input); } catch { throw new JDInputError("Enter the full job link, starting with https://"); }
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHttps(url);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(LINK_TIMEOUT_MS),
      headers: {
        "user-agent": "MyCareerCompany-ResumeChecker/1.0 (+https://www.mycareercompany.com)",
        accept: "text/html,application/xhtml+xml,text/plain;q=0.9,application/pdf;q=0.8",
      },
    }).catch(() => { throw new JDInputError("That link didn't respond in time. Paste or upload the JD instead."); });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) break;
      url = new URL(loc, url);
      continue;
    }
    if (!res.ok) throw new JDInputError(`That page returned an error (${res.status}). Paste or upload the JD instead.`);
    const buf = await readCapped(res, LINK_MAX_BYTES);
    const ctype = (res.headers.get("content-type") ?? "").toLowerCase();
    const sniffed = sniffType(buf);
    if (sniffed) return { text: (await parseResume(buf, sniffed)).text, host: url.hostname };
    if (!/text\/html|application\/xhtml|text\/plain/.test(ctype)) throw new JDInputError("That link isn't a web page or PDF we can read.");
    const body = buf.toString("utf8");
    return { text: ctype.includes("text/plain") ? body : htmlToJobText(body), host: url.hostname };
  }
  throw new JDInputError("That link redirects too many times. Paste or upload the JD instead.");
}

async function assertPublicHttps(url: URL): Promise<void> {
  if (url.protocol !== "https:") throw new JDInputError("Only https:// links are supported.");
  if (url.username || url.password) throw new JDInputError("Links with embedded credentials aren't supported.");
  if (url.port && url.port !== "443") throw new JDInputError("Links with custom ports aren't supported.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  let addrs: { address: string }[];
  if (isIP(host)) addrs = [{ address: host }];
  else {
    try { addrs = await lookup(host, { all: true, verbatim: true }); }
    catch { throw new JDInputError("We couldn't find that website. Check the link."); }
  }
  if (!addrs.length || addrs.some(a => isPrivateIP(a.address))) throw new JDInputError("That link points to a private network address.");
}

export function isPrivateIP(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v.includes(":")) {
    if (v.startsWith("::ffff:")) return isPrivateIP(v.slice(7));
    return v === "::" || v === "::1" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v);
  }
  const [a, b] = v.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19));
}

async function readCapped(res: Response, max: number): Promise<Buffer> {
  if (Number(res.headers.get("content-length") ?? 0) > max) throw new JDInputError("That page is too large to read.");
  if (!res.body) return Buffer.alloc(0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) { await reader.cancel(); throw new JDInputError("That page is too large to read."); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

// Prefer schema.org JobPosting JSON-LD (used by many careers sites); fall back to visible text.
export function htmlToJobText(html: string): string {
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data: unknown = JSON.parse(m[1].trim());
      const items = (Array.isArray(data) ? data : [data]).flatMap((d: any) => (d && d["@graph"]) ? d["@graph"] : [d]);
      const jp: any = items.find((d: any) => ([] as unknown[]).concat(d?.["@type"] ?? []).includes("JobPosting"));
      if (jp?.description) {
        const exp = jp.experienceRequirements;
        return [
          jp.title ? String(jp.title) : "",
          jp.hiringOrganization?.name ? `Company: ${jp.hiringOrganization.name}` : "",
          stripTags(decodeEntities(String(jp.description))),
          jp.qualifications ? `Qualifications: ${stripTags(decodeEntities(String(jp.qualifications)))}` : "",
          exp ? `Experience: ${typeof exp === "string" ? exp : JSON.stringify(exp)}` : "",
        ].filter(Boolean).join("\n\n");
      }
    } catch { /* ignore malformed JSON-LD */ }
  }
  const main = html.match(/<(main|article)\b[\s\S]*?<\/\1>/i)?.[0] ?? html.match(/<body\b[\s\S]*<\/body>/i)?.[0] ?? html;
  return stripTags(main);
}

function stripTags(s: string): string {
  return decodeEntities(
    s.replace(/<(script|style|noscript|svg|nav|footer|header|form)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr|section)>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/[ \t\f\v]+/g, " ").replace(/\n[ \t]*/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function decodeEntities(s: string): string {
  return s.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&amp;/g, "&");
}
