@echo off
title Deploy Resume Fit Score to www.mycareercompany.com
echo ========================================================
echo   Deploying Resume Fit Score to www.mycareercompany.com
echo ========================================================
echo.

echo [1/2] Authenticating with Google Firebase CLI...
echo If a browser window does not open automatically, visit the URL shown below.
call firebase.cmd login --reauth

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Trying manual authentication mode...
    call firebase.cmd login --reauth --no-localhost
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Authentication was not completed.
    pause
    exit /b %ERRORLEVEL%
)

echo [2/2] Deploying Hosting & Firestore to my-career-company...
cd ..
call firebase.cmd deploy --only hosting,firestore --project my-career-company
cd career-clinic-resume-checker

echo.
echo ========================================================
echo   SUCCESS! Deployment complete.
echo   Live at: https://www.mycareercompany.com/ResumeFitScore
echo ========================================================
echo.
pause
