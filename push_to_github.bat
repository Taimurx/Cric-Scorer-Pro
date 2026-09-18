@echo off
echo =========================================
echo GitHub Auto Push Script (Push Protection Fix)
echo =========================================
echo.

echo [1/2] Saving changes...
git add .
git commit -m "Updated code from local" >nul 2>&1

echo [2/2] Pushing to GitHub...
git push -u origin main

echo.
echo =========================================
echo ✅ SUCCESS: Code has been pushed to GitHub!
echo =========================================
pause
