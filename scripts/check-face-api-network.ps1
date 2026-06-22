# Quick checks for "Could not reach ... :8000" (wrong IP, firewall, server not bound to 0.0.0.0).
$ErrorActionPreference = "Continue"
Write-Host "`n=== IPv4 addresses (pick the one on the SAME Wi‑Fi as the phone) ===" -ForegroundColor Cyan
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike "127.*" } |
  Sort-Object InterfaceAlias |
  Select-Object InterfaceAlias, IPAddress, PrefixOrigin |
  Format-Table -AutoSize

Write-Host "`n=== Listen on port 8000 (expect 0.0.0.0:8000 for phone access) ===" -ForegroundColor Cyan
$listen = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if (-not $listen) {
  Write-Host "Nothing listening on port 8000. Start: cd server; python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload" -ForegroundColor Yellow
} else {
  $listen | Select-Object LocalAddress, LocalPort, OwningProcess | Format-Table -AutoSize
}

Write-Host "=== Suggested client/.env lines ===" -ForegroundColor Cyan
$wifi = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.PrefixOrigin -eq "Dhcp" -and $_.IPAddress -notlike "169.254*" -and $_.IPAddress -notlike "172.21.*" }
$best = ($wifi | Select-Object -First 1).IPAddress
if ($best) {
  Write-Host "EXPO_PUBLIC_API_BASE_URL=http://${best}:8000" -ForegroundColor Green
} else {
  Write-Host "EXPO_PUBLIC_API_BASE_URL=http://<run ipconfig, use Wi‑Fi IPv4>:8000" -ForegroundColor Green
}
Write-Host "`nThen: cd client; npx expo start -c   (clears stale EXPO_PUBLIC_* bundle)`n" -ForegroundColor Gray
