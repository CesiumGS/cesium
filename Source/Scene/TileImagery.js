/*global define*/
define([
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Cartesian2',
        '../Core/Ellipsoid',
        '../Core/Extent',
        './TileState'
    ], function(
        defaultValue,
        destroyObject,
        DeveloperError,
        CesiumMath,
        Cartesian2,
        Ellipsoid,
        Extent,
        TileState) {
    "use strict";

    var TileImagery = function(imageryLayer, x, y, level, textureTranslation, textureScale) {
        this.imageryLayer = imageryLayer;
        this.x = x;
        this.y = y;
        this.level = level;
        this.textureTranslation = textureTranslation;
        this.textureScale = textureScale;
        this.extent = imageryLayer.imageryProvider.tilingScheme.tileXYToExtent(x, y, level);

        this.state = TileState.UNLOADED;
        this.image = undefined;
        this.transformedImage = undefined;
        this.texture = undefined;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof Tile
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see Tile#destroy
     */
    TileImagery.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof Tile
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Tile#isDestroyed
     *
     * @example
     * tile = tile && tile.destroy();
     */
    TileImagery.prototype.destroy = function() {
        if (typeof this.image !== 'undefined' && typeof this.image.destroy !== 'undefined') {
            this.image.destroy();
        }
        this.image = undefined;

        if (typeof this.transformedImage !== 'undefined' && typeof this.transformedImage.destroy !== 'undefined') {
            this.transformedImage.destroy();
        }
        this.transformedImage = undefined;

        if (typeof this.texture !== 'undefined') {
            if (typeof this.texture.referenceCount !== 'undefined') {
                --this.texture.referenceCount;
                if (this.texture.referenceCount === 0) {
                    this.texture.destroy();
                }
            } else if (typeof this.texture.destroy !== 'undefined') {
                this.texture.destroy();
            }
            this.texture = undefined;
        }

        return destroyObject(this);
    };

    return TileImagery;
});