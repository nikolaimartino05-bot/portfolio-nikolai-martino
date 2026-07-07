#!/usr/bin/env python3
"""Render PPTX slides to PNG (background + images + text)."""
from __future__ import annotations

import os
import sys
from io import BytesIO

from PIL import Image, ImageDraw, ImageFont
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE
from pptx.util import Emu

EMU_PER_INCH = 914400
RENDER_W = 1920
RENDER_H = 1080


def emu_to_px(emu: int, total_emu: int, total_px: int) -> int:
    return int(emu * total_px / total_emu)


def rgb_from_color(color) -> tuple[int, int, int] | None:
    if color is None or color.type is None:
        return None
    try:
        if color.type == 1:  # RGB
            return (color.rgb[0], color.rgb[1], color.rgb[2])
    except Exception:
        pass
    return None


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Georgia.ttf",
        "/System/Library/Fonts/Supplemental/Georgia Bold.ttf" if bold else "",
        "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "",
        "/Library/Fonts/Arial.ttf",
    ]
    path = candidates[1 if bold else 0]
    for p in [path] + candidates:
        if p and os.path.isfile(p):
            try:
                return ImageFont.truetype(p, max(12, size))
            except OSError:
                continue
    return ImageFont.load_default()


def wrap_text(text: str, font: ImageFont.ImageFont, max_width: int, draw: ImageDraw.ImageDraw) -> list[str]:
    words = text.replace("\r", "").split()
    if not words:
        return []
    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        trial = f"{current} {word}"
        if draw.textlength(trial, font=font) <= max_width:
            current = trial
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def draw_text_shape(draw: ImageDraw.ImageDraw, shape, sw: int, sh: int) -> None:
    if not hasattr(shape, "text_frame"):
        return
    text = shape.text.strip()
    if not text:
        return

    x = emu_to_px(shape.left, sw, RENDER_W)
    y = emu_to_px(shape.top, sh, RENDER_H)
    w = max(20, emu_to_px(shape.width, sw, RENDER_W))
    h = max(20, emu_to_px(shape.height, sh, RENDER_H))

    # Background fill if visible
    fill = None
    try:
        fill = rgb_from_color(shape.fill.fore_color)
    except Exception:
        pass
    if fill and shape.fill.type is not None:
        draw.rectangle([x, y, x + w, y + h], fill=fill)

    tf = shape.text_frame
    for para in tf.paragraphs:
        para_text = "".join(run.text for run in para.runs).strip()
        if not para_text:
            continue

        size_pt = 24
        bold = False
        color = (245, 242, 236)
        if para.runs:
            run = para.runs[0]
            if run.font.size:
                size_pt = int(run.font.size.pt)
            bold = bool(run.font.bold)
            c = rgb_from_color(run.font.color)
            if c:
                color = c

        px_size = max(14, int(size_pt * RENDER_H / 1080 * 1.35))
        font = load_font(px_size, bold=bold)
        lines = wrap_text(para_text, font, w - 8, draw)
        line_h = px_size + 6
        cy = y + 4
        for line in lines:
            if cy + line_h > y + h:
                break
            draw.text((x + 4, cy), line, fill=color, font=font)
            cy += line_h
        y = cy


def paste_picture(canvas: Image.Image, shape, sw: int, sh: int) -> None:
    try:
        img = Image.open(BytesIO(shape.image.blob)).convert("RGBA")
    except Exception:
        return
    x = emu_to_px(shape.left, sw, RENDER_W)
    y = emu_to_px(shape.top, sh, RENDER_H)
    w = max(1, emu_to_px(shape.width, sw, RENDER_W))
    h = max(1, emu_to_px(shape.height, sh, RENDER_H))
    img = img.resize((w, h), Image.Resampling.LANCZOS)
    canvas.paste(img, (x, y), img)


def render_slide(slide, sw: int, sh: int) -> Image.Image:
    canvas = Image.new("RGB", (RENDER_W, RENDER_H), (10, 22, 40))
    draw = ImageDraw.Draw(canvas)

    pictures = []
    texts = []
    for shape in slide.shapes:
        if shape.shape_type == MSO_SHAPE_TYPE.PICTURE:
            pictures.append(shape)
        elif hasattr(shape, "text"):
            texts.append(shape)

    # Full-slide background first
    pictures.sort(key=lambda s: s.width * s.height, reverse=True)
    if pictures:
        paste_picture(canvas, pictures[0], sw, sh)
        draw = ImageDraw.Draw(canvas)
        other_pics = pictures[1:]
    else:
        other_pics = []

    for shape in texts:
        draw_text_shape(draw, shape, sw, sh)

    for shape in other_pics:
        paste_picture(canvas, shape, sw, sh)

    return canvas


def main(pptx_path: str, out_dir: str) -> None:
    os.makedirs(out_dir, exist_ok=True)
    prs = Presentation(pptx_path)
    sw, sh = prs.slide_width, prs.slide_height

    for i, slide in enumerate(prs.slides, 1):
        img = render_slide(slide, sw, sh)
        out = os.path.join(out_dir, f"slide-{i:02d}.png")
        img.save(out, "PNG", optimize=True)
        print(f"Saved {out}")


if __name__ == "__main__":
    pptx = sys.argv[1] if len(sys.argv) > 1 else ""
    out = sys.argv[2] if len(sys.argv) > 2 else ""
    if not pptx or not out:
        print("Usage: render_pptx_slides.py <file.pptx> <out_dir>")
        sys.exit(1)
    main(pptx, out)
