"""
Clean up expired temporary images from the upload staging directory.

Only deletes files in  backend/uploads/orders/temp/  that are older than
the configured threshold (default 7 days).  Never touches committed order
images in  uploads/orders/  or warranty images in  uploads/warranty/.

Usage:
    python scripts/cleanup_temp_images.py              # delete files older than 7 days
    python scripts/cleanup_temp_images.py --days 3     # delete files older than 3 days
    python scripts/cleanup_temp_images.py --dry-run    # show what would be deleted
"""

import argparse
import sys
import time
from pathlib import Path

# Hard-coded temp directory — relative to this script's location.
# scripts/cleanup_temp_images.py -> scripts/ -> project root
TEMP_DIR = Path(__file__).resolve().parent.parent / "backend" / "uploads" / "orders" / "temp"

SECONDS_PER_DAY = 86400


def format_size(size_bytes: int) -> str:
    """Format bytes as human-readable string."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"


def find_expired_files(threshold_days: int) -> list[tuple[Path, float]]:
    """Return list of (path, age_in_days) for files older than *threshold_days*."""
    now = time.time()
    cutoff = now - threshold_days * SECONDS_PER_DAY
    expired: list[tuple[Path, float]] = []

    for f in TEMP_DIR.iterdir():
        if not f.is_file():
            continue
        mtime = f.stat().st_mtime
        if mtime < cutoff:
            age_days = (now - mtime) / SECONDS_PER_DAY
            expired.append((f, age_days))

    # Sort oldest first
    expired.sort(key=lambda pair: pair[1], reverse=True)
    return expired


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Clean up expired temporary images from the upload staging directory."
    )
    parser.add_argument(
        "--days",
        type=int,
        default=7,
        metavar="N",
        help="Delete files older than N days (default: 7)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show files that would be deleted without actually deleting",
    )
    args = parser.parse_args()

    label = "[DRY RUN] " if args.dry_run else ""
    print(f"{label}Temp Image Cleanup")
    print("=" * 40)
    print(f"  Directory: {TEMP_DIR}")
    print(f"  Threshold: {args.days} days\n")

    # Check if temp directory exists
    if not TEMP_DIR.is_dir():
        print("  Temp directory does not exist. Nothing to clean.")
        sys.exit(0)

    # Find expired files
    expired = find_expired_files(args.days)

    if not expired:
        print("  No expired files found. Nothing to clean.")
        sys.exit(0)

    # Print and optionally delete
    deleted_count = 0
    freed_bytes = 0

    for path, age_days in expired:
        size = path.stat().st_size
        print(f"  {path.name:40s}  {age_days:6.1f} days old  {format_size(size):>10s}")

        if not args.dry_run:
            try:
                path.unlink()
                deleted_count += 1
                freed_bytes += size
            except OSError as e:
                print(f"    WARNING: Failed to delete {path.name}: {e}", file=sys.stderr)

    # Summary
    print("\n" + "=" * 40)
    if args.dry_run:
        total_size = sum(s for _, s in [(p, p.stat().st_size) for p, _ in expired])
        # Recompute size since we didn't delete
        total_size = 0
        for path, _ in expired:
            total_size += path.stat().st_size
        print(f"  Would delete: {len(expired)} file(s), {format_size(total_size)}")
        print("  (dry run — no files were deleted)")
    else:
        print(f"  Deleted: {deleted_count} file(s)")
        print(f"  Freed:   {format_size(freed_bytes)}")


if __name__ == "__main__":
    main()
