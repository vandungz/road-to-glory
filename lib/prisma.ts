import "dotenv/config";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient; pool: pg.Pool };

function poolNumber(name: string, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

// These defaults are deliberately conservative for Supabase's pooler. They
// can be tuned from deployment env after measuring p95/query and connection
// usage; the application must not silently create an unbounded pool per
// serverless instance.
const pool = globalForPrisma.pool ?? new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: poolNumber("PG_POOL_MAX", 5, 1, 50),
  connectionTimeoutMillis: poolNumber("PG_CONNECTION_TIMEOUT_MS", 10_000, 1_000, 60_000),
  idleTimeoutMillis: poolNumber("PG_IDLE_TIMEOUT_MS", 30_000, 1_000, 300_000),
  statement_timeout: poolNumber("PG_STATEMENT_TIMEOUT_MS", 15_000, 1_000, 120_000),
  query_timeout: poolNumber("PG_QUERY_TIMEOUT_MS", 20_000, 1_000, 120_000),
  idle_in_transaction_session_timeout: poolNumber(
    "PG_IDLE_IN_TRANSACTION_TIMEOUT_MS",
    30_000,
    1_000,
    300_000,
  ),
});
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pool = pool;
}

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
