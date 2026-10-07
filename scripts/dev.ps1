#!/usr/bin/env pwsh
#
# scripts/dev.ps1 — start the whole stack with one command (Windows / PowerShell).
#
# Mirrors scripts/dev.sh: runs the C# API (http://localhost:5100) and the Angular
# dev server (http://localhost:4200) together, and stops both on Ctrl+C or exit.
#
# Usage:  ./scripts/dev.ps1   (from the repository root, or any subfolder)

$ErrorActionPreference = "Stop"

$repoRoot  = Split-Path -Parent $PSScriptRoot
$apiProject = Join-Path $repoRoot "src/backend/AppointmentScheduler.Api"
$webDir     = Join-Path $repoRoot "src/frontend"
$apiPort    = 5100
$webPort    = 4200

# 1. Node version -----------------------------------------------------------------------------
# .nvmrc pins Node 22. nvm-windows is optional: without it, whatever `node` is on PATH is used.
$nvmrcVersion = (Get-Content (Join-Path $repoRoot ".nvmrc") -Raw).Trim()
if (Get-Command nvm -ErrorAction SilentlyContinue) {
    try { nvm use $nvmrcVersion | Out-Null } catch { }
}
$nodeVersion = (node --version) 2>$null
Write-Host "node: $nodeVersion"
if ($nodeVersion -and -not $nodeVersion.StartsWith("v$nvmrcVersion")) {
    Write-Warning "Expected Node v$nvmrcVersion (see .nvmrc), found $nodeVersion. If 'ng serve' fails, switch versions and retry."
}

# 2. Frontend dependencies ---------------------------------------------------------------------
if (-not (Test-Path (Join-Path $webDir "node_modules"))) {
    Write-Host "Installing frontend dependencies (first run only)..."
    Push-Location $webDir
    try { npm install } finally { Pop-Location }
}

# 3. Start both halves, output streaming to this console --------------------------------------
Write-Host "Starting the API on http://localhost:$apiPort ..."
$apiProc = Start-Process -FilePath "dotnet" `
    -ArgumentList @("run", "--project", $apiProject) `
    -NoNewWindow -PassThru

Write-Host "Starting the web app on http://localhost:$webPort ..."
$webProc = Start-Process -FilePath "cmd.exe" `
    -ArgumentList @("/c", "npm start") `
    -WorkingDirectory $webDir -NoNewWindow -PassThru

# 4. Stop both again, whatever happened --------------------------------------------------------
function Stop-DevStack {
    Write-Host "`nShutting down the API and the dev server..."
    foreach ($proc in @($apiProc, $webProc)) {
        if ($proc -and -not $proc.HasExited) {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
    }
    # Last resort: npm/dotnet spawn child processes that don't always die with their parent
    # on Windows. Anything still listening on a dev port is stopped by port instead.
    foreach ($port in @($apiPort, $webPort)) {
        Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique |
            ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
    }
}

try {
    Wait-Process -Id $webProc.Id
}
finally {
    Stop-DevStack
}