"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { posthog } from "@/lib/posthog";
import ResultsRadar from "@/app/components/ResultsRadar";
import type { Scores } from "@/lib/data/assessment";

// ─── Archetype taglines ────────────────────────────────────────────────────────

const ARCHETYPE_TAGLINES: Record<string, string> = {
  "The Strategist":
    "You've been solving business problems for years. You just didn't have the PM vocabulary for it.",
  "The Builder":
    "You know how products are built better than most PMs. The gap is why they're built.",
  "The Advocate":
    "You understand users better than almost anyone. The gap is connecting that to business outcomes.",
  "The Operator":
    "You make things happen. The shift is from managing delivery to owning direction.",
  "The Explorer":
    "You've touched everything. Now it's time to build depth where it matters most.",
};

// ─── Dimension helpers ────────────────────────────────────────────────────────

const DIM_LABELS: Record<string, string> = {
  thinkingStrategy: "Thinking & Strategy",
  execution: "Execution",
  technicalFluency: "Technical Fluency",
  userResearch: "User & Research",
  communication: "Communication",
};

function getStrongestAndFocus(scores: Scores) {
  const dims = Object.entries(DIM_LABELS).map(([key, label]) => ({
    key,
    label,
    value: scores[key as keyof Scores] as number,
  }));
  const sorted = [...dims].sort((a, b) => b.value - a.value);
  return { strongest: sorted[0], focus: sorted[sorted.length - 1] };
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(score / 5, 1);
  const dashoffset = circumference * (1 - pct);

  return (
    <svg width="136" height="136" viewBox="0 0 136 136">
      <defs>
        <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#2DD4BF" />
        </linearGradient>
      </defs>
      {/* Track */}
      <circle
        cx="68" cy="68" r={r}
        fill="none"
        stroke="rgba(56, 189, 248, 0.1)"
        strokeWidth="9"
      />
      {/* Progress arc */}
      <circle
        cx="68" cy="68" r={r}
        fill="none"
        stroke="url(#ringGradient)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashoffset}
        transform="rotate(-90 68 68)"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      {/* Score */}
      <text
        x="68" y="63"
        textAnchor="middle"
        fill="#E8EFF8"
        fontSize="22"
        fontWeight="700"
        fontFamily="var(--font-sans)"
      >
        {score.toFixed(1)}
      </text>
      <text
        x="68" y="80"
        textAnchor="middle"
        fill="rgba(232,239,248,0.4)"
        fontSize="11"
        fontFamily="var(--font-sans)"
      >
        / 5
      </text>
    </svg>
  );
}

// ─── Blurred preview bars ────────────────────────────────────────────────────

const FAKE_BARS = [
  { label: "Roadmap readiness", pct: 68 },
  { label: "Interview signal strength", pct: 54 },
  { label: "Case study preparation", pct: 71 },
];

