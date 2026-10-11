import { access } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { createAnonSupabaseClient } from "@/lib/supabase/anon";
import { getPublicSiteUrlFromRequest } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stable URL for the brochure file.
 * Prefers Supabase upload; falls back to public/brochure.pdf.
 */
export async function GET(request: Request) {
  const supabase = createAnonSupabaseClient();
  if (supabase) {
    const { data } = await supabase
      .from("booking_settings")
      .select("brochure_file_url, brochure_file_name")
      .eq("id", true)
      .maybeSingle();

    if (data?.brochure_file_url) {
      const url = data.brochure_file_url as string;
      const fileName =
        (data.brochure_file_name as string | null) ?? "brochure.pdf";
      return NextResponse.redirect(url, {
        headers: {
          "Cache-Control": "no-store",
          "Content-Disposition": `inline; filename="${fileName.replace(/"/g, "")}"`,
        },
      });
    }
  }

  try {
    await access(path.join(process.cwd(), "public", "brochure.pdf"));
    const siteUrl = getPublicSiteUrlFromRequest(request);
    return NextResponse.redirect(`${siteUrl}/brochure.pdf`, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "No brochure uploaded yet." },
      { status: 404 },
    );
  }
}
