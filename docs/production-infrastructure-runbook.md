# Production setup — hướng dẫn từng bước

Tài liệu này dành cho người đang tự setup Football Life trên:

- Vercel: chạy Next.js;
- Supabase: Auth và PostgreSQL;
- Upstash: Redis dùng riêng cho rate limit.

Không chạy tất cả lệnh một lúc. Làm theo thứ tự, chỉ chuyển bước khi ô kiểm tra
của bước hiện tại đạt.

> Không gửi password, token, DATABASE_URL, DIRECT_URL, Supabase secret key
> hoặc PGSSL_CA vào chat, Git, screenshot hay issue.

## 0. Trạng thái đã kiểm tra ngày 16/10/2026

| Hạng mục | Trạng thái thực tế | Ý nghĩa |
| --- | --- | --- |
| TypeScript, lint, build | PASS ở local | Source compile được; chưa chứng minh Production env đúng. |
| Supabase Auth Email | PASS | Public Auth settings trả email=true, signup không bị disable. |
| Supabase Auth Google | OFF | Không ảnh hưởng email/password; nút Google trong UI vẫn đang hiển thị. |
| Production /login | PASS | Trả HTTP 200. |
| Production / khi chưa đăng nhập | PASS | Trả HTTP 200; đây chưa phải test authenticated database. |
| HTTP → HTTPS | PASS | HTTP trả 308 về HTTPS. |
| Security headers | PASS | HSTS, CSP, nosniff, X-Frame-Options, Referrer-Policy và Permissions-Policy đang có. |
| Prisma migration status | PASS theo local .env | Báo schema up to date; chưa chứng minh runtime đang dùng least-privilege role. |
| Supabase database role/RLS audit | PASS | `football_life_runtime` tồn tại an toàn; owner vẫn là `postgres`; RLS bật, không FORCE; `anon`/`authenticated` không có grants trên bảng app. |
| Future public default privileges | PASS | Migration `20261016000100_harden_public_default_privileges` đã revoke default grants cho `anon`/`authenticated` trên object public mới của owner `postgres`. |
| Vercel env/deployment logs | CHƯA XÁC NHẬN | Vercel MCP chưa kết nối; Vercel CLI hiện không gọi được API. |
| Supabase Dashboard private settings/logs | CHƯA XÁC NHẬN | Cần bạn mở đúng project hoặc kết nối MCP. |
| Database runtime sau login | CHƯA ĐẠT | Đã từng gặp Prisma P1011 TLS; cần deploy code TLS mới và test authenticated route. |

### Phát hiện quan trọng trong local .env

Local .env hiện đang có:

- DATABASE_URL dùng user postgres, không phải football_life_runtime;
- DIRECT_URL cũng dùng shared pooler host. Trên Supabase Free, điều này có thể
  là lựa chọn IPv4 hợp lệ cho migration/admin runner; không tự coi nó là lỗi.
- NEXT_PUBLIC_SITE_URL=http://localhost:3000.

Đây chỉ là kết quả kiểm tra tên/metadata, không phải giá trị cần giữ cho
Production. Nếu đây là credential Production, phải đổi password sau khi hoàn
tất kiểm tra và không dùng user postgres cho request runtime.

## 1. Trước hết: đâu là phần bắt buộc, đâu là hardening tùy chọn

Có hai mục tiêu khác nhau. Đừng chạy phần hardening chỉ vì thấy nó xuất hiện
trong tài liệu.

### Đường A — tối thiểu để app chạy Production

Đây là phần cần có để website chạy đúng:

- Vercel có `DATABASE_URL` hợp lệ cho server, Supabase URL/anon key, site URL HTTPS;
- Supabase Auth Email và redirect URL đúng;
- Upstash Redis nếu muốn bật rate limit auth của source hiện tại;
- deploy mới sau khi đổi biến môi trường;
- kiểm tra login, trang sau login và logout.

