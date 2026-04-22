"""Domain models for Argus."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, TypedDict


class Product(TypedDict):
    """A product tracked in the database."""

    id: str
    name: str
    product_url: str
    price_selector: str | None
    category: str | None
    image_url: str | None
    is_active: bool


class Alert(TypedDict):
    """A price-variation alert generated after analysis."""

    product: Product
    new_price: float
    avg_price: float
    pct: float
    kind: Literal["price_drop", "price_rise"]


@dataclass(frozen=True)
class ScrapeOutcome:
    """Result of scraping a single product.

    ``price`` is ``None`` when the scrape failed entirely.
    ``alert`` is ``None`` when no threshold was crossed.
    """

    product_name: str
    price: float | None
    alert: Alert | None = None
