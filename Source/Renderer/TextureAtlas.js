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

    /**
     * A TextureAtlas stores multiple images in one large texture and keeps
     * track of the texture coordinates for each image. TextureAtlas is dynamic,
     * meaning new images can be added at any point in time.
     *
     * @name TextureAtlas
     *
     * @param {Context} context The context that will be used to create the texture.
     * @param {PixelFormat}[pixelFormat = PixelFormat.RGBA] Pixel format for the texture atlas.
     * @param {Number}[borderWidthInPixels = 1] Spacing in pixels between adjacent images.
     * @param {Number}[scalingFactor = 2] Amount of padding added to the texture atlas when the texture is rebuilt.
     * For example, if the texture atlas is constructed with an image of width and height 10 and scalingFactor of 2,
     * the final texture will be 20x20 with 75% of the atlas empty. Integer values only.
     * @param {Array} images An optional array of {@link Image} to be added to the texture atlas.
     * Calling addImages will have the same effect.
     *
     * @internalConstructor
     *
     * @exception {DeveloperError} context is required.
     * @exception {DeveloperError} borderWidthInPixels must be greater than or equal to zero.
     * @exception {DeveloperError} scalingFactor must be greater than or equal to one.
     */
    function TextureAtlas(context, pixelFormat, borderWidthInPixels, scalingFactor, images) {

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

        this._context = context;
        this._borderWidthInPixels = borderWidthInPixels;
        this._scalingFactor = scalingFactor;
        this._pixelFormat = pixelFormat;
        this._images = [];
        this._textureCoordinates = [];
        this._texture = undefined;
        this._root = undefined;

        this.addImages(images);
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

    // Local function.
    // createNewAtlas generates the initial texture and any successive textures that
    // need to be expanded to fit more images.
    var createNewAtlas = function (atlas, images) {

        //Clear arrays
        atlas._textureCoordinates = [];
        atlas._images = [];

        // Compute atlas size
        var atlasSize = (function(images) {
            var numberOfImages = images.length;
            var totalWidth = 0;
            var totalHeight = 0;
            for ( var i = 0; i < numberOfImages; ++i) {
                var image = images[i];
                totalWidth += image.width + atlas._borderWidthInPixels;
                totalHeight += image.height + atlas._borderWidthInPixels;
            }
            return atlas._scalingFactor * (Math.max(totalWidth, totalHeight) - atlas._borderWidthInPixels);
        }(images));

        // Destroy old texture.
        atlas._texture = atlas._texture && atlas._texture.destroy();

        // Create the texture with atlasSize.
        atlas._texture = atlas._context.createTexture2D({
            width : atlasSize,
            height : atlasSize,
            pixelFormat : atlas._pixelFormat
        });

        // Create new root node
        atlas._root = new TextureAtlasNode(0.0, atlasSize, 0.0, atlasSize);
    };

    // Local function.
    // A recursive function that finds the best place to insert
    // a new image based on existing image 'nodes'.
    // Inspired by: http://blackpawn.com/texts/lightmaps/default.html
    var addImageToNode = function (atlas, node, image) {

        //If node is not defined, return.
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

            // Vertical split
            if (widthDifference > heightDifference) {
                // left half
                node.child1 = new TextureAtlasNode(
                    node.x0,
                    node.x0 + image.width,
                    node.y0,
                    node.y1
                );
                // right half
                node.child2 = new TextureAtlasNode(
                    node.x0 + image.width + atlas._borderWidthInPixels,
                    node.x1,
                    node.y0,
                    node.y1
                );
            }
            // Horizontal split
            else {
                // top half
                node.child1 = new TextureAtlasNode(
                    node.x0,
                    node.x1,
                    node.y1 - image.height,
                    node.y1
                );
                // bottom half
                node.child2 = new TextureAtlasNode(
                    node.x0,
                    node.x1,
                    node.y0,
                    node.y1 - image.height - atlas._borderWidthInPixels
                );
            }

            return addImageToNode(atlas, node.child1, image);
        }

        // If not a leaf node
        return addImageToNode(atlas, node.child1, image) ||
               addImageToNode(atlas, node.child2, image);
    };

    /**
     * Adds an array of images to the texture atlas. Can be called any number of times.
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

        // Add images to the texture atlas.
        var numberOfImages = images.length;
        for (var i = 0; i < numberOfImages; ++i) {

            var image = images[i];
            var node = addImageToNode(this, this._root, image);

            // Found a node that can hold the image.
            if (typeof node !== 'undefined'){
                // Set node's ID to show it contains an image
                node.imageID = this._images.length;
                this._images.push(image);

                // Add texture coordinates and write to texture
                var atlasSize = this._texture.getWidth();
                this._textureCoordinates.push({
                    x0: node.x0 / atlasSize,
                    x1: node.x1 / atlasSize,
                    y0: node.y0 / atlasSize,
                    y1: node.y1 / atlasSize
                });
                this._texture.copyFrom(image, node.x0, node.y0);
            }
            // No node found, must [re]create texture atlas.
            else {
                var allImages = this._images.concat(images);
                createNewAtlas(this, allImages);
                this.addImages(allImages);
                break;
            }
        }
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
            this._textureCoordinates.push({
                // Lower Left
                x0 : baseRegion.x0 + (thisRegion.x / atlasSize),
                y0 : baseRegion.y1 - ((thisRegion.y + thisRegion.height) / atlasSize),

                // Upper Right
                x1 : baseRegion.x0 + ((thisRegion.x + thisRegion.width) / atlasSize),
                y1 : baseRegion.y1 - (thisRegion.y / atlasSize)
            });
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
     * Returns the array of images in the texture atlas
     * @memberof TextureAtlas
     */
    TextureAtlas.prototype.getImages = function() {
        return this._images;
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