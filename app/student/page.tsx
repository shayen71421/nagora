"use client";

import { CSSProperties, FormEvent, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

type RepInfo = {
  paymentConfirmedByRep: boolean;
  paymentMethod: "direct" | "coupon" | "";
};
import { auth, db } from "@/utils/firebase";
import ParticleCanvas from "@/app/components/ParticleCanvas";

type StudentProfile = {
  name: string;
  srNo: string;
  phone: string;
  gender: string;
  className: string;
  paid: "yes" | "no";
  email: string;
};

const CLASS_OPTIONS = [
  "2022 BME",
  "2023 BME",
  "2024 BME",
  "2025 BME",
  "2022 BTE",
  "2023 BTE",
  "2024 BTE",
  "2025 BTE",
  "2022 ECE",
  "2023 ECE",
  "2024 ECE",
  "2025 ECE",
  "2022 EEE",
  "2023 EEE",
  "2024 EEE",
  "2025 EEE",
  "2022 CE",
  "2023 CE",
  "2024 CE",
  "2025 CE",
  "2022 CSE A",
  "2022 CSE B",
  "2022 CSE C",
  "2023 CSE A",
  "2023 CSE B",
  "2023 CSE C",
  "2024 CSE A",
  "2024 CSE B",
  "2024 CSE C",
  "2024 CSE D",
  "2025 CSE A",
  "2025 CSE B",
  "2025 CSE C",
  "2025 CSE D",
];

const EMPTY_PROFILE: StudentProfile = {
  name: "",
  srNo: "",
  phone: "",
  gender: "",
  className: "",
  paid: "no",
  email: "",
};

const isAllowedEmail = (email?: string | null) =>
  Boolean(email && email.toLowerCase().endsWith("@sahrdaya.ac.in"));

export default function StudentPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfile>(EMPTY_PROFILE);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [repInfo, setRepInfo] = useState<RepInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [hasSavedProfile, setHasSavedProfile] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (authUser) => {
      setLoadingAuth(false);
      setError("");
      setSuccess("");

      if (!authUser) {
        setUser(null);
        setProfile(EMPTY_PROFILE);
        setRepInfo(null);
        setHasSavedProfile(false);
        setIsEditing(true);
        return;
      }

      if (!isAllowedEmail(authUser.email)) {
        await signOut(auth);
        setError("Only @sahrdaya.ac.in email is allowed.");
        return;
      }

      setUser(authUser);
      setLoadingProfile(true);

      try {
        const profileRef = doc(db, "student_profiles", authUser.uid);
        const snap = await getDoc(profileRef);

        if (snap.exists()) {
          const data = snap.data() as Partial<StudentProfile>;
          setProfile({
            ...EMPTY_PROFILE,
            ...data,
            email: authUser.email ?? "",
          });
          setHasSavedProfile(true);
          setIsEditing(false);
          // Load rep confirmation
          const confSnap = await getDoc(doc(db, "rep_confirmations", authUser.uid));
          if (confSnap.exists()) {
            setRepInfo(confSnap.data() as RepInfo);
          }
        } else {
          setProfile({ ...EMPTY_PROFILE, email: authUser.email ?? "" });
          setHasSavedProfile(false);
          setIsEditing(true);
        }
      } catch {
        setError("Failed to load profile.");
      } finally {
        setLoadingProfile(false);
      }
    });

    return () => unsub();
  }, []);

  const provider = useMemo(() => {
    const googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ hd: "sahrdaya.ac.in", prompt: "select_account" });
    return googleProvider;
  }, []);

  const handleGoogleSignIn = async () => {
    setError("");
    setSuccess("");

    try {
      const result = await signInWithPopup(auth, provider);
      if (!isAllowedEmail(result.user.email)) {
        await signOut(auth);
        setError("Use your @sahrdaya.ac.in account only.");
      }
    } catch {
      setError("Sign-in failed. Please try again.");
    }
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;

    setError("");
    setSuccess("");

    if (!profile.name || !profile.srNo || !profile.phone || !profile.gender || !profile.className) {
      setError("Please fill all profile fields.");
      return;
    }

    setSaving(true);
    try {
      const profileRef = doc(db, "student_profiles", user.uid);
      await setDoc(
        profileRef,
        {
          ...profile,
          email: user.email,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setSuccess("Profile saved successfully.");
      setHasSavedProfile(true);
      setIsEditing(false);
    } catch {
      setError("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const onFieldChange = (field: keyof StudentProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const inputClassName =
    "w-full rounded-xl border border-white/15 bg-[#050917]/95 px-3 py-2.5 text-sm text-[#d8e8ff] outline-none transition focus:border-[#ff8c00] focus:ring-2 focus:ring-[#ff8c00]/30";

  const labelStyle: CSSProperties = {
    marginBottom: "6px",
    display: "block",
    fontFamily: "var(--font-cinzel), serif",
    fontSize: "0.66rem",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "rgba(168, 186, 224, 0.85)",
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

      <main
        style={{
          position: "relative",
          zIndex: 2,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 16px 60px",
          animation: "content-enter 0.9s ease both",
        }}
      >
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "2px",
            background:
              "linear-gradient(90deg, transparent, #ff6600 30%, #ff8c00 50%, #4488ff 70%, transparent)",
            boxShadow: "0 0 20px #ff6600",
            zIndex: 10,
          }}
        />

        <section
          style={{
            width: "min(760px, 100%)",
            borderRadius: "20px",
            border: "1px solid rgba(255,255,255,0.12)",
            background:
              "linear-gradient(135deg, rgba(255,102,0,0.08), rgba(68,136,255,0.05) 45%, rgba(10,16,30,0.75))",
            backdropFilter: "blur(8px)",
            boxShadow:
              "0 28px 90px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,140,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
            padding: "24px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "22px" }}>
            <h1
              style={{
                fontFamily: "var(--font-cinzel-decorative), serif",
                fontSize: "clamp(2.2rem, 8vw, 3.4rem)",
                fontWeight: 900,
                letterSpacing: "0.08em",
                lineHeight: 1,
              }}
            >
              <span className="gradient-fire">STUDENT</span>
            </h1>
            <p
              style={{
                marginTop: "10px",
                fontFamily: "var(--font-cinzel), serif",
                fontSize: "0.66rem",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "rgba(168, 190, 232, 0.78)",
              }}
            >
              Profile Management Portal
            </p>
            <div className="divider" style={{ marginTop: "16px" }} />
          </div>

          {loadingAuth ? (
            <p style={{ color: "rgba(216,232,255,0.8)", textAlign: "center", fontSize: "0.95rem" }}>
              Checking sign-in status...
            </p>
          ) : !user ? (
            <div
              style={{
                borderRadius: "14px",
                border: "1px solid rgba(255,140,0,0.35)",
                background: "rgba(255,140,0,0.08)",
                padding: "18px",
                textAlign: "center",
              }}
            >
              <p style={{ color: "rgba(255,214,158,0.95)", fontSize: "0.95rem" }}>
                Only students with @sahrdaya.ac.in email can sign in.
              </p>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                style={{
                  marginTop: "14px",
                  border: "1px solid rgba(255,140,0,0.5)",
                  borderRadius: "10px",
                  padding: "10px 16px",
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
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  borderRadius: "12px",
                  border: "1px solid rgba(68,136,255,0.35)",
                  background: "rgba(68,136,255,0.08)",
                  padding: "12px",
                }}
              >
                <div>
                  <p
                    style={{
                      fontFamily: "var(--font-cinzel), serif",
                      fontSize: "0.62rem",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: "rgba(168,186,224,0.85)",
                    }}
                  >
                    Signed in as
                  </p>
                  <p style={{ fontSize: "0.92rem", color: "#8fffc0", fontWeight: 700 }}>{user.email}</p>
                </div>
                <div className="flex gap-2">
                  {hasSavedProfile && !isEditing ? (
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setSuccess("");
                        setIsEditing(true);
                      }}
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
                      Edit profile
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => signOut(auth)}
                    style={{
                      border: "1px solid rgba(255,255,255,0.26)",
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

              {loadingProfile ? (
                <p style={{ marginTop: "14px", color: "rgba(216,232,255,0.8)", textAlign: "center", fontSize: "0.95rem" }}>
                  Loading your profile...
                </p>
              ) : hasSavedProfile && !isEditing ? (
                <div className="mt-5 space-y-4 rounded-xl border border-white/10 bg-[#060a19]/80 p-4">
                  <p
                    style={{
                      fontFamily: "var(--font-cinzel), serif",
                      fontSize: "0.68rem",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "rgba(168, 190, 232, 0.9)",
                    }}
                  >
                    Your saved profile
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <p style={labelStyle}>Name</p>
                      <p className="text-sm text-[#d8e8ff]">{profile.name || "—"}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <p style={labelStyle}>SR No</p>
                      <p className="text-sm text-[#d8e8ff]">{profile.srNo || "—"}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <p style={labelStyle}>Phone No</p>
                      <p className="text-sm text-[#d8e8ff]">{profile.phone || "—"}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <p style={labelStyle}>Gender</p>
                      <p className="text-sm text-[#d8e8ff]">{profile.gender || "—"}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <p style={labelStyle}>Class</p>
                      <p className="text-sm text-[#d8e8ff]">{profile.className || "—"}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <p style={labelStyle}>Paid status</p>
                      <p className="text-sm text-[#d8e8ff]">
                        {profile.paid === "yes" ? "Yes, paid" : "No, not paid"}
                      </p>
                    </div>
                  </div>

                  {/* Rep-set fields — read only */}
                  <div
                    style={{
                      marginTop: "4px",
                      borderRadius: "12px",
                      border: "1px solid rgba(68,136,255,0.28)",
                      background: "rgba(68,136,255,0.06)",
                      padding: "12px",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "var(--font-cinzel), serif",
                        fontSize: "0.6rem",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "rgba(68,136,255,0.9)",
                        marginBottom: "10px",
                      }}
                    >
                      Set by class rep · read only
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                        <p style={labelStyle}>Payment confirmed by rep</p>
                        <p className="text-sm" style={{ color: repInfo?.paymentConfirmedByRep ? "#00ff88" : "rgba(168,186,224,0.45)" }}>
                          {repInfo ? (repInfo.paymentConfirmedByRep ? "Yes, confirmed" : "Not confirmed yet") : "Pending"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                        <p style={labelStyle}>Payment method</p>
                        <p className="text-sm text-[#d8e8ff]" style={{ textTransform: "capitalize" }}>
                          {repInfo?.paymentMethod || "Not set"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setSuccess("");
                      setIsEditing(true);
                    }}
                    className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition"
                    style={{
                      background: "linear-gradient(90deg, #ff6600, #ff8c00)",
                      boxShadow: "0 10px 28px rgba(255,102,0,0.25)",
                    }}
                  >
                    Edit profile
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSave} className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2 rounded-lg border border-white/10 bg-[#050917]/75 px-3 py-2 text-xs text-[#a8bee8]">
                    Fill in all fields and click save. You can edit this later anytime.
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="name" style={labelStyle}>
                      Name
                    </label>
                    <input
                      id="name"
                      required
                      value={profile.name}
                      onChange={(e) => onFieldChange("name", e.target.value)}
                      className={inputClassName}
                      placeholder="Enter your name"
                    />
                  </div>

                  <div>
                    <label htmlFor="srno" style={labelStyle}>
                      SR No
                    </label>
                    <input
                      id="srno"
                      required
                      value={profile.srNo}
                      onChange={(e) => onFieldChange("srNo", e.target.value)}
                      className={inputClassName}
                      placeholder="Enter your SR number"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" style={labelStyle}>
                      Phone No
                    </label>
                    <input
                      id="phone"
                      required
                      type="tel"
                      inputMode="numeric"
                      value={profile.phone}
                      onChange={(e) => onFieldChange("phone", e.target.value)}
                      className={inputClassName}
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div>
                    <label htmlFor="gender" style={labelStyle}>
                      Gender
                    </label>
                    <select
                      id="gender"
                      required
                      value={profile.gender}
                      onChange={(e) => onFieldChange("gender", e.target.value)}
                      className={inputClassName}
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="class" style={labelStyle}>
                      Class
                    </label>
                    <select
                      id="class"
                      name="class"
                      required
                      value={profile.className}
                      onChange={(e) => onFieldChange("className", e.target.value)}
                      className={inputClassName}
                    >
                      <option value="">Select class</option>
                      {CLASS_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <p style={labelStyle}>Have you paid the amount?</p>
                    <div className="flex flex-wrap gap-5 rounded-xl border border-white/10 bg-[#060a19]/80 p-3">
                      <label className="inline-flex items-center gap-2 text-sm text-[#d8e8ff]">
                        <input
                          type="radio"
                          name="paid"
                          value="yes"
                          checked={profile.paid === "yes"}
                          onChange={(e) => onFieldChange("paid", e.target.value)}
                        />
                        Yes
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-[#d8e8ff]">
                        <input
                          type="radio"
                          name="paid"
                          value="no"
                          checked={profile.paid === "no"}
                          onChange={(e) => onFieldChange("paid", e.target.value)}
                        />
                        No
                      </label>
                    </div>
                  </div>

                  <div className="md:col-span-2 flex flex-wrap gap-2">
                    {hasSavedProfile ? (
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition"
                      >
                        Cancel
                      </button>
                    ) : null}
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                      style={{
                        background: "linear-gradient(90deg, #00cc88, #00ff66)",
                        boxShadow: "0 10px 28px rgba(0,255,102,0.28)",
                      }}
                    >
                      {saving ? "Saving..." : hasSavedProfile ? "Update Profile" : "Save Profile"}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {error ? (
            <p style={{ marginTop: "14px", fontSize: "0.92rem", color: "#ffb1b1", textAlign: "center" }}>{error}</p>
          ) : null}
          {success ? (
            <p style={{ marginTop: "14px", fontSize: "0.92rem", color: "#89ffc9", textAlign: "center" }}>{success}</p>
          ) : null}
        </section>
      </main>
    </>
  );
}
