"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "./page";

const CATEGORIES = [
  "Hortifruti",
  "Padaria",
  "Açougue",
  "Laticínios e Frios",
  "Mercearia",
  "Congelados",
  "Bebidas",
  "Higiene",
  "Limpeza",
  "Pet Shop",
] as const;

type Props = {
  products?: Product[];
  logoutOnly?: boolean;
};

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
        className="text-slate-400 hover:text-red-500 transition-colors"
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <AddProductForm onAdded={() => router.refresh()} />
      <ProductList products={products} onChanged={() => router.refresh()} />
    </div>
  );
}

function AddProductForm({ onAdded }: { onAdded: () => void }) {
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <h2 className="text-sm font-semibold text-slate-700 mb-4">Adicionar produto</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="url"
          placeholder="Cole a URL do produto *"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700"
        >
          <option value="">Categoria (opcional)</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl py-2 text-sm transition-colors disabled:opacity-50"
        >
          {loading ? "Salvando..." : "Adicionar"}
        </button>
      </form>
    </div>
  );
}

function ProductList({ products, onChanged }: { products: Product[]; onChanged: () => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState(false);

  async function handleToggle(p: Product) {
    setLoading((l) => ({ ...l, [p.id]: true }));
    await fetch(`/api/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: p.name,
        category: p.category,
        product_url: p.product_url,
        price_selector: p.price_selector,
        is_active: !p.is_active,
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

  async function handleDelete(p: Product) {
    setLoading((l) => ({ ...l, [p.id]: true }));
    setErrors((e) => ({ ...e, [p.id]: "" }));
    const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    if (res.status === 409) {
      const data = await res.json();
      setErrors((e) => ({ ...e, [p.id]: data.error }));
    } else {
      onChanged();
    }
    setLoading((l) => ({ ...l, [p.id]: false }));
  }

  if (products.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-8">
        Nenhum produto cadastrado ainda.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-between w-full px-1 group"
      >
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Produtos cadastrados ({products.length})
        </h2>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${collapsed ? "-rotate-90" : ""}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {!collapsed && products.map((p) => (
        <div
          key={p.id}
          className={`bg-white rounded-2xl shadow-sm border px-4 py-3 ${
            p.is_active ? "border-slate-100" : "border-slate-100 opacity-50"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 leading-snug">{p.name}</p>
              <select
                value={p.category ?? ""}
                disabled={loading[p.id]}
                onChange={(e) => handleCategoryChange(p, e.target.value)}
                className="text-xs text-slate-400 mt-0.5 bg-transparent border-none outline-none cursor-pointer hover:text-slate-600 disabled:opacity-50"
              >
                <option value="" disabled>Sem categoria</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleToggle(p)}
                disabled={loading[p.id]}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                  p.is_active
                    ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {p.is_active ? "Ativo" : "Inativo"}
              </button>
              <button
                onClick={() => handleDelete(p)}
                disabled={loading[p.id]}
                className="text-xs px-3 py-1 rounded-full font-medium bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
          {errors[p.id] && (
            <p className="text-xs text-red-500 mt-2">{errors[p.id]}</p>
          )}
        </div>
      ))}
    </div>
  );
}
