/*global define*/
define(['Core/Cartesian2'], function(Cartesian2) {
    "use strict";

    var Cartesian2DataHandler = {

        elementsPerItem : 2,
        elementsPerInterpolationItem : 2,

        isSampled : function(packetData) {
            return Array.isArray(packetData) && packetData.length > Cartesian2DataHandler.elementsPerItem;
        },

        extractValueAt : function(index, data) {
            index = index * Cartesian2DataHandler.elementsPerItem;
            return {
                x : data[index],
                y : data[index + 1]
            };
        },

        extractValue : function(data) {
            return {
                x : data[0],
                y : data[1]
            };
        },

        getPacketData : function(packet) {
            return packet.cartesian;
        },

        extractInterpolationTable : function(valuesArray, destinationArray, firstIndex, lastIndex) {
            var sourceIndex = firstIndex * Cartesian2DataHandler.elementsPerItem, destinationIndex = 0, stop = (lastIndex + 1) * Cartesian2DataHandler.elementsPerItem;

            for (; sourceIndex < stop; sourceIndex++, destinationIndex++) {
                destinationArray[destinationIndex] = valuesArray[sourceIndex];
            }
        },

        interpretInterpolationResult : function(result) {
            return new Cartesian2(result[0], result[1]);
        }
    };

    return Cartesian2DataHandler;
});