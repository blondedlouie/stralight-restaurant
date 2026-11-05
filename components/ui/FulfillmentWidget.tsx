"use client";

import { Bike, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";

export function FulfillmentWidget() {
  const { orderType, setOrderType } = useCartStore();

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-purple-950/10 bg-white/80 p-3 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.08)] backdrop-blur-2xl md:static md:mx-auto md:mt-0 md:max-w-6xl md:rounded-2xl md:border md:border-purple-900/10 md:bg-white/70 md:p-4 md:shadow-sm">
      <div className="mx-auto grid max-w-lg grid-cols-2 gap-2 rounded-2xl md:max-w-none md:grid-cols-[1fr_auto] md:items-center">
        <p className="hidden text-sm font-semibold text-purple-950 md:block">How would you like your order?</p>
        <div className="col-span-2 grid grid-cols-2 gap-2 md:col-span-1 md:w-80">
          <button type="button" onClick={() => setOrderType("delivery")} aria-pressed={orderType === "delivery"} className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-bold transition ${orderType === "delivery" ? "bg-yellow-400 text-purple-950 shadow-sm" : "border border-purple-900/10 bg-white/70 text-purple-950 hover:bg-white"}`}>
            <Bike className="h-4 w-4" aria-hidden="true" /> Delivery
          </button>
          <button type="button" onClick={() => setOrderType("pickup")} aria-pressed={orderType === "pickup"} className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-bold transition ${orderType === "pickup" ? "bg-yellow-400 text-purple-950 shadow-sm" : "border border-purple-900/10 bg-white/70 text-purple-950 hover:bg-white"}`}>
            <ShoppingBag className="h-4 w-4" aria-hidden="true" /> Pickup
          </button>
        </div>
      </div>
    </div>
  );
}
