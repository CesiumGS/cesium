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
        '../Core/Event',
        '../Core/loadImage',
        '../Core/PixelFormat',
        '../Core/RuntimeError'
    ], function(
        BoundingRectangle,
        Cartesian2,
        createGuid,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        Event,
        loadImage,
        PixelFormat,
        RuntimeError) {
    "use strict";

    function SourceHolder() {
        this.imageLoaded = new Event();
        this.index = -1;
        this.loaded = false;
    }

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
     * @param {Scene} options.scene The scene in which the texture gets created.
     * @param {PixelFormat} [options.pixelFormat=PixelFormat.RGBA] The pixel format of the texture.
     * @param {Number} [options.borderWidthInPixels=1] The amount of spacing between adjacent images in pixels.
     * @param {Cartesian2} [options.initialSize=new Cartesian2(16.0, 16.0)] The initial side lengths of the texture.
     *
     * @exception {DeveloperError} borderWidthInPixels must be greater than or equal to zero.
     * @exception {DeveloperError} initialSize must be greater than zero.
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

        var context = options.context;
        this._context = context;
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
        texture: {
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
            for ( var i = 0; i < textureAtlas._textureCoordinates.length; i++) {
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
        }
        // First image exceeds initialSize
        else {
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
        // Found a node that can hold the image.
        if (defined(node)) {
            node.imageIndex = index;

            // Add texture coordinate and write to texture
            var atlasWidth = textureAtlas._texture.width;
            var atlasHeight = textureAtlas._texture.height;
            var nodeWidth = node.topRight.x - node.bottomLeft.x;
            var nodeHeight = node.topRight.y - node.bottomLeft.y;
            textureAtlas._textureCoordinates[index] = new BoundingRectangle(
                node.bottomLeft.x / atlasWidth, node.bottomLeft.y / atlasHeight,
                nodeWidth / atlasWidth, nodeHeight / atlasHeight
            );
            textureAtlas._texture.copyFrom(image, node.bottomLeft.x, node.bottomLeft.y);
        }
        // No node found, must resize the texture atlas.
        else {
            resizeAtlas(textureAtlas, image);
            addImage(textureAtlas, image, index);
        }

        textureAtlas._guid = createGuid();
    }

    /**
     * Adds the image to the atlas.
     * The supplied callback is triggered with the index of the texture.
     * If the image is already in the atlas, the atlas is unchanged and the callback
     * is triggered with the existing index.
     *
     * @param {Image} image An image to be added to the texture atlas.
     * @param {Function} textureAvailableCallback A function taking the image index as it's only parameter.
     */
    TextureAtlas.prototype.addImage = function(image, textureAvailableCallback) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(image)) {
            throw new DeveloperError('image is required.');
        }
        if (!defined(textureAvailableCallback)) {
            throw new DeveloperError('textureAvailableCallback is required.');
        }
        //>>includeEnd('debug');

        var id = image.src;
        var sourceHolder = this._idHash[id];
        if (defined(sourceHolder)) {
            //we're already aware of this source
            if (sourceHolder.loaded) {
                //and it's already loaded, tell the callback what index to use
                textureAvailableCallback(sourceHolder.index, id);
            } else {
                //add the callback to be notified once it loads
                sourceHolder.imageLoaded.addEventListener(textureAvailableCallback);
            }
            return;
        }

        //not in atlas, create the source, which may be async
        this._idHash[id] = sourceHolder = new SourceHolder();
        sourceHolder.imageLoaded.addEventListener(textureAvailableCallback);

        var that = this;
        var callback = function(loadedImage) {
            if (!that.isDestroyed()) {
                var index = sourceHolder.index = that.numberOfImages;
                addImage(that, loadedImage, index);

                sourceHolder.loaded = true;
                sourceHolder.imageLoaded.raiseEvent(index, id);
                sourceHolder.imageLoaded = undefined;
            }
        };

        if (!image.complete) {
            var onload = image.onload;
            image.onload = function(e) {
                onload(e);
                callback(image);
            };
        } else {
            callback(image);
        }
    };

    /**
     * Add a sub-region to one atlas image as additional image indices.
     *
     * @param {String} id The id of the image to add to the atlas.
     * @param {BoundingRectangle} subRegion An {@link BoundingRectangle} sub-region measured in pixels from the bottom-left.
     * @param {Function} textureAvailableCallback A function taking the index of the first newly-added region as it's only parameter.
     */
    TextureAtlas.prototype.addSubRegion = function(id, subRegion, textureAvailableCallback) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(id)) {
            throw new DeveloperError('id is required.');
        }
        if (!defined(subRegion)) {
            throw new DeveloperError('subRegion is required.');
        }
        if (!defined(textureAvailableCallback)) {
            throw new DeveloperError('textureAvailableCallback is required.');
        }
        //>>includeEnd('debug');

        var sourceHolder = this._idHash[id];
        if (!defined(sourceHolder)) {
            throw new RuntimeError('image with id must be in the atlas.');
        }

        var that = this;
        var createSubRegionsCallback = function(index) {
            var atlasWidth = that._texture.width;
            var atlasHeight = that._texture.height;
            var numImages = that.numberOfImages;

            var baseRegion = that._textureCoordinates[index];
            that._textureCoordinates.push(new BoundingRectangle(
                baseRegion.x + (subRegion.x / atlasWidth),
                baseRegion.y + (subRegion.y / atlasHeight),
                subRegion.width / atlasWidth,
                subRegion.height / atlasHeight
            ));

            textureAvailableCallback(numImages);
        };

        //we're already aware of this source
        if (sourceHolder.loaded) {
            //and it's already loaded, tell the callback what index to use
            createSubRegionsCallback(sourceHolder.index, id);
        } else {
            //add the callback to be notified once it loads
            sourceHolder.imageLoaded.addEventListener(createSubRegionsCallback);
        }
    };

    /**
     * Retrieves the image from the specified url and adds it to the atlas.
     * The supplied callback is triggered with the index of the texture.
     * If the url is already in the atlas, the atlas is unchanged and the callback
     * is triggered immediately with the existing index.
     *
     * @param {String} url The url of the image to add to the atlas.
     * @param {Function} textureAvailableCallback A function taking the image index as it's only parameter.
     */
    TextureAtlas.prototype.addTextureFromUrl = function(url, textureAvailableCallback) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(url)) {
            throw new DeveloperError('url is required.');
        }
        if (!defined(textureAvailableCallback)) {
            throw new DeveloperError('textureAvailableCallback is required.');
        }
        //>>includeEnd('debug');

        this.addTextureFromFunction(url, function(id, callback) {
            loadImage(id).then(callback);
        }, textureAvailableCallback);
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
     * while subsequent billboards will re-use the existing one.
     * </p>
     *
     * @param {String} id The id of the image to add to the atlas.
     * @param {Function} getImageCallback A function which takes two parameters; first the id of the image to
     * retrieve and second, a function to call when the image is ready.  The function takes the image as its
     * only parameter.
     * @param {Function} textureAvailableCallback A function taking the image index as it's only parameter.
     */
    TextureAtlas.prototype.addTextureFromFunction = function(id, getImageCallback, textureAvailableCallback) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(id)) {
            throw new DeveloperError('id is required.');
        }
        if (!defined(getImageCallback)) {
            throw new DeveloperError('getImageCallback is required.');
        }
        if (!defined(textureAvailableCallback)) {
            throw new DeveloperError('textureAvailableCallback is required.');
        }
        //>>includeEnd('debug');

        var sourceHolder = this._idHash[id];
        if (defined(sourceHolder)) {
            //we're already aware of this source
            if (sourceHolder.loaded) {
                //and it's already loaded, tell the callback what index to use
                textureAvailableCallback(sourceHolder.index, id);
            } else {
                //add the callback to be notified once it loads
                sourceHolder.imageLoaded.addEventListener(textureAvailableCallback);
            }
            return;
        }

        //not in atlas, create the source, which may be async
        this._idHash[id] = sourceHolder = new SourceHolder();
        sourceHolder.imageLoaded.addEventListener(textureAvailableCallback);

        var that = this;
        getImageCallback(id, function(newImage) {
            if (!that.isDestroyed()) {
                var index = sourceHolder.index = that.numberOfImages;
                addImage(that, newImage, index);

                sourceHolder.loaded = true;
                sourceHolder.imageLoaded.raiseEvent(index, id);
                sourceHolder.imageLoaded = undefined;
            }
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

    return TextureAtlas;
});