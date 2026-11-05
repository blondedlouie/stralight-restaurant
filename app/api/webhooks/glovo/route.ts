import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getServiceDatabase } from "@/lib/admin/server";

function secureMatch(actual: string | null, expected: string) {
  if (!actual) return false;
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function mapStatus(value: string) {
  if (["CREATED", "SCHEDULED", "ACTIVATED", "ACCEPTED", "WAITING_FOR_PICKUP"].includes(value)) return "dispatched";
  if (["PICKED", "WAITING_FOR_DELIVERY"].includes(value)) return "enroute";
  if (value === "DELIVERED") return "delivered";
  if (["CANCELLED", "RETURNED", "REJECTED"].includes(value)) return "cancelled";
  return null;
}

export async function POST(request: Request) {
  const secret = process.env.GLOVO_WEBHOOK_SECRET;
  if (!secret || !secureMatch(request.headers.get("authorization"), secret)) return NextResponse.json({ error: "Unauthorized webhook." }, { status: 401 });
  const event = await request.json().catch(() => null);
  if (!event?.trackingNumber || !event?.status) return NextResponse.json({ error: "Invalid Glovo status event." }, { status: 400 });
  const status = mapStatus(String(event.status));
  if (!status) return NextResponse.json({ received: true });
  const supabase = getServiceDatabase();
  if (!supabase) return NextResponse.json({ error: "Webhook storage is not configured." }, { status: 503 });
  const { data: delivery } = await supabase.from("order_deliveries").select("order_id").eq("provider", "glovo").eq("courier_reference", event.trackingNumber).maybeSingle();
  if (!delivery) return NextResponse.json({ received: true });

  const courier = event.courier || null;
  await supabase.from("order_deliveries").update({
    courier_name: courier?.name || "Glovo On-Demand",
    rider_name: courier?.name || null,
    rider_phone: courier?.phone || null,
    updated_at: new Date().toISOString(),
  }).eq("order_id", delivery.order_id);
  await supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", delivery.order_id);
  return NextResponse.json({ received: true });
}
