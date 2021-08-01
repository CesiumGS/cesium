import Color from "../Core/Color.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import RequestType from "../Core/RequestType.js";
import Pass from "../Renderer/Pass.js";
import hasExtension from "../ThirdParty/GltfPipeline/hasExtension.js";
import parseGlb from "../ThirdParty/GltfPipeline/parseGlb.js";
import Axis from "./Axis.js";
import Cesium3DTileBatchTable from "./Cesium3DTileBatchTable.js";
import Cesium3DTileFeature from "./Cesium3DTileFeature.js";
import ClassificationModel from "./ClassificationModel.js";
import MetadataSchema from "./MetadataSchema.js";
import MetadataType from "./MetadataType.js";
import Model from "./Model.js";
import ModelAnimationLoop from "./ModelAnimationLoop.js";
import ModelUtility from "./ModelUtility.js";
import parseFeatureMetadata from "./parseFeatureMetadata.js";

/**
 * Represents the contents of a glTF or glb tile in a {@link https://github.com/CesiumGS/3d-tiles/tree/master/specification|3D Tiles} tileset using the {@link https://github.com/CesiumGS/3d-tiles/tree/3d-tiles-next/extensions/3DTILES_content_gltf/0.0.0|3DTILES_content_gltf} extension.
 * <p>
 * Has limited support for the {@link https://github.com/CesiumGS/glTF/tree/master/extensions/2.0/Vendor/EXT_feature_metadata/1.0.0|EXT_feature_metadata Extension} with the following caveats:
 * </p>
 * <ul>
 *    <li>Only works with glb models with a single buffer</li>
 *    <li>Does not work with schemaUri</li>
 *    <li>Does not work with multiple feature tables</li>
 *    <li>Only works with _FEATURE_ID_0</li>
 *    <li>Support multiple feature ID textures with the following caveats: all textures must use the same texCoord, must refer to the same feature table, and must be accessed from the red channel</li>
 *    <li>Does not support feature textures</li>
 * </ul>
 * <p>
 * Implements the {@link Cesium3DTileContent} interface.
 * </p>
 *
 * @alias InnerGltf3DTileContent
 * @constructor
 *
 * @private
 */
function InnerGltf3DTileContent(tileset, tile, resource, gltf) {
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
  this._featureIdExpression = undefined;
  this._diffuseAttributeOrUniformName = {};
  this._addFeatureIdTextureToGeneratedShaders = undefined;
  this._featureIdTextureInfo = undefined;

  this.featurePropertiesDirty = false;

  initialize(this, gltf);
}

Object.defineProperties(InnerGltf3DTileContent.prototype, {
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
});

function getFeatureIdExpression(content, gltf) {
  if (content._addFeatureIdTextureToGeneratedShaders) {
    var firstMaterialId = Object.keys(content._featureIdTextureInfo)[0];
    var firstTextureInfo = content._featureIdTextureInfo[firstMaterialId];
    var texCoord = defaultValue(firstTextureInfo.texCoord, 0);
    return (
      "floor(texture2D(u_featureIdTexture, v_texcoord_" +
      texCoord +
      ").r * 255.0 + 0.5)"
    );
  }

  return ModelUtility.getAttributeOrUniformBySemantic(gltf, "_FEATURE_ID_0");
}

