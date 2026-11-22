# Production setup — hướng dẫn từng bước

Tài liệu này dành cho người đang tự setup Football Life trên:

- Vercel: chạy Next.js;
- Supabase: Auth và PostgreSQL;
- Upstash: Redis dùng riêng cho rate limit.

Không chạy tất cả lệnh một lúc. Làm theo thứ tự, chỉ chuyển bước khi ô kiểm tra
của bước hiện tại đạt.

**Cập nhật 22/11/2026:** xem [kết quả remediation và điều kiện phát hành](security-remediation-2026-11-22.md).
Supabase MCP đã kết nối; Vercel được báo đã cài nhưng chưa có tool khả dụng
trong phiên kiểm tra và CLI đang đăng xuất. CA công khai chính thức đã được
đóng gói riêng cho Supabase pooler và handshake xác minh đã qua; vẫn cần nghiệm
thu runtime sau deploy. Bảng ngày 16/10 bên
dưới là lịch sử, không phải kết quả nghiệm thu production hiện tại.

> Không gửi password, token, DATABASE_URL, DIRECT_URL, Supabase secret key
> vào chat, Git, screenshot hay issue. Chứng chỉ CA công khai không phải mật
> khẩu hay private key; chỉ lấy từ nguồn chính thức và không gửi kèm file env.

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
- Upstash Redis để giới hạn các yêu cầu đăng ký, xác nhận mã và đăng nhập qua email;
- deploy mới sau khi đổi biến môi trường;
- kiểm tra đăng ký bằng mã email, Google, truy cập trang sau đăng nhập và đăng xuất.

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

Supabase MCP đã kết nối ở lần kiểm tra 22/11/2026. Vercel được báo đã cài nhưng
tool chưa khả dụng trong phiên đó, CLI đang đăng xuất; vì vậy chưa đọc được
Environment Variables hoặc deployment logs Vercel để xác nhận cấu hình.

Bạn có thể kiểm tra bằng Dashboard ngay bây giờ. Nếu muốn tôi đọc trực tiếp ở
lượt sau, cần có tool Vercel khả dụng hoặc phiên CLI đã đăng nhập. Không gửi
secret vào chat.

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

Các biến pool `PG_*` là tuning tùy chọn. TLS luôn xác minh chứng chỉ và hostname;
Supabase pooler dùng CA công khai đã đóng gói. `PGSSL_CA` là override nếu cần
đổi CA hoặc dùng nhà cung cấp khác; nếu đặt thì phải chứa PEM đáng tin cậy.
`PG_SSL_REJECT_UNAUTHORIZED=false` bị từ chối. Không cần thêm các biến tuning
nếu chưa có nhu cầu điều chỉnh. Tôi không liệt kê
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
https://rtg-vandungz.vercel.app/auth/callback?next=/classic
https://rtg-vandungz.vercel.app/auth/callback?next=/pve
https://rtg-vandungz.vercel.app/auth/callback?next=/profile
https://rtg-vandungz.vercel.app/auth/callback?next=/auth/reset-password
~~~

Vào Authentication → Sign In / Providers:

- Bật Email và Confirm email. Đặt OTP dài 6 số theo cấu hình người vận hành đã xác nhận. Form và Server Action nhận đúng 6 chữ số; Supabase quyết định mã nào hợp lệ. Sau khi gửi đăng ký thành công, form tự chuyển sang nhập OTP. Nếu thay đổi thời hạn mã, kiểm tra cả luồng đặt lại mật khẩu vì Supabase dùng chung thời hạn cho các loại email xác thực này.
- Cấu hình custom SMTP và xác minh địa chỉ hoặc tên miền gửi theo yêu cầu của nhà cung cấp SMTP. SMTP mặc định chỉ gửi đến địa chỉ thuộc nhóm quản trị dự án. Kiểm tra quota của nhà cung cấp đã chọn để giữ chi phí bằng 0.
- Trong Authentication → Email Templates → Confirm signup, dùng mẫu mã dưới đây. Giữ mẫu Reset password dành cho luồng liên kết khôi phục.

~~~html
<h2>Road to Glory</h2>
<p>Mã xác nhận đăng ký / Your signup verification code:</p>
<p><strong>{{ .Token }}</strong></p>
<p><a href="{{ .SiteURL }}/login?verify=1">Nhập mã / Enter your code</a></p>
~~~

Mẫu Confirm signup được lưu độc lập với SMTP. Trong Dashboard, tìm Authentication → Email → Templates → Confirm signup. Sau khi lưu mẫu, tiếp tục cấu hình SMTP Settings để gửi được tới hộp thư ngoài nhóm quản trị.

