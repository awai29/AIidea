from PIL import Image
import json, os, tempfile
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from pipeline.pack import pack_spritesheet


def make_frames(tmpdir: str, prefix: str, count: int,
                size=(32, 48), color=(220, 50, 50, 255)) -> list:
    paths = []
    for i in range(count):
        img = Image.new('RGBA', size, color)
        p = os.path.join(tmpdir, f'{prefix}-{i + 1:02d}.png')
        img.save(p)
        paths.append(p)
    return paths


def test_pack_creates_sheet_and_atlas():
    with tempfile.TemporaryDirectory() as d:
        anims = {
            'idle': make_frames(d, 'idle', 4, color=(220, 50, 50, 255)),
            'walk': make_frames(d, 'walk', 6, color=(50, 50, 220, 255)),
        }
        sheet_path = os.path.join(d, 'sheet.png')
        atlas_path = os.path.join(d, 'atlas.json')
        pack_spritesheet(anims, sheet_path, atlas_path, frame_width=32, frame_height=48)
        assert os.path.exists(sheet_path)
        assert os.path.exists(atlas_path)


def test_atlas_has_correct_structure():
    with tempfile.TemporaryDirectory() as d:
        anims = {
            'idle': make_frames(d, 'idle', 3),
            'attack': make_frames(d, 'attack', 2),
        }
        sheet_path = os.path.join(d, 'sheet.png')
        atlas_path = os.path.join(d, 'atlas.json')
        pack_spritesheet(anims, sheet_path, atlas_path, frame_width=32, frame_height=48)
        atlas = json.loads(open(atlas_path).read())
        assert atlas['frameWidth'] == 32
        assert atlas['frameHeight'] == 48
        assert 'idle' in atlas['animations']
        assert 'attack' in atlas['animations']
        assert len(atlas['animations']['idle']['frames']) == 3
        assert len(atlas['animations']['attack']['frames']) == 2


def test_atlas_frame_coordinates_are_correct():
    with tempfile.TemporaryDirectory() as d:
        anims = {'idle': make_frames(d, 'idle', 3)}
        sheet_path = os.path.join(d, 'sheet.png')
        atlas_path = os.path.join(d, 'atlas.json')
        pack_spritesheet(anims, sheet_path, atlas_path, frame_width=32, frame_height=48)
        atlas = json.loads(open(atlas_path).read())
        frames = atlas['animations']['idle']['frames']
        assert frames[0] == {'x': 0,  'y': 0, 'w': 32, 'h': 48}
        assert frames[1] == {'x': 32, 'y': 0, 'w': 32, 'h': 48}
        assert frames[2] == {'x': 64, 'y': 0, 'w': 32, 'h': 48}


def test_sheet_pixel_dimensions():
    with tempfile.TemporaryDirectory() as d:
        anims = {
            'idle':   make_frames(d, 'idle', 4),
            'walk':   make_frames(d, 'walk', 6),
            'attack': make_frames(d, 'atk',  3),
        }
        sheet_path = os.path.join(d, 'sheet.png')
        pack_spritesheet(anims, sheet_path, os.path.join(d, 'atlas.json'),
                         frame_width=32, frame_height=48)
        sheet = Image.open(sheet_path)
        assert sheet.width == 6 * 32   # max frames = 6
        assert sheet.height == 3 * 48  # 3 animations
