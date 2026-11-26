"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { DisplayNameForm } from "@/features/auth/components/DisplayNameForm";
import { updateProfileAvatarAction } from "@/actions/profile.actions";
import { profileAvatarChoices, type ProfileAvatarChoice } from "../profile-avatar";

export interface ProfileAccount {
  email: string;
  name: string;
  avatar: ProfileAvatarChoice;
  googleAvatar: string | null;
  googleEmail: string | null;
}

import { ProfileAvatar as Avatar } from "./ProfileAvatar";

export function ProfileDetails({ account, preview = false }: { account: ProfileAccount; preview?: boolean }) {
  const t = useTranslations("accountSettings");
  const ui = useTranslations("ui");
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState(account.name);
  const [avatar, setAvatar] = useState(account.avatar);
  const [selection, setSelection] = useState(account.avatar);
  const [editing, setEditing] = useState<"avatar" | "name" | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [linking, setLinking] = useState(false);

  async function saveAvatar() {
    if (saving) return;
    const previous = avatar;
    setAvatar(selection); setEditing(null); setSaving(true); setStatus(t("avatarSaving"));
    try {
      if (preview) { setAvatar(selection); setEditing(null); setStatus(t("previewOnly")); return; }
      const result = await updateProfileAvatarAction(selection);
      if (!result.success) { setAvatar(previous); setStatus(result.error); return; }
      setStatus(""); router.refresh();
    } catch { setAvatar(previous); setStatus(t("avatarFailed")); } finally { setSaving(false); }
  }
  return <div className="football-profile-details" data-guide="account-profile">
    <div className="football-profile-row"><span>{t("profile")}</span><div className="football-profile-identity"><Avatar choice={avatar} google={account.googleAvatar} label={t("avatar")} /><strong>{name || t("unnamed")}</strong></div><Button variant="quiet" disabled={saving} onClick={() => { setSelection(avatar); setStatus(""); setEditing("avatar"); }}>{t("changeAvatar")}</Button></div>
    <div className="football-profile-row"><span>{ui("displayName")}</span><strong>{name || t("unnamed")}</strong><Button variant="quiet" disabled={saving} onClick={() => setEditing("name")}>{t("editName")}</Button></div>
    <div className="football-profile-row"><span>Email</span><span>{account.email}</span></div>
    <div className="football-profile-row"><span>{t("connectedAccounts")}</span><div><strong>Google</strong><p className="football-profile-note">{account.googleEmail ?? t("notConnected")}</p></div>
      {account.googleEmail ? <span className="football-profile-note">{t("connected")}</span> : <form action="/auth/google" method="post" onSubmit={(event) => { if (preview || linking) { event.preventDefault(); if (preview) setStatus(t("previewOnly")); return; } setLinking(true); }}>
        <input type="hidden" name="intent" value="link" /><Button type="submit" variant="outline" loading={linking} disabled={saving}>{t("connectGoogle")}</Button>
      </form>}
    </div>
    <p className="football-account-note" role="status">{params.get("error") === "google_link" ? t("googleLinkFailed") : status}</p>
    <Modal open={editing === "avatar"} title={t("changeAvatar")} size="md" onClose={() => { if (!saving) setEditing(null); }} closeOnBackdrop={!saving}>
      <ModalHeader onClose={saving ? undefined : () => setEditing(null)}>{t("changeAvatar")}</ModalHeader>
      <ModalBody><div className="football-avatar-options" role="radiogroup" aria-label={t("avatar")}>
        {profileAvatarChoices.filter((choice) => choice !== "google" || account.googleAvatar).map((choice) => <label key={choice}><input className="sr-only" aria-label={t(`avatar_${choice}`)} type="radio" name="profile-avatar" value={choice} checked={selection === choice} disabled={saving} onChange={() => setSelection(choice)} /><Avatar choice={choice} google={account.googleAvatar} label="" /></label>)}
      </div>{status && <p role="alert">{status}</p>}</ModalBody>
      <ModalFooter><Button variant="outline" disabled={saving} onClick={() => setEditing(null)}>{t("cancel")}</Button><Button loading={saving} disabled={selection === avatar} onClick={saveAvatar}>{t("saveAvatar")}</Button></ModalFooter>
    </Modal>
    <Modal open={editing === "name"} title={t("editName")} size="sm" onClose={() => setEditing(null)}>
      <ModalHeader onClose={() => setEditing(null)}>{t("editName")}</ModalHeader>
      <ModalBody><DisplayNameForm initialName={name} preview={preview} onSaved={(value) => { setName(value); setEditing(null); router.refresh(); }} /></ModalBody>
    </Modal>
  </div>;
}
