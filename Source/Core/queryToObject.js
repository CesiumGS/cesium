/*global define*/
define([
        './defined',
        './DeveloperError',
        './isArray'
    ], function(
        defined,
        DeveloperError,
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
     *
     * @example
     * var obj = Cesium.queryToObject('key1=some%20value&key2=a%2Fb&key3=x&key3=y');
     * // obj will be:
     * // {
     * //   key1 : 'some value',
     * //   key2 : 'a/b',
     * //   key3 : ['x', 'y']
     * // }
     * 
     * @see objectToQuery
     */
    function queryToObject(queryString) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(queryString)) {
            throw new DeveloperError('queryString is required.');
        }
        //>>includeEnd('debug');

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

            var resultValue = result[name];
            if (typeof resultValue === 'string') {
                // expand the single value to an array
                result[name] = [resultValue, value];
            } else if (isArray(resultValue)) {
                resultValue.push(value);
            } else {
                result[name] = value;
            }
        }
        return result;
    }

    return queryToObject;
});
