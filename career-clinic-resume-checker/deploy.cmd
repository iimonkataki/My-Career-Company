@echo off
title Deploy Resume Fit Score to www.mycareercompany.com
echo ========================================================
echo   Deploying Resume Fit Score to www.mycareercompany.com
echo ========================================================
echo.

echo [1/2] Authenticating with Google Firebase CLI...
echo.
call firebase.cmd login --reauth
echo.
set /p AUTH_CODE="Enter the authorization code from your browser (or press Enter if already logged in): "
if not "%AUTH_CODE%"=="" (
    call firebase.cmd login %AUTH_CODE%
)

echo.
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
