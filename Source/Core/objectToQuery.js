/*global define*/
define([
        './isArray'
    ], function(
        isArray) {
    'use strict';

    var scratchArray = [];

    /**
     * Converts an object representing a set of name/value pairs into a query string,
     * with names and values encoded properly for use in a URL.  Values that are arrays
     * will produce multiple values with the same name.
     * @exports queryToObject
     *
     * @param {Object} obj The object containing data to encode.
     * @returns {String} An encoded query string.
     *
     * @see queryToObject
     *
     * @example
     * var str = Cesium.queryToObject({
     *     key1 : 'some value',
     *     key2 : 'a/b'
     * });
     * // str will be:
     * // 'key1=some+value&key2=a%2Fb'
     */
    var objectToQuery = function(obj) {
        for ( var propName in obj) {
            if (obj.hasOwnProperty(propName)) {
                var value = obj[propName];

                var part = encodeURIComponent(propName) + '=';
                if (isArray(value)) {
                    for (var i = 0, len = value.length; i < len; ++i) {
                        scratchArray.push(part + encodeURIComponent(value[i]));
                    }
                } else {
                    scratchArray.push(part + encodeURIComponent(value));
                }
            }
        }

        var result = scratchArray.join('&').replace(/%20/g, '+');
        scratchArray.length = 0;
        return result;
    };

    return objectToQuery;
});