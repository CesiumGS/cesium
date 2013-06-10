/*global define*/
define([
        './ImageryState'
    ], function(
        ImageryState) {
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
        this.readyImagery = undefined;
        this.loadingImagery = imagery;
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
        if (typeof this.readyImagery !== 'undefined') {
            this.readyImagery.releaseReference();
        }

        if (typeof this.loadingImagery !== 'undefined') {
            this.loadingImagery.releaseReference();
        }
    };

    TileImagery.prototype.processStateMachine = function(tile, context) {
        var loadingImagery = this.loadingImagery;
        var imageryLayer = loadingImagery.imageryLayer;

        if (loadingImagery.state === ImageryState.UNLOADED) {
            loadingImagery.state = ImageryState.TRANSITIONING;
            imageryLayer._requestImagery(loadingImagery);
        }

        if (loadingImagery.state === ImageryState.RECEIVED) {
            loadingImagery.state = ImageryState.TRANSITIONING;
            imageryLayer._createTexture(context, loadingImagery);
        }

        if (loadingImagery.state === ImageryState.TEXTURE_LOADED) {
            loadingImagery.state = ImageryState.TRANSITIONING;
            imageryLayer._reprojectTexture(context, loadingImagery);
        }

        if (loadingImagery.state === ImageryState.READY) {
            if (typeof this.readyImagery !== 'undefined') {
                this.readyImagery.releaseReference();
            }
            this.readyImagery = this.loadingImagery;
            this.loadingImagery = undefined;
            this.textureTranslationAndScale = imageryLayer._calculateTextureTranslationAndScale(tile, this);
            return true; // done loading
        }

        // Find some ancestor imagery we can use while this imagery is still loading.
        var ancestor = loadingImagery.parent;
        var isFirstNotFailedOrInvalid = true;
        while (typeof ancestor !== 'undefined' && ancestor.state !== ImageryState.READY) {
            isFirstNotFailedOrInvalid = isFirstNotFailedOrInvalid && (ancestor.state === ImageryState.FAILED || ancestor.state === ImageryState.INVALID);
            ancestor = ancestor.parent;
        }

        if (this.readyImagery !== ancestor && typeof ancestor !== 'undefined') {
            if (typeof this.readyImagery !== 'undefined') {
                this.readyImagery.releaseReference();
            }

            this.readyImagery = ancestor;
            this.readyImagery.addReference();

            this.textureTranslationAndScale = imageryLayer._calculateTextureTranslationAndScale(tile, this);
        }

        if (isFirstNotFailedOrInvalid && (loadingImagery.state === ImageryState.FAILED || loadingImagery.state === ImageryState.INVALID)) {
            // This imagery tile is failed or invalid, and we have the "best available" substitute.  So we're done loading.
            return true;
        }

        return false; // not done loading yet
    };

    return TileImagery;
});