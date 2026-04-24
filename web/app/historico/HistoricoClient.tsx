"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronDown, History, PackageSearch } from "lucide-react";

type Purchase = {
  id: string;
  store_name: string;
  purchase_date: string;
  created_at: string;
  total_paid: string;
  total_argus: string;
  item_count: string;
};

type PurchaseItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price_paid: string;
  argus_price: string | null;
};

type PurchaseDetail = Purchase & { items: PurchaseItem[] };

function fmt(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function DiffBadge({ paid, argus }: { paid: number; argus: number }) {
  if (argus === 0) return null;
  const diff = paid - argus;
  const pct = (diff / argus) * 100;
  const saved = diff < 0;
  return (
    <div className={`text-right ${saved ? "text-emerald-600" : "text-rose-500"}`}>
      <p className="text-sm font-bold tabular-nums">
        {saved ? "−" : "+"}
        {fmt(Math.abs(diff))}
      </p>
      <p className="text-[10px] font-semibold">
        {saved ? "economizou" : "pagou mais"} {Math.abs(pct).toFixed(1)}%
      </p>
    </div>
  );
}

function PurchaseCard({ purchase }: { purchase: Purchase }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const paid = parseFloat(purchase.total_paid);
  const argus = parseFloat(purchase.total_argus);
  const date = new Date(purchase.purchase_date + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  async function toggleExpand() {
    if (!expanded && !detail) {
      setLoadingDetail(true);
      const res = await fetch(`/api/compras/${purchase.id}`);
      const data = await res.json();
      setDetail(data);
      setLoadingDetail(false);
    }
    setExpanded((v) => !v);
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
      <button
        onClick={toggleExpand}
        className="w-full p-4 flex items-center gap-3 text-left hover:bg-zinc-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <p className="text-sm font-bold text-zinc-800">{purchase.store_name}</p>
            <p className="text-[11px] text-zinc-400 shrink-0">{date}</p>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-base font-bold text-zinc-900 tabular-nums">{fmt(paid)}</p>
            {argus > 0 && (
              <p className="text-xs text-zinc-400 tabular-nums">Argus: {fmt(argus)}</p>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            {purchase.item_count} item{parseInt(purchase.item_count) !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <DiffBadge paid={paid} argus={argus} />
          <ChevronDown
            className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
              expanded ? "" : "-rotate-90"
            }`}
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-zinc-100">
          {loadingDetail ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : detail ? (
            <table className="w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-2">
                    Produto
                  </th>
                  <th className="text-right text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-2">
                    Argus
                  </th>
                  <th className="text-right text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-4 py-2">
                    Pago
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {detail.items.map((item) => {
                  const paid = parseFloat(item.unit_price_paid) * item.quantity;
                  const argusVal = item.argus_price
                    ? parseFloat(item.argus_price) * item.quantity
                    : null;
                  const diff = argusVal !== null ? paid - argusVal : null;
                  return (
                    <tr key={item.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-2.5">
                        <p className="text-xs font-medium text-zinc-700 line-clamp-1">
                          {item.product_name}
                        </p>
                        {item.quantity > 1 && (
                          <p className="text-[11px] text-zinc-400">×{item.quantity}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-zinc-500 tabular-nums">
                        {argusVal !== null ? fmt(argusVal) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        <span
                          className={`text-xs font-semibold ${
                            diff === null
                              ? "text-zinc-700"
                              : diff < 0
                              ? "text-emerald-600"
                              : diff > 0
                              ? "text-rose-500"
                              : "text-zinc-700"
                          }`}
                        >
                          {fmt(paid)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {argus > 0 && (
                <tfoot className="bg-zinc-50 border-t border-zinc-200">
                  <tr>
                    <td className="px-4 py-2.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      Total
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold text-zinc-600 tabular-nums">
                      {fmt(argus)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold tabular-nums">
                      <span className={paid < argus ? "text-emerald-600" : "text-rose-500"}>
                        {fmt(paid)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function HistoricoClient() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/compras", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setPurchases(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/lista"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            <h1 className="text-base font-bold text-zinc-900">Histórico de compras</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-3">
        {purchases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <PackageSearch className="w-10 h-10 text-zinc-300 mb-3" strokeWidth={1.5} />
            <p className="text-sm font-medium text-zinc-500">Nenhuma compra registrada</p>
            <p className="text-xs text-zinc-400 mt-1">
              Monte sua lista e finalize uma compra para ver a comparação aqui
            </p>
            <button
              onClick={() => router.push("/lista")}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Ver lista
            </button>
          </div>
        ) : (
          purchases.map((p) => <PurchaseCard key={p.id} purchase={p} />)
        )}
      </main>
    </div>
  );
}
