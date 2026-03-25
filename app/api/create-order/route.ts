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
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();

    console.log("Session:", session?.user?.email);
    console.log("Razorpay key exists:", !!process.env.RAZORPAY_KEY_ID);

    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const order = await razorpay.orders.create({
      amount: 10000,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    return Response.json({ order_id: order.id });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : JSON.stringify(error, null, 2);
    console.error("Create order error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
