import { NextResponse } from "next/server";
import { getServiceDatabase } from "@/lib/admin/server";
import { mockOrder } from "@/lib/mock-data";

export async function POST() {
  if (process.env.NEXT_PUBLIC_ENABLE_SANDBOX !== "true") return NextResponse.json({ error: "Sandbox is disabled." }, { status: 404 });
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" && process.env.NODE_ENV !== "production") { const order=mockOrder(); return NextResponse.json({success:true,orderId:order.id,trackingUrl:`/track/${order.id}`,branch:order.branch,total:order.total_amount,status:order.status}, {status:201}); }
  const supabase = getServiceDatabase();
  if (!supabase) return NextResponse.json({ error: "Sandbox database is not configured." }, { status: 503 });
  const latitude = -1.3204;
  const longitude = 36.8315;
  const { data: matches, error: routeError } = await supabase.rpc("route_customer_order", { lat: latitude, lng: longitude });
  if (routeError) return NextResponse.json({ error: "Unable to match the mock delivery location. Apply the PostGIS schema first." }, { status: 500 });
  const branchId = matches?.[0]?.branch_id;
  if (!branchId) return NextResponse.json({ error: "No active branch serves the mock customer location." }, { status: 409 });
  const orderId = `SL-${Date.now().toString().slice(-8)}`;
  const now = new Date();
  const { error: orderError } = await supabase.from("orders").insert({
    id: orderId, branch_id: branchId, customer_name: "Luis Etyang", customer_phone: "+254700000001", order_type: "delivery", status: "placed", payment_status: "paid", preferred_date: now.toISOString().slice(0, 10), preferred_time: "As soon as possible", search_estate: "South C", specific_landmark: "Bellevue, Mombasa Road", building_name: "Mock customer address", delivery_latitude: latitude, delivery_longitude: longitude, subtotal: 1250, delivery_fee: 150, total_amount: 1400,
  });
  if (orderError) return NextResponse.json({ error: "Unable to create the mock order." }, { status: 500 });
  const { error: itemError } = await supabase.from("order_items").insert([
    { order_id: orderId, item_name: "2 Pieces with Chips", variant_name: "Mild", quantity: 2, unit_price: 400, total_price: 800, kitchen_dept: "chicken" },
    { order_id: orderId, item_name: "BBQ Steak Pizza", variant_name: "Regular", quantity: 1, unit_price: 450, total_price: 450, kitchen_dept: "pizza" },
  ]);
  if (itemError) { await supabase.from("orders").delete().eq("id", orderId); return NextResponse.json({ error: "Unable to add mock order items." }, { status: 500 }); }
  await supabase.from("order_deliveries").insert({ order_id: orderId, provider: "in_house", eta_minutes: 40 });
  return NextResponse.json({ success: true, orderId, trackingUrl: `/track/${encodeURIComponent(orderId)}` }, { status: 201 });
}
