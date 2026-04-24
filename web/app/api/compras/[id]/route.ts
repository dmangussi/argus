import postgres from "postgres";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionId = (request as NextRequest).cookies.get("argus_cart_session")?.value ?? null;
  if (!sessionId) {
    return NextResponse.json({ error: "Compra não encontrada" }, { status: 404 });
  }

  const sql = postgres(process.env.DATABASE_URL!);
  try {
    const purchases = await sql`
      SELECT id, store_name, purchase_date, created_at
      FROM purchases
      WHERE id = ${id}::uuid AND session_id = ${sessionId}
    `;
    if (purchases.length === 0) {
      return NextResponse.json({ error: "Compra não encontrada" }, { status: 404 });
    }

    const items = await sql`
      SELECT
        pi.id,
        pi.product_id,
        pi.product_name,
        pi.quantity,
        pi.unit_price_paid,
        pi.argus_price
      FROM purchase_items pi
      WHERE pi.purchase_id = ${id}::uuid
      ORDER BY pi.added_at ASC
    `;

    return NextResponse.json({ ...purchases[0], items });
  } finally {
    await sql.end();
  }
}
