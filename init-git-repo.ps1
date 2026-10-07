# Initialize local Git repository and create initial commit for GitHub
$gitExe = Join-Path $env:LOCALAPPDATA "Programs\Git\cmd\git.exe"
if (-not (Test-Path $gitExe)) {
    $gitCmd = Get-Command "git" -ErrorAction SilentlyContinue
    if ($gitCmd) {
        $gitExe = $gitCmd.Source
    } else {
        Write-Host "Git not found. Run .\setup-git.ps1 first." -ForegroundColor Red
        exit 1
    }
}

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   MY CAREER COMPANY — GITHUB REPO INIT     " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Init git repository
if (-not (Test-Path ".git")) {
    Write-Host "`n[1/4] Initializing Git repository..." -ForegroundColor Yellow
    & $gitExe init -b main
} else {
    Write-Host "`n[1/4] Git repository already initialized." -ForegroundColor Green
}

# 2. Check user configuration
$userName = & $gitExe config user.name
$userEmail = & $gitExe config user.email

if (-not $userName) {
    & $gitExe config user.name "My Career Company"
    Write-Host "[2/4] Set default git user.name: 'My Career Company'" -ForegroundColor Yellow
}
if (-not $userEmail) {
    & $gitExe config user.email "support@mycareercompany.com"
    Write-Host "[2/4] Set default git user.email: 'support@mycareercompany.com'" -ForegroundColor Yellow
}

# 3. Stage all files
Write-Host "`n[3/4] Staging files for commit..." -ForegroundColor Yellow
& $gitExe add .

# 4. Commit
Write-Host "`n[4/4] Creating initial release commit..." -ForegroundColor Yellow
& $gitExe commit -m "feat: initial release of My Career Company multi-page platform with Firebase integration"

Write-Host "`n=============================================" -ForegroundColor Green
Write-Host " Repository Ready for GitHub!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host "`nTo push to your GitHub account:" -ForegroundColor Cyan
Write-Host "1. Create a new repository on https://github.com/new (e.g. 'mycareercompany')" -ForegroundColor White
Write-Host "2. Run:" -ForegroundColor White
Write-Host "   git remote add origin https://github.com/<YOUR-USERNAME>/mycareercompany.git" -ForegroundColor Yellow
Write-Host "   git push -u origin main" -ForegroundColor Yellow
