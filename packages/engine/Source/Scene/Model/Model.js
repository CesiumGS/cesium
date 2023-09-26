import BoundingSphere from "../../Core/BoundingSphere.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Cartographic from "../../Core/Cartographic.js";
import Check from "../../Core/Check.js";
import Credit from "../../Core/Credit.js";
import Color from "../../Core/Color.js";
import defined from "../../Core/defined.js";
import defaultValue from "../../Core/defaultValue.js";
import DeveloperError from "../../Core/DeveloperError.js";
import destroyObject from "../../Core/destroyObject.js";
import DistanceDisplayCondition from "../../Core/DistanceDisplayCondition.js";
import Event from "../../Core/Event.js";
import Matrix3 from "../../Core/Matrix3.js";
import Matrix4 from "../../Core/Matrix4.js";
import Resource from "../../Core/Resource.js";
import RuntimeError from "../../Core/RuntimeError.js";
import Pass from "../../Renderer/Pass.js";
import ClippingPlaneCollection from "../ClippingPlaneCollection.js";
import ColorBlendMode from "../ColorBlendMode.js";
import GltfLoader from "../GltfLoader.js";
import HeightReference from "../HeightReference.js";
import ImageBasedLighting from "../ImageBasedLighting.js";
import PointCloudShading from "../PointCloudShading.js";
import SceneMode from "../SceneMode.js";
import SceneTransforms from "../SceneTransforms.js";
import ShadowMode from "../ShadowMode.js";
import SplitDirection from "../SplitDirection.js";
import B3dmLoader from "./B3dmLoader.js";
import GeoJsonLoader from "./GeoJsonLoader.js";
import I3dmLoader from "./I3dmLoader.js";
import ModelAnimationCollection from "./ModelAnimationCollection.js";
import ModelFeatureTable from "./ModelFeatureTable.js";
import ModelSceneGraph from "./ModelSceneGraph.js";
import ModelStatistics from "./ModelStatistics.js";
import ModelType from "./ModelType.js";
import ModelUtility from "./ModelUtility.js";
import oneTimeWarning from "../../Core/oneTimeWarning.js";
import PntsLoader from "./PntsLoader.js";
import StyleCommandsNeeded from "./StyleCommandsNeeded.js";

/**
 * <div class="notice">
 * To construct a Model, call {@link Model.fromGltfAsync}. Do not call the constructor directly.
 * </div>
 * A 3D model based on glTF, the runtime asset format for WebGL, OpenGL ES, and OpenGL.
 * <p>
 * Cesium supports glTF assets with the following extensions:
 * <ul>
 *  <li>
 *  {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/AGI_articulations/README.md|AGI_articulations}
 *  </li>
 *  <li>
 *  {@link https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Vendor/CESIUM_primitive_outline|CESIUM_primitive_outline}
 *  </li>
 *  <li>
 *  {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/1.0/Vendor/CESIUM_RTC/README.md|CESIUM_RTC}
 *  </li>
 *  <li>
 *  {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_instance_features|EXT_instance_features}
 *  </li>
 *  <li>
 *  {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_mesh_features|EXT_mesh_features}
 *  </li>
 *  <li>
 *  {@link https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Vendor/EXT_mesh_gpu_instancing|EXT_mesh_gpu_instancing}
 *  </li>
 *  <li>
 *  {@link https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Vendor/EXT_meshopt_compression|EXT_meshopt_compression}
 *  </li>
 *  <li>
 *  {@link https://github.com/CesiumGS/glTF/tree/3d-tiles-next/extensions/2.0/Vendor/EXT_structural_metadata|EXT_structural_metadata}
 *  </li>
 *  <li>
 *  {@link https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Vendor/EXT_texture_webp|EXT_texture_webp}
 *  </li>
 *  <li>
 *  {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_draco_mesh_compression/README.md|KHR_draco_mesh_compression}
 *  </li>
 *  <li>
 *  {@link https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Archived/KHR_techniques_webgl/README.md|KHR_techniques_webgl}
 *  </li>
 *  <li>
 *  {@link https://github.com/KhronosGroup/glTF/blob/main/extensions/1.0/Khronos/KHR_materials_common/README.md|KHR_materials_common}
 *  </li>
 *  <li>
 *  {@link https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Archived/KHR_materials_pbrSpecularGlossiness|KHR_materials_pbrSpecularGlossiness}
 *  </li>
 *  <li>
 *  {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_unlit/README.md|KHR_materials_unlit}
 *  </li>
 *  <li>
 *  {@link https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_mesh_quantization|KHR_mesh_quantization}
 *  </li>
 *  <li>
 *  {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_texture_basisu|KHR_texture_basisu}
 *  </li>
 *  <li>
 *  {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_texture_transform/README.md|KHR_texture_transform}
 *  </li>
 *  <li>
 *  {@link https://github.com/KhronosGroup/glTF/blob/main/extensions/1.0/Vendor/WEB3D_quantized_attributes/README.md|WEB3D_quantized_attributes}
 *  </li>
 * </ul>
 * </p>
 * <p>
 * Note: for models with compressed textures using the KHR_texture_basisu extension, we recommend power of 2 textures in both dimensions
 * for maximum compatibility. This is because some samplers require power of 2 textures ({@link https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL|Using textures in WebGL})
 * and KHR_texture_basisu requires multiple of 4 dimensions ({@link https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_texture_basisu/README.md#additional-requirements|KHR_texture_basisu additional requirements}).
 * </p>
 *
 * @alias Model
 * @internalConstructor
 *
 * @privateParam {ResourceLoader} options.loader The loader used to load resources for this model.
 * @privateParam {ModelType} options.type Type of this model, to distinguish individual glTF files from 3D Tiles internally. 
 * @privateParam {object} options Object with the following properties:
 * @privateParam {Resource} options.resource The Resource to the 3D model.
 * @privateParam {boolean} [options.show=true] Whether or not to render the model.
 * @privateParam {Matrix4} [options.modelMatrix=Matrix4.IDENTITY]  The 4x4 transformation matrix that transforms the model from model to world coordinates.
 * @privateParam {number} [options.scale=1.0] A uniform scale applied to this model.
 * @privateParam {number} [options.minimumPixelSize=0.0] The approximate minimum pixel size of the model regardless of zoom.
 * @privateParam {number} [options.maximumScale] The maximum scale size of a model. An upper limit for minimumPixelSize.
 * @privateParam {object} [options.id] A user-defined object to return when the model is picked with {@link Scene#pick}.
 * @privateParam {boolean} [options.allowPicking=true] When <code>true</code>, each primitive is pickable with {@link Scene#pick}.
 * @privateParam {boolean} [options.clampAnimations=true] Determines if the model's animations should hold a pose over frames where no keyframes are specified.
 * @privateParam {ShadowMode} [options.shadows=ShadowMode.ENABLED] Determines whether the model casts or receives shadows from light sources.
 * @privateParam {boolean} [options.debugShowBoundingVolume=false] For debugging only. Draws the bounding sphere for each draw command in the model.
 * @privateParam {boolean} [options.enableDebugWireframe=false] For debugging only. This must be set to true for debugWireframe to work in WebGL1. This cannot be set after the model has loaded.
 * @privateParam {boolean} [options.debugWireframe=false] For debugging only. Draws the model in wireframe. Will only work for WebGL1 if enableDebugWireframe is set to true.
 * @privateParam {boolean} [options.cull=true]  Whether or not to cull the model using frustum/horizon culling. If the model is part of a 3D Tiles tileset, this property will always be false, since the 3D Tiles culling system is used.
 * @privateParam {boolean} [options.opaquePass=Pass.OPAQUE] The pass to use in the {@link DrawCommand} for the opaque portions of the model.
 * @privateParam {CustomShader} [options.customShader] A custom shader. This will add user-defined GLSL code to the vertex and fragment shaders. Using custom shaders with a {@link Cesium3DTileStyle} may lead to undefined behavior.
 * @privateParam {Cesium3DTileContent} [options.content] The tile content this model belongs to. This property will be undefined if model is not loaded as part of a tileset.
 * @privateParam {HeightReference} [options.heightReference=HeightReference.NONE] Determines how the model is drawn relative to terrain.
 * @privateParam {Scene} [options.scene] Must be passed in for models that use the height reference property.
 * @privateParam {DistanceDisplayCondition} [options.distanceDisplayCondition] The condition specifying at what distance from the camera that this model will be displayed.
 * @privateParam {Color} [options.color] A color that blends with the model's rendered color.
 * @privateParam {ColorBlendMode} [options.colorBlendMode=ColorBlendMode.HIGHLIGHT] Defines how the color blends with the model.
 * @privateParam {number} [options.colorBlendAmount=0.5] Value used to determine the color strength when the <code>colorBlendMode</code> is <code>MIX</code>. A value of 0.0 results in the model's rendered color while a value of 1.0 results in a solid color, with any value in-between resulting in a mix of the two.
 * @privateParam {Color} [options.silhouetteColor=Color.RED] The silhouette color. If more than 256 models have silhouettes enabled, there is a small chance that overlapping models will have minor artifacts.
 * @privateParam {number} [options.silhouetteSize=0.0] The size of the silhouette in pixels.
 * @privateParam {boolean} [options.enableShowOutline=true] Whether to enable outlines for models using the {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/CESIUM_primitive_outline|CESIUM_primitive_outline} extension. This can be set to false to avoid the additional processing of geometry at load time. When false, the showOutlines and outlineColor options are ignored.
 * @privateParam {boolean} [options.showOutline=true] Whether to display the outline for models using the {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/CESIUM_primitive_outline|CESIUM_primitive_outline} extension. When true, outlines are displayed. When false, outlines are not displayed.
 * @privateParam {Color} [options.outlineColor=Color.BLACK] The color to use when rendering outlines.
 * @privateParam {ClippingPlaneCollection} [options.clippingPlanes] The {@link ClippingPlaneCollection} used to selectively disable rendering the model.
 * @privateParam {Cartesian3} [options.lightColor] The light color when shading the model. When <code>undefined</code> the scene's light color is used instead.
 * @privateParam {ImageBasedLighting} [options.imageBasedLighting] The properties for managing image-based lighting on this model.
 * @privateParam {boolean} [options.backFaceCulling=true] Whether to cull back-facing geometry. When true, back face culling is determined by the material's doubleSided property; when false, back face culling is disabled. Back faces are not culled if the model's color is translucent.
 * @privateParam {Credit|string} [options.credit] A credit for the data source, which is displayed on the canvas.
 * @privateParam {boolean} [options.showCreditsOnScreen=false] Whether to display the credits of this model on screen.
 * @privateParam {SplitDirection} [options.splitDirection=SplitDirection.NONE] The {@link SplitDirection} split to apply to this model.
 * @privateParam {boolean} [options.projectTo2D=false] Whether to accurately project the model's positions in 2D. If this is true, the model will be projected accurately to 2D, but it will use more memory to do so. If this is false, the model will use less memory and will still render in 2D / CV mode, but its positions may be inaccurate. This disables minimumPixelSize and prevents future modification to the model matrix. This also cannot be set after the model has loaded.
 * @privateParam {string|number} [options.featureIdLabel="featureId_0"] Label of the feature ID set to use for picking and styling. For EXT_mesh_features, this is the feature ID's label property, or "featureId_N" (where N is the index in the featureIds array) when not specified. EXT_feature_metadata did not have a label field, so such feature ID sets are always labeled "featureId_N" where N is the index in the list of all feature Ids, where feature ID attributes are listed before feature ID textures. If featureIdLabel is an integer N, it is converted to the string "featureId_N" automatically. If both per-primitive and per-instance feature IDs are present, the instance feature IDs take priority.
 * @privateParam {string|number} [options.instanceFeatureIdLabel="instanceFeatureId_0"] Label of the instance feature ID set used for picking and styling. If instanceFeatureIdLabel is set to an integer N, it is converted to the string "instanceFeatureId_N" automatically. If both per-primitive and per-instance feature IDs are present, the instance feature IDs take priority.
 * @privateParam {object} [options.pointCloudShading] Options for constructing a {@link PointCloudShading} object to control point attenuation based on geometric error and lighting.
 * @privateParam {ClassificationType} [options.classificationType] Determines whether terrain, 3D Tiles or both will be classified by this model. This cannot be set after the model has loaded.
 
 *
 * @see Model.fromGltfAsync
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=3D%20Models.html|Cesium Sandcastle Models Demo}
 */
