import postgres from "postgres";
import { cookies } from "next/headers";
import ListaClient from "./ListaClient";

type ListaItem = {
  id: string;
  product_id: string;
  name: string;
  category: string | null;
  quantity: number;
  current_price: string | null;
  image_url: string | null;
};

async function getLista(sessionId: string): Promise<{ id: string | null; items: ListaItem[] }> {
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

    if (rows.length === 0) return { id: null, items: [] };

    const listId = rows[0].list_id;
    const items: ListaItem[] = rows
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

    return { id: listId, items };
  } finally {
    await sql.end();
  }
}

export default async function ListaPage() {
  const sessionId = (await cookies()).get("argus_cart_session")?.value ?? null;
  const data = sessionId ? await getLista(sessionId) : { id: null, items: [] };
  return <ListaClient initialData={data} />;
}
