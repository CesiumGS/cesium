import defined from "../Core/defined.js";
import Resource from "../Core/Resource.js";
import GltfLoader from "./GltfLoader.js";
import RuntimeError from "../Core/RuntimeError.js";
import Axis from "./Axis.js";
import GaussianSplatPrimitive from "./GaussianSplatPrimitive.js";
import GaussianSplatTextureGenerator from "./Model/GaussianSplatTextureGenerator.js";
import ModelUtility from "./Model/ModelUtility.js";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";

/**
 * <p>
 * Implements the {@link Cesium3DTileContent} interface for the KHR_spz_gaussian_splats_compression glTF extension.
 */

const GaussianSplatTextureGeneratorState = {
  UNINITIALIZED: 0,
  PENDING: 1,
  READY: 2,
  ERROR: 3,
};

function GaussianSplat3DTilesContent(loader, tileset, tile, resource) {
  this._tileset = tileset;
  this._tile = tile;
  this._resource = resource;
  this._loader = loader;

  if (this._tileset.gaussianSplatPrimitive === undefined) {
    this._tileset.gaussianSplatPrimitive = new GaussianSplatPrimitive({
      tileset: this._tileset,
    });
  }

  /**
   * glTF primitive data that contains the Gaussian splat data needed for rendering.
   * @private
   *
   */
  this.splatPrimitive = undefined;
  this.worldTransform = undefined;
  this.attributeTextureData = undefined;

  this._metadata = undefined;
  this._group = undefined;
  this._ready = false;
  this._transformed = false;

  this._textureGeneratorState =
    GaussianSplatTextureGeneratorState.UNINITIALIZED;
}

Object.defineProperties(GaussianSplat3DTilesContent.prototype, {
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

/**
 * Returns the encoded texture attribute data ready to be be used in a bound texture.
 * @param {*} primitive
 */
GaussianSplat3DTilesContent.prototype.generateTextureAttributeData =
  function () {
    const splatPrimitive = this.splatPrimitive;

    const promise = GaussianSplatTextureGenerator.generateFromAttributes({
      attributes: {
        positions: new Float32Array(
          ModelUtility.getAttributeBySemantic(
            splatPrimitive,
            VertexAttributeSemantic.POSITION,
          ).typedArray,
        ),
        scales: new Float32Array(
          ModelUtility.getAttributeBySemantic(
            splatPrimitive,
            VertexAttributeSemantic.SCALE,
          ).typedArray,
        ),
        rotations: new Float32Array(
          ModelUtility.getAttributeBySemantic(
            splatPrimitive,
            VertexAttributeSemantic.ROTATION,
          ).typedArray,
        ),
        colors: new Uint8Array(
          ModelUtility.getAttributeByName(splatPrimitive, "COLOR_0").typedArray,
        ),
      },
      count: this.pointsLength,
    });
    if (promise === undefined) {
      this._textureGeneratorState =
        GaussianSplatTextureGeneratorState.UNINITIALIZED;
      return;
    }
    promise
      .then((splatTextureData) => {
        this.attributeTextureData = splatTextureData;
        this._textureGeneratorState = GaussianSplatTextureGeneratorState.READY;
      })
      .catch((error) => {
        console.error("Error generating Gaussian splat texture data:", error);
        this._textureGeneratorState = GaussianSplatTextureGeneratorState.ERROR;
      });
  };

GaussianSplat3DTilesContent.prototype.update = function (
  primitive,
  frameState,
) {
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

    if (
      this._textureGeneratorState ===
      GaussianSplatTextureGeneratorState.UNINITIALIZED
    ) {
      this.generateTextureAttributeData();
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

GaussianSplat3DTilesContent.prototype.pick = function (
  ray,
  frameState,
  result,
) {
  return undefined;
};

GaussianSplat3DTilesContent.prototype.destroy = function () {
  this.splatPrimitive.destroy();
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
};

export default GaussianSplat3DTilesContent;
