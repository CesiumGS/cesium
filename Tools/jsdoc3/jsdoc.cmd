@ECHO OFF

SETLOCAL

REM jsdoc.js expects Unix-style paths without a trailing slash
SET _BASEPATH=%~dp0
SET _BASEPATH=%_BASEPATH:\=/%
SET _BASEPATH=%_BASEPATH:~0,-1%

REM for whatever reason, Rhino requires module paths to be valid URIs
SET _URLPATH=file:/%_BASEPATH%

:ESCAPE_SPACE
SET _TRAILING=%_URLPATH:* =%
CALL SET _URLPATH=%%_URLPATH: %_TRAILING%=%%
SET _URLPATH=%_URLPATH%%%20%_TRAILING%
IF NOT "%_URLPATH%"=="%_URLPATH: =%" GOTO ESCAPE_SPACE

java -classpath "%_BASEPATH%/lib/js.jar" org.mozilla.javascript.tools.shell.Main -modules "%_URLPATH%/node_modules" -modules "%_URLPATH%/rhino_modules" -modules "%_URLPATH%" "%_BASEPATH%/jsdoc.js" %* --dirname="%_BASEPATH%/

REM java -classpath "%_BASEPATH%/lib/js.jar" org.mozilla.javascript.tools.debugger.Main -debug -modules "%_URLPATH%/node_modules/" -modules "%_URLPATH%/rhino_modules/" -modules "%_URLPATH%/" "%_BASEPATH%/jsdoc.js" %* --dirname="%_BASEPATH%/

ENDLOCAL
