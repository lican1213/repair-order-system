# Start backend in background (no terminal hang)
$dir = "E:\claude code project 1\repair-order-system\backend"
$logFile = "$dir\server.log"

# Kill old process
$line = netstat -ano 2>$null | Select-String ":8000.*LISTENING"
if ($line) {
    $pidStr = ($line.ToString().Trim() -split "\s+")[-1]
    Stop-Process -Id $pidStr -Force -ErrorAction SilentlyContinue
    Write-Host "[OK] Killed PID $pidStr"
}

# Firewall
New-NetFirewallRule -DisplayName "Repair Order System 8000" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow -ErrorAction SilentlyContinue | Out-Null

# Start server in background
$pythonExe = "$dir\.venv\Scripts\python.exe"
$proc = Start-Process -FilePath $pythonExe `
    -ArgumentList @("-m","uvicorn","app.main:app","--host","0.0.0.0","--port","8000") `
    -WorkingDirectory $dir `
    -WindowStyle Hidden `
    -PassThru

Write-Host "[OK] Server started (PID $($proc.Id))"
Write-Host "[OK] Log: $logFile"

# Health check
Start-Sleep -Seconds 3
try {
    $r = Invoke-WebRequest -Uri http://localhost:8000/api/health -UseBasicParsing
    Write-Host "[OK] Health: $($r.Content)"
} catch {
    Write-Host "[WARN] Health check failed - server might need a few more seconds"
}

Write-Host ""
Write-Host "Phone URLs:"
Write-Host "  Repair: http://192.168.5.15:8000/repair"
Write-Host "  Admin:  http://192.168.5.15:8000/admin"
