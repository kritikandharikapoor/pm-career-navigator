"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

// Razorpay global type
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, any>) => { open(): void };
  }
}

// ─── Simple toast ─────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-sm font-medium shadow-lg"
      style={{
        backgroundColor: "rgba(239,68,68,0.15)",
        border: "1px solid rgba(239,68,68,0.3)",
        color: "#FCA5A5",
        backdropFilter: "blur(12px)",
      }}
    >
      {message}
    </div>
  );
}

// ─── Payment page ─────────────────────────────────────────────────────────────

export default function PaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function checkStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth/signup");
        return;
      }
      setEmail(user.email ?? "");

      // Migrate assessment data from localStorage to user_profiles.
      // Done here (client-side, post-auth) instead of through OAuth URL params.
      const rawScores  = localStorage.getItem("assessment_scores");
      const archetype  = localStorage.getItem("assessment_archetype");
      const background = localStorage.getItem("warmup_background");
      const experience = localStorage.getItem("warmup_experience");
      const industry   = localStorage.getItem("warmup_industry");
      if (rawScores || archetype || background || experience || industry) {
        await supabase.from("user_profiles").update({
          ...(archetype  && { archetype }),
          ...(rawScores  && { scores: (() => { try { return JSON.parse(rawScores); } catch { return null; } })() }),
          ...(background && { warmup_background: background }),
          ...(experience && { warmup_experience: experience }),
          ...(industry   && { warmup_industry:   industry }),
        }).eq("id", user.id);
        // Clear so we don't re-run on subsequent visits
        ["assessment_scores","assessment_archetype","warmup_background","warmup_experience","warmup_industry"]
          .forEach(k => localStorage.removeItem(k));
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("has_paid")
        .eq("id", user.id)
        .single();

      if (profile?.has_paid) {
        router.replace("/report");
        return;
      }
      setChecking(false);
    }

    checkStatus();
  }, [router]);

  async function handlePay() {
    setLoading(true);

    // Load Razorpay script dynamically
    if (!window.Razorpay) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Razorpay"));
        document.body.appendChild(script);
      }).catch(() => {
        setToast("Payment failed — please try again");
        setLoading(false);
        return;
      });
    }

    // Create order
    const orderRes = await fetch("/api/create-order", { method: "POST" });
    if (!orderRes.ok) {
      setToast("Payment failed — please try again");
      setLoading(false);
      return;
    }
    const { order_id } = await orderRes.json();

    const rzp = new window.Razorpay({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: 10000,
      currency: "INR",
      name: "PM Career Navigator",
      description: "Full Access",
      order_id,
      prefill: { email },
      theme: { color: "#38BDF8" },
      handler: async function (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) {
        const verifyRes = await fetch("/api/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(response),
        });

        if (verifyRes.ok) {
          router.push("/report");
        } else {
          setToast("Payment failed — please try again");
          setLoading(false);
        }
      },
      modal: {
        ondismiss: () => {
          setLoading(false);
        },
      },
    });

    rzp.open();
  }

  if (checking) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#0D1117" }}
      >
        <div className="animate-pulse w-8 h-8 rounded-full" style={{ backgroundColor: "rgba(56,189,248,0.3)" }} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-16"
      style={{ backgroundColor: "#0D1117" }}
    >
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <div
        className="w-full max-w-sm flex flex-col gap-7 p-8 rounded-2xl"
        style={{
          backgroundColor: "rgba(56,189,248,0.04)",
          border: "1px solid rgba(56,189,248,0.1)",
        }}
      >
        <span className="text-sm font-medium" style={{ color: "rgba(232,239,248,0.4)" }}>
          PM Career Navigator
        </span>

        <div className="flex flex-col gap-2">
          <h1
            className="text-2xl leading-snug"
            style={{ fontFamily: "var(--font-fraunces)", color: "#E8EFF8" }}
          >
            Unlock your PM Career Navigator
          </h1>
          <p className="text-sm" style={{ color: "rgba(232,239,248,0.5)" }}>
            One-time payment of Rs&nbsp;100. Full access forever.
          </p>
        </div>

        <ul className="flex flex-col gap-2.5">
          {[
            "Complete diagnostic report with archetype",
            "Personalised week-by-week roadmap",
            "Go Deeper dimension assessments",
            "Re-evaluation to track progress",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm">
              <span style={{ color: "#38BDF8", marginTop: "1px" }}>✓</span>
              <span style={{ color: "rgba(232,239,248,0.7)" }}>{item}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={handlePay}
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-full text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
          style={{
            backgroundColor: loading ? "rgba(56,189,248,0.5)" : "#38BDF8",
            color: "#0D1117",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Opening checkout..." : "Pay Rs 100 →"}
        </button>
      </div>
    </div>
  );
}
