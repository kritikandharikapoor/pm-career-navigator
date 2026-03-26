import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const newScores = await request.json();

    // Read current scores to extract existing history
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("scores")
      .eq("id", user.id)
      .single();

    const existing = (profile?.scores ?? {}) as Record<string, unknown>;
    const existingHistory = Array.isArray(existing.history) ? existing.history : [];

    // Append current (pre-reeval) overall score as the baseline entry if history is empty
    if (existingHistory.length === 0 && typeof existing.overall === "number") {
      existingHistory.push({
        overall: existing.overall,
        evaluated_at: new Date().toISOString(),
      });
    }

    // Append the new evaluation
    existingHistory.push({
      overall: newScores.overall,
      evaluated_at: new Date().toISOString(),
    });

    // Save new scores + embedded history to user_profiles
    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({ scores: { ...newScores, history: existingHistory } })
      .eq("id", user.id);

    if (profileError) {
      return Response.json({ error: profileError.message }, { status: 500 });
    }

    // Also try score_history table (best effort — failure is non-blocking)
    await supabase.from("score_history").insert({
      user_id:           user.id,
      overall_score:     newScores.overall,
      thinking_strategy: newScores.thinkingStrategy,
      execution:         newScores.execution,
      technical_fluency: newScores.technicalFluency,
      user_research:     newScores.userResearch,
      communication:     newScores.communication,
    });

    return Response.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
