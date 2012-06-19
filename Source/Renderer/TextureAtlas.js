/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Cartesian2',
        './PixelFormat'
    ], function(
        DeveloperError,
        destroyObject,
        Cartesian2,
        PixelFormat) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @name TextureAtlas
     *
     * @param {Context} context The context that the created texture will be used by.
     * @param {Array} images DOC_TBA
     * @param {PixelFormat}[pixelFormat = PixelFormat.RGBA] DOC_TBA
     * @param {Number}[borderWidthInPixels = 1]  DOC_TBA
     *
     * @internalConstructor
     *
     * @exception {DeveloperError} context is required.
     * @exception {DeveloperError} images is required and must have length greater than zero.
     * @exception {DeveloperError} borderWidthInPixels must be greater than or equal to zero.
     */
    function TextureAtlas(context, images, pixelFormat, borderWidthInPixels) {
        if (!context) {
            throw new DeveloperError('context is required.');
        }

        if (!images || (images.length < 1)) {
            throw new DeveloperError('images is required and must have length greater than zero.');
        }

        pixelFormat = (typeof pixelFormat === 'undefined') ? PixelFormat.RGBA : pixelFormat;
        borderWidthInPixels = (typeof borderWidthInPixels === 'undefined') ? 1 : borderWidthInPixels;

        if (borderWidthInPixels < 0) {
            throw new DeveloperError('borderWidthInPixels must be greater than or equal to zero.');
        }

        var annotatedImages = [];
        var numberOfImages = images.length;
        var i;
        var image;

        for (i = 0; i < numberOfImages; ++i) {
            annotatedImages.push({
                image : images[i],
                index : i
            });
        }

        // Sort images by maximum to minimum height
        annotatedImages.sort(function(left, right) {
            return right.image.height - left.image.height;
        });

        // Heuristically compute atlas width to keep texture relatively square
        var atlasWidth = (function(images, numberOfImages) {
            var maxWidth = 0;
            var area = 0;
            for ( var i = 0; i < numberOfImages; ++i) {
                var image = images[i];
                area += (image.width + borderWidthInPixels) * (image.height + borderWidthInPixels);
                maxWidth = Math.max(maxWidth, image.width);
            }

            return Math.max(Math.floor(Math.sqrt(area)), maxWidth + borderWidthInPixels);
        }(images, numberOfImages));

        var xOffset = 0;
        var yOffset = 0;
        var rowHeight = 0;
        var offsets = [];

        // PERFORMANCE_IDEA:  Pack more tightly using algorithm in:
        //     http://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/i3dg2001.pdf

        // Compute subrectangle positions and, finally, the atlas' height
        for (i = 0; i < numberOfImages; ++i) {
            image = annotatedImages[i].image;
            var widthIncrement = image.width + borderWidthInPixels;

            if (xOffset + widthIncrement > atlasWidth) {
                xOffset = 0;
                yOffset += rowHeight + borderWidthInPixels;
            }

            if (xOffset === 0) {
                // The first bitmap of the row determines the row height.
                // This is worst case since bitmaps are sorted by height.
                rowHeight = image.height;
            }

            offsets.push(new Cartesian2(xOffset, yOffset));
            xOffset += widthIncrement;
        }
        var atlasHeight = yOffset + rowHeight;

        // Write images into a texture, saving the texture coordinates rectangle for each
        var textureCoordinates = [];
        var texture = context.createTexture2D({
            width : atlasWidth,
            height : atlasHeight,
            pixelFormat : pixelFormat
        });

        for (i = 0; i < numberOfImages; ++i) {
            var lowerLeft = offsets[i];
            image = annotatedImages[i];

            textureCoordinates[image.index] = {
                // Lower Left
                x0 : lowerLeft.x / atlasWidth,
                y0 : lowerLeft.y / atlasHeight,

                // Upper Right
                x1 : (lowerLeft.x + image.image.width) / atlasWidth,
                y1 : (lowerLeft.y + image.image.height) / atlasHeight
            };

            texture.copyFrom(image.image, lowerLeft.x, lowerLeft.y);
        }

        this._context = context;
        this._borderWidthInPixels = borderWidthInPixels;
        this._texture = texture;
        this._textureCoordinates = textureCoordinates;
    }

    /**
     * Add a set of sub-regions of one atlas image as additional image indices.
     *
     * @memberof TextureAtlas
     *
     * @param {Number} index The index of the source image that will be broken into sub-regions.
     * @param {Array} subRegions A list of {@link Rectangle} sub-regions measured in pixels from the upper-left.
     *
     * @return {Number} The index of the first newly-added region.
     *
     * @exception {DeveloperError} invalid image index.
     */
    TextureAtlas.prototype.addSubRegions = function(index, subRegions) {
        var atlasWidth = this._texture.getWidth();
        var atlasHeight = this._texture.getHeight();
        var numTextureCoordinates = this._textureCoordinates.length;
        var numSubRegions = subRegions.length;

        if ((index < 0) || (index >= numTextureCoordinates)) {
            throw new DeveloperError('invalid image index.');
        }
        var baseRegion = this._textureCoordinates[index];

        for (var i = 0; i < numSubRegions; ++i) {
            var thisRegion = subRegions[i];
            this._textureCoordinates.push({
                // Lower Left
                x0 : baseRegion.x0 + (thisRegion.x / atlasWidth),
                y0 : baseRegion.y1 - ((thisRegion.y + thisRegion.height) / atlasHeight),

                // Upper Right
                x1 : baseRegion.x0 + ((thisRegion.x + thisRegion.width) / atlasWidth),
                y1 : baseRegion.y1 - (thisRegion.y / atlasHeight)
            });
        }

        return numTextureCoordinates;
    };

    /**
     * DOC_TBA
     * @memberof TextureAtlas
     */
    TextureAtlas.prototype.getBorderWidthInPixels = function() {
        return this._borderWidthInPixels;
    };

    /**
     * DOC_TBA
     * @memberof TextureAtlas
     */
    TextureAtlas.prototype.getTextureCoordinates = function() {
        return this._textureCoordinates;
    };

    /**
     * DOC_TBA
     * @memberof TextureAtlas
     */
    TextureAtlas.prototype.getTexture = function() {
        return this._texture;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof TextureAtlas
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see TextureAtlas#destroy
     */
    TextureAtlas.prototype.isDestroyed = function() {
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
     * @memberof TextureAtlas
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see TextureAtlas#isDestroyed
     *
     * @example
     * atlas = atlas && atlas.destroy();
     */
    TextureAtlas.prototype.destroy = function() {
        this._texture = this._texture && this._texture.destroy();
        return destroyObject(this);
    };

    return TextureAtlas;
});