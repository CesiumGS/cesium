/*global define*/
define(['Core/Quaternion',
        'Core/Cartesian3'],
function(Quaternion,
         Cartesian3) {
    "use strict";

    var doublesPerCartesian = 3;
    var doublesPerQuaternion = 4;

    var QuaternionDataHandler = {

        doublesPerValue : doublesPerQuaternion,

        doublesPerInterpolationValue : doublesPerCartesian,

        isSampled : function(czmlIntervalData) {
            return Array.isArray(czmlIntervalData) && czmlIntervalData.length > doublesPerQuaternion;
        },

        createValueFromArray : function(data, startingIndex) {
            return new Quaternion(data[startingIndex], data[startingIndex + 1], data[startingIndex + 2], data[startingIndex + 3]);
        },

        createValue : function(data) {
            return new Quaternion(data[0], data[1], data[2], data[3]);
        },

        getCzmlIntervalValue : function(czmlInterval) {
            return czmlInterval.quaternion;
        },

        packValuesForInterpolation : function(valuesArray, destinationArray, firstIndex, lastIndex) {
            var quaternion0Conjugate = QuaternionDataHandler.createValueFromArray(valuesArray, lastIndex * doublesPerQuaternion).conjugate();

            for ( var i = 0, len = lastIndex - firstIndex + 1; i < len; i++) {
                var offset = i * doublesPerCartesian, value = QuaternionDataHandler.createValueFromArray(valuesArray, (firstIndex + i) * doublesPerQuaternion), difference = value
                        .multiply(quaternion0Conjugate);

                if (difference.w < 0) {
                    difference = difference.negate();
                }

                if (difference.w === 1 && difference.x === 0 && difference.y === 0 && difference.z === 0) {
                    destinationArray[offset] = 0;
                    destinationArray[offset + 1] = 0;
                    destinationArray[offset + 2] = 0;
                } else {
                    var axis = new Cartesian3(difference.x, difference.y, difference.z), magnitude = axis.magnitude(), angle = 2 * Math.atan2(magnitude, difference.w), axisX = axis.x /
                            magnitude, axisY = axis.y / magnitude, axisZ = axis.z / magnitude;

                    destinationArray[offset] = axisX * angle;
                    destinationArray[offset + 1] = axisY * angle;
                    destinationArray[offset + 2] = axisZ * angle;
                }
            }
        },

        createValueFromInterpolationResult : function(result, valuesArray, firstIndex, lastIndex) {
            var rotationVector = new Cartesian3(result[0], result[1], result[2]);
            var magnitude = rotationVector.magnitude();

            var quaternion0 = QuaternionDataHandler.createValueFromArray(valuesArray, lastIndex * doublesPerQuaternion);
            var difference;

            if (magnitude === 0) {
                difference = new Quaternion(0, 0, 0, 1);
            } else {
                difference = Quaternion.fromAxisAngle(rotationVector, magnitude);
            }

            return difference.multiply(quaternion0);
        }
    };
    return QuaternionDataHandler;
});