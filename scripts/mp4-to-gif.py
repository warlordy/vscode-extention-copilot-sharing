import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def get_ffmpeg_binary() -> str:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg was not found in PATH. Install ffmpeg and retry.")
    return ffmpeg


def build_base_filter(crop: str, fps: int, width: int) -> str:
    parts = []
    if crop:
        parts.append(f"crop={crop}")
    parts.append(f"fps={fps}")
    parts.append(f"scale={width}:-1:flags=lanczos")
    return ",".join(parts)

# python .\scripts\mp4-to-gif.py --input .\copilot-share-screen-recording-quickstart.mp4 --preset balanced --fps 12
def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert a video-only MP4 segment into an optimized GIF using ffmpeg palette mode.",
        epilog=(
            "Examples:\n"
            "  python scripts/mp4-to-gif.py --input .\\demo.mp4\n"
            "  python scripts/mp4-to-gif.py --input .\\demo.mp4 --output .\\src\\doc\\readme\\demo.gif\n"
            "  python scripts/mp4-to-gif.py --input .\\demo.mp4 --start 00:00:02 --duration 6\n"
            "  python scripts/mp4-to-gif.py --input .\\demo.mp4 --crop 1600:900:0:90 --preset small\n"
            "  python scripts/mp4-to-gif.py --input .\\demo.mp4 --no-overwrite"
        ),
        formatter_class=argparse.RawTextHelpFormatter,
    )
    parser.add_argument("--input", required=True, help="Path to input MP4 file")
    parser.add_argument("--output", help="Path to output GIF file")
    parser.add_argument("--start", default="00:00:00", help="Start time, e.g. 00:00:02")
    parser.add_argument(
        "--duration",
        type=float,
        help="Duration in seconds. Omit for full video length.",
    )
    parser.add_argument("--fps", type=int, default=12, help="Frames per second (1-60)")
    parser.add_argument("--width", type=int, default=900, help="Output width in px (120-4000)")
    parser.add_argument(
        "--preset",
        choices=["balanced", "small", "quality"],
        default="quality",
        help="Quality-size preset",
    )
    parser.add_argument("--crop", default="", help="Optional crop value: w:h:x:y")
    overwrite_group = parser.add_mutually_exclusive_group()
    overwrite_group.add_argument(
        "--overwrite",
        dest="overwrite",
        action="store_true",
        help="Overwrite output file (default)",
    )
    overwrite_group.add_argument(
        "--no-overwrite",
        dest="overwrite",
        action="store_false",
        help="Do not overwrite output file",
    )
    parser.set_defaults(overwrite=True)
    return parser.parse_args()


def validate_args(args: argparse.Namespace) -> None:
    if args.fps < 1 or args.fps > 60:
        raise ValueError("--fps must be between 1 and 60")
    if args.width < 120 or args.width > 4000:
        raise ValueError("--width must be between 120 and 4000")
    if args.duration is not None and args.duration <= 0:
        raise ValueError("--duration must be greater than 0")


def main() -> int:
    args = parse_args()
    validate_args(args)

    ffmpeg_path = get_ffmpeg_binary()

    input_path = Path(args.input)
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    output_path = Path(args.output) if args.output else input_path.with_suffix(".gif")
    if output_path.exists() and not args.overwrite:
        raise FileExistsError(f"Output exists: {output_path}. Use --overwrite to replace it.")

    fps = args.fps
    width = args.width

    if args.preset == "small":
        if fps == 12:
            fps = 10
        if width == 900:
            width = 720
        dither = "dither=bayer:bayer_scale=3:diff_mode=rectangle"
    elif args.preset == "quality":
        if fps == 12:
            fps = 15
        if width == 900:
            width = 1080
        dither = "dither=sierra2_4a:diff_mode=rectangle"
    else:
        dither = "dither=bayer:bayer_scale=5:diff_mode=rectangle"

    base_filter = build_base_filter(args.crop, fps, width)

    palette_file = None
    try:
        with tempfile.NamedTemporaryFile(prefix="ffmpeg-palette-", suffix=".png", delete=False) as tmp:
            palette_file = Path(tmp.name)

        palette_cmd = [
            ffmpeg_path,
            "-hide_banner",
            "-loglevel",
            "error",
            "-ss",
            args.start,
            "-i",
            str(input_path),
            "-vf",
            f"{base_filter},palettegen=stats_mode=diff",
            "-y",
            str(palette_file),
        ]
        if args.duration is not None:
            palette_cmd[6:6] = ["-t", str(args.duration)]
        subprocess.run(palette_cmd, check=True)

        render_cmd = [
            ffmpeg_path,
            "-hide_banner",
            "-loglevel",
            "error",
            "-ss",
            args.start,
            "-i",
            str(input_path),
            "-i",
            str(palette_file),
            "-lavfi",
            f"{base_filter}[x];[x][1:v]paletteuse={dither}",
            "-loop",
            "0",
            "-y" if args.overwrite else "-n",
            str(output_path),
        ]
        if args.duration is not None:
            render_cmd[6:6] = ["-t", str(args.duration)]
        subprocess.run(render_cmd, check=True)

        print(f"GIF created: {output_path}")
        duration_text = "full video" if args.duration is None else str(args.duration)
        print(f"Preset: {args.preset} | FPS: {fps} | Width: {width} | Duration(s): {duration_text}")
        return 0
    finally:
        if palette_file and palette_file.exists():
            palette_file.unlink(missing_ok=True)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        raise SystemExit(1)
