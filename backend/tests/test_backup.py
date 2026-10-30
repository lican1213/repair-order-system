"""A copied WAL database may omit committed data; online backup must include it."""
import sqlite3
from pathlib import Path
from scripts.backup import backup_sqlite_db


def test_wal_snapshot_contains_uncheckpointed_commits(tmp_path: Path):
    live = tmp_path / "live.db"
    snapshot = tmp_path / "snapshot.db"
    connection = sqlite3.connect(live)
    try:
        connection.execute("PRAGMA journal_mode=WAL")
        connection.execute("PRAGMA wal_autocheckpoint=0")
        connection.execute("CREATE TABLE orders (id INTEGER, note TEXT)")
        connection.execute("INSERT INTO orders VALUES (1, 'recent order')")
        connection.commit()
        assert live.with_name("live.db-wal").is_file()
        backup_sqlite_db(live, snapshot)
        with sqlite3.connect(snapshot) as copy:
            assert copy.execute("SELECT note FROM orders WHERE id=1").fetchone() == ("recent order",)
            assert copy.execute("PRAGMA integrity_check").fetchone() == ("ok",)
    finally:
        connection.close()
