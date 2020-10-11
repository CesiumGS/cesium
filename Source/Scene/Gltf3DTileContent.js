import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import RequestType from "../Core/RequestType.js";
import Pass from "../Renderer/Pass.js";
import parseGlb from "../ThirdParty/GltfPipeline/parseGlb.js";
import when from "../ThirdParty/when.js";
import Axis from "./Axis.js";
import Model from "./Model.js";
import ModelUtility from "./ModelUtility.js";
import GltfLegacyFeatureMetadata from "./GltfLegacyFeatureMetadata.js";
import GltfLegacyFeatureTableAccessorProperty from "./GltfLegacyFeatureTableAccessorProperty.js";
import GltfLegacyFeatureTableArrayProperty from "./GltfLegacyFeatureTableArrayProperty.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import Cesium3DTileBatchTable from "./Cesium3DTileBatchTable.js";
import Cesium3DTileFeature from "./Cesium3DTileFeature.js";
import DeveloperError from "../Core/DeveloperError.js";
import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import GltfFeatureMetadataCache from "./GltfFeatureMetadataCache.js";
import GltfFeatureMetadata from "./GltfFeatureMetadata.js";

/**
 * Represents the contents of a glTF or glb tile in a {@link https://github.com/CesiumGS/3d-tiles/tree/master/specification|3D Tiles} tileset.
 * <p>
 * Implements the {@link Cesium3DTileContent} interface.
 * </p>
 *
 * @alias Gltf3DTileContent
 * @constructor
 *
 * @private
 */
function Gltf3DTileContent(options) {
  this._tileset = options.tileset;
  this._tile = options.tile;
  this._resource = options.resource;
  this._model = undefined;
  this._batchTable = undefined;
  this._features = undefined;

  this._featureMetadata = undefined;
  this._readyPromise = undefined;

  // Populate from gltf when available
  this._featureIdExpression = undefined;
  this._diffuseAttributeOrUniformName = {};
  this._addFeatureIdTextureToGeneratedShaders = undefined;

  this.featurePropertiesDirty = false;

  initialize(this, options.gltf);
}

Object.defineProperties(Gltf3DTileContent.prototype, {
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
});

function getFeatureIdExpression(content, gltf) {
  if (content._addFeatureIdTextureToGeneratedShaders) {
    // TODO: hardcoded badly
    return "floor(texture2D(u_featureIdTexture, v_texcoord_1).r * 255.0 + 0.5)";
  }

  // TODO: only one _FEATURE_ID_0 supported
  return ModelUtility.getAttributeOrUniformBySemantic(gltf, "_FEATURE_ID_0");
}

function getVertexShaderCallback(content) {
  return function (vs, programId) {
    var batchTable = content._batchTable;
    var handleTranslucent = !defined(content._tileset.classificationType);

    var gltf = content._model.gltf;
    if (defined(gltf)) {
      content._featureIdExpression = getFeatureIdExpression(content, gltf);
      content._diffuseAttributeOrUniformName[
        programId
      ] = ModelUtility.getDiffuseAttributeOrUniform(gltf, programId);
    }

    var callback = batchTable.getVertexShaderCallback(
      handleTranslucent,
      content._featureIdExpression,
      content._diffuseAttributeOrUniformName[programId],
      content._addFeatureIdTextureToGeneratedShaders
    );
    return defined(callback) ? callback(vs) : vs;
  };
}

function getFragmentShaderCallback(content) {
  return function (fs, programId) {
    var batchTable = content._batchTable;
    var handleTranslucent = !defined(content._tileset.classificationType);

    var gltf = content._model.gltf;
    if (defined(gltf)) {
      content._featureIdExpression = getFeatureIdExpression(content, gltf);
      content._diffuseAttributeOrUniformName[
        programId
      ] = ModelUtility.getDiffuseAttributeOrUniform(gltf, programId);
    }
    var callback = batchTable.getFragmentShaderCallback(
      handleTranslucent,
      content._featureIdExpression,
      content._diffuseAttributeOrUniformName[programId],
      content._addFeatureIdTextureToGeneratedShaders
    );
    return defined(callback) ? callback(fs) : fs;
  };
}

