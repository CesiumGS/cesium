/*global define*/
define([
        './defined',
        './isArray'
    ], function(
        defined,
        isArray) {
    'use strict';

    /**
     * Parses a query string into an object, where the keys and values of the object are the
     * name/value pairs from the query string, decoded. If a name appears multiple times,
     * the value in the object will be an array of values.
     * @exports queryToObject
     *
     * @param {String} queryString The query string.
     * @returns {Object} An object containing the parameters parsed from the query string.
     *
     * @see objectToQuery
     *
     * @example
     * var obj = Cesium.queryToObject('key1=some%20value&key2=a%2Fb');
     * // obj will be:
     * // {
     * //   'key1' : 'some value'
     * //   'key2' : 'a/b'
     * // }
     */
    var queryToObject = function(queryString) {
        var result = {};
        if (queryString === '') {
            return result;
        }
        var parts = queryString.replace(/\+/g, '%20').split('&');
        for (var i = 0, len = parts.length; i < len; ++i) {
            var subparts = parts[i].split('=');

            var name = decodeURIComponent(subparts[0]);
            var value = subparts[1];
            if (defined(value)) {
                value = decodeURIComponent(value);
            } else {
                value = '';
            }

            if (typeof result[name] === 'string') {
                // expand the single value to an array
                result[name] = [result[name], value];
            } else if (isArray(result[name])) {
                result[name].push(value);
            } else {
                result[name] = value;
            }
        }
        return result;
    };

    return queryToObject;
});