"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setError(null);
    const supabase = createClient();
    const result = password
      ? await supabase.auth.updateUser({ password })
      : await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/reset-password` });
    if (result.error) setError(result.error.message);
    else setSent(true);
    setPending(false);
  }

  return <section className="football-auth-panel">
    <span className="football-auth-panel__eyebrow">Account recovery</span>
    <h2>{password ? "Đặt lại mật khẩu" : "Quên mật khẩu?"}</h2>
    <p>{password ? "Nhập mật khẩu mới cho tài khoản của bạn." : "Nhập email đã đăng ký. Chúng tôi sẽ gửi một đường dẫn khôi phục."}</p>
    {sent ? <p className="football-auth-message football-auth-message--warning">Đã gửi hướng dẫn. Kiểm tra hộp thư của bạn.</p> : <form className="football-auth-form" onSubmit={handleSubmit}>{password ? <label className="football-field"><span>Mật khẩu mới</span><input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label> : <label className="football-field"><span>Email</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>}{error && <p className="football-auth-message football-auth-message--error">{error}</p>}<Button type="submit" fullWidth loading={pending}>{password ? "Lưu mật khẩu" : "Gửi liên kết khôi phục"}</Button></form>}
    <Link className="football-text-link" href="/login">Quay lại đăng nhập</Link>
  </section>;
}
