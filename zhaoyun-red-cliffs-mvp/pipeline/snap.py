"""
pixel_snap：將 AI 生成圖縮小到目標像素尺寸並量化調色板。
消除 mixels（偽像素），產生真正的像素藝術。
"""
from PIL import Image
import argparse


def pixel_snap(img: Image.Image, target_w: int, target_h: int, colors: int = 16) -> Image.Image:
    """
    Pixel snap 單張圖片。

    1. 用 Lanczos 縮小到目標尺寸（高品質降採樣）
    2. 量化 RGB 調色板（去除 mixels）
    3. 保留原 alpha channel（避免量化影響透明度）

    回傳 RGBA 模式的圖片。
    """
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    r, g, b, a = img.split()

    rgb = Image.merge('RGB', (r, g, b))
    rgb_small = rgb.resize((target_w, target_h), Image.LANCZOS)

    quantized = rgb_small.quantize(colors=colors, method=Image.Quantize.FASTOCTREE)
    rgb_result = quantized.convert('RGB')

    a_small = a.resize((target_w, target_h), Image.NEAREST)

    result = rgb_result.convert('RGBA')
    result.putalpha(a_small)
    return result


def snap_file(input_path: str, output_path: str,
              target_w: int = 48, target_h: int = 64,
              colors: int = 16) -> None:
    img = Image.open(input_path).convert('RGBA')
    result = pixel_snap(img, target_w, target_h, colors)
    result.save(output_path)
    print(f'Snapped {input_path} → {output_path} ({target_w}×{target_h}, {colors} colors)')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Pixel snap an image')
    parser.add_argument('input', help='Input PNG path')
    parser.add_argument('output', help='Output PNG path')
    parser.add_argument('--width', type=int, default=48)
    parser.add_argument('--height', type=int, default=64)
    parser.add_argument('--colors', type=int, default=16)
    args = parser.parse_args()
    snap_file(args.input, args.output, args.width, args.height, args.colors)
