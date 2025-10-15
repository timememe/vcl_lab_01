#!/usr/bin/env python3
"""Helper script for submitting a Sora 2 video request with an optional reference image."""
import argparse
import logging
import time
from pathlib import Path
from typing import Optional, Tuple

from openai import OpenAI

try:
    from PIL import Image, ImageOps
except ImportError as exc:
    raise SystemExit(
        "Pillow is required for resizing the reference image. Install it via 'pip install Pillow'."
    ) from exc

try:
    from utils.downloader import download_sora_video  # type: ignore
except ImportError:  # pragma: no cover - optional helper
    download_sora_video = None  # type: ignore

LOGGER = logging.getLogger(__name__)
DEFAULT_SIZE = "720x1280"
DEFAULT_SECONDS = 4
POLL_INTERVAL_SECONDS = 5
MAX_POLLS = 60


def parse_size(size_str: str) -> Tuple[int, int]:
    try:
        width_str, height_str = size_str.lower().split("x", 1)
        width = int(width_str.strip())
        height = int(height_str.strip())
        if width <= 0 or height <= 0:
            raise ValueError
        return width, height
    except Exception as exc:  # pragma: no cover - defensive
        raise ValueError(f"Invalid size format '{size_str}'. Use e.g. 720x1280") from exc


def resize_reference_image(reference: Path, size: Tuple[int, int], output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    width, height = size
    output_path = output_dir / f"{reference.stem}_{width}x{height}.png"

    with Image.open(reference) as img:
        LOGGER.info("Original reference image: mode=%s, size=%sx%s", img.mode, *img.size)
        resized = ImageOps.fit(img, (width, height), method=Image.Resampling.LANCZOS)
        resized.save(output_path, format="PNG")
        LOGGER.info("Saved resized reference to %s", output_path.resolve())

    return output_path


def poll_video_until_ready(client: OpenAI, video_id: str) -> dict:
    for attempt in range(1, MAX_POLLS + 1):
        time.sleep(POLL_INTERVAL_SECONDS)
        video = client.videos.retrieve(video_id)
        status = getattr(video, "status", None)
        LOGGER.info("Poll %s/%s -> status=%s", attempt, MAX_POLLS, status)

        if status in {"completed", "ready", "succeeded"}:
            return video
        if status in {"failed", "cancelled", "errored"}:
            raise RuntimeError(f"Video request failed with status '{status}' (id={video_id})")

    raise TimeoutError(f"Video id {video_id} did not finish within {(POLL_INTERVAL_SECONDS * MAX_POLLS)}s")


def create_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("prompt", help="Text prompt to animate")
    parser.add_argument(
        "--reference",
        type=Path,
        help="Path to the reference image (optional)",
    )
    parser.add_argument(
        "--size",
        default=DEFAULT_SIZE,
        help="Target video size, e.g. 720x1280 (default: %(default)s)",
    )
    parser.add_argument(
        "--seconds",
        type=int,
        default=DEFAULT_SECONDS,
        help="Requested video length in seconds (default: %(default)s)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("./output"),
        help="Folder where the downloaded video will be stored",
    )
    parser.add_argument(
        "--references-dir",
        type=Path,
        default=Path("./references"),
        help="Directory for resized references (default: %(default)s)",
    )
    return parser


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")
    parser = create_argument_parser()
    args = parser.parse_args()

    client = OpenAI()
    size_tuple = parse_size(args.size)

    reference_path: Optional[Path] = None
    if args.reference:
        if not args.reference.exists():
            raise FileNotFoundError(f"Reference image '{args.reference}' does not exist")
        reference_path = resize_reference_image(args.reference, size_tuple, args.references_dir)

    LOGGER.info("Submitting Sora request with size=%s seconds=%s", args.size, args.seconds)
    create_kwargs = {
        "model": "sora-2",
        "prompt": args.prompt,
        "size": args.size,
        "seconds": args.seconds,
    }
    if reference_path is not None:
        create_kwargs["input_reference"] = reference_path

    job = client.videos.create(**create_kwargs)
    LOGGER.info("Video request accepted: id=%s status=%s", job.id, getattr(job, "status", "unknown"))

    final_video = poll_video_until_ready(client, job.id)

    args.output.mkdir(parents=True, exist_ok=True)
    if download_sora_video is not None:
        LOGGER.info("Downloading finished video to %s", args.output.resolve())
        download_sora_video(video=final_video, output_folder=str(args.output))
    else:
        LOGGER.warning("utils.downloader.download_sora_video not available; skipping download step")
        LOGGER.info("Final video payload: %s", final_video)


if __name__ == "__main__":
    main()
