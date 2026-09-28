# Production infrastructure runbook

> Dành cho người có quyền quản trị Vercel, Supabase và Upstash.
> Không ghi password, token hoặc connection string thật vào Git, ticket, screenshot
> hay chat. Luôn chạy staging/preview trước production.

## 0. Mục tiêu và nguyên tắc

Cần có bằng chứng cho ba lớp:

1. Source: typecheck, lint, build và security checks pass.
2. Staging: roles, RLS, rate limit, auth callback và two-user IDOR test pass.
3. Production: Vercel dùng đúng secrets, Supabase Auth có session lifetime hữu hạn, HTTPS hoạt động và migration đã áp dụng.

Trước khi bắt đầu:

- Backup/snapshot database và ghi lại deployment hiện tại để rollback.
- Tạo domain staging riêng; Preview không được dùng database production.
- Tạo hai tài khoản test khác nhau: user A và user B.
- Giữ LEGACY_CAREER_WRITES=false.
- Không đặt NODE_ENV thủ công trên Vercel.

~~~powershell
npx tsc --noEmit
npm run lint
npm run build
npm run check:security-boundaries
~~~

## 1. Tạo database roles

Ứng dụng dùng một custom runtime role và giữ nguyên owner/admin role của Supabase:

- football_life_runtime: request-time runtime, không superuser, không sở hữu bảng, không BYPASSRLS.
- Supabase project owner/admin: chỉ dùng qua DIRECT_URL trong migration runner có kiểm soát; không dùng cho request runtime.

### 1.1 Chạy script admin

Mở Supabase Dashboard → SQL Editor của đúng project/database, hoặc dùng phiên psql admin được bảo vệ. Chạy nguyên file:

[scripts/provision-production-db-roles.sql](../scripts/provision-production-db-roles.sql)

Script cấp `CONNECT` cho database mà phiên admin hiện tại đang kết nối tới; vẫn phải
kiểm tra đúng project/database trước khi chạy. Không chạy bằng runtime, anon hoặc
authenticated role. Đường migration dùng direct owner/admin connection riêng.

Script không còn chạy `ALTER ROLE`. Supabase SQL Editor có thể từ chối thay đổi
thuộc tính role được bảo vệ, kể cả khi phiên hiển thị là `postgres`. Nếu lần chạy
cũ đã tạo `football_life_runtime` rồi nhưng dừng ở lỗi `42501`, chạy lại bản script
mới là đúng quy trình; nó sẽ kiểm tra role hiện có thay vì cố sửa bằng `ALTER ROLE`.

Trước khi chạy provisioning trên một database đã tồn tại, chạy audit chỉ đọc:

[scripts/audit-production-db-roles.sql](../scripts/audit-production-db-roles.sql)

Audit này đặc biệt kiểm tra `football_life_migration` có tồn tại từ lần triển khai
cũ hay không, owner hiện tại của từng bảng, grants, RLS flags/policies và default
privileges. Nếu phát hiện owner cũ hoặc role cũ, dừng lại để kiểm tra dependency;
không tự `DROP ROLE`, `REASSIGN OWNED` hay đổi `OWNER` trong production.

### 1.2 Đặt password an toàn

Tạo password bằng password manager. Với psql, dùng prompt tương tác để password không nằm trong câu SQL:

~~~text
\password football_life_runtime
~~~

Lấy connection string từ Supabase Connect, không tự đoán host/port/user.

- Runtime serverless: thường dùng transaction pooler.
- Prisma migration/backup: dùng direct connection.
- Password có ký tự reserved phải percent-encode.
- Không đưa password vào file tracked, frontend, NEXT_PUBLIC_* hoặc log.

### 1.3 Xác minh role

~~~sql
SELECT
  rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb,
  rolreplication, rolbypassrls, rolcanlogin
FROM pg_roles
WHERE rolname = 'football_life_runtime';
~~~

Mong đợi: runtime có rolsuper=false, rolcreatedb=false, rolcreaterole=false,
rolreplication=false, rolbypassrls=false, rolcanlogin=true. Runtime không được sở
hữu bảng ứng dụng. Owner hiện tại của Supabase phải được giữ nguyên; không tạo
custom migration owner.

~~~sql
SELECT c.relname, r.rolname AS owner
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_roles r ON r.oid = c.relowner
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'game_sessions', 'career_players', 'career_seasons', 'wheel_checkpoints',
    'career_events', 'career_commands', 'career_transfer_workflows',
    'career_transfer_negotiations', 'career_honours',
    'career_award_ranking_snapshots', 'leagues', 'clubs', 'national_teams'
  );
