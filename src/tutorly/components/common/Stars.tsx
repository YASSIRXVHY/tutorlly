'use client';

/** Star rating display — full, half and empty stars, optional review count. */
import { Star } from "lucide-react";
import { cx } from "../../utils/misc";

export function Stars({
  rating,
  size = 13,
  count,
  className,
}: {
  rating: number;
  size?: number;
  /** Review count appended as "(214)" in mono. */
  count?: number;
  className?: string;
}) {
  const full = Math.floor(rating);
  const frac = rating - full;
  const showHalf = frac >= 0.25 && frac < 0.75;
  const ceil = frac >= 0.75 ? full + 1 : full;
  return (
    <span className={cx("stars", className)} title={`${rating.toFixed(1)} out of 5`}>
      <span className="stars-row" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => {
          const filled = i < ceil || (i === full && showHalf);
          const half = i === full && showHalf;
          return (
            <span
              key={i}
              className="star"
              style={{ width: size, height: size, display: "inline-flex" }}
            >
              <Star
                size={size}
                strokeWidth={0}
                fill="none"
                style={{ color: "var(--line-2)", position: half ? "absolute" : undefined }}
              />
              {half ? (
                <Star
                  size={size}
                  strokeWidth={0}
                  fill="currentColor"
                  style={{ clipPath: "inset(0 50% 0 0)" }}
                />
              ) : filled ? (
                <Star size={size} strokeWidth={0} fill="currentColor" />
              ) : null}
            </span>
          );
        })}
      </span>
      <span className="num stars-val">{rating.toFixed(1)}</span>
      {typeof count === "number" ? (
        <span className="stars-count num">({count.toLocaleString("en-US")})</span>
      ) : null}
    </span>
  );
}