function Model(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.loader", options.loader);
  Check.typeOf.object("options.resource", options.resource);
  //>>includeEnd('debug');

  /**
   * The loader used to load resources for this model.
   *
   * @type {ResourceLoader}
   * @private
   */
  this._loader = options.loader;
  this._resource = options.resource;

  /**
   * Type of this model, to distinguish individual glTF files from 3D Tiles
   * internally.
   *
   * @type {ModelType}
   * @readonly
   *
   * @private
   */
  this.type = defaultValue(options.type, ModelType.GLTF);

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
   * @type {number}
   * @private
   */
  this._clampedScale = defined(this._maximumScale)
    ? Math.min(this._scale, this._maximumScale)
    : this._scale;

  this._computedScale = this._clampedScale;

  /**
   * Whether or not the ModelSceneGraph should call updateModelMatrix.
   * This will be true if any of the model matrix, scale, minimum pixel size, or maximum scale are dirty.
   *
   * @type {number}
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

  this._activeAnimations = new ModelAnimationCollection(this);
  this._clampAnimations = defaultValue(options.clampAnimations, true);

  // This flag is true when the Cesium API, not a glTF animation, changes
  // the transform of a node in the model.
  this._userAnimationDirty = false;

  this._id = options.id;
  this._idDirty = false;

  this._color = Color.clone(options.color);
  this._colorBlendMode = defaultValue(
    options.colorBlendMode,
    ColorBlendMode.HIGHLIGHT
  );
  this._colorBlendAmount = defaultValue(options.colorBlendAmount, 0.5);

  const silhouetteColor = defaultValue(options.silhouetteColor, Color.RED);
  this._silhouetteColor = Color.clone(silhouetteColor);
  this._silhouetteSize = defaultValue(options.silhouetteSize, 0.0);
  this._silhouetteDirty = false;

  // If silhouettes are used for the model, this will be set to the number
  // of the stencil buffer used for rendering the silhouette. This is set
  // by ModelSilhouettePipelineStage, not by Model itself.
  this._silhouetteId = undefined;

  this._cull = defaultValue(options.cull, true);
  this._opaquePass = defaultValue(options.opaquePass, Pass.OPAQUE);
  this._allowPicking = defaultValue(options.allowPicking, true);
  this._show = defaultValue(options.show, true);

  this._style = undefined;
  this._styleDirty = false;
  this._styleCommandsNeeded = undefined;

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
  this._pipelineResources = [];

  // Keeps track of resources that need to be destroyed when the Model is destroyed.
  this._modelResources = [];

  // Keeps track of the pick IDs for this model. These are stored and destroyed in the
  // pipeline resources array; the purpose of this array is to separate them from other
  // resources and update their ID objects when necessary.
  this._pickIds = [];

  // The model's bounding sphere and its initial radius are computed
  // in ModelSceneGraph.
  this._boundingSphere = new BoundingSphere();
  this._initialRadius = undefined;

  this._heightReference = defaultValue(
    options.heightReference,
    HeightReference.NONE
  );
  this._heightDirty = this._heightReference !== HeightReference.NONE;
  this._removeUpdateHeightCallback = undefined;

  this._clampedModelMatrix = undefined; // For use with height reference

  const scene = options.scene;
  if (defined(scene) && defined(scene.terrainProviderChanged)) {
    this._terrainProviderChangedCallback = scene.terrainProviderChanged.addEventListener(
      function () {
        this._heightDirty = true;
      },
      this
    );
  }
  this._scene = scene;

  this._distanceDisplayCondition = options.distanceDisplayCondition;

  const pointCloudShading = new PointCloudShading(options.pointCloudShading);
  this._pointCloudShading = pointCloudShading;
  this._attenuation = pointCloudShading.attenuation;
  this._pointCloudBackFaceCulling = pointCloudShading.backFaceCulling;

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
  this._enableShowOutline = defaultValue(options.enableShowOutline, true);
  this._debugWireframe = defaultValue(options.debugWireframe, false);

  // Warning for improper setup of debug wireframe
  if (
    this._debugWireframe === true &&
    this._enableDebugWireframe === false &&
    this.type === ModelType.GLTF
  ) {
    oneTimeWarning(
      "model-debug-wireframe-ignored",
      "enableDebugWireframe must be set to true in Model.fromGltf, otherwise debugWireframe will be ignored."
    );
  }

  // Credit specified by the user.
  let credit = options.credit;
  if (typeof credit === "string") {
    credit = new Credit(credit);
  }

  this._credits = [];
  this._credit = credit;

  // Credits to be added from the Resource (if it is an IonResource)
  this._resourceCredits = [];

  // Credits parsed from the glTF by GltfLoader.
  this._gltfCredits = [];

  this._showCreditsOnScreen = defaultValue(options.showCreditsOnScreen, false);
  this._showCreditsOnScreenDirty = true;

  this._splitDirection = defaultValue(
    options.splitDirection,
    SplitDirection.NONE
  );

  this._enableShowOutline = defaultValue(options.enableShowOutline, true);

  /**
   * Whether to display the outline for models using the
   * {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/CESIUM_primitive_outline|CESIUM_primitive_outline} extension.
   * When true, outlines are displayed. When false, outlines are not displayed.
   *
   * @type {boolean}
   *
   * @default true
   */
  this.showOutline = defaultValue(options.showOutline, true);

  /**
   * The color to use when rendering outlines.
   *
   * @type {Color}
   *
   * @default Color.BLACK
   */
  this.outlineColor = defaultValue(options.outlineColor, Color.BLACK);

  this._classificationType = options.classificationType;

  this._statistics = new ModelStatistics();

  this._sceneMode = undefined;
  this._projectTo2D = defaultValue(options.projectTo2D, false);

  this._skipLevelOfDetail = false;
  this._ignoreCommands = defaultValue(options.ignoreCommands, false);

  this._errorEvent = new Event();
  this._readyEvent = new Event();
  this._texturesReadyEvent = new Event();

  this._sceneGraph = undefined;
  this._nodesByName = {}; // Stores the nodes by their names in the glTF.

  /**
   * Used for picking primitives that wrap a model.
   *
   * @private
   */
  this.pickObject = options.pickObject;
}

function handleError(model, error) {
  if (model._errorEvent.numberOfListeners > 0) {
    model._errorEvent.raiseEvent(error);
    return;
  }

  console.log(error);
}

function createModelFeatureTables(model, structuralMetadata) {
  const featureTables = model._featureTables;

  const propertyTables = structuralMetadata.propertyTables;
  const length = propertyTables.length;
  for (let i = 0; i < length; i++) {
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
      featureIdAttribute = ModelUtility.getFeatureIdsByLabel(
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
      const featureIds = ModelUtility.getFeatureIdsByLabel(
        primitive.featureIds,
        featureIdLabel
      );

      if (defined(featureIds)) {
        return featureIds.propertyTableId;
      }
    }
  }

  // If there's only one feature table, then select it by default. This is
  // to ensure backwards compatibility with the older handling of b3dm models.
  if (model._featureTables.length === 1) {
    return 0;
  }
}

