"""Acesso ao banco PostgreSQL e notificações (console por enquanto)."""

from __future__ import annotations

import logging
import os
from typing import Any

import psycopg
from psycopg.rows import dict_row

log = logging.getLogger(__name__)

_DATABASE_URL = os.environ["DATABASE_URL"]


def _conn() -> psycopg.Connection:
    return psycopg.connect(_DATABASE_URL, row_factory=dict_row)


def upsert_products(products: list[dict[str, Any]]) -> None:
    with _conn() as conn:
        for p in products:
            conn.execute(
                """
                INSERT INTO products
                    (slug, name, category, product_url, price_selector, is_active)
                VALUES
                    (%(slug)s, %(name)s, %(category)s, %(product_url)s,
                     %(price_selector)s, true)
                ON CONFLICT (slug) DO UPDATE SET
                    name          = EXCLUDED.name,
                    category      = EXCLUDED.category,
                    product_url   = EXCLUDED.product_url,
                    price_selector = EXCLUDED.price_selector,
                    is_active     = true,
                    updated_at    = now()
                """,
                p,
            )


def fetch_products() -> list[dict[str, Any]]:
    with _conn() as conn:
        rows = conn.execute("SELECT * FROM products WHERE is_active = true").fetchall()
    log.info("Produtos ativos: %d", len(rows))
    return rows


def update_product_image(product_id: str, image_url: str) -> None:
    with _conn() as conn:
        conn.execute(
            "UPDATE products SET image_url = %s WHERE id = %s AND image_url IS NULL",
            (image_url, str(product_id)),
        )


def save_price(product_id: str, price: float) -> None:
    try:
        with _conn() as conn:
            conn.execute(
                "INSERT INTO price_history (product_id, price) VALUES (%s, %s)",
                (str(product_id), price),
            )
    except Exception:
        log.exception("Erro ao salvar preço — product_id=%s price=%.2f", product_id, price)


def recent_prices(product_id: str, limit: int = 14) -> list[float]:
    """Retorna preços históricos excluindo o recém-inserido."""
    with _conn() as conn:
        rows = conn.execute(
            """
            SELECT price FROM price_history
            WHERE product_id = %s
            ORDER BY collected_at DESC
            LIMIT %s
            """,
            (str(product_id), limit + 1),
        ).fetchall()
    return [float(r["price"]) for r in rows[1:]]  # pula o recém-inserido


def send_alerts(alerts: list[dict[str, Any]]) -> None:
    for a in alerts:
        icon = "📉" if a["kind"] == "price_drop" else "📈"
        log.info(
            "%s ALERTA %s — %s: R$ %.2f (%+.1f%% vs média R$ %.2f)",
            icon,
            a["kind"],
            a["product"]["name"],
            a["new_price"],
            a["pct"],
            a["avg_price"],
        )
        try:
            with _conn() as conn:
                conn.execute(
                    """
                    INSERT INTO notifications_sent (product_id, kind, old_price, new_price, variation_pct)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (str(a["product"]["id"]), a["kind"], a["avg_price"], a["new_price"], a["pct"]),
                )
        except Exception:
            log.exception("Erro ao registrar alerta — product_id=%s", a["product"]["id"])
    log.info("%d alerta(s) processado(s)", len(alerts))
