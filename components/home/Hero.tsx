"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock, MapPin, PhoneCall, Search } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";

export function Hero() {
  const router = useRouter();
  const setOrderType = useCartStore((state) => state.setOrderType);
  const [area, setArea] = useState("");

  function findNearest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = area.trim() ? `?area=${encodeURIComponent(area.trim())}` : "";
    router.push(`/checkout${query}`);
  }

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 pb-14 pt-6 md:pb-12 md:pt-14">
        <div className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
          <div className="order-1 overflow-hidden rounded-2xl shadow-[0_4px_20px_rgba(45,11,90,.12)] md:order-2">
            <img
              src="https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=1200&q=85"
              alt="Freshly fried golden chicken ready to share"
              className="aspect-[4/3] w-full object-cover"
              fetchPriority="high"
            />
          </div>

          <div className="order-2 mx-auto max-w-xl text-center md:order-1 md:mx-0 md:text-left">
            <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.18em] text-brand-accent sm:text-sm">
              <span className="text-brand-purple">Fresh <span className="text-brand-primaryHover">·</span> Hot <span className="text-brand-primaryHover">·</span></span> Branch-wide
            </p>
            <h1 className="font-display text-4xl leading-[1.08] tracking-tight text-brand-purple sm:text-5xl lg:text-6xl">
              Savor the Crunch, Delivered Fast.
            </h1>
            <p className="mt-5 text-justify text-sm leading-7 text-brand-textMuted sm:text-base md:text-left">
              Order legendary Starlight Chicken, Pizzas, Burgers &amp; Shawarmas directly from our branches in South C, Eastleigh, James Gichuru, Hurlingham, Muthangari, and Bamburi. Hot, fresh, and commission-free.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3 md:justify-start">
              <a href="#menu" onClick={() => setOrderType("delivery")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-brand-primary px-5 py-3 text-sm font-extrabold text-brand-ink transition hover:bg-brand-primaryHover">
                Order for Delivery <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#menu" onClick={() => setOrderType("pickup")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] border border-brand-purple bg-white px-5 py-3 text-sm font-bold text-brand-purple transition hover:bg-purple-50">
                Self-Pickup
              </a>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-brand-textMuted md:justify-start">
              <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-brand-accent" /> Open daily, 10 AM - 2 AM</span>
              <a href="tel:0704878787" className="inline-flex items-center gap-1.5 underline underline-offset-2 hover:text-brand-purple"><PhoneCall className="h-3.5 w-3.5" aria-hidden="true" /> Or call us directly to order</a>
            </div>
          </div>
        </div>

        <form onSubmit={findNearest} className="mx-auto mt-7 flex w-full max-w-3xl gap-2 rounded-2xl border border-purple-950/10 bg-white/80 p-2 shadow-sm backdrop-blur-xl md:mt-9 md:p-3">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 sm:px-3">
            <MapPin className="h-4 w-4 shrink-0 text-brand-accent" />
            <input value={area} onChange={(event) => setArea(event.target.value)} placeholder="Enter your area" aria-label="Delivery area" className="min-h-11 w-full bg-transparent text-sm text-brand-ink placeholder:text-brand-textMuted focus:outline-none" />
          </label>
          <button type="submit" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 text-xs font-extrabold text-purple-950 transition hover:bg-yellow-500 sm:px-5 sm:text-sm">
            <span>Find Nearest</span><Search className="h-4 w-4" />
          </button>
        </form>
      </div>
    </section>
  );
}
