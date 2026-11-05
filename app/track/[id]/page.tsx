"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Bike, CheckCircle2, ChefHat, Clock, CreditCard, FileText, MapPin, PhoneCall, QrCode, RefreshCw } from "lucide-react";
import { OrderStatusTracker } from "@/components/tracking/OrderStatusTracker";

type OrderItem = { id: string; item_name: string; variant_name: string | null; quantity: number; unit_price: number; total_price: number };
type TrackingOrder = {
  id: string;
  status: "placed" | "kitchen" | "ready" | "dispatched" | "enroute" | "delivered" | "cancelled";
  order_type: "delivery" | "pickup";
  payment_status: "pending" | "processing" | "paid" | "failed";
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
  preferred_date: string;
  preferred_time: string;
  estimatedArrivalAt: string | null;
  estimatedDurationMinutes: number;
  podQrPayload: string | null;
  branch: { id: string; name: string; address_description: string; phone_primary: string; phone_chicken: string | null; phone_pizza: string | null } | null;
  items: OrderItem[];
  delivery: { provider: string; rider_name: string | null; rider_phone: string | null; courier_name: string | null; courier_reference: string | null; tracking_url: string | null; eta_minutes: number | null } | null;
};

const statusMessages: Record<TrackingOrder["status"], { title: string; description: string; Icon: typeof FileText }> = {
  placed: { title: "Order received", description: "Your order has been received and is waiting for the kitchen.", Icon: FileText },
  kitchen: { title: "Being prepared", description: "Your order is currently being prepared at the assigned kitchen.", Icon: ChefHat },
  ready: { title: "Ready for dispatch", description: "Your order is packed and waiting for a rider.", Icon: ChefHat },
  dispatched: { title: "Rider dispatched", description: "Your order has left the kitchen with a Starlight rider.", Icon: Bike },
  enroute: { title: "On the way", description: "Your rider is on the way with your order.", Icon: Bike },
  delivered: { title: "Order delivered", description: "Your order has been handed over. Enjoy your meal.", Icon: CheckCircle2 },
  cancelled: { title: "Order cancelled", description: "This order was cancelled. Contact the branch if you need help.", Icon: FileText },
};

function money(value: number) {
  return `KES ${Number(value || 0).toLocaleString()}`;
}

