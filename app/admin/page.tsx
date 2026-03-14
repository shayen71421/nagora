"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "@/utils/firebase";
import ParticleCanvas from "@/app/components/ParticleCanvas";

const FEE_PER_STUDENT = 1200;

const CLASS_ORDER = [
  "2022 BME", "2023 BME", "2024 BME", "2025 BME",
  "2022 BTE", "2023 BTE", "2024 BTE", "2025 BTE",
  "2022 ECE", "2023 ECE", "2024 ECE", "2025 ECE",
  "2022 EEE", "2023 EEE", "2024 EEE", "2025 EEE",
  "2022 CE", "2023 CE", "2024 CE", "2025 CE",
  "2022 CSE A", "2022 CSE B", "2022 CSE C",
  "2023 CSE A", "2023 CSE B", "2023 CSE C",
  "2024 CSE A", "2024 CSE B", "2024 CSE C", "2024 CSE D",
  "2025 CSE A", "2025 CSE B", "2025 CSE C", "2025 CSE D",
];

const ADMIN_EMAILS = [
  "shayen224809@sahrdaya.ac.in",
  "shayen@sahrdaya.ac.in",
];

type StudentProfileDoc = {
  className?: string;
  paid?: "yes" | "no";
};

type RepConfirmationDoc = {
  className?: string;
  paymentConfirmedByRep?: boolean;
  paymentMethod?: "direct" | "coupon" | "";
};

type RepSummaryDoc = {
  totalCollectedByRep?: number;
};

type ClassStats = {
  className: string;
  repEmail: string;
  totalStudents: number;
  studentPaidCount: number;
  repConfirmedCount: number;
  repDirectCount: number;
  repCouponCount: number;
  repSaysCount: number;
  deptReceivedCount: number;
};

type DashboardTotals = {
  classesTracked: number;
  totalStudents: number;
  studentPaidCount: number;
  repConfirmedCount: number;
  deptReceivedCount: number;
  repSaysCount: number;
  totalPotentialMoney: number;
  studentPaidMoney: number;
  repConfirmedMoney: number;
  deptReceivedMoney: number;
  repSaysMoney: number;
};

