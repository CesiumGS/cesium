@echo off

rem Build script for dojox.mobile

if "%1"=="separate" goto ok
if "%1"=="single" goto ok
echo Usage: build separate^|single [webkit]
echo   separate  Create mobile.js that includes only dojox.mobile
echo   single    Create a single dojo.js layer that includes dojox.mobile
echo   webkit    Enable webkitMobile=true option (Loses PC browser support)
goto end
:ok

rem set optimize=shrinksafe
set optimize=closure
set profile=mobile
set dir=release-mobile-separate
set webkit=
rem set standalone=standaloneScrollable=true
if "%~1"=="single" set profile=mobile-all
if "%~1"=="single" set dir=release-mobile-single
shift
if not "%~1"=="webkit" goto skip1
set webkit=webkitMobile=true
shift
:skip1

cd ..\..\..\util\buildscripts

call build profile=%profile% action=release optimize=%optimize% layerOptimize=%optimize% cssOptimize=comments releaseDir=../../%dir%/ %webkit% %standalone% %~1 %~2 %~3 %~4 %~5 %~6 %~7 %~8 %~9

cd ..\..\dojox\mobile\build

:end
