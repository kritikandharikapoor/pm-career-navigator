import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import ResultsRadar from "@/app/components/ResultsRadar";
import Sidebar from "@/app/components/Sidebar";
import type { Scores } from "@/lib/data/assessment";

// ─── Config ───────────────────────────────────────────────────────────────────

const ARCHETYPE_TAGLINES: Record<string, string> = {
  "The Strategist": "You've been solving business problems for years. You just didn't have the PM vocabulary for it.",
  "The Builder":    "You know how products are built better than most PMs. The gap is why they're built.",
  "The Advocate":   "You understand users better than almost anyone. The gap is connecting that to business outcomes.",
  "The Operator":   "You make things happen. The shift is from managing delivery to owning direction.",
  "The Explorer":   "You've touched everything. Now it's time to build depth where it matters most.",
};

const ARCHETYPE_TIMELINES: Record<string, string> = {
  "The Strategist": "2–3 months at 5–8 hrs/week",
  "The Builder":    "3–4 months at 5–8 hrs/week",
  "The Advocate":   "3–4 months at 5–8 hrs/week",
  "The Operator":   "4–5 months at 5–8 hrs/week",
  "The Explorer":   "4–6 months at 5–8 hrs/week",
};

const ARCHETYPE_PATH_SUMMARY: Record<string, string> = {
  "The Strategist": "Your strategic thinking is already PM-grade. The next step is learning to apply it inside product cycles — from discovery to shipping. Focus on execution and technical fluency to round out your profile.",
  "The Builder":    "You have rare technical depth. The next step is developing the user and business side — learning to define problems before jumping to solutions. That shift unlocks the full PM role.",
  "The Advocate":   "Your user empathy is genuine and hard to fake. The next step is learning to translate it into business cases and roadmap decisions. That's what separates great PMs from great researchers.",
  "The Operator":   "You move fast and get things done. The next step is developing strategic ownership — being the one who defines what gets built and why, not just ensuring it gets built well.",
  "The Explorer":   "Your breadth is a real asset. The next step is building deliberate depth in the dimensions that matter most for the roles you're targeting. Focused practice beats scattered effort.",
};

type DimensionConfig = {
  key: keyof Scores;
  label: string;
  insightHigh: string;
  insightLow: string;
  subcategories: { name: string; offset: number }[];
};

