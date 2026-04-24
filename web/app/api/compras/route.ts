import postgres from "postgres";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getSessionId(request: Request): string | null {
  return (request as NextRequest).cookies.get("argus_cart_session")?.value ?? null;
}

export async function GET(request: Request) {
  const sessionId = getSessionId(request);
  if (!sessionId) return NextResponse.json([]);

  const sql = postgres(process.env.DATABASE_URL!);
  try {
    const purchases = await sql`
      SELECT
        p.id,
        p.store_name,
        p.purchase_date,
        p.created_at,
        COALESCE(SUM(pi.unit_price_paid * pi.quantity), 0) AS total_paid,
        COALESCE(SUM(pi.argus_price * pi.quantity), 0)     AS total_argus,
        COUNT(pi.id)                                        AS item_count
      FROM purchases p
      LEFT JOIN purchase_items pi ON pi.purchase_id = p.id
      WHERE p.session_id = ${sessionId}
      GROUP BY p.id
      ORDER BY p.purchase_date DESC, p.created_at DESC
    `;
    return NextResponse.json(purchases);
  } finally {
    await sql.end();
  }
}

export async function POST(request: Request) {
  const sessionId = getSessionId(request);
  if (!sessionId) {
    return NextResponse.json({ error: "sessão não encontrada" }, { status: 400 });
  }

  const body = await request.json();
  const { store_name, purchase_date, items } = body;

  if (!store_name || !items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "store_name e items obrigatórios" }, { status: 400 });
  }

  const sql = postgres(process.env.DATABASE_URL!);
  try {
    const [purchase] = await sql`
      INSERT INTO purchases (session_id, store_name, purchase_date)
      VALUES (${sessionId}, ${store_name}, ${purchase_date ?? new Date().toISOString().slice(0, 10)})
      RETURNING id
    `;

    for (const item of items) {
      await sql`
        INSERT INTO purchase_items
          (purchase_id, product_id, product_name, quantity, unit_price_paid, argus_price)
        VALUES (
          ${purchase.id},
          ${item.product_id ?? null}::uuid,
          ${item.product_name},
          ${item.quantity ?? 1},
          ${item.unit_price_paid},
          ${item.argus_price ?? null}
        )
      `;
    }

    // Zera a lista ativa da sessão
    const lists = await sql`
      SELECT id FROM shopping_lists WHERE session_id = ${sessionId} LIMIT 1
    `;
    if (lists.length > 0) {
      await sql`DELETE FROM shopping_list_items WHERE shopping_list_id = ${lists[0].id}`;
    }

    const totalPaid = items.reduce((s: number, i: any) => s + (i.unit_price_paid * (i.quantity ?? 1)), 0);
    const totalArgus = items.reduce((s: number, i: any) => s + ((i.argus_price ?? 0) * (i.quantity ?? 1)), 0);
    const diffPct = totalArgus > 0 ? ((totalPaid - totalArgus) / totalArgus) * 100 : null;

    return NextResponse.json({ id: purchase.id, total_paid: totalPaid, total_argus: totalArgus, diff_pct: diffPct }, { status: 201 });
  } finally {
    await sql.end();
  }
}
