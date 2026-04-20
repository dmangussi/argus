import postgres from "postgres";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, category, product_url, price_selector, is_active } = body;

  const sql = postgres(process.env.DATABASE_URL!);
  try {
    const result = await sql`
      UPDATE products SET
        name           = ${name},
        category       = ${category ?? null},
        product_url    = ${product_url},
        price_selector = ${price_selector ?? ".preco"},
        is_active      = ${is_active},
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
    const [{ count }] = await sql`
      SELECT COUNT(*)::int AS count FROM price_history WHERE product_id = ${id}::uuid
    `;
    if (count > 0) {
      return NextResponse.json({ error: "Produto tem histórico de preços" }, { status: 409 });
    }
    await sql`DELETE FROM products WHERE id = ${id}::uuid`;
    return new NextResponse(null, { status: 204 });
  } finally {
    await sql.end();
  }
}