function BlurredPreview() {
  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ minHeight: "160px" }}>
      {/* Blurred content */}
      <div
        className="flex flex-col gap-4 p-6"
        style={{ filter: "blur(5px)", pointerEvents: "none", userSelect: "none" }}
      >
        {FAKE_BARS.map((bar) => (
          <div key={bar.label} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "rgba(232,239,248,0.7)" }}>
                {bar.label}
              </span>
              <span className="text-sm font-medium" style={{ color: "#38BDF8" }}>
                {bar.pct}%
              </span>
            </div>
            <div
              className="w-full h-2 rounded-full"
              style={{ backgroundColor: "rgba(56,189,248,0.1)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${bar.pct}%`,
                  background: "linear-gradient(to right, #38BDF8, #2DD4BF)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
      {/* Gradient overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-end pb-5"
        style={{
          background:
            "linear-gradient(to bottom, rgba(13,17,23,0) 0%, rgba(13,17,23,0.85) 50%, #0D1117 100%)",
        }}
      >
        <span className="text-sm font-medium" style={{ color: "rgba(232,239,248,0.6)" }}>
          🔒 Sign up to unlock your full breakdown
        </span>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type PageData = {
  scores: Scores;
  archetype: string;
  background: string;
  industry: string;
};

export default function PartialResultsPage() {
  const [data, setData] = useState<PageData | null>(null);

  useEffect(() => {
    const rawScores = localStorage.getItem("assessment_scores");
    const archetype = localStorage.getItem("assessment_archetype") ?? "The Explorer";
    const background = localStorage.getItem("warmup_background") ?? "";
    const industry = localStorage.getItem("warmup_industry") ?? "";

    if (rawScores) {
      setData({ scores: JSON.parse(rawScores), archetype, background, industry });
      posthog.capture("partial_results_viewed");
    }
  }, []);

  // Loading skeleton
  if (!data) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#0D1117" }}
      >
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-32 h-4 rounded-full" style={{ backgroundColor: "rgba(56,189,248,0.15)" }} />
          <div className="w-56 h-6 rounded-full" style={{ backgroundColor: "rgba(56,189,248,0.1)" }} />
        </div>
      </div>
    );
  }

  const { scores, archetype, background, industry } = data;
  const { strongest, focus } = getStrongestAndFocus(scores);
  const tagline = ARCHETYPE_TAGLINES[archetype] ?? ARCHETYPE_TAGLINES["The Explorer"];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#0D1117", color: "#E8EFF8" }}
    >
      <div className="w-full max-w-5xl mx-auto px-6 py-12 flex flex-col gap-12">

        {/* ── Header ── */}
        <div className="flex flex-col items-center text-center gap-4">
          <span
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: "rgba(56,189,248,0.08)",
              border: "1px solid rgba(56,189,248,0.2)",
              color: "#38BDF8",
            }}
          >
            ✦ Your results are ready
          </span>
          <h1
            className="text-3xl lg:text-4xl leading-tight"
            style={{ fontFamily: "var(--font-fraunces)", color: "#E8EFF8" }}
          >
            Your PM Readiness Profile
          </h1>
          {(background || industry) && (
            <p className="text-sm" style={{ color: "rgba(232,239,248,0.45)" }}>
              {[background, industry].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {/* ── Two-column grid ── */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* LEFT — Archetype card */}
          <div
            className="flex flex-col gap-6 p-6 rounded-2xl"
            style={{
              backgroundColor: "rgba(56,189,248,0.04)",
              border: "1px solid rgba(56,189,248,0.1)",
            }}
          >
            {/* Label */}
            <span
              className="text-xs font-mono tracking-widest uppercase"
              style={{ color: "rgba(56,189,248,0.5)" }}
            >
              Archetype 01
            </span>

            {/* Archetype name */}
            <div className="flex flex-col gap-2">
              <h2
                className="text-3xl leading-tight"
                style={{ fontFamily: "var(--font-fraunces)", color: "#E8EFF8" }}
              >
                {archetype}
              </h2>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "rgba(232,239,248,0.55)" }}
              >
                {tagline}
              </p>
            </div>

            {/* Stat boxes */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className="flex flex-col gap-1 px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: "rgba(34,197,94,0.07)",
                  border: "1px solid rgba(34,197,94,0.15)",
                }}
              >
                <span
                  className="text-xs font-medium tracking-wider uppercase"
                  style={{ color: "rgba(34,197,94,0.7)" }}
                >
                  Strongest
                </span>
                <span className="text-sm font-medium" style={{ color: "#86EFAC" }}>
                  {strongest.label}
                </span>
                <span className="text-lg font-bold tabular-nums" style={{ color: "#86EFAC" }}>
                  {strongest.value.toFixed(1)}
                </span>
              </div>
              <div
                className="flex flex-col gap-1 px-4 py-3 rounded-xl"
                style={{
                  backgroundColor: "rgba(251,191,36,0.07)",
                  border: "1px solid rgba(251,191,36,0.15)",
                }}
              >
                <span
                  className="text-xs font-medium tracking-wider uppercase"
                  style={{ color: "rgba(251,191,36,0.7)" }}
                >
                  Focus Area
                </span>
                <span className="text-sm font-medium" style={{ color: "#FDE68A" }}>
                  {focus.label}
                </span>
                <span className="text-lg font-bold tabular-nums" style={{ color: "#FDE68A" }}>
                  {focus.value.toFixed(1)}
                </span>
              </div>
            </div>

            {/* Score ring */}
            <div className="flex flex-col items-center gap-2 pt-2">
              <ScoreRing score={scores.overall} />
              <span
                className="text-xs"
                style={{ color: "rgba(232,239,248,0.35)" }}
              >
                Overall readiness score
              </span>
            </div>
          </div>

          {/* RIGHT — Radar chart */}
          <div
            className="flex flex-col gap-4 p-6 rounded-2xl"
            style={{
              backgroundColor: "rgba(56,189,248,0.03)",
              border: "1px solid rgba(56,189,248,0.08)",
            }}
          >
            <span
              className="text-xs font-mono tracking-widest uppercase"
              style={{ color: "rgba(56,189,248,0.5)" }}
            >
              Your 5 Dimensions
            </span>
            <div className="flex-1 min-h-[340px]">
              <ResultsRadar scores={scores} />
            </div>
          </div>
        </div>

        {/* ── Blurred preview ── */}
        <div className="flex flex-col gap-3">
          <span
            className="text-xs font-medium tracking-widest uppercase"
            style={{ color: "rgba(232,239,248,0.3)" }}
          >
            Full breakdown
          </span>
          <BlurredPreview />
        </div>

        {/* ── CTA card ── */}
        <div
          className="flex flex-col gap-6 p-7 rounded-2xl"
          style={{
            backgroundColor: "rgba(56,189,248,0.05)",
            border: "1px solid rgba(56,189,248,0.14)",
          }}
        >
          <h2
            className="text-xl lg:text-2xl"
            style={{ fontFamily: "var(--font-fraunces)", color: "#E8EFF8" }}
          >
            Unlock your full report — it&apos;s free
          </h2>

          <ul className="flex flex-col gap-2.5">
            {[
              "Complete score breakdown across all 5 dimensions",
              "Detailed archetype analysis",
              "Your personalised week-by-week roadmap",
              "Go Deeper into any dimension",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm">
                <span style={{ color: "#38BDF8", marginTop: "1px" }}>✓</span>
                <span style={{ color: "rgba(232,239,248,0.7)" }}>{item}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-full text-sm font-semibold transition-all duration-200 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]"
              style={{ backgroundColor: "#38BDF8", color: "#0D1117" }}
            >
              Continue with Google →
            </Link>
            <p
              className="text-xs text-center"
              style={{ color: "rgba(232,239,248,0.3)" }}
            >
              Free. No payment required. 10 seconds.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
