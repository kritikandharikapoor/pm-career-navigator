import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Razorpay from "razorpay";

export async function POST() {
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

    // NEXT_PUBLIC_RAZORPAY_KEY_ID is the env var name in Vercel
    const keyId = process.env.RAZORPAY_KEY_ID ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("Razorpay keys missing. keyId:", !!keyId, "keySecret:", !!keySecret);
      return Response.json({ error: "Payment provider not configured" }, { status: 500 });
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const order = await razorpay.orders.create({
      amount: 10000,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    return Response.json({ order_id: order.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : JSON.stringify(error, null, 2);
    console.error("Create order error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
