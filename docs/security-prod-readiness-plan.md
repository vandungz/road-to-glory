# Production Security Readiness Plan

## Mục tiêu

Kiểm tra dựa trên source code và hoàn thiện các kiểm soát bảo mật cần thiết trước khi public production cho Football Life. Kết luận sẽ phân biệt rõ giữa:

- Đã được bảo vệ trong source code.
- Thiếu hoặc có rủi ro cần sửa trong source code.
- Phụ thuộc cấu hình triển khai (Supabase, Vercel, domain, HTTPS, database network) và cần xác minh ngoài code.

## Phạm vi kiểm tra

1. Authentication và session: password hashing, login throttling/rate limit, session expiry, cookie flags, logout.
2. Information disclosure: debug logging, secrets trong client bundle, error responses, stack traces.
3. Input/file upload: MIME/extension allowlist, byte-size limits, server-side validation, storage access.
4. Authorization và IDOR: đổi resource ID, user thường truy cập admin, ownership checks, server action/route guards.
5. Injection và dữ liệu: Prisma/query construction, raw SQL, parameterization, validation/schema boundaries.
6. Browser/network hardening: HTTPS enforcement, security headers, CSP feasibility, cookie attributes, CORS.
7. Infrastructure boundaries: Supabase RLS, database exposure, service-role usage, least-privilege assumptions.

## Phương pháp

- Dùng codebase knowledge graph để định vị routes, server actions, services, middleware, schema và các luồng dữ liệu.
- Tìm kiếm có mục tiêu bằng `rg`, sau đó đọc toàn bộ file liên quan và đối chiếu call-site; không suy đoán từ tên file.
- Kiểm tra dependency/config/docs để phân biệt kiểm soát thực sự với checklist chưa được triển khai.
- Chạy lint, build và các security/domain checks phù hợp sau khi sửa.
- Không in hoặc commit giá trị secret; chỉ ghi nhận tên biến, đường dẫn và hành vi quan sát được.

## Kế hoạch thực hiện

### Phase 1 — Khảo sát kiến trúc

- Chạy `understand` cho repository và lưu knowledge graph dưới `.ua/`.
- Lập inventory các entry point: `app/**/route.ts`, server actions, middleware, auth helpers, upload handlers, Prisma/raw SQL, Supabase clients, headers/CORS config.

### Phase 2 — Audit theo yêu cầu

- Đánh dấu từng yêu cầu bằng bằng chứng source: `PASS`, `PARTIAL`, `FAIL`, hoặc `DEPLOYMENT CHECK`.
- Ưu tiên các đường đi có thể dẫn đến account takeover, privilege escalation, data leak, arbitrary upload hoặc injection.

### Phase 3 — Remediation

- Sửa các thiếu sót trong source code khi phạm vi và hành vi có thể xác định an toàn.
- Bổ sung test/check cho regression ở auth, authorization, validation, headers và error handling.
- Không tự thay đổi secret/provider/domain production; các mục đó sẽ được ghi thành bước triển khai bắt buộc.

### Phase 4 — Verification

- Chạy kiểm tra tĩnh, typecheck/build và các script security hiện có.
- Đọc diff để bảo đảm không làm lộ secret, không bypass RLS/auth, không biến client thành nơi quyết định quyền.
- Cập nhật tài liệu này bằng kết quả, file/line evidence, residual risks và checklist deploy.

## Tiêu chí hoàn thành

- Mỗi mục trong yêu cầu người dùng có kết luận source-backed và đường dẫn file cụ thể.
- Các lỗ hổng có thể sửa trong code đã được sửa và có kiểm chứng tương ứng.
- Các phần phụ thuộc môi trường production có owner/action rõ ràng, không đánh dấu PASS chỉ vì có cấu hình dự kiến.
- Build/lint/test liên quan đạt hoặc nêu chính xác blocker còn lại.

## Kết quả audit source hiện tại

### 1. Authentication và session

