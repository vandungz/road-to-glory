"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { completeGameSession } from "@/actions/season.actions";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useState, useTransition } from "react";

interface Props {
  gameId: string;
  status: string;
  playerCount: number;
  squadOvr: number;
  draftAction?: React.ReactNode;
}

export function SquadSummary({ gameId, status, playerCount, squadOvr, draftAction }: Props) {
  const ui = useTranslations("ui");
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isCompleted = status === "completed";
  const isFull = playerCount === 11;

  function finishCareer() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      try {
        await completeGameSession(gameId);
        setConfirmOpen(false);
        router.refresh();
      } catch { setError(ui("squadUpdateError")); }
    });
  }

  return (
    <section className="football-squad-summary">
      <div className="football-squad-summary__score">
        <strong>{squadOvr || "—"}</strong>
        <span>{isFull || isCompleted ? ui("squadOvr") : ui("averageOvr")}</span>
      </div>
      {draftAction}
      {!isCompleted && isFull && (
        <Button onClick={() => { setError(null); setConfirmOpen(true); }}>{ui("finalizeSquad")}</Button>
      )}
      {isCompleted && (
        <Link href={`/pve/${gameId}`} className="football-button football-button--outline">
          {ui("enterPveTournament")}
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      )}
      <ConfirmDialog open={confirmOpen} title={ui("finalizeSquad")} description={ui("confirmCompleteSquad")}
        confirmLabel={ui("finalizeSquad")} pending={pending} error={error}
        onCancel={() => setConfirmOpen(false)} onConfirm={finishCareer} />
    </section>
  );
}
