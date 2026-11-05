import { NextResponse } from "next/server";
import { getServiceDatabase, requireStaffRole } from "@/lib/admin/server";
import {mockMode,mockState} from "@/lib/mock-data";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { context, response } = requireStaffRole(request, ["super_admin", "branch_manager", "dispatch", "kitchen"]);
  if (response) return response;
  const supabase = getServiceDatabase();
  if (!supabase) return NextResponse.json({ error: "Admin database is not configured." }, { status: 503 });
  const { id } = await params;
  const body = await request.json().catch(() => null) as { status?: string; riderId?: string } | null;
  if (!body) return NextResponse.json({ error: "Invalid order update." }, { status: 400 });
  if(mockMode()){const s=mockState();const order=s.orders.find(entry=>entry.id===id);if(!order)return NextResponse.json({error:"Order not found."},{status:404});if(body.riderId){const rider=s.riders.find(entry=>entry.id===body.riderId);if(!rider)return NextResponse.json({error:"Rider not found."},{status:404});order.delivery={...order.delivery,rider_id:rider.id,rider_name:rider.full_name,rider_phone:rider.phone};order.status="dispatched";}else if(body.status){order.status=body.status;}order.updated_at=new Date().toISOString();return NextResponse.json({success:true,order});}

  const { data: order, error: orderError } = await supabase.from("orders").select("id,branch_id,status").eq("id", id).maybeSingle();
  if (orderError || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (context.role !== "super_admin" && !context.sandbox && (!context.branchId || context.branchId !== order.branch_id)) return NextResponse.json({ error: "Order belongs to another branch or your account has no assigned branch." }, { status: 403 });

  if (body.riderId) {
    if (!["super_admin", "branch_manager", "dispatch"].includes(context.role || "")) return NextResponse.json({ error: "Only dispatch staff can assign a rider." }, { status: 403 });
    const { data: rider } = await supabase.from("delivery_riders").select("id,branch_id,full_name,phone").eq("id", body.riderId).eq("is_active", true).maybeSingle();
    if (!rider || (rider.branch_id !== order.branch_id && context.role !== "super_admin")) return NextResponse.json({ error: "Active rider not found for this branch." }, { status: 404 });
    const { error } = await supabase.from("order_deliveries").upsert({ order_id: id, rider_id: rider.id, rider_name: rider.full_name, rider_phone: rider.phone, courier_name: null, courier_reference: null }, { onConflict: "order_id" });
    if (error) return NextResponse.json({ error: "Could not assign this rider." }, { status: 500 });
    const { error: statusError } = await supabase.from("orders").update({ status: "dispatched", updated_at: new Date().toISOString() }).eq("id", id);
    if (statusError) return NextResponse.json({ error: "Rider assigned, but order status could not be advanced." }, { status: 500 });
    return NextResponse.json({ success: true, orderId: id, rider });
  }

  const allowedStatuses = context.role === "kitchen"
    ? ["kitchen", "ready"]
    : context.role === "dispatch" || context.role === "branch_manager"
      ? ["dispatched", "enroute", "cancelled"]
      : ["placed", "kitchen", "ready", "dispatched", "enroute", "delivered", "cancelled"];
  if (!body.status || !allowedStatuses.includes(body.status)) return NextResponse.json({ error: "This role cannot set that order status." }, { status: 403 });

  const { data, error } = await supabase.from("orders").update({ status: body.status, updated_at: new Date().toISOString() }).eq("id", id).select("id,status").single();
  if (error) return NextResponse.json({ error: "Unable to update order status." }, { status: 500 });
  return NextResponse.json({ success: true, order: data });
}
