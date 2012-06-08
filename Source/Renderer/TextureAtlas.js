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
     * meaning new images can be added at any point in time. If the initial texture
     * is filled, TextureAtlas will automatically generate a larger texture.
     *
     * @name TextureAtlas
     *
     * @param {Context} context The context that will be used to create the texture.
     * @param {PixelFormat}[pixelFormat = PixelFormat.RGBA] Pixel format for the texture atlas.
     * @param {Number}[borderWidthInPixels = 1] Spacing between adjacent images in pixels
     * @param {Number}[initialTextureSize = 512] The side length of the texture atlas.
     * The texture will automatically grow if the initial texture size is exceeded.
     *
     * @internalConstructor
     *
     * @exception {DeveloperError} context is required.
     * @exception {DeveloperError} borderWidthInPixels must be greater than or equal to zero.
     * @exception {DeveloperError} initialTextureSize must be greater than zero.
     */
    function TextureAtlas(context, pixelFormat, borderWidthInPixels, initialTextureSize) {
        // Context
        if (!context) {
            throw new DeveloperError('context is required.', 'context');
        }

        // Pixel Format
        pixelFormat = (typeof pixelFormat === 'undefined') ? PixelFormat.RGBA : pixelFormat;

        // Border
        borderWidthInPixels = (typeof borderWidthInPixels === 'undefined') ? 1 : borderWidthInPixels;
        if (borderWidthInPixels < 0) {
            throw new DeveloperError('borderWidthInPixels must be greater than or equal to zero.', 'borderWidthInPixels');
        }

        // Initial texture Size
        initialTextureSize = (typeof initialTextureSize === 'undefined') ? 512 : initialTextureSize;
        if(initialTextureSize < 1) {
            throw new DeveloperError('initialTextureSize must be greater than zero.', 'initialTextureSize');
        }

        // Create the initial texture with initialTextureSize.
        var texture = context.createTexture2D({
            width : initialTextureSize,
            height : initialTextureSize,
            pixelFormat : pixelFormat
        });

        // Top-most node in the atlas
        var root = {};
        root.x0 = 0.0;
        root.x1 = initialTextureSize - 1.0;
        root.y0 = 0.0;
        root.y1 = initialTextureSize - 1.0;

        this._context = context;
        this._borderWidthInPixels = borderWidthInPixels;
        this._texture = texture;
        this._textureCoordinates = [];
        this._root = root;
    }

    /**
     * Adds a list of images to the texture atlas. Can be called multiple times with any number
     * of images. The texture atlas will dynamically resize if the current texture runs out of space.
     *
     * @memberof TextureAtlas
     *
     * @param {Array} images A list of {@link Image} to be added to the texture atlas.
     *
     * @exception {DeveloperError} images is required and must have length greater than zero.
     */
    TextureAtlas.prototype.addImages = function(images) {
        // Images
        if (!images || (images.length < 1)) {
            throw new DeveloperError('images is required and must have length greater than zero.', 'images');
        }

        // Sort images by maximum to minimum area
        images.sort(function(image1, image2) {
            return image1.height * image1.width -
                   image2.height * image2.width;
        });

        // A recursive function that finds the best place to insert
        // a new image based on existing image 'nodes'
        var addImageToNode = function(node, image, borderWidth) {
            // If a leaf node
            if(typeof node.child1 === 'undefined' &&
               typeof node.child2 === 'undefined') {

                // Node already contains an image, don't add to it.
                if (typeof node.imageID !== 'undefined') {
                    return;
                }

                var nodeWidth = node.x1 - node.x0 + 1;
                var nodeHeight = node.y1 - node.y0 + 1;
                var widthDifference = nodeWidth - image.width;
                var heightDifference = nodeHeight - image.height;

                // Node is smaller than the image.
                if (widthDifference < 0 && heightDifference < 0) {
                    return;
                }

                // If the node is the same size as the image, return the node
                if (widthDifference === 0 && heightDifference === 0) {
                    return node;
                }

                // Split the node into children
                node.child1 = {};
                node.child2 = {};

                // Vertical split
                if (widthDifference > heightDifference) {
                    // child1
                    node.child1.x0 = node.x0; // left
                    node.child1.x1 = node.x0 + image.width - 1; // middle
                    node.child1.y0 = node.y0; // top
                    node.child1.y1 = node.y1; // bottom
                    // child2
                    node.child2.x0 = node.x0 + image.width + borderWidth; // middle
                    node.child2.x1 = node.x1; // right
                    node.child2.y0 = node.y0; // top
                    node.child2.y1 = node.y1; // bottom
                }
                // Horizontal split
                else {
                    // child1
                    node.child1.x0 = node.x0; // left
                    node.child1.x1 = node.x1; // right
                    node.child1.y0 = node.y0; // top
                    node.child1.y1 = node.y0 + image.height - 1; // middle
                    // child2
                    node.child2.x0 = node.x0; // left
                    node.child2.x1 = node.x1; // right
                    node.child2.y0 = node.y0 + image.height + borderWidth; // middle
                    node.child2.y1 = node.y1; // bottom
                }

                return addImageToNode(node.child1, image, borderWidth);
            }

            // If not a leaf node
            var newNode = addImageToNode(node.child1, image, borderWidth);
            if (typeof newNode === 'undefined') {
                newNode = addImageToNode(node.child2, image, borderWidth);
            }
            return newNode;
        };

        // Add all images in the list
        var i;
        var numberOfImages = images.length;
        var atlasSize = this._texture.getWidth();
        for (i = 0; i < numberOfImages; ++i) {
            var image = images[i];
            var node = addImageToNode(this._root, image, this._borderWidthInPixels);
            if (typeof node !== 'undefined'){
                node.imageID = this._textureCoordinates.length - 1;
                this._textureCoordinates.push({
                    x0: node.x0 / atlasSize,
                    x1: node.x1 / atlasSize,
                    y0: node.y0 / atlasSize,
                    y1: node.y1 / atlasSize
                });
                this._texture.copyFrom(image, node.x0, node.y0);
            }
            else
            {
                // Make texture bigger!
            }
        }
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
            throw new DeveloperError('invalid image index.', 'index');
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
     * Returns the spacing between adjacent images in pixels
     * @memberof TextureAtlas
     */
    TextureAtlas.prototype.getBorderWidthInPixels = function() {
        return this._borderWidthInPixels;
    };

    /**
     * Returns a list of texture coordinates for all the images is the texture atlas.
     * The list is in the order images were added to the atlas.
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