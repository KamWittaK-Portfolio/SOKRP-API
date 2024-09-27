@echo off
setlocal enabledelayedexpansion

REM Change directory to your Git repository.
cd /d "C:\Users\wrbel\OneDrive\Desktop\Coding Projects\CMS-API"

git checkout develop

git pull

REM Add all changes.
git add .

REM Commit changes with message 'Auto Push'
git commit -m "Auto Push"

REM Push changes to the remote repository
git push

REM Switch to api/dev branch
git checkout api/dev

REM Merge develop branch into api/dev
git merge develop

REM Push changes to the remote repository
git push

REM Switch back to develop branch.
git checkout develop

timeout /t 10 /nobreak


REM Set the token with proper escaping
set "token=Bearer arA%%U^KG^3gGVU%%RAbgcA92kZriiXj$Lqr$bR@P3u6q6vxcbmWavAbRwyziy^72g5tAseRnFGALae3E9"

REM Make a POST request
curl -X POST "http://45.45.238.249:5000/api/restart" -H "Authorization: !token!

echo Script execution completed.
pause
