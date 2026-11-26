"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { updateDisplayNameAction } from "@/actions/auth.actions";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

export function DisplayNameForm({ initialName, preview = false, onSaved }: { initialName: string; preview?: boolean; onSaved?: (name: string) => void }) {
  const ui = useTranslations("ui");
  const t = useTranslations("auth");
  const account = useTranslations("accountSettings");
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ error: boolean; text: string }>();

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || name.trim() === savedName) return;
    setPending(true);
    setStatus(undefined);
    const nextName = name.trim();
    try {
      if (preview) { setStatus({ error: false, text: account("previewOnly") }); return; }
      const result = await updateDisplayNameAction(nextName);
      if (!result.success) {
        setStatus({ error: true, text: result.error });
        return;
      }
      setName(nextName);
      setSavedName(nextName);
      setStatus({ error: false, text: t("nameSaved") });
      onSaved?.(nextName);
    } catch {
      setStatus({ error: true, text: t("nameSaveError") });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="football-account-form" onSubmit={save} aria-busy={pending}>
      <Field label={ui("displayName")}>
        <Input value={name} onChange={(event) => { setName(event.target.value); setStatus(undefined); }}
          name="displayName" readOnly={pending} required maxLength={40} autoComplete="nickname"
          aria-invalid={status?.error || undefined} aria-describedby="profile-save-status" />
      </Field>
      <Button type="submit" loading={pending} disabled={!name.trim() || name.trim() === savedName}>{ui("saveName")}</Button>
      <p id="profile-save-status" className="football-account-note" data-error={status?.error} role="status">{status?.text}</p>
    </form>
  );
}
