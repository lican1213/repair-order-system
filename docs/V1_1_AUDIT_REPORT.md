# V1.1 Audit Report

## 1. Summary

**Initial Conclusion: PASS_WITH_FIXES**

**Current Recheck Status: PASS** (2026-05-03 audit fixes recheck)

v1.1 的四项功能范围基本完整：备份脚本、临时图片清理、公开接口限频、修改密码均已实现并通过功能 smoke test。v1.0 核心流程在隔离测试库中回归通过，生产模式 SPA fallback、`/api/*`、`/uploads/*` 路由边界正常。

初次审计不能给 PASS：`npm run lint` 实测失败，且文档存在几处会误导后续维护的不同步问题。2026-05-03 audit fixes recheck 已验证这些阻塞项修复完成；当前建议见第 11 节。

## 2. Scope Reviewed

- backup
- temp upload cleanup
- public endpoint rate limiting
- password change
- v1.0 regression
- production SPA/API/uploads routing
- security-sensitive Git tracking and API response boundaries
- v1.1 documentation consistency

## 3. Commands Run

```powershell
cd "E:\claude code project 1\repair-order-system"

cd frontend
npm run lint
npm run build

cd ..\backend
.\.venv\Scripts\python.exe -m compileall app

cd ..
python scripts/backup.py --keep 9999
python scripts/backup.py --zip --keep 9999
python scripts/cleanup_temp_images.py --dry-run
python scripts/cleanup_temp_images.py

cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --log-level warning
```

Additional HTTP/browser checks were run against:

- `http://127.0.0.1:8000`
- `http://127.0.0.1:5173`

Security checks:

```powershell
git status --short
git ls-files | Select-String -Pattern '(^|/)\.env$|\.env'
git ls-files | Select-String -Pattern 'repair\.db|\.db$'
git ls-files | Select-String -Pattern '(^|/)uploads(/|$)'
git ls-files | Select-String -Pattern '(^|/)backups(/|$)'
git ls-files | ForEach-Object {
  Select-String -Path $_ -Pattern 'SECRET_KEY|ADMIN_PASSWORD|password_hash'
}
```

## 4. V1.1 Feature Completeness

### Backup Script

**PASS**

- `scripts/backup.py` exists.
- Backs up `backend/data/repair.db`.
- Backs up `backend/uploads/` with directory structure.
- Creates timestamped backup directory under `backups/`.
- `--zip` creates a zip archive and removes the uncompressed temporary backup directory.
- `backups/` is ignored by Git.
- Source missing behavior is implemented by `verify_sources()`.

Tested outputs:

- `backups/20260503_184110/repair.db`
- `backups/20260503_184110/uploads/`
- `backups/20260503_184118.zip`

### Temp Upload Cleanup

**PASS**

- `scripts/cleanup_temp_images.py` exists.
- Scope is limited to `backend/uploads/orders/temp/`.
- Uses file `mtime` and defaults to 7 days.
- Supports `--dry-run`.
- Handles missing temp directory as a normal no-op.

Test result:

- Created `audit_old_8days.jpg` under temp: deleted.
- Created `audit_new_today.jpg` under temp: retained.
- Created `audit_formal_keep.jpg` under `uploads/orders/`: retained.
- Created `audit_warranty_keep.jpg` under `uploads/warranty/`: retained.
- Audit-created test files were cleaned up after verification.

### Public Rate Limiting

**PASS_WITH_NOTE**

- `/api/public/upload` is limited to 10 requests/minute/IP.
- `/api/public/submit` is limited to 5 requests/minute/IP and 3 requests/10 minutes/phone.
- Limit state is in memory and resets on restart, as documented.
- 429 behavior was verified.
- `/api/public/shop-info`, `/api/warranty/{token}`, `/api/auth/login`, and `/api/orders` were not affected by public write rate limits.

Security note: `_get_client_ip()` trusts `X-Forwarded-For` whenever present. This is acceptable behind a trusted reverse proxy, but direct public exposure allows clients to spoof IPs and partially bypass IP-based upload limiting.

### Password Change

**PASS_WITH_NOTE**

- `POST /api/auth/change-password` exists under `/api/auth`.
- Requires JWT.
- Verifies old password.
- Rejects mismatched confirmation.
- Enforces new password min length through Pydantic.
- Stores bcrypt hash, not plaintext.
- Old password can no longer log in.
- New password can log in.
- Frontend `/admin/profile` exposes a change-password section and redirects/logs out after success.

