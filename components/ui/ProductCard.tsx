"use client";

import Image from 'next/image';
import { Plus } from 'lucide-react';
import type { MenuProduct } from '@/lib/menu';

type ProductCardProps = {
  product: MenuProduct;
  onSelect: (product: MenuProduct) => void;
};

export function ProductCard({ product, onSelect }: ProductCardProps) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-brand-border bg-white shadow-[0_1px_2px_rgba(59,26,107,.08),0_4px_14px_rgba(59,26,107,.06)] transition-transform duration-200 hover:-translate-y-0.5">
      <button type="button" onClick={() => onSelect(product)} className="relative block w-full overflow-hidden text-left" aria-label={`Customize ${product.name}`}>
        <Image src={product.image} alt={product.name} width={900} height={560} unoptimized loading="lazy" className="aspect-[16/10] w-full bg-brand-bg object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
        <span className="absolute left-3 top-3 rounded-full border border-white/70 bg-white/85 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-brand-purple backdrop-blur-md">{product.category}</span>
        <span className="absolute right-3 top-3 rounded-xl border border-white/70 bg-white/85 px-3 py-1.5 text-sm font-extrabold text-brand-purple shadow-sm backdrop-blur-md">Ksh {product.base_price.toLocaleString()}</span>
      </button>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-lg leading-snug text-brand-purple">{product.name}</h3>
        <p className="mt-1.5 line-clamp-2 min-h-10 text-xs leading-relaxed text-brand-textMuted">{product.description}</p>
        <button type="button" onClick={() => onSelect(product)} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 text-sm font-extrabold text-brand-ink transition-colors hover:bg-brand-primaryHover">
          {product.variants?.length ? 'Customize' : 'Add to Basket'} <Plus className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
