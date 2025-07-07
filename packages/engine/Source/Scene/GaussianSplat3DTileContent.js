import defined from "../Core/defined.js";
import Resource from "../Core/Resource.js";
import GltfLoader from "./GltfLoader.js";
import RuntimeError from "../Core/RuntimeError.js";
import Axis from "./Axis.js";
import GaussianSplatPrimitive from "./GaussianSplatPrimitive.js";
import destroyObject from "../Core/destroyObject.js";
import ModelUtility from "./Model/ModelUtility.js";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";

/**
 * Represents the contents of a glTF or glb using the {@link https://github.com/CesiumGS/glTF/tree/draft-spz-splat-compression/extensions/2.0/Khronos/KHR_spz_gaussian_splats_compression|KHR_spz_gaussian_splats_compression} extension.
 * <p>
 * Implements the {@link Cesium3DTileContent} interface.
 * </p>
 *
 * @alias GaussianSplat3DTileContent
 * @constructor
 * @private
 */
function GaussianSplat3DTileContent(loader, tileset, tile, resource) {
  this._tileset = tileset;
  this._tile = tile;
  this._resource = resource;
  this._loader = loader;

  if (!defined(this._tileset.gaussianSplatPrimitive)) {
    this._tileset.gaussianSplatPrimitive = new GaussianSplatPrimitive({
      tileset: this._tileset,
    });
  }

  /**
   * Original position, scale and rotation values for splats. Used to maintain
   * consistency when multiple transforms may occur. Downstream consumers otherwise may not know
   * the underlying data was modified.
   * @type {undefined|Float32Array}
   * @private
   */
  this._originalPositions = undefined;
  this._originalRotations = undefined;
  this._originalScales = undefined;

  /**
   * glTF primitive data that contains the Gaussian splat data needed for rendering.
   * @type {undefined|Primitive}
   * @private
   */
  this.splatPrimitive = undefined;

  /**
   * Transform matrix to turn model coordinates into world coordinates.
   * @type {undefined|Matrix4}
   * @private
   */
  this.worldTransform = undefined;

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

  this._metadata = undefined;
  this._group = undefined;
  this._ready = false;
  /**
   * Indicates whether or not the local coordinates of the tile have been transformed
   * @type {boolean}
   * @private
   */
  this._transformed = false;
}

