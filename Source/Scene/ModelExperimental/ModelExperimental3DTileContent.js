import Axis from "../Axis.js";
import Cesium3DTileFeatureTable from "../Cesium3DTileFeatureTable.js";
import Color from "../../Core/Color.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import deprecationWarning from "../../Core/deprecationWarning.js";
import destroyObject from "../../Core/destroyObject.js";
import getJsonFromTypedArray from "../../Core/getJsonFromTypedArray.js";
import ModelExperimental from "./ModelExperimental.js";
import parseBatchTable from "../parseBatchTable.js";
import Pass from "../../Renderer/Pass.js";
import RuntimeError from "../../Core/RuntimeError.js";

export default function ModelExperimental3DTileContent(
  tileset,
  tile,
  resource
) {
  this._tileset = tileset;
  this._tile = tile;
  this._resource = resource;
  this._groupMetadata = undefined;
}

Object.defineProperties(ModelExperimental3DTileContent.prototype, {
  featuresLength: {
    get: function () {
      return 0;
    },
  },

  pointsLength: {
    get: function () {
      return this._model.pointsLength;
    },
  },

  trianglesLength: {
    get: function () {
      return this._model.trianglesLength;
    },
  },

  geometryByteLength: {
    get: function () {
      return this._model.geometryByteLength;
    },
  },

  texturesByteLength: {
    get: function () {
      return this._model.texturesByteLength;
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
      return this._featureTable;
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
  if (!defined(this._featureTable)) {
    return undefined;
  }
  return this._featureTable.getFeature(featureId);
};

ModelExperimental3DTileContent.prototype.hasProperty = function (
  featureId,
  name
) {
  if (!defined(this._featureTable)) {
    return false;
  }
  return this._featureTable.hasProperty(featureId, name);
};

ModelExperimental3DTileContent.prototype.applyDebugSettings = function (
  enabled,
  color
) {
  color = enabled ? color : Color.WHITE;
  this._model.color = color;
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
