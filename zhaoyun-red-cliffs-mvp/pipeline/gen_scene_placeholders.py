"""
gen_scene_placeholders.py：產生場景圖層 placeholder PNG。
給每個場景資源生成有標籤的彩色矩形，供程式碼整合驗證。
"""
from PIL import Image, ImageDraw, ImageFont
import os

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCENE_DIR = os.path.join(REPO_ROOT, 'zhaoyun-mvp', 'assets', 'scene')

ASSETS = [
    # (key,          w,   h,   RGBA color,                  layer)
    ('bg-mountains', 800, 130, (30,  20, 40,  220),        'FAR'),
    ('bg-river',     800,  35, (10,  21, 32,  200),        'FAR'),
    ('bg-camp',      800,  90, (42,  24, 16,  210),        'FAR'),
    ('mid-tent',     120, 110, (61,  32, 16,  230),        'MID'),
    ('mid-flag-pole', 50, 130, (42,  26,  8,  240),        'MID'),
    ('mid-bonfire',   60,  60, (180, 80, 10,  230),        'MID'),
    ('fg-flag-tall',  90, 220, (139,  0,  0,  230),        'FG'),
    ('fg-grass',     100,  55, (139,115, 85,  220),        'FG'),
    ('fg-rock',       80,  50, (107,107, 90,  230),        'FG'),
    ('fg-smoke',     140,  90, (180,180,180,  80),         'FG'),
]

def gen_placeholder(key, w, h, color, layer):
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # 填色塊
    draw.rectangle([0, 0, w-1, h-1], fill=color)
    # 標籤文字
    label = f'{layer}:{key}'
    draw.text((4, 4), label, fill=(255, 255, 255, 200))
    path = os.path.join(SCENE_DIR, f'{key}.png')
    img.save(path)
    print(f'  {path}')

if __name__ == '__main__':
    os.makedirs(SCENE_DIR, exist_ok=True)
    print('Generating scene placeholders...')
    for row in ASSETS:
        gen_placeholder(*row)
    print('Done.')
