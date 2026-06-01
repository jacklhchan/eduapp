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
        focus="小學數學及學習歷程",
        language="雙語：繁中及英文",
        school_type="香港主流小學",
    )
    pdf_bytes = build_portfolio_pdf(
        child,
        [
            PortfolioSection(
                title="學習態度",
                status="AI 草稿",
                body="分數概念和每日練習均有穩定進步。",
            )
        ],
    )
    assert pdf_bytes.startswith(b"%PDF")
    reader = PdfReader(BytesIO(pdf_bytes))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    assert "學習護照" in text
    assert "Matthew" in text
    assert "學習態度" in text
