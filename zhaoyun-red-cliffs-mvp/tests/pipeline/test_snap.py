from PIL import Image
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from pipeline.snap import pixel_snap


def make_gradient(size=(256, 256)) -> Image.Image:
    img = Image.new('RGB', size)
    pixels = [(int(x * 255 / size[0]), int(y * 255 / size[1]), 128)
              for y in range(size[1]) for x in range(size[0])]
    img.putdata(pixels)
    return img.convert('RGBA')


def test_snap_output_size():
    img = make_gradient()
    result = pixel_snap(img, 48, 64, colors=16)
    assert result.size == (48, 64)


def test_snap_mode_is_rgba():
    img = make_gradient()
    result = pixel_snap(img, 32, 32, colors=16)
    assert result.mode == 'RGBA'


def test_snap_reduces_unique_colors():
    img = make_gradient()
    result = pixel_snap(img, 48, 64, colors=16)
    rgb_pixels = [(r, g, b) for r, g, b, a in result.getdata() if a > 0]
    unique = set(rgb_pixels)
    assert len(unique) <= 32  # 量化後 unique 顏色應顯著減少


def test_snap_preserves_transparency():
    img = Image.new('RGBA', (128, 128), (255, 0, 0, 0))  # 全透明
    result = pixel_snap(img, 32, 32, colors=16)
    pixels = list(result.getdata())
    transparent = [p for p in pixels if p[3] == 0]
    assert len(transparent) > 0
