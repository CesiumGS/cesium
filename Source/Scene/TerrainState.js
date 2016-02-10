/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    /**
     * @private
     */
    var TerrainState = {
        FAILED : 0,
        UNLOADED : 1,
        RECEIVING : 2,
        RECEIVED : 3,
        TRANSFORMING : 4,
        TRANSFORMED : 5,
        READY : 6
    };

    return freezeObject(TerrainState);
});
