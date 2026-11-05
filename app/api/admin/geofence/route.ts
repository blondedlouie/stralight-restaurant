import { NextResponse } from "next/server";
import { getServiceDatabase, requireStaffRole } from "@/lib/admin/server";
import {mockMode,mockState} from "@/lib/mock-data";

export async function POST(request: Request) {
  const { response } = requireStaffRole(request, ["super_admin"]);
  if (response) return response;
  const body = await request.json().catch(() => null) as { branchId?: string; radiusMeters?: number } | null;
  if (!body?.branchId || !Number.isInteger(body.radiusMeters) || (body.radiusMeters as number) < 500 || (body.radiusMeters as number) > 30000) {
    return NextResponse.json({ error: "Choose a branch and a radius between 500 and 30000 meters." }, { status: 400 });
  }
  if(mockMode()){const branch=mockState().branches.find(entry=>entry.id===body.branchId);if(!branch)return NextResponse.json({error:"Branch not found."},{status:404});branch.delivery_radius_m=body.radiusMeters;return NextResponse.json({success:true});}
  const supabase = getServiceDatabase();
  if (!supabase) return NextResponse.json({ error: "Admin database is not configured." }, { status: 503 });
  const { data, error } = await supabase.rpc("admin_set_branch_delivery_radius_service", { target_branch: body.branchId, radius_meters: body.radiusMeters });
  if (error || !data) return NextResponse.json({ error: "Unable to update the delivery geofence." }, { status: 500 });
  return NextResponse.json({ success: true });
}
