"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { changeAccountPasswordAction, deleteOwnAccountAction } from "@/actions/account.actions";

export function SecuritySettings({ signedIn, hasPassword, preview = false }: { signedIn: boolean; hasPassword: boolean; preview?: boolean }) {
  const t = useTranslations("accountSettings");
  const [open, setOpen] = useState(false);
  const [operation, setOperation] = useState<"password" | "delete" | null>(null);
  const pending = operation !== null;
  const [status, setStatus] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;

    const form = event.currentTarget; const data = new FormData(form);
    if (data.get("password") !== data.get("repeatPassword")) { setStatus(t("passwordMismatch")); return; }
    setOperation("password"); setStatus("");
    try {
      if (preview) { await new Promise((resolve) => setTimeout(resolve, 750)); setStatus(t("previewOnly")); return; }
      const result = await changeAccountPasswordAction({ currentPassword: data.get("currentPassword"), password: data.get("password") });
      setStatus(result.success ? t("passwordSaved") : result.error);
      if (result.success) form.reset();
    } catch { setStatus(t("tryLater")); } finally { setOperation(null); }
  }
  async function remove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending || confirmation !== "DELETE") return;

    setOperation("delete"); setDeleteError("");
    try {
      if (preview) { await new Promise((resolve) => setTimeout(resolve, 750)); setDeleteError(t("previewOnly")); return; }
      const result = await deleteOwnAccountAction({ confirmation, currentPassword });
      if (result.success) { window.location.replace("/"); return; }
      setDeleteError(result.error);
    } catch { setDeleteError(t("deleteFailed")); } finally { setOperation(null); }
  }
  return <section className="football-settings-section football-settings-security">
    <h2>{t("security")}</h2>
    {!signedIn ? <p>{t("signInRequired")}</p> : <>
      {hasPassword ? <form className="football-account-form football-password-form" onSubmit={changePassword} aria-busy={operation === "password"}>
        <Field label={t("currentPassword")}><Input name="currentPassword" type="password" autoComplete="current-password" required maxLength={128} disabled={pending} /></Field>
        <div className="football-password-form__new"><Field label={t("newPassword")}><Input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} disabled={pending} /></Field>
          <Field label={t("repeatPassword")}><Input name="repeatPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} disabled={pending} /></Field></div>
        <Button type="submit" loading={operation === "password"} disabled={pending}>{t("changePassword")}</Button>
        <p role="status" className="football-account-note">{status}</p>
      </form> : <p>{t("googleAccount")}</p>}
      <div className="football-settings-danger"><div><h3>{t("deleteAccount")}</h3><p>{t("deleteSummary")}</p></div>
        <Button variant="outline" disabled={pending} onClick={() => { setOpen(true); setConfirmation(""); setCurrentPassword(""); setDeleteError(""); }}>{t("deleteAccount")}</Button></div>
    </>}
    <Modal open={open} title={t("deleteAccount")} size="sm" onClose={() => { if (!pending) setOpen(false); }} closeOnBackdrop={!pending}>
      <form onSubmit={remove} aria-busy={pending}><ModalBody className="football-account-delete-form">
        <p>{t("deleteWarning")}</p>
        {!hasPassword && <><p>{t("reauthRequired")}</p><Button type="submit" form="settings-google-reauth" variant="outline">{t("reauthGoogle")}</Button></>}
        {hasPassword && <Field label={t("currentPassword")}><Input type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} disabled={pending} maxLength={128} /></Field>}
        <Field label={t("typeDelete")}><Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" disabled={pending} required /></Field>
        {deleteError && <p role="alert" className="football-auth-message football-auth-message--error">{deleteError}</p>}
      </ModalBody><ModalFooter><Button variant="outline" type="button" disabled={pending} onClick={() => setOpen(false)}>{t("cancel")}</Button><Button type="submit" loading={operation === "delete"} disabled={pending || confirmation !== "DELETE" || (hasPassword && !currentPassword)}>{t("deleteAccount")}</Button></ModalFooter></form>
    </Modal>
    {!hasPassword && <form id="settings-google-reauth" action="/auth/google" method="post"><input type="hidden" name="next" value="/settings?tab=security" /></form>}
  </section>;
}
