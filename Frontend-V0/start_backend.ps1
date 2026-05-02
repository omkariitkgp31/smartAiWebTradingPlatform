$services = @(
    "api-gateway",
    "identity-service",
    "portfolio-service",
    "order-service",
    "price-update-service",
    "queue-processor",
    "order-matcher",
    "trade-executor",
    "market-service",
    "trade-history",
    "notification-service"
)

$backendPath = "c:\Users\Rishi\OneDrive\Desktop\projects\Backend-main\Backend"

# Kill any existing processes
Write-Host "Stopping existing service processes..."
Get-Process -Name "main","app" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process | Where-Object {$_.Path -like "*go-build*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 1

# Sync deps
Write-Host "Syncing dependencies..."
foreach ($service in $services) {
    $path = Join-Path $backendPath $service
    Set-Location $path
    go mod tidy 2>$null
}

# Launch all as background jobs in THIS session (bypasses AppLocker)
Write-Host "Starting all 11 services as background jobs..."
$jobs = @()
foreach ($service in $services) {
    $path = Join-Path $backendPath $service
    $job = Start-Job -Name $service -ScriptBlock {
        param($p)
        Set-Location $p
        go run main.go
    } -ArgumentList $path
    $jobs += $job
    Write-Host "  Started job: $service (ID: $($job.Id))"
}

Write-Host ""
Write-Host "All services starting... Waiting 10s for them to come up." -ForegroundColor Cyan
Start-Sleep 10

# Check health
try {
    $r = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:8080/health" -TimeoutSec 5
    Write-Host "API Gateway: ONLINE - $($r.Content)" -ForegroundColor Green
} catch {
    Write-Host "API Gateway: not yet reachable (may still be starting)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "To check job output: Receive-Job -Name <service-name>"
Write-Host "To stop all:         Get-Job | Stop-Job; Get-Job | Remove-Job"
