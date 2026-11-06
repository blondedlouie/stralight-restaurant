"use client";

import { useEffect, useState } from "react";
import { Code2, ExternalLink, LoaderCircle, RotateCcw, Sprout, X } from "lucide-react";

type SimulationRole = "customer" | "super_admin" | "branch_manager" | "dispatch" | "kitchen" | "rider" | "pos";
type Branch = { id: string; name: string };
type RoleOption = { role: SimulationRole; label: string; href: string; id: string };
type SimulationSession = {
  authorized: true;
  active: boolean;
  role: string;
  branchId: string | null;
  branches: Branch[];
};

const roleOptions: RoleOption[] = [
  { id: "customer-menu", role: "customer", label: "Customer · Menu", href: "/" },
  { id: "customer-branches", role: "customer", label: "Customer · Branches", href: "/locations" },
  { id: "super-admin", role: "super_admin", label: "Super Admin", href: "/admin/super" },
  { id: "kitchen", role: "kitchen", label: "Kitchen · KDS", href: "/admin/kds" },
  { id: "branch-manager", role: "branch_manager", label: "Branch manager · Dispatch", href: "/admin/dispatch" },
  { id: "dispatch", role: "dispatch", label: "Dispatch staff", href: "/admin/dispatch" },
  { id: "rider", role: "rider", label: "Rider app", href: "/admin/rider" },
  { id: "pos", role: "pos", label: "POS · Read-only", href: "/admin/pos" },
];

export function DevToolbar() {
  const [authorized, setAuthorized] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [selectedRole, setSelectedRole] = useState("kitchen");

  useEffect(() => {
    let mounted = true;
    const loadSession = () => {
      void fetch("/api/sandbox/session", { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) return null;
          return await response.json() as SimulationSession;
        })
        .then((session) => {
          if (!mounted) return;
          setAuthorized(Boolean(session?.authorized));
          if (!session?.authorized) return;
          setActive(session.active);
          setBranches(session.branches);
          setBranchId(session.branchId || session.branches[0]?.id || "");
          if (session.role === "branch_manager" || session.role === "dispatch" || session.role === "kitchen" || session.role === "rider" || session.role === "pos" || session.role === "super_admin") setSelectedRole(session.role);
        })
        .catch(() => {
          if (mounted) setAuthorized(false);
        });
    };
    loadSession();
    window.addEventListener("starlight-auth-changed", loadSession);
    const sessionTimer = window.setInterval(loadSession, 60_000);
    return () => {
      mounted = false;
      window.removeEventListener("starlight-auth-changed", loadSession);
      window.clearInterval(sessionTimer);
    };
  }, []);

  if (!authorized) return null;

  async function setSimulationMode(enabled: boolean) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/sandbox/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: enabled }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to update simulation mode.");
      setActive(enabled);
      setMessage(enabled ? "Simulation mode is on for this signed-in super admin." : "Simulation mode is off.");
      if (!enabled) window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update simulation mode.");
    } finally {
      setBusy(false);
    }
  }

  async function impersonate(option: RoleOption) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/sandbox/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: option.role, branchId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to switch simulation role.");
      window.location.href = option.href;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to switch simulation role.");
    } finally {
      setBusy(false);
    }
  }

  async function seedOrders() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/sandbox/seed-mock-data", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to seed simulation data.");
      setMessage(`Seeded ${body.count} paid simulation orders across South C and Eastleigh.`);
      window.dispatchEvent(new Event("starlight-simulation-orders-updated"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to seed simulation data.");
    } finally {
      setBusy(false);
    }
  }

  async function resetSimulationData() {
    if (!window.confirm("Delete all simulation orders and simulation riders?")) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/sandbox/reset", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to reset simulation data.");
      setMessage(`Removed ${body.deletedOrders} simulation orders.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to reset simulation data.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="fixed bottom-4 left-4 z-[80] font-sans">
    {open && <section className="mb-3 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-purple-950/10 bg-white/95 p-4 shadow-xl backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div><p className="text-[10px] font-black tracking-widest text-brand-accent">SUPER ADMIN ONLY</p><h2 className="font-black text-purple-950">Simulation controls</h2></div>
        <button onClick={() => setOpen(false)} aria-label="Close simulation controls" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100"><X className="h-4 w-4" /></button>
      </div>
      <button disabled={busy} onClick={() => void setSimulationMode(!active)} className={`mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-extrabold disabled:opacity-60 ${active ? "bg-slate-100 text-purple-950" : "bg-yellow-400 text-purple-950"}`}>
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sprout className="h-4 w-4" />}
        {active ? "Turn simulation off" : "Turn simulation on"}
      </button>
      {active && <>
        <label className="mt-3 block text-xs font-bold text-purple-950">Simulation branch
          <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-purple-950/15 bg-white px-2">
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </label>
        <label className="mt-3 block text-xs font-bold text-purple-950">Impersonate role
          <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-purple-950/15 bg-white px-2">
            {roleOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
        <button disabled={busy} onClick={() => void impersonate(roleOptions.find((entry) => entry.id === selectedRole)!)} className="mt-2 min-h-10 w-full rounded-lg border border-purple-950/10 text-xs font-bold text-purple-950 hover:bg-slate-50 disabled:opacity-60">
          Go to selected role
        </button>
        <button disabled={busy} onClick={() => void seedOrders()} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-3 text-sm font-extrabold text-purple-950 disabled:opacity-60">
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sprout className="h-4 w-4" />}Seed 7 sample orders
        </button>
        <button disabled={busy} onClick={() => void resetSimulationData()} className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-purple-950/10 text-xs font-bold text-purple-950 disabled:opacity-60">
          <RotateCcw className="h-4 w-4" />Reset simulation data
        </button>
      </>}
      {message && <p role="status" className="mt-3 break-words text-xs text-purple-950">{message}</p>}
      <a href="/admin/super" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-purple-800">Super Admin dashboard <ExternalLink className="h-3 w-3" /></a>
    </section>}
    <button onClick={() => setOpen(!open)} aria-expanded={open} className="inline-flex h-11 items-center gap-2 rounded-full bg-purple-950 px-4 text-sm font-extrabold text-white shadow-lg"><Code2 className="h-4 w-4" />Simulation</button>
  </div>;
}
