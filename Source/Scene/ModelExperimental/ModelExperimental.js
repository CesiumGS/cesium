import BoundingSphere from "../../Core/BoundingSphere.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Cartographic from "../../Core/Cartographic.js";
import Check from "../../Core/Check.js";
import ColorBlendMode from "../ColorBlendMode.js";
import ClippingPlaneCollection from "../ClippingPlaneCollection.js";
import defined from "../../Core/defined.js";
import defaultValue from "../../Core/defaultValue.js";
import DeveloperError from "../../Core/DeveloperError.js";
import GltfLoader from "../GltfLoader.js";
import ImageBasedLighting from "../ImageBasedLighting.js";
import ModelExperimentalAnimationCollection from "./ModelExperimentalAnimationCollection.js";
import ModelExperimentalSceneGraph from "./ModelExperimentalSceneGraph.js";
import ModelExperimentalType from "./ModelExperimentalType.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";
import Pass from "../../Renderer/Pass.js";
import Resource from "../../Core/Resource.js";
import destroyObject from "../../Core/destroyObject.js";
import Matrix3 from "../../Core/Matrix3.js";
import Matrix4 from "../../Core/Matrix4.js";
import ModelFeatureTable from "./ModelFeatureTable.js";
import PointCloudShading from "../PointCloudShading.js";
import B3dmLoader from "./B3dmLoader.js";
import GeoJsonLoader from "./GeoJsonLoader.js";
import I3dmLoader from "./I3dmLoader.js";
import PntsLoader from "./PntsLoader.js";
import Color from "../../Core/Color.js";
import SceneMode from "../SceneMode.js";
import ShadowMode from "../ShadowMode.js";
import SplitDirection from "../SplitDirection.js";

