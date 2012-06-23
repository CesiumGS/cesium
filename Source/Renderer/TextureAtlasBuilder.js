/*global define*/
define([
        '../Core/Event',
        '../Core/DeveloperError',
        '../Core/getImageFromUrl'
       ], function(
         Event,
         DeveloperError,
         getImageFromUrl) {
    "use strict";

    function SourceHolder() {
        this.imageLoaded = new Event();
        this.index = -1;
        this.loaded = false;
    }

    function TextureAtlasBuilder(textureAtlas) {
        this._textureAtlas = textureAtlas;
        this._imagesHash = {};
    }

    /**
     * Retrieves the image from the specified url and adds it to the atlas.
     * The supplied callback is triggered with the index of the next texture.
     * If the url is already in the atlas, the atlas is unchanged and the callback
     * is triggered immediately.
     *
     * @memberof TextureAtlasBuilder
     *
     * @param {String} url The url of the image to add to the atlas.
     * @param {Function} textureAvailableCallback DOC_TBA.
     *
     * @exception {DeveloperError} url is required.
     * @exception {DeveloperError} textureAvailableCallback is required.
     */
    TextureAtlasBuilder.prototype.addTextureFromUrl = function(url, textureAvailableCallback) {
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }

        if (typeof textureAvailableCallback === 'undefined') {
            throw new DeveloperError('textureAvailableCallback is required.');
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
     * @memberof TextureAtlasBuilder
     *
     * @param {String} id The id of the image to add to the atlas.
     * @param {Function} getImageCallback DOC_TBA.
     * @param {Function} textureAvailableCallback DOC_TBA.
     *
     * @exception {DeveloperError} id is required.
     * @exception {DeveloperError} getImageCallback is required.
     * @exception {DeveloperError} textureAvailableCallback is required.
     */
    TextureAtlasBuilder.prototype.addTextureFromFunction = function(id, getImageCallback, textureAvailableCallback) {
        if (typeof id === 'undefined') {
            throw new DeveloperError('id is required.');
        }

        if (typeof getImageCallback === 'undefined') {
            throw new DeveloperError('getImageCallback is required.');
        }

        if (typeof textureAvailableCallback === 'undefined') {
            throw new DeveloperError('textureAvailableCallback is required.');
        }

        var sourceHolder = this._imagesHash[id];
        if (typeof sourceHolder !== 'undefined') {
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
        this._imagesHash[id] = sourceHolder = new SourceHolder();
        sourceHolder.imageLoaded.addEventListener(textureAvailableCallback);

        var that = this;
        getImageCallback(id, function(newImage) {
            var index = sourceHolder.index = that._textureAtlas.addImage(newImage);
            sourceHolder.loaded = true;
            sourceHolder.imageLoaded.raiseEvent(index, id);
            sourceHolder.imageLoaded = undefined;
        });
    };

    return TextureAtlasBuilder;
});