/*global define*/
define([
        '../Core/Quaternion',
        '../Core/Cartesian3'
    ], function(
        Quaternion,
        Cartesian3) {
    "use strict";

    var doublesPerCartesian = 3;
    var doublesPerQuaternion = 4;
    var axis = new Cartesian3();
    var rotationVector = new Cartesian3();
    var tmpQuaternion = new Quaternion();
    var quaternion0 = new Quaternion();
    var quaternion0Conjugate = new Quaternion();

    /**
     * Provides methods for working with a unit Quaternion defined in CZML.
     *
     * @exports CzmlUnitQuaternion
     *
     * @see Quaternion
     * @see DynamicProperty
     * @see CzmlBoolean
     * @see CzmlCartesian2
     * @see CzmlCartesian3
     * @see CzmlPosition
     * @see CzmlColor
     * @see CzmlHorizontalOrigin
     * @see CzmlLabelStyle
     * @see CzmlNumber
     * @see CzmlString
     * @see CzmlUnitCartesian3
     * @see CzmlUnitSpherical
     * @see CzmlVerticalOrigin
     */
    var CzmlUnitQuaternion = {
        /**
         * The number of doubles per packed Quaternion value.
         */
        doublesPerValue : doublesPerQuaternion,

        /**
         * The number of doubles per packed value used for interpolation.
         */
        doublesPerInterpolationValue : doublesPerCartesian,

        /**
         * Returns the packed Quaternion representation contained within the provided CZML interval
         * or undefined if the interval does not contain Quaternion data.
         *
         * @param {Object} czmlInterval The CZML interval to unwrap.
         */
        unwrapInterval : function(czmlInterval) {
            return czmlInterval.unitQuaternion;
        },

        /**
         * Returns true if this interval represents data that should be interpolated by the client
         * or false if it's a single value.
         *
         * @param {Object} unwrappedInterval The result of CzmlUnitQuaternion.unwrapInterval.
         */
        isSampled : function(unwrappedInterval) {
            return Array.isArray(unwrappedInterval) && unwrappedInterval.length > doublesPerQuaternion;
        },

        /**
         * Given a packed array of x, y, z, and w values, creates a packed array of
         * Cartesian3 axis-angle rotations suitable for interpolation.
         *
         * @param {Array} sourceArray The packed array of quaternion values.
         * @param {Array} destinationArray The array to store the packed axis-angle rotations.
         * @param {Number} firstIndex The index of the first element to be packed.
         * @param {Number} lastIndex The index of the last element to be packed.
         */
        packValuesForInterpolation : function(sourceArray, destinationArray, firstIndex, lastIndex) {
            CzmlUnitQuaternion.getValueFromArray(sourceArray, lastIndex * doublesPerQuaternion, quaternion0Conjugate);
            quaternion0Conjugate.conjugate(quaternion0Conjugate);

            for ( var i = 0, len = lastIndex - firstIndex + 1; i < len; i++) {
                var offset = i * doublesPerCartesian;
                CzmlUnitQuaternion.getValueFromArray(sourceArray, (firstIndex + i) * doublesPerQuaternion, tmpQuaternion);

                tmpQuaternion.multiply(quaternion0Conjugate, tmpQuaternion);

                if (tmpQuaternion.w < 0) {
                    tmpQuaternion.negate(tmpQuaternion);
                }

                tmpQuaternion.getAxis(axis);
                var angle = tmpQuaternion.getAngle();
                destinationArray[offset] = axis.x * angle;
                destinationArray[offset + 1] = axis.y * angle;
                destinationArray[offset + 2] = axis.z * angle;
            }
        },

        /**
         * Given a non-sampled unwrapped interval, returns a Quaternion instance of the data.
         *
         * @param {Object} unwrappedInterval The result of CzmlUnitQuaternion.unwrapInterval.
         * @param {Cartesian3} result The object to store the result in, if undefined a new instance will be created.
         * @returns The modified result parameter or a new Quaternion instance if result was not defined.
         */
        getValue : function(unwrappedInterval, result) {
            if (typeof result === 'undefined') {
                result = new Quaternion();
            }
            result.x = unwrappedInterval[0];
            result.y = unwrappedInterval[1];
            result.z = unwrappedInterval[2];
            result.w = unwrappedInterval[3];
            return result.normalize(result);
        },

        /**
         * Given a packed array of x, y, z, and w values, extracts a Quaternion instance.
         *
         * @param {Array} array A packed array of Quaternion values, where every four elements represents a Cartesian3.
         * @param {Number} startingIndex The index into the array that contains the x value of the Quaternion you would like.
         * @param {Cartesian3} result The object to store the result in, if undefined a new instance will be created.
         * @returns The modified result parameter or a new Quaternion instance if result was not defined.
         */
        getValueFromArray : function(array, startingIndex, result) {
            if (typeof result === 'undefined') {
                result = new Quaternion();
            }
            result.x = array[startingIndex];
            result.y = array[startingIndex + 1];
            result.z = array[startingIndex + 2];
            result.w = array[startingIndex + 3];
            return result.normalize(result);
        },

        /**
         * Given a packed array of axis-angle rotations returned from CzmlUnitQuaternion.packValuesForInterpolation,
         * converts the desired index into a unit Quaternion.
         *
         * @param {Array} array The array containing the packed axis-angle rotations.
         * @param {Quaternion} result The object to store the result in, if undefined a new instance will be created.
         * @param {Array} sourceArray The source array of the original Quaternion values previously passed to CzmlUnitQuaternion.packValuesForInterpolation.
         * @param {Number} firstIndex The index previously passed to CzmlUnitQuaternion.packValuesForInterpolation.
         * @param {Number} lastIndex The index previously passed to CzmlUnitQuaternion.packValuesForInterpolation
         * @returns The modified result parameter or a new Quaternion instance if result was not defined.
         */
        getValueFromInterpolationResult : function(array, result, sourceArray, firstIndex, lastIndex) {
            if (typeof result === 'undefined') {
                result = new Quaternion();
            }
            rotationVector.x = array[0];
            rotationVector.y = array[1];
            rotationVector.z = array[2];
            var magnitude = rotationVector.magnitude();

            CzmlUnitQuaternion.getValueFromArray(sourceArray, lastIndex * doublesPerQuaternion, quaternion0);

            if (magnitude === 0) {
                //Can't just use Quaternion.IDENTITY here because tmpQuaternion may be modified in the future.
                tmpQuaternion.x = tmpQuaternion.y = tmpQuaternion.z = 0.0;
                tmpQuaternion.w = 1.0;
            } else {
                Quaternion.fromAxisAngle(rotationVector, magnitude, tmpQuaternion);
            }

            return result.normalize(tmpQuaternion.multiply(quaternion0, result), result);
        }
    };

    return CzmlUnitQuaternion;
});