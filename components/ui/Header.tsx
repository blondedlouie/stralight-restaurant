"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, PhoneCall, ShoppingCart, MapPin, X } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";

export const Header = () => {
  const { getTotalItemCount, getTotal, setDrawerOpen, selectedBranch } =
    useCartStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const count = getTotalItemCount();
  const basketTotal = count === 0 ? 0 : getTotal();
  const links = [
    { href: "/#menu", label: "Our Menu" },
    { href: "/locations", label: "Branches" },
    { href: "/track", label: "Track Order" },
    { href: "/#faqs", label: "FAQs" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-purple-950/10 bg-white/75 px-3 shadow-sm backdrop-blur-xl sm:px-4">
      <div className="max-w-6xl mx-auto min-h-[72px] flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0"
          aria-label="Starlight Restaurant home"
        >
          <img src="/images/starlight-logo.png" alt="" className="h-10 w-10 rounded-full object-cover" />
          <div>
            <span className="font-extrabold text-xs sm:text-base tracking-tight text-brand-purple block leading-none">
              Starlight Restaurant
            </span>
            <span className="hidden sm:block text-[10px] font-bold text-brand-textMuted tracking-wide uppercase mt-1">
              Chicken, Pizza & More
            </span>
          </div>
        </Link>

        <nav
          className="hidden lg:flex items-center gap-6"
          aria-label="Main navigation"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-brand-ink hover:text-brand-accent transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden xl:flex items-center gap-1.5 text-xs text-brand-textMuted whitespace-nowrap">
          <MapPin className="w-4 h-4 text-brand-accent" />
          <span>
            Delivering from:{" "}
            <strong className="text-brand-purple">
              {selectedBranch?.name || "South C"}
            </strong>
          </span>
          <span className="text-brand-textMuted">(10 AM - 2 AM)</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="tel:0704878787"
            className="flex items-center justify-center min-h-11 min-w-8 sm:min-w-0 gap-1.5 text-sm font-bold text-brand-purple hover:text-brand-accent transition"
          >
            <PhoneCall className="w-4 h-4" />
            <span className="hidden sm:inline">0704 878 787</span>
          </Link>

          <button
            onClick={() => setDrawerOpen(true)}
            className="relative min-h-11 px-3 sm:px-4 rounded-[10px] bg-brand-primary hover:bg-brand-primaryHover transition flex items-center gap-2 text-brand-ink font-extrabold text-xs sm:text-sm"
            aria-label={`Open basket, ${count} items, Ksh ${basketTotal.toLocaleString()}`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Basket</span>
            <span>(Ksh {basketTotal.toLocaleString()})</span>
          </button>

          <button
            className="lg:hidden min-h-11 min-w-11 flex items-center justify-center rounded-lg border border-brand-border text-brand-purple"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={
              menuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav
          className="lg:hidden max-w-6xl mx-auto pb-3 grid gap-1"
          aria-label="Mobile navigation"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-3 text-sm font-semibold text-brand-ink hover:bg-brand-bg"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/locations"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-3 text-sm text-brand-textMuted"
          >
            <MapPin className="w-4 h-4 text-brand-accent" />
            Delivering from {selectedBranch?.name || "South C"} · Open 10 AM - 2
            AM
          </Link>
        </nav>
      )}
    </header>
  );
};
