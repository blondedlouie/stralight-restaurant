import { NextResponse } from "next/server";
import { getServiceDatabase, requireStaffRole } from "@/lib/admin/server";
import {mockMenu,mockMode,mockState} from "@/lib/mock-data";

export async function GET(request: Request) {
  const { context, response } = requireStaffRole(request, ["super_admin", "branch_manager"]);
  if (response) return response;
  if(mockMode()){const s=mockState();return NextResponse.json({branchId:"mock-south-c",items:mockMenu.map(item=>({...item,branch_menu_stock:[{branch_id:"mock-south-c",is_available:s.stock[item.id]??true}]}))});}
  const supabase = getServiceDatabase();
  if (!supabase) return NextResponse.json({ error: "Admin database is not configured." }, { status: 503 });
  let branchId = new URL(request.url).searchParams.get("branchId") || context.branchId;
  if (!branchId && context.sandbox) {
    const { data: branch } = await supabase.from("branches").select("id").eq("is_active", true).order("name").limit(1).maybeSingle();
    branchId = branch?.id || null;
  }
  if (!branchId || (context.role !== "super_admin" && !context.sandbox && branchId !== context.branchId)) return NextResponse.json({ error: "Choose your assigned branch." }, { status: 403 });
  let query = supabase.from("menu_items").select("id,name,category_id,kitchen_dept,is_available,branch_menu_stock(branch_id,is_available)").order("name");
  if (branchId) query = query.eq("branch_menu_stock.branch_id", branchId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Unable to load branch stock." }, { status: 500 });
  return NextResponse.json({ items: data || [], branchId });
}

export async function PATCH(request: Request) {
  const { context, response } = requireStaffRole(request, ["super_admin", "branch_manager"]);
  if (response) return response;
  const body = await request.json().catch(() => null) as { branchId?: string; menuItemId?: string; isAvailable?: boolean } | null;
  if (!body?.branchId || !body.menuItemId || typeof body.isAvailable !== "boolean") return NextResponse.json({ error: "Branch, menu item, and stock state are required." }, { status: 400 });
  if(mockMode()){mockState().stock[body.menuItemId]=body.isAvailable;return NextResponse.json({success:true});}
  if (context.role !== "super_admin" && !context.sandbox && context.branchId !== body.branchId) return NextResponse.json({ error: "Cannot update another branch." }, { status: 403 });
  const supabase = getServiceDatabase();
  if (!supabase) return NextResponse.json({ error: "Admin database is not configured." }, { status: 503 });
  const { error } = await supabase.from("branch_menu_stock").upsert({ branch_id: body.branchId, menu_item_id: body.menuItemId, is_available: body.isAvailable, updated_at: new Date().toISOString() }, { onConflict: "branch_id,menu_item_id" });
  if (error) return NextResponse.json({ error: "Unable to save stock status." }, { status: 500 });
  return NextResponse.json({ success: true });
}
