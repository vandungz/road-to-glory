import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Rate limit dùng Upstash Redis — cần thiết cho serverless (Vercel) vì mỗi
// request có thể chạy trên 1 instance khác nhau, không thể giữ bộ nhớ trong
// tiến trình Node như 1 server truyền thống.
//
// Development không cần Upstash để chạy local. Production fail closed nếu
// thiếu cấu hình, vì không được tuyên bố mutation boundary đã được bảo vệ khi
// rate limiting đang tắt.
//
// Setup: tạo free database tại https://console.upstash.com → copy
// "REST URL" + "REST TOKEN" → thêm vào Vercel Project Settings → Environment
// Variables: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN.

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// 30 request / 60 giây / user — đủ rộng cho gameplay bình thường (mỗi lần
// quay wheel gọi 1 action), đủ hẹp để chặn bot/script spam.
const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "60 s"),
      analytics: true,
      prefix: "rtg-ratelimit",
    })
  : null;

export type AuthRateLimitOperation =
  | "login"
  | "login-failure"
  | "signup"
  | "password-reset"
  | "resend-confirmation";

const authRateLimitConfig: Record<
  AuthRateLimitOperation,
  { limit: number; window: Duration }
> = {
  // This is a request guard. Successful logins may consume it, but they do
  // not consume the separate login-failure budget or any other auth budget.
  login: { limit: 10, window: "15 m" },
  // Failed credentials are intentionally much tighter than normal login
  // traffic. This bucket is recorded only after Supabase rejects credentials.
  "login-failure": { limit: 5, window: "15 m" },
  signup: { limit: 3, window: "15 m" },
  "password-reset": { limit: 3, window: "15 m" },
  "resend-confirmation": { limit: 3, window: "15 m" },
};

const authRatelimits = redis
  ? Object.fromEntries(
      Object.entries(authRateLimitConfig).map(([operation, config]) => [
        operation,
        new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(config.limit, config.window),
          analytics: true,
          prefix: `rtg-auth-ratelimit:${operation}`,
        }),
      ]),
    ) as Record<AuthRateLimitOperation, Ratelimit>
  : null;

export class AuthRateLimitError extends Error {
  readonly resetAt: number;

  constructor(resetAt: number) {
    super("Too many authentication attempts.");
    this.name = "AuthRateLimitError";
    this.resetAt = resetAt;
  }
}

/**
 * Chặn 1 identifier (thường là user.id) gọi quá nhiều Server Action trong
 * khoảng thời gian ngắn. Throw nếu vượt giới hạn. Local development vẫn
 * no-op khi chưa config Upstash; production thì fail closed.
 */
export async function checkRateLimit(identifier: string): Promise<void> {
  if (!ratelimit) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Request protection is unavailable.");
    }
    return;
  }

  const { success } = await ratelimit.limit(identifier);
  if (!success) {
    throw new Error("Too many requests. Please try again later.");
  }
}

/**
 * Login/signup throttling uses a shorter, separate window because the caller
 * is not authenticated yet and therefore cannot be keyed by user id.
 */
export async function checkAuthRateLimit(
  operation: AuthRateLimitOperation,
  identifier: string,
): Promise<void> {
  if (!authRatelimits) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Request protection is unavailable.");
    }
    return;
  }

  const { success, reset } = await authRatelimits[operation].limit(identifier);
  if (!success) {
    throw new AuthRateLimitError(reset);
  }
}
