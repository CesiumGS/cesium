import Cartesian3 from "../Core/Cartesian3.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import deprecationWarning from "../Core/deprecationWarning.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import getJsonFromTypedArray from "../Core/getJsonFromTypedArray.js";
import Matrix4 from "../Core/Matrix4.js";
import RequestType from "../Core/RequestType.js";
import RuntimeError from "../Core/RuntimeError.js";
import Pass from "../Renderer/Pass.js";
import Axis from "./Axis.js";
import Cesium3DTileBatchTable from "./Cesium3DTileBatchTable.js";
import Cesium3DTileFeatureTable from "./Cesium3DTileFeatureTable.js";
import Model2 from "./Model2.js";
import ModelAnimationLoop from "./ModelAnimationLoop.js";
import when from "../ThirdParty/when.js";
import GltfLoader from "./GltfLoader.js";

function Batched3DModelTranscoder(
  tileset,
  tile,
  resource,
  arrayBuffer,
  byteOffset
) {
  this._tileset = tileset;
  this._tile = tile;
  this._resource = resource;
  this._model = undefined;
  this._batchTable = undefined;
  this._features = undefined;

  this._classificationType = tileset.vectorClassificationOnly
    ? undefined
    : tileset.classificationType;

  // Populate from gltf when available
  this._batchIdAttributeName = undefined;
  this._diffuseAttributeOrUniformName = {};

  this._rtcCenterTransform = undefined;
  this._contentModelMatrix = undefined;

  this.featurePropertiesDirty = false;
  this._groupMetadata = undefined;

  this._readyPromise = when.defer();
  this._gltfLoader = undefined;

  initialize(this, arrayBuffer, byteOffset);
}

