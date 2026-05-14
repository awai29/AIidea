from PIL import Image, ImageDraw
import os, tempfile
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from pipeline.recover import detect_bg_color, recover_frames


def make_poseboard(rows=3, cols=4, cell_size=64, bg=(0, 200, 0)) -> Image.Image:
    """建立測試用 pose board：純色背景 + 每格有一個彩色矩形。"""
    img = Image.new('RGB', (cols * cell_size, rows * cell_size), bg)
    draw = ImageDraw.Draw(img)
    colors = [(220, 50, 50), (50, 50, 220), (220, 220, 50), (150, 50, 220)]
    for row in range(rows):
        for col in range(cols):
            pad = cell_size // 4
            x0 = col * cell_size + pad
            y0 = row * cell_size + pad
            x1 = (col + 1) * cell_size - pad
            y1 = (row + 1) * cell_size - pad
            draw.rectangle([x0, y0, x1, y1], fill=colors[(row * cols + col) % len(colors)])
    return img


def test_detect_bg_color_returns_dominant_corner_color():
    img = make_poseboard(bg=(0, 200, 0))
    bg = detect_bg_color(img)
    assert abs(bg[0] - 0) < 10
    assert abs(bg[1] - 200) < 10
    assert abs(bg[2] - 0) < 10


def test_recover_extracts_correct_frame_count():
    with tempfile.TemporaryDirectory() as d:
        pb = make_poseboard(rows=3, cols=4)
        pb_path = os.path.join(d, 'pb.png')
        pb.save(pb_path)
        out = os.path.join(d, 'recovered')
        os.makedirs(out)
        paths = recover_frames(pb_path, out, rows=3, cols=4)
        assert len(paths) == 12
        assert all(os.path.exists(p) for p in paths)


def test_recovered_frames_are_rgba():
    with tempfile.TemporaryDirectory() as d:
        pb = make_poseboard(rows=1, cols=2, cell_size=64)
        pb_path = os.path.join(d, 'pb.png')
        pb.save(pb_path)
        out = os.path.join(d, 'recovered')
        os.makedirs(out)
        paths = recover_frames(pb_path, out, rows=1, cols=2)
        for p in paths:
            img = Image.open(p)
            assert img.mode == 'RGBA'


def test_recovered_frames_have_transparent_background():
    with tempfile.TemporaryDirectory() as d:
        pb = make_poseboard(rows=1, cols=1, cell_size=64, bg=(0, 200, 0))
        pb_path = os.path.join(d, 'pb.png')
        pb.save(pb_path)
        out = os.path.join(d, 'recovered')
        os.makedirs(out)
        paths = recover_frames(pb_path, out, rows=1, cols=1)
        frame = Image.open(paths[0]).convert('RGBA')
        pixels = list(frame.getdata())
        transparent = [p for p in pixels if p[3] == 0]
        assert len(transparent) > 0


def test_recover_softens_chroma_spill_on_edges():
    with tempfile.TemporaryDirectory() as d:
        bg = (255, 0, 255)
        img = Image.new('RGB', (64, 64), bg)
        draw = ImageDraw.Draw(img)
        draw.rectangle([18, 18, 46, 46], fill=(40, 80, 220))
        # 模擬被洋紅背景污染的抗鋸齒邊
        draw.rectangle([17, 17, 47, 47], outline=(180, 40, 180))

        pb_path = os.path.join(d, 'pb.png')
        img.save(pb_path)
        out = os.path.join(d, 'recovered')
        os.makedirs(out)

        [frame_path] = recover_frames(pb_path, out, rows=1, cols=1, tolerance=24)
        frame = Image.open(frame_path).convert('RGBA')
        pixels = list(frame.getdata())
        magentaish = [
            p for p in pixels
            if p[3] > 0 and p[0] > 170 and p[2] > 170 and p[1] < 120
        ]
        assert len(magentaish) == 0
