"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, ReferenceLine, Tooltip, CartesianGrid,
} from "recharts";
import type { Scores } from "@/lib/data/assessment";

// ─── Types ────────────────────────────────────────────────────────────────────

type DimKey = keyof Omit<Scores, "overall">;

type Props = {
  email: string;
  archetype: string;
  scores: Scores;
  createdAt: string;
  completedStepIds: string[];
  scoreHistory: { overall_score: number; evaluated_at: string }[];
};

// ─── Steps (mirrors roadmap — used for progress preview) ─────────────────────

const STEPS: { topicKey: string; label: string; dimension: DimKey }[] = [
  { topicKey: "productSense",          label: "Product Sense",                dimension: "thinkingStrategy" },
  { topicKey: "guesstimates",          label: "Guesstimates & Market Sizing", dimension: "thinkingStrategy" },
  { topicKey: "prioritisation",        label: "Prioritisation",               dimension: "thinkingStrategy" },
  { topicKey: "productStrategy",       label: "Product Strategy",             dimension: "thinkingStrategy" },
  { topicKey: "competitiveAnalysis",   label: "Competitive Analysis",         dimension: "thinkingStrategy" },
  { topicKey: "metricsKpis",           label: "Metrics & KPIs",               dimension: "execution"        },
  { topicKey: "abTesting",             label: "A/B Testing",                  dimension: "execution"        },
  { topicKey: "goToMarket",            label: "Go-to-Market",                 dimension: "execution"        },
  { topicKey: "roadmapping",           label: "Roadmapping",                  dimension: "execution"        },
  { topicKey: "stakeholderManagement", label: "Stakeholder Management",       dimension: "execution"        },
  { topicKey: "techFundamentals",      label: "Tech Fundamentals",            dimension: "technicalFluency" },
  { topicKey: "aiMlForPms",            label: "AI / ML for PMs",              dimension: "technicalFluency" },
  { topicKey: "dataSql",               label: "Data & SQL",                   dimension: "technicalFluency" },
  { topicKey: "systemDesign",          label: "System Design",                dimension: "technicalFluency" },
  { topicKey: "userResearch",          label: "User Research",                dimension: "userResearch"     },
  { topicKey: "uxThinking",            label: "UX Thinking",                  dimension: "userResearch"     },
  { topicKey: "customerEmpathy",       label: "Customer Empathy",             dimension: "userResearch"     },
  { topicKey: "writtenCommunication",  label: "Written Communication",        dimension: "communication"    },
  { topicKey: "productStorytelling",   label: "Product Storytelling",         dimension: "communication"    },
  { topicKey: "stakeholderInfluence",  label: "Stakeholder Influence",        dimension: "communication"    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFirstName(email: string): string {
  const local = email.split("@")[0];
  const name  = local.split(/[._\-+]/)[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function dimColor(score: number): string {
  if (score >= 3.5) return "#22C55E";
  if (score >= 2.0) return "#F59E0B";
  return "#EF4444";
}

const TIME_TO_READINESS: Record<string, string> = {
  "The Strategist": "~2 months",
  "The Builder":    "~3 months",
  "The Advocate":   "~3 months",
  "The Operator":   "~4 months",
  "The Explorer":   "~5 months",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreRing({ score, size = 92 }: { score: number; size?: number }) {
  const cx   = size / 2;
  const cy   = size / 2;
  const r    = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const fill = Math.min(score / 5, 1) * circ;
  const color = dimColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(56,189,248,0.1)" strokeWidth={8} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy + 7} textAnchor="middle" fill="#E8EFF8" fontSize={18} fontWeight="700">
        {score.toFixed(1)}
      </text>
    </svg>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      className="flex flex-col gap-4 p-5 rounded-2xl"
      style={{
        backgroundColor: "rgba(56,189,248,0.03)",
        border: "1px solid rgba(56,189,248,0.08)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-xs font-bold tracking-widest"
      style={{ fontFamily: "monospace", color: "rgba(232,239,248,0.35)" }}
    >
      {children}
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DashboardClient({
  email, archetype, scores, createdAt, completedStepIds, scoreHistory,
}: Props) {

  // Time-based greeting — client only to avoid hydration mismatch
  const [greeting, setGreeting] = useState("Welcome back");
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
  }, []);

  const firstName    = getFirstName(email);
  const completedSet = new Set(completedStepIds);

  // Roadmap stats
  const activeSteps  = STEPS.filter(s => (scores[s.dimension] as number) < 3.5);
  const doneCount    = activeSteps.filter(s => completedSet.has(s.topicKey)).length;
  const totalActive  = activeSteps.length;
  const progressPct  = totalActive > 0 ? (doneCount / totalActive) * 100 : 0;
  const STEPS_PER_WEEK = 2;
  const totalWeeks   = Math.max(1, Math.ceil(totalActive / STEPS_PER_WEEK));
  const currentWeek  = Math.min(Math.floor(doneCount / STEPS_PER_WEEK) + 1, totalWeeks);
  const nextSteps    = activeSteps.filter(s => !completedSet.has(s.topicKey)).slice(0, 3);

  // Radar data
  const radarData = [
    { dim: "Thinking",  score: scores.thinkingStrategy },
    { dim: "Execution", score: scores.execution        },
    { dim: "Technical", score: scores.technicalFluency },
    { dim: "Research",  score: scores.userResearch     },
    { dim: "Comms",     score: scores.communication    },
  ];

  // Dimension bars
  const dimensions = [
    { label: "Thinking & Strategy", score: scores.thinkingStrategy },
    { label: "Execution",           score: scores.execution        },
    { label: "Technical Fluency",   score: scores.technicalFluency },
    { label: "User & Research",     score: scores.userResearch     },
    { label: "Communication",       score: scores.communication    },
  ];

  // Chart data
  const chartData = scoreHistory.map(row => ({
    date:  new Date(row.evaluated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: Number(Number(row.overall_score).toFixed(1)),
  }));

  return (
    <div className="flex flex-col gap-7">

      {/* ── Greeting ── */}
      <div className="flex flex-col gap-1">
        <h1
          className="text-3xl lg:text-4xl"
          style={{ fontFamily: "var(--font-fraunces)", color: "#E8EFF8" }}
        >
          {greeting}, {firstName}
        </h1>
        <p className="text-sm" style={{ color: "rgba(232,239,248,0.45)" }}>
          {archetype} · Last evaluated {formatDate(createdAt)}
        </p>
      </div>

      {/* ── Top 3 metric cards ── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>

        {/* Readiness score */}
        <Card>
          <CardLabel>READINESS SCORE</CardLabel>
          <div className="flex flex-col items-center gap-2 py-1">
            <ScoreRing score={scores.overall} />
            <p className="text-xs" style={{ color: "rgba(232,239,248,0.35)" }}>
              Entry-level target: 3.5
            </p>
            <p className="text-xs font-medium" style={{ color: "#22C55E" }}>
              ↑ 0.0 since last evaluation
            </p>
          </div>
        </Card>

        {/* Roadmap progress */}
        <Card>
          <CardLabel>ROADMAP PROGRESS</CardLabel>
          <div className="flex flex-col gap-3 py-1">
            <p
              style={{ fontFamily: "var(--font-fraunces)", color: "#E8EFF8", fontSize: 30, lineHeight: 1 }}
            >
              Week {currentWeek}
              <span style={{ fontSize: 15, color: "rgba(232,239,248,0.35)", marginLeft: 4 }}>
                of {totalWeeks}
              </span>
            </p>
            <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: "rgba(56,189,248,0.08)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPct}%`,
                  background: "linear-gradient(to right, #38BDF8, #22C55E)",
                }}
              />
            </div>
            <p className="text-xs" style={{ color: "rgba(232,239,248,0.4)" }}>
              {doneCount} of {totalActive} steps done
            </p>
          </div>
        </Card>

        {/* Time to readiness */}
        <Card>
          <CardLabel>TIME TO READINESS</CardLabel>
          <div className="flex flex-col gap-2 py-1">
            <p
              style={{ fontFamily: "var(--font-fraunces)", color: "#E8EFF8", fontSize: 30, lineHeight: 1 }}
            >
              {TIME_TO_READINESS[archetype] ?? "~3 months"}
            </p>
            <p className="text-xs" style={{ color: "rgba(232,239,248,0.4)" }}>
              At 5–8 hrs/week
            </p>
          </div>
        </Card>
      </div>

      {/* ── Re-evaluate CTA ── */}
      <div
        className="flex items-center justify-between gap-6 p-6 rounded-2xl"
        style={{
          backgroundColor: "rgba(56,189,248,0.03)",
          border: "1px solid rgba(56,189,248,0.08)",
          borderLeft: "3px solid #38BDF8",
        }}
      >
        <div className="flex flex-col gap-1.5">
          <p className="font-semibold" style={{ color: "#E8EFF8", fontSize: 15 }}>
            ⟳ Ready to re-evaluate?
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(232,239,248,0.5)" }}>
            Take the re-evaluation to see how your score has improved. 30 questions, harder variants, more from your weakest dimensions.
          </p>
        </div>
        <Link
          href="/re-evaluate"
          className="flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ backgroundColor: "#38BDF8", color: "#0D1117", whiteSpace: "nowrap" }}
        >
          Re-evaluate now →
        </Link>
      </div>

      {/* ── Two-column row ── */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>

        {/* Roadmap preview */}
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: "#E8EFF8" }}>Your Roadmap</p>
            <Link href="/roadmap" className="text-xs" style={{ color: "#38BDF8" }}>
              View full roadmap →
            </Link>
          </div>

          <div className="flex flex-col gap-2.5">
            {nextSteps.length === 0 ? (
              <p className="text-sm" style={{ color: "rgba(232,239,248,0.4)" }}>
                All active steps complete 🎉
              </p>
            ) : (
              nextSteps.map((step, i) => {
                const isCurrent = i === 0;
                const dotColor  = isCurrent ? "#38BDF8" : "rgba(232,239,248,0.2)";
                const pillBg    = isCurrent ? "rgba(56,189,248,0.12)" : "rgba(232,239,248,0.06)";
                const pillColor = isCurrent ? "#38BDF8" : "rgba(232,239,248,0.3)";
                return (
                  <div key={step.topicKey} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                    <span className="flex-1 text-sm" style={{ color: "rgba(232,239,248,0.8)" }}>
                      {step.label}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: pillBg, color: pillColor }}
                    >
                      {isCurrent ? "In progress" : "Not started"}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex flex-col gap-1 mt-auto pt-2" style={{ borderTop: "1px solid rgba(56,189,248,0.06)" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "rgba(232,239,248,0.3)" }}>
                Overall progress
              </span>
              <span className="text-xs" style={{ color: "rgba(232,239,248,0.3)" }}>
                {Math.round(progressPct)}%
              </span>
            </div>
            <div className="w-full h-1 rounded-full" style={{ backgroundColor: "rgba(56,189,248,0.08)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${progressPct}%`, backgroundColor: "#38BDF8" }}
              />
            </div>
          </div>
        </Card>

        {/* Diagnostic snapshot */}
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: "#E8EFF8" }}>Diagnostic Report</p>
            <Link href="/report" className="text-xs" style={{ color: "#38BDF8" }}>
              Full report →
            </Link>
          </div>

          <div className="flex gap-4 items-start">
            {/* Dimension bars */}
            <div className="flex flex-col gap-2 flex-1">
              <p className="text-xs" style={{ color: "rgba(232,239,248,0.4)" }}>{archetype}</p>
              {dimensions.map(d => (
                <div key={d.label} className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "rgba(232,239,248,0.45)" }}>{d.label}</span>
                    <span className="text-xs font-mono" style={{ color: dimColor(d.score) }}>
                      {d.score.toFixed(1)}
                    </span>
                  </div>
                  <div className="w-full h-1 rounded-full" style={{ backgroundColor: "rgba(56,189,248,0.08)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(d.score / 5) * 100}%`, backgroundColor: dimColor(d.score) }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Mini radar */}
            <div style={{ width: 108, height: 108, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <PolarGrid stroke="rgba(56,189,248,0.15)" />
                  <PolarAngleAxis dataKey="dim" tick={false} />
                  <Radar
                    dataKey="score"
                    stroke="#38BDF8"
                    fill="#38BDF8"
                    fillOpacity={0.15}
                    strokeWidth={1.5}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Score history chart ── */}
      <Card>
        <p className="text-sm font-semibold" style={{ color: "#E8EFF8" }}>
          Readiness Score Over Time
        </p>
        {chartData.length < 2 ? (
          <div
            className="flex flex-col items-center justify-center gap-2"
            style={{ height: 190 }}
          >
            <p className="text-sm" style={{ color: "rgba(232,239,248,0.35)" }}>
              Re-evaluate to track your score over time
            </p>
            <p className="text-xs" style={{ color: "rgba(232,239,248,0.2)" }}>
              Your baseline score of {scores.overall.toFixed(1)} has been recorded
            </p>
          </div>
        ) : (
        <div style={{ height: 190 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 12, right: 16, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#38BDF8" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#38BDF8" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(56,189,248,0.05)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fontFamily: "monospace", fill: "rgba(232,239,248,0.3)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 5]}
                ticks={[0, 1, 2, 3, 4, 5]}
                tick={{ fontSize: 10, fontFamily: "monospace", fill: "rgba(232,239,248,0.3)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#131920",
                  border: "1px solid rgba(56,189,248,0.15)",
                  borderRadius: 8,
                  color: "#E8EFF8",
                  fontSize: 12,
                }}
                formatter={(val: number) => [val.toFixed(1), "Score"]}
              />
              <ReferenceLine
                y={3.5}
                stroke="rgba(56,189,248,0.3)"
                strokeDasharray="4 4"
                label={{
                  value: "Entry-level PM",
                  position: "insideTopRight",
                  fontSize: 10,
                  fill: "rgba(56,189,248,0.45)",
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#38BDF8"
                strokeWidth={2}
                fill="url(#scoreGrad)"
                dot={{ fill: "#38BDF8", r: 4, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#38BDF8" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        )}
      </Card>

    </div>
  );
}
