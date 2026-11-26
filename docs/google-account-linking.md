# Hoàn tất liên kết Google

Luồng đã có trong source: Hồ sơ → Liên kết Google → POST /auth/google với
intent=link → xác thực người dùng hiện tại → auth.linkIdentity → Google →
/auth/callback?next=/profile → /profile → Cài đặt / Hồ sơ.
Không dùng signInWithOAuth để thay thế tài khoản khi đang liên kết.
Ảnh chụp tài khoản hiện tại đã hiển thị Connected: tài khoản đó đã có Google identity;
không cần liên kết lần nữa. Các bước dưới phục vụ tài khoản chưa liên kết.

## 1. Cho phép liên kết thủ công

Mở https://supabase.com/dashboard/project/cknowgqfwbppxgexwfgh/auth/providers
và tìm **Allow manual linking** trong phần cấu hình đăng nhập/đăng ký người dùng.
Bật và lưu. Đừng nhầm với Enable Sign in with Google ở provider Google.
Đây là cấu hình Supabase, không phải biến NEXT_PUBLIC trong Vercel.
Trạng thái hiện tại của cờ này chưa được xác minh từ Dashboard.

## 2. Provider Google

Trong cùng dự án, mở provider Google: bật Sign in with Google và dùng Client ID,
Client Secret của cùng một OAuth client Web application trong Google Auth Platform.
Không đưa Client Secret vào frontend, chat hay biến NEXT_PUBLIC.
Google Auth Platform → Clients → Authorized redirect URIs phải có:

    https://cknowgqfwbppxgexwfgh.supabase.co/auth/v1/callback

Dù frontend chạy localhost, backend đang dùng Supabase hosted nên callback Google
vẫn là URL trên. Không thay nó bằng /auth/callback của Next.js.
Audience ở chế độ Testing chỉ cho phép người nằm trong Test users. Để mở public,
hoàn tất Audience/Publishing status theo yêu cầu Google cho ứng dụng của bạn.

## 3. URL Configuration của Supabase

Mở https://supabase.com/dashboard/project/cknowgqfwbppxgexwfgh/auth/url-configuration
Site URL là origin production thật. Trong Redirect URLs, giữ các callback đăng nhập
hiện có và thêm callback liên kết chính xác cho từng môi trường:

    http://localhost:3000/auth/callback?next=/profile
    https://YOUR_PRODUCTION_HOST/auth/callback?next=/profile

Thay YOUR_PRODUCTION_HOST bằng host thật. Không dùng wildcard toàn miền Vercel.
Hai callback khác nhau: Google → Supabase (/auth/v1/callback), rồi Supabase → Next.js
(/auth/callback?next=/profile).

## 4. Biến môi trường của ứng dụng

Source dùng NEXT_PUBLIC_SITE_URL để xác định origin callback. Hiện .env local là
http://localhost:3000. Giữ đúng origin này khi test local. Vercel Production dùng
origin HTTPS production thật, không kèm đường dẫn. Redeploy nếu sửa biến Vercel.
Không cần thêm OAuth Client Secret vào ứng dụng Next.js.

## 5. Kiểm chứng thực tế

1. Đăng nhập bằng email/mật khẩu của tài khoản test chưa có Google identity.
2. Tạo hoặc ghi lại một đội hình test để đối chiếu dữ liệu sau liên kết.
3. Vào Cài đặt → Hồ sơ → Liên kết Google, chọn Google account thuộc quyền kiểm soát.
4. Sau khi trở về: Hồ sơ phải hiển thị Google + email + Đã liên kết. Đội hình vẫn còn.
5. Trong Supabase Auth → Users, cùng một User ID phải có identity email và google.
6. Đăng xuất, đăng nhập bằng Google vừa liên kết: phải trở về cùng dữ liệu đội hình.
7. Thử hủy lựa chọn ở Google: không được ghi nhận Đã liên kết hoặc tạo dữ liệu mới.

Nếu Google identity đã thuộc một tài khoản khác, liên kết có thể bị từ chối.
Không xóa tài khoản hay tự gộp dữ liệu để vượt lỗi; cần xác định chủ sở hữu hai tài khoản.
Nếu lỗi manual_linking_disabled, kiểm tra bước 1; redirect_uri_mismatch kiểm tra bước 2;
trở về sai môi trường kiểm tra bước 3–4.

Unit tests tests/account-oauth-return.test.ts kiểm tra nhánh linkIdentity, xác thực,
origin, callback allowlist và failure redirect bằng stub. Chúng không thay thế kiểm
tra OAuth thật qua trình duyệt. Không có thay đổi cấu hình production trong task này.

Nguồn chính thức:
- https://supabase.com/docs/guides/auth/auth-identity-linking
- https://supabase.com/docs/guides/auth/social-sign-in/auth-google
- https://supabase.com/docs/guides/auth/redirect-urls
