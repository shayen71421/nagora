"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "@/utils/firebase";
import ParticleCanvas from "@/app/components/ParticleCanvas";

/* ─────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────── */
type StudentData = {
  uid: string;
  name: string;
  srNo: string;
  phone: string;
  gender: string;
  className: string;
  paid: "yes" | "no";
  email: string;
};

type RepConf = {
  paymentConfirmedByRep: boolean;
  paymentMethod: "direct" | "coupon" | "";
};

const EMPTY_CONF: RepConf = { paymentConfirmedByRep: false, paymentMethod: "" };

const isAllowedEmail = (email?: string | null) =>
  Boolean(email && email.toLowerCase().endsWith("@sahrdaya.ac.in"));

/* ─────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────── */
export default function RepPage() {
  const [user, setUser] = useState<User | null>(null);
  const [assignedClass, setAssignedClass] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [confirmations, setConfirmations] = useState<Record<string, RepConf>>({});
  const [totalCollected, setTotalCollected] = useState("");
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadStudentsAndConfs = async (authUser: User) => {
    setLoadingStudents(true);
    setError("");
    try {
      // Find which class this email is assigned to across all dept docs
      const deptSnaps = await getDocs(collection(db, "department_class_emails"));
      let foundClass: string | null = null;
      for (const deptDoc of deptSnaps.docs) {
        const data = deptDoc.data() as Record<string, string>;
        for (const [cls, email] of Object.entries(data)) {
          if (cls === "updatedAt") continue;
          if (email?.toLowerCase() === authUser.email?.toLowerCase()) {
            foundClass = cls;
            break;
          }
        }
        if (foundClass) break;
      }

      if (!foundClass) {
        await signOut(auth);
        setError("Your email is not registered as a class representative. Ask your department to assign your email first.");
        return;
      }

      setAssignedClass(foundClass);

      // Load all students in this class
      const q = query(collection(db, "student_profiles"), where("className", "==", foundClass));
      const studentSnaps = await getDocs(q);
      const studentList: StudentData[] = [];
      const confMap: Record<string, RepConf> = {};

      for (const s of studentSnaps.docs) {
        const d = s.data();
        studentList.push({ uid: s.id, ...d } as StudentData);
        confMap[s.id] = { ...EMPTY_CONF };
      }
      setStudents(studentList);

      // Load rep confirmations for each student
      for (const s of studentList) {
        const confSnap = await getDoc(doc(db, "rep_confirmations", s.uid));
        if (confSnap.exists()) {
          confMap[s.uid] = confSnap.data() as RepConf;
        }
      }
      setConfirmations(confMap);

      // Load rep summary for pre-filling total collected
      const summarySnap = await getDoc(doc(db, "rep_summary", foundClass));
      if (summarySnap.exists()) {
        const sd = summarySnap.data();
        setTotalCollected(String(sd.totalCollectedByRep ?? ""));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load class data.");
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (authUser) => {
      setLoadingAuth(false);
      setError("");
      setSuccess("");

      if (!authUser) {
        setUser(null);
        setAssignedClass(null);
        setStudents([]);
        setConfirmations({});
        return;
      }

      if (!isAllowedEmail(authUser.email)) {
        await signOut(auth);
        setError("Only @sahrdaya.ac.in emails are allowed.");
        return;
      }

      setUser(authUser);
      await loadStudentsAndConfs(authUser);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      await signInWithPopup(auth, provider);
    } catch {
      setError("Sign-in failed. Try again.");
    }
  };

  const handleSave = async () => {
    if (!user || !assignedClass) return;
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      // Save per-student confirmations
      for (const s of students) {
        const conf = confirmations[s.uid] ?? EMPTY_CONF;
        await setDoc(
          doc(db, "rep_confirmations", s.uid),
          {
            ...conf,
            repEmail: user.email,
            className: assignedClass,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      // Aggregate counts
      const confirmedByRepCount = Object.values(confirmations).filter((c) => c.paymentConfirmedByRep).length;
      const studentPaidCount = students.filter((s) => s.paid === "yes").length;

      // Save rep summary (dept reads this for comparison)
      await setDoc(
        doc(db, "rep_summary", assignedClass),
        {
          className: assignedClass,
          totalCollectedByRep: parseInt(totalCollected || "0", 10),
          confirmedByRepCount,
          studentPaidCount,
          repEmail: user.email,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setSuccess("Saved successfully.");
    } catch {
      setError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const setConf = (uid: string, field: keyof RepConf, value: boolean | string) => {
    setConfirmations((prev) => ({
      ...prev,
      [uid]: { ...(prev[uid] ?? EMPTY_CONF), [field]: value },
    }));
  };

  const confirmedCount = Object.values(confirmations).filter((c) => c.paymentConfirmedByRep).length;
  const studentPaidCount = students.filter((s) => s.paid === "yes").length;

  const labelStyle: CSSProperties = {
    display: "block",
    fontFamily: "var(--font-cinzel), serif",
    fontSize: "0.6rem",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "rgba(168, 186, 224, 0.8)",
    marginBottom: "4px",
  };

  const cellLabel: CSSProperties = {
    fontFamily: "var(--font-cinzel), serif",
    fontSize: "0.56rem",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "rgba(168, 186, 224, 0.65)",
    marginBottom: "2px",
  };

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
          width: "min(960px, 100%)",
          borderRadius: "20px",
          border: "1px solid rgba(255,255,255,0.12)",
          background: "linear-gradient(135deg, rgba(255,102,0,0.07), rgba(68,136,255,0.05) 45%, rgba(10,16,30,0.82))",
          backdropFilter: "blur(8px)",
          boxShadow: "0 28px 90px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,140,0,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
          padding: "28px 20px",
        }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "22px" }}>
            <h1 style={{
              fontFamily: "var(--font-cinzel-decorative), serif",
              fontSize: "clamp(1.9rem, 7vw, 3rem)",
              fontWeight: 900, letterSpacing: "0.08em", lineHeight: 1,
            }}>
              <span className="gradient-fire">CLASS REP</span>
            </h1>
            <p style={{
              marginTop: "10px",
              fontFamily: "var(--font-cinzel), serif",
              fontSize: "0.64rem", letterSpacing: "0.3em", textTransform: "uppercase",
              color: "rgba(168, 190, 232, 0.78)",
            }}>
              Payment Confirmation Portal
            </p>
            <div className="divider" style={{ marginTop: "16px" }} />
          </div>

          {/* ── Not signed in ── */}
          {loadingAuth ? (
            <p style={{ textAlign: "center", color: "rgba(216,232,255,0.8)", fontSize: "0.95rem" }}>
              Checking sign-in…
            </p>
          ) : !user ? (
            <div style={{
              borderRadius: "14px",
              border: "1px solid rgba(255,140,0,0.35)",
              background: "rgba(255,140,0,0.07)",
              padding: "24px", textAlign: "center",
            }}>
              <p style={{ color: "rgba(255,214,158,0.95)", fontSize: "0.93rem", marginBottom: "6px" }}>
                Sign in with your class rep email
              </p>
              <p style={{ color: "rgba(168,190,224,0.7)", fontSize: "0.75rem", marginBottom: "16px" }}>
                Your email must be registered by your department before you can sign in.
              </p>
              <button
                type="button"
                onClick={handleSignIn}
                style={{
                  border: "1px solid rgba(255,140,0,0.5)", borderRadius: "10px",
                  padding: "11px 22px", fontFamily: "var(--font-cinzel), serif",
                  fontSize: "0.72rem", letterSpacing: "0.16em",
                  textTransform: "uppercase", color: "#fff",
                  background: "linear-gradient(90deg, #ff6600, #ff8c00)",
                  boxShadow: "0 8px 24px rgba(255,102,0,0.35)", cursor: "pointer",
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
                border: "1px solid rgba(68,136,255,0.35)",
                background: "rgba(68,136,255,0.08)",
                padding: "12px 14px", marginBottom: "20px",
              }}>
                <div>
                  <p style={{ ...labelStyle, marginBottom: "2px" }}>Signed in as</p>
                  <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "#8fffc0" }}>{user.email}</p>
                  {assignedClass && (
                    <p style={{ fontSize: "0.78rem", color: "#0099ff", fontFamily: "var(--font-cinzel), serif", marginTop: "2px" }}>
                      Class: {assignedClass}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => signOut(auth)}
                  style={{
                    border: "1px solid rgba(255,255,255,0.24)", borderRadius: "10px",
                    background: "rgba(255,255,255,0.05)", color: "#fff",
                    padding: "8px 12px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Sign out
                </button>
              </div>

              {loadingStudents ? (
                <p style={{ textAlign: "center", color: "rgba(216,232,255,0.8)", fontSize: "0.95rem" }}>
                  Loading students…
                </p>
              ) : (
                <>
                  {/* Summary bar */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { label: "Total students", value: students.length, color: "#4488ff" },
                      { label: "Student says paid", value: studentPaidCount, color: "#ffcc44" },
                      { label: "Confirmed by you", value: confirmedCount, color: "#00ff88" },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{
                        borderRadius: "12px",
                        border: `1px solid ${color}33`,
                        background: `${color}0e`,
                        padding: "10px 12px", textAlign: "center",
                      }}>
                        <p style={{ ...cellLabel, color: `${color}cc` }}>{label}</p>
                        <p style={{ fontSize: "1.5rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Total collected input */}
                  <div className="rounded-xl border border-white/10 bg-[#060a19]/80 p-4 mb-5 flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[180px]">
                      <label htmlFor="totalCollected" style={{ ...labelStyle, fontSize: "0.64rem" }}>
                        No. of payments you collected (reported to dept)
                      </label>
                      <input
                        id="totalCollected"
                        type="number"
                        min="0"
                        placeholder="e.g. 30"
                        value={totalCollected}
                        onChange={(e) => setTotalCollected(e.target.value)}
                        className="w-full rounded-xl border border-white/15 bg-[#050917]/95 px-3 py-2.5 text-sm text-[#d8e8ff] outline-none transition focus:border-[#ff8c00] focus:ring-2 focus:ring-[#ff8c00]/30"
                      />
                    </div>
                    <p style={{ fontSize: "0.72rem", color: "rgba(168,190,224,0.6)", maxWidth: "220px" }}>
                      Enter the count you physically handed over to the department.
                    </p>
                  </div>

                  {/* Student list */}
                  {students.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-[#060a19]/80 p-6 text-center">
                      <p style={{ color: "rgba(168,190,224,0.7)", fontSize: "0.9rem" }}>
                        No students have registered for {assignedClass} yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {students.map((s) => {
                        const conf = confirmations[s.uid] ?? EMPTY_CONF;
                        return (
                          <div
                            key={s.uid}
                            style={{
                              borderRadius: "14px",
                              border: conf.paymentConfirmedByRep
                                ? "1px solid rgba(0,255,136,0.35)"
                                : "1px solid rgba(255,255,255,0.1)",
                              background: conf.paymentConfirmedByRep
                                ? "rgba(0,255,136,0.05)"
                                : "rgba(0,0,0,0.2)",
                              padding: "14px",
                              transition: "all 0.25s ease",
                            }}
                          >
                            {/* Student info row */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 mb-3">
                              {[
                                { label: "Name", value: s.name },
                                { label: "SR No", value: s.srNo },
                                { label: "Phone", value: s.phone },
                                { label: "Gender", value: s.gender },
                                { label: "Class", value: s.className },
                                {
                                  label: "Student says paid",
                                  value: s.paid === "yes" ? "Yes" : "No",
                                  highlight: s.paid === "yes" ? "#00ff88" : "#ff6680",
                                },
                              ].map(({ label, value, highlight }) => (
                                <div key={label}>
                                  <p style={cellLabel}>{label}</p>
                                  <p style={{ fontSize: "0.85rem", color: highlight ?? "#d8e8ff" }}>{value || "—"}</p>
                                </div>
                              ))}
                            </div>

                            {/* Rep controls */}
                            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/10">
                              {/* Payment method */}
                              <div className="flex gap-2 items-center">
                                <span style={{ ...cellLabel, marginBottom: 0 }}>Method:</span>
                                {(["direct", "coupon"] as const).map((m) => (
                                  <button
                                    key={m}
                                    type="button"
                                    onClick={() => setConf(s.uid, "paymentMethod", m)}
                                    style={{
                                      padding: "4px 10px",
                                      borderRadius: "8px",
                                      fontSize: "0.72rem",
                                      fontWeight: 600,
                                      border: conf.paymentMethod === m
                                        ? "1px solid #ff8c00"
                                        : "1px solid rgba(255,255,255,0.15)",
                                      background: conf.paymentMethod === m
                                        ? "rgba(255,140,0,0.2)"
                                        : "rgba(255,255,255,0.04)",
                                      color: conf.paymentMethod === m ? "#ffcc80" : "#a8bee8",
                                      cursor: "pointer",
                                      textTransform: "capitalize",
                                    }}
                                  >
                                    {m}
                                  </button>
                                ))}
                              </div>

                              {/* Confirmed toggle */}
                              <label
                                style={{
                                  marginLeft: "auto",
                                  display: "flex", alignItems: "center", gap: "8px",
                                  cursor: "pointer",
                                }}
                              >
                                <span style={{ ...cellLabel, marginBottom: 0, fontSize: "0.64rem" }}>
                                  Payment confirmed
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setConf(s.uid, "paymentConfirmedByRep", !conf.paymentConfirmedByRep)}
                                  style={{
                                    width: "46px", height: "24px",
                                    borderRadius: "12px",
                                    border: "none",
                                    background: conf.paymentConfirmedByRep
                                      ? "linear-gradient(90deg, #00cc88, #00ff66)"
                                      : "rgba(255,255,255,0.12)",
                                    position: "relative",
                                    cursor: "pointer",
                                    transition: "background 0.22s ease",
                                  }}
                                >
                                  <span style={{
                                    position: "absolute", top: "3px",
                                    left: conf.paymentConfirmedByRep ? "24px" : "3px",
                                    width: "18px", height: "18px",
                                    borderRadius: "50%",
                                    background: "#fff",
                                    transition: "left 0.22s ease",
                                    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                                  }} />
                                </button>
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Save */}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSave}
                    className="w-full mt-5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      background: "linear-gradient(90deg, #00cc88, #00ff66)",
                      boxShadow: "0 10px 28px rgba(0,255,102,0.28)",
                      cursor: saving ? "not-allowed" : "pointer",
                    }}
                  >
                    {saving ? "Saving…" : "Save All Confirmations"}
                  </button>
                </>
              )}
            </>
          )}

          {error && (
            <p style={{ marginTop: "14px", fontSize: "0.9rem", color: "#ffb1b1", textAlign: "center" }}>{error}</p>
          )}
          {success && (
            <p style={{ marginTop: "14px", fontSize: "0.9rem", color: "#89ffc9", textAlign: "center" }}>{success}</p>
          )}
        </section>
      </main>
    </>
  );
}
