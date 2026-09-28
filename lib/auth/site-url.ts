/**
 * Returns the only origin that auth callbacks and recovery links may use.
 * Production must configure this explicitly; accepting an arbitrary Host header
 * in production would turn proxy misconfiguration into an open redirect.
 */
export function getCanonicalSiteUrl(requestHeaders?: Headers): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    const url = new URL(configured);
    if (url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
      throw new Error("NEXT_PUBLIC_SITE_URL must be an origin without a path.");
    }
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
      throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS in production.");
    }
    return url.origin;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL is required in production.");
  }

  const host = requestHeaders?.get("host")?.trim();
  if (!host) throw new Error("A local development host is required.");
  const protocol = requestHeaders?.get("x-forwarded-proto") === "https" ? "https" : "http";
  return `${protocol}://${host}`;
}
