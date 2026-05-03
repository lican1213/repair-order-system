# Final Smoke Test Report

## 1. 测试日期

- 日期：2026-05-03
- 环境：Windows PowerShell，本地生产模式 FastAPI `http://localhost:8000`
- 范围：v1.0 核心流程 + v1.1 备份、清理、限频、修改密码
- 测试原则：只做测试和报告；未修改业务代码。

## 2. Git 敏感文件检查结果

| 检查项 | 结果 | 说明 |
|---|---|---|
| `git status --short` | PASS_WITH_NOTE | 工作区已有 v1.1 代码/文档未提交变更；本轮仅新增本报告。 |
| `git ls-files \| findstr ".env"` | PASS | 仅跟踪 `backend/.env.example`，未跟踪 `backend/.env`。 |
| `git ls-files \| findstr "repair.db"` | PASS | 未跟踪 `backend/data/repair.db`。 |
| `git ls-files \| findstr "uploads"` | PASS | 未跟踪 `backend/uploads/`。 |
| `git ls-files \| findstr "backups"` | PASS | 未跟踪 `backups/`。 |
| `git ls-files \| findstr "SECRET_KEY"` | PASS | 无以 `SECRET_KEY` 命名的跟踪文件。 |
| `git ls-files \| findstr "ADMIN_PASSWORD"` | PASS | 无以 `ADMIN_PASSWORD` 命名的跟踪文件。 |
| `git grep -n -e SECRET_KEY -e ADMIN_PASSWORD` | PASS_WITH_NOTE | 跟踪文件中存在 `.env.example`、`config.py` 默认值和文档说明；未发现本地真实 `.env` 被跟踪。部署前必须按 README 修改生产 `.env`。 |

## 3. lint / build / compileall 结果

| 命令 | 结果 | 说明 |
|---|---|---|
| `cd frontend; npm run lint` | PASS | ESLint exit 0。 |
| `cd frontend; npm run build` | PASS | Vite 构建成功，输出到 `backend/app/static/`。 |
| `cd backend; .\.venv\Scripts\python.exe -m compileall app` | PASS | Python 编译检查通过。 |

## 4. 生产模式路由测试结果

仅启动 FastAPI，未启动 Vite。端口 `5173` 无监听。

| URL | 结果 | 说明 |
|---|---|---|
| `/api/health` | PASS | 200 JSON：`{"status":"ok"}`。 |
| `/repair` | PASS | 200 HTML，返回 React 入口。 |
| `/admin` | PASS | 200 HTML，返回 React 入口。 |
| `/admin/orders` | PASS | 200 HTML，返回 React 入口。 |
| `/warranty/t/test-token` | PASS | 200 HTML，返回 React 入口。 |
| `/api/nonexistent` | PASS | 404 JSON：`{"detail":"Not Found"}`。 |
| `/uploads/not-found.jpg` | PASS | 404 JSON，不返回 React HTML。 |

## 5. v1.0 核心流程测试结果

| 流程 | 结果 | 说明 |
|---|---|---|
| 客户报修页打开 | PASS | `/repair` 生产构建页面正常显示。 |
| “其他”家电类型必填具体类型/品牌型号 | PASS | 前端显示必填提示；后端 API 空 `brand_model` 返回 422。 |
| 图片上传 | PASS | `/api/public/upload` 上传 PNG 成功。 |
| 提交报修 | PASS | 创建工单 `WX20260503014`，成功响应包含工单编号和店铺电话。 |
| 老板登录 / dashboard / orders | PASS | 浏览器登录成功，`/admin/dashboard` 与 `/admin/orders` 正常加载。 |
| 订单详情 | PASS | 找到工单 `WX20260503014`，详情页正常打开。 |
| 客户上传图片显示 | PASS | 图片路径从 temp 移动到正式 `/uploads/orders/`，静态访问 200 image/png。 |
| 图片预览 modal | PASS | 浏览器中可打开并关闭图片预览。 |
| 状态流转 | PASS | `新报修` -> `已联系` -> `已预约` -> `已完成`。 |
| 预约时间 | PASS | 保存 `2026-05-04 10:30`。 |
| 维修结果 / 收费 / 保修 | PASS | 保存维修结果、配件、`88` 元、保修至 `2026-06-02`。 |
| 保修链接 | PASS | 生成 token，后台“打开保修页”新开页面，公开页显示保修凭证。 |
| 保修隐私边界 | PASS | 公开保修 API 不返回手机号、地址、收费金额、备注、图片路径。 |
| 待回访 | PASS | 已完成未回访订单进入待回访；标记 `已回访` 后从待回访列表消失。 |
| Excel 导出 | PASS | `/api/export/orders` 返回 `.xlsx`；按 `keyword + status` 筛选导出只包含当前工单。 |

