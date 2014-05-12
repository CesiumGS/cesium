/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * @private
     */
    var QuadtreeTileState = {
        FAILED : new Enumeration(0, 'FAILED'),
        LOADING : new Enumeration(1, 'LOADING'),
        READY : new Enumeration(2, 'READY'),
        UPSAMPLED_FROM_PARENT : new Enumeration(3, 'UPSAMPLED_FROM_PARENT')
    };

    return QuadtreeTileState;
});
