import { NextResponse } from "next/server";
import { getServiceDatabase, requireStaffRole } from "@/lib/admin/server";
import {mockMode,mockState} from "@/lib/mock-data";

type Provider = "glovo" | "uber_direct";
let uberToken: { value: string; expiresAt: number } | null = null;

function e164(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `+254${digits.slice(1)}`;
  if (digits.startsWith("254")) return `+${digits}`;
  return `+${digits}`;
}

async function getUberToken() {
  const clientId = process.env.UBER_DIRECT_CLIENT_ID;
  const clientSecret = process.env.UBER_DIRECT_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Uber Direct credentials are not configured.");
  if (uberToken && uberToken.expiresAt > Date.now() + 60_000) return uberToken.value;
  const response = await fetch("https://auth.uber.com/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials", scope: "eats.deliveries" }),
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) throw new Error("Uber Direct authentication failed.");
  uberToken = { value: result.access_token, expiresAt: Date.now() + Number(result.expires_in || 3600) * 1000 };
  return uberToken.value;
}

async function requestUberDelivery(order: any, branch: any, items: any[]) {
  const customerId = process.env.UBER_DIRECT_CUSTOMER_ID;
  if (!customerId) throw new Error("Uber Direct customer ID is not configured.");
  const token = await getUberToken();
  const base = (process.env.UBER_DIRECT_API_BASE_URL || "https://api.uber.com").replace(/\/$/, "");
  const pickupAddress = JSON.stringify({ street_address: [branch.address_description, ""], state: branch.region, city: branch.region, zip_code: "00100", country: "KE" });
  const destination = [order.building_name, order.specific_landmark, order.search_estate, "Kenya"].filter(Boolean).join(", ");
  const dropoffAddress = JSON.stringify({ street_address: [destination, ""], state: branch.region, city: branch.region, zip_code: "00100", country: "KE" });
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const quoteResponse = await fetch(`${base}/v1/customers/${encodeURIComponent(customerId)}/delivery_quotes`, {
    method: "POST", headers, cache: "no-store",
    body: JSON.stringify({ pickup_address: pickupAddress, dropoff_address: dropoffAddress, pickup_latitude: branch.latitude, pickup_longitude: branch.longitude, dropoff_latitude: order.delivery_latitude, dropoff_longitude: order.delivery_longitude }),
  });
  const quote = await quoteResponse.json();
  if (!quoteResponse.ok || !quote.id) throw new Error(quote.message || "Uber Direct could not quote this delivery.");

  const deliveryResponse = await fetch(`${base}/v1/customers/${encodeURIComponent(customerId)}/deliveries`, {
    method: "POST", headers, cache: "no-store",
    body: JSON.stringify({
      quote_id: quote.id,
      pickup_address: pickupAddress,
      pickup_name: branch.name,
      pickup_phone_number: e164(branch.phone_primary),
      pickup_latitude: branch.latitude,
      pickup_longitude: branch.longitude,
      dropoff_address: dropoffAddress,
      dropoff_name: order.customer_name,
      dropoff_phone_number: e164(order.customer_phone),
      dropoff_latitude: order.delivery_latitude,
      dropoff_longitude: order.delivery_longitude,
      manifest_items: items.map((item) => ({ name: item.item_name, quantity: item.quantity, size: "small" })),
      external_id: order.id,
      dropoff_notes: [order.specific_landmark, order.building_name].filter(Boolean).join(", "),
    }),
  });
  const delivery = await deliveryResponse.json();
  if (!deliveryResponse.ok || !delivery.id) throw new Error(delivery.message || "Uber Direct could not create this delivery.");
  return { reference: delivery.id, trackingUrl: delivery.tracking_url || null, eta: quote.duration || null };
}

