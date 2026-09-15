"""Strip Adobe Illustrator private data from an Aksu template so it can be bundled.

The clinic supplies `emir aksu french finalllllllllll.pdf` / `emir aksu Spanish edit3
finalllllllllll111.pdf` straight out of Illustrator, which embeds the whole .ai source in each
page's /PieceInfo entry: 177 unreferenced 64 KiB streams, ~17 MB of the ~20 MB file. None of it is
used to render the page, so dropping /PieceInfo (plus Illustrator's /LastModified stamp) and
garbage-collecting brings the artwork to ~3 MB — the same order as the templates already bundled.

The artwork itself is never touched. `--verify` re-renders every page of the source and the output
at 200 DPI and fails unless the two are pixel-identical, so a release can prove the static pages
are byte-for-byte the clinic's own (spec §18: no static artwork drift).

    python scripts/optimize_aksu_template.py "<source>.pdf" public/templates/aksu/fr.pdf --verify
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import fitz

RENDER_DPI = 200


def optimize(source: Path, destination: Path) -> None:
    document = fitz.open(source)
    for page in document:
        document.xref_set_key(page.xref, "PieceInfo", "null")
        document.xref_set_key(page.xref, "LastModified", "null")
    destination.parent.mkdir(parents=True, exist_ok=True)
    document.save(destination, garbage=4, deflate=True, clean=True)


def verify(source: Path, destination: Path) -> bool:
    before, after = fitz.open(source), fitz.open(destination)
    if before.page_count != after.page_count:
        print(f"  FAIL page count {before.page_count} -> {after.page_count}")
        return False
    matrix = fitz.Matrix(RENDER_DPI / 72, RENDER_DPI / 72)
    ok = True
    for index in range(before.page_count):
        if before[index].rect != after[index].rect:
            print(f"  FAIL page {index + 1} size {before[index].rect} -> {after[index].rect}")
            ok = False
            continue
        a = before[index].get_pixmap(matrix=matrix).samples
        b = after[index].get_pixmap(matrix=matrix).samples
        identical = a == b
        print(f"  page {index + 1}: {'identical' if identical else 'DIFFERS'} at {RENDER_DPI} DPI")
        ok = ok and identical
    return ok


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()

    optimize(args.source, args.destination)
    before_kb = args.source.stat().st_size // 1024
    after_kb = args.destination.stat().st_size // 1024
    print(f"{args.source.name}: {before_kb} KB -> {args.destination.name}: {after_kb} KB")
    if args.verify and not verify(args.source, args.destination):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
