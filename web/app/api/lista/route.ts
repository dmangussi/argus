import postgres from "postgres";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getSessionId(request: Request): string | null {
  return (request as NextRequest).cookies.get("argus_cart_session")?.value ?? null;
}

export async function GET(request: Request) {
  const sessionId = getSessionId(request);
  if (!sessionId) {
    return NextResponse.json({ id: null, items: [] });
  }

  const sql = postgres(process.env.DATABASE_URL!);
  try {
    const rows = await sql`
      SELECT
        sl.id                AS list_id,
        sli.id               AS item_id,
        sli.product_id,
        sli.quantity,
        sli.added_at,
        p.name,
        p.category,
        p.image_url,
        ps.current_price
      FROM shopping_lists sl
      LEFT JOIN shopping_list_items sli ON sli.shopping_list_id = sl.id
      LEFT JOIN products p ON p.id = sli.product_id
      LEFT JOIN v_products_summary ps ON ps.id = sli.product_id
      WHERE sl.session_id = ${sessionId}
      ORDER BY sli.added_at ASC NULLS LAST
    `;

    if (rows.length === 0) {
      return NextResponse.json({ id: null, items: [] });
    }

    const listId = rows[0].list_id;
    const items = rows
      .filter((r) => r.item_id !== null)
      .map((r) => ({
        id: r.item_id,
        product_id: r.product_id,
        quantity: r.quantity,
        name: r.name,
        category: r.category,
        image_url: r.image_url,
        current_price: r.current_price,
      }));

    return NextResponse.json({ id: listId, items });
  } finally {
    await sql.end();
  }
}

export async function DELETE(request: Request) {
  const sessionId = getSessionId(request);
  if (!sessionId) return new NextResponse(null, { status: 204 });

  const sql = postgres(process.env.DATABASE_URL!);
  try {
    const lists = await sql`
      SELECT id FROM shopping_lists WHERE session_id = ${sessionId} LIMIT 1
    `;
    if (lists.length > 0) {
      await sql`DELETE FROM shopping_list_items WHERE shopping_list_id = ${lists[0].id}`;
    }
    return new NextResponse(null, { status: 204 });
  } finally {
    await sql.end();
  }
}