~~~

## 2. Cấu hình Vercel Environment Variables

Vào Vercel project → Settings → Environment Variables. Tách Preview và Production.

### Production

| Variable | Giá trị |
| --- | --- |
| DATABASE_URL | runtime role connection string từ Supabase pooler |
| DIRECT_URL | Supabase direct admin/owner connection; migration runner only, not required in request-serving Vercel env |
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | publishable/anon key; được phép ở browser |
| NEXT_PUBLIC_SITE_URL | https://<production-domain>, chỉ origin |
| UPSTASH_REDIS_REST_URL | Redis production REST URL |
| UPSTASH_REDIS_REST_TOKEN | Redis production REST token |
| PG_POOL_MAX | 3 ban đầu |
| LEGACY_CAREER_WRITES | false |
| NEXT_PUBLIC_ENABLE_DEV_TOOLS | false hoặc bỏ trống |

Preview/staging phải dùng database và Upstash riêng:

- DATABASE_URL của staging; DIRECT_URL chỉ được cấp cho staging migration runner/CI.
- NEXT_PUBLIC_SITE_URL là domain staging HTTPS ổn định.
- LEGACY_CAREER_WRITES=false.
- Không dùng production database credential hoặc Upstash token.

Không tạo NEXT_PUBLIC_DATABASE_URL, NEXT_PUBLIC_DIRECT_URL, NEXT_PUBLIC_*TOKEN và không thêm service_role key. Source hiện tại không cần service-role key.

Sau khi đổi env, phải redeploy; deployment cũ không tự nhận giá trị mới.

~~~powershell
vercel link --yes --project <project-id-or-name> --scope <team>
vercel env ls production
vercel env ls preview
vercel env --help
~~~

Không in secret ra console. Vercel env pull có thể ghi đè file đích; chỉ dùng file ignored và kiểm tra target trước.

## 3. Apply Prisma migrations và RLS

### 3.1 Staging

1. Provision roles staging.
2. Đặt DATABASE_URL và DIRECT_URL staging.
3. Kiểm tra và apply migration:

~~~powershell
npx prisma migrate status
npx prisma migrate deploy
~~~

prisma.config.ts bắt buộc DIRECT_URL cho database commands. Không chạy migration bằng runtime role. Nếu command runner không load .env.local, dùng CI/secret injection; không copy password vào file tracked.

### 3.2 Xác minh RLS

~~~sql
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'game_sessions', 'career_players', 'career_seasons', 'wheel_checkpoints',
    'career_events', 'career_commands', 'career_transfer_workflows',
    'career_transfer_negotiations', 'career_honours',
    'career_award_ranking_snapshots', 'leagues', 'clubs', 'national_teams'
  );
~~~

Mỗi bảng phải có relrowsecurity=true và relforcerowsecurity=false. Không bật FORCE
ROW LEVEL SECURITY trong mô hình hiện tại vì owner/admin path của Supabase phải
tiếp tục dùng được cho Dashboard/Table Editor và migration.

### 3.3 Default privileges cho bảng mới

Trong Supabase Dashboard, vào Integrations → Data API và kiểm tra tùy chọn
default privileges cho entities mới. Với codebase này, bảng mới không được tự
động cấp `SELECT/INSERT/UPDATE/DELETE` cho `anon` hoặc `authenticated`.

Đối chiếu thêm phần `pg_default_acl` trong audit SQL. Nếu project vẫn có default
grant cho Data API roles, phải tắt cấu hình đó trong Dashboard hoặc áp dụng lệnh
`ALTER DEFAULT PRIVILEGES` theo đúng owner role đã xác minh trong audit. Không
đoán role tạo object. Mọi migration tạo bảng mới phải cùng transaction thực hiện:
create table → revoke public Data API grants → grant tối thiểu cho runtime →
enable RLS → tạo policy → kiểm tra sequence/function grants nếu có.

~~~sql
SELECT
  has_table_privilege('football_life_runtime', 'public.game_sessions', 'SELECT') AS runtime_select,
  has_table_privilege('football_life_runtime', 'public.game_sessions', 'INSERT') AS runtime_insert,
  has_table_privilege('football_life_runtime', 'public.game_sessions', 'UPDATE') AS runtime_update,
  has_table_privilege('football_life_runtime', 'public.game_sessions', 'DELETE') AS runtime_delete,
  has_table_privilege('anon', 'public.game_sessions', 'SELECT') AS anon_select,
  has_table_privilege('authenticated', 'public.game_sessions', 'SELECT') AS auth_select;
