# 待办事项

## v1.0 — 已完成

- [x] Phase 0: 项目上下文与基础文件
- [x] Phase 1: 后端项目骨架
- [x] Phase 2: 数据库与模型
- [x] Phase 3: 认证系统
- [x] Phase 4: 公开报修与保修接口
- [x] Phase 5: 后台订单 API
- [x] Phase 6: 文件上传与导出
- [x] Phase 7: 前端项目骨架
- [x] Phase 8: 客户公开页面
- [x] Phase 9: 老板后台页面
- [x] Phase 10: 生产构建与静态托管
- [x] Phase 11: 测试与验收
- [x] Phase 12: 文档与交付

## v1.0 audit fixes — 已完成，待 Codex 复审

- [x] 修复 fresh deploy 下 `/uploads` 首次启动挂载风险
- [x] 修复 `image_paths` 非 JSON 存储，并兼容历史脏数据读取
- [x] 修复 `npm run lint` 失败
- [x] 在 `backend/requirements.txt` 直接声明 `bcrypt`
- [x] `/admin/profile` 店铺名称和电话改为来自后端 `.env`
- [x] 清理 `CLAUDE.md` 冲突进度表
- [x] 归档 `IMPLEMENTATION_PLAN.md` 和设计文档到项目内 `docs/`
- [x] 使用标准端口 `8000 + 5173` 完成 smoke test

## v1.1 后续功能

- [ ] 登录失败限频持久化（写入数据库，重启不清空）
- [ ] 临时图片清理脚本（清理 uploads/orders/temp/ 下超过 7 天且未绑定订单的图片）
- [ ] 备份脚本 scripts/backup.py（备份 repair.db + uploads/）

## v1.2 后续功能

- [ ] 修改密码功能（/admin/profile 页面）
- [ ] 店铺信息编辑（名称、电话，从 .env 迁移到数据库）
- [ ] 保修二维码生成与下载

## v1.3 后续功能

- [ ] 微信小程序版本

## 安全与部署

- [ ] 生产环境 HTTPS（Caddy 自动证书）
- [ ] Caddy 反向代理配置
- [ ] systemd 服务管理

## 已知限制（非 bug）

- 登录失败锁定使用内存存储，服务重启后清空
- SQLite 适合小店场景，不适合高并发
- 图片临时目录清理脚本暂未实现
- 店铺信息编辑暂未实现，当前展示信息来自 .env
- 保修二维码下载暂未实现，当前只提供保修链接
- 微信小程序暂未实现
