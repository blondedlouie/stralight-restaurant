import { NextResponse } from "next/server";
import { getServiceDatabase, requireStaffRole } from "@/lib/admin/server";
import {mockMode,mockState} from "@/lib/mock-data";

export async function GET(request: Request) {
  const { context, response } = requireStaffRole(request, ["super_admin", "branch_manager", "dispatch"]);
  if (response) return response;
  if(mockMode())return NextResponse.json({riders:mockState().riders});
  const supabase = getServiceDatabase();
  if (!supabase) return NextResponse.json({ error: "Admin database is not configured." }, { status: 503 });
  let query = supabase.from("delivery_riders").select("id,branch_id,full_name,phone,is_active").eq("is_active", true).order("full_name");
  if (context.role !== "super_admin") {
    if (!context.branchId && !context.sandbox) return NextResponse.json({ error: "Staff account is not assigned to a branch." }, { status: 403 });
    if (context.branchId) query = query.eq("branch_id", context.branchId);
  }
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Unable to load branch riders." }, { status: 500 });
  return NextResponse.json({ riders: data || [] }, { headers: { "Cache-Control": "no-store" } });
}
