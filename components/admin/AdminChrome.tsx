"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, ChefHat, LogOut, MapPin, Bike, ShoppingCart, Shield, Store } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const adminLinks = [
  { href: "/admin/super", label: "Super Admin", roles: ["super_admin"], Icon: Shield },
  { href: "/admin/dispatch", label: "Dispatch", roles: ["super_admin", "branch_manager", "dispatch"], Icon: MapPin },
  { href: "/admin/kds", label: "Kitchen", roles: ["super_admin", "branch_manager", "kitchen"], Icon: ChefHat },
  { href: "/admin/rider", label: "Rider", roles: ["super_admin", "rider"], Icon: Bike },
  { href: "/admin/pos", label: "POS", roles: ["super_admin", "branch_manager", "pos"], Icon: ShoppingCart },
];

export function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState("");
  const [staffName, setStaffName] = useState("");

  useEffect(() => {
    if (pathname === "/admin/login") return;
    let active = true;
    const mockMode=process.env.NEXT_PUBLIC_ENABLE_SANDBOX === "true" && process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";
    if(mockMode){void fetch("/api/auth/session").then(response=>response.json()).then(body=>{if(active&&body.user){setRole(body.user.role);setStaffName(body.user.full_name);}});return ()=>{active=false;};}
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!active || !data.user) return;
      const { data: profile } = await supabase.from("user_profiles").select("role,full_name").eq("user_id", data.user.id).maybeSingle();
      if (active && profile) {
        setRole(profile.role);
        setStaffName(profile.full_name);
      }
    });
    if (process.env.NEXT_PUBLIC_ENABLE_SANDBOX === "true") {
      const previewRole = document.cookie.split("; ").find((cookie) => cookie.startsWith("starlight-sandbox-role="))?.split("=")[1];
      if (previewRole) setRole(decodeURIComponent(previewRole));
    }
    return () => { active = false; };
  }, [pathname]);

  if (pathname === "/admin/login") return <>{children}</>;

  async function signOut() {
    await supabase.auth.signOut();
    await fetch("/api/auth/session", { method: "DELETE" });
    document.cookie = "starlight-sandbox-role=; path=/; max-age=0";
    router.replace("/admin/login");
  }

  const visibleLinks = adminLinks.filter((link) => link.roles.includes(role));
  const homeHref = visibleLinks[0]?.href || "/admin/login";
  return (
    <div className="min-h-[calc(100dvh-72px)] bg-slate-50/50">
      {process.env.NEXT_PUBLIC_ENABLE_SANDBOX === "true" && process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" && <div className="bg-yellow-400 px-4 py-2 text-center text-[11px] font-black tracking-wide text-purple-950">LOCAL MOCK MODE</div>}
      <header className="sticky top-[72px] z-30 border-b border-purple-950/10 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href={homeHref} className="flex items-center gap-2 font-extrabold text-purple-950"><Store className="h-5 w-5 text-brand-accent" /> Starlight Operations</Link>
          <div className="flex items-center gap-3">
            {staffName && <span className="hidden text-xs font-semibold text-brand-textMuted sm:inline">{staffName} · {role.replaceAll("_", " ")}</span>}
            <button type="button" onClick={signOut} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-purple-950/10 bg-white px-3 text-xs font-bold text-purple-950 hover:bg-slate-50"><LogOut className="h-4 w-4" /> Sign out</button>
          </div>
        </div>
        <nav aria-label="Administration" className="scrollbar-none mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3">
          {visibleLinks.map(({ href, label, Icon }) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-bold ${pathname === href ? "bg-yellow-400 text-purple-950" : "border border-purple-950/10 bg-white/80 text-purple-950 hover:bg-white"}`}><Icon className="h-4 w-4" />{label}</Link>)}
          {role && <span className="ml-auto inline-flex items-center gap-1.5 px-2 text-[10px] font-bold uppercase tracking-wide text-brand-textMuted"><Activity className="h-3.5 w-3.5" />{role.replaceAll("_", " ")}</span>}
        </nav>
      </header>
      {children}
    </div>
  );
}
