import Color from "../../Core/Color.js";
import combine from "../../Core/combine.js";
import defined from "../../Core/defined.js";
import destroyObject from "../../Core/destroyObject.js";
import DeveloperError from "../../Core/DeveloperError.js";
import Ellipsoid from "../../Core/Ellipsoid.js";
import Pass from "../../Renderer/Pass.js";
import ModelAnimationLoop from "../ModelAnimationLoop.js";
import Model from "./Model.js";

/**
 * Represents the contents of a glTF, glb or
 * {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/Batched3DModel|Batched 3D Model}
 * tile in a {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification|3D Tiles} tileset.
 * <p>
 * Implements the {@link Cesium3DTileContent} interface.
 * </p>
 * This object is normally not instantiated directly, use {@link Model3DTileContent.fromGltf}, {@link Model3DTileContent.fromB3dm}, {@link Model3DTileContent.fromI3dm}, {@link Model3DTileContent.fromPnts}, or {@link Model3DTileContent.fromGeoJson}.
 *
 * @alias Model3DTileContent
 * @constructor
 * @private
 */
function Model3DTileContent(tileset, tile, resource) {
  this._tileset = tileset;
  this._tile = tile;
  this._resource = resource;

  this._model = undefined;
  this._metadata = undefined;
  this._group = undefined;
  this._ready = false;
}

