@echo off
set "NODE_DIR=C:\Users\ASUS\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.19.0-win-x64"
if exist "%NODE_DIR%\node.exe" (
    "%NODE_DIR%\node.exe" "%NODE_DIR%\node_modules\firebase-tools\lib\bin\firebase.js" %*
) else (
    "firebase" %*
)
