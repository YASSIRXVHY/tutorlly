'use client';

/**
 * The whiteboard — a clean shared canvas both sides can draw on with mouse,
 * finger or stylus: pointer events, four inks, three nib widths, eraser,
 * undo, clear, PNG export — and full P2P sync (strokes broadcast as they
 * finish; remote strokes arrive and render live).
 */
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { cx } from "../../utils/misc";

export interface WhiteboardTool {
  color: string;
  width: number;
  eraser: boolean;
}

export interface Stroke {
  color: string;
  width: number;
  points: Array<{ x: number; y: number }>;
}

export type StrokeSnapshot = Stroke;

export interface WhiteboardHandle {
  undo: () => void;
  clear: () => void;
  download: () => void;
  strokeCount: () => number;
  snapshot: () => StrokeSnapshot[];
  restore: (strokes: StrokeSnapshot[]) => void;
  /** Appends a stroke received from the far side of the call. */
  addRemoteStroke: (s: Stroke) => void;
  /** Removes the most recent stroke (remote undo). */
  popLast: () => void;
}

const PAPER = "#ffffff";
const DOT = "rgba(28, 43, 36, 0.16)";
const DOT_GAP = 26;

export const Whiteboard = forwardRef<
  WhiteboardHandle,
  {
    tool: WhiteboardTool;
    className?: string;
    initialStrokes?: StrokeSnapshot[];
    onStrokeEnd?: (count: number) => void;
    /** Fired when a LOCAL stroke completes — the sync hook broadcasts it. */
    onLocalStroke?: (s: Stroke) => void;
    onLocalClear?: () => void;
    onLocalUndo?: () => void;
    ariaLabel?: string;
  }
>(function Whiteboard(
  { tool, className, initialStrokes, onStrokeEnd, onLocalStroke, onLocalClear, onLocalUndo, ariaLabel },
  ref
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const drawingRef = useRef<Stroke | null>(null);

  const redraw = () => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, w, h);
    // Quiet dot grid — a whiteboard, not a notebook.
    ctx.fillStyle = DOT;
    for (let y = DOT_GAP / 2; y < h; y += DOT_GAP) {
      for (let x = DOT_GAP / 2; x < w; x += DOT_GAP) {
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
    for (const s of strokesRef.current) drawStroke(ctx, s);
    if (drawingRef.current) drawStroke(ctx, drawingRef.current);
  };

  useEffect(() => {
    if (initialStrokes && initialStrokes.length > 0) {
      strokesRef.current = initialStrokes.map((s) => ({
        ...s,
        points: s.points.map((p) => ({ ...p })),
      }));
    }
    redraw();
    const wrap = wrapRef.current;
    if (!wrap || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => redraw());
    ro.observe(wrap);
    return () => ro.disconnect();
     
  }, []);

  const pos = (e: PointerEvent | React.PointerEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    drawingRef.current = {
      color: tool.eraser ? PAPER : tool.color,
      width: tool.eraser ? Math.max(tool.width * 3.5, 18) : tool.width,
      points: [pos(e)],
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const current = drawingRef.current;
    if (!current) return;
    e.preventDefault();
    const p = pos(e);
    const last = current.points[current.points.length - 1];
    current.points.push(p);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = current.color;
      ctx.lineWidth = current.width;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  };

  const onPointerUp = () => {
    const current = drawingRef.current;
    if (current && current.points.length > 0) {
      strokesRef.current.push(current);
      onStrokeEnd?.(strokesRef.current.length);
      onLocalStroke?.({
        color: current.color,
        width: current.width,
        points: current.points.map((p) => ({ ...p })),
      });
    }
    drawingRef.current = null;
  };

  useImperativeHandle(ref, () => ({
    undo() {
      strokesRef.current.pop();
      redraw();
      onLocalUndo?.();
    },
    clear() {
      strokesRef.current = [];
      redraw();
      onLocalClear?.();
    },
    download() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "tutorly-whiteboard.png";
      a.click();
    },
    strokeCount() {
      return strokesRef.current.length;
    },
    snapshot() {
      return strokesRef.current.map((s) => ({ ...s, points: s.points.map((p) => ({ ...p })) }));
    },
    restore(next: StrokeSnapshot[]) {
      strokesRef.current = next.map((s) => ({ ...s, points: s.points.map((p) => ({ ...p })) }));
      redraw();
    },
    addRemoteStroke(s: Stroke) {
      strokesRef.current.push({ ...s, points: (s.points ?? []).map((p) => ({ ...p })) });
      redraw();
    },
    popLast() {
      strokesRef.current.pop();
      redraw();
    },
  }));

  return (
    <div className={cx("cl-board-wrap", className)} ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="cl-board-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
        aria-label={ariaLabel ?? "Shared lesson whiteboard — draw with your pointer, finger or pen; the far side sees every stroke"}
        role="img"
      />
    </div>
  );
});

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  if (!s.points || s.points.length === 0) return;
  if (s.points.length === 1) {
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.points[0].x, s.points[0].y, s.width / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.width;
  ctx.beginPath();
  ctx.moveTo(s.points[0].x, s.points[0].y);
  for (let i = 1; i < s.points.length; i++) {
    const mid = {
      x: (s.points[i - 1].x + s.points[i].x) / 2,
      y: (s.points[i - 1].y + s.points[i].y) / 2,
    };
    ctx.quadraticCurveTo(s.points[i - 1].x, s.points[i - 1].y, mid.x, mid.y);
  }
  const last = s.points[s.points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
}
