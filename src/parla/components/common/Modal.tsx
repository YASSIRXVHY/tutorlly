'use client';

/**
 * Custom modal system — no native dialogs, no alert().
 * Esc closes, overlay click closes, focus is trapped and restored,
 * body scroll is locked, reduced motion is respected via CSS.
 */
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { cx } from "../../utils/misc";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  kicker?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "default" | "wide" | "slim";
  /** Hide the close affordances while a payment is processing, for instance. */
  locked?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  kicker,
  children,
  footer,
  size = "default",
  locked = false,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape" && !locked) {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const nodes = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
        ).filter((n) => n.offsetParent !== null);
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const active = document.activeElement as HTMLElement | null;
        // Focus must never escape the panel — if it sits outside (or on body),
        // pull it back to the first focusable element.
        if (!active || !panelRef.current.contains(active)) {
          e.preventDefault();
          first.focus();
          return;
        }
        if (!e.shiftKey && (active === last || active === panelRef.current)) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && (active === first || active === panelRef.current)) {
          e.preventDefault();
          last.focus();
        }
      }
    },
    [open, onClose, locked]
  );

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    // Enter the panel on the next frame so the animation is visible.
    const raf = requestAnimationFrame(() => {
      panelRef.current?.focus();
    });
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
      restoreRef.current?.focus?.();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !locked) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={cx(
          "modal-panel",
          size === "wide" && "modal-panel--wide",
          size === "slim" && "modal-panel--slim"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="modal-head">
          <div>
            {kicker && <span className="kicker">{kicker}</span>}
            <h2 id={titleId} className="modal-title">
              {title}
            </h2>
          </div>
          {!locked && (
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog">
              <X size={16} strokeWidth={2.2} aria-hidden />
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
        {footer && (
          <div className="modal-foot">
            {footer}
            <span className="modal-esc" aria-hidden>
              press <span className="kbd">Esc</span> to close
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
