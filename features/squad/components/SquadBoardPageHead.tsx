import type { Formation } from "@/types/game";

interface Props {
  sessionName: string;
  formation: Formation;
  playerCount: number;
  slotCount: number;
}

export function SquadBoardPageHead({ sessionName, formation, playerCount, slotCount }: Props) {
  return (
    <div className="football-squad-board__head">
      <div className="football-squad-board__title-row">
        <h1>{sessionName}</h1>
        <span>{formation}</span>
      </div>
      <span>{playerCount}/{slotCount} cầu thủ</span>
    </div>
  );
}
