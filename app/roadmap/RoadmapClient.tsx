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

type Week = {
  weekNumber: number;
  steps: Step[];
  type: "work" | "revision" | "greyed";
  startDate: Date;
  endDate: Date;
  isLocked: boolean;
};

// ─── Static data ─────────────────────────────────────────────────────────────

const STEPS: StepDef[] = [
  { topicKey: "productSense",         label: "Product Sense",                 dimension: "thinkingStrategy", dimensionLabel: "Thinking & Strategy" },
  { topicKey: "guesstimates",         label: "Guesstimates & Market Sizing",  dimension: "thinkingStrategy", dimensionLabel: "Thinking & Strategy" },
  { topicKey: "prioritisation",       label: "Prioritisation",                dimension: "thinkingStrategy", dimensionLabel: "Thinking & Strategy" },
  { topicKey: "productStrategy",      label: "Product Strategy",              dimension: "thinkingStrategy", dimensionLabel: "Thinking & Strategy" },
  { topicKey: "competitiveAnalysis",  label: "Competitive Analysis",          dimension: "thinkingStrategy", dimensionLabel: "Thinking & Strategy" },
  { topicKey: "metricsKpis",          label: "Metrics & KPIs",                dimension: "execution",        dimensionLabel: "Execution" },
  { topicKey: "abTesting",            label: "A/B Testing & Experimentation", dimension: "execution",        dimensionLabel: "Execution" },
  { topicKey: "goToMarket",           label: "Go-to-Market",                  dimension: "execution",        dimensionLabel: "Execution" },
  { topicKey: "roadmapping",          label: "Roadmapping",                   dimension: "execution",        dimensionLabel: "Execution" },
  { topicKey: "stakeholderManagement",label: "Stakeholder Management",        dimension: "execution",        dimensionLabel: "Execution" },
  { topicKey: "techFundamentals",     label: "Tech Fundamentals for PMs",     dimension: "technicalFluency", dimensionLabel: "Technical Fluency" },
  { topicKey: "aiMlForPms",           label: "AI / ML for PMs",               dimension: "technicalFluency", dimensionLabel: "Technical Fluency" },
  { topicKey: "dataSql",              label: "Data & SQL",                    dimension: "technicalFluency", dimensionLabel: "Technical Fluency" },
  { topicKey: "systemDesign",         label: "System Design Basics",          dimension: "technicalFluency", dimensionLabel: "Technical Fluency" },
  { topicKey: "userResearch",         label: "User Research",                 dimension: "userResearch",     dimensionLabel: "User & Research" },
  { topicKey: "uxThinking",           label: "UX Thinking",                   dimension: "userResearch",     dimensionLabel: "User & Research" },
  { topicKey: "customerEmpathy",      label: "Customer Empathy",              dimension: "userResearch",     dimensionLabel: "User & Research" },
  { topicKey: "writtenCommunication", label: "Written Communication",         dimension: "communication",    dimensionLabel: "Communication" },
  { topicKey: "productStorytelling",  label: "Product Storytelling",          dimension: "communication",    dimensionLabel: "Communication" },
  { topicKey: "stakeholderInfluence", label: "Stakeholder Influence",         dimension: "communication",    dimensionLabel: "Communication" },
];


