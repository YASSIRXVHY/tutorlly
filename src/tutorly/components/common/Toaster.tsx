'use client';

/** The toaster — reads the store's toast queue, auto-dismisses, clickable. */
import { useEffect } from "react";
import { CheckCircle2, TriangleAlert, Info, X } from "lucide-react";
import { useApp } from "../../store/AppStore";
import type { ToastMsg } from "../../store/types";

const KIND_ICON = {
  success: CheckCircle2,
  error: TriangleAlert,
  info: Info,
} as const;

export function Toaster() {
  const { state, dispatch } = useApp();
  return (
    <div className="toaster" role="region" aria-label="Notifications" aria-live="polite">
      {state.toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onClose={() => dispatch({ type: "dismissToast", id: t.id })} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastMsg; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4600);
    return () => clearTimeout(t);
     
  }, []);

  const Icon = KIND_ICON[toast.kind];
  return (
    <div className={`toast toast--${toast.kind}`} onClick={onClose} role="status">
      <Icon size={16} className="toast-ico" aria-hidden />
      <span className="toast-text">{toast.text}</span>
      <X size={14} className="toast-ico" aria-hidden style={{ opacity: 0.6, marginLeft: "auto", flex: "none" }} />
    </div>
  );
}
