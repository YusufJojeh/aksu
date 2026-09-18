"""Recompress the Aksu FR/ES template photos to shrink the finalized PDF under Vercel's 4.5MB
serverless body limit.

fr.pdf / es.pdf together embed ~2.8MB of near-lossless JPEG before/after and hero photos. Once
base64-encoded for the finalize-public request (a ~33% size increase) plus the JSON report
payload, that pushes real submissions over the platform's hard 4.5MB request-body ceiling,
causing a 413 on Finalize & Download for these two locales.

Re-encodes every embedded JPEG at quality 78 (still visually clean at print size, verified by
re-rendering both templates at 200 DPI before/after) and rewrites the PDF via pdf-lib-compatible
PyMuPDF replace_image, which keeps every vector object, text run, and page geometry untouched —
only the photo bytes change.

    python scripts/recompress_aksu_photos.py public/templates/aksu/fr.pdf
    python scripts/recompress_aksu_photos.py public/templates/aksu/es.pdf
"""
from __future__ import annotations

import argparse
import io
import sys
from pathlib import Path

import fitz
from PIL import Image

QUALITY = 78


def recompress(path: Path) -> None:
    before_kb = path.stat().st_size // 1024
    document = fitz.open(path)
    seen: set[int] = set()
    for page in document:
        for image in page.get_images(full=True):
            xref = image[0]
            if xref in seen:
                continue
            seen.add(xref)
            info = document.extract_image(xref)
            if info["ext"] not in ("jpeg", "jpg"):
                continue
            pil_image = Image.open(io.BytesIO(info["image"])).convert("RGB")
            buffer = io.BytesIO()
            pil_image.save(buffer, format="JPEG", quality=QUALITY, optimize=True)
            recompressed = buffer.getvalue()
            if len(recompressed) < len(info["image"]):
                page.replace_image(xref, stream=recompressed)
    output = path.with_suffix(".tmp.pdf")
    document.save(output, garbage=4, deflate=True, clean=True)
    document.close()
    output.replace(path)
    after_kb = path.stat().st_size // 1024
    print(f"{path.name}: {before_kb} KB -> {after_kb} KB")


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", type=Path, nargs="+")
    args = parser.parse_args()
    for path in args.paths:
        recompress(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
