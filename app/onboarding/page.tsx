"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { posthog } from "@/lib/posthog";

const QUESTION = "What best describes your professional background so far?";
const OPTIONS = [
  "Consulting / Strategy",
  "Software Engineering",
  "Data & Analytics",
  "UX / Design",
  "Business Analysis",
  "Other",
];

function ProgressDots({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2">
      {([1, 2, 3] as const).map((step) => (
        <div
          key={step}
          className="rounded-full transition-all duration-300"
          style={{
            width: step === current ? "1.75rem" : "0.5rem",
            height: "0.5rem",
            backgroundColor:
              step <= current
                ? "#38BDF8"
                : "rgba(56, 189, 248, 0.18)",
          }}
        />
      ))}
    </div>
  );
}

export default function OnboardingStep1() {
  const [selected, setSelected] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    posthog.capture("onboarding_started");
  }, []);

  function handleContinue() {
    if (!selected) return;
    localStorage.setItem("warmup_background", selected);
    router.push("/onboarding/step2");
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center px-6 py-10"
      style={{ backgroundColor: "#0D1117", color: "#E8EFF8" }}
    >
      {/* Top bar */}
      <div className="w-full max-w-lg flex items-center justify-between mb-12">
        <span
          className="text-sm font-medium"
          style={{ color: "rgba(232, 239, 248, 0.4)" }}
        >
          PM Career Navigator
        </span>
        <ProgressDots current={1} />
      </div>

      {/* Content */}
      <div className="w-full max-w-lg flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <span
            className="text-xs font-medium tracking-widest uppercase"
            style={{ color: "rgba(56, 189, 248, 0.6)" }}
          >
            Step 1 of 3
          </span>
          <h1
            className="text-2xl lg:text-[1.75rem] leading-snug"
            style={{ fontFamily: "var(--font-fraunces)", color: "#E8EFF8" }}
          >
            {QUESTION}
          </h1>
        </div>

        {/* Option tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {OPTIONS.map((option) => {
            const isSelected = selected === option;
            return (
              <button
                key={option}
                onClick={() => setSelected(option)}
                className="flex items-center gap-3 px-4 py-4 rounded-xl text-sm font-medium text-left transition-all duration-150 active:scale-[0.98]"
                style={{
                  minHeight: "3.25rem",
                  backgroundColor: isSelected
                    ? "rgba(56, 189, 248, 0.1)"
                    : "rgba(232, 239, 248, 0.04)",
                  border: `1.5px solid ${
                    isSelected ? "#38BDF8" : "rgba(232, 239, 248, 0.08)"
                  }`,
                  color: isSelected
                    ? "#38BDF8"
                    : "rgba(232, 239, 248, 0.75)",
                }}
              >
                {/* Radio dot */}
                <span
                  className="flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-150"
                  style={{
                    borderColor: isSelected
                      ? "#38BDF8"
                      : "rgba(232, 239, 248, 0.2)",
                    backgroundColor: isSelected ? "#38BDF8" : "transparent",
                  }}
                >
                  {isSelected && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: "#0D1117" }}
                    />
                  )}
                </span>
                {option}
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
            transform: "none",
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
