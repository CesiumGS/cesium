import defined from "../Core/defined.js";
import Resource from "../Core/Resource.js";
import GltfLoader from "./GltfLoader.js";
import RuntimeError from "../Core/RuntimeError.js";
import Axis from "./Axis.js";
import GaussianSplatPrimitive from "./GaussianSplatPrimitive.js";
import destroyObject from "../Core/destroyObject.js";
import ModelUtility from "./Model/ModelUtility.js";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";

const GaussianSplatTextureGeneratorState = {
  UNINITIALIZED: 0,
  PENDING: 1,
  READY: 2,
  ERROR: 3,
};

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
  // this._originalPositions = undefined;
  // this._originalRotations = undefined;
  // this._originalScales = undefined;

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

  this._textureGeneratorState =
    GaussianSplatTextureGeneratorState.UNINITIALIZED;
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

    if (
      this._textureGeneratorState ===
      GaussianSplatTextureGeneratorState.UNINITIALIZED
    ) {
      const attributePositions = ModelUtility.getAttributeBySemantic(
        this.splatPrimitive,
        VertexAttributeSemantic.POSITION,
      ).typedArray;

      const attributeRotations = ModelUtility.getAttributeBySemantic(
        this.splatPrimitive,
        VertexAttributeSemantic.ROTATION,
      ).typedArray;

      const attributeScales = ModelUtility.getAttributeBySemantic(
        this.splatPrimitive,
        VertexAttributeSemantic.SCALE,
      ).typedArray;

      // Create texture data. Colors are already how we want them.
      this._positionTextureData = makePositionTextureData(attributePositions);
      this._covarianceTextureData = makeCovarianceTextureData(
        attributeScales,
        attributeRotations,
        this.pointsLength,
      );

      if (this.shDegree > 0) {
        const packedData = packSphericalHarmonicData(this);
        this._sh1TextureData = makeSh1TextureData(packedData);

        if (this.shDegree > 1) {
          this._sh2TextureData = makeSh2TextureData(packedData);
        }

        if (this.shDegree > 2) {
          this._sh3TextureData = makeSh3TextureData(packedData);
        }
      }
      return;
    }
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

    const { l, n } = degreeAndCoefFromAttributes(
      this.splatPrimitive.attributes,
    );
    this.shDegree = l;
    this.shCoefficientCount = n;

    this._packedShData = packSphericalHarmonicData(this);

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

  if (
    defined(this._tileset.gaussianSplatPrimitive) &&
    !this._tileset.gaussianSplatPrimitive.isDestroyed()
  ) {
    this._tileset.gaussianSplatPrimitive.destroy();
  }
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

/**
 * Determine Spherical Harmonics degree from attributes
 * @param {} attribute
 * @returns
 */
function degreeAndCoefFromAttributes(attributes) {
  const prefix = "_SH_DEGREE_";
  const shAttributes = attributes.filter((attr) =>
    attr.name.startsWith(prefix),
  );

  switch (shAttributes.length) {
    default:
    case 0:
      return { l: 0, n: 0 };
    case 3:
      return { l: 1, n: 9 };
    case 8:
      return { l: 2, n: 24 };
    case 15:
      return { l: 3, n: 45 };
  }
}

const buffer = new ArrayBuffer(4);
const floatView = new Float32Array(buffer);
const intView = new Uint32Array(buffer);

function float32ToFloat16(float32) {
  floatView[0] = float32;
  const bits = intView[0];

  const sign = (bits >> 31) & 0x1;
  const exponent = (bits >> 23) & 0xff;
  const mantissa = bits & 0x7fffff;

  let half;

  if (exponent === 0xff) {
    half = (sign << 15) | (0x1f << 10) | (mantissa ? 0x200 : 0);
  } else if (exponent === 0) {
    half = sign << 15;
  } else {
    const newExponent = exponent - 127 + 15;
    if (newExponent >= 31) {
      half = (sign << 15) | (0x1f << 10);
    } else if (newExponent <= 0) {
      half = sign << 15;
    } else {
      half = (sign << 15) | (newExponent << 10) | (mantissa >>> 13);
    }
  }

  return half;
}

//duplicated from vertexbufferloader. new splat utils?
function extractSHDegreeAndCoef(attribute) {
  const prefix = "_SH_DEGREE_";
  const separator = "_COEF_";

  const lStart = prefix.length;
  const coefIndex = attribute.indexOf(separator, lStart);

  const l = parseInt(attribute.slice(lStart, coefIndex), 10);
  const n = parseInt(attribute.slice(coefIndex + separator.length), 10);

  return { l, n };
}

function baseAndStrideFromSHDegree(degree) {
  switch (degree) {
    case 1:
      return { base: 0, stride: 9 };
    case 2:
      return { base: 9, stride: 24 };
    case 3:
      return { base: 24, stride: 45 };
  }
}

