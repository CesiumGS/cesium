/*global define*/
define(['Core/Cartesian3'], function(Cartesian3) {
    "use strict";

    var Cartesian3DataHandler = {

        elementsPerItem : 3,
        elementsPerInterpolationItem : 3,

        isSampled : function(packetData) {
            return Array.isArray(packetData) && packetData.length > Cartesian3DataHandler.elementsPerItem;
        },

        extractValueAt : function(index, data) {
            index = index * Cartesian3DataHandler.elementsPerItem;
            return {
                x : data[index],
                y : data[index + 1],
                z : data[index + 2]
            };
        },

        extractValue : function(data) {
            return {
                x : data[0],
                y : data[1],
                z : data[2]
            };
        },

        getPacketData : function(packet) {
            return packet.cartesian;
        },

        extractInterpolationTable : function(valuesArray, destinationArray, firstIndex, lastIndex) {
            var sourceIndex = firstIndex * Cartesian3DataHandler.elementsPerItem, destinationIndex = 0, stop = (lastIndex + 1) * Cartesian3DataHandler.elementsPerItem;

            for (; sourceIndex < stop; sourceIndex++, destinationIndex++) {
                destinationArray[destinationIndex] = valuesArray[sourceIndex];
            }
        },

        interpretInterpolationResult : function(result) {
            return new Cartesian3(result[0], result[1], result[2]);
        }
    };
    return Cartesian3DataHandler;
});