JSDoc 3
=======

An inline API documentation processor for JavaScript. JSDoc 3 is intended to be
an upgrade to JsDoc Toolkit (JSDoc 2).

Notice
------

This is *beta software*! It is available for testing purposes and may not be 
suitable for production use yet.

Installation
------------

Download a copy of JSDoc 3 from the official Git Hub repository here:
<https://github.com/jsdoc3/jsdoc>

To test that jsdoc is working, change your working directory to the jsdoc folder
and run the following command:

	java -cp lib/js.jar org.mozilla.javascript.tools.shell.Main \
	-modules node_modules -modules rhino_modules \
	jsdoc.js -T
	
If you are operating on a Mac OSX or *nix platform, you can shorten that command
to this:

    ./jsdoc -T

Usage
-----

This example assumes that your working directory is the jsdoc application base
directory:

    ./jsdoc yourSourceCodeFile.js

For help regarding the supported commandline options use the --help option.

	./jsdoc --help

Generated documentation will appear in the folder specified by the --destination
option, or in a folder named "out" by default.

Dependencies
------------

JSDoc 3 utilises the Mozilla Rhino engine, which requires Java. JSDoc 3 is known
to work with version 1.6.0_24 of Java.

JSDoc 3 uses advanced features in the Rhino application which are only
available in or after the 1.7 release 3. A copy of this version of Rhino is
included in JSDoc so this is not normally an issue that the user needs to be
concerned with. However, in rare cases, users may have their Java CLASSPATH
configured to override that included Rhino and point to some older version of
Rhino instead. If this is the case, simply correct the CLASSPATH to remove the
older Rhino.

The version of rhino distributed with JSDoc3 can be found here:  https://github.com/jannon/rhino

Debugging
---------

Rhino is not always very friendly when it comes to reporting errors in
JavaScript. Luckily it comes with a full-on debugger included that can be much
more useful than a simple stack trace. To invoke JSDoc with the debugger try the
following command:

    $ java -classpath lib/js.jar \
    org.mozilla.javascript.tools.debugger.Main -debug \
    -modules node_modules -modules rhino_modules \
    jsdoc.js \
    your/script.js

This will open a debugging window. Choose "Break on Exceptions" from the "Debug"
menu, then press the "Run" button. If there is an error, you should see exactly
where it is in the source code.

See Also
--------

Project Documentation: <http://usejsdoc.org/> (under development)  
Project Documentation Source: <https://github.com/micmath/micmath.github.com>  
JSDoc User's Group: <http://groups.google.com/group/jsdoc-users>  
JSDoc3 Ant Task <https://github.com/jannon/jsdoc3-ant-task>  
Project Annoncements: <http://twitter.com/jsdoc3>

License
-------

JSDoc 3 is copyright (c) 2011 Michael Mathews <micmath@gmail.com>

See file "LICENSE.md" in this distribution for more details about
terms of use.