Đường A không yêu cầu chạy `scripts/provision-production-db-roles.sql`.
Supabase đã có role kết nối mặc định; script này không sửa Auth và không chữa
lỗi provider email.

### Đường B — hardening database cho Prisma

Đây là lựa chọn bảo mật đã được áp dụng một phần trên database hiện tại:

- tạo role `football_life_runtime` ít quyền hơn;
- chạy migration RLS/grants của project;
- dùng role đó cho request runtime;
- giữ `DIRECT_URL` chỉ cho migration/admin runner.

Kết quả audit trực tiếp của database hiện tại đã xác nhận role và RLS/grants
đã đạt. Điều còn phải deploy là migration `20261016000100`, để object public
mới do `postgres` tạo không tự nhận quyền Data API của `anon` và
`authenticated`.

Đường B phức tạp hơn, cần kiểm tra đúng project và quyền DB. Provision role
không tự cấp quyền cho các bảng app, không đặt password, không đổi OWNER và
không thay thế kiểm tra ownership ở Server Action.

Nếu mục tiêu hiện tại chỉ là làm login và gameplay chạy, hãy hoàn tất Đường A
trước. Chỉ chuyển sang Đường B khi bạn chủ động chấp nhận quy trình hardening.

## 2. Hiểu đúng ba kết nối

~~~text
Browser
  │
  ├── Supabase Auth HTTPS: đăng nhập, session, email confirmation
  │
  └── Vercel Next.js server
        ├── DATABASE_URL → PostgreSQL runtime role
        └── UPSTASH_REDIS_REST_URL/TOKEN → rate limit

Prisma migration runner riêng
  └── DIRECT_URL → Supabase migration/admin connection
~~~

Không đặt password database ở frontend. Không đặt Upstash token trong Supabase
SQL Editor. Không dùng DIRECT_URL cho request runtime.

## 3. Việc cần làm trước: kết nối đúng Vercel và Supabase

Hiện tại phiên Codex chưa có kết nối MCP Vercel/Supabase. Vì vậy tôi không thể
đọc Environment Variables, deployment logs hoặc Auth Logs private của bạn.

Bạn có thể kiểm tra bằng Dashboard ngay bây giờ. Nếu muốn tôi đọc trực tiếp ở
lượt sau, hãy kết nối hai plugin Vercel và Supabase trong Codex rồi yêu cầu tôi
kiểm tra lại. Không gửi secret vào chat.

### 3.1 Vercel

1. Mở Vercel Dashboard.
2. Chọn project đang tạo domain rtg-vandungz.vercel.app.
3. Vào Settings → Environment Variables.
4. Chọn environment Production.
5. Kiểm tra tên biến, không cần copy giá trị cho tôi.

Production tối thiểu phải có:

~~~text
DATABASE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
LEGACY_CAREER_WRITES=false
~~~

Các biến `PG_*`, `PGSSL_CA` và `PG_SSL_REJECT_UNAUTHORIZED` là tuning/TLS tùy
chọn, không cần thêm chỉ vì chúng có trong `.env.example`. Tôi không liệt kê
`NEXT_PUBLIC_ENABLE_DEV_TOOLS` ở đây vì source hiện tại không đọc biến đó.

DIRECT_URL chỉ cần cho migration runner. Nếu bạn chưa có migration runner,
không cần thêm nó vào Vercel để website chạy; có thể chạy migration từ máy cá
nhân bằng .env ignored hoặc từ CI có secret bảo vệ.

Giá trị Production bắt buộc:

~~~text
NEXT_PUBLIC_SITE_URL=https://rtg-vandungz.vercel.app
LEGACY_CAREER_WRITES=false
~~~

Sau khi đổi bất kỳ biến nào, vào Deployments → Redeploy và chọn build mới.
Deployment cũ không tự nhận biến mới.

### 3.2 Supabase

Trong Supabase Dashboard, kiểm tra đúng project có URL dạng:

~~~text
https://cknowgqfwbppxgexwfgh.supabase.co
~~~

