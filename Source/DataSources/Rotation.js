/*global define*/
define([
        '../Core/defaultValue'
    ], function(
        defaultValue) {
    "use strict";

    /**
     * Static interface for {@link Packable} properties which require interpolation between two shortest values (eg: angles)
     *
     * @namespace
     * @alias Rotation
     *
     * @see PackableForInterpolation
     */

    var Rotation = {
        packedLength : 1,
        packedInterpolationLength : 1,

        pack : function(value, array, startingIndex) {
            startingIndex = defaultValue(startingIndex, 0);
            array[startingIndex] = value;
        },

        unpack : function(array, startingIndex, result) {
            startingIndex = defaultValue(startingIndex, 0);

            if (!array.length) {
                result = array;
            } else {
                result = array[startingIndex];
            }

            return result;
        },
        
        convertPackedArrayForInterpolation : function(packedArray, startingIndex, lastIndex, result) {
            for (var i = 0, len = lastIndex - startingIndex + 1; i < len; i++) {
                result[i] = packedArray[startingIndex + i];
            }
        },

        unpackInterpolationResult : function(value, sourceArray, firstIndex, lastIndex, result) {
            var start = sourceArray[firstIndex];
            var end = sourceArray[lastIndex];
            var difference = Math.abs(end - start);
            var angle180 = Math.PI / 2;
            
            var delta = value / difference;

            if(difference > angle180) {

               if (start<angle180) {
                   end = end - (360.0 * Math.PI / 180);
               } else
               if (start>=angle180) {
                   delta = 1.0 - delta;
                   start = start - (360.0 * Math.PI / 180);
               }

               result = (start * (1.0-delta) + end * delta);

               if (result<0) {
                result = result + (360.0 * Math.PI / 180);
               }

            } else {
                result = (start * (1.0-delta) + end * delta);
            }
            
            return result;
        }
    };

    return Rotation;
});