#### Xác nhận cấu hình qua ảnh — 18/11/2026

- Site URL trong ảnh là `https://rtg-vandungz.vercel.app`. Năm callback có tiền tố `/auth/callback` đã có trong danh sách.
- Xóa dòng cũ `https://rtg-vandungz.vercel.app/callback?next=/auth/reset-password` để danh sách chỉ giữ các callback ứng dụng đang xử lý.
- Ảnh ban đầu hiển thị Email provider đang bật, OTP dài 8 số, hết hạn sau 3600 giây. Người vận hành sau đó xác nhận đã đổi OTP thành 6 số. Đặt minimum password length thành 8 để khớp form đăng ký.
- Ảnh chưa hiển thị Confirm email, SMTP hay mẫu email đã lưu. Kiểm tra trực tiếp từng mục đó trước khi đánh dấu đã đạt.

#### Gửi email với ngân sách bằng 0

Resend là tên một nhà cung cấp gửi email. Gói Free hiện có 3000 email/tháng, tối đa 100/ngày và cần domain đã xác minh để gửi tới người dùng bên ngoài. Domain `vercel.app` của ứng dụng không cho phép bạn xác minh quyền sở hữu DNS để gửi thư từ domain đó. [Resend pricing](https://resend.com/pricing), [Supabase SMTP integration](https://resend.com/docs/send-with-supabase-smtp)

Brevo Free hiện có 300 email/ngày. Có thể bắt đầu bằng cách xác minh địa chỉ gửi, nhưng khi dùng địa chỉ Gmail, Brevo thay địa chỉ gửi bằng địa chỉ thuộc domain của họ. Đây là biện pháp tạm thời, cần kiểm tra việc kích hoạt tài khoản và khả năng nhận thư thực tế trước khi public. [Brevo Free](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan), [Sender requirements](https://help.brevo.com/hc/en-us/articles/14925263522578-Comply-with-Gmail-Yahoo-and-Microsoft-s-requirements-for-email-senders)

Nếu chọn thử Brevo:

1. Tạo tài khoản Free, hoàn thành yêu cầu xác minh và kích hoạt gửi transactional email mà Dashboard hiển thị.
2. Trong Settings → Senders, Domains & Dedicated IPs → Senders, tạo sender tên Road to Glory với email bạn quản lý và xác minh email đó.
3. Trong Settings → SMTP & API → SMTP, sao chép Login và tạo SMTP key.
4. Trong Supabase SMTP Settings, đặt sender email đã xác minh, sender name Road to Glory, Host `smtp-relay.brevo.com`, Port `587`. Username phải sao chép đúng **SMTP login** hiển thị trong Brevo → SMTP & API → SMTP (có thể khác email đăng nhập tài khoản); Password là **SMTP key**, không phải API key hay mật khẩu tài khoản.
5. Lưu, thử đăng ký bằng một hộp thư khác và kiểm tra cả trạng thái giao thư trong Brevo lẫn mã đến hộp thư. [Brevo SMTP](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP)

Hạn mức email tính cả đăng ký, gửi lại mã và đặt lại mật khẩu. Google OAuth giúp giảm số email ứng dụng cần gửi cho người chọn đăng nhập Google. Mức tải phục vụ còn phụ thuộc quota Auth, database, Vercel và Redis. Kết quả gửi thử và lưu lượng đo được là căn cứ để quyết định khi nào cần đổi kế hoạch.

#### Google OAuth

1. Trong Google Cloud, tạo OAuth client loại Web application và cấu hình màn hình đồng ý. Dùng chế độ External cho người chơi bên ngoài và kiểm tra trạng thái phát hành theo quyền truy cập đang yêu cầu. Luồng hiện tại chỉ dùng quyền nhận diện cơ bản để đăng nhập.
2. Thêm **callback của Supabase** vào Authorized redirect URIs của Google. Sao chép giá trị mà mục Google trong Supabase Dashboard hiển thị, theo dạng `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Bật Google trong Supabase Auth và đặt Client ID/Client Secret tại đó. Danh sách Redirect URLs của Supabase ở trên là nơi kiểm soát trang đích Road to Glory sau callback.
4. Kiểm tra cả tài khoản Google mới và Google có cùng email với tài khoản Road to Glory đã xác nhận. Supabase xử lý việc nhận diện và liên kết. Tiến trình chỉ được coi là giữ nguyên khi hai cách đăng nhập trả về cùng tài khoản và mở được cùng đội hình.

Luồng Google yêu cầu chọn tài khoản bằng `prompt=select_account`. Danh sách phụ thuộc các phiên Google mà trình duyệt hiện tại nhận diện được. Nếu trình duyệt chưa đăng nhập Google, người dùng sẽ cần đăng nhập ở trang Google.

Nút Google gửi form POST tới `/auth/google` và server trả redirect 303, kèm cookie PKCE. Endpoint kiểm tra Origin trước khi khởi tạo OAuth và giới hạn trang quay về. CSP của trang đăng nhập và trang bắt đầu OAuth cho phép các bước redirect tới Supabase và Google. Cách này tránh rời trang giữa lúc client đang xử lý phản hồi Server Action. Có [báo cáo Next.js trên Firefox](https://github.com/vercel/next.js/issues/81377) với thông báo `Error in input stream` trong tình huống tương tự. Cần thử trên deployment mới để xác nhận hiện tượng đã hết. Mỗi lần thử nên bắt đầu lại từ trang đăng nhập mới tải.

Tên domain Supabase có thể xuất hiện trên màn hình Google khi branding chưa được Google xác minh. Đặt tên Road to Glory, email hỗ trợ, trang chủ và hai URL chính sách trong Google Auth Platform → Branding, rồi kiểm tra Branding/Verification Center để biết việc xác minh còn yêu cầu gì. Việc điền tên ứng dụng vào Dashboard chưa bảo đảm tên đó đã được Google công bố. [Google branding](https://support.google.com/cloud/answer/15549049), [Supabase Google consent](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)

Nếu website hiện màn hình `Application error: a client-side exception has occurred`, ghi nhận URL trang và lỗi đầu tiên trong Console, bỏ các giá trị nhạy cảm trước khi chia sẻ. Ảnh thông báo tổng quát chưa đủ để xác định nguyên nhân. Theo dõi riêng lỗi runtime ứng dụng này với các bước đăng nhập/đồng ý trên trang Google.

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

hãy lấy CA certificate từ Supabase Database → SSL Configuration, đặt toàn bộ
PEM vào `PGSSL_CA` cho môi trường tương ứng rồi kiểm tra lại với
`sslmode=verify-full`. Runtime mới luôn xác minh CA/hostname, kể cả URL cũ dùng
`sslmode=require`; không tắt xác minh để xử lý lỗi. Không lấy CA từ chính peer
chưa xác minh hoặc từ một nguồn không xác thực.

Pooler hiện tại đã qua handshake xác minh với CA chính thức được đóng gói.
Nếu deployment dùng host/CA khác, phải xác minh cấu hình đó. Kiểm tra TLS có thể thực hiện
chỉ với PostgreSQL SSLRequest/handshake, không gửi user/password hoặc SQL.
Sau đó kiểm tra authenticated route bằng tài khoản được phép; guest homepage
thành công không chứng minh runtime DB đã kết nối được.

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

Source hiện tách limiter auth theo từng hành động: login request guard 10/15 phút,
login thất bại 5/15 phút, signup 3/15 phút, xác nhận mã 10/15 phút, password reset 3/15 phút và gửi lại mã 3/15 phút. Mỗi hành động có bucket IP và email riêng; login thành
công không tiêu thụ bucket signup, reset, resend hoặc login-failure. Key trong Redis
sẽ bắt đầu bằng `rtg-auth-ratelimit:login`, `:login-failure`, `:signup`,
`:verify-signup`, `:password-reset` hoặc `:resend-confirmation`, sau đó mới tới identifier IP/email.
Khi Redis không phản hồi kịp, các thao tác có giới hạn auth trả lỗi và có thể thử lại khi dịch vụ phục hồi.
Các key cũ bắt đầu bằng `rtg-auth-ratelimit:` không có operation có thể hết hạn tự
nhiên và không được đọc bởi code mới. Sau khi bị giới hạn, UI phải nói rõ thời gian
chờ; đừng thử liên tục vì sẽ tự gia hạn counter.

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

Dùng project thử tách khỏi dữ liệu thật và một hộp thư thử ngoài nhóm quản trị:

1. Đăng ký email mới. Trước khi nhập mã, kiểm tra chưa có phiên đăng nhập và chưa vào được Career.
2. Thử mã sai và mã hết hạn. Gửi lại, kiểm tra nhận đúng mã mới, nhập mã và xác nhận mở được trang đích. Mã đã sử dụng phải bị từ chối khi xác nhận lại.
3. Đăng xuất, mở lại URL Career ở cùng trình duyệt và kiểm tra được chuyển về đăng nhập. Đăng nhập lại bằng email và mật khẩu. Tạo đội hình thử, tải lại trang để xác nhận tiến trình còn đó.
4. Kiểm tra đặt lại mật khẩu bằng liên kết. Thử mật khẩu sai và kiểm tra thông báo chung.
5. Đăng nhập Google từ Classic, PvE và Hồ sơ. Kiểm tra trang quay về, thử hủy màn hình đồng ý và kiểm tra thông báo có thể thử lại. Xác minh đăng nhập Google cùng email đã xác nhận mở đúng tiến trình cũ.
6. Trên môi trường thử, kiểm tra hết lượt thử và tình huống Redis không phản hồi. Hai trường hợp phải có cách phục hồi phù hợp, và đăng xuất vẫn có thể gọi riêng.

Sau khi nghiệm thu Auth, tiếp tục theo thứ tự: kiểm tra quyền đọc/ghi giữa hai tài khoản và DB runtime → diễn tập yêu cầu dữ liệu và khôi phục backup → kiểm tra logic và dữ liệu công khai của bản build → theo dõi và cấu hình WAF trong khả năng gói miễn phí. Đối chiếu [kế hoạch an toàn production](security-prod-readiness-plan.md) và [rà soát pháp lý](legal-review.md).

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
- [ ] Email xác nhận bằng mã, đăng nhập mật khẩu, đặt lại mật khẩu, Google OAuth và đăng xuất đạt trên môi trường thử.
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

## Chẩn đoán đăng ký thất bại (18/11/2026)

- Signup và gửi lại mã phân biệt lỗi email, mật khẩu, giới hạn gửi mã, đăng ký bị tắt và lỗi dịch vụ. Không dùng thông báo sai thông tin đăng nhập cho các lỗi này.
- Vercel Runtime Logs: lọc `auth.signup.failed`. Log chỉ gồm `stage`, mã lỗi trong danh sách cho phép và HTTP status; không ghi email, mật khẩu, OTP hoặc nguyên văn lỗi nhà cung cấp.
- `stage=rate-limit`: kiểm tra cấu hình và khả năng kết nối Upstash. Không tắt bảo vệ để vượt lỗi.
- `stage=provider` hoặc `resend`: đối chiếu Supabase Logs → Auth cùng thời điểm. `email_address_not_authorized` liên quan giới hạn SMTP mặc định; `unexpected_failure` cần đọc Auth logs để phân biệt lỗi SMTP, database hoặc lỗi dịch vụ. Không suy luận rằng mọi lỗi 500 đều do SMTP.
- `stage=confirmation`, `code=confirmation_disabled`: bật Confirm email; ứng dụng không chấp nhận phiên đăng ký bỏ qua bước xác nhận email.
- Log Auth do người dùng cung cấp ngày 18/11/2026, lúc 09:46:11 UTC: `user_confirmation_requested`, `unexpected_failure`, HTTP 500, lỗi SMTP `535 5.7.8 Authentication failed`. Đã xác định lần đăng ký này thất bại ở bước xác thực với máy chủ SMTP. Người dùng báo đã khắc phục lỗi sau hướng dẫn; chưa có nghiệm thu độc lập toàn bộ luồng đăng ký/OTP. Không lưu dữ liệu người dùng từ log vào tài liệu.
- Cách xử lý 535: lấy đúng SMTP login và SMTP key còn hoạt động từ Brevo, nhập lại vào Supabase SMTP Settings rồi lưu. Có thể tạo SMTP key mới dành riêng cho Supabase nếu không còn key gốc. Không đổi mật khẩu người chơi, không tắt Confirm email, không thay đổi database để xử lý lỗi này. Thử lại đăng ký và kiểm tra OTP 6 số; chỉ đánh dấu đạt khi xác nhận thành công. [Brevo: lỗi SMTP](https://help.brevo.com/hc/en-us/articles/115000188150-Troubleshooting-Issues-with-Brevo-SMTP).
- Bản sửa có bài kiểm tra `tests/signup-error.test.ts`, nhưng chưa chạy runtime/build/browser do môi trường hiện tại chưa có sandbox thực thi đáp ứng yêu cầu của skill security-audit. `git diff --check` chỉ kiểm tra whitespace, không thay cho nghiệm thu OTP thật.

## 13. Tài liệu chính thức

- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://supabase.com/docs/guides/platform/ssl-enforcement
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/social-sign-in/auth-google
- https://support.google.com/cloud/answer/15549945
- https://supabase.com/docs/guides/auth/sessions
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://vercel.com/docs/environment-variables
