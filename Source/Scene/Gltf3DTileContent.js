import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import RequestType from "../Core/RequestType.js";
import Pass from "../Renderer/Pass.js";
import when from "../ThirdParty/when.js";
import Axis from "./Axis.js";
import Model from "./Model.js";
import ModelExperimental from "./Model/ModelExperimental.js";
import ExperimentalFeatures from "../Core/ExperimentalFeatures.js";
/**
 * Represents the contents of a glTF or glb tile in a {@link https://github.com/CesiumGS/3d-tiles/tree/master/specification|3D Tiles} tileset using the {@link https://github.com/CesiumGS/3d-tiles/tree/3d-tiles-next/extensions/3DTILES_content_gltf/0.0.0|3DTILES_content_gltf} extension.
 * <p>
 * This class does not yet support the {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_feature_metadata/1.0.0|EXT_feature_metadata Extension}.
 * </p>
 * <p>
 * Implements the {@link Cesium3DTileContent} interface.
 * </p>
 *
 * @alias Gltf3DTileContent
 * @constructor
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function Gltf3DTileContent(tileset, tile, resource, gltf) {
  this._tileset = tileset;
  this._tile = tile;
  this._resource = resource;
  this._readyPromise = when.defer();
  this._gltfLoader = undefined;
  this._model = undefined;
  this._batchTable = undefined;

  this.featurePropertiesDirty = false;
  this._groupMetadata = undefined;

  initialize(this, gltf);
}

Object.defineProperties(Gltf3DTileContent.prototype, {
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
      return this._model._batchTable;
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

  var pickObject = {
    content: content,
    primitive: tileset,
  };

  var ModelClass = Model;
  if (ExperimentalFeatures.enableModelExperimental) {
    ModelClass = ModelExperimental;
  }

  content._model = new ModelClass({
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
    addBatchIdToGeneratedShaders: false,
    pickObject: pickObject,
    imageBasedLightingFactor: tileset.imageBasedLightingFactor,
    lightColor: tileset.lightColor,
    luminanceAtZenith: tileset.luminanceAtZenith,
    sphericalHarmonicCoefficients: tileset.sphericalHarmonicCoefficients,
    specularEnvironmentMaps: tileset.specularEnvironmentMaps,
    backFaceCulling: tileset.backFaceCulling,
    showOutline: tileset.showOutline,
  });

  /*
  TODO: Stub this out
  content._model.readyPromise.then(function (model) {
    model.activeAnimations.addAll({
      loop: ModelAnimationLoop.REPEAT,
    });
  });
  */
}

Gltf3DTileContent.prototype.hasProperty = function (batchId, name) {
  console.error("hasProperty called externally!");
  return false;
};

Gltf3DTileContent.prototype.getFeature = function (batchId) {
  console.error("getFeature called externally!");
  return undefined;
};

Gltf3DTileContent.prototype.applyDebugSettings = function (enabled, color) {
  color = enabled ? color : Color.WHITE;
  this._model.color = color;
};

Gltf3DTileContent.prototype.applyStyle = function (style) {
  // TODO: Is this the right check?
  if (defined(this._model.batchTable)) {
    this._model.batchTable.applyStyle(style);
  } else {
    var hasColorStyle = defined(style) && defined(style.color);
    var hasShowStyle = defined(style) && defined(style.show);
    this._model.color = hasColorStyle
      ? style.color.evaluateColor(undefined, this._model.color)
      : Color.clone(Color.WHITE, this._model.color);
    this._model.show = hasShowStyle ? style.show.evaluate(undefined) : true;
  }
};

Gltf3DTileContent.prototype.update = function (tileset, frameState) {
  if (!defined(this._model)) {
    this._gltfLoader.process(frameState);
    return;
  }

  var model = this._model;
  var tile = this._tile;

  model.modelMatrix = tile.computedTransform;
  model.backFaceCulling = tileset.backFaceCulling;

  /*
  * TODO: everything
  model.shadows = tileset.shadows;
  model.imageBasedLightingFactor = tileset.imageBasedLightingFactor;
  model.lightColor = tileset.lightColor;
  model.luminanceAtZenith = tileset.luminanceAtZenith;
  model.sphericalHarmonicCoefficients = tileset.sphericalHarmonicCoefficients;
  model.specularEnvironmentMaps = tileset.specularEnvironmentMaps;
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
  */

  model.update(frameState);
};

Gltf3DTileContent.prototype.isDestroyed = function () {
  return false;
};

Gltf3DTileContent.prototype.destroy = function () {
  this._model = this._model && this._model.destroy();
  return destroyObject(this);
};

export default Gltf3DTileContent;
