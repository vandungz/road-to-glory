# Auth UI/UX Plan — Football Life

> Bám sát `docs/frontend-style-system-guide.md`. Không tự chọn màu, spacing, hay font ngoài hệ thống đã định nghĩa.

---

## Tổng quan

Auth pages là **gateway vào game** — không phải feature. UI phải gọn, tập trung, không có game sidebar hay game nav. Vẫn giữ aesthetic sport editorial của Football Life để user không cảm thấy "thoát khỏi game".

Màn hình cần có:
1. `/login` — Form đăng nhập + đăng ký (tab toggle)
2. `confirm-email` state — Thông báo sau khi sign up
3. Error states — Credentials sai, email đã tồn tại, link hết hạn

---

## Layout Shell cho Auth Pages

`app/(auth)/layout.tsx` — không dùng game layout, không có sidebar.

```
┌──────────────────────────────────┐
│  bg-background (cream paper)     │
│                                  │
│        ┌─────────────┐           │
│        │  Auth Card  │           │
│        │  bg-surface │           │
│        │  max-w-sm   │           │
│        └─────────────┘           │
│                                  │
│  Footer: © Football Life         │
└──────────────────────────────────┘
```

```tsx
// app/(auth)/layout.tsx
<div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
  <div className="w-full max-w-sm space-y-6">
    {/* Logo + tagline */}
    <div className="space-y-1 text-center">
      <span className="text-xs font-medium uppercase tracking-widest text-foreground-muted">
        Road to Glory
      </span>
      <h1 className="font-display text-4xl font-black text-foreground">
        FOOTBALL LIFE
      </h1>
    </div>
    {children}
  </div>
  <p className="mt-8 text-xs text-foreground-disabled">© Football Life</p>
</div>
```

---

## Screen 1 — Login / Register (`/login`)

### Cấu trúc

```
┌─────────────────────────────┐
│ FOOTBALL LIFE  (font-display)│  ← layout logo, luôn hiện
│ Road to Glory  (eyebrow)     │
├─────────────────────────────┤
│  [Đăng nhập]  [Đăng ký]    │  ← Chip tab toggle (pattern §7.4)
├─────────────────────────────┤
│  Email                       │
│  ┌───────────────────────┐   │
│  │ email@example.com     │   │
│  └───────────────────────┘   │
│                               │
│  Mật khẩu                     │
│  ┌───────────────────────┐   │
│  │ ••••••••              │ 👁 │
│  └───────────────────────┘   │
│                               │
│  [error message nếu có]       │
│                               │
│  ┌───────────────────────┐   │
│  │   Đăng nhập / Đăng ký │   │  ← Primary button (§7.6)
│  └───────────────────────┘   │
│                               │
│  Quên mật khẩu?              │  ← Ghost button (chỉ hiện ở tab Login)
└─────────────────────────────┘
```

### Tab Toggle

Dùng chip/mode selector pattern (§7.4) — không dùng `<Tab>` của thư viện khác:

```tsx
<div className="flex gap-2 rounded-full border border-border bg-surface-muted p-1">
  <button
    className={cn(
      "flex-1 rounded-full py-1.5 text-sm font-medium transition-colors",
      mode === "login"
        ? "bg-surface text-foreground shadow-sm"
        : "text-foreground-muted hover:text-foreground",
    )}
    onClick={() => setMode("login")}
  >
    Đăng nhập
  </button>
  <button
    className={cn(
      "flex-1 rounded-full py-1.5 text-sm font-medium transition-colors",
      mode === "register"
        ? "bg-surface text-foreground shadow-sm"
        : "text-foreground-muted hover:text-foreground",
    )}
    onClick={() => setMode("register")}
  >
    Đăng ký
  </button>
</div>
```

### Form Inputs

Input chưa có pattern riêng trong style guide — định nghĩa chuẩn ở đây để dùng nhất quán:

```tsx
{/* Input wrapper */}
<div className="space-y-1.5">
  <label className="text-sm font-medium text-foreground">Email</label>
  <input
    type="email"
    className={cn(
      "w-full rounded-lg border bg-surface px-3 py-2.5",
      "text-sm text-foreground placeholder:text-foreground-disabled",
      "transition-colors",
      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
      "disabled:pointer-events-none disabled:opacity-50",
      hasError
        ? "border-danger focus:ring-danger"
        : "border-border hover:border-border-strong",
    )}
    placeholder="email@example.com"
  />
</div>
```

Password input có toggle hiện/ẩn (icon `Eye` / `EyeOff` từ lucide-react, `size-4`):

```tsx
<div className="relative">
  <input type={showPassword ? "text" : "password"} className="... pr-10" />
  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
  >
    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
  </button>
</div>
```

### Error State

Error hiện dưới form fields, trước nút submit. Dùng `danger` token:

```tsx
{error && (
  <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-muted px-3 py-2.5">
    <AlertCircle className="size-4 shrink-0 text-danger" />
    <p className="text-sm text-danger">{error}</p>
  </div>
)}
```

### Submit Button

Primary button (§7.6) full width, loading state có spinner:

