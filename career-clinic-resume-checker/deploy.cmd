@echo off
title Deploy Resume Fit Score to www.mycareercompany.com
echo ========================================================
echo   Deploying Resume Fit Score to www.mycareercompany.com
echo ========================================================
echo.

echo [1/2] Authenticating with Google Firebase CLI...
echo A browser window will open if your session has expired.
call firebase.cmd login --reauth

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Authentication was not completed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Deploying Hosting to my-career-company...
cd ..
call firebase.cmd deploy --only hosting --project my-career-company
cd career-clinic-resume-checker

echo.
echo ========================================================
echo   SUCCESS! Deployment complete.
echo   Live at: https://www.mycareercompany.com/ResumeFitScore
echo ========================================================
echo.
pause
