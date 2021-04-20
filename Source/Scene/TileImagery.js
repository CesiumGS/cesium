import defined from '../Core/defined.js';
import ImageryState from './ImageryState.js';

    /**
     * The assocation between a terrain tile and an imagery tile.
     *
     * @alias TileImagery
     * @private
     *
     * @param {Imagery} imagery The imagery tile.
     * @param {Cartesian4} textureCoordinateRectangle The texture rectangle of the tile that is covered
     *        by the imagery, where X=west, Y=south, Z=east, W=north.
     * @param {Boolean} useWebMercatorT true to use the Web Mercator texture coordinates for this imagery tile.
     */
    function TileImagery(imagery, textureCoordinateRectangle, useWebMercatorT) {
        this.readyImagery = undefined;
        this.loadingImagery = imagery;
        this.textureCoordinateRectangle = textureCoordinateRectangle;
        this.textureTranslationAndScale = undefined;
        this.useWebMercatorT = useWebMercatorT;
    }

    /**
     * Frees the resources held by this instance.
     */
    TileImagery.prototype.freeResources = function() {
        if (defined(this.readyImagery)) {
            this.readyImagery.releaseReference();
        }

        if (defined(this.loadingImagery)) {
            this.loadingImagery.releaseReference();
        }
    };

    /**
     * Processes the load state machine for this instance.
     *
     * @param {Tile} tile The tile to which this instance belongs.
     * @param {FrameState} frameState The frameState.
     * @param {Boolean} skipLoading True to skip loading, e.g. new requests, creating textures. This function will
     *                  still synchronously process imagery that's already mostly ready to go, e.g. use textures
     *                  already loaded on ancestor tiles.
     * @returns {Boolean} True if this instance is done loading; otherwise, false.
     */
    TileImagery.prototype.processStateMachine = function(tile, frameState, skipLoading) {
        var loadingImagery = this.loadingImagery;
        var imageryLayer = loadingImagery.imageryLayer;

        loadingImagery.processStateMachine(frameState, !this.useWebMercatorT, skipLoading);

        if (loadingImagery.state === ImageryState.READY) {
            if (defined(this.readyImagery)) {
                this.readyImagery.releaseReference();
            }
            this.readyImagery = this.loadingImagery;
            this.loadingImagery = undefined;
            this.textureTranslationAndScale = imageryLayer._calculateTextureTranslationAndScale(tile, this);
            return true; // done loading
        }

        // Find some ancestor imagery we can use while this imagery is still loading.
        var ancestor = loadingImagery.parent;
        var closestAncestorThatNeedsLoading;
        while (defined(ancestor) && (ancestor.state !== ImageryState.READY || (!this.useWebMercatorT && !defined(ancestor.texture)))) {
            if (ancestor.state !== ImageryState.FAILED && ancestor.state !== ImageryState.INVALID) {
                // ancestor is still loading
                closestAncestorThatNeedsLoading = closestAncestorThatNeedsLoading || ancestor;
            }
            ancestor = ancestor.parent;
        }

        if (this.readyImagery !== ancestor) {
            if (defined(this.readyImagery)) {
                this.readyImagery.releaseReference();
            }

            this.readyImagery = ancestor;

            if (defined(ancestor)) {
                ancestor.addReference();
                this.textureTranslationAndScale = imageryLayer._calculateTextureTranslationAndScale(tile, this);
            }
        }

        if (loadingImagery.state === ImageryState.FAILED || loadingImagery.state === ImageryState.INVALID) {
            // The imagery tile is failed or invalid, so we'd like to use an ancestor instead.
            if (defined(closestAncestorThatNeedsLoading)) {
                // Push the ancestor's load process along a bit.  This is necessary because some ancestor imagery
                // tiles may not be attached directly to a terrain tile.  Such tiles will never load if
                // we don't do it here.
                closestAncestorThatNeedsLoading.processStateMachine(frameState, !this.useWebMercatorT, skipLoading);
                return false; // not done loading
            }
            // This imagery tile is failed or invalid, and we have the "best available" substitute.
            return true; // done loading
        }

        return false; // not done loading
    };
export default TileImagery;
