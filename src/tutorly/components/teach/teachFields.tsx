'use client';

/**
 * Small shared pieces for the teaching-application wizard: a labelled
 * field wrapper with error slot, a live character counter, and the
 * toggleable chip used for subjects and specialties.
 */
import type { ReactNode } from "react";
import { cx } from "../../utils/misc";

export function FieldRow({
  id,
  label,
  required = false,
  error,
  hint,
  children,
  full = false,
}: {
  /** The id of the control this label points at. */
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <div className={cx("field", error && "field--error", full && "field--full")}>
      <label className="field-label" htmlFor={id}>
        {label} {required ? <span className="field-req" aria-hidden>*</span> : null}
      </label>
      {children}
      {error ? (
        <span className="field-error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </div>
  );
}

export function CharCount({
  value,
  min,
  max,
}: {
  value: number;
  min?: number;
  max: number;
}) {
  const over = value > max;
  const ok = min !== undefined ? value >= min && !over : !over;
  return (
    <span
      className={cx("teach-counter", over && "teach-counter--over", ok && "teach-counter--ok")}
      aria-hidden
    >
      <span>
        {min !== undefined ? `min ${min} · ` : ""}
        {value}/{max}
      </span>
    </span>
  );
}

export function ChipToggle({
  on,
  onToggle,
  disabled = false,
  children,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
  children: ReactNode;
  /** Full aria description, e.g. "Algebra — selected". */
  label: string;
}) {
  return (
    <button
      type="button"
      className={cx("teach-chip", on && "teach-chip--on")}
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={on}
      aria-label={label}
    >
      {children}
    </button>
  );
}
