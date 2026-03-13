"use client";

import { useEffect, useState } from "react";

const NAV_LINKS = [
    { href: "#features", label: "Features" },
    { href: "#stats", label: "Stats" },
    { href: "#events", label: "Events" },
    { href: "#about", label: "About" },
];

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const fn = () => setScrolled(window.scrollY > 50);
        window.addEventListener("scroll", fn);
        return () => window.removeEventListener("scroll", fn);
    }, []);

    return (
        <nav
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                zIndex: 100,
                background: scrolled ? "rgba(4,5,15,0.92)" : "transparent",
                backdropFilter: scrolled ? "blur(20px)" : "none",
                borderBottom: scrolled
                    ? "1px solid rgba(255,140,0,0.15)"
                    : "1px solid transparent",
                transition: "all 0.4s ease",
            }}
        >
            <div
                style={{
                    maxWidth: "1280px",
                    margin: "0 auto",
                    padding: "0 32px",
                    height: "72px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                {/* Logo */}
                <a
                    href="#"
                    style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}
                >
                    <div
                        style={{
                            width: "36px",
                            height: "36px",
                            background: "linear-gradient(135deg, #ff8c00, #ffb800)",
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.1rem",
                            boxShadow: "0 0 20px rgba(255,140,0,0.5)",
                        }}
                    >
                        ⚡
                    </div>
                    <span
                        style={{
                            fontFamily: "var(--font-cinzel-decorative), serif",
                            fontSize: "1.2rem",
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            background: "linear-gradient(90deg, #ff8c00, #ffb800, #ddeeff)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                        }}
                    >
                        NAGORA
                    </span>
                </a>

                {/* Desktop nav links */}
                <div
                    className="desktop-nav"
                    style={{ display: "flex", alignItems: "center", gap: "36px" }}
                >
                    {NAV_LINKS.map(({ href, label }) => (
                        <a key={href} href={href} className="nav-link">
                            {label}
                        </a>
                    ))}
                    <a
                        href="#register"
                        className="btn-fire"
                        style={{ padding: "9px 24px", fontSize: "0.7rem" }}
                    >
                        Enter the Agora
                    </a>
                </div>

                {/* Mobile hamburger (shown via CSS) */}
                <button
                    className="mobile-menu-btn"
                    style={{
                        display: "none",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#ff8c00",
                        fontSize: "1.5rem",
                    }}
                    aria-label="Open menu"
                >
                    ☰
                </button>
            </div>
        </nav>
    );
}
