import Cartesian3 from "../Core/Cartesian3.js";
import Color from "../Core/Color.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defined from "../Core/defined.js";
import deprecationWarning from "../Core/deprecationWarning.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Matrix4 from "../Core/Matrix4.js";
import RequestType from "../Core/RequestType.js";
import Pass from "../Renderer/Pass.js";
import Axis from "./Axis.js";
import B3dmParser from "./B3dmParser.js";
import Cesium3DTileBatchTable from "./Cesium3DTileBatchTable.js";
import Cesium3DTileFeature from "./Cesium3DTileFeature.js";
import Cesium3DTileFeatureTable from "./Cesium3DTileFeatureTable.js";
import ClassificationModel from "./ClassificationModel.js";
import Model from "./Model.js";
import ModelAnimationLoop from "./ModelAnimationLoop.js";
import ModelUtility from "./ModelUtility.js";

/**
 * Represents the contents of a
 * {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/Batched3DModel|Batched 3D Model}
 * tile in a {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification|3D Tiles} tileset.
 * <p>
 * Implements the {@link Cesium3DTileContent} interface.
 * </p>
 *
 * @alias Batched3DModel3DTileContent
 * @constructor
 *
 * @private
 */
function Batched3DModel3DTileContent(
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

  initialize(this, arrayBuffer, byteOffset);
}

// This can be overridden for testing purposes
Batched3DModel3DTileContent._deprecationWarning = deprecationWarning;

