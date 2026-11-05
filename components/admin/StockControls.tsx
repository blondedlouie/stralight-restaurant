"use client";

import { useCallback, useEffect, useState } from "react";
import { PackageCheck } from "lucide-react";

type StockItem = { id: string; name: string; is_available: boolean; branch_menu_stock?: { branch_id: string; is_available: boolean }[] };
export function StockControls() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [branchId, setBranchId] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => { const response = await fetch("/api/admin/stock", { cache: "no-store" }); if (response.status === 403) return; const body = await response.json(); if (response.ok) { setItems(body.items || []); setBranchId(body.branchId || ""); } else setMessage(body.error || "Unable to load stock."); }, []);
  useEffect(() => { void load(); }, [load]);
  async function toggle(item: StockItem) { if (!branchId) return; const current = item.branch_menu_stock?.find((entry) => entry.branch_id === branchId)?.is_available ?? item.is_available; const response = await fetch("/api/admin/stock", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ branchId, menuItemId: item.id, isAvailable: !current }) }); const body = await response.json(); setMessage(response.ok ? "Stock status saved." : body.error || "Unable to update stock."); if (response.ok) await load(); }
  if (!items.length) return null;
  return <section className="mb-7 rounded-2xl border border-purple-950/10 bg-white/80 p-4 shadow-sm backdrop-blur-xl"><div className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-brand-accent" /><div><h2 className="font-extrabold text-purple-950">Branch stock</h2><p className="text-xs text-brand-textMuted">Temporarily hide unavailable menu items at this branch.</p></div></div>{message && <p role="status" className="mt-2 text-xs text-brand-textMuted">{message}</p>}<div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{items.map((item) => { const available = item.branch_menu_stock?.find((entry) => entry.branch_id === branchId)?.is_available ?? item.is_available; return <button key={item.id} onClick={() => void toggle(item)} aria-pressed={available} className={`min-h-10 truncate rounded-xl px-3 text-xs font-bold ${available ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>{item.name}: {available ? "In stock" : "Unavailable"}</button>; })}</div></section>;
}
