"""
pack：將對齊後的幀打包成 runtime spritesheet + atlas.json。
版面：每個動作佔一行，幀從左到右排列。
"""
from PIL import Image
import json
import os
import argparse


def pack_spritesheet(
    animations: dict,
    output_sheet: str,
    output_atlas: str,
    frame_width: int = 48,
    frame_height: int = 64,
    fps_defaults: dict = None,
) -> None:
    """
    animations: {'idle': ['frame-01.png', ...], 'walk': [...], ...}
    fps_defaults: 各動作 fps（未指定的用內建預設）

    Sheet 版面（每行一個動作）：
      row 0 → idle frames
      row 1 → walk frames
      ...
    """
    if fps_defaults is None:
        fps_defaults = {}

    DEFAULT_FPS = {'idle': 8, 'walk': 10, 'attack': 12, 'hurt': 10, 'death': 6}
    fps_defaults = {**DEFAULT_FPS, **fps_defaults}

    max_frames = max(len(v) for v in animations.values())
    num_actions = len(animations)
    sheet_w = max_frames * frame_width
    sheet_h = num_actions * frame_height

    sheet = Image.new('RGBA', (sheet_w, sheet_h), (0, 0, 0, 0))
    atlas = {
        'frameWidth': frame_width,
        'frameHeight': frame_height,
        'animations': {},
    }

    for row, (action, frame_paths) in enumerate(animations.items()):
        anim_frames = []
        for col, path in enumerate(frame_paths):
            frame = Image.open(path).convert('RGBA')
            if frame.size != (frame_width, frame_height):
                frame = frame.resize((frame_width, frame_height), Image.NEAREST)
            x = col * frame_width
            y = row * frame_height
            sheet.paste(frame, (x, y), frame)
            anim_frames.append({'x': x, 'y': y, 'w': frame_width, 'h': frame_height})

        atlas['animations'][action] = {
            'frames': anim_frames,
            'fps': fps_defaults.get(action, 8),
        }

    sheet.save(output_sheet)
    with open(output_atlas, 'w', encoding='utf-8') as f:
        json.dump(atlas, f, indent=2)

    print(f'Packed {num_actions} animations × up to {max_frames} frames → {output_sheet}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Pack frames into spritesheet')
    parser.add_argument('character_dir', help='Character directory')
    parser.add_argument('--width', type=int, default=48)
    parser.add_argument('--height', type=int, default=64)
    args = parser.parse_args()

    import glob
    ACTIONS = ['idle', 'walk', 'attack', 'hurt', 'death']
    animations = {}
    for action in ACTIONS:
        pattern = os.path.join(args.character_dir, action, 'aligned', 'frame-*.png')
        paths = sorted(glob.glob(pattern))
        if paths:
            animations[action] = paths

    if not animations:
        print('No aligned frames found.')
        exit(1)

    runtime_dir = os.path.join(args.character_dir, 'runtime')
    os.makedirs(runtime_dir, exist_ok=True)
    pack_spritesheet(
        animations,
        output_sheet=os.path.join(runtime_dir, 'sheet.png'),
        output_atlas=os.path.join(runtime_dir, 'atlas.json'),
        frame_width=args.width,
        frame_height=args.height,
    )
