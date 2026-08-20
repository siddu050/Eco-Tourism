$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $repoRoot 'backend'

$venvPython = Join-Path $backendDir '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $venvPython)) {
  $venvPython = Join-Path $backendDir 'venv\Scripts\python.exe'
}
if (-not (Test-Path -LiteralPath $venvPython)) {
  $venvPython = 'python'
}

Set-Location $backendDir

& $venvPython -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

