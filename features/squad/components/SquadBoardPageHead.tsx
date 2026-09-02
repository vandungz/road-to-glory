import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSlotStateForIndex, type SlotState } from "../lib/slot-state";
import type { ClientSafePlayer, SlotConfig } from "@/types/squad";

interface SlotTicksProps {
  slots: SlotConfig[];
  players: ClientSafePlayer[];
  inProgressSlots: number[];
  status: string;
}

function tickClass(state: SlotState): string {
  if (state === "filled") return "is-filled";
  if (state === "active") return "is-active";
  return "is-empty";
}

export function SlotTicks({ slots, players, inProgressSlots, status }: SlotTicksProps) {
  const playerMap = new Map(players.map((player) => [player.slotIndex, player]));

  return (
    <div className="rtg-squad-slot-ticks" aria-label={`${players.length} trên ${slots.length} vị trí đã có cầu thủ`}>
      {slots.map((slot) => (
        <span
          key={slot.index}
          className={tickClass(getSlotStateForIndex(slot.index, playerMap.get(slot.index), inProgressSlots, status))}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

interface Props extends SlotTicksProps {
  sessionName: string;
  mobileMeta: string;
}

export function SquadBoardPageHead({
  sessionName,
  mobileMeta,
  slots,
  players,
  inProgressSlots,
  status,
}: Props) {
  return (
    <div className="rtg-squad-board__head" data-anim>
      <div className="rtg-squad-board__heading">
        <Link className="rtg-squad-board__back" href="/classic">
          <ArrowLeft aria-hidden="true" size={14} strokeWidth={1.7} />
          Đội hình của bạn
        </Link>
        <div className="rtg-squad-board__title-row">
          <h1>{sessionName}</h1>
          <small>{mobileMeta}</small>
        </div>
      </div>
      <SlotTicks slots={slots} players={players} inProgressSlots={inProgressSlots} status={status} />
    </div>
  );
}
