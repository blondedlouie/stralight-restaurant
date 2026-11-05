import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getServiceDatabase } from "@/lib/admin/server";

function mapStatus(value: string) {
  if (["pending", "pickup", "EN_ROUTE_TO_PICKUP", "ARRIVED_AT_PICKUP"].includes(value)) return "dispatched";
  if (["pickup_complete", "dropoff", "EN_ROUTE_TO_DROPOFF", "ARRIVED_AT_DROPOFF"].includes(value)) return "enroute";
  if (["delivered", "COMPLETED"].includes(value)) return "delivered";
  if (["canceled", "FAILED", "returned"].includes(value)) return "cancelled";
  return null;
}

export async function POST(request: Request) {
  const signingKey = process.env.UBER_DIRECT_WEBHOOK_SIGNING_KEY || process.env.UBER_DIRECT_CLIENT_SECRET;
  if (!signingKey) return NextResponse.json({ error: "Uber webhook signing is not configured." }, { status: 503 });
  const rawBody = await request.text();
  const signature = request.headers.get("x-uber-signature") || request.headers.get("x-postmates-signature");
  if (!signature) return NextResponse.json({ error: "Missing webhook signature." }, { status: 401 });
  const expected = Buffer.from(createHmac("sha256", signingKey).update(rawBody).digest("hex"));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });

  const event = JSON.parse(rawBody);
  const statusText = event.meta?.status || event.status || event.data?.status;
  const orderId = event.meta?.external_order_id || event.external_order_id || event.data?.external_id;
  if (!orderId || !statusText) return NextResponse.json({ received: true });
  const status = mapStatus(String(statusText));
  if (!status) return NextResponse.json({ received: true });
  const supabase = getServiceDatabase();
  if (!supabase) return NextResponse.json({ error: "Webhook storage is not configured." }, { status: 503 });
  const { data: delivery } = await supabase.from("order_deliveries").select("order_id").eq("provider", "uber_direct").eq("order_id", orderId).maybeSingle();
  if (!delivery) return NextResponse.json({ received: true });

  const courier = event.data?.courier || event.courier || null;
  await supabase.from("order_deliveries").update({ rider_name: courier?.name || null, rider_phone: courier?.phone_number || courier?.phone || null, updated_at: new Date().toISOString() }).eq("order_id", delivery.order_id);
  await supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", delivery.order_id);
  return NextResponse.json({ received: true });
}
