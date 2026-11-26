import { useTranslations } from "next-intl";
import type { Formation } from "@/types/game";

interface Props {
  sessionName: string;
  formation: Formation;
  playerCount: number;
  slotCount: number;
  children?: React.ReactNode;
}

export function SquadBoardPageHead({ sessionName, formation, playerCount, slotCount, children }: Props) {
  const ui = useTranslations("ui");
  return (
    <div className="football-squad-board__head">
      <div className="football-squad-board__title-row">
        <h1>{sessionName}</h1>
        <span>{formation}</span>
      </div>
      <div className="football-squad-board__actions"><span>{playerCount}/{slotCount} {ui("players")}</span>{children}</div>
    </div>
  );
}
