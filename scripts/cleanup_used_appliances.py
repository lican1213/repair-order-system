"""
Clean up used appliances that have been delisted (下架) for too long.

Deletes both the database record and associated image files from
backend/uploads/used/ for items with status='下架' whose updated_at
is older than the configured threshold (default 30 days).

Usage:
    python scripts/cleanup_used_appliances.py              # delete items 下架 > 30 days
    python scripts/cleanup_used_appliances.py --days 7     # delete items 下架 > 7 days
    python scripts/cleanup_used_appliances.py --dry-run    # show what would be deleted
"""

import argparse
import json
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / "backend" / "data" / "repair.db"
UPLOADS_DIR = PROJECT_ROOT / "backend" / "uploads"

SECONDS_PER_DAY = 86400


def format_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"


def find_expired_items(cursor, threshold_days: int) -> list[tuple]:
    """Return rows (id, title, image_paths, updated_at) for items 下架 longer than threshold."""
    cutoff_ts = time.time() - threshold_days * SECONDS_PER_DAY
    # SQLite stores datetime as ISO string; compare using updated_at
    from datetime import datetime, timezone

    cutoff_dt = datetime.fromtimestamp(cutoff_ts, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")

    cursor.execute(
        "SELECT id, title, image_paths, updated_at FROM used_appliances "
        "WHERE status = '下架' AND updated_at < ?",
        (cutoff_dt,),
    )
    return cursor.fetchall()


def delete_image_files(image_paths_json: str | None) -> tuple[int, int]:
    """Delete image files from disk. Returns (deleted_count, freed_bytes)."""
    if not image_paths_json:
        return 0, 0
    try:
        paths = json.loads(image_paths_json)
    except (json.JSONDecodeError, TypeError):
        return 0, 0
    if not isinstance(paths, list):
        return 0, 0

    deleted = 0
    freed = 0
    for p in paths:
        if not isinstance(p, str):
            continue
        relative = p.lstrip("/")
        if not relative.startswith("uploads/"):
            continue
        file_path = PROJECT_ROOT / "backend" / relative
        try:
            if file_path.is_file():
                size = file_path.stat().st_size
                file_path.unlink()
                deleted += 1
                freed += size
        except OSError:
            pass
    return deleted, freed


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Clean up used appliances that have been delisted (下架) for too long."
    )
    parser.add_argument(
        "--days",
        type=int,
        default=30,
        metavar="N",
        help="Delete items delisted longer than N days (default: 30)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show items that would be deleted without actually deleting",
    )
    args = parser.parse_args()

    label = "[DRY RUN] " if args.dry_run else ""
    print(f"{label}Used Appliances Cleanup")
    print("=" * 50)
    print(f"  Database:  {DB_PATH}")
    print(f"  Uploads:   {UPLOADS_DIR / 'used'}")
    print(f"  Threshold: {args.days} days\n")

    if not DB_PATH.is_file():
        print("  Database not found. Nothing to clean.")
        sys.exit(0)

    import sqlite3

    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    # Check if table exists
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='used_appliances'"
    )
    if not cursor.fetchone():
        print("  Table 'used_appliances' does not exist. Nothing to clean.")
        conn.close()
        sys.exit(0)

    expired = find_expired_items(cursor, args.days)

    if not expired:
        print("  No expired items found. Nothing to clean.")
        conn.close()
        sys.exit(0)

    total_images_deleted = 0
    total_freed = 0
    items_deleted = 0

    for item_id, title, image_paths, updated_at in expired:
        img_count, img_freed = delete_image_files(image_paths)
        total_images_deleted += img_count
        total_freed += img_freed

        print(f"  ID {item_id:4d}  {title:30s}  下架于 {updated_at}  图片 {img_count} 张 {format_size(img_freed)}")

        if not args.dry_run:
            cursor.execute("DELETE FROM used_appliances WHERE id = ?", (item_id,))
            items_deleted += 1

    if not args.dry_run:
        conn.commit()

    conn.close()

    # Summary
    print("\n" + "=" * 50)
    if args.dry_run:
        print(f"  Would delete: {len(expired)} item(s), {total_images_deleted} image(s), {format_size(total_freed)}")
        print("  (dry run — nothing was deleted)")
    else:
        print(f"  Deleted: {items_deleted} item(s)")
        print(f"  Images:  {total_images_deleted} file(s), {format_size(total_freed)} freed")


if __name__ == "__main__":
    main()
