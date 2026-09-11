"""One-time preparation of the clinic-approved Arabic PDF template.

Requires PyMuPDF. The script removes sample text objects and sample-state vector
marks; it does not rasterize pages. Coordinates use PyMuPDF's top-left origin.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import fitz


PAGE_1_TEXT = [
    (120, 428, 215, 451),
    (118, 464, 198, 491),
    (150, 499, 202, 526),
    (100, 540, 235, 564),
]
PAGE_2_TEXT = [
    (55, 330, 565, 462),
    (55, 465, 145, 484),
    (105, 485, 170, 507),
    (55, 625, 560, 651),
    (95, 730, 150, 751),
]
PAGE_2_SAMPLE_GRAPHICS = [
    (339, 204, 357, 221),
    (538, 164, 556, 181),
    (109, 500, 171, 506),
    (99, 744, 147, 750),
]
STALE_MARKERS = [
    "سكينة",
    "02/09/2026",
    "+34 613 43 52 52",
    "30 سنة",
    "4315",
    "3970",
    "3240",
    "975",
    "480",
]


def add_redactions(page: fitz.Page, rectangles: list[tuple[int, int, int, int]]) -> None:
    for rectangle in rectangles:
        page.add_redact_annot(fitz.Rect(*rectangle), fill=False, cross_out=False)


def sanitize(source: Path, output: Path) -> None:
    document = fitz.open(source)
    if document.page_count != 5:
        raise ValueError(f"Expected five pages, found {document.page_count}")

    add_redactions(document[0], PAGE_1_TEXT)
    document[0].apply_redactions(images=0, graphics=0, text=0)

    add_redactions(document[1], PAGE_2_TEXT)
    document[1].apply_redactions(images=0, graphics=0, text=0)
    add_redactions(document[1], PAGE_2_SAMPLE_GRAPHICS)
    document[1].apply_redactions(images=0, graphics=2, text=1)

    document.set_metadata({})
    output.parent.mkdir(parents=True, exist_ok=True)
    document.save(output, garbage=4, clean=True, deflate=True)
    document.close()

    cleaned = fitz.open(output)
    extracted = "\n".join(page.get_text() for page in cleaned)
    remaining = [marker for marker in STALE_MARKERS if marker in extracted]
    if remaining:
        raise RuntimeError(f"Sanitization failed; stale markers remain: {remaining}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, default=Path("public/templates/ar.pdf"))
    args = parser.parse_args()
    sanitize(args.source, args.output)


if __name__ == "__main__":
    main()