~~~

Với `public.game_sessions`, runtime DML phải true; anon_select và auth_select
phải false. Với catalog `public.leagues`, `public.clubs`, `public.national_teams`,
runtime SELECT phải true nhưng INSERT/UPDATE/DELETE phải false; anon/authenticated
vẫn phải false.

Kiểm tra riêng quyền catalog:

~~~sql
SELECT
  has_table_privilege('football_life_runtime', 'public.leagues', 'SELECT') AS catalog_select,
  has_table_privilege('football_life_runtime', 'public.leagues', 'INSERT') AS catalog_insert,
  has_table_privilege('football_life_runtime', 'public.leagues', 'UPDATE') AS catalog_update,
  has_table_privilege('football_life_runtime', 'public.leagues', 'DELETE') AS catalog_delete;
~~~

Mong đợi: `catalog_select=true`, còn ba quyền ghi đều `false`.
## 4. Test runtime và Data API

Bằng DATABASE_URL runtime:

~~~sql
SELECT current_user, current_database();
SELECT COUNT(*) FROM public.game_sessions;
~~~

current_user phải là football_life_runtime và query phải thành công.

Bằng anon key gọi REST:

~~~powershell
$headers = @{
  apikey = $env:NEXT_PUBLIC_SUPABASE_ANON_KEY
  Authorization = "Bearer $env:NEXT_PUBLIC_SUPABASE_ANON_KEY"
}
Invoke-WebRequest -Uri "$env:NEXT_PUBLIC_SUPABASE_URL/rest/v1/game_sessions?select=id&limit=1" -Headers $headers -Method Get
~~~

Kết quả chấp nhận được là permission denied/HTTP 42501 hoặc không có row do RLS.
Response 2xx có row là fail. Không cấp thêm quyền cho anon/authenticated chỉ để
làm request chạy.

## 5. Cấu hình Upstash

Upstash Redis là dịch vụ riêng với Supabase Postgres. Không cần và không nên đặt
hai biến Redis trong SQL Editor của Supabase. Code hiện tại dùng HTTP REST client
của Upstash vì Vercel serverless cần state dùng chung giữa các instance.

