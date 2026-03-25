import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/signup?error=no_code`);
  }

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

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/auth/signup?error=auth_failed`);
  }

  const user = data.user;

  // Read assessment data from cookies set by the signup page
  function getCookieVal(name: string): string | null {
    const val = cookieStore.get(name)?.value;
    return val ? decodeURIComponent(val) : null;
  }

  const rawScores   = getCookieVal("pm_scores");
  const archetype   = getCookieVal("pm_archetype");
  const background  = getCookieVal("pm_background");
  const experience  = getCookieVal("pm_experience");
  const industry    = getCookieVal("pm_industry");

  // Upsert user_profiles row
  await supabase.from("user_profiles").upsert(
    {
      id: user.id,
      email: user.email,
      ...(archetype   && { archetype }),
      ...(rawScores   && { scores: JSON.parse(rawScores) }),
      ...(background  && { warmup_background: background }),
      ...(experience  && { warmup_experience: experience }),
      ...(industry    && { warmup_industry: industry }),
    },
    { onConflict: "id" }
  );

  // Clear pm_* cookies
  const pmCookies = ["pm_scores", "pm_archetype", "pm_background", "pm_experience", "pm_industry"];
  const response = NextResponse.redirect(`${origin}/payment`);
  pmCookies.forEach((name) => {
    response.cookies.set(name, "", { maxAge: 0, path: "/" });
  });

  return response;
}
