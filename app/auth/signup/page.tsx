"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

// Cookie helper — persists localStorage data through the OAuth redirect
function setPmCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=600; SameSite=Lax`;
}

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function handleGoogleSignIn() {
    setLoading(true);

    // Persist assessment data in cookies so the callback can write it to Supabase
    const keys = [
      ["pm_scores", "assessment_scores"],
      ["pm_archetype", "assessment_archetype"],
      ["pm_background", "warmup_background"],
      ["pm_experience", "warmup_experience"],
      ["pm_industry", "warmup_industry"],
    ] as const;

    keys.forEach(([cookieName, lsKey]) => {
      const val = localStorage.getItem(lsKey);
      if (val) setPmCookie(cookieName, val);
    });

    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });
    // Page redirects — no need to setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-16"
      style={{ backgroundColor: "#0D1117" }}
    >
      <div
        className="w-full max-w-sm flex flex-col gap-7 p-8 rounded-2xl"
        style={{
          backgroundColor: "rgba(56,189,248,0.04)",
          border: "1px solid rgba(56,189,248,0.1)",
        }}
      >
        {/* Logo */}
        <span
          className="text-sm font-medium"
          style={{ color: "rgba(232,239,248,0.4)" }}
        >
          PM Career Navigator
        </span>

        {/* Heading */}
        <div className="flex flex-col gap-2">
          <h1
            className="text-2xl leading-snug"
            style={{ fontFamily: "var(--font-fraunces)", color: "#E8EFF8" }}
          >
            One step away from your results
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(232,239,248,0.5)" }}>
            Sign up free — then unlock your full report for just Rs&nbsp;100
          </p>
        </div>

        {/* Google button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="flex items-center justify-center gap-3 w-full py-3.5 rounded-full text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
          style={{
            backgroundColor: loading ? "rgba(56,189,248,0.5)" : "#38BDF8",
            color: "#0D1117",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? (
            "Redirecting..."
          ) : (
            <>
              {/* Google icon */}
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#0D1117" />
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#0D1117" />
                <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#0D1117" />
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#0D1117" />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <p className="text-xs text-center" style={{ color: "rgba(232,239,248,0.25)" }}>
          By continuing you agree to our terms. No spam, ever.
        </p>
      </div>
    </div>
  );
}
