"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type Phase = "loading" | "entering" | "ready";

/* ─────────────────────────────────────────────────
   PARTICLE CANVAS
───────────────────────────────────────────────── */
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    type P = { x: number; y: number; vx: number; vy: number; size: number; color: string; life: number; max: number };
    const particles: P[] = [];
    const bullCols = ["#00ff66", "#00cc88", "#ccff00"];
    const horseCols = ["#ff6600", "#ff8c00", "#ffaa44"];

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    let f = 0;
    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      f++;

      // Spawn Bull particles (Left)
      if (f % 3 === 0) {
        for (let i = 0; i < 2; i++) {
          const max = 300 + Math.random() * 400;
          particles.push({
            x: Math.random() * (canvas.width * 0.35),
            y: canvas.height + 10,
            vx: (Math.random() - 0.2) * 1.2,
            vy: -(1.2 + Math.random() * 3.0),
            size: 0.8 + Math.random() * 3,
            color: bullCols[Math.floor(Math.random() * bullCols.length)],
            life: 0,
            max
          });
        }
      }

      // Spawn Horse particles (Right)
      if (f % 3 === 1) {
        for (let i = 0; i < 2; i++) {
          const max = 300 + Math.random() * 400;
          particles.push({
            x: canvas.width - (Math.random() * (canvas.width * 0.35)),
            y: canvas.height + 10,
            vx: (Math.random() - 0.8) * 1.2,
            vy: -(1.2 + Math.random() * 3.0),
            size: 0.8 + Math.random() * 3,
            color: horseCols[Math.floor(Math.random() * horseCols.length)],
            life: 0,
            max
          });
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.life++; p.x += p.vx; p.y += p.vy;
        const t = p.life / p.max;
        const a = t < .15 ? t / .15 : t > .7 ? 1 - (t - .7) / .3 : 1;
        if (p.life >= p.max) { particles.splice(i, 1); continue; }
        ctx.save(); ctx.globalAlpha = a * .6; ctx.shadowColor = p.color; ctx.shadowBlur = 10;
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      animId = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none" }} />;
}

/* ─────────────────────────────────────────────────
   ROLE CARD
───────────────────────────────────────────────── */
function RoleCard({ label, accentColor, borderColor, delay }: {
  label: string;
  accentColor: string; borderColor: string; delay: string;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      className="role-card"
      style={{
        "--card-grad": `linear-gradient(135deg, ${accentColor}14, transparent)`,
        "--card-border": `linear-gradient(135deg, ${accentColor}55, ${accentColor}15)`,
        boxShadow: hov
          ? `0 24px 60px ${accentColor}22, 0 0 0 1px ${accentColor}33`
          : `0 0 0 1px ${borderColor}`,
        animation: `scale-up 0.7s ease ${delay} both`,
      } as React.CSSProperties}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div className="role-card-border" style={{ "--card-border": `linear-gradient(135deg, ${accentColor}55, ${accentColor}15)` } as React.CSSProperties} />
      <div style={{ position: "absolute", top: 0, left: "20%", width: "60%", height: "2px", background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`, boxShadow: hov ? `0 0 20px ${accentColor}` : "none", transition: "box-shadow 0.4s ease" }} />
      <div style={{ fontFamily: "var(--font-cinzel), serif", fontSize: "1rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: accentColor, textShadow: hov ? `0 0 15px ${accentColor}88` : "none", transition: "text-shadow 0.4s ease", textAlign: "center" }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-cinzel), serif", fontSize: "0.7rem", letterSpacing: "0.2em", color: accentColor, opacity: hov ? 1 : 0, transform: hov ? "translateY(0)" : "translateY(4px)", transition: "all 0.3s ease", textTransform: "uppercase" }}>
        Enter →
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────── */
export default function Home() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [loadProgress, setLoadProgress] = useState(0);

  /* ── Simplified loading progress ── */
  useEffect(() => {
    if (phase !== "loading") return;

    let prog = 0;
    const interval = setInterval(() => {
      prog += Math.random() * 10 + 5;
      if (prog >= 100) {
        prog = 100;
        setLoadProgress(100);
        clearInterval(interval);
        setTimeout(() => {
          setPhase("entering");
          setTimeout(() => setPhase("ready"), 800);
        }, 600);
      } else {
        setLoadProgress(prog);
      }
    }, 150);

    return () => clearInterval(interval);
  }, [phase]);

  const showContent = phase === "entering" || phase === "ready";

  return (
    <>
      {/* ── Ambient BG (always) ── */}
      <div aria-hidden style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: `
          radial-gradient(ellipse 100% 60% at 50% -5%,  rgba(255,102,0,0.09) 0%, transparent 55%),
          radial-gradient(ellipse 70%  50% at 10% 90%,  rgba(68,136,255,0.08) 0%, transparent 55%),
          radial-gradient(ellipse 70%  50% at 90% 90%,  rgba(255,68,0,0.07)   0%, transparent 55%),
          #040610
        `,
      }} />

      <ParticleCanvas />

      {/* ═══════════════════════════════════════════
          LOADING SCREEN — Clean & Fast
      ═══════════════════════════════════════════ */}
      {phase === "loading" && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "#040610",
        }}>
          {/* Loading content overlay */}
          <div style={{
            position: "relative", zIndex: 10,
            display: "flex", flexDirection: "column",
            alignItems: "center", gap: "28px",
          }}>
            {/* Statue Icon */}
            <div style={{ position: "relative", width: "100px", height: "100px", animation: "float-slow 4s ease-in-out infinite" }}>
              <Image src="/a.png" alt="" fill style={{ objectFit: "contain", opacity: 0.9 }} />
            </div>

            {/* Brand */}
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontFamily: "var(--font-cinzel-decorative), serif",
                fontSize: "2.4rem", fontWeight: 900, letterSpacing: "0.15em",
                background: "linear-gradient(90deg, #ff6600, #ff8c00, #ffcc44, #ff8c00, #ff6600)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                animation: "shimmer-fire 3s linear infinite",
              }}>NAGORA</div>
              <div style={{
                fontFamily: "var(--font-cinzel), serif",
                fontSize: "0.65rem", letterSpacing: "0.35em",
                color: "rgba(68,136,255,0.75)", marginTop: "6px", textTransform: "uppercase",
              }}>Sahasra TechFest 2026</div>
            </div>

            {/* Animated loading bar */}
            <div style={{ width: "220px" }}>
              <div style={{
                height: "2px", background: "rgba(255,255,255,0.08)",
                borderRadius: "1px", overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", width: `${loadProgress}%`,
                  background: "linear-gradient(90deg, #ff6600, #ff8c00, #ffcc44)",
                  boxShadow: "0 0 10px #ff8c00",
                  borderRadius: "1px",
                  transition: "width 0.2s ease",
                }} />
              </div>
              <div style={{
                fontFamily: "var(--font-cinzel), serif",
                fontSize: "0.58rem", letterSpacing: "0.22em",
                color: "rgba(216,232,255,0.3)", textAlign: "center",
                marginTop: "12px", textTransform: "uppercase",
              }}>
                The Oracle is Awakening…
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ═══════════════════════════════════════════
          MAIN CONTENT — revealed after video ends
      ═══════════════════════════════════════════ */}
      {showContent && (
        <main style={{
          position: "relative", zIndex: 2, minHeight: "100vh",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "60px 24px 80px",
          animation: "content-enter 1s ease both",
        }}>
          {/* Top neon border */}
          <div style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "2px",
            background: "linear-gradient(90deg, transparent, #ff6600 30%, #ff8c00 50%, #4488ff 70%, transparent)",
            boxShadow: "0 0 20px #ff6600", zIndex: 10,
          }} />

          {/* ── Hero text ── */}
          <div style={{ textAlign: "center", maxWidth: "780px", marginBottom: "56px" }}>
            {/* Badge */}


            {/* Title */}
            <h1 style={{
              fontFamily: "var(--font-cinzel-decorative), serif",
              fontSize: "clamp(3.5rem, 11vw, 8rem)",
              fontWeight: 900, lineHeight: 1, letterSpacing: "0.06em",
              marginBottom: "16px",
              animation: "slide-up-reveal 0.9s ease 0.25s both",
            }}>
              <span className="gradient-fire">NAGORA</span>
            </h1>

            {/* Tagline */}
            <div style={{
              fontFamily: "var(--font-cinzel), serif",
              fontSize: "clamp(0.75rem, 2vw, 0.95rem)",
              letterSpacing: "0.4em", textTransform: "uppercase",
              color: "rgba(68,136,255,0.65)", marginBottom: "24px",
              animation: "slide-up-reveal 0.8s ease 0.4s both",
            }}>✦ &nbsp;Finance of the Gods&nbsp; ✦</div>



            {/* Divider */}
            <div className="divider" style={{ marginBottom: "44px", animation: "fade-in 1s ease 0.65s both" }} />

            {/* Role selector label */}
            <div style={{
              fontFamily: "var(--font-cinzel), serif",
              fontSize: "0.7rem", letterSpacing: "0.3em",
              textTransform: "uppercase", color: "rgba(216,232,255,0.3)",
              marginBottom: "24px",
              animation: "fade-in 0.8s ease 0.75s both",
            }}>
              Choose your role to continue
            </div>

            {/* ── Role Cards ── */}
            <div className="roles-grid" style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "16px",
              maxWidth: "600px",
              margin: "0 auto",
            }}>
              <RoleCard
                label="Student"
                accentColor="#0099ffff" borderColor="rgba(0, 153, 255, 0.15)" delay="0.8s"
              />
              <RoleCard
                label="Class Rep"
                accentColor="#ff8c00" borderColor="rgba(255,140,0,0.15)" delay="0.95s"
              />
              <RoleCard
                label="Dept Rep"
                accentColor="#00ff66" borderColor="rgba(0,255,102,0.15)" delay="1.1s"
              />
            </div>

          </div>

          {/* ── Massive Floating bull mascot (bottom-left) ── */}
          <div style={{
            position: "fixed", left: "clamp(-100px, -5vw, -20px)", bottom: "-20vh",
            width: "clamp(500px, 75vw, 1400px)",
            height: "clamp(600px, 90vh, 1600px)",
            zIndex: 1, pointerEvents: "none",
            animation: "slide-up-reveal 1.5s ease 0.5s both",
            opacity: 0.85,
            maskImage: "radial-gradient(ellipse at center, black 50%, transparent 95%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 50%, transparent 95%)",
          }}>
            <div style={{
              width: "100%", height: "100%",
              filter: "drop-shadow(0 20px 80px rgba(0,255,102,0.4)) drop-shadow(0 0 120px rgba(0,255,102,0.2))",
            }}>
              <Image src="/b.png" alt="Nagora Bull Mascot" fill style={{ objectFit: "contain", objectPosition: "bottom left" }} />
            </div>
          </div>

          {/* ── Massive Still horse mascot (bottom-right) ── */}
          <div style={{
            position: "fixed", right: "clamp(-150px, -8vw, -20px)", bottom: "-25vh",
            width: "clamp(600px, 85vw, 1600px)",
            height: "clamp(700px, 100vh, 1800px)",
            zIndex: 1, pointerEvents: "none",
            animation: "slide-up-reveal 1.5s ease 0.6s both",
            opacity: 0.85,
            maskImage: "radial-gradient(ellipse at center, black 50%, transparent 95%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 50%, transparent 95%)",
          }}>
            <div style={{
              width: "100%", height: "100%",
              filter: "drop-shadow(0 20px 80px rgba(255,102,0,0.4)) drop-shadow(0 0 120px rgba(255,102,0,0.2))",
            }}>
              <Image src="/c.png" alt="Nagora Horse Mascot" fill style={{ objectFit: "contain", objectPosition: "bottom right" }} />
            </div>
          </div>

          {/* ── Footer ── */}
          <div style={{
            position: "fixed", bottom: "18px", left: "50%", transform: "translateX(-50%)",
            fontFamily: "var(--font-cinzel), serif",
            fontSize: "0.75rem", letterSpacing: "0.15em",
            color: "rgba(255,255,255,0.6)", textTransform: "uppercase",
            whiteSpace: "nowrap", zIndex: 10,
            animation: "fade-in 1s ease 1.6s both",
          }}>
            © 2026 Sahasra TechFest &nbsp;·&nbsp; NAGORA Finance &nbsp;·&nbsp; Built for Olympians
          </div>
        </main>
      )}
    </>
  );
}
