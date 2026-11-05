import { NextResponse } from "next/server";
import { getServiceDatabase, requireStaffRole } from "@/lib/admin/server";
import {mockMode,mockState} from "@/lib/mock-data";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { context, response } = requireStaffRole(request, ["super_admin", "rider"]);
  if (response) return response;
  const { id } = await params;
  const body = await request.json().catch(() => null) as { status?: string } | null;
  if (!body || body.status !== "enroute") return NextResponse.json({ error: "Customer QR verification is required to confirm handover." }, { status: 400 });
  if(mockMode()){const order=mockState().orders.find(entry=>entry.id===id);if(!order||order.status!=="dispatched")return NextResponse.json({error:"Delivery is not active."},{status:409});order.status="enroute";order.updated_at=new Date().toISOString();return NextResponse.json({success:true,order});}
  const supabase = getServiceDatabase();
  if (!supabase) return NextResponse.json({ error: "Rider service is not configured." }, { status: 503 });

  if (context.role === "rider" && !context.sandbox) {
    const { data: rider } = await supabase.from("delivery_riders").select("id").eq("user_id", context.userId).eq("is_active", true).maybeSingle();
    if (!rider) return NextResponse.json({ error: "Rider account is not active." }, { status: 403 });
    const { data: assignment } = await supabase.from("order_deliveries").select("order_id").eq("order_id", id).eq("rider_id", rider.id).maybeSingle();
    if (!assignment) return NextResponse.json({ error: "This delivery is not assigned to you." }, { status: 403 });
  }

  const { data, error } = await supabase.from("orders").update({ status: body.status, updated_at: new Date().toISOString() }).eq("id", id).eq("status", "dispatched").select("id,status").maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to update delivery status." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Delivery is not active." }, { status: 409 });
  return NextResponse.json({ success: true, order: data });
}