/**
 * A 3D model. This is a new architecture that is more decoupled than the older {@link Model}. This class is still experimental.
 * <p>
 * Do not call this function directly, instead use the `from` functions to create
 * the Model from your source data type.
 * </p>
 *
 * @alias ModelExperimental
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.resource The Resource to the 3D model.
 * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY]  The 4x4 transformation matrix that transforms the model from model to world coordinates.
 * @param {Number} [options.scale=1.0] A uniform scale applied to this model.
 * @param {Number} [options.minimumPixelSize=0.0] The approximate minimum pixel size of the model regardless of zoom.
 * @param {Number} [options.maximumScale] The maximum scale size of a model. An upper limit for minimumPixelSize.
 * @param {Boolean} [options.clampAnimations=true] Determines if the model's animations should hold a pose over frames where no keyframes are specified.
 * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Draws the bounding sphere for each draw command in the model.
 * @param {Boolean} [options.enableDebugWireframe=false] For debugging only. This must be set to true for debugWireframe to work in WebGL1. This cannot be set after the model has loaded.
 * @param {Boolean} [options.debugWireframe=false] For debugging only. Draws the model in wireframe. Will only work for WebGL1 if enableDebugWireframe is set to true.
 * @param {Boolean} [options.cull=true]  Whether or not to cull the model using frustum/horizon culling. If the model is part of a 3D Tiles tileset, this property will always be false, since the 3D Tiles culling system is used.
 * @param {Boolean} [options.opaquePass=Pass.OPAQUE] The pass to use in the {@link DrawCommand} for the opaque portions of the model.
 * @param {Boolean} [options.allowPicking=true] When <code>true</code>, each primitive is pickable with {@link Scene#pick}.
 * @param {CustomShader} [options.customShader] A custom shader. This will add user-defined GLSL code to the vertex and fragment shaders. Using custom shaders with a {@link Cesium3DTileStyle} may lead to undefined behavior.
 * @param {Cesium3DTileContent} [options.content] The tile content this model belongs to. This property will be undefined if model is not loaded as part of a tileset.
 * @param {Boolean} [options.show=true] Whether or not to render the model.
 * @param {Color} [options.color] A color that blends with the model's rendered color.
 * @param {ColorBlendMode} [options.colorBlendMode=ColorBlendMode.HIGHLIGHT] Defines how the color blends with the model.
 * @param {Number} [options.colorBlendAmount=0.5] Value used to determine the color strength when the <code>colorBlendMode</code> is <code>MIX</code>. A value of 0.0 results in the model's rendered color while a value of 1.0 results in a solid color, with any value in-between resulting in a mix of the two.
 * @param {String|Number} [options.featureIdLabel="featureId_0"] Label of the feature ID set to use for picking and styling. For EXT_mesh_features, this is the feature ID's label property, or "featureId_N" (where N is the index in the featureIds array) when not specified. EXT_feature_metadata did not have a label field, so such feature ID sets are always labeled "featureId_N" where N is the index in the list of all feature Ids, where feature ID attributes are listed before feature ID textures. If featureIdLabel is an integer N, it is converted to the string "featureId_N" automatically. If both per-primitive and per-instance feature IDs are present, the instance feature IDs take priority.
 * @param {String|Number} [options.instanceFeatureIdLabel="instanceFeatureId_0"] Label of the instance feature ID set used for picking and styling. If instanceFeatureIdLabel is set to an integer N, it is converted to the string "instanceFeatureId_N" automatically. If both per-primitive and per-instance feature IDs are present, the instance feature IDs take priority.
 * @param {Object} [options.pointCloudShading] Options for constructing a {@link PointCloudShading} object to control point attenuation based on geometric error and lighting.
 * @param {ClippingPlaneCollection} [options.clippingPlanes] The {@link ClippingPlaneCollection} used to selectively disable rendering the model.
 * @param {Cartesian3} [options.lightColor] The light color when shading the model. When <code>undefined</code> the scene's light color is used instead.
 * @param {ImageBasedLighting} [options.imageBasedLighting] The properties for managing image-based lighting on this model.
 * @param {Boolean} [options.backFaceCulling=true] Whether to cull back-facing geometry. When true, back face culling is determined by the material's doubleSided property; when false, back face culling is disabled. Back faces are not culled if the model's color is translucent.
 * @param {ShadowMode} [options.shadows=ShadowMode.ENABLED] Determines whether the model casts or receives shadows from light sources.
 * @param {Boolean} [options.showCreditsOnScreen=false] Whether to display the credits of this model on screen.
 * @param {SplitDirection} [options.splitDirection=SplitDirection.NONE] The {@link SplitDirection} split to apply to this model.
 * @param {Boolean} [options.projectTo2D=false] Whether to accurately project the model's positions in 2D. If a model is part of a 3D Tiles tileset, this will always be true. If this is false, the model will show up in 2D / CV mode but its positions may be inaccurate. This disables minimumPixelSize and prevents future modification to its model matrix. This also cannot be set after the model has loaded.
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function ModelExperimental(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.loader", options.loader);
  Check.typeOf.object("options.resource", options.resource);
  //>>includeEnd('debug');

  /**
   * The loader used to load resources for this model.
   * The corresponding constructor parameter is undocumented, since
   * ResourceLoader is part of the private API.
   *
   * @type {ResourceLoader}
   * @private
   */
  this._loader = options.loader;
  this._resource = options.resource;

  /**
   * Type of this model, to distinguish individual glTF files from 3D Tiles
   * internally. The corresponding constructor parameter is undocumented, since
   * ModelExperimentalType is part of the private API.
   *
   * @type {ModelExperimentalType}
   * @private
   * @readonly
   */
  this.type = defaultValue(options.type, ModelExperimentalType.GLTF);

  /**
   * The 4x4 transformation matrix that transforms the model from model to world coordinates.
   * When this is the identity matrix, the model is drawn in world coordinates, i.e., Earth's Cartesian WGS84 coordinates.
   * Local reference frames can be used by providing a different transformation matrix, like that returned
   * by {@link Transforms.eastNorthUpToFixedFrame}.
   *
   * @type {Matrix4}

   * @default {@link Matrix4.IDENTITY}
   *
   * @example
   * const origin = Cesium.Cartesian3.fromDegrees(-95.0, 40.0, 200000.0);
   * m.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(origin);
   */
  this.modelMatrix = Matrix4.clone(
    defaultValue(options.modelMatrix, Matrix4.IDENTITY)
  );
  this._modelMatrix = Matrix4.clone(this.modelMatrix);
  this._scale = defaultValue(options.scale, 1.0);

  this._minimumPixelSize = defaultValue(options.minimumPixelSize, 0.0);

  this._maximumScale = options.maximumScale;

  /**
   * The scale value after being clamped by the maximum scale parameter.
   * Used to adjust bounding spheres without repeated calculation.
   *
   * @type {Number}
   * @private
   */
  this._clampedScale = defined(this._maximumScale)
    ? Math.min(this._scale, this._maximumScale)
    : this._scale;

  this._computedScale = this._clampedScale;

  /**
   * Whether or not the ModelExperimentalSceneGraph should call updateModelMatrix.
   * This will be true if any of the model matrix, scale, minimum pixel size, or maximum scale are dirty.
   *
   * @type {Number}
   * @private
   */
  this._updateModelMatrix = false;

  /**
   * If defined, this matrix is used to transform miscellaneous properties like
   * clipping planes and image-based lighting instead of the modelMatrix. This is
   * so that when models are part of a tileset, these properties get transformed
   * relative to a common reference (such as the root).
   *
   * @type {Matrix4}
   * @private
   */
  this.referenceMatrix = undefined;
  this._iblReferenceFrameMatrix = Matrix3.clone(Matrix3.IDENTITY); // Derived from reference matrix and the current view matrix

  this._resourcesLoaded = false;
  this._drawCommandsBuilt = false;

  this._ready = false;
  this._customShader = options.customShader;
  this._content = options.content;

  this._texturesLoaded = false;
  this._defaultTexture = undefined;

  this._activeAnimations = new ModelExperimentalAnimationCollection(this);
  this._clampAnimations = defaultValue(options.clampAnimations, true);

  const color = options.color;
  this._color = defaultValue(color) ? Color.clone(color) : undefined;
  this._colorBlendMode = defaultValue(
    options.colorBlendMode,
    ColorBlendMode.HIGHLIGHT
  );
  this._colorBlendAmount = defaultValue(options.colorBlendAmount, 0.5);

  this._cull = defaultValue(options.cull, true);
  this._opaquePass = defaultValue(options.opaquePass, Pass.OPAQUE);
  this._allowPicking = defaultValue(options.allowPicking, true);
  this._show = defaultValue(options.show, true);

  this._style = undefined;

  let featureIdLabel = defaultValue(options.featureIdLabel, "featureId_0");
  if (typeof featureIdLabel === "number") {
    featureIdLabel = `featureId_${featureIdLabel}`;
  }
  this._featureIdLabel = featureIdLabel;

  let instanceFeatureIdLabel = defaultValue(
    options.instanceFeatureIdLabel,
    "instanceFeatureId_0"
  );
  if (typeof instanceFeatureIdLabel === "number") {
    instanceFeatureIdLabel = `instanceFeatureId_${instanceFeatureIdLabel}`;
  }
  this._instanceFeatureIdLabel = instanceFeatureIdLabel;

  this._featureTables = [];
  this._featureTableId = undefined;
  this._featureTableIdDirty = true;

  // Keeps track of resources that need to be destroyed when the draw commands are reset.
  this._resources = [];

  // Keeps track of resources that need to be destroyed when the Model is destroyed.
  this._modelResources = [];

  // Computation of the model's bounding sphere and its initial radius is done in ModelExperimentalSceneGraph
  this._boundingSphere = new BoundingSphere();
  this._initialRadius = undefined;

  const pointCloudShading = new PointCloudShading(options.pointCloudShading);
  this._attenuation = pointCloudShading.attenuation;
  this._pointCloudShading = pointCloudShading;

  // If the given clipping planes don't have an owner, make this model its owner.
  // Otherwise, the clipping planes are passed down from a tileset.
  const clippingPlanes = options.clippingPlanes;
  if (defined(clippingPlanes) && clippingPlanes.owner === undefined) {
    ClippingPlaneCollection.setOwner(clippingPlanes, this, "_clippingPlanes");
  } else {
    this._clippingPlanes = clippingPlanes;
  }
  this._clippingPlanesState = 0; // If this value changes, the shaders need to be regenerated.
  this._clippingPlanesMatrix = Matrix4.clone(Matrix4.IDENTITY); // Derived from reference matrix and the current view matrix

  this._lightColor = Cartesian3.clone(options.lightColor);

  this._imageBasedLighting = defined(options.imageBasedLighting)
    ? options.imageBasedLighting
    : new ImageBasedLighting();
  this._shouldDestroyImageBasedLighting = !defined(options.imageBasedLighting);

  this._backFaceCulling = defaultValue(options.backFaceCulling, true);
  this._backFaceCullingDirty = false;

  this._shadows = defaultValue(options.shadows, ShadowMode.ENABLED);
  this._shadowsDirty = false;

  this._debugShowBoundingVolumeDirty = false;
  this._debugShowBoundingVolume = defaultValue(
    options.debugShowBoundingVolume,
    false
  );

  this._enableDebugWireframe = defaultValue(
    options.enableDebugWireframe,
    false
  );
  this._debugWireframe = defaultValue(options.debugWireframe, false);

  this._showCreditsOnScreen = defaultValue(options.showCreditsOnScreen, false);

  this._splitDirection = defaultValue(
    options.splitDirection,
    SplitDirection.NONE
  );

  this._sceneMode = undefined;
  this._projectTo2D = defaultValue(options.projectTo2D, false);

  this._completeLoad = function (model, frameState) {};
  this._texturesLoadedPromise = undefined;
  this._readyPromise = initialize(this);
}

function createModelFeatureTables(model, structuralMetadata) {
  const featureTables = model._featureTables;

  const propertyTables = structuralMetadata.propertyTables;
  for (let i = 0; i < propertyTables.length; i++) {
    const propertyTable = propertyTables[i];
    const modelFeatureTable = new ModelFeatureTable({
      model: model,
      propertyTable: propertyTable,
    });

    featureTables.push(modelFeatureTable);
  }

  return featureTables;
}

