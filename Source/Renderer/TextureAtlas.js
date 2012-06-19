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

    // Texture coordinates from 0.0 to 1.0
    function TextureCoordinate(bottomLeft, topRight) {
        this.bottomLeft = (typeof bottomLeft !== 'undefined') ? bottomLeft : new Cartesian2();
        this.topRight = (typeof topRight !== 'undefined') ? topRight : new Cartesian2();
    }

    // The atlas is made up of regions of space called nodes that contain images or child nodes.
    function TextureAtlasNode(bottomLeft, topRight, childNode1, childNode2, imageIndex) {
        this.bottomLeft = (typeof bottomLeft !== 'undefined') ? bottomLeft : new Cartesian2();
        this.topRight = (typeof topRight !== 'undefined') ? topRight : new Cartesian2();
        this.childNode1 = childNode1;
        this.childNode2 = childNode2;
        this.imageIndex = imageIndex;
    }

    /**
     * A TextureAtlas stores multiple images in one square texture and keeps
     * track of the texture coordinates for each image. TextureAtlas is dynamic,
     * meaning new images can be added at any point in time.
     * Calling addImages is more space-efficient than calling addImage multiple times.
     * Texture coordinates are subject to change if the texture atlas resizes, so it is
     * important to check {@link TextureAtlas#getNumberOfImages} before using old values.
     *
     * The texture atlas uses an object literal called description in its constructor.
     * description.context is the context in which the texture gets created.
     * description.pixelFormat is the pixel format of the texture.
     * description.borderWidthInPixels is the amount of spacing between adjacent images in pixels.
     * description.initialSize is the initial side length of the texture.
     * description.images is an optional array of images to be added to the atlas. Same as calling addImages(images).
     * description.image is an optional single image to be added to the atlas. Same as calling addImage(image).
     *
     * Default values for description:
     * context : undefined,
     * pixelFormat : PixelFormat.RGBA,
     * borderWidthInPixels : 1,
     * initialSize : 16,
     * images : undefined,
     * image : undefined
     *
     * @name TextureAtlas
     *
     * @param {Object} description Consists of values used to construct the texture atlas.
     *
     * @internalConstructor
     *
     * @exception {DeveloperError} context is required.
     * @exception {DeveloperError} borderWidthInPixels must be greater than or equal to zero.
     * @exception {DeveloperError} initialSize must be greater than zero.
     *
     */
    function TextureAtlas(description) {
        description = (typeof description !== 'undefined') ? description : {};
        var context = description.context;
        var pixelFormat = description.pixelFormat;
        var borderWidthInPixels = description.borderWidthInPixels;
        var initialSize = description.initialSize;
        var images = description.images;
        var image = description.image;

        // Context
        if (typeof context === 'undefined') {
            throw new DeveloperError('context is required.');
        }

        // Pixel Format
        pixelFormat = (typeof pixelFormat !== 'undefined') ? pixelFormat : PixelFormat.RGBA;

        // Border
        borderWidthInPixels = (typeof borderWidthInPixels !== 'undefined') ? borderWidthInPixels : 1.0;
        if (borderWidthInPixels < 0) {
            throw new DeveloperError('borderWidthInPixels must be greater than or equal to zero.');
        }

        // Initial size
        initialSize = (typeof initialSize !== 'undefined') ? initialSize : 16.0;
        if (initialSize < 1) {
            throw new DeveloperError('initialSize must be greater than zero.');
        }

        this._context = context;
        this._pixelFormat = pixelFormat;
        this._borderWidthInPixels = borderWidthInPixels;
        this._textureCoordinates = [];

        // Create initial texture and root.
        this._resizeAtlas(initialSize);

        // Add initial images if there are any.
        if (typeof images !== 'undefined' && (images.length > 0)) {
            this.addImages(images);
        }
        if (typeof image !== 'undefined') {
            this.addImage(image);
        }
    }

    // Builds a larger texture and copies the old texture into the new one.
    TextureAtlas.prototype._resizeAtlas = function (sizeIncrease) {
        // Determine new atlas size
        var numImages = this.getNumberOfImages();
        if(numImages > 0) {
            var oldAtlasSize = this._texture.getWidth();
            var scalingFactor = 2.0;
            var atlasSize = scalingFactor * (oldAtlasSize + sizeIncrease + this._borderWidthInPixels);
            var sizeRatio = oldAtlasSize / atlasSize;

            // Create new node structure, putting the old root node in the bottom left.
            var nodeBottomRight = new TextureAtlasNode(new Cartesian2(oldAtlasSize + this._borderWidthInPixels, 0.0), new Cartesian2(atlasSize, oldAtlasSize));
            var nodeBottomHalf = new TextureAtlasNode(new Cartesian2(0.0, 0.0), new Cartesian2(atlasSize, oldAtlasSize), this._root, nodeBottomRight);
            var nodeTopHalf = new TextureAtlasNode(new Cartesian2(0.0, oldAtlasSize + this._borderWidthInPixels), new Cartesian2(atlasSize, atlasSize));
            var nodeMain = new TextureAtlasNode(new Cartesian2(0.0, 0.0), new Cartesian2(atlasSize, atlasSize), nodeBottomHalf, nodeTopHalf);
            this._root = nodeMain;

            // Resize texture coordinates.
            for (var i = 0; i < this._textureCoordinates.length; i++) {
                var texCoord = this._textureCoordinates[i];
                if (typeof texCoord !== 'undefined') {
                    texCoord.bottomLeft.x *= sizeRatio;
                    texCoord.bottomLeft.y *= sizeRatio;
                    texCoord.topRight.x *= sizeRatio;
                    texCoord.topRight.y *= sizeRatio;
                }
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
            this._texture = newTexture;
        }
        else {
            var initialSize = sizeIncrease;
            this._texture = this._context.createTexture2D({width : initialSize, height : initialSize, pixelFormat : this._pixelFormat});
            this._root = new TextureAtlasNode(new Cartesian2(0.0, 0.0), new Cartesian2(initialSize, initialSize));
        }
    };

    // A recursive function that finds the best place to insert
    // a new image based on existing image 'nodes'.
    // Inspired by: http://blackpawn.com/texts/lightmaps/default.html
    TextureAtlas.prototype._findNode = function (node, image) {
        if (typeof node === 'undefined') {
            return undefined;
        }

        // If a leaf node
        if (typeof node.childNode1 === 'undefined' &&
            typeof node.childNode2 === 'undefined') {

            // Node already contains an image, don't add to it.
            if (typeof node.imageIndex !== 'undefined') {
                return undefined;
            }

            var nodeWidth = node.topRight.x - node.bottomLeft.x;
            var nodeHeight = node.topRight.y - node.bottomLeft.y;
            var widthDifference = nodeWidth - image.width;
            var heightDifference = nodeHeight - image.height;

            // Node is smaller than the image.
            if (widthDifference < 0 || heightDifference < 0) {
                return undefined;
            }

            // If the node is the same size as the image, return the node
            if (widthDifference === 0 && heightDifference === 0) {
                return node;
            }

            // Vertical split (childNode1 = left half, childNode2 = right half).
            if (widthDifference > heightDifference) {
                node.childNode1 = new TextureAtlasNode(new Cartesian2(node.bottomLeft.x, node.bottomLeft.y), new Cartesian2(node.bottomLeft.x + image.width, node.topRight.y));
                // Only make a second child if the border gives enough space.
                var childNode2BottomLeftX = node.bottomLeft.x + image.width + this._borderWidthInPixels;
                if (childNode2BottomLeftX < node.topRight.x) {
                    node.childNode2 = new TextureAtlasNode(new Cartesian2(childNode2BottomLeftX, node.bottomLeft.y), new Cartesian2(node.topRight.x, node.topRight.y));
                }
            }
            // Horizontal split (childNode1 = bottom half, childNode2 = top half).
            else {
                node.childNode1 = new TextureAtlasNode(new Cartesian2(node.bottomLeft.x, node.bottomLeft.y), new Cartesian2(node.topRight.x, node.bottomLeft.y + image.height));
                // Only make a second child if the border gives enough space.
                var childNode2BottomLeftY = node.bottomLeft.y + image.height + this._borderWidthInPixels;
                if (childNode2BottomLeftY < node.topRight.y) {
                    node.childNode2 = new TextureAtlasNode(new Cartesian2(node.bottomLeft.x, childNode2BottomLeftY), new Cartesian2(node.topRight.x, node.topRight.y));
                }
            }
            return this._findNode(node.childNode1, image);
        }

        // If not a leaf node
        return this._findNode(node.childNode1, image) ||
               this._findNode(node.childNode2, image);
    };

    // Adds image of given index to the texture atlas. Called from addImage and addImages.
    TextureAtlas.prototype._addImage = function(image, index) {
        var node = this._findNode(this._root, image);

        // Found a node that can hold the image.
        if (typeof node !== 'undefined'){
            node.imageIndex = index;

            // Add texture coordinate and write to texture
            var atlasSize = this._texture.getWidth();
            this._textureCoordinates[index] = new TextureCoordinate(
                new Cartesian2(node.bottomLeft.x / atlasSize, node.bottomLeft.y / atlasSize),
                new Cartesian2(node.topRight.x / atlasSize, node.topRight.y / atlasSize)
            );
            this._texture.copyFrom(image, node.bottomLeft.x, node.bottomLeft.y);
        }
        // No node found, must resize the texture atlas.
        else {
            var sizeIncrease = Math.max(image.height, image.width);
            this._resizeAtlas(sizeIncrease);
            this._addImage(image, index);
        }
    };

    /**
     * Adds an image to the texture atlas.
     * Calling addImages is more space-efficient than calling addImage multiple times.
     * Texture coordinates are subject to change if the texture atlas resizes, so it is
     * important to check {@link TextureAtlas#getNumberOfImages} before using old values.
     *
     * @memberof TextureAtlas
     *
     * @param {Image} image An {@link Image} to be added to the texture atlas.
     *
     * @returns {Number} The index of the newly added image.
     *
     * @exception {DeveloperError} image is required.
     * @exception {DeveloperError} maximum texture size exceeded.
     *
     * @see TextureAtlas#addImages
     *
     */
    TextureAtlas.prototype.addImage = function(image) {
        if (typeof image === 'undefined') {
            throw new DeveloperError('image is required.');
        }

        var index = this.getNumberOfImages();
        this._addImage(image, index);
        return index;
    };

    /**
     * Adds an array of images to the texture atlas.
     * Calling addImages is more space-efficient than calling addImage multiple times.
     * Texture coordinates are subject to change if the texture atlas resizes, so it is
     * important to check {@link TextureAtlas#getNumberOfImages} before using old values.
     *
     * @memberof TextureAtlas
     *
     * @param {Array} images An array of {@link Image} to be added to the texture atlas.
     *
     * @returns {Number} The first index of the newly added images.
     *
     * @exception {DeveloperError} images is required and must have length greater than zero.
     * @exception {DeveloperError} maximum texture size exceeded.
     *
     * @see TextureAtlas#addImage
     *
     */
    TextureAtlas.prototype.addImages = function(images) {
        // Check if image array is valid.
        if (typeof images === 'undefined' || (images.length < 1)) {
            throw new DeveloperError('images is required and must have length greater than zero.');
        }

        // Store images in containers that have an index.
        var i;
        var annotatedImages = [];
        var numberOfImages = images.length;
        var oldNumberOfImages = this.getNumberOfImages();
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
            this._addImage(annotatedImage.image, annotatedImage.index);
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
     * @returns {Number} The index of the first newly-added region.
     *
     * @exception {DeveloperError} invalid image index.
     */
    TextureAtlas.prototype.addSubRegions = function(index, subRegions) {
        var atlasSize = this._texture.getWidth();
        var numImages = this.getNumberOfImages();
        var numSubRegions = subRegions.length;

        if ((index < 0) || (index >= numImages)) {
            throw new DeveloperError('invalid image index.');
        }

        var baseRegion = this._textureCoordinates[index];
        for (var i = 0; i < numSubRegions; ++i) {
            var thisRegion = subRegions[i];
            this._textureCoordinates.push(new TextureCoordinate(
                new Cartesian2(
                    baseRegion.bottomLeft.x + (thisRegion.x / atlasSize),
                    baseRegion.bottomLeft.y + (thisRegion.y / atlasSize)
                ),
                new Cartesian2(
                    baseRegion.bottomLeft.x + ((thisRegion.x + thisRegion.width) / atlasSize),
                    baseRegion.bottomLeft.y + ((thisRegion.y + thisRegion.height) / atlasSize)
                )
            ));
        }
        return numImages;
    };

    /**
     * Returns the amount of spacing between adjacent images in pixels.
     *
     * @memberof TextureAtlas
     *
     * @returns {Number} The border width in pixels.
     */
    TextureAtlas.prototype.getBorderWidthInPixels = function() {
        return this._borderWidthInPixels;
    };

    /**
     * Returns an array of texture coordinates for all the images is the texture atlas.
     * A texture coordinate is composed of {@link Cartesian2} bottomLeft and topRight members.
     * The coordinates are in the order that the corresponding images were added to the atlas.
     *
     * @memberof TextureAtlas
     *
     * @returns {Array} The texture coordinates.
     *
     * @see Cartesian2
     */
    TextureAtlas.prototype.getTextureCoordinates = function() {
        return this._textureCoordinates;
    };

    /**
     * Returns the texture that all of the images are being written to.
     *
     * @memberof TextureAtlas
     *
     * @returns {@link Texture} The texture used by the texture atlas.
     */
    TextureAtlas.prototype.getTexture = function() {
        return this._texture;
    };

    /**
     * Returns the number of images in the texture atlas. This value increases
     * every time addImage or addImages is called.
     * Texture coordinates are subject to change if the texture atlas resizes, so it is
     * important to check {@link TextureAtlas#getNumberOfImages} before using old values.
     *
     * @memberof TextureAtlas
     *
     * @returns {Number} The number of images in the texture atlas.
     */
    TextureAtlas.prototype.getNumberOfImages = function() {
        return this._textureCoordinates.length;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof TextureAtlas
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
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
     * @returns {undefined}
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