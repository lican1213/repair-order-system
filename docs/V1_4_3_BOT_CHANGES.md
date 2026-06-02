# v1.4.3 企业微信智能机器人长连接来单通知

## 功能说明

客户提交报修订单后，除了现有的 webhook 通知，额外通过企微智能机器人向群聊发送来单提醒。

## 改动文件清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `backend/app/bot.py` | 新增 | WSClient 长连接管理 + send_bot_message |
| `backend/tests/test_wecom_bot.py` | 新增 | 16 个单元测试 |
| `backend/app/config.py` | 修改 | 新增 4 个配置项 |
| `backend/app/notification.py` | 修改 | 新增 send_order_created_bot_notification |
| `backend/app/routers/public.py` | 修改 | 下单时触发机器人通知 |
| `backend/app/main.py` | 修改 | 启动/关闭时管理机器人生命周期 |
| `backend/requirements.txt` | 修改 | 新增 wecom-aibot-python-sdk |
| `backend/.env.example` | 修改 | 新增机器人配置模板 |

## 配置项（.env）

```env
# 企业微信智能机器人来单通知（默认关闭）
WECOM_BOT_ENABLED=true
WECOM_BOT_ID=REPLACE_WITH_WECOM_BOT_ID
WECOM_BOT_SECRET=REPLACE_WITH_WECOM_BOT_SECRET
WECOM_BOT_CHAT_ID=REPLACE_WITH_WECOM_BOT_CHAT_ID
```

不要把真实 Bot ID、Secret、Chat ID 写入文档或提交到 Git。

## 服务器部署注意事项

1. 必须用虚拟环境的 pip 安装依赖：
   ```bash
   /home/repair-order-system/backend/.venv/bin/pip install wecom-aibot-python-sdk
   ```

2. 如果遇到 `ModuleNotFoundError: No module named '_cffi_backend'`，需要先装系统依赖：
   ```bash
   apt-get install -y libffi-dev libssl-dev
   /home/repair-order-system/backend/.venv/bin/pip install --force-reinstall cffi cryptography
   ```

3. 重启服务：
   ```bash
   sudo systemctl restart repair
   ```

4. 日志中看到 `Authenticated` 表示机器人连接成功。

## 架构说明

- 机器人使用 WebSocket 长连接（`wss://openws.work.weixin.qq.com`），不需要公网入站端口
- 与现有 webhook 通知并行，互不影响
- 机器人默认关闭（`WECOM_BOT_ENABLED=false`），不影响原有功能
- 发送失败只写日志，不阻塞下单流程

## Git 信息

- 分支：`codex/v1.4.2-beian-footer`
- Commit：`841a769`
- Tag：`v1.4.3`