function selectFeatureTableId(components, model) {
  const featureIdLabel = model._featureIdLabel;
  const instanceFeatureIdLabel = model._instanceFeatureIdLabel;

  let i, j;
  let featureIdAttribute;

  let node;
  // Scan the nodes till we find one with instances, get the feature table ID
  // if the feature ID attribute of the user-selected index is present.
  for (i = 0; i < components.nodes.length; i++) {
    node = components.nodes[i];
    if (defined(node.instances)) {
      featureIdAttribute = ModelExperimentalUtility.getFeatureIdsByLabel(
        node.instances.featureIds,
        instanceFeatureIdLabel
      );
      if (
        defined(featureIdAttribute) &&
        defined(featureIdAttribute.propertyTableId)
      ) {
        return featureIdAttribute.propertyTableId;
      }
    }
  }

  // Scan the primitives till we find one with textures or attributes, get the feature table ID
  // if the feature ID attribute/texture of the user-selected index is present.
  for (i = 0; i < components.nodes.length; i++) {
    node = components.nodes[i];
    for (j = 0; j < node.primitives.length; j++) {
      const primitive = node.primitives[j];
      const featureIds = ModelExperimentalUtility.getFeatureIdsByLabel(
        primitive.featureIds,
        featureIdLabel
      );

      if (defined(featureIds)) {
        return featureIds.propertyTableId;
      }
    }
  }
}

function initialize(model) {
  const loader = model._loader;
  const resource = model._resource;

  loader.load();

  const loaderPromise = loader.promise.then(function (loader) {
    const components = loader.components;
    const structuralMetadata = components.structuralMetadata;

    if (
      defined(structuralMetadata) &&
      structuralMetadata.propertyTableCount > 0
    ) {
      createModelFeatureTables(model, structuralMetadata);
    }

    model._sceneGraph = new ModelExperimentalSceneGraph({
      model: model,
      modelComponents: components,
    });
    model._resourcesLoaded = true;
  });

  // Transcoded .pnts models do not have textures
  const texturesLoadedPromise = defaultValue(
    loader.texturesLoadedPromise,
    Promise.resolve()
  );
  model._texturesLoadedPromise = texturesLoadedPromise
    .then(function () {
      model._texturesLoaded = true;
    })
    .catch(
      ModelExperimentalUtility.getFailedLoadFunction(model, "model", resource)
    );

  const promise = new Promise(function (resolve, reject) {
    model._completeLoad = function (model, frameState) {
      // Set the model as ready after the first frame render since the user might set up events subscribed to
      // the post render event, and the model may not be ready for those past the first frame.
      frameState.afterRender.push(function () {
        model._ready = true;
        resolve(model);
      });
    };
  });

  return loaderPromise
    .then(function () {
      return promise;
    })
    .catch(
      ModelExperimentalUtility.getFailedLoadFunction(model, "model", resource)
    );
}

