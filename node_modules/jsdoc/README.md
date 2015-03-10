JSDoc 3
=======
[![Build Status](https://img.shields.io/travis/jsdoc3/jsdoc.svg)](http://travis-ci.org/jsdoc3/jsdoc)

An API documentation generator for JavaScript.

Want to contribute to JSDoc? Please read `CONTRIBUTING.md`.

Installation and Usage
----------------------

You can run JSDoc on either Node.js or Mozilla Rhino.

### Node.js

Native support for Node.js is available in JSDoc 3.3.0 and later. JSDoc
supports Node.js 0.10 and later.

#### Installing JSDoc for Node.js

You can install JSDoc in your project's `node_modules` folder, or you can
install it globally.

To install the latest alpha version:

    npm install jsdoc@"<=3.3.0"

To install the latest development version:

    npm install git+https://github.com/jsdoc3/jsdoc.git

**Note**: If you install JSDoc globally, do not use `sudo npm install`. This may
prevent you from running JSDoc as a normal user. If you cannot install global
packages without `sudo`, please
[fix your npm directory permissions](http://howtonode.org/introduction-to-npm).

#### Running JSDoc with Node.js

If you installed JSDoc locally, the JSDoc command-line tool is available in
`./node_modules/.bin`. To generate documentation for the file
`yourJavaScriptFile.js`:

    ./node_modules/.bin/jsdoc yourJavaScriptFile.js

Or if you installed JSDoc globally, simply run the `jsdoc` command:

    jsdoc yourJavaScriptFile.js

By default, the generated documentation is saved in a directory named `out`. You
can use the `--destination` (`-d`) option to specify another directory.

Run `jsdoc --help` for a complete list of command-line options.

### Mozilla Rhino

All versions of JSDoc 3 run on a customized version of Mozilla Rhino, which
requires Java. You can run JSDoc 3 on Java 1.6 and later.

#### Installing JSDoc for Mozilla Rhino

To install JSDoc, download a .zip file for the
[latest development version](https://github.com/jsdoc3/jsdoc/archive/master.zip)
or a [previous release](https://github.com/jsdoc3/jsdoc/tags).

You can also use git to clone the
[JSDoc repository](https://github.com/jsdoc3/jsdoc):

    git clone git+https://github.com/jsdoc3/jsdoc.git

The JSDoc repository includes a
[customized version of Mozilla Rhino](https://github.com/jsdoc3/rhino). Make
sure your Java classpath does not include any other versions of Rhino. (On OS X,
you may need to remove the file `~/Library/Java/Extensions/js.jar`.)

**Note**: In JSDoc 3.3.0 and later, if you need to run JSDoc on Mozilla Rhino,
do not install JSDoc with npm. Use one of the methods described above.

#### Running JSDoc with Mozilla Rhino

On OS X, Linux, and other POSIX systems, to generate documentation for the file
`yourJavaScriptFile.js`:

    ./jsdoc yourJavaScriptFile.js

Or on Windows:

    jsdoc yourJavaScriptFile.js

By default, the generated documentation is saved in a directory named `out`. You
can use the `--destination` (`-d`) option to specify another directory.

Run `jsdoc --help` for a complete list of command-line options.


Templates and Build Tools
-------------------------

The JSDoc community has created numerous templates and other tools to help you
generate and customize your documentation. Here are just a few:

### Templates

+ [jaguarjs-jsdoc](https://github.com/davidshimjs/jaguarjs-jsdoc)
  ([example](http://davidshimjs.github.io/jaguarjs/doc))
+ [DocStrap](https://github.com/terryweiss/docstrap)
+ [jsdoc3Template](https://github.com/DBCDK/jsdoc3Template)
  ([example](https://github.com/danyg/jsdoc3Template/wiki#wiki-screenshots))

### Build Tools

+ [JSDoc Grunt plugin](https://github.com/krampstudio/grunt-jsdoc)
+ [JSDoc ant task](https://github.com/jannon/jsdoc3-ant-task)


For More Information
--------------------

+ Documentation is available at [Use JSDoc](http://usejsdoc.org).
+ Contribute to the docs at [jsdoc3/jsdoc3.github.com](https://github.com/jsdoc3/jsdoc3.github.com).
+ ~~Post questions to the [JSDoc Users mailing list](http://groups.google.com/group/jsdoc-users).~~
(temporarily unavailable)
+ Post questions tagged `jsdoc` to [Stack
Overflow](http://stackoverflow.com/questions/tagged/jsdoc).

License
-------

JSDoc 3 is copyright (c) 2011-2014 Michael Mathews <micmath@gmail.com> and the
[contributors to JSDoc](https://github.com/jsdoc3/jsdoc/graphs/contributors).

JSDoc 3 is free software, licensed under the Apache License, Version 2.0. See
the file `LICENSE.md` in this distribution for more details.
