"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Field";
import { useAuthMotion } from "@/components/auth/AuthMotionContext";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "register";
type View = "form" | "confirm-email";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function LoginForm({ initialError }: { initialError?: string }) {
  const { replayToken } = useAuthMotion();
  const [mode, setMode] = useState<Mode>("login");
  const [view, setView] = useState<View>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
  }, []);

  function startCooldown() {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setCooldown(60);
    cooldownRef.current = setInterval(() => {
      setCooldown((previous) => {
        if (previous <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setError(null);
    setIsPending(true);
    const supabase = createClient();

    try {
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) {
          setError("Email hoặc mật khẩu không đúng.");
          return;
        }
        window.location.href = "/";
        return;
      }

      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (authError) {
        setError(authError.message.includes("already registered")
          ? "Email này đã được sử dụng. Vui lòng đăng nhập."
          : authError.message);
        return;
      }
      setView("confirm-email");
      startCooldown();
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Không thể kết nối. Vui lòng thử lại."));
    } finally {
      setIsPending(false);
    }
  }

  async function handleGoogleSignIn() {
    if (isPending) return;
    setError(null);
    setIsPending(true);
    try {
      const { error: authError } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (authError) setError(getErrorMessage(authError, "Không thể đăng nhập với Google."));
    } catch (oauthError) {
      setError(getErrorMessage(oauthError, "Không thể đăng nhập với Google."));
    } finally {
      setIsPending(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      const { error: resendError } = await createClient().auth.resend({ type: "signup", email });
      if (resendError) throw resendError;
      startCooldown();
    } catch (resendError) {
      setError(getErrorMessage(resendError, "Không thể gửi lại email."));
    } finally {
      setIsResending(false);
    }
  }

  if (view === "confirm-email") {
    return (
      <section className="rtg-auth-panel rtg-auth-confirm">
        <div className="rtg-auth-panel__intro" key={`confirm-${replayToken}`} data-anim>
          <span className="rtg-auth-panel__eyebrow">Xác nhận tài khoản</span>
          <h2>Kiểm tra email của bạn</h2>
          <p>Đường dẫn xác nhận đã được gửi tới <strong>{email}</strong>.</p>
          <p className="rtg-auth-confirm__meta">Đường dẫn có hiệu lực trong 1 giờ.</p>
        </div>
        {error && <p className="rtg-auth-message rtg-auth-message--error" data-anim>{error}</p>}
        <Button fullWidth variant="outline" onClick={handleResend} disabled={isResending || cooldown > 0} loading={isResending}>
          {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi lại email"}
        </Button>
        <button type="button" className="rtg-text-button" onClick={() => setView("form")}>Quay lại đăng nhập</button>
      </section>
    );
  }

  const isLogin = mode === "login";
  return (
    <section className="rtg-auth-panel">
      <div className="rtg-auth-panel__intro" key={`intro-${mode}-${replayToken}`} data-anim>
        <h2>{isLogin ? "Tiếp tục sự nghiệp" : "Bắt đầu sự nghiệp"}</h2>
        <p>{isLogin ? "Đăng nhập để mở lại đội hình và những mùa giải đang dở." : "Tạo tài khoản, rồi draft mười một sự nghiệp của riêng bạn."}</p>
      </div>

      {initialError === "link_expired" && <p className="rtg-auth-message rtg-auth-message--warning">Đường dẫn đã hết hạn. Vui lòng đăng ký lại để nhận đường dẫn mới.</p>}

      <div className="rtg-auth-tabs" role="tablist" aria-label="Phương thức xác thực" key={`tabs-${replayToken}`}>
        <button type="button" role="tab" aria-selected={isLogin} aria-controls="rtg-auth-form" className={isLogin ? "is-active" : ""} onClick={() => { setMode("login"); setError(null); }}>Đăng nhập</button>
        <button type="button" role="tab" aria-selected={!isLogin} aria-controls="rtg-auth-form" className={!isLogin ? "is-active" : ""} onClick={() => { setMode("register"); setError(null); }}>Đăng ký</button>
      </div>

      <form id="rtg-auth-form" className="rtg-auth-form" onSubmit={handleSubmit} role="tabpanel">
        <div className="rtg-auth-field" data-anim key={`email-${replayToken}`}>
          <label htmlFor="rtg-email">Email</label>
          <Input id="rtg-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ten@email.com" disabled={isPending} aria-invalid={!!error} />
        </div>

        <div className="rtg-auth-field" data-anim key={`password-${replayToken}`}>
          <div className="rtg-auth-field__label-row">
            <label htmlFor="rtg-pass">{isLogin ? "Mật khẩu" : "Mật khẩu · tối thiểu 6 ký tự"}</label>
            {isLogin && <Link href="/auth/reset-password">Quên mật khẩu?</Link>}
          </div>
          <div className="rtg-password-field">
            <Input id="rtg-pass" type={showPassword ? "text" : "password"} required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" disabled={isPending} aria-invalid={!!error} aria-describedby={error ? "rtg-auth-error" : undefined} />
            <IconButton type="button" className="rtg-password-field__toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
              {showPassword ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
            </IconButton>
          </div>
          {error && <p id="rtg-auth-error" className="rtg-auth-message rtg-auth-message--error" data-anim>{error}</p>}
        </div>

        <Button type="submit" fullWidth loading={isPending} size="lg" className="rtg-auth-submit">{isLogin ? "Đăng nhập" : "Tạo tài khoản"}</Button>
        <div className="rtg-auth-divider" aria-hidden="true"><span />hoặc<span /></div>
        <Button type="button" variant="outline" fullWidth className="rtg-auth-google" onClick={handleGoogleSignIn} disabled={isPending}>Tiếp tục với Google</Button>
      </form>
    </section>
  );
}
