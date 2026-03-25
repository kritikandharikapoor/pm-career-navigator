import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type UserRow = {
  email: string | null;
  archetype: string | null;
  scores: Record<string, number> | null;
  has_paid: boolean;
  created_at: string;
};

async function fetchMetrics(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const [
    { count: totalUsers },
    { count: completedAssessment },
    { count: paidUsers },
    { data: allArchetypes },
    { data: allScores },
    { count: totalPayments },
    { data: roadmapRows },
    { data: recentUsers },
  ] = await Promise.all([
    supabase.from("user_profiles").select("*", { count: "exact", head: true }),
    supabase.from("user_profiles").select("*", { count: "exact", head: true }).not("scores", "is", null),
    supabase.from("user_profiles").select("*", { count: "exact", head: true }).eq("has_paid", true),
    supabase.from("user_profiles").select("archetype").not("archetype", "is", null),
    supabase.from("user_profiles").select("scores").not("scores", "is", null),
    supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "paid"),
    supabase.from("roadmap_progress").select("user_id"),
    supabase
      .from("user_profiles")
      .select("email, archetype, scores, has_paid, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // Most common archetype
  const archetypeCount: Record<string, number> = {};
  (allArchetypes ?? []).forEach(({ archetype }) => {
    if (archetype) archetypeCount[archetype] = (archetypeCount[archetype] ?? 0) + 1;
  });
  const mostCommonArchetype =
    Object.entries(archetypeCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  // Average overall score + lowest dimension
  const scoresList = (allScores ?? []).map((r) => r.scores as Record<string, number>).filter(Boolean);
  let avgOverall = 0;
  let lowestDim = "—";
  if (scoresList.length > 0) {
    const dims = ["thinkingStrategy", "execution", "technicalFluency", "userResearch", "communication"];
    avgOverall =
      scoresList.reduce((sum, s) => sum + (s.overall ?? 0), 0) / scoresList.length;
    const dimAvgs = dims.map((d) => ({
      key: d,
      avg: scoresList.reduce((sum, s) => sum + (s[d] ?? 0), 0) / scoresList.length,
    }));
    const lowest = dimAvgs.sort((a, b) => a.avg - b.avg)[0];
    const labels: Record<string, string> = {
      thinkingStrategy: "Thinking & Strategy",
      execution: "Execution",
      technicalFluency: "Technical Fluency",
      userResearch: "User & Research",
      communication: "Communication",
    };
    lowestDim = labels[lowest.key] ?? lowest.key;
  }

  // Avg roadmap steps per user
  const roadmapCount = roadmapRows?.length ?? 0;
  const uniqueRoadmapUsers = new Set(roadmapRows?.map((r) => r.user_id)).size;
  const avgRoadmapSteps =
    uniqueRoadmapUsers > 0 ? (roadmapCount / uniqueRoadmapUsers).toFixed(1) : "0";

  return {
    totalUsers: totalUsers ?? 0,
    completedAssessment: completedAssessment ?? 0,
    paidUsers: paidUsers ?? 0,
    conversionRate:
      totalUsers ? Math.round(((paidUsers ?? 0) / totalUsers) * 100) : 0,
    mostCommonArchetype,
    avgOverall: avgOverall.toFixed(2),
    lowestDim,
    totalPayments: totalPayments ?? 0,
    totalRevenue: `Rs ${((totalPayments ?? 0) * 100).toLocaleString("en-IN")}`,
    avgRoadmapSteps,
    recentUsers: (recentUsers ?? []) as UserRow[],
  };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="flex flex-col gap-1 px-5 py-4 rounded-xl"
      style={{
        backgroundColor: "rgba(56,189,248,0.05)",
        border: "1px solid rgba(56,189,248,0.1)",
      }}
    >
      <span className="text-xs" style={{ color: "rgba(232,239,248,0.4)" }}>{label}</span>
      <span className="text-2xl font-bold tabular-nums" style={{ color: "#E8EFF8" }}>{value}</span>
    </div>
  );
}

// ─── Admin page (Server Component) ───────────────────────────────────────────

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signup");

  // Guard by admin email
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || user.email !== adminEmail) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#0D1117", color: "#E8EFF8" }}
      >
        <p className="text-sm" style={{ color: "rgba(232,239,248,0.4)" }}>
          Access denied.
        </p>
      </div>
    );
  }

  const m = await fetchMetrics(supabase);

  return (
    <div
      className="min-h-screen px-6 py-12"
      style={{ backgroundColor: "#0D1117", color: "#E8EFF8" }}
    >
      <div className="max-w-5xl mx-auto flex flex-col gap-10">

        {/* Header */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-mono tracking-widest uppercase" style={{ color: "rgba(56,189,248,0.5)" }}>
            Admin
          </span>
          <h1
            className="text-2xl"
            style={{ fontFamily: "var(--font-fraunces)", color: "#E8EFF8" }}
          >
            PM Career Navigator — Dashboard
          </h1>
        </div>

        {/* User metrics */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-medium tracking-widest uppercase" style={{ color: "rgba(232,239,248,0.35)" }}>
            Users
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard label="Total signed up" value={m.totalUsers} />
            <MetricCard label="Completed assessment" value={m.completedAssessment} />
            <MetricCard label="Paid users" value={m.paidUsers} />
            <MetricCard label="Conversion rate" value={`${m.conversionRate}%`} />
          </div>
        </section>

        {/* Assessment metrics */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-medium tracking-widest uppercase" style={{ color: "rgba(232,239,248,0.35)" }}>
            Assessment
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <MetricCard label="Most common archetype" value={m.mostCommonArchetype} />
            <MetricCard label="Avg readiness score" value={m.avgOverall} />
            <MetricCard label="Lowest avg dimension" value={m.lowestDim} />
          </div>
        </section>

        {/* Revenue metrics */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-medium tracking-widest uppercase" style={{ color: "rgba(232,239,248,0.35)" }}>
            Revenue
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Successful payments" value={m.totalPayments} />
            <MetricCard label="Total collected" value={m.totalRevenue} />
          </div>
        </section>

        {/* Roadmap metrics */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-medium tracking-widest uppercase" style={{ color: "rgba(232,239,248,0.35)" }}>
            Roadmap
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="Avg steps completed / user" value={m.avgRoadmapSteps} />
          </div>
        </section>

        {/* User table */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-medium tracking-widest uppercase" style={{ color: "rgba(232,239,248,0.35)" }}>
            Recent users (last 20)
          </h2>
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(56,189,248,0.1)" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "rgba(56,189,248,0.06)" }}>
                  {["Email", "Archetype", "Score", "Paid", "Signed up"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-medium"
                      style={{ color: "rgba(232,239,248,0.45)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {m.recentUsers.map((u, i) => (
                  <tr
                    key={i}
                    style={{
                      borderTop: "1px solid rgba(56,189,248,0.06)",
                      backgroundColor:
                        i % 2 === 0 ? "transparent" : "rgba(56,189,248,0.02)",
                    }}
                  >
                    <td className="px-4 py-3" style={{ color: "rgba(232,239,248,0.7)" }}>
                      {u.email ?? "—"}
                    </td>
                    <td className="px-4 py-3" style={{ color: "rgba(232,239,248,0.7)" }}>
                      {u.archetype ?? "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums" style={{ color: "#38BDF8" }}>
                      {u.scores?.overall != null ? u.scores.overall.toFixed(1) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={
                          u.has_paid
                            ? { backgroundColor: "rgba(34,197,94,0.1)", color: "#86EFAC" }
                            : { backgroundColor: "rgba(232,239,248,0.06)", color: "rgba(232,239,248,0.35)" }
                        }
                      >
                        {u.has_paid ? "Paid" : "Free"}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: "rgba(232,239,248,0.4)" }}>
                      {new Date(u.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
                {m.recentUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center"
                      style={{ color: "rgba(232,239,248,0.25)" }}
                    >
                      No users yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
