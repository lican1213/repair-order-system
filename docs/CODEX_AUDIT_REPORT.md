# Codex Audit Report

## 1. Summary

本轮审计建议结论：**PASS_WITH_FIXES**。

核心 v1.0 流程在隔离后端和生产构建模式下基本可用：公开报修、图片上传、登录/JWT、订单筛选与更新、保修隐私边界、Excel 导出、SPA fallback、移动端后台主要页面均通过验收。

不建议直接进入真机试用，建议先修复少量问题，尤其是 fresh deploy 下 `/uploads` 静态挂载风险、`image_paths` 非 JSON 存储、lint 失败和店铺信息展示不一致。

说明：用户指定的 `docs/IMPLEMENTATION_PLAN.md` 和 `docs/superpowers/specs/2026-05-03-repair-order-system-design.md` 不在项目内 `E:/claude code project 1/repair-order-system/docs/`，但已在外层 `E:/claude code project 1/docs/` 找到并补读。

## 2. Commands Run

主要执行命令如下：

```powershell
Get-Content -Raw CLAUDE.md
Get-Content -Raw README.md
Get-Content -Raw docs/RELEASE_NOTES.md
Get-Content -Raw docs/PROGRESS.md
Get-Content -Raw docs/TODO.md
Get-Content -Raw docs/DECISIONS.md
Get-Content -Raw docs/API_SPEC.md
Get-Content -Raw docs/DB_SCHEMA.md
Get-Content -Raw "E:/claude code project 1/docs/IMPLEMENTATION_PLAN.md"
Get-Content -Raw "E:/claude code project 1/docs/superpowers/specs/2026-05-03-repair-order-system-design.md"
git status --short
git check-ignore -v backend/.env backend/data/repair.db backend/uploads/foo.jpg frontend/node_modules/pkg/index.js backend/app/static/index.html frontend/dist/index.html
```

```powershell
.\.venv\Scripts\python.exe --version
.\.venv\Scripts\python.exe -m pip --version
npm install
npm run build
npm run lint
```

```powershell
# 8000 已被历史 uvicorn 进程占用，且 /api/auth/me 返回 404；未杀进程，改用 8123 做隔离验收。
Start-Process .\.venv\Scripts\python.exe -ArgumentList @("-m","uvicorn","app.main:app","--host","127.0.0.1","--port","8123")
$env:DATABASE_URL="sqlite:///./data/codex_audit_8123_20260503134810.db"
.\.venv\Scripts\python.exe seed.py
```

```powershell
# 通过内联 Python 脚本调用 API，验证认证、上传、提交、订单、保修、导出、SPA fallback。
.\.venv\Scripts\python.exe -

# 验证已有 users 时 startup 不覆盖密码。
Start-Process .\.venv\Scripts\python.exe -ArgumentList @("-m","uvicorn","app.main:app","--host","127.0.0.1","--port","8124")
```

```powershell
npm run dev -- --host 127.0.0.1
Invoke-WebRequest http://127.0.0.1:5173/repair
Invoke-WebRequest http://127.0.0.1:5173/api/health
Invoke-WebRequest http://127.0.0.1:5173/uploads/not-a-real-file.jpg
```

另外使用浏览器移动端视图检查了：

- `/repair`
- `/repair/success`
- `/warranty/t/:token`
- `/admin`
- `/admin/dashboard`
- `/admin/orders`
- `/admin/orders/:id`
- `/admin/today`
- `/admin/followups`
- `/admin/profile`

## 3. Passed Checks

