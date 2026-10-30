"""Strict staged image path resolution. Never join user-controlled paths to the filesystem."""

import re
from pathlib import Path

# secrets.token_urlsafe(16) yields a 22-char basename plus the extension.
_STAGED_PATH = re.compile(r"/uploads/orders/temp/([A-Za-z0-9_-]{22}\.(?:jpg|jpeg|png|webp))", re.I)


def resolve_staged_image_path(path: str, uploads_dir: Path) -> Path:
    match = _STAGED_PATH.fullmatch(path)
    if match is None:
        raise ValueError("invalid staged image path")
    temp_dir = (uploads_dir / "orders" / "temp").resolve()
    candidate = temp_dir / match.group(1)
    if candidate.is_symlink() or not candidate.is_file() or candidate.resolve().parent != temp_dir:
        raise ValueError("staged image not found")
    return candidate
