import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type CallbackMetadataItem = { Name?: string; Value?: string | number };

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null) as { Body?: { stkCallback?: { CheckoutRequestID?: string; ResultCode?: number; CallbackMetadata?: { Item?: CallbackMetadataItem[] } } } } | null;
  const callback = payload?.Body?.stkCallback;
  const checkoutId = callback?.CheckoutRequestID;
  if (!checkoutId || typeof callback?.ResultCode !== "number") return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid callback payload" }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ ResultCode: 1, ResultDesc: "Payment callback storage is not configured" }, { status: 503 });
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: order, error } = await supabase.from("orders").select("id,status,payment_status").eq("mpesa_checkout_id", checkoutId).maybeSingle();
  if (error) return NextResponse.json({ ResultCode: 1, ResultDesc: "Unable to find payment record" }, { status: 500 });
  if (!order || order.payment_status === "paid") return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

  if (callback.ResultCode === 0) {
    const receipt = callback.CallbackMetadata?.Item?.find((item) => item.Name === "MpesaReceiptNumber")?.Value;
    const { error: updateError } = await supabase.from("orders").update({ payment_status: "paid", status: order.status === "placed" ? "kitchen" : order.status, mpesa_receipt_number: String(receipt || "CONFIRMED"), updated_at: new Date().toISOString() }).eq("id", order.id).eq("mpesa_checkout_id", checkoutId);
    if (updateError) return NextResponse.json({ ResultCode: 1, ResultDesc: "Unable to update payment record" }, { status: 500 });
  } else {
    const { error: updateError } = await supabase.from("orders").update({ payment_status: "failed", updated_at: new Date().toISOString() }).eq("id", order.id).eq("payment_status", "processing");
    if (updateError) return NextResponse.json({ ResultCode: 1, ResultDesc: "Unable to update payment record" }, { status: 500 });
  }
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
