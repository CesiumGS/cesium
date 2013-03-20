/*global define*/
define([
        '../Core/destroyObject',
        './ImageryState'
    ], function(
        destroyObject,
        ImageryState) {
    "use strict";

    /**
     * Stores details about a tile of imagery.
     *
     * @alias Imagery
     * @private
     */
    var Imagery = function(imageryLayer, x, y, level, extent) {
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
        this.referenceCount = 0;

        if (typeof extent === 'undefined' && imageryLayer.getImageryProvider().isReady()) {
            var tilingScheme = imageryLayer.getImageryProvider().getTilingScheme();
            extent = tilingScheme.tileXYToExtent(x, y, level);
        }

        this.extent = extent;
    };

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

            if (typeof this.parent !== 'undefined') {
                this.parent.releaseReference();
            }

            if (typeof this.image !== 'undefined' && typeof this.image.destroy !== 'undefined') {
                this.image.destroy();
            }

            if (typeof this.texture !== 'undefined' && typeof this.texture.destroy !== 'undefined') {
                this.texture.destroy();
            }

            destroyObject(this);

            return 0;
        }

        return this.referenceCount;
    };

    return Imagery;
});