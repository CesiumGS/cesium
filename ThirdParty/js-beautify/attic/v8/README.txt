Command-line jsbeautify using V8.

This tool requires a working V8 library. V8 is the JavaScript engine for
Google Chrome. It is open-source and available from the official site:
http://code.google.com/p/v8/.

Please follow the instructions on Google V8 wiki page in order to build it.
It is expected that you have it under a sub-directory called lib. Some
important wiki pages are:
http://code.google.com/p/v8/wiki/Source
http://code.google.com/p/v8/wiki/BuildingOnWindows
http://code.google.com/p/v8/wiki/Contributing

Please pay attention to the required tools necessary to build V8 from source,
i.e. Python and scons.

Build steps:

  For 32 Bits:
    svn checkout http://v8.googlecode.com/svn/trunk lib
    cd lib && scons mode=release
    cd ..
    g++ -o jsbeautify jsbeautify.cpp -Ilib/include/ -lv8 -Llib -m32
  
  For 64 Bits:
    svn checkout http://v8.googlecode.com/svn/trunk lib
    cd lib && scons mode=release arch=x64
    cd ..
    g++ -o jsbeautify jsbeautify.cpp -Ilib/include/ -lv8 -Llib -lpthread
  
How to use:

  ./jsbeautify somefile.js

The formatted code is dumped to standard output. You can redirect it to a file.

Note: I tested with V8 version 2.4.9 (revision 5610). If it does not work with
later revision, try to check out exactly this revision (e.g. pass "-r 5610" as
the option when using svn).

