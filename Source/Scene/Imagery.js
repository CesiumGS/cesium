import defined from '../Core/defined.js';
import destroyObject from '../Core/destroyObject.js';
import ImageryState from './ImageryState.js';
import ProjectedImageryTilingScheme from '../Core/ProjectedImageryTilingScheme.js';

    /**
     * Stores details about a tile of imagery.
     *
     * @alias Imagery
     * @private
     */
    function Imagery(imageryLayer, x, y, level, rectangle) {
        this.imageryLayer = imageryLayer;
        this.x = x;
        this.y = y;
        this.level = level;
        this.request = undefined;

        if (level !== 0) {
            var parentX = x / 2 | 0;
            var parentY = y / 2 | 0;
            var parentLevel = level - 1;
            this.parent = imageryLayer.getImageryFromCache(parentX, parentY, parentLevel);
        }

        this.state = ImageryState.UNLOADED;
        this.imageUrl = undefined;
        this.image = undefined;
        this.texture = undefined;
        this.textureWebMercator = undefined;
        this.credits = undefined;
        this.referenceCount = 0;

        if (!defined(rectangle) && imageryLayer.imageryProvider.ready) {
            var tilingScheme = imageryLayer.imageryProvider.tilingScheme;
            rectangle = tilingScheme.tileXYToRectangle(x, y, level);
        }

        this.rectangle = rectangle;

        this.projectedRectangles = [];
        this.projectedImages = [];
        this.projectedTextures = [];
    }
    Imagery.createPlaceholder = function(imageryLayer) {
        var result = new Imagery(imageryLayer, 0, 0, 0);
        result.addReference();
        result.state = ImageryState.PLACEHOLDER;
        return result;
    };

    Imagery.prototype.addReference = function() {
        ++this.referenceCount;
    };

    Imagery.prototype.releaseReference = function() {
        --this.referenceCount;

        if (this.referenceCount === 0) {
            this.imageryLayer.removeImageryFromCache(this);

            if (defined(this.parent)) {
                this.parent.releaseReference();
            }

            if (defined(this.image) && defined(this.image.destroy)) {
                this.image.destroy();
            }

            if (defined(this.texture)) {
                this.texture.destroy();
            }

            if (defined(this.textureWebMercator) && this.texture !== this.textureWebMercator) {
                this.textureWebMercator.destroy();
            }

            destroyObject(this);

            return 0;
        }

        return this.referenceCount;
    };

    Imagery.prototype.processStateMachine = function(frameState, needGeographicProjection, skipLoading) {
        var imageryLayer = this.imageryLayer;
        if (!imageryLayer.imageryProvider.ready) {
            return;
        }

        var tilingScheme = imageryLayer.imageryProvider.tilingScheme;
        var singleSource = !(tilingScheme instanceof ProjectedImageryTilingScheme);

        if (this.state === ImageryState.UNLOADED && !skipLoading) {
            this.state = ImageryState.TRANSITIONING;

            if (singleSource) {
                imageryLayer._requestImagery(this);
            } else {
                var level = this.level;
                var projectedIndices = tilingScheme.getProjectedTilesForNativeTile(this.x, this.y, level);
                var projectedTilesLength = projectedIndices.length * 0.5;

                var projectedRectangles = this.projectedRectangles;
                projectedRectangles.length = projectedTilesLength;
                this.projectedImages.length = projectedTilesLength;
                this.projectedTextures.length = projectedTilesLength;

                for (var i = 0; i < projectedTilesLength; i++) {
                    var index = i * 2;
                    var x = projectedIndices[index];
                    var y = projectedIndices[index + 1];
                    projectedRectangles[i] = tilingScheme.getProjectedTileProjectedRectangle(x, y, level, projectedRectangles[i]);
                }

                if (projectedTilesLength === 0) {
                    this.state = ImageryState.INVALID;
                    return;
                }

                imageryLayer._requestProjectedImages(this, projectedIndices, level, 0);
            }
        }

        if (this.state === ImageryState.RECEIVED) {
            this.state = ImageryState.TRANSITIONING;

            if (singleSource) {
                imageryLayer._createTexture(frameState.context, this);
            } else {
                imageryLayer._createMultipleTextures(frameState.context, this);
            }
        }

        // If the imagery is already ready, but we need a geographic version and don't have it yet,
        // we still need to do the reprojection step. This can happen if the Web Mercator version
        // is fine initially, but the geographic one is needed later.
        var needsReprojection = this.state === ImageryState.READY && needGeographicProjection && !this.texture;

        if (this.state === ImageryState.TEXTURE_LOADED || needsReprojection) {
            this.state = ImageryState.TRANSITIONING;

            if (singleSource) {
                imageryLayer._reprojectTexture(frameState, this, needGeographicProjection);
            } else {
                imageryLayer._multisourceReprojectTexture(frameState, this);
            }
        }
    };
export default Imagery;
