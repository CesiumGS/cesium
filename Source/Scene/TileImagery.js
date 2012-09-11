/*global define*/
define(function() {
    "use strict";

    var TileImagery = function(imagery, textureCoordinateExtent) {
        this.imagery = imagery;
        this.textureCoordinateExtent = textureCoordinateExtent;
        this.originalImagery = undefined;
        this.textureTranslationAndScale = undefined;
    };

    TileImagery.prototype.freeResources = function() {
        this.imagery.releaseReference();

        if (typeof this.originalImagery !== 'undefined') {
            this.originalImagery.releaseReference();
        }
    };

    return TileImagery;
});