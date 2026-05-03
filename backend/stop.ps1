# 关闭后端并移除防火墙规则
$p = (netstat -ano | Select-String ':8000.*LISTENING' -ErrorAction SilentlyContinue).Line.Trim() -split '\s+' | Select-Object -Last 1
if ($p) {
    Stop-Process -Id $p -Force
    Write-Host "[OK] Killed PID $p"
} else {
    Write-Host "[OK] No process on port 8000"
}
Remove-NetFirewallRule -DisplayName "Repair Order System 8000" -ErrorAction SilentlyContinue
Write-Host "[OK] Firewall rule removed"
