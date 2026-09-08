import { randomUUID } from "node:crypto";

export interface CareerCommandLogContext {
  command: string;
  actorId: string;
  careerId?: string;
  seasonId?: string;
  stepKey?: string;
  resolverVersion?: string;
}

function errorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code;
  }
  if (error && typeof error === "object" && "name" in error && error.name === "ZodError") {
    return "VALIDATION_ERROR";
  }
  return "INTERNAL_ERROR";
}

function write(level: "info" | "error", event: string, fields: Record<string, unknown>): void {
  const record = {
    event,
    timestamp: new Date().toISOString(),
    ...fields,
  };
  (level === "error" ? console.error : console.info)(JSON.stringify(record));
}

/**
 * Emits bounded JSON logs for a command without serializing payloads,
 * outcomes, hidden stats or wallet data. The request id lets operators join
 * the action boundary with database/query logs in a real log sink.
 */
export async function withCareerCommandLogging<T>(
  context: CareerCommandLogContext,
  operation: (requestId: string) => Promise<T>,
): Promise<T> {
  const requestId = randomUUID();
  const startedAt = Date.now();
  write("info", "career_command_started", {
    requestId,
    ...context,
  });

  try {
    const result = await operation(requestId);
    write("info", "career_command_finished", {
      requestId,
      ...context,
      durationMs: Date.now() - startedAt,
      replayed: result !== null && typeof result === "object" && "replayed" in result
        ? (result as { replayed?: unknown }).replayed === true
        : undefined,
    });
    return result;
  } catch (error) {
    write("error", "career_command_failed", {
      requestId,
      ...context,
      durationMs: Date.now() - startedAt,
      errorCode: errorCode(error),
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    throw error;
  }
}
