@echo off
title Deploy Resume Fit Score to www.mycareercompany.com
echo ========================================================
echo   Deploying Resume Fit Score to www.mycareercompany.com
echo ========================================================
echo.

echo [1/2] Checking Firebase CLI authentication...
call firebase.cmd login:list | findstr /i "@" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Already authenticated with Firebase CLI.
) else (
    echo [!] Session not found or expired.
    echo Opening browser to log in...
    call firebase.cmd login
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ========================================================
        echo [TIP] If the browser did not open automatically, run:
        echo       firebase login --no-localhost
        echo in your terminal, open the link, and paste the code.
        echo ========================================================
        echo.
        pause
        exit /b %ERRORLEVEL%
    )
)

echo.
echo [2/2] Deploying Hosting, Firestore & Storage to my-career-company...
cd ..
call firebase.cmd deploy --only hosting,firestore,storage --project my-career-company
cd career-clinic-resume-checker

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================================
    echo [ERROR] Deployment did not succeed.
    echo If credentials expired, run:
    echo   firebase login --no-localhost
    echo and then run deploy.cmd again.
    echo ========================================================
    echo.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================================
echo   SUCCESS! Deployment complete.
echo   Live at: https://www.mycareercompany.com/ResumeFitScore
echo ========================================================
echo.
pause
