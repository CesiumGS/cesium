import defined from "../Core/defined.js";
import Resource from "../Core/Resource.js";
import GltfLoader from "./GltfLoader.js";
import RuntimeError from "../Core/RuntimeError.js";
import Axis from "./Axis.js";

/**
 * <p>
 * Implements the {@link Cesium3DTileContent} interface for the Gaussian splat 3D Tiles extension.
 * </p>
 */

function GaussianSplat3DTilesContent(loader, tileset, tile, resource) {
  this._tileset = tileset;
  this._tile = tile;
  this._resource = resource;
  this._loader = loader;

  this._gsplatData = undefined;
  this._metadata = undefined;
  this._group = undefined;
  this._ready = false;
}

Object.defineProperties(GaussianSplat3DTilesContent.prototype, {
  featuresLength: {
    get: function () {
      return 0;
    },
  },

  isTilesetContent: {
    get: function () {
      return true;
    },
  },

  is3DTileContent: {
    get: function () {
      return true;
    },
  },

  pointsLength: {
    get: function () {
      return this._gsplatData.attributes[0].count;
    },
  },

  trianglesLength: {
    get: function () {
      return 0;
    },
  },

  geometryByteLength: {
    get: function () {
      return 0;
    },
  },

  texturesByteLength: {
    get: function () {
      return 0;
    },
  },

  innerContents: {
    get: function () {
      return undefined;
    },
  },

  ready: {
    get: function () {
      return this._ready;
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

GaussianSplat3DTilesContent.fromGltf = async function (
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

  return new GaussianSplat3DTilesContent(loader, tileset, tile, resource);
};

GaussianSplat3DTilesContent.prototype.update = function (
  primitive,
  frameState,
) {
  const loader = this._loader;

  if (this._ready) {
    return;
  }

  frameState.afterRender.push(() => true);

  if (!defined(loader) || this._resourcesLoaded) {
    this._gsplatData = loader.components.scene.nodes[0].primitives[0];
    this._ready = true;
    this._tileset._worldTransform = loader.components.scene.nodes[0].matrix;
    return;
  }

  this._resourcesLoaded = loader.process(frameState);
};

GaussianSplat3DTilesContent.prototype.pick = function (
  ray,
  frameState,
  result,
) {
  return undefined;
};

GaussianSplat3DTilesContent.prototype.destroy = function () {
  this._gsplatData = undefined;
  this._tile.destroy();
  this._tileset.destroy();
  this._tile = undefined;
  this._tileset = undefined;
  this._resource = undefined;
  this._loader.destroy();
  this._loader = undefined;
  this._ready = false;
  this._group = undefined;
  this._metadata = undefined;
  this._resourcesLoaded = false;
};

export default GaussianSplat3DTilesContent;
