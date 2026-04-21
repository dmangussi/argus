import postgres from "postgres";
import CategoryList from "./CategoryList";

export const dynamic = "force-dynamic";

type Product = {
  name: string;
  category: string | null;
  product_url: string;
  current_price: string | null;
  last_updated: Date | null;
  variation_7d_pct: string | null;
  image_url: string | null;
};

async function getProducts(): Promise<Product[]> {
  const sql = postgres(process.env.DATABASE_URL!);
  try {
    return await sql<Product[]>`
      SELECT name, category, product_url, image_url,
             current_price, last_updated, variation_7d_pct
      FROM v_products_summary
      WHERE is_active = true
      ORDER BY category NULLS LAST, name
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
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-blue-600 leading-none flex items-center gap-1.5">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Argus
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {products.length} produto{products.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-slate-400">última coleta</p>
              <p className="text-xs font-medium text-slate-600">{relativeTime(lastUpdate)}</p>
            </div>
            <a href="/admin" title="Admin" className="text-slate-400 hover:text-blue-600 transition-colors">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6"/><circle cx="8" cy="6" r="2" fill="white"/>
                <line x1="4" y1="12" x2="20" y2="12"/><circle cx="16" cy="12" r="2" fill="white"/>
                <line x1="4" y1="18" x2="20" y2="18"/><circle cx="8" cy="18" r="2" fill="white"/>
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-5 space-y-6">
        {products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-sm">Nenhum produto coletado ainda.</p>
            <p className="text-slate-400 text-xs mt-1">
              Execute: <code className="bg-slate-100 px-1 rounded">python main.py --once</code>
            </p>
          </div>
        ) : (
          <CategoryList byCategory={byCategory} />
        )}
      </main>

      <footer className="max-w-lg mx-auto px-4 py-6 text-center">
        <p className="text-xs text-slate-300">Argus</p>
      </footer>
    </div>
  );
}