/**
 *  Returns whether the alpha state has changed between invisible,
 *  translucent, or opaque.
 *
 *  @private
 */
function isColorAlphaDirty(currentColor, previousColor) {
  if (!defined(currentColor) && !defined(previousColor)) {
    return false;
  }

  if (defined(currentColor) !== defined(previousColor)) {
    return true;
  }

  const currentAlpha = currentColor.alpha;
  const previousAlpha = previousColor.alpha;
  return (
    Math.floor(currentAlpha) !== Math.floor(previousAlpha) ||
    Math.ceil(currentAlpha) !== Math.ceil(previousAlpha)
  );
}

Object.defineProperties(Model.prototype, {
  /**
   * When <code>true</code>, this model is ready to render, i.e., the external binary, image,
   * and shader files were downloaded and the WebGL resources were created.
   *
   * @memberof Model.prototype
   *
   * @type {boolean}
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
   * Gets an event that is raised when the model encounters an asynchronous rendering error.  By subscribing
   * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
   * are passed an instance of {@link ModelError}.
   * @memberof Model.prototype
   * @type {Event}
   * @readonly
   */
  errorEvent: {
    get: function () {
      return this._errorEvent;
    },
  },

  /**
   * Gets an event that is raised when the model is loaded and ready for rendering, i.e. when the external resources
   * have been downloaded and the WebGL resources are created. Event listeners
   * are passed an instance of the {@link Model}.
   *
   * <p>
   * If {@link Model.incrementallyLoadTextures} is true, this event will be raised before all textures are loaded and ready for rendering. Subscribe to {@link Model.texturesReadyEvent} to be notified when the textures are ready.
   * </p>
   *
   * @memberof Model.prototype
   * @type {Event}
   * @readonly
   */
  readyEvent: {
    get: function () {
      return this._readyEvent;
    },
  },

  /**
   * Returns true if textures are loaded separately from the other glTF resources.
   *
   * @memberof Model.prototype
   *
   * @type {boolean}
   * @readonly
   * @private
   */
  incrementallyLoadTextures: {
    get: function () {
      return defaultValue(this._loader.incrementallyLoadTextures, false);
    },
  },

  /**
   * Gets an event that, if {@link Model.incrementallyLoadTextures} is true, is raised when the model textures are loaded and ready for rendering, i.e. when the external resources
   * have been downloaded and the WebGL resources are created. Event listeners
   * are passed an instance of the {@link Model}.
   *
   * @memberof Model.prototype
   * @type {Event}
   * @readonly
   */
  texturesReadyEvent: {
    get: function () {
      return this._texturesReadyEvent;
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
   * Get the estimated memory usage statistics for this model.
   *
   * @memberof Model.prototype
   *
   * @type {ModelStatistics}
   * @readonly
   *
   * @private
   */
  statistics: {
    get: function () {
      return this._statistics;
    },
  },

  /**
   * The currently playing glTF animations.
   *
   * @memberof Model.prototype
   *
   * @type {ModelAnimationCollection}
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
   * @memberof Model.prototype
   * @type {boolean}
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
   * @memberof Model.prototype
   *
   * @type {boolean}
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
   * @memberof Model.prototype
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
   * @memberof Model.prototype
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
   * @memberof Model.prototype
   *
   * @type {CustomShader}
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
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
   * @memberof Model.prototype
   *
   * @type {ModelSceneGraph}
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
   * @memberof Model.prototype
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
   * The height reference of the model, which determines how the model is drawn
   * relative to terrain.
   *
   * @memberof Model.prototype
   *
   * @type {HeightReference}
   * @default {HeightReference.NONE}
   *
   */
  heightReference: {
    get: function () {
      return this._heightReference;
    },
    set: function (value) {
      if (value !== this._heightReference) {
        this._heightDirty = true;
      }
      this._heightReference = value;
    },
  },

  /**
   * Gets or sets the distance display condition, which specifies at what distance
   * from the camera this model will be displayed.
   *
   * @memberof Model.prototype
   *
   * @type {DistanceDisplayCondition}
   *
   * @default undefined
   *
   */
  distanceDisplayCondition: {
    get: function () {
      return this._distanceDisplayCondition;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (defined(value) && value.far <= value.near) {
        throw new DeveloperError("far must be greater than near");
      }
      //>>includeEnd('debug');
      this._distanceDisplayCondition = DistanceDisplayCondition.clone(
        value,
        this._distanceDisplayCondition
      );
    },
  },

  /**
   * The structural metadata from the EXT_structural_metadata extension
   *
   * @memberof Model.prototype
   *
   * @type {StructuralMetadata}
   * @readonly
   *
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
   * @memberof Model.prototype
   *
   * @type {number}
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
   * @memberof Model.prototype
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
   * A user-defined object that is returned when the model is picked.
   *
   * @memberof Model.prototype
   *
   * @type {object}
   *
   * @default undefined
   *
   * @see Scene#pick
   */
  id: {
    get: function () {
      return this._id;
    },
    set: function (value) {
      if (value !== this._id) {
        this._idDirty = true;
      }

      this._id = value;
    },
  },

  /**
   * When <code>true</code>, each primitive is pickable with {@link Scene#pick}.  When <code>false</code>, GPU memory is saved.
   *
   * @memberof Model.prototype
   *
   * @type {boolean}
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
   * The style to apply to the features in the model. Cannot be applied if a {@link CustomShader} is also applied.
   *
   * @memberof Model.prototype
   *
   * @type {Cesium3DTileStyle}
   */
  style: {
    get: function () {
      return this._style;
    },
    set: function (value) {
      this._style = value;
      this._styleDirty = true;
    },
  },

  /**
   * The color to blend with the model's rendered color.
   *
   * @memberof Model.prototype
   *
   * @type {Color}
   *
   * @default undefined
   */
  color: {
    get: function () {
      return this._color;
    },
    set: function (value) {
      if (isColorAlphaDirty(value, this._color)) {
        this.resetDrawCommands();
      }
      this._color = Color.clone(value, this._color);
    },
  },

  /**
   * Defines how the color blends with the model.
   *
   * @memberof Model.prototype
   *
   * @type {Cesium3DTileColorBlendMode|ColorBlendMode}
   *
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
   * @memberof Model.prototype
   *
   * @type {number}
   *
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
   * The silhouette color.
   *
   * @memberof Model.prototype
   *
   * @type {Color}
   *
   * @default Color.RED
   */
  silhouetteColor: {
    get: function () {
      return this._silhouetteColor;
    },
    set: function (value) {
      if (!Color.equals(value, this._silhouetteColor)) {
        const alphaDirty = isColorAlphaDirty(value, this._silhouetteColor);
        this._silhouetteDirty = this._silhouetteDirty || alphaDirty;
      }

      this._silhouetteColor = Color.clone(value, this._silhouetteColor);
    },
  },

  /**
   * The size of the silhouette in pixels.
   *
   * @memberof Model.prototype
   *
   * @type {number}
   *
   * @default 0.0
   */
  silhouetteSize: {
    get: function () {
      return this._silhouetteSize;
    },
    set: function (value) {
      if (value !== this._silhouetteSize) {
        const currentSize = this._silhouetteSize;
        const sizeDirty =
          (value > 0.0 && currentSize === 0.0) ||
          (value === 0.0 && currentSize > 0.0);
        this._silhouetteDirty = this._silhouetteDirty || sizeDirty;

        // Back-face culling needs to be updated in case the silhouette size
        // is greater than zero.
        this._backFaceCullingDirty = this._backFaceCullingDirty || sizeDirty;
      }

      this._silhouetteSize = value;
    },
  },

  /**
   * Gets the model's bounding sphere in world space. This does not take into account
   * glTF animations, skins, or morph targets. It also does not account for
   * {@link Model#minimumPixelSize}.
   *
   * @memberof Model.prototype
   *
   * @type {BoundingSphere}
   * @readonly
   */
  boundingSphere: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The model is not loaded. Use Model.readyEvent or wait for Model.ready to be true."
        );
      }
      //>>includeEnd('debug');

      const modelMatrix = defined(this._clampedModelMatrix)
        ? this._clampedModelMatrix
        : this.modelMatrix;
      updateBoundingSphere(this, modelMatrix);

      return this._boundingSphere;
    },
  },

  /**
   * This property is for debugging only; it is not for production use nor is it optimized.
   * <p>
   * Draws the bounding sphere for each draw command in the model.
   * </p>
   *
   * @memberof Model.prototype
   *
   * @type {boolean}
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
   * @memberof Model.prototype
   *
   * @type {boolean}
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

      // Warning for improper setup of debug wireframe
      if (
        this._debugWireframe === true &&
        this._enableDebugWireframe === false &&
        this.type === ModelType.GLTF
      ) {
        oneTimeWarning(
          "model-debug-wireframe-ignored",
          "enableDebugWireframe must be set to true in Model.fromGltfAsync, otherwise debugWireframe will be ignored."
        );
      }
    },
  },

  /**
   * Whether or not to render the model.
   *
   * @memberof Model.prototype
   *
   * @type {boolean}
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
   * @memberof Model.prototype
   *
   * @type {string}
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
   * @memberof Model.prototype
   *
   * @type {string}
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
   * @memberof Model.prototype
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
   * @memberof Model.prototype
   *
   * @type {Cartesian3}
   *
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
   * @memberof Model.prototype
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
   * culling is disabled. Back faces are not culled if {@link Model#color}
   * is translucent or {@link Model#silhouetteSize} is greater than 0.0.
   *
   * @memberof Model.prototype
   *
   * @type {boolean}
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
   * @memberof Model.prototype
   *
   * @type {number}
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
   * @memberof Model.prototype
   *
   * @type {number}
   * @readonly
   *
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
   * @memberof Model.prototype
   *
   * @type {number}
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
   * @memberof Model.prototype
   *
   * @type {number}
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

   * @memberof Model.prototype
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
   * Gets the credit that will be displayed for the model.
   *
   * @memberof Model.prototype
   *
   * @type {Credit}
   * @readonly
   */
  credit: {
    get: function () {
      return this._credit;
    },
  },

  /**
   * Gets or sets whether the credits of the model will be displayed
   * on the screen.
   *
   * @memberof Model.prototype
   *
   * @type {boolean}
   *
   * @default false
   */
  showCreditsOnScreen: {
    get: function () {
      return this._showCreditsOnScreen;
    },
    set: function (value) {
      if (this._showCreditsOnScreen !== value) {
        this._showCreditsOnScreenDirty = true;
      }

      this._showCreditsOnScreen = value;
    },
  },

  /**
   * The {@link SplitDirection} to apply to this model.
   *
   * @memberof Model.prototype
   *
   * @type {SplitDirection}
   *
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

  /**
   * Gets the model's classification type. This determines whether terrain,
   * 3D Tiles, or both will be classified by this model.
   * <p>
   * Additionally, there are a few requirements/limitations:
   * <ul>
   *     <li>The glTF cannot contain morph targets, skins, or animations.</li>
   *     <li>The glTF cannot contain the <code>EXT_mesh_gpu_instancing</code> extension.</li>
   *     <li>Only meshes with TRIANGLES can be used to classify other assets.</li>
   *     <li>The position attribute is required.</li>
   *     <li>If feature IDs and an index buffer are both present, all indices with the same feature id must occupy contiguous sections of the index buffer.</li>
   *     <li>If feature IDs are present without an index buffer, all positions with the same feature id must occupy contiguous sections of the position buffer.</li>
   * </ul>
   * </p>
   *
   * @memberof Model.prototype
   *
   * @type {ClassificationType}
   * @default undefined
   *
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   * @readonly
   */
  classificationType: {
    get: function () {
      return this._classificationType;
    },
  },

  /**
   * Reference to the pick IDs. This is only used internally, e.g. for
   * per-feature post-processing in {@link PostProcessStage}.
   *
   * @memberof Model.prototype
   *
   * @type {PickId[]}
   * @readonly
   *
   * @private
   */
  pickIds: {
    get: function () {
      return this._pickIds;
    },
  },

  /**
   * The {@link StyleCommandsNeeded} for the style currently applied to
   * the features in the model. This is used internally by the {@link ModelDrawCommand}
   * when determining which commands to submit in an update.
   *
   * @memberof Model.prototype
   *
   * @type {StyleCommandsNeeded}
   * @readonly
   *
   * @private
   */
  styleCommandsNeeded: {
    get: function () {
      return this._styleCommandsNeeded;
    },
  },
});

