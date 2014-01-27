/*global define*/
define([], function () {
    "use strict";

    // This implementation is adapted from here: https://gist.github.com/Yaffle/1088850.
    // The author states that it is in the public domain.

    function parseURI(url) {
        var m = String(url).replace(/^\s+|\s+$/g, '').match(/^([^:\/?#]+:)?(\/\/(?:[^:@]*(?::[^:@]*)?@)?(([^:\/?#]*)(?::(\d*))?))?([^?#]*)(\?[^#]*)?(#[\s\S]*)?/);
        // authority = '//' + user + ':' + pass '@' + hostname + ':' port
        return (m ? {
            href: m[0] || '',
            protocol: m[1] || '',
            authority: m[2] || '',
            host: m[3] || '',
            hostname: m[4] || '',
            port: m[5] || '',
            pathname: m[6] || '',
            search: m[7] || '',
            hash: m[8] || ''
        } : null);
    }

    function removeDotSegments(input) {
        var output = [];
        input.replace(/^(\.\.?(\/|$))+/, '')
             .replace(/\/(\.(\/|$))+/g, '/')
             .replace(/\/\.\.$/, '/../')
             .replace(/\/?[^\/]*/g, function (p) {
                 if (p === '/..') {
                     output.pop();
                 } else {
                     output.push(p);
                 }
             });
        return output.join('').replace(/^\//, input.charAt(0) === '/' ? '/' : '');
    }

    /**
     * Returns the absolute URL corresponding to a relative URL.  The relative URL is relative
     * to a given base URL.
     *
     * @exports makeRelativeUrlAbsolute
     *
     * @param {String} base The base absolute URL to which the URL is relative.
     * @param {String} href The relative URL.  The URL is relative to the base URL.
     *
     * @returns {String} An equivalent absolute URL.
     *
     * @example
     * var absolute = Cesium.makeRelativeUrlAbsolute('http://foo.bar/something', '../whatever');
     * // absolute === 'http://foo.bar/whatever'
     */
    var makeRelativeUrlAbsolute = function(base, href) {// RFC 3986
        href = parseURI(href || '');
        base = parseURI(base || '');

        return !href || !base ? null : (href.protocol || base.protocol) +
               (href.protocol || href.authority ? href.authority : base.authority) +
               removeDotSegments(href.protocol || href.authority || href.pathname.charAt(0) === '/' ? href.pathname : (href.pathname ? ((base.authority && !base.pathname ? '/' : '') + base.pathname.slice(0, base.pathname.lastIndexOf('/') + 1) + href.pathname) : base.pathname)) +
               (href.protocol || href.authority || href.pathname ? href.search : (href.search || base.search)) +
               href.hash;
    };

    return makeRelativeUrlAbsolute;
});
