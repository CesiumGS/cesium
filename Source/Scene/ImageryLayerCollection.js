/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/Event',
        '../Core/Math',
        './ImageryLayer'
    ], function(
        DeveloperError,
        defaultValue,
        destroyObject,
        Event,
        CesiumMath,
        ImageryLayer) {
    "use strict";

    /**
     * An ordered collection of imagery layers.
     *
     * @alias ImageryLayerCollection
     * @constructor
     *
     * @demo <a href="http://cesium.agi.com/Cesium/Apps/Sandcastle/index.html?src=Imagery%20Adjustment.html">Cesium Sandcastle Imagery Adjustment Demo</a>
     * @demo <a href="http://cesium.agi.com/Cesium/Apps/Sandcastle/index.html?src=Imagery%20Layers%20Manipulation.html">Cesium Sandcastle Imagery Manipulation Demo</a>
     */
    var ImageryLayerCollection = function ImageryLayerCollection() {
        this._layers = [];

        /**
         * An event that is raised when a layer is added to the collection.  Event handlers are passed the layer that
         * was added and the index at which it was added.
         * @type {Event}
         */
        this.layerAdded = new Event();

        /**
         * An event that is raised when a layer is removed from the collection.  Event handlers are passed the layer that
         * was removed and the index from which it was removed.
         * @type {Event}
         */
        this.layerRemoved = new Event();

        /**
         * An event that is raised when a layer changes position in the collection.  Event handlers are passed the layer that
         * was moved, its new index after the move, and its old index prior to the move.
         * @type {Event}
         */
        this.layerMoved = new Event();

        /**
         * An event that is raised when a layer is shown or hidden by setting the
         * {@link ImageryLayer#show} property.  Event handlers are passed a reference to this layer,
         * the index of the layer in the collection, and a flag that is true if the layer is now
         * shown or false if it is now hidden.
         *
         * @type {Event}
         */
        this.layerShownOrHidden = new Event();
    };

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
     * @exception {DeveloperError} index, if supplied, must be greater than or equal to zero and less than or equal to the number of the layers.
     */
    ImageryLayerCollection.prototype.add = function(layer, index) {
        if (typeof layer === 'undefined') {
            throw new DeveloperError('layer is required.');
        }

        if (typeof index === 'undefined') {
            index = this._layers.length;
            this._layers.push(layer);
        } else {
            if (index < 0) {
                throw new DeveloperError('index must be greater than or equal to zero.');
            } else if (index > this._layers.length) {
                throw new DeveloperError('index must be less than or equal to the number of layers.');
            }
            this._layers.splice(index, 0, layer);
        }

        this._update();

        this.layerAdded.raiseEvent(layer, index);
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
     * @exception {DeveloperError} imageryProvider is required.
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
        destroy = defaultValue(destroy, true);

        var index = this._layers.indexOf(layer);
        if (index !== -1) {
            this._layers.splice(index, 1);

            this._update();

            this.layerRemoved.raiseEvent(layer, index);

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
        destroy = defaultValue(destroy, true);

        var layers = this._layers;
        for ( var i = 0, len = layers.length; i < len; i++) {
            var layer = layers[i];
            this.layerRemoved.raiseEvent(layer, i);

            if (destroy) {
                layer.destroy();
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
        return this.indexOf(layer) !== -1;
    };

    /**
     * Determines the index of a given layer in the collection.
     *
     * @memberof ImageryLayerCollection
     *
     * @param {ImageryLayer} layer The layer to find the index of.
     *
     * @returns {Number} The index of the layer in the collection, or -1 if the layer does not exist in the collection.
     */
    ImageryLayerCollection.prototype.indexOf = function(layer) {
        return this._layers.indexOf(layer);
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

    function swapLayers(collection, i, j) {
        var arr = collection._layers;
        i = CesiumMath.clamp(i, 0, arr.length - 1);
        j = CesiumMath.clamp(j, 0, arr.length - 1);

        if (i === j) {
            return;
        }

        var temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;

        collection._update();

        collection.layerMoved.raiseEvent(temp, j, i);
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
        if (index === this._layers.length - 1) {
            return;
        }
        this._layers.splice(index, 1);
        this._layers.push(layer);

        this._update();

        this.layerMoved.raiseEvent(layer, this._layers.length - 1, index);
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
        if (index === 0) {
            return;
        }
        this._layers.splice(index, 1);
        this._layers.splice(0, 0, layer);

        this._update();

        this.layerMoved.raiseEvent(layer, 0, index);
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

    ImageryLayerCollection.prototype._update = function() {
        var isBaseLayer = true;
        var layers = this._layers;
        var layersShownOrHidden;
        var layer;
        for (var i = 0, len = layers.length; i < len; ++i) {
            layer = layers[i];

            layer._layerIndex = i;

            if (layer.show) {
                layer._isBaseLayer = isBaseLayer;
                isBaseLayer = false;
            } else {
                layer._isBaseLayer = false;
            }

            if (layer.show !== layer._show) {
                if (typeof layer._show !== 'undefined') {
                    if (typeof layersShownOrHidden === 'undefined') {
                        layersShownOrHidden = [];
                    }
                    layersShownOrHidden.push(layer);
                }
                layer._show = layer.show;
            }
        }

        if (typeof layersShownOrHidden !== 'undefined') {
            for (i = 0, len = layersShownOrHidden.length; i < len; ++i) {
                layer = layersShownOrHidden[i];
                this.layerShownOrHidden.raiseEvent(layer, layer._layerIndex, layer.show);
            }
        }
    };

    return ImageryLayerCollection;
});