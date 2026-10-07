# Automated Git installer for Windows (Portable MinGit - No Admin Rights Required)
$ErrorActionPreference = "Stop"

$tempZip = Join-Path $env:TEMP "mingit.zip"
$installDir = Join-Path $env:LOCALAPPDATA "Programs\Git"
$url = "https://github.com/git-for-windows/git/releases/download/v2.48.1.windows.1/MinGit-2.48.1-64-bit.zip"

Write-Host "[1/3] Downloading portable Git..." -ForegroundColor Cyan
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$client = New-Object System.Net.WebClient
$client.DownloadFile($url, $tempZip)

Write-Host "[2/3] Extracting Git binaries..." -ForegroundColor Cyan
if (-not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
}
Expand-Archive -Path $tempZip -DestinationPath $installDir -Force
Remove-Item $tempZip -Force

$gitExe = Join-Path $installDir "cmd\git.exe"
$gitCmdDir = Join-Path $installDir "cmd"

Write-Host "[3/3] Registering Git in User Environment..." -ForegroundColor Cyan
$currentPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*$gitCmdDir*") {
    [System.Environment]::SetEnvironmentVariable("Path", "$currentPath;$gitCmdDir", "User")
    Write-Host "Added to User PATH." -ForegroundColor Green
}

Write-Host "`nGit Installation Complete:" -ForegroundColor Green
& $gitExe --version
