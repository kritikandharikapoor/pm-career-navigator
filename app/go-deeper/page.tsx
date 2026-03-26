"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import { createClient } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type DimKey = "thinkingStrategy" | "execution" | "technicalFluency" | "userResearch" | "communication";

type Scores = {
  thinkingStrategy: number;
  execution: number;
  technicalFluency: number;
  userResearch: number;
  communication: number;
  overall: number;
};

type SubTopic = {
  topicKey: string;
  label: string;
  videos: string[] | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = "#38BDF8";

const DIMS: { key: DimKey; label: string; tagline: string }[] = [
  {
    key: "thinkingStrategy",
    label: "Thinking & Strategy",
    tagline: "Your ability to define problems, set direction, and make decisions with incomplete information.",
  },
  {
    key: "execution",
    label: "Execution",
    tagline: "How well you deliver: planning, metrics, experiments, and aligning stakeholders.",
  },
  {
    key: "technicalFluency",
    label: "Technical Fluency",
    tagline: "Your comfort working with engineers, understanding systems, data, and AI.",
  },
  {
    key: "userResearch",
    label: "User & Research",
    tagline: "How deeply you understand users — empathy, research, and UX intuition.",
  },
  {
    key: "communication",
    label: "Communication",
    tagline: "How clearly you write, tell stories, and influence without authority.",
  },
];

const SUB_TOPICS: Record<DimKey, SubTopic[]> = {
  thinkingStrategy: [
    { topicKey: "productSense",        label: "Product Sense",                videos: ["https://www.youtube.com/watch?v=0-wYH7zlmIA", "https://www.youtube.com/watch?v=cj2VYwHNpMQ"] },
    { topicKey: "guesstimates",        label: "Guesstimates & Market Sizing", videos: ["https://www.youtube.com/watch?v=2HI7dsZ1e0U", "https://www.youtube.com/watch?v=6_647DTz0sA"] },
    { topicKey: "prioritisation",      label: "Prioritisation",               videos: ["https://www.youtube.com/watch?v=atIilj52Sfc"] },
    { topicKey: "productStrategy",     label: "Product Strategy",             videos: ["https://www.youtube.com/watch?v=FVYtaEwDBC0"] },
    { topicKey: "competitiveAnalysis", label: "Competitive Analysis",         videos: ["https://www.youtube.com/watch?v=CWhwIt-tZWU"] },
  ],
  execution: [
    { topicKey: "metricsKpis",           label: "Metrics & KPIs",                videos: ["https://www.youtube.com/watch?v=6IdLCRy_Suo"] },
    { topicKey: "abTesting",             label: "A/B Testing & Experimentation", videos: null },
    { topicKey: "goToMarket",            label: "Go-to-Market",                  videos: null },
    { topicKey: "roadmapping",           label: "Roadmapping",                   videos: null },
    { topicKey: "stakeholderManagement", label: "Stakeholder Management",        videos: null },
  ],
  technicalFluency: [
    { topicKey: "techFundamentals", label: "Tech Fundamentals for PMs", videos: null },
    { topicKey: "aiMlForPms",       label: "AI / ML for PMs",           videos: null },
    { topicKey: "dataSql",          label: "Data & SQL",                 videos: null },
    { topicKey: "systemDesign",     label: "System Design Basics",       videos: null },
  ],
  userResearch: [
    { topicKey: "userResearch",    label: "User Research",    videos: null },
    { topicKey: "uxThinking",      label: "UX Thinking",      videos: null },
    { topicKey: "customerEmpathy", label: "Customer Empathy", videos: null },
  ],
  communication: [
    { topicKey: "writtenCommunication", label: "Written Communication", videos: null },
    { topicKey: "productStorytelling",  label: "Product Storytelling",  videos: null },
    { topicKey: "stakeholderInfluence", label: "Stakeholder Influence", videos: null },
  ],
};

const MENTOR_INSIGHTS: Record<DimKey, string> = {
  thinkingStrategy:
    "Strategic thinking is the core of product management. The best PMs don't just answer questions — they reframe them. Focus on building your problem decomposition muscle: before jumping to solutions, ask what problem this actually solves, for whom, and why now. Practice structuring your thinking out loud. Interviewers aren't just evaluating your answer — they're watching how you think.",
  execution:
    "Execution is where strategy meets reality. PMs who struggle here often think in features, not outcomes. Shift your mental model: every initiative should have a measurable success criteria before work begins. Practice writing one-pagers that clearly state the 'why now', the success metric, and the biggest risk. Strong executors are ruthless about what not to do.",
  technicalFluency:
    "You don't need to code, but you need to think in systems. The gap for most aspiring PMs isn't knowledge — it's confidence. Start with one concept: how does a database query work? What happens when a user clicks 'submit'? Build intuition, not expertise. When you can have an honest conversation with an engineer about tradeoffs, you earn their trust — and that unlocks everything.",
  userResearch:
    "User insight is your unfair advantage as a PM. Most candidates skip this. They say 'users want X' without evidence. Train yourself to ask: how do you know? A single well-run user interview teaches you more than 100 survey responses. Learn to separate what users say from what they do. The insight that changes your roadmap rarely comes from analytics — it comes from listening.",
  communication:
    "Communication is how your thinking becomes influence. A brilliant insight that can't be clearly explained doesn't move anything forward. Practice the one-sentence summary — if you can't say it simply, you don't understand it well enough yet. Learn to write for your audience: engineers want clarity, executives want outcomes, users want empathy. Adapt your voice, not your integrity.",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function GoDeeperPage() {
  const router = useRouter();

  const [status, setStatus]       = useState<"loading" | "ready">("loading");
  const [email, setEmail]         = useState("");
  const [scores, setScores]       = useState<Scores | null>(null);
  const [activeDim, setActiveDim] = useState<DimKey>("thinkingStrategy");

  const [showVideo, setShowVideo]           = useState(true);
  const [showText, setShowText]             = useState(false);
  const [dropdownOpen, setDropdownOpen]     = useState(false);
  const [ctaClicked, setCtaClicked]         = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Auth + data load ────────────────────────────────────────────────────────
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

      const raw = profile?.scores as Record<string, number> | null;
      const s: Scores = {
        thinkingStrategy: raw?.thinkingStrategy ?? 2.5,
        execution:        raw?.execution        ?? 2.5,
        technicalFluency: raw?.technicalFluency ?? 2.5,
        userResearch:     raw?.userResearch     ?? 2.5,
        communication:    raw?.communication    ?? 2.5,
        overall:          raw?.overall          ?? 2.5,
      };

      setScores(s);
      setEmail(user.email ?? "");

      // Default to weakest dimension
      const weakest = (["thinkingStrategy", "execution", "technicalFluency", "userResearch", "communication"] as DimKey[])
        .reduce((a, b) => s[a] <= s[b] ? a : b);
      setActiveDim(weakest);
      setStatus("ready");
    }

    init();
  }, [router]);

  // ── Close dropdown on outside click ────────────────────────────────────────
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (status === "loading" || !scores) {
    return (
      <div className="flex" style={{ backgroundColor: "#0D1117", minHeight: "100vh" }}>
        <Sidebar userEmail={email} activePath="/go-deeper" />
        <main
          className="flex-1 flex items-center justify-center"
          style={{ marginLeft: "240px" }}
        >
          <div
            className="animate-pulse w-8 h-8 rounded-full"
            style={{ backgroundColor: "rgba(56,189,248,0.3)" }}
          />
        </main>
      </div>
    );
  }

  const dim      = DIMS.find(d => d.key === activeDim)!;
  const dimScore = scores[activeDim];
  const gap      = Math.max(0, 3.5 - dimScore);
  const subTopics = SUB_TOPICS[activeDim];
  const isStrong = dimScore >= 3.5;

  const resourceLabel =
    showVideo && showText ? "📹 Video + 📄 Text"
    : showVideo           ? "📹 Video"
    : showText            ? "📄 Text"
    : "Select resources";

  return (
    <div className="flex" style={{ backgroundColor: "#0D1117", minHeight: "100vh" }}>
      <Sidebar userEmail={email} activePath="/go-deeper" />
      <main
        className="flex-1 min-h-screen px-8 py-10"
        style={{ marginLeft: "240px", color: "#E8EFF8", maxWidth: "900px" }}
      >
        <div className="flex flex-col gap-8">

          {/* ── Header ── */}
          <div className="flex flex-col gap-1">
            <h1
              className="text-3xl lg:text-4xl"
              style={{ fontFamily: "var(--font-fraunces)", color: "#E8EFF8" }}
            >
              Go Deeper
            </h1>
            <p className="text-sm" style={{ color: "rgba(232,239,248,0.45)" }}>
              Understand what each dimension means for your PM readiness — and how to improve it.
            </p>
          </div>

          {/* ── Dimension tabs ── */}
          <div
            className="flex flex-wrap gap-2"
          >
            {DIMS.map(d => {
              const isActive  = d.key === activeDim;
              const s         = scores[d.key];
              const isWeak    = s < 3.0;
              return (
                <button
                  key={d.key}
                  onClick={() => setActiveDim(d.key)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-150"
                  style={{
                    backgroundColor: isActive ? ACCENT : "rgba(56,189,248,0.06)",
                    border: `1.5px solid ${isActive ? ACCENT : "rgba(56,189,248,0.12)"}`,
                    color: isActive ? "#0D1117" : isWeak ? ACCENT : "rgba(232,239,248,0.6)",
                  }}
                >
                  {d.label}
                  {isWeak && !isActive && (
                    <span
                      className="ml-2 text-xs"
                      style={{ color: "rgba(56,189,248,0.7)" }}
                    >
                      ↓{s.toFixed(1)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Dimension overview card ── */}
          <div
            className="flex flex-col gap-4 p-6 rounded-2xl"
            style={{
              backgroundColor: "rgba(56,189,248,0.04)",
              border: "1px solid rgba(56,189,248,0.1)",
            }}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex flex-col gap-1">
                <h2
                  className="text-xl font-semibold"
                  style={{ color: "#E8EFF8" }}
                >
                  {dim.label}
                </h2>
                <p className="text-sm" style={{ color: "rgba(232,239,248,0.5)" }}>
                  {dim.tagline}
                </p>
              </div>
              <span
                className="text-sm font-bold px-3 py-1 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: isStrong ? "rgba(34,197,94,0.12)" : "rgba(56,189,248,0.1)",
                  color: isStrong ? "#86EFAC" : ACCENT,
                  border: `1px solid ${isStrong ? "rgba(34,197,94,0.2)" : "rgba(56,189,248,0.2)"}`,
                }}
              >
                {dimScore.toFixed(1)} / 5
              </span>
            </div>

            {/* Score bar with benchmark */}
            <div className="flex flex-col gap-1.5">
              <div
                className="relative w-full h-2 rounded-full"
                style={{ backgroundColor: "rgba(56,189,248,0.08)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(dimScore / 5) * 100}%`,
                    backgroundColor: isStrong ? "#22C55E" : ACCENT,
                  }}
                />
                {/* 3.5 benchmark marker */}
                <div
                  className="absolute top-[-3px] h-[calc(100%+6px)] w-0.5 rounded-full"
                  style={{
                    left: `${(3.5 / 5) * 100}%`,
                    backgroundColor: "rgba(232,239,248,0.3)",
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-xs" style={{ color: "rgba(232,239,248,0.35)" }}>
                <span>0</span>
                <span style={{ marginLeft: `${(3.5 / 5) * 100 - 2}%` }}>
                  3.5 benchmark
                </span>
                <span>5</span>
              </div>
            </div>

            {/* Gap or strong text */}
            {isStrong ? (
              <p className="text-sm" style={{ color: "#86EFAC" }}>
                You are above the benchmark — this is a strength. Keep it sharp.
              </p>
            ) : (
              <p className="text-sm" style={{ color: ACCENT }}>
                Gap to benchmark: <strong>{gap.toFixed(1)} points</strong> — this is your biggest opportunity area.
              </p>
            )}
          </div>

          {/* ── Sub-category breakdown ── */}
          <div className="flex flex-col gap-3">
            <h3
              className="text-xs font-bold tracking-widest"
              style={{ fontFamily: "monospace", color: "rgba(232,239,248,0.4)" }}
            >
              TOPICS IN THIS DIMENSION
            </h3>

            <div className="flex flex-col gap-2">
              {subTopics.map(topic => {
                const topicStrong = dimScore >= 3.5;
                return (
                  <div
                    key={topic.topicKey}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl"
                    style={{
                      backgroundColor: "rgba(56,189,248,0.02)",
                      border: "1px solid rgba(56,189,248,0.07)",
                    }}
                  >
                    <div className="flex-1 flex flex-col gap-1.5">
                      <span className="text-sm font-medium" style={{ color: "#E8EFF8" }}>
                        {topic.label}
                      </span>
                      <div
                        className="relative w-full h-1 rounded-full"
                        style={{ backgroundColor: "rgba(56,189,248,0.08)" }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(dimScore / 5) * 100}%`,
                            backgroundColor: topicStrong ? "#22C55E" : ACCENT,
                          }}
                        />
                        <div
                          className="absolute top-0 h-full w-px"
                          style={{
                            left: `${(3.5 / 5) * 100}%`,
                            backgroundColor: "rgba(232,239,248,0.2)",
                          }}
                        />
                      </div>
                    </div>
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: topicStrong ? "rgba(34,197,94,0.1)" : "rgba(56,189,248,0.08)",
                        color: topicStrong ? "#86EFAC" : ACCENT,
                      }}
                    >
                      {topicStrong ? "On track" : "Needs work"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Mentor insight ── */}
          <div
            className="flex flex-col gap-3 p-5 rounded-2xl"
            style={{
              backgroundColor: "rgba(56,189,248,0.03)",
              border: "1px solid rgba(56,189,248,0.08)",
              borderLeft: `3px solid ${ACCENT}`,
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-widest" style={{ fontFamily: "monospace", color: "rgba(232,239,248,0.4)" }}>
                MENTOR INSIGHT
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(232,239,248,0.75)" }}>
              {MENTOR_INSIGHTS[activeDim]}
            </p>
          </div>

          {/* ── Resources ── */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3
                className="text-xs font-bold tracking-widest"
                style={{ fontFamily: "monospace", color: "rgba(232,239,248,0.4)" }}
              >
                RESOURCES
              </h3>

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
                    className="absolute top-full mt-1 right-0 z-50 rounded-xl overflow-hidden"
                    style={{
                      backgroundColor: "#131920",
                      border: "1px solid rgba(56,189,248,0.12)",
                      minWidth: "160px",
                    }}
                  >
                    {([
                      { key: "video", label: "📹 Video", checked: showVideo, set: setShowVideo },
                      { key: "text",  label: "📄 Text",  checked: showText,  set: setShowText  },
                    ] as const).map(item => (
                      <label
                        key={item.key}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer text-sm hover:bg-white/5"
                        style={{ color: "rgba(232,239,248,0.8)" }}
                      >
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={e => item.set(e.target.checked)}
                          className="accent-sky-400"
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Per-topic resources */}
            <div className="flex flex-col gap-5">
              {subTopics.map(topic => {
                const hasVideo = showVideo;
                const hasText  = showText;
                if (!hasVideo && !hasText) return null;

                return (
                  <div key={topic.topicKey} className="flex flex-col gap-3">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "rgba(232,239,248,0.7)" }}
                    >
                      {topic.label}
                    </span>

                    {/* Video iframes */}
                    {showVideo && (
                      <div className="flex flex-col gap-3">
                        {topic.videos ? (
                          topic.videos.map(url => {
                            const videoId = (() => { try { return new URL(url).searchParams.get("v"); } catch { return null; } })();
                            if (!videoId) return null;
                            return (
                              <iframe
                                key={url}
                                width="100%"
                                height="220"
                                src={`https://www.youtube.com/embed/${videoId}`}
                                title={topic.label}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                style={{ borderRadius: "10px", display: "block" }}
                              />
                            );
                          })
                        ) : (
                          <div
                            className="flex items-center justify-center text-sm"
                            style={{
                              height: "160px",
                              borderRadius: "10px",
                              border: "1.5px dashed rgba(232,239,248,0.1)",
                              backgroundColor: "rgba(56,189,248,0.02)",
                              color: "rgba(232,239,248,0.3)",
                            }}
                          >
                            🎬 Video coming soon
                          </div>
                        )}
                      </div>
                    )}

                    {/* PDF link */}
                    {showText && (
                      <a
                        href={`/pdfs/${topic.topicKey}.pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm w-fit"
                        style={{ color: "rgba(232,239,248,0.55)" }}
                      >
                        📄 Read content ↗
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Assessment CTA card ── */}
          <div
            className="flex flex-col gap-4 p-6 rounded-2xl"
            style={{
              backgroundColor: "rgba(56,189,248,0.03)",
              border: "1px solid rgba(56,189,248,0.09)",
            }}
          >
            <div className="flex flex-col gap-1">
              <h3
                className="text-base font-semibold"
                style={{ color: "#E8EFF8" }}
              >
                Ready to test your knowledge?
              </h3>
              <p className="text-sm" style={{ color: "rgba(232,239,248,0.45)" }}>
                Take a targeted mini-assessment on {dim.label} to see how much you have improved.
              </p>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={() => setCtaClicked(true)}
                className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                style={{
                  backgroundColor: ACCENT,
                  color: "#0D1117",
                }}
              >
                Start {dim.label} Assessment
              </button>

              {ctaClicked && (
                <span
                  className="text-sm"
                  style={{ color: "rgba(232,239,248,0.45)" }}
                >
                  Coming soon — stay tuned.
                </span>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