Vào Authentication → URL Configuration:

~~~text
Site URL:
https://rtg-vandungz.vercel.app

Redirect URLs:
https://rtg-vandungz.vercel.app/auth/callback
https://rtg-vandungz.vercel.app/auth/callback?next=/auth/reset-password
~~~

Vào Authentication → Sign In / Providers:

- Email: Enabled;
- Confirm email: chọn theo chính sách của bạn; source hiện xử lý flow confirmation;
- Google: có thể để OFF nếu chưa dùng Google.

Vào Authentication → Sessions và đặt thời hạn hữu hạn. Nếu Dashboard không
có mục inactivity timeout/timebox ở plan hiện tại, ghi nhận là chưa kiểm tra;
đừng coi cookie 7 ngày của app là session revocation hoàn chỉnh.

## 4. (Tùy chọn) Hardening database bằng runtime role

Chỉ làm phần này sau khi Đường A đã pass. Nếu chưa chọn hardening, bỏ qua toàn
bộ mục 4 và đi thẳng đến mục 7 để kiểm tra deploy.

Không chạy `ALTER OWNER`, không tạo `football_life_migration`, không đổi owner
của bảng.

### 4.1 Audit trước — không thay đổi dữ liệu

1. Supabase Dashboard → SQL Editor.
2. Mở file scripts/audit-production-db-roles.sql.
3. Copy toàn bộ file vào SQL Editor.
4. Bấm Run.

Kết quả cần đọc:

- có football_life_runtime;
- rolsuper=false;
- rolcreatedb=false;
- rolcreaterole=false;
- rolreplication=false;
- rolbypassrls=false;
- rolcanlogin=true;
- không có football_life_runtime hoặc football_life_migration làm owner bảng;
- owner bảng vẫn là owner Supabase hiện tại.

Nếu audit đã đạt, bỏ qua 4.2.

### 4.2 Provision role nếu role chưa có

Chạy file scripts/provision-production-db-roles.sql trong SQL Editor của đúng
project.

Script hiện tại chỉ tạo role runtime và cấp quyền database/schema cơ bản. Cuối
script có một `SELECT` xác nhận role vừa tồn tại. Nó không:

- đổi owner bảng;
- tạo migration owner;
- chạy ALTER ROLE để sửa một role cũ unsafe;
- đụng vào quyền Dashboard/Table Editor.

Nếu chỉ thấy các dòng `DO` hoặc `GRANT` mà không thấy bảng kết quả, bạn đang
dùng bản script cũ. Bản hiện tại phải trả về một dòng có các cột
`rolsuper`, `rolbypassrls`, `rolcanlogin`, `can_connect` và
`public_schema_usage`. Đây mới là kết quả của provisioning; nó chưa phải kết
quả của migration RLS.

Nếu query audit cuối file trả về các dòng `pg_default_acl` với owner
`postgres`/`supabase_admin`, đó là quyền mặc định áp dụng cho object tạo sau
này. Nó không chứng minh bảng hiện tại có quyền tương ứng. Muốn kiểm tra bảng
hiện tại phải đọc phần `role_table_grants` và `table_owner_rls` trong audit.

Nếu thấy lỗi 42501 permission denied to alter role, bạn đang chạy bản script cũ
hoặc role đã tồn tại với thuộc tính không an toàn. Dừng lại, chạy audit và không
tự sửa bằng DROP ROLE, REASSIGN OWNED hoặc ALTER OWNER.

### 4.3 Đặt password cho runtime role

Password phải được tạo bằng password manager và lưu trong secret manager.

Nếu máy đã có psql, kết nối bằng migration/admin connection lấy từ nút
Supabase → Connect, sau đó chạy trong phiên psql:

~~~text
\password football_life_runtime
~~~

Nhập password hai lần. Không đưa password vào command line hoặc SQL file.

Nếu máy chưa có psql, không tự đoán lệnh password trong SQL Editor. Hãy dùng
provider-supported method của Supabase hoặc cài PostgreSQL client, rồi quay lại
bước này.

