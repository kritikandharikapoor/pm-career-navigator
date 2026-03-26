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

    const scores = await request.json();

    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({ scores })
      .eq("id", user.id);

    if (profileError) {
      return Response.json({ error: profileError.message }, { status: 500 });
    }

    const { error: historyError } = await supabase
      .from("score_history")
      .insert({
        user_id:           user.id,
        overall_score:     scores.overall,
        thinking_strategy: scores.thinkingStrategy,
        execution:         scores.execution,
        technical_fluency: scores.technicalFluency,
        user_research:     scores.userResearch,
        communication:     scores.communication,
      });

    if (historyError) {
      // Profile was already updated; don't fail the whole request
      return Response.json({ ok: true, historyWarning: historyError.message });
    }

    return Response.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