function getPickIdCallback(content) {
  return function () {
    var gltf = content._model.gltf;
    if (defined(gltf)) {
      content._featureIdExpression = getFeatureIdExpression(content, gltf);
    }
    return content._batchTable.getPickId(
      content._featureIdExpression,
      content._addFeatureIdTextureToGeneratedShaders
    );
  };
}

function createBatchTableFromLegacyFeatureMetadata(content, featureTable) {
  var batchTableJson = {};
  var batchTableBinary;
  var properties = featureTable.properties;
  for (var name in properties) {
    if (properties.hasOwnProperty(name)) {
      var property = properties[name];
      if (property instanceof GltfLegacyFeatureTableAccessorProperty) {
        batchTableJson[name] = {
          byteOffset: property._typedArray.byteOffset,
          componentType: property._componentType,
          type: ComponentDatatype.getName(property._accessorType),
        };
        if (!defined(batchTableBinary)) {
          batchTableBinary = new Uint8Array(property._typedArray.buffer);
        }
      } else if (property instanceof GltfLegacyFeatureTableArrayProperty) {
        batchTableJson[name] = property._values;
      }
    }
  }
  var featuresLength = featureTable.featureCount;
  return new Cesium3DTileBatchTable(
    content,
    featuresLength,
    batchTableJson,
    batchTableBinary
  );
}

function initializeLegacyFeatureMetadata(content, gltf, resource, extension) {
  var addFeatureIdTextureToGeneratedShaders = false;
  var addFeatureIdToGeneratedShaders = false;
  var featureIdTextureInfo;

  var featureMetadata = new GltfLegacyFeatureMetadata({
    gltf: gltf,
    featureMetadata: extension,
    cache: new GltfFeatureMetadataCache({
      basePath: resource,
    }),
  });
  var featureTable = featureMetadata.featureTables[0];
  var metadataPrimitive = featureMetadata.primitives[0];
  var featureLayer = metadataPrimitive.featureLayers[0];
  if (defined(featureLayer._textureFeatureIds)) {
    addFeatureIdTextureToGeneratedShaders = true;
    featureIdTextureInfo =
      featureLayer._textureFeatureIds.textureAccessor.texture;
  } else if (defined(featureLayer._attributeFeatureIds)) {
    addFeatureIdToGeneratedShaders =
      defaultValue(featureTable.featureCount, 0) > 0;
  }
  var batchTable = createBatchTableFromLegacyFeatureMetadata(
    content,
    featureTable
  );
  return {
    batchTable: batchTable,
    featureIdTextureInfo: featureIdTextureInfo,
    featureMetadata: featureMetadata,
    addFeatureIdTextureToGeneratedShaders: addFeatureIdTextureToGeneratedShaders,
    addFeatureIdToGeneratedShaders: addFeatureIdToGeneratedShaders,
    featureMetadataReadyPromise: featureMetadata.readyPromise,
  };
}

function initializeFeatureMetadata(content, gltf, resource, extension) {
  var addFeatureIdTextureToGeneratedShaders = false;
  var addFeatureIdToGeneratedShaders = false;
  var featureIdTextureInfo;

  var featureMetadata = new GltfFeatureMetadata({
    gltf: gltf,
    featureMetadata: extension,
    cache: new GltfFeatureMetadataCache({
      basePath: resource,
    }),
  });
  var featureTable = featureMetadata.featureTables[0];
  var metadataPrimitive = featureMetadata.primitives[0];
  var featureTextureMapping = metadataPrimitive.featureTextureMappings[0];
  var featureAttributeMapping = metadataPrimitive.featureAttributeMappings[0];

  if (defined(featureTextureMapping)) {
    addFeatureIdTextureToGeneratedShaders = true;
    featureIdTextureInfo = featureTextureMapping._featureIds.textureInfo;
  } else if (defined(featureAttributeMapping)) {
    addFeatureIdToGeneratedShaders = true;
  }

  var batchTable = createBatchTableFromLegacyFeatureMetadata(
    content,
    featureTable
  );
  return {
    batchTable: batchTable,
    featureIdTextureInfo: featureIdTextureInfo,
    featureMetadata: featureMetadata,
    addFeatureIdTextureToGeneratedShaders: addFeatureIdTextureToGeneratedShaders,
    addFeatureIdToGeneratedShaders: addFeatureIdToGeneratedShaders,
    featureMetadataReadyPromise: featureMetadata.readyPromise,
  };
}

