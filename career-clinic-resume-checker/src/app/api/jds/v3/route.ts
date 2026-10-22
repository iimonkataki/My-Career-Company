// GET /resumechecker/api/jds/v3 → picker data: companies, "Other" company types (with segments), domains and levels.
// Contains no personal data, so it does not require login.
import { NextResponse } from "next/server";
import { getPickerDataV3 } from "@/lib/jdLibraryV3";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getPickerDataV3(), { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}
