"""Tests for scraper._parse_price."""

import pytest

from scraper import _parse_price


@pytest.mark.parametrize(
    "text, expected",
    [
        ("R$ 24,90", 24.90),
        ("de R$ 5,99 por R$ 5,49", 5.49),   # last match wins
        ("1.234,56", 1234.56),               # thousand separator
        ("3x de 10,00", 10.00),              # ignores "3x"
        ("16un R$ 8,99", 8.99),              # ignores "16un"
        ("sem preço", None),
        ("", None),
        ("0,00", None),                      # zero is not a valid price
        ("abc 1,2", None),                   # not two decimal digits
    ],
)
def test_parse_price(text: str, expected: float | None) -> None:
    assert _parse_price(text) == expected