function initialize(content, gltf) {
  var tileset = content._tileset;
  var tile = content._tile;
  var resource = content._resource;

  if (gltf instanceof Uint8Array) {
    gltf = parseGlb(gltf);
  }

  var results;

  var extensions = gltf.extensions;
  if (defined(extensions)) {
    var legacyExtension = extensions.EXT_3dtiles_feature_metadata;
    var extension = extensions.EXT_feature_metadata;
    if (defined(legacyExtension)) {
      results = initializeLegacyFeatureMetadata(
        content,
        gltf,
        resource,
        legacyExtension
      );
    } else if (defined(extension)) {
      results = initializeFeatureMetadata(content, gltf, resource, extension);
    }
  }

  var batchTable = results.batchTable;
  var featureIdTextureInfo = results.featureIdTextureInfo;
  var featureMetadata = results.featureMetadata;
  var addFeatureIdTextureToGeneratedShaders =
    results.addFeatureIdTextureToGeneratedShaders;
  var addFeatureIdToGeneratedShaders = results.addFeatureIdToGeneratedShaders;
  var featureMetadataReadyPromise = results.featureMetadataReadyPromise;

  content._featureMetadata = featureMetadata;
  content._addFeatureIdTextureToGeneratedShaders = addFeatureIdTextureToGeneratedShaders;

  if (!defined(batchTable)) {
    batchTable = new Cesium3DTileBatchTable(content, 0, {}, undefined);
  }
  content._batchTable = batchTable;

  var pickObject = {
    content: content,
    primitive: tileset,
  };

  var model = new Model({
    gltf: gltf,
    cull: false, // The model is already culled by 3D Tiles
    releaseGltfJson: true, // Models are unique and will not benefit from caching so save memory
    opaquePass: Pass.CESIUM_3D_TILE, // Draw opaque portions of the model during the 3D Tiles pass
    basePath: resource,
    requestType: RequestType.TILES3D,
    modelMatrix: tile.computedTransform,
    upAxis: Axis.Y,
    forwardAxis: Axis.X,
    shadows: tileset.shadows,
    debugWireframe: tileset.debugWireframe,
    incrementallyLoadTextures: false,
    vertexShaderLoaded: getVertexShaderCallback(content),
    fragmentShaderLoaded: getFragmentShaderCallback(content),
    uniformMapLoaded: content._batchTable.getUniformMapCallback(),
    pickIdLoaded: getPickIdCallback(content),
    addFeatureIdToGeneratedShaders: addFeatureIdToGeneratedShaders,
    addFeatureIdTextureToGeneratedShaders: addFeatureIdTextureToGeneratedShaders,
    featureIdTextureInfo: featureIdTextureInfo,
    pickObject: pickObject,
    imageBasedLightingFactor: tileset.imageBasedLightingFactor,
    lightColor: tileset.lightColor,
    luminanceAtZenith: tileset.luminanceAtZenith,
    sphericalHarmonicCoefficients: tileset.sphericalHarmonicCoefficients,
    specularEnvironmentMaps: tileset.specularEnvironmentMaps,
    backFaceCulling: tileset.backFaceCulling,
  });

  content._model = model;

  var promises = [featureMetadataReadyPromise, model.readyPromise];
  promises = promises.filter(function (promise) {
    return defined(promise);
  });

  content._readyPromise = when.all(promises).then(function () {
    return content;
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

Gltf3DTileContent.prototype.hasProperty = function (featureId, name) {
  return this._batchTable.hasProperty(featureId, name);
};

Gltf3DTileContent.prototype.getFeature = function (featureId) {
  //>>includeStart('debug', pragmas.debug);
  var featuresLength = this.featuresLength;
  if (!defined(featureId) || featureId < 0 || featureId >= featuresLength) {
    throw new DeveloperError(
      "featureId is required and between zero and featuresLength - 1 (" +
        (featuresLength - 1) +
        ")."
    );
  }
  //>>includeEnd('debug');

  createFeatures(this);
  return this._features[featureId];
};

Gltf3DTileContent.prototype.applyDebugSettings = function (enabled, color) {
  color = enabled ? color : Color.WHITE;
  if (this.featuresLength === 0) {
    this._model.color = color;
  } else {
    this._batchTable.setAllColor(color);
  }
};

Gltf3DTileContent.prototype.applyStyle = function (style) {
  if (this.featuresLength === 0) {
    var hasColorStyle = defined(style) && defined(style.color);
    var hasShowStyle = defined(style) && defined(style.show);
    this._model.color = hasColorStyle
      ? style.color.evaluateColor(undefined, this._model.color)
      : Color.clone(Color.WHITE, this._model.color);
    this._model.show = hasShowStyle ? style.show.evaluate(undefined) : true;
  } else {
    this._batchTable.applyStyle(style);
  }
};

Gltf3DTileContent.prototype.update = function (tileset, frameState) {
  var commandStart = frameState.commandList.length;

  // In the PROCESSING state we may be calling update() to move forward
  // the content's resource loading.  In the READY state, it will
  // actually generate commands.
  this._batchTable.update(tileset, frameState);

  this._model.modelMatrix = this._tile.computedTransform;
  this._model.shadows = this._tileset.shadows;
  this._model.imageBasedLightingFactor = this._tileset.imageBasedLightingFactor;
  this._model.lightColor = this._tileset.lightColor;
  this._model.luminanceAtZenith = this._tileset.luminanceAtZenith;
  this._model.sphericalHarmonicCoefficients = this._tileset.sphericalHarmonicCoefficients;
  this._model.specularEnvironmentMaps = this._tileset.specularEnvironmentMaps;
  this._model.backFaceCulling = this._tileset.backFaceCulling;
  this._model.debugWireframe = this._tileset.debugWireframe;

  // Update clipping planes
  var tilesetClippingPlanes = this._tileset.clippingPlanes;
  this._model.clippingPlanesOriginMatrix = this._tileset.clippingPlanesOriginMatrix;
  if (defined(tilesetClippingPlanes) && this._tile.clippingPlanesDirty) {
    // Dereference the clipping planes from the model if they are irrelevant.
    // Link/Dereference directly to avoid ownership checks.
    // This will also trigger synchronous shader regeneration to remove or add the clipping plane and color blending code.
    this._model._clippingPlanes =
      tilesetClippingPlanes.enabled && this._tile._isClipped
        ? tilesetClippingPlanes
        : undefined;
  }

  // If the model references a different ClippingPlaneCollection due to the tileset's collection being replaced with a
  // ClippingPlaneCollection that gives this tile the same clipping status, update the model to use the new ClippingPlaneCollection.
  if (
    defined(tilesetClippingPlanes) &&
    defined(this._model._clippingPlanes) &&
    this._model._clippingPlanes !== tilesetClippingPlanes
  ) {
    this._model._clippingPlanes = tilesetClippingPlanes;
  }

  this._model.update(frameState);

  // If any commands were pushed, add derived commands
  var commandEnd = frameState.commandList.length;
  if (
    commandStart < commandEnd &&
    (frameState.passes.render || frameState.passes.pick) &&
    !defined(tileset.classificationType)
  ) {
    this._batchTable.addDerivedCommands(frameState, commandStart);
  }
};

Gltf3DTileContent.prototype.isDestroyed = function () {
  return false;
};

Gltf3DTileContent.prototype.destroy = function () {
  this._model = this._model && this._model.destroy();
  this._batchTable = this._batchTable && this._batchTable.destroy();
  this._featureMetadata =
    this._featureMetadata && this._featureMetadata.destroy();
  return destroyObject(this);
};

export default Gltf3DTileContent;
