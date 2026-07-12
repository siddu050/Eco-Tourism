$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $repoRoot 'frontend')

npm.cmd run dev
