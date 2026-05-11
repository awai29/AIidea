from PIL import Image
import os, tempfile
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from pipeline.align import align_frames_by_feet


def make_frame(w: int, h: int, color=(220, 50, 50, 255)) -> Image.Image:
    return Image.new('RGBA', (w, h), color)


def test_align_all_frames_same_size():
    with tempfile.TemporaryDirectory() as d:
        frames = [make_frame(30, 40), make_frame(20, 55), make_frame(38, 45)]
        paths = []
        for i, f in enumerate(frames):
            p = os.path.join(d, f'frame-{i:02d}.png')
            f.save(p)
            paths.append(p)
        out = os.path.join(d, 'aligned')
        os.makedirs(out)
        out_paths, W, H = align_frames_by_feet(paths, out)
        sizes = [Image.open(p).size for p in out_paths]
        assert all(s == (W, H) for s in sizes)


def test_align_canvas_fits_all_frames():
    with tempfile.TemporaryDirectory() as d:
        frames = [make_frame(30, 40), make_frame(20, 55), make_frame(38, 45)]
        paths = []
        for i, f in enumerate(frames):
            p = os.path.join(d, f'frame-{i:02d}.png')
            f.save(p)
            paths.append(p)
        out = os.path.join(d, 'aligned')
        os.makedirs(out)
        _, W, H = align_frames_by_feet(paths, out)
        assert W >= 38
        assert H >= 55


def test_align_frames_are_rgba():
    with tempfile.TemporaryDirectory() as d:
        frames = [make_frame(32, 48)]
        p = os.path.join(d, 'frame-01.png')
        frames[0].save(p)
        out = os.path.join(d, 'aligned')
        os.makedirs(out)
        out_paths, _, _ = align_frames_by_feet([p], out)
        for op in out_paths:
            assert Image.open(op).mode == 'RGBA'


def test_align_bottom_row_has_content():
    """底部對齊後，每幀的最底一行應有非透明像素（角色腳底在底部）。"""
    with tempfile.TemporaryDirectory() as d:
        frame = make_frame(32, 48, (220, 50, 50, 255))
        p = os.path.join(d, 'frame-01.png')
        frame.save(p)
        out = os.path.join(d, 'aligned')
        os.makedirs(out)
        out_paths, W, H = align_frames_by_feet([p], out)
        result = Image.open(out_paths[0]).convert('RGBA')
        bottom_row = [result.getpixel((x, H - 1)) for x in range(W)]
        non_transparent = [px for px in bottom_row if px[3] > 0]
        assert len(non_transparent) > 0
