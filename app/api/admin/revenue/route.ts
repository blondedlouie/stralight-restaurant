import { NextResponse } from "next/server";
import { getServiceDatabase, requireStaffRole } from "@/lib/admin/server";
import {mockBranches,mockMode,mockState} from "@/lib/mock-data";

export async function GET(request: Request) {
  const { response } = requireStaffRole(request, ["super_admin"]);
  if (response) return response;
  if(mockMode()){const orders=mockState().orders;const paid=orders.filter(order=>order.payment_status==="paid");return NextResponse.json({periodDays:30,orderCount:orders.length,paidOrderCount:paid.length,revenue:paid.reduce((sum,order)=>sum+order.total_amount,0),activeBranches:mockBranches.length,statuses:orders.reduce<Record<string,number>>((counts,order)=>{counts[order.status]=(counts[order.status]||0)+1;return counts;},{}),branches:mockState().branches});}
  const supabase = getServiceDatabase();
  if (!supabase) return NextResponse.json({ error: "Admin database is not configured." }, { status: 503 });
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [orderResult, branchResult] = await Promise.all([
    supabase.from("orders").select("id,status,payment_status,total_amount,created_at,branch_id").gte("created_at", since).limit(5000),
    supabase.from("branches").select("id,name,region,delivery_radius_m,latitude,longitude,average_prep_minutes,average_delivery_minutes").eq("is_active", true).order("name"),
  ]);
  const orders = orderResult.data;
  const branches = branchResult.data;
  if (orderResult.error || branchResult.error) return NextResponse.json({ error: "Unable to load the operations overview." }, { status: 500 });
  const paidOrders = (orders || []).filter((order) => order.payment_status === "paid");
  const revenue = paidOrders.reduce((total, order) => total + Number(order.total_amount || 0), 0);
  return NextResponse.json({
    periodDays: 30,
    orderCount: orders?.length || 0,
    paidOrderCount: paidOrders.length,
    revenue,
    activeBranches: branches?.length || 0,
    statuses: (orders || []).reduce<Record<string, number>>((counts, order) => { counts[order.status] = (counts[order.status] || 0) + 1; return counts; }, {}),
    branches: branches || [],
  }, { headers: { "Cache-Control": "no-store" } });
}
