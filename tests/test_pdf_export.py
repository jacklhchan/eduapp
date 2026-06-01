from __future__ import annotations

from io import BytesIO

from pypdf import PdfReader

from app.pdf_export import build_portfolio_pdf
from app.schemas import ChildProfile, PortfolioSection


def test_build_portfolio_pdf_is_readable() -> None:
    child = ChildProfile(
        id="child-matthew",
        name="Matthew",
        grade="P3",
        focus="小學數學 + 升小 Portfolio",
        language="繁中 / English",
        school_type="香港主流小學",
    )
    pdf_bytes = build_portfolio_pdf(
        child,
        [
            PortfolioSection(
                title="Learning Attitude",
                status="AI Ready",
                body="Shows steady progress in fraction concepts and daily practice.",
            )
        ],
    )
    assert pdf_bytes.startswith(b"%PDF")
    reader = PdfReader(BytesIO(pdf_bytes))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    assert "Learning Passport" in text
    assert "Matthew" in text
    assert "Learning Attitude" in text
