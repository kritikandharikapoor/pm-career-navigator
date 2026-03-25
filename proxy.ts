import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED_PATHS = ["/report", "/roadmap", "/go-deeper", "/dashboard", "/re-evaluate"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  if (!isProtected) return NextResponse.next();

  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/signup", request.url));
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("has_paid")
    .eq("id", user.id)
    .single();

  if (!profile?.has_paid) {
    return NextResponse.redirect(new URL("/payment", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/report/:path*",
    "/roadmap/:path*",
    "/go-deeper/:path*",
    "/dashboard/:path*",
    "/re-evaluate/:path*",
  ],
};
