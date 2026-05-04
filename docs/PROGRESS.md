# 项目进度

## 当前状态

**v1.3 二手家电展示橱窗已完成独立审计（PASS），可打 tag 并灰度上线** — 2026-05-04。

v1.0 全部 12 个 Phase 通过。Codex 独立审计结论：**PASS_WITH_FIXES**，audit fixes 已通过 Codex 复审（**PASS**）。Mobile Hotfix 七轮已完成。v1.1 四项增强全部实现并通过回归测试（14/14 端点 PASS）。2026-05-04 完成部署前稳定性小修：SQLite WAL + busy_timeout、Caddy HTTPS 部署 runbook、cron 自动备份说明。同日新增公开清洗服务价格表 `/pricing`。v1.3 新增二手家电展示橱窗 `/used` 和后台 `/admin/used-appliances`，坚持展示 + 电话咨询，不做商城交易闭环。v1.3 独立审计 **PASS**，审计期间修复 2 个 bug（上传按钮、多图预览）。

## v1.3 二手家电展示橱窗实施

| Phase | 状态 | 日期 | 说明 |
|-------|------|------|------|
| Phase 1 后端 API 与上传 | 完成 | 2026-05-04 | 新增 `used_appliances` 表模型、公开只读 API、后台 JWT API、`/api/upload/used`；后端 unittest 和 compileall 通过 |
| Phase 2 前端页面 | 完成 | 2026-05-04 | 新增公开 `/used`、后台 `/admin/used-appliances`、报修页入口、后台 dashboard/profile 入口；lint/build 通过 |
| Phase 3 文档更新 | 完成 | 2026-05-04 | 同步 CLAUDE/README/API/DB/TODO/DECISIONS/报告等项目上下文 |
| Phase 4 完整验证与审计自检 | 完成 | 2026-05-04 | compileall、后端 API smoke、frontend lint/build、浏览器 dev 流程、生产 SPA fallback 均通过 |

## v1.3 二手家电展示橱窗验证

| 测试项 | 结果 | 日期 |
|--------|------|------|
| `python -m unittest tests.test_used_appliances_api -v` | PASS | 2026-05-04 |
| `python -m compileall app` | PASS | 2026-05-04 |
| 后端 API smoke on 8000 | PASS | 2026-05-04 |
| 未登录后台二手家电接口 | PASS，401 | 2026-05-04 |
| 公开接口只展示在售 | PASS | 2026-05-04 |
| 下架商品公开详情 404 | PASS | 2026-05-04 |
| `POST /api/upload/used` | PASS | 2026-05-04 |
| `npm run lint` | PASS | 2026-05-04 |
| `npm run build` | PASS | 2026-05-04 |
| 浏览器 `/used`、后台管理、上传、预览、电话咨询、状态隐藏 | PASS | 2026-05-04 |
| `/repair`、`/pricing`、`/admin/orders`、`/warranty/t/:token` 回归 | PASS | 2026-05-04 |
| 生产模式 `/used`、`/admin/used-appliances`、`/api/used-appliances` | PASS | 2026-05-04 |
| 独立审计（数据库/API/前端/安全/回归/文档） | PASS | 2026-05-04 |
| 修复：后台上传按钮无反应（label→div+useRef） | 已修复 | 2026-05-04 |
| 修复：公开页多图预览只显示第一张（ImagePreviewModal gallery） | 已修复 | 2026-05-04 |
| 修复后 lint/build/unittest 回归 | PASS | 2026-05-04 |
| 新增 DELETE 端点（仅下架可删，清理图片文件） | 已实现 | 2026-05-04 |
| 新增 scripts/cleanup_used_appliances.py 定时清理脚本 | 已实现 | 2026-05-04 |
| 后台新增删除按钮（仅下架商品显示） | 已实现 | 2026-05-04 |
| 修改后 lint/build/compileall/unittest 回归 | PASS | 2026-05-04 |

## 线上灰度内容更新

