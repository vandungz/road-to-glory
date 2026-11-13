"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { completeGameSession } from "@/actions/season.actions";
import { Button } from "@/components/ui/Button";

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
  const isCompleted = status === "completed";
  const isFull = playerCount === 11;

  async function finishCareer() {
    if (!window.confirm(ui("confirmCompleteSquad"))) return;
    await completeGameSession(gameId);
    router.refresh();
  }

  return (
    <section className="football-squad-summary">
      <div className="football-squad-summary__score">
        <strong>{squadOvr || "—"}</strong>
        <span>{isFull || isCompleted ? ui("squadOvr") : ui("averageOvr")}</span>
      </div>
      {draftAction}
      {!isCompleted && isFull && (
        <Button onClick={() => void finishCareer()}>{ui("finalizeSquad")}</Button>
      )}
      {isCompleted && (
        <Link href={`/pve/${gameId}`} className="football-button football-button--outline">
          {ui("enterPveTournament")}
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      )}
    </section>
  );
}
