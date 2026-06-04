from __future__ import annotations

from io import BytesIO
import os
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .schemas import ChildProfile, PortfolioSection


CJK_FONT = "MSung-Light"
APP_FONT = "EduPassCJK"


def font_candidates() -> list[Path]:
    configured = os.getenv("EDUPASS_PDF_FONT_PATH")
    paths = [
        Path(__file__).resolve().parent / "assets" / "fonts" / "NotoSansTC-Regular.ttf",
        configured,
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/System/Library/Fonts/STHeiti Light.ttc",
        "/System/Library/Fonts/Supplemental/Songti.ttc",
    ]
    return [Path(path) for path in paths if path]


def ensure_cjk_font() -> str:
    try:
        pdfmetrics.getFont(APP_FONT)
        return APP_FONT
    except KeyError:
        pass

    for path in font_candidates():
        if not path.exists():
            continue
        try:
            pdfmetrics.registerFont(TTFont(APP_FONT, str(path), subfontIndex=0))
            return APP_FONT
        except Exception:
            continue

    try:
        pdfmetrics.getFont(CJK_FONT)
    except KeyError:
        pdfmetrics.registerFont(UnicodeCIDFont(CJK_FONT))
    return CJK_FONT


def build_portfolio_pdf(child: ChildProfile, sections: list[PortfolioSection]) -> bytes:
    font_name = ensure_cjk_font()
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=f"{child.name} 學習護照",
    )

    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "EduTitle",
        parent=styles["Title"],
        fontName=font_name,
        fontSize=24,
        leading=30,
        textColor=colors.HexColor("#003d9b"),
        spaceAfter=10,
    )
    subtitle = ParagraphStyle(
        "EduSubtitle",
        parent=styles["BodyText"],
        fontName=font_name,
        fontSize=11,
        leading=16,
        textColor=colors.HexColor("#434654"),
        spaceAfter=12,
    )
    heading = ParagraphStyle(
        "EduHeading",
        parent=styles["Heading2"],
        fontName=font_name,
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#191c1e"),
        spaceBefore=8,
        spaceAfter=4,
    )
    body = ParagraphStyle(
        "EduBody",
        parent=styles["BodyText"],
        fontName=font_name,
        fontSize=10,
        leading=15,
        textColor=colors.HexColor("#434654"),
    )

    story = [
        Paragraph("學習護照", title),
        Paragraph(f"{child.name} - {child.grade} - {child.focus}", subtitle),
    ]

    meta = Table(
        [
            ["學生", child.name, "年級", child.grade],
            ["語言", child.language, "學校", child.school_type],
        ],
        colWidths=[28 * mm, 58 * mm, 28 * mm, 58 * mm],
    )
    meta.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f3f4f6")),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#191c1e")),
                ("FONTNAME", (0, 0), (-1, -1), font_name),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#c3c6d6")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("PADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    story.extend([meta, Spacer(1, 10)])

    if not sections:
        sections = [
            PortfolioSection(
                title="封面",
                status="草稿",
                body="伺服器端 PDF 匯出已準備好，可加入作品集內容。",
            )
        ]

    for section in sections:
        story.append(Paragraph(section.title, heading))
        story.append(Paragraph(f"狀態：{section.status}", body))
        story.append(Paragraph(section.body, body))
        story.append(Spacer(1, 8))

    doc.build(story)
    return buffer.getvalue()
