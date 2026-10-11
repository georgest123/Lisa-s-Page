import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Brochure temporarily disabled on the public site. */
export async function GET() {
  return NextResponse.json(
    { error: "Brochure is temporarily unavailable." },
    { status: 404 },
  );
}