| Hạng mục | Trạng thái | Bằng chứng / việc còn lại |
| --- | --- | --- |
| Password hashing | EXTERNAL CHECK | Source không có bảng password, bcrypt/Argon2 tự triển khai hay password verifier riêng. Auth đi qua Supabase Auth (actions/auth.actions.ts). Hashing do Supabase quản lý; cần xác minh setting/password policy của Supabase project, không tự thêm hash song song vào app. |
| Login rate limit | SOURCE PASS / DEPLOYMENT BLOCKER | Login và signup chạy qua Server Action; giới hạn theo IP và email trong actions/auth.actions.ts:32-33, limiter auth 5 request/15 phút trong lib/rate-limit.ts:67. Production fail closed nếu Upstash chưa cấu hình; hiện chưa có evidence hai biến Upstash đã được đặt trên Vercel. |
| Session expiry | PARTIAL | Cookie server có HttpOnly, Secure ở production, SameSite=Lax và max-age 7 ngày trong middleware.ts:5-57 và lib/supabase/server.ts:7-27. Cần đặt finite JWT expiry/refresh-token lifetime trong Supabase; cookie max-age không tự thu hồi refresh token. |
| Generic auth errors | PASS | Provider error không còn trả raw ra UI; auth actions trả thông báo generic. Signup mới yêu cầu password tối thiểu 8 ký tự. |

### 2. Information disclosure

| Hạng mục | Trạng thái | Bằng chứng / việc còn lại |
| --- | --- | --- |
| Debug logs | PASS | Đã xóa log debug và error log phía browser; server command log còn lại chỉ ghi request id, command, actor id, duration và error code, không ghi payload/hidden stats/wallet. |
| Secrets frontend | PASS SOURCE / ROTATE REQUIRED | Chỉ Supabase URL/anon key có prefix NEXT_PUBLIC_; đây là public key được bảo vệ bằng RLS. DATABASE_URL chỉ được đọc server-side. File .env local không tracked nhưng đang chứa database credential thật: phải rotate credential đó trước khi public và chỉ nạp secret trong Vercel/Supabase secret store. |
| Detailed errors | PASS FOR AUTH | Auth/reset flow đã generic hóa. Các message gameplay còn lại là domain feedback có chủ đích; không nên serialize exception/stack trace vào response mới. |

### 3. User input và file upload

| Hạng mục | Trạng thái | Bằng chứng / việc còn lại |
| --- | --- | --- |
| Upload allowlist/size/server validation | N/A IN CURRENT SOURCE | Không tìm thấy file upload, multipart endpoint, Supabase Storage upload hay File input trong runtime app. FormData hiện chỉ dùng cho form tạo game và được Zod validate. Nếu thêm upload sau này phải tạo endpoint riêng với allowlist MIME/extension, byte limit, magic-byte validation và storage policy server-side. |
| General input bounds | PARTIAL | Phần lớn Server Actions dùng Zod và search pagination/query đã được giới hạn trong actions/season-action-contracts.ts, nhưng legacy `saveSeasonProgress` vẫn nhận `SaveProgressParams` là TypeScript interface, không có runtime schema. Không được coi type-only là validation boundary. |

### 4. Authorization, IDOR và injection

| Hạng mục | Trạng thái | Bằng chứng / việc còn lại |
| --- | --- | --- |
| IDOR resource pages/mutations | PASS SOURCE / VERIFY DB | Game/player pages, V2 services và legacy `saveSeasonProgress` đều kiểm tra ownership; legacy update còn có runtime schema, full-ID ownership check và `gameSessionId` predicate trong transaction. Regression check đã pass; staging two-user test vẫn bắt buộc. |
| Admin escalation | N/A / NO ADMIN SURFACE FOUND | Không có route/role/admin action trong source inventory. Khi thêm admin, bắt buộc có server-side role check; không dựa vào hidden UI. |
| DB parameterization | PASS | Prisma query builder được dùng cho data access. Raw SQL duy nhất trong features/career/services/transfer-workflow-state.service.ts:155 là tagged template với bound workflow.id, không phải Unsafe API. |

### 5. Browser/network hardening