Object.defineProperties(ModelExperimental.prototype, {
  /**
   * When <code>true</code>, this model is ready to render, i.e., the external binary, image,
   * and shader files were downloaded and the WebGL resources were created.  This is set to
   * <code>true</code> right before {@link ModelExperimental#readyPromise} is resolved.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @default false
   */
  ready: {
    get: function () {
      return this._ready;
    },
  },

  /**
   * Gets the promise that will be resolved when this model is ready to render, i.e. when the external resources
   * have been downloaded and the WebGL resources are created.
   * <p>
   * This promise is resolved at the end of the frame before the first frame the model is rendered in.
   * </p>
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Promise.<ModelExperimental>}
   * @readonly
   */
  readyPromise: {
    get: function () {
      return this._readyPromise;
    },
  },

  /**
   * A promise that resolves when all textures are loaded.
   * When <code>incrementallyLoadTextures</code> is true this may resolve after
   * <code>promise</code> resolves.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Promise<void>}
   * @readonly
   *
   * @private
   */
  texturesLoadedPromise: {
    get: function () {
      return this._texturesLoadedPromise;
    },
  },

  /**
   * @private
   */
  loader: {
    get: function () {
      return this._loader;
    },
  },

  /**
   * The currently playing glTF animations.
   *
   * @memberof ModelExperimental.prototype
   * @type {ModelExperimentalAnimationCollection}
   * @readonly
   */
  activeAnimations: {
    get: function () {
      return this._activeAnimations;
    },
  },

  /**
   * Determines if the model's animations should hold a pose over frames where no keyframes are specified.
   *
   * @memberof ModelExperimental.prototype
   * @type {Boolean}
   *
   * @default true
   */
  clampAnimations: {
    get: function () {
      return this._clampAnimations;
    },
    set: function (value) {
      this._clampAnimations = value;
    },
  },

  /**
   * Whether or not to cull the model using frustum/horizon culling. If the model is part of a 3D Tiles tileset, this property
   * will always be false, since the 3D Tiles culling system is used.
   *
   * @type {Boolean}
   * @readonly
   *
   * @private
   */
  cull: {
    get: function () {
      return this._cull;
    },
  },

  /**
   * The pass to use in the {@link DrawCommand} for the opaque portions of the model.
   *
   * @type {Pass}
   * @readonly
   *
   * @private
   */
  opaquePass: {
    get: function () {
      return this._opaquePass;
    },
  },

  /**
   * Point cloud shading settings for controlling point cloud attenuation
   * and lighting. For 3D Tiles, this is inherited from the
   * {@link Cesium3DTileset}.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {PointCloudShading}
   */
  pointCloudShading: {
    get: function () {
      return this._pointCloudShading;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.defined("pointCloudShading", value);
      //>>includeEnd('debug');
      if (value !== this._pointCloudShading) {
        this.resetDrawCommands();
      }
      this._pointCloudShading = value;
    },
  },

  /**
   * The model's custom shader, if it exists. Using custom shaders with a {@link Cesium3DTileStyle}
   * may lead to undefined behavior.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {CustomShader}
   */
  customShader: {
    get: function () {
      return this._customShader;
    },
    set: function (value) {
      if (value !== this._customShader) {
        this.resetDrawCommands();
      }
      this._customShader = value;
    },
  },

  /**
   * The scene graph of this model.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {ModelExperimentalSceneGraph}
   * @private
   */
  sceneGraph: {
    get: function () {
      return this._sceneGraph;
    },
  },

  /**
   * The tile content this model belongs to, if it is loaded as part of a {@link Cesium3DTileset}.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Cesium3DTileContent}
   * @readonly
   *
   * @private
   */
  content: {
    get: function () {
      return this._content;
    },
  },

  /**
   * The structural metadata from the EXT_structural_metadata extension
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {StructuralMetadata}
   * @readonly
   * @private
   */
  structuralMetadata: {
    get: function () {
      return this._sceneGraph.components.structuralMetadata;
    },
  },

  /**
   * The ID for the feature table to use for picking and styling in this model.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Number}
   *
   * @private
   */
  featureTableId: {
    get: function () {
      return this._featureTableId;
    },
    set: function (value) {
      this._featureTableId = value;
    },
  },

  /**
   * The feature tables for this model.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Array}
   * @readonly
   *
   * @private
   */
  featureTables: {
    get: function () {
      return this._featureTables;
    },
    set: function (value) {
      this._featureTables = value;
    },
  },

  /**
   * When <code>true</code>, each primitive is pickable with {@link Scene#pick}.  When <code>false</code>, GPU memory is saved.
   *
   * @type {Boolean}
   * @readonly
   *
   * @private
   */
  allowPicking: {
    get: function () {
      return this._allowPicking;
    },
  },

  /**
   * The style to apply the to the features in the model. Cannot be applied if a {@link CustomShader} is also applied.
   *
   * @type {Cesium3DTileStyle}
   */
  style: {
    get: function () {
      return this._style;
    },
    set: function (value) {
      if (value !== this._style) {
        this.applyStyle(value);
      }
      this._style = value;
    },
  },

  /**
   * The color to blend with the model's rendered color.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Color}
   */
  color: {
    get: function () {
      return this._color;
    },
    set: function (value) {
      if (!Color.equals(this._color, value)) {
        this.resetDrawCommands();
      }
      this._color = Color.clone(value, this._color);
    },
  },

  /**
   * Defines how the color blends with the model.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Cesium3DTileColorBlendMode|ColorBlendMode}
   * @default ColorBlendMode.HIGHLIGHT
   */
  colorBlendMode: {
    get: function () {
      return this._colorBlendMode;
    },
    set: function (value) {
      this._colorBlendMode = value;
    },
  },

  /**
   * Value used to determine the color strength when the <code>colorBlendMode</code> is <code>MIX</code>. A value of 0.0 results in the model's rendered color while a value of 1.0 results in a solid color, with any value in-between resulting in a mix of the two.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Number}
   * @default 0.5
   */
  colorBlendAmount: {
    get: function () {
      return this._colorBlendAmount;
    },
    set: function (value) {
      this._colorBlendAmount = value;
    },
  },

  /**
   * Gets the model's bounding sphere in world space. This does not take into account
   * glTF animations, skins, or morph targets. It also does not account for
   * {@link ModelExperimental#minimumPixelSize}.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {BoundingSphere}
   * @readonly
   */
  boundingSphere: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The model is not loaded. Use ModelExperimental.readyPromise or wait for ModelExperimental.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._boundingSphere;
    },
  },

  /**
   * This property is for debugging only; it is not for production use nor is it optimized.
   * <p>
   * Draws the bounding sphere for each draw command in the model.
   * </p>
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Boolean}
   *
   * @default false
   */
  debugShowBoundingVolume: {
    get: function () {
      return this._debugShowBoundingVolume;
    },
    set: function (value) {
      if (this._debugShowBoundingVolume !== value) {
        this._debugShowBoundingVolumeDirty = true;
      }
      this._debugShowBoundingVolume = value;
    },
  },

  /**
   * This property is for debugging only; it is not for production use nor is it optimized.
   * <p>
   * Draws the model in wireframe.
   * </p>
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Boolean}
   *
   * @default false
   */
  debugWireframe: {
    get: function () {
      return this._debugWireframe;
    },
    set: function (value) {
      if (this._debugWireframe !== value) {
        this.resetDrawCommands();
      }
      this._debugWireframe = value;
    },
  },

  /**
   * Whether or not to render the model.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Boolean}
   *
   * @default true
   */
  show: {
    get: function () {
      return this._show;
    },
    set: function (value) {
      this._show = value;
    },
  },

  /**
   * Label of the feature ID set to use for picking and styling.
   * <p>
   * For EXT_mesh_features, this is the feature ID's label property, or
   * "featureId_N" (where N is the index in the featureIds array) when not
   * specified. EXT_feature_metadata did not have a label field, so such
   * feature ID sets are always labeled "featureId_N" where N is the index in
   * the list of all feature Ids, where feature ID attributes are listed before
   * feature ID textures.
   * </p>
   * <p>
   * If featureIdLabel is set to an integer N, it is converted to
   * the string "featureId_N" automatically. If both per-primitive and
   * per-instance feature IDs are present, the instance feature IDs take
   * priority.
   * </p>
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {String}
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  featureIdLabel: {
    get: function () {
      return this._featureIdLabel;
    },
    set: function (value) {
      // indices get converted into featureId_N
      if (typeof value === "number") {
        value = `featureId_${value}`;
      }

      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.string("value", value);
      //>>includeEnd('debug');

      if (value !== this._featureIdLabel) {
        this._featureTableIdDirty = true;
      }

      this._featureIdLabel = value;
    },
  },

  /**
   * Label of the instance feature ID set used for picking and styling.
   * <p>
   * If instanceFeatureIdLabel is set to an integer N, it is converted to
   * the string "instanceFeatureId_N" automatically.
   * If both per-primitive and per-instance feature IDs are present, the
   * instance feature IDs take priority.
   * </p>
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {String}
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  instanceFeatureIdLabel: {
    get: function () {
      return this._instanceFeatureIdLabel;
    },
    set: function (value) {
      // indices get converted into instanceFeatureId_N
      if (typeof value === "number") {
        value = `instanceFeatureId_${value}`;
      }

      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.string("value", value);
      //>>includeEnd('debug');

      if (value !== this._instanceFeatureIdLabel) {
        this._featureTableIdDirty = true;
      }

      this._instanceFeatureIdLabel = value;
    },
  },

  /**
   * The {@link ClippingPlaneCollection} used to selectively disable rendering the model.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {ClippingPlaneCollection}
   */
  clippingPlanes: {
    get: function () {
      return this._clippingPlanes;
    },
    set: function (value) {
      if (value !== this._clippingPlanes) {
        // Handle destroying old clipping planes, new clipping planes ownership
        ClippingPlaneCollection.setOwner(value, this, "_clippingPlanes");
        this.resetDrawCommands();
      }
    },
  },

  /**
   * The light color when shading the model. When <code>undefined</code> the scene's light color is used instead.
   * <p>
   * Disabling additional light sources by setting
   * <code>model.imageBasedLighting.imageBasedLightingFactor = new Cartesian2(0.0, 0.0)</code>
   * will make the model much darker. Here, increasing the intensity of the light source will make the model brighter.
   * </p>
   * @memberof ModelExperimental.prototype
   *
   * @type {Cartesian3}
   * @default undefined
   */
  lightColor: {
    get: function () {
      return this._lightColor;
    },
    set: function (value) {
      if (defined(value) !== defined(this._lightColor)) {
        this.resetDrawCommands();
      }

      this._lightColor = Cartesian3.clone(value, this._lightColor);
    },
  },

  /**
   * The properties for managing image-based lighting on this model.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {ImageBasedLighting}
   */
  imageBasedLighting: {
    get: function () {
      return this._imageBasedLighting;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.object("imageBasedLighting", this._imageBasedLighting);
      //>>includeEnd('debug');

      if (value !== this._imageBasedLighting) {
        if (
          this._shouldDestroyImageBasedLighting &&
          !this._imageBasedLighting.isDestroyed()
        ) {
          this._imageBasedLighting.destroy();
        }
        this._imageBasedLighting = value;
        this._shouldDestroyImageBasedLighting = false;
        this.resetDrawCommands();
      }
    },
  },

  /**
   * Whether to cull back-facing geometry. When true, back face culling is
   * determined by the material's doubleSided property; when false, back face
   * culling is disabled. Back faces are not culled if the model's color is
   * translucent.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Boolean}
   *
   * @default true
   */
  backFaceCulling: {
    get: function () {
      return this._backFaceCulling;
    },
    set: function (value) {
      if (value !== this._backFaceCulling) {
        this._backFaceCullingDirty = true;
      }

      this._backFaceCulling = value;
    },
  },

  /**
   * A uniform scale applied to this model before the {@link Model#modelMatrix}.
   * Values greater than <code>1.0</code> increase the size of the model; values
   * less than <code>1.0</code> decrease.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Number}
   *
   * @default 1.0
   */
  scale: {
    get: function () {
      return this._scale;
    },
    set: function (value) {
      if (value !== this._scale) {
        this._updateModelMatrix = true;
      }
      this._scale = value;
    },
  },

  /**
   * The true scale of the model after being affected by the model's scale,
   * minimum pixel size, and maximum scale parameters.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Number}
   * @private
   */
  computedScale: {
    get: function () {
      return this._computedScale;
    },
  },

  /**
   * The approximate minimum pixel size of the model regardless of zoom.
   * This can be used to ensure that a model is visible even when the viewer
   * zooms out.  When <code>0.0</code>, no minimum size is enforced.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Number}
   *
   * @default 0.0
   */
  minimumPixelSize: {
    get: function () {
      return this._minimumPixelSize;
    },
    set: function (value) {
      if (value !== this._minimumPixelSize) {
        this._updateModelMatrix = true;
      }
      this._minimumPixelSize = value;
    },
  },

  /**
   * The maximum scale size for a model. This can be used to give
   * an upper limit to the {@link Model#minimumPixelSize}, ensuring that the model
   * is never an unreasonable scale.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Number}
   */
  maximumScale: {
    get: function () {
      return this._maximumScale;
    },
    set: function (value) {
      if (value !== this._maximumScale) {
        this._updateModelMatrix = true;
      }
      this._maximumScale = value;
    },
  },

  /**
   * Determines whether the model casts or receives shadows from light sources.

   * @memberof ModelExperimental.prototype
   *
   * @type {ShadowMode}
   *
   * @default ShadowMode.ENABLED
   */
  shadows: {
    get: function () {
      return this._shadows;
    },
    set: function (value) {
      if (value !== this._shadows) {
        this._shadowsDirty = true;
      }

      this._shadows = value;
    },
  },

  /**
   * Gets or sets whether the credits of the model will be displayed on the screen
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Boolean}
   *
   * @default false
   */
  showCreditsOnScreen: {
    get: function () {
      return this._showCreditsOnScreen;
    },
    set: function (value) {
      this._showCreditsOnScreen = value;
    },
  },

  /**
   * The {@link SplitDirection} to apply to this model.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {SplitDirection}
   * @default {@link SplitDirection.NONE}
   */
  splitDirection: {
    get: function () {
      return this._splitDirection;
    },
    set: function (value) {
      if (this._splitDirection !== value) {
        this.resetDrawCommands();
      }
      this._splitDirection = value;
    },
  },
});

