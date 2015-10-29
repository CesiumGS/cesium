/*global define*/
define([
        '../ThirdParty/Uri',
        './defaultValue',
        './defined',
        './definedNotNull',
        './DeveloperError'
    ], function(
        Uri,
        defaultValue,
        defined,
        definedNotNull,
        DeveloperError) {
    "use strict";

    /**
     * Function for joining URLs in a manner that is aware of query strings and fragments.
     * This is useful when the base URL has a query string that needs to be maintained
     * (e.g. a presigned base URL).
     * @param {String|Uri} first The base URL.
     * @param {String|Uri} second The URL path to join to the base URL.
     * @param {Boolean} [appendSlash=true] The boolean determining whether there should be a forward slash between first and second.
     * @private
     */
    var joinUrls = function(first, second, appendSlash) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(first)) {
            throw new DeveloperError('first is required');
        }
        if (!defined(second)) {
            throw new DeveloperError('second is required');
        }
        //>>includeEnd('debug');

        appendSlash = defaultValue(appendSlash, true);

        if (!(first instanceof Uri)) {
            first = new Uri(first);
        }

        if (!(second instanceof Uri)) {
            second = new Uri(second);
        }

        var url = '';
        if (definedNotNull(first.scheme)) {
            url += first.scheme + ':';
        }
        if (definedNotNull(first.authority)) {
            url += '//' + first.authority;

            if (first.path !== "") {
                url = url.replace(/\/?$/, '/');
                first.path = first.path.replace(/^\/?/g, '');
            }
        }

        if (appendSlash) {
            url += first.path.replace(/\/?$/, '/') + second.path.replace(/^\/?/g, '');
        } else {
            url += first.path + second.path;
        }

        var hasFirstQuery = definedNotNull(first.query);
        var hasSecondQuery = definedNotNull(second.query);
        if (hasFirstQuery && hasSecondQuery) {
            url += '?' + first.query + '&' + second.query;
        } else if (hasFirstQuery && !hasSecondQuery) {
            url += '?' + first.query;
        } else if (!hasFirstQuery && hasSecondQuery) {
            url += '?' + second.query;
        }

        var hasSecondFragment = definedNotNull(second.fragment);
        if (definedNotNull(first.fragment) && !hasSecondFragment) {
            url += '#' + first.fragment;
        } else if (hasSecondFragment) {
            url += '#' + second.fragment;
        }

        return url;
    };

    return joinUrls;
});
