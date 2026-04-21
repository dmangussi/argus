"use client";

import { useState } from "react";

type Product = {
  name: string;
  category: string | null;
  product_url: string;
  current_price: string | null;
  last_updated: Date | null;
  variation_7d_pct: string | null;
  image_url: string | null;
};

function relativeTime(date: Date | null): string {
  if (!date) return "nunca coletado";
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "agora mesmo";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  return `há ${Math.floor(diffH / 24)} dias`;
}

function VariationBadge({ pct }: { pct: string | null }) {
  if (pct === null) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </span>
    );
  }
  const value = parseFloat(pct);
  const isDrop = value < 0;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isDrop ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
      {isDrop ? "↓" : "↑"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function ProductCard({ product }: { product: Product }) {
  const hasPrice = product.current_price !== null;
  const price = hasPrice
    ? `R$ ${parseFloat(product.current_price!).toFixed(2).replace(".", ",")}`
    : null;

  return (
    <a
      href={product.product_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 hover:shadow-md transition-shadow active:scale-[0.98]"
    >
      {product.image_url && (
        <img
          src={product.image_url}
          alt={product.name}
          className="w-16 h-16 object-contain rounded-xl shrink-0 bg-slate-50"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 leading-snug mb-2 line-clamp-2">
          {product.name}
        </p>
        <div className="flex items-center justify-between">
          {price ? (
            <span className="text-xl font-bold text-slate-900">{price}</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-blue-500 font-medium">
              Ver no site
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </span>
          )}
          <VariationBadge pct={product.variation_7d_pct} />
        </div>
        <p className="text-xs text-slate-400 mt-1.5">
          {relativeTime(product.last_updated)}
          {product.variation_7d_pct !== null && " · vs 7 dias atrás"}
        </p>
      </div>
    </a>
  );
}

export default function CategoryList({ byCategory }: { byCategory: Record<string, Product[]> }) {
  const categories = Object.keys(byCategory);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const allCollapsed = categories.every((c) => collapsed[c]);

  function toggleAll() {
    if (allCollapsed) {
      setCollapsed({});
    } else {
      setCollapsed(Object.fromEntries(categories.map((c) => [c, true])));
    }
  }

  function toggleCategory(cat: string) {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end px-1">
        <button
          onClick={toggleAll}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          {allCollapsed ? "Expandir todas" : "Recolher todas"}
        </button>
      </div>
      {categories.map((category) => {
        const items = byCategory[category];
        const isCollapsed = !!collapsed[category];
        return (
          <section key={category}>
            <button
              onClick={() => toggleCategory(category)}
              className="flex items-center justify-between w-full px-1 mb-3 group"
            >
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                {category} ({items.length})
              </h2>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {!isCollapsed && (
              <div className="space-y-3">
                {items.map((p) => (
                  <ProductCard key={p.name} product={p} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
