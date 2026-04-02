from pathlib import Path

import fitz
import pytest

from pdf_extractor_analyzer.converter import PDFConverter
from pdf_extractor_analyzer.exceptions import ConversionError


def test_convert_pdf_to_images(make_pdf, tmp_path: Path):
    pdf_path = make_pdf("multi.pdf", pages=2)
    out_dir = tmp_path / "images"

    converter = PDFConverter()
    pages = converter.convert(pdf_path, 150, out_dir)

    assert len(pages) == 2
    assert pages[0].page_number == 1
    assert pages[1].page_number == 2
    assert pages[0].width > 0
    assert pages[0].height > 0
    assert (out_dir / "page_001.png").exists()
    assert (out_dir / "page_002.png").exists()


def test_convert_respects_max_pages(make_pdf, tmp_path: Path):
    pdf_path = make_pdf("three.pdf", pages=3)
    converter = PDFConverter()
    pages = converter.convert(pdf_path, 150, tmp_path / "images", max_pages=1)
    assert len(pages) == 1


def test_convert_can_cap_long_edge(make_pdf, tmp_path: Path):
    pdf_path = make_pdf("cap.pdf", pages=1)
    converter = PDFConverter()

    uncapped = converter.convert(pdf_path, 150, None)
    capped = converter.convert(pdf_path, 150, None, image_max_long_edge=512)

    assert max(capped[0].width, capped[0].height) <= 512
    assert max(capped[0].width, capped[0].height) <= max(uncapped[0].width, uncapped[0].height)


def test_load_from_dir(make_pdf, tmp_path: Path):
    pdf_path = make_pdf("loadable.pdf", pages=2)
    out_dir = tmp_path / "images"
    converter = PDFConverter()
    converter.convert(pdf_path, 150, out_dir)

    pages = converter.load_from_dir(out_dir)
    assert len(pages) == 2
    assert pages[0].image_path == out_dir / "page_001.png"


def test_convert_raises_for_missing_pdf(tmp_path: Path):
    converter = PDFConverter()
    with pytest.raises(ConversionError, match="Failed to open PDF"):
        converter.convert(tmp_path / "missing.pdf", 150, None)


def test_convert_raises_for_encrypted_pdf(tmp_path: Path):
    pdf_path = tmp_path / "encrypted.pdf"
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "secret")
    doc.save(
        pdf_path,
        encryption=fitz.PDF_ENCRYPT_AES_256,
        owner_pw="owner",
        user_pw="user",
    )
    doc.close()

    converter = PDFConverter()
    with pytest.raises(ConversionError, match="Encrypted PDFs"):
        converter.convert(pdf_path, 150, None)
