/*global define*/
define(['../ThirdParty/Uri'],
    function(URI) {
    "use strict";

    /**
     * Function for joining URLs in a manner that is aware of query strings and fragments.
     * This is useful when the base URL has a query string that needs to be maintained
     * (e.g. a presigned base URL).
     * @param {String|URI} first The base URL.
     * @param {String|URI} second The URL path to join to the base URL.
     * @param {Boolean} [appendSlash=true] The boolean determining whether there should be a forward slash between first and second.
     */
    var joinUrls = function(first, second, appendSlash) {

        appendSlash = typeof addSlash !== 'undefined' ? appendSlash : true;

        if (!(first instanceof URI)) {
            first = new URI(first);
        }

        if (!(second instanceof URI)) {
            second = new URI(second);
        }

        var url = '';
        if (first.scheme) {url += first.scheme + ':';}
        if (first.authority) {url += '//' + first.authority;}

        if (appendSlash) {
            url += first.path.replace(/\/?$/, '/') + second.path.replace(/^\/?/g, '');
        } else {
            url += first.path + second.path;
        }

        if (first.query && second.query) {
            url += '?' + first.query + '&' + second.query;
        } else if (first.query && !second.query) {
            url += '?' + first.query;
        } else if (!first.query && second.query) {
            url += '?' + second.query;
        }

        if (first.fragment && !second.fragment) {
            url += '#' + first.fragment;
        } else if (second.fragment) {
            url += '#' + second.fragment;
        }

        return url;
    };

    return joinUrls;
});
