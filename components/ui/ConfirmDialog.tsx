"use client";

import { useTranslations } from "next-intl";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "./Modal";
import { Button } from "./Button";

interface ConfirmContentProps {
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialogContent({ title, description, confirmLabel, pending = false, error, onCancel, onConfirm }: ConfirmContentProps) {
  const ui = useTranslations("ui");
  return <>
    <ModalHeader onClose={pending ? undefined : onCancel}>{title}</ModalHeader>
    <ModalBody><p>{description}</p>{error && <p className="football-confirm-dialog__error" role="alert">{error}</p>}</ModalBody>
    <ModalFooter>
      <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>{ui("cancel")}</Button>
      <Button type="button" loading={pending} onClick={onConfirm}>{confirmLabel}</Button>
    </ModalFooter>
  </>;
}

export function ConfirmDialog({ open, ...props }: ConfirmContentProps & { open: boolean }) {
  return <Modal open={open} title={props.title} onClose={() => { if (!props.pending) props.onCancel(); }} closeOnBackdrop={!props.pending} size="sm" className="football-confirm-dialog">
    <ConfirmDialogContent {...props} />
  </Modal>;
}
