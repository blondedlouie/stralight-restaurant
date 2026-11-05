"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FulfillmentWidget } from '@/components/ui/FulfillmentWidget';
import { Hero } from '@/components/home/Hero';
import { MenuCatalog } from '@/components/ui/MenuCatalog';

export default function HomePage() {
  const router = useRouter();
  const [trackingId, setTrackingId] = useState('');

  const handleTrackOrder = (event: React.FormEvent) => {
    event.preventDefault();
    const id = trackingId.trim();
    if (id) router.push(`/track/${encodeURIComponent(id)}`);
  };

  return (
    <>
      <Hero />
      <div className="hidden md:block">
        <FulfillmentWidget />
      </div>

      <MenuCatalog />

      <div className="md:hidden"><FulfillmentWidget /></div>

      <section id="track-order" className="bg-white border-y border-brand-border scroll-mt-24">
        <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <p className="text-xs font-extrabold tracking-[0.16em] text-brand-accent uppercase mb-2">Already ordered?</p>
            <h2 className="font-display text-2xl text-brand-purple">Track your order</h2>
          </div>
          <form onSubmit={handleTrackOrder} className="flex w-full md:max-w-md gap-2">
            <input value={trackingId} onChange={(event) => setTrackingId(event.target.value)} placeholder="Enter your order reference" aria-label="Order reference" className="min-h-11 flex-1 min-w-0 rounded-lg border border-brand-border px-3 text-sm text-brand-ink placeholder:text-brand-textMuted" />
            <button type="submit" className="min-h-11 rounded-[10px] bg-brand-purple px-4 text-sm font-bold text-white hover:bg-brand-accent">Track order</button>
          </form>
        </div>
      </section>

      <section id="faqs" className="max-w-3xl mx-auto px-4 py-14 scroll-mt-24">
        <h2 className="font-display text-3xl text-brand-purple text-center mb-7">Good to know</h2>
        <div className="space-y-3">
          <details className="group rounded-xl border border-brand-border bg-white p-4">
            <summary className="cursor-pointer font-bold text-brand-ink flex items-center justify-between">When are you open?<span className="text-brand-accent group-open:rotate-45 transition-transform">+</span></summary>
            <p className="pt-3 text-sm leading-6 text-brand-textMuted">Our branches are open daily from 10:00 AM until 2:00 AM.</p>
          </details>
          <details className="group rounded-xl border border-brand-border bg-white p-4">
            <summary className="cursor-pointer font-bold text-brand-ink flex items-center justify-between">Where do you deliver?<span className="text-brand-accent group-open:rotate-45 transition-transform">+</span></summary>
            <p className="pt-3 text-sm leading-6 text-brand-textMuted">We serve areas across Nairobi and Mombasa from our local branches. Enter your area at checkout or <a href="/locations" className="text-brand-accent underline">find a branch</a>.</p>
          </details>
          <details className="group rounded-xl border border-brand-border bg-white p-4">
            <summary className="cursor-pointer font-bold text-brand-ink flex items-center justify-between">How do I pay?<span className="text-brand-accent group-open:rotate-45 transition-transform">+</span></summary>
            <p className="pt-3 text-sm leading-6 text-brand-textMuted">Pay securely using M-Pesa when you check out.</p>
          </details>
        </div>
      </section>

      <footer className="bg-brand-purple text-white">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <div className="font-extrabold">Starlight Restaurant</div>
          <p className="text-white/75">Fresh, hot and delivered directly from our branches.</p>
          <a href="tel:0704878787" className="font-bold hover:text-brand-primary">Call 0704 878 787</a>
        </div>
      </footer>

    </>
  );
}