Object.defineProperties(Model3DTileContent.prototype, {
  featuresLength: {
    get: function () {
      const model = this._model;
      const featureTables = model.featureTables;
      const featureTableId = model.featureTableId;

      if (defined(featureTables) && defined(featureTables[featureTableId])) {
        return featureTables[featureTableId].featuresLength;
      }

      return 0;
    },
  },

  pointsLength: {
    get: function () {
      return this._model.statistics.pointsLength;
    },
  },

  trianglesLength: {
    get: function () {
      return this._model.statistics.trianglesLength;
    },
  },

  geometryByteLength: {
    get: function () {
      return this._model.statistics.geometryByteLength;
    },
  },

  texturesByteLength: {
    get: function () {
      return this._model.statistics.texturesByteLength;
    },
  },

  batchTableByteLength: {
    get: function () {
      const statistics = this._model.statistics;
      return (
        statistics.propertyTablesByteLength + statistics.batchTexturesByteLength
      );
    },
  },

  innerContents: {
    get: function () {
      return undefined;
    },
  },

  /**
   * Returns true when the tile's content is ready to render; otherwise false
   *
   * @memberof Model3DTileContent.prototype
   *
   * @type {boolean}
   * @readonly
   * @private
   */
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

  batchTable: {
    get: function () {
      const model = this._model;
      const featureTables = model.featureTables;
      const featureTableId = model.featureTableId;

      if (defined(featureTables) && defined(featureTables[featureTableId])) {
        return featureTables[featureTableId];
      }

      return undefined;
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

Model3DTileContent.prototype.getFeature = function (featureId) {
  const model = this._model;
  const featureTableId = model.featureTableId;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(featureTableId)) {
    throw new DeveloperError(
      "No feature ID set is selected. Make sure Cesium3DTileset.featureIdLabel or Cesium3DTileset.instanceFeatureIdLabel is defined"
    );
  }
  //>>includeEnd('debug');

  const featureTable = model.featureTables[featureTableId];

  //>>includeStart('debug', pragmas.debug);
  if (!defined(featureTable)) {
    throw new DeveloperError(
      "No feature table found for the selected feature ID set"
    );
  }
  //>>includeEnd('debug');

  //>>includeStart('debug', pragmas.debug);
  const featuresLength = featureTable.featuresLength;
  if (!defined(featureId) || featureId < 0 || featureId >= featuresLength) {
    throw new DeveloperError(
      `featureId is required and must be between 0 and featuresLength - 1 (${
        featuresLength - 1
      }).`
    );
  }
  //>>includeEnd('debug');
  return featureTable.getFeature(featureId);
};

Model3DTileContent.prototype.hasProperty = function (featureId, name) {
  const model = this._model;
  const featureTableId = model.featureTableId;
  if (!defined(featureTableId)) {
    return false;
  }

  const featureTable = model.featureTables[featureTableId];
  return featureTable.hasProperty(featureId, name);
};

Model3DTileContent.prototype.applyDebugSettings = function (enabled, color) {
  color = enabled ? color : Color.WHITE;
  if (this.featuresLength === 0) {
    this._model.color = color;
  } else if (defined(this.batchTable)) {
    this.batchTable.setAllColor(color);
  }
};

Model3DTileContent.prototype.applyStyle = function (style) {
  // the setter will call model.applyStyle()
  this._model.style = style;
};

Model3DTileContent.prototype.update = function (tileset, frameState) {
  const model = this._model;
  const tile = this._tile;

  model.colorBlendAmount = tileset.colorBlendAmount;
  model.colorBlendMode = tileset.colorBlendMode;
  model.modelMatrix = tile.computedTransform;
  model.customShader = tileset.customShader;
  model.featureIdLabel = tileset.featureIdLabel;
  model.instanceFeatureIdLabel = tileset.instanceFeatureIdLabel;
  model.lightColor = tileset.lightColor;
  model.imageBasedLighting = tileset.imageBasedLighting;
  model.backFaceCulling = tileset.backFaceCulling;
  model.shadows = tileset.shadows;
  model.showCreditsOnScreen = tileset.showCreditsOnScreen;
  model.splitDirection = tileset.splitDirection;
  model.debugWireframe = tileset.debugWireframe;
  model.showOutline = tileset.showOutline;
  model.outlineColor = tileset.outlineColor;
  model.pointCloudShading = tileset.pointCloudShading;

  // Updating clipping planes requires more effort because of ownership checks
  const tilesetClippingPlanes = tileset.clippingPlanes;
  model.referenceMatrix = tileset.clippingPlanesOriginMatrix;
  if (defined(tilesetClippingPlanes) && tile.clippingPlanesDirty) {
    // Dereference the clipping planes from the model if they are irrelevant.
    model._clippingPlanes =
      tilesetClippingPlanes.enabled && tile._isClipped
        ? tilesetClippingPlanes
        : undefined;
  }

  // If the model references a different ClippingPlaneCollection from the tileset,
  // update the model to use the new ClippingPlaneCollection.
  if (
    defined(tilesetClippingPlanes) &&
    defined(model._clippingPlanes) &&
    model._clippingPlanes !== tilesetClippingPlanes
  ) {
    model._clippingPlanes = tilesetClippingPlanes;
    model._clippingPlanesState = 0;
  }

  model.update(frameState);

  if (!this._ready && model.ready) {
    // Animation can only be added once the model is ready
    model.activeAnimations.addAll({
      loop: ModelAnimationLoop.REPEAT,
    });

    this._ready = true;
  }
};

Model3DTileContent.prototype.isDestroyed = function () {
  return false;
};

Model3DTileContent.prototype.destroy = function () {
  this._model = this._model && this._model.destroy();
  return destroyObject(this);
};

Model3DTileContent.fromGltf = async function (tileset, tile, resource, gltf) {
  const content = new Model3DTileContent(tileset, tile, resource);

  const additionalOptions = {
    gltf: gltf,
    basePath: resource,
  };

  const modelOptions = makeModelOptions(
    tileset,
    tile,
    content,
    additionalOptions
  );

  const classificationType = tileset.vectorClassificationOnly
    ? undefined
    : tileset.classificationType;

  modelOptions.classificationType = classificationType;

  const model = await Model.fromGltfAsync(modelOptions);
  content._model = model;

  return content;
};

Model3DTileContent.fromB3dm = async function (
  tileset,
  tile,
  resource,
  arrayBuffer,
  byteOffset
) {
  const content = new Model3DTileContent(tileset, tile, resource);

  const additionalOptions = {
    arrayBuffer: arrayBuffer,
    byteOffset: byteOffset,
    resource: resource,
  };

  const modelOptions = makeModelOptions(
    tileset,
    tile,
    content,
    additionalOptions
  );

  const classificationType = tileset.vectorClassificationOnly
    ? undefined
    : tileset.classificationType;

  modelOptions.classificationType = classificationType;

  const model = await Model.fromB3dm(modelOptions);
  content._model = model;

  return content;
};

Model3DTileContent.fromI3dm = async function (
  tileset,
  tile,
  resource,
  arrayBuffer,
  byteOffset
) {
  const content = new Model3DTileContent(tileset, tile, resource);

  const additionalOptions = {
    arrayBuffer: arrayBuffer,
    byteOffset: byteOffset,
    resource: resource,
  };

  const modelOptions = makeModelOptions(
    tileset,
    tile,
    content,
    additionalOptions
  );

  const model = await Model.fromI3dm(modelOptions);
  content._model = model;

  return content;
};

Model3DTileContent.fromPnts = async function (
  tileset,
  tile,
  resource,
  arrayBuffer,
  byteOffset
) {
  const content = new Model3DTileContent(tileset, tile, resource);

  const additionalOptions = {
    arrayBuffer: arrayBuffer,
    byteOffset: byteOffset,
    resource: resource,
  };

  const modelOptions = makeModelOptions(
    tileset,
    tile,
    content,
    additionalOptions
  );
  const model = await Model.fromPnts(modelOptions);
  content._model = model;

  return content;
};

Model3DTileContent.fromGeoJson = async function (
  tileset,
  tile,
  resource,
  geoJson
) {
  const content = new Model3DTileContent(tileset, tile, resource);

  const additionalOptions = {
    geoJson: geoJson,
    resource: resource,
  };

  const modelOptions = makeModelOptions(
    tileset,
    tile,
    content,
    additionalOptions
  );
  const model = await Model.fromGeoJson(modelOptions);
  content._model = model;

  return content;
};

/**
 * Find an intersection between a ray and the tile content surface that was rendered. The ray must be given in world coordinates.
 *
 * @param {Ray} ray The ray to test for intersection.
 * @param {FrameState} frameState The frame state.
 * @param {Cartesian3|undefined} [result] The intersection or <code>undefined</code> if none was found.
 * @returns {Cartesian3|undefined} The intersection or <code>undefined</code> if none was found.
 *
 * @private
 */
Model3DTileContent.prototype.pick = function (ray, frameState, result) {
  if (!defined(this._model) || !this._ready) {
    return undefined;
  }

  const verticalExaggeration = frameState.verticalExaggeration;
  const relativeHeight = frameState.verticalExaggerationRelativeHeight;

  // All tilesets assume a WGS84 ellipsoid
  return this._model.pick(
    ray,
    frameState,
    verticalExaggeration,
    relativeHeight,
    Ellipsoid.WGS84,
    result
  );
};

function makeModelOptions(tileset, tile, content, additionalOptions) {
  const mainOptions = {
    cull: false, // The model is already culled by 3D Tiles
    releaseGltfJson: true, // Models are unique and will not benefit from caching so save memory
    opaquePass: Pass.CESIUM_3D_TILE, // Draw opaque portions of the model during the 3D Tiles pass
    modelMatrix: tile.computedTransform,
    upAxis: tileset._modelUpAxis,
    forwardAxis: tileset._modelForwardAxis,
    incrementallyLoadTextures: false,
    customShader: tileset.customShader,
    content: content,
    colorBlendMode: tileset.colorBlendMode,
    colorBlendAmount: tileset.colorBlendAmount,
    lightColor: tileset.lightColor,
    imageBasedLighting: tileset.imageBasedLighting,
    featureIdLabel: tileset.featureIdLabel,
    instanceFeatureIdLabel: tileset.instanceFeatureIdLabel,
    pointCloudShading: tileset.pointCloudShading,
    clippingPlanes: tileset.clippingPlanes,
    backFaceCulling: tileset.backFaceCulling,
    shadows: tileset.shadows,
    showCreditsOnScreen: tileset.showCreditsOnScreen,
    splitDirection: tileset.splitDirection,
    enableDebugWireframe: tileset._enableDebugWireframe,
    debugWireframe: tileset.debugWireframe,
    projectTo2D: tileset._projectTo2D,
    enablePick: tileset._enablePick,
    enableShowOutline: tileset._enableShowOutline,
    showOutline: tileset.showOutline,
    outlineColor: tileset.outlineColor,
  };

  return combine(additionalOptions, mainOptions);
}

export default Model3DTileContent;
