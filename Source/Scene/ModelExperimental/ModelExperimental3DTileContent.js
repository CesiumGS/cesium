import Axis from "../Axis.js";
import defined from "../../Core/defined.js";
import deprecationWarning from "../../Core/deprecationWarning.js";
import destroyObject from "../../Core/destroyObject.js";
import ModelExperimental from "./ModelExperimental.js";
import Pass from "../../Renderer/Pass.js";

/**
 * Represents the contents of a glTF, glb or
 * {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/Batched3DModel|Batched 3D Model}
 * tile in a {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification|3D Tiles} tileset.
 * <p>
 * Implements the {@link Cesium3DTileContent} interface.
 * </p>
 * @alias ModelExperimental3DTileContent
 * @constructor
 * @private
 */
export default function ModelExperimental3DTileContent(
  tileset,
  tile,
  resource
) {
  this._tileset = tileset;
  this._tile = tile;
  this._resource = resource;

  this._model = undefined;
  this._groupMetadata = undefined;
}

Object.defineProperties(ModelExperimental3DTileContent.prototype, {
  featuresLength: {
    get: function () {
      var model = this._model;
      var featureTable = model.featureTables[model.featureTableId];
      return featureTable.featuresLength;
    },
  },

  pointsLength: {
    get: function () {
      return 0;
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

  batchTableByteLength: {
    get: function () {
      return 0;
    },
  },

  innerContents: {
    get: function () {
      return undefined;
    },
  },

  readyPromise: {
    get: function () {
      return this._model.readyPromise;
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
      var model = this._model;
      var featureTable = model.featureTables[model.featureTableId];
      return featureTable;
    },
  },

  groupMetadata: {
    get: function () {
      return this._groupMetadata;
    },
    set: function (value) {
      this._groupMetadata = value;
    },
  },
});

ModelExperimental3DTileContent.prototype.getFeature = function (featureId) {
  var model = this._model;
  var featureTables = model.featureTables;
  var featureTableId = model.featureTableId;
  var featureTable = featureTables[featureTableId];

  if (!defined(featureTable)) {
    return undefined;
  }
  return featureTable.getFeature(featureId);
};

ModelExperimental3DTileContent.prototype.hasProperty = function (
  featureId,
  name
) {
  var model = this._model;
  var featureTables = model.featureTables;
  var featureTableId = model.featureTableId;
  var featureTable = featureTables[featureTableId];

  if (!defined(featureTable)) {
    return false;
  }
  return featureTable.hasProperty(featureId, name);
};

ModelExperimental3DTileContent.prototype.applyDebugSettings = function (
  enabled,
  color
) {
  return;
};

ModelExperimental3DTileContent.prototype.applyStyle = function (style) {
  return;
};

ModelExperimental3DTileContent.prototype.update = function (
  tileset,
  frameState
) {
  var model = this._model;
  var tile = this._tile;

  model.modelMatrix = tile.computedTransform;
  model.backFaceCulling = tileset.backFaceCulling;

  model.update(frameState);
};

ModelExperimental3DTileContent.prototype.isDestroyed = function () {
  return false;
};

ModelExperimental3DTileContent.prototype.destroy = function () {
  this._model = this._model && this._model.destroy();
  return destroyObject(this);
};

ModelExperimental3DTileContent.fromGltf = function (
  tileset,
  tile,
  resource,
  gltf
) {
  var content = new ModelExperimental3DTileContent(tileset, tile, resource);

  var modelOptions = {
    gltf: gltf,
    cull: false, // The model is already culled by 3D Tiles
    releaseGltfJson: true, // Models are unique and will not benefit from caching so save memory
    opaquePass: Pass.CESIUM_3D_TILE, // Draw opaque portions of the model during the 3D Tiles pass
    basePath: resource,
    modelMatrix: tile.computedTransform,
    upAxis: tileset._gltfUpAxis,
    forwardAxis: Axis.X,
    incrementallyLoadTextures: false,
    customShader: tileset.customShader,
    content: content,
  };
  content._model = ModelExperimental.fromGltf(modelOptions);
  return content;
};

ModelExperimental3DTileContent.fromB3dm = function (
  tileset,
  tile,
  resource,
  arrayBuffer,
  byteOffset
) {
  var content = new ModelExperimental3DTileContent(tileset, tile, resource);

  var modelOptions = {
    arrayBuffer: arrayBuffer,
    byteOffset: byteOffset,
    resource: resource,
    cull: false, // The model is already culled by 3D Tiles
    releaseGltfJson: true, // Models are unique and will not benefit from caching so save memory
    opaquePass: Pass.CESIUM_3D_TILE, // Draw opaque portions of the model during the 3D Tiles pass
    modelMatrix: tile.computedTransform,
    upAxis: tileset._gltfUpAxis,
    forwardAxis: Axis.X,
    incrementallyLoadTextures: false,
    customShader: tileset.customShader,
    content: content,
  };
  content._model = ModelExperimental.fromB3dm(modelOptions);
  return content;
};

// This can be overridden for testing purposes
ModelExperimental3DTileContent._deprecationWarning = deprecationWarning;
