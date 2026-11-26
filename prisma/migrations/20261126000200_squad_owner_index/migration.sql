CREATE INDEX CONCURRENTLY IF NOT EXISTS "game_sessions_userId_createdAt_idx" ON "public"."game_sessions" ("userId", "createdAt");
