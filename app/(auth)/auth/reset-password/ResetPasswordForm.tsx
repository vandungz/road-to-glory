"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { requestPasswordResetAction, updatePasswordAction } from "@/actions/auth.actions";

export function ResetPasswordForm({ canUpdatePassword = false }: { canUpdatePassword?: boolean }) {
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
      setError("Không thể hoàn tất yêu cầu. Vui lòng thử lại sau.");
    }
    setPending(false);
  }

  return <section className="football-auth-panel">
    <h2>{canUpdatePassword ? "Đặt lại mật khẩu" : "Quên mật khẩu?"}</h2>
    <p>{canUpdatePassword ? "Nhập mật khẩu mới cho tài khoản của bạn." : "Nhập email đã đăng ký để nhận liên kết khôi phục."}</p>
    {sent ? <p className="football-auth-message football-auth-message--warning">{canUpdatePassword ? "Đã cập nhật mật khẩu." : "Đã gửi hướng dẫn. Kiểm tra hộp thư của bạn."}</p> : <form className="football-auth-form" onSubmit={handleSubmit}>{canUpdatePassword ? <label className="football-field"><span>Mật khẩu mới</span><input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label> : <label className="football-field"><span>Email</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>}{error && <p className="football-auth-message football-auth-message--error" role="alert">{error}</p>}<Button type="submit" fullWidth loading={pending}>{canUpdatePassword ? "Lưu mật khẩu" : "Gửi liên kết khôi phục"}</Button></form>}
    <Link className="football-text-link" href="/login">Quay lại đăng nhập</Link>
  </section>;
}
