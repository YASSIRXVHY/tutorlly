'use client';

/** Star display, rating note, and the review-modal star picker. */
import type { ReactNode } from "react";
import { cx } from "../../utils/misc";

const STAR_PATH =
  "M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.05 1.1-6.5-4.7-4.6 6.5-.95L12 2.6z";

function Star({ on, size = 14 }: { on: boolean; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      className={cx(!on && "star--off")}
      fill="currentColor"
    >
      <path d={STAR_PATH} />
    </svg>
  );
}

interface StarsProps {
  value: number;
  size?: number;
  /** e.g. "4.9 · 1,204 reviews" */
  note?: ReactNode;
}

export function Stars({ value, size, note }: StarsProps) {
  const full = Math.round(value);
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} on={i <= full} size={size} />
      ))}
      {note != null && <span className="stars-note">{note}</span>}
    </span>
  );
}

/** Screen-reader-friendly text alternative for a star rating. */
export function StarsText({ value }: { value: number }) {
  return <span className="sr-only">{value.toFixed(1)} out of 5 stars</span>;
}

interface StarPickerProps {
  value: number;
  onChange: (v: number) => void;
}

export function StarPicker({ value, onChange }: StarPickerProps) {
  return (
    <div className="star-picker" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star${i > 1 ? "s" : ""}`}
          className={cx(i <= value && "star-on")}
          onClick={() => onChange(i)}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d={STAR_PATH} />
          </svg>
        </button>
      ))}
    </div>
  );
}
