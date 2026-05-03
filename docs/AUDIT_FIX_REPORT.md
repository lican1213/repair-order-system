# Audit Fix Report

## 1. Summary

本轮 v1.0 audit fixes 已完成，范围严格限定为 Codex 审计建议的真机试用前修复项。建议再次交给 Codex 复审；复审 PASS 后再进入真机试用。

## 2. Fixed Items

- `/uploads` fresh deploy mount：启动前同步创建上传目录，并无条件挂载 StaticFiles。
- `image_paths` JSON storage：新报修图片路径使用合法 JSON 数组字符串存储，并兼容历史 Python list 字符串读取。
- `npm run lint`：修复 React hooks `set-state-in-effect` 和 `no-empty` 错误。
- `bcrypt` direct dependency：`requirements.txt` 直接声明 `bcrypt`。
- `/admin/profile` shop info：新增 `GET /api/public/shop-info`，前端从后端 `.env` 配置读取店铺名称和电话。
- `CLAUDE.md` progress conflict：删除旧的 Phase 3-12 “未开始”冲突表格，更新 audit 状态。
- docs archive path：外层 `IMPLEMENTATION_PLAN.md` 和设计文档已复制到项目内 `docs/`。
- standard port smoke test：清理旧 uvicorn 进程后，用 `8000 + 5173` 完成 API、前端 HTTP 和浏览器 smoke test。

## 3. Modified Files

- `CLAUDE.md`
- `README.md`
- `backend/requirements.txt`
- `backend/app/main.py`
- `backend/app/json_utils.py`
- `backend/app/routers/public.py`
- `backend/app/routers/orders.py`
- `backend/app/schemas.py`
- `frontend/src/api/public.ts`
- `frontend/src/hooks/useAuth.ts`
- `frontend/src/pages/AdminProfile.tsx`
- `frontend/src/pages/FollowupList.tsx`
- `frontend/src/pages/OrderDetail.tsx`
- `frontend/src/pages/OrderList.tsx`
- `frontend/src/pages/WarrantyPage.tsx`
- `frontend/src/types/public.ts`
- `docs/API_SPEC.md`
- `docs/DB_SCHEMA.md`
- `docs/DECISIONS.md`
- `docs/PROGRESS.md`
- `docs/TODO.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/superpowers/specs/2026-05-03-repair-order-system-design.md`
- `docs/AUDIT_FIX_REPORT.md`

## 4. Tests Run

- `npm run lint`
- `npm run build`
- `.\.venv\Scripts\python.exe -m compileall app`
- Regression probe: missing `UPLOAD_DIR` still mounts `/uploads`.
- Regression probe: public upload + submit stores `image_paths` that passes `json.loads()`.
- Regression probe: `GET /api/public/shop-info` returns configured `SHOP_NAME` / `SHOP_PHONE`.
- Fresh deploy test: temporarily renamed `backend/uploads/`, started FastAPI on `8000`, checked directory creation and `/uploads/not-found.jpg`.
- Process cleanup: listed and stopped only project `uvicorn app.main:app` process trees.
- Standard backend API smoke on `http://127.0.0.1:8000`:
  - `GET /api/health`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `POST /api/public/upload`
  - `POST /api/public/submit`
  - `GET /api/warranty/{token}`
  - `GET /api/orders`
  - `GET /api/export/orders`
  - `GET /api/public/shop-info`
- Standard frontend HTTP smoke on `http://127.0.0.1:5173`:
  - `/api/health`
  - `/repair`
  - `/admin`
  - `/admin/profile`
  - `/warranty/t/:token`
- Browser smoke with Chrome DevTools MCP:
  - login at `/admin`
  - open `/admin/profile`
  - verify shop name `审计Smoke维修店` and phone `13900000000`
  - open valid `/warranty/t/:token`
  - check browser console errors

## 5. Test Results

- Fresh deploy `/uploads` first start: PASS. Directory was recreated; `/uploads/not-found.jpg` returned 404 and was not React HTML.
- `image_paths` legal JSON: PASS. New row stored a JSON array string and `json.loads()` succeeded.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `requirements.txt` direct `bcrypt`: PASS.
- `/admin/profile` shop info from backend env: PASS in browser.
- `CLAUDE.md` progress conflict: PASS.
- docs archive path: PASS.
- standard port `8000 + 5173` smoke test: PASS.
- v1.0 core API flow regression: PASS.

## 6. Remaining Risks

- 公开上传仍只校验 MIME type 和扩展名，未做真实图片内容解码校验；该项属于后续安全增强，不在本轮修复范围。
- 登录限频持久化、临时图片清理、备份脚本仍在 v1.1 backlog，不在本轮修复范围。
- 店铺信息编辑仍未实现，当前按 v1.0 决策从 `.env` 读取。

## 7. Recommendation

READY_FOR_CODEX_RECHECK