| 项目 | 状态 | 日期 | 说明 |
|------|------|------|------|
| 清洗服务价格表 `/pricing` | 完成 | 2026-05-04 | 静态公开前端页面，展示清洗服务起步参考价 |
| `/repair` 价格表入口 | 完成 | 2026-05-04 | 报修页顶部新增“查看清洗价格表”入口，使用相对路由 `/pricing` |
| 后端 API / 数据库 | 未修改 | 2026-05-04 | 价格表不做自动报价、支付、后台价格管理或数据库价格表 |

## 线上灰度内容更新验证

| 测试项 | 结果 | 日期 |
|--------|------|------|
| `npm run lint` | PASS | 2026-05-04 |
| `npm run build` | PASS | 2026-05-04 |
| 生产模式 `GET /pricing` | PASS | 2026-05-04 |
| `/pricing` 刷新不 404 | PASS | 2026-05-04 |
| `/pricing` 底部按钮跳转 `/repair` | PASS | 2026-05-04 |
| `/repair` 价格表入口跳转 `/pricing` | PASS | 2026-05-04 |
| 手机尺寸页面可读性 | PASS | 2026-05-04 |

## 部署前稳定性小修

| 项目 | 状态 | 日期 | 说明 |
|------|------|------|------|
| SQLite WAL | 完成 | 2026-05-04 | SQLAlchemy SQLite 连接启用 `PRAGMA journal_mode=WAL` |
| SQLite busy_timeout | 完成 | 2026-05-04 | SQLite 连接启用 `PRAGMA busy_timeout=5000` |
| Caddy HTTPS 部署说明 | 完成 | 2026-05-04 | 新增 `docs/DEPLOYMENT_RUNBOOK.md`，明确 80/443、127.0.0.1:8000、防火墙、DNS |
| cron 自动备份说明 | 完成 | 2026-05-04 | runbook/README 明确每日备份 repair.db + uploads、默认保留 7 份、部署前手动运行、定期外部下载 |

## 部署前稳定性小修验证

| 测试项 | 结果 | 日期 |
|--------|------|------|
| SQLite `PRAGMA journal_mode` | PASS (`wal`) | 2026-05-04 |
| SQLite `PRAGMA busy_timeout` | PASS (`5000`) | 2026-05-04 |
| `python -m compileall app` | PASS | 2026-05-04 |
| `GET /api/health` on port 8000 | PASS (`{"status":"ok"}`) | 2026-05-04 |
| `scripts/backup.py --help` | PASS (default keep 7) | 2026-05-04 |

| 轮次 | 修复内容 | 日期 |
|------|---------|------|
| 第一轮 | 6 个真机问题（手机号校验、称呼、定位、保修链接、复制地址、复制保修链接） | 2026-05-03 |
| 第二轮 | 手机号即时校验 + 希望上门时间改为日期+时间段选择 | 2026-05-03 |
| 第三轮 | 所有日期不能选过去 + 家电类型"其他"引导填写 | 2026-05-03 |
| 第四轮 | 日期时间不能早于当前时点 + 保修凭证只在订单完成后触发 | 2026-05-03 |
| 第五轮 | 修复客户上传图片后台不显示问题 | 2026-05-03 |
| 第六轮 | 图片弹层预览 + Excel 导出入口 | 2026-05-03 |
| 第七轮 | 浏览器标题修正为"家电维修工单系统" | 2026-05-03 |

## Phase 进度

| Phase | 状态 | 开始时间 | 完成时间 | 说明 |
|-------|------|---------|---------|------|
| Phase 0 | 完成 | 2026-05-03 | 2026-05-03 | 项目上下文与基础文件 |
| Phase 1 | 完成 | 2026-05-03 | 2026-05-03 | 后端项目骨架 |
| Phase 2 | 完成 | 2026-05-03 | 2026-05-03 | 数据库与模型 |
| Phase 3 | 完成 | 2026-05-03 | 2026-05-03 | 认证系统 |
| Phase 4 | 完成 | 2026-05-03 | 2026-05-03 | 公开报修与保修接口 |
| Phase 5 | 完成 | 2026-05-03 | 2026-05-03 | 后台订单 API |
| Phase 6 | 完成 | 2026-05-03 | 2026-05-03 | 文件上传与导出 |
| Phase 7 | 完成 | 2026-05-03 | 2026-05-03 | 前端项目骨架 |
| Phase 8 | 完成 | 2026-05-03 | 2026-05-03 | 客户公开页面 |
| Phase 9 | 完成 | 2026-05-03 | 2026-05-03 | 老板后台页面 |
| Phase 10 | 完成 | 2026-05-03 | 2026-05-03 | 生产构建与静态托管 |
| Phase 11 | 完成 | 2026-05-03 | 2026-05-03 | 测试与验收 |
| Phase 12 | 完成 | 2026-05-03 | 2026-05-03 | 文档与交付 |

