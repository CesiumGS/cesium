define([
        './Check',
        './defaultValue',
        './defined',
        './FeatureDetection'
    ], function(
        Check,
        defaultValue,
        defined,
        FeatureDetection) {
    'use strict';

    var slice = function(array, begin, end) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('array', array);
        if (defined(begin)) {
            Check.typeOf.number('begin', begin);
        }
        if (defined(end)) {
            Check.typeOf.number('end', end);
        }
        //>>includeEnd('debug');
        return array.slice(begin, end);
    };

    if (FeatureDetection.supportsTypedArrays()) {
        var tempArray = new Uint8Array(1);
        if (typeof tempArray.slice !== 'function') {
            var typedArrayTypes = [Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array];
            slice = function(array, begin, end) {
                //>>includeStart('debug', pragmas.debug);
                Check.defined('array', array);
                if (defined(begin)) {
                    Check.typeOf.number('begin', begin);
                }
                if (defined(end)) {
                    Check.typeOf.number('end', end);
                }
                //>>includeEnd('debug');

                if (typeof array.slice === 'function') {
                    return array.slice(begin, end);
                }

                var copy = Array.prototype.slice.call(array, begin, end);
                var length = typedArrayTypes.length;
                for (var i = 0; i < length; ++i) {
                    if (array instanceof typedArrayTypes[i]) {
                        copy = new typedArrayTypes[i](copy);
                        break;
                    }
                }

                return copy;
            };
        }
    }

    /**
     * Create a shallow copy of an array from begin to end.
     *
     * @param {Array} array The array to fill.
     * @param {Number} [begin=0] The index to start at.
     * @param {Number} [end=array.length] The index to end at which is not included.
     *
     * @returns {Array} The resulting array.
     * @private
     */
    function arraySlice(array, begin, end) {
        return slice(array, begin, end);
    }

    return arraySlice;
});
