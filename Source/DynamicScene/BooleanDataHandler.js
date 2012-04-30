/*global define*/
define(function() {
    "use strict";

    var BooleanDataHandler = {

        isSampled : function() {
            return false;
        },

        extractValue : function(data) {
            return data;
        },

        getPacketData : function(packet) {
            var result = packet.boolean;
            return typeof result === 'undefined' ? packet : result;
        }
    };

    return BooleanDataHandler;
});