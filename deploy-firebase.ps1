# One-Click Firebase Deployment Script for My Career Company
$ErrorActionPreference = "Stop"

$firebaseExe = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Google.FirebaseCLI_Microsoft.Winget.Source_8wekyb3d8bbwe\firebase.exe"
if (-not (Test-Path $firebaseExe)) {
    Write-Host "Firebase CLI not found at $firebaseExe" -ForegroundColor Red
    exit 1
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "    MY CAREER COMPANY — FIREBASE DEPLOYMENT      " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Test authentication
Write-Host "`n[1/3] Checking Firebase authentication status..." -ForegroundColor Yellow
$loginTest = & $firebaseExe projects:list 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "You are not logged in to Firebase yet." -ForegroundColor Red
    Write-Host "Launching Google Firebase authentication in your browser..." -ForegroundColor Yellow
    & $firebaseExe login
}

Write-Host "`n[2/3] Checking Firebase project target..." -ForegroundColor Yellow
if (-not (Test-Path ".firebaserc")) {
    Write-Host "No active Firebase project bound. Let's select or bind your project:" -ForegroundColor Yellow
    & $firebaseExe use --add
}

Write-Host "`n[3/3] Deploying to Firebase Hosting & Firestore..." -ForegroundColor Green
& $firebaseExe deploy --only hosting,firestore

Write-Host "`n Deployment complete! Your site is live on Firebase Hosting." -ForegroundColor Green