| Hạng mục | Trạng thái | Bằng chứng / việc còn lại |
| --- | --- | --- |
| HTTPS | PASS SOURCE / VERIFY EDGE | Production middleware redirect HTTP sang HTTPS và gửi HSTS. Cần xác minh Vercel/proxy set x-forwarded-proto=https đúng và custom domain không có bypass. |
| Security headers | PASS SOURCE | middleware.ts:12-25 thêm CSP baseline, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy và HSTS production; next.config.ts tắt `x-powered-by`. CSP cần smoke-test OAuth/static assets khi deploy. |
| Cookies | PASS FOR SERVER-SET AUTH COOKIES | middleware.ts:53-57 và lib/supabase/server.ts:23-27 ép HttpOnly, production Secure, SameSite=Lax, Path=/, finite max-age. OAuth code-verifier flow cần kiểm thử trên deployed HTTPS domain. |

### 6. Server/database boundary

| Hạng mục | Trạng thái | Bằng chứng / việc còn lại |
| --- | --- | --- |
| CORS | PASS SOURCE | Không có app/api route hoặc broad Access-Control-Allow-Origin; app dùng same-origin Server Actions. Nếu mở API public sau này phải allowlist exact origins, methods và headers. |
| RLS/public PostgREST | APPLIED / VERIFY EDGE | Prisma migration đã bật RLS cho 13 bảng app, revoke table grants khỏi `PUBLIC`/`anon`/`authenticated`, grant DML cho bảng game mutable và chỉ `SELECT` cho catalog (`leagues`, `clubs`, `national_teams`) tới `football_life_runtime`, đồng thời giữ `NO FORCE ROW LEVEL SECURITY` để Supabase owner/admin path còn hoạt động. Cần test REST denial và runtime query trên deployment. |
| DB least privilege | LIVE DATABASE VERIFIED / RUNTIME LOGIN PENDING | Database hiện có `football_life_runtime` an toàn, owner bảng vẫn là `postgres`, grants/RLS đúng và không có migration-owner role. Cần đặt/kiểm tra password role và deploy `DATABASE_URL` dùng đúng username pooler. |
| DB TLS | SOURCE REMEDIATION / DEPLOYMENT VERIFY | `lib/prisma.ts` giữ SSL bắt buộc trong production; `sslmode=require` mặc định dùng mã hóa nhưng chưa xác minh CA (`rejectUnauthorized=false`) để tránh lỗi pooler hiện tại. Muốn xác minh certificate đầy đủ phải cung cấp CA Supabase và kiểm thử trên deployment. |

## Verification đã chạy

- npx tsc --noEmit — passed.
- npm run lint — passed, không warning.
- npm run build — passed.
- npm run check:career-setup-security — passed.
- npm run check:transfer-authority — passed.
- npm run check:checkpoint-contract — passed.
- npm run check:transfer-workflow — passed.
- npm run check:security-boundaries — passed (schema bounds, duplicate IDs,
  foreign ownership rejection, production legacy-write default).
- npm run build — passed after remediation.
- git diff --check — passed; chỉ còn line-ending warnings của generated scan artifacts.
- Understand scan: 1.181 files, 964 code files, 71 semantic batches. Knowledge-graph hiện hữu được xác định là từ commit cũ; scan/batch artifacts đã được cập nhật dưới .ua/intermediate/.

## Production go-live checklist còn bắt buộc

1. Rotate database credential hiện có trong local .env; đặt credential mới trong secret manager/Vercel, không commit .env.
2. Tạo runtime DB role không phải postgres, cấp đúng grants và giữ nguyên Supabase owner/admin path cho migration/Dashboard; xác minh SSL.
3. Apply RLS migration; kiểm thử anon/authenticated PostgREST không đọc được mọi bảng career.
4. Cấu hình UPSTASH_REDIS_REST_URL và UPSTASH_REDIS_REST_TOKEN; xác nhận login fail closed khi thiếu config.
5. Đặt NEXT_PUBLIC_SITE_URL là HTTPS domain production; cấu hình Supabase Auth redirect allowlist chỉ gồm domain cần thiết.
6. Đặt finite Supabase JWT/refresh-token expiry, bật email confirmation/recovery policy phù hợp và test session expiry thực tế.
7. Smoke-test OAuth, password reset, headers, HTTPS redirect, cookie flags và hai-user IDOR trên deployed preview trước khi public.

