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

    var CzmlUnitQuaternion = {
        doublesPerValue : doublesPerQuaternion,
        doublesPerInterpolationValue : doublesPerCartesian,

        unwrapInterval : function(czmlInterval) {
            return czmlInterval.unitQuaternion;
        },

        isSampled : function(unwrappedInterval) {
            return Array.isArray(unwrappedInterval) && unwrappedInterval.length > doublesPerQuaternion;
        },

        packValuesForInterpolation : function(sourceArray, destinationArray, firstIndex, lastIndex) {
            var quaternion0Conjugate = CzmlUnitQuaternion.createValueFromArray(sourceArray, lastIndex * doublesPerQuaternion).conjugate();

            for ( var i = 0, len = lastIndex - firstIndex + 1; i < len; i++) {
                var offset = i * doublesPerCartesian;
                var value = CzmlUnitQuaternion.createValueFromArray(sourceArray, (firstIndex + i) * doublesPerQuaternion);
                var difference = value.multiply(quaternion0Conjugate).normalize();

                if (difference.w < 0) {
                    difference = difference.negate();
                }

                if (difference.x === 0 && difference.y === 0 && difference.z === 0) {
                    destinationArray[offset] = 0;
                    destinationArray[offset + 1] = 0;
                    destinationArray[offset + 2] = 0;
                } else {
                    var axis = new Cartesian3(difference.x, difference.y, difference.z);
                    var magnitude = axis.magnitude();
                    var angle = 2 * Math.atan2(magnitude, difference.w);
                    var axisX = axis.x / magnitude;
                    var axisY = axis.y / magnitude;
                    var axisZ = axis.z / magnitude;

                    destinationArray[offset] = axisX * angle;
                    destinationArray[offset + 1] = axisY * angle;
                    destinationArray[offset + 2] = axisZ * angle;
                }
            }
        },

        createValue : function(unwrappedInterval) {
            return new Quaternion(unwrappedInterval[0], unwrappedInterval[1], unwrappedInterval[2], unwrappedInterval[3], true);
        },

        createValueFromArray : function(array, startingIndex) {
            return new Quaternion(array[startingIndex], array[startingIndex + 1], array[startingIndex + 2], array[startingIndex + 3], true);
        },

        createValueFromInterpolationResult : function(array, sourceArray, firstIndex, lastIndex) {
            var rotationVector = new Cartesian3(array[0], array[1], array[2]);
            var magnitude = rotationVector.magnitude();

            var quaternion0 = CzmlUnitQuaternion.createValueFromArray(sourceArray, lastIndex * doublesPerQuaternion);

            var difference;
            if (magnitude === 0) {
                difference = new Quaternion(0, 0, 0, 1);
            } else {
                difference = Quaternion.fromAxisAngle(rotationVector, magnitude);
            }

            return difference.multiply(quaternion0).normalize();
        }
    };

    return CzmlUnitQuaternion;
});