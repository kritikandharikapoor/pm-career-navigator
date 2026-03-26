"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { posthog } from "@/lib/posthog";
import {
  QUESTIONS,
  DIMENSION_LABELS,
  computeScores,
  assignArchetype,
  type OptionLabel,
} from "@/lib/data/assessment";

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="w-full flex flex-col gap-2">
      <div
        className="w-full h-1 rounded-full overflow-hidden"
        style={{ backgroundColor: "rgba(56, 189, 248, 0.12)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: "#38BDF8" }}
        />
      </div>
      <span
        className="text-xs font-medium tabular-nums"
        style={{ color: "rgba(232, 239, 248, 0.4)" }}
      >
        Question {current} of {total}
      </span>
    </div>
  );
}

// ─── Main Assessment Page ─────────────────────────────────────────────────────

export default function AssessmentPage() {
  const router = useRouter();
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<OptionLabel | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const question = QUESTIONS[qIdx];

  function handleContinue() {
    if (!selected) return;

    const option = question.options.find((o) => o.label === selected)!;
    const newAnswers = { ...answers, [question.id]: option.score };

    setAnswers(newAnswers);
    localStorage.setItem("assessment_answers", JSON.stringify(newAnswers));

    // Last question → compute and navigate
    if (qIdx === QUESTIONS.length - 1) {
      const scores = computeScores(newAnswers);
      const archetype = assignArchetype(scores);
      localStorage.setItem("assessment_scores", JSON.stringify(scores));
      localStorage.setItem("assessment_archetype", archetype);
      posthog.capture("assessment_completed", {
        archetype,
        overall_score: scores.overall,
      });
      router.push("/results/partial");
      return;
    }

    setSelected(null);
    setQIdx(qIdx + 1);
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center px-6 py-8"
      style={{ backgroundColor: "#0D1117", color: "#E8EFF8" }}
    >
      {/* Top bar */}
      <div className="w-full max-w-xl mb-10">
        <div className="flex items-center justify-between mb-4">
          <span
            className="text-sm font-medium"
            style={{ color: "rgba(232, 239, 248, 0.4)" }}
          >
            PM Career Navigator
          </span>
          <span
            className="text-xs px-2.5 py-1 rounded-full"
            style={{
              backgroundColor: "rgba(56, 189, 248, 0.08)",
              border: "1px solid rgba(56, 189, 248, 0.15)",
              color: "#38BDF8",
            }}
          >
            {DIMENSION_LABELS[question.dimension]}
          </span>
        </div>
        <ProgressBar current={qIdx + 1} total={QUESTIONS.length} />
      </div>

      {/* Question card */}
      <div className="w-full max-w-xl flex flex-col gap-7">
        {/* Question text */}
        <h1
          className="text-xl lg:text-2xl leading-snug"
          style={{ fontFamily: "var(--font-fraunces)", color: "#E8EFF8" }}
        >
          {question.text}
        </h1>

        {/* Options */}
        <div className="flex flex-col gap-3">
          {question.options.map((option) => {
            const isSelected = selected === option.label;
            return (
              <button
                key={option.label}
                onClick={() => setSelected(option.label)}
                className="flex items-start gap-4 px-4 py-4 rounded-xl text-sm text-left w-full transition-all duration-150 active:scale-[0.99]"
                style={{
                  backgroundColor: isSelected
                    ? "rgba(56, 189, 248, 0.1)"
                    : "rgba(232, 239, 248, 0.04)",
                  border: `1.5px solid ${
                    isSelected ? "#38BDF8" : "rgba(232, 239, 248, 0.08)"
                  }`,
                }}
              >
                {/* Letter badge */}
                <span
                  className="flex-shrink-0 w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all duration-150"
                  style={{
                    backgroundColor: isSelected
                      ? "#38BDF8"
                      : "rgba(232, 239, 248, 0.08)",
                    color: isSelected ? "#0D1117" : "rgba(232, 239, 248, 0.5)",
                  }}
                >
                  {option.label}
                </span>
                {/* Option text */}
                <span
                  className="flex-1 pt-0.5 leading-relaxed"
                  style={{
                    color: isSelected ? "#E8EFF8" : "rgba(232, 239, 248, 0.7)",
                  }}
                >
                  {option.text}
                </span>
              </button>
            );
          })}
        </div>

        {/* Continue */}
        <button
          onClick={handleContinue}
          disabled={!selected}
          className="w-full py-3.5 rounded-full text-sm font-semibold transition-all duration-200"
          style={{
            backgroundColor: selected
              ? "#38BDF8"
              : "rgba(56, 189, 248, 0.12)",
            color: selected ? "#0D1117" : "rgba(56, 189, 248, 0.35)",
            cursor: selected ? "pointer" : "not-allowed",
          }}
        >
          {qIdx === QUESTIONS.length - 1 ? "See my results →" : "Continue"}
        </button>
      </div>
    </div>
  );
}
