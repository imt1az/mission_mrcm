$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimePath = Join-Path $projectRoot '.runtime'
foreach ($service in @('api','frontend','scheduler')) {
    $pidFile = Join-Path $runtimePath ($service + '.pid')
    if (-not (Test-Path -LiteralPath $pidFile)) { continue }
    $serviceId = [int](Get-Content -LiteralPath $pidFile)
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $serviceId" -ErrorAction SilentlyContinue
    if (-not $process) { continue }
    $expected = switch ($service) {
        'api' { $process.Name -eq 'php.exe' -and $process.CommandLine -like '*127.0.0.1:8000*' -and $process.CommandLine -like '*Foundation/resources/server.php*' }
        'frontend' { $process.Name -eq 'node.exe' -and $process.CommandLine -like '*node_modules/vite/bin/vite.js*' -and $process.CommandLine -like '*127.0.0.1*' }
        'scheduler' { $process.Name -eq 'php.exe' -and $process.CommandLine.Contains($projectRoot) -and $process.CommandLine -like '*schedule:work*' }
    }
    if ($expected) { Stop-Process -Id $serviceId; Write-Output "Stopped $service." }
    else { Write-Output "Skipped $service because its process identity no longer matches." }
}
