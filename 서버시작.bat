@echo off
echo Worldwide Easy View 서버를 시작합니다...
echo.
cd /d "%~dp0backend"
python -m uvicorn main:app --reload --port 5000
pause
