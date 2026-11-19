@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Blue Danube Promenade: lokalni server na http://localhost:8000/
echo Zatvorite ovaj prozor da biste zaustavili server.
start "" http://localhost:8000/
where python >nul 2>nul && (python -m http.server 8000) || (py -m http.server 8000)
pause
