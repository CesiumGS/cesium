/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * @private
     */
    var TerrainState = {
        FAILED : new Enumeration(0, 'FAILED'),
        NOT_AVAILABLE : new Enumeration(1, 'NOT_AVAILABLE'),
        UNLOADED : new Enumeration(2, 'UNLOADED'),
        RECEIVING : new Enumeration(3, 'RECEIVING'),
        RECEIVED : new Enumeration(4, 'RECEIVED'),
        TRANSFORMING : new Enumeration(5, 'TRANSFORMING'),
        TRANSFORMED : new Enumeration(6, 'TRANSFORMED'),
        READY : new Enumeration(7, 'READY')
    };

    return TerrainState;
});