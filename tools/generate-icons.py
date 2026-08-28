#!/usr/bin/env python3
"""
Generate the PWA / home-screen icon set (ISSUE-033).

Committed as a script rather than as five opaque PNGs so the marks can be
re-derived when the palette moves. Run from the repo root:

    python3 tools/generate-icons.py

Design: the Ring theme's own vocabulary, because that is the default theme --
a dark "rope" frame around the tan canvas, holding the red corner and the blue
corner. Those are literally the two vote buttons a voter taps, in the same two
hues, so the icon reads as the product rather than as decoration. Flat fills,
no gradients or shadows (see DESIGN.md).

Colours are copied from `.theme-ring` in src/app/globals.css; keep them in sync.
"""

from PIL import Image, ImageDraw

CANVAS = "#f5e6d3"  # --ring-canvas
ROPE = "#1a1a1a"    # --ring-rope
RED = "#dc2626"     # --ring-red   (corner A)
BLUE = "#2563eb"    # --ring-blue  (corner B)

SS = 4  # supersampling factor -- PIL has no antialiased shape drawing


def draw_mark(size: int, scale: float = 1.0) -> Image.Image:
    """Render the mark on an opaque canvas. `scale` shrinks the composition
    toward the centre, which is how the maskable variant keeps its content
    inside the 80% safe zone that Android's mask can crop to."""
    s = size * SS
    img = Image.new("RGB", (s, s), CANVAS)
    d = ImageDraw.Draw(img)

    # Composition box, centred and scaled.
    box = s * scale
    off = (s - box) / 2

    def px(frac: float) -> float:
        return off + box * frac

    # Rope frame.
    stroke = box * 0.055
    d.rounded_rectangle(
        [px(0.10), px(0.10), px(0.90), px(0.90)],
        radius=box * 0.20,
        outline=ROPE,
        width=int(round(stroke)),
    )

    # Two corners inside the frame.
    inner_pad = 0.10 + 0.055 + 0.055
    left, right = px(inner_pad), px(1 - inner_pad)
    top, bottom = px(inner_pad), px(1 - inner_pad)
    gap = box * 0.05
    bar_w = ((right - left) - gap) / 2
    radius = box * 0.045

    d.rounded_rectangle([left, top, left + bar_w, bottom], radius=radius, fill=RED)
    d.rounded_rectangle([right - bar_w, top, right, bottom], radius=radius, fill=BLUE)

    return img.resize((size, size), Image.LANCZOS)


OUTPUTS = [
    ("public/icon-192.png", 192, 1.0),
    ("public/icon-512.png", 512, 1.0),
    # Android may crop a maskable icon to a circle inscribed in the central
    # 80%. Shrinking the mark keeps the frame whole under any mask shape.
    ("public/icon-maskable-512.png", 512, 0.78),
    # iOS ignores transparency and applies its own corner radius, so this one
    # is full-bleed and un-rounded on purpose.
    ("src/app/apple-icon.png", 180, 1.0),
]

if __name__ == "__main__":
    for path, size, scale in OUTPUTS:
        draw_mark(size, scale).save(path, "PNG", optimize=True)
        print(f"wrote {path} ({size}x{size}, scale={scale})")
