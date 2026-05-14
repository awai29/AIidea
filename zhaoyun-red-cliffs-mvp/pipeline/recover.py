"""
recover：從 pose board 抽取單幀。
使用背景色偵測 + soft alpha 去背 + bounding box 緊剪。
"""
from PIL import Image
import os
import argparse

from pipeline.matte import apply_distance_matte, detect_bg_color, strip_residual_bg_fringe


def recover_frames(
    poseboard_path: str,
    output_dir: str,
    rows: int = 3,
    cols: int = 4,
    tolerance: int = 35,
) -> list:
    """
    從 pose board 抽取每格角色：
    1. 偵測背景色
    2. Chroma key 去背（替換為透明）
    3. 每格找 non-transparent bounding box
    4. 裁剪並儲存

    回傳輸出檔案路徑列表（frame-01.png, frame-02.png, ...）
    """
    img = Image.open(poseboard_path).convert('RGBA')
    W, H = img.size
    cell_w, cell_h = W // cols, H // rows

    bg_color = detect_bg_color(img)

    paths = []
    for row in range(rows):
        for col in range(cols):
            x0, y0 = col * cell_w, row * cell_h
            cell = img.crop((x0, y0, x0 + cell_w, y0 + cell_h)).convert('RGBA')
            result = apply_distance_matte(
                cell,
                bg_color=bg_color,
                low=float(tolerance),
                high=float(max(tolerance * 5, tolerance + 90)),
            )
            result = strip_residual_bg_fringe(result, bg_color=bg_color, passes=2)

            # 緊剪：找非透明區域邊界，但至少保留 1px 邊界
            bbox = result.getbbox()
            if bbox:
                x0, y0, x1, y1 = bbox
                # 擴大邊界 1px 以包含透明邊框
                x0 = max(0, x0 - 1)
                y0 = max(0, y0 - 1)
                x1 = min(result.width, x1 + 1)
                y1 = min(result.height, y1 + 1)
                result = result.crop((x0, y0, x1, y1))

            idx = row * cols + col + 1
            path = os.path.join(output_dir, f'frame-{idx:02d}.png')
            result.save(path)
            paths.append(path)

    return paths


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Recover frames from pose board')
    parser.add_argument('poseboard', help='Pose board PNG path')
    parser.add_argument('output_dir', help='Output directory for frames')
    parser.add_argument('--rows', type=int, default=3)
    parser.add_argument('--cols', type=int, default=4)
    parser.add_argument('--tolerance', type=int, default=35)
    args = parser.parse_args()
    os.makedirs(args.output_dir, exist_ok=True)
    paths = recover_frames(args.poseboard, args.output_dir, args.rows, args.cols, args.tolerance)
    print(f'Recovered {len(paths)} frames → {args.output_dir}')
