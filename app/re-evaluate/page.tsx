"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import { createClient } from "@/lib/supabase"; // used for auth check + profile fetch
import { posthog } from "@/lib/posthog";
import {
  reevalQuestions,
  type ReevalQuestion,
  type ReevalDimension,
} from "@/lib/data/reeval-questions";

// ─── Constants ────────────────────────────────────────────────────────────────

const DIM_LABELS: Record<ReevalDimension, string> = {
  thinkingStrategy: "Thinking & Strategy",
  execution:        "Execution",
  technicalFluency: "Technical Fluency",
  userResearch:     "User & Research",
  communication:    "Communication",
};

const ACCENT = "#38BDF8";

const REINFORCEMENT = [
  "Good thinking — you are reasoning like a PM.",
  "That is the right instinct. Keep going.",
  "You are thinking about tradeoffs, which is exactly right.",
  "Strong reasoning. This is how PMs approach decisions.",
  "You are asking the right questions.",
  "Good — you are connecting the problem to the solution.",
  "That kind of structured thinking stands out in interviews.",
  "You are thinking beyond the obvious answer. That matters.",
  "Solid approach. You are building the right mental model.",
  "Right direction. This is how product decisions get made.",
  "You are thinking about context, not just the answer.",
  "That reasoning shows real product instinct.",
];

const DIMS: ReevalDimension[] = [
  "thinkingStrategy",
  "execution",
  "technicalFluency",
  "userResearch",
  "communication",
];

// ─── Question Selection ────────────────────────────────────────────────────────

