$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimePath = Join-Path $projectRoot '.runtime'
New-Item -ItemType Directory -Path $runtimePath -Force | Out-Null
$phpExe = (Get-Command php.exe).Source
$nodeExe = (Get-Command node.exe).Source

function Test-LocalPort([int] $port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try { $client.Connect('127.0.0.1', $port); return $true } catch { return $false } finally { $client.Dispose() }
}

if (-not (Test-LocalPort 3306)) { throw 'Start MySQL in Laragon before running this script (or update this check for your configured port).' }
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'backend\.env'))) { throw 'Configure backend/.env first. See README.md.' }
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'frontend\node_modules\vite\bin\vite.js'))) { throw 'Run npm install in frontend first.' }

if (-not (Test-LocalPort 8000)) {
    $process = Start-Process -FilePath $phpExe -ArgumentList @('-S','127.0.0.1:8000','../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php') -WorkingDirectory (Join-Path $projectRoot 'backend\public') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimePath 'api.stdout.log') -RedirectStandardError (Join-Path $runtimePath 'api.stderr.log') -PassThru
    $process.Id | Set-Content -LiteralPath (Join-Path $runtimePath 'api.pid')
}
if (-not (Test-LocalPort 5173)) {
    $process = Start-Process -FilePath $nodeExe -ArgumentList @('node_modules/vite/bin/vite.js','--host','127.0.0.1') -WorkingDirectory (Join-Path $projectRoot 'frontend') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimePath 'frontend.stdout.log') -RedirectStandardError (Join-Path $runtimePath 'frontend.stderr.log') -PassThru
    $process.Id | Set-Content -LiteralPath (Join-Path $runtimePath 'frontend.pid')
}
$schedulerPidFile = Join-Path $runtimePath 'scheduler.pid'
$schedulerRunning = $false
if (Test-Path -LiteralPath $schedulerPidFile) {
    $schedulerId = [int](Get-Content -LiteralPath $schedulerPidFile)
    $schedulerProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $schedulerId" -ErrorAction SilentlyContinue
    $schedulerRunning = $schedulerProcess -and $schedulerProcess.ExecutablePath -eq $phpExe -and $schedulerProcess.CommandLine -like '*schedule:work*'
}
if (-not $schedulerRunning) {
    $artisanPath = Join-Path $projectRoot 'backend\artisan'
    $process = Start-Process -FilePath $phpExe -ArgumentList @(('"' + $artisanPath + '"'),'schedule:work') -WorkingDirectory (Join-Path $projectRoot 'backend') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimePath 'scheduler.stdout.log') -RedirectStandardError (Join-Path $runtimePath 'scheduler.stderr.log') -PassThru
    $process.Id | Set-Content -LiteralPath $schedulerPidFile
}
Write-Output 'Frontend: http://127.0.0.1:5173'
Write-Output 'API:      http://127.0.0.1:8000'
Write-Output 'The exam expiry scheduler is running. Logs are in .runtime/.'