/**
 * Resets the draw commands for this model.
 *
 * @private
 */
ModelExperimental.prototype.resetDrawCommands = function () {
  if (!this._drawCommandsBuilt) {
    return;
  }
  this.destroyResources();
  this._drawCommandsBuilt = false;
};

const scratchIBLReferenceFrameMatrix4 = new Matrix4();
const scratchIBLReferenceFrameMatrix3 = new Matrix3();
const scratchClippingPlanesMatrix = new Matrix4();

/**
 * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
 * get the draw commands needed to render this primitive.
 * <p>
 * Do not call this function directly.  This is documented just to
 * list the exceptions that may be propagated when the scene is rendered:
 * </p>
 *
 * @exception {RuntimeError} Failed to load external reference.
 */
ModelExperimental.prototype.update = function (frameState) {
  // Keep processing the model every frame until the main resources
  // (buffer views) and textures (which may be loaded asynchronously)
  // are processed.
  if (!this._resourcesLoaded || !this._texturesLoaded) {
    this._loader.process(frameState);
  }

  // A custom shader may have to load texture uniforms.
  if (defined(this._customShader)) {
    this._customShader.update(frameState);
  }

  // Check if the shader needs to be updated for point cloud attenuation
  // settings.
  if (this.pointCloudShading.attenuation !== this._attenuation) {
    this.resetDrawCommands();
    this._attenuation = this.pointCloudShading.attenuation;
  }

  const context = frameState.context;
  const referenceMatrix = defaultValue(this.referenceMatrix, this.modelMatrix);

  // Update the image-based lighting for this model to detect any changes in parameters.
  this._imageBasedLighting.update(frameState);

  if (
    this._imageBasedLighting.useSphericalHarmonicCoefficients ||
    this._imageBasedLighting.useSpecularEnvironmentMaps
  ) {
    let iblReferenceFrameMatrix3 = scratchIBLReferenceFrameMatrix3;
    let iblReferenceFrameMatrix4 = scratchIBLReferenceFrameMatrix4;

    iblReferenceFrameMatrix4 = Matrix4.multiply(
      context.uniformState.view3D,
      referenceMatrix,
      iblReferenceFrameMatrix4
    );
    iblReferenceFrameMatrix3 = Matrix4.getMatrix3(
      iblReferenceFrameMatrix4,
      iblReferenceFrameMatrix3
    );
    iblReferenceFrameMatrix3 = Matrix3.getRotation(
      iblReferenceFrameMatrix3,
      iblReferenceFrameMatrix3
    );
    this._iblReferenceFrameMatrix = Matrix3.transpose(
      iblReferenceFrameMatrix3,
      this._iblReferenceFrameMatrix
    );
  }

  if (this._imageBasedLighting.shouldRegenerateShaders) {
    this.resetDrawCommands();
  }

  // Update the clipping planes collection for this model to detect any changes.
  let currentClippingPlanesState = 0;
  if (this.isClippingEnabled()) {
    if (this._clippingPlanes.owner === this) {
      this._clippingPlanes.update(frameState);
    }

    let clippingPlanesMatrix = scratchClippingPlanesMatrix;
    clippingPlanesMatrix = Matrix4.multiply(
      context.uniformState.view3D,
      referenceMatrix,
      clippingPlanesMatrix
    );
    clippingPlanesMatrix = Matrix4.multiply(
      clippingPlanesMatrix,
      this._clippingPlanes.modelMatrix,
      clippingPlanesMatrix
    );
    this._clippingPlanesMatrix = Matrix4.inverseTranspose(
      clippingPlanesMatrix,
      this._clippingPlanesMatrix
    );

    currentClippingPlanesState = this._clippingPlanes.clippingPlanesState;
  }

  if (currentClippingPlanesState !== this._clippingPlanesState) {
    this.resetDrawCommands();
    this._clippingPlanesState = currentClippingPlanesState;
  }

  this._defaultTexture = context.defaultTexture;

  // short-circuit if the model resources aren't ready.
  if (!this._resourcesLoaded || frameState.mode === SceneMode.MORPHING) {
    return;
  }

  if (frameState.mode !== this._sceneMode) {
    if (this._projectTo2D) {
      this.resetDrawCommands();
    } else {
      this._updateModelMatrix = true;
    }
    this._sceneMode = frameState.mode;
  }

  if (this._featureTableIdDirty) {
    updateFeatureTableId(this);
    this._featureTableIdDirty = false;
  }

  const featureTables = this._featureTables;
  for (let i = 0; i < featureTables.length; i++) {
    featureTables[i].update(frameState);
    // Check if the types of style commands needed have changed and trigger a reset of the draw commands
    // to ensure that translucent and opaque features are handled in the correct passes.
    if (featureTables[i].styleCommandsNeededDirty) {
      this.resetDrawCommands();
    }
  }

  if (!this._drawCommandsBuilt) {
    this._sceneGraph.buildDrawCommands(frameState);
    this._drawCommandsBuilt = true;

    const model = this;

    if (!model._ready) {
      model._completeLoad(model, frameState);

      // Don't render until the next frame after the ready promise is resolved
      return;
    }
  }

  // This is done without a dirty flag so that the model matrix can be updated in-place
  // without needing to use a setter.
  if (!Matrix4.equals(this.modelMatrix, this._modelMatrix)) {
    //>>includeStart('debug', pragmas.debug);
    if (frameState.mode !== SceneMode.SCENE3D && this._projectTo2D) {
      throw new DeveloperError(
        "ModelExperimental.modelMatrix cannot be changed in 2D or Columbus View if projectTo2D is true."
      );
    }
    //>>includeEnd('debug');
    this._updateModelMatrix = true;
    this._modelMatrix = Matrix4.clone(this.modelMatrix, this._modelMatrix);
    this._boundingSphere = BoundingSphere.transform(
      this._sceneGraph.boundingSphere,
      this.modelMatrix,
      this._boundingSphere
    );
  }

  if (this._updateModelMatrix || this._minimumPixelSize !== 0.0) {
    this._clampedScale = defined(this._maximumScale)
      ? Math.min(this._scale, this._maximumScale)
      : this._scale;
    this._boundingSphere.radius = this._initialRadius * this._clampedScale;
    this._computedScale = getScale(this, frameState);
    this._sceneGraph.updateModelMatrix(frameState);
    this._updateModelMatrix = false;
  }

  if (this._backFaceCullingDirty) {
    this.sceneGraph.updateBackFaceCulling(this._backFaceCulling);
    this._backFaceCullingDirty = false;
  }

  if (this._shadowsDirty) {
    this.sceneGraph.updateShadows(this._shadows);
    this._shadowsDirty = false;
  }

  if (this._debugShowBoundingVolumeDirty) {
    this._sceneGraph.updateShowBoundingVolume(this._debugShowBoundingVolume);
    this._debugShowBoundingVolumeDirty = false;
  }

  const updateForAnimations = this._activeAnimations.update(frameState);
  this._sceneGraph.update(frameState, updateForAnimations);

  // Check for show here because we still want the draw commands to be built so user can instantly see the model
  // when show is set to true.
  if (this._show && this._computedScale !== 0) {
    const asset = this._sceneGraph.components.asset;
    const credits = asset.credits;

    const length = credits.length;
    for (let i = 0; i < length; i++) {
      const credit = credits[i];
      credit.showOnScreen = this._showCreditsOnScreen;
      frameState.creditDisplay.addCredit(credit);
    }

    const drawCommands = this._sceneGraph.getDrawCommands(frameState);
    frameState.commandList.push.apply(frameState.commandList, drawCommands);
  }
};

