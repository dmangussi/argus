"""Argus — monitor de preços.

Modos:
    python main.py --seed      # sincroniza products.yaml → banco
    python main.py --once      # coleta uma vez e sai
    python main.py --schedule  # roda o scheduler (padrão no Docker)
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
from pathlib import Path
from typing import Any

import yaml
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from dotenv import load_dotenv

import notify
import scraper as sc

load_dotenv()

# --- Config ---
CRON_MORNING    = os.getenv("SCRAPE_CRON_MORNING", "0 6 * * *")
CRON_EVENING    = os.getenv("SCRAPE_CRON_EVENING", "0 18 * * *")
HEADLESS        = os.getenv("PLAYWRIGHT_HEADLESS", "true").lower() == "true"
CONCURRENCY     = int(os.getenv("SCRAPE_CONCURRENCY", "3"))
DELAY_MIN       = float(os.getenv("SCRAPE_DELAY_MIN_SEC", "2"))
DELAY_MAX       = float(os.getenv("SCRAPE_DELAY_MAX_SEC", "6"))
DROP_THRESHOLD  = float(os.getenv("ALERT_DROP_THRESHOLD", "-5"))
RISE_THRESHOLD  = float(os.getenv("ALERT_RISE_THRESHOLD", "10"))
MIN_HISTORY     = int(os.getenv("ALERT_MIN_HISTORY_POINTS", "3"))
LOG_LEVEL       = os.getenv("LOG_LEVEL", "INFO")

TIMEZONE      = "America/Sao_Paulo"
PRODUCTS_YAML = Path(__file__).parent / "products.yaml"

log = logging.getLogger(__name__)


# --- Seed ---
def seed_products() -> None:
    data = yaml.safe_load(PRODUCTS_YAML.read_text(encoding="utf-8")) or {}
    products = data.get("products", [])
    if not products:
        log.warning("products.yaml vazio ou sem chave 'products'")
        return
    payload = [
        {
            "slug": p["slug"],
            "name": p["name"],
            "category": p.get("category"),
            "product_url": p["product_url"],
            "price_selector": p.get("price_selector"),
            "is_active": True,
        }
        for p in products
        if "slug" in p and "name" in p and "product_url" in p
    ]
    notify.upsert_products(payload)
    log.info("✓ %d produtos sincronizados com o banco", len(payload))


# --- Análise de variação ---
def analyze(product: dict[str, Any], new_price: float, history: list[float]) -> dict[str, Any] | None:
    if len(history) < MIN_HISTORY:
        return None
    avg = sum(history) / len(history)
    if avg <= 0:
        return None
    pct = (new_price - avg) / avg * 100
    if pct <= DROP_THRESHOLD:
        kind = "price_drop"
    elif pct >= RISE_THRESHOLD:
        kind = "price_rise"
    else:
        return None
    return {
        "product": product,
        "new_price": new_price,
        "avg_price": round(avg, 2),
        "pct": round(pct, 2),
        "kind": kind,
    }


# --- Orquestração ---
def _print_results(results: list[tuple[str, float | None]]) -> None:
    log.info("─" * 45)
    log.info(" RESULTADOS DA COLETA")
    log.info("─" * 45)
    for name, price in sorted(results, key=lambda r: r[0]):
        if price is not None:
            log.info(" %-30s  R$ %.2f", name, price)
        else:
            log.info(" %-30s  FALHOU", name)
    log.info("─" * 45)
    ok = sum(1 for _, p in results if p is not None)
    log.info(" %d/%d coletados", ok, len(results))


async def run_once() -> None:
    seed_products()  # sincroniza products.yaml → banco antes de cada coleta
    products = notify.fetch_products()
    if not products:
        log.warning("Nenhum produto ativo. Rode: python main.py --seed")
        return

    log.info("Iniciando coleta de %d produtos", len(products))
    results: list[tuple[str, float | None]] = []
    alerts: list[dict[str, Any]] = []
    sem = asyncio.Semaphore(CONCURRENCY)

    async with sc.Scraper(headless=HEADLESS, delay_min=DELAY_MIN, delay_max=DELAY_MAX) as scraper:

        async def process(product: dict[str, Any]) -> None:
            async with sem:
                result = await scraper.scrape(
                    product["product_url"],
                    product.get("price_selector") or "",
                )
            results.append((product["name"], result[0] if result else None))
            if result is None:
                return
            price, image_url = result
            notify.save_price(product["id"], price)
            if image_url and not product.get("image_url"):
                notify.update_product_image(product["id"], image_url)
            history = notify.recent_prices(product["id"])
            alert = analyze(product, price, history)
            if alert:
                alerts.append(alert)

        await asyncio.gather(*[process(p) for p in products])

    _print_results(results)
    if alerts:
        notify.send_alerts(alerts)


# --- Scheduler ---
def _run_once_sync() -> None:
    try:
        asyncio.run(run_once())
    except Exception:
        log.exception("Rodada falhou — scheduler continua")


def run_scheduler() -> None:
    scheduler = BlockingScheduler(timezone=TIMEZONE)
    scheduler.add_job(
        _run_once_sync,
        CronTrigger.from_crontab(CRON_MORNING, timezone=TIMEZONE),
        id="morning", name="Coleta matinal", replace_existing=True,
    )
    scheduler.add_job(
        _run_once_sync,
        CronTrigger.from_crontab(CRON_EVENING, timezone=TIMEZONE),
        id="evening", name="Coleta vespertina", replace_existing=True,
    )
    log.info("Scheduler iniciado (TZ=%s) morning=%r evening=%r", TIMEZONE, CRON_MORNING, CRON_EVENING)
    for job in scheduler.get_jobs():
        log.info("  %s → %s", job.name, job.next_run_time)
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        log.info("Scheduler parado")


# --- Entrypoint ---
def main() -> None:
    logging.basicConfig(
        level=LOG_LEVEL,
        format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    parser = argparse.ArgumentParser(description="Argus — monitor de preços")
    parser.add_argument("--seed", action="store_true", help="Sincroniza products.yaml → banco")
    parser.add_argument("--once", action="store_true", help="Coleta uma vez e sai")
    parser.add_argument("--schedule", action="store_true", help="Inicia o scheduler (padrão Docker)")
    args = parser.parse_args()

    if args.seed:
        seed_products()
    elif args.schedule:
        run_scheduler()
    else:
        asyncio.run(run_once())


if __name__ == "__main__":
    main()
