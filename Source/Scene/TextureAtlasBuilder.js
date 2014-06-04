/*global define*/
define([
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/loadImage'
    ], function(
        defined,
        DeveloperError,
        Event,
        loadImage) {
    "use strict";

    function SourceHolder() {
        this.imageLoaded = new Event();
        this.index = -1;
        this.loaded = false;
    }

    /**
     * A utility class which dynamically builds a TextureAtlas by associating
     * a unique identifier with each texture as it is added.  If a texture with
     * the same id is needed later, the existing index is returned, rather than
     * adding multiple copies of the same texture.
     *
     * @alias TextureAtlasBuilder
     * @constructor
     *
     * @see TextureAtlas
     */
    var TextureAtlasBuilder  = function(textureAtlas) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(textureAtlas)) {
            throw new DeveloperError('textureAtlas is required.');
        }
        //>>includeEnd('debug');

        this.textureAtlas = textureAtlas;
        this._idHash = {};
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
    TextureAtlasBuilder.prototype.addTextureFromUrl = function(url, textureAvailableCallback) {
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
    TextureAtlasBuilder.prototype.addTextureFromFunction = function(id, getImageCallback, textureAvailableCallback) {
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
                textureAvailableCallback(sourceHolder.index);
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
            if (!that.textureAtlas.isDestroyed()) {
                var index = sourceHolder.index = that.textureAtlas.addImage(newImage);
                sourceHolder.loaded = true;
                sourceHolder.imageLoaded.raiseEvent(index, id);
                sourceHolder.imageLoaded = undefined;
            }
        });
    };

    return TextureAtlasBuilder;
});