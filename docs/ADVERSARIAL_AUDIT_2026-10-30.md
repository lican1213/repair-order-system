# Adversarial audit — 2026-10-30

| Issue | Confirmed failure or source-level defect | Remediation | Gate |
| --- | --- | --- | --- |
| #1 | `/uploads/orders/temp/../../../.env` passes prefix, resolves to backend config and is moved into public uploads | allow only exact generated image basename, canonical containment, no symlinks | staged traversal and symlink tests |
| #2 | committed SQLite WAL records are absent from bare db file copy | online SQLite `Connection.backup` + quick_check | WAL integration test |
| #3 | Excel export interprets leading `=` as formula; XFF accepted from arbitrary client | quote formula-like text and trust only ASGI/known proxies | workbook and IP spoof tests |
| #4 | JWT remains valid after password change | password hash HMAC claim verified at request time | JWT rotation test |
| #5 | existing past dates block editing old order | compare date changes to persisted values before rejecting | historical schema test + front/backend guards |

## Deploy / audit notes

Existing login tokens without `pwdv` are invalidated by upgrade. Staff must log in again. Uvicorn proxy-header trust must be limited to the actual reverse proxy. The GitHub Actions backend tests and frontend lint/build must pass before merging. In-person mobile smoke testing still required before declaring a production rollout.

## Open risks

- Actual image decoding is not yet verified (only MIME/extension).
- Per-process in-memory rate limiter and login lockout cannot coordinate across multiple workers.
- Concurrent order number generation may collide on high contention; transaction-aware allocator still needed.
- Restore test of complete database + uploads backup is a separate operational gate.
