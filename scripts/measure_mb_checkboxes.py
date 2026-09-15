"""Measure MB Dental page-2 checkbox squares directly from template artwork.

Emits each square's centre in pdf-lib user space, which is what the generator draws in:
user_y = mediabox.y1 - fitz_y  (fitz measures top-down from the CropBox origin).
Squares are the gold-stroked outlines the artwork itself draws, so nothing here is guessed.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import fitz

GOLD = (0.5765, 0.3882, 0.0510)


def close(a, b, tol=0.02):
    return a is not None and len(a) == len(b) and all(abs(x - y) < tol for x, y in zip(a, b))


def squares(page: fitz.Page):
    found = []
    for drawing in page.get_drawings():
        if drawing["type"] != "s" or not close(drawing.get("color"), GOLD):
            continue
        rect = drawing["rect"]
        if not (8 < rect.width < 24 and 8 < rect.height < 24):
            continue
        found.append(rect)
    return found


def columns(rects, tol=6.0):
    groups: list[list[fitz.Rect]] = []
    for rect in sorted(rects, key=lambda r: r.x0):
        if groups and abs(groups[-1][0].x0 - rect.x0) < tol:
            groups[-1].append(rect)
        else:
            groups.append([rect])
    for group in groups:
        group.sort(key=lambda r: r.y0)
    return groups


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser()
    parser.add_argument("templates", nargs="+", type=Path)
    parser.add_argument("--page", type=int, default=2)
    args = parser.parse_args()

    for path in args.templates:
        document = fitz.open(path)
        page = document[args.page - 1]
        top = page.mediabox.y1
        print(f"\n=== {path.name} (mediabox top y={top:.2f})")
        for index, group in enumerate(columns(squares(page))):
            print(f"  column {index}: x0~{group[0].x0:.2f} count={len(group)}")
            for rect in group:
                print(
                    f"    centerX={(rect.x0 + rect.x1) / 2:7.2f} centerY={top - (rect.y0 + rect.y1) / 2:7.2f}"
                    f" width={rect.width:5.2f} height={rect.height:5.2f}"
                )


if __name__ == "__main__":
    main()