async function requestGlovoDelivery(order: any, branch: any) {
  const clientId = process.env.GLOVO_CLIENT_ID;
  const clientSecret = process.env.GLOVO_CLIENT_SECRET;
  if (!clientId || !clientSecret || !branch.glovo_address_book_id) throw new Error("Glovo credentials and this branch’s pickup address-book ID are required.");
  const base = process.env.GLOVO_ENVIRONMENT === "stage" ? "https://ondemand-stageapi.glovoapp.com" : "https://ondemand-api.glovoapp.com";
  const authResponse = await fetch(`${base}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "glovo-app-type": "b2b" },
    body: JSON.stringify({ grantType: "client_credentials", clientId, clientSecret }),
    cache: "no-store",
  });
  const auth = await authResponse.json();
  if (!authResponse.ok || !auth.accessToken) throw new Error("Glovo authentication failed.");
  const headers = { Authorization: `Bearer ${auth.accessToken}`, "Content-Type": "application/json" };
  const destination = [order.building_name, order.specific_landmark, order.search_estate, "Kenya"].filter(Boolean).join(", ");
  const deliveryAddress = { rawAddress: destination, addressDetails: [order.building_name, order.specific_landmark].filter(Boolean).join(", "), coordinates: { latitude: order.delivery_latitude, longitude: order.delivery_longitude } };
  const quoteResponse = await fetch(`${base}/v2/laas/quotes`, {
    method: "POST", headers, cache: "no-store",
    body: JSON.stringify({ pickupDetails: { addressBook: branch.glovo_address_book_id }, deliveryAddress }),
  });
  const quote = await quoteResponse.json();
  const quoteId = quote.quoteId || quote.id;
  if (!quoteResponse.ok || !quoteId) throw new Error(quote.message || "Glovo could not quote this delivery.");

  const parcelResponse = await fetch(`${base}/v2/laas/quotes/${encodeURIComponent(quoteId)}/parcels`, {
    method: "POST", headers, cache: "no-store",
    body: JSON.stringify({
      contact: { name: order.customer_name, phoneNumber: e164(order.customer_phone) },
      pickupOrderCode: order.id,
      deliveryAddress,
      externalDetails: { orderId: order.id, items: order.items?.map((item: any) => ({ name: item.item_name, quantity: item.quantity })) || [] },
    }),
  });
  const parcel = await parcelResponse.json();
  const reference = parcel.trackingNumber || parcel.trackingId || parcel.id;
  if (!parcelResponse.ok || !reference) throw new Error(parcel.message || "Glovo could not create this delivery.");
  return { reference: String(reference), trackingUrl: parcel.trackingLink || null, eta: null };
}

export async function POST(request: Request) {
  const { context, response } = requireStaffRole(request, ["super_admin", "branch_manager", "dispatch"]);
  if (response) return response;
  const body = await request.json().catch(() => null) as { orderId?: string; provider?: Provider } | null;
  if (!body?.orderId || !["glovo", "uber_direct"].includes(body.provider || "")) return NextResponse.json({ error: "Order and courier provider are required." }, { status: 400 });
  if(mockMode()){const order=mockState().orders.find(entry=>entry.id===body.orderId);if(!order)return NextResponse.json({error:"Order not found."},{status:404});const provider=body.provider==="glovo"?"Glovo On-Demand":"Uber Direct";order.delivery={...order.delivery,provider:body.provider,courier_name:provider,courier_reference:`MOCK-${body.provider}-${order.id}`,tracking_url:`/track/${order.id}`};order.status="dispatched";order.updated_at=new Date().toISOString();return NextResponse.json({success:true,provider,reference:order.delivery.courier_reference,trackingUrl:order.delivery.tracking_url});}
  const supabase = getServiceDatabase();
  if (!supabase) return NextResponse.json({ error: "Admin database is not configured." }, { status: 503 });

  const { data: order, error } = await supabase.from("orders")
    .select("id,branch_id,status,order_type,payment_status,customer_name,customer_phone,search_estate,specific_landmark,building_name,delivery_latitude,delivery_longitude,subtotal,branch:branches(id,name,region,address_description,phone_primary,latitude,longitude,glovo_address_book_id),items:order_items(item_name,quantity)")
    .eq("id", body.orderId).maybeSingle();
  if (error || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (context.role !== "super_admin" && !context.sandbox && (!context.branchId || order.branch_id !== context.branchId)) return NextResponse.json({ error: "Order belongs to another branch or your account has no assigned branch." }, { status: 403 });
  if (order.order_type !== "delivery" || order.payment_status !== "paid") return NextResponse.json({ error: "Only paid delivery orders can be outsourced." }, { status: 409 });
  if (order.delivery_latitude === null || order.delivery_longitude === null || !order.branch) return NextResponse.json({ error: "This order needs a GPS delivery address and an assigned branch before outsourcing." }, { status: 422 });

  try {
    const result = body.provider === "uber_direct"
      ? await requestUberDelivery(order, order.branch, order.items || [])
      : await requestGlovoDelivery(order, order.branch);
    const providerName = body.provider === "uber_direct" ? "Uber Direct" : "Glovo On-Demand";
    const { error: saveError } = await supabase.from("order_deliveries").upsert({
      order_id: order.id,
      provider: body.provider,
      rider_id: null,
      rider_name: null,
      rider_phone: null,
      courier_name: providerName,
      courier_reference: result.reference,
      tracking_url: result.trackingUrl,
      eta_minutes: result.eta,
      updated_at: new Date().toISOString(),
    }, { onConflict: "order_id" });
    if (saveError) throw new Error("Courier accepted the trip, but Starlight could not save its reference. Contact dispatch support.");
    await supabase.from("orders").update({ status: "dispatched", updated_at: new Date().toISOString() }).eq("id", order.id);
    return NextResponse.json({ success: true, provider: providerName, reference: result.reference, trackingUrl: result.trackingUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The courier request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
