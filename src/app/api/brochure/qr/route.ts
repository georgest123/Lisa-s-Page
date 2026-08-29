import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { getPublicSiteUrlFromRequest } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PNG QR that opens the public brochure page — downloadable for sharing/print. */
export async function GET(request: Request) {
  const siteUrl = getPublicSiteUrlFromRequest(request);
  const brochureUrl = `${siteUrl}/brochure`;
  const wantDownload =
    new URL(request.url).searchParams.get("download") === "1";

  try {
    const png = await QRCode.toBuffer(brochureUrl, {
      type: "png",
      width: 720,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#17130f",
        light: "#fffaf2",
      },
    });

    const headers: Record<string, string> = {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    };
    if (wantDownload) {
      headers["Content-Disposition"] =
        'attachment; filename="lbeau-clinique-brochure-qr.png"';
    }

    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("brochure QR generation failed", error);
    return NextResponse.json(
      { error: "Could not generate QR code." },
      { status: 500 },
    );
  }
}
