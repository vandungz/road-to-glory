import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Rate limit dùng Upstash Redis — cần thiết cho serverless (Vercel) vì mỗi
// request có thể chạy trên 1 instance khác nhau, không thể giữ bộ nhớ trong
// tiến trình Node như 1 server truyền thống.
//
// CHƯA config env var (UPSTASH_REDIS_REST_URL/TOKEN) → tự động NO-OP, không
// chặn request nào (chỉ log cảnh báo 1 lần) — an toàn để deploy ngay cả khi
// chưa có tài khoản Upstash, không phá app hiện tại.
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

let warnedOnce = false;

/**
 * Chặn 1 identifier (thường là user.id) gọi quá nhiều Server Action trong
 * khoảng thời gian ngắn. Throw nếu vượt giới hạn. No-op nếu chưa config
 * Upstash (xem comment ở trên).
 */
export async function checkRateLimit(identifier: string): Promise<void> {
  if (!ratelimit) {
    if (!warnedOnce) {
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN chưa được set — rate limiting đang TẮT. " +
          "Xem lib/rate-limit.ts để biết cách bật."
      );
      warnedOnce = true;
    }
    return;
  }

  const { success } = await ratelimit.limit(identifier);
  if (!success) {
    throw new Error("Quá nhiều yêu cầu — vui lòng thử lại sau ít phút.");
  }
}
