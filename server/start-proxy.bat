@echo off
echo ========================================
echo  ChainAbuse Proxy Server
echo ========================================
echo.
echo Installing dependencies...
call npm install
echo.
echo Starting proxy server...
echo Server will run on http://localhost:3001
echo.
call npm start
