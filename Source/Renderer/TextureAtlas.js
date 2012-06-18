/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        './PixelFormat'
    ], function(
        DeveloperError,
        destroyObject,
        PixelFormat) {
    "use strict";

    function TextureCoordinate(x0, x1, y0, y1) {
        this.x0 = x0 || 0.0; // Left
        this.x1 = x1 || 0.0; // Right
        this.y0 = y0 || 0.0; // Bottom
        this.y1 = y1 || 0.0; // Top
    }

    function TextureAtlasNode(x0, x1, y0, y1, child1, child2, imageID) {
        this.x0 = x0 || 0.0; // Left
        this.x1 = x1 || 0.0; // Right
        this.y0 = y0 || 0.0; // Bottom
        this.y1 = y1 || 0.0; // Top
        this.child1 = child1;
        this.child2 = child2;
        this.imageID = imageID;
    }

    /**
     * A TextureAtlas stores multiple images in one large texture and keeps
     * track of the texture coordinates for each image. TextureAtlas is dynamic,
     * meaning new images can be added at any point in time. For best performance
     * and minimum atlas size, call addImages instead of multiple addImage in a row.
     *
     * @name TextureAtlas
     *
     * @param {Context} context The context that will be used to create the texture.
     * @param {Array} images An optional array of {@link Image} to be added to the texture atlas. Equivalent to
     * calling addImages.
     * @param {PixelFormat}[pixelFormat = PixelFormat.RGBA] Pixel format for the texture atlas.
     * @param {Number}[borderWidthInPixels = 1] Spacing in pixels between adjacent images.
     * @param {Number}[scalingFactor = 2] Amount of padding added to the texture atlas when the texture is rebuilt.
     * For example, if the texture atlas is constructed with an image of width and height 10 and scalingFactor of 2,
     * the final texture will be 20x20 with 75% of the atlas empty. Integer values only.
     *
     * @internalConstructor
     *
     * @exception {DeveloperError} context is required.
     * @exception {DeveloperError} images is required and must have length greater than zero.
     * @exception {DeveloperError} borderWidthInPixels must be greater than or equal to zero.
     * @exception {DeveloperError} scalingFactor must be greater than or equal to one.
     */
    function TextureAtlas(context, images, pixelFormat, borderWidthInPixels, scalingFactor) {

        // Context
        if (typeof context === 'undefined') {
            throw new DeveloperError('context is required.');
        }

        // Pixel Format
        pixelFormat = (typeof pixelFormat === 'undefined') ? PixelFormat.RGBA : pixelFormat;

        // Border
        borderWidthInPixels = (typeof borderWidthInPixels === 'undefined') ? 1 : borderWidthInPixels;
        if (borderWidthInPixels < 0) {
            throw new DeveloperError('borderWidthInPixels must be greater than or equal to zero.');
        }

        // Scaling Factor
        scalingFactor = (typeof scalingFactor === 'undefined') ? 2 : Math.floor(scalingFactor);
        if (scalingFactor < 1) {
            throw new DeveloperError('scalingFactor must be greater than or equal to one.');
        }

        // Initial values
        this._context = context;
        this._borderWidthInPixels = borderWidthInPixels;
        this._scalingFactor = scalingFactor;
        this._pixelFormat = pixelFormat;
        this._textureCoordinates = [];
        this._texture = undefined;
        this._root = undefined;

        // Add initial images if there are any.
        if (typeof images !== 'undefined' && (images.length > 0)) {
            this.addImages(images);
        }
    }

    // Private function.
    // _createNewAtlas generates the initial texture atlas.
    TextureAtlas.prototype._createNewAtlas = function (images) {
        // Compute atlas size
        var that = this;
        var atlasSize = (function(images) {
            var numberOfImages = images.length;
            var totalWidth = 0;
            var totalHeight = 0;
            for ( var i = 0; i < numberOfImages; ++i) {
                var image = images[i];
                totalWidth += image.width;
                totalHeight += image.height;
            }
            var borderSize = (numberOfImages - 1.0) * that._borderWidthInPixels;
            return that._scalingFactor * (borderSize + Math.max(totalWidth, totalHeight));
        }(images));

        // Create the texture with atlasSize.
        this._texture = this._context.createTexture2D({
            width : atlasSize,
            height : atlasSize,
            pixelFormat : this._pixelFormat
        });

        // Create new root node
        this._root = new TextureAtlasNode(0.0, atlasSize, 0.0, atlasSize);
    };

    // Private function.
    // _resizeAtlas builds a larger texture and copies the old texture to the new one.
    TextureAtlas.prototype._resizeAtlas = function (sizeIncrease) {
        // Determine new atlas size
        var oldAtlasSize = this._texture.getWidth();
        var atlasSize = this._scalingFactor * (oldAtlasSize + sizeIncrease + this._borderWidthInPixels);
        var sizeRatio = oldAtlasSize / atlasSize;

        // Create new node structure, putting the old root node in the bottom left.
        var nodeBottomRight = new TextureAtlasNode(oldAtlasSize + this._borderWidthInPixels, atlasSize, 0.0, oldAtlasSize);
        var nodeBottomHalf = new TextureAtlasNode(0.0, atlasSize, 0.0, oldAtlasSize, nodeBottomRight, this._root);
        var nodeTopHalf = new TextureAtlasNode(0.0, atlasSize, oldAtlasSize + this._borderWidthInPixels, atlasSize);
        var nodeMain = new TextureAtlasNode(0.0, atlasSize, 0.0, atlasSize, nodeTopHalf, nodeBottomHalf);
        this._root = nodeMain;

        // Resize texture coordinates.
        var i;
        var numImages = this.getNumImages();
        for (i = 0; i < numImages; i++) {
            var texCoord = this._textureCoordinates[i];
            texCoord.x0 *= sizeRatio;
            texCoord.x1 *= sizeRatio;
            texCoord.y0 *= sizeRatio;
            texCoord.y1 *= sizeRatio;
        }

        // Copy larger texture.
        var newTexture = this._context.createTexture2D({
            width : atlasSize,
            height : atlasSize,
            pixelFormat : this._pixelFormat
        });

        // Copy old texture into new using an fbo.
        var framebuffer = this._context.createFramebuffer({colorTexture:this._texture});
        framebuffer._bind();
        newTexture.copyFromFramebuffer(0, 0, 0, 0, oldAtlasSize, oldAtlasSize);
        framebuffer._unBind();
        framebuffer.destroy();

        // Set new texture.
        this._texture = newTexture;
    };

    // Private function.
    // A recursive function that finds the best place to insert
    // a new image based on existing image 'nodes'.
    // Inspired by: http://blackpawn.com/texts/lightmaps/default.html
    TextureAtlas.prototype._addImageToNode = function (node, image) {

        // If node is not defined, return.
        if (typeof node === 'undefined') {
            return;
        }

        // If a leaf node
        if (typeof node.child1 === 'undefined' &&
            typeof node.child2 === 'undefined') {

            // Node already contains an image, don't add to it.
            if (typeof node.imageID !== 'undefined') {
                return;
            }

            var nodeWidth = node.x1 - node.x0;
            var nodeHeight = node.y1 - node.y0;
            var widthDifference = nodeWidth - image.width;
            var heightDifference = nodeHeight - image.height;

            // Node is smaller than the image.
            if (widthDifference < 0 || heightDifference < 0) {
                return;
            }

            // If the node is the same size as the image, return the node
            if (widthDifference === 0 && heightDifference === 0) {
                return node;
            }

            // Vertical split (child1 = left half, child2 = right half).
            var bw = this._borderWidthInPixels;
            if (widthDifference > heightDifference) {
                node.child1 = new TextureAtlasNode(node.x0, node.x0 + image.width, node.y0, node.y1);
                node.child2 = new TextureAtlasNode(node.x0 + image.width + bw, node.x1, node.y0, node.y1);
            }
            // Horizontal split (child1 = bottom half, child2 = top half).
            else {
                node.child1 = new TextureAtlasNode(node.x0, node.x1, node.y0, node.y0 + image.height);
                node.child2 = new TextureAtlasNode(node.x0, node.x1, node.y0 + image.height + bw, node.y1);
            }

            return this._addImageToNode(node.child1, image);
        }

        // If not a leaf node
        return this._addImageToNode(node.child1, image) ||
               this._addImageToNode(node.child2, image);
    };

    /**
     * Adds an image to the texture atlas. Can be called any number of times.
     * Call addImages when adding multiple images at once.
     *
     * @memberof TextureAtlas
     *
     * @param {Image} image An {@link Image} to be added to the texture atlas.
     *
     * @exception {DeveloperError} image must be defined.
     */
    TextureAtlas.prototype.addImage = function(image) {
        // Check if the image is defined.
        if (typeof image === 'undefined') {
            throw new DeveloperError('image must be defined.');
        }

        // Create new atlas if it hasn't been created.
        if (typeof this._root === 'undefined') {
            this._createNewAtlas([image]);
        }

        var node = this._addImageToNode(this._root, image);
        var index = (typeof arguments[1] === 'undefined') ? this.getNumImages() : arguments[1];

        // Found a node that can hold the image.
        if (typeof node !== 'undefined'){
            // Set node's ID to show it contains an image
            node.imageID = index;

            // Add texture coordinates and write to texture
            var atlasSize = this._texture.getWidth();
            this._textureCoordinates[index] = new TextureCoordinate(
                node.x0 / atlasSize, // Left
                node.x1 / atlasSize, // Right
                node.y0 / atlasSize, // Bottom
                node.y1 / atlasSize // Top
            );
            this._texture.copyFrom(image, node.x0, node.y0);
        }
        // No node found, must resize the texture atlas.
        else {
            this._resizeAtlas(Math.max(image.height, image.width));
            this.addImage(image, index);
        }

        // Return the image's index.
        return index;
    };

    /**
     * Adds an array of images to the texture atlas. Can be called any number of times.
     * When adding multiple images to the atlas at once, addImages has better performance
     * than multiple calls to addImage.
     *
     * @memberof TextureAtlas
     *
     * @param {Array} images An array of {@link Image} to be added to the texture atlas.
     *
     * @exception {DeveloperError} images is required and must have length greater than zero.
     */
    TextureAtlas.prototype.addImages = function(images) {

        // Check if image array is valid.
        if (typeof images === 'undefined' || (images.length < 1)) {
            throw new DeveloperError('images is required and must have length greater than zero.');
        }

        // Create new atlas if it hasn't been created.
        if (typeof this._root === 'undefined') {
            this._createNewAtlas(images);
        }

        // Store images in containers that have index.
        var i;
        var annotatedImages = [];
        var numberOfImages = images.length;
        var oldNumberOfImages = this.getNumImages();
        for (i = 0; i < numberOfImages; ++i) {
            annotatedImages.push({
                image : images[i],
                index : i + oldNumberOfImages
            });
        }

        // Sort images by maximum to minimum side length.
        annotatedImages.sort(function(left, right) {
            return Math.max(right.image.height, right.image.width) -
                   Math.max(left.image.height, left.image.width);
        });

        // Add images to the texture atlas.
        for (i = 0; i < numberOfImages; ++i) {
            var annotatedImage = annotatedImages[i];
            this.addImage(annotatedImage.image, annotatedImage.index);
        }

        // Return index of the first added image.
        return oldNumberOfImages;
    };

    /**
     * Add a set of sub-regions of one atlas image as additional image indices.
     *
     * @memberof TextureAtlas
     *
     * @param {Number} index The index of the source image that will be broken into sub-regions.
     * @param {Array} subRegions An array of {@link Rectangle} sub-regions measured in pixels from the upper-left.
     *
     * @return {Number} The index of the first newly-added region.
     *
     * @exception {DeveloperError} invalid image index.
     */
    TextureAtlas.prototype.addSubRegions = function(index, subRegions) {
        var atlasSize = this._texture.getWidth();
        var numTextureCoordinates = this._textureCoordinates.length;
        var numSubRegions = subRegions.length;

        if ((index < 0) || (index >= numTextureCoordinates)) {
            throw new DeveloperError('invalid image index.');
        }
        var baseRegion = this._textureCoordinates[index];

        for (var i = 0; i < numSubRegions; ++i) {
            var thisRegion = subRegions[i];
            this._textureCoordinates.push(new TextureCoordinate(
                baseRegion.x0 + (thisRegion.x / atlasSize), // Left
                baseRegion.x0 + ((thisRegion.x + thisRegion.width) / atlasSize), // Right
                baseRegion.y1 - ((thisRegion.y + thisRegion.height) / atlasSize), // Bottom
                baseRegion.y1 - (thisRegion.y / atlasSize) // Top
            ));
        }

        return numTextureCoordinates;
    };

    /**
     * Returns the spacing between adjacent images in pixels
     * @memberof TextureAtlas
     */
    TextureAtlas.prototype.getBorderWidthInPixels = function() {
        return this._borderWidthInPixels;
    };

    /**
     * Returns an array of texture coordinates for all the images is the texture atlas.
     * The array is in the order that the corresponding images were added to the atlas.
     * @memberof TextureAtlas
     */
    TextureAtlas.prototype.getTextureCoordinates = function() {
        return this._textureCoordinates;
    };

    /**
     * Returns the texture that all of the images are being written to.
     * @memberof TextureAtlas
     */
    TextureAtlas.prototype.getTexture = function() {
        return this._texture;
    };

    /**
     * Returns the number of images in the texture atlas.
     * @memberof TextureAtlas
     */
    TextureAtlas.prototype.getNumImages = function() {
        return this._textureCoordinates.length;
    };

    /**
     * Returns the amount of padding added to the texture atlas when the texture is rebuilt.
     * For example, if the texture atlas is constructed with an image of width and height 10 and scalingFactor of 2,
     * the final texture will be 20x20 with 75% of the atlas empty. Integer values only.
     * @memberof TextureAtlas
     */
    TextureAtlas.prototype.getScalingFactor = function() {
        return this._scalingFactor;
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