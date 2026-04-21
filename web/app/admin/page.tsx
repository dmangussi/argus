import postgres from "postgres";
import { Eye, Home } from "lucide-react";
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
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl btn-brand flex items-center justify-center shrink-0">
              <Eye className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2 leading-none">
                <h1 className="text-base font-bold text-zinc-900">Argus</h1>
                <span className="text-[11px] font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {products.length} produto{products.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/"
              title="Ver painel"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <Home className="w-4.5 h-4.5" strokeWidth={1.75} />
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
