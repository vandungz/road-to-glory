import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { AlertCircle, X } from "lucide-react";
import { Button } from "./Button";

interface ToastProps {
  title: string;
  children: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  actionBusy?: boolean;
}

export function Toast({ title, children, actionLabel, onAction, onDismiss, actionBusy = false }: ToastProps) {
  const ui = useTranslations("ui");
  return (
    <aside className="football-toast" role="alert" aria-live="assertive">
      <div className="football-toast__icon" aria-hidden="true">
        <AlertCircle size={19} />
      </div>
      <div className="football-toast__content">
        <strong>{title}</strong>
        <p>{children}</p>
        {actionLabel && onAction && (
          <Button size="sm" onClick={onAction} loading={actionBusy}>
            {actionLabel}
          </Button>
        )}
      </div>
      {onDismiss && (
        <button type="button" className="football-toast__dismiss" onClick={onDismiss} aria-label={ui("dismissNotification")}>
          <X size={17} aria-hidden="true" />
        </button>
      )}
    </aside>
  );
}
