'use client';

/**
 * Modal base — Esc closes, scrim click closes, body scroll locks while open,
 * focus lands on the dialog itself. Children build head/body/foot with the
 * .modal-* classes from ui.css.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "../../utils/misc";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** sm | md(default) | lg | left (slide-in drawer) */
  variant?: "sm" | "md" | "lg" | "left";
  label: string;
  children: ReactNode;
}

export function Modal({ open, onClose, variant = "md", label, children }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Land focus inside the dialog so keyboard users start here.
    const t = setTimeout(() => ref.current?.focus(), 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cx("modal", variant !== "md" && `modal--${variant}`)}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        ref={ref}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHead({
  kicker,
  title,
  onClose,
}: {
  kicker?: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="modal-head">
      <div>
        {kicker ? <div className="modal-kicker">{kicker}</div> : null}
        <h2 className="modal-title" id="modal-title">{title}</h2>
      </div>
      <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