## Các câu hỏi cần trả lời bằng source/config

- Password do ứng dụng tự quản lý hay hoàn toàn do Supabase Auth quản lý?
- Session do Supabase cookie hay app tự phát hành; TTL và refresh nằm ở đâu?
- Có upload thật trong runtime hay chỉ có model/storage placeholder?
- Các route/action nào nhận ID từ client và kiểm tra ownership ở server?
- Có raw SQL hoặc string interpolation đi vào database không?
- Header/CORS/HTTPS được enforce ở Next middleware, `next.config`, Vercel hay Supabase?
- RLS và database roles hiện tại có ngăn truy cập chéo user không?

## Second-pass audit — kỹ thuật, pattern và hạ tầng (24/09/2026)

Lượt này là một vòng đọc độc lập trên toàn bộ Server Action, page data access,
Prisma writes, cache/config và migration. Kết luận dưới đây chỉ ghi nhận điều
đã thấy trong source; không đánh dấu các cấu hình production dự kiến là đã
hoàn tất.

### Findings tại thời điểm phát hiện

| Mức | Trạng thái | Finding và bằng chứng | Tác động / hành động bắt buộc |
| --- | --- | --- | --- |
| P1 | REMEDIATED SOURCE / DEPLOY TEST | **Cross-user write trong legacy save**: `actions/season-progress.actions.ts:22-62` hiện parse runtime schema, kiểm tra toàn bộ IDs thuộc game và update kèm `id + gameSessionId + checkpointVersion`. | Regression check đã chứng minh foreign ID bị từ chối; vẫn phải chạy two-user test trên staging. |
| P1 | REMEDIATED SOURCE / DEPLOY TEST | **RLS role boundary**: migration revoke public Data API grants, grant runtime DML cho bảng mutable và chỉ `SELECT` cho catalog, bật RLS không FORCE và policy chỉ cho runtime role. Đây không phải per-user RLS; ownership checks trong app vẫn là primary control. | Phải provision role thật, apply migration và kiểm tra PostgREST, Dashboard/Table Editor và runtime query bằng staging credentials. |
| P1 | REMEDIATED SOURCE | **Migration credential separation**: `prisma.config.ts` ưu tiên `DIRECT_URL` và từ chối Prisma database commands nếu DIRECT_URL thiếu; không còn mô hình custom migration role sở hữu app tables. | Dùng Supabase migration/admin credential chỉ trong CI/migration runner; trên Free có thể dùng shared session pooler nếu direct host không reachable; không đưa nó vào request-serving runtime. |
| P2 | REMEDIATED SOURCE / DEPLOYMENT BLOCKER | **Rate limit action coverage**: transfer, simulation, cup, progress/honours read và transfer completion đều gọi limiter; backend là Upstash Redis riêng, không phải Supabase Postgres. | Tạo Redis staging/production trên Upstash hoặc Vercel Integration, đặt `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` theo từng environment, redeploy và load-test. |
| P2 | REMEDIATED SOURCE | **Recovery email/resend throttle**: reset/resend đã qua Server Actions generic response và IP/email auth limiter. | Phải kiểm thử provider quota/redirect allowlist trên HTTPS preview. |
| P2 | REMEDIATED FOR WRITES | **Legacy client authority**: hidden stats chỉ lấy từ DB/server; legacy mutations bị khóa mặc định ở production bằng `LEGACY_CAREER_WRITES=false`; preview simulations không phải persistence authority. | Không bật cờ này ngoài migration window có kiểm soát. |
| P2 | REMEDIATED SOURCE / EDGE VERIFY | **Callback canonical origin**: callback dùng validated `NEXT_PUBLIC_SITE_URL`, path `next` vẫn allowlist. | Cần kiểm thử proxy/host thật và Supabase redirect allowlist. |
| P2 | REMEDIATED SOURCE / CAPACITY VERIFY | **Pool per serverless instance**: pool mặc định 3, cap 10, timeout vẫn bounded. | Chốt tổng connection budget theo Vercel/Supabase load test. |
| P3 | REMEDIATED SOURCE | Metadata game/player đã dùng title tĩnh, không query private name trước auth. | Không còn data lookup private trong `generateMetadata` của các page đã rà soát. |

