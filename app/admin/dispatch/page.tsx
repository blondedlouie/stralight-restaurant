"use client";

import { useCallback, useEffect, useState } from "react";
import { Bike, LoaderCircle, MapPin, PackageCheck, PhoneCall, Truck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { StockControls } from "@/components/admin/StockControls";

type DispatchOrder = {
  id: string; branch_id: string | null; status: string; order_type: string; payment_status: string; customer_name: string; customer_phone: string;
  search_estate: string | null; specific_landmark: string | null; building_name: string | null; delivery_latitude: number | null; delivery_longitude: number | null;
  total_amount: number; branch: { name: string; address_description: string } | null;
  items: { item_name: string; variant_name: string | null; quantity: number }[];
  delivery: { rider_id: string | null; courier_name: string | null; courier_reference: string | null } | null;
};
type Rider = { id: string; branch_id: string; full_name: string; phone: string };

export default function DispatchHubPage() {
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const [orderResponse, riderResponse] = await Promise.all([
      fetch("/api/admin/orders?status=ready&status=kitchen&status=dispatched", { cache: "no-store" }),
      fetch("/api/admin/riders", { cache: "no-store" }),
    ]);
    const orderData = await orderResponse.json().catch(() => ({}));
    const riderData = await riderResponse.json().catch(() => ({}));
    if (orderResponse.ok) setOrders(orderData.orders || []);
    if (riderResponse.ok) setRiders(riderData.riders || []);
    else if (!riderResponse.ok) setNotice(riderData.error || "Unable to load riders.");
  }, []);

  useEffect(() => {
    void load();
    if(process.env.NEXT_PUBLIC_USE_MOCK_DATA==="true"){const timer=window.setInterval(()=>{void load();},1500);return()=>window.clearInterval(timer);}
    const channel = supabase.channel("dispatch-live-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_deliveries" }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  async function action(order: DispatchOrder, body: Record<string, string>) {
    setBusy(order.id);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(order.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update dispatch.");
      await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not update dispatch."); }
    finally { setBusy(""); }
  }

  async function outsource(order: DispatchOrder, provider: "glovo" | "uber_direct") {
    setBusy(order.id);
    setNotice("");
    try {
      const response = await fetch("/api/admin/dispatch/outsource", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: order.id, provider }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Courier fallback failed.");
      setNotice(`${result.provider} accepted order ${order.id}.`);
      await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Courier fallback failed."); }
    finally { setBusy(""); }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-accent">Branch operations</p><h1 className="mt-1 font-display text-3xl text-purple-950 sm:text-4xl">Dispatch hub</h1><p className="mt-1 text-sm text-brand-textMuted">Assign an in-house rider or send a paid delivery to a courier partner.</p></div><div className="rounded-2xl border border-purple-950/10 bg-white/80 px-4 py-3 shadow-sm"><p className="text-[10px] font-bold uppercase text-brand-textMuted">Open deliveries</p><p className="text-2xl font-black text-purple-950">{orders.length}</p></div></header>
      {notice && <p role="status" className="mb-5 rounded-xl border border-purple-950/10 bg-white/80 p-3 text-sm font-semibold text-purple-950 shadow-sm">{notice}</p>}
      <StockControls />
      {orders.length === 0 ? <section className="rounded-3xl border border-purple-950/10 bg-white/80 p-10 text-center shadow-sm"><PackageCheck className="mx-auto h-9 w-9 text-brand-accent" /><h2 className="mt-3 font-bold text-purple-950">No orders waiting for dispatch</h2><p className="mt-1 text-sm text-brand-textMuted">Kitchen-ready orders will appear here.</p></section> : <section className="grid gap-5 xl:grid-cols-2">
        {orders.map((order) => <article key={order.id} className="rounded-2xl border border-purple-950/10 bg-white/85 p-5 shadow-sm backdrop-blur-xl">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-widest text-brand-accent">{order.branch?.name || "Unassigned branch"} · {order.order_type}</p><h2 className="mt-1 text-xl font-black text-purple-950">{order.id}</h2></div><span className="rounded-full bg-yellow-100 px-3 py-1.5 text-[10px] font-extrabold uppercase text-yellow-900">{order.status}</span></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50/80 p-4"><p className="font-bold text-purple-950">{order.customer_name}</p><a href={`tel:${order.customer_phone}`} className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-accent"><PhoneCall className="h-3.5 w-3.5" />{order.customer_phone}</a><p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-brand-textMuted"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{[order.building_name, order.specific_landmark, order.search_estate].filter(Boolean).join(", ") || "Pickup or delivery address not provided"}</p></div>
            <ul className="space-y-2 rounded-xl border border-purple-950/10 p-4 text-xs">{order.items.map((item, index) => <li key={`${item.item_name}-${index}`} className="flex justify-between gap-2"><span className="font-semibold text-purple-950">{item.quantity} × {item.item_name}{item.variant_name ? `, ${item.variant_name}` : ""}</span></li>)}<li className="border-t border-purple-950/10 pt-2 font-extrabold text-purple-950">{Number(order.total_amount).toLocaleString()} KES · {order.payment_status}</li></ul>
          </div>
          {order.delivery?.courier_name && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">{order.delivery.courier_name} · {order.delivery.courier_reference}</p>}
          <div className="mt-4 border-t border-purple-950/10 pt-4">
            <label className="mb-2 block text-xs font-bold text-purple-950" htmlFor={`rider-${order.id}`}>Assign in-house rider</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select id={`rider-${order.id}`} value={selections[order.id] || order.delivery?.rider_id || ""} onChange={(event) => setSelections((current) => ({ ...current, [order.id]: event.target.value }))} className="min-h-11 min-w-0 flex-1 rounded-xl border border-purple-950/15 bg-white px-3 text-sm text-purple-950"><option value="">Select active rider</option>{riders.filter((rider) => !order.branch_id || rider.branch_id === order.branch_id).map((rider) => <option key={rider.id} value={rider.id}>{rider.full_name} · {rider.phone}</option>)}</select>
              <button type="button" disabled={!selections[order.id] || busy === order.id} onClick={() => void action(order, { riderId: selections[order.id] })} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 text-xs font-extrabold text-purple-950 disabled:opacity-50">{busy === order.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Bike className="h-4 w-4" />}Assign rider</button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" disabled={busy === order.id || order.payment_status !== "paid"} onClick={() => void outsource(order, "glovo")} className="min-h-11 rounded-xl border border-purple-950/10 bg-white px-3 text-xs font-extrabold text-purple-950 hover:bg-slate-50 disabled:opacity-50">Glovo fallback</button>
              <button type="button" disabled={busy === order.id || order.payment_status !== "paid"} onClick={() => void outsource(order, "uber_direct")} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-purple-950/10 bg-white px-3 text-xs font-extrabold text-purple-950 hover:bg-slate-50 disabled:opacity-50"><Truck className="h-4 w-4" />Uber Direct</button>
            </div>
            {order.payment_status !== "paid" && <p className="mt-2 text-[10px] font-semibold text-brand-textMuted">Courier partners require a paid delivery order.</p>}
          </div>
        </article>)}
      </section>}
    </main>
  );
}
