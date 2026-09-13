"""Derive a reusable blank MB template from a supplied latest real report.

The source reference is never modified. Text redactions remove only dynamic text;
line art and images remain source artwork. Checkbox fills are reset by redrawing
the original blank square at the measured source coordinates.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import fitz


GOLD = (0.72, 0.51, 0.18)


PROFILES = {
    "fr": {
        "page1": [(88, 447, 180, 470), (78, 523, 194, 566), (80, 591, 150, 614), (82, 708, 205, 731), (88, 774, 170, 799)],
        "condition_x": 50.0,
        "condition_y": [662.9, 632.9, 602.9, 572.9, 542.9, 512.9, 482.9, 452.9],
        "recommended_x": 297.5,
        "recommended_y": [329.4, 299.4, 269.4, 239.4, 209.4, 179.4, 149.4, 119.4],
        "checkbox_y_offset": 0.0,
        "totals": [(380, 370, 510, 415), (365, 690, 510, 740)],
    },
    "ar": {
        "page1": [(188, 452, 235, 478), (150, 520, 241, 541), (186, 584, 236, 605), (137, 636, 230, 662), (100, 700, 236, 721)],
        "condition_x": 283.4,
        "condition_y": [671.6, 639.7, 611.1, 584.4, 555.1, 524.4, 492.6, 463.2],
        "recommended_x": 543.9,
        "recommended_y": [338.4, 306.6, 277.7, 248.4, 219.1, 187.2, 157.9, 128.7],
        "checkbox_y_offset": -8.0,
        "totals": [(35, 370, 300, 420), (35, 690, 300, 740)],
    },
}


def add_text_redactions(page: fitz.Page, rectangles: list[tuple[float, float, float, float]]) -> None:
    for rectangle in rectangles:
        page.add_redact_annot(fitz.Rect(*rectangle), fill=None, cross_out=False)
    page.apply_redactions(images=0, graphics=0, text=0)


def reset_checkbox(page: fitz.Page, x: float, bottom_y: float, offset: float) -> None:
    center_y = page.rect.height - (bottom_y + offset)
    # Selected source reports use colored strokes that extend just beyond the
    # printed checkbox. Clear that complete mark before restoring the artwork.
    clear_half = 12.0
    page.draw_rect(
        fitz.Rect(x - clear_half, center_y - clear_half, x + clear_half, center_y + clear_half),
        color=(1, 1, 1),
        fill=(1, 1, 1),
        width=0,
        overlay=True,
    )
    half = 6.6
    page.draw_rect(
        fitz.Rect(x - half, center_y - half, x + half, center_y + half),
        color=GOLD,
        fill=(1, 1, 1),
        width=0.8,
        overlay=True,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("locale", choices=PROFILES)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    profile = PROFILES[args.locale]
    document = fitz.open(args.source)
    add_text_redactions(document[0], profile["page1"])
    for y in profile["condition_y"]:
        reset_checkbox(document[1], profile["condition_x"], y, profile["checkbox_y_offset"])
    for y in profile["recommended_y"]:
        reset_checkbox(document[1], profile["recommended_x"], y, profile["checkbox_y_offset"])
    add_text_redactions(document[2], [(35, 185, 560, 355), *profile["totals"][:1], (25, 505, 560, 675), *profile["totals"][1:]])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    document.save(args.output, garbage=4, deflate=True, clean=True)


if __name__ == "__main__":
    main()