export default function TrackingPage() {
  const params = useParams<{ id: string }>();
  const orderId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/track/${encodeURIComponent(orderId)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We couldn’t load this order.");
      setOrder(result.order as TrackingOrder);
      try {
        const saved: unknown = JSON.parse(localStorage.getItem("starlight-recent-orders") || "[]");
        const previous = Array.isArray(saved) ? saved.filter((value): value is string => typeof value === "string") : [];
        localStorage.setItem("starlight-recent-orders", JSON.stringify([orderId, ...previous.filter((recentId) => recentId !== orderId)].slice(0, 5)));
      } catch {
        // Tracking still works when browser storage is unavailable.
      }
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "We couldn’t load this order.");
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [loadOrder]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "true") return;
    const timer = window.setInterval(() => { void loadOrder(); }, 1500);
    setRealtimeConnected(true);
    return () => { window.clearInterval(timer); setRealtimeConnected(false); };
  }, [loadOrder]);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" || !supabaseUrl || !anonKey) return;

    type SupabaseClient = typeof import("@/lib/supabase/client").supabase;
    let client: SupabaseClient | undefined;
    let channel: ReturnType<SupabaseClient["channel"]> | undefined;
    let cancelled = false;

    void import("@/lib/supabase/client").then(({ supabase }) => {
      if (cancelled) return;
      client = supabase;
      channel = client
        .channel(`track-order-${orderId}`)
        .on("postgres_changes", {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        }, () => { void loadOrder(); })
        .subscribe((status) => setRealtimeConnected(status === "SUBSCRIBED"));
    });

    return () => {
      cancelled = true;
      setRealtimeConnected(false);
      if (client && channel) void client.removeChannel(channel);
    };
  }, [orderId, loadOrder]);

  const etaMinutes = useMemo(() => {
    if (!order?.estimatedArrivalAt) return null;
    return Math.max(0, Math.ceil((new Date(order.estimatedArrivalAt).getTime() - now) / 60_000));
  }, [order?.estimatedArrivalAt, now]);

  if (!order && !error) {
    return <main className="flex min-h-[70dvh] items-center justify-center bg-white px-4"><div className="flex items-center gap-3 text-sm font-semibold text-brand-textMuted"><RefreshCw className="h-5 w-5 animate-spin text-brand-accent" /> Loading your order…</div></main>;
  }

  if (!order) {
    return (
      <main className="flex min-h-[70dvh] items-center justify-center bg-white px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-purple-950/10 bg-white/80 p-7 text-center shadow-sm backdrop-blur-xl">
          <h1 className="font-display text-2xl text-purple-950">Order not found</h1>
          <p role="alert" className="mt-2 text-sm text-brand-textMuted">{error}</p>
          <Link href="/track" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-yellow-400 px-5 text-sm font-extrabold text-purple-950">Try another order ID</Link>
        </div>
      </main>
    );
  }

  const currentStatus = statusMessages[order.status] || statusMessages.placed;
  const StatusIcon = currentStatus.Icon;
  const isInDelivery = order.status === "dispatched" || order.status === "enroute";
  const branchPhone = order.branch?.phone_primary || order.branch?.phone_chicken;

  return (
    <main className="min-h-screen bg-white px-4 pb-24 pt-8 sm:pt-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-accent">Live order tracking</p>
            <h1 className="mt-1 font-display text-3xl text-purple-950 sm:text-4xl">Order {order.id}</h1>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-purple-950/10 bg-white/80 px-3 py-2 text-xs font-semibold text-brand-textMuted shadow-sm backdrop-blur-xl">
            <span className={`h-2 w-2 rounded-full ${realtimeConnected ? "animate-pulse bg-emerald-500" : "bg-slate-300"}`} />
            {realtimeConnected ? "Live updates on" : "Connecting to live updates"}
          </span>
        </header>

        <section className="mb-5 rounded-3xl border border-purple-950/10 bg-yellow-400/15 p-5 shadow-sm backdrop-blur-xl sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-yellow-400 text-purple-950"><StatusIcon className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-extrabold text-purple-950">{currentStatus.title}</h2>
              <p className="mt-1 text-sm leading-6 text-purple-950/75">{order.branch ? currentStatus.description.replace("assigned kitchen", `${order.branch.name} kitchen`) : currentStatus.description}</p>
            </div>
            {etaMinutes !== null && order.status !== "delivered" && order.status !== "cancelled" && (
              <div className="hidden shrink-0 text-right sm:block">
                <p className="flex items-center justify-end gap-1 text-xs font-bold text-purple-950"><Clock className="h-4 w-4" /> Estimated arrival</p>
                <p className="mt-1 text-xl font-black text-purple-950">{etaMinutes === 0 ? "Arriving now" : `${etaMinutes} min`}</p>
              </div>
            )}
          </div>
          {etaMinutes !== null && order.status !== "delivered" && order.status !== "cancelled" && <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-purple-950 sm:hidden"><Clock className="h-4 w-4" /> ETA: {etaMinutes === 0 ? "Arriving now" : `${etaMinutes} minutes`}</p>}
          {order.status === "cancelled" && <p className="mt-3 text-xs font-bold text-rose-700">This order will not continue through the delivery stages.</p>}
        </section>

        <div className="mb-5">
          <OrderStatusTracker status={order.status} />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <div className="space-y-5">
            {isInDelivery && order.podQrPayload && (
              <section className="rounded-3xl border border-purple-950/10 bg-white/80 p-5 text-center shadow-sm backdrop-blur-xl sm:p-6">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400 text-purple-950"><QrCode className="h-6 w-6" /></div>
                <h2 className="text-lg font-extrabold text-purple-950">Proof of Delivery</h2>
                <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-brand-textMuted">Present this QR code to your Starlight rider upon arrival to confirm handover.</p>
                <div className="mx-auto mt-5 inline-block rounded-2xl border border-purple-950/10 bg-white p-3 shadow-sm">
                  <QRCodeSVG value={order.podQrPayload} size={208} level="M" includeMargin />
                </div>
              </section>
            )}

            <details className="group rounded-3xl border border-purple-950/10 bg-white/80 shadow-sm backdrop-blur-xl" open>
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-5 py-4 [&::-webkit-details-marker]:hidden">
                <span className="font-extrabold text-purple-950">Order summary</span>
                <span className="text-sm font-black text-brand-accent">{money(order.total_amount)}</span>
              </summary>
              <div className="border-t border-purple-950/10 px-5 py-4">
                <ul className="space-y-3">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-4 text-sm">
                      <div><p className="font-semibold text-purple-950">{item.quantity} × {item.item_name}</p>{item.variant_name && <p className="mt-0.5 text-xs text-brand-textMuted">{item.variant_name}</p>}</div>
                      <span className="shrink-0 font-semibold text-purple-950">{money(item.total_price)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 space-y-2 border-t border-purple-950/10 pt-3 text-sm">
                  <div className="flex justify-between text-brand-textMuted"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
                  <div className="flex justify-between text-brand-textMuted"><span>Delivery fee</span><span>{money(order.delivery_fee)}</span></div>
                  <div className="flex items-center justify-between border-t border-purple-950/10 pt-3 font-extrabold text-purple-950"><span>Total</span><span>{money(order.total_amount)}</span></div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50/80 p-3">
                  <span className="flex items-center gap-2 text-xs font-bold text-purple-950"><CreditCard className="h-4 w-4 text-brand-accent" /> M-PESA payment</span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${order.payment_status === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-yellow-100 text-yellow-900"}`}>
                    {order.payment_status === "paid" ? "Paid" : order.payment_status}
                  </span>
                </div>
              </div>
            </details>
          </div>

          <aside className="h-fit rounded-3xl border border-purple-950/10 bg-white/80 p-5 shadow-sm backdrop-blur-xl">
            <h2 className="mb-4 text-lg font-extrabold text-purple-950">Fulfillment & contacts</h2>
            <div className="rounded-2xl bg-slate-50/80 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-accent">{order.order_type === "delivery" ? "Delivery" : "Pickup"}</p>
              <p className="mt-1 font-bold text-purple-950">{order.branch?.name || "Branch assignment pending"}</p>
              {order.branch?.address_description && <p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-brand-textMuted"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{order.branch.address_description}</p>}
            </div>

            {order.order_type === "delivery" && (
              <div className="mt-4 border-t border-purple-950/10 pt-4">
                <p className="text-xs font-extrabold text-purple-950">Rider details</p>
                {order.delivery?.rider_name || order.delivery?.courier_name ? (
                  <div className="mt-2 space-y-1 text-sm text-brand-textMuted">
                    {order.delivery.rider_name && <p>{order.delivery.rider_name}</p>}
                    {order.delivery.rider_phone && <a className="inline-flex items-center gap-1.5 font-bold text-brand-accent" href={`tel:${order.delivery.rider_phone}`}><PhoneCall className="h-4 w-4" /> Call rider</a>}
                    {order.delivery.courier_name && <p>{order.delivery.courier_name}{order.delivery.courier_reference ? ` · ${order.delivery.courier_reference}` : ""}</p>}
                    {order.delivery.tracking_url && <a href={order.delivery.tracking_url} target="_blank" rel="noreferrer" className="inline-block font-bold text-brand-accent underline">View courier tracking</a>}
                  </div>
                ) : <p className="mt-2 text-xs leading-5 text-brand-textMuted">Rider information will appear here once your order is dispatched.</p>}
              </div>
            )}

            {branchPhone && <a href={`tel:${branchPhone}`} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 text-sm font-extrabold text-purple-950 transition hover:bg-yellow-500"><PhoneCall className="h-4 w-4" /> Call branch dispatch</a>}
            {order.order_type === "pickup" && <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-brand-textMuted"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" />We’ll update this page when your pickup order is ready.</p>}
          </aside>
        </div>
      </div>
    </main>
  );
}