const VIDEO_LINKS: Record<string, string[]> = {
  productSense:        ["https://www.youtube.com/watch?v=0-wYH7zlmIA", "https://www.youtube.com/watch?v=cj2VYwHNpMQ"],
  guesstimates:        ["https://www.youtube.com/watch?v=2HI7dsZ1e0U", "https://www.youtube.com/watch?v=6_647DTz0sA"],
  prioritisation:      ["https://www.youtube.com/watch?v=atIilj52Sfc"],
  productStrategy:     ["https://www.youtube.com/watch?v=FVYtaEwDBC0"],
  competitiveAnalysis: ["https://www.youtube.com/watch?v=CWhwIt-tZWU"],
  metricsKpis:         ["https://www.youtube.com/watch?v=6IdLCRy_Suo"],
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

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function chunkInto(items: Step[], n: number): Step[][] {
  if (items.length === 0) return [];
  const actual = Math.min(n, items.length);
  const size = Math.ceil(items.length / actual);
  const result: Step[][] = [];
  for (let i = 0; i < actual; i++) {
    const chunk = items.slice(i * size, (i + 1) * size);
    if (chunk.length > 0) result.push(chunk);
  }
  return result;
}

function weekDates(firstVisit: Date, weekOffset: number): { startDate: Date; endDate: Date } {
  const startDate = new Date(firstVisit);
  startDate.setDate(startDate.getDate() + weekOffset * 7);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  return { startDate, endDate };
}

// ─── buildWeeks ───────────────────────────────────────────────────────────────
// Distribution is based on score (stable) — not on current completion status
// so weeks don't reshuffle when steps are marked done.

function buildWeeks(timeline: string, baseSteps: Step[], firstVisit: Date): Week[] {
  // Sort: highest-gap (most urgent) active steps first
  const needsWork = [...baseSteps]
    .filter(s => s.score < 3.5)
    .sort((a, b) => b.gap - a.gap);
  const alreadyStrong = baseSteps.filter(s => s.score >= 3.5);

  const weeks: Week[] = [];

  if (timeline === "1 month") {
    // 4 weeks × 5 steps — mix all 20 steps
    const all = [...needsWork, ...alreadyStrong];
    chunkInto(all, 4).forEach((chunk, i) => {
      weeks.push({ weekNumber: i + 1, steps: chunk, type: "work", isLocked: false, ...weekDates(firstVisit, i) });
    });
  } else if (timeline === "3 months") {
    // 8 work weeks for active steps
    chunkInto(needsWork, 8).forEach((chunk, i) => {
      weeks.push({ weekNumber: i + 1, steps: chunk, type: "work", isLocked: false, ...weekDates(firstVisit, i) });
    });
    // 4 revision weeks for already-strong steps
    chunkInto(alreadyStrong, 4).forEach((chunk, i) => {
      weeks.push({ weekNumber: 9 + i, steps: chunk, type: "revision", isLocked: false, ...weekDates(firstVisit, 8 + i) });
    });
  } else {
    // 6 months: 16 active weeks + 8 locked greyed weeks
    chunkInto(needsWork, 16).forEach((chunk, i) => {
      weeks.push({ weekNumber: i + 1, steps: chunk, type: "work", isLocked: false, ...weekDates(firstVisit, i) });
    });
    chunkInto(alreadyStrong, 8).forEach((chunk, i) => {
      weeks.push({ weekNumber: 17 + i, steps: chunk, type: "greyed", isLocked: true, ...weekDates(firstVisit, 16 + i) });
    });
  }

  return weeks;
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  archetype: string;
  scores: Scores;
  userId: string;
  completedStepIds: string[];
  firstVisit: string;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function RoadmapClient({ archetype, scores, completedStepIds, firstVisit }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const archetypeKey = toArchetypeKey(archetype);
  const defaultTimeline = archetype === "The Explorer" ? "6 months" : "3 months";

  const [timeline, setTimeline]         = useState(defaultTimeline);
  const [resources, setResources]       = useState({ video: true, text: false });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set(completedStepIds));
  const dropdownRef = useRef<HTMLDivElement>(null);

  const firstVisitDate = useMemo(() => {
    const d = new Date(firstVisit);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [firstVisit]);

  // ── Base steps: stable distribution — no completedSteps dependency ──────────
  const baseSteps: Step[] = useMemo(() => {
    return STEPS.map(s => {
      const score   = scores[s.dimension] as number;
      const gap     = Math.max(0, 3.5 - score);
      const content = contentLibrary[archetypeKey]?.[s.topicKey] ?? "";
      const videos  = VIDEO_LINKS[s.topicKey] ?? null;
      const status: StepStatus = score >= 3.5 ? "greyed" : "active";
      return { ...s, score, status, gap, content, videos };
    });
  }, [archetypeKey, scores]);

  // ── allSteps: current completion state overlaid ───────────────────────────
  const allSteps: Step[] = useMemo(() => {
    return baseSteps.map(s => ({
      ...s,
      status: completedSteps.has(s.topicKey) ? "done" : s.status,
    }));
  }, [baseSteps, completedSteps]);

  const stepMap = useMemo(() => new Map(allSteps.map(s => [s.topicKey, s])), [allSteps]);

  // ── Weeks built from baseSteps (stable) ───────────────────────────────────
  const weeks = useMemo(() => buildWeeks(timeline, baseSteps, firstVisitDate), [timeline, baseSteps, firstVisitDate]);

  // ── Current week index — client-only to avoid SSR/hydration mismatch ────────
  const [currentWeekIdx, setCurrentWeekIdx] = useState(0);
  const [expandedWeeks, setExpandedWeeks]   = useState<Set<number>>(new Set([0]));

  useEffect(() => {
    const ms = firstVisitDate.getTime();
    const daysDiff = isNaN(ms) ? 0 : Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24));
    const idx = Math.min(Math.max(0, Math.floor(daysDiff / 7)), Math.max(0, weeks.length - 1));
    setCurrentWeekIdx(idx);
    setExpandedWeeks(new Set([idx]));
  }, [timeline, firstVisitDate, weeks.length]);

  // Auto-expand next week when current week is fully complete
  useEffect(() => {
    const cw = weeks[currentWeekIdx];
    if (!cw || cw.isLocked) return;
    const activeInWeek = cw.steps.filter(s => s.score < 3.5);
    if (activeInWeek.length === 0) return;
    const allDone = activeInWeek.every(s => completedSteps.has(s.topicKey));
    if (allDone && currentWeekIdx + 1 < weeks.length) {
      setExpandedWeeks(prev => {
        const next = new Set(prev);
        next.add(currentWeekIdx + 1);
        return next;
      });
    }
  }, [completedSteps, currentWeekIdx, weeks]);

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

  // ── Progress stats ────────────────────────────────────────────────────────
  const needsWorkSteps = allSteps.filter(s => s.score < 3.5);
  const doneCount      = needsWorkSteps.filter(s => s.status === "done").length;
  const totalNeedWork  = needsWorkSteps.length;
  const progressPct    = totalNeedWork > 0 ? (doneCount / totalNeedWork) * 100 : 0;

  const projectedGain = (
    (Math.max(scores.thinkingStrategy, 3.5) +
     Math.max(scores.execution, 3.5) +
     Math.max(scores.technicalFluency, 3.5) +
     Math.max(scores.userResearch, 3.5) +
     Math.max(scores.communication, 3.5)) / 5 - scores.overall
  ).toFixed(1);

  const weekProgressPct = weeks.length > 0 ? ((currentWeekIdx + 1) / weeks.length) * 100 : 0;

  // ── Resource dropdown label ───────────────────────────────────────────────
  const resourceLabel =
    resources.video && resources.text ? "📹 Video + 📄 Text"
    : resources.video                 ? "📹 Video"
    : resources.text                  ? "📄 Text"
    : "Select resources";

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function markDone(topicKey: string, dimension: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("roadmap_progress").insert({
      user_id: user.id,
      step_id: topicKey,
      dimension,
    });
    if (error && error.code !== "23505") return;
    setCompletedSteps(prev => new Set([...prev, topicKey]));
  }

  async function unmarkDone(topicKey: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("roadmap_progress")
      .delete()
      .eq("user_id", user.id)
      .eq("step_id", topicKey);
    setCompletedSteps(prev => {
      const next = new Set(prev);
      next.delete(topicKey);
      return next;
    });
  }

  function toggleWeek(idx: number) {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  // ─── Render ──────────────────────────────────────────────────────────────

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
            {["1 month", "3 months", "6 months"].map(t => (
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
            onClick={() => setDropdownOpen(o => !o)}
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
              {(["video", "text"] as const).map(key => (
                <label
                  key={key}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer text-sm hover:bg-white/5"
                  style={{ color: "rgba(232,239,248,0.8)" }}
                >
                  <input
                    type="checkbox"
                    checked={resources[key]}
                    onChange={e => setResources(r => ({ ...r, [key]: e.target.checked }))}
                    className="accent-sky-400"
                  />
                  {key === "video" ? "📹 Video" : "📄 Text"}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Two progress bars ── */}
      <div className="flex flex-col gap-4">

        {/* Week progress */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono" style={{ color: "rgba(232,239,248,0.45)" }}>
              WEEK PROGRESS
            </span>
            <span className="text-xs" style={{ color: "#38BDF8" }}>
              Week {currentWeekIdx + 1} of {weeks.length}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: "rgba(56,189,248,0.08)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${weekProgressPct}%`, backgroundColor: "#38BDF8" }}
            />
          </div>
        </div>

        {/* Step progress */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-mono" style={{ color: "rgba(232,239,248,0.45)" }}>
              STEP PROGRESS
            </span>
            <span className="text-xs font-medium" style={{ color: "#22C55E" }}>
              {doneCount} of {totalNeedWork} steps · +{projectedGain} pts projected
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: "rgba(56,189,248,0.08)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(to right, #38BDF8, #22C55E)",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Weeks ── */}
      <div className="flex flex-col gap-3">
        {weeks.map((week, idx) => {
          const isCurrentWeek = idx === currentWeekIdx;
          const isExpanded    = expandedWeeks.has(idx);

          // Get live step statuses from stepMap
          const liveSteps = week.steps.map(s => stepMap.get(s.topicKey) ?? s);
          const weekDoneCount = liveSteps.filter(s => s.status === "done").length;
          const weekActiveCount = liveSteps.filter(s => s.score < 3.5).length;
          const isWeekComplete = weekActiveCount > 0 && weekDoneCount === weekActiveCount;

          // Left border
          const leftBorder = isWeekComplete
            ? "3px solid rgba(34,197,94,0.6)"
            : isCurrentWeek
            ? "3px solid #38BDF8"
            : week.isLocked
            ? "3px solid rgba(232,239,248,0.08)"
            : "3px solid rgba(56,189,248,0.2)";

          // Week label
          const weekLabel = week.type === "revision" ? `REVISION ${week.weekNumber - 8}`
                          : week.type === "greyed"   ? `OPTIONAL ${week.weekNumber - 16}`
                          : `WEEK ${week.weekNumber}`;

          return (
            <div
              key={week.weekNumber}
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: "rgba(56,189,248,0.02)",
                border: "1px solid rgba(56,189,248,0.07)",
                borderLeft: leftBorder,
                opacity: week.isLocked ? 0.55 : 1,
              }}
            >
              {/* Week header */}
              <button
                onClick={() => toggleWeek(idx)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className="text-xs font-bold tracking-widest"
                    style={{ fontFamily: "monospace", color: isCurrentWeek ? "#38BDF8" : week.isLocked ? "rgba(232,239,248,0.3)" : "rgba(232,239,248,0.5)" }}
                  >
                    {weekLabel}
                  </span>
                  <span className="text-xs" style={{ color: "rgba(232,239,248,0.3)" }}>
                    {formatDate(week.startDate)} – {formatDate(week.endDate)}
                  </span>
                  {weekActiveCount > 0 && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: isWeekComplete ? "rgba(34,197,94,0.12)" : "rgba(56,189,248,0.08)",
                        color: isWeekComplete ? "#86EFAC" : "rgba(232,239,248,0.5)",
                      }}
                    >
                      {isWeekComplete ? "✓ Complete" : `${weekDoneCount}/${weekActiveCount}`}
                    </span>
                  )}
                  {week.isLocked && (
                    <span className="text-xs" style={{ color: "rgba(232,239,248,0.3)" }}>🔒 Optional</span>
                  )}
                  {isCurrentWeek && !isWeekComplete && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "rgba(56,189,248,0.12)", color: "#38BDF8" }}
                    >
                      Current
                    </span>
                  )}
                </div>
                <span style={{ color: "rgba(232,239,248,0.3)", fontSize: "10px" }}>
                  {isExpanded ? "▲" : "▼"}
                </span>
              </button>

              {/* Steps */}
              {isExpanded && (
                <div className="flex flex-col gap-2 px-5 pb-5">
                  {liveSteps.map(step => {
                    const isDone   = step.status === "done";
                    const isGreyed = step.status === "greyed";
                    const isActive = step.status === "active";

                    return (
                      <div
                        key={step.topicKey}
                        className="flex flex-col gap-3 p-4 rounded-xl"
                        style={{
                          backgroundColor: "rgba(56,189,248,0.03)",
                          border: "1px solid rgba(56,189,248,0.06)",
                          borderLeft: isDone
                            ? "2px solid rgba(34,197,94,0.5)"
                            : isGreyed
                            ? "2px solid rgba(232,239,248,0.1)"
                            : "2px solid rgba(56,189,248,0.4)",
                          opacity: isGreyed ? 0.7 : 1,
                        }}
                      >
                        {/* Step top row */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                              style={{
                                backgroundColor: isDone
                                  ? "rgba(34,197,94,0.15)"
                                  : isGreyed
                                  ? "rgba(232,239,248,0.06)"
                                  : "rgba(56,189,248,0.12)",
                                color: isDone ? "#22C55E" : isGreyed ? "rgba(232,239,248,0.4)" : "#38BDF8",
                              }}
                            >
                              {isDone ? "✓" : "→"}
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span
                                className="text-sm font-semibold"
                                style={{ color: isGreyed ? "rgba(232,239,248,0.55)" : "#E8EFF8" }}
                              >
                                {step.label}
                              </span>
                              <span className="text-xs font-mono" style={{ color: "rgba(232,239,248,0.3)" }}>
                                {step.dimensionLabel} · {step.score.toFixed(1)}/5
                              </span>
                            </div>
                          </div>
                          {isDone && (
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#86EFAC" }}
                            >
                              ✓ Done
                            </span>
                          )}
                          {isGreyed && (
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: "rgba(34,197,94,0.08)", color: "#86EFAC" }}
                            >
                              Already strong
                            </span>
                          )}
                        </div>

                        {/* Score bar */}
                        <div
                          className="relative w-full h-1.5 rounded-full"
                          style={{ backgroundColor: "rgba(56,189,248,0.08)", marginLeft: "36px", width: "calc(100% - 36px)" }}
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
                            style={{ left: `${(3.5 / 5) * 100}%`, backgroundColor: "rgba(232,239,248,0.25)" }}
                          />
                        </div>

                        {/* Description preview — always visible, truncated */}
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: "rgba(232,239,248,0.5)", marginLeft: "36px" }}
                        >
                          {step.content.slice(0, 250)}
                          {step.content.length > 250 ? "…" : ""}
                        </p>

                        {/* Resources */}
                        <div className="flex flex-col gap-3" style={{ marginLeft: "36px" }}>

                          {/* Inline YouTube iframes */}
                          {resources.video && (
                            <div className="flex flex-col gap-3">
                              {step.videos ? (
                                step.videos.map((url) => {
                                  const videoId = (() => { try { return new URL(url).searchParams.get("v"); } catch { return null; } })();
                                  if (!videoId) return null;
                                  return (
                                    <iframe
                                      key={url}
                                      width="100%"
                                      height="200"
                                      src={`https://www.youtube.com/embed/${videoId}`}
                                      title={step.label}
                                      frameBorder="0"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                      style={{ borderRadius: "8px", display: "block" }}
                                    />
                                  );
                                })
                              ) : (
                                <div
                                  className="flex items-center justify-center text-sm"
                                  style={{
                                    height: "200px",
                                    borderRadius: "8px",
                                    border: "1.5px dashed rgba(232,239,248,0.12)",
                                    backgroundColor: "rgba(56,189,248,0.02)",
                                    color: "rgba(232,239,248,0.35)",
                                  }}
                                >
                                  🎬 Video coming soon — Shraavan Tickoo
                                </div>
                              )}
                            </div>
                          )}

                          {/* PDF content link — opens exact pages for this competency */}
                          {resources.text && (
                            <a
                              href={`/pdfs/${step.topicKey}.pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm w-fit"
                              style={{ color: "rgba(232,239,248,0.55)" }}
                            >
                              📄 Read content ↗
                            </a>
                          )}
                        </div>

                        {/* Action */}
                        <div style={{ marginLeft: "36px" }}>
                          {isActive && !week.isLocked && (
                            <button
                              onClick={() => markDone(step.topicKey, step.dimension)}
                              className="text-sm font-medium px-4 py-1.5 rounded-full transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
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
                            <button
                              onClick={() => unmarkDone(step.topicKey)}
                              className="text-sm hover:opacity-80 transition-opacity"
                              style={{ color: "rgba(232,239,248,0.35)" }}
                            >
                              Revisit →
                            </button>
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
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