Known limitation verified: previously issued JWTs remain valid after password change. This is documented in `docs/DECISIONS.md` D-055 and `README.md`.

## 5. V1.0 Regression Results

**API regression: PASS**

Tested with an isolated SQLite database and test shop config:

- `GET /api/health`: PASS
- `GET /api/public/shop-info`: PASS, only returns `shop_name` and `shop_phone`
- `POST /api/auth/login`: PASS
- `GET /api/auth/me`: PASS, no `password_hash`
- `POST /api/public/upload`: PASS
- `POST /api/public/submit`: PASS
- `image_paths` DB storage: PASS, valid JSON array string
- Historical Python-list `image_paths`: PASS, normalized by API response
- Uploaded image URL access: PASS
- `GET /api/orders`: PASS with JWT, 401 without JWT
- `PATCH /api/orders/{id}` status/warranty update: PASS
- Completed order warranty token generation: PASS
- Incomplete order warranty token boundary: PASS
- `GET /api/warranty/{token}`: PASS, no phone/address/final_fee/remark/image paths
- `GET /api/export/orders`: PASS, xlsx content type
- Submit/upload rate limit: PASS

**Frontend/browser smoke: PASS**

- `/repair`: form opens with required fields.
- `/admin`: login works with changed test password.
- `/admin/dashboard`: statistics load.
- `/admin/profile`: shows backend-configured shop name and phone.
- `/admin/orders/1`: order detail loads.
- Customer uploaded image opens in the in-page preview modal and closes.
- Warranty link uses current `window.location.origin`.
- `/warranty/t/{token}` shows only public warranty fields.
- Browser console: no messages found during smoke.

**Production routing: PASS**

Only FastAPI was running after `npm run build`:

- `/repair`: 200 HTML
- `/admin`: 200 HTML
- `/admin/orders`: 200 HTML
- `/warranty/t/test-token`: 200 HTML
- `/api/health`: 200 JSON
- `/api/nonexistent`: 404 JSON
- `/uploads/not-found.jpg`: 404 JSON, not React HTML
- Fresh deploy style `/uploads` mount was verified with a missing temp upload directory.

## 6. Security Review

**PASS_WITH_NOTES**

- `backend/.env` is not tracked by Git.
- `backend/data/*.db` is not tracked by Git.
- `backend/uploads/` is not tracked by Git.
- `backups/` is not tracked by Git.
- No real secret file was found tracked.
- `backend/.env.example` and docs contain placeholder/default config names and sample values; production must replace them.
- `ADMIN_PASSWORD` is not hardcoded in frontend.
- `password_hash` is not returned from `/api/auth/me`.
- `/api/public/shop-info` only returns `shop_name` and `shop_phone`.
- Password change requires JWT.
- Public write rate limiting returns generic 429 messages and does not expose sensitive data.
- Warranty query returns 404 for missing/unavailable warranty and does not expose incomplete order status.

Residual risks:

- Directly trusting `X-Forwarded-For` can weaken IP limits when the app is exposed without a trusted proxy.
- Old JWTs remain valid after password change.
- Public upload still validates MIME type and extension only, not real image content.

## 7. Findings

### Critical

None found.

### High

1. **[Resolved in audit fix recheck] `npm run lint` initially failed.**

Files:

- `frontend/src/pages/RepairForm.tsx:54`
- `frontend/src/pages/RepairForm.tsx:62`
- `frontend/src/pages/OrderDetail.tsx:66`
- `frontend/src/utils/clipboard.ts:7`

Errors:

- `react-hooks/set-state-in-effect`
- `no-empty`

Impact at initial audit time: this violated the required v1.1 quality gate and contradicted the current docs that claimed lint passed. Recheck result: fixed, `npm run lint` exit 0.

### Medium

1. **Public IP rate limiting can be bypassed by spoofing `X-Forwarded-For` when directly exposed.**

File: `backend/app/routers/public.py`

The implementation always prefers `X-Forwarded-For`. This is fine behind a trusted reverse proxy, but if FastAPI is exposed directly, clients can rotate this header. Phone-based submit limiting still helps, but upload IP limiting is weaker.

2. **[Resolved in audit fix recheck] API spec for `/api/public/upload` was out of sync with implementation.**

