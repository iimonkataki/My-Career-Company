"use client";
// Target JD picker (v3): (1) choose a sample by Company (or Other + company type) × Target Domain × Career Level, then a role;
// (2) share a JD link; (3) upload or paste a JD. Renders form fields only; the parent <form> submits them to /resumechecker/api/check.
import { useEffect, useMemo, useState, type CSSProperties } from "react";

type Level = { code: string; label: string; band: string; hint: string };
type Company = { id: string; name: string; sector: string; archetype: string };
type OtherType = { code: string; name: string; segments: string[] };
type Domain = { code: string; name: string };
type RoleOption = { id: string; name: string; title: string; focus: string };
type Preview = {
  jd: { id: string; title: string; companyName: string; domainName: string; levelLabel: string; experienceBand: string; summary: string;
    responsibilities: string[]; mustHave: string[]; experience: string; education: string; locations: string;
    certifications: { required: string; preferred: string; conditional: string[] }; roleOptions: RoleOption[]; role: { id: string; name: string };
    relevance: { class: string; label: string }; banner: string | null };
  notes: { eligibility: { code: string; note: string; label: string; source: string }; campusPresence: string[]; flags: string[]; disclaimer: string };
};

const API = "/resumechecker/api/jds/v3";
const C = { green: "#073D32", gold: "#D4AF7C", ivory: "#F8F6EF", ink: "#2B2B2B", greenTint: "#DCE9E3", goldTint: "#F4E8D4" };
const field: CSSProperties = { display: "block", width: "100%", padding: 8, margin: "4px 0 12px", border: `1px solid ${C.gold}`, borderRadius: 6, font: "inherit" };
const label: CSSProperties = { fontWeight: 600, color: C.green, fontSize: 14 };
const CLASS_HINT: Record<string, string> = { C: "core hiring area", I: "in-house function", A: "closest equivalent role", X: "rarely hired — extrapolated" };