/**
 * Returns the node with the given <code>name</code> in the glTF. This is used to
 * modify a node's transform for user-defined animation.
 *
 * @param {string} name The name of the node in the glTF.
 * @returns {ModelNode} The node, or <code>undefined</code> if no node with the <code>name</code> exists.
 *
 * @exception {DeveloperError} The model is not loaded.  Use Model.readyEvent or wait for Model.ready to be true.
 *
 * @example
 * // Apply non-uniform scale to node "Hand"
 * const node = model.getNode("Hand");
 * node.matrix = Cesium.Matrix4.fromScale(new Cesium.Cartesian3(5.0, 1.0, 1.0), node.matrix);
 */
Model.prototype.getNode = function (name) {
  //>>includeStart('debug', pragmas.debug);
  if (!this._ready) {
    throw new DeveloperError(
      "The model is not loaded. Use Model.readyEvent or wait for Model.ready to be true."
    );
  }
  Check.typeOf.string("name", name);
  //>>includeEnd('debug');

  return this._nodesByName[name];
};

/**
 * Sets the current value of an articulation stage.  After setting one or
 * multiple stage values, call Model.applyArticulations() to
 * cause the node matrices to be recalculated.
 *
 * @param {string} articulationStageKey The name of the articulation, a space, and the name of the stage.
 * @param {number} value The numeric value of this stage of the articulation.
 *
 * @exception {DeveloperError} The model is not loaded. Use Model.readyEvent or wait for Model.ready to be true.
 *
 * @see Model#applyArticulations
 *
 * @example
 * // Sets the value of the stage named "MoveX" belonging to the articulation named "SampleArticulation"
 * model.setArticulationStage("SampleArticulation MoveX", 50.0);
 */
Model.prototype.setArticulationStage = function (articulationStageKey, value) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("value", value);
  if (!this._ready) {
    throw new DeveloperError(
      "The model is not loaded. Use Model.readyEvent or wait for Model.ready to be true."
    );
  }
  //>>includeEnd('debug');

  this._sceneGraph.setArticulationStage(articulationStageKey, value);
};

/**
 * Applies any modified articulation stages to the matrix of each node that
 * participates in any articulation. Note that this will overwrite any node
 * transformations on participating nodes.
 *
 * @exception {DeveloperError} The model is not loaded. Use Model.readyEvent or wait for Model.ready to be true.
 */
Model.prototype.applyArticulations = function () {
  //>>includeStart('debug', pragmas.debug);
  if (!this._ready) {
    throw new DeveloperError(
      "The model is not loaded. Use Model.readyEvent or wait for Model.ready to be true."
    );
  }
  //>>includeEnd('debug');

  this._sceneGraph.applyArticulations();
};

/**
 * Marks the model's {@link Model#style} as dirty, which forces all features
 * to re-evaluate the style in the next frame the model is visible.
 */
Model.prototype.makeStyleDirty = function () {
  this._styleDirty = true;
};

/**
 * Resets the draw commands for this model.
 *
 * @private
 */
