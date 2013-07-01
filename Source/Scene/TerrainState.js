/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * @private
     */
    var TerrainState = {
        FAILED : new Enumeration(0, 'FAILED'),
        UNLOADED : new Enumeration(1, 'UNLOADED'),
        RECEIVING : new Enumeration(2, 'RECEIVING'),
        RECEIVED : new Enumeration(3, 'RECEIVED'),
        TRANSFORMING : new Enumeration(4, 'TRANSFORMING'),
        TRANSFORMED : new Enumeration(5, 'TRANSFORMED'),
        READY : new Enumeration(6, 'READY')
    };

    return TerrainState;
});
