"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronsUpDown,
  TrendingDown,
  TrendingUp,
  Clock,
  ExternalLink,
  Minus,
  PackageSearch,
} from "lucide-react";

type Product = {
  name: string;
  category: string | null;
  product_url: string;
  current_price: string | null;
  last_updated: Date | null;
  variation_7d_pct: string | null;
  image_url: string | null;
};

const CATEGORY_COLORS: Record<string, string> = {
  "Hortifruti":      "bg-emerald-400",
  "Padaria":         "bg-amber-400",
  "Açougue":         "bg-red-400",
  "Laticínios e Frios": "bg-sky-400",
  "Mercearia":       "bg-orange-400",
  "Congelados":      "bg-cyan-400",
  "Bebidas":         "bg-blue-400",
  "Higiene":         "bg-pink-400",
  "Limpeza":         "bg-teal-400",
  "Pet Shop":        "bg-purple-400",
  "Outros":          "bg-zinc-400",
};

function relativeTime(date: Date | null): string {
  if (!date) return "nunca";
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return `${Math.floor(diffH / 24)}d`;
}

function VariationBadge({ pct }: { pct: string | null }) {
  if (pct === null) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-100 text-zinc-400 text-xs font-medium">
        <Minus className="w-3 h-3" />
      </span>
    );
  }
  const value = parseFloat(pct);
  const isDrop = value < 0;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
        isDrop
          ? "bg-emerald-50 text-emerald-700"
          : "bg-rose-50 text-rose-600"
      }`}
    >
      {isDrop
        ? <TrendingDown className="w-3 h-3" />
        : <TrendingUp className="w-3 h-3" />
      }
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function ProductCard({ product }: { product: Product }) {
  const hasPrice = product.current_price !== null;
  const price = hasPrice
    ? parseFloat(product.current_price!).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : null;

  return (
    <a
      href={product.product_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 bg-white rounded-2xl border border-zinc-200 p-3.5 hover:border-indigo-200 hover:shadow-card-hover transition-all duration-200 active:scale-[0.98]"
    >
      {/* Image */}
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className="w-16 h-16 object-contain rounded-xl shrink-0 bg-zinc-50 border border-zinc-100"
        />
      ) : (
        <div className="w-16 h-16 rounded-xl shrink-0 bg-zinc-50 border border-zinc-100 flex items-center justify-center">
          <PackageSearch className="w-6 h-6 text-zinc-300" strokeWidth={1.5} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-800 leading-snug line-clamp-2 group-hover:text-indigo-700 transition-colors">
          {product.name}
        </p>
        <div className="flex items-center gap-1 mt-1.5">
          <Clock className="w-3 h-3 text-zinc-300 shrink-0" />
          <span className="text-[11px] text-zinc-400">{relativeTime(product.last_updated)}</span>
          {product.variation_7d_pct !== null && (
            <span className="text-[11px] text-zinc-300">· 7 dias</span>
          )}
        </div>
      </div>

      {/* Price + badge */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {price ? (
          <span className="text-lg font-bold text-zinc-900 tabular-nums">{price}</span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
            Ver <ExternalLink className="w-3 h-3" />
          </span>
        )}
        <VariationBadge pct={product.variation_7d_pct} />
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
    <div className="space-y-5">
      {/* Global toggle */}
      <div className="flex justify-end">
        <button
          onClick={toggleAll}
          className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700 bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-full transition-colors"
        >
          <ChevronsUpDown className="w-3.5 h-3.5" />
          {allCollapsed ? "Expandir todas" : "Recolher todas"}
        </button>
      </div>

      {/* Categories */}
      {categories.map((category) => {
        const items = byCategory[category];
        const isCollapsed = !!collapsed[category];
        const dotColor = CATEGORY_COLORS[category] ?? "bg-zinc-400";

        return (
          <section key={category}>
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category)}
              className="flex items-center justify-between w-full mb-3 group"
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  {category}
                </span>
                <span className="text-xs font-semibold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-full">
                  {items.length}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
              />
            </button>

            {/* Product cards */}
            {!isCollapsed && (
              <div className="space-y-2.5">
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
