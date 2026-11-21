"use client";

import { useTranslations } from "next-intl";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { guides, type GuideId } from "./guides";

export function PageHelpModal({ id, open, onClose }: { id: GuideId; open: boolean; onClose: () => void }) {
  const t = useTranslations("onboarding");
  return <Modal open={open} title={t("helpTitle")} onClose={onClose} size="md" className="football-page-help">
    <ModalHeader onClose={onClose} closeLabel={t("close")}>{t("helpTitle")}</ModalHeader>
    <ModalBody>
      {guides[id].targets.map((target) => <section key={target}>
        <h3>{t(`steps.${target}.title`)}</h3>
        <p>{t(`steps.${target}.description`)}</p>
      </section>)}
    </ModalBody>
    <ModalFooter><Button onClick={onClose}>{t("done")}</Button></ModalFooter>
  </Modal>;
}
