/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * @private
     */
    var TileState = {
        UNLOADED : new Enumeration(0, 'UNLOADED'),
        TRANSITIONING : new Enumeration(1, 'TRANSITIONING'),
        RECEIVED: new Enumeration(2, 'RECEIVED'),
        TRANSFORMED : new Enumeration(3, 'TRANSFORMED'),
        READY : new Enumeration(4, 'READY'),
        FAILED : new Enumeration(5, 'FAILED'),
        INVALID : new Enumeration(6, 'INVALID'),

        // TODO: remove these
        IMAGE_LOADING : new Enumeration(8, 'IMAGE_LOADING'),
        IMAGE_FAILED : new Enumeration(9, 'IMAGE_FAILED'),
        IMAGE_INVALID : new Enumeration(10, 'IMAGE_INVALID'),
        REPROJECTING : new Enumeration(11, 'REPROJECTING'),
        TEXTURE_LOADING : new Enumeration(12, 'TEXTURE_LOADING'),
        TEXTURE_LOADED : new Enumeration(13, 'TEXTURE_LOADED')
    };

    return TileState;
});