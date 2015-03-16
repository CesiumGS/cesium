/*global env, java */
/**
 * Helper functions to enable JSDoc to run on multiple JavaScript runtimes.
 *
 * @module jsdoc/util/runtime
 * @private
 */
'use strict';

var os = require('os');

// These strings represent directory names; do not modify them!
/** @private */
var RHINO = exports.RHINO = 'rhino';
/** @private */
var NODE = exports.NODE = 'node';

/**
 * The JavaScript runtime that is executing JSDoc:
 *
 * + `module:jsdoc/util/runtime~RHINO`: Mozilla Rhino.
 * + `module:jsdoc/util/runtime~NODE`: Node.js.
 *
 * @private
 */
var runtime = (function() {
    if (global.Packages && typeof global.Packages === 'object' &&
        Object.prototype.toString.call(global.Packages) === '[object JavaPackage]') {
        return RHINO;
    } else if (require && require.main && module) {
        return NODE;
    } else {
        // unknown runtime
        throw new Error('Unable to identify the current JavaScript runtime.');
    }
})();

/**
 * Check whether Mozilla Rhino is running JSDoc.
 * @return {boolean} Set to `true` if the current runtime is Mozilla Rhino.
 */
exports.isRhino = function() {
    return runtime === RHINO;
};

/**
 * Check whether Node.js is running JSDoc.
 * @return {boolean} Set to `true` if the current runtime is Node.js.
 */
exports.isNode = function() {
    return runtime === NODE;
};

function initializeRhino(args) {
    // the JSDoc dirname is the main module URI, minus the filename, converted to a path
    var uriParts = require.main.uri.split('/');
    uriParts.pop();

    env.dirname = String( new java.io.File(new java.net.URI(uriParts.join('/'))) );
    env.pwd = String( java.lang.System.getenv().get('PWD') );
    env.args = args;

    require(env.dirname + '/rhino/rhino-shim.js');
}

function initializeNode(args) {
    var fs = require('fs');
    var path = require('path');

    var jsdocPath = args[0];
    var pwd = args[1];

    // resolve the path if it's a symlink
    if ( fs.statSync(jsdocPath).isSymbolicLink() ) {
        jsdocPath = path.resolve( path.dirname(jsdocPath), fs.readlinkSync(jsdocPath) );
    }

    env.dirname = jsdocPath;
    env.pwd = pwd;
    env.args = process.argv.slice(2);
}

exports.initialize = function(args) {
    switch(runtime) {
        case RHINO:
            initializeRhino(args);
            break;
        case NODE:
            initializeNode(args);
            break;
        default:
            throw new Error('Cannot initialize the unknown JavaScript runtime "' + runtime + '"!');
    }
};

/**
 * Retrieve the identifier for the current JavaScript runtime.
 *
 * @private
 * @return {string} The runtime identifier.
 */
exports.getRuntime = function() {
    return runtime;
};

/**
 * Get the require path for the runtime-specific implementation of a module.
 *
 * @param {string} partialPath - The partial path to the module. Use the same format as when calling
 * `require()`.
 * @return {object} The require path for the runtime-specific implementation of the module.
 */
exports.getModulePath = function(partialPath) {
    var path = require('path');

    return path.join(env.dirname, runtime, partialPath);
};
