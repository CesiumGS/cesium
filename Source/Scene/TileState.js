/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * @private
     */
    var TileState = {
        UNLOADED : new Enumeration(0, 'UNLOADED'),
        REQUESTING : new Enumeration(1, 'REQUESTING'),
        TRANFORMING : new Enumeration(2, 'TRANSFORMING'),
        CREATING_RESOURCES : new Enumeration(3, 'CREATING_RESOURCES'),
        READY : new Enumeration(4, 'READY'),
        TRANSITIONING : new Enumeration(5, 'TRANSITIONING'),
        FAILED : new Enumeration(6, 'FAILED'),
        INVALID : new Enumeration(7, 'INVALID'),

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