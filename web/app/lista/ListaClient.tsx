"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Minus, PackageSearch, Plus, ShoppingCart, Trash2 } from "lucide-react";

type ListaItem = {
  id: string;
  product_id: string;
  name: string;
  category: string | null;
  quantity: number;
  current_price: string | null;
  image_url: string | null;
};

type InitialData = { id: string | null; items: ListaItem[] };

function fmt(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const CATEGORY_BORDERS: Record<string, string> = {
  "Hortifruti":         "border-l-emerald-300",
  "Padaria":            "border-l-amber-300",
  "Açougue":            "border-l-red-300",
  "Laticínios e Frios": "border-l-sky-300",
  "Mercearia":          "border-l-orange-300",
  "Congelados":         "border-l-cyan-300",
  "Bebidas":            "border-l-blue-300",
  "Higiene":            "border-l-pink-300",
  "Limpeza":            "border-l-teal-300",
  "Pet Shop":           "border-l-purple-300",
  "Outros":             "border-l-zinc-300",
};

export default function ListaClient({ initialData }: { initialData: InitialData }) {
  const router = useRouter();
  const [items, setItems] = useState<ListaItem[]>(initialData.items);
  const [paidPrices, setPaidPrices] = useState<Record<string, string>>({});

  // Detect stale router-cache state: if localStorage has no cart IDs but the
  // component was hydrated with items (purchase was registered in a previous visit),
  // clear the display so the user doesn't see a ghost list.
  useEffect(() => {
    try {
      const stored = localStorage.getItem("argus_cart_ids");
      const ids: string[] = stored ? JSON.parse(stored) : [];
      if (ids.length === 0 && items.length > 0) {
        setItems([]);
        window.dispatchEvent(new CustomEvent("cart-update", { detail: { count: 0 } }));
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  function dispatchCartUpdate(count: number) {
    window.dispatchEvent(new CustomEvent("cart-update", { detail: { count } }));
    if (count === 0) {
      try { localStorage.removeItem("argus_cart_ids"); } catch {}
    }
  }

  async function updateQuantity(productId: string, delta: number) {
    const item = items.find((i) => i.product_id === productId);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty < 1) return;
    setItems((prev) => prev.map((i) => (i.product_id === productId ? { ...i, quantity: newQty } : i)));
    fetch("/api/lista/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId, quantity: newQty }),
    });
  }

  async function removeItem(productId: string) {
    setItems((prev) => {
      const next = prev.filter((i) => i.product_id !== productId);
      dispatchCartUpdate(next.length);
      try {
        const stored = localStorage.getItem("argus_cart_ids");
        const ids: string[] = stored ? JSON.parse(stored) : [];
        localStorage.setItem("argus_cart_ids", JSON.stringify(ids.filter((id) => id !== productId)));
      } catch {}
      return next;
    });
    fetch("/api/lista/items", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId }),
    });
  }

  async function finalizarCompra() {
    if (!storeName.trim()) return;
    setSaving(true);

    const compraItems = items.map((item) => ({
      product_id: item.product_id,
      product_name: item.name,
      quantity: item.quantity,
      unit_price_paid: parseFloat(paidPrices[item.product_id]?.replace(",", ".") || "0"),
      argus_price: item.current_price ? parseFloat(item.current_price) : null,
    }));

    const res = await fetch("/api/compras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store_name: storeName, purchase_date: purchaseDate, items: compraItems }),
    });

    if (res.ok) {
      dispatchCartUpdate(0);
      // Hard navigation: clears the Next.js router cache so historico loads fresh
      // and lista / main page won't serve stale RSC payloads on back navigation.
      window.location.href = "/historico";
    } else {
      setSaving(false);
    }
  }

  const totalArgus = items.reduce((sum, item) => {
    return sum + (item.current_price ? parseFloat(item.current_price) : 0) * item.quantity;
  }, 0);

  const totalPago = items.reduce((sum, item) => {
    return sum + parseFloat(paidPrices[item.product_id]?.replace(",", ".") || "0") * item.quantity;
  }, 0);

  const anyPriceFilled = items.some((i) => parseFloat(paidPrices[i.product_id]?.replace(",", ".") || "0") > 0);

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-indigo-600" strokeWidth={2} />
            <h1 className="text-base font-bold text-zinc-900">Lista de compras</h1>
          </div>
          <div className="ml-auto">
            <Link href="/historico" className="text-xs font-medium text-zinc-400 hover:text-indigo-600 transition-colors">
              Histórico
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <PackageSearch className="w-10 h-10 text-zinc-300 mb-3" strokeWidth={1.5} />
            <p className="text-sm font-medium text-zinc-500">Lista vazia</p>
            <p className="text-xs text-zinc-400 mt-1">
              Adicione produtos usando o botão{" "}
              <ShoppingCart className="inline w-3.5 h-3.5 text-zinc-400" /> nos cards
            </p>
            <button
              onClick={() => router.push("/")}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Ver produtos
            </button>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="space-y-2">
              {[...items]
                .sort((a, b) => {
                  const catA = a.category ?? "Outros";
                  const catB = b.category ?? "Outros";
                  return catA.localeCompare(catB, "pt-BR") || a.name.localeCompare(b.name, "pt-BR");
                })
                .map((item) => {
                const argusUnit = item.current_price ? parseFloat(item.current_price) : null;
                const paidUnit = parseFloat(paidPrices[item.product_id]?.replace(",", ".") || "0");
                const hasPaid = paidUnit > 0;
                const diff = argusUnit && hasPaid ? (paidUnit - argusUnit) / argusUnit * 100 : null;
                const borderColor = CATEGORY_BORDERS[item.category ?? "Outros"] ?? "border-l-zinc-300";

                return (
                  <div key={item.product_id} className={`bg-white rounded-2xl border border-zinc-200 border-l-2 ${borderColor} p-3.5 space-y-3`}>
                    {/* Top row: image + name + delete */}
                    <div className="flex items-start gap-2.5">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-12 h-12 object-contain rounded-xl shrink-0 bg-zinc-50 border border-zinc-100"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl shrink-0 bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                          <PackageSearch className="w-5 h-5 text-zinc-300" strokeWidth={1.5} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-800 leading-snug">{item.name}</p>
                        {item.category && (
                          <p className="text-[11px] text-zinc-400 mt-0.5">{item.category}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(item.product_id)}
                        className="shrink-0 w-7 h-7 rounded-full text-zinc-300 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Bottom row: qty + argus + paid input */}
                    <div className="flex items-center gap-3">
                      {/* Quantity */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => updateQuantity(item.product_id, -1)}
                          className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center hover:bg-zinc-200 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold text-zinc-800 tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product_id, 1)}
                          className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center hover:bg-zinc-200 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Argus price */}
                      {argusUnit && (
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wide leading-none mb-0.5">Argus unit.</p>
                          <p className="text-sm font-semibold text-zinc-700 tabular-nums">{fmt(argusUnit)}</p>
                          {item.quantity > 1 && (
                            <p className="text-[10px] text-zinc-400 mt-0.5 tabular-nums">
                              total {fmt(argusUnit * item.quantity)}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Paid input */}
                      <div className="shrink-0">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wide leading-none mb-0.5">
                          {hasPaid && diff !== null
                            ? diff < -0.5
                              ? <span className="text-emerald-600">↓ {Math.abs(diff).toFixed(0)}%</span>
                              : diff > 0.5
                              ? <span className="text-rose-500">↑ {diff.toFixed(0)}%</span>
                              : "Igual"
                            : "Unit. pago"}
                        </p>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-zinc-400">R$</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            placeholder="0,00"
                            value={paidPrices[item.product_id] ?? ""}
                            onChange={(e) =>
                              setPaidPrices((prev) => ({ ...prev, [item.product_id]: e.target.value }))
                            }
                            className="w-20 px-2 py-1 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-right tabular-nums text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                          />
                        </div>
                        {item.quantity > 1 && (
                          <p className="text-[10px] text-zinc-400 text-right mt-0.5 tabular-nums">
                            {hasPaid ? `total ${fmt(paidUnit * item.quantity)}` : "total —"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="bg-indigo-50 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Total Argus</p>
                <p className="text-lg font-bold text-indigo-700 tabular-nums">{fmt(totalArgus)}</p>
              </div>
              {anyPriceFilled && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total pago</p>
                    <p className="text-lg font-bold text-zinc-700 tabular-nums">{fmt(totalPago)}</p>
                  </div>
                  <div className="border-t border-indigo-100 pt-2 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Diferença</p>
                    <p className={`text-base font-bold tabular-nums ${totalPago < totalArgus ? "text-emerald-600" : "text-rose-500"}`}>
                      {totalPago < totalArgus ? "−" : "+"}
                      {fmt(Math.abs(totalPago - totalArgus))}
                    </p>
                  </div>
                </>
              )}
              {!anyPriceFilled && (
                <p className="text-xs text-indigo-300">
                  {items.reduce((s, i) => s + i.quantity, 0)} item{items.reduce((s, i) => s + i.quantity, 0) !== 1 ? "s" : ""} · preencha os preços pagos para ver a comparação
                </p>
              )}
            </div>

            {/* Finalizar */}
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="w-full py-3 bg-zinc-900 text-white text-sm font-semibold rounded-2xl hover:bg-zinc-700 transition-colors"
              >
                Registrar compra realizada
              </button>
            ) : (
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 space-y-3">
                <p className="text-sm font-bold text-zinc-800">Confirmar compra</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                      Supermercado
                    </label>
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Ex: Carrefour"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                      Data
                    </label>
                    <input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-2.5 border border-zinc-200 text-sm font-medium text-zinc-500 rounded-xl hover:bg-zinc-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={finalizarCompra}
                    disabled={saving || !storeName.trim()}
                    className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
