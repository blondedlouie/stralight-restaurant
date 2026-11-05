"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, LoaderCircle, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const roleHome: Record<string, string> = {
  super_admin: "/admin/super",
  branch_manager: "/admin/dispatch",
  dispatch: "/admin/dispatch",
  kitchen: "/admin/kds",
  rider: "/admin/rider",
  pos: "/admin/pos",
};
const mockRoles=Object.entries(roleHome);

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const mockMode=process.env.NEXT_PUBLIC_ENABLE_SANDBOX==="true"&&process.env.NEXT_PUBLIC_USE_MOCK_DATA==="true";
  async function chooseMockRole(role:string){setLoading(true);const response=await fetch("/api/auth/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role})});if(!response.ok){const body=await response.json();setError(body.error||"Unable to start mock session.");setLoading(false);return;}router.replace(roleHome[role]);}

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError || !data.session) throw authError || new Error("Could not create a staff session.");

      const cookieResponse = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: data.session.access_token, refresh_token: data.session.refresh_token, expires_in: data.session.expires_in }),
      });
      if (!cookieResponse.ok) {
        const result = await cookieResponse.json().catch(() => null);
        throw new Error(result?.error || "Could not secure the staff session.");
      }

      const { data: profile } = await supabase.from("user_profiles").select("role").eq("user_id", data.user.id).maybeSingle();
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(next?.startsWith("/admin/") ? next : roleHome[profile?.role || ""] || "/admin/forbidden");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Sign-in failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100dvh-72px)] items-center justify-center bg-white px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-purple-950/10 bg-white/80 p-6 shadow-sm backdrop-blur-xl sm:p-8">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400 text-purple-950"><KeyRound className="h-6 w-6" /></div>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-accent">Staff access</p>
        <h1 className="mt-1 font-display text-3xl text-purple-950">Sign in to Starlight</h1>
        {mockMode ? <div className="mt-6"><div className="rounded-xl bg-yellow-400/20 p-3 text-xs font-bold text-purple-950"><Shield className="mr-1 inline h-4 w-4"/>LOCAL MOCK MODE: choose a staff role to enter.</div><div className="mt-4 grid grid-cols-2 gap-2">{mockRoles.map(([role,path])=><button key={role} disabled={loading} onClick={()=>void chooseMockRole(role)} className="min-h-11 rounded-xl border border-purple-950/10 bg-white px-3 text-xs font-extrabold capitalize text-purple-950 hover:bg-yellow-50">{role.replaceAll("_"," ")}</button>)}</div></div> : <form onSubmit={signIn} className="mt-6 space-y-4">
          <label className="block text-xs font-bold text-purple-950">Email<input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 min-h-12 w-full rounded-xl border border-purple-950/15 bg-white px-3 text-sm outline-none focus:border-purple-950" /></label>
          <label className="block text-xs font-bold text-purple-950">Password<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 min-h-12 w-full rounded-xl border border-purple-950/15 bg-white px-3 text-sm outline-none focus:border-purple-950" /></label>
          {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}
          <button disabled={loading} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 text-sm font-extrabold text-purple-950 hover:bg-yellow-500 disabled:opacity-60">{loading && <LoaderCircle className="h-4 w-4 animate-spin" />}Sign in</button>
        </form>}
      </section>
    </main>
  );
}
