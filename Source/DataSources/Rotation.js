/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/Math'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        CesiumMath) {
    'use strict';

    /**
     * Represents a {@link Packable} number that always interpolates values
     * towards the shortest angle of rotation. This object is never used directly
     * but is instead passed to the constructor of {@link SampledProperty}
     * in order to represent a two-dimensional angle of rotation.
     *
     * @exports Rotation
     *
     *
     * @example
     * var time1 = Cesium.JulianDate.fromIso8601('2010-05-07T00:00:00');
     * var time2 = Cesium.JulianDate.fromIso8601('2010-05-07T00:01:00');
     * var time3 = Cesium.JulianDate.fromIso8601('2010-05-07T00:02:00');
     *
     * var property = new Cesium.SampledProperty(Cesium.Rotation);
     * property.addSample(time1, 0);
     * property.addSample(time3, Cesium.Math.toRadians(350));
     *
     * //Getting the value at time2 will equal 355 degrees instead
     * //of 175 degrees (which is what you get if you construct
     * //a SampledProperty(Number) instead.  Note, the actual
     * //return value is in radians, not degrees.
     * property.getValue(time2);
     * 
     * @see PackableForInterpolation
     */
    var Rotation = {
        /**
         * The number of elements used to pack the object into an array.
         * @type {Number}
         */
        packedLength : 1,

        /**
         * Stores the provided instance into the provided array.
         *
         * @param {Rotation} value The value to pack.
         * @param {Number[]} array The array to pack into.
         * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
         */
        pack : function(value, array, startingIndex) {
            //>>includeStart('debug', pragmas.debug);
            if (!defined(value)) {
                throw new DeveloperError('value is required');
            }

            if (!defined(array)) {
                throw new DeveloperError('array is required');
            }
            //>>includeEnd('debug');

            startingIndex = defaultValue(startingIndex, 0);
            array[startingIndex] = value;
        },

        /**
         * Retrieves an instance from a packed array.
         *
         * @param {Number[]} array The packed array.
         * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
         * @param {Rotation} [result] The object into which to store the result.
         * @returns {Rotation} The modified result parameter or a new Rotation instance if one was not provided.
         */
        unpack : function(array, startingIndex, result) {
            //>>includeStart('debug', pragmas.debug);
            if (!defined(array)) {
                throw new DeveloperError('array is required');
            }
            //>>includeEnd('debug');

            startingIndex = defaultValue(startingIndex, 0);
            return array[startingIndex];
        },

        /**
         * Converts a packed array into a form suitable for interpolation.
         *
         * @param {Number[]} packedArray The packed array.
         * @param {Number} [startingIndex=0] The index of the first element to be converted.
         * @param {Number} [lastIndex=packedArray.length] The index of the last element to be converted.
         * @param {Number[]} result The object into which to store the result.
         */
        convertPackedArrayForInterpolation : function(packedArray, startingIndex, lastIndex, result) {
            //>>includeStart('debug', pragmas.debug);
            if (!defined(packedArray)) {
                throw new DeveloperError('packedArray is required');
            }
            //>>includeEnd('debug');

            startingIndex = defaultValue(startingIndex, 0);
            lastIndex = defaultValue(lastIndex, packedArray.length);

            var previousValue;
            for (var i = 0, len = lastIndex - startingIndex + 1; i < len; i++) {
                var value = packedArray[startingIndex + i];
                if (i === 0 || Math.abs(previousValue - value) < Math.PI) {
                    result[i] = value;
                } else {
                    result[i] = value - CesiumMath.TWO_PI;
                }
                previousValue = value;
            }
        },

        /**
         * Retrieves an instance from a packed array converted with {@link Rotation.convertPackedArrayForInterpolation}.
         *
         * @param {Number[]} array The array previously packed for interpolation.
         * @param {Number[]} sourceArray The original packed array.
         * @param {Number} [startingIndex=0] The startingIndex used to convert the array.
         * @param {Number} [lastIndex=packedArray.length] The lastIndex used to convert the array.
         * @param {Rotation} [result] The object into which to store the result.
         * @returns {Rotation} The modified result parameter or a new Rotation instance if one was not provided.
         */
        unpackInterpolationResult : function(array, sourceArray, firstIndex, lastIndex, result) {
            //>>includeStart('debug', pragmas.debug);
            if (!defined(array)) {
                throw new DeveloperError('array is required');
            }
            if (!defined(sourceArray)) {
                throw new DeveloperError('sourceArray is required');
            }
            //>>includeEnd('debug');

            result = array[0];
            if (result < 0) {
                return result + CesiumMath.TWO_PI;
            }
            return result;
        }
    };

    return Rotation;
});
