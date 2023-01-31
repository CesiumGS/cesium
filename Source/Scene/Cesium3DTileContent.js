import DeveloperError from "../Core/DeveloperError.js";

/**
 * The content of a tile in a {@link Cesium3DTileset}.
 * <p>
 * Derived classes of this interface provide access to individual features in the tile.
 * Access derived objects through {@link Cesium3DTile#content}.
 * </p>
 * <p>
 * This type describes an interface and is not intended to be instantiated directly.
 * </p>
 *
 * @alias Cesium3DTileContent
 * @constructor
 */
function Cesium3DTileContent(tileset, tile, url, arrayBuffer, byteOffset) {
  /**
   * Gets or sets if any feature's property changed.  Used to
   * optimized applying a style when a feature's property changed.
   * <p>
   * This is used to implement the <code>Cesium3DTileContent</code> interface, but is
   * not part of the public Cesium API.
   * </p>
   *
   * @type {Boolean}
   *
   * @private
   */
  this.featurePropertiesDirty = false;
}

Object.defineProperties(Cesium3DTileContent.prototype, {
  /**
   * Gets the number of features in the tile.
   *
   * @memberof Cesium3DTileContent.prototype
   *
   * @type {Number}
   * @readonly
   */
  featuresLength: {
    // eslint-disable-next-line getter-return
    get: function () {
      DeveloperError.throwInstantiationError();
    },
  },

  /**
   * Gets the number of points in the tile.
   * <p>
   * Only applicable for tiles with Point Cloud content. This is different than {@link Cesium3DTileContent#featuresLength} which
   * equals the number of groups of points as distinguished by the <code>BATCH_ID</code> feature table semantic.
   * </p>
   *
   * @see {@link https://github.com/CesiumGS/3d-tiles/tree/master/specification/TileFormats/PointCloud#batched-points}
   *
   * @memberof Cesium3DTileContent.prototype
   *
   * @type {Number}
   * @readonly
   */
  pointsLength: {
    // eslint-disable-next-line getter-return
    get: function () {
      DeveloperError.throwInstantiationError();
    },
  },

  /**
   * Gets the number of triangles in the tile.
   *
   * @memberof Cesium3DTileContent.prototype
   *
   * @type {Number}
   * @readonly
   */
  trianglesLength: {
    // eslint-disable-next-line getter-return
    get: function () {
      DeveloperError.throwInstantiationError();
    },
  },

  /**
   * Gets the tile's geometry memory in bytes.
   *
   * @memberof Cesium3DTileContent.prototype
   *
   * @type {Number}
   * @readonly
   */
  geometryByteLength: {
    // eslint-disable-next-line getter-return
    get: function () {
      DeveloperError.throwInstantiationError();
    },
  },

  /**
   * Gets the tile's texture memory in bytes.
   *
   * @memberof Cesium3DTileContent.prototype
   *
   * @type {Number}
   * @readonly
   */
  texturesByteLength: {
    // eslint-disable-next-line getter-return
    get: function () {
      DeveloperError.throwInstantiationError();
    },
  },

  /**
   * Gets the amount of memory used by the batch table textures, in bytes.
   *
   * @memberof Cesium3DTileContent.prototype
   *
   * @type {Number}
   * @readonly
   */
  batchTableByteLength: {
    // eslint-disable-next-line getter-return
    get: function () {
      DeveloperError.throwInstantiationError();
    },
  },

  /**
   * Gets the array of {@link Cesium3DTileContent} objects that represent the
   * content a composite's inner tiles, which can also be composites.
   *
   * @see {@link https://github.com/CesiumGS/3d-tiles/tree/master/specification/TileFormats/Composite}
   *
   * @memberof Cesium3DTileContent.prototype
   *
   * @type {Array}
   * @readonly
   */
  innerContents: {
    // eslint-disable-next-line getter-return
    get: function () {
      DeveloperError.throwInstantiationError();
    },
  },

  /**
   * Gets the promise that will be resolved when the tile's content is ready to render.
   *
   * @memberof Cesium3DTileContent.prototype
   *
   * @type {Promise.<Cesium3DTileContent>}
   * @readonly
   */
  readyPromise: {
    // eslint-disable-next-line getter-return
    get: function () {
      DeveloperError.throwInstantiationError();
    },
  },

  /**
   * Gets the tileset for this tile.
   *
   * @memberof Cesium3DTileContent.prototype
   *
   * @type {Cesium3DTileset}
   * @readonly
   */
  tileset: {
    // eslint-disable-next-line getter-return
    get: function () {
      DeveloperError.throwInstantiationError();
    },
  },

  /**
   * Gets the tile containing this content.
   *
   * @memberof Cesium3DTileContent.prototype
   *
   * @type {Cesium3DTile}
   * @readonly
   */
  tile: {
    // eslint-disable-next-line getter-return
    get: function () {
      DeveloperError.throwInstantiationError();
    },
  },

  /**
   * Gets the url of the tile's content.
   * @memberof Cesium3DTileContent.prototype
   *
   * @type {String}
   * @readonly
   */
  url: {
    // eslint-disable-next-line getter-return
    get: function () {
      DeveloperError.throwInstantiationError();
    },
  },

  /**
   * Gets the batch table for this content.
   * <p>
   * This is used to implement the <code>Cesium3DTileContent</code> interface, but is
   * not part of the public Cesium API.
   * </p>
   *
   * @type {Cesium3DTileBatchTable}
   * @readonly
   *
   * @private
   */
  batchTable: {
    // eslint-disable-next-line getter-return
    get: function () {
      DeveloperError.throwInstantiationError();
    },
  },
});

