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
function Cesium3DTileContent() {
  /**
   * Gets or sets if any feature's property changed.  Used to
   * optimized applying a style when a feature's property changed.
   * <p>
   * This is used to implement the <code>Cesium3DTileContent</code> interface, but is
   * not part of the public Cesium API.
   * </p>
   *
   * @type {boolean}
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
   * @type {number}
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
   * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/PointCloud#batched-points}
   *
   * @memberof Cesium3DTileContent.prototype
   *
   * @type {number}
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
   * @type {number}
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
   * @type {number}
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
   * @type {number}
   * @readonly
   */
  texturesByteLength: {
    // eslint-disable-next-line getter-return
    get: function () {
      DeveloperError.throwInstantiationError();
    },
  },

  /**
   * Gets the amount of memory used by the batch table textures and any binary
   * metadata properties not accounted for in geometryByteLength or
   * texturesByteLength
   *
   * @memberof Cesium3DTileContent.prototype
   *
   * @type {number}
   * @readonly
   */
  batchTableByteLength: {
    // eslint-disable-next-line getter-return
    get: function () {
      DeveloperError.throwInstantiationError();
    },
  },

  /**
   * Gets the array of {@link Cesium3DTileContent} objects for contents that contain other contents, such as composite tiles. The inner contents may in turn have inner contents, such as a composite tile that contains a composite tile.
   *
   * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/Composite|Composite specification}
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
   * Returns true when the tile's content is ready to render; otherwise false
   *
   * @memberof Cesium3DTileContent.prototype
   *
   * @type {boolean}
   * @readonly
   */
  ready: {
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
   * @type {string}
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

  /**
   * Gets the metadata for this content, whether it is available explicitly or via
   * implicit tiling. If there is no metadata, this property should be undefined.
   * <p>
   * This is used to implement the <code>Cesium3DTileContent</code> interface, but is
   * not part of the public Cesium API.
   * </p>
   *
   * @type {ImplicitMetadataView|undefined}
   *
   * @private
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  metadata: {
    // eslint-disable-next-line getter-return
    get: function () {
      DeveloperError.throwInstantiationError();
    },
    set: function (value) {
      DeveloperError.throwInstantiationError();
    },
  },

  /**
   * Gets the group for this content if the content has metadata (3D Tiles 1.1) or
   * if it uses the <code>3DTILES_metadata</code> extension. If neither are present,
   * this property should be undefined.
   * <p>
   * This is used to implement the <code>Cesium3DTileContent</code> interface, but is
   * not part of the public Cesium API.
   * </p>
   *
   * @type {Cesium3DTileContentGroup|undefined}
   *
   * @private
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  group: {
    // eslint-disable-next-line getter-return
    get: function () {
      DeveloperError.throwInstantiationError();
    },
    set: function (value) {
      DeveloperError.throwInstantiationError();
    },
  },
});

/**
 * Returns whether the feature has this property.
 *
 * @param {number} batchId The batchId for the feature.
 * @param {string} name The case-sensitive name of the property.
 * @returns {boolean} <code>true</code> if the feature has this property; otherwise, <code>false</code>.
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
 * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/BatchTable}.
 *
 * @param {number} batchId The batchId for the feature.
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
     * @param {boolean} enabled Whether to enable or disable debug settings.
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
 * Find an intersection between a ray and the tile content surface that was rendered. The ray must be given in world coordinates.
 *
 * @param {Ray} ray The ray to test for intersection.
 * @param {FrameState} frameState The frame state.
 * @param {Cartesian3|undefined} [result] The intersection or <code>undefined</code> if none was found.
 * @returns {Cartesian3|undefined} The intersection or <code>undefined</code> if none was found.
 *
 * @private
 */
Cesium3DTileContent.prototype.pick = function (ray, frameState, result) {
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
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
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