1. Mở [Upstash Console](https://console.upstash.com) và tạo database Redis mới.
2. Tạo database riêng cho staging/Preview và Production; chọn region gần Vercel.
3. Vào phần Details/Connect của database, lấy `REST URL` và `REST TOKEN`.
4. Vào Vercel project → Settings → Environment Variables, tạo:
   `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN` cho đúng environment.
5. Local development: đặt hai biến trong `.env.local` (file đã bị gitignore),
   không dùng prefix `NEXT_PUBLIC_`.
6. Redeploy Preview/Production sau khi thêm hoặc đổi biến.

Có thể tạo Upstash thông qua Vercel Marketplace/Integration nếu muốn quản lý
liên kết từ Vercel; vẫn phải map đúng hai biến mà code đang đọc. Không đặt token
vào Supabase Auth, Supabase SQL, frontend hoặc Git.

Behavior source hiện tại:

- Auth login/signup/recovery/resend: 5 request/15 phút theo IP và email.
- Gameplay boundaries: 30 request/60 giây theo identifier.
- Production fail closed nếu thiếu Upstash config.

Smoke test login sai lặp lại, gameplay mutation lặp nhanh và kiểm tra counter trong Upstash. Không log email, token, password hoặc payload.

## 6. Việc cần làm từ đây — cấu hình Supabase Auth

Bạn đã hoàn thành bước 1–5, đã kết nối Upstash, cập nhật Vercel Environment
Variables và đã redeploy. Từ đây chủ yếu là thao tác trên Supabase Dashboard và
kiểm tra website production. Không chạy lại provisioning role hoặc migration nếu
bước 1–5 đã thành công.

Trong các ví dụ dưới đây, thay:

- `<PRODUCTION_DOMAIN>` bằng domain thật, ví dụ `football-life.vercel.app`;
- `<STAGING_DOMAIN>` bằng domain staging nếu bạn có staging.

### 6.1 Cấu hình URL đăng nhập

Mục tiêu: Supabase chỉ được phép đưa người dùng quay về đúng website của bạn.

1. Mở Supabase Dashboard và chọn đúng project.
2. Chọn **Authentication** ở thanh bên trái.
3. Mở **URL Configuration**.
4. Điền các giá trị sau:

   **Site URL**

   ```text
   https://<PRODUCTION_DOMAIN>
   ```

   Không dùng `http://`, không dùng URL preview làm Site URL production.

   **Redirect URLs** — thêm từng dòng:

   ```text
   https://<PRODUCTION_DOMAIN>/auth/callback
   https://<PRODUCTION_DOMAIN>/auth/callback?next=/auth/reset-password
   ```

   Nếu có staging, thêm:

   ```text
   https://<STAGING_DOMAIN>/auth/callback
   https://<STAGING_DOMAIN>/auth/callback?next=/auth/reset-password
   ```

5. Bấm **Save**.

Chỉ thêm URL localhost khi đang phát triển local. Không thêm `*` hoặc wildcard
rộng cho domain production. Supabase yêu cầu URL trong code phải khớp allowlist;
Site URL cũng được dùng cho email xác nhận và reset password. Xem [Supabase
Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

Nếu bạn chưa bật Google/GitHub OAuth thì bỏ qua phần cấu hình OAuth; không cần
tạo provider chỉ để hoàn tất runbook.

### 6.2 Cấu hình email và password

1. Vẫn trong **Authentication**, mở **Providers** hoặc **Sign In / Providers**.
2. Mở provider **Email**.
3. Kiểm tra:

   - Email provider: **Enabled**;
   - Confirm email: **Enabled** nếu muốn chỉ tài khoản đã xác nhận mới đăng nhập;
   - Minimum password length: tối thiểu `8`, nên dùng dài hơn cho production.

4. Vào **Authentication → Settings/Security** nếu project có mục **Leaked
   Password Protection**, bật mục đó. Tính năng này phụ thuộc plan Supabase.
5. Nếu dùng email xác nhận hoặc reset password cho người dùng thật, cấu hình
   **Custom SMTP** trong Authentication. Email mặc định của Supabase chỉ phù hợp
   thử nghiệm và có giới hạn gửi.

Không tạo bảng password riêng trong Supabase. Supabase Auth tự hash password bằng
bcrypt; app chỉ gọi Supabase Auth. [Supabase Password Security](https://supabase.com/docs/guides/auth/password-security).

### 6.3 Cấu hình thời hạn session

1. Vào **Authentication → Sessions**.
2. Nếu các trường này xuất hiện, đặt:

   | Trường | Giá trị khởi đầu |
   | --- | --- |
   | JWT/access-token expiry | `1 hour` |
   | Inactivity timeout | `7 days` |
   | Timebox / maximum session lifetime | `30 days` |

3. Bấm **Save**.

Nếu Dashboard không hiển thị Inactivity timeout hoặc Timebox ở plan hiện tại,
đánh dấu bước này là **chưa đạt**, không coi `maxAge=7 ngày` của cookie app là
đã giải quyết session expiry. Cookie chỉ là thời hạn cookie; Supabase vẫn quyết
định refresh token/session còn hợp lệ hay không.

Để tránh nhầm session cũ, sau khi lưu cấu hình hãy logout rồi login lại bằng tài
khoản test. Supabase có thể chỉ kiểm tra timeout khi session được refresh.

## 7. Kiểm tra HTTPS, security headers và cookie

Phần này kiểm tra website đã deploy, không kiểm tra trong Supabase Dashboard.

### 7.1 Kiểm tra bằng trình duyệt

1. Mở cửa sổ Incognito/Private.
2. Truy cập:

   ```text
   https://<PRODUCTION_DOMAIN>/login
   ```

3. Nhấn `F12` để mở Developer Tools.
4. Chọn tab **Network**.
5. Reload trang bằng `Ctrl+R`.
6. Bấm request `/login` đầu tiên.
7. Mở phần **Headers → Response Headers**.

Phải thấy các header sau:

```text
strict-transport-security
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy
permissions-policy
content-security-policy
```

Không cần so sánh toàn bộ giá trị CSP bằng mắt; chỉ cần không có lỗi CSP màu đỏ
trong tab **Console** khi mở login, đăng nhập, reset password và vào game.

### 7.2 Kiểm tra chuyển HTTP sang HTTPS

Mở PowerShell trên máy tính và chạy, thay domain thật:

```powershell
curl.exe -I http://<PRODUCTION_DOMAIN>/login
```

Kết quả đúng là status `308` hoặc redirect sang URL bắt đầu bằng `https://`.

Sau đó chạy:

```powershell
curl.exe -I https://<PRODUCTION_DOMAIN>/login
```

Kết quả phải là `200`, `3xx` hợp lệ hoặc response của app; không được có lỗi
certificate. Nếu HTTP không redirect hoặc HTTPS báo certificate lỗi, dừng public.

### 7.3 Kiểm tra cookie đăng nhập

1. Trong browser, đăng nhập bằng tài khoản test.
2. Nhấn `F12` → **Application**.
3. Ở bên trái chọn **Storage → Cookies → https://<PRODUCTION_DOMAIN>**.
4. Tìm cookie bắt đầu bằng `sb-` hoặc cookie session do Supabase tạo.
5. Kiểm tra:

   | Thuộc tính | Giá trị đúng trên production |
   | --- | --- |
   | HttpOnly | bật / `true` |
   | Secure | bật / `true` |
   | SameSite | `Lax` |
   | Path | `/` |
   | Expires/Max-Age | có thời hạn, không phải Session vô hạn |

Nếu không thấy cookie sau khi login, kiểm tra lại domain, HTTPS và callback trước
khi tiếp tục.

## 8. Kiểm tra hoạt động thực tế trên website

Hãy thực hiện trên Preview/Staging trước. Chỉ lặp lại các bước nhẹ nhất trên
Production sau khi staging pass. Tạo hai email test: **User A** và **User B**.

### 8.1 Đăng ký, đăng nhập và reset password

Đánh dấu từng dòng sau khi thực hiện:

- [ ] User A đăng ký thành công.
- [ ] Email confirmation đến đúng địa chỉ.
- [ ] User A xác nhận email và đăng nhập thành công.
- [ ] Đăng xuất xong, mở lại URL game thì bị đưa về `/login`.
- [ ] Dùng chức năng quên password, email reset mở được callback.
- [ ] Đặt password mới thành công và đăng nhập lại được.
- [ ] Nhập password sai chỉ nhận lỗi chung; không thấy stack trace hoặc lỗi SQL.

Nếu email không đến: kiểm tra Supabase **Authentication → Logs** và Custom SMTP;
không vội sửa code callback.

### 8.2 Kiểm tra rate limit Upstash

Không spam Production. Dùng Preview/Staging:

1. Mở trang login ở cửa sổ Incognito.
2. Nhập một email test và password sai.
3. Gửi liên tiếp 6 lần trong thời gian ngắn.
4. Sau khoảng 5 lần, request tiếp theo phải bị từ chối bằng thông báo chung hoặc
   status `429`.
5. Vào Upstash Console, mở database staging và kiểm tra có activity/command tăng.

Rate limit hiện tại của code là:

- Auth/login/signup/recovery/resend: `5 lần / 15 phút` theo IP/email.
- Gameplay mutation: `30 lần / 60 giây` theo user/identifier.

Nếu login vẫn chạy vô hạn mà Upstash không có activity, kiểm tra lại tên biến
trong Vercel là đúng `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN`, sau đó
redeploy lại.

### 8.3 Kiểm tra session hết hạn

Không chờ 7 hoặc 30 ngày để test production. Trong staging, tạm đặt timeout ngắn
(ví dụ vài phút), lưu lại, rồi:

1. Logout và login lại.
2. Để yên cho tới khi hết timeout.
3. Mở lại `/classic` hoặc URL game.

Kết quả đúng: bị đưa về `/login` hoặc request protected bị từ chối. Sau test,
đặt lại staging/production về giá trị vận hành đã chọn ở bước 6.3.

### 8.4 Kiểm tra IDOR bằng hai tài khoản

1. Đăng nhập User A bằng cửa sổ thường.
2. User A tạo một game.
3. Copy URL game, phần sau domain thường chứa `gameId`.
4. Mở cửa sổ Incognito khác và đăng nhập User B.
5. Dán URL game của User A vào cửa sổ User B.
6. User B phải bị từ chối, redirect hoặc nhận lỗi chung; không được thấy game A.
7. Thử thao tác tiếp tục/ghi dữ liệu nếu giao diện cho phép.
8. Đăng nhập lại User A và xác nhận game A không bị thay đổi.

Nếu User B đọc hoặc sửa được dữ liệu của User A, dừng public ngay.

### 8.5 Kiểm tra dữ liệu không đi qua Data API công khai

Code hiện tại dùng Prisma cho dữ liệu game, không dùng `supabase.from(...)`. Vì
vậy anon/authenticated không cần đọc bảng game.

Trong Supabase SQL Editor, bạn có thể chạy lại:

[scripts/audit-production-db-roles.sql](../scripts/audit-production-db-roles.sql)

Các bảng game phải có owner Supabase hiện tại, RLS bật, `relforcerowsecurity=false`;
`anon` và `authenticated` không được có grants. Không sửa grants chỉ để làm test
REST trả về `200`; lỗi `42501` là kết quả đúng trong mô hình này.

## 9. Khi nào được coi là hoàn tất

Bạn chỉ đánh dấu production-ready khi toàn bộ điều kiện sau đều đúng:

- [ ] Vercel production deployment đang chạy commit mới nhất.
- [ ] Login, signup, reset password và logout đều chạy trên HTTPS.
- [ ] Supabase Site URL/Redirect URLs đúng domain production.
- [ ] Session timeout hữu hạn đã được bật trong Supabase Auth.
- [ ] Cookie có HttpOnly, Secure, SameSite=Lax và expiry hữu hạn.
- [ ] Upstash có activity và login rate limit thực sự chặn request thứ 6.
- [ ] User B không thể mở/sửa game của User A.
- [ ] Anon/authenticated không đọc được bảng game qua REST.
- [ ] Không có secret server trong browser bundle hoặc response.

Nếu còn một ô chưa đạt, trạng thái đúng là **deployment pending**, chưa phải
production-ready.

## 10. Khi có lỗi: dừng ở đâu và xử lý thế nào

| Hiện tượng | Việc cần làm |
| --- | --- |
| Login callback về localhost/sai domain | Kiểm tra `NEXT_PUBLIC_SITE_URL`, Site URL và Redirect URLs; redeploy nếu env sai. |
| Email reset không đến | Kiểm tra Email provider và SMTP trong Supabase. |
| HTTP không chuyển sang HTTPS | Kiểm tra domain/certificate/Vercel trước khi tiếp tục. |
| Thiếu security headers | Kiểm tra deployment có chạy code mới và request đi qua middleware. |
| Login sai không bị giới hạn | Kiểm tra hai biến Upstash trong đúng environment rồi redeploy. |
| Session không hết hạn | Kiểm tra Auth → Sessions; không chỉ nhìn expiry của cookie. |
| User B thấy dữ liệu User A | Dừng public; đây là lỗi authorization P1. |
| Runtime query lỗi permission | Kiểm tra `DATABASE_URL` đang dùng `football_life_runtime`, không dùng `DIRECT_URL`. |
| REST anon đọc được bảng game | Dừng public; chạy audit grants/RLS và không cấp thêm quyền cho anon. |

Không tự `DROP TABLE`, `DROP ROLE`, `REASSIGN OWNED`, đổi `OWNER` hoặc sửa RLS
ad-hoc trên Production để “chữa nhanh”. Ghi lại lỗi và rollback Vercel về
deployment trước đó nếu bản deploy mới gây lỗi ứng dụng.

## 11. Ghi lại bằng chứng hoàn tất

Tạo một note nội bộ không chứa secret, điền mẫu sau:

```text
Production domain:
Vercel deployment ID:
Supabase project:
Upstash production database:

[ ] URL/redirect đã kiểm tra
[ ] Email/password/reset đã kiểm tra
[ ] Session timeout đã kiểm tra
[ ] HTTPS + headers đã kiểm tra
[ ] Cookie flags đã kiểm tra
[ ] Upstash rate limit đã kiểm tra
[ ] Two-user IDOR đã kiểm tra
[ ] RLS/grants/owner audit đã lưu

Người kiểm tra:
Thời gian kiểm tra:
Kết luận: PASS / DEPLOYMENT PENDING
```

Không chụp màn hình hoặc lưu giá trị của `DATABASE_URL`, `DIRECT_URL`,
`UPSTASH_REDIS_REST_TOKEN`, Supabase secret key hoặc password.

Sau khi tất cả ô đều PASS, cập nhật [docs/security-prod-readiness-plan.md](security-prod-readiness-plan.md)
từ `source-remediated / deployment pending` sang `production ready`.

## Tài liệu chính thức

- [Supabase sessions](https://supabase.com/docs/guides/auth/sessions)
- [Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase securing your API](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase tables and data](https://supabase.com/docs/guides/database/tables)
- [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase password auth](https://supabase.com/docs/guides/auth/passwords)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
