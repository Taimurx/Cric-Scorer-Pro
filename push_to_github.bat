@echo off
echo =========================================
echo GitHub Auto Push Script (Force Push)
echo =========================================
echo.

echo [1/2] Saving changes...
git add .
git commit -m "Updated code from local"

echo [2/2] Pushing to GitHub (Force)...
git push -f origin main

echo.
echo =========================================
echo If you see an error above, please copy it.
echo Otherwise, SUCCESS!
echo =========================================
pause
