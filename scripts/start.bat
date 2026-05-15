@echo off
title PayDaily Server
echo Starting PayDaily POS Server...

:: Navigate to project root first
cd /d "%~dp0.."

:: Start the local node.exe in the background with server module
start /B "" "%~dp0..\node.exe" server/server.js

:: Wait 2 seconds to let the local server boot up completely
timeout /t 2 /nobreak > NUL

:: Open the frontend UI in the default web browser
start http://localhost:3000

exit