function selectQuestions(scores: Record<string, number>): {
  questions: ReevalQuestion[];
  weakestDim: ReevalDimension;
} {
  // 1. Initial allocation by score
  const alloc: Record<ReevalDimension, number> = {} as Record<ReevalDimension, number>;
  for (const dim of DIMS) {
    const s = scores[dim] ?? 2.5;
    if (s < 2.0)      alloc[dim] = 8;
    else if (s < 3.0) alloc[dim] = 6;
    else if (s < 3.5) alloc[dim] = 5;
    else              alloc[dim] = 3;
  }

  // Sort dims weakest → strongest
  const sorted = [...DIMS].sort((a, b) => (scores[a] ?? 2.5) - (scores[b] ?? 2.5));
  const weakestDim = sorted[0];

  // 2. Adjust total to exactly 30, starting from weakest dimension
  let total = DIMS.reduce((sum, d) => sum + alloc[d], 0);

  let i = 0;
  while (total < 30 && i < 1000) {
    const dim = sorted[i % DIMS.length];
    const available = reevalQuestions.filter(q => q.dimension === dim).length;
    if (alloc[dim] < available) { alloc[dim]++; total++; }
    i++;
  }

  i = 0;
  while (total > 30 && i < 1000) {
    const dim = sorted[i % DIMS.length];
    if (alloc[dim] > 1) { alloc[dim]--; total--; }
    i++;
  }

  // 3. Randomly pick from each dimension, result already sorted weakest→strongest
  const questions: ReevalQuestion[] = [];
  for (const dim of sorted) {
    const pool = reevalQuestions.filter(q => q.dimension === dim);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    questions.push(...shuffled.slice(0, alloc[dim]));
  }

  return { questions, weakestDim };
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

type Answer = { q: ReevalQuestion; score: number };

function computeNewScores(answers: Answer[]): Record<string, number> {
  const dimScores: Record<ReevalDimension, number> = {} as Record<ReevalDimension, number>;

  for (const dim of DIMS) {
    const dimAnswers = answers.filter(a => a.q.dimension === dim);
    if (dimAnswers.length === 0) { dimScores[dim] = 0; continue; }
    const sum = dimAnswers.reduce((s, a) => s + a.score, 0);
    const maxPossible = dimAnswers.length * 2;
    dimScores[dim] = Math.round((sum / maxPossible) * 5 * 10) / 10;
  }

  const overall = Math.round((
    dimScores.thinkingStrategy * 0.35 +
    dimScores.execution        * 0.20 +
    dimScores.technicalFluency * 0.10 +
    dimScores.userResearch     * 0.20 +
    dimScores.communication    * 0.15
  ) * 10) / 10;

  return { ...dimScores, overall };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReevaluatePage() {
  const router = useRouter();

  const [status, setStatus]         = useState<"loading" | "ready" | "saving">("loading");
  const [email, setEmail]           = useState("");
  const [userId, setUserId]         = useState("");
  const [questions, setQuestions]   = useState<ReevalQuestion[]>([]);
  const [weakestDim, setWeakestDim] = useState<ReevalDimension>("thinkingStrategy");
  const [previousScore, setPreviousScore] = useState<number | null>(null);

  const [qIdx, setQIdx]       = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers]   = useState<Answer[]>([]);
  const [whyText, setWhyText]   = useState("");

  const [reinforcement, setReinforcement]               = useState<string | null>(null);
  const [reinforcementVisible, setReinforcementVisible] = useState(false);
  const lastReinforceIdx = useRef(-1);

  // ── Auth + question load ────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth/signup"); return; }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("scores, has_paid")
        .eq("id", user.id)
        .single();

      if (!profile?.has_paid) { router.replace("/payment"); return; }

      setEmail(user.email ?? "");
      setUserId(user.id);

      const raw = profile?.scores as Record<string, number> | null;
      setPreviousScore(raw?.overall ?? null);
      const scores: Record<string, number> = {
        thinkingStrategy: raw?.thinkingStrategy ?? 2.5,
        execution:        raw?.execution        ?? 2.5,
        technicalFluency: raw?.technicalFluency ?? 2.5,
        userResearch:     raw?.userResearch     ?? 2.5,
        communication:    raw?.communication    ?? 2.5,
      };

      const { questions: qs, weakestDim: wd } = selectQuestions(scores);
      setQuestions(qs);
      setWeakestDim(wd);
      setStatus("ready");
    }

    init();
  }, [router]);

  // ── Handlers ───────────────────────────────────────────────────────────
  function handleSelect(letter: string) {
    setSelected(letter);
    setWhyText("");
    setReinforcement(null);
    setReinforcementVisible(false);
  }

  function handleWhyBlur() {
    if (whyText.trim().length < 20) return;

    let idx: number;
    do {
      idx = Math.floor(Math.random() * REINFORCEMENT.length);
    } while (idx === lastReinforceIdx.current);
    lastReinforceIdx.current = idx;

    setReinforcement(REINFORCEMENT[idx]);
    setReinforcementVisible(true);

    setTimeout(() => {
      setReinforcementVisible(false);
      setTimeout(() => setReinforcement(null), 400);
    }, 4000);
  }

  async function handleContinue() {
    if (!selected) return;
    const q = questions[qIdx];
    const option = q.options.find(o => o.letter === selected)!;
    const newAnswers: Answer[] = [...answers, { q, score: option.score }];
    setAnswers(newAnswers);

    if (qIdx === questions.length - 1) {
      setStatus("saving");
      await saveResults(newAnswers);
      return;
    }

    setSelected(null);
    setWhyText("");
    setReinforcement(null);
    setReinforcementVisible(false);
    setQIdx(qIdx + 1);
  }

  async function saveResults(finalAnswers: Answer[]) {
    const newScores = computeNewScores(finalAnswers);

    posthog.capture("reeval_completed", {
      new_score: newScores.overall,
      previous_score: previousScore,
    });

    await fetch("/api/save-reeval-scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newScores),
    });

    // Full reload ensures the server component re-fetches score_history fresh
    window.location.href = "/dashboard";
  }

  // ── Loading / Saving ────────────────────────────────────────────────────
  if (status === "loading" || status === "saving") {
    return (
      <div className="flex" style={{ backgroundColor: "#0D1117", minHeight: "100vh" }}>
        <Sidebar userEmail={email} activePath="/re-evaluate" />
        <main
          className="flex-1 flex flex-col items-center justify-center gap-3"
          style={{ marginLeft: "240px" }}
        >
          <div
            className="animate-pulse w-8 h-8 rounded-full"
            style={{ backgroundColor: "rgba(56,189,248,0.3)" }}
          />
          {status === "saving" && (
            <p className="text-sm" style={{ color: "rgba(232,239,248,0.4)" }}>
              Calculating your new scores…
            </p>
          )}
        </main>
      </div>
    );
  }

  // ── Question UI ─────────────────────────────────────────────────────────
  const q         = questions[qIdx];
  const dimLabel  = DIM_LABELS[q.dimension];
  const isWeakest = q.dimension === weakestDim;
  const pct       = Math.round(((qIdx + 1) / 30) * 100);

  return (
    <div className="flex" style={{ backgroundColor: "#0D1117", minHeight: "100vh" }}>
      <Sidebar userEmail={email} activePath="/re-evaluate" />
      <main
        className="flex-1 min-h-screen flex flex-col items-center px-8 py-10"
        style={{ marginLeft: "240px", color: "#E8EFF8" }}
      >
        <div className="w-full max-w-xl flex flex-col gap-7">

          {/* ── Top bar ── */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: "rgba(232,239,248,0.4)" }}>
                Re-evaluation
              </span>
              <span
                className="text-xs px-3 py-1 rounded-full font-medium"
                style={{
                  backgroundColor: "rgba(56,189,248,0.1)",
                  border: "1px solid rgba(56,189,248,0.2)",
                  color: ACCENT,
                }}
              >
                {dimLabel}
              </span>
            </div>

            {isWeakest && (
              <p className="text-xs" style={{ color: "rgba(56,189,248,0.65)" }}>
                More questions here — this is your biggest opportunity area
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <div
                className="w-full h-1 rounded-full overflow-hidden"
                style={{ backgroundColor: "rgba(56,189,248,0.1)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: ACCENT }}
                />
              </div>
              <span className="text-xs tabular-nums" style={{ color: "rgba(232,239,248,0.4)" }}>
                Question {qIdx + 1} of 30
              </span>
            </div>
          </div>

          {/* ── Question text ── */}
          <h1
            className="text-xl lg:text-2xl leading-snug"
            style={{ fontFamily: "var(--font-fraunces)", color: "#E8EFF8" }}
          >
            {q.question}
          </h1>

          {/* ── Options ── */}
          <div className="flex flex-col gap-3">
            {q.options.map(option => {
              const isSelected = selected === option.letter;
              return (
                <button
                  key={option.letter}
                  onClick={() => handleSelect(option.letter)}
                  className="flex items-start gap-4 px-4 py-4 rounded-xl text-sm text-left w-full transition-all duration-150 active:scale-[0.99]"
                  style={{
                    backgroundColor: isSelected ? "rgba(56,189,248,0.1)" : "rgba(232,239,248,0.04)",
                    border: `1.5px solid ${isSelected ? ACCENT : "rgba(232,239,248,0.08)"}`,
                  }}
                >
                  <span
                    className="flex-shrink-0 w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all duration-150"
                    style={{
                      backgroundColor: isSelected ? ACCENT : "rgba(232,239,248,0.08)",
                      color: isSelected ? "#0D1117" : "rgba(232,239,248,0.5)",
                    }}
                  >
                    {option.letter}
                  </span>
                  <span
                    className="flex-1 pt-0.5 leading-relaxed"
                    style={{ color: isSelected ? "#E8EFF8" : "rgba(232,239,248,0.7)" }}
                  >
                    {option.text}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Why textarea — scenario questions only ── */}
          {q.scenario && selected && (
            <div className="flex flex-col gap-2">
              <label className="text-xs" style={{ color: "rgba(232,239,248,0.4)" }}>
                Why did you choose this? (optional)
              </label>
              <textarea
                value={whyText}
                onChange={e => setWhyText(e.target.value)}
                onBlur={handleWhyBlur}
                rows={3}
                placeholder="Share your reasoning…"
                className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none"
                style={{
                  backgroundColor: "rgba(232,239,248,0.04)",
                  border: "1px solid rgba(232,239,248,0.1)",
                  color: "#E8EFF8",
                  caretColor: ACCENT,
                }}
              />
              {reinforcement && (
                <p
                  className="text-xs"
                  style={{
                    color: ACCENT,
                    opacity: reinforcementVisible ? 1 : 0,
                    transition: "opacity 0.35s ease",
                  }}
                >
                  {reinforcement}
                </p>
              )}
            </div>
          )}

          {/* ── Continue ── */}
          <button
            onClick={handleContinue}
            disabled={!selected}
            className="w-full py-3.5 rounded-full text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{
              backgroundColor: selected ? ACCENT : "rgba(56,189,248,0.12)",
              color: selected ? "#0D1117" : "rgba(56,189,248,0.4)",
              cursor: selected ? "pointer" : "not-allowed",
            }}
          >
            {qIdx === questions.length - 1 ? "See my results →" : "Continue"}
          </button>

        </div>
      </main>
    </div>
  );
}
