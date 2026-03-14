"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDoc, getDocs, collection, setDoc } from "firebase/firestore";
import { auth, db } from "@/utils/firebase";
import ParticleCanvas from "@/app/components/ParticleCanvas";

/* ─────────────────────────────────────────────────
   DEPARTMENT CONFIG
───────────────────────────────────────────────── */
type DeptKey = "aces" | "ebsa" | "beats" | "pace" | "elecsta" | "aeson";

type DeptInfo = {
  name: string;
  full: string;
  accentColor: string;
  classes: string[];
};

const DEPARTMENTS: Record<DeptKey, DeptInfo> = {
  aces: {
    name: "ACES",
    full: "Computer Science",
    accentColor: "#0099ff",
    classes: [
      "2022 CSE A", "2022 CSE B", "2022 CSE C",
      "2023 CSE A", "2023 CSE B", "2023 CSE C",
      "2024 CSE A", "2024 CSE B", "2024 CSE C", "2024 CSE D",
      "2025 CSE A", "2025 CSE B", "2025 CSE C", "2025 CSE D",
    ],
  },
  ebsa: {
    name: "EBSA",
    full: "Biomedical Engineering",
    accentColor: "#ff6680",
    classes: ["2022 BME", "2023 BME", "2024 BME", "2025 BME"],
  },
  beats: {
    name: "BEATS",
    full: "Biotechnology Engineering",
    accentColor: "#44ffcc",
    classes: ["2022 BTE", "2023 BTE", "2024 BTE", "2025 BTE"],
  },
  pace: {
    name: "PACE",
    full: "Civil Engineering",
    accentColor: "#ffcc44",
    classes: ["2022 CE", "2023 CE", "2024 CE", "2025 CE"],
  },
  elecsta: {
    name: "ELECSTA",
    full: "Electronics & Communication",
    accentColor: "#aa66ff",
    classes: ["2022 ECE", "2023 ECE", "2024 ECE", "2025 ECE"],
  },
  aeson: {
    name: "AESON",
    full: "Electrical Engineering",
    accentColor: "#ff8c00",
    classes: ["2022 EEE", "2023 EEE", "2024 EEE", "2025 EEE"],
  },
};

const ALLOWED_PREFIXES = Object.keys(DEPARTMENTS) as DeptKey[];

function getDeptKey(email?: string | null): DeptKey | null {
  if (!email) return null;
  const prefix = email.split("@")[0].toLowerCase() as DeptKey;
  return ALLOWED_PREFIXES.includes(prefix) ? prefix : null;
}

const isAllowedEmail = (email?: string | null) =>
  email?.toLowerCase().endsWith("@sahrdaya.ac.in") && getDeptKey(email) !== null;

type RepSummary = {
  totalCollectedByRep: number;
  confirmedByRepCount: number;
  studentPaidCount: number;
};

