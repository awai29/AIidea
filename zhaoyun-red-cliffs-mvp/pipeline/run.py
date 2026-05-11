"""
run.py：全流程 CLI。

用法：
  python pipeline/run.py snap    --input ref.png --output anchor.png
  python pipeline/run.py recover --poseboard pb.png --character zhaoyun --action idle --rows 3 --cols 4
  python pipeline/run.py align   --character zhaoyun --action idle
  python pipeline/run.py pack    --character zhaoyun
  python pipeline/run.py all     --poseboard pb.png --character zhaoyun --action idle --rows 3 --cols 4
"""
import argparse
import glob
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
SPRITES_ROOT = os.path.join(REPO_ROOT, 'zhaoyun-mvp', 'assets', 'sprites')

sys.path.insert(0, REPO_ROOT)

from pipeline.snap import snap_file
from pipeline.recover import recover_frames
from pipeline.align import align_frames_by_feet
from pipeline.pack import pack_spritesheet


def get_dirs(character: str, action: str) -> dict:
    base = os.path.join(SPRITES_ROOT, character, action)
    return {
        'base': base,
        'recovered': os.path.join(base, 'recovered'),
        'aligned': os.path.join(base, 'aligned'),
        'runtime': os.path.join(SPRITES_ROOT, character, 'runtime'),
    }


def cmd_snap(args):
    snap_file(args.input, args.output,
              target_w=args.width, target_h=args.height, colors=args.colors)


def cmd_recover(args):
    dirs = get_dirs(args.character, args.action)
    os.makedirs(dirs['recovered'], exist_ok=True)
    paths = recover_frames(
        args.poseboard, dirs['recovered'],
        rows=args.rows, cols=args.cols,
        tolerance=args.tolerance,
    )
    print(f'Recovered {len(paths)} frames → {dirs["recovered"]}')


def cmd_align(args):
    dirs = get_dirs(args.character, args.action)
    frame_paths = sorted(glob.glob(os.path.join(dirs['recovered'], 'frame-*.png')))
    if not frame_paths:
        print(f'No recovered frames found in {dirs["recovered"]}')
        sys.exit(1)
    os.makedirs(dirs['aligned'], exist_ok=True)
    _, W, H = align_frames_by_feet(frame_paths, dirs['aligned'])
    print(f'Aligned {len(frame_paths)} frames ({W}×{H}) → {dirs["aligned"]}')


def cmd_pack(args):
    base = os.path.join(SPRITES_ROOT, args.character)
    ACTIONS = ['idle', 'walk', 'attack', 'hurt', 'death']
    animations = {}
    for action in ACTIONS:
        pattern = os.path.join(base, action, 'aligned', 'frame-*.png')
        paths = sorted(glob.glob(pattern))
        if paths:
            animations[action] = paths

    if not animations:
        print(f'No aligned frames found for {args.character}')
        sys.exit(1)

    runtime_dir = os.path.join(base, 'runtime')
    os.makedirs(runtime_dir, exist_ok=True)
    pack_spritesheet(
        animations,
        output_sheet=os.path.join(runtime_dir, 'sheet.png'),
        output_atlas=os.path.join(runtime_dir, 'atlas.json'),
        frame_width=args.width,
        frame_height=args.height,
    )


def cmd_all(args):
    """recover → align → pack。"""
    cmd_recover(args)
    cmd_align(args)
    cmd_pack(args)


def main():
    parser = argparse.ArgumentParser(description='Sprite pipeline CLI')
    sub = parser.add_subparsers(dest='command')

    # snap
    p_snap = sub.add_parser('snap')
    p_snap.add_argument('--input', required=True)
    p_snap.add_argument('--output', required=True)
    p_snap.add_argument('--width', type=int, default=48)
    p_snap.add_argument('--height', type=int, default=64)
    p_snap.add_argument('--colors', type=int, default=16)

    # recover
    p_rec = sub.add_parser('recover')
    p_rec.add_argument('--poseboard', required=True)
    p_rec.add_argument('--character', required=True)
    p_rec.add_argument('--action', required=True)
    p_rec.add_argument('--rows', type=int, default=3)
    p_rec.add_argument('--cols', type=int, default=4)
    p_rec.add_argument('--tolerance', type=int, default=35)

    # align
    p_aln = sub.add_parser('align')
    p_aln.add_argument('--character', required=True)
    p_aln.add_argument('--action', required=True)

    # pack
    p_pack = sub.add_parser('pack')
    p_pack.add_argument('--character', required=True)
    p_pack.add_argument('--width', type=int, default=48)
    p_pack.add_argument('--height', type=int, default=64)

    # all
    p_all = sub.add_parser('all')
    p_all.add_argument('--poseboard', required=True)
    p_all.add_argument('--character', required=True)
    p_all.add_argument('--action', required=True)
    p_all.add_argument('--rows', type=int, default=3)
    p_all.add_argument('--cols', type=int, default=4)
    p_all.add_argument('--tolerance', type=int, default=35)
    p_all.add_argument('--width', type=int, default=48)
    p_all.add_argument('--height', type=int, default=64)

    args = parser.parse_args()
    if args.command == 'snap':
        cmd_snap(args)
    elif args.command == 'recover':
        cmd_recover(args)
    elif args.command == 'align':
        cmd_align(args)
    elif args.command == 'pack':
        cmd_pack(args)
    elif args.command == 'all':
        cmd_all(args)
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