function updateFeatureTableId(model) {
  const components = model._sceneGraph.components;
  const structuralMetadata = components.structuralMetadata;

  if (
    defined(structuralMetadata) &&
    structuralMetadata.propertyTableCount > 0
  ) {
    model.featureTableId = selectFeatureTableId(components, model);
    // Re-apply the style to reflect the new feature ID table.
    // This in turn triggers a rebuild of the draw commands.
    model.applyStyle(model._style);
  }
}

const scratchBoundingSphere = new BoundingSphere();

function scaleInPixels(positionWC, radius, frameState) {
  scratchBoundingSphere.center = positionWC;
  scratchBoundingSphere.radius = radius;
  return frameState.camera.getPixelSize(
    scratchBoundingSphere,
    frameState.context.drawingBufferWidth,
    frameState.context.drawingBufferHeight
  );
}

const scratchPosition = new Cartesian3();
const scratchCartographic = new Cartographic();

function getScale(model, frameState) {
  let scale = model.scale;

  if (model.minimumPixelSize !== 0.0 && !model._projectTo2D) {
    // Compute size of bounding sphere in pixels
    const context = frameState.context;
    const maxPixelSize = Math.max(
      context.drawingBufferWidth,
      context.drawingBufferHeight
    );
    const m = model.modelMatrix;
    scratchPosition.x = m[12];
    scratchPosition.y = m[13];
    scratchPosition.z = m[14];

    if (model._sceneMode !== SceneMode.SCENE3D) {
      const projection = frameState.mapProjection;
      const cartographic = projection.ellipsoid.cartesianToCartographic(
        scratchPosition,
        scratchCartographic
      );
      projection.project(cartographic, scratchPosition);

      // In 2D / CV mode, the map is a yz-plane in world space, so the coordinates
      // need to be reordered accordingly.
      Cartesian3.fromElements(
        scratchPosition.z,
        scratchPosition.x,
        scratchPosition.y,
        scratchPosition
      );
    }

    const radius = model._boundingSphere.radius;
    const metersPerPixel = scaleInPixels(scratchPosition, radius, frameState);

    // metersPerPixel is always > 0.0
    const pixelsPerMeter = 1.0 / metersPerPixel;
    const diameterInPixels = Math.min(
      pixelsPerMeter * (2.0 * radius),
      maxPixelSize
    );

    // Maintain model's minimum pixel size
    if (diameterInPixels < model.minimumPixelSize) {
      scale =
        (model.minimumPixelSize * metersPerPixel) /
        (2.0 * model._initialRadius);
    }
  }

  return defined(model.maximumScale)
    ? Math.min(model.maximumScale, scale)
    : scale;
}

/**
 * Gets whether or not clipping planes are enabled for this model.
 *
 * @returns {Boolean} <code>true</code> if clipping planes are enabled for this model, <code>false</code>.
 * @private
 */
