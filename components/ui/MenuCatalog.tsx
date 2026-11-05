"use client";

import { useState } from 'react';
import { menuProducts, type MenuProduct } from '@/lib/menu';
import { ProductCard } from '@/components/ui/ProductCard';
import { ItemVariantModal } from '@/components/ui/ItemVariantModal';
import { Coffee, Flame, Pizza, Sparkles, Utensils } from 'lucide-react';

const categories = [
  { name: 'All', icon: Sparkles },
  { name: 'Combos & Offers', icon: Flame },
  { name: 'Chicken & Wings', icon: Utensils },
  { name: 'Burgers', icon: Utensils },
  { name: 'Pizza', icon: Pizza },
  { name: 'Shawarma', icon: Utensils },
  { name: 'Sides & Drinks', icon: Coffee },
];

export function MenuCatalog() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState<MenuProduct | null>(null);
  const filtered = activeCategory === 'All'
    ? menuProducts
    : activeCategory === 'Combos & Offers'
      ? menuProducts.filter((item) => item.category === activeCategory || /bucket|combo|offer/i.test(item.name))
      : menuProducts.filter((item) => item.category === activeCategory);

  return (
    <>
      <section id="menu" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-24 pt-14 md:pb-16">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="mb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-brand-accent">Made fresh, made for you</p><h2 className="font-display text-3xl text-brand-purple sm:text-4xl">Our Menu</h2></div>
          <p className="text-sm text-brand-textMuted">Good food. Direct from our kitchens.</p>
        </div>
        <div className="sticky top-[72px] z-20 -mx-4 mb-5 border-y border-white/70 bg-white/80 px-4 py-2 backdrop-blur-xl sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <div className="scrollbar-none flex items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter menu by category">
            {categories.map((category) => { const Icon = category.icon; return <button key={category.name} role="tab" aria-selected={activeCategory === category.name} onClick={() => setActiveCategory(category.name)} className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-bold transition sm:text-sm ${activeCategory === category.name ? 'bg-brand-purple text-brand-primary' : 'border border-brand-border bg-white text-brand-ink hover:border-brand-accent'}`}><Icon className="h-4 w-4" aria-hidden="true" />{category.name}</button>; })}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {filtered.map((product) => <ProductCard key={product.id} product={product} onSelect={setSelectedItem} />)}
        </div>
      </section>
      <ItemVariantModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </>
  );
}
