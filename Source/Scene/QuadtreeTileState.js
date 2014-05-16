/*global define*/
define([
        '../Core/Enumeration'
    ], function(
        Enumeration) {
    "use strict";

    /**
     * @private
     */
    var QuadtreeTileState = {
        START : new Enumeration(0, 'START'),
        LOADING : new Enumeration(1, 'LOADING'),
        READY : new Enumeration(2, 'READY'),
        FAILED : new Enumeration(3, 'FAILED')
    };

    return QuadtreeTileState;
});