## 6. v1.1 功能测试结果

| 功能 | 结果 | 说明 |
|---|---|---|
| 备份脚本 | PASS | `scripts/backup.py --keep 9999` 生成 `backups/20260503_201915/`，包含 `repair.db` 和 `uploads/`。 |
| 备份不移动源文件 | PASS | 备份前后源数据库存在且大小不变；源 uploads 文件数保持 `31 -> 31`。 |
| 临时图片清理 dry-run | PASS | `--dry-run` 只列出过期 temp 测试文件。 |
| 临时图片清理实际执行 | PASS | 只删除 `uploads/orders/temp/` 下 8 天前测试文件；新 temp 文件和正式 `uploads/orders/` 测试文件均保留。 |
| 公开 upload 限频 | PASS | 同一测试 IP 第 1-10 次 200，第 11 次 429；测试产生的 temp 图片已手动清理。 |
| 公开 submit 限频 | PASS | 同一手机号第 1-3 次 200，第 4 次 429。产生测试工单 `WX20260503015`、`WX20260503016`、`WX20260503017`。 |
| 正常单次报修不受影响 | PASS | 使用新 IP/手机号提交成功，工单 `WX20260503018`。 |
| 后台 JWT 接口不受影响 | PASS | 限频后登录和 `/api/orders` 仍 200。 |
| 修改密码：错误旧密码 | PASS | 返回 401。 |
| 修改密码：确认不一致 | PASS | 返回 422。 |
| 修改密码：正确旧密码 | PASS | 浏览器页面修改成功，并跳转回登录页。 |
| 新密码登录 | PASS | 临时新密码可登录后台。 |
| 测试密码恢复 | PASS | 已恢复 `.env` 中原测试密码，并验证原密码可重新登录。 |

## 7. 发现的问题

| 级别 | 问题 | 影响 |
|---|---|---|
| Low | `docs/V1_1_REPORT.md` 不存在。 | 本轮按要求尝试读取但文件缺失；`docs/V1_1_CLEANUP_REPORT.md` 已说明 v1.1 状态记录在 `PROGRESS` / `RELEASE_NOTES` / `V1_1_AUDIT_REPORT` 中。非运行阻塞。 |
| Low | `git grep` 能看到 `.env.example`、`config.py` 和文档里的默认 `SECRET_KEY` / `ADMIN_PASSWORD` 字样。 | 真实 `backend/.env` 未跟踪；但生产部署必须覆盖默认配置。建议部署准备阶段再次确认生产 `.env`。 |
| Low | 浏览器控制台存在 Chrome 表单可访问性提示：密码字段不在 `<form>` 内、部分字段缺少 label/id/name。 | 未发现 JS runtime error，不影响本次核心流程；可后续作为 UI/可访问性优化。 |
| Info | 本轮 smoke test 写入了本地测试工单。 | 包括 `WX20260503014` 到 `WX20260503018`；用于验证核心流程和限频。 |

## 8. 是否阻塞部署

不阻塞进入部署准备。

需要在正式部署前确认：

1. 提交当前 v1.1 代码、文档和本报告。
2. 生产 `.env` 必须替换默认 `SECRET_KEY`、`ADMIN_PASSWORD`、`SHOP_NAME`、`SHOP_PHONE`。
3. 按 README 使用 Caddy/Nginx 等可信反向代理，避免直接公网暴露 FastAPI，确保 `X-Forwarded-For` 信任边界成立。

## 9. 最终结论

**PASS_WITH_MINOR_ISSUES**