function getVertexShaderCallback(content) {
  return function (vs, programId) {
    var batchTable = content._batchTable;
    var handleTranslucent = !defined(content._classificationType);

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
    var handleTranslucent = !defined(content._classificationType);

    var gltf = content._model.gltf;
    if (defined(gltf)) {
      content._featureIdExpression = getFeatureIdExpression(content, gltf);
      content._diffuseAttributeOrUniformName[
        programId
      ] = ModelUtility.getDiffuseAttributeOrUniform(gltf, programId);
    }
    var callback = batchTable.getFragmentShaderCallback(
      handleTranslucent,
      content._diffuseAttributeOrUniformName[programId],
      false,
      content._featureIdExpression,
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

function getClassificationFragmentShaderCallback(content) {
  return function (fs) {
    var batchTable = content._batchTable;
    var callback = batchTable.getClassificationFragmentShaderCallback();
    return defined(callback) ? callback(fs) : fs;
  };
}

function createColorChangedCallback(content) {
  return function (batchId, color) {
    content._model.updateCommands(batchId, color);
  };
}

function getComponentDatatype(type) {
  switch (type) {
    case MetadataType.INT8:
      return ComponentDatatype.BYTE;
    case MetadataType.UINT8:
      return ComponentDatatype.UNSIGNED_BYTE;
    case MetadataType.INT16:
      return ComponentDatatype.SHORT;
    case MetadataType.UINT16:
      return ComponentDatatype.UNSIGNED_SHORT;
    case MetadataType.INT32:
      return ComponentDatatype.INT;
    case MetadataType.UINT32:
      return ComponentDatatype.UNSIGNED_INT;
    case MetadataType.FLOAT32:
      return ComponentDatatype.FLOAT;
    case MetadataType.FLOAT64:
      return ComponentDatatype.DOUBLE;
  }
}

function getComponentType(componentDatatype) {
  switch (componentDatatype) {
    case ComponentDatatype.BYTE:
      return "BYTE";
    case ComponentDatatype.UNSIGNED_BYTE:
      return "UNSIGNED_BYTE";
    case ComponentDatatype.SHORT:
      return "SHORT";
    case ComponentDatatype.UNSIGNED_SHORT:
      return "UNSIGNED_SHORT";
    case ComponentDatatype.INT:
      return "INT";
    case ComponentDatatype.UNSIGNED_INT:
      return "UNSIGNED_INT";
    case ComponentDatatype.FLOAT:
      return "FLOAT";
    case ComponentDatatype.DOUBLE:
      return "DOUBLE";
  }
}

function createBatchTable(content, gltf, colorChangedCallback) {
  if (
    hasExtension(gltf, "EXT_feature_metadata") &&
    defined(gltf.buffers) &&
    gltf.buffers.length > 0 &&
    defined(gltf.bufferViews)
  ) {
    var i;
    var j;
    var featureIdAttribute;
    var featureTableId;
    var meshes = gltf.meshes;
    if (defined(meshes)) {
      var meshesLength = meshes.length;
      for (i = 0; i < meshesLength; ++i) {
        var mesh = gltf.meshes[i];
        var primitives = mesh.primitives;
        var primitivesLength = primitives.length;
        for (j = 0; j < primitivesLength; ++j) {
          var primitive = primitives[j];
          var extensions = primitive.extensions;
          if (defined(extensions) && defined(extensions.EXT_feature_metadata)) {
            var featureMetadata = primitive.extensions.EXT_feature_metadata;
            if (defined(featureMetadata.featureIdAttributes)) {
              featureIdAttribute = featureMetadata.featureIdAttributes[0];
              featureTableId = featureIdAttribute.featureTable;
            } else if (defined(featureMetadata.featureIdTextures)) {
              featureIdAttribute = featureMetadata.featureIdTextures[0];
              featureTableId = featureIdAttribute.featureTable;
            }
          }
        }
      }
    }

    if (!defined(featureTableId)) {
      return;
    }

    var buffer = gltf.buffers[0].extras._pipeline.source;
    var bufferViewsLength = gltf.bufferViews.length;
    var bufferViews = {};

    for (i = 0; i < bufferViewsLength; ++i) {
      var bufferView = gltf.bufferViews[i];
      var byteOffset = defaultValue(bufferView.byteOffset, 0);
      var byteLength = bufferView.byteLength;
      var bufferViewData = new Uint8Array(
        buffer.buffer,
        buffer.byteOffset + byteOffset,
        byteLength
      );
      bufferViews[i] = bufferViewData;
    }

    var extension = gltf.extensions.EXT_feature_metadata;
    var metadata = parseFeatureMetadata({
      extension: extension,
      schema: new MetadataSchema(extension.schema),
      bufferViews: bufferViews,
    });

    var featureTables = metadata._featureTables;
    var featureTable = featureTables[featureTableId];

    if (!defined(featureTable.class)) {
      return;
    }

    var count = featureTable.count;
    var batchTableJson = {};
    var batchTableBinary;
    var batchTableBinaryType;
    var classProperties = featureTable.class.properties;
    for (var propertyId in classProperties) {
      if (classProperties.hasOwnProperty(propertyId)) {
        var property = featureTable._metadataTable._properties[propertyId];
        var classProperty = classProperties[propertyId];
        var type = classProperty.type;
        var valueType = classProperty.valueType;
        batchTableBinaryType = undefined;
        if (type === MetadataType.ARRAY) {
          var componentCount = classProperty.componentCount;
          if (componentCount === 2) {
            batchTableBinaryType = "VEC2";
          } else if (componentCount === 3) {
            batchTableBinaryType = "VEC3";
          } else if (componentCount === 4) {
            batchTableBinaryType = "VEC4";
          }
        } else {
          batchTableBinaryType = "SCALAR";
        }

        var componentDatatype = getComponentDatatype(valueType);

        if (
          defined(componentDatatype) &&
          defined(batchTableBinaryType) &&
          defined(property) && // May be undefined if the property is optional
          !defined(property.enumType)
        ) {
          var typedArray = property._values.typedArray;
          batchTableJson[propertyId] = {
            byteOffset: typedArray.byteOffset,
            componentType: getComponentType(componentDatatype),
            type: batchTableBinaryType,
          };
          batchTableBinary = new Uint8Array(buffer.buffer);
        } else {
          var values = new Array(count);
          for (i = 0; i < count; ++i) {
            values[i] = featureTable.getProperty(i, propertyId);
          }
          batchTableJson[propertyId] = values;
        }
      }
    }
    return new Cesium3DTileBatchTable(
      content,
      count,
      batchTableJson,
      batchTableBinary,
      colorChangedCallback
    );
  }
}

function getFeatureIdInfo(gltf) {
  var addFeatureIdTextureToGeneratedShaders = false;
  var addFeatureIdToGeneratedShaders = false;
  var featureIdTextureInfo = {};

  if (hasExtension(gltf, "EXT_feature_metadata")) {
    var meshes = gltf.meshes;
    if (defined(meshes)) {
      var meshesLength = meshes.length;
      for (var i = 0; i < meshesLength; ++i) {
        var mesh = gltf.meshes[i];
        var primitives = mesh.primitives;
        var primitivesLength = primitives.length;
        for (var j = 0; j < primitivesLength; ++j) {
          var primitive = primitives[j];
          var extensions = primitive.extensions;
          if (defined(extensions) && defined(extensions.EXT_feature_metadata)) {
            var featureMetadata = primitive.extensions.EXT_feature_metadata;
            if (defined(featureMetadata.featureIdAttributes)) {
              addFeatureIdToGeneratedShaders = true;
            } else if (defined(featureMetadata.featureIdTextures)) {
              addFeatureIdTextureToGeneratedShaders = true;
              var featureIdTexture = featureMetadata.featureIdTextures[0];
              featureIdTextureInfo[primitive.material] =
                featureIdTexture.featureIds.texture;
            }
          }
        }
      }
    }
  }

  return {
    featureIdTextureInfo: featureIdTextureInfo,
    addFeatureIdTextureToGeneratedShaders: addFeatureIdTextureToGeneratedShaders,
    addFeatureIdToGeneratedShaders: addFeatureIdToGeneratedShaders,
  };
}

function initialize(content, gltf) {
  var tileset = content._tileset;
  var tile = content._tile;
  var resource = content._resource;

  if (gltf instanceof Uint8Array) {
    gltf = parseGlb(gltf);
  }

  var colorChangedCallback;
  if (defined(content._classificationType)) {
    colorChangedCallback = createColorChangedCallback(content);
  }

  var batchTable = createBatchTable(content, gltf, colorChangedCallback);

  var featureIdInfo = getFeatureIdInfo(gltf);
  var addFeatureIdToGeneratedShaders =
    featureIdInfo.addFeatureIdToGeneratedShaders;
  var addFeatureIdTextureToGeneratedShaders =
    featureIdInfo.addFeatureIdTextureToGeneratedShaders;
  var featureIdTextureInfo = featureIdInfo.featureIdTextureInfo;

  content._addFeatureIdTextureToGeneratedShaders = addFeatureIdTextureToGeneratedShaders;
  content._featureIdTextureInfo = featureIdTextureInfo;

  if (!defined(batchTable)) {
    batchTable = new Cesium3DTileBatchTable(
      content,
      0,
      {},
      undefined,
      colorChangedCallback
    );
  }

  content._batchTable = batchTable;

  var pickObject = {
    content: content,
    primitive: tileset,
  };

  if (!defined(content._classificationType)) {
    // PERFORMANCE_IDEA: patch the shader on demand, e.g., the first time show/color changes.
    // The pick shader still needs to be patched.
    content._model = new Model({
      gltf: gltf,
      cull: false, // The model is already culled by 3D Tiles
      releaseGltfJson: true, // Models are unique and will not benefit from caching so save memory
      opaquePass: Pass.CESIUM_3D_TILE, // Draw opaque portions of the model during the 3D Tiles pass
      basePath: resource,
      requestType: RequestType.TILES3D,
      modelMatrix: tile.computedTransform,
      upAxis: tileset._gltfUpAxis,
      forwardAxis: Axis.X,
      shadows: tileset.shadows,
      debugWireframe: tileset.debugWireframe,
      incrementallyLoadTextures: false,
      vertexShaderLoaded: getVertexShaderCallback(content),
      fragmentShaderLoaded: getFragmentShaderCallback(content),
      uniformMapLoaded: batchTable.getUniformMapCallback(),
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
    content._model.readyPromise.then(function (model) {
      model.activeAnimations.addAll({
        loop: ModelAnimationLoop.REPEAT,
      });
    });
  } else {
    // This transcodes glTF to an internal representation for geometry so we can take advantage of the re-batching of vector data.
    // For a list of limitations on the input glTF, see the documentation for classificationType of Cesium3DTileset.
    content._model = new ClassificationModel({
      gltf: gltf,
      cull: false, // The model is already culled by 3D Tiles
      basePath: resource,
      requestType: RequestType.TILES3D,
      modelMatrix: tile.computedTransform,
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
  var featuresLength = content.featuresLength;
  if (!defined(content._features) && featuresLength > 0) {
    var features = new Array(featuresLength);
    for (var i = 0; i < featuresLength; ++i) {
      features[i] = new Cesium3DTileFeature(content, i);
    }
    content._features = features;
  }
}

InnerGltf3DTileContent.prototype.hasProperty = function (batchId, name) {
  return this._batchTable.hasProperty(batchId, name);
};

InnerGltf3DTileContent.prototype.getFeature = function (batchId) {
  //>>includeStart('debug', pragmas.debug);
  var featuresLength = this.featuresLength;
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

InnerGltf3DTileContent.prototype.applyDebugSettings = function (
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

InnerGltf3DTileContent.prototype.applyStyle = function (style) {
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

InnerGltf3DTileContent.prototype.update = function (tileset, frameState) {
  var commandStart = frameState.commandList.length;

  var model = this._model;
  var tile = this._tile;
  var batchTable = this._batchTable;

  // In the PROCESSING state we may be calling update() to move forward
  // the content's resource loading.  In the READY state, it will
  // actually generate commands.
  batchTable.update(tileset, frameState);

  model.modelMatrix = tile.computedTransform;
  model.shadows = tileset.shadows;
  model.imageBasedLightingFactor = tileset.imageBasedLightingFactor;
  model.lightColor = tileset.lightColor;
  model.luminanceAtZenith = tileset.luminanceAtZenith;
  model.sphericalHarmonicCoefficients = tileset.sphericalHarmonicCoefficients;
  model.specularEnvironmentMaps = tileset.specularEnvironmentMaps;
  model.backFaceCulling = tileset.backFaceCulling;
  model.debugWireframe = tileset.debugWireframe;

  // Update clipping planes
  var tilesetClippingPlanes = tileset.clippingPlanes;
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
  var commandEnd = frameState.commandList.length;
  if (
    commandStart < commandEnd &&
    (frameState.passes.render || frameState.passes.pick) &&
    !defined(this._classificationType)
  ) {
    batchTable.addDerivedCommands(frameState, commandStart);
  }
};

InnerGltf3DTileContent.prototype.isDestroyed = function () {
  return false;
};

InnerGltf3DTileContent.prototype.destroy = function () {
  this._model = this._model && this._model.destroy();
  this._batchTable = this._batchTable && this._batchTable.destroy();
  return destroyObject(this);
};

export default InnerGltf3DTileContent;
