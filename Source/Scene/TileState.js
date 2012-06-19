/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * @private
     */
    var TileState = {
        READY : new Enumeration(0, 'READY'),
        IMAGE_LOADING : new Enumeration(1, 'IMAGE_LOADING'),
        IMAGE_LOADED : new Enumeration(2, 'IMAGE_LOADED'),
        IMAGE_FAILED : new Enumeration(3, 'IMAGE_FAILED'),
        IMAGE_INVALID : new Enumeration(4, 'IMAGE_INVALID'),
        REPROJECTING : new Enumeration(5, 'REPROJECTING'),
        REPROJECTED : new Enumeration(6, 'REPROJECTED'),
        TEXTURE_LOADING : new Enumeration(7, 'TEXTURE_LOADING'),
        TEXTURE_LOADED : new Enumeration(8, 'TEXTURE_LOADED')
    };

    return TileState;
});