import postgres from "postgres";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const sql = postgres(process.env.DATABASE_URL!);
  try {
    const rows = await sql`
      SELECT name, category, product_url, price_selector, is_active
      FROM products WHERE id = ${id}::uuid
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }
    const ex = rows[0];
    const merged = {
      name:           "name"           in body ? body.name           : ex.name,
      category:       "category"       in body ? body.category       : ex.category,
      product_url:    "product_url"    in body ? body.product_url    : ex.product_url,
      price_selector: "price_selector" in body ? body.price_selector : (ex.price_selector ?? ".preco"),
      is_active:      "is_active"      in body ? body.is_active      : ex.is_active,
    };
    const result = await sql`
      UPDATE products SET
        name           = ${merged.name},
        category       = ${merged.category ?? null},
        product_url    = ${merged.product_url},
        price_selector = ${merged.price_selector},
        is_active      = ${merged.is_active},
        updated_at     = now()
      WHERE id = ${id}::uuid
      RETURNING id
    `;
    if (result.length === 0) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } finally {
    await sql.end();
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = postgres(process.env.DATABASE_URL!);
  try {
    await sql`DELETE FROM products WHERE id = ${id}::uuid`;
    return new NextResponse(null, { status: 204 });
  } finally {
    await sql.end();
  }
}
