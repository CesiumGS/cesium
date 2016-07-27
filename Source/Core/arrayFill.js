/*global define*/
define([
        './DeveloperError',
        './defaultValue',
        './defined'
    ], function(
        DeveloperError,
        defaultValue,
        defined) {
    'use strict';

    /**
     *
     * @private
     *
     * @param array
     * @param value
     * @param start
     * @param end
     *
     * @returns The resulting array.
     */
    function arrayFill(array, value, start, end) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(array) || typeof array !== 'object') {
            throw new DeveloperError('Array is required.');
        }
        if (!defined(value)) {
            throw new DeveloperError('Value is required.');
        }
        if (defined(start) && (typeof start !== 'number')) {
            throw new DeveloperError('Start must be a valid index.');
        }
        if (defined(end) && (typeof end !== 'number')) {
            throw new DeveloperError('End must be a valid index.');
        }
        //>>includeEnd('debug');

        if (typeof array.fill !== 'undefined') {
            return array.fill(value, start, end);
        }

        var length = array.length >>> 0;

        // Truncate and default to 0
        var relativeStart = start >> 0;

        // If negative, find wrap around position
        var k = (relativeStart < 0) ? Math.max(length + relativeStart, 0) : Math.min(relativeStart, length);

        var relativeEnd = defaultValue(end >> 0, length);

        // If negative, find wrap around position
        var final = (relativeEnd < 0) ? Math.max(length + relativeEnd, 0) : Math.min(relativeEnd, length);

        // Fill array accordingly
        while (k < final) {
            array[k] = value;
            k++;
        }

        return array;
    }
    
    return arrayFill;
});