### Các điểm second-pass đã xác nhận là ổn

- Setup token dùng HMAC-SHA256, `timingSafeEqual`, TTL 10 phút và bind
  `userId/gameId/slotIndex` trong `features/career/services/career-setup-token.service.ts:32-63,118-145`.
- Các page gameplay chính đã kiểm tra `session.userId`/`player.gameSession.userId`
  trước khi render; V2 career services cũng kiểm tra user ownership.
- Raw SQL duy nhất vẫn là tagged Prisma query có bound parameter trong
  `features/career/services/transfer-workflow-state.service.ts`; chưa thấy
  string-concatenated SQL.
- Không có upload runtime, route admin hoặc broad CORS endpoint trong inventory
  hiện tại. Đây là `N/A`/source result, không phải cam kết cho feature tương lai.
- Cache opponents/leagues dùng dữ liệu catalog công khai; chưa thấy cache key
  chứa private user state.

### Thứ tự xử lý trước public

1. Chặn P1 IDOR ở `saveSeasonProgress` và thêm test cross-user.
2. Chốt direct Prisma role/RLS model; wiring `DIRECT_URL` và test migration với
   role thật trong staging.
3. Phủ rate limit cho expensive actions và recovery/resend; bounded payload và
   timeout/load test.
4. Đóng legacy client-trust path hoặc disable legacy writes trước khi mở public.
5. Canonicalize callback origin, kiểm thử host/proxy, OAuth và reset flow trên
   HTTPS preview.
6. Đặt pool/concurrency budget, quan sát connection/query SLO rồi mới promote.

Tại thời điểm second pass, các P1 còn mở nên kết luận là **chưa đạt production
readiness** dù typecheck/lint/build đều pass. Sau remediation, source đã đóng
các đường P1/P2 chính; production vẫn pending việc provision/apply/verify role,
RLS và secret configuration thực tế.

## Remediation status sau khi triển khai

Các finding có thể xử lý trong repository đã được triển khai:

- P1 IDOR: đã sửa `saveSeasonProgress` bằng `saveSeasonProgressSchema`, giới hạn
  payload/array, reject duplicate IDs, đối chiếu toàn bộ player IDs thuộc game,
  và update với `id + gameSessionId + checkpointVersion < 2` trong transaction.
- P1 migration boundary: `prisma.config.ts` đã ưu tiên và bắt buộc
  `DIRECT_URL` cho database commands; thêm `scripts/provision-production-db-roles.sql`
  và `docs/database-role-setup.md` mà không thay đổi table OWNER.
- P2 rate limit: thêm limiter cho transfer/simulation/cup/read actions và
  recovery/resend auth actions.
- P2 legacy client authority: hidden stats không còn lấy từ payload client;
  legacy mutation được tắt mặc định khi `NODE_ENV=production` qua
  `LEGACY_CAREER_WRITES=false`. Các simulator preview chỉ trả dữ liệu và không
  còn là persistence authority.
- P2 callback/metadata: auth callback dùng canonical `NEXT_PUBLIC_SITE_URL`;
  metadata private không còn query tên game/player trước ownership check.
- P2 capacity: pool runtime mặc định 3, bị giới hạn tối đa 10 mỗi instance.
- Debug/internal surface: middleware redirect toàn bộ `/dev` và `/dev/*` về
  lobby khi production, kể cả user đã đăng nhập.
- Regression: thêm `npm run check:security-boundaries`.

### Các bước ngoài repository vẫn bắt buộc

Runbook thao tác chi tiết: [`docs/production-infrastructure-runbook.md`](production-infrastructure-runbook.md).

Source remediation không tự provision/rotate được database production. Trước
public phải thực hiện và lưu bằng chứng deployment:

1. Đặt/rotate password `football_life_runtime` trong secret manager; không đưa
   password vào SQL file hoặc frontend.
