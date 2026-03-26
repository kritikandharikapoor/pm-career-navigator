import crypto from "crypto";
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
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();

    console.log("Session:", session?.user?.email);

    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      await request.json();

    // Verify Razorpay HMAC signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return Response.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Mark user as paid
    const [profileUpdate, paymentInsert] = await Promise.all([
      supabase
        .from("user_profiles")
        .update({ has_paid: true })
        .eq("id", session.user.id),
      supabase.from("payments").insert({
        user_id: session.user.id,
        razorpay_order_id,
        razorpay_payment_id,
        amount: 100,
        status: "paid",
      }),
    ]);

    if (profileUpdate.error || paymentInsert.error) {
      console.error("DB error:", profileUpdate.error ?? paymentInsert.error);
      return Response.json({ error: "DB update failed" }, { status: 500 });
    }

    // Track payment — fire-and-forget, non-blocking
    fetch("https://us.i.posthog.com/capture/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
        event: "payment_completed",
        distinct_id: session.user.id,
        properties: { amount: 100 },
      }),
    }).catch(() => {});

    return Response.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Verify payment error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
