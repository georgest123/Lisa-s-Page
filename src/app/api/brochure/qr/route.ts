import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Brochure QR temporarily disabled on the public site. */
export async function GET() {
  return NextResponse.json(
    { error: "Brochure QR is temporarily unavailable." },
    { status: 404 },
  );
}
