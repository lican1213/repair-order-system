"""
Backup script for the repair order system.

Backs up the SQLite database and all uploaded images to a timestamped directory.

Usage:
    python scripts/backup.py              # basic backup
    python scripts/backup.py --zip        # backup + compress to .zip
    python scripts/backup.py --keep 5     # keep only 5 most recent backups
    python scripts/backup.py --zip --keep 3
"""

import argparse
import shutil
import sys
import zipfile
from datetime import datetime
from pathlib import Path

# Compute paths relative to this script's location.
# scripts/backup.py -> scripts/ -> project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / "backend" / "data" / "repair.db"
UPLOADS_PATH = PROJECT_ROOT / "backend" / "uploads"
BACKUPS_DIR = PROJECT_ROOT / "backups"


def get_dir_size(path: Path) -> int:
    """Return total size in bytes of all files under *path*."""
    total = 0
    for f in path.rglob("*"):
        if f.is_file():
            total += f.stat().st_size
    return total


def count_files(path: Path) -> int:
    """Return number of files under *path* (non-recursive for single file)."""
    if path.is_file():
        return 1
    return sum(1 for f in path.rglob("*") if f.is_file())


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


def verify_sources() -> None:
    """Check that source paths exist. Exit with error if not."""
    missing = []
    if not DB_PATH.is_file():
        missing.append(f"Database: {DB_PATH}")
    if not UPLOADS_PATH.is_dir():
        missing.append(f"Uploads directory: {UPLOADS_PATH}")
    if missing:
        print("ERROR: Backup sources not found:", file=sys.stderr)
        for m in missing:
            print(f"  - {m}", file=sys.stderr)
        sys.exit(1)


def estimate_backup_size() -> int:
    """Estimate total bytes to be backed up."""
    total = 0
    if DB_PATH.is_file():
        total += DB_PATH.stat().st_size
    if UPLOADS_PATH.is_dir():
        total += get_dir_size(UPLOADS_PATH)
    return total


def check_disk_space(required_bytes: int) -> None:
    """Verify enough disk space is available. Exit with error if not."""
    usage = shutil.disk_usage(str(BACKUPS_DIR.parent))
    # Require at least the estimated size + 10% headroom
    needed = int(required_bytes * 1.1)
    if usage.free < needed:
        print(
            f"ERROR: Insufficient disk space.\n"
            f"  Required: {format_size(needed)}\n"
            f"  Available: {format_size(usage.free)}",
            file=sys.stderr,
        )
        sys.exit(1)


def run_backup() -> Path:
    """Copy database and uploads to a timestamped backup directory."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = BACKUPS_DIR / timestamp
    backup_dir.mkdir(parents=True, exist_ok=True)

    # Copy database
    db_dest = backup_dir / "repair.db"
    shutil.copy2(str(DB_PATH), str(db_dest))
    print(f"  Copied database -> {db_dest.name}")

    # Copy uploads directory
    uploads_dest = backup_dir / "uploads"
    shutil.copytree(str(UPLOADS_PATH), str(uploads_dest), dirs_exist_ok=True)
    print(f"  Copied uploads  -> uploads/")

    return backup_dir


def zip_backup(backup_dir: Path) -> Path:
    """Compress backup directory to .zip, then remove the original directory."""
    zip_path = backup_dir.with_suffix(".zip")
    print(f"  Compressing -> {zip_path.name}")

    with zipfile.ZipFile(str(zip_path), "w", zipfile.ZIP_DEFLATED) as zf:
        for file in backup_dir.rglob("*"):
            if file.is_file():
                arcname = file.relative_to(backup_dir.parent)
                zf.write(str(file), str(arcname))

    # Remove the uncompressed directory
    shutil.rmtree(str(backup_dir))
    print(f"  Removed uncompressed directory")
    return zip_path


def prune_backups(keep: int) -> None:
    """Keep only the *keep* most recent backups (dirs and zips)."""
    if not BACKUPS_DIR.is_dir():
        return

    # Collect all backup entries (directories and .zip files)
    entries: list[Path] = []
    for item in BACKUPS_DIR.iterdir():
        if item.is_dir():
            entries.append(item)
        elif item.suffix == ".zip":
            entries.append(item)

    # Sort by modification time (newest first)
    entries.sort(key=lambda p: p.stat().st_mtime, reverse=True)

    # Remove old entries beyond the keep limit
    for old in entries[keep:]:
        print(f"  Pruning old backup: {old.name}")
        if old.is_dir():
            shutil.rmtree(str(old))
        else:
            old.unlink()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Backup repair order system database and uploads."
    )
    parser.add_argument(
        "--zip",
        action="store_true",
        help="Compress backup to .zip file",
    )
    parser.add_argument(
        "--keep",
        type=int,
        default=7,
        metavar="N",
        help="Number of recent backups to retain (default: 7)",
    )
    args = parser.parse_args()

    print("Repair Order System - Backup")
    print("=" * 40)

    # Step 1: Verify sources exist
    print("\n[1/4] Verifying sources...")
    verify_sources()
    print("  Database: OK")
    print("  Uploads:  OK")

    # Step 2: Check disk space
    print("\n[2/4] Checking disk space...")
    estimated = estimate_backup_size()
    check_disk_space(estimated)
    print(f"  Estimated size: {format_size(estimated)}")
    print(f"  Available:      OK")

    # Step 3: Run backup
    print("\n[3/4] Backing up...")
    backup_dir = run_backup()

    # Optionally compress
    final_path = backup_dir
    if args.zip:
        final_path = zip_backup(backup_dir)

    # Step 4: Prune old backups
    print(f"\n[4/4] Pruning (keeping {args.keep} most recent)...")
    prune_backups(args.keep)

    # Summary
    if final_path.suffix == ".zip":
        file_count = "compressed archive"
        total_size = final_path.stat().st_size
    else:
        file_count = str(count_files(final_path))
        total_size = get_dir_size(final_path)

    print("\n" + "=" * 40)
    print("Backup complete!")
    print(f"  Path:       {final_path}")
    print(f"  Files:      {file_count}")
    print(f"  Total size: {format_size(total_size)}")


if __name__ == "__main__":
    main()
