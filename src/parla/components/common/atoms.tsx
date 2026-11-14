'use client';

/** Skeletons, empty states, the generated barcode, and small atoms. */
import type { ReactNode } from "react";
import { rng } from "../../utils/rng";

/* ---------------- Skeletons ---------------- */

export function SkelLine({ w = "100%", h = 12 }: { w?: string | number; h?: number }) {
  return <span className="skel" style={{ display: "block", width: w, height: h }} aria-hidden />;
}

export function SkelBlock({ h = 80 }: { h?: number }) {
  return <span className="skel" style={{ display: "block", width: "100%", height: h }} aria-hidden />;
}

/** A skeleton tutor card used while "the edition is being typeset". */
export function SkelTutorCard() {
  return (
    <article className="tutorcard skel-card" aria-hidden>
      <div className="tutorcard-media">
        <span className="skel" style={{ position: "absolute", inset: 0 }} />
      </div>
      <div className="tutorcard-body">
        <SkelLine w="62%" h={18} />
        <SkelLine w="40%" h={10} />
        <SkelLine w="50%" h={10} />
        <div style={{ height: 10 }} />
        <SkelLine w="80%" h={10} />
      </div>
    </article>
  );
}

/* ---------------- Empty state ---------------- */

interface EmptyStateProps {
  mark: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ mark, title, children, action }: EmptyStateProps) {
  return (
    <div className="emptystate">
      <span className="emptystate-mark">{mark}</span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

/* ---------------- Barcode — deterministic per ticket ---------------- */

export function Barcode({ value, height = 44 }: { value: string; height?: number }) {
  const rects = buildBars(value);
  return (
    <svg
      className="barcode"
      viewBox={`0 0 ${rects.total} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Barcode for ticket ${value}`}
    >
      {rects.bars.map((b, i) => (
        <rect key={i} x={b.x} y={2} width={b.w} height={height - 4} fill="var(--ink)" />
      ))}
    </svg>
  );
}

function buildBars(value: string): { bars: Array<{ x: number; w: number }>; total: number } {
  const r = rng(value, "barcode");
  const bars: Array<{ x: number; w: number }> = [];
  let x = r.int(0, 2);
  const end = 118;
  while (x < end) {
    const w = r.int(1, 4);
    bars.push({ x, w });
    x += w + r.int(1, 3);
  }
  // Guard bars — the tall markers at both ends, like a real EAN stub.
  bars.unshift({ x: 0, w: 2 });
  return { bars, total: Math.max(end, x) + 4 };
}
