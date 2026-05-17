from __future__ import annotations

import argparse
import shlex
import shutil
import subprocess
import sys
from pathlib import Path


def usage_guide(prog: str) -> str:
	return (
		"How to use this script:\n"
		"\n"
		"Required parameters:\n"
		"  --src            Source screenshot PNG path\n"
		"  --size           Target size (for example: 128)\n"
		"  --dest           Destination PNG path\n"
		"\n"
		"Presets:\n"
		"  clean            Balanced sharpen + color tuning\n"
		"  fx               Glow + sharpen (recommended for marketplace icon)\n"
		"\n"
		f"Examples:\n"
		f"  python {prog} --src src/res/green-background.png --size 128 --dest src/res/icon_green_background_128.png --preset clean\n"
		"\n"
		"Tips:\n"
		"  - Use --help to see full argument reference.\n"
		"  - Use --examples to print this guide directly.\n"
		"  - Add --runner wsl if ffmpeg is available only inside WSL.\n"
	)


class HelpfulArgumentParser(argparse.ArgumentParser):
	def error(self, message: str) -> None:
		self.print_usage(sys.stderr)
		self.exit(2, f"{self.prog}: error: {message}\n\n{usage_guide(self.prog)}\n")


def _resolve_path(path_text: str) -> Path:
	path = Path(path_text).expanduser()
	if not path.is_absolute():
		path = (Path.cwd() / path).resolve()
	else:
		path = path.resolve()
	return path


def win_path_to_wsl_path(win_path: str) -> str:
	"""Convert a Windows path to a WSL path like /mnt/e/path/to/file."""
	resolved = _resolve_path(win_path)
	path_text = str(resolved)
	if len(path_text) >= 2 and path_text[1] == ":":
		drive = path_text[0].lower()
		tail = path_text[2:].replace("\\", "/").lstrip("/")
		return f"/mnt/{drive}/{tail}"
	raise ValueError(f"Expected a Windows drive path, got: {path_text}")


def build_filter_graph(size: int, preset: str) -> str:
	if size <= 0:
		raise ValueError("size must be a positive integer")

	base_crop = (
		"crop='if(gt(iw,ih),ih,iw)':'if(gt(iw,ih),ih,iw)':"
		"'(iw-if(gt(iw,ih),ih,iw))/2':'(ih-if(gt(iw,ih),ih,iw))/2',"
		"scale=1024:1024:flags=lanczos"
	)

	if preset == "clean":
		return (
			f"{base_crop},"
			"eq=saturation=1.10:contrast=1.06:brightness=0.01,"
			"unsharp=7:7:0.9:5:5:0.0,"
			f"scale={size}:{size}:flags=lanczos"
		)

	if preset == "fx":
		return (
			f"{base_crop},"
			"split=2[base][glow];"
			"[glow]gblur=sigma=7,eq=brightness=0.06:saturation=1.25,"
			"colorchannelmixer=aa=0.18[halo];"
			"[base]eq=saturation=1.12:contrast=1.07:brightness=0.01,"
			"unsharp=7:7:0.9:5:5:0.0[main];"
			f"[halo][main]overlay=0:0,scale={size}:{size}:flags=lanczos"
		)

	raise ValueError(f"Unknown preset: {preset}")


def _run_command(cmd: list[str]) -> None:
	subprocess.run(cmd, check=True)


def export_screenshot_to_icon(
	src_win_path: str,
	size: int,
	dest_win_path: str,
	*,
	preset: str,
	runner: str,
) -> Path:
	src_path = _resolve_path(src_win_path)
	if not src_path.exists():
		raise FileNotFoundError(f"Source image not found: {src_path}")

	dest_path = _resolve_path(dest_win_path)
	dest_path.parent.mkdir(parents=True, exist_ok=True)

	filter_graph = build_filter_graph(size, preset)

	if runner == "wsl":
		src_wsl_path = win_path_to_wsl_path(str(src_path))
		dest_wsl_path = win_path_to_wsl_path(str(dest_path))
		ffmpeg_cmd = (
			f"ffmpeg -y -i {shlex.quote(src_wsl_path)} "
			f"-filter_complex {shlex.quote(filter_graph)} "
			"-frames:v 1 -update 1 -pix_fmt rgba "
			f"{shlex.quote(dest_wsl_path)}"
		)
		_run_command(["wsl", "bash", "-lc", ffmpeg_cmd])
		return dest_path

	if shutil.which("ffmpeg") is None:
		raise RuntimeError("ffmpeg not found in PATH. Install ffmpeg or use --runner wsl.")

	_run_command(
		[
			"ffmpeg",
			"-y",
			"-i",
			str(src_path),
			"-filter_complex",
			filter_graph,
			"-frames:v",
			"1",
			"-update",
			"1",
			"-pix_fmt",
			"rgba",
			str(dest_path),
		]
	)
	return dest_path

def _build_parser() -> argparse.ArgumentParser:
	parser = HelpfulArgumentParser(
		description="Export screenshot PNG to polished extension icon PNG via ffmpeg",
		formatter_class=argparse.RawTextHelpFormatter,
	)
	parser.add_argument("--src", required=True, help="Source PNG screenshot path on Windows")
	parser.add_argument("--size", type=int, required=True, help="Output size")
	parser.add_argument("--dest", required=True, help="Destination PNG path")
	parser.add_argument(
		"--preset",
		choices=["clean", "fx"],
		default="fx",
		help="Image transform preset (default: fx)",
	)
	parser.add_argument(
		"--runner",
		choices=["native", "wsl"],
		default="native",
		help="How to execute ffmpeg (default: native)",
	)
	parser.add_argument("--examples", action="store_true", help="Print usage examples and exit")
	return parser


def main() -> int:
	parser = _build_parser()
	if len(sys.argv) == 1:
		print(parser.format_help())
		print(usage_guide(parser.prog))
		return 2

	if "--examples" in sys.argv[1:]:
		print(usage_guide(parser.prog))
		return 0

	args = parser.parse_args()

	if args.examples:
		print(usage_guide(parser.prog))
		return 0

	out = export_screenshot_to_icon(
		args.src,
		args.size,
		args.dest,
		preset=args.preset,
		runner=args.runner,
	)
	print(f"Exported: {out}")
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
