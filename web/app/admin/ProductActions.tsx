"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  LogOut, Plus, Link2, Tag, AlertCircle, Loader2,
  ChevronDown, Trash2, CircleDot, Circle, Play, CheckCircle2,
} from "lucide-react";
import type { Product } from "./page";

const CATEGORIES = [
  "Hortifruti", "Padaria", "Açougue", "Laticínios e Frios",
  "Mercearia", "Congelados", "Bebidas", "Higiene", "Limpeza", "Pet Shop",
] as const;

function ConfirmModal({
  product,
  onConfirm,
  onCancel,
}: {
  product: Product;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-3xl shadow-elevated border border-zinc-100 w-full max-w-sm p-8 animate-fade-up space-y-5">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-rose-500" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900">Excluir produto</h3>
            <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">
              <span className="font-semibold text-zinc-700">{product.name}</span> será removido permanentemente, incluindo todo o histórico de preços.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-rose-500 hover:bg-rose-600 text-white transition-colors"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

type Props = { products?: Product[]; logoutOnly?: boolean };

export default function ProductActions({ products = [], logoutOnly = false }: Props) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  if (logoutOnly) {
    return (
      <button
        onClick={handleLogout}
        title="Sair"
        className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
      >
        <LogOut className="w-4 h-4" strokeWidth={1.75} />
      </button>
    );
  }

  return (
    <div className="space-y-5">
      <AddProductForm onAdded={() => router.refresh()} />
      <ScrapeNowButton />
      <ProductList products={products} onChanged={() => router.refresh()} />
    </div>
  );
}

function ScrapeNowButton() {
  const [scraping, setScraping] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleScrape() {
    setScraping(true);
    setStatus("idle");
    const res = await fetch("/api/scrape", { method: "POST" });
    if (res.ok) {
      setStatus("ok");
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error || `Erro ${res.status}`);
      setStatus("error");
    }
    setScraping(false);
    setTimeout(() => setStatus("idle"), 4000);
  }

  return (
    <div className="bg-white rounded-2xl shadow-card border border-zinc-200 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-zinc-800">Coletar agora</p>
          <p className="text-xs text-zinc-400 mt-0.5">Dispara uma coleta de preços imediatamente</p>
        </div>
        <button
          onClick={handleScrape}
          disabled={scraping}
          className="btn-brand text-white font-semibold rounded-xl px-4 py-2 text-sm disabled:opacity-60 flex items-center gap-2 shrink-0"
        >
          {scraping
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Disparando...</>
            : <><Play className="w-4 h-4" strokeWidth={2} /> Coletar</>
          }
        </button>
      </div>

      {status === "ok" && (
        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 mt-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <p className="text-xs font-medium">Coleta disparada — acompanhe em Actions</p>
        </div>
      )}
      {status === "error" && (
        <div className="flex items-center gap-2 text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5 mt-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="text-xs font-medium">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}

function AddProductForm({ onAdded }: { onAdded: () => void }) {
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_url: url, category: category || null }),
    });

    if (res.ok) {
      setUrl("");
      setCategory("");
      onAdded();
    } else {
      const data = await res.json();
      setError(data.error || "Erro ao adicionar produto");
    }
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow-card border border-zinc-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg btn-brand flex items-center justify-center">
          <Plus className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
        </div>
        <h2 className="text-sm font-bold text-zinc-800">Novo produto</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* URL input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">URL do produto</label>
          <div className="relative">
            <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
            />
          </div>
        </div>

        {/* Category select */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Categoria</label>
          <div className="relative">
            <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 rounded-xl text-sm text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow appearance-none"
            >
              <option value="">Selecionar categoria (opcional)</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="text-xs font-medium">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-brand w-full text-white font-semibold rounded-xl py-2.5 text-sm disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
          ) : (
            <><Plus className="w-4 h-4" strokeWidth={2.5} /> Adicionar</>
          )}
        </button>
      </form>
    </div>
  );
}

function ProductList({ products, onChanged }: { products: Product[]; onChanged: () => void }) {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);

  async function handleToggle(p: Product) {
    setLoading((l) => ({ ...l, [p.id]: true }));
    await fetch(`/api/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: p.name, category: p.category, product_url: p.product_url,
        price_selector: p.price_selector, is_active: !p.is_active,
      }),
    });
    setLoading((l) => ({ ...l, [p.id]: false }));
    onChanged();
  }

  async function handleCategoryChange(p: Product, category: string) {
    setLoading((l) => ({ ...l, [p.id]: true }));
    await fetch(`/api/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category }),
    });
    setLoading((l) => ({ ...l, [p.id]: false }));
    onChanged();
  }

  async function confirmDelete(p: Product) {
    setPendingDelete(null);
    setLoading((l) => ({ ...l, [p.id]: true }));
    await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    setLoading((l) => ({ ...l, [p.id]: false }));
    onChanged();
  }

  if (products.length === 0) {
    return (
      <p className="text-sm text-zinc-400 text-center py-8">
        Nenhum produto cadastrado ainda.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-between w-full px-1 py-1 group"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Produtos cadastrados</span>
          <span className="text-xs font-semibold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-full">{products.length}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
        />
      </button>

      {/* List */}
      {!collapsed && products.map((p) => (
        <div
          key={p.id}
          className={`bg-white rounded-2xl border border-zinc-200 px-4 py-3 transition-opacity ${
            loading[p.id] ? "opacity-60" : ""
          } ${!p.is_active ? "opacity-50" : ""}`}
        >
          <div className="flex items-center gap-3">
            {/* Status dot */}
            {p.is_active
              ? <CircleDot className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={1.75} />
              : <Circle className="w-4 h-4 text-zinc-300 shrink-0" strokeWidth={1.75} />
            }

            {/* Name + category */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-800 truncate">{p.name}</p>
              <select
                value={p.category ?? ""}
                disabled={loading[p.id]}
                onChange={(e) => handleCategoryChange(p, e.target.value)}
                className="text-xs text-zinc-400 mt-0.5 bg-transparent border-none outline-none cursor-pointer hover:text-zinc-600 disabled:opacity-50 -ml-0.5"
              >
                <option value="" disabled>Sem categoria</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleToggle(p)}
                disabled={loading[p.id]}
                className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${
                  p.is_active
                    ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                    : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                }`}
              >
                {loading[p.id]
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : p.is_active ? "Ativo" : "Inativo"
                }
              </button>
              <button
                onClick={() => setPendingDelete(p)}
                disabled={loading[p.id]}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-40"
                title="Excluir produto"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>
      ))}

      {pendingDelete && createPortal(
        <ConfirmModal
          product={pendingDelete}
          onConfirm={() => confirmDelete(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />,
        document.body
      )}
    </div>
  );
}
