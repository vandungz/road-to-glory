# Security Checklist

> Cập nhật 2026-07-19. Đây là bức tranh đầy đủ về bảo mật/hạ tầng — đọc trước khi
> quyết định "ready to production" hay chưa.

---

## ✅ Đã fix trong đợt này

### 1. Auth trên Server Actions

Mọi Server Action trong `actions/*.ts` giờ đều bắt buộc đăng nhập:

- Action **ghi dữ liệu gắn `gameId`/`playerId`** (`saveSeasonProgress`,
  `updateSeasonProgressAction`, `completeGameSession`, `initCareerPlayerAction`,
  `getCareerPlayerAction`, `saveCareerPlayer`) → `verifyGameOwnership()` — check
  đăng nhập **và** đối chiếu `userId` sở hữu game session/player.
- Action **tính toán thuần** không gắn `gameId` cụ thể (`simulatePlayerSeasonAction`,
  `generateLeagueTableAction`, `startPlayerCareerAction`, `generateTransferOfferAction`,
  `generateCupJourneyAction`, `evolvePlayerStatsAction`) → `requireAuth()` — chỉ check
  đăng nhập, không check ownership (vì không có gì để đối chiếu).

### 2. Zod validation cho `player.actions.ts`

`initCareerPlayerAction` và `saveCareerPlayer` trước đây nhận `params` theo TypeScript
interface (chỉ chặn compile-time, không chặn request thủ công gửi sai shape lúc
runtime). Giờ đổi sang `input: unknown` + Zod schema, validate đầy đủ type + biên giá
trị hợp lý (tuổi, OVR, chiều cao/cân nặng, position enum...).

**Giới hạn đã biết**: Zod chỉ chặn giá trị sai kiểu/vượt biên tuyệt đối (injection,
payload dị dạng) — không chặn được client "nói dối trong biên hợp lệ" (VD: gửi
`hiddenStats.luckRating = 20` giả dù server đã roll ra giá trị khác lúc setup). Đây là
giới hạn kiến trúc có sẵn từ trước (debut OVR/hiddenStats vốn round-trip qua client
rồi mới ghi DB) — muốn fix triệt để cần redesign để server tự recompute/ký lại các
giá trị này lúc save, không nằm trong phạm vi đợt này.

### 3. Rate limiting (scaffold sẵn, cần bạn config)

`lib/rate-limit.ts` — dùng Upstash Redis (bắt buộc cho serverless/Vercel vì không
giữ được state trong bộ nhớ tiến trình giữa các request). Đã wire vào
`verifyGameOwnership()` và `requireAuth()` ở cả 2 file action — áp dụng tự động cho
mọi Server Action đã có auth check, không cần sửa gì thêm.

**Hiện đang NO-OP** (không chặn gì) vì chưa có `UPSTASH_REDIS_REST_URL`/
`UPSTASH_REDIS_REST_TOKEN`. Để bật:

1. Tạo free database tại https://console.upstash.com
2. Copy "REST URL" + "REST TOKEN"
3. Vercel Project Settings → Environment Variables → thêm 2 biến trên
4. Redeploy — rate limit tự động có hiệu lực (30 request/60 giây/user), không cần
   sửa code.

---

## ⚠️ Chưa fix — cần bạn tự làm (ngoài phạm vi code repo)

### 4. RLS (Row Level Security) — file `supabase/rls-lockdown.sql` đã chuẩn bị sẵn

5 bảng (`career_players`, `game_sessions`, `leagues`, `clubs`, `national_teams`) đang
tắt RLS → `anon key` (công khai trong bundle client) có thể gọi thẳng PostgREST REST
API của Supabase để đọc/ghi toàn bộ dữ liệu, bỏ qua hoàn toàn app. Nghiêm trọng nhất
là `career_players` — RLS tắt làm lộ cả cột `hiddenStats` vốn được code cẩn thận giấu
khỏi client (invariant #2).

**Cách fix**: chạy `supabase/rls-lockdown.sql` qua Supabase Dashboard → SQL Editor.
An toàn tuyệt đối — app dùng Prisma kết nối trực tiếp (bypass RLS hoàn toàn), nên bật
RLS deny-all không ảnh hưởng gì tới app đang chạy.

### 5. Leaked Password Protection

Supabase Dashboard → Authentication → Policies → bật "Leaked Password Protection"
(kiểm tra mật khẩu mới với danh sách rò rỉ từ HaveIBeenPwned). Chỉ là 1 toggle, không
liên quan code.

---

## 📋 Còn lại — chưa làm, chưa nằm trong đợt này

- **Load testing / stress test** — chưa từng chạy.
- **Error monitoring** (Sentry hoặc tương đương) — chưa tích hợp, lỗi runtime hiện chỉ
  log ra console (mất khi serverless function kết thúc).
- **CORS / CSP headers** — chưa audit.
- **Secrets rotation policy** — chưa có quy trình xoay `DATABASE_URL`/service keys định kỳ.
- Xem thêm bảng "Các vi phạm hiện tại" trong `.claude/CLAUDE.md` — mục
  `lib/simulation-engine/match-simulator.ts` (dead code) vẫn còn tồn đọng, không phải
  lỗ hổng bảo mật nhưng nên dọn.

**Tóm lại**: sau đợt này, app đã đóng được các lỗ hổng nghiêm trọng nhất về truy cập
dữ liệu (auth + RLS script sẵn sàng) và có nền tảng chống lạm dụng (rate limit scaffold
sẵn, chỉ cần config). Nhưng "production-ready" theo nghĩa đầy đủ (monitoring, load
test, chính sách vận hành) thì vẫn còn thiếu khá nhiều, chưa nằm trong phạm vi 1 đợt
audit bảo mật đơn lẻ.
