import Link from "next/link";
import SkillRadar from "./components/SkillRadar";
import LandingTracker from "./components/LandingTracker";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0D1117", color: "#E8EFF8" }}>
      <LandingTracker />
      {/* ─── Sticky Nav ─── */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 lg:px-16 py-4"
        style={{
          backgroundColor: "rgba(13, 17, 23, 0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(56, 189, 248, 0.08)",
        }}
      >
        <span
          className="text-base font-semibold tracking-tight"
          style={{ color: "#E8EFF8" }}
        >
          PM Career Navigator
        </span>

        <Link
          href="/sign-in"
          className="text-sm px-4 py-2 rounded-full border transition-colors duration-200 sign-in-btn"
          style={{
            borderColor: "rgba(56, 189, 248, 0.3)",
            color: "#38BDF8",
          }}
        >
          Sign in
        </Link>
      </nav>

      {/* ─── Hero ─── */}
      <section className="flex-1 flex items-center px-6 lg:px-16 py-20 lg:py-28">
        <div className="w-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left column */}
          <div className="flex flex-col gap-7">
            {/* Pill */}
            <div className="inline-flex w-fit">
              <span
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium tracking-wide"
                style={{
                  backgroundColor: "rgba(56, 189, 248, 0.08)",
                  border: "1px solid rgba(56, 189, 248, 0.2)",
                  color: "#38BDF8",
                }}
              >
                <span>✦</span>
                Career readiness for aspiring PMs
              </span>
            </div>

            {/* Headline */}
            <h1
              className="text-4xl lg:text-5xl xl:text-[3.5rem] leading-[1.1] tracking-tight"
              style={{ fontFamily: "var(--font-fraunces)", color: "#E8EFF8" }}
            >
              Been preparing for a while — but not sure where you actually stand?
            </h1>

            {/* Subheadline */}
            <p
              className="text-base lg:text-lg leading-relaxed max-w-lg"
              style={{ color: "rgba(232, 239, 248, 0.6)" }}
            >
              Take a 15-minute assessment that maps your strengths across the five dimensions every PM hiring team evaluates. Walk away with a personalised skill map and a clear next step.
            </p>

            {/* Primary CTA */}
            <div>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: "#38BDF8",
                  color: "#0D1117",
                }}
              >
                Find out where you stand in your PM journey
                <span>→</span>
              </Link>
            </div>

            {/* Trust chips */}
            <div className="flex flex-wrap gap-3 pt-1">
              {[
                { icon: "⏱", label: "Under 15 minutes" },
                { icon: "🎯", label: "Archetype + skill map" },
                { icon: "🗺", label: "A path built for you" },
              ].map((chip) => (
                <span
                  key={chip.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                  style={{
                    backgroundColor: "rgba(232, 239, 248, 0.05)",
                    border: "1px solid rgba(232, 239, 248, 0.1)",
                    color: "rgba(232, 239, 248, 0.65)",
                  }}
                >
                  <span>{chip.icon}</span>
                  {chip.label}
                </span>
              ))}
            </div>
          </div>

          {/* Right column — Radar chart */}
          <div
            className="relative flex items-center justify-center lg:h-[480px] h-[340px] rounded-2xl"
            style={{
              backgroundColor: "rgba(56, 189, 248, 0.03)",
              border: "1px solid rgba(56, 189, 248, 0.08)",
            }}
          >
            {/* Corner accent */}
            <div
              className="absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-20"
              style={{ background: "radial-gradient(circle at top right, #38BDF8, transparent 70%)" }}
            />
            <div className="w-full h-full p-4">
              <SkillRadar />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Social Proof Strip ─── */}
      <section
        className="px-6 lg:px-16 py-12"
        style={{ borderTop: "1px solid rgba(56, 189, 248, 0.08)" }}
      >
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center gap-8 lg:gap-16">
          {/* Stats */}
          <div className="flex flex-wrap gap-8">
            <div className="flex flex-col gap-1">
              <span
                className="text-2xl font-bold tracking-tight"
                style={{ color: "#38BDF8" }}
              >
                2,400+
              </span>
              <span className="text-sm" style={{ color: "rgba(232, 239, 248, 0.5)" }}>
                assessments completed
              </span>
            </div>
            <div
              className="hidden lg:block w-px self-stretch"
              style={{ backgroundColor: "rgba(232, 239, 248, 0.08)" }}
            />
            <div className="flex flex-col gap-1">
              <span
                className="text-2xl font-bold tracking-tight"
                style={{ color: "#38BDF8" }}
              >
                87%
              </span>
              <span className="text-sm" style={{ color: "rgba(232, 239, 248, 0.5)" }}>
                felt more clarity after
              </span>
            </div>
          </div>

          {/* Divider */}
          <div
            className="hidden lg:block w-px self-stretch"
            style={{ backgroundColor: "rgba(232, 239, 248, 0.08)" }}
          />

          {/* Testimonial */}
          <blockquote className="flex flex-col gap-2 max-w-lg">
            <p
              className="text-sm leading-relaxed italic"
              style={{ color: "rgba(232, 239, 248, 0.7)" }}
            >
              &ldquo;I&apos;d been prepping for PM roles for months but always felt like I was guessing. This assessment finally showed me exactly which gaps were holding me back — and I got my first offer two months later.&rdquo;
            </p>
            <span
              className="text-xs font-medium"
              style={{ color: "rgba(56, 189, 248, 0.7)" }}
            >
              — Priya M., now APM at a Series B startup
            </span>
          </blockquote>
        </div>
      </section>
    </div>
  );
}