ModelExperimental.prototype.isClippingEnabled = function () {
  const clippingPlanes = this._clippingPlanes;
  return (
    defined(clippingPlanes) &&
    clippingPlanes.enabled &&
    clippingPlanes.length !== 0
  );
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see ModelExperimental#destroy
 */
ModelExperimental.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * model = model && model.destroy();
 *
 * @see ModelExperimental#isDestroyed
 */
ModelExperimental.prototype.destroy = function () {
  const loader = this._loader;
  if (defined(loader)) {
    loader.destroy();
  }

  const featureTables = this._featureTables;
  if (defined(featureTables)) {
    for (let i = 0; i < featureTables.length; i++) {
      featureTables[i].destroy();
    }
  }

  this.destroyResources();
  this.destroyModelResources();

  // Only destroy the ClippingPlaneCollection if this is the owner.
  const clippingPlaneCollection = this._clippingPlanes;
  if (
    defined(clippingPlaneCollection) &&
    !clippingPlaneCollection.isDestroyed() &&
    clippingPlaneCollection.owner === this
  ) {
    clippingPlaneCollection.destroy();
  }
  this._clippingPlanes = undefined;

  // Only destroy the ImageBasedLighting if this is the owner.
  if (
    this._shouldDestroyImageBasedLighting &&
    !this._imageBasedLighting.isDestroyed()
  ) {
    this._imageBasedLighting.destroy();
  }
  this._imageBasedLighting = undefined;

  destroyObject(this);
};

/**
 * Destroys resources generated in the pipeline stages.
 * @private
 */
ModelExperimental.prototype.destroyResources = function () {
  const resources = this._resources;
  for (let i = 0; i < resources.length; i++) {
    resources[i].destroy();
  }
  this._resources = [];
};

/**
 * Destroys resources generated for the model.
 * @private
 */
ModelExperimental.prototype.destroyModelResources = function () {
  const resources = this._modelResources;
  for (let i = 0; i < resources.length; i++) {
    resources[i].destroy();
  }
  this._modelResources = [];
};

/**
 * <p>
 * Creates a model from a glTF asset.  When the model is ready to render, i.e., when the external binary, image,
 * and shader files are downloaded and the WebGL resources are created, the {@link Model#readyPromise} is resolved.
 * </p>
 * <p>
 * The model can be a traditional glTF asset with a .gltf extension or a Binary glTF using the .glb extension.
 *
 * @param {Object} options Object with the following properties:
 * @param {String|Resource} options.url The url to the .gltf or .glb file.
 * @param {String|Resource} [options.basePath=''] The base path that paths in the glTF JSON are relative to.
 * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms the model from model to world coordinates.
 * @param {Number} [options.scale=1.0] A uniform scale applied to this model.
 * @param {Number} [options.minimumPixelSize=0.0] The approximate minimum pixel size of the model regardless of zoom.
 * @param {Number} [options.maximumScale] The maximum scale size of a model. An upper limit for minimumPixelSize.
 * @param {Boolean} [options.incrementallyLoadTextures=true] Determine if textures may continue to stream in after the model is loaded.
 * @param {Boolean} [options.releaseGltfJson=false] When true, the glTF JSON is released once the glTF is loaded. This is is especially useful for cases like 3D Tiles, where each .gltf model is unique and caching the glTF JSON is not effective.
 * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Draws the bounding sphere for each draw command in the model.
 * @param {Boolean} [options.enableDebugWireframe=false] For debugging only. This must be set to true for debugWireframe to work in WebGL1. This cannot be set after the model has loaded.
 * @param {Boolean} [options.debugWireframe=false] For debugging only. Draws the model in wireframe. Will only work for WebGL1 if enableDebugWireframe is set to true.
 * @param {Boolean} [options.cull=true]  Whether or not to cull the model using frustum/horizon culling. If the model is part of a 3D Tiles tileset, this property will always be false, since the 3D Tiles culling system is used.
 * @param {Boolean} [options.opaquePass=Pass.OPAQUE] The pass to use in the {@link DrawCommand} for the opaque portions of the model.
 * @param {Axis} [options.upAxis=Axis.Y] The up-axis of the glTF model.
 * @param {Axis} [options.forwardAxis=Axis.Z] The forward-axis of the glTF model.
 * @param {Boolean} [options.allowPicking=true] When <code>true</code>, each primitive is pickable with {@link Scene#pick}.
 * @param {CustomShader} [options.customShader] A custom shader. This will add user-defined GLSL code to the vertex and fragment shaders. Using custom shaders with a {@link Cesium3DTileStyle} may lead to undefined behavior.
 * @param {Cesium3DTileContent} [options.content] The tile content this model belongs to. This property will be undefined if model is not loaded as part of a tileset.
 * @param {Boolean} [options.show=true] Whether or not to render the model.
 * @param {Color} [options.color] A color that blends with the model's rendered color.
 * @param {ColorBlendMode} [options.colorBlendMode=ColorBlendMode.HIGHLIGHT] Defines how the color blends with the model.
 * @param {Number} [options.colorBlendAmount=0.5] Value used to determine the color strength when the <code>colorBlendMode</code> is <code>MIX</code>. A value of 0.0 results in the model's rendered color while a value of 1.0 results in a solid color, with any value in-between resulting in a mix of the two.
 * @param {String|Number} [options.featureIdLabel="featureId_0"] Label of the feature ID set to use for picking and styling. For EXT_mesh_features, this is the feature ID's label property, or "featureId_N" (where N is the index in the featureIds array) when not specified. EXT_feature_metadata did not have a label field, so such feature ID sets are always labeled "featureId_N" where N is the index in the list of all feature Ids, where feature ID attributes are listed before feature ID textures. If featureIdLabel is an integer N, it is converted to the string "featureId_N" automatically. If both per-primitive and per-instance feature IDs are present, the instance feature IDs take priority.
 * @param {String|Number} [options.instanceFeatureIdLabel="instanceFeatureId_0"] Label of the instance feature ID set used for picking and styling. If instanceFeatureIdLabel is set to an integer N, it is converted to the string "instanceFeatureId_N" automatically. If both per-primitive and per-instance feature IDs are present, the instance feature IDs take priority.
 * @param {Object} [options.pointCloudShading] Options for constructing a {@link PointCloudShading} object to control point attenuation and lighting.
 * @param {ClippingPlaneCollection} [options.clippingPlanes] The {@link ClippingPlaneCollection} used to selectively disable rendering the model.
 * @param {Cartesian3} [options.lightColor] The light color when shading the model. When <code>undefined</code> the scene's light color is used instead.
 * @param {ImageBasedLighting} [options.imageBasedLighting] The properties for managing image-based lighting on this model.
 * @param {Boolean} [options.backFaceCulling=true] Whether to cull back-facing geometry. When true, back face culling is determined by the material's doubleSided property; when false, back face culling is disabled. Back faces are not culled if the model's color is translucent.
 * @param {ShadowMode} [options.shadows=ShadowMode.ENABLED] Determines whether the model casts or receives shadows from light sources.
 * @param {Boolean} [options.showCreditsOnScreen=false] Whether to display the credits of this model on screen.
 * @param {SplitDirection} [options.splitDirection=SplitDirection.NONE] The {@link SplitDirection} split to apply to this model.
 * @param {Boolean} [options.projectTo2D=false] Whether to accurately project the model's positions in 2D. If a model is part of a 3D Tiles tileset, this will always be true. If this is false, the model will show up in 2D / CV mode but its positions may be inaccurate. This disables minimumPixelSize and prevents future modification to its model matrix. This also cannot be set after the model has loaded.
 * @returns {ModelExperimental} The newly created model.
 */
ModelExperimental.fromGltf = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  if (!defined(options.url) && !defined(options.gltf)) {
    throw new DeveloperError("options.url is required.");
  }
  //>>includeEnd('debug');

  // options.gltf is used internally for 3D Tiles. It can be a Resource, a URL
  // to a glTF/glb file, a binary glTF buffer, or a JSON object containing the
  // glTF contents.
  const gltf = defaultValue(options.url, options.gltf);

  const loaderOptions = {
    releaseGltfJson: options.releaseGltfJson,
    incrementallyLoadTextures: options.incrementallyLoadTextures,
    upAxis: options.upAxis,
    forwardAxis: options.forwardAxis,
    loadAttributesFor2D: options.projectTo2D,
    loadIndicesForWireframe: options.enableDebugWireframe,
  };

  const basePath = defaultValue(options.basePath, "");
  const baseResource = Resource.createIfNeeded(basePath);

  if (defined(gltf.asset)) {
    loaderOptions.gltfJson = gltf;
    loaderOptions.baseResource = baseResource;
    loaderOptions.gltfResource = baseResource;
  } else if (gltf instanceof Uint8Array) {
    loaderOptions.typedArray = gltf;
    loaderOptions.baseResource = baseResource;
    loaderOptions.gltfResource = baseResource;
  } else {
    loaderOptions.gltfResource = Resource.createIfNeeded(gltf);
  }

  const loader = new GltfLoader(loaderOptions);

  const is3DTiles = defined(options.content);
  const type = is3DTiles
    ? ModelExperimentalType.TILE_GLTF
    : ModelExperimentalType.GLTF;

  const modelOptions = makeModelOptions(loader, type, options);
  modelOptions.resource = loaderOptions.gltfResource;

  const model = new ModelExperimental(modelOptions);

  return model;
};

