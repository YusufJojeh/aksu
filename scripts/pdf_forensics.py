"""Print PDF-native geometry, font, and positioned-text facts for reference calibration."""

from __future__ import annotations

import argparse
from collections import Counter
from pathlib import Path
import sys

import pdfplumber
from pypdf import PdfReader


def inspect_pdf(path: Path) -> None:
    reader = PdfReader(path)
    print(f"\n=== {path.name} ===")
    print(f"pages={len(reader.pages)} bytes={path.stat().st_size}")
    for index, page in enumerate(reader.pages, 1):
        media = tuple(round(float(value), 2) for value in page.mediabox)
        crop = tuple(round(float(value), 2) for value in page.cropbox)
        print(f"page={index} media={media} crop={crop} rotate={page.get('/Rotate', 0)}")

    with pdfplumber.open(path) as document:
        for index, page in enumerate(document.pages[:3], 1):
            chars = page.chars
            fonts = Counter((str(char.get("fontname")), round(float(char.get("size", 0)), 2)) for char in chars)
            print(f"page={index} fonts={fonts.most_common(12)}")
            words = page.extract_words(x_tolerance=1, y_tolerance=2, keep_blank_chars=False)
            positioned = [
                f"{word['text']}@({word['x0']:.1f},{word['top']:.1f},{word['x1']:.1f},{word['bottom']:.1f})"
                for word in words
            ]
            print("words=" + " | ".join(positioned[:160]))


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="+", type=Path)
    args = parser.parse_args()
    for path in args.paths:
        inspect_pdf(path)


if __name__ == "__main__":
    main()