2. Set `DATABASE_URL` cho runtime role với username pooler đúng dạng
   `football_life_runtime.<PROJECT_REF>`; chỉ migration runner/CI nhận
   `DIRECT_URL` là connection migration/admin. Migration hardening hiện đã
   được apply và `prisma migrate status` đã up to date.
3. Runtime login/query vẫn cần xác minh; database audit đã xác nhận
   `rolsuper=false`, `rolbypassrls=false`, runtime không sở hữu bảng, owner
   bảng không bị đổi và anon/authenticated không có grants trên 13 bảng app.
4. Set `LEGACY_CAREER_WRITES=false`, `NEXT_PUBLIC_SITE_URL` là HTTPS origin,
   Upstash variables đầy đủ và Supabase redirect allowlist exact.
5. Chạy two-user IDOR smoke test, OAuth/password recovery, HTTPS/header/cookie
   checks và load test connection/rate-limit budget trên staging/preview.

Sau khi các bước trên có bằng chứng pass, có thể đổi kết luận từ
**source-remediated / deployment pending** sang **production ready**.

## Third-pass infrastructure audit — Supabase ownership/RLS/migration model (28/09/2026)

User review đã chỉ ra một giả định sai trong quy trình trước. Đã kiểm tra lại
source, migration history, Prisma config, Supabase client usage và tài liệu
Supabase hiện hành.

### Kết luận đã xác minh

| Finding | Kết luận | Hành động |
| --- | --- | --- |
| Custom migration role nhận OWNER của app tables | Không cần thiết và tạo coupling với managed database tooling. Dashboard/Table Editor dùng admin/postgres path; PostgREST dùng grants/RLS. | Đã bỏ việc tạo role migration và bỏ toàn bộ ALTER TABLE ... OWNER TO. |
| FORCE ROW LEVEL SECURITY + policy chỉ cho runtime | Có thể chặn owner/admin migration path và làm backfill/data migration tương lai thất bại. | Đã đổi thành ENABLE RLS + NO FORCE; policy chỉ TO football_life_runtime. |
| RLS bị mô tả như per-user protection | Sai với kiến trúc hiện tại: Prisma runtime là một database role dùng cho nhiều user. | Ghi rõ Server Action ownership checks mới là user-level control; RLS chỉ chặn public Data API/runtime boundary. |
| DIRECT_URL fallback về DATABASE_URL | Có thể làm migration chạy bằng runtime credential nếu cấu hình sai. | prisma.config.ts giờ từ chối database commands khi DIRECT_URL thiếu. |
| Hardcode database postgres trong provisioning | Không portable và không kiểm chứng database session hiện tại. | Grant CONNECT dùng current_database(). |
| _prisma_migrations chưa nằm trong public Data API lockdown | Có thể lộ migration metadata nếu project có default grants. | Migration revoke grants public/anon/authenticated cho bảng này khi tồn tại. |
| Prisma migration và SQL manual có hai bản logic | Dễ drift hoặc apply hai lần trên production. | Prisma migration là canonical; supabase/rls-lockdown.sql chỉ là manual copy, không chạy cả hai. |
| Default privileges của Supabase project | Đã xử lý cho app owner | Đã audit `pg_default_acl` và apply migration revoke default Data API grants của `postgres` trong `public`; không sửa default ACL của `supabase_admin`. |

### Giới hạn còn phải xác minh ngoài source

- Supabase CLI chưa được cài và MCP Supabase chưa xuất hiện thành tool trong
  phiên hiện tại; trạng thái database đã được kiểm tra bằng connection
  read-only của workspace, không dùng SQL write ad-hoc ngoài migration.
- Không cần suy đoán script cũ: database audit hiện tại đã xác nhận role,
  owner, grants và RLS đúng; không có `football_life_migration` làm owner.
- Chưa xác minh plan/provider-specific connection limits, backup/PITR restore
  và Vercel deployment concurrency.
- Default privileges đã được audit và migration hardening đã áp dụng cho
  `postgres` trong `public`; không thay đổi default privileges của các role
  Supabase-managed như `supabase_admin`.
- Chưa thể kết luận production ready cho tới khi staging chứng minh đồng thời:
  runtime query, Prisma migration, PostgREST denial, Dashboard Table Editor,
  two-user IDOR và rollback.

