/*global define*/
define(function() {
    "use strict";

    /**
     * The assocation between a terrain tile and an imagery tile.
     *
     * @alias TileImagery
     * @private
     *
     * @param {Imagery} imagery The imagery tile.
     * @param {Cartesian4} textureCoordinateExtent The texture extent of the tile that is covered
     *        by the imagery, where X=west, Y=south, Z=east, W=north.
     */
    var TileImagery = function(imagery, textureCoordinateExtent) {
        this.imagery = imagery;
        this.textureCoordinateExtent = textureCoordinateExtent;
        this.originalImagery = undefined;
        this.textureTranslationAndScale = undefined;
    };

    /**
     * Frees the resources held by this instance.
     *
     * @memberof TileImagery
     */
    TileImagery.prototype.freeResources = function() {
        this.imagery.releaseReference();

        if (typeof this.originalImagery !== 'undefined') {
            this.originalImagery.releaseReference();
        }
    };

    return TileImagery;
});