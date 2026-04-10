"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AudioWaveformProps {
  level: number; // 0-100
  className?: string;
}

export function AudioWaveform({ level, className }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderedLevelRef = useRef(0);
  const targetLevelRef = useRef(0);
  const phaseRef = useRef(0);
  const animRef = useRef<number>(0);

  // Update target level via ref — no effect restart
  targetLevelRef.current = level / 100;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const draw = () => {
      // Smooth level transition — reads from ref, no re-render needed
      renderedLevelRef.current +=
        (targetLevelRef.current - renderedLevelRef.current) * 0.08;
      const amp = renderedLevelRef.current;

      // Advance phase for continuous motion
      phaseRef.current += 0.04;
      const phase = phaseRef.current;

      ctx.clearRect(0, 0, w, h);

      const mid = h / 2;
      const maxAmp = h * 0.38;
      // Minimum idle amplitude so it's never flat
      const effectiveAmp = Math.max(amp, 0.04);

      // Wave layers: frequency, phase offset, opacity, color
      const layers = [
        { freq: 0.02, offset: 0, opacity: 0.12, color: "oklch(0.80 0.12 75)" },
        { freq: 0.015, offset: 2, opacity: 0.2, color: "oklch(0.65 0.12 220)" },
        { freq: 0.025, offset: 4, opacity: 0.5, color: "oklch(0.65 0.12 220)" },
      ];

      for (const layer of layers) {
        ctx.beginPath();
        ctx.moveTo(0, mid);

        for (let x = 0; x <= w; x += 2) {
          const y =
            mid +
            Math.sin(x * layer.freq + phase + layer.offset) *
              maxAmp *
              effectiveAmp *
              (0.6 + 0.4 * Math.sin(x * 0.005 + phase * 0.7));
          ctx.lineTo(x, y);
        }

        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();

        ctx.fillStyle = layer.color;
        ctx.globalAlpha = layer.opacity;
        ctx.fill();
      }

      // Top stroke for crisp edge
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, mid);
      for (let x = 0; x <= w; x += 2) {
        const y =
          mid +
          Math.sin(x * 0.025 + phase + 4) *
            maxAmp *
            effectiveAmp *
            (0.6 + 0.4 * Math.sin(x * 0.005 + phase * 0.7));
        ctx.lineTo(x, y);
      }

      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "oklch(0.65 0.12 220)");
      grad.addColorStop(1, "oklch(0.80 0.12 75)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      observer.disconnect();
    };
  }, []); // runs once — level updates via ref

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Audio level"
      className={cn("w-full h-20 rounded-2xl", className)}
    />
  );
}
