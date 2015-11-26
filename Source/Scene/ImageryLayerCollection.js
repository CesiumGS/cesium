/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/Math',
        '../Core/Rectangle',
        '../ThirdParty/when',
        './ImageryLayer'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        Event,
        CesiumMath,
        Rectangle,
        when,
        ImageryLayer) {
    "use strict";

    /**
     * An ordered collection of imagery layers.
     *
     * @alias ImageryLayerCollection
     * @constructor
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Imagery%20Adjustment.html|Cesium Sandcastle Imagery Adjustment Demo}
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Imagery%20Layers%20Manipulation.html|Cesium Sandcastle Imagery Manipulation Demo}
     */
    var ImageryLayerCollection = function ImageryLayerCollection() {
        this._layers = [];

        /**
         * An event that is raised when a layer is added to the collection.  Event handlers are passed the layer that
         * was added and the index at which it was added.
         * @type {Event}
         * @default Event()
         */
        this.layerAdded = new Event();

        /**
         * An event that is raised when a layer is removed from the collection.  Event handlers are passed the layer that
         * was removed and the index from which it was removed.
         * @type {Event}
         * @default Event()
         */
        this.layerRemoved = new Event();

        /**
         * An event that is raised when a layer changes position in the collection.  Event handlers are passed the layer that
         * was moved, its new index after the move, and its old index prior to the move.
         * @type {Event}
         * @default Event()
         */
        this.layerMoved = new Event();

        /**
         * An event that is raised when a layer is shown or hidden by setting the
         * {@link ImageryLayer#show} property.  Event handlers are passed a reference to this layer,
         * the index of the layer in the collection, and a flag that is true if the layer is now
         * shown or false if it is now hidden.
         *
         * @type {Event}
         * @default Event()
         */
        this.layerShownOrHidden = new Event();
    };

    defineProperties(ImageryLayerCollection.prototype, {
        /**
         * Gets the number of layers in this collection.
         * @memberof ImageryLayerCollection.prototype
         * @type {Number}
         */
        length : {
            get : function() {
                return this._layers.length;
            }
        }
    });

    /**
     * Adds a layer to the collection.
     *
     * @param {ImageryLayer} layer the layer to add.
     * @param {Number} [index] the index to add the layer at.  If omitted, the layer will
     *                         added on top of all existing layers.
     *
     * @exception {DeveloperError} index, if supplied, must be greater than or equal to zero and less than or equal to the number of the layers.
     */
    ImageryLayerCollection.prototype.add = function(layer, index) {
        var hasIndex = defined(index);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(layer)) {
            throw new DeveloperError('layer is required.');
        }
        if (hasIndex) {
            if (index < 0) {
                throw new DeveloperError('index must be greater than or equal to zero.');
            } else if (index > this._layers.length) {
                throw new DeveloperError('index must be less than or equal to the number of layers.');
            }
        }
        //>>includeEnd('debug');

        if (!hasIndex) {
            index = this._layers.length;
            this._layers.push(layer);
        } else {
            this._layers.splice(index, 0, layer);
        }

        this._update();
        this.layerAdded.raiseEvent(layer, index);
    };

    /**
     * Creates a new layer using the given ImageryProvider and adds it to the collection.
     *
     * @param {ImageryProvider} imageryProvider the imagery provider to create a new layer for.
     * @param {Number} [index] the index to add the layer at.  If omitted, the layer will
     *                         added on top of all existing layers.
     * @returns {ImageryLayer} The newly created layer.
     */
    ImageryLayerCollection.prototype.addImageryProvider = function(imageryProvider, index) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(imageryProvider)) {
            throw new DeveloperError('imageryProvider is required.');
        }
        //>>includeEnd('debug');

        var layer = new ImageryLayer(imageryProvider);
        this.add(layer, index);
        return layer;
    };

    /**
     * Removes a layer from this collection, if present.
     *
     * @param {ImageryLayer} layer The layer to remove.
     * @param {Boolean} [destroy=true] whether to destroy the layers in addition to removing them.
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
     * @param {Boolean} [destroy=true] whether to destroy the layers in addition to removing them.
     */
    ImageryLayerCollection.prototype.removeAll = function(destroy) {
        destroy = defaultValue(destroy, true);

        var layers = this._layers;
        for (var i = 0, len = layers.length; i < len; i++) {
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
     * @param {Number} index the index to retrieve.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    ImageryLayerCollection.prototype.get = function(index) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(index)) {
            throw new DeveloperError('index is required.', 'index');
        }
        //>>includeEnd('debug');

        return this._layers[index];
    };

    function getLayerIndex(layers, layer) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(layer)) {
            throw new DeveloperError('layer is required.');
        }
        //>>includeEnd('debug');

        var index = layers.indexOf(layer);

        //>>includeStart('debug', pragmas.debug);
        if (index === -1) {
            throw new DeveloperError('layer is not in this collection.');
        }
        //>>includeEnd('debug');

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

    var applicableRectangleScratch = new Rectangle();

    /**
     * Asynchronously determines the imagery layer features that are intersected by a pick ray.  The intersected imagery
     * layer features are found by invoking {@link ImageryProvider#pickFeatures} for each imagery layer tile intersected
     * by the pick ray.  To compute a pick ray from a location on the screen, use {@link Camera.getPickRay}.
     *
     * @param {Ray} ray The ray to test for intersection.
     * @param {Scene} scene The scene.
     * @return {Promise.<ImageryLayerFeatureInfo[]>|undefined} A promise that resolves to an array of features intersected by the pick ray.
     *                                             If it can be quickly determined that no features are intersected (for example,
     *                                             because no active imagery providers support {@link ImageryProvider#pickFeatures}
     *                                             or because the pick ray does not intersect the surface), this function will
     *                                             return undefined.
     *
     * @example
     * var pickRay = viewer.camera.getPickRay(windowPosition);
     * var featuresPromise = viewer.imageryLayers.pickImageryLayerFeatures(pickRay, viewer.scene);
     * if (!Cesium.defined(featuresPromise)) {
     *     console.log('No features picked.');
     * } else {
     *     Cesium.when(featuresPromise, function(features) {
     *         // This function is called asynchronously when the list if picked features is available.
     *         console.log('Number of features: ' + features.length);
     *         if (features.length > 0) {
     *             console.log('First feature name: ' + features[0].name);
     *         }
     *     });
     * }
     */
    ImageryLayerCollection.prototype.pickImageryLayerFeatures = function(ray, scene) {
        // Find the picked location on the globe.
        var pickedPosition = scene.globe.pick(ray, scene);
        if (!defined(pickedPosition)) {
            return undefined;
        }

        var pickedLocation = scene.globe.ellipsoid.cartesianToCartographic(pickedPosition);

        // Find the terrain tile containing the picked location.
        var tilesToRender = scene.globe._surface._tilesToRender;
        var pickedTile;

        for (var textureIndex = 0; !defined(pickedTile) && textureIndex < tilesToRender.length; ++textureIndex) {
            var tile = tilesToRender[textureIndex];
            if (Rectangle.contains(tile.rectangle, pickedLocation)) {
                pickedTile = tile;
            }
        }

        if (!defined(pickedTile)) {
            return undefined;
        }

        // Pick against all attached imagery tiles containing the pickedLocation.
        var imageryTiles = pickedTile.data.imagery;

        var promises = [];
        var imageryLayers = [];
        for (var i = imageryTiles.length - 1; i >= 0; --i) {
            var terrainImagery = imageryTiles[i];
            var imagery = terrainImagery.readyImagery;
            if (!defined(imagery)) {
                continue;
            }
            var provider = imagery.imageryLayer.imageryProvider;
            if (!defined(provider.pickFeatures)) {
                continue;
            }

            if (!Rectangle.contains(imagery.rectangle, pickedLocation)) {
                continue;
            }

            // If this imagery came from a parent, it may not be applicable to its entire rectangle.
            // Check the textureCoordinateRectangle.
            var applicableRectangle = applicableRectangleScratch;

            var epsilon = 1 / 1024; // 1/4 of a pixel in a typical 256x256 tile.
            applicableRectangle.west = CesiumMath.lerp(pickedTile.rectangle.west, pickedTile.rectangle.east, terrainImagery.textureCoordinateRectangle.x - epsilon);
            applicableRectangle.east = CesiumMath.lerp(pickedTile.rectangle.west, pickedTile.rectangle.east, terrainImagery.textureCoordinateRectangle.z + epsilon);
            applicableRectangle.south = CesiumMath.lerp(pickedTile.rectangle.south, pickedTile.rectangle.north, terrainImagery.textureCoordinateRectangle.y - epsilon);
            applicableRectangle.north = CesiumMath.lerp(pickedTile.rectangle.south, pickedTile.rectangle.north, terrainImagery.textureCoordinateRectangle.w + epsilon);
            if (!Rectangle.contains(applicableRectangle, pickedLocation)) {
                continue;
            }

            var promise = provider.pickFeatures(imagery.x, imagery.y, imagery.level, pickedLocation.longitude, pickedLocation.latitude);
            if (!defined(promise)) {
                continue;
            }

            promises.push(promise);
            imageryLayers.push(imagery.imageryLayer);
        }

        if (promises.length === 0) {
            return undefined;
        }

        return when.all(promises, function(results) {
            var features = [];

            for (var resultIndex = 0; resultIndex < results.length; ++resultIndex) {
                var result = results[resultIndex];
                var image = imageryLayers[resultIndex];

                if (defined(result) && result.length > 0) {
                    for (var featureIndex = 0; featureIndex < result.length; ++featureIndex) {
                        var feature = result[featureIndex];
                        feature.imageryLayer = image;

                        // For features without a position, use the picked location.
                        if (!defined(feature.position)) {
                            feature.position = pickedLocation;
                        }

                        features.push(feature);
                    }
                }
            }

            return features;
        });
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @returns {Boolean} true if this object was destroyed; otherwise, false.
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
     * @returns {undefined}
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
                if (defined(layer._show)) {
                    if (!defined(layersShownOrHidden)) {
                        layersShownOrHidden = [];
                    }
                    layersShownOrHidden.push(layer);
                }
                layer._show = layer.show;
            }
        }

        if (defined(layersShownOrHidden)) {
            for (i = 0, len = layersShownOrHidden.length; i < len; ++i) {
                layer = layersShownOrHidden[i];
                this.layerShownOrHidden.raiseEvent(layer, layer._layerIndex, layer.show);
            }
        }
    };

    return ImageryLayerCollection;
});
