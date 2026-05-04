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
├── CLAUDE.md, AGENTS.md, README.md, .gitignore
├── backend/
│   ├── app/
│   │   ├── main.py, config.py, database.py, models.py
│   │   ├── schemas.py, auth.py, constants.py, rate_limit.py
│   │   ├── routers/ (auth, public, orders, upload, export, warranty, password, used_appliances)
│   │   └── static/ (React build output)
│   ├── data/ (SQLite)
│   ├── uploads/ (orders/, orders/temp/, used/, warranty/)
│   ├── seed.py, requirements.txt, .env.example
├── frontend/
│   ├── src/ (api/, pages/, components/, hooks/, routes/, types/, utils/)
│   ├── vite.config.ts, package.json, tsconfig.json
├── scripts/
│   ├── backup.py (一键备份 db + uploads)
│   ├── cleanup_temp_images.py (清理过期临时图片)
│   └── cleanup_used_appliances.py (清理已下架二手家电及图片)
├── backups/ (gitignored)
└── docs/
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

| 版本 | 状态 | 说明 |
|------|------|------|
| v1.0（Phase 0-12） | ✅ 完成 | 全部 12 Phase 通过，Codex 审计 PASS_WITH_FIXES，复审 PASS |
| Mobile Hotfix | ✅ 完成 | 七轮修复全部通过（2026-05-03） |
| v1.1 | ✅ 完成 | 备份/清理/限频/改密，14/14 端点 PASS，Codex 审计 PASS（2026-05-03） |
| v1.3：二手家电展示橱窗 | ✅ 完成 | 公开 `/used` + 后台 `/admin/used-appliances`，独立审计 PASS（2026-05-04） |

## v1.1 交付状态

v1.1 已于 2026-05-03 开发完成并通过 Codex 审计（**PASS**）。详见 `docs/V1_1_PLAN.md` 和 `docs/V1_1_AUDIT_REPORT.md`。

## v1.3 交付状态

v1.3 已于 2026-05-04 开发完成并通过独立审计（**PASS**）。详见 `docs/USED_APPLIANCES_AUDIT_REPORT.md`。

## 下一步

项目已完成 v1.0 + v1.1 + v1.3 开发，v1.3 已通过独立审计：

1. 打 v1.3 tag
2. 线上灰度观察（见 `docs/REAL_DEVICE_TEST_PLAN.md`）
3. 部署准备（Caddy + HTTPS + systemd，确认 X-Forwarded-For 信任边界）
4. v1.2 只在有真实需求后再规划
5. 二手家电展示橱窗后续不得扩展成商城系统

## v1.0 边界（不可随意扩展）

- 不接入 AI（无大模型 API、无 AI 客服/诊断/报价）
- 不做微信小程序
- 不做库存管理、多员工、会员、在线支付
- 不自动删除无效订单，使用"未成交"状态
- 图片预览只做轻量弹层，不做图片管理系统

## v1.2 路线图（有真实需求后再规划）

- 店铺信息编辑（名称、电话，从 .env 迁移到数据库）
- 保修二维码生成与下载

## 关键规则

- 正式系统不依赖任何大模型 API
- Agent 只用于开发阶段
- 不做：AI 客服、AI 诊断、AI 报价、在线支付、会员、商城、复杂库存、多员工、微信小程序
- 状态枚举集中管理在 `constants.py` / `constants.ts`
- 公开保修接口只返回公开字段，不暴露客户隐私
