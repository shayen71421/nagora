"use client";

import { useEffect, useRef } from "react";

export default function ParticleCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animId: number;
        type Particle = {
            x: number; y: number; vx: number; vy: number;
            size: number; color: string; life: number; maxLife: number;
        };
        const particles: Particle[] = [];
        const colors = ["#ff8c00", "#ffb800", "#ffe44a", "#4a9bcc", "#7abfea", "#ff4400"];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        let frame = 0;
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            frame++;

            if (frame % 4 === 0) {
                const maxLife = 100 + Math.random() * 160;
                particles.push({
                    x: Math.random() * canvas.width,
                    y: canvas.height + 10,
                    vx: (Math.random() - 0.5) * 0.9,
                    vy: -(0.5 + Math.random() * 1.5),
                    size: 0.8 + Math.random() * 2,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    life: 0,
                    maxLife,
                });
            }

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.life++;
                p.x += p.vx;
                p.y += p.vy;
                const t = p.life / p.maxLife;
                const alpha =
                    t < 0.15 ? t / 0.15 : t > 0.65 ? 1 - (t - 0.65) / 0.35 : 1;
                if (p.life >= p.maxLife) { particles.splice(i, 1); continue; }

                ctx.save();
                ctx.globalAlpha = alpha * 0.75;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 10;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            animId = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener("resize", resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 0,
                pointerEvents: "none",
            }}
        />
    );
}
