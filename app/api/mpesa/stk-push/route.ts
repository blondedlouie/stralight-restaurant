import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type PaymentRequest = { orderId?: string; phone?: string };

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const phone = digits.startsWith("0") ? `254${digits.slice(1)}` : digits.startsWith("7") || digits.startsWith("1") ? `254${digits}` : digits;
  return /^254[17]\d{8}$/.test(phone) ? phone : null;
}

async function getDarajaToken() {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  if (!consumerKey || !consumerSecret) throw new Error("M-PESA Daraja credentials are not configured.");
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const url = process.env.MPESA_ENVIRONMENT === "live"
    ? "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    : "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
  const response = await fetch(url, { headers: { Authorization: `Basic ${auth}` }, cache: "no-store" });
  const data = await response.json();
  if (!response.ok || typeof data.access_token !== "string") throw new Error("Unable to authenticate with M-PESA Daraja.");
  return data.access_token as string;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as PaymentRequest | null;
  if (!body?.orderId || !/^SL-?\d{4,10}$/.test(body.orderId) || !body.phone) return NextResponse.json({ error: "A valid order ID and Kenyan phone number are required." }, { status: 400 });
  const phone = normalizePhone(body.phone);
  if (!phone) return NextResponse.json({ error: "Enter a valid Kenyan M-PESA phone number." }, { status: 400 });

  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  if (!shortcode || !passkey || !callbackUrl) return NextResponse.json({ error: "M-PESA payment settings are incomplete." }, { status: 503 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Payment database is not configured." }, { status: 503 });

  const { data: order, error: orderError } = await supabase.from("orders").select("id,total_amount,payment_status,mpesa_checkout_id").eq("id", body.orderId).maybeSingle();
  if (orderError) return NextResponse.json({ error: "Unable to validate the order." }, { status: 500 });
  if (!order) return NextResponse.json({ error: "Order was not found." }, { status: 404 });
  if (order.payment_status === "paid") return NextResponse.json({ error: "This order is already paid." }, { status: 409 });
  if (order.mpesa_checkout_id && order.payment_status === "processing") return NextResponse.json({ error: "An M-PESA payment request is already active for this order." }, { status: 409 });

  try {
    const token = await getDarajaToken();
    const stamp = new Date();
    const timestamp = `${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, "0")}${String(stamp.getDate()).padStart(2, "0")}${String(stamp.getHours()).padStart(2, "0")}${String(stamp.getMinutes()).padStart(2, "0")}${String(stamp.getSeconds()).padStart(2, "0")}`;
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
    const endpoint = process.env.MPESA_ENVIRONMENT === "live"
      ? "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
      : "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
    const stkResponse = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ BusinessShortCode: shortcode, Password: password, Timestamp: timestamp, TransactionType: "CustomerPayBillOnline", Amount: Math.round(Number(order.total_amount)), PartyA: phone, PartyB: shortcode, PhoneNumber: phone, CallBackURL: callbackUrl, AccountReference: order.id, TransactionDesc: `Starlight Order ${order.id}` }),
      cache: "no-store",
    });
    const stk = await stkResponse.json();
    if (!stkResponse.ok || stk.ResponseCode !== "0" || !stk.CheckoutRequestID) return NextResponse.json({ error: stk.ResponseDescription || stk.errorMessage || "M-PESA could not start the payment request." }, { status: 502 });
    const { error: updateError } = await supabase.from("orders").update({ mpesa_checkout_id: stk.CheckoutRequestID, payment_status: "processing", updated_at: new Date().toISOString() }).eq("id", order.id).neq("payment_status", "paid");
    if (updateError) return NextResponse.json({ error: "Payment started, but the order could not save its checkout reference." }, { status: 500 });
    return NextResponse.json({ success: true, checkoutId: stk.CheckoutRequestID });
  } catch (issue) {
    const message = issue instanceof Error ? issue.message : "M-PESA payment request failed.";
    return NextResponse.json({ error: message }, { status: message.includes("not configured") ? 503 : 502 });
  }
}
