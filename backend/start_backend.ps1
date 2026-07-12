$backendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sitePackages = Join-Path $backendDir 'venv\\Lib\\site-packages'

if (Test-Path -LiteralPath $sitePackages) {
  $env:PYTHONPATH = "$sitePackages;$backendDir"
} else {
  $env:PYTHONPATH = $backendDir
}

Set-Location $backendDir

python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
