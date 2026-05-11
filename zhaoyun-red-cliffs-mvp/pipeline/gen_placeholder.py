"""
gen_placeholder.py：產生測試用 placeholder spritesheet。
每個動作 2 幀，每幀為純色矩形，供遊戲端整合驗證使用。
"""
from PIL import Image
import json, os, sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES_ROOT = os.path.join(REPO_ROOT, 'zhaoyun-mvp', 'assets', 'sprites')

CHARACTERS = {
    'zhaoyun':       (50, 100, 200),   # 藍
    'wei-swordsman': (200, 80, 80),    # 紅
    'wei-spearman':  (80, 180, 80),    # 綠
}
ACTIONS = ['idle', 'walk', 'attack', 'hurt', 'death']
FRAME_W, FRAME_H = 48, 64
FRAMES_PER_ACTION = 2
FPS = {'idle': 8, 'walk': 10, 'attack': 12, 'hurt': 10, 'death': 6}


def gen_placeholder(character: str, base_color: tuple):
    runtime_dir = os.path.join(SPRITES_ROOT, character, 'runtime')
    os.makedirs(runtime_dir, exist_ok=True)

    num_actions = len(ACTIONS)
    sheet_w = FRAMES_PER_ACTION * FRAME_W
    sheet_h = num_actions * FRAME_H
    sheet = Image.new('RGBA', (sheet_w, sheet_h), (0, 0, 0, 0))

    atlas = {
        'frameWidth': FRAME_W,
        'frameHeight': FRAME_H,
        'animations': {},
    }

    for row, action in enumerate(ACTIONS):
        anim_frames = []
        for col in range(FRAMES_PER_ACTION):
            r = min(255, base_color[0] + col * 20)
            g = min(255, base_color[1] + col * 20)
            b = min(255, base_color[2] + col * 20)
            frame = Image.new('RGBA', (FRAME_W, FRAME_H), (r, g, b, 255))
            x, y = col * FRAME_W, row * FRAME_H
            sheet.paste(frame, (x, y))
            anim_frames.append({'x': x, 'y': y, 'w': FRAME_W, 'h': FRAME_H})

        atlas['animations'][action] = {'frames': anim_frames, 'fps': FPS[action]}

    sheet.save(os.path.join(runtime_dir, 'sheet.png'))
    with open(os.path.join(runtime_dir, 'atlas.json'), 'w') as f:
        json.dump(atlas, f, indent=2)
    print(f'  {character}: {runtime_dir}')


if __name__ == '__main__':
    print('Generating placeholder sprites...')
    for char, color in CHARACTERS.items():
        gen_placeholder(char, color)
    print('Done.')
