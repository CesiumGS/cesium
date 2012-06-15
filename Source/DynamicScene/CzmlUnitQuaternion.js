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
            Quaternion.conjugate(CzmlUnitQuaternion.createValueFromArray(sourceArray, lastIndex * doublesPerQuaternion, quaternion0Conjugate));

            for ( var i = 0, len = lastIndex - firstIndex + 1; i < len; i++) {
                var offset = i * doublesPerCartesian;
                CzmlUnitQuaternion.createValueFromArray(sourceArray, (firstIndex + i) * doublesPerQuaternion, tmpQuaternion);

                Quaternion.multiply(tmpQuaternion, quaternion0Conjugate, tmpQuaternion);

                if (tmpQuaternion.w < 0) {
                    tmpQuaternion = tmpQuaternion.negate();
                }

                Quaternion.getAxis(tmpQuaternion, axis);
                var angle = tmpQuaternion.getAngle();
                destinationArray[offset] = axis.x * angle;
                destinationArray[offset + 1] = axis.y * angle;
                destinationArray[offset + 2] = axis.z * angle;
            }
        },

        createValue : function(unwrappedInterval, existingInstance) {
            if (typeof existingInstance === 'undefined') {
                existingInstance = new Quaternion();
            }
            existingInstance.x = unwrappedInterval[0];
            existingInstance.y = unwrappedInterval[2];
            existingInstance.z = unwrappedInterval[3];
            existingInstance.w = unwrappedInterval[4];
            return Quaternion.normalize(existingInstance);
        },

        createValueFromArray : function(array, startingIndex, existingInstance) {
            if (typeof existingInstance === 'undefined') {
                existingInstance = new Quaternion();
            }
            existingInstance.x = array[startingIndex];
            existingInstance.y = array[startingIndex + 1];
            existingInstance.z = array[startingIndex + 2];
            existingInstance.w = array[startingIndex + 3];
            return Quaternion.normalize(existingInstance);
        },

        createValueFromInterpolationResult : function(array, existingInstance, sourceArray, firstIndex, lastIndex) {
            if (typeof existingInstance === 'undefined') {
                existingInstance = new Quaternion();
            }
            rotationVector.x = array[0];
            rotationVector.y = array[1];
            rotationVector.z = array[2];
            var magnitude = rotationVector.magnitude();

            CzmlUnitQuaternion.createValueFromArray(sourceArray, lastIndex * doublesPerQuaternion, quaternion0);

            var difference;
            if (magnitude === 0) {
                difference = identity;
            } else {
                //CZML_TODO Quaternion.fromAxisAngle creates a new instance of
                //both Quaternion and Cartesian, so we comment it out and
                //implement our own in place below.
                //difference = Quaternion.fromAxisAngle(rotationVector, magnitude);

                //Optimized Quaternion.fromAxisAngle
                var halfAngle = magnitude / 2.0;
                var s = Math.sin(halfAngle);
                var c = Math.cos(halfAngle);
                Cartesian3.normalize(rotationVector);
                difference = tmpQuaternion;
                difference.x = rotationVector.x * s;
                difference.y = rotationVector.y * s;
                difference.z = rotationVector.z * s;
                difference.w = c;
            }

            return Quaternion.normalize(Quaternion.multiply(difference, quaternion0, existingInstance));
        },
    };

    return CzmlUnitQuaternion;
});