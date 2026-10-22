// GET /resumechecker/api/jds/CON-CAMPUS → the consolidated JD for the preview card (scoring internals omitted).
import { NextRequest, NextResponse } from "next/server";
import { getTargetJD, sampleNotes, toJDText } from "@/lib/jdLibrary";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const j = getTargetJD(id);
  if (!j) return NextResponse.json({ error: "target JD not found" }, { status: 404 });
  const { scoring, ...display } = j;
  return NextResponse.json({ jd: display, text: toJDText(j), notes: sampleNotes(j) },
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
