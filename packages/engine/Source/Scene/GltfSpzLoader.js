import Check from "../Core/Check.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import RuntimeError from "../Core/RuntimeError.js";
import ResourceLoader from "./ResourceLoader.js";
import ResourceLoaderState from "./ResourceLoaderState.js";
import { loadSpz } from "@spz-loader/core";

// Cumulative number of SH coefficient floats per splat per channel for each
// degree. Degree 0 has no extra SH data (base color is stored separately in
// the "colors" attribute). Degrees 1-3 follow the standard SH basis count:
// l=1 adds 3 bands × 3 channels = 9; l=2 adds 5 × 3 = 15 (total 24);
// l=3 adds 7 × 3 = 21 (total 45).
const SH_FLOATS_PER_SPLAT_BY_DEGREE = [0, 9, 24, 45];

// Non-SH attribute floats per splat: position(3) + scale(3) + rotation(4)
// + opacity(1) + color(3) = 14.
const BASE_FLOATS_PER_SPLAT = 14;

// The spz-loader WASM module is compiled with a signed 32-bit address space,
// giving a hard ceiling of 2 GB. An additional factor of ~2× is required
// because spz-loader copies every decoded C++ vector into a JavaScript
// TypedArray. 1.6 GB is used as a conservative pre-flight threshold.
const WASM_MEMORY_LIMIT_BYTES = 1.6 * 1024 * 1024 * 1024;

/**
 * Derives the point count and maximum spherical harmonics degree for an SPZ
 * primitive from the glTF JSON, without touching the compressed binary data.
 * <p>
 * The SPZ payload is gzip-compressed and therefore cannot be inspected
 * directly. Instead, <code>numPoints</code> is read from the POSITION
 * accessor's <code>count</code> field and <code>shDegree</code> is inferred
 * from the highest-numbered <code>SH_DEGREE_n</code> attribute present in
 * the primitive. Returns <code>undefined</code> if the required information
 * is unavailable.
 * </p>
 * @param {object} gltf The glTF JSON object.
 * @param {object} primitive The glTF primitive object.
 * @returns {{ numPoints: number, shDegree: number }|undefined}
 * @private
 */
function getSpzInfoFromGltf(gltf, primitive) {
  const attributes = primitive?.attributes;
  if (!defined(attributes)) {
    return undefined;
  }

  const positionAccessorId = attributes["POSITION"];
  if (!defined(positionAccessorId)) {
    return undefined;
  }
  const accessor = gltf?.accessors?.[positionAccessorId];
  if (!defined(accessor) || accessor.count <= 0) {
    return undefined;
  }

  let shDegree = 0;
  for (const semantic in attributes) {
    if (Object.prototype.hasOwnProperty.call(attributes, semantic)) {
      const match = /SH_DEGREE_(\d+)_COEF_/.exec(semantic);
      if (match) {
        shDegree = Math.max(shDegree, parseInt(match[1], 10));
      }
    }
  }

  return { numPoints: accessor.count, shDegree };
}

/**
 * Estimates the peak memory consumption (in bytes) of decoding an SPZ file
 * with the given parameters. The estimate accounts for both the WASM heap
 * allocations and the JavaScript TypedArray copies produced by spz-loader.
 * @param {number} numPoints Number of Gaussian splats.
 * @param {number} shDegree Spherical harmonics degree (0–3).
 * @returns {number} Estimated byte count.
 * @private
 */
function estimateSpzMemoryBytes(numPoints, shDegree) {
  const floatsPerPoint =
    BASE_FLOATS_PER_SPLAT + (SH_FLOATS_PER_SPLAT_BY_DEGREE[shDegree] ?? 0);
  // ×2 accounts for WASM heap + JS TypedArray mirror.
  return numPoints * floatsPerPoint * Float32Array.BYTES_PER_ELEMENT * 2;
}

/**
 * Load a SPZ buffer from a glTF.
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @private
 */
class GltfSpzLoader extends ResourceLoader {
  /**
   * @param {object} options Object with the following properties:
   * @param {ResourceCache} options.resourceCache The {@link ResourceCache} (to avoid circular dependencies).
   * @param {object} options.gltf The glTF JSON.
   * @param {object} options.primitive The primitive containing the SPZ extension.
   * @param {object} options.spz The SPZ extension object.
   * @param {Resource} options.gltfResource The {@link Resource} containing the glTF.
   * @param {Resource} options.baseResource The {@link Resource} that paths in the glTF JSON are relative to.
   * @param {string} [options.cacheKey] The cache key of the resource.
   */
  constructor(options) {
    super();

    options = options ?? Frozen.EMPTY_OBJECT;
    const resourceCache = options.resourceCache;
    const gltf = options.gltf;
    const primitive = options.primitive;
    const spz = options.spz;
    const gltfResource = options.gltfResource;
    const baseResource = options.baseResource;
    const cacheKey = options.cacheKey;

    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.func("options.resourceCache", resourceCache);
    Check.typeOf.object("options.gltf", gltf);
    Check.typeOf.object("options.primitive", primitive);
    Check.typeOf.object("options.spz", spz);
    Check.typeOf.object("options.gltfResource", gltfResource);
    Check.typeOf.object("options.baseResource", baseResource);
    //>>includeEnd('debug');

    this._resourceCache = resourceCache;
    this._gltfResource = gltfResource;
    this._baseResource = baseResource;
    this._gltf = gltf;
    this._primitive = primitive;
    this._spz = spz;
    this._cacheKey = cacheKey;
    this._bufferViewLoader = undefined;
    this._bufferViewTypedArray = undefined;
    this._decodePromise = undefined;
    this._decodedData = undefined;
    this._state = ResourceLoaderState.UNLOADED;
    this._promise = undefined;
    this._spzError = undefined;
  }