- 项目结构存在：`backend/`、`frontend/`、`docs/`、`README.md`、`CLAUDE.md`、`.gitignore`。
- `.gitignore` 正确排除：`backend/.env`、`backend/data/*.db`、`backend/uploads/`、`frontend/node_modules/`、`backend/app/static/`、`frontend/dist/`。
- 后端在隔离端口 `8123` 正常启动，`/api/health` 返回 `{"status":"ok"}`。
- startup 创建数据库表和管理员；已有 `users` 时不会覆盖密码。
- 登录接口使用 JSON body；密码为 bcrypt hash；JWT 有效期约 30 天。
- `/api/auth/me`、订单、后台上传、导出等后台接口无 token 返回 401。
- 登录失败 5 次后第 6 次返回 429，锁定逻辑生效。
- 公开接口无需 JWT：`/api/health`、`/api/public/upload`、`/api/public/submit`、`/api/warranty/{token}`、`/api/auth/login`。
- 公开上传限制通过：最多 5 张、单张 5MB、只允许 jpg/jpeg/png/webp、随机文件名、拒绝 svg/html/js/exe/zip/pdf。
- 公开提交校验必填字段，后端生成 `order_no`，temp 图片移动到正式 `uploads/orders/`，不会生成 `warranty_token`，`preferred_time` 保持文本且不写入 `scheduled_at`。
- 保修查询实际调用通过，只返回允许的 11 个公开字段，未返回客户姓名、手机号、地址、故障描述、收费、备注、图片路径等隐私字段。
- 订单 API 通过：状态筛选、回访筛选、创建日期、预约日期、关键词、分页、今日预约、待回访、首页统计、详情、PATCH 更新。
- `PATCH /api/orders/{id}` 通过：维修记录更新、状态变化写 `repair_logs`、设置 `warranty_until` 生成 token、重复保存不重新生成 token、完成状态自动填充 `completed_at`。
- Excel 导出通过：未登录 401，登录后返回可用 `.xlsx`，中文列名正常，筛选导出行数与订单筛选一致，`openpyxl` 可打开。
- `npm install` 成功，`npm run build` 成功，构建产物输出到 `backend/app/static/`。
- 生产模式只启动 FastAPI 时，前端路由刷新不 404；`/api/nonexistent` 返回 JSON 404；`/uploads/*` 未被 SPA fallback 抢走。
- 浏览器移动端页面检查通过：登录后跳 dashboard；未登录后台页面跳 `/admin`；订单列表搜索可用；订单详情保存成功；今日预约显示正确；待回访可标记并从列表移除；退出登录有效；成功页无 state 时有友好提示。
- 移动端主要按钮和底部导航触控高度满足 44px 以上；状态颜色同时显示中文文字；已检查页面未发现明显横向滚动或控制台错误。
- README 已明确：必须备份 `backend/data/repair.db` 和 `backend/uploads/`，只备份数据库不够；首次部署必须修改 `SECRET_KEY` 和 `ADMIN_PASSWORD`。

## 4. Findings

### Critical

无。

### High

1. Fresh deploy 时 `/uploads` 可能不会挂载。

   位置：`backend/app/main.py:91-93`

   当前代码只在 `Path(settings.UPLOAD_DIR).exists()` 为真时执行 `app.mount("/uploads", ...)`。但 `backend/uploads/` 被 `.gitignore` 排除，真实新部署时目录可能在模块导入时尚不存在；startup 虽然会创建目录，但 mount 已经错过。结果是首次启动后上传文件可能存在，但 `/uploads/...` 无法访问，需重启才恢复。

   建议：在 mount 前同步创建目录，或使用 `StaticFiles(directory=str(uploads_dir), check_dir=False)` 并确保 startup 创建目录。

### Medium

1. `image_paths` 存储为 Python list 字符串，不是 JSON 数组字符串。

   位置：`backend/app/routers/public.py:135`

   实测返回：`"['/uploads/orders/xxx.jpg', '/uploads/orders/yyy.png']"`，`json.loads()` 失败。文档和 DB schema 均说明该字段应为 JSON 数组字符串。这会影响后续图片展示、数据导出或清理脚本解析。

   建议：改为 `json.dumps(final_image_paths, ensure_ascii=False)`；读取时统一 `json.loads()`。

2. `npm run lint` 当前失败。

   位置：
   - `frontend/src/hooks/useAuth.ts:28`
   - `frontend/src/pages/FollowupList.tsx:20`
   - `frontend/src/pages/FollowupList.tsx:26`
   - `frontend/src/pages/OrderDetail.tsx:22`
   - `frontend/src/pages/OrderList.tsx:46`
   - `frontend/src/pages/WarrantyPage.tsx:15`

   构建不受影响，但质量门禁失败。主要是 React hooks 新规则 `react-hooks/set-state-in-effect` 和一个 `no-empty`。