Object.defineProperties(Batched3DModel3DTileContent.prototype, {
  featuresLength: {
    get: function () {
      return this.batchTable.featuresLength;
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
      return this.batchTable.memorySizeInBytes;
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

function getBatchIdAttributeName(gltf) {
  let batchIdAttributeName = ModelUtility.getAttributeOrUniformBySemantic(
    gltf,
    "_BATCHID"
  );
  if (!defined(batchIdAttributeName)) {
    batchIdAttributeName = ModelUtility.getAttributeOrUniformBySemantic(
      gltf,
      "BATCHID"
    );
    if (defined(batchIdAttributeName)) {
      Batched3DModel3DTileContent._deprecationWarning(
        "b3dm-legacy-batchid",
        "The glTF in this b3dm uses the semantic `BATCHID`. Application-specific semantics should be prefixed with an underscore: `_BATCHID`."
      );
    }
  }
  return batchIdAttributeName;
}

function getVertexShaderCallback(content) {
  return function (vs, programId) {
    const batchTable = content._batchTable;
    const handleTranslucent = !defined(content._classificationType);

    const gltf = content._model.gltf;
    if (defined(gltf)) {
      content._batchIdAttributeName = getBatchIdAttributeName(gltf);
      content._diffuseAttributeOrUniformName[
        programId
      ] = ModelUtility.getDiffuseAttributeOrUniform(gltf, programId);
    }

    const callback = batchTable.getVertexShaderCallback(
      handleTranslucent,
      content._batchIdAttributeName,
      content._diffuseAttributeOrUniformName[programId]
    );
    return defined(callback) ? callback(vs) : vs;
  };
}

function getFragmentShaderCallback(content) {
  return function (fs, programId) {
    const batchTable = content._batchTable;
    const handleTranslucent = !defined(content._classificationType);

    const gltf = content._model.gltf;
    if (defined(gltf)) {
      content._diffuseAttributeOrUniformName[
        programId
      ] = ModelUtility.getDiffuseAttributeOrUniform(gltf, programId);
    }
    const callback = batchTable.getFragmentShaderCallback(
      handleTranslucent,
      content._diffuseAttributeOrUniformName[programId],
      false
    );
    return defined(callback) ? callback(fs) : fs;
  };
}

function getPickIdCallback(content) {
  return function () {
    return content._batchTable.getPickId();
  };
}

function getClassificationFragmentShaderCallback(content) {
  return function (fs) {
    const batchTable = content._batchTable;
    const callback = batchTable.getClassificationFragmentShaderCallback();
    return defined(callback) ? callback(fs) : fs;
  };
}

function createColorChangedCallback(content) {
  return function (batchId, color) {
    content._model.updateCommands(batchId, color);
  };
}

function initialize(content, arrayBuffer, byteOffset) {
  const tileset = content._tileset;
  const tile = content._tile;
  const resource = content._resource;

  const b3dm = B3dmParser.parse(arrayBuffer, byteOffset);

  let batchLength = b3dm.batchLength;

  const featureTableJson = b3dm.featureTableJson;
  const featureTableBinary = b3dm.featureTableBinary;
  const featureTable = new Cesium3DTileFeatureTable(
    featureTableJson,
    featureTableBinary
  );

  batchLength = featureTable.getGlobalProperty("BATCH_LENGTH");
  featureTable.featuresLength = batchLength;

  const batchTableJson = b3dm.batchTableJson;
  const batchTableBinary = b3dm.batchTableBinary;

  let colorChangedCallback;
  if (defined(content._classificationType)) {
    colorChangedCallback = createColorChangedCallback(content);
  }

  const batchTable = new Cesium3DTileBatchTable(
    content,
    batchLength,
    batchTableJson,
    batchTableBinary,
    colorChangedCallback
  );
  content._batchTable = batchTable;

  const gltfView = b3dm.gltf;

  const pickObject = {
    content: content,
    primitive: tileset,
  };

  content._rtcCenterTransform = Matrix4.IDENTITY;
  const rtcCenter = featureTable.getGlobalProperty(
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

  if (!defined(content._classificationType)) {
    // PERFORMANCE_IDEA: patch the shader on demand, e.g., the first time show/color changes.
    // The pick shader still needs to be patched.
    content._model = new Model({
      gltf: gltfView,
      cull: false, // The model is already culled by 3D Tiles
      releaseGltfJson: true, // Models are unique and will not benefit from caching so save memory
      opaquePass: Pass.CESIUM_3D_TILE, // Draw opaque portions of the model during the 3D Tiles pass
      basePath: resource,
      requestType: RequestType.TILES3D,
      modelMatrix: content._contentModelMatrix,
      upAxis: tileset._gltfUpAxis,
      forwardAxis: Axis.X,
      shadows: tileset.shadows,
      debugWireframe: tileset.debugWireframe,
      incrementallyLoadTextures: false,
      vertexShaderLoaded: getVertexShaderCallback(content),
      fragmentShaderLoaded: getFragmentShaderCallback(content),
      uniformMapLoaded: batchTable.getUniformMapCallback(),
      pickIdLoaded: getPickIdCallback(content),
      addBatchIdToGeneratedShaders: batchLength > 0, // If the batch table has values in it, generated shaders will need a batchId attribute
      pickObject: pickObject,
      imageBasedLightingFactor: tileset.imageBasedLightingFactor,
      lightColor: tileset.lightColor,
      luminanceAtZenith: tileset.luminanceAtZenith,
      sphericalHarmonicCoefficients: tileset.sphericalHarmonicCoefficients,
      specularEnvironmentMaps: tileset.specularEnvironmentMaps,
      backFaceCulling: tileset.backFaceCulling,
      showOutline: tileset.showOutline,
    });
    content._model.readyPromise.then(function (model) {
      model.activeAnimations.addAll({
        loop: ModelAnimationLoop.REPEAT,
      });
    });
  } else {
    // This transcodes glTF to an internal representation for geometry so we can take advantage of the re-batching of vector data.
    // For a list of limitations on the input glTF, see the documentation for classificationType of Cesium3DTileset.
    content._model = new ClassificationModel({
      gltf: gltfView,
      cull: false, // The model is already culled by 3D Tiles
      basePath: resource,
      requestType: RequestType.TILES3D,
      modelMatrix: content._contentModelMatrix,
      upAxis: tileset._gltfUpAxis,
      forwardAxis: Axis.X,
      debugWireframe: tileset.debugWireframe,
      vertexShaderLoaded: getVertexShaderCallback(content),
      classificationShaderLoaded: getClassificationFragmentShaderCallback(
        content
      ),
      uniformMapLoaded: batchTable.getUniformMapCallback(),
      pickIdLoaded: getPickIdCallback(content),
      classificationType: content._classificationType,
      batchTable: batchTable,
    });
  }
}

function createFeatures(content) {
  const featuresLength = content.featuresLength;
  if (!defined(content._features) && featuresLength > 0) {
    const features = new Array(featuresLength);
    for (let i = 0; i < featuresLength; ++i) {
      features[i] = new Cesium3DTileFeature(content, i);
    }
    content._features = features;
  }
}

Batched3DModel3DTileContent.prototype.hasProperty = function (batchId, name) {
  return this._batchTable.hasProperty(batchId, name);
};

Batched3DModel3DTileContent.prototype.getFeature = function (batchId) {
  //>>includeStart('debug', pragmas.debug);
  const featuresLength = this.featuresLength;
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

Batched3DModel3DTileContent.prototype.applyDebugSettings = function (
  enabled,
  color
) {
  color = enabled ? color : Color.WHITE;
  if (this.featuresLength === 0) {
    this._model.color = color;
  } else {
    this._batchTable.setAllColor(color);
  }
};

Batched3DModel3DTileContent.prototype.applyStyle = function (style) {
  if (this.featuresLength === 0) {
    const hasColorStyle = defined(style) && defined(style.color);
    const hasShowStyle = defined(style) && defined(style.show);
    this._model.color = hasColorStyle
      ? style.color.evaluateColor(undefined, this._model.color)
      : Color.clone(Color.WHITE, this._model.color);
    this._model.show = hasShowStyle ? style.show.evaluate(undefined) : true;
  } else {
    this._batchTable.applyStyle(style);
  }
};

Batched3DModel3DTileContent.prototype.update = function (tileset, frameState) {
  const commandStart = frameState.commandList.length;

  const model = this._model;
  const tile = this._tile;
  const batchTable = this._batchTable;

  // In the PROCESSING state we may be calling update() to move forward
  // the content's resource loading.  In the READY state, it will
  // actually generate commands.
  batchTable.update(tileset, frameState);

  this._contentModelMatrix = Matrix4.multiply(
    tile.computedTransform,
    this._rtcCenterTransform,
    this._contentModelMatrix
  );
  model.modelMatrix = this._contentModelMatrix;

  model.shadows = tileset.shadows;
  model.imageBasedLightingFactor = tileset.imageBasedLightingFactor;
  model.lightColor = tileset.lightColor;
  model.luminanceAtZenith = tileset.luminanceAtZenith;
  model.sphericalHarmonicCoefficients = tileset.sphericalHarmonicCoefficients;
  model.specularEnvironmentMaps = tileset.specularEnvironmentMaps;
  model.backFaceCulling = tileset.backFaceCulling;
  model.debugWireframe = tileset.debugWireframe;

  // Update clipping planes
  const tilesetClippingPlanes = tileset.clippingPlanes;
  model.referenceMatrix = tileset.clippingPlanesOriginMatrix;
  if (defined(tilesetClippingPlanes) && tile.clippingPlanesDirty) {
    // Dereference the clipping planes from the model if they are irrelevant.
    // Link/Dereference directly to avoid ownership checks.
    // This will also trigger synchronous shader regeneration to remove or add the clipping plane and color blending code.
    model._clippingPlanes =
      tilesetClippingPlanes.enabled && tile._isClipped
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

  model.update(frameState);

  // If any commands were pushed, add derived commands
  const commandEnd = frameState.commandList.length;
  if (
    commandStart < commandEnd &&
    (frameState.passes.render || frameState.passes.pick) &&
    !defined(this._classificationType)
  ) {
    batchTable.addDerivedCommands(frameState, commandStart);
  }
};

Batched3DModel3DTileContent.prototype.isDestroyed = function () {
  return false;
};

Batched3DModel3DTileContent.prototype.destroy = function () {
  this._model = this._model && this._model.destroy();
  this._batchTable = this._batchTable && this._batchTable.destroy();
  return destroyObject(this);
};
export default Batched3DModel3DTileContent;
