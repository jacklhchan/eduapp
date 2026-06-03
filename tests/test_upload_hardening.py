from __future__ import annotations

import pytest
from fastapi import HTTPException

from app import main


def test_upload_filename_and_mime_validation() -> None:
    assert main.sanitize_upload_filename("../Avery homework #1.pdf") == "Avery-homework-1.pdf"

    mime_type, page_count = main.validate_upload_content(
        "homework.pdf",
        "application/octet-stream",
        b"%PDF-1.7\n1 0 obj\n<< /Type /Page >>\nendobj",
    )
    assert mime_type == "application/pdf"
    assert page_count == 1

    with pytest.raises(HTTPException) as unsupported:
        main.validate_upload_content("notes.txt", "text/plain", b"hello")
    assert unsupported.value.status_code == 415

    with pytest.raises(HTTPException) as fake_pdf:
        main.validate_upload_content("fake.pdf", "application/pdf", b"not actually a pdf")
    assert fake_pdf.value.status_code == 415


def test_pdf_page_limit_is_enforced(monkeypatch) -> None:
    monkeypatch.setattr(main, "MAX_PDF_PAGES", 2)
    content = b"%PDF-1.7\n" + b"\n".join([b"<< /Type /Page >>"] * 3)
    with pytest.raises(HTTPException) as too_many_pages:
        main.validate_upload_content("large.pdf", "application/pdf", content)
    assert too_many_pages.value.status_code == 413
