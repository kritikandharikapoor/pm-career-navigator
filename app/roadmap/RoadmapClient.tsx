"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import { contentLibrary, type Archetype } from "@/lib/data/content_library";
import type { Scores } from "@/lib/data/assessment";

// ─── Types ────────────────────────────────────────────────────────────────────

type DimKey = keyof Omit<Scores, "overall">;
type StepStatus = "active" | "greyed" | "done";

type StepDef = {
  topicKey: string;
  label: string;
  dimension: DimKey;
  dimensionLabel: string;
};

type Step = StepDef & {
  score: number;
  status: StepStatus;
  gap: number;
  content: string;
  videos: string[] | null;
};

// ─── Static data ─────────────────────────────────────────────────────────────

const STEPS: StepDef[] = [
  { topicKey: "productSense",         label: "Product Sense",                dimension: "thinkingStrategy", dimensionLabel: "Thinking & Strategy" },
  { topicKey: "guesstimates",         label: "Guesstimates & Market Sizing", dimension: "thinkingStrategy", dimensionLabel: "Thinking & Strategy" },
  { topicKey: "prioritisation",       label: "Prioritisation",               dimension: "thinkingStrategy", dimensionLabel: "Thinking & Strategy" },
  { topicKey: "productStrategy",      label: "Product Strategy",             dimension: "thinkingStrategy", dimensionLabel: "Thinking & Strategy" },
  { topicKey: "competitiveAnalysis",  label: "Competitive Analysis",         dimension: "thinkingStrategy", dimensionLabel: "Thinking & Strategy" },
  { topicKey: "metricsKpis",          label: "Metrics & KPIs",               dimension: "execution",        dimensionLabel: "Execution" },
  { topicKey: "abTesting",            label: "A/B Testing & Experimentation",dimension: "execution",        dimensionLabel: "Execution" },
  { topicKey: "goToMarket",           label: "Go-to-Market",                 dimension: "execution",        dimensionLabel: "Execution" },
  { topicKey: "roadmapping",          label: "Roadmapping",                  dimension: "execution",        dimensionLabel: "Execution" },
  { topicKey: "stakeholderManagement",label: "Stakeholder Management",       dimension: "execution",        dimensionLabel: "Execution" },
  { topicKey: "techFundamentals",     label: "Tech Fundamentals for PMs",    dimension: "technicalFluency", dimensionLabel: "Technical Fluency" },
  { topicKey: "aiMlForPms",           label: "AI / ML for PMs",              dimension: "technicalFluency", dimensionLabel: "Technical Fluency" },
  { topicKey: "dataSql",              label: "Data & SQL",                   dimension: "technicalFluency", dimensionLabel: "Technical Fluency" },
  { topicKey: "systemDesign",         label: "System Design Basics",         dimension: "technicalFluency", dimensionLabel: "Technical Fluency" },
  { topicKey: "userResearch",         label: "User Research",                dimension: "userResearch",     dimensionLabel: "User & Research" },
  { topicKey: "uxThinking",           label: "UX Thinking",                  dimension: "userResearch",     dimensionLabel: "User & Research" },
  { topicKey: "customerEmpathy",      label: "Customer Empathy",             dimension: "userResearch",     dimensionLabel: "User & Research" },
  { topicKey: "writtenCommunication", label: "Written Communication",        dimension: "communication",    dimensionLabel: "Communication" },
  { topicKey: "productStorytelling",  label: "Product Storytelling",         dimension: "communication",    dimensionLabel: "Communication" },
  { topicKey: "stakeholderInfluence", label: "Stakeholder Influence",        dimension: "communication",    dimensionLabel: "Communication" },
];

