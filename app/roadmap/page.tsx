import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import Sidebar from "@/app/components/Sidebar";
import RoadmapClient from "./RoadmapClient";
import type { Scores } from "@/lib/data/assessment";

export default async function RoadmapPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signup");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("archetype, scores, has_paid")
    .eq("id", user.id)
    .single();

  if (!profile?.has_paid) redirect("/payment");

  // Record first visit timestamp — separate query so a missing column doesn't
  // break the main profile fetch and payment gate above.
  let firstVisit = new Date().toISOString();
  const { data: visitRow, error: visitError } = await supabase
    .from("user_profiles")
    .select("first_roadmap_visit")
    .eq("id", user.id)
    .single();

  if (!visitError && visitRow?.first_roadmap_visit) {
    firstVisit = visitRow.first_roadmap_visit as string;
  } else if (!visitError) {
    // Column exists but null — set it now
    await supabase
      .from("user_profiles")
      .update({ first_roadmap_visit: firstVisit })
      .eq("id", user.id);
  }
  // If visitError (column not yet migrated), firstVisit stays as current date

  const { data: progressRows } = await supabase
    .from("roadmap_progress")
    .select("step_id")
    .eq("user_id", user.id);

  const completedStepIds = (progressRows ?? []).map(
    (r: { step_id: string }) => r.step_id
  );

  const rawScores = profile?.scores as Record<string, number> | null;
  const scores: Scores = {
    thinkingStrategy: rawScores?.thinkingStrategy ?? 0,
    execution:        rawScores?.execution        ?? 0,
    technicalFluency: rawScores?.technicalFluency ?? 0,
    userResearch:     rawScores?.userResearch     ?? 0,
    communication:    rawScores?.communication    ?? 0,
    overall:          rawScores?.overall          ?? 0,
  };

  return (
    <div className="flex" style={{ backgroundColor: "#0D1117", minHeight: "100vh" }}>
      <Sidebar userEmail={user.email ?? ""} activePath="/roadmap" />
      <main
        className="flex-1 min-h-screen px-8 py-10"
        style={{ marginLeft: "240px", color: "#E8EFF8", maxWidth: "900px" }}
      >
        <RoadmapClient
          archetype={profile.archetype ?? "The Explorer"}
          scores={scores}
          userId={user.id}
          completedStepIds={completedStepIds}
          firstVisit={firstVisit}
        />
      </main>
    </div>
  );
}
