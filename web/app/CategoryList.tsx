"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronsUpDown,
  Clock,
  ExternalLink,
  PackageSearch,
  Search,
  X,
} from "lucide-react";

type Product = {
  name: string;
  category: string | null;
  product_url: string;
  current_price: string | null;
  last_updated: Date | null;
  image_url: string | null;
  price_history: number[] | null;
};

function Sparkline({ prices }: { prices: number[] }) {
  if (prices.length < 2) return null;

  const W = 72;
  const H = 22;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const pts = prices
    .map((p, i) => {
      const x = (i / (prices.length - 1)) * W;
      const y = H - ((p - min) / range) * (H - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const first = prices[0];
  const last = prices[prices.length - 1];
  const color = last < first ? "#10B981" : last > first ? "#F43F5E" : "#A1A1AA";

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  );
}

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

function VariationBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const value = pct;
  const isFlat = Math.abs(value) < 0.05;
  const isDrop = value < 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-semibold tabular-nums ${
        isFlat
          ? "bg-zinc-100 text-zinc-400"
          : isDrop
          ? "bg-emerald-50 text-emerald-700"
          : "bg-rose-50 text-rose-600"
      }`}
    >
      {isFlat ? "→" : isDrop ? "↓" : "↑"} {Math.abs(value).toFixed(1).replace(".", ",")}%
    </span>
  );
}

type FilterType = "all" | "drop" | "rise" | "stable";

function fmt(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function productPct(p: Product): number | null {
  const h = p.price_history;
  return h && h.length >= 2 ? ((h[h.length - 1] - h[0]) / h[0]) * 100 : null;
}

function matchesFilter(p: Product, f: FilterType): boolean {
  if (f === "all") return true;
  const pct = productPct(p);
  if (f === "stable") return pct === null || Math.abs(pct) <= 0.5;
  if (f === "drop") return pct !== null && pct < -0.5;
  if (f === "rise") return pct !== null && pct > 0.5;
  return true;
}

function ProductCard({ product }: { product: Product }) {
  const [nameExpanded, setNameExpanded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const hasPrice = product.current_price !== null;
  const currentNum = hasPrice ? parseFloat(product.current_price!) : null;
  const price = currentNum !== null ? fmt(currentNum) : null;

  const h = product.price_history;
  const effectivePct = productPct(product);

  const stats = h && h.length >= 2 && currentNum !== null ? (() => {
    const avg = h.reduce((a, b) => a + b, 0) / h.length;
    const min = Math.min(...h);
    const max = Math.max(...h);
    const aboveMin = min > 0 ? ((currentNum - min) / min) * 100 : null;
    return { avg, min, max, aboveMin };
  })() : null;

  const toggleDetails = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDetailsOpen((v) => !v);
  };

  return (
    <a
      href={product.product_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col bg-white rounded-2xl border border-zinc-200 p-3.5 hover:border-indigo-200 hover:shadow-card-hover transition-all duration-200 active:scale-[0.98]"
    >
      <div className="flex items-center gap-3">
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
          <p
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setNameExpanded((v) => !v); }}
            className={`text-sm font-semibold text-zinc-800 leading-snug group-hover:text-indigo-700 transition-colors cursor-pointer ${nameExpanded ? "" : "line-clamp-2"}`}
          >
            {product.name}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3 text-zinc-300 shrink-0" />
            <span className="text-[11px] text-zinc-400" suppressHydrationWarning>{relativeTime(product.last_updated)}</span>
          </div>
          {h && h.length >= 2 && (
            <div className="mt-1.5 cursor-pointer" onClick={toggleDetails}>
              <Sparkline prices={h} />
            </div>
          )}
        </div>

        {/* Price + badge */}
        <div
          className="flex flex-col items-end gap-1.5 shrink-0 cursor-pointer"
          onClick={toggleDetails}
        >
          {price ? (
            <span className="text-lg font-bold text-zinc-900 tabular-nums">{price}</span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
              Ver <ExternalLink className="w-3 h-3" />
            </span>
          )}
          <VariationBadge pct={effectivePct} />
        </div>
      </div>

      {/* Expanded stats */}
      {detailsOpen && stats && (
        <div className="mt-3 pt-3 border-t border-zinc-100">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-0.5">Média 30d</p>
              <p className="text-sm font-semibold text-zinc-700 tabular-nums">{fmt(stats.avg)}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-0.5">Menor</p>
              <p className="text-sm font-semibold text-emerald-600 tabular-nums">{fmt(stats.min)}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide mb-0.5">Maior</p>
              <p className="text-sm font-semibold text-rose-500 tabular-nums">{fmt(stats.max)}</p>
            </div>
          </div>
          {stats.aboveMin !== null && (
            <p className="mt-2.5 text-center text-[11px] font-medium tabular-nums">
              {Math.abs(stats.aboveMin) < 0.5 ? (
                <span className="text-emerald-600">Menor preço dos últimos 30 dias</span>
              ) : (
                <span className="text-zinc-500">
                  <span className="text-rose-500">↑ {stats.aboveMin.toFixed(1).replace(".", ",")}%</span>
                  {" acima do menor preço registrado"}
                </span>
              )}
            </p>
          )}
        </div>
      )}
    </a>
  );
}

const FILTER_LABELS: Record<FilterType, string> = {
  all:    "Todos",
  drop:   "↓ Baixaram",
  rise:   "↑ Subiram",
  stable: "→ Estáveis",
};

const FILTER_STYLES: Record<FilterType, { active: string; inactive: string }> = {
  all:    { active: "bg-indigo-600 text-white",         inactive: "bg-zinc-100 text-zinc-500 hover:bg-zinc-200" },
  drop:   { active: "bg-emerald-500 text-white",        inactive: "bg-zinc-100 text-zinc-500 hover:bg-zinc-200" },
  rise:   { active: "bg-rose-500 text-white",           inactive: "bg-zinc-100 text-zinc-500 hover:bg-zinc-200" },
  stable: { active: "bg-zinc-500 text-white",           inactive: "bg-zinc-100 text-zinc-500 hover:bg-zinc-200" },
};

export default function CategoryList({ byCategory }: { byCategory: Record<string, Product[]> }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const allProducts = Object.values(byCategory).flat();
  const filterCounts: Record<FilterType, number> = {
    all:    allProducts.length,
    drop:   allProducts.filter((p) => matchesFilter(p, "drop")).length,
    rise:   allProducts.filter((p) => matchesFilter(p, "rise")).length,
    stable: allProducts.filter((p) => matchesFilter(p, "stable")).length,
  };

  const filtered = Object.fromEntries(
    Object.entries(byCategory)
      .map(([cat, items]) => [
        cat,
        items.filter((p) => {
          const matchesSearch = !query.trim() || p.name.toLowerCase().includes(query.toLowerCase());
          return matchesSearch && matchesFilter(p, activeFilter);
        }),
      ])
      .filter(([, items]) => (items as Product[]).length > 0)
  ) as Record<string, Product[]>;

  const visibleCategories = Object.keys(filtered);
  const allCollapsed = visibleCategories.every((c) => collapsed[c]);

  function toggleAll() {
    if (allCollapsed) {
      setCollapsed({});
    } else {
      setCollapsed(Object.fromEntries(visibleCategories.map((c) => [c, true])));
    }
  }

  function toggleCategory(cat: string) {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  const totalResults = visibleCategories.reduce(
    (acc, cat) => acc + filtered[cat].length,
    0
  );

  return (
    <div className="space-y-5">
      {/* Search + controls row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Buscar produto..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={toggleAll}
          className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700 bg-zinc-100 hover:bg-zinc-200 px-3 py-2 rounded-xl transition-colors"
        >
          <ChevronsUpDown className="w-3.5 h-3.5" />
          {allCollapsed ? "Expandir" : "Recolher"}
        </button>
      </div>

      {/* Filter badges */}
      <div className="flex gap-2 -mt-2">
        {(Object.keys(FILTER_LABELS) as FilterType[]).map((f) => {
          const isActive = activeFilter === f;
          const styles = FILTER_STYLES[f];
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`flex-1 inline-flex justify-center items-center gap-1.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${isActive ? styles.active : styles.inactive}`}
            >
              {FILTER_LABELS[f]}
              <span className={`text-[10px] font-bold px-1 py-0.5 rounded-full ${isActive ? "bg-white/20" : "bg-zinc-200 text-zinc-400"}`}>
                {filterCounts[f]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Results count */}
      {query && totalResults > 0 && (
        <p className="text-xs text-zinc-400 -mt-2">
          {totalResults} resultado{totalResults !== 1 ? "s" : ""} para{" "}
          <span className="font-medium text-zinc-600">"{query}"</span>
        </p>
      )}

      {/* No results */}
      {visibleCategories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <PackageSearch className="w-10 h-10 text-zinc-300 mb-3" strokeWidth={1.5} />
          <p className="text-sm font-medium text-zinc-500">Nenhum produto encontrado</p>
          <p className="text-xs text-zinc-400 mt-1">Tente outro termo</p>
        </div>
      )}

      {/* Categories */}
      {visibleCategories.map((category) => {
        const items = filtered[category];
        const isCollapsed = !!collapsed[category];
        const dotColor = CATEGORY_COLORS[category] ?? "bg-zinc-400";

        return (
          <section key={category}>
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
