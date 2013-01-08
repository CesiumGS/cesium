/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * @private
     */
    var TileState = {
        UNLOADED : new Enumeration(0, 'UNLOADED'),
        TRANSITIONING : new Enumeration(1, 'TRANSITIONING'),
        IMAGERY_SKELETONS_CREATED : new Enumeration(2, 'IMAGERY_SKELETONS_CREATED'),
        RECEIVED : new Enumeration(3, 'RECEIVED'),
        TRANSFORMED : new Enumeration(4, 'TRANSFORMED'),
        READY : new Enumeration(5, 'READY'),
        FAILED : new Enumeration(6, 'FAILED'),
        INVALID : new Enumeration(7, 'INVALID')
    };

    return TileState;
});