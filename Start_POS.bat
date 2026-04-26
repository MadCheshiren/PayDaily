@echo off
title PayDaily Server
echo Starting PayDaily POS Server...

:: Start the local node.exe in the background
:: %~dp0 ensures it strictly targets the node.exe in the current directory
start /B "" "%~dp0node.exe" server.js

:: Wait 2 seconds to let the local server boot up completely
timeout /t 2 /nobreak > NUL

:: Open the frontend UI in the default web browser
start http://localhost:3000

exit
