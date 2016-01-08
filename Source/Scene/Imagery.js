/*global define*/
define([
        '../Core/defined',
        '../Core/destroyObject',
        './ImageryState'
    ], function(
        defined,
        destroyObject,
        ImageryState) {
    "use strict";

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
        this.credits = undefined;
        this.referenceCount = 0;

        if (!defined(rectangle) && imageryLayer.imageryProvider.ready) {
            var tilingScheme = imageryLayer.imageryProvider.tilingScheme;
            rectangle = tilingScheme.tileXYToRectangle(x, y, level);
        }

        this.rectangle = rectangle;
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

            destroyObject(this);

            return 0;
        }

        return this.referenceCount;
    };

    Imagery.prototype.processStateMachine = function(frameState) {
        if (this.state === ImageryState.UNLOADED) {
            this.state = ImageryState.TRANSITIONING;
            this.imageryLayer._requestImagery(this);
        }

        if (this.state === ImageryState.RECEIVED) {
            this.state = ImageryState.TRANSITIONING;
            this.imageryLayer._createTexture(frameState.context, this);
        }

        if (this.state === ImageryState.TEXTURE_LOADED) {
            this.state = ImageryState.TRANSITIONING;
            this.imageryLayer._reprojectTexture(frameState, this);
        }
    };

    return Imagery;
});
