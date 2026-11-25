"use client";

import { useTranslations } from "next-intl";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { EditorialArt } from "@/components/shared/EditorialArt";
import type { AwardRankingEntry } from "@/types/awards";
import { getPositionNumber } from "@/lib/position-number";
import { useResultSound } from "@/features/audio/useResultSound";

interface Props {
  nominated: boolean;
  onClose: () => void;
  rank?: number;
  entries?: AwardRankingEntry[];
}

export function BallonDorNominationModal({ nominated, onClose, rank, entries = [] }: Props) {
  const ui = useTranslations("ui");
  const awards = useTranslations("awards");
  useResultSound(rank === 1 ? "award" : nominated ? "success" : "negative");
  if (rank !== undefined) return <Modal open title={ui("ballonDorResults")} onClose={onClose} size="lg" className="football-ballon-result">
    <ModalHeader onClose={onClose} closeLabel={ui("closeResults")}>{ui("ballonDor")}</ModalHeader>
    <ModalBody>
      <div className="football-ballon-result__summary">
        <h2>{rank === 1 ? awards("winnerHeadline") : awards("topTenRank", { rank })}</h2>
        <EditorialArt asset="ballon-dor-trophy" className="football-ballon-result__art" />
      </div>
      <section className="football-ballon-result__ranking" aria-label={ui("ballonDorRanking")} tabIndex={0}>
        <h3>{ui("ballonDorRanking")}</h3>
        <ol>{entries.map((entry) => <li key={entry.candidateKey} className={entry.isCareerPlayer ? "is-player" : undefined}>
          <strong>{entry.rank}</strong><span><b>{entry.isCareerPlayer ? entry.name : `${entry.position} #${getPositionNumber(entry.position)}`}</b><small>{entry.clubName}</small></span>
        </li>)}</ol>
      </section>
    </ModalBody>
    <ModalFooter><Button onClick={onClose}>{ui("continuePlayerDevelopment")}</Button></ModalFooter>
  </Modal>;
  return (
    <Modal open title={ui("ballonDor")} onClose={onClose} size={nominated ? "md" : "sm"}
      className={nominated ? "football-ballon-nomination is-nominated" : "football-ballon-nomination"}>
      <ModalHeader onClose={onClose} closeLabel={ui("closeResults")}>
        {ui("ballonDor")}
      </ModalHeader>
      <ModalBody>
        <p className="football-ballon-nomination__result">
          {nominated ? ui("nominatedInTheTop10") : ui("notNominatedThisYear")}
        </p>
        {nominated && <EditorialArt asset="ballon-dor-trophy" className="football-ballon-nomination__art" />}
      </ModalBody>
      <ModalFooter>
        <Button fullWidth onClick={onClose}>{ui(nominated ? "viewRankingWheel" : "continuePlayerDevelopment")}</Button>
      </ModalFooter>
    </Modal>
  );
}
