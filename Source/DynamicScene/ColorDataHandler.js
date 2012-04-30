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
            return {
                r : data[index],
                g : data[index + 1],
                b : data[index + 2],
                a : data[index + 3]
            };
        },

        extractValue : function(data) {
            return {
                r : data[0],
                g : data[1],
                b : data[2],
                a : data[3]
            };
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
            return new Color(result[0], result[1], result[2]);
        }
    };
    return ColorDataHandler;
});