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

  const rawScores = profile?.scores as Record<string, unknown> | null;
  if (!rawScores?.overall) redirect("/assessment");

  const scores: Scores = {
    thinkingStrategy: Number(rawScores.thinkingStrategy) || 0,
    execution:        Number(rawScores.execution)        || 0,
    technicalFluency: Number(rawScores.technicalFluency) || 0,
    userResearch:     Number(rawScores.userResearch)     || 0,
    communication:    Number(rawScores.communication)    || 0,
    overall:          Number(rawScores.overall)          || 0,
  };

  // Roadmap progress
  const { data: progressRows } = await supabase
    .from("roadmap_progress")
    .select("step_id")
    .eq("user_id", user.id);
  const completedStepIds = (progressRows ?? []).map((r: { step_id: string }) => r.step_id);

  // Score history — read from embedded history in scores first (guaranteed to work),
  // then fall back to score_history table.
  let scoreHistory: { overall_score: number; evaluated_at: string }[] = [];

  const embeddedHistory = Array.isArray(rawScores.history)
    ? (rawScores.history as { overall: number; evaluated_at: string }[])
    : [];

  if (embeddedHistory.length >= 2) {
    // Use embedded history (written by re-eval API route)
    scoreHistory = embeddedHistory.map(h => ({
      overall_score: h.overall,
      evaluated_at:  h.evaluated_at,
    }));
  } else {
    // Fall back to score_history table
    try {
      const { data: historyRows, error } = await supabase
        .from("score_history")
        .select("overall_score, evaluated_at")
        .eq("user_id", user.id)
        .order("evaluated_at", { ascending: true });

      if (!error && historyRows && historyRows.length > 0) {
        scoreHistory = historyRows as { overall_score: number; evaluated_at: string }[];
      } else {
        // Seed single baseline point
        scoreHistory = [{ overall_score: scores.overall, evaluated_at: new Date().toISOString() }];
      }
    } catch {
      scoreHistory = [{ overall_score: scores.overall, evaluated_at: new Date().toISOString() }];
    }
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
