import { createHmac, timingSafeEqual } from "node:crypto";
import type { CareerSetupResult, StintInfo } from "./career-setup.service";
import type { StatSnapshot } from "@/types/domain";

const TOKEN_VERSION = 1;
const TOKEN_TTL_MS = 10 * 60 * 1000;

export interface CareerSetupTokenData {
  userId: string;
  gameId: string;
  slotIndex: number;
  position: string;
  nationality: string;
  debutAge: number;
  careerLength: number;
  height: number;
  weight: number;
  currentContinentalCup: string;
  setup: Omit<CareerSetupResult, "setupToken">;
  issuedAt: number;
  expiresAt: number;
}

export interface VerifiedCareerSetup extends CareerSetupTokenData {
  hiddenStats: {
    luckRating: number;
    professionalism: number;
    personality: string;
  };
}

function secret(): string {
  const configured = process.env.CAREER_SETUP_TOKEN_SECRET?.trim();
  if (configured) return configured;

  if (process.env.NODE_ENV === "production") {
    throw new Error("CAREER_SETUP_TOKEN_SECRET chưa được cấu hình cho production.");
  }

  // Local development already has DATABASE_URL in the server environment. It
  // is only a compatibility fallback; production must use a separate secret.
  const fallback = process.env.DATABASE_URL?.trim();
  if (!fallback) throw new Error("Thiếu secret để ký career setup token.");
  return fallback;
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decode<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

function signature(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function sameSignature(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function isSetup(value: unknown): value is Omit<CareerSetupResult, "setupToken"> {
  if (!value || typeof value !== "object") return false;
  const setup = value as Record<string, unknown>;
  return typeof setup.playerName === "string" &&
    typeof setup.preferredFoot === "string" &&
    typeof setup.debutOvr === "number" &&
    Array.isArray(setup.initTimeline) &&
    Array.isArray(setup.initStint) === false &&
    !!setup.initStint &&
    typeof setup.initStint === "object" &&
    typeof setup.contractYearsTotal === "number" &&
    typeof setup.contractYearsRemaining === "number" &&
    typeof setup.currentWageAnnual === "number" &&
    typeof setup.marketValue === "number";
}

function isTokenData(value: unknown): value is CareerSetupTokenData {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return data.v === TOKEN_VERSION &&
    typeof data.userId === "string" &&
    typeof data.gameId === "string" &&
    typeof data.slotIndex === "number" &&
    typeof data.position === "string" &&
    typeof data.nationality === "string" &&
    typeof data.debutAge === "number" &&
    typeof data.careerLength === "number" &&
    typeof data.height === "number" &&
    typeof data.weight === "number" &&
    typeof data.currentContinentalCup === "string" &&
    isSetup(data.setup) &&
    typeof data.issuedAt === "number" &&
    typeof data.expiresAt === "number";
}

/**
 * Signs the server-computed setup projection. The token is an integrity
 * boundary, not a source of secrecy: hidden stats are deliberately not put in
 * it and are generated again inside initCareerPlayerAction.
 */
export function createCareerSetupToken(data: Omit<CareerSetupTokenData, "issuedAt" | "expiresAt" | "setup"> & {
  setup: Omit<CareerSetupResult, "setupToken">;
}): string {
  const now = Date.now();
  const payload = encode({
    v: TOKEN_VERSION,
    ...data,
    issuedAt: now,
    expiresAt: now + TOKEN_TTL_MS,
  });
  return `${payload}.${signature(payload)}`;
}

/** Verifies token signature, expiry and owner/slot binding before init. */
export function verifyCareerSetupToken(params: {
  token: string;
  userId: string;
  gameId: string;
  slotIndex: number;
}): Omit<CareerSetupTokenData, "setup"> & {
  setup: Omit<CareerSetupResult, "setupToken">;
} {
  const [payload, providedSignature] = params.token.split(".");
  if (!payload || !providedSignature || !sameSignature(signature(payload), providedSignature)) {
    throw new Error("Career setup token không hợp lệ.");
  }

  let data: unknown;
  try {
    data = decode<CareerSetupTokenData & { v: number }>(payload);
  } catch {
    throw new Error("Career setup token không hợp lệ.");
  }
  if (!isTokenData(data) || data.expiresAt < Date.now()) {
    throw new Error("Career setup token đã hết hạn.");
  }
  if (data.userId !== params.userId || data.gameId !== params.gameId || data.slotIndex !== params.slotIndex) {
    throw new Error("Career setup token không thuộc career hiện tại.");
  }

  return data;
}

export function setupDataForInit(data: CareerSetupTokenData): {
  name: string;
  preferredFoot: string;
  debutOvr: number;
  statsTimeline: StatSnapshot[];
  clubStints: StintInfo[];
  contractYearsTotal: number;
  contractYearsRemaining: number;
  currentWageAnnual: number;
  marketValue: number;
} {
  return {
    name: data.setup.playerName,
    preferredFoot: data.setup.preferredFoot,
    debutOvr: data.setup.debutOvr,
    statsTimeline: data.setup.initTimeline,
    clubStints: [data.setup.initStint],
    contractYearsTotal: data.setup.contractYearsTotal,
    contractYearsRemaining: data.setup.contractYearsRemaining,
    currentWageAnnual: data.setup.currentWageAnnual,
    marketValue: data.setup.marketValue,
  };
}
