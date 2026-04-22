"""PostgreSQL persistence and alert notifications."""

from __future__ import annotations

import logging
import os

import psycopg
from psycopg.rows import dict_row

from models import Alert, Product

log = logging.getLogger(__name__)

_DATABASE_URL = os.environ["DATABASE_URL"]


def _conn() -> psycopg.Connection:
    """Open a new database connection using the module-level DATABASE_URL."""
    return psycopg.connect(_DATABASE_URL, row_factory=dict_row)


def upsert_products(products: list[Product]) -> None:
    """Insert or update products; sets is_active=true on conflict."""
    with _conn() as conn:
        for product in products:
            conn.execute(
                """
                INSERT INTO products
                    (slug, name, category, product_url, price_selector, is_active)
                VALUES
                    (%(slug)s, %(name)s, %(category)s, %(product_url)s,
                     %(price_selector)s, true)
                ON CONFLICT (slug) DO UPDATE SET
                    name           = EXCLUDED.name,
                    category       = EXCLUDED.category,
                    product_url    = EXCLUDED.product_url,
                    price_selector = EXCLUDED.price_selector,
                    is_active      = true,
                    updated_at     = now()
                """,
                product,
            )


def fetch_products() -> list[Product]:
    """Return all active products from the database."""
    with _conn() as conn:
        rows: list[Product] = conn.execute(
            "SELECT * FROM products WHERE is_active = true"
        ).fetchall()
    log.info("Produtos ativos: %d", len(rows))
    return rows


def update_product_image(product_id: str, image_url: str) -> None:
    """Set image_url for a product only if it has none yet."""
    with _conn() as conn:
        conn.execute(
            "UPDATE products SET image_url = %s WHERE id = %s AND image_url IS NULL",
            (product_id, product_id),
        )


def save_price(product_id: str, price: float) -> None:
    """Insert a price_history row; logs and continues on database error."""
    try:
        with _conn() as conn:
            conn.execute(
                "INSERT INTO price_history (product_id, price) VALUES (%s, %s)",
                (product_id, price),
            )
    except psycopg.Error:
        log.exception("Erro ao salvar preço — product_id=%s price=%.2f", product_id, price)


def recent_prices(product_id: str, limit: int = 14) -> list[float]:
    """Return up to ``limit`` historical prices, excluding the most recent insert."""
    with _conn() as conn:
        rows = conn.execute(
            """
            SELECT price FROM price_history
            WHERE product_id = %s
            ORDER BY collected_at DESC
            LIMIT %s
            """,
            (product_id, limit + 1),
        ).fetchall()
    return [float(r["price"]) for r in rows[1:]]


def send_alerts(alerts: list[Alert]) -> None:
    """Log each alert and persist it to notifications_sent in a single transaction."""
    with _conn() as conn:
        for alert in alerts:
            icon = "📉" if alert["kind"] == "price_drop" else "📈"
            log.info(
                "%s ALERTA %s — %s: R$ %.2f (%+.1f%% vs média R$ %.2f)",
                icon,
                alert["kind"],
                alert["product"]["name"],
                alert["new_price"],
                alert["pct"],
                alert["avg_price"],
            )
            try:
                conn.execute(
                    """
                    INSERT INTO notifications_sent
                        (product_id, kind, old_price, new_price, variation_pct)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        alert["product"]["id"],
                        alert["kind"],
                        alert["avg_price"],
                        alert["new_price"],
                        alert["pct"],
                    ),
                )
            except psycopg.Error:
                log.exception("Erro ao registrar alerta — product_id=%s", alert["product"]["id"])
    log.info("%d alerta(s) processado(s)", len(alerts))
