"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Insight = {
  text: string;
  pills: string[];
};

function getInsight(background: string, industry: string): Insight {
  const bg = background.toLowerCase();
  const ind = industry.toLowerCase();

  if (bg.includes("consulting") && ind.includes("fintech")) {
    return {
      text: "6+ years in fintech consulting? You're already thinking like a PM — you just haven't had the title yet.",
      pills: [
        "Structured problem-solving",
        "Stakeholder communication",
        "Data-driven decisions",
      ],
    };
  }

  if (bg.includes("engineering") && ind.includes("saas")) {
    return {
      text: "You've been building products for years. The gap is the user side, not the technical side.",
      pills: [
        "User empathy",
        "Research synthesis",
        "Cross-functional collaboration",
      ],
    };
  }

  if (bg.includes("design") && ind.includes("consumer")) {
    return {
      text: "Your user empathy is already there. The gap is connecting it to business outcomes.",
      pills: ["Business strategy", "Metrics & outcomes", "Prioritisation"],
    };
  }

  return {
    text: "Your background gives you a strong foundation. Let's find out exactly where you stand.",
    pills: [
      "Structured problem-solving",
      "Stakeholder communication",
      "User empathy",
    ],
  };
}

export default function InsightPage() {
  const [insight, setInsight] = useState<Insight | null>(null);

  useEffect(() => {
    const background = localStorage.getItem("warmup_background") ?? "";
    const industry = localStorage.getItem("warmup_industry") ?? "";
    setInsight(getInsight(background, industry));
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ backgroundColor: "#0D1117", color: "#E8EFF8" }}
    >
      <div className="w-full max-w-lg flex flex-col gap-8">
        {/* Header label */}
        <div className="flex flex-col gap-2">
          <span
            className="inline-flex items-center gap-1.5 w-fit px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: "rgba(56, 189, 248, 0.08)",
              border: "1px solid rgba(56, 189, 248, 0.2)",
              color: "#38BDF8",
            }}
          >
            ✦ Your early insight
          </span>
          <h1
            className="text-2xl lg:text-3xl leading-snug mt-2"
            style={{ fontFamily: "var(--font-fraunces)", color: "#E8EFF8" }}
          >
            Here&apos;s what we can already see about you.
          </h1>
        </div>

        {/* Insight card */}
        {insight ? (
          <div
            className="flex flex-col gap-6 p-6 rounded-2xl"
            style={{
              backgroundColor: "rgba(56, 189, 248, 0.05)",
              border: "1px solid rgba(56, 189, 248, 0.12)",
            }}
          >
            {/* Quote mark + text */}
            <div className="flex flex-col gap-3">
              <span
                className="text-3xl leading-none"
                style={{ color: "rgba(56, 189, 248, 0.4)" }}
              >
                &ldquo;
              </span>
              <p
                className="text-base lg:text-lg leading-relaxed -mt-2"
                style={{ color: "#E8EFF8" }}
              >
                {insight.text}
              </p>
            </div>

            {/* Skill pills */}
            <div className="flex flex-col gap-2">
              <span
                className="text-xs font-medium tracking-wider uppercase"
                style={{ color: "rgba(232, 239, 248, 0.35)" }}
              >
                Likely strengths
              </span>
              <div className="flex flex-wrap gap-2">
                {insight.pills.map((pill) => (
                  <span
                    key={pill}
                    className="px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: "rgba(56, 189, 248, 0.1)",
                      border: "1px solid rgba(56, 189, 248, 0.2)",
                      color: "#38BDF8",
                    }}
                  >
                    {pill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Skeleton while reading localStorage */
          <div
            className="h-48 rounded-2xl animate-pulse"
            style={{ backgroundColor: "rgba(232, 239, 248, 0.05)" }}
          />
        )}

        {/* Subtext */}
        <p
          className="text-sm leading-relaxed"
          style={{ color: "rgba(232, 239, 248, 0.45)" }}
        >
          This is just the warm-up. The diagnostic will map your skills across all five PM dimensions and tell you exactly where to focus.
        </p>

        {/* CTA */}
        <Link
          href="/assessment"
          className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-full text-sm font-semibold transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            backgroundColor: "#38BDF8",
            color: "#0D1117",
          }}
        >
          Start the diagnostic
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}
