/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * @private
     */
    var TileState = {
        UNLOADED : new Enumeration(0, 'UNLOADED'),
        TRANSITIONING : new Enumeration(1, 'TRANSITIONING'),
        RECEIVED : new Enumeration(2, 'RECEIVED'),
        TRANSFORMED : new Enumeration(3, 'TRANSFORMED'),
        READY : new Enumeration(4, 'READY'),
        FAILED : new Enumeration(5, 'FAILED'),
        INVALID : new Enumeration(6, 'INVALID')
    };

    return TileState;
});