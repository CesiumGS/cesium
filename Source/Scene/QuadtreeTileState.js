/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * @private
     */
    var QuadtreeTileState = {
        FAILED : new Enumeration(0, 'FAILED'),
        LOADING : new Enumeration(1, 'LOADING'),
        READY : new Enumeration(2, 'READY')
    };

    return QuadtreeTileState;
});
