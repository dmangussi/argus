import postgres from "postgres";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getSessionId(request: Request): string | null {
  return (request as NextRequest).cookies.get("argus_cart_session")?.value ?? null;
}

async function getOrCreateList(sql: postgres.Sql, sessionId: string): Promise<string> {
  const lists = await sql`
    SELECT id FROM shopping_lists WHERE session_id = ${sessionId} LIMIT 1
  `;
  if (lists.length > 0) return lists[0].id;

  const [created] = await sql`
    INSERT INTO shopping_lists (session_id) VALUES (${sessionId}) RETURNING id
  `;
  return created.id;
}

export async function POST(request: Request) {
  const sessionId = getSessionId(request);
  if (!sessionId) {
    return NextResponse.json({ error: "sessão não encontrada" }, { status: 400 });
  }

  const body = await request.json();
  const { product_id, quantity = 1 } = body;
  if (!product_id) {
    return NextResponse.json({ error: "product_id obrigatório" }, { status: 400 });
  }

  const sql = postgres(process.env.DATABASE_URL!);
  try {
    const listId = await getOrCreateList(sql, sessionId);
    await sql`
      INSERT INTO shopping_list_items (shopping_list_id, product_id, quantity)
      VALUES (${listId}, ${product_id}::uuid, ${quantity})
      ON CONFLICT (shopping_list_id, product_id)
      DO UPDATE SET quantity = EXCLUDED.quantity
    `;
    return NextResponse.json({ ok: true });
  } finally {
    await sql.end();
  }
}

export async function DELETE(request: Request) {
  const sessionId = getSessionId(request);
  if (!sessionId) return NextResponse.json({ ok: true });

  const body = await request.json();
  const { product_id } = body;
  if (!product_id) {
    return NextResponse.json({ error: "product_id obrigatório" }, { status: 400 });
  }

  const sql = postgres(process.env.DATABASE_URL!);
  try {
    const lists = await sql`
      SELECT id FROM shopping_lists WHERE session_id = ${sessionId} LIMIT 1
    `;
    if (lists.length > 0) {
      await sql`
        DELETE FROM shopping_list_items
        WHERE shopping_list_id = ${lists[0].id} AND product_id = ${product_id}::uuid
      `;
    }
    return NextResponse.json({ ok: true });
  } finally {
    await sql.end();
  }
}

export async function PATCH(request: Request) {
  const sessionId = getSessionId(request);
  if (!sessionId) return NextResponse.json({ ok: true });

  const body = await request.json();
  const { product_id, quantity } = body;
  if (!product_id || quantity == null) {
    return NextResponse.json({ error: "product_id e quantity obrigatórios" }, { status: 400 });
  }

  const sql = postgres(process.env.DATABASE_URL!);
  try {
    const lists = await sql`
      SELECT id FROM shopping_lists WHERE session_id = ${sessionId} LIMIT 1
    `;
    if (lists.length > 0) {
      await sql`
        UPDATE shopping_list_items
        SET quantity = ${quantity}
        WHERE shopping_list_id = ${lists[0].id} AND product_id = ${product_id}::uuid
      `;
    }
    return NextResponse.json({ ok: true });
  } finally {
    await sql.end();
  }
}
