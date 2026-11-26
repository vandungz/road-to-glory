"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { deleteSquadAction } from "@/actions/squad.actions";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export function DeleteSquadDialog({ gameId, name, canMove, preview = false }: { gameId: string; name: string; canMove: boolean; preview?: boolean }) {
  const t = useTranslations("squadManagement"); const ui = useTranslations("ui"); const router = useRouter();
  const [open, setOpen] = useState(false); const [confirmation, setConfirmation] = useState(""); const [error, setError] = useState<string | null>(null); const [pending, start] = useTransition();
  function submit() {
    if (pending || confirmation !== "DELETE") return;
    setError(null); start(async () => {
      try {
        if (preview) { await new Promise((resolve) => setTimeout(resolve, 400)); setError(t("preview")); return; }
        const result = await deleteSquadAction({ gameId, confirmation });
        if (!result.success) { setError(result.error); return; }
        setOpen(false); router.push("/classic"); router.refresh();
      } catch { setError(t("failed")); }
    });
  }
  return <>
    <Button variant="quiet" size="sm" onClick={() => { setOpen(true); setConfirmation(""); setError(null); }}><Trash2 size={16} aria-hidden="true" />{t("deleteSquad")}</Button>
    <Modal open={open} title={t("deleteSquad")} onClose={() => { if (!pending) setOpen(false); }} closeOnBackdrop={!pending} size="sm">
      <ModalHeader onClose={pending ? undefined : () => setOpen(false)}>{t("deleteSquad")}</ModalHeader>
      <ModalBody><div className="football-squad-delete-form">
        <p>{t("deleteDescription", { name })}</p>
        {canMove && <p className="football-squad-delete-reminder">{t("deleteReminder")}</p>}
        <label className="football-field"><span>{t("confirmation")}</span><input className="football-input" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" spellCheck={false} disabled={pending} /></label>
        {error && <p role="alert" className="football-confirm-dialog__error">{error}</p>}
      </div></ModalBody>
      <ModalFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>{ui("cancel")}</Button><Button onClick={submit} loading={pending} disabled={confirmation !== "DELETE"}>{t("deleteSquad")}</Button></ModalFooter>
    </Modal>
  </>;
}
