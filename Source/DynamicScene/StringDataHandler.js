/*global define*/
define(function() {
    "use strict";

    var StringDataHandler = {

        isSampled : function() {
            return false;
        },

        extractValue : function(data) {
            return data;
        },

        getPacketData : function(packet) {
            var result = packet.string;
            return typeof result === 'undefined' ? packet : result;
        }
    };

    return StringDataHandler;
});