/**
 * Determines if the tile's batch table has a property.  If it does, each feature in
 * the tile will have the property.
 *
 * @param {Number} batchId The batchId for the feature.
 * @param {String} name The case-sensitive name of the property.
 * @returns {Boolean} <code>true</code> if the property exists; otherwise, <code>false</code>.
 */
Cesium3DTileContent.prototype.hasProperty = function (batchId, name) {
  DeveloperError.throwInstantiationError();
};

/**
 * Returns the {@link Cesium3DTileFeature} object for the feature with the
 * given <code>batchId</code>.  This object is used to get and modify the
 * feature's properties.
 * <p>
 * Features in a tile are ordered by <code>batchId</code>, an index used to retrieve their metadata from the batch table.
 * </p>
 *
 * @see {@link https://github.com/CesiumGS/3d-tiles/tree/master/specification/TileFormats/BatchTable}.
 *
 * @param {Number} batchId The batchId for the feature.
 * @returns {Cesium3DTileFeature} The corresponding {@link Cesium3DTileFeature} object.
 *
 * @exception {DeveloperError} batchId must be between zero and {@link Cesium3DTileContent#featuresLength} - 1.
 */
Cesium3DTileContent.prototype.getFeature = function (batchId) {
  DeveloperError.throwInstantiationError();
};

/**
     * Called when {@link Cesium3DTileset#debugColorizeTiles} changes.
     * <p>
     * This is used to implement the <code>Cesium3DTileContent</code> interface, but is
     * not part of the public Cesium API.
     * </p>
     *
     * @param {Boolean} enabled Whether to enable or disable debug settings.
     * @returns {Cesium3DTileFeature} The corresponding {@link Cesium3DTileFeature} object.

     * @private
     */
Cesium3DTileContent.prototype.applyDebugSettings = function (enabled, color) {
  DeveloperError.throwInstantiationError();
};

/**
 * Apply a style to the content
 * <p>
 * This is used to implement the <code>Cesium3DTileContent</code> interface, but is
 * not part of the public Cesium API.
 * </p>
 *
 * @param {Cesium3DTileStyle} style The style.
 *
 * @private
 */
Cesium3DTileContent.prototype.applyStyle = function (style) {
  DeveloperError.throwInstantiationError();
};

/**
 * Called by the tile during tileset traversal to get the draw commands needed to render this content.
 * When the tile's content is in the PROCESSING state, this creates WebGL resources to ultimately
 * move to the READY state.
 * <p>
 * This is used to implement the <code>Cesium3DTileContent</code> interface, but is
 * not part of the public Cesium API.
 * </p>
 *
 * @param {Cesium3DTileset} tileset The tileset containing this tile.
 * @param {FrameState} frameState The frame state.
 *
 * @private
 */
Cesium3DTileContent.prototype.update = function (tileset, frameState) {
  DeveloperError.throwInstantiationError();
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 * <p>
 * This is used to implement the <code>Cesium3DTileContent</code> interface, but is
 * not part of the public Cesium API.
 * </p>
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see Cesium3DTileContent#destroy
 *
 * @private
 */
Cesium3DTileContent.prototype.isDestroyed = function () {
  DeveloperError.throwInstantiationError();
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 * <p>
 * This is used to implement the <code>Cesium3DTileContent</code> interface, but is
 * not part of the public Cesium API.
 * </p>
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @example
 * content = content && content.destroy();
 *
 * @see Cesium3DTileContent#isDestroyed
 *
 * @private
 */
Cesium3DTileContent.prototype.destroy = function () {
  DeveloperError.throwInstantiationError();
};
export default Cesium3DTileContent;
