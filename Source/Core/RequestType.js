/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    /**
     * An enum identifying the type of request. Used for finer grained logging and priority sorting.
     *
     * @exports RequestType
     */
    var RequestType = {
        TERRAIN : 0,
        IMAGERY : 1,
        TILES3D : 2,
        OTHER : 3
    };

    return freezeObject(RequestType);
});
