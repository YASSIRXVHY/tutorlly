'use client';

/** The toast edition — bottom right, auto-dismisses, announces itself politely. */
import { useEffect } from "react";
import { X, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { useApp } from "../../store/AppStore";

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
} as const;

const TOAST_MS = 4200;

export function Toaster() {
  const { state, dispatch } = useApp();
  const { toasts } = state;

  useEffect(() => {
    const timers = toasts.map((t) =>
      setTimeout(() => dispatch({ type: "dismissToast", id: t.id }), TOAST_MS)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, dispatch]);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div key={t.id} className={`toast toast--${t.kind}`}>
            <span className="toast-edge" aria-hidden />
            <Icon size={15} aria-hidden className="toast-icon" />
            <span className="toast-text">{t.text}</span>
            <button
              type="button"
              className="toast-x"
              aria-label="Dismiss notification"
              onClick={() => dispatch({ type: "dismissToast", id: t.id })}
            >
              <X aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