### Mô hình được chấp thuận cho codebase hiện tại

- App request runtime: football_life_runtime + DATABASE_URL/pooler.
- Prisma migration: Supabase migration/admin connection + DIRECT_URL trong CI
  hoặc controlled migration runner; trên Free có thể là shared session pooler
  nếu direct host không reachable từ runner; không cần có trong app runtime env.
- Supabase Dashboard/Table Editor: giữ nguyên provider admin/owner path.
- Browser Supabase key: chỉ dùng Auth; không cấp Data API table grants cho
  anon/authenticated khi app không dùng PostgREST data access.
- User isolation: bắt buộc kiểm tra userId/gameSessionId ở server; RLS không
  được dùng như thay thế cho kiểm tra này.

### Supabase database verification — 2026-10-16

The connected project was checked with read-only SQL through the configured
database connection. The observed state is:

- `football_life_runtime` exists with `rolsuper=false`, `rolcreatedb=false`,
  `rolcreaterole=false`, `rolreplication=false`, `rolbypassrls=false`, and
  `rolcanlogin=true`.
- All 13 application tables are owned by `postgres`; none is owned by the
  runtime role or the removed migration-role name.
- All 13 application tables have RLS enabled and `relforcerowsecurity=false`.
- The app tables have zero table grants for `PUBLIC`, `anon`, or
  `authenticated`; runtime grants match the lockdown migration.
- The old `pg_default_acl` rows for `postgres` did grant public Data API roles
  on future public objects. Migration
  `20261016000100_harden_public_default_privileges` was applied successfully,
  and a follow-up query confirmed those default grants are gone while existing
  table owners/grants/RLS remain unchanged.
- The runtime role's password and an actual login as that role were not tested
  because the configured local connection is for `postgres`; this remains a
  deployment/runtime verification item.

### Re-evaluation after production SQL review — 2026-10-16

The database-role path is now explicitly classified as optional hardening, not
as a prerequisite for Supabase Auth or for the application to boot. The
baseline deployment can use the existing Supabase database connection while
the runtime-role migration is planned and verified separately. This avoids
turning an operational security improvement into an unexplained production
blocker.

The provisioning SQL now ends with a read-only result showing only the role,
database CONNECT, and `public` schema privileges that the script itself owns.
It still does not claim that table grants or RLS are complete; those are owned
by the versioned migration. The audit output containing `pg_default_acl` is a
future-object default privilege report, not a current-table exposure report.
Current-table decisions must use the audit's table grants, table owner/RLS,
and policy result sets.

## Current verification snapshot — 2026-10-16

- Source/local verification was checked against the current repository; the production runbook was rewritten because the previous version incorrectly assumed that infrastructure steps 1–5 were already complete.
- Local `.env` metadata showed `DATABASE_URL` and `DIRECT_URL` using the `postgres` user and the same pooler host, while `NEXT_PUBLIC_SITE_URL` remained `http://localhost:3000`. These values are not evidence of the intended Production configuration and must not be copied to Vercel unchanged.
- The public Supabase Auth settings endpoint for the configured project reported Email enabled, signup enabled, email confirmation required, and Google disabled. This confirms only public provider settings; Supabase Dashboard private settings and Auth Logs still require a connected provider/dashboard check.
- Public Production checks for `https://rtg-vandungz.vercel.app` passed: `/login` and anonymous `/` returned 200, HTTP `/login` redirected with 308 to HTTPS, and the expected security headers were present.
- `prisma migrate status` reported the schema up to date using the local configured connection. This does not prove the deployed runtime uses `football_life_runtime`, nor does it prove the authenticated Prisma request path works in Production.
- Vercel/Supabase MCP connectors were not connected in the current Codex session and the local Vercel CLI could not reach its API. Vercel Environment Variables, deployment logs, Supabase role audit, RLS grants and Auth Logs therefore remain `DEPLOYMENT CHECK`, not `PASS`.
- `P1011 self-signed certificate in certificate chain` remains an observed Production runtime incident from the previous deployment. The source has a TLS configuration remediation, but it is not verified in Production until an authenticated request succeeds after redeploy.
