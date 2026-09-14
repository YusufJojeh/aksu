"""Render two PDFs identically and write side-by-side, overlay, and pixel-difference images."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import fitz
from PIL import Image, ImageChops, ImageEnhance, ImageStat


def render(page: fitz.Page, dpi: int) -> Image.Image:
    pixmap = page.get_pixmap(dpi=dpi, alpha=False)
    return Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("reference", type=Path)
    parser.add_argument("generated", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--dpi", type=int, default=200)
    parser.add_argument("--pages", default="1,2,3")
    args = parser.parse_args()

    args.output.mkdir(parents=True, exist_ok=True)
    reference = fitz.open(args.reference)
    generated = fitz.open(args.generated)
    requested = [int(value) for value in args.pages.split(",")]
    metrics: dict[str, object] = {
        "reference_pages": reference.page_count,
        "generated_pages": generated.page_count,
        "reference_boxes": [],
        "generated_boxes": [],
        "pages": {},
    }
    for document, key in ((reference, "reference_boxes"), (generated, "generated_boxes")):
        metrics[key] = [
            {"width": round(page.rect.width, 3), "height": round(page.rect.height, 3), "rotation": page.rotation}
            for page in document
        ]

    for number in requested:
        expected = render(reference[number - 1], args.dpi)
        actual = render(generated[number - 1], args.dpi)
        if expected.size != actual.size:
            raise RuntimeError(f"page {number}: render sizes differ: {expected.size} != {actual.size}")
        difference = ImageChops.difference(expected, actual)
        stat = ImageStat.Stat(difference)
        changed = sum(1 for pixel in difference.convert("L").getdata() if pixel)
        ratio = changed / (difference.width * difference.height)
        mean = sum(stat.mean) / len(stat.mean)
        metrics["pages"][str(number)] = {"changed_pixel_ratio": ratio, "mean_absolute_difference": mean}

        expected.save(args.output / f"page-{number}-reference.png")
        actual.save(args.output / f"page-{number}-generated.png")
        ImageEnhance.Contrast(difference).enhance(4).save(args.output / f"page-{number}-difference.png")
        Image.blend(expected, actual, 0.5).save(args.output / f"page-{number}-overlay.png")
        side = Image.new("RGB", (expected.width * 2, expected.height), "white")
        side.paste(expected, (0, 0))
        side.paste(actual, (expected.width, 0))
        side.save(args.output / f"page-{number}-side-by-side.png")

    (args.output / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
