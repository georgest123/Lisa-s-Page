/** Canonical public URL for emails and calendar links (no trailing slash). */
export function getPublicSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel)
    return `https://${vercel.replace(/^https?:\/\//, "")}`.replace(/\/$/, "");
  return "http://localhost:3000";
}