## 5. Áp dụng migration Prisma và RLS (Đường B)

Migration phải chạy bằng connection migration/admin, không chạy bằng
`DATABASE_URL` runtime. Trên Supabase Free, connection direct có thể chỉ hỗ
trợ IPv6; nếu máy bạn không đi được IPv6, dùng session-mode shared pooler
`5432` lấy nguyên chuỗi từ Connect. Không tự đoán host, port hoặc username.

Trong local .env ignored, đặt tạm:

~~~text
DATABASE_URL=<runtime connection string của football_life_runtime>
DIRECT_URL=<connection migration/admin lấy từ Supabase Connect>
~~~

Lấy cả hai chuỗi từ Supabase → Connect; không tự đổi host/port. Runtime role
và migration/admin connection có thể khác user/host/port.

Chạy từ thư mục project:

~~~powershell
npx prisma migrate status
npx prisma migrate deploy
~~~

Kết quả đúng:

~~~text
Database schema is up to date!
~~~

Nếu migrate deploy lỗi permission, kiểm tra DIRECT_URL; không cấp quyền
migration cho runtime role để chữa lỗi.

Sau đó chạy lại audit SQL ở bước 4.1. Các bảng ứng dụng phải có RLS bật và
`relforcerowsecurity=false`; owner không được đổi. Phần default ACL cho
`postgres` trong schema `public` không còn grant bảng/sequence/function cho
`anon` và `authenticated`.

Để kiểm tra Data API không mở nhầm, dùng anon key trong môi trường local và
gọi thử một bảng app:

~~~powershell
$headers = @{
  apikey = $env:NEXT_PUBLIC_SUPABASE_ANON_KEY
  Authorization = "Bearer $env:NEXT_PUBLIC_SUPABASE_ANON_KEY"
}
Invoke-WebRequest `
  -Uri "$env:NEXT_PUBLIC_SUPABASE_URL/rest/v1/game_sessions?select=id&limit=1" `
  -Headers $headers
~~~

Kết quả đúng trong mô hình hiện tại là HTTP `401` với lỗi Postgres `42501`.
Không đổi thành `200` bằng cách cấp thêm quyền cho `anon`; app đọc dữ liệu qua
Prisma server-side, không qua Data API.

## 6. Kiểm tra runtime database trước khi test login

Trong local `.env`, nếu bạn đã chọn Đường B thì `DATABASE_URL` phải dùng
`football_life_runtime.<PROJECT_REF>` khi đi qua shared pooler. Chạy website local:

~~~powershell
npm run dev
~~~

Mở:

~~~text
http://localhost:3000/login
~~~

Sau khi login, trang lobby phải tải được danh sách game. Nếu gặp:

~~~text
P1011 self-signed certificate in certificate chain
~~~

hãy kiểm tra lại DATABASE_URL có sslmode=require. Source hiện đã xử lý
Supabase pooler bằng TLS; không tắt SSL.

Nếu muốn xác thực CA đầy đủ, lấy CA certificate trong Supabase Database →
SSL Configuration, đặt PGSSL_CA và dùng sslmode=verify-full. Không đặt
PG_SSL_REJECT_UNAUTHORIZED=true khi chưa có CA.

## 7. Kiểm tra Upstash rate limit

Upstash là dịch vụ riêng, không nằm trong Supabase.

1. Vào Upstash Console.
2. Tạo hoặc chọn Redis database Production.
3. Copy REST URL và REST TOKEN.
4. Vào Vercel → Settings → Environment Variables → Production.
5. Đặt đúng hai tên:

~~~text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
~~~

6. Redeploy Production.

Source hiện giới hạn auth ở 5 request/15 phút theo IP và email. Sau khi bị giới
hạn, UI phải nói rõ thời gian chờ; đừng thử liên tục vì sẽ tự gia hạn counter.

## 8. Deploy và kiểm tra Production

