// GET /resumechecker/api/jds/v3/card?company=hindustan-unilever&domain=MKT&level=CAMPUS[&role=MKT:brand-management]
// GET /resumechecker/api/jds/v3/card?company=other&type=AR11&segment=SME%20banking&domain=SAL&level=MID
// Returns one generated JD card for preview (scoring internals omitted). Deterministic, so it is cacheable.
import { NextResponse } from "next/server";
import { SampleChoiceV3, getCardV3, toPreviewV3, sampleNotesV3 } from "@/lib/jdLibraryV3";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const parsed = SampleChoiceV3.safeParse({
    companyId: q.get("company") ?? "", archetype: q.get("type") ?? undefined, segment: q.get("segment") ?? undefined,
    domain: q.get("domain") ?? "", level: q.get("level") ?? "", roleId: q.get("role") ?? undefined });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid choice" }, { status: 400 });
  const card = getCardV3(parsed.data);
  return NextResponse.json({ jd: toPreviewV3(card), notes: sampleNotesV3(card) }, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
