/*global define*/
define([
        '../Core/Enumeration'
    ], function(
        Enumeration) {
    "use strict";

    /**
     * @private
     */
    var BufferUsage = {
        STREAM_DRAW : new Enumeration(0x88E0, 'STREAM_DRAW'),
        STATIC_DRAW : new Enumeration(0x88E4, 'STATIC_DRAW'),
        DYNAMIC_DRAW : new Enumeration(0x88E8, 'DYNAMIC_DRAW'),

        validate : function(bufferUsage) {
            return ((bufferUsage === BufferUsage.STREAM_DRAW) ||
                    (bufferUsage === BufferUsage.STATIC_DRAW) ||
                    (bufferUsage === BufferUsage.DYNAMIC_DRAW));
        }
    };

    return BufferUsage;
});
