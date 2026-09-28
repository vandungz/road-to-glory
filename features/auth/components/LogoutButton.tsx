"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { logoutAction } from "@/actions/auth.actions";

export function LogoutButton() {
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
      title="Đăng xuất"
      variant="quiet"
      size="sm"
      className="football-app-shell__logout"
    >
      {isPending ? "Đang thoát" : "Đăng xuất"}
    </Button>
  );
}
