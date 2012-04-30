/*global define*/
define(['./DynamicProperty', 'Core/JulianDate', 'Core/binarySearch', 'Core/interpolateWithDegree', 'Core/LinearApproximation'], function(DynamicProperty, JulianDate, binarySearch,
        interpolateWithDegree, LinearApproximation) {
    "use strict";

    var NumberDataHandler = {

        elementsPerItem : 1,

        elementsPerInterpolationItem : 1,

        isSampled : function(packetData) {
            return Array.isArray(packetData);
        },

        extractValueAt : function(index, data) {
            return data[index];
        },

        extractValue : function(data) {
            if (Array.isArray(data)) {
                return data[0];
            }
            return data;
        },

        getPacketData : function(packet) {
            var result = packet.number;
            return typeof result === 'undefined' ? packet : result;
        },

        extractInterpolationTable : function(valuesArray, destinationArray, firstIndex, lastIndex) {
            var sourceIndex = firstIndex * NumberDataHandler.elementsPerItem, destinationIndex = 0, stop = (lastIndex + 1) * NumberDataHandler.elementsPerItem;

            for (; sourceIndex < stop; sourceIndex++, destinationIndex++) {
                destinationArray[destinationIndex] = valuesArray[sourceIndex];
            }
        },

        interpretInterpolationResult : function(result) {
            return result[0];
        }
    };

    return NumberDataHandler;
});