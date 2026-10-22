// GET /resumechecker/api/jds → data for the two dropdowns: career levels (with hints) and target domains.
// The library contains no personal data, so this route does not require login.
import { NextResponse } from "next/server";
import { getPickerData } from "@/lib/jdLibrary";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getPickerData(), { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