Model.prototype.resetDrawCommands = function () {
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
Model.prototype.update = function (frameState) {
  let finishedProcessing = false;
  try {
    // Keep processing the model every frame until the main resources
    // (buffer views) and textures (which may be loaded asynchronously)
    // are processed.
    finishedProcessing = processLoader(this, frameState);
  } catch (error) {
    if (
      !this._loader.incrementallyLoadTextures &&
      error.name === "TextureError"
    ) {
      handleError(this, error);
    } else {
      const runtimeError = ModelUtility.getError(
        "model",
        this._resource,
        error
      );
      handleError(this, runtimeError);
    }
  }

  // A custom shader may have to load texture uniforms.
  updateCustomShader(this, frameState);

  // The image-based lighting may have to load texture uniforms
  // for specular maps.
  updateImageBasedLighting(this, frameState);

  if (!this._resourcesLoaded && finishedProcessing) {
    this._resourcesLoaded = true;

    const components = this._loader.components;
    if (!defined(components)) {
      if (this._loader.isUnloaded()) {
        return;
      }

      const error = ModelUtility.getError(
        "model",
        this._resource,
        new RuntimeError("Failed to load model.")
      );
      handleError(error);
      this._rejectLoad = this._rejectLoad && this._rejectLoad(error);
    }

    const structuralMetadata = components.structuralMetadata;
    if (
      defined(structuralMetadata) &&
      structuralMetadata.propertyTableCount > 0
    ) {
      createModelFeatureTables(this, structuralMetadata);
    }

    const sceneGraph = new ModelSceneGraph({
      model: this,
      modelComponents: components,
    });

    this._sceneGraph = sceneGraph;
    this._gltfCredits = sceneGraph.components.asset.credits;
  }

  // Short-circuit if the model resources aren't ready or the scene
  // is currently morphing.
  if (!this._resourcesLoaded || frameState.mode === SceneMode.MORPHING) {
    return;
  }

  updateFeatureTableId(this);
  updateStyle(this);
  updateFeatureTables(this, frameState);
  updatePointCloudShading(this);
  updateSilhouette(this, frameState);
  updateSkipLevelOfDetail(this, frameState);
  updateClippingPlanes(this, frameState);
  updateSceneMode(this, frameState);

  this._defaultTexture = frameState.context.defaultTexture;

  buildDrawCommands(this, frameState);
  updateModelMatrix(this, frameState);

  // Many features (e.g. image-based lighting, clipping planes) depend on the model
  // matrix being updated for the current height reference, so update it first.
  updateClamping(this);

  updateBoundingSphereAndScale(this, frameState);
  updateReferenceMatrices(this, frameState);

  // This check occurs after the bounding sphere has been updated so that
  // zooming to the bounding sphere can account for any modifications
  // from the clamp-to-ground setting.
  if (!this._ready) {
    // Set the model as ready after the first frame render since the user might set up events subscribed to
    // the post render event, and the model may not be ready for those past the first frame.
    frameState.afterRender.push(() => {
      this._ready = true;
      this._readyEvent.raiseEvent(this);
    });

    // Don't render until the next frame after the ready event has been raised.
    return;
  }

  if (
    this._loader.incrementallyLoadTextures &&
    !this._texturesLoaded &&
    this._loader.texturesLoaded
  ) {
    // Re-run the pipeline so texture memory statistics are re-computed
    this.resetDrawCommands();

    this._texturesLoaded = true;
    this._texturesReadyEvent.raiseEvent(this);
  }

  updatePickIds(this);

  // Update the scene graph and draw commands for any changes in model's properties
  // (e.g. model matrix, back-face culling)
  updateSceneGraph(this, frameState);
  updateShowCreditsOnScreen(this);
  submitDrawCommands(this, frameState);
};

function processLoader(model, frameState) {
  if (
    !model._resourcesLoaded ||
    (model._loader.incrementallyLoadTextures && !model._texturesLoaded)
  ) {
    // Ensures frames continue to render in requestRender mode while resources are processing
    frameState.afterRender.push(() => true);
    return model._loader.process(frameState);
  }

  return true;
}

function updateCustomShader(model, frameState) {
  if (defined(model._customShader)) {
    model._customShader.update(frameState);
  }
}

function updateImageBasedLighting(model, frameState) {
  model._imageBasedLighting.update(frameState);
  if (model._imageBasedLighting.shouldRegenerateShaders) {
    model.resetDrawCommands();
  }
}

function updateFeatureTableId(model) {
  if (!model._featureTableIdDirty) {
    return;
  }
  model._featureTableIdDirty = false;

  const components = model._sceneGraph.components;
  const structuralMetadata = components.structuralMetadata;

  if (
    defined(structuralMetadata) &&
    structuralMetadata.propertyTableCount > 0
  ) {
    model.featureTableId = selectFeatureTableId(components, model);

    // Mark the style dirty to re-apply it and reflect the new feature ID table.
    model._styleDirty = true;

    // Trigger a rebuild of the draw commands.
    model.resetDrawCommands();
  }
}

function updateStyle(model) {
  if (model._styleDirty) {
    model.applyStyle(model._style);
    model._styleDirty = false;
  }
}

function updateFeatureTables(model, frameState) {
  const featureTables = model._featureTables;
  const length = featureTables.length;

  let styleCommandsNeededDirty = false;
  for (let i = 0; i < length; i++) {
    featureTables[i].update(frameState);
    // Check if the types of style commands needed have changed and trigger a reset of the draw commands
    // to ensure that translucent and opaque features are handled in the correct passes.
    if (featureTables[i].styleCommandsNeededDirty) {
      styleCommandsNeededDirty = true;
    }
  }

  if (styleCommandsNeededDirty) {
    updateStyleCommandsNeeded(model);
  }
}

function updateStyleCommandsNeeded(model) {
  const featureTable = model.featureTables[model.featureTableId];
  model._styleCommandsNeeded = StyleCommandsNeeded.getStyleCommandsNeeded(
    featureTable.featuresLength,
    featureTable.batchTexture.translucentFeaturesLength
  );
}

function updatePointCloudShading(model) {
  const pointCloudShading = model.pointCloudShading;

  // Check if the shader needs to be updated for point cloud attenuation
  // settings.
  if (pointCloudShading.attenuation !== model._attenuation) {
    model.resetDrawCommands();
    model._attenuation = pointCloudShading.attenuation;
  }

  if (pointCloudShading.backFaceCulling !== model._pointCloudBackFaceCulling) {
    model.resetDrawCommands();
    model._pointCloudBackFaceCulling = pointCloudShading.backFaceCulling;
  }
}

function updateSilhouette(model, frameState) {
  if (model._silhouetteDirty) {
    // Only rebuild draw commands if silhouettes are supported in the first place.
    if (supportsSilhouettes(frameState)) {
      model.resetDrawCommands();
    }

    model._silhouetteDirty = false;
  }
}

function updateSkipLevelOfDetail(model, frameState) {
  const skipLevelOfDetail = model.hasSkipLevelOfDetail(frameState);
  if (skipLevelOfDetail !== model._skipLevelOfDetail) {
    model.resetDrawCommands();
    model._skipLevelOfDetail = skipLevelOfDetail;
  }
}

function updateClippingPlanes(model, frameState) {
  // Update the clipping planes collection / state for this model to detect any changes.
  let currentClippingPlanesState = 0;
  if (model.isClippingEnabled()) {
    if (model._clippingPlanes.owner === model) {
      model._clippingPlanes.update(frameState);
    }
    currentClippingPlanesState = model._clippingPlanes.clippingPlanesState;
  }

  if (currentClippingPlanesState !== model._clippingPlanesState) {
    model.resetDrawCommands();
    model._clippingPlanesState = currentClippingPlanesState;
  }
}

function updateSceneMode(model, frameState) {
  if (frameState.mode !== model._sceneMode) {
    if (model._projectTo2D) {
      model.resetDrawCommands();
    } else {
      model._updateModelMatrix = true;
    }
    model._sceneMode = frameState.mode;
  }
}

function buildDrawCommands(model, frameState) {
  if (!model._drawCommandsBuilt) {
    model.destroyPipelineResources();
    model._sceneGraph.buildDrawCommands(frameState);
    model._drawCommandsBuilt = true;
  }
}

function updateModelMatrix(model, frameState) {
  // This is done without a dirty flag so that the model matrix can be updated in-place
  // without needing to use a setter.
  if (!Matrix4.equals(model.modelMatrix, model._modelMatrix)) {
    //>>includeStart('debug', pragmas.debug);
    if (frameState.mode !== SceneMode.SCENE3D && model._projectTo2D) {
      throw new DeveloperError(
        "Model.modelMatrix cannot be changed in 2D or Columbus View if projectTo2D is true."
      );
    }
    //>>includeEnd('debug');
    model._updateModelMatrix = true;
    model._modelMatrix = Matrix4.clone(model.modelMatrix, model._modelMatrix);
  }
}

const scratchPosition = new Cartesian3();
const scratchCartographic = new Cartographic();

function updateClamping(model) {
  if (
    !model._updateModelMatrix &&
    !model._heightDirty &&
    model._minimumPixelSize === 0.0
  ) {
    return;
  }

  if (defined(model._removeUpdateHeightCallback)) {
    model._removeUpdateHeightCallback();
    model._removeUpdateHeightCallback = undefined;
  }

  const scene = model._scene;
  if (
    !defined(scene) ||
    !defined(scene.globe) ||
    model.heightReference === HeightReference.NONE
  ) {
    //>>includeStart('debug', pragmas.debug);
    if (model.heightReference !== HeightReference.NONE) {
      throw new DeveloperError(
        "Height reference is not supported without a scene and globe."
      );
    }
    //>>includeEnd('debug');
    model._clampedModelMatrix = undefined;
    return;
  }

  const globe = scene.globe;
  const ellipsoid = globe.ellipsoid;

  // Compute cartographic position so we don't recompute every update
  const modelMatrix = model.modelMatrix;
  scratchPosition.x = modelMatrix[12];
  scratchPosition.y = modelMatrix[13];
  scratchPosition.z = modelMatrix[14];
  const cartoPosition = ellipsoid.cartesianToCartographic(scratchPosition);

  if (!defined(model._clampedModelMatrix)) {
    model._clampedModelMatrix = Matrix4.clone(modelMatrix, new Matrix4());
  }

  // Install callback to handle updating of terrain tiles
  const surface = globe._surface;
  model._removeUpdateHeightCallback = surface.updateHeight(
    cartoPosition,
    getUpdateHeightCallback(model, ellipsoid, cartoPosition)
  );

  // Set the correct height now
  const height = globe.getHeight(cartoPosition);
  if (defined(height)) {
    // Get callback with cartoPosition being the non-clamped position
    const callback = getUpdateHeightCallback(model, ellipsoid, cartoPosition);

    // Compute the clamped cartesian and call updateHeight callback
    Cartographic.clone(cartoPosition, scratchCartographic);
    scratchCartographic.height = height;
    ellipsoid.cartographicToCartesian(scratchCartographic, scratchPosition);
    callback(scratchPosition);
  }

  model._heightDirty = false;
  model._updateModelMatrix = true;
}

function updateBoundingSphereAndScale(model, frameState) {
  if (!model._updateModelMatrix && model._minimumPixelSize === 0.0) {
    return;
  }

  const modelMatrix = defined(model._clampedModelMatrix)
    ? model._clampedModelMatrix
    : model.modelMatrix;

  updateBoundingSphere(model, modelMatrix);
  updateComputedScale(model, modelMatrix, frameState);
}

function updateBoundingSphere(model, modelMatrix) {
  model._clampedScale = defined(model._maximumScale)
    ? Math.min(model._scale, model._maximumScale)
    : model._scale;

  model._boundingSphere.center = Cartesian3.multiplyByScalar(
    model._sceneGraph.boundingSphere.center,
    model._clampedScale,
    model._boundingSphere.center
  );
  model._boundingSphere.radius = model._initialRadius * model._clampedScale;

  model._boundingSphere = BoundingSphere.transform(
    model._boundingSphere,
    modelMatrix,
    model._boundingSphere
  );
}

function updateComputedScale(model, modelMatrix, frameState) {
  let scale = model.scale;

  if (model.minimumPixelSize !== 0.0 && !model._projectTo2D) {
    // Compute size of bounding sphere in pixels
    const context = frameState.context;
    const maxPixelSize = Math.max(
      context.drawingBufferWidth,
      context.drawingBufferHeight
    );

    Matrix4.getTranslation(modelMatrix, scratchPosition);

    if (model._sceneMode !== SceneMode.SCENE3D) {
      SceneTransforms.computeActualWgs84Position(
        frameState,
        scratchPosition,
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

  model._computedScale = defined(model.maximumScale)
    ? Math.min(model.maximumScale, scale)
    : scale;
}

function updatePickIds(model) {
  if (!model._idDirty) {
    return;
  }
  model._idDirty = false;

  const id = model._id;
  const pickIds = model._pickIds;
  const length = pickIds.length;
  for (let i = 0; i < length; ++i) {
    pickIds[i].object.id = id;
  }
}

function updateReferenceMatrices(model, frameState) {
  const modelMatrix = defined(model._clampedModelMatrix)
    ? model._clampedModelMatrix
    : model.modelMatrix;
  const referenceMatrix = defaultValue(model.referenceMatrix, modelMatrix);
  const context = frameState.context;

  const ibl = model._imageBasedLighting;
  if (ibl.useSphericalHarmonicCoefficients || ibl.useSpecularEnvironmentMaps) {
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
    model._iblReferenceFrameMatrix = Matrix3.transpose(
      iblReferenceFrameMatrix3,
      model._iblReferenceFrameMatrix
    );
  }

  if (model.isClippingEnabled()) {
    let clippingPlanesMatrix = scratchClippingPlanesMatrix;
    clippingPlanesMatrix = Matrix4.multiply(
      context.uniformState.view3D,
      referenceMatrix,
      clippingPlanesMatrix
    );
    clippingPlanesMatrix = Matrix4.multiply(
      clippingPlanesMatrix,
      model._clippingPlanes.modelMatrix,
      clippingPlanesMatrix
    );
    model._clippingPlanesMatrix = Matrix4.inverseTranspose(
      clippingPlanesMatrix,
      model._clippingPlanesMatrix
    );
  }
}

function updateSceneGraph(model, frameState) {
  const sceneGraph = model._sceneGraph;
  if (model._updateModelMatrix || model._minimumPixelSize !== 0.0) {
    const modelMatrix = defined(model._clampedModelMatrix)
      ? model._clampedModelMatrix
      : model.modelMatrix;
    sceneGraph.updateModelMatrix(modelMatrix, frameState);
    model._updateModelMatrix = false;
  }

  if (model._backFaceCullingDirty) {
    sceneGraph.updateBackFaceCulling(model._backFaceCulling);
    model._backFaceCullingDirty = false;
  }

  if (model._shadowsDirty) {
    sceneGraph.updateShadows(model._shadows);
    model._shadowsDirty = false;
  }

  if (model._debugShowBoundingVolumeDirty) {
    sceneGraph.updateShowBoundingVolume(model._debugShowBoundingVolume);
    model._debugShowBoundingVolumeDirty = false;
  }

  let updateForAnimations = false;
  // Animations are disabled for classification models.
  if (!defined(model.classificationType)) {
    updateForAnimations =
      model._userAnimationDirty || model._activeAnimations.update(frameState);
  }
  sceneGraph.update(frameState, updateForAnimations);
  model._userAnimationDirty = false;
}

function updateShowCreditsOnScreen(model) {
  if (!model._showCreditsOnScreenDirty) {
    return;
  }
  model._showCreditsOnScreenDirty = false;
  model._credits.length = 0;

  const showOnScreen = model._showCreditsOnScreen;
  if (defined(model._credit)) {
    const credit = Credit.clone(model._credit);
    credit.showOnScreen = credit.showOnScreen || showOnScreen;
    model._credits.push(credit);
  }

  const resourceCredits = model._resourceCredits;
  const resourceCreditsLength = resourceCredits.length;
  for (let i = 0; i < resourceCreditsLength; i++) {
    const credit = Credit.clone(resourceCredits[i]);
    credit.showOnScreen = credit.showOnScreen || showOnScreen;
    model._credits.push(credit);
  }

  const gltfCredits = model._gltfCredits;
  const gltfCreditsLength = gltfCredits.length;
  for (let i = 0; i < gltfCreditsLength; i++) {
    const credit = Credit.clone(gltfCredits[i]);
    credit.showOnScreen = credit.showOnScreen || showOnScreen;
    model._credits.push(credit);
  }
}

function submitDrawCommands(model, frameState) {
  // Check that show is true after draw commands are built;
  // we want the user to be able to instantly see the model
  // when show is set to true.

  const displayConditionPassed = passesDistanceDisplayCondition(
    model,
    frameState
  );

  const invisible = model.isInvisible();
  const silhouette = model.hasSilhouette(frameState);

  // If the model is invisible but has a silhouette, it still
  // needs to draw in order to write to the stencil buffer and
  // render the silhouette.
  const showModel =
    model._show &&
    model._computedScale !== 0 &&
    displayConditionPassed &&
    (!invisible || silhouette);

  const passes = frameState.passes;
  const submitCommandsForPass =
    passes.render || (passes.pick && model.allowPicking);

  if (showModel && !model._ignoreCommands && submitCommandsForPass) {
    addCreditsToCreditDisplay(model, frameState);
    model._sceneGraph.pushDrawCommands(frameState);
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

function getUpdateHeightCallback(model, ellipsoid, cartoPosition) {
  return function (clampedPosition) {
    if (model.heightReference === HeightReference.RELATIVE_TO_GROUND) {
      const clampedCart = ellipsoid.cartesianToCartographic(
        clampedPosition,
        scratchCartographic
      );
      clampedCart.height += cartoPosition.height;
      ellipsoid.cartographicToCartesian(clampedCart, clampedPosition);
    }

    const clampedModelMatrix = model._clampedModelMatrix;

    // Modify clamped model matrix to use new height
    Matrix4.clone(model.modelMatrix, clampedModelMatrix);
    clampedModelMatrix[12] = clampedPosition.x;
    clampedModelMatrix[13] = clampedPosition.y;
    clampedModelMatrix[14] = clampedPosition.z;

    model._heightDirty = true;
  };
}

const scratchDisplayConditionCartesian = new Cartesian3();

function passesDistanceDisplayCondition(model, frameState) {
  const condition = model.distanceDisplayCondition;
  if (!defined(condition)) {
    return true;
  }

  const nearSquared = condition.near * condition.near;
  const farSquared = condition.far * condition.far;
  let distanceSquared;

  if (frameState.mode === SceneMode.SCENE2D) {
    const frustum2DWidth =
      frameState.camera.frustum.right - frameState.camera.frustum.left;
    const distance = frustum2DWidth * 0.5;
    distanceSquared = distance * distance;
  } else {
    // Distance to center of primitive's reference frame
    const position = Matrix4.getTranslation(
      model.modelMatrix,
      scratchDisplayConditionCartesian
    );

    // This will project the position if the scene is in Columbus View,
    // but leave the position as-is in 3D mode.
    SceneTransforms.computeActualWgs84Position(frameState, position, position);

    distanceSquared = Cartesian3.distanceSquared(
      position,
      frameState.camera.positionWC
    );
  }

  return distanceSquared >= nearSquared && distanceSquared <= farSquared;
}

function addCreditsToCreditDisplay(model, frameState) {
  const creditDisplay = frameState.creditDisplay;
  const credits = model._credits;
  const creditsLength = credits.length;
  for (let c = 0; c < creditsLength; c++) {
    creditDisplay.addCreditToNextFrame(credits[c]);
  }
}

/**
 * Gets whether or not the model is translucent based on its assigned model color.
 * If the model color's alpha is equal to zero, then it is considered invisible,
 * not translucent.
 *
 * @returns {boolean} <code>true</code> if the model is translucent, otherwise <code>false</code>.
 * @private
 */
Model.prototype.isTranslucent = function () {
  const color = this.color;
  return defined(color) && color.alpha > 0.0 && color.alpha < 1.0;
};

/**
 * Gets whether or not the model is invisible, i.e. if the model color's alpha
 * is equal to zero.
 *
 * @returns {boolean} <code>true</code> if the model is invisible, otherwise <code>false</code>.
 * @private
 */
Model.prototype.isInvisible = function () {
  const color = this.color;
  return defined(color) && color.alpha === 0.0;
};

function supportsSilhouettes(frameState) {
  return frameState.context.stencilBuffer;
}

/**
 * Gets whether or not the model has a silhouette. This accounts for whether
 * silhouettes are supported (i.e. the context supports stencil buffers).
 * <p>
 * If the model classifies another model, its silhouette will be disabled.
 * </p>
 *
 * @param {FrameState} The frame state.
 * @returns {boolean} <code>true</code> if the model has silhouettes, otherwise <code>false</code>.
 * @private
 */
Model.prototype.hasSilhouette = function (frameState) {
  return (
    supportsSilhouettes(frameState) &&
    this._silhouetteSize > 0.0 &&
    this._silhouetteColor.alpha > 0.0 &&
    !defined(this._classificationType)
  );
};

/**
 * Gets whether or not the model is part of a tileset that uses the
 * skipLevelOfDetail optimization. This accounts for whether skipLevelOfDetail
 * is supported (i.e. the context supports stencil buffers).
 *
 * @param {FrameState} frameState The frame state.
 * @returns {boolean} <code>true</code> if the model is part of a tileset that uses the skipLevelOfDetail optimization, <code>false</code> otherwise.
 * @private
 */
Model.prototype.hasSkipLevelOfDetail = function (frameState) {
  if (!ModelType.is3DTiles(this.type)) {
    return false;
  }

  const supportsSkipLevelOfDetail = frameState.context.stencilBuffer;
  const tileset = this._content.tileset;
  return supportsSkipLevelOfDetail && tileset.isSkippingLevelOfDetail;
};

/**
 * Gets whether or not clipping planes are enabled for this model.
 *
 * @returns {boolean} <code>true</code> if clipping planes are enabled for this model, <code>false</code>.
 * @private
 */
Model.prototype.isClippingEnabled = function () {
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
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see Model#destroy
 */
Model.prototype.isDestroyed = function () {
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
 * @see Model#isDestroyed
 */
Model.prototype.destroy = function () {
  const loader = this._loader;
  if (defined(loader)) {
    loader.destroy();
  }

  const featureTables = this._featureTables;
  if (defined(featureTables)) {
    const length = featureTables.length;
    for (let i = 0; i < length; i++) {
      featureTables[i].destroy();
    }
  }

  this.destroyPipelineResources();
  this.destroyModelResources();

  // Remove callbacks for height reference behavior.
  if (defined(this._removeUpdateHeightCallback)) {
    this._removeUpdateHeightCallback();
    this._removeUpdateHeightCallback = undefined;
  }

  if (defined(this._terrainProviderChangedCallback)) {
    this._terrainProviderChangedCallback();
    this._terrainProviderChangedCallback = undefined;
  }

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
 * Destroys resources generated in the pipeline stages
 * that must be destroyed when draw commands are rebuilt.
 * @private
 */
Model.prototype.destroyPipelineResources = function () {
  const resources = this._pipelineResources;
  for (let i = 0; i < resources.length; i++) {
    resources[i].destroy();
  }
  this._pipelineResources.length = 0;
  this._pickIds.length = 0;
};

/**
 * Destroys resources generated in the pipeline stages
 * that exist for the lifetime of the model.
 * @private
 */
Model.prototype.destroyModelResources = function () {
  const resources = this._modelResources;
  for (let i = 0; i < resources.length; i++) {
    resources[i].destroy();
  }
  this._modelResources.length = 0;
};

/**
 * <p>
 * Asynchronously creates a model from a glTF asset. This function returns a promise that resolves when the model is ready to render, i.e., when the external binary, image,
 * and shader files are downloaded and the WebGL resources are created.
 * </p>
 * <p>
 * The model can be a traditional glTF asset with a .gltf extension or a Binary glTF using the .glb extension.
 *
 * @param {object} options Object with the following properties:
 * @param {string|Resource} options.url The url to the .gltf or .glb file.
 * @param {string|Resource} [options.basePath=''] The base path that paths in the glTF JSON are relative to.
 * @param {boolean} [options.show=true] Whether or not to render the model.
 * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms the model from model to world coordinates.
 * @param {number} [options.scale=1.0] A uniform scale applied to this model.
 * @param {number} [options.minimumPixelSize=0.0] The approximate minimum pixel size of the model regardless of zoom.
 * @param {number} [options.maximumScale] The maximum scale size of a model. An upper limit for minimumPixelSize.
 * @param {object} [options.id] A user-defined object to return when the model is picked with {@link Scene#pick}.
 * @param {boolean} [options.allowPicking=true] When <code>true</code>, each primitive is pickable with {@link Scene#pick}.
 * @param {boolean} [options.incrementallyLoadTextures=true] Determine if textures may continue to stream in after the model is loaded.
 * @param {boolean} [options.asynchronous=true] Determines if model WebGL resource creation will be spread out over several frames or block until completion once all glTF files are loaded.
 * @param {boolean} [options.clampAnimations=true] Determines if the model's animations should hold a pose over frames where no keyframes are specified.
 * @param {ShadowMode} [options.shadows=ShadowMode.ENABLED] Determines whether the model casts or receives shadows from light sources.
 * @param {boolean} [options.releaseGltfJson=false] When true, the glTF JSON is released once the glTF is loaded. This is is especially useful for cases like 3D Tiles, where each .gltf model is unique and caching the glTF JSON is not effective.
 * @param {boolean} [options.debugShowBoundingVolume=false] For debugging only. Draws the bounding sphere for each draw command in the model.
 * @param {boolean} [options.enableDebugWireframe=false] For debugging only. This must be set to true for debugWireframe to work in WebGL1. This cannot be set after the model has loaded.
 * @param {boolean} [options.debugWireframe=false] For debugging only. Draws the model in wireframe. Will only work for WebGL1 if enableDebugWireframe is set to true.
 * @param {boolean} [options.cull=true]  Whether or not to cull the model using frustum/horizon culling. If the model is part of a 3D Tiles tileset, this property will always be false, since the 3D Tiles culling system is used.
 * @param {boolean} [options.opaquePass=Pass.OPAQUE] The pass to use in the {@link DrawCommand} for the opaque portions of the model.
 * @param {Axis} [options.upAxis=Axis.Y] The up-axis of the glTF model.
 * @param {Axis} [options.forwardAxis=Axis.Z] The forward-axis of the glTF model.
 * @param {CustomShader} [options.customShader] A custom shader. This will add user-defined GLSL code to the vertex and fragment shaders. Using custom shaders with a {@link Cesium3DTileStyle} may lead to undefined behavior.
 * @param {Cesium3DTileContent} [options.content] The tile content this model belongs to. This property will be undefined if model is not loaded as part of a tileset.
 * @param {HeightReference} [options.heightReference=HeightReference.NONE] Determines how the model is drawn relative to terrain.
 * @param {Scene} [options.scene] Must be passed in for models that use the height reference property.
 * @param {DistanceDisplayCondition} [options.distanceDisplayCondition] The condition specifying at what distance from the camera that this model will be displayed.
 * @param {Color} [options.color] A color that blends with the model's rendered color.
 * @param {ColorBlendMode} [options.colorBlendMode=ColorBlendMode.HIGHLIGHT] Defines how the color blends with the model.
 * @param {number} [options.colorBlendAmount=0.5] Value used to determine the color strength when the <code>colorBlendMode</code> is <code>MIX</code>. A value of 0.0 results in the model's rendered color while a value of 1.0 results in a solid color, with any value in-between resulting in a mix of the two.
 * @param {Color} [options.silhouetteColor=Color.RED] The silhouette color. If more than 256 models have silhouettes enabled, there is a small chance that overlapping models will have minor artifacts.
 * @param {number} [options.silhouetteSize=0.0] The size of the silhouette in pixels.
 * @param {boolean} [options.enableShowOutline=true] Whether to enable outlines for models using the {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/CESIUM_primitive_outline|CESIUM_primitive_outline} extension. This can be set false to avoid post-processing geometry at load time. When false, the showOutlines and outlineColor options are ignored.
 * @param {boolean} [options.showOutline=true] Whether to display the outline for models using the {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/CESIUM_primitive_outline|CESIUM_primitive_outline} extension. When true, outlines are displayed. When false, outlines are not displayed.
 * @param {Color} [options.outlineColor=Color.BLACK] The color to use when rendering outlines.
 * @param {ClippingPlaneCollection} [options.clippingPlanes] The {@link ClippingPlaneCollection} used to selectively disable rendering the model.
 * @param {Cartesian3} [options.lightColor] The light color when shading the model. When <code>undefined</code> the scene's light color is used instead.
 * @param {ImageBasedLighting} [options.imageBasedLighting] The properties for managing image-based lighting on this model.
 * @param {boolean} [options.backFaceCulling=true] Whether to cull back-facing geometry. When true, back face culling is determined by the material's doubleSided property; when false, back face culling is disabled. Back faces are not culled if the model's color is translucent.
 * @param {Credit|string} [options.credit] A credit for the data source, which is displayed on the canvas.
 * @param {boolean} [options.showCreditsOnScreen=false] Whether to display the credits of this model on screen.
 * @param {SplitDirection} [options.splitDirection=SplitDirection.NONE] The {@link SplitDirection} split to apply to this model.
 * @param {boolean} [options.projectTo2D=false] Whether to accurately project the model's positions in 2D. If this is true, the model will be projected accurately to 2D, but it will use more memory to do so. If this is false, the model will use less memory and will still render in 2D / CV mode, but its positions may be inaccurate. This disables minimumPixelSize and prevents future modification to the model matrix. This also cannot be set after the model has loaded.
 * @param {string|number} [options.featureIdLabel="featureId_0"] Label of the feature ID set to use for picking and styling. For EXT_mesh_features, this is the feature ID's label property, or "featureId_N" (where N is the index in the featureIds array) when not specified. EXT_feature_metadata did not have a label field, so such feature ID sets are always labeled "featureId_N" where N is the index in the list of all feature Ids, where feature ID attributes are listed before feature ID textures. If featureIdLabel is an integer N, it is converted to the string "featureId_N" automatically. If both per-primitive and per-instance feature IDs are present, the instance feature IDs take priority.
 * @param {string|number} [options.instanceFeatureIdLabel="instanceFeatureId_0"] Label of the instance feature ID set used for picking and styling. If instanceFeatureIdLabel is set to an integer N, it is converted to the string "instanceFeatureId_N" automatically. If both per-primitive and per-instance feature IDs are present, the instance feature IDs take priority.
 * @param {object} [options.pointCloudShading] Options for constructing a {@link PointCloudShading} object to control point attenuation and lighting.
 * @param {ClassificationType} [options.classificationType] Determines whether terrain, 3D Tiles or both will be classified by this model. This cannot be set after the model has loaded.
 * @param {Model.GltfCallback} [options.gltfCallback] A function that is called with the loaded gltf object once loaded.
 *
 * @returns {Promise<Model>} A promise that resolves to the created model when it is ready to render.
 *
 * @exception {RuntimeError} The model failed to load.
 * @exception {RuntimeError} Unsupported glTF version.
 * @exception {RuntimeError} Unsupported glTF Extension
 *
 * @example
 * // Load a model and add it to the scene
 * try {
 *  const model = await Cesium.Model.fromGltfAsync({
 *    url: "../../SampleData/models/CesiumMan/Cesium_Man.glb"
 *  });
 *  viewer.scene.primitives.add(model);
 * } catch (error) {
 *  console.log(`Failed to load model. ${error}`);
 * }
 *
 * @example
 * // Position a model with modelMatrix and display it with a minimum size of 128 pixels
 * const position = Cesium.Cartesian3.fromDegrees(
 *   -123.0744619,
 *   44.0503706,
 *   5000.0
 * );
 * const headingPositionRoll = new Cesium.HeadingPitchRoll();
 * const fixedFrameTransform = Cesium.Transforms.localFrameToFixedFrameGenerator(
 *   "north",
 *   "west"
 * );
 * try {
 *  const model = await Cesium.Model.fromGltfAsync({
 *    url: "../../SampleData/models/CesiumAir/Cesium_Air.glb",
 *    modelMatrix: Cesium.Transforms.headingPitchRollToFixedFrame(
 *      position,
 *      headingPositionRoll,
 *      Cesium.Ellipsoid.WGS84,
 *      fixedFrameTransform
 *    ),
 *    minimumPixelSize: 128,
 *  });
 *  viewer.scene.primitives.add(model);
 * } catch (error) {
 *  console.log(`Failed to load model. ${error}`);
 * }
 *
 * @example
 * // Load a model and play the last animation at half speed
 * let animations;
 * try {
 *  const model = await Cesium.Model.fromGltfAsync({
 *    url: "../../SampleData/models/CesiumMan/Cesium_Man.glb",
 *    gltfCallback: gltf => {
 *      animations = gltf.animations
 *    }
 *  });
 *  viewer.scene.primitives.add(model);
 *  model.readyEvent.addEventListener(() => {
 *    model.activeAnimations.add({
 *      index: animations.length - 1,
 *      loop: Cesium.ModelAnimationLoop.REPEAT,
 *      multiplier: 0.5,
 *    });
 *  });
 * } catch (error) {
 *  console.log(`Failed to load model. ${error}`);
 * }
 */
Model.fromGltfAsync = async function (options) {
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
    asynchronous: options.asynchronous,
    incrementallyLoadTextures: options.incrementallyLoadTextures,
    upAxis: options.upAxis,
    forwardAxis: options.forwardAxis,
    loadAttributesFor2D: options.projectTo2D,
    loadIndicesForWireframe: options.enableDebugWireframe,
    loadPrimitiveOutline: options.enableShowOutline,
    loadForClassification: defined(options.classificationType),
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
  const type = is3DTiles ? ModelType.TILE_GLTF : ModelType.GLTF;

  const resource = loaderOptions.gltfResource;

  const modelOptions = makeModelOptions(loader, type, options);
  modelOptions.resource = resource;

  try {
    // This load the gltf JSON and ensures the gltf is valid
    // Further resource loading is handled synchronously in loader.process(), and requires
    // hooking into model's update() as the frameState is needed
    await loader.load();
  } catch (error) {
    loader.destroy();
    throw ModelUtility.getError("model", resource, error);
  }

  const gltfCallback = options.gltfCallback;
  if (defined(gltfCallback)) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.func("options.gltfCallback", gltfCallback);
    //>>includeEnd('debug');

    gltfCallback(loader.gltfJson);
  }

  const model = new Model(modelOptions);

  const resourceCredits = model._resource.credits;
  if (defined(resourceCredits)) {
    const length = resourceCredits.length;
    for (let i = 0; i < length; i++) {
      model._resourceCredits.push(Credit.clone(resourceCredits[i]));
    }
  }

  return model;
};

/*
 * @private
 */
Model.fromB3dm = async function (options) {
  const loaderOptions = {
    b3dmResource: options.resource,
    arrayBuffer: options.arrayBuffer,
    byteOffset: options.byteOffset,
    releaseGltfJson: options.releaseGltfJson,
    asynchronous: options.asynchronous,
    incrementallyLoadTextures: options.incrementallyLoadTextures,
    upAxis: options.upAxis,
    forwardAxis: options.forwardAxis,
    loadAttributesFor2D: options.projectTo2D,
    loadIndicesForWireframe: options.enableDebugWireframe,
    loadPrimitiveOutline: options.enableShowOutline,
    loadForClassification: defined(options.classificationType),
  };

  const loader = new B3dmLoader(loaderOptions);

  try {
    await loader.load();

    const modelOptions = makeModelOptions(loader, ModelType.TILE_B3DM, options);
    const model = new Model(modelOptions);
    return model;
  } catch (error) {
    loader.destroy();
    throw error;
  }
};

/**
 * @private
 */
Model.fromPnts = async function (options) {
  const loaderOptions = {
    arrayBuffer: options.arrayBuffer,
    byteOffset: options.byteOffset,
    loadAttributesFor2D: options.projectTo2D,
  };
  const loader = new PntsLoader(loaderOptions);

  try {
    await loader.load();
    const modelOptions = makeModelOptions(loader, ModelType.TILE_PNTS, options);
    const model = new Model(modelOptions);
    return model;
  } catch (error) {
    loader.destroy();
    throw error;
  }
};

/*
 * @private
 */
Model.fromI3dm = async function (options) {
  const loaderOptions = {
    i3dmResource: options.resource,
    arrayBuffer: options.arrayBuffer,
    byteOffset: options.byteOffset,
    releaseGltfJson: options.releaseGltfJson,
    asynchronous: options.asynchronous,
    incrementallyLoadTextures: options.incrementallyLoadTextures,
    upAxis: options.upAxis,
    forwardAxis: options.forwardAxis,
    loadAttributesFor2D: options.projectTo2D,
    loadIndicesForWireframe: options.enableDebugWireframe,
    loadPrimitiveOutline: options.enableShowOutline,
  };
  const loader = new I3dmLoader(loaderOptions);

  try {
    await loader.load();

    const modelOptions = makeModelOptions(loader, ModelType.TILE_I3DM, options);
    const model = new Model(modelOptions);
    return model;
  } catch (error) {
    loader.destroy();
    throw error;
  }
};

/*
 * @private
 */
Model.fromGeoJson = async function (options) {
  const loaderOptions = {
    geoJson: options.geoJson,
  };
  const loader = new GeoJsonLoader(loaderOptions);
  const modelOptions = makeModelOptions(
    loader,
    ModelType.TILE_GEOJSON,
    options
  );
  const model = new Model(modelOptions);
  return model;
};

const scratchColor = new Color();

/**
 * @private
 */
Model.prototype.applyColorAndShow = function (style) {
  const previousColor = Color.clone(this._color, scratchColor);
  const hasColorStyle = defined(style) && defined(style.color);
  const hasShowStyle = defined(style) && defined(style.show);

  this._color = hasColorStyle
    ? style.color.evaluateColor(undefined, this._color)
    : Color.clone(Color.WHITE, this._color);
  this._show = hasShowStyle ? style.show.evaluate(undefined) : true;

  if (isColorAlphaDirty(previousColor, this._color)) {
    this.resetDrawCommands();
  }
};

/**
 * @private
 */
Model.prototype.applyStyle = function (style) {
  const isPnts = this.type === ModelType.TILE_PNTS;

  const hasFeatureTable =
    defined(this.featureTableId) &&
    this.featureTables[this.featureTableId].featuresLength > 0;

  const propertyAttributes = defined(this.structuralMetadata)
    ? this.structuralMetadata.propertyAttributes
    : undefined;
  const hasPropertyAttributes =
    defined(propertyAttributes) && defined(propertyAttributes[0]);

  // Point clouds will be styled on the GPU unless they contain a batch table.
  // That is, CPU styling will not be applied if:
  // - points have no metadata at all, or
  // - points have metadata stored as a property attribute
  if (isPnts && (!hasFeatureTable || hasPropertyAttributes)) {
    // Commands are rebuilt for point cloud styling since the new style may
    // contain different shader functions.
    this.resetDrawCommands();
    return;
  }

  // The style is only set by the ModelFeatureTable. If there are no features,
  // the color and show from the style are directly applied.
  if (hasFeatureTable) {
    const featureTable = this.featureTables[this.featureTableId];
    featureTable.applyStyle(style);
    updateStyleCommandsNeeded(this, style);
  } else {
    this.applyColorAndShow(style);
    this._styleCommandsNeeded = undefined;
  }
};

function makeModelOptions(loader, modelType, options) {
  return {
    loader: loader,
    type: modelType,
    resource: options.resource,
    show: options.show,
    modelMatrix: options.modelMatrix,
    scale: options.scale,
    minimumPixelSize: options.minimumPixelSize,
    maximumScale: options.maximumScale,
    id: options.id,
    allowPicking: options.allowPicking,
    clampAnimations: options.clampAnimations,
    shadows: options.shadows,
    debugShowBoundingVolume: options.debugShowBoundingVolume,
    enableDebugWireframe: options.enableDebugWireframe,
    debugWireframe: options.debugWireframe,
    cull: options.cull,
    opaquePass: options.opaquePass,
    customShader: options.customShader,
    content: options.content,
    heightReference: options.heightReference,
    scene: options.scene,
    distanceDisplayCondition: options.distanceDisplayCondition,
    color: options.color,
    colorBlendAmount: options.colorBlendAmount,
    colorBlendMode: options.colorBlendMode,
    silhouetteColor: options.silhouetteColor,
    silhouetteSize: options.silhouetteSize,
    enableShowOutline: options.enableShowOutline,
    showOutline: options.showOutline,
    outlineColor: options.outlineColor,
    clippingPlanes: options.clippingPlanes,
    lightColor: options.lightColor,
    imageBasedLighting: options.imageBasedLighting,
    backFaceCulling: options.backFaceCulling,
    credit: options.credit,
    showCreditsOnScreen: options.showCreditsOnScreen,
    splitDirection: options.splitDirection,
    projectTo2D: options.projectTo2D,
    featureIdLabel: options.featureIdLabel,
    instanceFeatureIdLabel: options.instanceFeatureIdLabel,
    pointCloudShading: options.pointCloudShading,
    classificationType: options.classificationType,
    pickObject: options.pickObject,
  };
}

/**
 * Interface for the function that is called with the loaded gltf object once loaded.
 * @callback Model.GltfCallback
 *
 * @param {object} gltf The gltf object
 */

export default Model;
