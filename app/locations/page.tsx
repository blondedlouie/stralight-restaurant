"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, MapPin, Navigation, PhoneCall, UtensilsCrossed } from "lucide-react";

type Branch = {
  id: string;
  name: string;
  region: string;
  address_description: string;
  latitude: number;
  longitude: number;
  phone_chicken: string;
  phone_pizza: string | null;
  isOpen: boolean;
  operating_hours: string;
  delivery_radius_km: number;
  covered_estates: string[];
};

type RegionFilter = "All" | "Eastleigh" | "Nairobi" | "Coast";

const filters: RegionFilter[] = ["All", "Eastleigh", "Nairobi", "Coast"];

function matchesRegion(branch: Branch, filter: RegionFilter) {
  if (filter === "All") return true;
  if (filter === "Eastleigh") return branch.region === "Eastleigh";
  if (filter === "Coast") return branch.region === "Mombasa";
  return branch.region !== "Eastleigh" && branch.region !== "Mombasa";
}

export default function LocationsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<RegionFilter>("All");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    const loadBranches = async () => {
      try {
        const response = await fetch("/api/locations", { cache: "no-store" });
        if (!response.ok) throw new Error("Locations request failed");
        const result: { data: Branch[] } = await response.json();
        if (active) {
          setBranches(result.data);
          setHasError(false);
        }
      } catch {
        if (active) setHasError(true);
      }
    };

    void loadBranches();
    const interval = window.setInterval(() => void loadBranches(), 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const visibleBranches = useMemo(
    () => branches.filter((branch) => matchesRegion(branch, selectedRegion)),
    [branches, selectedRegion],
  );
  const openCount = visibleBranches.filter((branch) => branch.isOpen).length;

  return (
    <main className="min-h-screen bg-white px-4 pb-24 pt-8 sm:pt-12">
      <div className="mx-auto max-w-6xl">
        <section className="relative mb-8 overflow-hidden rounded-[28px] border border-purple-950/10 bg-gradient-to-br from-purple-950 to-brand-purple px-5 py-8 text-white shadow-sm sm:px-9 sm:py-10">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-yellow-400/20 blur-3xl" />
          <div className="relative max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/90 backdrop-blur-xl">
              <UtensilsCrossed className="h-3.5 w-3.5 text-yellow-300" /> 13 neighborhood kitchens
            </div>
            <h1 className="font-display text-4xl leading-tight sm:text-5xl">Your nearest Starlight is closer.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base">Find a branch, check today’s hours, and reach the right kitchen directly.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold backdrop-blur-xl">
                <Clock className="h-4 w-4 text-yellow-300" /> Daily, 10:00 AM to 2:00 AM
              </span>
              {branches.length > 0 && <span className="text-xs font-semibold text-white/75">{openCount} of {visibleBranches.length} shown open now</span>}
            </div>
          </div>
        </section>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.16em] text-brand-accent">Choose your kitchen</p>
            <h2 className="font-display text-2xl text-brand-purple sm:text-3xl">All branches</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filter branches by region">
            {filters.map((filter) => (
              <button key={filter} type="button" onClick={() => setSelectedRegion(filter)} aria-pressed={selectedRegion === filter} className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-bold transition ${selectedRegion === filter ? "bg-yellow-400 text-purple-950 shadow-sm" : "border border-purple-950/10 bg-white text-purple-950 hover:bg-slate-50"}`}>
                {filter}
              </button>
            ))}
          </div>
        </div>

        {hasError && branches.length === 0 ? (
          <div role="alert" className="rounded-2xl border border-purple-950/10 bg-white/80 p-6 text-center text-sm text-brand-textMuted shadow-sm backdrop-blur-xl">We couldn’t load branch details right now. Please try again shortly.</div>
        ) : branches.length === 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" aria-label="Loading branches">
            {[0, 1, 2].map((item) => <div key={item} className="h-64 animate-pulse rounded-2xl border border-purple-950/10 bg-slate-50/70" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibleBranches.map((branch) => {
              const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`;
              return (
                <article key={branch.id} className="group flex flex-col rounded-2xl border border-purple-950/10 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:shadow-[0_12px_36px_rgba(45,11,90,.12)]">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-accent">{branch.region}</p>
                      <h3 className="text-lg font-extrabold text-purple-950">{branch.name}</h3>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-extrabold ${branch.isOpen ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {branch.isOpen ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                      {branch.isOpen ? "Open Now" : "Closed"}
                    </span>
                  </div>

                  <p className="mb-3 flex items-start gap-2 text-sm leading-5 text-brand-textMuted">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" /> {branch.address_description}
                  </p>
                  <p className="mb-4 text-xs font-semibold text-brand-textMuted">Delivery radius: {branch.delivery_radius_km} km</p>

                  <div className="mb-5">
                    <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-purple-950">Serves</p>
                    <div className="flex flex-wrap gap-1.5">
                      {branch.covered_estates.map((estate) => <span key={estate} className="rounded-full border border-purple-950/10 bg-white/70 px-2.5 py-1 text-[10px] font-semibold text-brand-textMuted">{estate}</span>)}
                    </div>
                  </div>

                  <div className="mt-auto grid gap-2 border-t border-purple-950/10 pt-4">
                    <div className={branch.phone_pizza ? "grid grid-cols-2 gap-2" : "grid grid-cols-1"}>
                      <a href={`tel:${branch.phone_chicken}`} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-yellow-400 px-3 text-xs font-extrabold text-purple-950 transition hover:bg-yellow-500">
                        <PhoneCall className="h-4 w-4" /> {branch.phone_pizza ? "Chicken" : "Call Branch"}
                      </a>
                      {branch.phone_pizza && <a href={`tel:${branch.phone_pizza}`} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-purple-950/10 bg-white/70 px-3 text-xs font-extrabold text-purple-950 transition hover:bg-slate-50"><PhoneCall className="h-4 w-4" /> Pizza</a>}
                    </div>
                    <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-purple-950/10 bg-white/70 px-3 text-xs font-bold text-purple-950 transition hover:bg-slate-50">
                      <Navigation className="h-4 w-4 text-brand-accent" /> Get Directions
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
