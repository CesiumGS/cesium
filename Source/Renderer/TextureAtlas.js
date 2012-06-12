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
     * is filled, TextureAtlas will silently generate a larger texture.
     *
     * @name TextureAtlas
     *
     * @param {Context} context The context that will be used to create the texture.
     * @param {PixelFormat}[pixelFormat = PixelFormat.RGBA] Pixel format for the texture atlas.
     * @param {Number}[borderWidthInPixels = 1] Spacing in pixels between adjacent images
     *
     * @internalConstructor
     *
     * @exception {DeveloperError} context is required.
     * @exception {DeveloperError} borderWidthInPixels must be greater than or equal to zero.
     */
    function TextureAtlas(context, pixelFormat, borderWidthInPixels) {

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

        this._context = context;
        this._borderWidthInPixels = borderWidthInPixels;
        this._pixelFormat = pixelFormat;
        this._images = [];
        this._textureCoordinates = [];
        this._texture = undefined;
        this._root = undefined;
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

        var self = this;

        // createNewAtlas generates the initial texture and any successive textures that
        // need to be expanded to fit more images.
        var createNewAtlas = function (images) {

            //Clear arrays
            self._textureCoordinates = [];
            self._images = [];

            // Compute atlas size
            var atlasSize = (function(images) {
                var numberOfImages = images.length;
                var totalWidth = 0;
                var totalHeight = 0;
                for ( var i = 0; i < numberOfImages; ++i) {
                    var image = images[i];
                    totalWidth += image.width + self._borderWidthInPixels;
                    totalHeight += image.height + self._borderWidthInPixels;
                }
                return Math.max(totalWidth, totalHeight) - self._borderWidthInPixels;
            }(images));

            // Destroy old texture.
            self._texture = self._texture && self._texture.destroy();

            // Create the texture with atlasSize.
            self._texture = self._context.createTexture2D({
                width : atlasSize,
                height : atlasSize,
                pixelFormat : self._pixelFormat
            });

            // Create new root node
            var root = {};
            root.x0 = 0.0;       // left
            root.y0 = 0.0;       // bottom
            root.x1 = atlasSize; // right
            root.y1 = atlasSize; // top
            self._root = root;
        };

        // A recursive function that finds the best place to insert
        // a new image based on existing image 'nodes'
        var addImageToNode = function(node, image) {

            //If node is not defined, return.
            if(typeof node === 'undefined') {
                return;
            }

            // If a leaf node
            if(typeof node.child1 === 'undefined' &&
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

                // Split the node into children
                node.child1 = {};
                node.child2 = {};

                // Vertical split
                if (widthDifference > heightDifference) {
                    // child1 - left half
                    node.child1.x0 = node.x0; // left
                    node.child1.x1 = node.x0 + image.width; // middle
                    node.child1.y0 = node.y0; // bottom
                    node.child1.y1 = node.y1; // top
                    // child2 - right half
                    node.child2.x0 = node.x0 + image.width + self._borderWidthInPixels; // middle
                    node.child2.x1 = node.x1; // right
                    node.child2.y0 = node.y0; // bottom
                    node.child2.y1 = node.y1; // top
                }

                // Horizontal split
                else {
                    // child1 - top half
                    node.child1.x0 = node.x0; // left
                    node.child1.x1 = node.x1; // right
                    node.child1.y0 = node.y1 - image.height; // middle
                    node.child1.y1 = node.y1; // top

                    // child2 - bottom half
                    node.child2.x0 = node.x0; // left
                    node.child2.x1 = node.x1; // right
                    node.child2.y0 = node.y0; // bottom
                    node.child2.y1 = node.y1 - image.height - self._borderWidthInPixels; // middle
                }

                return addImageToNode(node.child1, image);
            }

            // If not a leaf node
            return addImageToNode(node.child1, image) ||
                   addImageToNode(node.child2, image);
        };

        // Check if image array is valid.
        if (!images || (images.length < 1)) {
            throw new DeveloperError('images is required and must have length greater than zero.', 'images');
        }

        // Add images to the texture atlas.
        var numberOfImages = images.length;
        for (var i = 0; i < numberOfImages; ++i) {
            var image = images[i];
            var node = addImageToNode(this._root, image);

            // Found a node that can hold the image.
            if (typeof node !== 'undefined'){
                // Set node's ID to show it contains an image
                node.imageID = this._images.length;
                this._images.push(image);

                // Add texture coordinates and write to texture
                var atlasSize = this._texture.getWidth();
                this._textureCoordinates.push({
                    x0: node.x0 / atlasSize, // Left
                    x1: node.x1 / atlasSize, // Right
                    y0: node.y0 / atlasSize, // Bottom
                    y1: node.y1 / atlasSize  // Top
                });
                this._texture.copyFrom(image, node.x0, node.y0);
            }

            // No node found, must create or expand texture atlas.
            else
            {
                var allImages = this._images.concat(images);
                createNewAtlas(allImages);
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
     * @param {Array} subRegions A list of {@link Rectangle} sub-regions measured in pixels from the upper-left.
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
            throw new DeveloperError('invalid image index.', 'index');
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