const isAdminEmail = (email?: string | null) =>
  Boolean(email && ADMIN_EMAILS.includes(email.toLowerCase()));

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  const parsed = parseInt(String(value ?? "0"), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatInr = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [classStats, setClassStats] = useState<ClassStats[]>([]);
  const [totals, setTotals] = useState<DashboardTotals>({
    classesTracked: 0,
    totalStudents: 0,
    studentPaidCount: 0,
    repConfirmedCount: 0,
    deptReceivedCount: 0,
    repSaysCount: 0,
    totalPotentialMoney: 0,
    studentPaidMoney: 0,
    repConfirmedMoney: 0,
    deptReceivedMoney: 0,
    repSaysMoney: 0,
  });
  const [error, setError] = useState("");

  const provider = useMemo(() => {
    const p = new GoogleAuthProvider();
    p.setCustomParameters({ hd: "sahrdaya.ac.in", prompt: "select_account" });
    return p;
  }, []);

  const loadDashboard = async () => {
    setLoadingStats(true);
    setError("");

    try {
      const mutableMap: Record<string, ClassStats> = {};
      const studentClassByUid: Record<string, string> = {};

      const getClassRow = (className: string): ClassStats => {
        if (!mutableMap[className]) {
          mutableMap[className] = {
            className,
            repEmail: "",
            totalStudents: 0,
            studentPaidCount: 0,
            repConfirmedCount: 0,
            repDirectCount: 0,
            repCouponCount: 0,
            repSaysCount: 0,
            deptReceivedCount: 0,
          };
        }
        return mutableMap[className];
      };

      CLASS_ORDER.forEach((className) => {
        getClassRow(className);
      });

      const studentSnaps = await getDocs(collection(db, "student_profiles"));
      studentSnaps.forEach((studentDoc) => {
        const data = studentDoc.data() as StudentProfileDoc;
        const className = data.className?.trim();
        if (!className) return;

        const row = getClassRow(className);
        row.totalStudents += 1;
        if (data.paid === "yes") {
          row.studentPaidCount += 1;
        }
        studentClassByUid[studentDoc.id] = className;
      });

      const repConfSnaps = await getDocs(collection(db, "rep_confirmations"));
      repConfSnaps.forEach((confDoc) => {
        const data = confDoc.data() as RepConfirmationDoc;
        const className = data.className?.trim() || studentClassByUid[confDoc.id];
        if (!className) return;

        const row = getClassRow(className);
        if (data.paymentConfirmedByRep) {
          row.repConfirmedCount += 1;
        }
        if (data.paymentMethod === "direct") {
          row.repDirectCount += 1;
        }
        if (data.paymentMethod === "coupon") {
          row.repCouponCount += 1;
        }
      });

      const repSummarySnaps = await getDocs(collection(db, "rep_summary"));
      repSummarySnaps.forEach((summaryDoc) => {
        const className = summaryDoc.id;
        const data = summaryDoc.data() as RepSummaryDoc;
        const row = getClassRow(className);
        row.repSaysCount = toNumber(data.totalCollectedByRep);
      });

      const deptReceivedSnaps = await getDocs(collection(db, "dept_received"));
      deptReceivedSnaps.forEach((deptDoc) => {
        const data = deptDoc.data() as Record<string, unknown>;
        Object.entries(data).forEach(([key, value]) => {
          if (key === "updatedAt") return;
          const row = getClassRow(key);
          row.deptReceivedCount = toNumber(value);
        });
      });

      const deptEmailsSnaps = await getDocs(collection(db, "department_class_emails"));
      deptEmailsSnaps.forEach((deptDoc) => {
        const data = deptDoc.data() as Record<string, string>;
        Object.entries(data).forEach(([className, repEmail]) => {
          if (className === "updatedAt") return;
          const row = getClassRow(className);
          row.repEmail = repEmail || "";
        });
      });

      const ordered = [
        ...CLASS_ORDER.map((className) => mutableMap[className]).filter(Boolean),
        ...Object.keys(mutableMap)
          .filter((className) => !CLASS_ORDER.includes(className))
          .sort((a, b) => a.localeCompare(b))
          .map((className) => mutableMap[className]),
      ];

      const totalsAgg = ordered.reduce(
        (acc, row) => {
          acc.totalStudents += row.totalStudents;
          acc.studentPaidCount += row.studentPaidCount;
          acc.repConfirmedCount += row.repConfirmedCount;
          acc.deptReceivedCount += row.deptReceivedCount;
          acc.repSaysCount += row.repSaysCount;
          return acc;
        },
        {
          totalStudents: 0,
          studentPaidCount: 0,
          repConfirmedCount: 0,
          deptReceivedCount: 0,
          repSaysCount: 0,
        }
      );

      setClassStats(ordered);
      setTotals({
        classesTracked: ordered.length,
        totalStudents: totalsAgg.totalStudents,
        studentPaidCount: totalsAgg.studentPaidCount,
        repConfirmedCount: totalsAgg.repConfirmedCount,
        deptReceivedCount: totalsAgg.deptReceivedCount,
        repSaysCount: totalsAgg.repSaysCount,
        totalPotentialMoney: totalsAgg.totalStudents * FEE_PER_STUDENT,
        studentPaidMoney: totalsAgg.studentPaidCount * FEE_PER_STUDENT,
        repConfirmedMoney: totalsAgg.repConfirmedCount * FEE_PER_STUDENT,
        deptReceivedMoney: totalsAgg.deptReceivedCount * FEE_PER_STUDENT,
        repSaysMoney: totalsAgg.repSaysCount * FEE_PER_STUDENT,
      });
    } catch (loadError) {
      console.error(loadError);
      setError("Failed to load admin stats.");
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (authUser) => {
      setLoadingAuth(false);
      setError("");

      if (!authUser) {
        setUser(null);
        setClassStats([]);
        return;
      }

      if (!isAdminEmail(authUser.email)) {
        await signOut(auth);
        setError("You are not in the admin list.");
        return;
      }

      setUser(authUser);
      await loadDashboard();
    });

    return () => unsub();
  }, []);

  const handleSignIn = async () => {
    setError("");
    try {
      const result = await signInWithPopup(auth, provider);
      if (!isAdminEmail(result.user.email)) {
        await signOut(auth);
        setError("This account is not in admin list.");
      }
    } catch {
      setError("Sign-in failed. Please try again.");
    }
  };

  const labelStyle: CSSProperties = {
    display: "block",
    fontFamily: "var(--font-cinzel), serif",
    fontSize: "0.66rem",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "rgba(168, 186, 224, 0.9)",
    textShadow: "0 0 10px rgba(68,136,255,0.3)",
  };

  return (
    <>
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background: `
            radial-gradient(ellipse 100% 60% at 50% -5%,  rgba(255,102,0,0.09) 0%, transparent 55%),
            radial-gradient(ellipse 70%  50% at 10% 90%,  rgba(68,136,255,0.08) 0%, transparent 55%),
            radial-gradient(ellipse 70%  50% at 90% 90%,  rgba(255,68,0,0.07)   0%, transparent 55%),
            #040610
          `,
        }}
      />

      <ParticleCanvas />

      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "2px",
          zIndex: 10,
          background:
            "linear-gradient(90deg, transparent, #ff6600 30%, #ff8c00 50%, #4488ff 70%, transparent)",
          boxShadow: "0 0 20px #ff6600",
        }}
      />

      <main
        style={{
          position: "relative",
          zIndex: 2,
          minHeight: "100vh",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "48px 16px 80px",
          animation: "content-enter 0.9s ease both",
        }}
      >
        <section
          style={{
            width: "min(1120px, 100%)",
            borderRadius: "20px",
            border: "1px solid rgba(255,255,255,0.12)",
            background:
              "linear-gradient(135deg, rgba(255,102,0,0.07), rgba(68,136,255,0.04) 45%, rgba(10,16,30,0.84))",
            backdropFilter: "blur(8px)",
            boxShadow:
              "0 28px 90px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,140,0,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
            padding: "30px 26px",
            color: "rgba(226, 236, 255, 0.95)",
            textShadow: "0 0 10px rgba(120,160,255,0.2)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "22px" }}>
            <h1
              style={{
                fontFamily: "var(--font-cinzel-decorative), serif",
                fontSize: "clamp(2rem, 8vw, 3rem)",
                fontWeight: 900,
                letterSpacing: "0.08em",
                lineHeight: 1,
                textShadow: "0 0 24px rgba(255,140,0,0.45), 0 0 10px rgba(68,136,255,0.2)",
              }}
            >
              <span className="gradient-fire">ADMIN DASHBOARD</span>
            </h1>
            <p
              style={{
                marginTop: "10px",
                fontFamily: "var(--font-cinzel), serif",
                fontSize: "0.64rem",
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                color: "rgba(168, 190, 232, 0.82)",
              }}
            >
              All Departments · Classes · Money Stats
            </p>
            <div className="divider" style={{ marginTop: "16px" }} />
          </div>

          {loadingAuth ? (
            <p style={{ textAlign: "center", fontSize: "0.95rem", color: "rgba(216,232,255,0.85)" }}>
              Checking sign-in…
            </p>
          ) : !user ? (
            <div
              style={{
                borderRadius: "14px",
                border: "1px solid rgba(255,140,0,0.35)",
                background: "rgba(255,140,0,0.07)",
                padding: "24px",
                textAlign: "center",
              }}
            >
              <p style={{ color: "rgba(255,214,158,0.95)", fontSize: "0.94rem", marginBottom: "6px" }}>
                Sign in with an admin email
              </p>
              <p style={{ color: "rgba(168,190,224,0.74)", fontSize: "0.8rem", marginBottom: "16px" }}>
                Admin list can be edited in `ADMIN_EMAILS` inside this page file.
              </p>
              <button
                type="button"
                onClick={handleSignIn}
                style={{
                  border: "1px solid rgba(255,140,0,0.5)",
                  borderRadius: "10px",
                  padding: "11px 22px",
                  fontFamily: "var(--font-cinzel), serif",
                  fontSize: "0.72rem",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#fff",
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "10px",
                  borderRadius: "12px",
                  border: "1px solid rgba(68,136,255,0.35)",
                  background: "rgba(68,136,255,0.08)",
                  padding: "12px 14px",
                  marginBottom: "18px",
                }}
              >
                <div>
                  <p style={labelStyle}>Signed in as admin</p>
                  <p style={{ fontSize: "0.94rem", fontWeight: 700, color: "#8fffc0" }}>{user.email}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={loadDashboard}
                    style={{
                      border: "1px solid rgba(255,140,0,0.45)",
                      borderRadius: "10px",
                      background: "rgba(255,140,0,0.12)",
                      color: "#ffd9a4",
                      padding: "8px 12px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => signOut(auth)}
                    style={{
                      border: "1px solid rgba(255,255,255,0.24)",
                      borderRadius: "10px",
                      background: "rgba(255,255,255,0.05)",
                      color: "#fff",
                      padding: "8px 12px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Sign out
                  </button>
                </div>
              </div>

              {loadingStats ? (
                <p style={{ textAlign: "center", fontSize: "0.95rem", color: "rgba(216,232,255,0.85)" }}>
                  Loading all stats…
                </p>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {[
                      { label: "Classes tracked", value: totals.classesTracked, color: "#4488ff" },
                      { label: "Total students", value: totals.totalStudents, color: "#ffd066" },
                      { label: "Student paid", value: totals.studentPaidCount, color: "#00ff88" },
                      { label: "Rep confirmed", value: totals.repConfirmedCount, color: "#9f8bff" },
                      { label: "Dept received", value: totals.deptReceivedCount, color: "#ff8fa3" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          borderRadius: "12px",
                          border: `1px solid ${item.color}44`,
                          background: `${item.color}12`,
                          padding: "10px 12px",
                          textAlign: "center",
                        }}
                      >
                        <p style={{ ...labelStyle, color: `${item.color}dd`, marginBottom: "4px" }}>{item.label}</p>
                        <p style={{ fontSize: "1.55rem", lineHeight: 1, fontWeight: 800, color: item.color }}>{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {[
                      { label: "Potential", value: totals.totalPotentialMoney, color: "#4488ff" },
                      { label: "Student paid", value: totals.studentPaidMoney, color: "#00ff88" },
                      { label: "Rep says", value: totals.repSaysMoney, color: "#ffd066" },
                      { label: "Rep confirmed", value: totals.repConfirmedMoney, color: "#9f8bff" },
                      { label: "Dept received", value: totals.deptReceivedMoney, color: "#ff8fa3" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          borderRadius: "12px",
                          border: `1px solid ${item.color}44`,
                          background: `${item.color}10`,
                          padding: "10px 12px",
                        }}
                      >
                        <p style={{ ...labelStyle, color: `${item.color}dd`, marginBottom: "6px" }}>{item.label} money</p>
                        <p style={{ fontSize: "0.95rem", fontWeight: 700, color: item.color }}>{formatInr(item.value)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-xl border border-white/10 bg-[#060a19]/72 p-3">
                    <p style={{ ...labelStyle, marginBottom: "8px" }}>Class-wise totals (₹1200 per student)</p>
                    <div className="max-h-[560px] overflow-auto pr-1">
                      <div className="grid gap-3 md:grid-cols-2">
                        {classStats.map((row) => {
                          const classPotential = row.totalStudents * FEE_PER_STUDENT;
                          const classStudentPaid = row.studentPaidCount * FEE_PER_STUDENT;
                          const classRepSays = row.repSaysCount * FEE_PER_STUDENT;
                          const classRepConfirmed = row.repConfirmedCount * FEE_PER_STUDENT;
                          const classDeptReceived = row.deptReceivedCount * FEE_PER_STUDENT;

                          return (
                            <div
                              key={row.className}
                              style={{
                                borderRadius: "12px",
                                border: "1px solid rgba(255,255,255,0.11)",
                                background: "rgba(0,0,0,0.24)",
                                padding: "12px",
                              }}
                            >
                              <div className="mb-2">
                                <p style={labelStyle}>{row.className}</p>
                                <p style={{ fontSize: "0.82rem", color: row.repEmail ? "#d8e8ff" : "rgba(168,186,224,0.4)" }}>
                                  Rep: {row.repEmail || "Not assigned"}
                                </p>
                              </div>

                              <div className="grid grid-cols-5 gap-1">
                                {[
                                  { label: "Students", value: row.totalStudents, color: "#4488ff" },
                                  { label: "Paid", value: row.studentPaidCount, color: "#00ff88" },
                                  { label: "Rep says", value: row.repSaysCount, color: "#ffd066" },
                                  { label: "Rep conf", value: row.repConfirmedCount, color: "#9f8bff" },
                                  { label: "Dept rec", value: row.deptReceivedCount, color: "#ff8fa3" },
                                ].map((cell) => (
                                  <div
                                    key={cell.label}
                                    style={{
                                      borderRadius: "8px",
                                      border: "1px solid rgba(255,255,255,0.08)",
                                      background: "rgba(0,0,0,0.18)",
                                      padding: "5px",
                                      textAlign: "center",
                                    }}
                                  >
                                    <p style={{ fontSize: "0.5rem", color: `${cell.color}cc`, letterSpacing: "0.09em", textTransform: "uppercase", fontFamily: "var(--font-cinzel), serif" }}>
                                      {cell.label}
                                    </p>
                                    <p style={{ fontSize: "0.95rem", fontWeight: 800, color: cell.color, lineHeight: 1.05 }}>{cell.value}</p>
                                  </div>
                                ))}
                              </div>

                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
                                  <p style={{ fontSize: "0.52rem", color: "rgba(168,186,224,0.75)", textTransform: "uppercase", fontFamily: "var(--font-cinzel), serif" }}>Potential</p>
                                  <p style={{ fontSize: "0.8rem", color: "#4488ff", fontWeight: 700 }}>{formatInr(classPotential)}</p>
                                </div>
                                <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
                                  <p style={{ fontSize: "0.52rem", color: "rgba(168,186,224,0.75)", textTransform: "uppercase", fontFamily: "var(--font-cinzel), serif" }}>Student paid</p>
                                  <p style={{ fontSize: "0.8rem", color: "#00ff88", fontWeight: 700 }}>{formatInr(classStudentPaid)}</p>
                                </div>
                                <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
                                  <p style={{ fontSize: "0.52rem", color: "rgba(168,186,224,0.75)", textTransform: "uppercase", fontFamily: "var(--font-cinzel), serif" }}>Rep says</p>
                                  <p style={{ fontSize: "0.8rem", color: "#ffd066", fontWeight: 700 }}>{formatInr(classRepSays)}</p>
                                </div>
                                <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
                                  <p style={{ fontSize: "0.52rem", color: "rgba(168,186,224,0.75)", textTransform: "uppercase", fontFamily: "var(--font-cinzel), serif" }}>Rep confirmed</p>
                                  <p style={{ fontSize: "0.8rem", color: "#9f8bff", fontWeight: 700 }}>{formatInr(classRepConfirmed)}</p>
                                </div>
                                <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 col-span-2">
                                  <p style={{ fontSize: "0.52rem", color: "rgba(168,186,224,0.75)", textTransform: "uppercase", fontFamily: "var(--font-cinzel), serif" }}>Dept received (final)</p>
                                  <p style={{ fontSize: "0.9rem", color: "#ff8fa3", fontWeight: 700 }}>{formatInr(classDeptReceived)}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {error ? (
            <p style={{ marginTop: "14px", fontSize: "0.9rem", color: "#ffb1b1", textAlign: "center" }}>{error}</p>
          ) : null}
        </section>
      </main>
    </>
  );
}
