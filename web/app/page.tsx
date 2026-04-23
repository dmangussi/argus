import postgres from "postgres";
import { Eye, Clock, Settings } from "lucide-react";
import CategoryList from "./CategoryList";

export const dynamic = "force-dynamic";

type Product = {
  name: string;
  category: string | null;
  product_url: string;
  current_price: string | null;
  last_updated: Date | null;
  image_url: string | null;
  price_history: number[] | null;
};

async function getProducts(): Promise<Product[]> {
  const sql = postgres(process.env.DATABASE_URL!);
  try {
    return await sql<Product[]>`
      SELECT
        ps.name, ps.category, ps.product_url, ps.image_url,
        ps.current_price, ps.last_updated,
        hist.data as price_history
      FROM v_products_summary ps
      LEFT JOIN LATERAL (
        SELECT json_agg(price ORDER BY collected_at ASC) AS data
        FROM price_history
        WHERE product_id = ps.id
          AND collected_at >= now() - interval '30 days'
      ) hist ON true
      WHERE ps.is_active = true
      ORDER BY ps.category NULLS LAST, ps.name
    `;
  } finally {
    await sql.end();
  }
}

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

export default async function HomePage() {
  const products = await getProducts();

  const byCategory = products.reduce<Record<string, Product[]>>((acc, p) => {
    const cat = p.category ?? "Outros";
    (acc[cat] ??= []).push(p);
    return acc;
  }, {});

  const lastUpdate = products.find((p) => p.last_updated)?.last_updated ?? null;

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl btn-brand flex items-center justify-center shrink-0">
              <Eye className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-900 leading-none">Argus</h1>
              <p className="text-[10px] text-zinc-400 mt-0.5 leading-none tracking-wide">monitor de preços</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-zinc-100 rounded-full px-3 py-1.5">
              <Clock className="w-3 h-3 text-zinc-400" />
              <span className="text-[11px] text-zinc-500 font-medium">{relativeTime(lastUpdate)}</span>
            </div>
            <a
              href="/admin"
              title="Admin"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <Settings className="w-4.5 h-4.5" strokeWidth={1.75} />
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-5 space-y-6">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
              <Eye className="w-8 h-8 text-zinc-300" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-zinc-600">Nenhum produto ainda</p>
            <p className="text-xs text-zinc-400 mt-1">
              Execute <code className="bg-zinc-100 px-1.5 py-0.5 rounded-md font-mono">python main.py --once</code> para coletar
            </p>
          </div>
        ) : (
          <CategoryList byCategory={byCategory} />
        )}
      </main>

      <footer className="max-w-lg mx-auto px-4 py-8 text-center">
        <p className="text-xs text-zinc-300 font-medium tracking-widest uppercase">Argus</p>
      </footer>
    </div>
  );
}
