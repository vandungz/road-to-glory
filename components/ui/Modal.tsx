"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ModalSize = "sm" | "md" | "lg";
export type ModalVariant = "default" | "inverse";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  closeOnBackdrop?: boolean;
  size?: ModalSize;
  variant?: ModalVariant;
  mobileSheet?: boolean;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex=\"-1\"])",
].join(",");

const ModalTitleContext = createContext<string | null>(null);

/**
 * Shared modal shell for game surfaces. It owns keyboard/focus behavior while
 * callers remain responsible for the panel's content and visual treatment.
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  className = "",
  style,
  closeOnBackdrop = true,
  size = "md",
  variant = "default",
  mobileSheet = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const [isMounted, setIsMounted] = useState(false);
  const titleId = `football-modal-title-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusPanel = () => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (focusable ?? panelRef.current)?.focus();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const frame = window.requestAnimationFrame(focusPanel);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [open]);

  if (!isMounted || !open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="football-modal-overlay"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={cn(
          "football-modal-panel",
          `football-modal-panel--${size}`,
          variant === "inverse" && "football-modal-panel--inverse",
          mobileSheet && "football-modal-panel--sheet",
          className,
        )}
        style={style}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={title}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <ModalTitleContext.Provider value={titleId}>{children}</ModalTitleContext.Provider>
      </div>
    </div>,
    document.body,
  );
}

interface ModalHeaderProps {
  children: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  className?: string;
  eyebrow?: ReactNode;
}

export function ModalHeader({ children, onClose, closeLabel = "Đóng", className, eyebrow }: ModalHeaderProps) {
  const titleId = useContext(ModalTitleContext);
  return (
    <header className={cn("football-modal-header", className)}>
      <div className="football-modal-header__copy">
        {eyebrow && <span className="football-modal-header__eyebrow">{eyebrow}</span>}
        <h2 id={titleId ?? undefined} className="football-modal-header__title">{children}</h2>
      </div>
      {onClose && (
        <button type="button" className="football-icon-button" onClick={onClose} aria-label={closeLabel}>
          <X aria-hidden="true" size={19} strokeWidth={1.6} />
        </button>
      )}
    </header>
  );
}

export function ModalBody({ children, className, ...props }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("football-modal-body", className)}>{children}</div>;
}

export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <footer className={cn("football-modal-footer", className)}>{children}</footer>;
}
