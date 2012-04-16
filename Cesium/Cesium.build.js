/*global require,process*/

//replace the version of UglifyJS that the r.js optimizer uses with a newer one with far better performance
//adapted from https://github.com/jrburke/r.js/blob/master/build/tests/override/override.js

var uglify = require('../Tools/nodejs-0.6.14/uglify-js'),
    requirejs = require('../Tools/r.js');

//Register the replacement module. Note that for uglifyjs, r.js uses the
//"uglifyjs/index" module name for it. The list of replaceable modules
//can be found in r.js/
requirejs.define('uglifyjs/index', [], function () {
    return uglify;
});

var optimize = process.argv[2];

//Do the build.
requirejs.optimize({
    baseUrl : ".",
    name: "../../ThirdParty/almond.js",
    include: "main",
    out: "../Cesium.js",
    wrap: true,
    optimize: optimize ? "uglify" : "none",
    //Usually requirejs.optimize() runs in "silent mode"
    //when called in this way. Use logLevel to get the
    //normal output out.
    logLevel: 0
}, function () {
    //Do not really care about the build output summary,
    //since the logLevel: 0 will show it anyway in the console.
});