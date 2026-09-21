"use client";

import { useRouter } from "next/navigation";
import { completeGameSession } from "@/actions/season.actions";
import { Button } from "@/components/ui/Button";

interface Props {
  gameId: string;
  status: string;
  playerCount: number;
  squadOvr: number;
}

export function SquadSummary({ gameId, status, playerCount, squadOvr }: Props) {
  const router = useRouter();
  const isCompleted = status === "completed";
  const isFull = playerCount === 11;
  const missingCount = Math.max(0, 11 - playerCount);

  async function finishCareer() {
    if (!window.confirm("Hoàn thành sự nghiệp? Đội hình đã chốt sẽ không thể mở lại.")) return;
    await completeGameSession(gameId);
    router.refresh();
  }

  return (
    <section className="football-squad-summary">
      <div className="football-squad-summary__metric">
        <div className="football-squad-summary__score">
          <strong>{squadOvr || "—"}</strong>
          <div>
            <span>{isFull || isCompleted ? "Squad OVR" : "OVR trung bình"}</span>
            <small>{isCompleted ? "khép lại · 11 / 11" : isFull ? "đã chốt · 11 / 11" : `${playerCount} cầu thủ hiện có`}</small>
          </div>
        </div>
      </div>
      <span className="football-squad-summary__rule" aria-hidden="true" />
      <div className="football-squad-summary__message">
        {isCompleted ? (
          <p>Mười một sự nghiệp đã khép. Bấm một dòng để đọc lại hồ sơ.</p>
        ) : isFull ? (
          <p>Đội hình đã đủ. Chốt sự nghiệp để khép đội hình này lại và đưa nó vào danh sách đã hoàn thành.</p>
        ) : (
          <p>Squad OVR chính thức được chốt khi đủ 11 vị trí. Còn thiếu <strong>{missingCount} cầu thủ</strong>.</p>
        )}
      </div>
      {!isCompleted && isFull && (
        <div className="football-squad-summary__action">
          <Button onClick={() => void finishCareer()}>Hoàn thành sự nghiệp</Button>
          <span>hỏi xác nhận một lần · không thể mở lại đội hình đã chốt</span>
        </div>
      )}
    </section>
  );
}
