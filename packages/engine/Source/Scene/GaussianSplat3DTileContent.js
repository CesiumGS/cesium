import defined from "../Core/defined.js";
import Resource from "../Core/Resource.js";
import GltfLoader from "./GltfLoader.js";
import RuntimeError from "../Core/RuntimeError.js";
import Axis from "./Axis.js";
import GaussianSplatPrimitive from "./GaussianSplatPrimitive.js";
import destroyObject from "../Core/destroyObject.js";
import ModelUtility from "./Model/ModelUtility.js";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";
import deprecationWarning from "../Core/deprecationWarning.js";

/** @import Cesium3DTileContent from "./Cesium3DTileContent.js"; */

/**
 * Represents the contents of a glTF or glb using the {@link https://github.com/CesiumGS/glTF/tree/draft-splat-spz/extensions/2.0/Khronos/KHR_gaussian_splatting | KHR_gaussian_splatting} and {@link https://github.com/CesiumGS/glTF/tree/draft-splat-spz/extensions/2.0/Khronos/KHR_gaussian_splatting_compression_spz_2 | KHR_gaussian_splatting_compression_spz_2} extensions.
 * <p>
 * Implements the {@link Cesium3DTileContent} interface.
 * </p>
 *
 * @implements Cesium3DTileContent
 */
class GaussianSplat3DTileContent {
  constructor(loader, tileset, tile, resource) {
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
     * Local copy of the position attribute buffer transformed into root tile space.
     * The original glTF attribute data is kept untouched so rebuilds can re-apply
     * transforms from the source coordinates.
     * @type {undefined|Float32Array}
     * @private
     */
    this._positions = undefined;

    /**
     * Local copy of the rotation attribute buffer transformed into root tile space.
     * @type {undefined|Float32Array}
     * @private
     */
    this._rotations = undefined;

    /**
     * Local copy of the scale attribute buffer transformed into root tile space.
     * @type {undefined|Float32Array}
     * @private
     */
    this._scales = undefined;

    /**
     * glTF primitive data that contains the Gaussian splat data needed for rendering.
     * @type {undefined|Primitive}
     * @private
     */
    this.gltfPrimitive = undefined;

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

    /**
     * The degree of the spherical harmonics used for the Gaussian splats.
     * @type {number}
     * @private
     */
    this._sphericalHarmonicsDegree = 0;

    /**
     * The number of spherical harmonic coefficients used for the Gaussian splats.
     * @type {number}
     * @private
     */
    this._sphericalHarmonicsCoefficientCount = 0;

    /**
     * Spherical Harmonic data that has been packed for use in a texture or shader.
     * @type {undefined|Uint32Array}
     * @private
     */
    this._packedSphericalHarmonicsData = undefined;

    /**
     * Cached local-space-to-root transform used for the last splat bake.
     * When unchanged, the transformed buffers can be reused directly.
     * @type {undefined|Matrix4}
     * @private
     */
    this._lastSplatTransform = undefined;
  }

  /**
   * Performs checks to ensure that the provided tileset has the Gaussian Splatting extensions.
   *
   * @param {Cesium3DTileset} tileset The tileset to check for the extensions.
   * @returns {boolean} Returns <code>true</code> if the necessary extensions are included in the tileset.
   * @static
   */
  static tilesetRequiresGaussianSplattingExt(tileset) {
    let hasGaussianSplatExtension = false;
    if (tileset.isGltfExtensionRequired instanceof Function) {
      hasGaussianSplatExtension =
        tileset.isGltfExtensionRequired("KHR_gaussian_splatting") &&
        tileset.isGltfExtensionRequired(
          "KHR_gaussian_splatting_compression_spz_2",
        );

      if (
        tileset.isGltfExtensionRequired("KHR_spz_gaussian_splats_compression")
      ) {
        deprecationWarning(
          "KHR_spz_gaussian_splats_compression",
          "Support for the original KHR_spz_gaussian_splats_compression extension has been removed in favor " +
            "of the up to date KHR_gaussian_splatting and KHR_gaussian_splatting_compression_spz_2 extensions" +
            "\n\nPlease retile your tileset with the KHR_gaussian_splatting and " +
            "KHR_gaussian_splatting_compression_spz_2 extensions.",
        );
      }
    }

    return hasGaussianSplatExtension;
  }

