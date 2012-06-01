/*global define*/
define([
        '../Core/Event',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Cartesian2',
        './PixelFormat'
    ], function(
        Event,
        DeveloperError,
        destroyObject,
        Cartesian2,
        PixelFormat) {
    "use strict";

    function SourceHolder(callbacks) {
        this.callbacks = callbacks;
        this.index = -1;
        this.loaded = false;
    }

    function getImageFromUrl(loadedCallback, url) {
        var image = new Image();
        image.onload = function() {
            loadedCallback(image);
        };

        //Only add the crossOrigin flag for non-data URLs
        if (url.substr(0, 5) !== "data:") {
            image.crossOrigin = '';
        }

        image.src = url;
    }

    /**
     * DOC_TBA
     *
     * @name TextureAtlas
     *
     * @param {Context} context The context that the created texture will be used by.
     * @param {Array} [images] DOC_TBA
     * @param {PixelFormat}[pixelFormat = PixelFormat.RGBA] DOC_TBA
     * @param {Number}[borderWidthInPixels = 1]  DOC_TBA
     *
     * @internalConstructor
     *
     * @exception {DeveloperError} context is required.
     * @exception {DeveloperError} borderWidthInPixels must be greater than or equal to zero.
     */
    function TextureAtlas(context, images, pixelFormat, borderWidthInPixels) {
        if (!context) {
            throw new DeveloperError("context is required.", "images");
        }

        borderWidthInPixels = (typeof borderWidthInPixels === "undefined") ? 1 : borderWidthInPixels;
        if (borderWidthInPixels < 0) {
            throw new DeveloperError("borderWidthInPixels must be greater than or equal to zero.", "borderWidthInPixels");
        }

        pixelFormat = (typeof pixelFormat === "undefined") ? PixelFormat.RGBA : pixelFormat;

        /**
         * The event that is fired whenever the texture or textureCoordinates have changed.
         *
         * @type Event
         *
         * @example
         * function textureChanged(atlas) {
         *     var newTexture = atlas.getTexture();
         *     var newTextureCoordinates = atlas.getTextureCoordinates();
         * }
         *
         * textureAtlas.textureAtlasChanged.addEventListener(textureChanged);
         * ...
         * textureAtlas.textureAtlasChanged.removeEventListener(textureChanged);
         */
        this.textureAtlasChanged = new Event();

        this._context = context;
        this._pixelFormat = pixelFormat;
        this._borderWidthInPixels = borderWidthInPixels;
        this._images = [];
        this._imagesHash = {};
        this._nextIndex = 0;
        this._recreateTexture = false;

        if (typeof images !== 'undefined' && images.length > 0) {
            for ( var i = 0, len = images.length; i < len; i++) {
                var image = images[i];
                var sourceHolder = new SourceHolder();
                sourceHolder.index = i;
                sourceHolder.loaded = true;
                this._imagesHash[image.src] = sourceHolder;
                this._images.push(image);
                this._nextIndex++;
            }
            this._createTexture();
        }
    }

    TextureAtlas.prototype._createTexture = function() {
        var thisImages = this._images;
        var thisBorderWidthInPixels = this._borderWidthInPixels;

        var annotatedImages = [];
        var numberOfImages = thisImages.length;
        var i;
        var image;

        for (i = 0; i < numberOfImages; ++i) {
            annotatedImages.push({
                image : thisImages[i],
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
                area += (image.width + thisBorderWidthInPixels) * (image.height + thisBorderWidthInPixels);
                maxWidth = Math.max(maxWidth, image.width);
            }

            return Math.max(Math.floor(Math.sqrt(area)), maxWidth + thisBorderWidthInPixels);
        }(thisImages, numberOfImages));

        var xOffset = 0;
        var yOffset = 0;
        var rowHeight = 0;
        var offsets = [];

        // PERFORMANCE_IDEA:  Pack more tightly using algorithm in:
        //     http://www-ui.is.s.u-tokyo.ac.jp/~takeo/papers/i3dg2001.pdf

        // Compute subrectangle positions and, finally, the atlas' height
        for (i = 0; i < numberOfImages; ++i) {
            image = annotatedImages[i].image;
            var widthIncrement = image.width + thisBorderWidthInPixels;

            if (xOffset + widthIncrement > atlasWidth) {
                xOffset = 0;
                yOffset += rowHeight + thisBorderWidthInPixels;
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
        var texture = this._context.createTexture2D({
            width : atlasWidth,
            height : atlasHeight,
            pixelFormat : this._pixelFormat
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

        this._texture = texture;
        this._textureCoordinates = textureCoordinates;

        this.textureAtlasChanged.raiseEvent(this);
    };

    /**
     * Adds the provided image to the atlas. The supplied callback is triggered with the
     * index of the texture once it is ready for use in the atlas.  If the atlas already
     * contains an image with the same idea, the callback is triggered immediately and
     * the atlas itself is unmodified.
     *
     * @memberof TextureAtlas
     *
     * @param {Image} image The image to add to the atlas.
     * @param {Function} textureAvailableCallback DOC_TBA.
     * @param {Object} [id] The id to use for the texture.  If none is provided the <code>image.src</code> property is used.
     *
     * @exception {DeveloperError} image is required.
     * @exception {DeveloperError} textureAvailableCallback is required.
     */
    TextureAtlas.prototype.addTexture = function(image, textureAvailableCallback, id) {
        if (typeof image === 'undefined') {
            throw new DeveloperError("image is required.", "image");
        }

        if (typeof textureAvailableCallback === 'undefined') {
            throw new DeveloperError("textureAvailableCallback is required.", "textureAvailableCallback");
        }

        this.addTextureFromFunction(id || image.src, function(callback) {
            callback(image);
        }, textureAvailableCallback);
    };

    /**
     * Retrieves the image from the specified url and adds it to the atlas.
     * The supplied callback is triggered with the index of the next texture.
     * If the url is already in the atlas, the atlas is unchanged and the callback
     * is triggered immediately.
     *
     * @memberof TextureAtlas
     *
     * @param {String} url The url of the image to add to the atlas.
     * @param {Function} textureAvailableCallback DOC_TBA.
     *
     * @exception {DeveloperError} url is required.
     * @exception {DeveloperError} textureAvailableCallback is required.
     */
    TextureAtlas.prototype.addTextureFromUrl = function(url, textureAvailableCallback) {
        if (typeof url === 'undefined') {
            throw new DeveloperError("url is required.", "url");
        }

        if (typeof textureAvailableCallback === 'undefined') {
            throw new DeveloperError("textureAvailableCallback is required.", "textureAvailableCallback");
        }

        this.addTextureFromFunction(url, getImageFromUrl, textureAvailableCallback);
    };

    /**
     * <p>
     * Checks the atlas for a texture with the supplied id, if the id does not
     * exist, the supplied callback is triggered to create it.  In either case,
     * once the image is in the atlas, the second supplied callback is triggered
     * with its index.
     * </p>
     *
     * <p>
     * This function is useful for dynamically generated textures that are shared
     * across many billboards.  Only the first billboard will actually create the texture
     * while subsequent billboards will re-use the existing one.  One example of this is
     * the LabelCollection, which uses the canvas to render individual letters and share
     * them across words.
     * </p>
     *
     * @memberof TextureAtlas
     *
     * @param {String} id The id of the image to add to the atlas.
     * @param {Function} getImageCallback DOC_TBA.
     * @param {Function} textureAvailableCallback DOC_TBA.
     *
     * @exception {DeveloperError} id is required.
     * @exception {DeveloperError} getImageCallback is required.
     * @exception {DeveloperError} textureAvailableCallback is required.
     */
    TextureAtlas.prototype.addTextureFromFunction = function(id, getImageCallback, textureAvailableCallback) {
        if (typeof id === 'undefined') {
            throw new DeveloperError("id is required.", "id");
        }

        if (typeof getImageCallback === 'undefined') {
            throw new DeveloperError("getImageCallback is required.", "getImageCallback");
        }

        if (typeof textureAvailableCallback === 'undefined') {
            throw new DeveloperError("textureAvailableCallback is required.", "textureAvailableCallback");
        }

        var sourceHolder = this._imagesHash[id];
        if (typeof sourceHolder !== 'undefined') {
            //we're already aware of this source
            if (sourceHolder.loaded) {
                //and it's already loaded, tell the callback what index to use
                textureAvailableCallback(sourceHolder.index);
            } else {
                //add the callback to be notified once it loads
                sourceHolder.callbacks.push(textureAvailableCallback);
            }
            return;
        }

        //not in atlas, create the source, which may be async
        this._imagesHash[id] = sourceHolder = new SourceHolder([textureAvailableCallback]);

        var that = this;
        getImageCallback(function(source) {
            //assign an index
            var index = sourceHolder.index = that._nextIndex++;

            //store the loaded source in the array and rebuild the atlas
            that._images[index] = source;
            that._recreateTexture = true;
            sourceHolder.loaded = true;

            // fire all callbacks with the index
            var callbacks = sourceHolder.callbacks;
            for ( var i = callbacks.length - 1; i > -1; i--) {
                callbacks[i](index, id);
            }
            sourceHolder.callbacks = undefined;
        }, id);
    };

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
            throw new DeveloperError("invalid image index.", "index");
        }
        var baseRegion = this._textureCoordinates[index];

        for ( var i = 0; i < numSubRegions; ++i) {
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

        this.textureAtlasChanged.raiseEvent(this);
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
        if (this._recreateTexture) {
            this._recreateTexture = false;
            this._createTexture();
        }
        return this._textureCoordinates;
    };

    /**
     * DOC_TBA
     * @memberof TextureAtlas
     */
    TextureAtlas.prototype.getTexture = function() {
        if (this._recreateTexture) {
            this._recreateTexture = false;
            this._createTexture();
        }
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