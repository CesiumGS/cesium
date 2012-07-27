/**
 * @fileOverview
 *
 * Grauw Uri utilities
 *
 * See: http://hg.grauw.nl/grauw-lib/file/tip/src/uri.js
 *
 * @author Laurens Holst (http://www.grauw.nl/)
 *
 *   Copyright 2012 Laurens Holst
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 *   Modifications made by Cesium to fit into our build system as well as fix warnings.
 */
/*global define*/
define(function() {
    "use strict";
    /*global unescape*/

    // Regular expression from RFC 3986 appendix B
    var parseRegex = new RegExp('^(?:([^:/?#]+):)?(?://([^/?#]*))?([^?#]*)(?:\\?([^#]*))?(?:#(.*))?$');

    var caseRegex = /%[0-9a-z]{2}/gi;
    var percentRegex = /[a-zA-Z0-9\-\._~]/;
    var authorityRegex = /(.*@)?([^@:]*)(:.*)?/;

    /**
     * Constructs a Uri object.
     * @constructor
     * @class Implementation of Uri parsing and base Uri resolving algorithm in RFC 3986.
     * @param {string|Uri} uri A string or Uri object to create the object from.
     */
    function Uri(uri) {
        if (uri instanceof Uri) { // copy constructor
            this.scheme = uri.scheme;
            this.authority = uri.authority;
            this.path = uri.path;
            this.query = uri.query;
            this.fragment = uri.fragment;
        } else if (uri) { // uri is Uri string or cast to string
            var c = parseRegex.exec(uri);
            this.scheme = c[1];
            this.authority = c[2];
            this.path = c[3];
            this.query = c[4];
            this.fragment = c[5];
        }
    }

    // Initial values on the prototype
    Uri.prototype.scheme = null;
    Uri.prototype.authority = null;
    Uri.prototype.path = '';
    Uri.prototype.query = null;
    Uri.prototype.fragment = null;

    /**
     * Returns the scheme part of the Uri.
     * In "http://example.com:80/a/b?x#y" this is "http".
     * @return
     */
    Uri.prototype.getScheme = function() {
        return this.scheme;
    };

    /**
     * Returns the authority part of the Uri.
     * In "http://example.com:80/a/b?x#y" this is "example.com:80".
     * @return
     */
    Uri.prototype.getAuthority = function() {
        return this.authority;
    };

    /**
     * Returns the path part of the Uri.
     * In "http://example.com:80/a/b?x#y" this is "/a/b".
     * In "mailto:mike@example.com" this is "mike@example.com".
     * @return
     */
    Uri.prototype.getPath = function() {
        return this.path;
    };

    /**
     * Returns the query part of the Uri.
     * In "http://example.com:80/a/b?x#y" this is "x".
     * @return
     */
    Uri.prototype.getQuery = function() {
        return this.query;
    };

    /**
     * Returns the fragment part of the Uri.
     * In "http://example.com:80/a/b?x#y" this is "y".
     * @return
     */
    Uri.prototype.getFragment = function() {
        return this.fragment;
    };

    /**
     * Tests whether the Uri is an absolute Uri.
     * See RFC 3986 section 4.3.
     */
    Uri.prototype.isAbsolute = function() {
        return !!this.scheme && !this.fragment;
    };

    /**
     * Tests whether the Uri is a same-document reference.
     * See RFC 3986 section 4.4.
     *
     * To perform more thorough comparison, you can normalise the Uri objects.
     */
    Uri.prototype.isSameDocumentAs = function(uri) {
        return uri.scheme === this.scheme && uri.authority === this.authority && uri.path === this.path && uri.query === this.query;
    };

    /**
     * Simple String Comparison of two Uris.
     * See RFC 3986 section 6.2.1.
     *
     * To perform more thorough comparison, you can normalise the Uri objects.
     */
    Uri.prototype.equals = function(uri) {
        return this.isSameDocumentAs(uri) && uri.fragment === this.fragment;
    };

    /**
     * Normalizes the Uri using syntax-based normalization.
     * This includes case normalization, percent-encoding normalization and path segment normalization.
     * XXX: Percent-encoding normalization does not escape characters that need to be escaped.
     *      (Although that would not be a valid Uri in the first place.)
     * See RFC 3986 section 6.2.2.
     */
    Uri.prototype.normalize = function() {
        this.removeDotSegments();
        if (this.scheme) {
            this.scheme = this.scheme.toLowerCase();
        }
        if (this.authority) {
            this.authority = this.authority.replace(authorityRegex, replaceAuthority).replace(caseRegex, replaceCase);
        }
        if (this.path) {
            this.path = this.path.replace(caseRegex, replaceCase);
        }
        if (this.query) {
            this.query = this.query.replace(caseRegex, replaceCase);
        }
        if (this.fragment) {
            this.fragment = this.fragment.replace(caseRegex, replaceCase);
        }
    };

    function replaceCase(str) {
        var dec = unescape(str);
        return percentRegex.test(dec) ? dec : str.toUpperCase();
    }

    function replaceAuthority(str, p1, p2, p3) {
        return (p1 || '') + p2.toLowerCase() + (p3 || '');
    }

    /**
     * Resolve a relative Uri (this) against a base Uri.
     * The base Uri must be an absolute Uri.
     * See RFC 3986 section 5.2
     */
    Uri.prototype.resolve = function(baseUri) {
        var uri = new Uri();
        if (this.scheme) {
            uri.scheme = this.scheme;
            uri.authority = this.authority;
            uri.path = this.path;
            uri.query = this.query;
        } else {
            uri.scheme = baseUri.scheme;
            if (this.authority) {
                uri.authority = this.authority;
                uri.path = this.path;
                uri.query = this.query;
            } else {
                uri.authority = baseUri.authority;
                if (this.path === '') {
                    uri.path = baseUri.path;
                    uri.query = this.query || baseUri.query;
                } else {
                    if (this.path.charAt(0) === '/') {
                        uri.path = this.path;
                        uri.removeDotSegments();
                    } else {
                        if (baseUri.authority && baseUri.path === '') {
                            uri.path = '/' + this.path;
                        } else {
                            uri.path = baseUri.path.substring(0, baseUri.path.lastIndexOf('/') + 1) + this.path;
                        }
                        uri.removeDotSegments();
                    }
                    uri.query = this.query;
                }
            }
        }
        uri.fragment = this.fragment;
        return uri;
    };

    /**
     * Remove dot segments from path.
     * See RFC 3986 section 5.2.4
     * @private
     */
    Uri.prototype.removeDotSegments = function() {
        var input = this.path.split('/'), output = [], segment, absPath = input[0] === '';
        if (absPath) {
            input.shift();
        }
        if (input[0] === '') {
            input.shift();
        }
        while (input.length) {
            segment = input.shift();
            if (segment === '..') {
                output.pop();
            } else if (segment !== '.') {
                output.push(segment);
            }
        }
        if (segment === '.' || segment === '..') {
            output.push('');
        }
        if (absPath) {
            output.unshift('');
        }
        this.path = output.join('/');
    };

    var cache = {};

    /**
     * Resolves a relative Uri against an absolute base Uri.
     * Convenience method.
     * @param {String} uri the relative Uri to resolve
     * @param {String} baseUri the base Uri (must be absolute) to resolve against
     */
    Uri.resolve = function(sUri, sBaseUri) {
        var uri = cache[sUri];
        if (typeof uri === 'undefined') {
            cache[sUri] = new Uri(sUri);
        }
        var baseUri = cache[sBaseUri] || (cache[sBaseUri] = new Uri(sBaseUri));
        return uri.resolve(baseUri).toString();
    };

    /**
     * Serializes the Uri to a string.
     */
    Uri.prototype.toString = function() {
        var result = '';
        if (this.scheme) {
            result += this.scheme + ':';
        }
        if (this.authority) {
            result += '//' + this.authority;
        }
        result += this.path;
        if (this.query) {
            result += '?' + this.query;
        }
        if (this.fragment) {
            result += '#' + this.fragment;
        }
        return result;
    };

    return Uri;
});