3. `requirements.txt` 未直接声明 `bcrypt`。

   位置：`backend/requirements.txt:7`

   代码实际直接 `import bcrypt`，当前依赖通过 `passlib[bcrypt]` 间接安装 bcrypt。考虑到项目已经明确不通过 passlib 调 bcrypt，建议直接添加 `bcrypt`，避免依赖关系不清晰。

4. 后台“我的”页面店铺信息硬编码，与 `.env` 配置不一致。

   位置：`frontend/src/pages/AdminProfile.tsx:24`、`frontend/src/pages/AdminProfile.tsx:28`

   审计环境中后端配置为 `审计测试维修店 / 13900000000`，保修页正确使用后端配置，但 `/admin/profile` 仍显示 `诚信家电维修 / 13800138000`。README 要求首次部署修改 `SHOP_NAME` 和 `SHOP_PHONE`，这里会造成老板端看到错误店铺信息。

### Low

1. 两个设计/实施文档在项目外层目录，而不是项目内 `docs/`。

   实际路径：
   - `E:/claude code project 1/docs/IMPLEMENTATION_PLAN.md`
   - `E:/claude code project 1/docs/superpowers/specs/2026-05-03-repair-order-system-design.md`

   当前项目文档和实施计划中都引用 `docs/...`，建议归档到项目内或在 README 中说明外层路径。

2. `CLAUDE.md` 有重复且冲突的进度表。

   位置：`CLAUDE.md:118-127`

   文档前面已说明 v1.0 全部完成，但后面残留 Phase 3-12 “未开始”的旧表格，容易误导后续维护者。

3. 公开上传只校验客户端提供的 MIME type 和扩展名，没有校验真实图片内容。

   位置：`backend/app/routers/public.py:42-49`

   当前能拒绝常见危险扩展和 MIME，但伪造为 `image/jpeg` 且扩展名为 `.jpg` 的非图片内容仍可能被保存。浏览器通常会按 `.jpg` 当图片处理，风险有限，但公开上传接口建议后续加真实图片解码校验。

4. 开发环境端口存在历史进程干扰。

   本轮审计开始时 `8000-8011` 存在多批历史 `uvicorn app.main:app` 进程，其中 `8000` 的 `/api/health` 可用但 `/api/auth/me` 返回 404，不是本轮干净后端。未杀掉这些进程，最终使用 `8123/8124` 做隔离验收。建议清理本机旧进程后再按 README 复测 `8000`。

## 5. Recommended Fixes Before Real Use

1. 修复 `/uploads` fresh deploy 挂载风险。
2. 将 `image_paths` / 后续 `repair_images` 统一存为合法 JSON 数组字符串。
3. 修复 `npm run lint` 失败项，或明确调整 ESLint 规则，保证质量命令稳定。
4. 在 `requirements.txt` 直接添加 `bcrypt`。
5. 修正 `/admin/profile` 店铺名称和电话的来源，至少不要与 `.env` 配置冲突。
6. 清理本机历史 uvicorn 进程后，用标准 `8000 + 5173` 再跑一次 smoke test。

## 6. Recommended Backlog

- 公共上传增加真实图片内容校验。
- 公共报修和上传接口增加限频。
- 临时图片清理脚本。
- 备份脚本，覆盖 `repair.db + uploads/`。
- 登录失败限频持久化。
- 默认 `SECRET_KEY` / `ADMIN_PASSWORD` 启动警告。
- `order_no` 并发生成增加唯一冲突重试。
- 修改密码、店铺信息编辑、保修二维码生成与下载。
- 将外层设计文档归档到项目内 `docs/`，并清理 `CLAUDE.md` 旧进度表。

## 7. Final Recommendation

**PASS_WITH_FIXES: 修复少量问题后进入真机试用**

