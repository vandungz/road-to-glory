import { supabasePoolerCA } from "./security/supabase-ca";

type DatabaseEnvironment = { NODE_ENV?: string; PGSSL_CA?: string; PG_SSL_REJECT_UNAUTHORIZED?: string };

const connectionParameters = new Set(["pgbouncer", "connection_limit", "pool_timeout", "schema", "application_name"]);

/** Keep pg's URL parser from overriding the explicit TLS policy or reading certificate files. */
export function databaseConnectionConfig(connectionString: string, environment: DatabaseEnvironment = process.env) {
  let url: URL;
  try { url = new URL(connectionString); }
  catch { throw new Error("Invalid database connection configuration."); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.hostname.startsWith("%")) {
    throw new Error("Database connection requires a PostgreSQL network hostname.");
  }
  const modes = url.searchParams.getAll("sslmode");
  if (modes.length > 1) throw new Error("Database SSL mode must be specified once.");
  for (const key of url.searchParams.keys()) {
    if (key !== "sslmode" && !connectionParameters.has(key)) {
      throw new Error("Unsupported database connection parameter; configure TLS with PGSSL_CA.");
    }
  }
  const mode = modes[0]?.toLowerCase() ?? "verify-full";
  url.searchParams.delete("sslmode");
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (mode === "disable") {
    if (!["development", "test"].includes(environment.NODE_ENV ?? "") || !loopback) {
      throw new Error("Unencrypted database connections are restricted to local development and tests.");
    }
    return { connectionString: url.toString(), ssl: false as const, sslnegotiation: "postgres" };
  }
  if (!["require", "verify-ca", "verify-full"].includes(mode)) {
    throw new Error("Database connection requires verified TLS.");
  }
  if (environment.PG_SSL_REJECT_UNAUTHORIZED?.trim().toLowerCase() === "false") {
    throw new Error("Database certificate verification cannot be disabled.");
  }
  const ca = environment.PGSSL_CA?.trim()
    || (url.hostname.endsWith(".pooler.supabase.com") ? supabasePoolerCA : undefined);
  return {
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true as const, ...(ca ? { ca } : {}) },
    sslnegotiation: "postgres",
  };
}
