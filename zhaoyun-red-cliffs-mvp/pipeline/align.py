"""
align：以腳底（底部 non-transparent 像素）為基準對齊所有幀。
消除 frame drift（動畫時角色上下漂移）。
"""
from PIL import Image
import os
import argparse


def align_frames_by_feet(
    frame_paths: list,
    output_dir: str,
    canvas_width: int = None,
    canvas_height: int = None,
) -> tuple:
    """
    底部對齊所有幀：
    - 計算最大畫布尺寸
    - 每幀水平置中、垂直靠底部貼齊
    - 其餘區域保持透明

    回傳 (output_paths, canvas_width, canvas_height)
    """
    frames = [Image.open(p).convert('RGBA') for p in frame_paths]

    if canvas_width is None:
        canvas_width = max(f.width for f in frames)
    if canvas_height is None:
        canvas_height = max(f.height for f in frames)

    out_paths = []
    for i, (frame, _) in enumerate(zip(frames, frame_paths)):
        canvas = Image.new('RGBA', (canvas_width, canvas_height), (0, 0, 0, 0))
        x = (canvas_width - frame.width) // 2
        y = canvas_height - frame.height
        canvas.paste(frame, (x, y), frame)
        out_path = os.path.join(output_dir, f'frame-{i + 1:02d}.png')
        canvas.save(out_path)
        out_paths.append(out_path)

    return out_paths, canvas_width, canvas_height


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Align frames by feet')
    parser.add_argument('output_dir', help='Directory containing frame PNGs')
    parser.add_argument('--aligned-dir', default=None)
    args = parser.parse_args()

    import glob
    frame_paths = sorted(glob.glob(os.path.join(args.output_dir, 'frame-*.png')))
    if not frame_paths:
        print(f'No frame-*.png found in {args.output_dir}')
        exit(1)

    aligned_dir = args.aligned_dir or os.path.join(os.path.dirname(args.output_dir), 'aligned')
    os.makedirs(aligned_dir, exist_ok=True)
    out, W, H = align_frames_by_feet(frame_paths, aligned_dir)
    print(f'Aligned {len(out)} frames ({W}×{H}) → {aligned_dir}')
