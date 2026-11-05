import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyPodPayload, type PodPayload } from "@/lib/tracking/pod-signature";
import {mockMode,mockState} from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid QR verification data." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid QR verification data." }, { status: 400 });
  }
  const payload = body as PodPayload;
  if(mockMode()){const order=mockState().orders.find(entry=>entry.id===id);if(!order||!["dispatched","enroute"].includes(order.status))return NextResponse.json({error:"Order is invalid or is not awaiting delivery."},{status:409});order.status="delivered";order.updated_at=new Date().toISOString();return NextResponse.json({success:true,orderId:id,status:"delivered"});}

  if (
    payload.orderId !== id ||
    typeof payload.verificationToken !== "string" ||
    typeof payload.timestamp !== "string" ||
    typeof payload.signature !== "string"
  ) {
    return NextResponse.json({ error: "The QR code does not match this order." }, { status: 400 });
  }

  const signedAt = Date.parse(payload.timestamp);
  if (!Number.isFinite(signedAt) || signedAt > Date.now() + 5 * 60_000) {
    return NextResponse.json({ error: "The QR code timestamp is invalid." }, { status: 400 });
  }

  try {
    if (!verifyPodPayload(payload)) {
      return NextResponse.json({ error: "The QR code signature is invalid." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Delivery verification is not configured." }, { status: 503 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ error: "Order verification is not configured." }, { status: 503 });

  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "delivered", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("pod_token", payload.verificationToken)
    .in("status", ["dispatched", "enroute"])
    .select("id,status")
    .maybeSingle();

  if (error) {
    console.error("PoD order update failed", error.message);
    return NextResponse.json({ error: "Unable to verify delivery." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Order is invalid or is not awaiting delivery." }, { status: 409 });

  return NextResponse.json({ success: true, orderId: data.id, status: data.status });
}
