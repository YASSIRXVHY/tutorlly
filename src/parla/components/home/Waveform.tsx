'use client';

/**
 * The live-lesson waveform — an animated oscilloscope trace on canvas:
 * seeded sines under a sound envelope, with a vermillion echo wave.
 * Reduced motion freezes a single honest frame.
 */
import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../../utils/misc";

export function Waveform({ height = 96 }: { height?: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = prefersReducedMotion();
    let raf = 0;
    const t0 = performance.now();

    const draw = (t: number) => {
      const dpr = window.devicePixelRatio || 1;
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const mid = h / 2;
      const time = t / 1000;

      // Edge tick marks — the time axis of a proper print diagram.
      ctx.strokeStyle = "rgba(26,21,15,0.35)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x += Math.max(40, w / 14)) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, mid - 5);
        ctx.lineTo(x + 0.5, mid + 5);
        ctx.stroke();
      }
      // Center axis
      ctx.strokeStyle = "rgba(26,21,15,0.22)";
      ctx.beginPath();
      ctx.moveTo(0, mid + 0.5);
      ctx.lineTo(w, mid + 0.5);
      ctx.stroke();

      const wave = (x: number, phase: number, spread: number) => {
        const env = Math.sin((x / w) * Math.PI); // loudest mid-frame
        const a = (h / 2.6) * env;
        return (
          Math.sin(x * 0.018 + phase * 1.6) * a * 0.72 +
          Math.sin(x * 0.041 - phase * 1.1) * a * 0.38 +
          Math.sin(x * 0.093 + phase * 2.3) * a * 0.16
        ) * spread;
      };

      const trace = (phase: number, spread: number, color: string, width: number, alpha: number) => {
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = width;
        ctx.lineJoin = "round";
        ctx.beginPath();
        for (let x = 0; x <= w; x += 2) {
          const y = mid + wave(x, phase, spread);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      };

      trace(time, 1, "#1a150f", 2.2, 0.92);
      trace(time * 0.72 + 1.7, 0.55, "#c9391b", 1.4, 0.8);

      if (!reduced) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    const ro = new ResizeObserver(() => draw(performance.now()));
    ro.observe(wrap);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="waveform" ref={wrapRef} style={{ height }}>
      <canvas ref={canvasRef} className="waveform-canvas" aria-hidden />
    </div>
  );
}
