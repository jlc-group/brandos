# BrandOS Deploy Script for D:\Server
# Usage: .\deploy\deploy.ps1
# Run from: D:\Server\apps\brandos

param(
    [switch]$SkipBuild,
    [switch]$SkipMigrate
)

$ErrorActionPreference = "Stop"
$AppName = "brandos"
$DeployPath = "D:\Server\deploy\brandos"
$NginxConf = "D:\Server\nginx\conf\sites-enabled\brandos.jlcgroup.co.conf"
$EnvFile = "$DeployPath\.env.production"

Write-Host "=== BrandOS Deploy ===" -ForegroundColor Cyan
Write-Host "Deploy path: $DeployPath"

# 1. Install dependencies
Write-Host "`n[1/5] Installing dependencies..." -ForegroundColor Yellow
pnpm install --frozen-lockfile

# 2. Build
if (-not $SkipBuild) {
    Write-Host "`n[2/5] Building..." -ForegroundColor Yellow
    # Load env for Vite build (VITE_ vars are inlined at build time)
    if (Test-Path $EnvFile) {
        Get-Content $EnvFile | Where-Object { $_ -match "^VITE_" } | ForEach-Object {
            $parts = $_ -split "=", 2
            [System.Environment]::SetEnvironmentVariable($parts[0], $parts[1])
        }
    }
    pnpm run build
} else {
    Write-Host "`n[2/5] Skipping build (--SkipBuild)" -ForegroundColor Gray
}

# 3. Copy to deploy folder
Write-Host "`n[3/5] Copying to deploy folder..." -ForegroundColor Yellow
if (-not (Test-Path $DeployPath)) {
    New-Item -ItemType Directory -Path $DeployPath -Force | Out-Null
}
Copy-Item -Path "dist\*" -Destination $DeployPath -Recurse -Force
Copy-Item -Path "package.json" -Destination $DeployPath -Force
Copy-Item -Path "drizzle" -Destination $DeployPath -Recurse -Force

# 4. Run DB migration
if (-not $SkipMigrate) {
    Write-Host "`n[4/5] Running database migration..." -ForegroundColor Yellow
    Set-Location $DeployPath
    $env:DATABASE_URL = (Get-Content $EnvFile | Where-Object { $_ -match "^DATABASE_URL=" }) -replace "^DATABASE_URL=", ""
    pnpm run db:push
    Set-Location -
} else {
    Write-Host "`n[4/5] Skipping migration (--SkipMigrate)" -ForegroundColor Gray
}

# 5. Copy nginx config
Write-Host "`n[5/5] Updating nginx config..." -ForegroundColor Yellow
Copy-Item -Path "deploy\nginx\brandos.jlcgroup.co.conf" -Destination $NginxConf -Force
Write-Host "  Reloading nginx..."
& "D:\Server\nginx\nginx.exe" -s reload

# 6. Restart PM2
Write-Host "`nRestarting PM2 process..." -ForegroundColor Yellow
$pm2List = pm2 list 2>&1
if ($pm2List -match $AppName) {
    pm2 restart $AppName
} else {
    Write-Host "  Starting new PM2 process..."
    pm2 start "D:\Server\ecosystem.config.js" --only $AppName
}

Write-Host "`n=== Deploy Complete ===" -ForegroundColor Green
Write-Host "BrandOS is running at: https://brandos.jlcgroup.co" -ForegroundColor Green
