"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { requestPasswordResetAction, updatePasswordAction } from "@/actions/auth.actions";

export function ResetPasswordForm({ canUpdatePassword = false }: { canUpdatePassword?: boolean }) {
  const ui = useTranslations("ui");
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setError(null);
    try {
      if (canUpdatePassword) {
        const result = await updatePasswordAction(password);
        if (!result.success) setError(result.error);
        else setSent(true);
      } else {
        const result = await requestPasswordResetAction(email);
        if (!result.success) setError(result.error);
        else setSent(true);
      }
    } catch {
      setError(t("genericError"));
    }
    setPending(false);
  }

  return <section className="football-auth-panel">
    <h2>{canUpdatePassword ? ui("resetPassword") : ui("forgotPassword")}</h2>
    <p>{canUpdatePassword ? ui("enterANewPasswordForYourAccount") : ui("enterYourEmailToReceiveAResetLink")}</p>
    {sent ? <p className="football-auth-message football-auth-message--warning">{canUpdatePassword ? ui("passwordUpdated") : ui("checkYourInboxForTheResetLink")}</p> : <form className="football-auth-form" onSubmit={handleSubmit}>{canUpdatePassword ? <label className="football-field"><span>{ui("newPassword")}</span><input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label> : <label className="football-field"><span>Email</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>}{error && <p className="football-auth-message football-auth-message--error" role="alert">{error}</p>}<Button type="submit" fullWidth loading={pending}>{canUpdatePassword ? ui("savePassword") : ui("sendResetLink")}</Button></form>}
    <Link className="football-text-link" href="/login">{ui("backToSignIn")}</Link>
  </section>;
}