File: `docs/API_SPEC.md:28-34`

Initial audit finding: the docs said multipart field `file` and response `{ "path": "..." }`, while implementation and tested frontend use field `files` and response `{ "paths": [...] }`. Recheck result: fixed for public upload and admin upload.

3. **[Resolved in audit fix recheck] v1.1 completion docs were incomplete or stale.**

- Initial audit noted `docs/V1_1_REPORT.md` was missing.
- Initial audit noted `docs/V1_1_PLAN.md:5` still said `规划完成，待实施`.
- Initial audit noted `CLAUDE.md:128` still recommended implementing v1.1 even though v1.1 was marked complete.

Impact at initial audit time: future agents could misunderstand the current project state. Recheck result: `docs/V1_1_PLAN.md` and `CLAUDE.md` were corrected, and this report now includes a recheck section as the v1.1 audit completion record.

### Low

1. **Admin profile UI still displays system version `v1.0`.**

File: `frontend/src/pages/AdminProfile.tsx:127`

README and release notes identify current status as v1.1. This is a display/documentation consistency issue, not a runtime blocker.

2. **Old JWT remains valid after password change.**

This is documented as D-055 and was verified. It is acceptable for the current single-admin scope, but should remain visible as a deployment security limitation.

3. **`backup.py --keep 0` would prune all backups.**

The script does not validate `--keep` as a positive integer. This does not affect source data, but can delete backup history if used incorrectly.

4. **Some migration/data compatibility errors can surface as 500 for malformed manual rows.**

During audit, a manually inserted row with `is_urgent = NULL` returned a Pydantic validation 500. Rows created through the app have `is_urgent` populated, so this is not a normal v1.1 regression, but the API assumes DB booleans are non-null.

## 8. Recommended Fixes Before Real Use

1. Fix the lint errors and rerun `npm run lint`.
2. Update `docs/API_SPEC.md` for `/api/public/upload` to match `files` and `paths`.
3. Resolve v1.1 documentation drift:
   - create or replace the missing completion report, or explicitly state that `docs/PROGRESS.md`/`docs/RELEASE_NOTES.md` are the v1.1 report source
   - update `docs/V1_1_PLAN.md` status
   - remove stale `CLAUDE.md` v1.1 implementation recommendation
4. Before public deployment, either only trust `X-Forwarded-For` behind a known proxy or document that direct exposure weakens IP rate limiting.

## 9. Backlog Recommendations

Keep these out of v1.1 unless the user explicitly schedules them:

- Token invalidation/versioning after password change.
- Real image content validation for public uploads.
- Positive integer validation for `backup.py --keep`.
- Optional startup warning for default `SECRET_KEY` / `ADMIN_PASSWORD`.
- Optional structured v1.1 completion report if not handled in the fix pass.

Do not expand into AI, WeChat mini program, inventory, multi-employee, membership, online payment, or complex dashboard work.

## 10. Final Recommendation

- Initial audit recommendation: **PASS_WITH_FIXES**.
- Current recommendation after audit fixes recheck: see section 11.

## 11. Audit Fix Recheck (2026-05-03)

**Conclusion: PASS**

Rechecked items:

- Lint errors fixed: `npm run lint` exit 0.
- Build still passes: `npm run build` exit 0.
- Backend compile still passes: `.\.venv\Scripts\python.exe -m compileall app` exit 0.
- `RepairForm.tsx` date/slot errors now use `useMemo` instead of effect-driven derived state.
- `OrderDetail.tsx` date errors now use `useMemo` instead of effect-driven derived state.
- `clipboard.ts` no longer has an empty catch block.
- `docs/API_SPEC.md` now documents public upload and admin upload as `files` / `paths`.
- `docs/V1_1_PLAN.md` status is updated to completed.
- `CLAUDE.md` no longer recommends implementing v1.1 as a next step.
- `/admin/profile` displays system version `v1.1`.
- `README.md` documents the `X-Forwarded-For` trust boundary and reverse-proxy requirement.

Remaining non-blocking risks:

- Old JWTs remain valid after password change, as documented in D-055.
- Public upload still validates MIME type and extension, not decoded image content.
- `backup.py --keep 0` can prune all backup entries if used incorrectly.

Final recommendation: **v1.1 audit fixes are verified. The project can proceed to controlled real-device testing and deployment preparation, with the documented residual risks understood.**