const VIDEO_LINKS: Record<string, string[]> = {
  productSense:       ["https://www.youtube.com/watch?v=0-wYH7zlmIA", "https://www.youtube.com/watch?v=cj2VYwHNpMQ"],
  guesstimates:       ["https://www.youtube.com/watch?v=2HI7dsZ1e0U", "https://www.youtube.com/watch?v=6_647DTz0sA"],
  prioritisation:     ["https://www.youtube.com/watch?v=atIilj52Sfc"],
  productStrategy:    ["https://www.youtube.com/watch?v=FVYtaEwDBC0"],
  competitiveAnalysis:["https://www.youtube.com/watch?v=CWhwIt-tZWU"],
  metricsKpis:        ["https://www.youtube.com/watch?v=6IdLCRy_Suo"],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toArchetypeKey(archetype: string): Archetype {
  const map: Record<string, Archetype> = {
    "The Strategist": "strategist",
    "The Builder":    "builder",
    "The Advocate":   "advocate",
    "The Operator":   "operator",
    "The Explorer":   "explorer",
  };
  return map[archetype] ?? "explorer";
}

function barColor(score: number, status: StepStatus): string {
  if (status === "done" || status === "greyed") return "#22C55E";
  if (score >= 2.0) return "#F59E0B";
  return "#EF4444";
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  archetype: string;
  scores: Scores;
  userId: string;
  completedStepIds: string[];
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function RoadmapClient({ archetype, scores, userId, completedStepIds }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const archetypeKey = toArchetypeKey(archetype);
  const defaultTimeline = archetype === "The Explorer" ? "6 months" : "3 months";

  const [timeline, setTimeline]         = useState(defaultTimeline);
  const [resources, setResources]       = useState({ video: true, text: false });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set(completedStepIds));
  const [expandedText, setExpandedText] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Build steps with status
  const allSteps: Step[] = useMemo(() => {
    return STEPS.map((s) => {
      const score  = scores[s.dimension] as number;
      const isDone = completedSteps.has(s.topicKey);
      const status: StepStatus = isDone ? "done" : score >= 3.5 ? "greyed" : "active";
      const gap    = Math.max(0, 3.5 - score);
      const content = contentLibrary[archetypeKey]?.[s.topicKey] ?? "";
      const videos  = VIDEO_LINKS[s.topicKey] ?? null;
      return { ...s, score, status, gap, content, videos };
    });
  }, [archetypeKey, scores, completedSteps]);

  const activeSteps  = allSteps.filter((s) => s.status === "active").sort((a, b) => b.gap - a.gap);
  const doneSteps    = allSteps.filter((s) => s.status === "done");
  const greyedSteps  = allSteps.filter((s) => s.status === "greyed");
  const sortedSteps  = [...activeSteps, ...doneSteps, ...greyedSteps];

  // Progress stats
  const totalNeedWork  = activeSteps.length + doneSteps.length;
  const completedCount = doneSteps.length;
  const progressPct    = totalNeedWork > 0 ? (completedCount / totalNeedWork) * 100 : 0;

  // Projected overall gain if all weak dimensions reach 3.5
  const projectedGain = (
    (Math.max(scores.thinkingStrategy, 3.5) +
     Math.max(scores.execution, 3.5) +
     Math.max(scores.technicalFluency, 3.5) +
     Math.max(scores.userResearch, 3.5) +
     Math.max(scores.communication, 3.5)) / 5 - scores.overall
  ).toFixed(1);

  // Resource dropdown label
  const resourceLabel =
    resources.video && resources.text ? "📹 Video + 📄 Text"
    : resources.video                 ? "📹 Video"
    : resources.text                  ? "📄 Text"
    : "Select resources";

  // Mark step as done
  // Note: if FK error persists, verify the user exists in auth.users via Supabase dashboard
  async function markDone(topicKey: string, dimension: string) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.log("No authenticated user found");
      return;
    }

    console.log("Inserting roadmap_progress for user:", user.id);

    const { error } = await supabase.from("roadmap_progress").insert({
      user_id: user.id,
      step_id: topicKey,
      dimension,
    });
    // 23505 = unique violation (already marked), safe to ignore
    if (error && error.code !== "23505") {
      console.error("roadmap_progress insert error:", error.message);
    }
    setCompletedSteps((prev) => new Set([...prev, topicKey]));
  }

  function toggleText(topicKey: string) {
    setExpandedText((prev) => {
      const next = new Set(prev);
      next.has(topicKey) ? next.delete(topicKey) : next.add(topicKey);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-8">

      {/* ── Header ── */}
      <div className="flex flex-col gap-1">
        <h1
          className="text-3xl lg:text-4xl"
          style={{ fontFamily: "var(--font-fraunces)", color: "#E8EFF8" }}
        >
          Your Roadmap
        </h1>
        <p className="text-sm" style={{ color: "rgba(232,239,248,0.45)" }}>
          {archetype}
        </p>
      </div>

      {/* ── Controls row ── */}
      <div className="flex flex-wrap items-start gap-6">

        {/* Timeline selector */}
        <div className="flex flex-col gap-1.5">
          <div
            className="flex items-center gap-1 p-1 rounded-full"
            style={{
              backgroundColor: "rgba(56,189,248,0.06)",
              border: "1px solid rgba(56,189,248,0.1)",
            }}
          >
            {["1 month", "3 months", "6 months"].map((t) => (
              <button
                key={t}
                onClick={() => setTimeline(t)}
                className="px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150"
                style={{
                  backgroundColor: timeline === t ? "#38BDF8" : "transparent",
                  color: timeline === t ? "#0D1117" : "rgba(232,239,248,0.5)",
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="text-xs pl-2" style={{ color: "#22C55E" }}>
            Suggested for your archetype ✓
          </p>
        </div>

        {/* Resource type dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: "rgba(56,189,248,0.06)",
              border: "1px solid rgba(56,189,248,0.1)",
              color: "#E8EFF8",
            }}
          >
            {resourceLabel}
            <span style={{ color: "rgba(232,239,248,0.4)" }}>▾</span>
          </button>
          {dropdownOpen && (
            <div
              className="absolute top-full mt-1 left-0 z-50 rounded-xl overflow-hidden"
              style={{
                backgroundColor: "#131920",
                border: "1px solid rgba(56,189,248,0.12)",
                minWidth: "160px",
              }}
            >
              {(["video", "text"] as const).map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer text-sm hover:bg-white/5"
                  style={{ color: "rgba(232,239,248,0.8)" }}
                >
                  <input
                    type="checkbox"
                    checked={resources[key]}
                    onChange={(e) =>
                      setResources((r) => ({ ...r, [key]: e.target.checked }))
                    }
                    className="accent-sky-400"
                  />
                  {key === "video" ? "📹 Video" : "📄 Text"}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Progress summary ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm" style={{ color: "rgba(232,239,248,0.6)" }}>
            {completedCount} of {totalNeedWork} steps completed
          </span>
          <span className="text-sm font-medium" style={{ color: "#22C55E" }}>
            +{projectedGain} pts projected on completion
          </span>
        </div>
        <div
          className="w-full h-1.5 rounded-full"
          style={{ backgroundColor: "rgba(56,189,248,0.08)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              background: "linear-gradient(to right, #38BDF8, #22C55E)",
            }}
          />
        </div>
      </div>

      {/* ── Steps ── */}
      <div className="flex flex-col gap-3">
        {sortedSteps.map((step, idx) => {
          const isDone   = step.status === "done";
          const isGreyed = step.status === "greyed";
          const isActive = step.status === "active";
          const isExpanded = expandedText.has(step.topicKey);

          const leftBorder = isDone
            ? "3px solid rgba(34,197,94,0.5)"
            : isGreyed
            ? "3px solid rgba(232,239,248,0.1)"
            : "3px solid rgba(56,189,248,0.5)";

          return (
            <div
              key={step.topicKey}
              className="flex flex-col gap-4 p-5 rounded-xl"
              style={{
                backgroundColor: "rgba(56,189,248,0.03)",
                border: "1px solid rgba(56,189,248,0.07)",
                borderLeft: leftBorder,
                opacity: isGreyed ? 0.6 : 1,
              }}
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {/* Number circle */}
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: isDone
                        ? "rgba(34,197,94,0.15)"
                        : isGreyed
                        ? "rgba(232,239,248,0.06)"
                        : "rgba(56,189,248,0.12)",
                      color: isDone
                        ? "#22C55E"
                        : isGreyed
                        ? "rgba(232,239,248,0.4)"
                        : "#38BDF8",
                    }}
                  >
                    {isDone ? "✓" : idx + 1}
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: isGreyed ? "rgba(232,239,248,0.6)" : "#E8EFF8" }}
                    >
                      {step.label}
                    </span>
                    <span
                      className="text-xs font-mono"
                      style={{ color: "rgba(232,239,248,0.35)" }}
                    >
                      {step.dimensionLabel} · {step.score.toFixed(1)}/5
                    </span>
                  </div>
                </div>

                {/* Status badge */}
                {isDone && (
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#86EFAC" }}
                  >
                    ✓ Done
                  </span>
                )}
                {isGreyed && (
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: "rgba(34,197,94,0.08)", color: "#86EFAC" }}
                  >
                    Already strong here
                  </span>
                )}
              </div>

              {/* Score bar */}
              <div
                className="relative w-full h-1.5 rounded-full"
                style={{
                  backgroundColor: "rgba(56,189,248,0.08)",
                  marginLeft: "40px",
                  width: "calc(100% - 40px)",
                }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(step.score / 5) * 100}%`,
                    backgroundColor: barColor(step.score, step.status),
                  }}
                />
                <div
                  className="absolute top-0 h-full w-px"
                  style={{
                    left: `${(3.5 / 5) * 100}%`,
                    backgroundColor: "rgba(232,239,248,0.3)",
                  }}
                />
              </div>

              {/* Description */}
              <p
                className="text-sm leading-relaxed"
                style={{
                  color: "rgba(232,239,248,0.55)",
                  marginLeft: "40px",
                }}
              >
                {step.content.slice(0, 250)}
                {step.content.length > 250 ? "…" : ""}
              </p>

              {/* Resources */}
              <div className="flex flex-col gap-2.5" style={{ marginLeft: "40px" }}>

                {/* Video */}
                {resources.video && (
                  <div className="flex flex-col gap-1.5">
                    {step.videos ? (
                      step.videos.map((url, vi) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm w-fit"
                          style={{ color: "#38BDF8" }}
                        >
                          ▶ Watch — {step.label}
                          {step.videos && step.videos.length > 1
                            ? ` (${vi + 1})`
                            : ""}
                        </a>
                      ))
                    ) : (
                      <span
                        className="text-sm"
                        style={{ color: "rgba(232,239,248,0.3)" }}
                      >
                        Video coming soon — Shraavan Tickoo
                      </span>
                    )}
                  </div>
                )}

                {/* Text */}
                {resources.text && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => toggleText(step.topicKey)}
                      className="inline-flex items-center gap-1.5 text-sm w-fit"
                      style={{ color: "rgba(232,239,248,0.6)" }}
                    >
                      📄 Read content {isExpanded ? "▴" : "▾"}
                    </button>
                    {isExpanded && (
                      <p
                        className="text-sm leading-relaxed p-4 rounded-lg"
                        style={{
                          color: "rgba(232,239,248,0.65)",
                          backgroundColor: "rgba(56,189,248,0.04)",
                          border: "1px solid rgba(56,189,248,0.08)",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {step.content}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action */}
              <div style={{ marginLeft: "40px" }}>
                {isActive && (
                  <button
                    onClick={() => markDone(step.topicKey, step.dimension)}
                    className="text-sm font-medium px-4 py-2 rounded-full transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                    style={{
                      backgroundColor: "transparent",
                      border: "1.5px solid rgba(34,197,94,0.4)",
                      color: "#86EFAC",
                    }}
                  >
                    Mark as done ✓
                  </button>
                )}
                {isDone && (
                  <span className="text-sm" style={{ color: "rgba(232,239,248,0.3)" }}>
                    Revisit →
                  </span>
                )}
                {isGreyed && (
                  <span className="text-sm" style={{ color: "rgba(232,239,248,0.3)" }}>
                    Revisit if you want →
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
