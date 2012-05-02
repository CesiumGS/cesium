/*global define Image*/
define(['Renderer/TextureAtlas'], function(TextureAtlas) {
    "use strict";

    function DynamicTextureAtlas(context, textureAtlasChanged) {
        this._context = context;
        this._sources = {};
        this._sourcesArray = [];
        this._nextIndex = 0;
        this._textureAtlasChanged = textureAtlasChanged;
    }

    DynamicTextureAtlas.prototype.addTextureFromUrl = function(url, textureAvailable) {
        this.addTexture(url, function(loadedCallback) {
            var image = new Image();
            image.onload = function() {
                loadedCallback(image);
            };
            if (url.lastIndexOf("data:", 0) !== 0) {
                image.crossOrigin = '';
            }
            image.src = url;
        }, textureAvailable);
    };

    DynamicTextureAtlas.prototype.addTexture = function(id, createSource, textureAvailable) {
        var sourceHolder = this._sources[id];
        if (sourceHolder) {
            //we're already aware of this source
            if (sourceHolder.loaded) {
                //and it's already loaded, tell the callback what index to use
                textureAvailable(sourceHolder.index);
            } else {
                //add the callback to be notified once it loads
                sourceHolder.callbacks.push(textureAvailable);
            }
            return;
        }

        //not in atlas, create the source, which could be async
        var self = this;

        this._sources[id] = sourceHolder = {
            callbacks : [textureAvailable]
        };

        createSource(function(source) {
            //assign an index
            var index = sourceHolder.index = self._nextIndex++;

            //store the loaded source in the array and rebuild the atlas
            self._sourcesArray[index] = source;
            self._textureAtlasChanged(new TextureAtlas(self._context, self._sourcesArray));

            // fire all callbacks with the index
            var callbacks = sourceHolder.callbacks;
            for ( var i = 0, len = callbacks.length; i < len; i++) {
                callbacks[i](index);
            }

            sourceHolder.loaded = true;
            delete sourceHolder.callbacks;
        });
    };

    return DynamicTextureAtlas;
});