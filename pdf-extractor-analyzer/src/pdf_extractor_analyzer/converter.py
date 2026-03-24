from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

import fitz
from PIL import Image

from .exceptions import ConversionError


@dataclass(slots=True)
class PageImage:
    page_number: int
    width: int
    height: int
    image_bytes: bytes
    image_path: Path | None


class PDFConverter:
    def convert(
        self,
        pdf_path: Path,
        *,
        dpi: int,
        output_dir: Path | None,
        max_pages: int | None = None,
    ) -> list[PageImage]:
        try:
            doc = fitz.open(pdf_path)
        except Exception as exc:
            raise ConversionError(f"Failed to open PDF: {pdf_path}") from exc
        try:
            if doc.needs_pass:
                raise ConversionError("Encrypted PDFs are not supported without a password")

            total_pages = len(doc)
            if total_pages == 0:
                raise ConversionError("PDF has no pages")

            if max_pages is not None:
                total_pages = min(total_pages, max_pages)

            if output_dir is not None:
                output_dir.mkdir(parents=True, exist_ok=True)

            matrix = fitz.Matrix(dpi / 72, dpi / 72)
            pages: list[PageImage] = []

            for index in range(total_pages):
                page = doc[index]
                pix = page.get_pixmap(matrix=matrix)
                image_bytes = pix.tobytes("png")
                image_path: Path | None = None

                if output_dir is not None:
                    image_path = output_dir / f"page_{index + 1:03d}.png"
                    pix.save(str(image_path))

                pages.append(
                    PageImage(
                        page_number=index + 1,
                        width=pix.width,
                        height=pix.height,
                        image_bytes=image_bytes,
                        image_path=image_path,
                    )
                )

            return pages
        finally:
            doc.close()

    def load_from_dir(self, cache_dir: Path) -> list[PageImage]:
        pages: list[PageImage] = []
        image_paths = sorted(cache_dir.glob("page_*.png"))
        if not image_paths:
            raise ConversionError(f"No cached pages found in {cache_dir}")

        for idx, image_path in enumerate(image_paths, start=1):
            image_bytes = image_path.read_bytes()
            try:
                with Image.open(BytesIO(image_bytes)) as img:
                    width, height = img.size
            except Exception:
                width, height = 0, 0

            pages.append(
                PageImage(
                    page_number=idx,
                    width=width,
                    height=height,
                    image_bytes=image_bytes,
                    image_path=image_path,
                )
            )

        return pages
