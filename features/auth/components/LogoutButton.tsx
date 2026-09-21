"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export function LogoutButton() {
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    setIsPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
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
