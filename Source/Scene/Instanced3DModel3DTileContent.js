import AttributeCompression from "../Core/AttributeCompression.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Color from "../Core/Color.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import deprecationWarning from "../Core/deprecationWarning.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import getJsonFromTypedArray from "../Core/getJsonFromTypedArray.js";
import getStringFromTypedArray from "../Core/getStringFromTypedArray.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import Quaternion from "../Core/Quaternion.js";
import RequestType from "../Core/RequestType.js";
import RuntimeError from "../Core/RuntimeError.js";
import Transforms from "../Core/Transforms.js";
import TranslationRotationScale from "../Core/TranslationRotationScale.js";
import Pass from "../Renderer/Pass.js";
import Axis from "./Axis.js";
import Cesium3DTileBatchTable from "./Cesium3DTileBatchTable.js";
import Cesium3DTileFeature from "./Cesium3DTileFeature.js";
import Cesium3DTileFeatureTable from "./Cesium3DTileFeatureTable.js";
import ModelInstanceCollection from "./ModelInstanceCollection.js";
import ModelAnimationLoop from "./ModelAnimationLoop.js";

/**
 * Represents the contents of a
 * {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/Instanced3DModel|Instanced 3D Model}
 * tile in a {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification|3D Tiles} tileset.
 * <p>
 * Implements the {@link Cesium3DTileContent} interface.
 * </p>
 *
 * @alias Instanced3DModel3DTileContent
 * @constructor
 *
 * @private
 */
function Instanced3DModel3DTileContent(
  tileset,
  tile,
  resource,
  arrayBuffer,
  byteOffset
) {
  this._tileset = tileset;
  this._tile = tile;
  this._resource = resource;
  this._modelInstanceCollection = undefined;
  this._batchTable = undefined;
  this._features = undefined;

  this.featurePropertiesDirty = false;
  this._groupMetadata = undefined;

  initialize(this, arrayBuffer, byteOffset);
}

// This can be overridden for testing purposes
Instanced3DModel3DTileContent._deprecationWarning = deprecationWarning;

