"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { loginAction, resendSignupAction, signUpAction } from "@/actions/auth.actions";

type Mode = "login" | "register";
type View = "form" | "confirm-email";

export function LoginForm({ initialError, nextPath = "/" }: { initialError?: string; nextPath?: string }) {
  const ui = useTranslations("ui");
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
    try {
      if (mode === "login") {
        const result = await loginAction({ email, password });
        if (!result.success) { setError(result.error); return; }
        window.location.href = nextPath;
        return;
      }

      const result = await signUpAction({ email, password });
      if (!result.success) { setError(result.error); return; }
      if (result.requiresEmailConfirmation === false) {
        window.location.href = nextPath;
        return;
      }
      setView("confirm-email");
      startCooldown();
    } catch {
      setError(ui("connectionError"));
    } finally {
      setIsPending(false);
    }
  }

  async function handleGoogleSignIn() {
    if (isPending) return;
    setError(null);
    setIsPending(true);
    try {
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      if (nextPath === "/profile") callbackUrl.searchParams.set("next", nextPath);
      const { error: authError } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl.href },
      });
      if (authError) setError(ui("googleSignInError"));
    } catch {
      setError(ui("googleSignInError"));
    } finally {
      setIsPending(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      const result = await resendSignupAction(email);
      if (!result.success) throw new Error(result.error);
      startCooldown();
    } catch {
      setError(ui("resendError"));
    } finally {
      setIsResending(false);
    }
  }

  if (view === "confirm-email") {
    return (
      <section className="football-auth-panel football-auth-confirm">
        <div className="football-auth-panel__intro">
          <h2>{ui("checkYourEmail")}</h2>
          <p>{ui("weSentAConfirmationLinkTo")} <strong>{email}</strong>.</p>
        </div>
        {error && <p className="football-auth-message football-auth-message--error" role="alert">{error}</p>}
        <Button fullWidth variant="outline" onClick={handleResend} disabled={isResending || cooldown > 0} loading={isResending}>
          {cooldown > 0 ? ui("resendInS", { v0: String(cooldown) }) : ui("resendEmail")}
        </Button>
        <button type="button" className="football-text-button" onClick={() => setView("form")}>{ui("backToSignIn")}</button>
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

      <div className="football-auth-tabs" role="tablist" aria-label={ui("signinOptions")}>
        <button type="button" role="tab" aria-selected={isLogin} aria-controls="football-auth-form" className={isLogin ? "is-active" : ""} onClick={() => { setMode("login"); setError(null); }}>{ui("signIn")}</button>
        <button type="button" role="tab" aria-selected={!isLogin} aria-controls="football-auth-form" className={!isLogin ? "is-active" : ""} onClick={() => { setMode("register"); setError(null); }}>{ui("signUp")}</button>
      </div>

      <form id="football-auth-form" className="football-auth-form" onSubmit={handleSubmit} role="tabpanel">
        <div className="football-auth-field">
          <label htmlFor="football-email">Email</label>
          <Input id="football-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ten@email.com" disabled={isPending} aria-invalid={!!error} />
        </div>

        <div className="football-auth-field">
          <div className="football-auth-field__label-row">
          <label htmlFor="football-pass">{isLogin ? ui("password") : ui("passwordAtLeast8Characters")}</label>
            {isLogin && <Link href="/auth/reset-password">{ui("forgotPassword")}</Link>}
          </div>
          <div className="football-password-field">
            <Input id="football-pass" type={showPassword ? "text" : "password"} required minLength={isLogin ? 1 : 8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" disabled={isPending} aria-invalid={!!error} aria-describedby={error ? "football-auth-error" : undefined} />
            <IconButton type="button" className="football-password-field__toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? ui("hidePassword") : ui("showPassword")}>
              {showPassword ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
            </IconButton>
          </div>
          {error && <p id="football-auth-error" className="football-auth-message football-auth-message--error" role="alert">{error}</p>}
        </div>

        <Button type="submit" fullWidth loading={isPending} size="lg" className="football-auth-submit">{isLogin ? ui("signIn") : ui("createAccount")}</Button>
        <div className="football-auth-divider" aria-hidden="true"><span />{ui("or")}<span /></div>
        <Button type="button" variant="outline" fullWidth className="football-auth-google" onClick={handleGoogleSignIn} disabled={isPending}>{ui("continueWithGoogle")}</Button>
      </form>
    </section>
  );
}
