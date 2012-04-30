/*global define*/
define(['Core/Color'], function(Color) {
    "use strict";

    var ColorDataHandler = {

        elementsPerItem : 4,
        elementsPerInterpolationItem : 4,

        isSampled : function(packetData) {
            return Array.isArray(packetData) && packetData.length > ColorDataHandler.elementsPerItem;
        },

        extractValueAt : function(index, data) {
            index = index * ColorDataHandler.elementsPerItem;
            return new Color(data[index], data[index + 1], data[index + 2], data[index + 3]);
        },

        extractValue : function(data) {
            return new Color(data[0], data[1], data[2], data[3]);
        },

        getPacketData : function(packet) {
            return packet.rgba;
        },

        extractInterpolationTable : function(valuesArray, destinationArray, firstIndex, lastIndex) {
            var sourceIndex = firstIndex * ColorDataHandler.elementsPerItem, destinationIndex = 0, stop = (lastIndex + 1) * ColorDataHandler.elementsPerItem;

            for (; sourceIndex < stop; sourceIndex++, destinationIndex++) {
                destinationArray[destinationIndex] = valuesArray[sourceIndex];
            }
        },

        interpretInterpolationResult : function(result) {
            return new Color(result[0], result[1], result[2], result[3]);
        }
    };
    return ColorDataHandler;
});