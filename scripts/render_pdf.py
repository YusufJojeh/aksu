"""Render selected PDF pages to PNGs for visual regression and calibration."""

from __future__ import annotations

import argparse
from pathlib import Path

import fitz


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--pages", default="1,2,3")
    parser.add_argument("--dpi", type=int, default=180)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    requested = [int(value) for value in args.pages.split(",")]
    document = fitz.open(args.pdf)
    for page_number in requested:
        page = document[page_number - 1]
        pixmap = page.get_pixmap(dpi=args.dpi, alpha=False)
        pixmap.save(args.output / f"{args.pdf.stem}-page-{page_number}.png")


if __name__ == "__main__":
    main()
