import { NextResponse } from "next/server";
import { getServiceDatabase, requireStaffRole } from "@/lib/admin/server";
import {mockMode,mockState} from "@/lib/mock-data";

export async function GET(request: Request) {
  const { context, response } = requireStaffRole(request, ["super_admin", "rider"]);
  if (response) return response;
  if(mockMode()){const s=mockState();const rider=s.riders[0]||null;return NextResponse.json({rider,assignments:s.orders.filter(order=>["dispatched","enroute"].includes(order.status)&&(!order.delivery?.rider_id||order.delivery.rider_id===rider?.id)).map(order=>({order_id:order.id,rider_id:order.delivery?.rider_id||rider?.id,order}))});}
  const supabase = getServiceDatabase();
  if (!supabase) return NextResponse.json({ error: "Rider service is not configured." }, { status: 503 });

  let riderQuery = supabase.from("delivery_riders").select("id,branch_id,full_name,phone").eq("is_active", true);
  if (context.role === "rider") {
    if (!context.userId && !context.sandbox) return NextResponse.json({ error: "Rider account is not linked." }, { status: 403 });
    if (context.userId) riderQuery = riderQuery.eq("user_id", context.userId);
  }
  const { data: riders, error: riderError } = await riderQuery;
  if (riderError || !riders?.length) return NextResponse.json({ assignments: [], rider: null });
  const riderIds = riders.map((rider) => rider.id);
  let query = supabase.from("order_deliveries").select("order_id,rider_id,order:orders!inner(id,status,order_type,customer_name,customer_phone,search_estate,specific_landmark,building_name,delivery_latitude,delivery_longitude,total_amount,created_at,branch:branches(name,address_description),items:order_items(item_name,variant_name,quantity))").in("rider_id", riderIds).in("order.status", ["dispatched", "enroute"]).order("created_at", { referencedTable: "orders", ascending: true });
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Unable to load rider assignments." }, { status: 500 });
  return NextResponse.json({ assignments: data || [], rider: riders[0] }, { headers: { "Cache-Control": "no-store" } });
}
