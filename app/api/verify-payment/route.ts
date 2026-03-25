import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Mark user as paid
  const [profileUpdate, paymentInsert] = await Promise.all([
    supabase
      .from("user_profiles")
      .update({ has_paid: true })
      .eq("id", user.id),
    supabase.from("payments").insert({
      user_id: user.id,
      razorpay_order_id,
      razorpay_payment_id,
      amount: 100,
      status: "paid",
    }),
  ]);

  if (profileUpdate.error || paymentInsert.error) {
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
