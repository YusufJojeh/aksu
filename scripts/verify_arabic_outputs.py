"""Render and verify generated Arabic PDF outputs against the canonical template."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import fitz
from PIL import Image, ImageDraw


STALE = ["سكينة", "02/09/2026", "+34 613 43 52 52", "30 سنة", "4315", "3970", "3240", "975", "480"]
EXPECTED_SIZE = (594.75, 842.25)


def pixels(page: fitz.Page) -> fitz.Pixmap:
    return page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)


def verify(template_path: Path, pdf_paths: list[Path], render_dir: Path) -> None:
    template = fitz.open(template_path)
    render_dir.mkdir(parents=True, exist_ok=True)
    thumbnails: list[tuple[str, Image.Image, Image.Image]] = []
    for pdf_path in pdf_paths:
        document = fitz.open(pdf_path)
        if document.page_count != 5:
            raise RuntimeError(f"{pdf_path}: expected five pages")
        for page in document:
            if abs(page.rect.width - EXPECTED_SIZE[0]) > 0.01 or abs(page.rect.height - EXPECTED_SIZE[1]) > 0.01:
                raise RuntimeError(f"{pdf_path}: unexpected page size {page.rect}")
        extracted = re.sub(r"[\x00-\x1f]", "", "\n".join(page.get_text() for page in document))
        remaining = [value for value in STALE if value in extracted]
        if remaining:
            raise RuntimeError(f"{pdf_path}: stale values {remaining}")
        for index in range(2, 5):
            expected = pixels(template[index])
            actual = pixels(document[index])
            if (expected.width, expected.height, expected.samples) != (actual.width, actual.height, actual.samples):
                raise RuntimeError(f"{pdf_path}: static page {index + 1} differs from template")
        page_images: list[Image.Image] = []
        for index in range(2):
            pixmap = pixels(document[index])
            image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
            image.thumbnail((360, 510))
            page_images.append(image.copy())
            image.save(render_dir / f"{pdf_path.stem}-page-{index + 1}.png")
        thumbnails.append((pdf_path.stem, page_images[0], page_images[1]))
        print(f"PASS {pdf_path.name}: 5 pages, static pages identical, no stale text")

    sheet = Image.new("RGB", (760, len(thumbnails) * 550), "white")
    draw = ImageDraw.Draw(sheet)
    for row, (name, first, second) in enumerate(thumbnails):
        top = row * 550
        draw.text((10, top + 5), name, fill="black")
        sheet.paste(first, (10, top + 30))
        sheet.paste(second, (390, top + 30))
    sheet.save(render_dir / "arabic-cases-contact-sheet.png")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("template", type=Path)
    parser.add_argument("pdfs", nargs="+", type=Path)
    parser.add_argument("--render-dir", type=Path, default=Path("tmp/pdfs/arabic-cases-rendered"))
    args = parser.parse_args()
    verify(args.template, args.pdfs, args.render_dir)


if __name__ == "__main__":
    main()
