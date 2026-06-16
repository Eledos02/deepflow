"use client";

import { useEffect, useRef } from "react";

type PointerState = {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  strength: number;
  targetStrength: number;
};

const lineCount = 11;
const maxPixelRatio = 1.5;

function getReducedMotionPreference() {
  return window.matchMedia("(prefers-reduced-motion: reduce)");
}

function drawBrainwaves(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  pointer: PointerState,
  reducedMotion: boolean,
) {
  context.clearRect(0, 0, width, height);
  context.lineCap = "round";
  context.lineJoin = "round";

  const centerY = height * 0.52;
  const verticalSpread = Math.min(240, height * 0.52);
  const cursorRadius = Math.max(170, Math.min(width, height) * 0.28);

  for (let index = 0; index < lineCount; index += 1) {
    const progress = index / (lineCount - 1);
    const baseY = centerY + (progress - 0.5) * verticalSpread;
    const amplitude = 7 + Math.sin(index * 1.7) * 2.4;
    const frequency = 0.012 + index * 0.00065;
    const phase = reducedMotion ? index * 0.58 : time * (0.00028 + index * 0.000018) + index * 0.58;

    context.beginPath();

    for (let x = -24; x <= width + 24; x += 10) {
      const wave =
        Math.sin(x * frequency + phase) * amplitude +
        Math.sin(x * frequency * 0.47 - phase * 0.72) * (amplitude * 0.55);
      const distanceX = x - pointer.x;
      const distanceY = baseY - pointer.y;
      const distance = Math.hypot(distanceX, distanceY);
      const influence =
        pointer.strength *
        Math.max(0, 1 - distance / cursorRadius) ** 2;
      const ripple =
        influence *
        Math.sin(distance * 0.045 - time * 0.004) *
        (18 + index * 0.9);
      const lift = influence * distanceY * -0.12;
      const y = baseY + wave + ripple + lift;

      if (x === -24) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }

    const alpha = 0.09 + (1 - Math.abs(progress - 0.5) * 2) * 0.09;
    context.strokeStyle =
      index % 3 === 0
        ? `rgba(142, 170, 88, ${alpha + 0.03})`
        : `rgba(19, 32, 25, ${alpha})`;
    context.lineWidth = index % 3 === 0 ? 1.05 : 0.85;
    context.stroke();
  }
}

export function InteractiveBrainwaveBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const reducedMotionQuery = getReducedMotionPreference();
    let reducedMotion = reducedMotionQuery.matches;
    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    const pointer: PointerState = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      strength: 0,
      targetStrength: 0,
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      pixelRatio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      pointer.x = width * 0.5;
      pointer.y = height * 0.5;
      pointer.targetX = pointer.x;
      pointer.targetY = pointer.y;
      drawBrainwaves(context, width, height, 0, pointer, reducedMotion);
    };

    const animate = (time: number) => {
      pointer.x += (pointer.targetX - pointer.x) * 0.08;
      pointer.y += (pointer.targetY - pointer.y) * 0.08;
      pointer.strength +=
        (pointer.targetStrength - pointer.strength) * 0.075;
      drawBrainwaves(context, width, height, time, pointer, reducedMotion);
      animationFrame = window.requestAnimationFrame(animate);
    };

    const startAnimation = () => {
      window.cancelAnimationFrame(animationFrame);
      if (reducedMotion) {
        drawBrainwaves(context, width, height, 0, pointer, true);
        return;
      }

      animationFrame = window.requestAnimationFrame(animate);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (reducedMotion) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const isInside =
        x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;

      if (isInside) {
        pointer.targetX = x;
        pointer.targetY = y;
        pointer.targetStrength = 1;
      } else {
        pointer.targetStrength = 0;
      }
    };

    const handleMotionPreference = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      startAnimation();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    reducedMotionQuery.addEventListener("change", handleMotionPreference);

    resize();
    startAnimation();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      reducedMotionQuery.removeEventListener("change", handleMotionPreference);
    };
  }, []);

  return (
    <canvas
      aria-hidden="true"
      className="interactive-brainwave"
      ref={canvasRef}
    />
  );
}