Object.defineProperties(GaussianSplat3DTileContent.prototype, {
  /**
   * Gets the number of features in the tile. Currently this is always zero.
   *
   * @memberof GaussianSplat3DTileContent.prototype
   *
   * @type {number}
   * @readonly
   */
  featuresLength: {
    get: function () {
      return 0;
    },
  },

  /**
   * Equal to the number of Gaussian splats in the tile. Each splat is represented by a median point and a set of attributes, so we can
   * treat this as the number of points in the tile.
   *
   * @memberof GaussianSplat3DTileContent.prototype
   *
   * @type {number}
   * @readonly
   */
  pointsLength: {
    get: function () {
      return this.splatPrimitive.attributes[0].count;
    },
  },
  /**
   * Gets the number of triangles in the tile. Currently this is always zero because Gaussian splats are not represented as triangles in the tile content.
   * <p>
   * @memberof GaussianSplat3DTileContent.prototype
   *
   * @type {number}
   * @readonly
   */
  trianglesLength: {
    get: function () {
      return 0;
    },
  },
  /**
   * The number of bytes used by the geometry attributes of this content.
   * <p>
   * @memberof GaussianSplat3DTileContent.prototype
   * @type {number}
   * @readonly
   */
  geometryByteLength: {
    get: function () {
      return this.splatPrimitive.attributes.reduce((totalLength, attribute) => {
        return totalLength + attribute.byteLength;
      }, 0);
    },
  },
  /**
   * The number of bytes used by the textures of this content.
   * <p>
   * @memberof GaussianSplat3DTileContent.prototype
   * @type {number}
   * @readonly
   */
  texturesByteLength: {
    get: function () {
      const texture = this._tileset.gaussianSplatPrimitive.gaussianSplatTexture;
      const selectedTileLength =
        this._tileset.gaussianSplatPrimitive.selectedTileLength;
      if (!defined(texture) || selectedTileLength === 0) {
        return 0;
      }
      return texture.sizeInBytes / selectedTileLength;
    },
  },
  /**
   * Gets the amount of memory used by the batch table textures and any binary
   * metadata properties not accounted for in geometryByteLength or
   * texturesByteLength
   * <p>
   * @memberof GaussianSplat3DTileContent.prototype
   *
   * @type {number}
   * @readonly
   */
  batchTableByteLength: {
    // eslint-disable-next-line getter-return
    get: function () {
      return 0;
    },
  },
  /**
   * Gets the array of {@link Cesium3DTileContent} objects for contents that contain other contents, such as composite tiles. The inner contents may in turn have inner contents, such as a composite tile that contains a composite tile.
   *
   * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/Composite|Composite specification}
   *
   * @memberof GaussianSplat3DTileContent.prototype
   *
   * @type {Array}
   * @readonly
   */
  innerContents: {
    get: function () {
      return undefined;
    },
  },

  /**
   * Returns true when the tile's content is ready to render; otherwise false
   *
   * @memberof GaussianSplat3DTileContent.prototype
   *
   * @type {boolean}
   * @readonly
   */
  ready: {
    get: function () {
      return this._ready;
    },
  },

  /**
   * Returns true when the tile's content is transformed to world coordinates; otherwise false
   * <p>
   * @memberof GaussianSplat3DTileContent.prototype
   * @type {boolean}
   * @readonly
   */
  transformed: {
    get: function () {
      return this._transformed;
    },
  },

  /**
   * The tileset that this content belongs to.
   * <p>
   * @memberof GaussianSplat3DTileContent.prototype
   * @type {Cesium3DTileset}
   * @readonly
   */
  tileset: {
    get: function () {
      return this._tileset;
    },
  },
  /**
   * The tile that this content belongs to.
   * <p>
   * @memberof GaussianSplat3DTileContent.prototype
   * @type {Cesium3DTile}
   * @readonly
   */
  tile: {
    get: function () {
      return this._tile;
    },
  },
  /**
   * The resource that this content was loaded from.
   * <p>
   * @memberof GaussianSplat3DTileContent.prototype
   * @type {Resource}
   * @readonly
   */
  url: {
    get: function () {
      return this._resource.getUrlComponent(true);
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
    get: function () {
      return undefined;
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
    get: function () {
      return this._metadata;
    },
    set: function (value) {
      this._metadata = value;
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
    get: function () {
      return this._group;
    },
    set: function (value) {
      this._group = value;
    },
  },
});

/**
 * Creates a new instance of {@link GaussianSplat3DTileContent} from a glTF or glb resource.
 *
 * @param {Cesium3DTileset} tileset - The tileset that this content belongs to.
 * @param {Cesium3DTile} tile - The tile that this content belongs to.
 * @param {Resource|string} resource - The resource or URL of the glTF or glb file.
 * @param {object|Uint8Array} gltf - The glTF JSON object or a Uint8Array containing the glb binary data.
 * @returns {GaussianSplat3DTileContent} A new GaussianSplat3DTileContent instance.
 * @throws {RuntimeError} If the glTF or glb fails to load.
 * @private
 */
GaussianSplat3DTileContent.fromGltf = async function (
  tileset,
  tile,
  resource,
  gltf,
) {
  const basePath = resource;
  const baseResource = Resource.createIfNeeded(basePath);

  const loaderOptions = {
    releaseGltfJson: false,
    upAxis: Axis.Y,
    forwardAxis: Axis.Z,
  };

  if (defined(gltf.asset)) {
    loaderOptions.gltfJson = gltf;
    loaderOptions.baseResource = baseResource;
    loaderOptions.gltfResource = baseResource;
  } else if (gltf instanceof Uint8Array) {
    loaderOptions.typedArray = gltf;
    loaderOptions.baseResource = baseResource;
    loaderOptions.gltfResource = baseResource;
  } else {
    loaderOptions.gltfResource = Resource.createIfNeeded(gltf);
  }

  const loader = new GltfLoader(loaderOptions);

  try {
    await loader.load();
  } catch (error) {
    loader.destroy();
    throw new RuntimeError(`Failed to load glTF: ${error.message}`);
  }

  return new GaussianSplat3DTileContent(loader, tileset, tile, resource);
};

/**
 * Updates the content of the tile and prepares it for rendering.
 * @param {Cesium3DTileset}￼Data attribution
 * @param {FrameState} frameState - The current frame state.
 * @private
 */
GaussianSplat3DTileContent.prototype.update = function (primitive, frameState) {
  const loader = this._loader;

  if (this._ready) {
    if (!this._transformed && primitive.root.content.ready) {
      GaussianSplatPrimitive.transformTile(this._tile);
      this._transformed = true;
    }

    return;
  }

  frameState.afterRender.push(() => true);

  if (!defined(loader)) {
    this._ready = true;
    return;
  }

  if (this._resourcesLoaded) {
    this.splatPrimitive = loader.components.scene.nodes[0].primitives[0];
    this.worldTransform = loader.components.scene.nodes[0].matrix;
    this._ready = true;

    this._originalPositions = new Float32Array(
      ModelUtility.getAttributeBySemantic(
        this.splatPrimitive,
        VertexAttributeSemantic.POSITION,
      ).typedArray,
    );

    this._originalRotations = new Float32Array(
      ModelUtility.getAttributeBySemantic(
        this.splatPrimitive,
        VertexAttributeSemantic.ROTATION,
      ).typedArray,
    );

    this._originalScales = new Float32Array(
      ModelUtility.getAttributeBySemantic(
        this.splatPrimitive,
        VertexAttributeSemantic.SCALE,
      ).typedArray,
    );

    return;
  }

  this._resourcesLoaded = loader.process(frameState);
};
/**
 * Returns whether the feature has this property.
 *
 * @param {number} batchId The batchId for the feature.
 * @param {string} name The case-sensitive name of the property.
 * @returns {boolean} <code>true</code> if the feature has this property; otherwise, <code>false</code>.
 */
GaussianSplat3DTileContent.prototype.hasProperty = function (batchId, name) {
  return false;
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
GaussianSplat3DTileContent.prototype.getFeature = function (batchId) {
  return undefined;
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
GaussianSplat3DTileContent.prototype.applyDebugSettings = function (
  enabled,
  color,
) {};
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
GaussianSplat3DTileContent.prototype.applyStyle = function (style) {};
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
GaussianSplat3DTileContent.prototype.pick = function (ray, frameState, result) {
  return undefined;
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
GaussianSplat3DTileContent.prototype.isDestroyed = function () {
  return this.isDestroyed;
};

/**
 * Frees the resources used by this object.
 * @private
 */
GaussianSplat3DTileContent.prototype.destroy = function () {
  this.splatPrimitive = undefined;
  this._tileset.gaussianSplatPrimitive.destroy();
  this._tileset.gaussianSplatPrimitive = undefined;
  this._tile = undefined;
  this._tileset = undefined;
  this._resource = undefined;
  this._ready = false;
  this._group = undefined;
  this._metadata = undefined;
  this._resourcesLoaded = false;

  if (defined(this._loader)) {
    this._loader.destroy();
    this._loader = undefined;
  }

  return destroyObject(this);
};

export default GaussianSplat3DTileContent;
