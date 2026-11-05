"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';

interface Variant {
  variant_name: string;
  price_override: number;
}

interface ItemModalProps {
  item: {
    id: string;
    name: string;
    description: string;
    base_price: number;
    kitchen_dept: 'chicken' | 'pizza' | 'drinks' | 'general';
    variants?: Variant[];
  } | null;
  onClose: () => void;
}

export const ItemVariantModal = ({ item, onClose }: ItemModalProps) => {
  const { addItem } = useCartStore();
  const [selectedVariant, setSelectedVariant] = useState<string>('Standard');
  const [currentPrice, setCurrentPrice] = useState<number>(item?.base_price || 0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setSelectedVariant(item?.variants?.[0]?.variant_name || 'Standard');
    setCurrentPrice(item?.variants?.[0]?.price_override ?? item?.base_price ?? 0);
    setQuantity(1);
  }, [item]);

  if (!item) return null;

  const handleSelectVariant = (name: string, price: number) => {
    setSelectedVariant(name);
    setCurrentPrice(price);
  };

  const handleAdd = () => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      variantName: selectedVariant !== 'Standard' ? selectedVariant : undefined,
      unitPrice: currentPrice || item.base_price,
      quantity: quantity,
      kitchenDept: item.kitchen_dept,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] flex items-end justify-center bg-brand-purple/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/50 bg-white/95 text-brand-ink shadow-2xl backdrop-blur-2xl sm:rounded-3xl"
        >
          <div className="flex shrink-0 items-start justify-between border-b border-brand-border px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
            <div className="min-w-0 pr-3">
              <h3 className="text-xl font-black">{item.name}</h3>
              <p className="mt-1 text-xs text-brand-textMuted">{item.description}</p>
            </div>
            <button onClick={onClose} aria-label="Close item options" className="flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-brand-bg">
              <X className="w-5 h-5 text-brand-textMuted" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6">
            {item.variants && item.variants.length > 0 && (
              <div className="border-b border-brand-border py-4">
                <span className="mb-3 block text-xs font-extrabold uppercase tracking-wider text-brand-purple">
                  Select Option / Size
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {item.variants.map((v, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectVariant(v.variant_name, v.price_override)}
                      className={`flex items-center justify-between rounded-xl border p-3 text-left transition ${
                        selectedVariant === v.variant_name
                          ? 'border-brand-purple bg-brand-bg text-brand-purple'
                          : 'border-brand-border bg-brand-bg text-brand-ink'
                      }`}
                    >
                      <span className="text-xs font-bold">{v.variant_name}</span>
                      <span className="text-xs font-extrabold">KES {v.price_override}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between py-5">
              <span className="text-sm font-bold text-brand-textMuted">Quantity</span>
              <div className="flex items-center rounded-xl border border-brand-border bg-brand-bg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Decrease quantity"
                  className="p-2 transition hover:text-brand-primary"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center font-bold">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  aria-label="Increase quantity"
                  className="p-2 transition hover:text-brand-primary"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-purple-950/10 bg-white/95 p-4 pb-safe backdrop-blur-xl sm:px-6 sm:pt-5">
            <button
              onClick={handleAdd}
              className="flex min-h-12 w-full items-center justify-between rounded-xl bg-yellow-400 px-5 py-3.5 font-black text-purple-950 transition hover:bg-yellow-500"
            >
              <span>Add to Basket</span>
              <span>KES {((currentPrice || item.base_price) * quantity).toLocaleString()}</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
