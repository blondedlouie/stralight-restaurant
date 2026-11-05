import { NextResponse } from "next/server";
import { getServiceDatabase, requireStaffRole } from "@/lib/admin/server";
import {mockMode,mockState} from "@/lib/mock-data";

const staffRoles = ["super_admin", "branch_manager", "dispatch", "kitchen"] as const;

export async function GET(request: Request) {
  const { context, response } = requireStaffRole(request, [...staffRoles]);
  if (response) return response;
  if(mockMode()){const statuses=new URL(request.url).searchParams.getAll("status");let orders=mockState().orders;if(statuses.length)orders=orders.filter(order=>statuses.includes(order.status));return NextResponse.json({orders},{headers:{"Cache-Control":"no-store"}});}
  const supabase = getServiceDatabase();
  if (!supabase) return NextResponse.json({ error: "Admin database is not configured." }, { status: 503 });

  const url = new URL(request.url);
  const statuses = url.searchParams.getAll("status").filter((status) => ["placed", "kitchen", "ready", "dispatched", "enroute", "delivered", "cancelled"].includes(status));
  let query = supabase.from("orders").select("id,branch_id,status,order_type,payment_status,customer_name,customer_phone,search_estate,specific_landmark,building_name,delivery_latitude,delivery_longitude,subtotal,delivery_fee,total_amount,created_at,updated_at,branch:branches(id,name,address_description,phone_primary,latitude,longitude),items:order_items(id,item_name,variant_name,quantity,unit_price,total_price,kitchen_dept),delivery:order_deliveries(rider_id,rider_name,rider_phone,courier_name,courier_reference,eta_minutes,rider:delivery_riders(id,full_name,phone))").order("created_at", { ascending: true });
  if (context.role !== "super_admin") {
    if (!context.branchId && !context.sandbox) return NextResponse.json({ error: "Staff account is not assigned to a branch." }, { status: 403 });
    if (context.branchId) query = query.eq("branch_id", context.branchId);
  }
  if (statuses.length === 1) query = query.eq("status", statuses[0]);
  if (statuses.length > 1) query = query.in("status", statuses);

  const { data, error } = await query.limit(150);
  if (error) {
    console.error("Admin order query failed", error.message);
    return NextResponse.json({ error: "Unable to load orders." }, { status: 500 });
  }
  return NextResponse.json({ orders: data || [] }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
