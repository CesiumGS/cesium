/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Event',
        './ImageryLayer'
    ], function(
        DeveloperError,
        destroyObject,
        Event,
        ImageryLayer) {
    "use strict";

    /**
     * An ordered collection of imagery layers.
     *
     * @name ImageryLayerCollection
     */
    function ImageryLayerCollection() {
        this._layers = [];

        this.layerAdded = new Event();
        this.layerRemoved = new Event();
        this.layerMoved = new Event();
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
            index = this._layers.length;
            this._layers.push(layer);
        } else {
            this._layers.splice(index, 0, layer);
        }

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
        destroy = typeof destroy === 'undefined' ? true : destroy;

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
        this._layers.splice(index, 1);
        this._layers.push(layer);

        this.layerMoved.raiseEvent(layer, layer.length - 1, index);
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
        this._layers.splice(index, 1);
        this._layers.splice(0, 0, layer);

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

    return ImageryLayerCollection;
});