"use client";

import { useState } from "react";
import { Code2, ExternalLink, LoaderCircle, RotateCcw, ShoppingBag, X } from "lucide-react";

const roles = [
  { role: "customer", label: "Customer", href: "/" },
  { role: "super_admin", label: "Super Admin", href: "/admin/super" },
  { role: "branch_manager", label: "Branch Manager", href: "/admin/dispatch" },
  { role: "kitchen", label: "KDS", href: "/admin/kds" },
  { role: "dispatch", label: "Dispatch", href: "/admin/dispatch" },
  { role: "rider", label: "Rider", href: "/admin/rider" },
  { role: "pos", label: "POS", href: "/admin/pos" },
];

export function DevToolbar() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  if (process.env.NEXT_PUBLIC_ENABLE_SANDBOX !== "true" || process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "true") return null;
  async function createMockOrder() {
    setBusy(true); setMessage(""); setTrackingUrl("");
    try { const response = await fetch("/api/sandbox/bypass-payment", { method: "POST" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Unable to create order."); setMessage(`Created ${body.orderId}`); setTrackingUrl(body.trackingUrl || ""); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to create order."); }
    finally { setBusy(false); }
  }
  async function reset(){setBusy(true);const response=await fetch("/api/sandbox/reset",{method:"POST"});setMessage(response.ok?"Mock data reset.":"Unable to reset mock data.");setBusy(false);}
  async function switchRole(role: string, href: string) {
    if (role === "customer") await fetch("/api/auth/session", { method: "DELETE" });
    else {
      const response = await fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
      if (!response.ok) { const body = await response.json(); setMessage(body.error || "Unable to switch mock role."); return; }
    }
    window.location.href = href;
  }
  return <div className="fixed bottom-4 left-4 z-[80] font-sans">
    {open && <section className="mb-3 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-purple-950/10 bg-white/95 p-4 shadow-xl backdrop-blur-xl"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black tracking-widest text-brand-accent">LOCAL MOCK MODE</p><h2 className="font-black text-purple-950">Developer sandbox</h2></div><button onClick={() => setOpen(false)} aria-label="Close developer tools" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100"><X className="h-4 w-4" /></button></div><button disabled={busy} onClick={() => void createMockOrder()} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-3 text-sm font-extrabold text-purple-950 disabled:opacity-60">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}Create paid mock order</button><div className="mt-3 grid grid-cols-2 gap-2">{roles.map(({ role, label, href }) => <button key={role} onClick={() => void switchRole(role, href)} className="min-h-10 rounded-lg border border-purple-950/10 px-2 text-xs font-bold text-purple-950 hover:bg-slate-50">View as {label}</button>)}</div><button onClick={()=>void reset()} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-purple-950/10 text-xs font-bold text-purple-950"><RotateCcw className="h-4 w-4"/>Reset mock data</button>{message && <p role="status" className="mt-3 break-words text-xs text-purple-950">{message}</p>}{trackingUrl && <a href={trackingUrl} className="mt-2 inline-flex text-xs font-extrabold text-purple-800 underline">Open order tracking</a>}<a href="/admin/login" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-purple-800">Staff sign in <ExternalLink className="h-3 w-3" /></a></section>}
    <button onClick={() => setOpen(!open)} aria-expanded={open} className="inline-flex h-11 items-center gap-2 rounded-full bg-purple-950 px-4 text-sm font-extrabold text-white shadow-lg"><Code2 className="h-4 w-4" />Dev tools</button>
  </div>;
}