Sau khi đã sửa Vercel env và deploy:

~~~powershell
curl.exe -I https://rtg-vandungz.vercel.app/login
curl.exe -I http://rtg-vandungz.vercel.app/login
curl.exe -I https://rtg-vandungz.vercel.app/
~~~

Kết quả mong đợi:

- HTTPS /login: 200;
- HTTP /login: 308 và Location bắt đầu bằng https://;
- response có strict-transport-security;
- response có content-security-policy;
- response có x-content-type-options: nosniff;
- response có x-frame-options: DENY;
- response có referrer-policy;
- response có permissions-policy.

Các kiểm tra public này hiện đã pass trên rtg-vandungz.vercel.app ngày
16/10/2026. Chúng không kiểm tra được Vercel Environment Variables private và
không chứng minh authenticated Prisma query đã pass.

## 9. Test auth theo đúng thứ tự

Dùng tài khoản test, không dùng tài khoản chính ở lần đầu:

1. Đăng ký bằng email mới.
2. Xác nhận email.
3. Đăng nhập.
4. Mở / và tạo game.
5. Refresh trang.
6. Logout rồi mở lại URL game; phải quay về /login.
7. Test reset password.
8. Test password sai; chỉ được thấy lỗi chung.
9. Thử login sai 6 lần trên Preview/staging, không spam Production.

Nếu login thành công nhưng / trả 500, vào Vercel Logs → Functions. Phân biệt:

- /auth/v1/token 200, /auth/v1/user 200: Supabase Auth đã thành công;
- lỗi Prisma P1011: database TLS/runtime URL;
- lỗi permission: runtime role/grants/RLS;
- không có Supabase Auth log: request bị chặn trước Supabase, thường là Upstash
  hoặc Server Action.

## 10. Test IDOR bằng hai user

1. User A tạo game và copy URL game.
2. User B đăng nhập ở cửa sổ private khác.
3. User B dán URL game của A.
4. User B không được xem hoặc sửa game A.

Nếu User B truy cập được dữ liệu A, dừng deploy và không sửa bằng cách cấp thêm
quyền anon/authenticated. Đây là lỗi authorization trong app, không phải lỗi
Supabase Dashboard.

## 11. Khi nào được coi là hoàn tất

Chỉ đánh dấu Production Ready khi tất cả đều đúng:

- [ ] Vercel Production có biến đúng environment và deployment mới.
- [ ] NEXT_PUBLIC_SITE_URL là HTTPS production domain.
- [ ] DATABASE_URL dùng connection runtime đã chọn; nếu đã chọn Đường B thì username pooler là `football_life_runtime.<PROJECT_REF>`.
- [ ] Nếu đã chọn Đường B: DIRECT_URL chỉ dùng migration runner.
- [ ] Prisma migration status up to date.
- [ ] Nếu đã chọn Đường B: RLS/grants/owner đã được audit trên đúng Supabase project.
- [ ] Runtime page sau login tải được dữ liệu.
- [ ] Upstash rate limit hoạt động.
- [ ] Auth/email/reset/logout hoạt động.
- [ ] Session lifetime hữu hạn đã xác nhận trong Supabase.
- [ ] HTTPS/security headers/cookie flags đạt.
- [ ] User B không đọc/sửa dữ liệu User A.

Nếu còn một ô chưa kiểm tra được, trạng thái phải là DEPLOYMENT PENDING.

## 12. Các lệnh local kiểm tra source

Chạy trong thư mục D:\road-to-glory:

~~~powershell
npx tsc --noEmit
npm run lint
npm run build
npm run check:security-boundaries
npm run check:career-setup-security
~~~

Không chạy migration, seed hoặc script backfill trên Production chỉ để “test”.
Migration Production chỉ chạy một lần qua DIRECT_URL đã xác định.

## 13. Tài liệu chính thức

- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://supabase.com/docs/guides/platform/ssl-enforcement
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/sessions
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://vercel.com/docs/environment-variables