  /**
   * Gets the number of features in the tile. Currently this is always zero.
   *
   *
   * @type {number}
   * @readonly
   */
  get featuresLength() {
    return 0;
  }

  /**
   * Equal to the number of Gaussian splats in the tile. Each splat is represented by a median point and a set of attributes, so we can
   * treat this as the number of points in the tile.
   *
   *
   * @type {number}
   * @readonly
   */
  get pointsLength() {
    return this.gltfPrimitive.attributes[0].count;
  }

  /**
   * Gets the number of triangles in the tile. Currently this is always zero because Gaussian splats are not represented as triangles in the tile content.
   * <p>
   *
   * @type {number}
   * @readonly
   */
  get trianglesLength() {
    return 0;
  }

  /**
   * The number of bytes used by the geometry attributes of this content.
   * <p>
   * @type {number}
   * @readonly
   */
  get geometryByteLength() {
    return 0;
  }

  /**
   * The number of bytes used by the textures of this content.
   * <p>
   * @type {number}
   * @readonly
   */
  get texturesByteLength() {
    const primitive = this._tileset?.gaussianSplatPrimitive;
    if (!defined(primitive)) {
      return 0;
    }
    const texture = primitive.gaussianSplatTexture;
    const selectedTileLength = primitive.selectedTileLength;
    if (!defined(texture) || selectedTileLength === 0) {
      return 0;
    }
    return texture.sizeInBytes / selectedTileLength;
  }

  /**
   * Gets the amount of memory used by the batch table textures and any binary
   * metadata properties not accounted for in geometryByteLength or
   * texturesByteLength
   * <p>
   *
   * @type {number}
   * @readonly
   */
  get batchTableByteLength() {
    return 0;
  }

  /**
   * Gets the array of {@link Cesium3DTileContent} objects for contents that contain other contents, such as composite tiles. The inner contents may in turn have inner contents, such as a composite tile that contains a composite tile.
   *
   * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/Composite|Composite specification}
   *
   *
   * @type {Array}
   * @readonly
   */
  get innerContents() {
    return undefined;
  }

  /**
   * Returns true when the tile's content is ready to render; otherwise false
   *
   *
   * @type {boolean}
   * @readonly
   */
  get ready() {
    return this._ready;
  }

  /**
   * Returns true when the tile's content is transformed to world coordinates; otherwise false
   * <p>
   * @type {boolean}
   * @readonly
   */
  get transformed() {
    return this._transformed;
  }

  /**
   * The tileset that this content belongs to.
   * <p>
   * @type {Cesium3DTileset}
   * @readonly
   */
  get tileset() {
    return this._tileset;
  }

  /**
   * The tile that this content belongs to.
   * <p>
   * @type {Cesium3DTile}
   * @readonly
   */
  get tile() {
    return this._tile;
  }

  /**
   * The resource that this content was loaded from.
   * <p>
   * @type {string}
   * @readonly
   */
  get url() {
    return this._resource.getUrlComponent(true);
  }

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
  get batchTable() {
    return undefined;
  }

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
  get metadata() {
    return this._metadata;
  }

  set metadata(value) {
    this._metadata = value;
  }

  /**
   * Gets the group for this content if the content has metadata (3D Tiles 1.1) or
   * if it uses the <code>3DTILES_metadata</code> extension. If neither are present,
   * this property should be undefined.
   * <p>
   * This is used to implement the <code>Cesium3DTileContent</code> interface, but is
   * not part of the public Cesium API.
   * </p>
   *
   * @type {Cesium3DContentGroup|undefined}
   *
   * @private
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  get group() {
    return this._group;
  }

  set group(value) {
    this._group = value;
  }

  /**
   * Get the transformed positions of this tile's Gaussian splats.
   * @type {undefined|Float32Array}
   * @private
   */
  get positions() {
    return this._positions;
  }

  /**
   * Get the transformed rotations of this tile's Gaussian splats.
   * @type {undefined|Float32Array}
   * @private
   */
  get rotations() {
    return this._rotations;
  }

  /**
   * Get the transformed scales of this tile's Gaussian splats.
   * @type {undefined|Float32Array}
   * @private
   */
  get scales() {
    return this._scales;
  }

