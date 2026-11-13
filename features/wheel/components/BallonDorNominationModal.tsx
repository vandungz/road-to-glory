"use client";

import { useTranslations } from "next-intl";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { EditorialArt } from "@/components/shared/EditorialArt";

interface Props {
  nominated: boolean;
  onClose: () => void;
}

export function BallonDorNominationModal({ nominated, onClose }: Props) {
  const ui = useTranslations("ui");
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
