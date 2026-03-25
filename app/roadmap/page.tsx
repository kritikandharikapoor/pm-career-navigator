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

  const { data: progressRows } = await supabase
    .from("roadmap_progress")
    .select("step_id")
    .eq("user_id", user.id);

  const completedStepIds = (progressRows ?? []).map(
    (r: { step_id: string }) => r.step_id
  );

  const scores = (profile.scores ?? {
    thinkingStrategy: 2.5,
    execution: 2.5,
    technicalFluency: 2.5,
    userResearch: 2.5,
    communication: 2.5,
    overall: 2.5,
  }) as Scores;

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
        />
      </main>
    </div>
  );
}
