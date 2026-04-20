import postgres from "postgres";

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

function VariationBadge({ pct }: { pct: string | null }) {
  if (pct === null) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 font-medium">
        —
      </span>
    );
  }
  const value = parseFloat(pct);
  const isDrop = value < 0;
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
        isDrop
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-600"
      }`}
    >
      {isDrop ? "↓" : "↑"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function ProductCard({ product }: { product: Product }) {
  const price = product.current_price
    ? `R$ ${parseFloat(product.current_price).toFixed(2).replace(".", ",")}`
    : "—";

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
          <span className="text-xl font-bold text-slate-900">{price}</span>
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
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          Object.entries(byCategory).map(([category, items]) => (
            <section key={category}>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 px-1">
                {category}
              </h2>
              <div className="space-y-3">
                {items.map((p) => (
                  <ProductCard key={p.name} product={p} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      <footer className="max-w-lg mx-auto px-4 py-6 text-center">
        <p className="text-xs text-slate-300">Argus</p>
      </footer>
    </div>
  );
}