## 最终验收结果

| 测试项 | 结果 | 日期 |
|--------|------|------|
| 公开报修流程 | PASS | 2026-05-03 |
| 登录流程 | PASS | 2026-05-03 |
| 订单管理流程 | PASS | 2026-05-03 |
| 今日预约 | PASS | 2026-05-03 |
| 待回访 | PASS | 2026-05-03 |
| 保修隐私边界 | PASS | 2026-05-03 |
| Excel 导出 | PASS | 2026-05-03 |
| 移动端布局 | PASS | 2026-05-03 |
| SPA 刷新 | PASS | 2026-05-03 |
| npm run build | PASS | 2026-05-03 |

## Audit Fixes 进度

| 修复项 | 状态 | 说明 |
|--------|------|------|
| /uploads fresh deploy mount | 完成 | 导入阶段创建上传目录并无条件挂载 StaticFiles |
| image_paths JSON storage | 完成 | 新写入使用 JSON 数组字符串，响应读取兼容历史脏数据 |
| npm run lint | 完成 | 已调整 React hooks 触发点和 no-empty |
| bcrypt direct dependency | 完成 | requirements.txt 直接声明 bcrypt |
| /admin/profile shop info | 完成 | 新增 /api/public/shop-info，前端从后端读取 .env 配置 |
| CLAUDE.md progress conflict | 完成 | 已删除冲突旧进度表 |
| docs archive path | 完成 | 实施计划和设计文档已归档到项目内 docs |
| standard port smoke test | 完成 | 使用 8000 + 5173 完成后端 API、前端 HTTP 和浏览器 smoke test |

## v1.1 进度

| Phase | 状态 | 日期 | 说明 |
|-------|------|------|------|
| Phase 1 备份脚本 | 完成 | 2026-05-03 | `scripts/backup.py` + `.gitignore` |
| Phase 2 临时图片清理 | 完成 | 2026-05-03 | `scripts/cleanup_temp_images.py` |
| Phase 3 公开接口限频 | 完成 | 2026-05-03 | `rate_limit.py` + 修改 `public.py` |
| Phase 4 修改密码 | 完成 | 2026-05-03 | `password.py` + 修改 `schemas.py`/`main.py`/`auth.ts`/`AdminProfile.tsx` |
| Phase 5 回归测试与文档 | 完成 | 2026-05-03 | 14/14 端点 PASS + 7 个文档同步 |

## v1.1 最终验收结果

| 测试项 | 结果 | 日期 |
|--------|------|------|
| GET /api/health | PASS | 2026-05-03 |
| GET /api/public/shop-info | PASS | 2026-05-03 |
| POST /api/auth/login (valid) | PASS | 2026-05-03 |
| POST /api/auth/login (wrong) | PASS | 2026-05-03 |
| POST /api/public/upload | PASS | 2026-05-03 |
| POST /api/public/submit | PASS | 2026-05-03 |
| GET /api/orders (authed) | PASS | 2026-05-03 |
| GET /api/orders (no auth) | PASS | 2026-05-03 |
| GET /api/export/orders | PASS | 2026-05-03 |
| POST /api/auth/change-password (401) | PASS | 2026-05-03 |
| POST /api/auth/change-password (422) | PASS | 2026-05-03 |
| POST /api/auth/change-password (200) | PASS | 2026-05-03 |
| Upload rate limit (10/min → 429) | PASS | 2026-05-03 |
| Submit rate limit (5/min → 429) | PASS | 2026-05-03 |
| scripts/backup.py | PASS | 2026-05-03 |
| scripts/cleanup_temp_images.py --dry-run | PASS | 2026-05-03 |
| npm run build | PASS | 2026-05-03 |
