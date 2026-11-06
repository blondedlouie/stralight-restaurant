"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag, Truck } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import Link from 'next/link';

export const CartDrawer = () => {
  const [simulationCheckout, setSimulationCheckout] = useState(false);
  const {
    items,
    isDrawerOpen,
    setDrawerOpen,
    updateQuantity,
    removeItem,
    getSubtotal,
    getTotal,
    getFreeDeliveryProgress
  } = useCartStore();

  const subtotal = getSubtotal();
  const total = getTotal();
  const { amountRemaining, percentage } = getFreeDeliveryProgress();

  useEffect(() => {
    let active = true;
    void fetch("/api/sandbox/session", { cache: "no-store" })
      .then(async (response) => response.ok ? await response.json() as { authorized: boolean; active: boolean } : null)
      .then((session) => {
        if (active) setSimulationCheckout(Boolean(session?.authorized && session.active));
      })
      .catch(() => {
        if (active) setSimulationCheckout(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-50 bg-brand-purple/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 top-auto z-50 flex h-[90dvh] max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl border-t border-brand-border bg-brand-surface text-brand-ink md:inset-y-0 md:left-auto md:right-0 md:h-dvh md:max-h-[100dvh] md:max-w-md md:rounded-t-none md:border-l md:border-t-0"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-brand-border p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-brand-purple" />
                <h2 className="text-xl font-bold tracking-tight">Your Basket</h2>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="min-h-11 min-w-11 flex items-center justify-center rounded-full hover:bg-brand-bg transition"
              >
                <X className="w-6 h-6 text-brand-textMuted" />
              </button>
            </div>

            <div className="shrink-0 border-b border-brand-border bg-brand-bg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-4 h-4 text-brand-purple" />
                <span className="text-xs font-semibold">
                  {amountRemaining > 0
                    ? `Add KES ${amountRemaining.toLocaleString()} more for FREE delivery`
                    : 'Unlocked FREE Delivery!'}
                </span>
              </div>
              <div className="w-full bg-brand-border h-2 rounded-full overflow-hidden">
                <motion.div
                  className="bg-brand-primary h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-2">
              {items.length === 0 ? (
                <div className="text-center py-16 text-brand-textMuted">
                  Your basket is currently empty.
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-brand-border"
                  >
                    <div className="flex-1 pr-3">
                      <p className="font-semibold text-brand-ink leading-tight">{item.name}</p>
                      {item.variantName && (
                        <p className="text-[11px] text-brand-purple font-bold uppercase mt-0.5">
                          {item.variantName}
                        </p>
                      )}
                      <p className="text-xs text-brand-textMuted font-semibold mt-1">
                        KES {(item.unitPrice * item.quantity).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-brand-border rounded-lg bg-brand-surface">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="min-h-11 min-w-11 hover:text-brand-purple transition"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="min-h-11 min-w-11 hover:text-brand-purple transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="min-h-11 min-w-11 text-brand-textMuted hover:text-rose-600 flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="flex-shrink-0 space-y-4 border-t border-purple-950/10 bg-white/90 p-4 pb-safe backdrop-blur-xl sm:px-5 sm:pt-5">
                <div className="flex justify-between items-center text-sm text-brand-textMuted">
                  <span>Subtotal</span>
                  <span className="font-semibold text-brand-ink">KES {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-black">
                  <span>TOTAL</span>
                  <span className="text-brand-purple">KES {total.toLocaleString()}</span>
                </div>
                <Link
                  href="/checkout"
                  onClick={() => setDrawerOpen(false)}
                  className="flex min-h-12 w-full items-center justify-center rounded-xl bg-yellow-400 py-3.5 font-extrabold text-purple-950 transition hover:bg-yellow-500"
                >
                  {simulationCheckout ? "Mock M-PESA Checkout (Admin)" : "Checkout Now"}
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