  /**
   * The cache key of the resource.
   * @memberof GltfSpzLoader.prototype
   * @type {string}
   * @readonly
   * @private
   */
  get cacheKey() {
    return this._cacheKey;
  }

  /**
   * The decoded SPZ data.
   * @memberof GltfSpzLoader.prototype
   * @type {object}
   * @readonly
   * @private
   */
  get decodedData() {
    return this._decodedData;
  }

  /**
   * Loads the SPZ resource.
   * @returns {Promise<Resource>} A promise that resolves to the resource when the SPZ is loaded.
   * @private
   */
  async load() {
    if (defined(this._promise)) {
      return this._promise;
    }

    this._state = ResourceLoaderState.LOADING;
    this._promise = loadResources(this);
    return this._promise;
  }

  /**
   * Processes the SPZ resource.
   * @param {FrameState} frameState The frame state.
   * @private
   */
  process(frameState) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("frameState", frameState);
    //>>includeEnd('debug');

    if (this._state === ResourceLoaderState.READY) {
      return true;
    }

    if (this._state !== ResourceLoaderState.PROCESSING) {
      return false;
    }

    if (defined(this._spzError)) {
      handleError(this, this._spzError);
    }

    if (!defined(this._bufferViewTypedArray)) {
      return false;
    }

    if (defined(this._decodePromise)) {
      return false;
    }

    // Reject oversized SPZ payloads before invoking the WASM decoder.
    // The spz-loader WASM module has a hard 2 GB memory ceiling; exceeding
    // it causes an unrecoverable Aborted() call with no useful diagnostic.
    // See: https://github.com/CesiumGS/cesium/issues/13283
    //
    // The SPZ binary is gzip-compressed, so its header cannot be read
    // directly. Point count and SH degree are therefore derived from the
    // glTF JSON, which is available at this stage.
    const spzInfo = getSpzInfoFromGltf(this._gltf, this._primitive);
    if (defined(spzInfo)) {
      const estimatedBytes = estimateSpzMemoryBytes(
        spzInfo.numPoints,
        spzInfo.shDegree,
      );
      if (estimatedBytes > WASM_MEMORY_LIMIT_BYTES) {
        const estimatedMB = Math.round(estimatedBytes / (1024 * 1024));
        handleError(
          this,
          new RuntimeError(
            `SPZ data too large to decode: ${spzInfo.numPoints.toLocaleString()} splats ` +
              `with spherical harmonics degree ${spzInfo.shDegree} would require ` +
              `approximately ${estimatedMB} MB, which exceeds the WASM memory limit. ` +
              `Consider using a lower spherical harmonics degree or splitting the ` +
              `dataset into smaller tiles.`,
          ),
        );
        return false;
      }
    }

    const decodePromise = loadSpz(this._bufferViewTypedArray, {
      unpackOptions: { coordinateSystem: "UNSPECIFIED" },
    });

    if (!defined(decodePromise)) {
      return false;
    }

    this._decodePromise = processDecode(this, decodePromise);
  }

  /**
   * Unloads the SPZ resource and frees associated resources.
   * @private
   */
  unload() {
    if (defined(this._bufferViewLoader)) {
      this._resourceCache.unload(this._bufferViewLoader);
    }

    this._bufferViewLoader = undefined;
    this._bufferViewTypedArray = undefined;
    this._decodedData = undefined;
    this._gltf = undefined;
    this._primitive = undefined;
  }
}

async function loadResources(loader) {
  const resourceCache = loader._resourceCache;
  try {
    const bufferViewLoader = resourceCache.getBufferViewLoader({
      gltf: loader._gltf,
      bufferViewId: 0,
      gltfResource: loader._gltfResource,
      baseResource: loader._baseResource,
    });
    loader._bufferViewLoader = bufferViewLoader;
    await bufferViewLoader.load();

    if (loader.isDestroyed()) {
      return;
    }

    loader._bufferViewTypedArray = bufferViewLoader.typedArray;
    loader._state = ResourceLoaderState.PROCESSING;
    return loader;
  } catch (error) {
    if (loader.isDestroyed()) {
      return;
    }

    handleError(loader, error);
  }
}

function handleError(spzLoader, error) {
  spzLoader.unload();
  spzLoader._state = ResourceLoaderState.FAILED;
  const errorMessage = "Failed to load SPZ";
  throw spzLoader.getError(errorMessage, error);
}

async function processDecode(loader, decodePromise) {
  try {
    const gcloud = await decodePromise;
    if (loader.isDestroyed()) {
      return;
    }

    loader.unload();

    loader._decodedData = {
      gcloud: gcloud,
    };
    loader._state = ResourceLoaderState.READY;
    return loader._baseResource;
  } catch (error) {
    if (loader.isDestroyed()) {
      return;
    }

    loader._spzError = error;
  }
}

export { estimateSpzMemoryBytes, getSpzInfoFromGltf };
export default GltfSpzLoader;
