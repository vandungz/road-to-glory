"use client";

import { useState, useEffect, useRef } from "react";
import { AlertCircle, AlertTriangle, Eye, EyeOff, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "register";
type View = "form" | "confirm-email";

interface Props {
  initialError?: string;
}

export function LoginForm({ initialError }: Props) {
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

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  function startCooldown() {
    setCooldown(60);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    const supabase = createClient();

    if (mode === "login") {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError("Email hoặc mật khẩu không đúng.");
        setIsPending(false);
        return;
      }
      window.location.href = "/";
    } else {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (authError) {
        setError(authError.message.includes("already registered")
          ? "Email này đã được sử dụng. Vui lòng đăng nhập."
          : authError.message);
        setIsPending(false);
        return;
      }
      setView("confirm-email");
      startCooldown();
      setIsPending(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    const supabase = createClient();
    await supabase.auth.resend({ type: "signup", email });
    setIsResending(false);
    startCooldown();
  }

  // ── Confirm email view ─────────────────────────────────────
  if (view === "confirm-email") {
    return (
      <div style={{
        backgroundColor: "var(--white)",
        border: "2px solid var(--charcoal)",
        borderRadius: "var(--radius-card)",
        boxShadow: "var(--shadow-card)",
        padding: "32px 28px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
        textAlign: "center",
      }}>
        <div style={{
          width: "52px", height: "52px",
          backgroundColor: "var(--cream)",
          border: "2px solid var(--charcoal)",
          borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Mail size={22} color="var(--charcoal)" />
        </div>

        <div style={{ lineHeight: 1.4 }}>
          <p style={{ fontFamily: "var(--font-headline)", fontSize: "1.1rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--charcoal)", margin: "0 0 6px" }}>
            Kiểm tra email của bạn
          </p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", color: "var(--ink-gray)", margin: 0 }}>
            Đã gửi link xác nhận đến
          </p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", fontWeight: 600, color: "var(--charcoal)", margin: "2px 0 0" }}>
            {email}
          </p>
        </div>

        <p style={{ fontFamily: "var(--font-stamp)", fontSize: "0.7rem", color: "var(--ink-gray)", letterSpacing: "0.06em" }}>
          Link hết hạn sau 1 giờ
        </p>

        <button
          onClick={handleResend}
          disabled={isResending || cooldown > 0}
          className="btn-secondary"
          style={{ width: "100%", fontSize: "0.8rem" }}
        >
          {isResending && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
          {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi lại email"}
        </button>

        <button
          onClick={() => setView("form")}
          style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", color: "var(--ink-gray)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
        >
          ← Quay lại đăng nhập
        </button>
      </div>
    );
  }

  // ── Form view ──────────────────────────────────────────────
  return (
    <div style={{
      backgroundColor: "var(--white)",
      border: "2px solid var(--charcoal)",
      borderRadius: "var(--radius-card)",
      boxShadow: "var(--shadow-card)",
      padding: "28px",
      display: "flex",
      flexDirection: "column",
      gap: "20px",
    }}>
      {/* Expired link warning */}
      {initialError === "link_expired" && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: "8px",
          padding: "10px 12px",
          backgroundColor: "#fef3c7",
          border: "1.5px solid #b45309",
          borderRadius: "var(--radius-card)",
        }}>
          <AlertTriangle size={15} color="#b45309" style={{ flexShrink: 0, marginTop: "1px" }} />
          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", color: "#92400e", margin: 0 }}>
            Link đã hết hạn. Vui lòng đăng ký lại để nhận link mới.
          </p>
        </div>
      )}

      {/* Tab toggle */}
      <div style={{
        display: "flex",
        border: "2px solid var(--charcoal)",
        borderRadius: "var(--radius-card)",
        overflow: "hidden",
      }}>
        {(["login", "register"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(null); }}
            style={{
              flex: 1,
              padding: "10px",
              fontFamily: "var(--font-headline)",
              fontSize: "0.8rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              border: "none",
              borderRight: m === "login" ? "2px solid var(--charcoal)" : "none",
              cursor: "pointer",
              transition: "all 80ms ease",
              backgroundColor: mode === m ? "var(--charcoal)" : "var(--white)",
              color: mode === m ? "var(--white)" : "var(--charcoal)",
            }}
          >
            {m === "login" ? "Đăng nhập" : "Đăng ký"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Email */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontFamily: "var(--font-headline)", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--charcoal)" }}>
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            disabled={isPending}
            className="input-retro"
            style={error ? { borderColor: "#c43a2a", boxShadow: "3px 3px 0px #c43a2a" } : undefined}
          />
        </div>

        {/* Password */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontFamily: "var(--font-headline)", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--charcoal)" }}>
            Mật khẩu
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isPending}
              className="input-retro"
              style={{ paddingRight: "42px", ...(error ? { borderColor: "#c43a2a", boxShadow: "3px 3px 0px #c43a2a" } : {}) }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", color: "var(--ink-gray)", padding: "2px",
              }}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: "8px",
            padding: "10px 12px",
            backgroundColor: "#fce8e6",
            border: "1.5px solid #c43a2a",
            borderRadius: "var(--radius-card)",
          }}>
            <AlertCircle size={15} color="#c43a2a" style={{ flexShrink: 0, marginTop: "1px" }} />
            <p style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", color: "#9b2c2c", margin: 0 }}>
              {error}
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary"
          style={{ width: "100%", marginTop: "4px" }}
        >
          {isPending && <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />}
          {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
        </button>
      </form>

      {/* Forgot password */}
      {mode === "login" && (
        <div style={{ textAlign: "center" }}>
          <Link
            href="/auth/reset-password"
            style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", color: "var(--ink-gray)", textDecoration: "underline" }}
          >
            Quên mật khẩu?
          </Link>
        </div>
      )}
    </div>
  );
}
