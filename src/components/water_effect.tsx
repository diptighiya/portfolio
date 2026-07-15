"use client";

import { useEffect, useRef } from "react";

/**
 * Layer 1 — subtle water shimmer.
 * Draws overlapping horizontal light bands whose vertical position and
 * horizontal offset wobble with two out-of-sync sine waves. Additive
 * blending in a faint #79b8ff gives a calm "light through water" feel.
 */
function WaterShimmer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const start = performance.now();
    let raf = 0;

    const BAND_COUNT = 10;
    const BAND_HEIGHT = 70;

    const loop = () => {
      const t = (performance.now() - start) / 1000;
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      for (let i = 0; i < BAND_COUNT; i++) {
        const wave1 = Math.sin(t * 0.3 + i * 0.9) * 30;
        const wave2 = Math.sin(t * 0.4 + i * 1.3) * 15;
        const centerY = ((i + 0.5) / BAND_COUNT) * h + wave1 + wave2;
        const wobbleX = Math.sin(t * 0.25 + i * 1.7) * 20;

        const grad = ctx.createLinearGradient(
          0,
          centerY - BAND_HEIGHT / 2,
          0,
          centerY + BAND_HEIGHT / 2
        );
        grad.addColorStop(0, "rgba(121, 184, 255, 0)");
        grad.addColorStop(0.5, "rgba(121, 184, 255, 0.045)");
        grad.addColorStop(1, "rgba(121, 184, 255, 0)");

        ctx.fillStyle = grad;
        ctx.fillRect(wobbleX, centerY - BAND_HEIGHT / 2, w, BAND_HEIGHT);
      }

      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 6,
      }}
    />
  );
}

/**
 * Layer 2 — caustic light ripples.
 * Ten circular rings expand outward and fade over 4–6s. Each ring resets
 * to a new random position when its lifetime ends, giving a staggered
 * flicker of golden light like sunlight refracting through moving water.
 */
function CausticRings() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    type Ring = {
      x: number;
      y: number;
      birth: number;
      life: number;
      maxR: number;
    };

    const RING_COUNT = 10;
    const spawn = (t: number): Ring => ({
      x: Math.random(),
      y: Math.random(),
      birth: t,
      life: 4 + Math.random() * 2,
      maxR: 90 + Math.random() * 140,
    });

    const start = performance.now() / 1000;
    // Stagger initial births in the past so rings don't all start at 0.
    const rings: Ring[] = Array.from({ length: RING_COUNT }, () => {
      const r = spawn(start);
      r.birth = start - Math.random() * 5;
      return r;
    });

    let raf = 0;

    const loop = () => {
      const t = performance.now() / 1000;
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      for (let i = 0; i < rings.length; i++) {
        const r = rings[i];
        const age = t - r.birth;
        if (age > r.life) {
          rings[i] = spawn(t);
          continue;
        }

        const progress = age / r.life;
        const radius = r.maxR * progress;
        // Sin curve → alpha rises then falls; peak alpha 0.15.
        const alpha = Math.sin(progress * Math.PI) * 0.15;
        const px = r.x * w;
        const py = r.y * h;

        // Main ring
        ctx.strokeStyle = `rgba(255, 166, 87, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Softer inner echo for depth
        ctx.strokeStyle = `rgba(255, 214, 170, ${alpha * 0.45})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0, radius - 5), 0, Math.PI * 2);
        ctx.stroke();
      }

      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 7,
      }}
    />
  );
}

export default function WaterEffect() {
  return (
    <>
      <WaterShimmer />
      <CausticRings />
    </>
  );
}