Object.defineProperties(Instanced3DModel3DTileContent.prototype, {
  features: {
    get: function () {
      if (defined(this._batchTable)) {
        createFeatures(this);
        return this._features;
      }
      return [];
    },
  },

  featuresLength: {
    get: function () {
      return this._batchTable.featuresLength;
    },
  },

  pointsLength: {
    get: function () {
      return 0;
    },
  },

  trianglesLength: {
    get: function () {
      var model = this._modelInstanceCollection._model;
      if (defined(model)) {
        return model.trianglesLength;
      }
      return 0;
    },
  },

  geometryByteLength: {
    get: function () {
      var model = this._modelInstanceCollection._model;
      if (defined(model)) {
        return model.geometryByteLength;
      }
      return 0;
    },
  },

  texturesByteLength: {
    get: function () {
      var model = this._modelInstanceCollection._model;
      if (defined(model)) {
        return model.texturesByteLength;
      }
      return 0;
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
      return this._modelInstanceCollection.readyPromise;
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

function getPickIdCallback(content) {
  return function () {
    return content._batchTable.getPickId();
  };
}

var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;
var propertyScratch1 = new Array(4);
var propertyScratch2 = new Array(4);

function initialize(content, arrayBuffer, byteOffset) {
  var byteStart = defaultValue(byteOffset, 0);
  byteOffset = byteStart;

  var uint8Array = new Uint8Array(arrayBuffer);
  var view = new DataView(arrayBuffer);
  byteOffset += sizeOfUint32; // Skip magic

  var version = view.getUint32(byteOffset, true);
  if (version !== 1) {
    throw new RuntimeError(
      "Only Instanced 3D Model version 1 is supported. Version " +
        version +
        " is not."
    );
  }
  byteOffset += sizeOfUint32;

  var byteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;

  var featureTableJsonByteLength = view.getUint32(byteOffset, true);
  if (featureTableJsonByteLength === 0) {
    throw new RuntimeError(
      "featureTableJsonByteLength is zero, the feature table must be defined."
    );
  }
  byteOffset += sizeOfUint32;

  var featureTableBinaryByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;

  var batchTableJsonByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;

  var batchTableBinaryByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;

  var gltfFormat = view.getUint32(byteOffset, true);
  if (gltfFormat !== 1 && gltfFormat !== 0) {
    throw new RuntimeError(
      "Only glTF format 0 (uri) or 1 (embedded) are supported. Format " +
        gltfFormat +
        " is not."
    );
  }
  byteOffset += sizeOfUint32;

  var featureTableJson = getJsonFromTypedArray(
    uint8Array,
    byteOffset,
    featureTableJsonByteLength
  );
  byteOffset += featureTableJsonByteLength;

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
  var instancesLength = featureTable.getGlobalProperty("INSTANCES_LENGTH");
  featureTable.featuresLength = instancesLength;

  if (!defined(instancesLength)) {
    throw new RuntimeError(
      "Feature table global property: INSTANCES_LENGTH must be defined"
    );
  }

  var batchTableJson;
  var batchTableBinary;
  if (batchTableJsonByteLength > 0) {
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

  content._batchTable = new Cesium3DTileBatchTable(
    content,
    instancesLength,
    batchTableJson,
    batchTableBinary
  );

  var gltfByteLength = byteStart + byteLength - byteOffset;
  if (gltfByteLength === 0) {
    throw new RuntimeError(
      "glTF byte length is zero, i3dm must have a glTF to instance."
    );
  }

  var gltfView;
  if (byteOffset % 4 === 0) {
    gltfView = new Uint8Array(arrayBuffer, byteOffset, gltfByteLength);
  } else {
    // Create a copy of the glb so that it is 4-byte aligned
    Instanced3DModel3DTileContent._deprecationWarning(
      "i3dm-glb-unaligned",
      "The embedded glb is not aligned to a 4-byte boundary."
    );
    gltfView = new Uint8Array(
      uint8Array.subarray(byteOffset, byteOffset + gltfByteLength)
    );
  }

  var tileset = content._tileset;

  // Create model instance collection
  var collectionOptions = {
    instances: new Array(instancesLength),
    batchTable: content._batchTable,
    cull: false, // Already culled by 3D Tiles
    url: undefined,
    requestType: RequestType.TILES3D,
    gltf: undefined,
    basePath: undefined,
    incrementallyLoadTextures: false,
    upAxis: tileset._gltfUpAxis,
    forwardAxis: Axis.X,
    opaquePass: Pass.CESIUM_3D_TILE, // Draw opaque portions during the 3D Tiles pass
    pickIdLoaded: getPickIdCallback(content),
    imageBasedLightingFactor: tileset.imageBasedLightingFactor,
    lightColor: tileset.lightColor,
    luminanceAtZenith: tileset.luminanceAtZenith,
    sphericalHarmonicCoefficients: tileset.sphericalHarmonicCoefficients,
    specularEnvironmentMaps: tileset.specularEnvironmentMaps,
    backFaceCulling: tileset.backFaceCulling,
    showOutline: tileset.showOutline,
  };

  if (gltfFormat === 0) {
    var gltfUrl = getStringFromTypedArray(gltfView);

    // We need to remove padding from the end of the model URL in case this tile was part of a composite tile.
    // This removes all white space and null characters from the end of the string.
    gltfUrl = gltfUrl.replace(/[\s\0]+$/, "");
    collectionOptions.url = content._resource.getDerivedResource({
      url: gltfUrl,
    });
  } else {
    collectionOptions.gltf = gltfView;
    collectionOptions.basePath = content._resource.clone();
  }

  var eastNorthUp = featureTable.getGlobalProperty("EAST_NORTH_UP");

  var rtcCenter;
  var rtcCenterArray = featureTable.getGlobalProperty(
    "RTC_CENTER",
    ComponentDatatype.FLOAT,
    3
  );
  if (defined(rtcCenterArray)) {
    rtcCenter = Cartesian3.unpack(rtcCenterArray);
  }

  var instances = collectionOptions.instances;
  var instancePosition = new Cartesian3();
  var instancePositionArray = new Array(3);
  var instanceNormalRight = new Cartesian3();
  var instanceNormalUp = new Cartesian3();
  var instanceNormalForward = new Cartesian3();
  var instanceRotation = new Matrix3();
  var instanceQuaternion = new Quaternion();
  var instanceScale = new Cartesian3();
  var instanceTranslationRotationScale = new TranslationRotationScale();
  var instanceTransform = new Matrix4();
  for (var i = 0; i < instancesLength; i++) {
    // Get the instance position
    var position = featureTable.getProperty(
      "POSITION",
      ComponentDatatype.FLOAT,
      3,
      i,
      propertyScratch1
    );
    if (!defined(position)) {
      position = instancePositionArray;
      var positionQuantized = featureTable.getProperty(
        "POSITION_QUANTIZED",
        ComponentDatatype.UNSIGNED_SHORT,
        3,
        i,
        propertyScratch1
      );
      if (!defined(positionQuantized)) {
        throw new RuntimeError(
          "Either POSITION or POSITION_QUANTIZED must be defined for each instance."
        );
      }
      var quantizedVolumeOffset = featureTable.getGlobalProperty(
        "QUANTIZED_VOLUME_OFFSET",
        ComponentDatatype.FLOAT,
        3
      );
      if (!defined(quantizedVolumeOffset)) {
        throw new RuntimeError(
          "Global property: QUANTIZED_VOLUME_OFFSET must be defined for quantized positions."
        );
      }
      var quantizedVolumeScale = featureTable.getGlobalProperty(
        "QUANTIZED_VOLUME_SCALE",
        ComponentDatatype.FLOAT,
        3
      );
      if (!defined(quantizedVolumeScale)) {
        throw new RuntimeError(
          "Global property: QUANTIZED_VOLUME_SCALE must be defined for quantized positions."
        );
      }
      for (var j = 0; j < 3; j++) {
        position[j] =
          (positionQuantized[j] / 65535.0) * quantizedVolumeScale[j] +
          quantizedVolumeOffset[j];
      }
    }
    Cartesian3.unpack(position, 0, instancePosition);
    if (defined(rtcCenter)) {
      Cartesian3.add(instancePosition, rtcCenter, instancePosition);
    }
    instanceTranslationRotationScale.translation = instancePosition;

    // Get the instance rotation
    var normalUp = featureTable.getProperty(
      "NORMAL_UP",
      ComponentDatatype.FLOAT,
      3,
      i,
      propertyScratch1
    );
    var normalRight = featureTable.getProperty(
      "NORMAL_RIGHT",
      ComponentDatatype.FLOAT,
      3,
      i,
      propertyScratch2
    );
    var hasCustomOrientation = false;
    if (defined(normalUp)) {
      if (!defined(normalRight)) {
        throw new RuntimeError(
          "To define a custom orientation, both NORMAL_UP and NORMAL_RIGHT must be defined."
        );
      }
      Cartesian3.unpack(normalUp, 0, instanceNormalUp);
      Cartesian3.unpack(normalRight, 0, instanceNormalRight);
      hasCustomOrientation = true;
    } else {
      var octNormalUp = featureTable.getProperty(
        "NORMAL_UP_OCT32P",
        ComponentDatatype.UNSIGNED_SHORT,
        2,
        i,
        propertyScratch1
      );
      var octNormalRight = featureTable.getProperty(
        "NORMAL_RIGHT_OCT32P",
        ComponentDatatype.UNSIGNED_SHORT,
        2,
        i,
        propertyScratch2
      );
      if (defined(octNormalUp)) {
        if (!defined(octNormalRight)) {
          throw new RuntimeError(
            "To define a custom orientation with oct-encoded vectors, both NORMAL_UP_OCT32P and NORMAL_RIGHT_OCT32P must be defined."
          );
        }
        AttributeCompression.octDecodeInRange(
          octNormalUp[0],
          octNormalUp[1],
          65535,
          instanceNormalUp
        );
        AttributeCompression.octDecodeInRange(
          octNormalRight[0],
          octNormalRight[1],
          65535,
          instanceNormalRight
        );
        hasCustomOrientation = true;
      } else if (eastNorthUp) {
        Transforms.eastNorthUpToFixedFrame(
          instancePosition,
          Ellipsoid.WGS84,
          instanceTransform
        );
        Matrix4.getMatrix3(instanceTransform, instanceRotation);
      } else {
        Matrix3.clone(Matrix3.IDENTITY, instanceRotation);
      }
    }
    if (hasCustomOrientation) {
      Cartesian3.cross(
        instanceNormalRight,
        instanceNormalUp,
        instanceNormalForward
      );
      Cartesian3.normalize(instanceNormalForward, instanceNormalForward);
      Matrix3.setColumn(
        instanceRotation,
        0,
        instanceNormalRight,
        instanceRotation
      );
      Matrix3.setColumn(
        instanceRotation,
        1,
        instanceNormalUp,
        instanceRotation
      );
      Matrix3.setColumn(
        instanceRotation,
        2,
        instanceNormalForward,
        instanceRotation
      );
    }
    Quaternion.fromRotationMatrix(instanceRotation, instanceQuaternion);
    instanceTranslationRotationScale.rotation = instanceQuaternion;

    // Get the instance scale
    instanceScale = Cartesian3.fromElements(1.0, 1.0, 1.0, instanceScale);
    var scale = featureTable.getProperty(
      "SCALE",
      ComponentDatatype.FLOAT,
      1,
      i
    );
    if (defined(scale)) {
      Cartesian3.multiplyByScalar(instanceScale, scale, instanceScale);
    }
    var nonUniformScale = featureTable.getProperty(
      "SCALE_NON_UNIFORM",
      ComponentDatatype.FLOAT,
      3,
      i,
      propertyScratch1
    );
    if (defined(nonUniformScale)) {
      instanceScale.x *= nonUniformScale[0];
      instanceScale.y *= nonUniformScale[1];
      instanceScale.z *= nonUniformScale[2];
    }
    instanceTranslationRotationScale.scale = instanceScale;

    // Get the batchId
    var batchId = featureTable.getProperty(
      "BATCH_ID",
      ComponentDatatype.UNSIGNED_SHORT,
      1,
      i
    );
    if (!defined(batchId)) {
      // If BATCH_ID semantic is undefined, batchId is just the instance number
      batchId = i;
    }

    // Create the model matrix and the instance
    Matrix4.fromTranslationRotationScale(
      instanceTranslationRotationScale,
      instanceTransform
    );
    var modelMatrix = instanceTransform.clone();
    instances[i] = {
      modelMatrix: modelMatrix,
      batchId: batchId,
    };
  }

  content._modelInstanceCollection = new ModelInstanceCollection(
    collectionOptions
  );
  content._modelInstanceCollection.readyPromise.then(function (collection) {
    collection.activeAnimations.addAll({
      loop: ModelAnimationLoop.REPEAT,
    });
  });
}

function createFeatures(content) {
  var featuresLength = content.featuresLength;
  if (!defined(content._features) && featuresLength > 0) {
    var features = new Array(featuresLength);
    for (var i = 0; i < featuresLength; ++i) {
      features[i] = new Cesium3DTileFeature(content, i);
    }
    content._features = features;
  }
}

Instanced3DModel3DTileContent.prototype.hasProperty = function (batchId, name) {
  return this._batchTable.hasProperty(batchId, name);
};

Instanced3DModel3DTileContent.prototype.getFeature = function (batchId) {
  var featuresLength = this.featuresLength;
  //>>includeStart('debug', pragmas.debug);
  if (!defined(batchId) || batchId < 0 || batchId >= featuresLength) {
    throw new DeveloperError(
      "batchId is required and between zero and featuresLength - 1 (" +
        (featuresLength - 1) +
        ")."
    );
  }
  //>>includeEnd('debug');

  createFeatures(this);
  return this._features[batchId];
};

Instanced3DModel3DTileContent.prototype.applyDebugSettings = function (
  enabled,
  color
) {
  color = enabled ? color : Color.WHITE;
  this._batchTable.setAllColor(color);
};

Instanced3DModel3DTileContent.prototype.applyStyle = function (style) {
  this._batchTable.applyStyle(style);
};

Instanced3DModel3DTileContent.prototype.update = function (
  tileset,
  frameState
) {
  var commandStart = frameState.commandList.length;

  // In the PROCESSING state we may be calling update() to move forward
  // the content's resource loading.  In the READY state, it will
  // actually generate commands.
  this._batchTable.update(tileset, frameState);
  this._modelInstanceCollection.modelMatrix = this._tile.computedTransform;
  this._modelInstanceCollection.shadows = this._tileset.shadows;
  this._modelInstanceCollection.lightColor = this._tileset.lightColor;
  this._modelInstanceCollection.luminanceAtZenith = this._tileset.luminanceAtZenith;
  this._modelInstanceCollection.sphericalHarmonicCoefficients = this._tileset.sphericalHarmonicCoefficients;
  this._modelInstanceCollection.specularEnvironmentMaps = this._tileset.specularEnvironmentMaps;
  this._modelInstanceCollection.backFaceCulling = this._tileset.backFaceCulling;
  this._modelInstanceCollection.debugWireframe = this._tileset.debugWireframe;

  var model = this._modelInstanceCollection._model;

  if (defined(model)) {
    // Update for clipping planes
    var tilesetClippingPlanes = this._tileset.clippingPlanes;
    model.referenceMatrix = this._tileset.clippingPlanesOriginMatrix;
    if (defined(tilesetClippingPlanes) && this._tile.clippingPlanesDirty) {
      // Dereference the clipping planes from the model if they are irrelevant - saves on shading
      // Link/Dereference directly to avoid ownership checks.
      model._clippingPlanes =
        tilesetClippingPlanes.enabled && this._tile._isClipped
          ? tilesetClippingPlanes
          : undefined;
    }

    // If the model references a different ClippingPlaneCollection due to the tileset's collection being replaced with a
    // ClippingPlaneCollection that gives this tile the same clipping status, update the model to use the new ClippingPlaneCollection.
    if (
      defined(tilesetClippingPlanes) &&
      defined(model._clippingPlanes) &&
      model._clippingPlanes !== tilesetClippingPlanes
    ) {
      model._clippingPlanes = tilesetClippingPlanes;
    }
  }

  this._modelInstanceCollection.update(frameState);

  // If any commands were pushed, add derived commands
  var commandEnd = frameState.commandList.length;
  if (
    commandStart < commandEnd &&
    (frameState.passes.render || frameState.passes.pick)
  ) {
    this._batchTable.addDerivedCommands(frameState, commandStart, false);
  }
};

Instanced3DModel3DTileContent.prototype.isDestroyed = function () {
  return false;
};

Instanced3DModel3DTileContent.prototype.destroy = function () {
  this._modelInstanceCollection =
    this._modelInstanceCollection && this._modelInstanceCollection.destroy();
  this._batchTable = this._batchTable && this._batchTable.destroy();

  return destroyObject(this);
};
export default Instanced3DModel3DTileContent;
