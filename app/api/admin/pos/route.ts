import { NextResponse } from "next/server";
import { getServiceDatabase, requireStaffRole } from "@/lib/admin/server";
import {createMockPosOrder,mockMenu,mockMode,mockState} from "@/lib/mock-data";

export async function GET(request: Request) {
  const { context, response } = requireStaffRole(request, ["super_admin", "branch_manager", "pos"]);
  if (response) return response;
  if(mockMode())return NextResponse.json({branches:mockState().branches,items:mockMenu});
  const supabase = getServiceDatabase();
  if (!supabase) return NextResponse.json({ error: "POS database is not configured." }, { status: 503 });
  if (context.role !== "super_admin" && !context.branchId && !context.sandbox) return NextResponse.json({ error: "POS account is not assigned to a branch." }, { status: 403 });
  let branches = supabase.from("branches").select("id,name").eq("is_active", true).order("name");
  let menu: any = supabase.from("menu_items").select("id,name,base_price,kitchen_dept,variants:menu_item_variants(id,variant_name,price_override)").eq("is_available", true).order("name");
  if (context.role !== "super_admin" && context.branchId) {
    branches = branches.eq("id", context.branchId);
    menu = supabase.from("menu_items").select("id,name,base_price,kitchen_dept,variants:menu_item_variants(id,variant_name,price_override),stock:branch_menu_stock!inner(is_available)").eq("is_available", true).eq("stock.branch_id", context.branchId).eq("stock.is_available", true).order("name");
  }
  const [branchResult, menuResult] = await Promise.all([branches, menu]);
  if (branchResult.error || menuResult.error) return NextResponse.json({ error: "Unable to load POS catalogue." }, { status: 500 });
  return NextResponse.json({ branches: branchResult.data || [], items: menuResult.data || [] });
}

export async function POST(request: Request) {
  const { context, response } = requireStaffRole(request, ["super_admin", "branch_manager", "pos"]);
  if (response) return response;
  const body = await request.json().catch(() => null) as { branchId?: string; customerName?: string; phone?: string; orderType?: "delivery" | "pickup"; estate?: string; items?: { menuItemId: string; variantId?: string; quantity: number }[] } | null;
  if (!body?.branchId || !body.customerName?.trim() || !body.phone?.trim() || !body.items?.length || !["delivery", "pickup"].includes(body.orderType || "")) return NextResponse.json({ error: "Customer, phone, branch, fulfillment and items are required." }, { status: 400 });
  if (context.role !== "super_admin" && !context.sandbox && (!context.branchId || context.branchId !== body.branchId)) return NextResponse.json({ error: "Choose your assigned branch." }, { status: 403 });
  if (body.items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50)) return NextResponse.json({ error: "Item quantities must be between 1 and 50." }, { status: 400 });
  if(mockMode()){if(body.items.some(item=>!mockMenu.some(menu=>menu.id===item.menuItemId)))return NextResponse.json({error:"One or more selected menu items are unavailable."},{status:409});const order=createMockPosOrder({branchId:body.branchId,customerName:body.customerName.trim(),phone:body.phone.trim(),estate:body.estate,orderType:body.orderType as "delivery"|"pickup",items:body.items});return NextResponse.json({success:true,orderId:order.id,amount:order.total_amount},{status:201});}
  const supabase = getServiceDatabase();
  if (!supabase) return NextResponse.json({ error: "POS database is not configured." }, { status: 503 });
  const menuIds = Array.from(new Set(body.items.map((item) => item.menuItemId)));
  const { data: menuItems, error: menuError } = await supabase.from("menu_items").select("id,name,base_price,kitchen_dept,variants:menu_item_variants(id,variant_name,price_override)").in("id", menuIds).eq("is_available", true);
  if (menuError || menuItems?.length !== menuIds.length) return NextResponse.json({ error: "One or more selected menu items are unavailable." }, { status: 409 });
  const selected = body.items.map((choice) => {
    const item = menuItems.find((candidate) => candidate.id === choice.menuItemId)!;
    const variant = (item.variants as { id: string; variant_name: string; price_override: number }[] | null)?.find((candidate) => candidate.id === choice.variantId);
    if (choice.variantId && !variant) return null;
    return { order_id: "", menu_item_id: item.id, item_name: item.name, variant_name: variant?.variant_name || null, quantity: choice.quantity, unit_price: Number(variant?.price_override ?? item.base_price), total_price: Number(variant?.price_override ?? item.base_price) * choice.quantity, kitchen_dept: item.kitchen_dept };
  });
  if (selected.some((item) => item === null)) return NextResponse.json({ error: "A selected menu size is no longer available." }, { status: 409 });
  const validSelected = selected.filter((item) => item !== null);
  const subtotal = validSelected.reduce((sum, item) => sum + item.total_price, 0);
  const orderId = `SL-${Date.now().toString().slice(-8)}`;
  const { error: orderError } = await supabase.from("orders").insert({ id: orderId, branch_id: body.branchId, customer_name: body.customerName.trim(), customer_phone: body.phone.trim(), order_type: body.orderType, status: "placed", payment_status: "pending", preferred_date: new Date().toISOString().slice(0, 10), preferred_time: "As soon as possible", search_estate: body.estate?.trim() || null, subtotal, delivery_fee: body.orderType === "delivery" ? 150 : 0, total_amount: subtotal + (body.orderType === "delivery" ? 150 : 0) });
  if (orderError) return NextResponse.json({ error: "Unable to create POS order." }, { status: 500 });
  const { error: itemError } = await supabase.from("order_items").insert(validSelected.map((item) => ({ ...item, order_id: orderId })));
  if (itemError) { await supabase.from("orders").delete().eq("id", orderId); return NextResponse.json({ error: "Unable to save POS items." }, { status: 500 }); }
  if (body.orderType === "delivery") await supabase.from("order_deliveries").insert({ order_id: orderId, provider: "in_house" });
  return NextResponse.json({ success: true, orderId, amount: subtotal + (body.orderType === "delivery" ? 150 : 0) }, { status: 201 });
}
