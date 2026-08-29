import { NextResponse } from "next/server";
import { createAnonSupabaseClient } from "@/lib/supabase/anon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stable URL for the uploaded brochure file.
 * QR codes should encode /brochure (landing) or this route for a direct open/download.
 */
export async function GET() {
  const supabase = createAnonSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("booking_settings")
    .select("brochure_file_url, brochure_file_name")
    .eq("id", true)
    .maybeSingle();

  if (error || !data?.brochure_file_url) {
    return NextResponse.json(
      { error: "No brochure uploaded yet." },
      { status: 404 },
    );
  }

  const url = data.brochure_file_url as string;
  const fileName = (data.brochure_file_name as string | null) ?? "brochure.pdf";

  return NextResponse.redirect(url, {
    headers: {
      "Cache-Control": "no-store",
      // Hint for browsers when following redirect from download links
      "Content-Disposition": `inline; filename="${fileName.replace(/"/g, "")}"`,
    },
  });
}
