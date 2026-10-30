# Repair order system — MOC / maintenance index

This map is the entry point for developers and agents. Preserve the small-shop scope; fixes must be backed by reproducible regressions.

## Current baseline

- Source: `main`; review work happens in short-lived `fix/*` branches.
- Tech: FastAPI + SQLAlchemy + SQLite WAL; React/Vite/TypeScript, single admin.
- Core path: `/repair` → public upload + submit → `/admin/orders` → warranty.
- Continuous gate: `.github/workflows/ci.yml` executes Python adversarial tests, frontend lint and build.
- Security audit: [2026-10-30 adversarial audit](ADVERSARIAL_AUDIT_2026-10-30.md).

## Knowledge map

- Product boundary / deploy: `AGENTS.md`, `README.md`, `docs/DEPLOYMENT_RUNBOOK.md`.
- Decisions, including superseded rationale: `docs/DECISIONS.md` (D-064 onwards for 2026-10 audit).
- Execution record: `docs/PROGRESS.md`, `docs/TODO.md`, `docs/RELEASE_NOTES.md`.
- API / persistence: `docs/API_SPEC.md`, `docs/DB_SCHEMA.md`.
- Regression: `backend/tests/test_adversarial.py`, `test_http_adversarial.py`, `test_backup.py`.

## Fix workflow / gates

1. Reproduce and log an Issue; write a failing regression when feasible.
2. Patch smallest relevant file(s) on a new branch, without introducing AI services or feature creep.
3. Run both CI jobs and inspect the failure logs; review path traversal, auth revocation, data integrity and stale date behavior.
4. Merge PR only when CI passes. Linked Issues close on merge, then record commit and remaining risks.
5. Production deployment is separate: verify env secrets, HTTPS/reverse-proxy trust, back up and restore a sample, then follow the real-device checklist.

## Residual risks (not marked closed)

- Uploaded bytes are not decoded to validate real image format.
- Public rate limiter and auth lockout are in-memory; multi-worker isolation.
- Concurrent order-number allocation / >999 daily sequence edge.
- Real-phone and production restore drills not executed by CI.
