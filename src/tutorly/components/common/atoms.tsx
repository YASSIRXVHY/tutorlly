'use client';

/**
 * Small shared atoms: empty states, spinners, section headings.
 * (The CSS classes live in styles/ui.css + styles/base.css.)
 */
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  children,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-mark">
        <Icon size={24} aria-hidden />
      </span>
      <strong className="empty-title">{title}</strong>
      {typeof children === "string" ? <p className="empty-text">{children}</p> : children}
      {actions ? <div className="empty-actions">{actions}</div> : null}
    </div>
  );
}

export function Spinner({ light = false, large = false, label }: { light?: boolean; large?: boolean; label?: string }) {
  return (
    <span
      className={cxSpin(light, large)}
      role="status"
      aria-label={label ?? "Loading"}
    />
  );
}

function cxSpin(light: boolean, large: boolean): string {
  return ["spinner", light && "spinner--light", large && "spinner--lg"]
    .filter(Boolean)
    .join(" ");
}

export function SectionHead({
  eyebrow,
  title,
  sub,
  action,
}: {
  eyebrow: string;
  title: string;
  sub?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="section-head">
      <div className="section-head-t">
        <span className="section-eyebrow">{eyebrow}</span>
        <h2 className="section-title">{title}</h2>
        {sub ? <p className="section-sub">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}