  /**
   * The number of spherical harmonic coefficients used for the Gaussian splats.
   * @type {number}
   * @private
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  get sphericalHarmonicsCoefficientCount() {
    return this._sphericalHarmonicsCoefficientCount;
  }

  /**
   * The degree of the spherical harmonics used for the Gaussian splats.
   * @type {number}
   * @private
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  get sphericalHarmonicsDegree() {
    return this._sphericalHarmonicsDegree;
  }

  /**
   * The packed spherical harmonic data for the Gaussian splats for use a shader or texture.
   * @type {number}
   * @private
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  get packedSphericalHarmonicsData() {
    return this._packedSphericalHarmonicsData;
  }

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
  static async fromGltf(tileset, tile, resource, gltf) {
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
  }

  /**
   * Updates the content of the tile and prepares it for rendering.
   * @param {Cesium3DTileset}￼Data attribution
   * @param {FrameState} frameState - The current frame state.
   * @private
   */
  update(primitive, frameState) {
    const loader = this._loader;

    if (this._ready) {
      return;
    }

    frameState.afterRender.push(() => true);

    if (!defined(loader)) {
      this._ready = true;
      return;
    }

    if (this._resourcesLoaded) {
      this.gltfPrimitive = loader.components.scene.nodes[0].primitives[0];
      this.worldTransform = loader.components.scene.nodes[0].matrix;
      this._ready = true;

      // SPZ decode produces Float32Array attributes for these semantics, so
      // typedArray.slice() preserves the expected runtime type for current data.
      // If future splat encodings use quantized integer attributes here, revisit
      // this assumption before relying on the copied array type.
      this._positions = ModelUtility.getAttributeBySemantic(
        this.gltfPrimitive,
        VertexAttributeSemantic.POSITION,
      ).typedArray.slice();

      this._rotations = ModelUtility.getAttributeBySemantic(
        this.gltfPrimitive,
        VertexAttributeSemantic.ROTATION,
      ).typedArray.slice();

      this._scales = ModelUtility.getAttributeBySemantic(
        this.gltfPrimitive,
        VertexAttributeSemantic.SCALE,
      ).typedArray.slice();

      const packedSphericalHarmonicsAttribute =
        getPackedSphericalHarmonicsAttribute(this.gltfPrimitive.attributes);
      if (defined(packedSphericalHarmonicsAttribute)) {
        this._sphericalHarmonicsDegree =
          packedSphericalHarmonicsAttribute.sphericalHarmonicsDegree;
        this._sphericalHarmonicsCoefficientCount =
          packedSphericalHarmonicsAttribute.sphericalHarmonicsCoefficientCount;
        this._packedSphericalHarmonicsData =
          packedSphericalHarmonicsAttribute.packedSphericalHarmonicsData;
      }

      return;
    }

    this._resourcesLoaded = loader.process(frameState);
  }

  /**
   * Returns whether the feature has this property.
   *
   * @param {number} batchId The batchId for the feature.
   * @param {string} name The case-sensitive name of the property.
   * @returns {boolean} <code>true</code> if the feature has this property; otherwise, <code>false</code>.
   */
  hasProperty(batchId, name) {
    return false;
  }

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
  getFeature(batchId) {
    return undefined;
  }

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
  applyDebugSettings(enabled, color) {}

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
  applyStyle(style) {}

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
  pick(ray, frameState, result) {
    return undefined;
  }

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
  isDestroyed() {
    return this.isDestroyed;
  }

  /**
   * Frees the resources used by this object.
   * @private
   */
  destroy() {
    this.splatPrimitive = undefined;

    this._tile = undefined;
    this._tileset = undefined;
    this._resource = undefined;
    this._ready = false;
    this._group = undefined;
    this._metadata = undefined;
    this._resourcesLoaded = false;
    this._lastSplatTransform = undefined;

    if (defined(this._loader)) {
      this._loader.destroy();
      this._loader = undefined;
    }

    return destroyObject(this);
  }
}

function getPackedSphericalHarmonicsAttribute(attributes) {
  for (let i = 0; i < attributes.length; i++) {
    const attribute = attributes[i];
    if (defined(attribute.packedSphericalHarmonicsData)) {
      return attribute;
    }
  }

  return undefined;
}

export default GaussianSplat3DTileContent;
