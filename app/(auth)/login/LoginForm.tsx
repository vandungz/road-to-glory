"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Field";
import { loginAction, resendSignupAction, signUpAction, verifySignupCodeAction } from "@/actions/auth.actions";

type Mode = "login" | "register";
type View = "form" | "confirm-email";

export function LoginForm({ initialError, nextPath = "/", initialVerification = false }: {
  initialError?: string;
  nextPath?: string;
  initialVerification?: boolean;
}) {
  const ui = useTranslations("ui");
  const [mode, setMode] = useState<Mode>("login");
  const [view, setView] = useState<View>(initialVerification ? "confirm-email" : "form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
  }, []);

  function startCooldown(seconds = 60) {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setCooldown(seconds);
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

  function openVerification() {
    setError(null);
    setNotice(false);
    setPassword("");
    setShowPassword(false);
    setToken("");
    setView("confirm-email");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setError(null);
    setIsPending(true);
    try {
      if (mode === "login") {
        const result = await loginAction({ email, password });
        if (!result.success) { setError(result.error); return; }
        window.location.href = nextPath;
        return;
      }

      const result = await signUpAction({ email, password });
      if (!result.success) { setError(result.error); return; }
      openVerification();
      setNotice(true);
      startCooldown();
    } catch {
      setError(ui("connectionError"));
    } finally {
      setIsPending(false);
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending || isResending) return;
    setError(null);
    setNotice(false);
    setIsPending(true);
    try {
      const result = await verifySignupCodeAction({ email, token });
      if (result.success) window.location.assign(nextPath);
      else setError(result.error);
    } catch {
      setError(ui("connectionError"));
    } finally {
      setIsPending(false);
    }
  }

  async function handleResend(event: MouseEvent<HTMLButtonElement>) {
    const emailInput = event.currentTarget.form?.querySelector<HTMLInputElement>("#football-verify-email");
    if (cooldown > 0 || isPending || isResending || !emailInput?.reportValidity()) return;
    setError(null);
    setNotice(false);
    setIsResending(true);
    try {
      const result = await resendSignupAction(email);
      if (!result.success) {
        setError(result.error);
        if (result.retryAfterSeconds) startCooldown(result.retryAfterSeconds);
        return;
      }
      setToken("");
      setNotice(true);
      startCooldown();
    } catch {
      setError(ui("resendError"));
    } finally {
      setIsResending(false);
    }
  }

  if (view === "confirm-email") {
    const busy = isPending || isResending;
    return (
      <section className="football-auth-panel football-auth-confirm">
        <div className="football-auth-panel__intro">
          <h2>{ui("checkYourEmail")}</h2>
          <p>{ui("enterSignupCodeHelp")}</p>
        </div>
        <form className="football-auth-form" onSubmit={handleVerify}>
          <div className="football-auth-field">
            <label htmlFor="football-verify-email">Email</label>
            <Input id="football-verify-email" type="email" autoComplete="email" required maxLength={254} value={email} disabled={busy}
              onChange={(event) => { setEmail(event.target.value); setToken(""); setError(null); setNotice(false); }} />
          </div>
          <div className="football-auth-field">
            <label htmlFor="football-verify-token">{ui("signupCodeLabel")}</label>
            <Input id="football-verify-token" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required
              value={token} disabled={busy} onChange={(event) => setToken(event.target.value)} />
          </div>
          {error && <p className="football-auth-message football-auth-message--error" role="alert">{error}</p>}
          {notice && <p role="status">{ui("signupCodeSent")}</p>}
          <Button type="submit" fullWidth loading={isPending} disabled={isResending}>{ui("verifyEmail")}</Button>
          <Button type="button" fullWidth variant="outline" onClick={handleResend} disabled={isPending || cooldown > 0} loading={isResending}>
            {cooldown > 0 ? ui("resendInS", { v0: String(cooldown) }) : ui("resendEmail")}
          </Button>
          <button type="button" disabled={busy} className="football-text-button" onClick={() => {
            setMode("login"); setError(null); setNotice(false); setView("form");
          }}>{ui("backToSignIn")}</button>
        </form>
      </section>
    );
  }

  const isLogin = mode === "login";
  return (
    <section className="football-auth-panel">
      <div className="football-auth-panel__intro">
        <h2>{isLogin ? ui("resumeYourCareer") : ui("startYourCareer")}</h2>
        <p>{isLogin ? ui("signInToAccessYourSavedSquads") : ui("createAnAccountToSaveYourSquads")}</p>
      </div>

      {initialError === "link_expired" && <p className="football-auth-message football-auth-message--warning">{ui("theLinkExpiredSignUpAgainToGetANewOne")}</p>}
      {initialError === "auth_callback" && <p className="football-auth-message football-auth-message--warning">{ui("authCallbackError")}</p>}

      <div className="football-auth-tabs" role="tablist" aria-label={ui("signinOptions")}>
        <button type="button" role="tab" aria-selected={isLogin} aria-controls="football-auth-form" className={isLogin ? "is-active" : ""} onClick={() => { setMode("login"); setError(null); }}>{ui("signIn")}</button>
        <button type="button" role="tab" aria-selected={!isLogin} aria-controls="football-auth-form" className={!isLogin ? "is-active" : ""} onClick={() => { setMode("register"); setError(null); }}>{ui("signUp")}</button>
      </div>

      <form id="football-auth-form" className="football-auth-form" onSubmit={handleSubmit} role="tabpanel">
        <div className="football-auth-field">
          <label htmlFor="football-email">Email</label>
          <Input id="football-email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ten@email.com" disabled={isPending} aria-invalid={!!error} />
        </div>

        <div className="football-auth-field">
          <div className="football-auth-field__label-row">
          <label htmlFor="football-pass">{isLogin ? ui("password") : ui("passwordAtLeast8Characters")}</label>
            {isLogin && <Link href="/auth/reset-password">{ui("forgotPassword")}</Link>}
          </div>
          <div className="football-password-field">
            <Input id="football-pass" type={showPassword ? "text" : "password"} autoComplete={isLogin ? "current-password" : "new-password"} required minLength={isLogin ? 1 : 8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" disabled={isPending} aria-invalid={!!error} aria-describedby={error ? "football-auth-error" : undefined} />
            <IconButton type="button" className="football-password-field__toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? ui("hidePassword") : ui("showPassword")}>
              {showPassword ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
            </IconButton>
          </div>
          {error && <p id="football-auth-error" className="football-auth-message football-auth-message--error" role="alert">{error}</p>}
        </div>

        <Button type="submit" fullWidth loading={isPending} size="lg" className="football-auth-submit">{isLogin ? ui("signIn") : ui("createAccount")}</Button>
      </form>
      <div className="football-auth-divider" aria-hidden="true"><span />{ui("or")}<span /></div>
      <form action="/auth/google" method="post" onSubmit={(event) => {
        if (isPending) { event.preventDefault(); return; }
        setError(null);
        setIsPending(true);
      }}>
        <input type="hidden" name="next" value={nextPath} />
        <Button type="submit" variant="outline" fullWidth className="football-auth-google" disabled={isPending}>{ui("continueWithGoogle")}</Button>
      </form>
    </section>
  );
}
