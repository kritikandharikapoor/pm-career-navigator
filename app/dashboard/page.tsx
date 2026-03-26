import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import Sidebar from "@/app/components/Sidebar";
import DashboardClient from "./DashboardClient";
import type { Scores } from "@/lib/data/assessment";

// NOTE: Run this SQL in Supabase before first use:
// create table if not exists score_history (
//   id uuid default gen_random_uuid() primary key,
//   user_id uuid references auth.users(id) on delete cascade,
//   overall_score numeric,
//   thinking_strategy numeric,
//   execution numeric,
//   technical_fluency numeric,
//   user_research numeric,
//   communication numeric,
//   evaluated_at timestamptz default now()
// );

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signup");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("archetype, scores, has_paid, created_at")
    .eq("id", user.id)
    .single();

  if (!profile?.has_paid) redirect("/payment");

  const rawScores = profile?.scores as Record<string, number> | null;
  if (!rawScores?.overall) redirect("/assessment");

  const scores: Scores = {
    thinkingStrategy: rawScores.thinkingStrategy ?? 0,
    execution:        rawScores.execution        ?? 0,
    technicalFluency: rawScores.technicalFluency ?? 0,
    userResearch:     rawScores.userResearch     ?? 0,
    communication:    rawScores.communication    ?? 0,
    overall:          rawScores.overall          ?? 0,
  };

  // Roadmap progress
  const { data: progressRows } = await supabase
    .from("roadmap_progress")
    .select("step_id")
    .eq("user_id", user.id);
  const completedStepIds = (progressRows ?? []).map((r: { step_id: string }) => r.step_id);

  // Score history — gracefully skip if table doesn't exist yet
  let scoreHistory: { overall_score: number; evaluated_at: string }[] = [];
  try {
    const { data: historyRows, error } = await supabase
      .from("score_history")
      .select("overall_score, evaluated_at")
      .eq("user_id", user.id)
      .order("evaluated_at", { ascending: true });

    if (!error && historyRows) {
      scoreHistory = historyRows as { overall_score: number; evaluated_at: string }[];
    }

    // Seed first entry if empty
    if (!error && (!historyRows || historyRows.length === 0)) {
      await supabase.from("score_history").insert({
        user_id:            user.id,
        overall_score:      scores.overall,
        thinking_strategy:  scores.thinkingStrategy,
        execution:          scores.execution,
        technical_fluency:  scores.technicalFluency,
        user_research:      scores.userResearch,
        communication:      scores.communication,
      });
      scoreHistory = [{ overall_score: scores.overall, evaluated_at: new Date().toISOString() }];
    }
  } catch {
    // Table not yet created — fall back to single-point history
    scoreHistory = [{ overall_score: scores.overall, evaluated_at: new Date().toISOString() }];
  }

  return (
    <div className="flex" style={{ backgroundColor: "#0D1117", minHeight: "100vh" }}>
      <Sidebar userEmail={user.email ?? ""} activePath="/dashboard" />
      <main
        className="flex-1 min-h-screen px-8 py-10"
        style={{ marginLeft: "240px", color: "#E8EFF8", maxWidth: "1100px" }}
      >
        <DashboardClient
          email={user.email ?? ""}
          archetype={profile.archetype ?? "The Explorer"}
          scores={scores}
          createdAt={profile.created_at ?? new Date().toISOString()}
          completedStepIds={completedStepIds}
          scoreHistory={scoreHistory}
        />
      </main>
    </div>
  );
}
