import Color from "../../Core/Color.js";
import combine from "../../Core/combine.js";
import defined from "../../Core/defined.js";
import destroyObject from "../../Core/destroyObject.js";
import DeveloperError from "../../Core/DeveloperError.js";
import Ellipsoid from "../../Core/Ellipsoid.js";
import Pass from "../../Renderer/Pass.js";
import ModelAnimationLoop from "../ModelAnimationLoop.js";
import Model from "./Model.js";

/** @import Cesium3DContentGroup from "../Cesium3DContentGroup.js"; */
/** @import Cesium3DTile from "../Cesium3DTile.js"; */
/** @import Cesium3DTileContent from "../Cesium3DTileContent.js"; */
/** @import Cesium3DTileset from "../Cesium3DTileset.js"; */
/** @import ImplicitMetadataView from "../ImplicitMetadataView.js"; */
/** @import Resource from "../../Core/Resource.js"; */

/**
 * Represents the contents of a glTF, glb or
 * {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/Batched3DModel|Batched 3D Model}
 * tile in a {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification|3D Tiles} tileset.
 * <p>
 * Implements the {@link Cesium3DTileContent} interface.
 * </p>
 * This object is normally not instantiated directly, use {@link Model3DTileContent.fromGltf}, {@link Model3DTileContent.fromB3dm}, {@link Model3DTileContent.fromI3dm}, {@link Model3DTileContent.fromPnts}, or {@link Model3DTileContent.fromGeoJson}.
 *
 * @implements Cesium3DTileContent
 * @private
 */
class Model3DTileContent {
  /**
   *
   * @param {Cesium3DTileset} tileset
   * @param {Cesium3DTile} tile
   * @param {Resource} resource
   */
  constructor(tileset, tile, resource) {
    this._tileset = tileset;
    this._tile = tile;
    this._resource = resource;

    /** @type {Model} */
    this._model = undefined;
    /** @type {ImplicitMetadataView|undefined} */
    this._metadata = undefined;
    /** @type {Cesium3DContentGroup|undefined} */
    this._group = undefined;
    this._ready = false;
  }

  get featuresLength() {
    const model = this._model;
    const featureTables = model.featureTables;
    const featureTableId = model.featureTableId;

    if (defined(featureTables) && defined(featureTables[featureTableId])) {
      return featureTables[featureTableId].featuresLength;
    }

    return 0;
  }

  get pointsLength() {
    return this._model.statistics.pointsLength;
  }

  get trianglesLength() {
    return this._model.statistics.trianglesLength;
  }

  get geometryByteLength() {
    return this._model.statistics.geometryByteLength;
  }

  get texturesByteLength() {
    return this._model.statistics.texturesByteLength;
  }

  get batchTableByteLength() {
    const statistics = this._model.statistics;
    return (
      statistics.propertyTablesByteLength + statistics.batchTexturesByteLength
    );
  }

  get innerContents() {
    return undefined;
  }

  /**
   * Returns true when the tile's content is ready to render; otherwise false
   *
   *
   * @type {boolean}
   * @readonly
   * @private
   */
  get ready() {
    return this._ready;
  }

  get tileset() {
    return this._tileset;
  }

  get tile() {
    return this._tile;
  }

  get url() {
    return this._resource.getUrlComponent(true);
  }

  get batchTable() {
    const model = this._model;
    const featureTables = model.featureTables;
    const featureTableId = model.featureTableId;

    if (defined(featureTables) && defined(featureTables[featureTableId])) {
      return featureTables[featureTableId];
    }

    return undefined;
  }

  get metadata() {
    return this._metadata;
  }

  set metadata(value) {
    this._metadata = value;
  }

  get group() {
    return this._group;
  }

  set group(value) {
    this._group = value;
  }

  /**
   * Returns an array containing the `texture.id` values for all textures
   * that are part of this content.
   *
   * @returns {string[]} The texture IDs
   */
  getTextureIds() {
    return this._model.statistics.getTextureIds();
  }

  /**
   * Returns the length, in bytes, of the texture data for the texture with
   * the given ID that is part of this content, or `undefined` if this
   * content does not contain the texture with the given ID.
   *
   * @param {string} textureId The texture ID
   * @returns {number|undefined} The texture byte length
   */
  getTextureByteLengthById(textureId) {
    return this._model.statistics.getTextureByteLengthById(textureId);
  }

  /**
   * Returns the object that was created for the given extension.
   *
   * The given name may be the name of a glTF extension, like `"EXT_example_extension"`.
   * If the specified extension was present in the root of the underlying glTF asset,
   * and a loader for the specified extension has processed the extension data, then
   * this will return the model representation of the extension.
   *
   * @param {string} extensionName The name of the extension
   * @returns {object|undefined} The object, or `undefined`
   *
   * @private
   */
  getExtension(extensionName) {
    const model = this._model;
    const extension = model.getExtension(extensionName);
    return extension;
  }

