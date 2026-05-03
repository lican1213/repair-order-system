# 项目进度

## 当前状态

**v1.1 开发完成** — 2026-05-03。

v1.0 全部 12 个 Phase 通过。Codex 独立审计结论：**PASS_WITH_FIXES**，audit fixes 已通过 Codex 复审（**PASS**）。Mobile Hotfix 七轮已完成。v1.1 四项增强全部实现并通过回归测试（14/14 端点 PASS）。详细计划见 `docs/V1_1_PLAN.md`。

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
