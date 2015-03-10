/*global env: true */
/**
 * Extended version of the standard `path` module.
 * @module jsdoc/path
 */
'use strict';

var fs = require('fs');
var path = require('path');
var runtime = require('jsdoc/util/runtime');

function prefixReducer(previousPath, current) {
    var currentPath = [];

    // if previousPath is defined, but has zero length, there's no common prefix; move along
    if (previousPath && !previousPath.length) {
        return currentPath;
    }

    currentPath = path.resolve(global.env.pwd, current).split(path.sep) || [];

    if (previousPath && currentPath.length) {
        // remove chunks that exceed the previous path's length
        currentPath = currentPath.slice(0, previousPath.length);

        // if a chunk doesn't match the previous path, remove everything from that chunk on
        for (var i = 0, l = currentPath.length; i < l; i++) {
            if (currentPath[i] !== previousPath[i]) {
                currentPath.splice(i, currentPath.length - i);
                break;
            }
        }
    }

    return currentPath;
}

/**
 * Find the common prefix for an array of paths. If there is a common prefix, a trailing separator
 * is appended to the prefix. Relative paths are resolved relative to the current working directory.
 *
 * For example, assuming that the current working directory is `/Users/jsdoc`:
 *
 * + For the single path `foo/bar/baz/qux.js`, the common prefix is `foo/bar/baz/`.
 * + For paths `foo/bar/baz/qux.js`, `foo/bar/baz/quux.js`, and `foo/bar/baz.js`, the common prefix
 * is `/Users/jsdoc/foo/bar/`.
 * + For paths `../jsdoc/foo/bar/baz/qux/quux/test.js`, `/Users/jsdoc/foo/bar/bazzy.js`, and
 * `../../Users/jsdoc/foo/bar/foobar.js`, the common prefix is `/Users/jsdoc/foo/bar/`.
 * + For paths `foo/bar/baz/qux.js` and `../../Library/foo/bar/baz.js`, there is no common prefix,
 * and an empty string is returned.
 *
 * @param {Array.<string>} paths - The paths to search for a common prefix.
 * @return {string} The common prefix, or an empty string if there is no common prefix.
 */
exports.commonPrefix = function(paths) {
    var segments;

    var prefix = '';

    paths = paths || [];

    // if there's only one path, its resolved dirname (plus a trailing slash) is the common prefix
    if (paths.length === 1) {
        prefix = path.resolve(global.env.pwd, paths[0]);
        if ( path.extname(prefix) ) {
            prefix = path.dirname(prefix);
        }

        prefix += path.sep;
    }
    else {
        segments = paths.reduce(prefixReducer, undefined) || [];

        // if there's anything left (other than a placeholder for a leading slash), add a
        // placeholder for a trailing slash
        if ( segments.length && (segments.length > 1 || segments[0] !== '') ) {
            segments.push('');
        }

        prefix = segments.join(path.sep);
    }

    return prefix;
};

/**
 * Retrieve the fully qualified path to the requested resource.
 *
 * If the resource path is specified as a relative path, JSDoc searches for the path in the
 * directory where the JSDoc configuration file is located, then in the current working directory,
 * and finally in the JSDoc directory.
 *
 * If the resource path is specified as a fully qualified path, JSDoc uses the path as-is.
 *
 * @param {string} filepath - The path to the requested resource. May be an absolute path; a path
 * relative to the JSDoc directory; or a path relative to the current working directory.
 * @param {string} [filename] - The filename of the requested resource.
 * @return {string} The fully qualified path (or, on Rhino, a URI) to the requested resource.
 * Includes the filename if one was provided.
 */
exports.getResourcePath = function(filepath, filename) {
    var result = null;

    function pathExists(_path) {
        try {
            fs.readdirSync(_path);
        }
        catch(e) {
            return false;
        }

        return true;
    }

    // absolute paths are normalized by path.resolve on the first pass
    [path.dirname(global.env.opts.configure || ''), env.pwd, env.dirname].forEach(function(_path) {
        if (!result && _path) {
            _path = path.resolve(_path, filepath);
            if ( pathExists(_path) ) {
                result = _path;
            }
        }
    });

    if (result) {
        result = filename ? path.join(result, filename) : result;
    }

    return result;
};

Object.keys(path).forEach(function(member) {
    exports[member] = path[member];
});
