# 部署运行手册

适用版本：v1.1 交付前部署准备。

## 1. 部署边界

- 域名 DNS A 记录指向服务器公网 IP。
- 服务器安全组/防火墙只开放 `22`、`80`、`443`。
- Caddy 监听公网 `80/443`，负责 HTTPS 证书和反向代理。
- FastAPI 由 systemd 管理，只监听 `127.0.0.1:8000`。
- 不直接开放 `8000` 到公网。

## 2. Caddy HTTPS

示例 Caddyfile：

```caddyfile
your-domain.com {
    encode gzip
    reverse_proxy 127.0.0.1:8000
}
```

确认项：

- `your-domain.com` 替换为真实域名。
- DNS A 记录已指向服务器 IP。
- Caddy 服务正常运行并可监听 `80/443`。
- 公网只访问域名，不访问 `http://server-ip:8000`。

## 3. FastAPI systemd

示例 unit：

```ini
[Unit]
Description=Repair Order System
After=network.target

[Service]
WorkingDirectory=/home/youruser/repair-order-system/backend
EnvironmentFile=/home/youruser/repair-order-system/backend/.env
ExecStart=/home/youruser/repair-order-system/backend/.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

确认项：

- `ExecStart` 中必须是 `--host 127.0.0.1 --port 8000`。
- 不使用 `--host 0.0.0.0` 暴露 FastAPI 到公网。
- Caddy 反代目标是 `127.0.0.1:8000`。

## 4. 生产环境 .env 配置

在服务器上编辑 `backend/.env`：

```bash
# 必填
SECRET_KEY=<用 python -c "import secrets; print(secrets.token_urlsafe(32))" 生成>
ADMIN_PASSWORD=<强密码>
SHOP_NAME=你的店铺名称
SHOP_PHONE=你的联系电话

# 当前正式部署版不启用地图定位或逆地理编码。
# 地址由客户填写小区和详细地址，师傅上门前电话确认。
```

**安全提醒：**
- `.env` 文件不得提交到 Git（已在 `.gitignore` 排除）。
- 不需要配置高德、百度、腾讯等地图 Key。

## 5. 自动备份 cron

项目已有 `scripts/backup.py`，会同时备份：

- `backend/data/repair.db`
- `backend/uploads/`

备份输出到项目根目录 `backups/`，该目录已加入 `.gitignore`。

部署前先手动运行一次：

```bash
cd /home/youruser/repair-order-system
mkdir -p logs backups
/home/youruser/repair-order-system/backend/.venv/bin/python scripts/backup.py
```

cron 示例：

```cron
0 3 * * * cd /home/youruser/repair-order-system && /home/youruser/repair-order-system/backend/.venv/bin/python scripts/backup.py >> logs/backup.log 2>&1
```

说明：

- 每天 03:00 备份一次 `repair.db` 和 `uploads/`。
- `backup.py` 默认保留最近 7 份备份；每天执行时相当于保留最近约 7 天。
- 如需调整保留数量，使用 `scripts/backup.py --keep N`。
- 定期将 `backups/` 下载到本地电脑或网盘，避免服务器磁盘故障导致备份一并丢失。

## 6. 部署前 smoke test

在服务器上确认：

```bash
curl http://127.0.0.1:8000/api/health
curl https://your-domain.com/api/health
```

预期返回：

```json
{"status":"ok"}
```