export default function TargetJDPicker() {
  const [tab, setTab] = useState<"sample" | "link" | "upload">("sample");
  const [uploadMode, setUploadMode] = useState<"file" | "paste">("file");
  const [data, setData] = useState<{ companies: Company[]; otherTypes: OtherType[]; domains: Domain[]; levels: Level[] } | null>(null);
  const [query, setQuery] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [otherType, setOtherType] = useState("");
  const [segment, setSegment] = useState("");
  const [domain, setDomain] = useState("");
  const [level, setLevel] = useState("");
  const [role, setRole] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(API).then(r => r.json()).then(d => { setData(d); setError(""); })
      .catch(() => setError("Couldn't load the sample JD list. Use a link or upload instead."));
  }, []);

  const matches = useMemo(() => {
    if (!data || query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    return data.companies.filter(c => c.name.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q)).slice(0, 12);
  }, [data, query]);
  const chosen = data?.companies.find(c => c.id === companyId);
  const otherInfo = data?.otherTypes.find(t => t.code === otherType);
  const ready = !!domain && !!level && (companyId === "other" ? !!otherType : !!companyId);

  // A new company, domain or level resets the role so the best-fit role is featured again.
  useEffect(() => { setRole(""); }, [companyId, otherType, segment, domain, level]);
  useEffect(() => {
    if (!ready) { setPreview(null); return; }
    const q = new URLSearchParams({ company: companyId, domain, level });
    if (companyId === "other") { q.set("type", otherType); if (segment) q.set("segment", segment); }
    if (role) q.set("role", role);
    fetch(`${API}/card?${q}`).then(r => (r.ok ? r.json() : null)).then(setPreview).catch(() => setPreview(null));
  }, [ready, companyId, otherType, segment, domain, level, role]);

  const source = tab === "upload" ? (uploadMode === "file" ? "upload" : "paste") : tab;
  const tabBtn = (t: typeof tab, text: string) => (
    <button type="button" onClick={() => setTab(t)} aria-pressed={tab === t}
      style={{ padding: "8px 14px", marginRight: 8, borderRadius: 6, cursor: "pointer", border: `1px solid ${C.green}`,
        background: tab === t ? C.green : "transparent", color: tab === t ? C.ivory : C.green, fontWeight: 600 }}>{text}</button>
  );
  const levelInfo = data?.levels.find(l => l.code === level);

  return (
    <fieldset style={{ border: `1px solid ${C.gold}`, borderRadius: 8, padding: 16, margin: "16px 0", color: C.ink }}>
      <legend style={{ ...label, fontSize: 16, padding: "0 6px" }}>Target JD</legend>
      <input type="hidden" name="jdSource" value={source} />
      <div style={{ marginBottom: 12 }}>
        {tabBtn("sample", "Choose company, domain & level")}{tabBtn("link", "Share a JD link")}{tabBtn("upload", "Upload or paste a JD")}
      </div>

      {tab === "sample" && (
        <div>
          {error && <p style={{ color: "crimson" }}>{error}</p>}
          <input type="hidden" name="jdCompany" value={companyId} />
          <input type="hidden" name="jdArchetype" value={companyId === "other" ? otherType : ""} />
          <input type="hidden" name="jdSegment" value={companyId === "other" ? segment : ""} />
          <input type="hidden" name="jdDomain" value={domain} />
          <input type="hidden" name="jdLevel" value={level} />
          <input type="hidden" name="jdRole" value={role || preview?.jd.role.id || ""} />

          <label style={label}>Target company
            <input style={field} value={chosen ? chosen.name : companyId === "other" ? "Other (not in the list)" : query}
              onChange={e => { setQuery(e.target.value); setCompanyId(""); }} placeholder="Start typing a company name, or choose Other" aria-autocomplete="list" />
          </label>
          {!companyId && query.trim().length >= 2 && (
            <ul role="listbox" style={{ listStyle: "none", margin: "-8px 0 12px", padding: 0, border: `1px solid ${C.gold}`, borderRadius: 6, maxHeight: 240, overflowY: "auto" }}>
              {matches.map(c => (
                <li key={c.id} role="option" aria-selected={false} onClick={() => { setCompanyId(c.id); setQuery(""); }}
                  style={{ padding: "6px 10px", cursor: "pointer", borderBottom: `1px solid ${C.goldTint}` }}>
                  <b>{c.name}</b> <span style={{ fontSize: 12, color: "#666" }}>{c.sector}</span>
                </li>
              ))}
              <li role="option" aria-selected={false} onClick={() => { setCompanyId("other"); setQuery(""); }} style={{ padding: "6px 10px", cursor: "pointer", fontWeight: 600, color: C.green }}>
                Other — my company is not in the list
              </li>
            </ul>
          )}
          {(chosen || companyId === "other") && (
            <button type="button" onClick={() => { setCompanyId(""); setOtherType(""); setSegment(""); }} style={{ marginTop: -8, marginBottom: 12, fontSize: 12 }}>Change company</button>
          )}
          {companyId === "other" && data && (
            <>
              <label style={label}>What type of company is it?
                <select style={field} required value={otherType} onChange={e => { setOtherType(e.target.value); setSegment(""); }}>
                  <option value="">Choose the closest company type</option>
                  {data.otherTypes.map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
                </select>
              </label>
              {otherInfo && (
                <label style={label}>Business segment (optional)
                  <select style={field} value={segment} onChange={e => setSegment(e.target.value)}>
                    <option value="">Any</option>
                    {otherInfo.segments.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              )}
            </>
          )}
          <label style={label}>Target domain
            <select style={field} required value={domain} onChange={e => setDomain(e.target.value)}>
              <option value="">Choose a target domain</option>
              {data?.domains.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
            </select>
          </label>
          <label style={label}>Career level
            <select style={field} required value={level} onChange={e => setLevel(e.target.value)}>
              <option value="">Choose your career level</option>
              {data?.levels.map(l => <option key={l.code} value={l.code}>{l.label} ({l.band})</option>)}
            </select>
          </label>
          {levelInfo && <p style={{ margin: "-6px 0 12px", fontSize: 13 }}>{levelInfo.hint}. Choose by total full-time experience, not job title.</p>}
          {preview && preview.jd.roleOptions.length > 1 && (
            <div style={{ margin: "0 0 12px" }}>
              <span style={label}>Role</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {preview.jd.roleOptions.map(r => (
                  <button type="button" key={r.id} onClick={() => setRole(r.id)} title={r.focus} aria-pressed={preview.jd.role.id === r.id}
                    style={{ padding: "4px 10px", borderRadius: 14, border: `1px solid ${C.green}`, cursor: "pointer", fontSize: 13,
                      background: preview.jd.role.id === r.id ? C.green : C.ivory, color: preview.jd.role.id === r.id ? C.ivory : C.green }}>{r.name}</button>
                ))}
              </div>
            </div>
          )}
          {preview && <PreviewCard p={preview} />}
        </div>
      )}

      {tab === "link" && (
        <label style={label}>Job link (https://)
          <input style={field} type="url" name="jdUrl" required pattern="https://.*" placeholder="https://careers.example.com/jobs/12345" />
          <span style={{ fontWeight: 400, fontSize: 13, color: C.ink }}>Some job boards need a login or block automated reading. If the link fails, paste or upload the JD instead.</span>
        </label>
      )}

      {tab === "upload" && (
        <div>
          <label style={{ marginRight: 16 }}><input type="radio" checked={uploadMode === "file"} onChange={() => setUploadMode("file")} /> Upload a file</label>
          <label><input type="radio" checked={uploadMode === "paste"} onChange={() => setUploadMode("paste")} /> Paste the text</label>
          {uploadMode === "file"
            ? <input style={field} type="file" name="jdFile" accept=".pdf,.docx" required />
            : <textarea style={field} name="jd" rows={10} minLength={200} required placeholder="Paste the full job description" />}
        </div>
      )}
    </fieldset>
  );
}

function PreviewCard({ p }: { p: Preview }) {
  const { jd, notes } = p;
  return (
    <div style={{ border: `1px solid ${C.green}`, borderRadius: 8, overflow: "hidden", marginTop: 4 }}>
      <div style={{ background: C.green, color: C.ivory, padding: "10px 14px" }}>
        <b style={{ color: C.gold }}>{jd.title}</b>
        <div style={{ fontSize: 13 }}>{jd.companyName} · {jd.domainName} — {jd.levelLabel} ({jd.experienceBand}) · {jd.relevance.label}: {CLASS_HINT[jd.relevance.class]}</div>
      </div>
      <div style={{ padding: "10px 14px", fontSize: 14, lineHeight: 1.5 }}>
        {jd.banner && <p style={{ margin: "0 0 8px", padding: 8, background: C.goldTint, borderRadius: 6 }}>{jd.banner}</p>}
        <p style={{ margin: "0 0 8px" }}>{jd.summary}</p>
        <ul style={{ margin: "0 0 8px 18px", padding: 0 }}>{jd.responsibilities.slice(0, 5).map(r => <li key={r}>{r}</li>)}</ul>
        <p style={{ margin: "0 0 4px" }}><b>Must-have skills:</b> {jd.mustHave.join("; ")}</p>
        <p style={{ margin: "0 0 4px" }}><b>Experience:</b> {jd.experience}</p>
        <p style={{ margin: "0 0 4px" }}><b>Education:</b> {jd.education}</p>
        <p style={{ margin: "0 0 4px" }}><b>Academic criteria ({notes.eligibility.label}):</b> {notes.eligibility.note}</p>
        <p style={{ margin: "0 0 4px" }}><b>Certifications:</b> required — {jd.certifications.required}; preferred — {jd.certifications.preferred}</p>
        {notes.campusPresence.length > 0 && <p style={{ margin: "0 0 4px" }}><b>Recruits from (library):</b> {notes.campusPresence.join(", ")}</p>}
        {jd.certifications.conditional.length > 0 && (
          <div style={{ margin: "0 0 8px", padding: 8, background: C.goldTint, borderRadius: 6 }}>
            <b>Only if your target role involves these activities:</b>
            <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>{jd.certifications.conditional.map(c => <li key={c}>{c}</li>)}</ul>
          </div>
        )}
        {notes.flags.map(f => <p key={f} style={{ margin: "0 0 6px", color: "#6E5328", fontSize: 13 }}>FLAG: {f}</p>)}
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "#666" }}>{notes.disclaimer}</p>
      </div>
    </div>
  );
}
