"use client";

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
  const router = useRouter();
  const isCompleted = status === "completed";
  const isFull = playerCount === 11;

  async function finishCareer() {
    if (!window.confirm("Hoàn thành sự nghiệp? Bạn vẫn có thể thay hoặc xóa cầu thủ sau đó để chỉnh sửa đội hình.")) return;
    await completeGameSession(gameId);
    router.refresh();
  }

  return (
    <section className="football-squad-summary">
      <div className="football-squad-summary__score">
        <strong>{squadOvr || "—"}</strong>
        <span>{isFull || isCompleted ? "OVR đội hình" : "OVR trung bình"}</span>
      </div>
      {draftAction}
      {!isCompleted && isFull && (
        <Button onClick={() => void finishCareer()}>Chốt đội hình</Button>
      )}
      {isCompleted && (
        <Link href={`/pve/${gameId}`} className="football-button football-button--outline">
          Vào giải PvE
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
      )}
    </section>
  );
}
