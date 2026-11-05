"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bike, ChefHat, Clock, FileText, LoaderCircle, PhoneCall } from "lucide-react";

type Station = "chicken" | "pizza";
type KitchenOrder = {
  id: string;
  status: "placed" | "kitchen" | "ready";
  customer_name: string;
  customer_phone: string;
  order_type: "delivery" | "pickup";
  created_at: string;
  updated_at: string;
  items: { item_name: string; variant_name: string | null; quantity: number; kitchen_dept: string }[];
};

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [station, setStation] = useState<Station>("chicken");
  const [loading, setLoading] = useState(true);
  const [busyOrder, setBusyOrder] = useState("");
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(Date.now());

  const loadOrders = useCallback(async () => {
    const response=await fetch("/api/admin/orders?status=placed&status=kitchen&status=ready",{cache:"no-store"});
    const body=await response.json();if(response.ok)setOrders(body.orders||[]);else setNotice(body.error||"Unable to load kitchen queue.");
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadOrders();
    const clock = window.setInterval(() => setNow(Date.now()), 30_000);
    const refresh=window.setInterval(()=>{void loadOrders();},process.env.NEXT_PUBLIC_USE_MOCK_DATA==="true"?1500:30000);
    return () => { window.clearInterval(clock);window.clearInterval(refresh); };
  }, [loadOrders]);

  const visibleOrders = useMemo(() => orders.filter((order) => order.items?.some((item) => item.kitchen_dept === station || item.kitchen_dept === "general")), [orders, station]);

  async function advance(order: KitchenOrder) {
    const nextStatus = order.status === "placed" ? "kitchen" : "ready";
    setBusyOrder(order.id);
    setNotice("");
    const response=await fetch(`/api/admin/orders/${order.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:nextStatus})});const body=await response.json();if(!response.ok)setNotice(body.error||"Unable to update order.");else await loadOrders();
    setBusyOrder("");
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-accent">Live kitchen display</p><h1 className="mt-1 font-display text-3xl text-purple-950 sm:text-4xl">Production queue</h1><p className="mt-1 text-sm text-brand-textMuted">Orders update live as the branch team moves them through prep.</p></div>
        <div className="rounded-2xl border border-purple-950/10 bg-white/80 px-4 py-3 text-right shadow-sm backdrop-blur-xl"><p className="text-[10px] font-bold uppercase text-brand-textMuted">Active tickets</p><p className="text-2xl font-black text-purple-950">{visibleOrders.length}</p></div>
      </header>

      <div className="mb-5 flex gap-2" role="tablist" aria-label="Kitchen station">
        {(["chicken", "pizza"] as Station[]).map((value) => <button key={value} type="button" role="tab" aria-selected={station === value} onClick={() => setStation(value)} className={`min-h-11 rounded-xl px-5 text-sm font-extrabold capitalize ${station === value ? "bg-yellow-400 text-purple-950" : "border border-purple-950/10 bg-white text-purple-950"}`}>{value} station</button>)}
      </div>
      {notice && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{notice}</p>}

      {loading ? <div className="flex min-h-48 items-center justify-center text-sm text-brand-textMuted"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" />Loading kitchen queue</div> : visibleOrders.length === 0 ? (
        <div className="rounded-3xl border border-purple-950/10 bg-white/80 p-10 text-center shadow-sm"><ChefHat className="mx-auto h-9 w-9 text-brand-accent" /><p className="mt-3 font-bold text-purple-950">No active {station} tickets</p><p className="mt-1 text-sm text-brand-textMuted">New orders appear here automatically.</p></div>
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleOrders.map((order) => {
            const elapsedMinutes = Math.max(0, Math.floor((now - new Date(order.updated_at).getTime()) / 60_000));
            const stationItems = order.items.filter((item) => item.kitchen_dept === station || item.kitchen_dept === "general");
            return <article key={order.id} className="flex flex-col rounded-2xl border border-purple-950/10 bg-white/85 shadow-sm backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3 border-b border-purple-950/10 p-5"><div><p className="text-[10px] font-extrabold uppercase tracking-widest text-brand-accent">{order.order_type}</p><h2 className="mt-1 text-lg font-black text-purple-950">{order.id}</h2></div><span className={`rounded-full px-2.5 py-1.5 text-[10px] font-extrabold uppercase ${order.status === "ready" ? "bg-emerald-100 text-emerald-800" : "bg-yellow-100 text-yellow-900"}`}>{order.status === "placed" ? "New" : order.status === "ready" ? "Ready" : "Cooking"}</span></div>
              <div className="flex-1 p-5">
                <div className="mb-4 flex items-center justify-between gap-2"><p className="font-bold text-purple-950">{order.customer_name}</p><a href={`tel:${order.customer_phone}`} aria-label={`Call ${order.customer_name}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-purple-950/10 px-3 text-xs font-bold text-brand-accent"><PhoneCall className="h-4 w-4" />Call</a></div>
                <ul className="space-y-3 border-t border-purple-950/10 pt-4">{stationItems.map((item, index) => <li key={`${item.item_name}-${index}`} className="flex items-start gap-3 text-sm"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-950 text-xs font-black text-white">{item.quantity}</span><span className="font-semibold text-purple-950">{item.item_name}{item.variant_name && <span className="mt-0.5 block text-xs font-medium text-brand-textMuted">{item.variant_name}</span>}</span></li>)}</ul>
                <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-brand-textMuted"><Clock className="h-4 w-4" />{order.status === "placed" ? "Queued" : `Prep time ${elapsedMinutes} min`}</p>
              </div>
              <div className="border-t border-purple-950/10 p-4"><button type="button" disabled={busyOrder === order.id || order.status === "ready"} onClick={() => void advance(order)} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 text-sm font-extrabold text-purple-950 hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-50">{busyOrder === order.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : order.status === "placed" ? <ChefHat className="h-4 w-4" /> : order.status === "kitchen" ? <FileText className="h-4 w-4" /> : <Bike className="h-4 w-4" />}{order.status === "placed" ? "Start Cooking" : order.status === "kitchen" ? "Ready for Packing" : "Waiting for dispatch"}</button></div>
            </article>;
          })}
        </section>
      )}
    </main>
  );
}
