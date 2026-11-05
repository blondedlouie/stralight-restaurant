import { NextResponse } from "next/server";
import { getServiceDatabase, requireStaffRole } from "@/lib/admin/server";
import {mockMenu,mockMode,mockState} from "@/lib/mock-data";

export async function GET(request: Request) {
  const { response } = requireStaffRole(request, ["super_admin"]);
  if (response) return response;
  if(mockMode()){const s=mockState();return NextResponse.json({items:mockMenu.map(item=>({...item,base_price:s.prices[item.id]??item.base_price}))});}
  const supabase = getServiceDatabase();
  if (!supabase) return NextResponse.json({ error: "Admin database is not configured." }, { status: 503 });
  const { data, error } = await supabase.from("menu_items").select("id,name,slug,base_price,is_available,kitchen_dept,variants:menu_item_variants(id,variant_name,price_override)").order("name");
  if (error) return NextResponse.json({ error: "Unable to load menu pricing." }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}

export async function PATCH(request: Request) {
  const { response } = requireStaffRole(request, ["super_admin"]);
  if (response) return response;
  const body = await request.json().catch(() => null) as { itemId?: string; variantId?: string; price?: number; isAvailable?: boolean } | null;
  if (!body?.itemId || (body.price === undefined && body.isAvailable === undefined)) return NextResponse.json({ error: "Menu item and a price or availability change are required." }, { status: 400 });
  if(mockMode()){const s=mockState();if(body.price!==undefined)s.prices[body.itemId]=body.price;if(body.isAvailable!==undefined){const item=mockMenu.find(entry=>entry.id===body.itemId);if(item)item.is_available=body.isAvailable;}return NextResponse.json({success:true});}
  if (body.price !== undefined && (!Number.isFinite(body.price) || body.price <= 0)) return NextResponse.json({ error: "Price must be a positive amount." }, { status: 400 });
  const supabase = getServiceDatabase();
  if (!supabase) return NextResponse.json({ error: "Admin database is not configured." }, { status: 503 });
  const update = body.price !== undefined ? { [body.variantId ? "price_override" : "base_price"]: body.price } : { is_available: body.isAvailable };
  const table = body.variantId ? "menu_item_variants" : "menu_items";
  const id = body.variantId || body.itemId;
  const { error } = await supabase.from(table).update(update).eq("id", id);
  if (error) return NextResponse.json({ error: "Unable to save menu change." }, { status: 500 });
  return NextResponse.json({ success: true });
}
