import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(_request: NextRequest) {
  // Verify user is authenticated
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });

  try {
    const order = await razorpay.orders.create({
      amount: 10000, // Rs 100 in paise
      currency: "INR",
      receipt: `pm_${user.id.slice(0, 8)}_${Date.now()}`,
    });

    return NextResponse.json({ order_id: order.id });
  } catch {
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