```tsx
<button
  type="submit"
  disabled={isPending}
  className={cn(
    "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full",
    "bg-primary text-primary-fg text-sm font-semibold",
    "transition-colors hover:bg-primary-light",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
  )}
>
  {isPending && <Loader2 className="size-4 animate-spin" />}
  {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
</button>
```

### Quên mật khẩu

Chỉ hiện ở tab Login. Ghost button (§7.6), centered, link ra Supabase reset flow:

```tsx
{mode === "login" && (
  <div className="text-center">
    <a
      href="/auth/reset-password"
      className="text-sm text-foreground-muted underline-offset-4 hover:text-foreground hover:underline"
    >
      Quên mật khẩu?
    </a>
  </div>
)}
```

---

## Screen 2 — Confirm Email State

Hiện sau khi sign up thành công. Thay thế form bằng confirmation view trong cùng card:

```
┌─────────────────────────────┐
│  ✉  (icon Mail, size-8)     │
│                               │
│  Kiểm tra email của bạn      │  ← text-xl font-semibold
│                               │
│  Chúng tôi đã gửi link xác  │
│  nhận đến                     │
│  email@example.com            │  ← font-medium text-foreground
│                               │
│  Link hết hạn sau 1 giờ.     │  ← text-sm text-foreground-muted
│                               │
│  ┌───────────────────────┐   │
│  │  Gửi lại email        │   │  ← Outline button (§7.6)
│  └───────────────────────┘   │
│                               │
│  ← Quay lại đăng nhập        │  ← Ghost button
└─────────────────────────────┘
```

```tsx
<div className="flex flex-col items-center gap-4 text-center">
  <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
    <Mail className="size-7 text-primary" />
  </div>
  <div className="space-y-1">
    <p className="text-xl font-semibold text-foreground">Kiểm tra email của bạn</p>
    <p className="text-sm text-foreground-muted">
      Chúng tôi đã gửi link xác nhận đến
    </p>
    <p className="text-sm font-medium text-foreground">{email}</p>
  </div>
  <p className="text-xs text-foreground-muted">Link hết hạn sau 1 giờ.</p>
  <button
    onClick={handleResend}
    disabled={isResending || cooldown > 0}
    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border bg-surface text-sm font-medium text-foreground transition-colors hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-50"
  >
    {isResending && <Loader2 className="size-4 animate-spin" />}
    {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi lại email"}
  </button>
  <button
    onClick={() => setView("form")}
    className="text-sm text-foreground-muted hover:text-foreground"
  >
    ← Quay lại đăng nhập
  </button>
</div>
```

**Cooldown**: Sau khi nhấn "Gửi lại", disable 60s để tránh spam. Dùng `useState<number>` + `setInterval`.

---

## Screen 3 — Expired Link Error

Khi user click link đã hết hạn → `/auth/callback` nhận `AuthError` → redirect `/login?error=link_expired`:

```tsx
{searchParams.error === "link_expired" && (
  <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning-muted px-3 py-2.5">
    <AlertTriangle className="size-4 shrink-0 text-warning" />
    <p className="text-sm text-warning">
      Link đã hết hạn. Vui lòng đăng ký lại để nhận link mới.
    </p>
  </div>
)}
```

Dùng `warning` thay vì `danger` — vì không phải lỗi của user, chỉ là link cũ.

---

## Auth Card Wrapper

Card bọc toàn bộ form — `bg-surface`, `border-border`, `shadow-card`:

```tsx
<div className="rounded-2xl border border-border bg-surface p-6 shadow-card space-y-5">
  {/* Tab toggle */}
  {/* Form */}
  {/* Error */}
  {/* Submit */}
  {/* Forgot password */}
</div>
```

---

## States cần hỗ trợ (§10)

| State | Behaviour |
|---|---|
| `idle` | Form bình thường |
| `pending` | Submit button disabled + spinner, inputs disabled |
| `error` | Error banner hiện, form vẫn editable |
| `confirm-email` | Form ẩn, confirmation view hiện |
| `resending` | "Gửi lại" button spinner, disabled |
| `cooldown` | "Gửi lại sau Xs" countdown |
| `link_expired` | Warning banner trên form login |

---

## Responsive (§12)

- Mobile: layout toàn chiều ngang, card chiếm full width với `px-4`.
- Desktop: card `max-w-sm` centered — đủ dùng cho auth form.
- Không cần breakpoint đặc biệt — auth form đơn giản hơn game board.

---

## Files cần tạo

```
app/
  (auth)/
    layout.tsx              ← Logo + centered shell
    login/
      page.tsx              ← Server Component: đọc searchParams, pass xuống
      LoginForm.tsx         ← Client Component: toàn bộ form state + actions
```

`LoginForm` là Client Component vì cần `useState` (tab, showPassword, error, view, cooldown). Server Action `loginAction` và `signUpAction` được gọi từ đây.

---

## Không làm trong phase này

- Nhớ đăng nhập ("Remember me") — Supabase tự handle session lifetime
- Social login button (Google, GitHub)
- Ảnh minh hoạ / illustration — keep it minimal
- Quên mật khẩu UI đầy đủ — link ra Supabase hosted page là đủ