/**
 * Packs spherical harmonic data into half-precision floats.
 * @param {*} data - The input data to pack.
 * @param {*} shDegree - The spherical harmonic degree.
 * @returns {Float32Array} - The packed data.
 */
function packSphericalHarmonicData(tileContent) {
  const degree = tileContent.shDegree;
  const coefs = tileContent.shCoefficientCount;
  const totalLength = tileContent.pointsLength * coefs;
  const packedData = new Uint16Array(totalLength);

  const shAttributes = tileContent.splatPrimitive.attributes.filter((attr) =>
    attr.name.startsWith("_SH_DEGREE_"),
  );
  const { base, stride } = baseAndStrideFromSHDegree(degree);

  shAttributes.sort((a, b) => {
    if (a.name < b.name) {
      return -1;
    }
    if (a.name > b.name) {
      return 1;
    }
    return 0;
  });

  for (let i = 0; i < shAttributes.length; i++) {
    const { n } = extractSHDegreeAndCoef(shAttributes[i].name);
    for (let j = 0; j < tileContent.pointsLength; j++) {
      const idx = j * stride + base + n * 3;
      const src = j * 3;
      packedData[idx] = float32ToFloat16(shAttributes[i].typedArray[src]);
      packedData[idx + 1] = float32ToFloat16(
        shAttributes[i].typedArray[src + 1],
      );
      packedData[idx + 2] = float32ToFloat16(
        shAttributes[i].typedArray[src + 2],
      );
    }
  }
  return packedData;
}

function makePositionTextureData(positionData) {
  const packedData = new Uint32Array(positionData.length);
  let j = 0;
  for (let i = 0; i < positionData.length; i += 3) {
    packedData[j] =
      float32ToFloat16(positionData[i]) |
      (float32ToFloat16(positionData[i + 1]) << 16);
    packedData[j + 1] = float32ToFloat16(positionData[i + 2]);
    j += 2;
  }
  return packedData;
}

function makeCovarianceTextureData(scaleData, rotationData, count) {
  const packedData = new Uint32Array(scaleData.length + rotationData.length);
  for (let i = 0; i < count; i++) {
    const r = rotationData[4 * i + 3];
    const x = rotationData[4 * i + 0];
    const y = rotationData[4 * i + 1];
    const z = rotationData[4 * i + 2];
    const rotMatrix = [
      1.0 - 2.0 * (y * y + z * z),
      2.0 * (x * y + z * r),
      2.0 * (x * z - y * r),
      2.0 * (x * y - z * r),
      1.0 - 2.0 * (x * x + z * z),
      2.0 * (y * z + x * r),
      2.0 * (x * z + y * r),
      2.0 * (y * z - x * r),
      1.0 - 2.0 * (x * x + y * y),
    ];

    const scaleBy2 = [
      scaleData[3 * i + 0] * 2.0,
      scaleData[3 * i + 1] * 2.0,
      scaleData[3 * i + 2] * 2.0,
    ];

    const M = [
      rotMatrix[0] * scaleBy2[0],
      rotMatrix[1] * scaleBy2[0],
      rotMatrix[2] * scaleBy2[0],
      rotMatrix[3] * scaleBy2[1],
      rotMatrix[4] * scaleBy2[1],
      rotMatrix[5] * scaleBy2[1],
      rotMatrix[6] * scaleBy2[2],
      rotMatrix[7] * scaleBy2[2],
      rotMatrix[8] * scaleBy2[2],
    ];

    const sigma = [
      M[0] * M[0] + M[3] * M[3] + M[6] * M[6],
      M[0] * M[1] + M[3] * M[4] + M[6] * M[7],
      M[0] * M[2] + M[3] * M[5] + M[6] * M[8],
      M[1] * M[1] + M[4] * M[4] + M[7] * M[7],
      M[1] * M[2] + M[4] * M[5] + M[7] * M[8],
      M[2] * M[2] + M[5] * M[5] + M[8] * M[8],
    ];

    let covFactor = Number.MIN_SAFE_INTEGER;
    for (let j = 0; j < sigma.length; j++) {
      covFactor = Math.max(covFactor, sigma[j]);
    }
    packedData[8 * i + 0] =
      float32ToFloat16(sigma[0] / covFactor) |
      (float32ToFloat16(sigma[1] / covFactor) << 16);
    packedData[8 * i + 1] =
      float32ToFloat16(sigma[2] / covFactor) |
      (float32ToFloat16(sigma[3] / covFactor) << 16);
    packedData[8 * i + 2] =
      float32ToFloat16(sigma[4] / covFactor) |
      (float32ToFloat16(sigma[5] / covFactor) << 16);
    packedData[8 * i + 3] = float32ToFloat16(covFactor);
  }
  return packedData;
}

