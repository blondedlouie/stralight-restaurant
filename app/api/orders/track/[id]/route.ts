import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createPodPayload } from "@/lib/tracking/pod-signature";
import {mockMode,mockState} from "@/lib/mock-data";

export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const requestedId = decodeURIComponent(rawId).trim().toUpperCase();
  if (!/^SL-?\d{4,10}$/.test(requestedId)) {
    return NextResponse.json({ error: "Invalid Starlight order ID." }, { status: 400 });
  }
  if(mockMode()){const order=mockState().orders.find(entry=>entry.id===requestedId);if(!order)return NextResponse.json({error:"We couldn’t find that order."},{status:404});const active=["dispatched","enroute"].includes(order.status);return NextResponse.json({order:{...order,estimatedArrivalAt:order.status==="delivered"?null:new Date(new Date(order.created_at).getTime()+40*60000).toISOString(),estimatedDurationMinutes:40,podQrPayload:active?JSON.stringify({orderId:order.id,verificationToken:"mock-token",timestamp:new Date().toISOString(),signature:"mock-signature"}):null}});}

  const supabase = getAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured. Set NEXT_PUBLIC_USE_MOCK_DATA=true for local mock mode or configure Supabase environment variables." }, { status: 503 });

  const { data: order, error } = await supabase
    .from("orders")
    .select("id,status,order_type,payment_status,subtotal,delivery_fee,total_amount,created_at,updated_at,preferred_date,preferred_time,branch:branches(id,name,address_description,phone_primary,phone_chicken,phone_pizza,average_prep_minutes,average_delivery_minutes),items:order_items(id,item_name,variant_name,quantity,unit_price,total_price)")
    .in("id", Array.from(new Set([requestedId, requestedId.replace(/^SL-/, "SL"), requestedId.replace(/^SL(?=\d)/, "SL-")])))
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Order tracking lookup failed", error.message);
    return NextResponse.json({ error: "Unable to load order details." }, { status: 500 });
  }
  if (!order) return NextResponse.json({ error: "We couldn’t find that order." }, { status: 404 });

  const { data: orderSecret } = await supabase
    .from("orders")
    .select("pod_token")
    .eq("id", order.id)
    .maybeSingle();
  const { data: delivery } = await supabase
    .from("order_deliveries")
    .select("provider,rider_name,rider_phone,courier_name,courier_reference,tracking_url,eta_minutes")
    .eq("order_id", order.id)
    .maybeSingle();

  const shouldShowQr = order.status === "dispatched" || order.status === "enroute";
  let podQrPayload: string | null = null;
  if (shouldShowQr && orderSecret?.pod_token) {
    try {
      podQrPayload = JSON.stringify(createPodPayload(order.id, orderSecret.pod_token));
    } catch (signingError) {
      console.error("PoD signing is not configured", signingError);
      return NextResponse.json({ error: "Delivery verification is not configured." }, { status: 503 });
    }
  }

  const branch = Array.isArray(order.branch) ? order.branch[0] : order.branch;
  const prepMinutes = branch?.average_prep_minutes ?? 25;
  const travelMinutes = order.order_type === "pickup" ? 0 : (branch?.average_delivery_minutes ?? 20);
  const deliveryMinutes = delivery?.eta_minutes ?? prepMinutes + travelMinutes;
  const estimatedArrivalAt = order.status === "delivered"
    ? null
    : new Date(new Date(order.created_at).getTime() + deliveryMinutes * 60_000).toISOString();

  return NextResponse.json({
    order: {
      ...order,
      branch: branch ?? null,
      items: order.items ?? [],
      delivery: delivery ?? null,
      estimatedArrivalAt,
      estimatedDurationMinutes: deliveryMinutes,
      podQrPayload,
    },
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
