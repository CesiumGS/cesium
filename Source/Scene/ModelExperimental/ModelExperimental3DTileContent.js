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
  resource,
  gltf,
  featureMetadata
) {
  this._tileset = tileset;
  this._tile = tile;
  this._resource = resource;

  initialize(this, gltf, featureMetadata);
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

function initialize(content, gltf) {
  var tileset = content._tileset;
  var tile = content._tile;
  var resource = content._resource;

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
}

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
  return new ModelExperimental3DTileContent(tileset, tile, resource, gltf);
};

var UINT32_BYTE_SIZE = Uint32Array.BYTES_PER_ELEMENT;

ModelExperimental3DTileContent.fromB3dm = function (
  tileset,
  tile,
  resource,
  arrayBuffer,
  byteOffset
) {
  var byteStart = defaultValue(byteOffset, 0);
  byteOffset = byteStart;
  var dataView = new DataView(arrayBuffer);
  // Skip B3DM magic.
  byteOffset += UINT32_BYTE_SIZE;
  var version = dataView.getUint32(byteOffset, true);
  if (version !== 1) {
    throw new RuntimeError(
      "Only Batched 3D Model version 1 is supported. Version " +
        version +
        " is not."
    );
  }
  byteOffset += UINT32_BYTE_SIZE;

  var byteLength = dataView.getUint32(byteOffset, true);
  byteOffset += UINT32_BYTE_SIZE;
  var featureTableJsonByteLength = dataView.getUint32(byteOffset, true);
  byteOffset += UINT32_BYTE_SIZE;
  var featureTableBinaryByteLength = dataView.getUint32(byteOffset, true);
  byteOffset += UINT32_BYTE_SIZE;
  var batchTableJsonByteLength = dataView.getUint32(byteOffset, true);
  byteOffset += UINT32_BYTE_SIZE;
  var batchTableBinaryByteLength = dataView.getUint32(byteOffset, true);
  byteOffset += UINT32_BYTE_SIZE;

  var batchLength;
  // Legacy header #1: [batchLength] [batchTableByteLength]
  // Legacy header #2: [batchTableJsonByteLength] [batchTableBinaryByteLength] [batchLength]
  // Current header: [featureTableJsonByteLength] [featureTableBinaryByteLength] [batchTableJsonByteLength] [batchTableBinaryByteLength]
  // If the header is in the first legacy format 'batchTableJsonByteLength' will be the start of the JSON string (a quotation mark) or the glTF magic.
  // Accordingly its first byte will be either 0x22 or 0x67, and so the minimum uint32 expected is 0x22000000 = 570425344 = 570MB. It is unlikely that the feature table JSON will exceed this length.
  // The check for the second legacy format is similar, except it checks 'batchTableBinaryByteLength' instead
  if (batchTableJsonByteLength >= 570425344) {
    // First legacy check
    byteOffset -= UINT32_BYTE_SIZE * 2;
    batchLength = featureTableJsonByteLength;
    batchTableJsonByteLength = featureTableBinaryByteLength;
    batchTableBinaryByteLength = 0;
    featureTableJsonByteLength = 0;
    featureTableBinaryByteLength = 0;
    ModelExperimental3DTileContent._deprecationWarning(
      "b3dm-legacy-header",
      "This b3dm header is using the legacy format [batchLength] [batchTableByteLength]. The new format is [featureTableJsonByteLength] [featureTableBinaryByteLength] [batchTableJsonByteLength] [batchTableBinaryByteLength] from https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/Batched3DModel."
    );
  } else if (batchTableBinaryByteLength >= 570425344) {
    // Second legacy check
    byteOffset -= UINT32_BYTE_SIZE;
    batchLength = batchTableJsonByteLength;
    batchTableJsonByteLength = featureTableJsonByteLength;
    batchTableBinaryByteLength = featureTableBinaryByteLength;
    featureTableJsonByteLength = 0;
    featureTableBinaryByteLength = 0;
    ModelExperimental3DTileContent._deprecationWarning(
      "b3dm-legacy-header",
      "This b3dm header is using the legacy format [batchTableJsonByteLength] [batchTableBinaryByteLength] [batchLength]. The new format is [featureTableJsonByteLength] [featureTableBinaryByteLength] [batchTableJsonByteLength] [batchTableBinaryByteLength] from https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/Batched3DModel."
    );
  }

  var typedArray = new Uint8Array(arrayBuffer);

  var featureTableJson;
  if (featureTableJsonByteLength === 0) {
    featureTableJson = {
      BATCH_LENGTH: defaultValue(batchLength, 0),
    };
  } else {
    featureTableJson = getJsonFromTypedArray(
      typedArray,
      byteOffset,
      featureTableJsonByteLength
    );
    byteOffset += featureTableJsonByteLength;
  }

  var featureTableBinary = new Uint8Array(
    arrayBuffer,
    byteOffset,
    featureTableBinaryByteLength
  );
  byteOffset += featureTableBinaryByteLength;

  var featureTable = new Cesium3DTileFeatureTable(
    featureTableJson,
    featureTableBinary
  );

  batchLength = featureTable.getGlobalProperty("BATCH_LENGTH");
  featureTable.featuresLength = batchLength;

  var batchTableJson;
  var batchTableBinary;
  if (batchTableJsonByteLength > 0) {
    // PERFORMANCE_IDEA: is it possible to allocate this on-demand?  Perhaps keep the
    // arraybuffer/string compressed in memory and then decompress it when it is first accessed.
    //
    // We could also make another request for it, but that would make the property set/get
    // API async, and would double the number of numbers in some cases.
    batchTableJson = getJsonFromTypedArray(
      typedArray,
      byteOffset,
      batchTableJsonByteLength
    );
    byteOffset += batchTableJsonByteLength;

    if (batchTableBinaryByteLength > 0) {
      // Has a batch table binary
      batchTableBinary = new Uint8Array(
        arrayBuffer,
        byteOffset,
        batchTableBinaryByteLength
      );
      // Copy the batchTableBinary section and let the underlying ArrayBuffer be freed
      batchTableBinary = new Uint8Array(batchTableBinary);
      byteOffset += batchTableBinaryByteLength;
    }
  }

  var featureMetadata;
  if (batchLength > 0 && defined(batchTableJson)) {
    featureMetadata = parseBatchTable({
      count: batchLength,
      batchTable: batchTableJson,
      binaryBody: batchTableBinary,
    });
  }

  var gltfByteLength = byteStart + byteLength - byteOffset;
  if (gltfByteLength === 0) {
    throw new RuntimeError("glTF byte length must be greater than 0.");
  }

  var gltfTypedArray;
  if (byteOffset % 4 === 0) {
    gltfTypedArray = new Uint8Array(arrayBuffer, byteOffset, gltfByteLength);
  } else {
    // Create a copy of the glb so that it is 4-byte aligned
    ModelExperimental3DTileContent._deprecationWarning(
      "b3dm-glb-unaligned",
      "The embedded glb is not aligned to a 4-byte boundary."
    );
    gltfTypedArray = new Uint8Array(
      typedArray.subarray(byteOffset, byteOffset + gltfByteLength)
    );
  }

  content._rtcCenterTransform = Matrix4.IDENTITY;
  var rtcCenter = featureTable.getGlobalProperty(
    "RTC_CENTER",
    ComponentDatatype.FLOAT,
    3
  );
  if (defined(rtcCenter)) {
    content._rtcCenterTransform = Matrix4.fromTranslation(
      Cartesian3.fromArray(rtcCenter)
    );
  }

  content._contentModelMatrix = Matrix4.multiply(
    tile.computedTransform,
    content._rtcCenterTransform,
    new Matrix4()
  );
};

// This can be overridden for testing purposes
ModelExperimental3DTileContent._deprecationWarning = deprecationWarning;