function makeSh1TextureData(packedFloatData) {
  const sh1Data = new Uint32Array(packedFloatData.length);
  const { base, stride } = baseAndStrideFromSHDegree(1);
  let j = 0;
  for (let i = 0; i < packedFloatData.length; i += stride) {
    const idx = i + base * 3;
    sh1Data[j] =
      float32ToFloat16(packedFloatData[idx]) |
      (float32ToFloat16(packedFloatData[idx + 1]) << 16);
    sh1Data[j + 1] =
      float32ToFloat16(packedFloatData[idx + 2]) |
      (float32ToFloat16(packedFloatData[idx + 3]) << 16);
    sh1Data[j + 2] =
      float32ToFloat16(packedFloatData[idx + 4]) |
      (float32ToFloat16(packedFloatData[idx + 5]) << 16);
    sh1Data[j + 3] =
      float32ToFloat16(packedFloatData[idx + 6]) |
      (float32ToFloat16(packedFloatData[idx + 7]) << 16);
    sh1Data[j + 4] = float32ToFloat16(packedFloatData[idx + 8]);
    j += 5;
  }
  return sh1Data;
}

function makeSh2TextureData(packedFloatData) {
  const sh2Data = new Uint32Array(packedFloatData.length);
  const { base, stride } = baseAndStrideFromSHDegree(2);
  let j = 0;
  for (let i = 0; i < packedFloatData.length; i += stride) {
    const idx = i + base * 3;
    sh2Data[j] =
      float32ToFloat16(packedFloatData[idx]) |
      (float32ToFloat16(packedFloatData[idx + 1]) << 16);
    sh2Data[j + 1] =
      float32ToFloat16(packedFloatData[idx + 2]) |
      (float32ToFloat16(packedFloatData[idx + 3]) << 16);
    sh2Data[j + 2] =
      float32ToFloat16(packedFloatData[idx + 4]) |
      (float32ToFloat16(packedFloatData[idx + 5]) << 16);
    sh2Data[j + 3] =
      float32ToFloat16(packedFloatData[idx + 6]) |
      (float32ToFloat16(packedFloatData[idx + 7]) << 16);
    sh2Data[j + 4] =
      float32ToFloat16(packedFloatData[idx + 8]) |
      (float32ToFloat16(packedFloatData[idx + 9]) << 16);
    sh2Data[j + 5] =
      float32ToFloat16(packedFloatData[idx + 10]) |
      (float32ToFloat16(packedFloatData[idx + 11]) << 16);
    sh2Data[j + 6] =
      float32ToFloat16(packedFloatData[idx + 12]) |
      (float32ToFloat16(packedFloatData[idx + 13]) << 16);
    sh2Data[j + 7] = float32ToFloat16(packedFloatData[idx + 14]);
    j += 8;
  }
  return sh2Data;
}

function makeSh3TextureData(packedFloatData, count) {
  const { base, stride } = baseAndStrideFromSHDegree(3);
  const sh3Data = new Uint32Array((count * stride) / 2 + 1); // N * 21 / 2 + 1

  let j = 0;
  for (let i = 0; i < packedFloatData.length; i += stride) {
    const idx = i + base * 3;
    sh3Data[j] =
      float32ToFloat16(packedFloatData[idx]) |
      (float32ToFloat16(packedFloatData[idx + 1]) << 16);
    sh3Data[j + 1] =
      float32ToFloat16(packedFloatData[idx + 2]) |
      (float32ToFloat16(packedFloatData[idx + 3]) << 16);
    sh3Data[j + 2] =
      float32ToFloat16(packedFloatData[idx + 4]) |
      (float32ToFloat16(packedFloatData[idx + 5]) << 16);
    sh3Data[j + 3] =
      float32ToFloat16(packedFloatData[idx + 6]) |
      (float32ToFloat16(packedFloatData[idx + 7]) << 16);
    sh3Data[j + 4] =
      float32ToFloat16(packedFloatData[idx + 8]) |
      (float32ToFloat16(packedFloatData[idx + 9]) << 16);
    sh3Data[j + 5] =
      float32ToFloat16(packedFloatData[idx + 10]) |
      (float32ToFloat16(packedFloatData[idx + 11]) << 16);
    sh3Data[j + 6] =
      float32ToFloat16(packedFloatData[idx + 12]) |
      (float32ToFloat16(packedFloatData[idx + 13]) << 16);
    sh3Data[j + 7] =
      float32ToFloat16(packedFloatData[idx + 14]) |
      (float32ToFloat16(packedFloatData[idx + 15]) << 16);
    sh3Data[j + 8] =
      float32ToFloat16(packedFloatData[idx + 16]) |
      (float32ToFloat16(packedFloatData[idx + 17]) << 16);
    sh3Data[j + 9] =
      float32ToFloat16(packedFloatData[idx + 18]) |
      (float32ToFloat16(packedFloatData[idx + 19]) << 16);
    sh3Data[j + 10] = float32ToFloat16(packedFloatData[idx + 20]);
    j += 11;
  }
  return sh3Data;
}

export default GaussianSplat3DTileContent;
