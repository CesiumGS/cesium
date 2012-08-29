/*global define*/
define([
        '../Core/destroyObject',
        './ImageryState'
    ], function(
        destroyObject,
        ImageryState) {
    "use strict";

    var Imagery = function(imageryLayer, x, y, level) {
        this.imageryLayer = imageryLayer;
        this.x = x;
        this.y = y;
        this.level = level;
        this.extent = imageryLayer.imageryProvider.getTilingScheme().tileXYToExtent(x, y, level);

        this.state = ImageryState.UNLOADED;
        this.imageUrl = undefined;
        this.image = undefined;
        this.texture = undefined;
        this.referenceCount = 0;
    };

    Imagery.prototype.addReference = function() {
        ++this.referenceCount;
    };

    Imagery.prototype.releaseReference = function() {
        --this.referenceCount;

        if (this.referenceCount === 0) {
            this.imageryLayer.removeImageryFromCache(this);

            if (typeof this.image !== 'undefined' && typeof this.image.destroy !== 'undefined') {
                this.image.destroy();
            }
            if (typeof this.transformedImage !== 'undefined' && typeof this.transformedImage.destroy !== 'undefined') {
                this.transformedImage.destroy();
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