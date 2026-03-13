"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

export default function StatueHero() {
    const statueRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = statueRef.current;
        if (!el) return;

        let tiltX = 0, tiltY = 0, rafId: number;
        let targetX = 0, targetY = 0;

        const handleMove = (e: MouseEvent) => {
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;
            targetX = ((e.clientY - cy) / cy) * -14;
            targetY = ((e.clientX - cx) / cx) * 14;
        };

        const render = () => {
            // Smooth lerp
            tiltX += (targetX - tiltX) * 0.06;
            tiltY += (targetY - tiltY) * 0.06;
            if (el) {
                el.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
            }
            rafId = requestAnimationFrame(render);
        };

        window.addEventListener("mousemove", handleMove);
        render();
        return () => {
            window.removeEventListener("mousemove", handleMove);
            cancelAnimationFrame(rafId);
        };
    }, []);

    return (
        <div
            style={{
                position: "relative",
                width: "min(500px, 90vw)",
                height: "min(600px, 80vw)",
                flexShrink: 0,
            }}
        >
            {/* Outer halo ambient glow */}
            <div
                style={{
                    position: "absolute",
                    top: "50%", left: "50%",
                    width: "420px", height: "420px",
                    borderRadius: "50%",
                    transform: "translate(-50%, -54%)",
                    background:
                        "radial-gradient(circle, rgba(255,140,0,0.18) 0%, rgba(255,184,0,0.08) 40%, transparent 70%)",
                    filter: "blur(22px)",
                    animation: "halo-pulse 4s ease-in-out infinite",
                    pointerEvents: "none",
                    zIndex: 0,
                }}
            />

            {/* Spinning outer dashed ring */}
            <div
                style={{
                    position: "absolute",
                    top: "42%", left: "50%",
                    width: "390px", height: "390px",
                    borderRadius: "50%",
                    border: "1.5px dashed rgba(255,140,0,0.2)",
                    transform: "translate(-50%, -50%)",
                    animation: "halo-ring-spin 20s linear infinite",
                    pointerEvents: "none",
                    zIndex: 0,
                }}
            />

            {/* Inner counter-rotating ring */}
            <div
                style={{
                    position: "absolute",
                    top: "42%", left: "50%",
                    width: "340px", height: "340px",
                    borderRadius: "50%",
                    border: "1px solid rgba(74,155,204,0.18)",
                    transform: "translate(-50%, -50%)",
                    animation: "halo-ring-spin 14s linear infinite reverse",
                    pointerEvents: "none",
                    zIndex: 0,
                }}
            />

            {/* Orbiting dots */}
            {[
                { deg: 0, color: "#ff8c00", dur: "14s" },
                { deg: 90, color: "#4a9bcc", dur: "18s" },
                { deg: 180, color: "#ffb800", dur: "14s" },
                { deg: 270, color: "#7abfea", dur: "18s" },
            ].map(({ deg, color, dur }, i) => (
                <div
                    key={i}
                    style={{
                        position: "absolute",
                        top: "42%", left: "50%",
                        width: "9px", height: "9px",
                        borderRadius: "50%",
                        background: color,
                        boxShadow: `0 0 14px ${color}, 0 0 28px ${color}88`,
                        transform: `translate(-50%, -50%) rotate(${deg}deg) translateX(195px)`,
                        animation: `halo-ring-spin ${dur} linear infinite`,
                        zIndex: 2,
                    }}
                />
            ))}

            {/* Statue — 3D mouse tilt */}
            <div
                ref={statueRef}
                style={{
                    position: "relative",
                    zIndex: 3,
                    width: "100%",
                    height: "100%",
                    willChange: "transform",
                    animation: "float-statue 6s ease-in-out infinite",
                    filter:
                        "drop-shadow(0 30px 60px rgba(255,140,0,0.35)) drop-shadow(0 -10px 40px rgba(74,155,204,0.2))",
                }}
            >
                <Image
                    src="/a.png"
                    alt="Nagora — Greek God Mascot"
                    fill
                    priority
                    style={{ objectFit: "contain", objectPosition: "center bottom" }}
                />
            </div>

            {/* Ground shadow ellipse */}
            <div
                style={{
                    position: "absolute",
                    bottom: "-10px", left: "50%",
                    transform: "translateX(-50%)",
                    width: "55%", height: "28px",
                    background:
                        "radial-gradient(ellipse, rgba(255,140,0,0.28) 0%, transparent 70%)",
                    filter: "blur(10px)",
                    zIndex: 1,
                }}
            />
        </div>
    );
}
