@echo off
echo Shutting down PayDaily POS Server...

:: Force kill the specific node.exe process running the server
taskkill /F /IM node.exe /T

echo Server stopped successfully.
timeout /t 2 > NUL
exit
