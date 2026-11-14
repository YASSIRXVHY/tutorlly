'use client';

/**
 * The whiteboard — a school notebook page (ruled lines, red margin) you can
 * actually draw on: pointer + touch, four inks, three nib widths, eraser,
 * undo, clear, and a PNG export of the page. Everything on <canvas>.
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

interface Stroke {
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
}

const PAPER = "#f9f4e8";
const RULE = "rgba(26,21,15,0.12)";
const MARGIN = "rgba(201,57,27,0.55)";
const LINE_GAP = 28;

export const Whiteboard = forwardRef<
  WhiteboardHandle,
  {
    tool: WhiteboardTool;
    className?: string;
    initialStrokes?: StrokeSnapshot[];
    onStrokeEnd?: (count: number) => void;
  }
>(function Whiteboard({ tool, className, initialStrokes, onStrokeEnd }, ref) {
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
      // Ruled notebook lines + vermillion margin
      ctx.strokeStyle = RULE;
      ctx.lineWidth = 1;
      for (let y = LINE_GAP; y < h; y += LINE_GAP) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(w, y + 0.5);
        ctx.stroke();
      }
      ctx.strokeStyle = MARGIN;
      ctx.beginPath();
      ctx.moveTo(56.5, 0);
      ctx.lineTo(56.5, h);
      ctx.stroke();
      ctx.strokeStyle = MARGIN;
      ctx.beginPath();
      ctx.moveTo(0, 1.5);
      ctx.lineTo(w, 1.5);
      ctx.stroke();
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
      }
      drawingRef.current = null;
    };

    useImperativeHandle(ref, () => ({
      undo() {
        strokesRef.current.pop();
        redraw();
      },
      clear() {
        strokesRef.current = [];
        redraw();
      },
      download() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = "parla-whiteboard.png";
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
    }));

    return (
      <div className={cx("wbwrap", className)} ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="wbcanvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerUp}
          aria-label="Shared lesson whiteboard — draw with your pointer, finger or pen"
          role="img"
        />
      </div>
    );
  }
);

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  if (s.points.length === 1) {
    // A dot: make it round.
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
    // Slight smoothing: midpoints between samples.
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
