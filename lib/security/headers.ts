export const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

export function contentSecurityPolicy(nonce: string, production: boolean): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    // Client navigation retains the entry document's CSP, including on login/settings.
    "form-action 'self' https://*.supabase.co https://accounts.google.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "media-src 'self'",
    // Motion and game layouts use style attributes; script execution is independently restricted.
    "style-src 'self' 'unsafe-inline'",
    production ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'` : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  ].join("; ");
}
