@echo off
rem Spusti CAE English a otevre ho v prohlizeci. Zavrenim tohoto okna aplikaci ukoncite.
cd /d "%~dp0"
call npm.cmd run dev -- --open
pause
