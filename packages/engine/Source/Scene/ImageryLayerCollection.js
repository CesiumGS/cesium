import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import CesiumMath from "../Core/Math.js";
import Rectangle from "../Core/Rectangle.js";
import ImageryLayer from "./ImageryLayer.js";

/**
 * An ordered collection of imagery layers.
 *
 * @alias ImageryLayerCollection
 * @constructor
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Imagery%20Adjustment.html|Cesium Sandcastle Imagery Adjustment Demo}
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Imagery%20Layers%20Manipulation.html|Cesium Sandcastle Imagery Manipulation Demo}
 */
function ImageryLayerCollection() {
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
}

Object.defineProperties(ImageryLayerCollection.prototype, {
  /**
   * Gets the number of layers in this collection.
   * @memberof ImageryLayerCollection.prototype
   * @type {number}
   */
  length: {
    get: function () {
      return this._layers.length;
    },
  },
});

/**
 * Adds a layer to the collection.
 *
 * @param {ImageryLayer} layer the layer to add.
 * @param {number} [index] the index to add the layer at.  If omitted, the layer will
 *                         be added on top of all existing layers.
 *
 * @exception {DeveloperError} index, if supplied, must be greater than or equal to zero and less than or equal to the number of the layers.
 *
 * @example
 * const imageryLayer = Cesium.ImageryLayer.fromWorldImagery();
 * scene.imageryLayers.add(imageryLayer);
 *
 * @example
 * const imageryLayer = Cesium.ImageryLayer.fromProviderAsync(Cesium.IonImageryProvider.fromAssetId(3812));
 * scene.imageryLayers.add(imageryLayer);
 */
ImageryLayerCollection.prototype.add = function (layer, index) {
  const hasIndex = defined(index);

  //>>includeStart('debug', pragmas.debug);
  if (!defined(layer)) {
    throw new DeveloperError("layer is required.");
  }
  if (hasIndex) {
    if (index < 0) {
      throw new DeveloperError("index must be greater than or equal to zero.");
    } else if (index > this._layers.length) {
      throw new DeveloperError(
        "index must be less than or equal to the number of layers."
      );
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
  const removeReadyEventListener = layer.readyEvent.addEventListener(() => {
    this.layerShownOrHidden.raiseEvent(layer, layer._layerIndex, layer.show);
    removeReadyEventListener();
  });
};

/**
 * Creates a new layer using the given ImageryProvider and adds it to the collection.
 *
 * @param {ImageryProvider} imageryProvider the imagery provider to create a new layer for.
 * @param {number} [index] the index to add the layer at.  If omitted, the layer will
 *                         added on top of all existing layers.
 * @returns {ImageryLayer} The newly created layer.
 *
 * @example
 * try {
 *    const provider = await Cesium.IonImageryProvider.fromAssetId(3812);
 *    scene.imageryLayers.addImageryProvider(provider);
 * } catch (error) {
 *   console.log(`There was an error creating the imagery layer. ${error}`)
 * }
 */
ImageryLayerCollection.prototype.addImageryProvider = function (
  imageryProvider,
  index
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(imageryProvider)) {
    throw new DeveloperError("imageryProvider is required.");
  }
  //>>includeEnd('debug');

  const layer = new ImageryLayer(imageryProvider);
  this.add(layer, index);
  return layer;
};

/**
 * Removes a layer from this collection, if present.
 *
 * @param {ImageryLayer} layer The layer to remove.
 * @param {boolean} [destroy=true] whether to destroy the layers in addition to removing them.
 * @returns {boolean} true if the layer was in the collection and was removed,
 *                    false if the layer was not in the collection.
 */
ImageryLayerCollection.prototype.remove = function (layer, destroy) {
  destroy = defaultValue(destroy, true);

  const index = this._layers.indexOf(layer);
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
 * @param {boolean} [destroy=true] whether to destroy the layers in addition to removing them.
 */
ImageryLayerCollection.prototype.removeAll = function (destroy) {
  destroy = defaultValue(destroy, true);

  const layers = this._layers;
  for (let i = 0, len = layers.length; i < len; i++) {
    const layer = layers[i];
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
 * @returns {boolean} true if the collection contains the layer, false otherwise.
 */
ImageryLayerCollection.prototype.contains = function (layer) {
  return this.indexOf(layer) !== -1;
};

/**
 * Determines the index of a given layer in the collection.
 *
 * @param {ImageryLayer} layer The layer to find the index of.
 *
 * @returns {number} The index of the layer in the collection, or -1 if the layer does not exist in the collection.
 */
ImageryLayerCollection.prototype.indexOf = function (layer) {
  return this._layers.indexOf(layer);
};

/**
 * Gets a layer by index from the collection.
 *
 * @param {number} index the index to retrieve.
 *
 * @returns {ImageryLayer} The imagery layer at the given index.
 */
ImageryLayerCollection.prototype.get = function (index) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(index)) {
    throw new DeveloperError("index is required.", "index");
  }
  //>>includeEnd('debug');

  return this._layers[index];
};

function getLayerIndex(layers, layer) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(layer)) {
    throw new DeveloperError("layer is required.");
  }
  //>>includeEnd('debug');

  const index = layers.indexOf(layer);

  //>>includeStart('debug', pragmas.debug);
  if (index === -1) {
    throw new DeveloperError("layer is not in this collection.");
  }
  //>>includeEnd('debug');

  return index;
}

