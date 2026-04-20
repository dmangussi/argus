import postgres from "postgres";
import ProductActions from "./ProductActions";

export const dynamic = "force-dynamic";

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  product_url: string;
  price_selector: string | null;
  is_active: boolean;
  created_at: Date;
};

async function getProducts(): Promise<Product[]> {
  const sql = postgres(process.env.DATABASE_URL!);
  try {
    return await sql<Product[]>`
      SELECT id, slug, name, category, product_url, price_selector, is_active, created_at
      FROM products
      ORDER BY created_at DESC
    `;
  } finally {
    await sql.end();
  }
}

export default async function AdminPage() {
  const products = await getProducts();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-emerald-600 leading-none">🛒 Argus</h1>
            <p className="text-xs text-slate-400 mt-0.5">Admin · {products.length} produto{products.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="text-xs text-slate-400 hover:text-emerald-600 transition-colors">
              Ver painel
            </a>
            <ProductActions products={products} logoutOnly />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <ProductActions products={products} />
      </main>
    </div>
  );
}
