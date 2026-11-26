"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { sessionRequest } from "@/features/auth/session-request";

export function LogoutButton() {
  const ui = useTranslations("ui");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    if (isPending) return;
    setError(null);
    setIsPending(true);
    try {
      const result = await sessionRequest("logout");
      if (result.success) {
        window.location.replace("/login");
        return;
      }
      setError(ui("signOutError"));
    } catch {
      setError(ui("signOutError"));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      {error && <span className="football-auth-message football-auth-message--error" role="alert">{error}</span>}
      <Button
        type="button"
        onClick={handleLogout}
        disabled={isPending}
        aria-label={isPending ? ui("signingOut") : ui("signOut")}
        variant="quiet"
        size="sm"
        className="football-app-shell__logout"
      >
        <LogOut aria-hidden="true" size={18} strokeWidth={1.7} />
      </Button>
    </>
  );
}
