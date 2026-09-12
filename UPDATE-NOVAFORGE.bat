@echo off
setlocal
title Novaforge auto update
echo.
echo === Novaforge auto update ===
echo This will download your GitHub repo, replace desk files, commit, push.
echo Vercel will redeploy by itself after push.
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo ERROR: Git is not installed.
  echo Install from https://git-scm.com/download/win
  pause
  exit /b 1
)

set REPO=https://github.com/davekavan888/New-project.git
set DIR=%TEMP%\novaforge-auto-%RANDOM%

echo Cloning repo...
git clone "%REPO%" "%DIR%"
if errorlevel 1 (
  echo.
  echo Clone failed. Login may be required.
  echo Try: gh auth login
  echo Or use GitHub Desktop once, then run this again.
  pause
  exit /b 1
)

cd /d "%DIR%"

echo Copying new files...
copy /Y "%~dp0files\index.html" "index.html" >nul
mkdir src\pages 2>nul
copy /Y "%~dp0files\src\main.tsx" "src\main.tsx" >nul
copy /Y "%~dp0files\src\App.tsx" "src\App.tsx" >nul
copy /Y "%~dp0files\src\index.css" "src\index.css" >nul
copy /Y "%~dp0files\src\pages\ExtraPages.tsx" "src\pages\ExtraPages.tsx" >nul

echo Committing...
git add index.html src/main.tsx src/App.tsx src/index.css src/pages/ExtraPages.tsx
git commit -m "force: light desk + locks + report card"
if errorlevel 1 (
  echo Nothing to commit or commit failed.
)

echo Pushing to GitHub...
git push origin HEAD
if errorlevel 1 (
  echo.
  echo Push failed. You need permission to the repo.
  echo Options:
  echo  1. GitHub Desktop: open New-project, paste files, push
  echo  2. Run: gh auth login
  pause
  exit /b 1
)

echo.
echo SUCCESS. Wait 1-2 min for Vercel, then open https://novaforges.in
echo Press Ctrl+Shift+R on the site.
echo.
pause
