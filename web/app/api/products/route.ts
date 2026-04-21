import postgres from "postgres";
import { NextResponse } from "next/server";

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function nameFromUrl(product_url: string): string {
  try {
    const url = new URL(product_url);
    const search = url.searchParams.get("search");
    if (search) {
      return search
        .replace(/\+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ").map((w) => w ? w[0].toUpperCase() + w.slice(1) : w).join(" ");
    }
    return url.hostname.replace(/^www\./, "");
  } catch {
    return product_url;
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { product_url } = body;

  if (!product_url) {
    return NextResponse.json({ error: "product_url é obrigatório" }, { status: 400 });
  }

  const name = nameFromUrl(product_url);
  const slug = slugify(name);
  const category: string | null = body.category ?? null;
  const price_selector: string = body.price_selector ?? ".preco";
  const sql = postgres(process.env.DATABASE_URL!);

  try {
    const [product] = await sql`
      INSERT INTO products (slug, name, category, product_url, price_selector, is_active)
      VALUES (${slug}, ${name}, ${category ?? null}, ${product_url}, ${price_selector ?? ".preco"}, true)
      RETURNING id, slug, name
    `;
    return NextResponse.json(product, { status: 201 });
  } catch (e: any) {
    if (e.code === "23505") {
      return NextResponse.json({ error: "Já existe um produto com esse nome (slug duplicado)" }, { status: 409 });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  } finally {
    await sql.end();
  }
}
