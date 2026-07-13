"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    setIsPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      title="Đăng xuất"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "5px 12px",
        border: "2px solid var(--charcoal)",
        borderRadius: "3px",
        backgroundColor: "var(--white)",
        boxShadow: "2px 2px 0 var(--charcoal)",
        cursor: isPending ? "not-allowed" : "pointer",
        opacity: isPending ? 0.6 : 1,
        fontFamily: "var(--font-headline)",
        fontSize: "0.75rem",
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: "var(--charcoal)",
      }}
    >
      <LogOut size={13} />
      {isPending ? "..." : "Logout"}
    </button>
  );
}
