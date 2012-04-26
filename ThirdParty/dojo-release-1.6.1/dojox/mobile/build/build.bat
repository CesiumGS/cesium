@echo off

rem Build script for dojox.mobile
rem 
rem Note:
rem You may need to manually apply the following patch to your build script
rem in order to completely remove all the unused modules from your build.
rem The patch disables finding the dojo base modules being used from the
rem dependent modules with a simple pattern matching, which sometimes
rem unexpectedly picks up unused modules.
rem For example, if you see query.js and NodeList.js baked into your build,
rem while you are not using them, then it is worth trying the patch.
rem The file to be patched is util/buildscripts/jslib/buildUtil.js.
rem 
rem --- buildUtil.js-orig
rem +++ buildUtil.js
rem @@ -1506,7 +1506,7 @@
rem    var addedResources = {};
rem -  while((matches = buildUtil.baseMappingRegExp.exec(tempContents))){
rem +  while(false&&(matches = buildUtil.baseMappingRegExp.exec(tempContents))){
rem        var baseResource = buildUtil.baseMappings[matches[1]];
rem        //Make sure we do not add the dependency to its source resource.

if "%1"=="separate" goto ok
if "%1"=="single" goto ok
echo Usage: build separate^|single [webkit]
echo   separate  Create mobile.js that includes only dojox.mobile
echo   single    Create a single dojo.js layer that includes dojox.mobile
echo   webkit    Enable webkitMobile=true option (Loses PC browser support)
goto end
:ok

set optimize=shrinksafe
set profile=mobile
set dir=release-mobile-separate
set webkit=
if "%1"=="single" set profile=mobile-all
if "%1"=="single" set dir=release-mobile-single
if "%2"=="webkit" set webkit=webkitMobile=true

cd ..\..\..\util\buildscripts

call build profile=%profile% action=release customDijitBase=true optimize=%optimize% layerOptimize=%optimize% cssOptimize=comments releaseDir=../../%dir%/ %webkit%

cd ..\..\dojox\mobile\build

:end
