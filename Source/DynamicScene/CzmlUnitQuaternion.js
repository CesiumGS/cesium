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
    var identity = new Quaternion(0, 0, 0, 1);
    var axis = new Cartesian3();
    var rotationVector = new Cartesian3();
    var tmpQuaternion = new Quaternion();
    var quaternion0 = new Quaternion();
    var quaternion0Conjugate = new Quaternion();

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
            CzmlUnitQuaternion.getValueFromArray(sourceArray, lastIndex * doublesPerQuaternion, quaternion0Conjugate);
            quaternion0Conjugate.conjugate(quaternion0Conjugate);

            for ( var i = 0, len = lastIndex - firstIndex + 1; i < len; i++) {
                var offset = i * doublesPerCartesian;
                CzmlUnitQuaternion.getValueFromArray(sourceArray, (firstIndex + i) * doublesPerQuaternion, tmpQuaternion);

                tmpQuaternion.multiply(quaternion0Conjugate, tmpQuaternion);

                if (tmpQuaternion.w < 0) {
                    tmpQuaternion = tmpQuaternion.negate();
                }

                tmpQuaternion.getAxis(axis);
                var angle = tmpQuaternion.getAngle();
                destinationArray[offset] = axis.x * angle;
                destinationArray[offset + 1] = axis.y * angle;
                destinationArray[offset + 2] = axis.z * angle;
            }
        },

        getValue : function(unwrappedInterval, existingInstance) {
            if (typeof existingInstance === 'undefined') {
                existingInstance = new Quaternion();
            }
            existingInstance.x = unwrappedInterval[0];
            existingInstance.y = unwrappedInterval[1];
            existingInstance.z = unwrappedInterval[2];
            existingInstance.w = unwrappedInterval[3];
            return existingInstance.normalize(existingInstance);
        },

        getValueFromArray : function(array, startingIndex, existingInstance) {
            if (typeof existingInstance === 'undefined') {
                existingInstance = new Quaternion();
            }
            existingInstance.x = array[startingIndex];
            existingInstance.y = array[startingIndex + 1];
            existingInstance.z = array[startingIndex + 2];
            existingInstance.w = array[startingIndex + 3];
            return existingInstance.normalize(existingInstance);
        },

        getValueFromInterpolationResult : function(array, existingInstance, sourceArray, firstIndex, lastIndex) {
            if (typeof existingInstance === 'undefined') {
                existingInstance = new Quaternion();
            }
            rotationVector.x = array[0];
            rotationVector.y = array[1];
            rotationVector.z = array[2];
            var magnitude = rotationVector.magnitude();

            CzmlUnitQuaternion.getValueFromArray(sourceArray, lastIndex * doublesPerQuaternion, quaternion0);

            if (magnitude === 0) {
                tmpQuaternion = identity;
            } else {
                Quaternion.fromAxisAngle(rotationVector, magnitude, tmpQuaternion);
            }

            return existingInstance.normalize(tmpQuaternion.multiply(quaternion0, existingInstance));
        },
    };

    return CzmlUnitQuaternion;
});