/*
 * @private
 */
ModelExperimental.fromB3dm = function (options) {
  const loaderOptions = {
    b3dmResource: options.resource,
    arrayBuffer: options.arrayBuffer,
    byteOffset: options.byteOffset,
    releaseGltfJson: options.releaseGltfJson,
    incrementallyLoadTextures: options.incrementallyLoadTextures,
    upAxis: options.upAxis,
    forwardAxis: options.forwardAxis,
    loadAttributesFor2D: options.projectTo2D,
    loadIndicesForWireframe: options.enableDebugWireframe,
  };

  const loader = new B3dmLoader(loaderOptions);

  const modelOptions = makeModelOptions(
    loader,
    ModelExperimentalType.TILE_B3DM,
    options
  );
  const model = new ModelExperimental(modelOptions);
  return model;
};

/**
 * @private
 */
ModelExperimental.fromPnts = function (options) {
  const loaderOptions = {
    arrayBuffer: options.arrayBuffer,
    byteOffset: options.byteOffset,
  };
  const loader = new PntsLoader(loaderOptions);

  const modelOptions = makeModelOptions(
    loader,
    ModelExperimentalType.TILE_PNTS,
    options
  );
  const model = new ModelExperimental(modelOptions);
  return model;
};

/*
 * @private
 */
ModelExperimental.fromI3dm = function (options) {
  const loaderOptions = {
    i3dmResource: options.resource,
    arrayBuffer: options.arrayBuffer,
    byteOffset: options.byteOffset,
    releaseGltfJson: options.releaseGltfJson,
    incrementallyLoadTextures: options.incrementallyLoadTextures,
    upAxis: options.upAxis,
    forwardAxis: options.forwardAxis,
    loadAttributesFor2D: options.projectTo2D,
    loadIndicesForWireframe: options.enableDebugWireframe,
  };
  const loader = new I3dmLoader(loaderOptions);

  const modelOptions = makeModelOptions(
    loader,
    ModelExperimentalType.TILE_I3DM,
    options
  );
  const model = new ModelExperimental(modelOptions);
  return model;
};

/*
 * @private
 */
ModelExperimental.fromGeoJson = function (options) {
  const loaderOptions = {
    geoJson: options.geoJson,
  };
  const loader = new GeoJsonLoader(loaderOptions);
  const modelOptions = makeModelOptions(
    loader,
    ModelExperimentalType.TILE_GEOJSON,
    options
  );
  const model = new ModelExperimental(modelOptions);
  return model;
};

/**
 * @private
 */
ModelExperimental.prototype.applyColorAndShow = function (style) {
  const hasColorStyle = defined(style) && defined(style.color);
  const hasShowStyle = defined(style) && defined(style.show);

  this._color = hasColorStyle
    ? style.color.evaluateColor(undefined, this._color)
    : Color.clone(Color.WHITE, this._color);
  this._show = hasShowStyle ? style.show.evaluate(undefined) : true;
};

/**
 * @private
 */
ModelExperimental.prototype.applyStyle = function (style) {
  // The style is only set by the ModelFeatureTable. If there are no features,
  // the color and show from the style are directly applied.
  if (
    defined(this.featureTableId) &&
    this.featureTables[this.featureTableId].featuresLength > 0
  ) {
    const featureTable = this.featureTables[this.featureTableId];
    featureTable.applyStyle(style);
  } else {
    this.applyColorAndShow(style);
  }

  this.resetDrawCommands();
};

function makeModelOptions(loader, modelType, options) {
  return {
    loader: loader,
    type: modelType,
    resource: options.resource,
    modelMatrix: options.modelMatrix,
    scale: options.scale,
    minimumPixelSize: options.minimumPixelSize,
    maximumScale: options.maximumScale,
    debugShowBoundingVolume: options.debugShowBoundingVolume,
    enableDebugWireframe: options.enableDebugWireframe,
    debugWireframe: options.debugWireframe,
    cull: options.cull,
    opaquePass: options.opaquePass,
    allowPicking: options.allowPicking,
    customShader: options.customShader,
    content: options.content,
    show: options.show,
    color: options.color,
    colorBlendAmount: options.colorBlendAmount,
    colorBlendMode: options.colorBlendMode,
    featureIdLabel: options.featureIdLabel,
    instanceFeatureIdLabel: options.instanceFeatureIdLabel,
    pointCloudShading: options.pointCloudShading,
    clippingPlanes: options.clippingPlanes,
    lightColor: options.lightColor,
    imageBasedLighting: options.imageBasedLighting,
    backFaceCulling: options.backFaceCulling,
    shadows: options.shadows,
    showCreditsOnScreen: options.showCreditsOnScreen,
    splitDirection: options.splitDirection,
    projectTo2D: options.projectTo2D,
  };
}
