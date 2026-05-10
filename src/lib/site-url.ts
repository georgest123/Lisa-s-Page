/** Canonical public URL for emails and calendar links (no trailing slash). */
export function getPublicSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel)
    return `https://${vercel.replace(/^https?:\/\//, "")}`.replace(/\/$/, "");
  return "http://localhost:3000";
}

/**
 * Prefer NEXT_PUBLIC_SITE_URL, then the incoming request Host (so Stripe success/cancel
 * URLs match the domain the visitor used — avoids falling back to *.vercel.app when
 * env is missing; those URLs often hit Vercel Deployment Protection login).
 */
export function getPublicSiteUrlFromRequest(request: Request): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const forwardedHost = request.headers.get("x-forwarded-host");
  const hostHeader = request.headers.get("host");
  const host = (forwardedHost ?? hostHeader)?.split(",")[0]?.trim() ?? "";
  const localhost =
    host === "localhost" ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("localhost:");

  if (host && !localhost) {
    const protoHeader = request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim();
    const proto =
      protoHeader === "http" || protoHeader === "https" ? protoHeader : "https";
    return `${proto}://${host}`.replace(/\/$/, "");
  }

  return getPublicSiteUrl();
}
