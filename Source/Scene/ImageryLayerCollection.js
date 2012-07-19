/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Cartesian2',
        '../Core/Rectangle',
        '../Renderer/PixelFormat',
        './ImageryLayer',
        './ViewportQuad'
    ], function(
        DeveloperError,
        destroyObject,
        Cartesian2,
        Rectangle,
        PixelFormat,
        ImageryLayer,
        ViewportQuad) {
    "use strict";

    /**
     * An ordered collection of imagery layers.
     *
     * @name ImageryLayerCollection
     */
    function ImageryLayerCollection() {
        this._layers = [];

        /**
         * Determines if layers in this collection will be shown.
         *
         * @type Boolean
         */
        this.show = true;

        /**
         * The offset, relative to the bottom left corner of the viewport,
         * where the logo for imagery will be drawn.
         *
         * @type {Cartesian2}
         */
        this.logoOffset = Cartesian2.ZERO;
        this._layerLogos = [];
        this._logoQuad = undefined;
    }

    /**
     * Adds a layer to the collection.
     *
     * @memberof ImageryLayerCollection
     *
     * @param {ImageryLayer} layer the layer to add.
     * @param {Number} [index] the index to add the layer at.  If omitted, the layer will
     *                         added on top of all existing layers.
     *
     * @exception {DeveloperError} layer is required.
     */
    ImageryLayerCollection.prototype.add = function(layer, index) {
        if (typeof layer === 'undefined') {
            throw new DeveloperError('layer is required.');
        }

        if (typeof index === 'undefined') {
            this._layers.push(layer);
        } else {
            this._layers.splice(index, 0, layer);
        }
    };

    /**
     * Creates a new layer using the given ImageryProvider and adds it to the collection.
     *
     * @memberof ImageryLayerCollection
     *
     * @param {ImageryProvider} imageryProvider the imagery provider to create a new layer for.
     * @param {Number} [index] the index to add the layer at.  If omitted, the layer will
     *                         added on top of all existing layers.
     *
     * @returns {ImageryLayer} The newly created layer.
     *
     * @exception {DeveloperError} layer is required.
     */
    ImageryLayerCollection.prototype.addImageryProvider = function(imageryProvider, index) {
        if (typeof imageryProvider === 'undefined') {
            throw new DeveloperError('imageryProvider is required.');
        }

        var layer = new ImageryLayer(imageryProvider);
        this.add(layer, index);
        return layer;
    };

    /**
     * Removes a layer from this collection, if present.
     *
     * @memberof ImageryLayerCollection
     *
     * @param {ImageryLayer} layer The layer to remove.
     * @param {Boolean} [destroy=true] whether to destroy the layers in addition to removing them.
     *
     * @returns {Boolean} true if the layer was in the collection and was removed,
     *                    false if the layer was not in the collection.
     */
    ImageryLayerCollection.prototype.remove = function(layer, destroy) {
        destroy = typeof destroy === 'undefined' ? true : destroy;

        var index = this._layers.indexOf(layer);
        if (index !== -1) {
            this._layers.splice(index, 1);

            if (destroy) {
                layer.destroy();
            }

            return true;
        }

        return false;
    };

    /**
     * Removes all layers from this collection.
     *
     * @memberof ImageryLayerCollection
     *
     * @param {Boolean} [destroy=true] whether to destroy the layers in addition to removing them.
     */
    ImageryLayerCollection.prototype.removeAll = function(destroy) {
        destroy = typeof destroy === 'undefined' ? true : destroy;

        if (destroy) {
            var layers = this._layers;
            for ( var i = 0, len = layers.length; i < len; i++) {
                layers[i].destroy();
            }
        }

        this._layers = [];
    };

    /**
     * Checks to see if the collection contains a given layer.
     *
     * @memberof ImageryLayerCollection
     *
     * @param {ImageryLayer} layer the layer to check for.
     *
     * @returns {Boolean} true if the collection contains the layer, false otherwise.
     */
    ImageryLayerCollection.prototype.contains = function(layer) {
        return this._layers.indexOf(layer) !== -1;
    };

    /**
     * Gets a layer by index from the collection.
     *
     * @memberof ImageryLayerCollection
     *
     * @param {Number} index the index to retrieve.
     *
     * @exception {DeveloperError} index is required.
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    ImageryLayerCollection.prototype.get = function(index) {
        if (typeof index === 'undefined') {
            throw new DeveloperError('index is required.', 'index');
        }

        return this._layers[index];
    };

    /**
     * Gets the number of layers in this collection.
     *
     * @memberof ImageryLayerCollection
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    ImageryLayerCollection.prototype.getLength = function() {
        return this._layers.length;
    };

    function getLayerIndex(layers, layer) {
        if (typeof layer === 'undefined') {
            throw new DeveloperError('layer is required.');
        }

        var index = layers.indexOf(layer);
        if (index === -1) {
            throw new DeveloperError('layer is not in this collection.');
        }

        return index;
    }

    function clamp(value, min, max) {
        return value < min ? min : value > max ? max : value;
    }

    function swapLayers(collection, i, j) {
        var arr = collection._layers;
        i = clamp(i, 0, arr.length - 1);
        j = clamp(j, 0, arr.length - 1);

        if (i === j) {
            return;
        }

        var temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }

    /**
     * Raises a layer up one position in the collection.
     *
     * @memberof ImageryLayerCollection
     *
     * @param {ImageryLayer} layer the layer to move.
     *
     * @exception {DeveloperError} layer is not in this collection.
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    ImageryLayerCollection.prototype.raise = function(layer) {
        var index = getLayerIndex(this._layers, layer);
        swapLayers(this, index, index + 1);
    };

    /**
     * Raises a layer to the top of the collection.
     *
     * @memberof ImageryLayerCollection
     *
     * @param {ImageryLayer} layer the layer to move.
     *
     * @exception {DeveloperError} layer is not in this collection.
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    ImageryLayerCollection.prototype.raiseToTop = function(layer) {
        var index = getLayerIndex(this._layers, layer);
        swapLayers(this, index, this._layers.length - 1);
    };

    /**
     * Lowers a layer down one position in the collection.
     *
     * @memberof ImageryLayerCollection
     *
     * @param {ImageryLayer} layer the layer to move.
     *
     * @exception {DeveloperError} layer is not in this collection.
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    ImageryLayerCollection.prototype.lower = function(layer) {
        var index = getLayerIndex(this._layers, layer);
        swapLayers(this, index, index - 1);
    };

    /**
     * Lowers a layer to the bottom of the collection.
     *
     * @memberof ImageryLayerCollection
     *
     * @param {ImageryLayer} layer the layer to move.
     *
     * @exception {DeveloperError} layer is not in this collection.
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    ImageryLayerCollection.prototype.lowerToBottom = function(layer) {
        var index = getLayerIndex(this._layers, layer);
        swapLayers(this, index, 0);
    };

    /**
     * @private
     */
    ImageryLayerCollection.prototype.update = function(context, sceneState) {
        if (!this.show) {
            return;
        }

        var layers = this._layers;

        var layerLogos = this._layerLogos;
        var rebuildLogo = false;
        var logoWidth = 0;
        var logoHeight = 0;
        var logo;

        for ( var i = 0, len = layers.length; i < len; i++) {
            var layer = layers[i];

            if (typeof layer.imageryProvider.getLogo === 'function') {
                logo = layer.imageryProvider.getLogo();
            }

            if (layerLogos[i] !== logo) {
                rebuildLogo = true;
                layerLogos[i] = logo;
            }

            if (typeof logo !== 'undefined') {
                logoHeight += logo.height;
                logoWidth = Math.max(logoWidth, logo.width);
            }
        }

        if (rebuildLogo) {
            var logoRectangle = new Rectangle(this.logoOffset.x, this.logoOffset.y, logoWidth, logoHeight);
            if (typeof this._logoQuad === 'undefined') {
                this._logoQuad = new ViewportQuad(logoRectangle);
                this._logoQuad.enableBlending = true;
            } else {
                this._logoQuad.setRectangle(logoRectangle);
            }

            var texture = this._logoQuad.getTexture();
            if (typeof texture === 'undefined' || texture.getWidth() !== logoWidth || texture.getHeight() !== logoHeight) {
                texture = context.createTexture2D({
                    width : logoWidth,
                    height : logoHeight,
                    pixelFormat : PixelFormat.RGBA
                });

                this._logoQuad.setTexture(texture);
            }

            var offset = 0;
            for (i = 0, len = layerLogos.length; i < len; i++) {
                logo = layerLogos[i];
                if (typeof logo !== 'undefined') {
                    texture.copyFrom(logo, 0, offset);
                    offset += logo.height;
                }
            }
        }

        if (typeof this._logoQuad !== 'undefined') {
            this._logoQuad.update(context, sceneState);
        }
    };

    /**
     * Renders all imagery layers, bottom to top.
     *
     * @memberof ImageryLayerCollection
     */
    ImageryLayerCollection.prototype.render = function(context) {
        if (!this.show) {
            return;
        }

        if (typeof this._logoQuad !== 'undefined') {
            this._logoQuad.render(context);
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof ImageryLayerCollection
     *
     * @return {Boolean} true if this object was destroyed; otherwise, false.
     *
     * @see ImageryLayerCollection#destroy
     */
    ImageryLayerCollection.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by all layers in this collection.  Explicitly destroying this
     * object allows for deterministic release of WebGL resources, instead of relying on the garbage
     * collector.
     * <br /><br />
     * Once this object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof ImageryLayerCollection
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see ImageryLayerCollection#isDestroyed
     *
     * @example
     * layerCollection = layerCollection && layerCollection.destroy();
     */
    ImageryLayerCollection.prototype.destroy = function() {
        this.removeAll(true);
        return destroyObject(this);
    };

    return ImageryLayerCollection;
});