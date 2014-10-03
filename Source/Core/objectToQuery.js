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
     * Converts an object representing a set of name/value pairs into a query string,
     * with names and values encoded properly for use in a URL.  Values that are arrays
     * will produce multiple values with the same name.
     * @exports objectToQuery
     *
     * @param {Object} obj The object containing data to encode.
     * @returns {String} An encoded query string.
     *
     * @see queryToObject
     *
     * @example
     * var str = Cesium.objectToQuery({
     *     key1 : 'some value',
     *     key2 : 'a/b',
     *     key3 : ['x', 'y']
     * });
     * // str will be:
     * // 'key1=some+value&key2=a%2Fb&key3=x&key3=y'
     */
    var objectToQuery = function(obj) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(obj)) {
            throw new DeveloperError('obj is required.');
        }
        //>>includeEnd('debug');

        var result = '';
        for ( var propName in obj) {
            if (obj.hasOwnProperty(propName)) {
                var value = obj[propName];

                var part = encodeURIComponent(propName) + '=';
                if (isArray(value)) {
                    for (var i = 0, len = value.length; i < len; ++i) {
                        result += part + encodeURIComponent(value[i]) + '&';
                    }
                } else {
                    result += part + encodeURIComponent(value) + '&';
                }
            }
        }

        // trim last &
        result = result.slice(0, -1);
        result = result.replace(/%20/g, '+');

        return result;
    };

    return objectToQuery;
});