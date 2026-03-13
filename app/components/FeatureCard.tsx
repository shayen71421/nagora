"use client";

import { useState } from "react";

interface FeatureCardProps {
    icon: string;
    title: string;
    desc: string;
    accentFire?: boolean;
    delay?: string;
}

export default function FeatureCard({
    icon,
    title,
    desc,
    accentFire = true,
    delay = "0s",
}: FeatureCardProps) {
    const [hov, setHov] = useState(false);
    const accent = accentFire ? "#ff8c00" : "#4a9bcc";

    return (
        <div
            className="glass-card"
            style={{
                padding: "30px 26px",
                borderColor: hov ? `${accent}44` : "rgba(255,140,0,0.12)",
                boxShadow: hov
                    ? `0 20px 50px ${accent}1a, 0 0 1px ${accent}55`
                    : "none",
                transition: `all 0.4s ease ${hov ? "0s" : delay}`,
                cursor: "default",
            }}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
        >
            {/* Icon block */}
            <div
                style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "12px",
                    background: `linear-gradient(135deg, ${accent}22, ${accent}08)`,
                    border: `1px solid ${accent}33`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                    marginBottom: "18px",
                    boxShadow: hov ? `0 0 20px ${accent}44` : "none",
                    transition: "box-shadow 0.4s ease",
                }}
            >
                {icon}
            </div>

            {/* Title */}
            <h3
                style={{
                    fontFamily: "var(--font-cinzel), serif",
                    fontSize: "0.92rem",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    color: accent,
                    marginBottom: "10px",
                    textShadow: hov ? `0 0 10px ${accent}88` : "none",
                    transition: "text-shadow 0.4s ease",
                }}
            >
                {title}
            </h3>

            {/* Description */}
            <p
                style={{
                    fontSize: "0.875rem",
                    color: "rgba(221,238,255,0.6)",
                    lineHeight: 1.75,
                }}
            >
                {desc}
            </p>

            {/* Corner accent */}
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: "50px",
                    height: "50px",
                    background: `linear-gradient(225deg, ${accent}18, transparent)`,
                    borderRadius: "0 16px 0 0",
                }}
            />
        </div>
    );
}