/* ─────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────── */
export default function DepartmentPage() {
  const [user, setUser] = useState<User | null>(null);
  const [deptKey, setDeptKey] = useState<DeptKey | null>(null);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [editEmails, setEditEmails] = useState<Record<string, string>>({});
  const [received, setReceived] = useState<Record<string, string>>({});
  const [editReceived, setEditReceived] = useState<Record<string, string>>({});
  const [repSummaries, setRepSummaries] = useState<Record<string, RepSummary>>({});
  const [liveStudentPaidByClass, setLiveStudentPaidByClass] = useState<Record<string, number>>({});
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (authUser) => {
      setLoadingAuth(false);
      setError("");
      setSuccess("");

      if (!authUser) {
        setUser(null);
        setDeptKey(null);
        setEmails({});
        setHasData(false);
        setIsEditing(false);
        return;
      }

      const key = getDeptKey(authUser.email);
      if (!key) {
        await signOut(auth);
        setError("This email is not linked to any department.");
        return;
      }

      setUser(authUser);
      setDeptKey(key);
      setLoadingData(true);

      try {
        const ref = doc(db, "department_class_emails", key);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as Record<string, string>;
          setEmails(data);
          setEditEmails(data);
          setHasData(true);
          setIsEditing(false);
        } else {
          const empty: Record<string, string> = {};
          DEPARTMENTS[key].classes.forEach((c) => (empty[c] = ""));
          setEmails(empty);
          setEditEmails(empty);
          setHasData(false);
          setIsEditing(true);
        }

        // Load dept received
        const rcvSnap = await getDoc(doc(db, "dept_received", key));
        const rcvData: Record<string, string> = {};
        if (rcvSnap.exists()) {
          const d = rcvSnap.data() as Record<string, number>;
          Object.entries(d).forEach(([k, v]) => { if (k !== "updatedAt") rcvData[k] = String(v); });
        }
        setReceived(rcvData);
        setEditReceived(rcvData);

        // Load rep summaries for each class
        const summaryMap: Record<string, RepSummary> = {};
        const classes = DEPARTMENTS[key].classes;
        const summarySnaps = await getDocs(collection(db, "rep_summary"));
        for (const s of summarySnaps.docs) {
          if (classes.includes(s.id)) {
            summaryMap[s.id] = s.data() as RepSummary;
          }
        }
        setRepSummaries(summaryMap);

        // Load live student-paid counts directly from student profiles
        const liveCounts: Record<string, number> = {};
        classes.forEach((cls) => {
          liveCounts[cls] = 0;
        });

        const studentSnaps = await getDocs(collection(db, "student_profiles"));
        for (const studentDoc of studentSnaps.docs) {
          const data = studentDoc.data() as { className?: string; paid?: string };
          if (data.className && classes.includes(data.className) && data.paid === "yes") {
            liveCounts[data.className] = (liveCounts[data.className] ?? 0) + 1;
          }
        }
        setLiveStudentPaidByClass(liveCounts);
      } catch {
        setError("Failed to load data.");
      } finally {
        setLoadingData(false);
      }
    });

    return () => unsub();
  }, []);

  const provider = useMemo(() => {
    const p = new GoogleAuthProvider();
    p.setCustomParameters({ hd: "sahrdaya.ac.in", prompt: "select_account" });
    return p;
  }, []);

  const handleSignIn = async () => {
    setError("");
    setSuccess("");
    try {
      const result = await signInWithPopup(auth, provider);
      if (!isAllowedEmail(result.user.email)) {
        await signOut(auth);
        setError("Use an authorised department email only.");
      }
    } catch {
      setError("Sign-in failed. Please try again.");
    }
  };

  const handleSave = async () => {
    if (!user || !deptKey) return;
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const ref = doc(db, "department_class_emails", deptKey);
      await setDoc(ref, { ...editEmails, updatedAt: new Date().toISOString() }, { merge: true });
      // Save dept received
      const rcvPayload: Record<string, number | string> = { updatedAt: new Date().toISOString() };
      Object.entries(editReceived).forEach(([k, v]) => { rcvPayload[k] = parseInt(v || "0", 10); });
      await setDoc(doc(db, "dept_received", deptKey), rcvPayload, { merge: true });
      setEmails({ ...editEmails });
      setReceived({ ...editReceived });
      setSuccess("Saved successfully.");
      setHasData(true);
      setIsEditing(false);
    } catch {
      setError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const dept = deptKey ? DEPARTMENTS[deptKey] : null;
  const accent = dept?.accentColor ?? "#ff8c00";

  const labelStyle: CSSProperties = {
    marginBottom: "5px",
    display: "block",
    fontFamily: "var(--font-cinzel), serif",
    fontSize: "0.84rem",
    letterSpacing: "0.13em",
    textTransform: "uppercase",
    color: "rgba(168, 186, 224, 0.85)",
    textShadow: "0 0 10px rgba(68,136,255,0.35)",
  };

  const inputCls =
    "w-full rounded-xl border border-white/15 bg-[#050917]/95 px-3 py-2.5 text-sm text-[#d8e8ff] outline-none transition focus:border-[#ff8c00] focus:ring-2 focus:ring-[#ff8c00]/30";

  return (
    <>
      {/* Ambient bg */}
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          background: `
            radial-gradient(ellipse 100% 60% at 50% -5%,  rgba(255,102,0,0.09) 0%, transparent 55%),
            radial-gradient(ellipse 70%  50% at 10% 90%,  rgba(68,136,255,0.08) 0%, transparent 55%),
            radial-gradient(ellipse 70%  50% at 90% 90%,  rgba(255,68,0,0.07)   0%, transparent 55%),
            #040610
          `,
        }}
      />

      <ParticleCanvas />

      {/* Top neon bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, width: "100%", height: "2px", zIndex: 10,
        background: "linear-gradient(90deg, transparent, #ff6600 30%, #ff8c00 50%, #4488ff 70%, transparent)",
        boxShadow: "0 0 20px #ff6600",
      }} />

      <main style={{
        position: "relative", zIndex: 2, minHeight: "100vh",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "48px 16px 80px",
        animation: "content-enter 0.9s ease both",
      }}>
        <section style={{
          width: "min(980px, 100%)",
          borderRadius: "20px",
          border: "1px solid rgba(255,255,255,0.12)",
          background: "linear-gradient(135deg, rgba(255,102,0,0.07), rgba(68,136,255,0.04) 45%, rgba(10,16,30,0.8))",
          backdropFilter: "blur(8px)",
          boxShadow: "0 28px 90px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,140,0,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
          padding: "32px 28px",
          color: "rgba(226, 236, 255, 0.95)",
          textShadow: "0 0 10px rgba(120,160,255,0.2)",
        }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <h1 style={{
              fontFamily: "var(--font-cinzel-decorative), serif",
              fontSize: "clamp(2rem, 8vw, 3rem)",
              fontWeight: 900, letterSpacing: "0.08em", lineHeight: 1,
              textShadow: "0 0 24px rgba(255,140,0,0.45), 0 0 10px rgba(68,136,255,0.2)",
            }}>
              <span className="gradient-fire">DEPARTMENT</span>
            </h1>
            <p style={{
              marginTop: "10px",
              fontFamily: "var(--font-cinzel), serif",
              fontSize: "0.76rem", letterSpacing: "0.26em", textTransform: "uppercase",
              color: "rgba(168, 190, 232, 0.78)",
              textShadow: "0 0 12px rgba(68,136,255,0.32)",
            }}>
              Class Email Management
            </p>
            <div className="divider" style={{ marginTop: "16px" }} />
          </div>

          {/* ── Not signed in ── */}
          {loadingAuth ? (
            <p style={{ textAlign: "center", color: "rgba(216,232,255,0.8)", fontSize: "1.06rem" }}>
              Checking sign-in…
            </p>
          ) : !user ? (
            <div style={{
              borderRadius: "14px",
              border: "1px solid rgba(255,140,0,0.35)",
              background: "rgba(255,140,0,0.07)",
              padding: "24px", textAlign: "center",
            }}>
              <p style={{ color: "rgba(255,214,158,0.95)", fontSize: "1.02rem", marginBottom: "6px" }}>
                Sign in with your department email
              </p>
              <p style={{ color: "rgba(168,190,224,0.7)", fontSize: "0.86rem", marginBottom: "16px" }}>
                Authorised addresses: aces · ebsa · beats · pace · elecsta · adroit @sahrdaya.ac.in
              </p>
              <button
                type="button"
                onClick={handleSignIn}
                style={{
                  border: "1px solid rgba(255,140,0,0.5)",
                  borderRadius: "10px",
                  padding: "11px 22px",
                  fontFamily: "var(--font-cinzel), serif",
                  fontSize: "0.82rem", letterSpacing: "0.15em",
                  textTransform: "uppercase", color: "#fff",
                  background: "linear-gradient(90deg, #ff6600, #ff8c00)",
                  boxShadow: "0 8px 24px rgba(255,102,0,0.35)",
                  cursor: "pointer",
                }}
              >
                Sign in with Google
              </button>
            </div>
          ) : (
            <>
              {/* Signed-in bar */}
              <div style={{
                display: "flex", flexWrap: "wrap",
                alignItems: "center", justifyContent: "space-between",
                gap: "10px", borderRadius: "12px",
                border: `1px solid ${accent}44`,
                background: `${accent}11`,
                padding: "12px 14px", marginBottom: "20px",
              }}>
                <div>
                  <p style={{ fontFamily: "var(--font-cinzel), serif", fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(168,186,224,0.8)" }}>
                    Signed in as
                  </p>
                  <p style={{ fontSize: "1.04rem", fontWeight: 700, color: "#8fffc0" }}>{user.email}</p>
                  {dept && (
                    <p style={{ fontSize: "0.9rem", color: accent, fontFamily: "var(--font-cinzel), serif", marginTop: "2px" }}>
                      {dept.name} — {dept.full}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {hasData && !isEditing && (
                    <button
                      type="button"
                      onClick={() => { setEditEmails({ ...emails }); setEditReceived({ ...received }); setIsEditing(true); setError(""); setSuccess(""); }}
                      style={{
                        border: `1px solid ${accent}66`,
                        borderRadius: "10px",
                        background: `${accent}18`,
                        color: accent,
                        padding: "8px 12px",
                        fontSize: "0.84rem", fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      Edit details
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => signOut(auth)}
                    style={{
                      border: "1px solid rgba(255,255,255,0.24)",
                      borderRadius: "10px",
                      background: "rgba(255,255,255,0.05)",
                      color: "#fff",
                      padding: "8px 12px",
                      fontSize: "0.84rem", fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    Sign out
                  </button>
                </div>
              </div>

              {loadingData ? (
                <p style={{ textAlign: "center", color: "rgba(216,232,255,0.8)", fontSize: "1.06rem" }}>
                  Loading class data…
                </p>
              ) : dept && !isEditing && hasData ? (
                /* ── Read-only view ── */
                <div>
                  <p style={{ ...labelStyle, marginBottom: "12px" }}>Class rep emails — {dept.full}</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {dept.classes.map((cls) => {
                      const s = repSummaries[cls];
                      const repTotal = s?.totalCollectedByRep ?? null;
                      const repConfirmed = s?.confirmedByRepCount ?? null;
                      const studentPaid = liveStudentPaidByClass[cls] ?? 0;
                      const allMatch =
                        s != null &&
                        repTotal === repConfirmed &&
                        repConfirmed === studentPaid;
                      const hasStats = s != null;
                      return (
                        <div
                          key={cls}
                          style={{
                            borderRadius: "12px",
                            border: hasStats
                              ? allMatch
                                ? "1px solid rgba(0,255,136,0.35)"
                                : "1px solid rgba(255,100,100,0.3)"
                              : "1px solid rgba(255,255,255,0.1)",
                            background: hasStats
                              ? allMatch
                                ? "rgba(0,255,136,0.05)"
                                : "rgba(255,80,80,0.04)"
                              : "rgba(0,0,0,0.22)",
                            padding: "12px",
                          }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p style={labelStyle}>{cls}</p>
                              <p style={{ fontSize: "0.94rem", color: emails[cls] ? "#d8e8ff" : "rgba(168,186,224,0.35)" }}>
                                {emails[cls] || "No rep assigned"}
                              </p>
                            </div>
                            {hasStats && (
                              <span style={{
                                fontSize: "0.78rem", fontFamily: "var(--font-cinzel), serif",
                                letterSpacing: "0.1em", textTransform: "uppercase",
                                padding: "3px 7px", borderRadius: "6px",
                                border: allMatch ? "1px solid rgba(0,255,136,0.4)" : "1px solid rgba(255,100,100,0.4)",
                                color: allMatch ? "#00ff88" : "#ff8888",
                                background: allMatch ? "rgba(0,255,136,0.08)" : "rgba(255,80,80,0.08)",
                              }}>
                                {allMatch ? "✓ Match" : "Mismatch"}
                              </span>
                            )}
                          </div>

                          {/* Stats comparison */}
                          <div className="grid grid-cols-3 gap-1 mt-2">
                            {[
                              { label: "Rep says", value: repTotal, color: "#ffcc44" },
                              { label: "Rep confirmed", value: repConfirmed, color: "#4488ff" },
                              { label: "Student paid", value: studentPaid, color: "#00ff88" },
                            ].map(({ label, value, color }) => (
                              <div key={label} style={{
                                borderRadius: "8px", padding: "6px 8px",
                                background: "rgba(0,0,0,0.25)",
                                border: "1px solid rgba(255,255,255,0.07)",
                                textAlign: "center",
                              }}>
                                <p style={{ fontSize: "0.76rem", fontFamily: "var(--font-cinzel), serif", letterSpacing: "0.08em", textTransform: "uppercase", color: `${color}aa`, marginBottom: "2px" }}>{label}</p>
                                <p style={{ fontSize: "1.42rem", fontWeight: 800, color: value != null ? color : "rgba(168,186,224,0.2)" }}>
                                  {value != null ? value : "—"}
                                </p>
                              </div>
                            ))}
                          </div>

                          {/* Dept received input */}
                          <div className="mt-3">
                            <p style={{ ...labelStyle, fontSize: "0.78rem", marginBottom: "4px" }}>Dept received from rep</p>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={received[cls] ?? ""}
                                readOnly
                                className="w-20 rounded-lg border border-white/10 bg-[#050917]/95 px-2 py-1.5 text-sm text-[#d8e8ff] outline-none"
                              />
                              <span style={{ fontSize: "0.94rem", color: "rgba(168,186,224,0.6)" }}>entries recorded</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setEditEmails({ ...emails }); setEditReceived({ ...received }); setIsEditing(true); setError(""); setSuccess(""); }}
                    className="w-full mt-4 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition"
                    style={{
                      background: `linear-gradient(90deg, ${accent}, ${accent}cc)`,
                      boxShadow: `0 10px 28px ${accent}33`,
                    }}
                  >
                    Edit details
                  </button>
                </div>
              ) : dept ? (
                /* ── Edit form ── */
                <div>
                  <div className="rounded-lg border border-white/10 bg-[#050917]/75 px-3 py-2 text-sm text-[#a8bee8] mb-4">
                    Enter the class representative email for each class under {dept.full}. Leave blank if not applicable.
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {dept.classes.map((cls) => (
                      <div key={cls}>
                        <label htmlFor={`cls-${cls}`} style={labelStyle}>{cls}</label>
                        <input
                          id={`cls-${cls}`}
                          type="email"
                          placeholder="rep@sahrdaya.ac.in"
                          value={editEmails[cls] ?? ""}
                          onChange={(e) =>
                            setEditEmails((prev) => ({ ...prev, [cls]: e.target.value }))
                          }
                          className={inputCls}
                        />
                        <div className="mt-1.5 flex items-center gap-2">
                          <input
                            id={`rcv-${cls}`}
                            type="number"
                            min="0"
                            placeholder="0"
                            value={editReceived[cls] ?? ""}
                            onChange={(e) =>
                              setEditReceived((prev) => ({ ...prev, [cls]: e.target.value }))
                            }
                            className="w-24 rounded-lg border border-white/10 bg-[#050917]/95 px-2 py-1.5 text-sm text-[#d8e8ff] outline-none focus:border-[#ff8c00]"
                          />
                          <span style={{ fontSize: "0.9rem", color: "rgba(168,186,224,0.6)" }}>received from rep</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-5">
                    {hasData && (
                      <button
                        type="button"
                        onClick={() => { setIsEditing(false); setEditReceived({ ...received }); setError(""); setSuccess(""); }}
                        className="flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white"
                        style={{ cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleSave}
                      className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{
                        background: "linear-gradient(90deg, #00cc88, #00ff66)",
                        boxShadow: "0 10px 28px rgba(0,255,102,0.28)",
                        cursor: saving ? "not-allowed" : "pointer",
                      }}
                    >
                      {saving ? "Saving…" : hasData ? "Update" : "Save"}
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {error && (
            <p style={{ marginTop: "14px", fontSize: "1rem", color: "#ffb1b1", textAlign: "center" }}>{error}</p>
          )}
          {success && (
            <p style={{ marginTop: "14px", fontSize: "1rem", color: "#89ffc9", textAlign: "center" }}>{success}</p>
          )}
        </section>
      </main>
    </>
  );
}
