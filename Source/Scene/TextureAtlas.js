/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/Cartesian2',
        '../Core/createGuid',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/loadImage',
        '../Core/PixelFormat',
        '../Core/RuntimeError',
        '../ThirdParty/when'
    ], function(
        BoundingRectangle,
        Cartesian2,
        createGuid,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        loadImage,
        PixelFormat,
        RuntimeError,
        when) {
    "use strict";

    // The atlas is made up of regions of space called nodes that contain images or child nodes.
    function TextureAtlasNode(bottomLeft, topRight, childNode1, childNode2, imageIndex) {
        this.bottomLeft = defaultValue(bottomLeft, Cartesian2.ZERO);
        this.topRight = defaultValue(topRight, Cartesian2.ZERO);
        this.childNode1 = childNode1;
        this.childNode2 = childNode2;
        this.imageIndex = imageIndex;
    }

    var defaultInitialSize = new Cartesian2(16.0, 16.0);

    /**
     * A TextureAtlas stores multiple images in one square texture and keeps
     * track of the texture coordinates for each image. TextureAtlas is dynamic,
     * meaning new images can be added at any point in time.
     * Texture coordinates are subject to change if the texture atlas resizes, so it is
     * important to check {@link TextureAtlas#getGUID} before using old values.
     *
     * @alias TextureAtlas
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Scene} options.context The context in which the texture gets created.
     * @param {PixelFormat} [options.pixelFormat=PixelFormat.RGBA] The pixel format of the texture.
     * @param {Number} [options.borderWidthInPixels=1] The amount of spacing between adjacent images in pixels.
     * @param {Cartesian2} [options.initialSize=new Cartesian2(16.0, 16.0)] The initial side lengths of the texture.
     *
     * @exception {DeveloperError} borderWidthInPixels must be greater than or equal to zero.
     * @exception {DeveloperError} initialSize must be greater than zero.
     *
     * @private
     */
    var TextureAtlas = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var borderWidthInPixels = defaultValue(options.borderWidthInPixels, 1.0);
        var initialSize = defaultValue(options.initialSize, defaultInitialSize);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.context)) {
            throw new DeveloperError('context is required.');
        }
        if (borderWidthInPixels < 0) {
            throw new DeveloperError('borderWidthInPixels must be greater than or equal to zero.');
        }
        if (initialSize.x < 1 || initialSize.y < 1) {
            throw new DeveloperError('initialSize must be greater than zero.');
        }
        //>>includeEnd('debug');

        this._context = options.context;
        this._pixelFormat = defaultValue(options.pixelFormat, PixelFormat.RGBA);
        this._borderWidthInPixels = borderWidthInPixels;
        this._textureCoordinates = [];
        this._guid = createGuid();
        this._idHash = {};

        // Create initial texture and root.
        this._texture = this._context.createTexture2D({
            width : initialSize.x,
            height : initialSize.y,
            pixelFormat : this._pixelFormat
        });
        this._root = new TextureAtlasNode(new Cartesian2(), new Cartesian2(initialSize.x, initialSize.y));
    };

    defineProperties(TextureAtlas.prototype, {
        /**
         * The amount of spacing between adjacent images in pixels.
         * @memberof TextureAtlas.prototype
         * @type {Number}
         */
        borderWidthInPixels : {
            get : function() {
                return this._borderWidthInPixels;
            }
        },

        /**
         * An array of {@link BoundingRectangle} texture coordinate regions for all the images in the texture atlas.
         * The x and y values of the rectangle correspond to the bottom-left corner of the texture coordinate.
         * The coordinates are in the order that the corresponding images were added to the atlas.
         * @memberof TextureAtlas.prototype
         * @type {BoundingRectangle[]}
         */
        textureCoordinates : {
            get : function() {
                return this._textureCoordinates;
            }
        },

        /**
         * The texture that all of the images are being written to.
         * @memberof TextureAtlas.prototype
         * @type {Texture}
         */
        texture : {
            get : function() {
                return this._texture;
            }
        },

        /**
         * The number of images in the texture atlas. This value increases
         * every time addImage or addImages is called.
         * Texture coordinates are subject to change if the texture atlas resizes, so it is
         * important to check {@link TextureAtlas#getGUID} before using old values.
         * @memberof TextureAtlas.prototype
         * @type {Number}
         */
        numberOfImages : {
            get : function() {
                return this._textureCoordinates.length;
            }
        },

        /**
         * The atlas' globally unique identifier (GUID).
         * The GUID changes whenever the texture atlas is modified.
         * Classes that use a texture atlas should check if the GUID
         * has changed before processing the atlas data.
         * @memberof TextureAtlas.prototype
         * @type {String}
         */
        guid : {
            get : function() {
                return this._guid;
            }
        }
    });

    // Builds a larger texture and copies the old texture into the new one.
    function resizeAtlas(textureAtlas, image) {
        var numImages = textureAtlas.numberOfImages;
        var scalingFactor = 2.0;
        if (numImages > 0) {
            var oldAtlasWidth = textureAtlas._texture.width;
            var oldAtlasHeight = textureAtlas._texture.height;
            var atlasWidth = scalingFactor * (oldAtlasWidth + image.width + textureAtlas._borderWidthInPixels);
            var atlasHeight = scalingFactor * (oldAtlasHeight + image.height + textureAtlas._borderWidthInPixels);
            var widthRatio = oldAtlasWidth / atlasWidth;
            var heightRatio = oldAtlasHeight / atlasHeight;

            // Create new node structure, putting the old root node in the bottom left.
            var nodeBottomRight = new TextureAtlasNode(new Cartesian2(oldAtlasWidth + textureAtlas._borderWidthInPixels, 0.0), new Cartesian2(atlasWidth, oldAtlasHeight));
            var nodeBottomHalf = new TextureAtlasNode(new Cartesian2(), new Cartesian2(atlasWidth, oldAtlasHeight), textureAtlas._root, nodeBottomRight);
            var nodeTopHalf = new TextureAtlasNode(new Cartesian2(0.0, oldAtlasHeight + textureAtlas._borderWidthInPixels), new Cartesian2(atlasWidth, atlasHeight));
            var nodeMain = new TextureAtlasNode(new Cartesian2(), new Cartesian2(atlasWidth, atlasHeight), nodeBottomHalf, nodeTopHalf);
            textureAtlas._root = nodeMain;

            // Resize texture coordinates.
            for (var i = 0; i < textureAtlas._textureCoordinates.length; i++) {
                var texCoord = textureAtlas._textureCoordinates[i];
                if (defined(texCoord)) {
                    texCoord.x *= widthRatio;
                    texCoord.y *= heightRatio;
                    texCoord.width *= widthRatio;
                    texCoord.height *= heightRatio;
                }
            }

            // Copy larger texture.
            var newTexture = textureAtlas._context.createTexture2D({
                width : atlasWidth,
                height : atlasHeight,
                pixelFormat : textureAtlas._pixelFormat
            });

            // Copy old texture into new using an fbo.
            var framebuffer = textureAtlas._context.createFramebuffer({
                colorTextures : [textureAtlas._texture]
            });
            framebuffer._bind();
            newTexture.copyFromFramebuffer(0, 0, 0, 0, oldAtlasWidth, oldAtlasHeight);
            framebuffer._unBind();
            framebuffer.destroy();
            textureAtlas._texture = newTexture;
        } else {
            // First image exceeds initialSize
            var initialWidth = scalingFactor * (image.width + textureAtlas._borderWidthInPixels);
            var initialHeight = scalingFactor * (image.height + textureAtlas._borderWidthInPixels);
            textureAtlas._texture = textureAtlas._texture && textureAtlas._texture.destroy();
            textureAtlas._texture = textureAtlas._context.createTexture2D({
                width : initialWidth,
                height : initialHeight,
                pixelFormat : textureAtlas._pixelFormat
            });
            textureAtlas._root = new TextureAtlasNode(new Cartesian2(), new Cartesian2(initialWidth, initialHeight));
        }
    }

    // A recursive function that finds the best place to insert
    // a new image based on existing image 'nodes'.
    // Inspired by: http://blackpawn.com/texts/lightmaps/default.html
    function findNode(textureAtlas, node, image) {
        if (!defined(node)) {
            return undefined;
        }

        // If a leaf node
        if (!defined(node.childNode1) &&
            !defined(node.childNode2)) {

            // Node already contains an image, don't add to it.
            if (defined(node.imageIndex)) {
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
                var childNode2BottomLeftX = node.bottomLeft.x + image.width + textureAtlas._borderWidthInPixels;
                if (childNode2BottomLeftX < node.topRight.x) {
                    node.childNode2 = new TextureAtlasNode(new Cartesian2(childNode2BottomLeftX, node.bottomLeft.y), new Cartesian2(node.topRight.x, node.topRight.y));
                }
            }
            // Horizontal split (childNode1 = bottom half, childNode2 = top half).
            else {
                node.childNode1 = new TextureAtlasNode(new Cartesian2(node.bottomLeft.x, node.bottomLeft.y), new Cartesian2(node.topRight.x, node.bottomLeft.y + image.height));
                // Only make a second child if the border gives enough space.
                var childNode2BottomLeftY = node.bottomLeft.y + image.height + textureAtlas._borderWidthInPixels;
                if (childNode2BottomLeftY < node.topRight.y) {
                    node.childNode2 = new TextureAtlasNode(new Cartesian2(node.bottomLeft.x, childNode2BottomLeftY), new Cartesian2(node.topRight.x, node.topRight.y));
                }
            }
            return findNode(textureAtlas, node.childNode1, image);
        }

        // If not a leaf node
        return findNode(textureAtlas, node.childNode1, image) ||
            findNode(textureAtlas, node.childNode2, image);
    }

    // Adds image of given index to the texture atlas. Called from addImage and addImages.
    function addImage(textureAtlas, image, index) {
        var node = findNode(textureAtlas, textureAtlas._root, image);
        if (defined(node)) {
            // Found a node that can hold the image.
            node.imageIndex = index;

            // Add texture coordinate and write to texture
            var atlasWidth = textureAtlas._texture.width;
            var atlasHeight = textureAtlas._texture.height;
            var nodeWidth = node.topRight.x - node.bottomLeft.x;
            var nodeHeight = node.topRight.y - node.bottomLeft.y;
            var x = node.bottomLeft.x / atlasWidth;
            var y = node.bottomLeft.y / atlasHeight;
            var w = nodeWidth / atlasWidth;
            var h = nodeHeight / atlasHeight;
            textureAtlas._textureCoordinates[index] = new BoundingRectangle(x, y, w, h);
            textureAtlas._texture.copyFrom(image, node.bottomLeft.x, node.bottomLeft.y);
        } else {
            // No node found, must resize the texture atlas.
            resizeAtlas(textureAtlas, image);
            addImage(textureAtlas, image, index);
        }

        textureAtlas._guid = createGuid();
    }

    /**
     * Adds an image to the atlas.  If the image is already in the atlas, the atlas is unchanged and
     * the existing index is used.
     *
     * @param {String} id An identifier to detect whether the image already exists in the atlas.
     * @param {Image|Canvas|String|Promise|TextureAtlas~CreateImageCallback} image An image or canvas to add to the texture atlas,
     *        or a URL to an Image, or a Promise for an image, or a function that creates an image.
     * @returns {Promise} A Promise for the image index.
     */
    TextureAtlas.prototype.addImage = function(id, image) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(id)) {
            throw new DeveloperError('id is required.');
        }
        if (!defined(image)) {
            throw new DeveloperError('image is required.');
        }
        //>>includeEnd('debug');

        var indexPromise = this._idHash[id];
        if (defined(indexPromise)) {
            // we're already aware of this source
            return indexPromise;
        }

        // not in atlas, create the promise for the index

        if (typeof image === 'function') {
            // if image is a function, call it
            image = image(id);
            //>>includeStart('debug', pragmas.debug);
            if (!defined(image)) {
                throw new DeveloperError('image is required.');
            }
            //>>includeEnd('debug');
        } else if (typeof image === 'string') {
            // if image is a string, load it as an image
            image = loadImage(image);
        }

        var that = this;

        indexPromise = when(image, function(image) {
            if (that.isDestroyed()) {
                return -1;
            }

            var index = that.numberOfImages;

            addImage(that, image, index);

            return index;
        });

        // store the promise
        this._idHash[id] = indexPromise;

        return indexPromise;
    };

    /**
     * Add a sub-region of an existing atlas image as additional image indices.
     *
     * @param {String} id The identifier of the existing image.
     * @param {BoundingRectangle} subRegion An {@link BoundingRectangle} sub-region measured in pixels from the bottom-left.
     *
     * @returns {Promise} A Promise for the image index.
     */
    TextureAtlas.prototype.addSubRegion = function(id, subRegion) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(id)) {
            throw new DeveloperError('id is required.');
        }
        if (!defined(subRegion)) {
            throw new DeveloperError('subRegion is required.');
        }
        //>>includeEnd('debug');

        var indexPromise = this._idHash[id];
        if (!defined(indexPromise)) {
            throw new RuntimeError('image with id "' + id + '" not found in the atlas.');
        }

        var that = this;
        return when(indexPromise, function(index) {
            if (index === -1) {
                // the atlas is destroyed
                return -1;
            }
            var atlasWidth = that._texture.width;
            var atlasHeight = that._texture.height;
            var numImages = that.numberOfImages;

            var baseRegion = that._textureCoordinates[index];
            var x = baseRegion.x + (subRegion.x / atlasWidth);
            var y = baseRegion.y + (subRegion.y / atlasHeight);
            var w = subRegion.width / atlasWidth;
            var h = subRegion.height / atlasHeight;
            that._textureCoordinates.push(new BoundingRectangle(x, y, w, h));
            that._guid = createGuid();

            return numImages;
        });
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
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

    /**
     * A function that creates an image.
     * @callback TextureAtlas~CreateImageCallback
     * @param {String} id The identifier of the image to load.
     * @returns {Image|Promise} The image, or a promise that will resolve to an image.
     */

    return TextureAtlas;
});