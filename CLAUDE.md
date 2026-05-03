# 家电维修工单系统

## 项目概述

轻量 H5 工单系统，客户扫码报修，老板手机后台管理订单。面向小型家电维修商铺。

**目标用户：** 维修店老板（中年师傅，手机操作为主）
**核心流程：** 客户扫码 → 填写报修 → 老板接单 → 上门维修 → 记录结果 → 保修凭证

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React + Vite + TypeScript + Tailwind CSS |
| 后端 | Python FastAPI |
| 数据库 | SQLite |
| 认证 | JWT (30天) + bcrypt |
| 部署 | FastAPI 统一服务（生产环境 serve 前端构建产物） |

## 架构决策

**FastAPI 统一服务：** 后端同时提供 API 和 React 静态文件。开发环境用 Vite dev server + FastAPI，生产环境 FastAPI 直接 serve 构建产物到 `backend/app/static/`。

**SPA fallback：** `/api/*` 走后端 API，`/uploads/*` 走文件访问，其他路径返回 `static/index.html`。

## 目录结构

```
repair-order-system/
├── CLAUDE.md
├── README.md
├── .gitignore
├── backend/
│   ├── app/
│   │   ├── main.py, config.py, database.py, models.py
│   │   ├── schemas.py, auth.py, constants.py
│   │   ├── routers/ (auth, public, orders, upload, export, warranty)
│   │   └── static/ (React build output)
│   ├── data/ (SQLite)
│   ├── uploads/ (orders/, warranty/)
│   ├── seed.py, requirements.txt, .env.example
├── frontend/
│   ├── src/ (api/, pages/, components/, hooks/, routes/, types/, utils/)
│   ├── vite.config.ts, package.json, tsconfig.json
├── docs/
│   ├── PRD.md, API_SPEC.md, DB_SCHEMA.md
│   ├── IMPLEMENTATION_PLAN.md
│   ├── PROGRESS.md, TODO.md, DECISIONS.md
│   └── superpowers/specs/
└── scripts/
```

## 开发启动

**后端 (Windows PowerShell)：**
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

**前端：**
```bash
cd frontend
npm install
npm run dev
```

Vite dev server 代理 `/api` 和 `/uploads` 到 `http://localhost:8000`。

## 生产构建

```bash
cd frontend
npm run build
# 输出到 backend/app/static/
cd ../backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Current Progress Summary

| Phase | 状态 | 说明 |
|-------|------|------|
| Phase 0 | 完成 | 项目上下文与基础文件 |
| Phase 1 | 完成 | 后端项目骨架，/api/health 可用 |
| Phase 2 | 完成 | 数据库与模型，seed.py 可生成测试数据 |
| Phase 3 | 完成 | 认证系统，登录/JWT/限频/管理员自动创建 |
| Phase 4 | 完成 | 公开报修与保修接口，客户可提交报修和查询保修 |
| Phase 5 | 完成 | 后台订单 API，订单列表/筛选/今日预约/待回访/统计/更新 |
| Phase 6 | 完成 | 文件上传与 Excel 导出 |
| Phase 7 | 完成 | 前端项目骨架，React+Vite+TS+Tailwind，路由/组件/类型/常量 |
| Phase 8 | 完成 | 客户公开页面，报修表单/成功页/保修查询页 |
| Phase 9 | 完成 | 老板后台页面，登录/首页/订单列表/详情/今日预约/待回访/我的 |
| Phase 10 | 完成 | 生产构建与 FastAPI 静态托管，单进程可运行 |
| Phase 11 | 完成 | 测试与验收，v1.0 核心流程全部通过 |
| Phase 12 | 完成 | 文档与交付，v1.0 开发完成 |

## v1.0 交付状态

v1.0 开发已完成，全部 12 个 Phase 通过。Codex 独立审计结论为 **PASS_WITH_FIXES**。v1.0 audit fixes 已完成。Mobile Hotfix 五轮已完成（6 个真机问题 + 手机号即时校验 + 日期时间段选择 + 日期限制 + 其他家电引导 + 日期时间不能早于当前时点 + 保修凭证仅完成后触发 + 客户图片后台显示），下一步是手机真机试用。

核心功能已通过 Phase 11 测试：
- 公开报修流程（上传+提交+入库+图片移动）
- 登录/锁定/退出流程
- 订单管理（筛选+搜索+更新+repair_logs+warranty_token）
- 今日预约（基于 scheduled_at）
- 待回访（标记后列表刷新）
- 保修查询隐私边界（无泄露）
- Excel 导出（全部+筛选）
- SPA 刷新（前端路由不 404）

## 下一步建议

1. 将 v1.0 audit fixes 交给 Codex 复审
2. 复审 PASS 后做真实设备试用：在舅舅手机上测试完整流程
3. 部署服务器：Caddy + HTTPS + systemd
4. 备份策略：定期备份 repair.db + uploads
5. v1.1 backlog：登录限频持久化、临时图片清理、备份脚本

## 关键规则

- 正式系统不依赖任何大模型 API
- Agent 只用于开发阶段
- 不做：AI 客服、AI 诊断、AI 报价、在线支付、会员、商城、复杂库存、多员工、微信小程序
- 状态枚举集中管理在 `constants.py` / `constants.ts`
- 公开保修接口只返回公开字段，不暴露客户隐私
