/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * @private
     */
    var RequestType = {
        TERRAIN : 0,
        IMAGERY : 1,
        TILES3D : 2,
        OTHER : 3,
        NUMBER_OF_REQUEST_TYPES : 4
    };

    return freezeObject(RequestType);
});
