/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * @private
     */
    var TileState = {
        UNLOADED : new Enumeration(0, 'UNLOADED'),
        IMAGE_LOADING : new Enumeration(1, 'IMAGE_LOADING'),
        IMAGE_FAILED : new Enumeration(2, 'IMAGE_FAILED'),
        IMAGE_INVALID : new Enumeration(3, 'IMAGE_INVALID'),
        REPROJECTING : new Enumeration(4, 'REPROJECTING'),
        TEXTURE_LOADING : new Enumeration(5, 'TEXTURE_LOADING'),
        TEXTURE_LOADED : new Enumeration(6, 'TEXTURE_LOADED')
    };

    return TileState;
});