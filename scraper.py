"""Playwright-based price scraper."""

from __future__ import annotations

import asyncio
import logging
import random
import re

from playwright.async_api import Browser, Page, Playwright, TimeoutError as PWTimeout, async_playwright

log = logging.getLogger(__name__)

# Matches BR decimal format: "1.234,56" or "24,90".
# Intentionally excludes "3x", "16un", and similar non-price strings.
_PRICE_RE = re.compile(r"\d{1,3}(?:\.\d{3})*,\d{2}")

_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)

_RETRY_WAIT_SECONDS = 5


def _parse_price(text: str) -> float | None:
    """Extract the last BR-formatted price from ``text``.

    Takes the last match so "de R$ 5,99 por R$ 5,49" correctly returns 5.49.
    Returns ``None`` when no price is found or the parsed value is zero.
    """
    matches = _PRICE_RE.findall(text)
    if not matches:
        return None
    try:
        value = float(matches[-1].replace(".", "").replace(",", "."))
        return value if value > 0 else None
    except ValueError:
        return None


async def _extract_image(page: Page) -> str | None:
    """Return the first product image URL found on the page, or ``None``."""
    try:
        return await page.locator(".imagem img").first.get_attribute("src")
    except Exception as exc:
        log.debug("Imagem não encontrada: %s", exc)
        return None


class Scraper:
    """Reusable Playwright browser — creates one context per product URL.

    Intended for use as an async context manager::

        async with Scraper() as scraper:
            result = await scraper.scrape(url, selector)
    """

    def __init__(
        self,
        headless: bool = True,
        delay_min: float = 2.0,
        delay_max: float = 6.0,
    ) -> None:
        self.headless = headless
        self.delay_min = delay_min
        self.delay_max = delay_max
        self._browser: Browser | None = None
        self._pw: Playwright | None = None

    async def __aenter__(self) -> Scraper:
        """Launch the Chromium browser."""
        self._pw = await async_playwright().start()
        self._browser = await self._pw.chromium.launch(
            headless=self.headless,
            args=["--disable-blink-features=AutomationControlled"],
        )
        return self

    async def __aexit__(self, *_: object) -> None:
        """Close browser and Playwright instance."""
        if self._browser:
            await self._browser.close()
        if self._pw:
            await self._pw.stop()

    async def scrape(self, url: str, selector: str) -> tuple[float, str | None] | None:
        """Scrape price and image from ``url`` using ``selector``.

        Returns a ``(price, image_url)`` tuple on success, or ``None`` on any
        failure. Retries once after a timeout before giving up.
        """
        if not selector:
            log.warning("Sem seletor CSS definido para %s", url)
            return None
        await asyncio.sleep(random.uniform(self.delay_min, self.delay_max))
        for attempt in (1, 2):
            try:
                return await self._fetch(url, selector)
            except PWTimeout:
                log.warning("Timeout em %s (tentativa %d/2)", url, attempt)
                if attempt == 2:
                    return None
                log.info("Aguardando %ds antes de retry: %s", _RETRY_WAIT_SECONDS, url)
                await asyncio.sleep(_RETRY_WAIT_SECONDS)
            except Exception as exc:
                log.exception("Erro inesperado em %s: %s", url, exc)
                return None
        return None  # unreachable, satisfies type checker

    async def _fetch(self, url: str, selector: str) -> tuple[float, str | None] | None:
        """Open a fresh browser context, navigate, and extract price + image."""
        if self._browser is None:
            raise RuntimeError(
                f"Scraper._fetch() called outside of context manager — "
                f"_browser is None (url={url!r})"
            )
        ctx = await self._browser.new_context(
            user_agent=_USER_AGENT,
            locale="pt-BR",
            timezone_id="America/Sao_Paulo",
            viewport={"width": 1366, "height": 768},
        )
        try:
            page = await ctx.new_page()
            await page.goto(url, wait_until="networkidle", timeout=30_000)
            await page.wait_for_selector(selector, timeout=10_000)
            text = await page.locator(selector).first.inner_text()
            price = _parse_price(text)
            if price is None:
                log.warning("Não parseou preço em %s: %r", url, text)
                return None
            return (price, await _extract_image(page))
        finally:
            await ctx.close()
