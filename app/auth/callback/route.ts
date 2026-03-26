import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// IMPORTANT — ensure both of these are in Supabase Auth → URL Configuration → Redirect URLs:
//   https://pm-career-navigator.vercel.app/auth/callback
//   http://localhost:3002/auth/callback

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/signup?error=no_code`);
  }

  // Create the redirect response FIRST so auth cookies are set directly on it.
  // Previously this was done after the fact, losing the session on Vercel.
  const redirectResponse = NextResponse.redirect(`${origin}/payment`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write to both request (so subsequent reads work) and the response we'll return
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            redirectResponse.cookies.set(name, value, options)
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

  // FIX 1 — Always ensure a user_profiles row exists.
  // ignoreDuplicates: true means existing rows (and their has_paid value) are untouched.
  await supabase.from("user_profiles").upsert(
    {
      id:        user.id,
      email:     user.email,
      has_paid:  false,
      scores:    null,
      archetype: null,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );

  // Assessment data (scores, archetype, warmup answers) lives in localStorage.
  // It is migrated to user_profiles client-side by the /payment page after login,
  // which is more reliable than passing it through OAuth URL params.

  // Track signup — fire-and-forget, non-blocking
  fetch("https://us.i.posthog.com/capture/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
      event: "signup_completed",
      distinct_id: user.id,
      properties: { email: user.email },
    }),
  }).catch(() => {});

  return redirectResponse;
}
