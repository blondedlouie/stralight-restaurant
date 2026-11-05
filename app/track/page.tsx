"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Clock, Search } from "lucide-react";

const HISTORY_KEY = "starlight-recent-orders";
const ORDER_ID_PATTERN = /^SL-?\d{4,10}$/i;

export default function TrackOrderLookupPage() {
  const router = useRouter();
  const [orderId, setOrderId] = useState("");
  const [recentOrders, setRecentOrders] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      if (Array.isArray(saved)) setRecentOrders(saved.filter((value): value is string => typeof value === "string").slice(0, 5));
    } catch {
      localStorage.removeItem(HISTORY_KEY);
    }
  }, []);

  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedId = orderId.trim().toUpperCase();
    if (!ORDER_ID_PATTERN.test(normalizedId)) {
      setError("Enter a valid Starlight order ID, such as SL-4208.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/orders/track/${encodeURIComponent(normalizedId)}`, { cache: "no-store" });
      if (response.status === 404) {
        setError("We couldn’t find that order. Check the ID and try again.");
        return;
      }
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error || "We couldn’t look up your order right now. Please try again.");
        return;
      }

      const resolvedId = typeof result.order?.id === "string" ? result.order.id : normalizedId;
      const nextHistory = [resolvedId, ...recentOrders.filter((recentId) => recentId !== resolvedId)].slice(0, 5);
      setRecentOrders(nextHistory);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
      router.push(`/track/${encodeURIComponent(resolvedId)}`);
    } catch {
      setError("We couldn’t connect to order tracking. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100dvh-72px)] items-center bg-white px-4 py-12">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-400 text-purple-950 shadow-sm">
            <Search className="h-7 w-7" />
          </div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-accent">Order updates</p>
          <h1 className="mt-2 font-display text-3xl text-purple-950 sm:text-4xl">Track your Starlight order</h1>
          <p className="mt-2 text-sm text-brand-textMuted">Enter your order ID to see its latest progress.</p>
        </div>

        <section className="rounded-3xl border border-purple-950/10 bg-white/80 p-5 shadow-sm backdrop-blur-xl sm:p-7">
          <form onSubmit={lookup} noValidate>
            <label htmlFor="order-id" className="mb-2 block text-xs font-bold text-purple-950">Order ID</label>
            <div className="flex gap-2">
              <input
                id="order-id"
                value={orderId}
                onChange={(event) => { setOrderId(event.target.value); setError(""); }}
                placeholder="Order ID, e.g., SL-4208"
                autoComplete="off"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "order-id-error" : undefined}
                className="min-h-12 min-w-0 flex-1 rounded-xl border border-purple-950/15 bg-white px-3 text-sm text-purple-950 outline-none transition placeholder:text-slate-400 focus:border-purple-950 focus:ring-2 focus:ring-purple-950/10"
              />
              <button type="submit" disabled={loading} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 text-sm font-extrabold text-purple-950 transition hover:bg-yellow-500 disabled:cursor-wait disabled:opacity-70">
                <Search className="h-4 w-4" /> <span className="hidden sm:inline">{loading ? "Searching" : "Track"}</span>
              </button>
            </div>
            {error && <p id="order-id-error" role="alert" className="mt-3 flex items-start gap-2 text-xs font-semibold text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}</p>}
          </form>

          {recentOrders.length > 0 && (
            <div className="mt-6 border-t border-purple-950/10 pt-5">
              <h2 className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-purple-950"><Clock className="h-4 w-4 text-brand-accent" /> Recent orders</h2>
              <div className="flex flex-wrap gap-2">
                {recentOrders.map((recentId) => (
                  <button key={recentId} type="button" onClick={() => router.push(`/track/${encodeURIComponent(recentId)}`)} className="rounded-full border border-purple-950/10 bg-white px-3 py-2 font-mono text-xs font-bold text-purple-950 transition hover:border-purple-950/30 hover:bg-slate-50">
                    {recentId}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