const DIMENSIONS: DimensionConfig[] = [
  {
    key:         "thinkingStrategy",
    label:       "Thinking & Strategy",
    insightHigh: "This is your strongest asset. You think in structured frameworks naturally.",
    insightLow:  "The opportunity is building your product thinking muscle — how to structure ambiguous problems.",
    subcategories: [
      { name: "Product Sense",        offset:  0.2  },
      { name: "Guesstimates",         offset: -0.3  },
      { name: "Prioritisation",       offset:  0.1  },
      { name: "Product Strategy",     offset:  0.15 },
      { name: "Competitive Analysis", offset: -0.2  },
    ],
  },
  {
    key:         "execution",
    label:       "Execution",
    insightHigh: "You understand how to measure and ship. This is a real edge.",
    insightLow:  "The opportunity is learning to define success before you build, not after.",
    subcategories: [
      { name: "Metrics & KPIs",        offset:  0.2  },
      { name: "A/B Testing",           offset: -0.1  },
      { name: "Go-to-Market",          offset:  0.0  },
      { name: "Roadmapping",           offset:  0.15 },
      { name: "Stakeholder Management",offset: -0.2  },
    ],
  },
  {
    key:         "technicalFluency",
    label:       "Technical Fluency",
    insightHigh: "Your technical comfort gives you credibility with engineering teams.",
    insightLow:  "You do not need to code. You need enough fluency to collaborate confidently.",
    subcategories: [
      { name: "Tech Fundamentals",   offset:  0.2  },
      { name: "AI/ML for PMs",       offset: -0.1  },
      { name: "Data & SQL",          offset: -0.3  },
      { name: "System Design Basics",offset:  0.1  },
    ],
  },
  {
    key:         "userResearch",
    label:       "User & Research",
    insightHigh: "Your user instincts are already strong. This is the hardest PM skill to teach.",
    insightLow:  "The opportunity is structured discovery — learning to sit with what users feel, not just what they say.",
    subcategories: [
      { name: "User Research",     offset:  0.2  },
      { name: "UX Thinking",       offset:  0.1  },
      { name: "Customer Empathy",  offset: -0.1  },
    ],
  },
  {
    key:         "communication",
    label:       "Communication",
    insightHigh: "You can tell a product story. This matters more than most PMs realise.",
    insightLow:  "The opportunity is translating your thinking into PM storytelling — briefs, roadmap reviews, influencing without authority.",
    subcategories: [
      { name: "Written Communication",   offset:  0.1  },
      { name: "Product Storytelling",    offset: -0.1  },
      { name: "Stakeholder Influence",   offset:  0.2  },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWhoYouAre(archetype: string, background: string): string {
  const bg = background.toLowerCase();
  if (archetype === "The Strategist" && bg.includes("consulting"))
    return "Your consulting background means you have spent years solving complex business problems. The vocabulary is different but the thinking is already there.";
  if (archetype === "The Builder" && bg.includes("engineering"))
    return "You have been close to the product your entire career. You understand systems and constraints. The gap is owning the why, not just the how.";
  if (archetype === "The Advocate" && bg.includes("design"))
    return "You put the user first without being told to. The gap is connecting those insights to business outcomes and metrics.";
  if (archetype === "The Operator")
    return "You are the person who gets things done. The shift is from managing the process to owning the product decisions.";
  if (archetype === "The Explorer")
    return "You have broad exposure across functions. The path is building depth systematically in the areas PM demands most.";
  return "Your background gives you a strong foundation. The path ahead is focused and learnable.";
}

function getStrongestAndFocus(scores: Scores) {
  const dims = DIMENSIONS.map((d) => ({ key: d.key, label: d.label, value: scores[d.key] as number }));
  const sorted = [...dims].sort((a, b) => b.value - a.value);
  return { strongest: sorted[0], focus: sorted[sorted.length - 1] };
}

function getStatusPill(score: number) {
  if (score >= 3.5) return { label: "Strength",    color: "#86EFAC", bg: "rgba(34,197,94,0.1)"   };
  if (score < 2.8)  return { label: "Opportunity", color: "#FDE68A", bg: "rgba(251,191,36,0.1)"  };
  return               { label: "On Track",    color: "#38BDF8", bg: "rgba(56,189,248,0.1)"  };
}

function clamp(v: number): number {
  return Math.min(5, Math.max(0, Math.round(v * 10) / 10));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r             = 52;
  const circumference = 2 * Math.PI * r;
  const dashoffset    = circumference * (1 - Math.min(score / 5, 1));
  return (
    <svg width="136" height="136" viewBox="0 0 136 136">
      <defs>
        <linearGradient id="reportRing" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#2DD4BF" />
        </linearGradient>
      </defs>
      <circle cx="68" cy="68" r={r} fill="none" stroke="rgba(56,189,248,0.1)" strokeWidth="9" />
      <circle cx="68" cy="68" r={r} fill="none" stroke="url(#reportRing)" strokeWidth="9"
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashoffset}
        transform="rotate(-90 68 68)" />
      <text x="68" y="63" textAnchor="middle" fill="#E8EFF8" fontSize="22" fontWeight="700" fontFamily="var(--font-sans)">
        {score.toFixed(1)}
      </text>
      <text x="68" y="80" textAnchor="middle" fill="rgba(232,239,248,0.4)" fontSize="11" fontFamily="var(--font-sans)">
        / 5
      </text>
    </svg>
  );
}

function DimensionBar({ score, showBenchmark = true }: { score: number; showBenchmark?: boolean }) {
  const pct = (score / 5) * 100;
  const benchmarkPct = (3.5 / 5) * 100;
  return (
    <div className="relative w-full h-2 rounded-full" style={{ backgroundColor: "rgba(56,189,248,0.08)" }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(to right, #38BDF8, #2DD4BF)" }} />
      {showBenchmark && (
        <div className="absolute top-0 h-full w-px" style={{ left: `${benchmarkPct}%`, backgroundColor: "rgba(232,239,248,0.35)" }} />
      )}
    </div>
  );
}

function DimensionSection({ dim, score }: { dim: DimensionConfig; score: number }) {
  const status  = getStatusPill(score);
  const insight = score >= 3.5 ? dim.insightHigh : dim.insightLow;
  return (
    <div className="flex flex-col gap-4 py-6" style={{ borderBottom: "1px solid rgba(56,189,248,0.07)" }}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold" style={{ color: "#E8EFF8" }}>{dim.label}</h3>
          <span
            className="px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: status.bg, color: status.color }}
          >
            {status.label}
          </span>
        </div>
        <span className="text-lg font-bold tabular-nums" style={{ color: "#38BDF8" }}>
          {score.toFixed(1)}<span className="text-sm font-normal" style={{ color: "rgba(232,239,248,0.3)" }}> / 5</span>
        </span>
      </div>

      {/* Score bar with benchmark */}
      <div className="flex flex-col gap-1.5">
        <DimensionBar score={score} />
        <div className="flex justify-between text-xs" style={{ color: "rgba(232,239,248,0.3)" }}>
          <span>0</span>
          <span style={{ position: "relative", left: `${(3.5 / 5) * 100 - 50}%` }}>
            ↑ entry-level PM target (3.5)
          </span>
          <span>5</span>
        </div>
      </div>

      {/* Mentor insight */}
      <p className="text-sm leading-relaxed" style={{ color: "rgba(232,239,248,0.55)" }}>
        {insight}
      </p>

      {/* Sub-categories */}
      <div className="flex flex-col gap-3 pt-1 pl-1">
        <span className="text-xs font-medium tracking-widest uppercase" style={{ color: "rgba(232,239,248,0.25)" }}>
          Sub-categories
        </span>
        {dim.subcategories.map((sub) => {
          const subVal = clamp(score + sub.offset);
          return (
            <div key={sub.name} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "rgba(232,239,248,0.6)" }}>{sub.name}</span>
                <span className="tabular-nums font-medium" style={{ color: "rgba(232,239,248,0.5)" }}>
                  {subVal.toFixed(1)}
                </span>
              </div>
              <DimensionBar score={subVal} showBenchmark={false} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReportPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signup");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("archetype, scores, warmup_background, warmup_industry, has_paid")
    .eq("id", user.id)
    .single();

  if (!profile?.has_paid) redirect("/payment");

  const archetype: string = profile.archetype ?? "The Explorer";
  const scores: Scores    = profile.scores ?? { thinkingStrategy: 2.5, execution: 2.5, technicalFluency: 2.5, userResearch: 2.5, communication: 2.5, overall: 2.5 };
  const background: string = profile.warmup_background ?? "";

  const { strongest, focus } = getStrongestAndFocus(scores);
  const tagline    = ARCHETYPE_TAGLINES[archetype]    ?? ARCHETYPE_TAGLINES["The Explorer"];
  const timeline   = ARCHETYPE_TIMELINES[archetype]   ?? ARCHETYPE_TIMELINES["The Explorer"];
  const pathSummary = ARCHETYPE_PATH_SUMMARY[archetype] ?? ARCHETYPE_PATH_SUMMARY["The Explorer"];
  const whoYouAre  = getWhoYouAre(archetype, background);

  return (
    <div className="flex" style={{ backgroundColor: "#0D1117", minHeight: "100vh" }}>
      {/* Sidebar */}
      <Sidebar userEmail={user.email ?? ""} activePath="/report" />

      {/* Main content */}
      <main
        className="flex-1 min-h-screen px-8 py-10"
        style={{ marginLeft: "240px", color: "#E8EFF8", maxWidth: "900px" }}
      >

        {/* ── Section A: Archetype ── */}
        <section className="flex flex-col gap-8 pb-12" style={{ borderBottom: "1px solid rgba(56,189,248,0.08)" }}>

          {/* Label + archetype name */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-mono tracking-widest uppercase" style={{ color: "rgba(56,189,248,0.5)" }}>
              Archetype 01
            </span>
            <h1
              className="text-4xl lg:text-5xl leading-tight"
              style={{ fontFamily: "var(--font-fraunces)", color: "#E8EFF8" }}
            >
              {archetype}
            </h1>
            <p className="text-base mt-1" style={{ color: "rgba(232,239,248,0.55)" }}>{tagline}</p>
          </div>

          {/* Who you are */}
          <div
            className="flex flex-col gap-2 p-5 rounded-xl"
            style={{ backgroundColor: "rgba(56,189,248,0.04)", border: "1px solid rgba(56,189,248,0.1)" }}
          >
            <span className="text-xs font-medium tracking-widest uppercase" style={{ color: "rgba(56,189,248,0.5)" }}>
              Who you are
            </span>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(232,239,248,0.7)" }}>
              {whoYouAre}
            </p>
          </div>

          {/* Score ring + radar side by side */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left: ring + stat boxes */}
            <div
              className="flex flex-col items-center gap-5 p-6 rounded-2xl"
              style={{ backgroundColor: "rgba(56,189,248,0.03)", border: "1px solid rgba(56,189,248,0.08)" }}
            >
              <ScoreRing score={scores.overall} />
              <span className="text-xs" style={{ color: "rgba(232,239,248,0.3)" }}>Overall readiness score</span>
              <div className="grid grid-cols-2 gap-3 w-full">
                <div
                  className="flex flex-col gap-1 px-4 py-3 rounded-xl"
                  style={{ backgroundColor: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.15)" }}
                >
                  <span className="text-xs font-medium tracking-wider uppercase" style={{ color: "rgba(34,197,94,0.7)" }}>Strongest</span>
                  <span className="text-xs font-medium" style={{ color: "#86EFAC" }}>{strongest.label}</span>
                  <span className="text-lg font-bold tabular-nums" style={{ color: "#86EFAC" }}>{strongest.value.toFixed(1)}</span>
                </div>
                <div
                  className="flex flex-col gap-1 px-4 py-3 rounded-xl"
                  style={{ backgroundColor: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.15)" }}
                >
                  <span className="text-xs font-medium tracking-wider uppercase" style={{ color: "rgba(251,191,36,0.7)" }}>Biggest Opportunity</span>
                  <span className="text-xs font-medium" style={{ color: "#FDE68A" }}>{focus.label}</span>
                  <span className="text-lg font-bold tabular-nums" style={{ color: "#FDE68A" }}>{focus.value.toFixed(1)}</span>
                </div>
              </div>
            </div>

            {/* Right: radar */}
            <div
              className="flex flex-col gap-3 p-5 rounded-2xl"
              style={{ backgroundColor: "rgba(56,189,248,0.03)", border: "1px solid rgba(56,189,248,0.08)" }}
            >
              <span className="text-xs font-mono tracking-widest uppercase" style={{ color: "rgba(56,189,248,0.5)" }}>
                Your 5 Dimensions
              </span>
              <div style={{ height: "280px" }}>
                <ResultsRadar scores={scores} />
              </div>
            </div>
          </div>
        </section>

        {/* ── Section B: Dimensions ── */}
        <section className="flex flex-col gap-0 py-12" style={{ borderBottom: "1px solid rgba(56,189,248,0.08)" }}>
          <div className="flex flex-col gap-1 mb-6">
            <span className="text-xs font-mono tracking-widest uppercase" style={{ color: "rgba(56,189,248,0.5)" }}>
              Section 02
            </span>
            <h2
              className="text-2xl"
              style={{ fontFamily: "var(--font-fraunces)", color: "#E8EFF8" }}
            >
              Your 5 Dimensions
            </h2>
          </div>
          {DIMENSIONS.map((dim) => (
            <DimensionSection
              key={dim.key}
              dim={dim}
              score={scores[dim.key] as number}
            />
          ))}
        </section>

        {/* ── Section C: Your path ── */}
        <section className="flex flex-col gap-6 py-12">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono tracking-widest uppercase" style={{ color: "rgba(56,189,248,0.5)" }}>
              Section 03
            </span>
            <h2
              className="text-2xl"
              style={{ fontFamily: "var(--font-fraunces)", color: "#E8EFF8" }}
            >
              Your path
            </h2>
          </div>

          {/* Summary */}
          <p className="text-sm leading-relaxed max-w-xl" style={{ color: "rgba(232,239,248,0.6)" }}>
            {pathSummary}
          </p>

          {/* Timeline box */}
          <div
            className="flex flex-col gap-1 px-5 py-4 rounded-xl w-fit"
            style={{ backgroundColor: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.15)" }}
          >
            <span className="text-xs font-medium tracking-wider uppercase" style={{ color: "rgba(56,189,248,0.6)" }}>
              Estimated timeline
            </span>
            <span className="text-base font-semibold" style={{ color: "#38BDF8" }}>
              {timeline}
            </span>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/roadmap"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-200 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]"
              style={{ backgroundColor: "#38BDF8", color: "#0D1117" }}
            >
              See your personalised roadmap →
            </Link>
            <Link
              href="/go-deeper"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-200"
              style={{
                backgroundColor: "transparent",
                border: "1.5px solid rgba(56,189,248,0.3)",
                color: "#38BDF8",
              }}
            >
              Go Deeper into a dimension →
            </Link>
          </div>
        </section>

      </main>
    </div>
  );
}
