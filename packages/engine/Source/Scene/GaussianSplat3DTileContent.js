import defined from "../Core/defined.js";
import Resource from "../Core/Resource.js";
import GltfLoader from "./GltfLoader.js";
import RuntimeError from "../Core/RuntimeError.js";
import Axis from "./Axis.js";
import GaussianSplatPrimitive from "./GaussianSplatPrimitive.js";
import destroyObject from "../Core/destroyObject.js";

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
function GaussianSplat3DTileContent(tileset, tile, resource, gltf) {
  this._tileset = tileset;
  this._tile = tile;
  this._resource = resource;

  if (this._tileset.gaussianSplatPrimitive === undefined) {
    this._tileset.gaussianSplatPrimitive = new GaussianSplatPrimitive({
      tileset: this._tileset,
    });
  }

  /**
   * glTF primitive data that contains the Gaussian splat data needed for rendering.
   * @type{Primitive}
   * @private
   *
   */
  this.splatPrimitive = undefined;

  /**
   * Transform matrix to turn model coordinates into world coordinates.
   * @type {Matrix4}
   * @private
   */
  this.worldTransform = undefined;

  /**
   * Part of the {@link Cesium3DTileContent} interface.
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
  this._loader = loader;

  try {
    loader.load();
  } catch (error) {
    loader.destroy();
    throw new RuntimeError(`Failed to load glTF: ${error.message}`);
  }
}

Object.defineProperties(GaussianSplat3DTileContent.prototype, {
  featuresLength: {
    get: function () {
      return 0;
    },
  },

  pointsLength: {
    get: function () {
      return this.splatPrimitive.attributes[0].count;
    },
  },

  trianglesLength: {
    get: function () {
      return 0;
    },
  },

  geometryByteLength: {
    get: function () {
      return this.splatPrimitive.attributes.reduce((totalLength, attribute) => {
        return totalLength + attribute.byteLength;
      }, 0);
    },
  },

  texturesByteLength: {
    get: function () {
      const texture = this._tileset.gaussianSplatPrimitive.gaussianSplatTexture;
      const selectedTileLen =
        this._tileset.gaussianSplatPrimitive.selectedTileLen;
      if (texture === undefined || selectedTileLen === 0) {
        return 0;
      }
      return texture.sizeInBytes / selectedTileLen;
    },
  },

  batchTableByteLength: {
    // eslint-disable-next-line getter-return
    get: function () {
      return 0;
    },
  },

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
      return this._ready && this._transformed;
    },
  },

  tileset: {
    get: function () {
      return this._tileset;
    },
  },

  tile: {
    get: function () {
      return this._tile;
    },
  },

  url: {
    get: function () {
      return this._resource.getUrlComponent(true);
    },
  },

  batchTable: {
    get: function () {
      return undefined;
    },
  },

  metadata: {
    get: function () {
      return this._metadata;
    },
    set: function (value) {
      this._metadata = value;
    },
  },

  group: {
    get: function () {
      return this._group;
    },
    set: function (value) {
      this._group = value;
    },
  },
});

GaussianSplat3DTileContent.prototype.update = function (primitive, frameState) {
  const loader = this._loader;

  if (this._ready) {
    if (
      !this._transformed &&
      this._tile !== primitive.root &&
      primitive.root.content.ready
    ) {
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

    return;
  }

  this._resourcesLoaded = loader.process(frameState);
};

GaussianSplat3DTileContent.prototype.hasProperty = function (batchId, name) {
  return false;
};

GaussianSplat3DTileContent.prototype.getFeature = function (batchId) {
  return undefined;
};

GaussianSplat3DTileContent.prototype.applyDebugSettings = function (
  enabled,
  color,
) {};

GaussianSplat3DTileContent.prototype.applyStyle = function (style) {};

GaussianSplat3DTileContent.prototype.pick = function (ray, frameState, result) {
  return undefined;
};

GaussianSplat3DTileContent.prototype.isDestroyed = function () {
  return false;
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
  this._loader.destroy();
  this._loader = undefined;
  this._ready = false;
  this._group = undefined;
  this._metadata = undefined;
  this._resourcesLoaded = false;

  return destroyObject(this);
};

export default GaussianSplat3DTileContent;
