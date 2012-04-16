A small qtscript project to invoke jsbeautify.js from the command line.

An alternative to the rhino version.

Requirement
-----------

Qt 4.6 is later is needed to build.

For OpenSUSE, install it using 'sudo zypper in libqt4-devel'.
For Ubuntu/Debian, install it using 'sudo apt-get install libqt4-dev'.

For other distributions and/or operating systems, download the binary for free
from http://qt.nokia.com/downloads.

Build
-----

qmake && make

(On some Ubuntu/Debian, change qmake to qmake-qt4).

Use
---

    jsbeautify source-file

The content of source-file will be read, beautified, and printed to the console.