Object.defineProperties(Batched3DModelTranscoder.prototype, {
  featuresLength: {
    get: function () {
      return this._batchTable.featuresLength;
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
      return this._batchTable.memorySizeInBytes;
    },
  },

  innerContents: {
    get: function () {
      return undefined;
    },
  },

  readyPromise: {
    get: function () {
      return this._readyPromise;
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
      return this._batchTable;
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

Batched3DModelTranscoder.prototype.update = function (tileset, frameState) {
  if (!defined(this._model)) {
    this._gltfLoader.process(frameState);
    return;
  }

  var model = this._model;
  //var tile = this._tile;

  //model.modelMatrix = tile.computedTransform;
  model.update(frameState);
};

Batched3DModelTranscoder._deprecationWarning = deprecationWarning;

function initialize(content, arrayBuffer, byteOffset) {
  var tile = content._tile;
  var resource = content._resource;

  var byteStart = defaultValue(byteOffset, 0);
  byteOffset = byteStart;

  var uint8Array = new Uint8Array(arrayBuffer);
  var view = new DataView(arrayBuffer);
  byteOffset += Uint32Array.BYTES_PER_ELEMENT; // Skip magic

  var version = view.getUint32(byteOffset, true);
  if (version !== 1) {
    throw new RuntimeError(
      "Only Batched 3D Model version 1 is supported.  Version " +
        version +
        " is not."
    );
  }
  byteOffset += Uint32Array.BYTES_PER_ELEMENT;

  var byteLength = view.getUint32(byteOffset, true);
  byteOffset += Uint32Array.BYTES_PER_ELEMENT;

  var featureTableJsonByteLength = view.getUint32(byteOffset, true);
  byteOffset += Uint32Array.BYTES_PER_ELEMENT;

  var featureTableBinaryByteLength = view.getUint32(byteOffset, true);
  byteOffset += Uint32Array.BYTES_PER_ELEMENT;

  var batchTableJsonByteLength = view.getUint32(byteOffset, true);
  byteOffset += Uint32Array.BYTES_PER_ELEMENT;

  var batchTableBinaryByteLength = view.getUint32(byteOffset, true);
  byteOffset += Uint32Array.BYTES_PER_ELEMENT;

  var batchLength;

  // Legacy header #1: [batchLength] [batchTableByteLength]
  // Legacy header #2: [batchTableJsonByteLength] [batchTableBinaryByteLength] [batchLength]
  // Current header: [featureTableJsonByteLength] [featureTableBinaryByteLength] [batchTableJsonByteLength] [batchTableBinaryByteLength]
  // If the header is in the first legacy format 'batchTableJsonByteLength' will be the start of the JSON string (a quotation mark) or the glTF magic.
  // Accordingly its first byte will be either 0x22 or 0x67, and so the minimum uint32 expected is 0x22000000 = 570425344 = 570MB. It is unlikely that the feature table JSON will exceed this length.
  // The check for the second legacy format is similar, except it checks 'batchTableBinaryByteLength' instead
  if (batchTableJsonByteLength >= 570425344) {
    // First legacy check
    byteOffset -= Uint32Array.BYTES_PER_ELEMENT * 2;
    batchLength = featureTableJsonByteLength;
    batchTableJsonByteLength = featureTableBinaryByteLength;
    batchTableBinaryByteLength = 0;
    featureTableJsonByteLength = 0;
    featureTableBinaryByteLength = 0;
    Batched3DModelTranscoder._deprecationWarning(
      "b3dm-legacy-header",
      "This b3dm header is using the legacy format [batchLength] [batchTableByteLength]. The new format is [featureTableJsonByteLength] [featureTableBinaryByteLength] [batchTableJsonByteLength] [batchTableBinaryByteLength] from https://github.com/CesiumGS/3d-tiles/tree/master/specification/TileFormats/Batched3DModel."
    );
  } else if (batchTableBinaryByteLength >= 570425344) {
    // Second legacy check
    byteOffset -= Uint32Array.BYTES_PER_ELEMENT;
    batchLength = batchTableJsonByteLength;
    batchTableJsonByteLength = featureTableJsonByteLength;
    batchTableBinaryByteLength = featureTableBinaryByteLength;
    featureTableJsonByteLength = 0;
    featureTableBinaryByteLength = 0;
    Batched3DModelTranscoder._deprecationWarning(
      "b3dm-legacy-header",
      "This b3dm header is using the legacy format [batchTableJsonByteLength] [batchTableBinaryByteLength] [batchLength]. The new format is [featureTableJsonByteLength] [featureTableBinaryByteLength] [batchTableJsonByteLength] [batchTableBinaryByteLength] from https://github.com/CesiumGS/3d-tiles/tree/master/specification/TileFormats/Batched3DModel."
    );
  }

  var featureTableJson;
  if (featureTableJsonByteLength === 0) {
    featureTableJson = {
      BATCH_LENGTH: defaultValue(batchLength, 0),
    };
  } else {
    featureTableJson = getJsonFromTypedArray(
      uint8Array,
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
      uint8Array,
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

  var colorChangedCallback;

  var batchTable = new Cesium3DTileBatchTable(
    content,
    batchLength,
    batchTableJson,
    batchTableBinary,
    colorChangedCallback
  );
  content._batchTable = batchTable;

  var gltfByteLength = byteStart + byteLength - byteOffset;
  if (gltfByteLength === 0) {
    throw new RuntimeError("glTF byte length must be greater than 0.");
  }

  var gltfView;
  if (byteOffset % 4 === 0) {
    gltfView = new Uint8Array(arrayBuffer, byteOffset, gltfByteLength);
  } else {
    // Create a copy of the glb so that it is 4-byte aligned
    Batched3DModelTranscoder._deprecationWarning(
      "b3dm-glb-unaligned",
      "The embedded glb is not aligned to a 4-byte boundary."
    );
    gltfView = new Uint8Array(
      uint8Array.subarray(byteOffset, byteOffset + gltfByteLength)
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

  var modelMatrix = Matrix4.multiply(
    tile.computedTransform,
    content._rtcCenterTransform,
    new Matrix4()
  );
  content._contentModelMatrix = modelMatrix;

  var loader = new GltfLoader({
    gltfResource: resource,
    typedArray: gltfView,
    releaseGltfJson: true,
    incrementallyLoadTextures: false,
  });

  content._gltfLoader = loader;
  loader.load();
  loader.promise
    .then(function (loader) {
      var model = new Model2({
        loader: loader,
      });
      model._readyPromise.then(function () {
        content._readyPromise.resolve();
      });

      model.components.scene.nodes[0].matrix = modelMatrix;

      content._model = model;
    })
    .otherwise(console.error);
}

export default Batched3DModelTranscoder;