function swapLayers(collection, i, j) {
  const arr = collection._layers;
  i = CesiumMath.clamp(i, 0, arr.length - 1);
  j = CesiumMath.clamp(j, 0, arr.length - 1);

  if (i === j) {
    return;
  }

  const temp = arr[i];
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
ImageryLayerCollection.prototype.raise = function (layer) {
  const index = getLayerIndex(this._layers, layer);
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
ImageryLayerCollection.prototype.lower = function (layer) {
  const index = getLayerIndex(this._layers, layer);
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
ImageryLayerCollection.prototype.raiseToTop = function (layer) {
  const index = getLayerIndex(this._layers, layer);
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
ImageryLayerCollection.prototype.lowerToBottom = function (layer) {
  const index = getLayerIndex(this._layers, layer);
  if (index === 0) {
    return;
  }
  this._layers.splice(index, 1);
  this._layers.splice(0, 0, layer);

  this._update();

  this.layerMoved.raiseEvent(layer, 0, index);
};

const applicableRectangleScratch = new Rectangle();

function pickImageryHelper(scene, pickedLocation, pickFeatures, callback) {
  // Find the terrain tile containing the picked location.
  const tilesToRender = scene.globe._surface._tilesToRender;
  let pickedTile;

  for (
    let textureIndex = 0;
    !defined(pickedTile) && textureIndex < tilesToRender.length;
    ++textureIndex
  ) {
    const tile = tilesToRender[textureIndex];
    if (Rectangle.contains(tile.rectangle, pickedLocation)) {
      pickedTile = tile;
    }
  }

  if (!defined(pickedTile)) {
    return;
  }

  // Pick against all attached imagery tiles containing the pickedLocation.
  const imageryTiles = pickedTile.data.imagery;

  for (let i = imageryTiles.length - 1; i >= 0; --i) {
    const terrainImagery = imageryTiles[i];
    const imagery = terrainImagery.readyImagery;
    if (!defined(imagery)) {
      continue;
    }
    if (!imagery.imageryLayer.ready) {
      continue;
    }
    const provider = imagery.imageryLayer.imageryProvider;
    if (pickFeatures && !defined(provider.pickFeatures)) {
      continue;
    }

    if (!Rectangle.contains(imagery.rectangle, pickedLocation)) {
      continue;
    }

    // If this imagery came from a parent, it may not be applicable to its entire rectangle.
    // Check the textureCoordinateRectangle.
    const applicableRectangle = applicableRectangleScratch;

    const epsilon = 1 / 1024; // 1/4 of a pixel in a typical 256x256 tile.
    applicableRectangle.west = CesiumMath.lerp(
      pickedTile.rectangle.west,
      pickedTile.rectangle.east,
      terrainImagery.textureCoordinateRectangle.x - epsilon
    );
    applicableRectangle.east = CesiumMath.lerp(
      pickedTile.rectangle.west,
      pickedTile.rectangle.east,
      terrainImagery.textureCoordinateRectangle.z + epsilon
    );
    applicableRectangle.south = CesiumMath.lerp(
      pickedTile.rectangle.south,
      pickedTile.rectangle.north,
      terrainImagery.textureCoordinateRectangle.y - epsilon
    );
    applicableRectangle.north = CesiumMath.lerp(
      pickedTile.rectangle.south,
      pickedTile.rectangle.north,
      terrainImagery.textureCoordinateRectangle.w + epsilon
    );
    if (!Rectangle.contains(applicableRectangle, pickedLocation)) {
      continue;
    }

    callback(imagery);
  }
}

/**
 * Determines the imagery layers that are intersected by a pick ray. To compute a pick ray from a
 * location on the screen, use {@link Camera.getPickRay}.
 *
 * @param {Ray} ray The ray to test for intersection.
 * @param {Scene} scene The scene.
 * @return {ImageryLayer[]|undefined} An array that includes all of
 *                                 the layers that are intersected by a given pick ray. Undefined if
 *                                 no layers are selected.
 *
 */
ImageryLayerCollection.prototype.pickImageryLayers = function (ray, scene) {
  // Find the picked location on the globe.
  const pickedPosition = scene.globe.pick(ray, scene);
  if (!defined(pickedPosition)) {
    return;
  }

  const pickedLocation = scene.ellipsoid.cartesianToCartographic(
    pickedPosition
  );

  const imageryLayers = [];

  pickImageryHelper(scene, pickedLocation, false, function (imagery) {
    imageryLayers.push(imagery.imageryLayer);
  });

  if (imageryLayers.length === 0) {
    return undefined;
  }

  return imageryLayers;
};

/**
 * Asynchronously determines the imagery layer features that are intersected by a pick ray.  The intersected imagery
 * layer features are found by invoking {@link ImageryProvider#pickFeatures} for each imagery layer tile intersected
 * by the pick ray.  To compute a pick ray from a location on the screen, use {@link Camera.getPickRay}.
 *
 * @param {Ray} ray The ray to test for intersection.
 * @param {Scene} scene The scene.
 * @return {Promise<ImageryLayerFeatureInfo[]>|undefined} A promise that resolves to an array of features intersected by the pick ray.
 *                                             If it can be quickly determined that no features are intersected (for example,
 *                                             because no active imagery providers support {@link ImageryProvider#pickFeatures}
 *                                             or because the pick ray does not intersect the surface), this function will
 *                                             return undefined.
 *
 * @example
 * const pickRay = viewer.camera.getPickRay(windowPosition);
 * const featuresPromise = viewer.imageryLayers.pickImageryLayerFeatures(pickRay, viewer.scene);
 * if (!Cesium.defined(featuresPromise)) {
 *     console.log('No features picked.');
 * } else {
 *     Promise.resolve(featuresPromise).then(function(features) {
 *         // This function is called asynchronously when the list if picked features is available.
 *         console.log(`Number of features: ${features.length}`);
 *         if (features.length > 0) {
 *             console.log(`First feature name: ${features[0].name}`);
 *         }
 *     });
 * }
 */
ImageryLayerCollection.prototype.pickImageryLayerFeatures = function (
  ray,
  scene
) {
  // Find the picked location on the globe.
  const pickedPosition = scene.globe.pick(ray, scene);
  if (!defined(pickedPosition)) {
    return;
  }

  const pickedLocation = scene.ellipsoid.cartesianToCartographic(
    pickedPosition
  );

  const promises = [];
  const imageryLayers = [];

  pickImageryHelper(scene, pickedLocation, true, function (imagery) {
    if (!imagery.imageryLayer.ready) {
      return undefined;
    }
    const provider = imagery.imageryLayer.imageryProvider;
    const promise = provider.pickFeatures(
      imagery.x,
      imagery.y,
      imagery.level,
      pickedLocation.longitude,
      pickedLocation.latitude
    );
    if (defined(promise)) {
      promises.push(promise);
      imageryLayers.push(imagery.imageryLayer);
    }
  });

  if (promises.length === 0) {
    return undefined;
  }
  return Promise.all(promises).then(function (results) {
    const features = [];
    for (let resultIndex = 0; resultIndex < results.length; ++resultIndex) {
      const result = results[resultIndex];
      const image = imageryLayers[resultIndex];
      if (defined(result) && result.length > 0) {
        for (
          let featureIndex = 0;
          featureIndex < result.length;
          ++featureIndex
        ) {
          const feature = result[featureIndex];
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
 * Updates frame state to execute any queued texture re-projections.
 *
 * @private
 *
 * @param {FrameState} frameState The frameState.
 */
ImageryLayerCollection.prototype.queueReprojectionCommands = function (
  frameState
) {
  const layers = this._layers;
  for (let i = 0, len = layers.length; i < len; ++i) {
    layers[i].queueReprojectionCommands(frameState);
  }
};

/**
 * Cancels re-projection commands queued for the next frame.
 *
 * @private
 */
ImageryLayerCollection.prototype.cancelReprojections = function () {
  const layers = this._layers;
  for (let i = 0, len = layers.length; i < len; ++i) {
    layers[i].cancelReprojections();
  }
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} true if this object was destroyed; otherwise, false.
 *
 * @see ImageryLayerCollection#destroy
 */
ImageryLayerCollection.prototype.isDestroyed = function () {
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
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * layerCollection = layerCollection && layerCollection.destroy();
 *
 * @see ImageryLayerCollection#isDestroyed
 */
ImageryLayerCollection.prototype.destroy = function () {
  this.removeAll(true);
  return destroyObject(this);
};

ImageryLayerCollection.prototype._update = function () {
  let isBaseLayer = true;
  const layers = this._layers;
  let layersShownOrHidden;
  let layer;
  let i, len;
  for (i = 0, len = layers.length; i < len; ++i) {
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
export default ImageryLayerCollection;
