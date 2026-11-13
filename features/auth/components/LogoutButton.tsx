"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { logoutAction } from "@/actions/auth.actions";

export function LogoutButton() {
  const ui = useTranslations("ui");
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    setIsPending(true);
    await logoutAction();
    window.location.href = "/login";
  }

  return (
    <Button
      onClick={handleLogout}
      disabled={isPending}
      title={ui("signOut")}
      variant="quiet"
      size="sm"
      className="football-app-shell__logout"
    >
      <LogOut aria-hidden="true" size={16} />
      {isPending ? ui("signingOut") : ui("signOut")}
    </Button>
  );
}
