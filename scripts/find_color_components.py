"""List connected saturated-color regions in a rendered PDF page."""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("image", type=Path)
    args = parser.parse_args()
    image = Image.open(args.image).convert("RGB")
    width, height = image.size
    pixels = image.load()
    points = set()
    for y in range(height):
        for x in range(width):
            red, green, blue = pixels[x, y]
            if (red > 190 and red > green * 1.45 and red > blue * 1.45) or (green > 90 and green > red * 1.25 and green > blue * 1.2):
                points.add((x, y))
    components = []
    while points:
        start = points.pop()
        queue = deque([start])
        xs, ys = [start[0]], [start[1]]
        while queue:
            x, y = queue.popleft()
            for neighbor in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if neighbor in points:
                    points.remove(neighbor); queue.append(neighbor); xs.append(neighbor[0]); ys.append(neighbor[1])
        if len(xs) > 40:
            components.append((len(xs), min(xs), min(ys), max(xs), max(ys)))
    for component in sorted(components, reverse=True)[:50]:
        print(component)


if __name__ == "__main__":
    main()