  getFeature(featureId) {
    const model = this._model;
    const featureTableId = model.featureTableId;

    //>>includeStart('debug', pragmas.debug);
    if (!defined(featureTableId)) {
      throw new DeveloperError(
        "No feature ID set is selected. Make sure Cesium3DTileset.featureIdLabel or Cesium3DTileset.instanceFeatureIdLabel is defined",
      );
    }
    //>>includeEnd('debug');

    const featureTable = model.featureTables[featureTableId];

    //>>includeStart('debug', pragmas.debug);
    if (!defined(featureTable)) {
      throw new DeveloperError(
        "No feature table found for the selected feature ID set",
      );
    }
    //>>includeEnd('debug');

    //>>includeStart('debug', pragmas.debug);
    const featuresLength = featureTable.featuresLength;
    if (!defined(featureId) || featureId < 0 || featureId >= featuresLength) {
      throw new DeveloperError(
        `featureId is required and must be between 0 and featuresLength - 1 (${
          featuresLength - 1
        }).`,
      );
    }
    //>>includeEnd('debug');
    return featureTable.getFeature(featureId);
  }

  hasProperty(featureId, name) {
    const model = this._model;
    const featureTableId = model.featureTableId;
    if (!defined(featureTableId)) {
      return false;
    }

    const featureTable = model.featureTables[featureTableId];
    return featureTable.hasProperty(featureId, name);
  }

  applyDebugSettings(enabled, color) {
    color = enabled ? color : Color.WHITE;
    if (this.featuresLength === 0) {
      this._model.color = color;
    } else if (defined(this.batchTable)) {
      this.batchTable.setAllColor(color);
    }
  }

  applyStyle(style) {
    // the setter will call model.applyStyle()
    this._model.style = style;
  }

  update(tileset, frameState) {
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
    model.edgeDisplayMode = tileset.edgeDisplayMode;
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

    const tilesetEnvironmentMapManager = tileset.environmentMapManager;
    if (model.environmentMapManager !== tilesetClippingPlanes) {
      model._environmentMapManager = tilesetEnvironmentMapManager;
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

    // Updating clipping polygons requires more effort because of ownership checks
    const tilesetClippingPolygons = tileset.clippingPolygons;
    if (defined(tilesetClippingPolygons) && tile.clippingPolygonsDirty) {
      // Dereference the clipping polygons from the model if they are irrelevant.
      model._clippingPolygons =
        tilesetClippingPolygons.enabled && tile._isClippedByPolygon
          ? tilesetClippingPolygons
          : undefined;
    }

    // If the model references a different ClippingPolygonCollection from the tileset,
    // update the model to use the new ClippingPolygonCollection.
    if (
      defined(tilesetClippingPolygons) &&
      defined(model._clippingPolygons) &&
      model._clippingPolygons !== tilesetClippingPolygons
    ) {
      model._clippingPolygons = tilesetClippingPolygons;
      model._clippingPolygonsState = 0;
    }

    model.update(frameState);

    if (!this._ready && model.ready) {
      // Animation can only be added once the model is ready
      model.activeAnimations.addAll({
        loop: ModelAnimationLoop.REPEAT,
      });

      this._ready = true;
    }
  }

  isDestroyed() {
    return false;
  }

  destroy() {
    this._model = this._model && this._model.destroy();
    return destroyObject(this);
  }

  static async fromGltf(tileset, tile, resource, gltf) {
    const content = new Model3DTileContent(tileset, tile, resource);

    const additionalOptions = {
      gltf: gltf,
      basePath: resource,
    };

    const modelOptions = makeModelOptions(
      tileset,
      tile,
      content,
      additionalOptions,
    );

    const classificationType = tileset.vectorClassificationOnly
      ? undefined
      : tileset.classificationType;

    modelOptions.classificationType = classificationType;

    const model = await Model.fromGltfAsync(modelOptions);
    content._model = model;

    return content;
  }

  static async fromB3dm(tileset, tile, resource, arrayBuffer, byteOffset) {
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
      additionalOptions,
    );

    const classificationType = tileset.vectorClassificationOnly
      ? undefined
      : tileset.classificationType;

    modelOptions.classificationType = classificationType;

    const model = await Model.fromB3dm(modelOptions);
    content._model = model;

    return content;
  }

  static async fromI3dm(tileset, tile, resource, arrayBuffer, byteOffset) {
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
      additionalOptions,
    );

    const model = await Model.fromI3dm(modelOptions);
    content._model = model;

    return content;
  }

  static async fromPnts(tileset, tile, resource, arrayBuffer, byteOffset) {
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
      additionalOptions,
    );
    const model = await Model.fromPnts(modelOptions);
    content._model = model;

    return content;
  }

  static async fromGeoJson(tileset, tile, resource, geoJson) {
    const content = new Model3DTileContent(tileset, tile, resource);

    const additionalOptions = {
      geoJson: geoJson,
      resource: resource,
    };

    const modelOptions = makeModelOptions(
      tileset,
      tile,
      content,
      additionalOptions,
    );
    const model = await Model.fromGeoJson(modelOptions);
    content._model = model;

    return content;
  }

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
  pick(ray, frameState, result) {
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
      result,
    );
  }
}

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
