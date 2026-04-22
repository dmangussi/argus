"""Tests for main.analyze.

Thresholds are injected explicitly so tests are independent of env vars.
"""

import pytest

from analysis import analyze
from models import Product

_PRODUCT: Product = {
    "id": "abc-123",
    "name": "Leite Integral",
    "product_url": "https://example.com/leite",
    "price_selector": ".price",
    "category": "Laticínios e Frios",
    "image_url": None,
    "is_active": True,
}

_THRESHOLDS = {"min_history": 3, "drop_threshold": -5.0, "rise_threshold": 10.0}


class TestInsufficientHistory:
    def test_returns_none_when_history_empty(self) -> None:
        assert analyze(_PRODUCT, 5.0, [], **_THRESHOLDS) is None

    def test_returns_none_when_history_below_minimum(self) -> None:
        assert analyze(_PRODUCT, 5.0, [5.0, 5.0], **_THRESHOLDS) is None

    def test_returns_none_when_average_is_zero(self) -> None:
        assert analyze(_PRODUCT, 5.0, [0.0, 0.0, 0.0], **_THRESHOLDS) is None


class TestNormalVariation:
    def test_returns_none_when_price_unchanged(self) -> None:
        assert analyze(_PRODUCT, 10.0, [10.0, 10.0, 10.0], **_THRESHOLDS) is None

    def test_returns_none_when_drop_is_within_threshold(self) -> None:
        # -3% drop, threshold is -5%
        assert analyze(_PRODUCT, 9.7, [10.0, 10.0, 10.0], **_THRESHOLDS) is None

    def test_returns_none_when_rise_is_within_threshold(self) -> None:
        # +5% rise, threshold is +10%
        assert analyze(_PRODUCT, 10.5, [10.0, 10.0, 10.0], **_THRESHOLDS) is None


class TestPriceDrop:
    def test_detects_significant_drop(self) -> None:
        # avg=10.0, new=9.0 → -10%
        result = analyze(_PRODUCT, 9.0, [10.0, 10.0, 10.0], **_THRESHOLDS)
        assert result is not None
        assert result["kind"] == "price_drop"

    def test_drop_pct_is_rounded(self) -> None:
        result = analyze(_PRODUCT, 9.0, [10.0, 10.0, 10.0], **_THRESHOLDS)
        assert result is not None
        assert result["pct"] == pytest.approx(-10.0)

    def test_drop_avg_price_is_rounded(self) -> None:
        result = analyze(_PRODUCT, 9.0, [10.0, 10.0, 10.0], **_THRESHOLDS)
        assert result is not None
        assert result["avg_price"] == pytest.approx(10.0)

    def test_drop_product_is_preserved(self) -> None:
        result = analyze(_PRODUCT, 9.0, [10.0, 10.0, 10.0], **_THRESHOLDS)
        assert result is not None
        assert result["product"] is _PRODUCT


class TestPriceRise:
    def test_detects_significant_rise(self) -> None:
        # avg=10.0, new=11.5 → +15%
        result = analyze(_PRODUCT, 11.5, [10.0, 10.0, 10.0], **_THRESHOLDS)
        assert result is not None
        assert result["kind"] == "price_rise"

    def test_rise_pct_is_rounded(self) -> None:
        result = analyze(_PRODUCT, 11.5, [10.0, 10.0, 10.0], **_THRESHOLDS)
        assert result is not None
        assert result["pct"] == pytest.approx(15.0)

    def test_exactly_at_rise_threshold_triggers(self) -> None:
        # new=11.0 → exactly +10%
        result = analyze(_PRODUCT, 11.0, [10.0, 10.0, 10.0], **_THRESHOLDS)
        assert result is not None
        assert result["kind"] == "price_rise"

    def test_exactly_at_drop_threshold_triggers(self) -> None:
        # new=9.5 → exactly -5%
        result = analyze(_PRODUCT, 9.5, [10.0, 10.0, 10.0], **_THRESHOLDS)
        assert result is not None
        assert result["kind"] == "price_drop"
