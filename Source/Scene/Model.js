import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Cartographic from "../Core/Cartographic.js";
import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import Color from "../Core/Color.js";
import combine from "../Core/combine.js";
import createGuid from "../Core/createGuid.js";
import Credit from "../Core/Credit.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import DistanceDisplayCondition from "../Core/DistanceDisplayCondition.js";
import FeatureDetection from "../Core/FeatureDetection.js";
import getAbsoluteUri from "../Core/getAbsoluteUri.js";
import getJsonFromTypedArray from "../Core/getJsonFromTypedArray.js";
import getMagic from "../Core/getMagic.js";
import getStringFromTypedArray from "../Core/getStringFromTypedArray.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import loadCRN from "../Core/loadCRN.js";
import loadImageFromTypedArray from "../Core/loadImageFromTypedArray.js";
import loadKTX from "../Core/loadKTX.js";
import CesiumMath from "../Core/Math.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import PixelFormat from "../Core/PixelFormat.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import Quaternion from "../Core/Quaternion.js";
import Resource from "../Core/Resource.js";
import Transforms from "../Core/Transforms.js";
import WebGLConstants from "../Core/WebGLConstants.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import RenderState from "../Renderer/RenderState.js";
import Sampler from "../Renderer/Sampler.js";
import ShaderProgram from "../Renderer/ShaderProgram.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import Texture from "../Renderer/Texture.js";
import TextureMinificationFilter from "../Renderer/TextureMinificationFilter.js";
import TextureWrap from "../Renderer/TextureWrap.js";
import VertexArray from "../Renderer/VertexArray.js";
import addDefaults from "../ThirdParty/GltfPipeline/addDefaults.js";
import addPipelineExtras from "../ThirdParty/GltfPipeline/addPipelineExtras.js";
import ForEach from "../ThirdParty/GltfPipeline/ForEach.js";
import getAccessorByteStride from "../ThirdParty/GltfPipeline/getAccessorByteStride.js";
import usesExtension from "../ThirdParty/GltfPipeline/usesExtension.js";
import numberOfComponentsForType from "../ThirdParty/GltfPipeline/numberOfComponentsForType.js";
import parseGlb from "../ThirdParty/GltfPipeline/parseGlb.js";
import updateVersion from "../ThirdParty/GltfPipeline/updateVersion.js";
import when from "../ThirdParty/when.js";
import Axis from "./Axis.js";
import BlendingState from "./BlendingState.js";
import ClippingPlaneCollection from "./ClippingPlaneCollection.js";
import ColorBlendMode from "./ColorBlendMode.js";
import DepthFunction from "./DepthFunction.js";
import DracoLoader from "./DracoLoader.js";
import getClipAndStyleCode from "./getClipAndStyleCode.js";
import getClippingFunction from "./getClippingFunction.js";
import HeightReference from "./HeightReference.js";
import JobType from "./JobType.js";
import ModelAnimationCache from "./ModelAnimationCache.js";
import ModelAnimationCollection from "./ModelAnimationCollection.js";
import ModelLoadResources from "./ModelLoadResources.js";
import ModelMaterial from "./ModelMaterial.js";
import ModelMesh from "./ModelMesh.js";
import ModelNode from "./ModelNode.js";
import ModelOutlineLoader from "./ModelOutlineLoader.js";
import ModelUtility from "./ModelUtility.js";
import OctahedralProjectedCubeMap from "./OctahedralProjectedCubeMap.js";
import processModelMaterialsCommon from "./processModelMaterialsCommon.js";
import processPbrMaterials from "./processPbrMaterials.js";
import SceneMode from "./SceneMode.js";
import ShadowMode from "./ShadowMode.js";
import StencilConstants from "./StencilConstants.js";

var boundingSphereCartesian3Scratch = new Cartesian3();

var ModelState = ModelUtility.ModelState;

// glTF MIME types discussed in https://github.com/KhronosGroup/glTF/issues/412 and https://github.com/KhronosGroup/glTF/issues/943
var defaultModelAccept =
  "model/gltf-binary,model/gltf+json;q=0.8,application/json;q=0.2,*/*;q=0.01";

var articulationEpsilon = CesiumMath.EPSILON16;

///////////////////////////////////////////////////////////////////////////

function setCachedGltf(model, cachedGltf) {
  model._cachedGltf = cachedGltf;
}

// glTF JSON can be big given embedded geometry, textures, and animations, so we
// cache it across all models using the same url/cache-key.  This also reduces the
// slight overhead in assigning defaults to missing values.
//
// Note that this is a global cache, compared to renderer resources, which
// are cached per context.
function CachedGltf(options) {
  this._gltf = options.gltf;
  this.ready = options.ready;
  this.modelsToLoad = [];
  this.count = 0;
}

Object.defineProperties(CachedGltf.prototype, {
  gltf: {
    set: function (value) {
      this._gltf = value;
    },

    get: function () {
      return this._gltf;
    },
  },
});

CachedGltf.prototype.makeReady = function (gltfJson) {
  this.gltf = gltfJson;

  var models = this.modelsToLoad;
  var length = models.length;
  for (var i = 0; i < length; ++i) {
    var m = models[i];
    if (!m.isDestroyed()) {
      setCachedGltf(m, this);
    }
  }
  this.modelsToLoad = undefined;
  this.ready = true;
};

var gltfCache = {};
var uriToGuid = {};
///////////////////////////////////////////////////////////////////////////

/**
 * A 3D model based on glTF, the runtime asset format for WebGL, OpenGL ES, and OpenGL.
 * <p>
 * Cesium includes support for geometry and materials, glTF animations, and glTF skinning.
 * In addition, individual glTF nodes are pickable with {@link Scene#pick} and animatable
 * with {@link Model#getNode}.  glTF cameras and lights are not currently supported.
 * </p>
 * <p>
 * An external glTF asset is created with {@link Model.fromGltf}.  glTF JSON can also be
 * created at runtime and passed to this constructor function.  In either case, the
 * {@link Model#readyPromise} is resolved when the model is ready to render, i.e.,
 * when the external binary, image, and shader files are downloaded and the WebGL
 * resources are created.
 * </p>
 * <p>
 * Cesium supports glTF assets with the following extensions:
 * <ul>
 * <li>
 * {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/1.0/Khronos/KHR_binary_glTF/README.md|KHR_binary_glTF (glTF 1.0)}
 * </li><li>
 * {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/1.0/Khronos/KHR_materials_common/README.md|KHR_materials_common (glTF 1.0)}
 * </li><li>
 * {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/1.0/Vendor/WEB3D_quantized_attributes/README.md|WEB3D_quantized_attributes (glTF 1.0)}
 * </li><li>
 * {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/AGI_articulations/README.md|AGI_articulations}
 * </li><li>
 * {@link https://github.com/KhronosGroup/glTF/pull/1302|KHR_blend (draft)}
 * </li><li>
 * {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_draco_mesh_compression/README.md|KHR_draco_mesh_compression}
 * </li><li>
 * {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_pbrSpecularGlossiness/README.md|KHR_materials_pbrSpecularGlossiness}
 * </li><li>
 * {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_unlit/README.md|KHR_materials_unlit}
 * </li><li>
 * {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_techniques_webgl/README.md|KHR_techniques_webgl}
 * </li><li>
 * {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_texture_transform/README.md|KHR_texture_transform}
 * </li>
 * </ul>
 * </p>
 * <p>
 * For high-precision rendering, Cesium supports the {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/1.0/Vendor/CESIUM_RTC/README.md|CESIUM_RTC} extension, which introduces the
 * CESIUM_RTC_MODELVIEW parameter semantic that says the node is in WGS84 coordinates translated
 * relative to a local origin.
 * </p>
 *
 * @alias Model
 * @constructor
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Object|ArrayBuffer|Uint8Array} [options.gltf] A glTF JSON object, or a binary glTF buffer.
 * @param {Resource|String} [options.basePath=''] The base path that paths in the glTF JSON are relative to.
 * @param {Boolean} [options.show=true] Determines if the model primitive will be shown.
 * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms the model from model to world coordinates.
 * @param {Number} [options.scale=1.0] A uniform scale applied to this model.
 * @param {Number} [options.minimumPixelSize=0.0] The approximate minimum pixel size of the model regardless of zoom.
 * @param {Number} [options.maximumScale] The maximum scale size of a model. An upper limit for minimumPixelSize.
 * @param {Object} [options.id] A user-defined object to return when the model is picked with {@link Scene#pick}.
 * @param {Boolean} [options.allowPicking=true] When <code>true</code>, each glTF mesh and primitive is pickable with {@link Scene#pick}.
 * @param {Boolean} [options.incrementallyLoadTextures=true] Determine if textures may continue to stream in after the model is loaded.
 * @param {Boolean} [options.asynchronous=true] Determines if model WebGL resource creation will be spread out over several frames or block until completion once all glTF files are loaded.
 * @param {Boolean} [options.clampAnimations=true] Determines if the model's animations should hold a pose over frames where no keyframes are specified.
 * @param {ShadowMode} [options.shadows=ShadowMode.ENABLED] Determines whether the model casts or receives shadows from light sources.
 * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Draws the bounding sphere for each draw command in the model.
 * @param {Boolean} [options.debugWireframe=false] For debugging only. Draws the model in wireframe.
 * @param {HeightReference} [options.heightReference=HeightReference.NONE] Determines how the model is drawn relative to terrain.
 * @param {Scene} [options.scene] Must be passed in for models that use the height reference property.
 * @param {DistanceDisplayCondition} [options.distanceDisplayCondition] The condition specifying at what distance from the camera that this model will be displayed.
 * @param {Color} [options.color=Color.WHITE] A color that blends with the model's rendered color.
 * @param {ColorBlendMode} [options.colorBlendMode=ColorBlendMode.HIGHLIGHT] Defines how the color blends with the model.
 * @param {Number} [options.colorBlendAmount=0.5] Value used to determine the color strength when the <code>colorBlendMode</code> is <code>MIX</code>. A value of 0.0 results in the model's rendered color while a value of 1.0 results in a solid color, with any value in-between resulting in a mix of the two.
 * @param {Color} [options.silhouetteColor=Color.RED] The silhouette color. If more than 256 models have silhouettes enabled, there is a small chance that overlapping models will have minor artifacts.
 * @param {Number} [options.silhouetteSize=0.0] The size of the silhouette in pixels.
 * @param {ClippingPlaneCollection} [options.clippingPlanes] The {@link ClippingPlaneCollection} used to selectively disable rendering the model.
 * @param {Boolean} [options.dequantizeInShader=true] Determines if a {@link https://github.com/google/draco|Draco} encoded model is dequantized on the GPU. This decreases total memory usage for encoded models.
 * @param {Cartesian2} [options.imageBasedLightingFactor=Cartesian2(1.0, 1.0)] Scales diffuse and specular image-based lighting from the earth, sky, atmosphere and star skybox.
 * @param {Cartesian3} [options.lightColor] The light color when shading the model. When <code>undefined</code> the scene's light color is used instead.
 * @param {Number} [options.luminanceAtZenith=0.2] The sun's luminance at the zenith in kilo candela per meter squared to use for this model's procedural environment map.
 * @param {Cartesian3[]} [options.sphericalHarmonicCoefficients] The third order spherical harmonic coefficients used for the diffuse color of image-based lighting.
 * @param {String} [options.specularEnvironmentMaps] A URL to a KTX file that contains a cube map of the specular lighting and the convoluted specular mipmaps.
 * @param {Credit|String} [options.credit] A credit for the data source, which is displayed on the canvas.
 * @param {Boolean} [options.backFaceCulling=true] Whether to cull back-facing geometry. When true, back face culling is determined by the material's doubleSided property; when false, back face culling is disabled. Back faces are not culled if {@link Model#color} is translucent or {@link Model#silhouetteSize} is greater than 0.0.
 * @param {Boolean} [options.ignoreOutline=false] Whether to ignore the 3D model outline. When false, outlines are displayed. When true, all outlines are not displayed.
 *
 * @see Model.fromGltf
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=3D%20Models.html|Cesium Sandcastle Models Demo}
 */
function Model(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  var cacheKey = options.cacheKey;
  this._cacheKey = cacheKey;
  this._cachedGltf = undefined;
  this._releaseGltfJson = defaultValue(options.releaseGltfJson, false);

  var cachedGltf;
  if (
    defined(cacheKey) &&
    defined(gltfCache[cacheKey]) &&
    gltfCache[cacheKey].ready
  ) {
    // glTF JSON is in cache and ready
    cachedGltf = gltfCache[cacheKey];
    ++cachedGltf.count;
  } else {
    // glTF was explicitly provided, e.g., when a user uses the Model constructor directly
    var gltf = options.gltf;

    if (defined(gltf)) {
      if (gltf instanceof ArrayBuffer) {
        gltf = new Uint8Array(gltf);
      }

      if (gltf instanceof Uint8Array) {
        // Binary glTF
        var parsedGltf = parseGlb(gltf);

        cachedGltf = new CachedGltf({
          gltf: parsedGltf,
          ready: true,
        });
      } else {
        // Normal glTF (JSON)
        cachedGltf = new CachedGltf({
          gltf: options.gltf,
          ready: true,
        });
      }

      cachedGltf.count = 1;

      if (defined(cacheKey)) {
        gltfCache[cacheKey] = cachedGltf;
      }
    }
  }
  setCachedGltf(this, cachedGltf);

  var basePath = defaultValue(options.basePath, "");
  this._resource = Resource.createIfNeeded(basePath);

  // User specified credit
  var credit = options.credit;
  if (typeof credit === "string") {
    credit = new Credit(credit);
  }
  this._credit = credit;

  // Create a list of Credit's so they can be added from the Resource later
  this._resourceCredits = [];

  /**
   * Determines if the model primitive will be shown.
   *
   * @type {Boolean}
   *
   * @default true
   */
  this.show = defaultValue(options.show, true);

  /**
   * The silhouette color.
   *
   * @type {Color}
   *
   * @default Color.RED
   */
  this.silhouetteColor = defaultValue(options.silhouetteColor, Color.RED);
  this._silhouetteColor = new Color();
  this._silhouetteColorPreviousAlpha = 1.0;
  this._normalAttributeName = undefined;

  /**
   * The size of the silhouette in pixels.
   *
   * @type {Number}
   *
   * @default 0.0
   */
  this.silhouetteSize = defaultValue(options.silhouetteSize, 0.0);

  /**
   * The 4x4 transformation matrix that transforms the model from model to world coordinates.
   * When this is the identity matrix, the model is drawn in world coordinates, i.e., Earth's WGS84 coordinates.
   * Local reference frames can be used by providing a different transformation matrix, like that returned
   * by {@link Transforms.eastNorthUpToFixedFrame}.
   *
   * @type {Matrix4}
   *
   * @default {@link Matrix4.IDENTITY}
   *
   * @example
   * var origin = Cesium.Cartesian3.fromDegrees(-95.0, 40.0, 200000.0);
   * m.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(origin);
   */
  this.modelMatrix = Matrix4.clone(
    defaultValue(options.modelMatrix, Matrix4.IDENTITY)
  );
  this._modelMatrix = Matrix4.clone(this.modelMatrix);
  this._clampedModelMatrix = undefined;

  /**
   * A uniform scale applied to this model before the {@link Model#modelMatrix}.
   * Values greater than <code>1.0</code> increase the size of the model; values
   * less than <code>1.0</code> decrease.
   *
   * @type {Number}
   *
   * @default 1.0
   */
  this.scale = defaultValue(options.scale, 1.0);
  this._scale = this.scale;

  /**
   * The approximate minimum pixel size of the model regardless of zoom.
   * This can be used to ensure that a model is visible even when the viewer
   * zooms out.  When <code>0.0</code>, no minimum size is enforced.
   *
   * @type {Number}
   *
   * @default 0.0
   */
  this.minimumPixelSize = defaultValue(options.minimumPixelSize, 0.0);
  this._minimumPixelSize = this.minimumPixelSize;

  /**
   * The maximum scale size for a model. This can be used to give
   * an upper limit to the {@link Model#minimumPixelSize}, ensuring that the model
   * is never an unreasonable scale.
   *
   * @type {Number}
   */
  this.maximumScale = options.maximumScale;
  this._maximumScale = this.maximumScale;

  /**
   * User-defined object returned when the model is picked.
   *
   * @type Object
   *
   * @default undefined
   *
   * @see Scene#pick
   */
  this.id = options.id;
  this._id = options.id;

  /**
   * Returns the height reference of the model
   *
   * @type {HeightReference}
   *
   * @default HeightReference.NONE
   */
  this.heightReference = defaultValue(
    options.heightReference,
    HeightReference.NONE
  );
  this._heightReference = this.heightReference;
  this._heightChanged = false;
  this._removeUpdateHeightCallback = undefined;
  var scene = options.scene;
  this._scene = scene;
  if (defined(scene) && defined(scene.terrainProviderChanged)) {
    this._terrainProviderChangedCallback = scene.terrainProviderChanged.addEventListener(
      function () {
        this._heightChanged = true;
      },
      this
    );
  }

  /**
   * Used for picking primitives that wrap a model.
   *
   * @private
   */
  this._pickObject = options.pickObject;
  this._allowPicking = defaultValue(options.allowPicking, true);

  this._ready = false;
  this._readyPromise = when.defer();

  /**
   * The currently playing glTF animations.
   *
   * @type {ModelAnimationCollection}
   */
  this.activeAnimations = new ModelAnimationCollection(this);

  /**
   * Determines if the model's animations should hold a pose over frames where no keyframes are specified.
   *
   * @type {Boolean}
   */
  this.clampAnimations = defaultValue(options.clampAnimations, true);

  this._defaultTexture = undefined;
  this._incrementallyLoadTextures = defaultValue(
    options.incrementallyLoadTextures,
    true
  );
  this._asynchronous = defaultValue(options.asynchronous, true);

  /**
   * Determines whether the model casts or receives shadows from light sources.
   *
   * @type {ShadowMode}
   *
   * @default ShadowMode.ENABLED
   */
  this.shadows = defaultValue(options.shadows, ShadowMode.ENABLED);
  this._shadows = this.shadows;

  /**
   * A color that blends with the model's rendered color.
   *
   * @type {Color}
   *
   * @default Color.WHITE
   */
  this.color = Color.clone(defaultValue(options.color, Color.WHITE));
  this._colorPreviousAlpha = 1.0;

  /**
   * Defines how the color blends with the model.
   *
   * @type {ColorBlendMode}
   *
   * @default ColorBlendMode.HIGHLIGHT
   */
  this.colorBlendMode = defaultValue(
    options.colorBlendMode,
    ColorBlendMode.HIGHLIGHT
  );

  /**
   * Value used to determine the color strength when the <code>colorBlendMode</code> is <code>MIX</code>.
   * A value of 0.0 results in the model's rendered color while a value of 1.0 results in a solid color, with
   * any value in-between resulting in a mix of the two.
   *
   * @type {Number}
   *
   * @default 0.5
   */
  this.colorBlendAmount = defaultValue(options.colorBlendAmount, 0.5);

  this._colorShadingEnabled = false;

  this._clippingPlanes = undefined;
  this.clippingPlanes = options.clippingPlanes;
  // Used for checking if shaders need to be regenerated due to clipping plane changes.
  this._clippingPlanesState = 0;

  // If defined, use this matrix to transform miscellaneous properties like
  // clipping planes and IBL instead of the modelMatrix. This is so that when
  // models are part of a tileset these properties get transformed relative to
  // a common reference (such as the root).
  this.referenceMatrix = undefined;

  /**
   * Whether to cull back-facing geometry. When true, back face culling is
   * determined by the material's doubleSided property; when false, back face
   * culling is disabled. Back faces are not culled if {@link Model#color} is
   * translucent or {@link Model#silhouetteSize} is greater than 0.0.
   *
   * @type {Boolean}
   *
   * @default true
   */
  this.backFaceCulling = defaultValue(options.backFaceCulling, true);

  /**
   * Whether to ignore the 3D model outline. When true, all outlines are not
   * displayed. When false, outlines are displayed.
   *
   * @type {Boolean}
   *
   * @default false
   */
  this.ignoreOutline = defaultValue(options.ignoreOutline, false);

  /**
   * This property is for debugging only; it is not for production use nor is it optimized.
   * <p>
   * Draws the bounding sphere for each draw command in the model.  A glTF primitive corresponds
   * to one draw command.  A glTF mesh has an array of primitives, often of length one.
   * </p>
   *
   * @type {Boolean}
   *
   * @default false
   */
  this.debugShowBoundingVolume = defaultValue(
    options.debugShowBoundingVolume,
    false
  );
  this._debugShowBoundingVolume = false;

  /**
   * This property is for debugging only; it is not for production use nor is it optimized.
   * <p>
   * Draws the model in wireframe.
   * </p>
   *
   * @type {Boolean}
   *
   * @default false
   */
  this.debugWireframe = defaultValue(options.debugWireframe, false);
  this._debugWireframe = false;

  this._distanceDisplayCondition = options.distanceDisplayCondition;

  // Undocumented options
  this._addBatchIdToGeneratedShaders = options.addBatchIdToGeneratedShaders;
  this._precreatedAttributes = options.precreatedAttributes;
  this._vertexShaderLoaded = options.vertexShaderLoaded;
  this._fragmentShaderLoaded = options.fragmentShaderLoaded;
  this._uniformMapLoaded = options.uniformMapLoaded;
  this._pickIdLoaded = options.pickIdLoaded;
  this._ignoreCommands = defaultValue(options.ignoreCommands, false);
  this._requestType = options.requestType;
  this._upAxis = defaultValue(options.upAxis, Axis.Y);
  this._gltfForwardAxis = Axis.Z;
  this._forwardAxis = options.forwardAxis;

  /**
   * @private
   * @readonly
   */
  this.cull = defaultValue(options.cull, true);

  /**
   * @private
   * @readonly
   */
  this.opaquePass = defaultValue(options.opaquePass, Pass.OPAQUE);

  this._computedModelMatrix = new Matrix4(); // Derived from modelMatrix and scale
  this._clippingPlanesMatrix = Matrix4.clone(Matrix4.IDENTITY); // Derived from reference matrix and the current view matrix
  this._iblReferenceFrameMatrix = Matrix3.clone(Matrix3.IDENTITY); // Derived from reference matrix and the current view matrix
  this._initialRadius = undefined; // Radius without model's scale property, model-matrix scale, animations, or skins
  this._boundingSphere = undefined;
  this._scaledBoundingSphere = new BoundingSphere();
  this._state = ModelState.NEEDS_LOAD;
  this._loadResources = undefined;

  this._mode = undefined;

  this._perNodeShowDirty = false; // true when the Cesium API was used to change a node's show property
  this._cesiumAnimationsDirty = false; // true when the Cesium API, not a glTF animation, changed a node transform
  this._dirty = false; // true when the model was transformed this frame
  this._maxDirtyNumber = 0; // Used in place of a dirty boolean flag to avoid an extra graph traversal

  this._runtime = {
    animations: undefined,
    articulationsByName: undefined,
    articulationsByStageKey: undefined,
    stagesByKey: undefined,
    rootNodes: undefined,
    nodes: undefined, // Indexed with the node's index
    nodesByName: undefined, // Indexed with name property in the node
    skinnedNodes: undefined,
    meshesByName: undefined, // Indexed with the name property in the mesh
    materialsByName: undefined, // Indexed with the name property in the material
    materialsById: undefined, // Indexed with the material's index
  };

  this._uniformMaps = {}; // Not cached since it can be targeted by glTF animation
  this._extensionsUsed = undefined; // Cached used glTF extensions
  this._extensionsRequired = undefined; // Cached required glTF extensions
  this._quantizedUniforms = {}; // Quantized uniforms for each program for WEB3D_quantized_attributes
  this._programPrimitives = {};
  this._rendererResources = {
    // Cached between models with the same url/cache-key
    buffers: {},
    vertexArrays: {},
    programs: {},
    sourceShaders: {},
    silhouettePrograms: {},
    textures: {},
    samplers: {},
    renderStates: {},
  };
  this._cachedRendererResources = undefined;
  this._loadRendererResourcesFromCache = false;

  this._dequantizeInShader = defaultValue(options.dequantizeInShader, true);
  this._decodedData = {};

  this._cachedGeometryByteLength = 0;
  this._cachedTexturesByteLength = 0;
  this._geometryByteLength = 0;
  this._texturesByteLength = 0;
  this._trianglesLength = 0;
  this._pointsLength = 0;

  // Hold references for shader reconstruction.
  // Hold these separately because _cachedGltf may get released (this.releaseGltfJson)
  this._sourceTechniques = {};
  this._sourcePrograms = {};
  this._quantizedVertexShaders = {};

  this._nodeCommands = [];
  this._pickIds = [];

  // CESIUM_RTC extension
  this._rtcCenter = undefined; // reference to either 3D or 2D
  this._rtcCenterEye = undefined; // in eye coordinates
  this._rtcCenter3D = undefined; // in world coordinates
  this._rtcCenter2D = undefined; // in projected world coordinates

  this._sourceVersion = undefined;
  this._sourceKHRTechniquesWebGL = undefined;

  this._imageBasedLightingFactor = new Cartesian2(1.0, 1.0);
  Cartesian2.clone(
    options.imageBasedLightingFactor,
    this._imageBasedLightingFactor
  );
  this._lightColor = Cartesian3.clone(options.lightColor);

  this._luminanceAtZenith = undefined;
  this.luminanceAtZenith = defaultValue(options.luminanceAtZenith, 0.2);

  this._sphericalHarmonicCoefficients = options.sphericalHarmonicCoefficients;
  this._specularEnvironmentMaps = options.specularEnvironmentMaps;
  this._shouldUpdateSpecularMapAtlas = true;
  this._specularEnvironmentMapAtlas = undefined;

  this._useDefaultSphericalHarmonics = false;
  this._useDefaultSpecularMaps = false;

  this._shouldRegenerateShaders = false;
}

Object.defineProperties(Model.prototype, {
  /**
   * The object for the glTF JSON, including properties with default values omitted
   * from the JSON provided to this model.
   *
   * @memberof Model.prototype
   *
   * @type {Object}
   * @readonly
   *
   * @default undefined
   */
  gltf: {
    get: function () {
      return defined(this._cachedGltf) ? this._cachedGltf.gltf : undefined;
    },
  },

  /**
   * When <code>true</code>, the glTF JSON is not stored with the model once the model is
   * loaded (when {@link Model#ready} is <code>true</code>).  This saves memory when
   * geometry, textures, and animations are embedded in the .gltf file.
   * This is especially useful for cases like 3D buildings, where each .gltf model is unique
   * and caching the glTF JSON is not effective.
   *
   * @memberof Model.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @default false
   *
   * @private
   */
  releaseGltfJson: {
    get: function () {
      return this._releaseGltfJson;
    },
  },

  /**
   * The key identifying this model in the model cache for glTF JSON, renderer resources, and animations.
   * Caching saves memory and improves loading speed when several models with the same url are created.
   * <p>
   * This key is automatically generated when the model is created with {@link Model.fromGltf}.  If the model
   * is created directly from glTF JSON using the {@link Model} constructor, this key can be manually
   * provided; otherwise, the model will not be changed.
   * </p>
   *
   * @memberof Model.prototype
   *
   * @type {String}
   * @readonly
   *
   * @private
   */
  cacheKey: {
    get: function () {
      return this._cacheKey;
    },
  },

  /**
   * The base path that paths in the glTF JSON are relative to.  The base
   * path is the same path as the path containing the .gltf file
   * minus the .gltf file, when binary, image, and shader files are
   * in the same directory as the .gltf.  When this is <code>''</code>,
   * the app's base path is used.
   *
   * @memberof Model.prototype
   *
   * @type {String}
   * @readonly
   *
   * @default ''
   */
  basePath: {
    get: function () {
      return this._resource.url;
    },
  },

  /**
   * The model's bounding sphere in its local coordinate system.  This does not take into
   * account glTF animations and skins nor does it take into account {@link Model#minimumPixelSize}.
   *
   * @memberof Model.prototype
   *
   * @type {BoundingSphere}
   * @readonly
   *
   * @default undefined
   *
   * @exception {DeveloperError} The model is not loaded.  Use Model.readyPromise or wait for Model.ready to be true.
   *
   * @example
   * // Center in WGS84 coordinates
   * var center = Cesium.Matrix4.multiplyByPoint(model.modelMatrix, model.boundingSphere.center, new Cesium.Cartesian3());
   */
  boundingSphere: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (this._state !== ModelState.LOADED) {
        throw new DeveloperError(
          "The model is not loaded.  Use Model.readyPromise or wait for Model.ready to be true."
        );
      }
      //>>includeEnd('debug');

      var modelMatrix = this.modelMatrix;
      if (
        this.heightReference !== HeightReference.NONE &&
        this._clampedModelMatrix
      ) {
        modelMatrix = this._clampedModelMatrix;
      }

      var nonUniformScale = Matrix4.getScale(
        modelMatrix,
        boundingSphereCartesian3Scratch
      );
      var scale = defined(this.maximumScale)
        ? Math.min(this.maximumScale, this.scale)
        : this.scale;
      Cartesian3.multiplyByScalar(nonUniformScale, scale, nonUniformScale);

      var scaledBoundingSphere = this._scaledBoundingSphere;
      scaledBoundingSphere.center = Cartesian3.multiplyComponents(
        this._boundingSphere.center,
        nonUniformScale,
        scaledBoundingSphere.center
      );
      scaledBoundingSphere.radius =
        Cartesian3.maximumComponent(nonUniformScale) * this._initialRadius;

      if (defined(this._rtcCenter)) {
        Cartesian3.add(
          this._rtcCenter,
          scaledBoundingSphere.center,
          scaledBoundingSphere.center
        );
      }

      return scaledBoundingSphere;
    },
  },

  /**
   * When <code>true</code>, this model is ready to render, i.e., the external binary, image,
   * and shader files were downloaded and the WebGL resources were created.  This is set to
   * <code>true</code> right before {@link Model#readyPromise} is resolved.
   *
   * @memberof Model.prototype
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
   * Gets the promise that will be resolved when this model is ready to render, i.e., when the external binary, image,
   * and shader files were downloaded and the WebGL resources were created.
   * <p>
   * This promise is resolved at the end of the frame before the first frame the model is rendered in.
   * </p>
   *
   * @memberof Model.prototype
   * @type {Promise.<Model>}
   * @readonly
   *
   * @example
   * // Play all animations at half-speed when the model is ready to render
   * Cesium.when(model.readyPromise).then(function(model) {
   *   model.activeAnimations.addAll({
   *     multiplier : 0.5
   *   });
   * }).otherwise(function(error){
   *   window.alert(error);
   * });
   *
   * @see Model#ready
   */
  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
    },
  },

  /**
   * Determines if model WebGL resource creation will be spread out over several frames or
   * block until completion once all glTF files are loaded.
   *
   * @memberof Model.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @default true
   */
  asynchronous: {
    get: function () {
      return this._asynchronous;
    },
  },

  /**
   * When <code>true</code>, each glTF mesh and primitive is pickable with {@link Scene#pick}.  When <code>false</code>, GPU memory is saved.
   *
   * @memberof Model.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @default true
   */
  allowPicking: {
    get: function () {
      return this._allowPicking;
    },
  },

  /**
   * Determine if textures may continue to stream in after the model is loaded.
   *
   * @memberof Model.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @default true
   */
  incrementallyLoadTextures: {
    get: function () {
      return this._incrementallyLoadTextures;
    },
  },

  /**
   * Return the number of pending texture loads.
   *
   * @memberof Model.prototype
   *
   * @type {Number}
   * @readonly
   */
  pendingTextureLoads: {
    get: function () {
      return defined(this._loadResources)
        ? this._loadResources.pendingTextureLoads
        : 0;
    },
  },

  /**
   * Returns true if the model was transformed this frame
   *
   * @memberof Model.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @private
   */
  dirty: {
    get: function () {
      return this._dirty;
    },
  },

  /**
   * Gets or sets the condition specifying at what distance from the camera that this model will be displayed.
   * @memberof Model.prototype
   * @type {DistanceDisplayCondition}
   * @default undefined
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

  extensionsUsed: {
    get: function () {
      if (!defined(this._extensionsUsed)) {
        this._extensionsUsed = ModelUtility.getUsedExtensions(this.gltf);
      }
      return this._extensionsUsed;
    },
  },

  extensionsRequired: {
    get: function () {
      if (!defined(this._extensionsRequired)) {
        this._extensionsRequired = ModelUtility.getRequiredExtensions(
          this.gltf
        );
      }
      return this._extensionsRequired;
    },
  },

  /**
   * Gets the model's up-axis.
   * By default models are y-up according to the glTF spec, however geo-referenced models will typically be z-up.
   *
   * @memberof Model.prototype
   *
   * @type {Number}
   * @default Axis.Y
   * @readonly
   *
   * @private
   */
  upAxis: {
    get: function () {
      return this._upAxis;
    },
  },

  /**
   * Gets the model's forward axis.
   * By default, glTF 2.0 models are z-forward according to the glTF spec, however older
   * glTF (1.0, 0.8) models used x-forward.  Note that only Axis.X and Axis.Z are supported.
   *
   * @memberof Model.prototype
   *
   * @type {Number}
   * @default Axis.Z
   * @readonly
   *
   * @private
   */
  forwardAxis: {
    get: function () {
      if (defined(this._forwardAxis)) {
        return this._forwardAxis;
      }
      return this._gltfForwardAxis;
    },
  },

  /**
   * Gets the model's triangle count.
   *
   * @private
   */
  trianglesLength: {
    get: function () {
      return this._trianglesLength;
    },
  },

  /**
   * Gets the model's point count.
   *
   * @private
   */
  pointsLength: {
    get: function () {
      return this._pointsLength;
    },
  },

  /**
   * Gets the model's geometry memory in bytes. This includes all vertex and index buffers.
   *
   * @private
   */
  geometryByteLength: {
    get: function () {
      return this._geometryByteLength;
    },
  },

  /**
   * Gets the model's texture memory in bytes.
   *
   * @private
   */
  texturesByteLength: {
    get: function () {
      return this._texturesByteLength;
    },
  },

  /**
   * Gets the model's cached geometry memory in bytes. This includes all vertex and index buffers.
   *
   * @private
   */
  cachedGeometryByteLength: {
    get: function () {
      return this._cachedGeometryByteLength;
    },
  },

  /**
   * Gets the model's cached texture memory in bytes.
   *
   * @private
   */
  cachedTexturesByteLength: {
    get: function () {
      return this._cachedTexturesByteLength;
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
      if (value === this._clippingPlanes) {
        return;
      }
      // Handle destroying, checking of unknown, checking for existing ownership
      ClippingPlaneCollection.setOwner(value, this, "_clippingPlanes");
    },
  },

  /**
   * @private
   */
  pickIds: {
    get: function () {
      return this._pickIds;
    },
  },

  /**
   * Cesium adds lighting from the earth, sky, atmosphere, and star skybox. This cartesian is used to scale the final
   * diffuse and specular lighting contribution from those sources to the final color. A value of 0.0 will disable those light sources.
   *
   * @memberof Model.prototype
   *
   * @type {Cartesian2}
   * @default Cartesian2(1.0, 1.0)
   */
  imageBasedLightingFactor: {
    get: function () {
      return this._imageBasedLightingFactor;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.object("imageBasedLightingFactor", value);
      Check.typeOf.number.greaterThanOrEquals(
        "imageBasedLightingFactor.x",
        value.x,
        0.0
      );
      Check.typeOf.number.lessThanOrEquals(
        "imageBasedLightingFactor.x",
        value.x,
        1.0
      );
      Check.typeOf.number.greaterThanOrEquals(
        "imageBasedLightingFactor.y",
        value.y,
        0.0
      );
      Check.typeOf.number.lessThanOrEquals(
        "imageBasedLightingFactor.y",
        value.y,
        1.0
      );
      //>>includeEnd('debug');
      var imageBasedLightingFactor = this._imageBasedLightingFactor;
      if (
        value === imageBasedLightingFactor ||
        Cartesian2.equals(value, imageBasedLightingFactor)
      ) {
        return;
      }
      this._shouldRegenerateShaders =
        this._shouldRegenerateShaders ||
        (this._imageBasedLightingFactor.x > 0.0 && value.x === 0.0) ||
        (this._imageBasedLightingFactor.x === 0.0 && value.x > 0.0);
      this._shouldRegenerateShaders =
        this._shouldRegenerateShaders ||
        (this._imageBasedLightingFactor.y > 0.0 && value.y === 0.0) ||
        (this._imageBasedLightingFactor.y === 0.0 && value.y > 0.0);
      Cartesian2.clone(value, this._imageBasedLightingFactor);
    },
  },

  /**
   * The light color when shading the model. When <code>undefined</code> the scene's light color is used instead.
   * <p>
   * For example, disabling additional light sources by setting <code>model.imageBasedLightingFactor = new Cesium.Cartesian2(0.0, 0.0)</code> will make the
   * model much darker. Here, increasing the intensity of the light source will make the model brighter.
   * </p>
   *
   * @memberof Model.prototype
   *
   * @type {Cartesian3}
   * @default undefined
   */
  lightColor: {
    get: function () {
      return this._lightColor;
    },
    set: function (value) {
      var lightColor = this._lightColor;
      if (value === lightColor || Cartesian3.equals(value, lightColor)) {
        return;
      }
      this._shouldRegenerateShaders =
        this._shouldRegenerateShaders ||
        (defined(lightColor) && !defined(value)) ||
        (defined(value) && !defined(lightColor));
      this._lightColor = Cartesian3.clone(value, lightColor);
    },
  },

  /**
   * The sun's luminance at the zenith in kilo candela per meter squared to use for this model's procedural environment map.
   * This is used when {@link Model#specularEnvironmentMaps} and {@link Model#sphericalHarmonicCoefficients} are not defined.
   *
   * @memberof Model.prototype
   *
   * @demo {@link https://sandcastle.cesium.com/index.html?src=Image-Based Lighting.html|Sandcastle Image Based Lighting Demo}
   * @type {Number}
   * @default 0.2
   */
  luminanceAtZenith: {
    get: function () {
      return this._luminanceAtZenith;
    },
    set: function (value) {
      var lum = this._luminanceAtZenith;
      if (value === lum) {
        return;
      }
      this._shouldRegenerateShaders =
        this._shouldRegenerateShaders ||
        (defined(lum) && !defined(value)) ||
        (defined(value) && !defined(lum));
      this._luminanceAtZenith = value;
    },
  },

  /**
   * The third order spherical harmonic coefficients used for the diffuse color of image-based lighting. When <code>undefined</code>, a diffuse irradiance
   * computed from the atmosphere color is used.
   * <p>
   * There are nine <code>Cartesian3</code> coefficients.
   * The order of the coefficients is: L<sub>00</sub>, L<sub>1-1</sub>, L<sub>10</sub>, L<sub>11</sub>, L<sub>2-2</sub>, L<sub>2-1</sub>, L<sub>20</sub>, L<sub>21</sub>, L<sub>22</sub>
   * </p>
   *
   * These values can be obtained by preprocessing the environment map using the <code>cmgen</code> tool of
   * {@link https://github.com/google/filament/releases|Google's Filament project}. This will also generate a KTX file that can be
   * supplied to {@link Model#specularEnvironmentMaps}.
   *
   * @memberof Model.prototype
   *
   * @type {Cartesian3[]}
   * @demo {@link https://sandcastle.cesium.com/index.html?src=Image-Based Lighting.html|Sandcastle Image Based Lighting Demo}
   * @see {@link https://graphics.stanford.edu/papers/envmap/envmap.pdf|An Efficient Representation for Irradiance Environment Maps}
   */
  sphericalHarmonicCoefficients: {
    get: function () {
      return this._sphericalHarmonicCoefficients;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (defined(value) && (!Array.isArray(value) || value.length !== 9)) {
        throw new DeveloperError(
          "sphericalHarmonicCoefficients must be an array of 9 Cartesian3 values."
        );
      }
      //>>includeEnd('debug');
      if (value === this._sphericalHarmonicCoefficients) {
        return;
      }
      this._sphericalHarmonicCoefficients = value;
      this._shouldRegenerateShaders = true;
    },
  },

  /**
   * A URL to a KTX file that contains a cube map of the specular lighting and the convoluted specular mipmaps.
   *
   * @memberof Model.prototype
   * @demo {@link https://sandcastle.cesium.com/index.html?src=Image-Based Lighting.html|Sandcastle Image Based Lighting Demo}
   * @type {String}
   * @see Model#sphericalHarmonicCoefficients
   */
  specularEnvironmentMaps: {
    get: function () {
      return this._specularEnvironmentMaps;
    },
    set: function (value) {
      this._shouldUpdateSpecularMapAtlas =
        this._shouldUpdateSpecularMapAtlas ||
        value !== this._specularEnvironmentMaps;
      this._specularEnvironmentMaps = value;
    },
  },
  /**
   * Gets the credit that will be displayed for the model
   * @memberof Model.prototype
   * @type {Credit}
   */
  credit: {
    get: function () {
      return this._credit;
    },
  },
});

function silhouetteSupported(context) {
  return context.stencilBuffer;
}

function isColorShadingEnabled(model) {
  return (
    !Color.equals(model.color, Color.WHITE) ||
    model.colorBlendMode !== ColorBlendMode.HIGHLIGHT
  );
}

function isClippingEnabled(model) {
  var clippingPlanes = model._clippingPlanes;
  return (
    defined(clippingPlanes) &&
    clippingPlanes.enabled &&
    clippingPlanes.length !== 0
  );
}

/**
 * Determines if silhouettes are supported.
 *
 * @param {Scene} scene The scene.
 * @returns {Boolean} <code>true</code> if silhouettes are supported; otherwise, returns <code>false</code>
 */
Model.silhouetteSupported = function (scene) {
  return silhouetteSupported(scene.context);
};

function containsGltfMagic(uint8Array) {
  var magic = getMagic(uint8Array);
  return magic === "glTF";
}

/**
 * <p>
 * Creates a model from a glTF asset.  When the model is ready to render, i.e., when the external binary, image,
 * and shader files are downloaded and the WebGL resources are created, the {@link Model#readyPromise} is resolved.
 * </p>
 * <p>
 * The model can be a traditional glTF asset with a .gltf extension or a Binary glTF using the .glb extension.
 * </p>
 * <p>
 * Cesium supports glTF assets with the following extensions:
 * <ul>
 * <li>
 * {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/1.0/Khronos/KHR_binary_glTF/README.md|KHR_binary_glTF (glTF 1.0)}
 * </li><li>
 * {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/1.0/Khronos/KHR_materials_common/README.md|KHR_materials_common (glTF 1.0)}
 * </li><li>
 * {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/1.0/Vendor/WEB3D_quantized_attributes/README.md|WEB3D_quantized_attributes (glTF 1.0)}
 * </li><li>
 * {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/AGI_articulations/README.md|AGI_articulations}
 * </li><li>
 * {@link https://github.com/KhronosGroup/glTF/pull/1302|KHR_blend (draft)}
 * </li><li>
 * {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_draco_mesh_compression/README.md|KHR_draco_mesh_compression}
 * </li><li>
 * {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_pbrSpecularGlossiness/README.md|KHR_materials_pbrSpecularGlossiness}
 * </li><li>
 * {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_unlit/README.md|KHR_materials_unlit}
 * </li><li>
 * {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_techniques_webgl/README.md|KHR_techniques_webgl}
 * </li><li>
 * {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_texture_transform/README.md|KHR_texture_transform}
 * </li>
 * </ul>
 * </p>
 * <p>
 * For high-precision rendering, Cesium supports the {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/1.0/Vendor/CESIUM_RTC/README.md|CESIUM_RTC} extension, which introduces the
 * CESIUM_RTC_MODELVIEW parameter semantic that says the node is in WGS84 coordinates translated
 * relative to a local origin.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource|String} options.url The url to the .gltf file.
 * @param {Resource|String} [options.basePath] The base path that paths in the glTF JSON are relative to.
 * @param {Boolean} [options.show=true] Determines if the model primitive will be shown.
 * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms the model from model to world coordinates.
 * @param {Number} [options.scale=1.0] A uniform scale applied to this model.
 * @param {Number} [options.minimumPixelSize=0.0] The approximate minimum pixel size of the model regardless of zoom.
 * @param {Number} [options.maximumScale] The maximum scale for the model.
 * @param {Object} [options.id] A user-defined object to return when the model is picked with {@link Scene#pick}.
 * @param {Boolean} [options.allowPicking=true] When <code>true</code>, each glTF mesh and primitive is pickable with {@link Scene#pick}.
 * @param {Boolean} [options.incrementallyLoadTextures=true] Determine if textures may continue to stream in after the model is loaded.
 * @param {Boolean} [options.asynchronous=true] Determines if model WebGL resource creation will be spread out over several frames or block until completion once all glTF files are loaded.
 * @param {Boolean} [options.clampAnimations=true] Determines if the model's animations should hold a pose over frames where no keyframes are specified.
 * @param {ShadowMode} [options.shadows=ShadowMode.ENABLED] Determines whether the model casts or receives shadows from light sources.
 * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Draws the bounding sphere for each draw command in the model.
 * @param {Boolean} [options.debugWireframe=false] For debugging only. Draws the model in wireframe.
 * @param {HeightReference} [options.heightReference=HeightReference.NONE] Determines how the model is drawn relative to terrain.
 * @param {Scene} [options.scene] Must be passed in for models that use the height reference property.
 * @param {DistanceDisplayCondition} [options.distanceDisplayCondition] The condition specifying at what distance from the camera that this model will be displayed.
 * @param {Color} [options.color=Color.WHITE] A color that blends with the model's rendered color.
 * @param {ColorBlendMode} [options.colorBlendMode=ColorBlendMode.HIGHLIGHT] Defines how the color blends with the model.
 * @param {Number} [options.colorBlendAmount=0.5] Value used to determine the color strength when the <code>colorBlendMode</code> is <code>MIX</code>. A value of 0.0 results in the model's rendered color while a value of 1.0 results in a solid color, with any value in-between resulting in a mix of the two.
 * @param {Color} [options.silhouetteColor=Color.RED] The silhouette color. If more than 256 models have silhouettes enabled, there is a small chance that overlapping models will have minor artifacts.
 * @param {Number} [options.silhouetteSize=0.0] The size of the silhouette in pixels.
 * @param {ClippingPlaneCollection} [options.clippingPlanes] The {@link ClippingPlaneCollection} used to selectively disable rendering the model.
 * @param {Boolean} [options.dequantizeInShader=true] Determines if a {@link https://github.com/google/draco|Draco} encoded model is dequantized on the GPU. This decreases total memory usage for encoded models.
 * @param {Credit|String} [options.credit] A credit for the model, which is displayed on the canvas.
 * @param {Boolean} [options.backFaceCulling=true] Whether to cull back-facing geometry. When true, back face culling is determined by the material's doubleSided property; when false, back face culling is disabled. Back faces are not culled if {@link Model#color} is translucent or {@link Model#silhouetteSize} is greater than 0.0.
 * @param {Boolean} [options.ignoreOutline=false] Whether to ignore the 3D model outline. When false, outlines are displayed. When true, all outlines are not displayed.
 * @returns {Model} The newly created model.
 *
 * @example
 * // Example 1. Create a model from a glTF asset
 * var model = scene.primitives.add(Cesium.Model.fromGltf({
 *   url : './duck/duck.gltf'
 * }));
 *
 * @example
 * // Example 2. Create model and provide all properties and events
 * var origin = Cesium.Cartesian3.fromDegrees(-95.0, 40.0, 200000.0);
 * var modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(origin);
 *
 * var model = scene.primitives.add(Cesium.Model.fromGltf({
 *   url : './duck/duck.gltf',
 *   show : true,                     // default
 *   modelMatrix : modelMatrix,
 *   scale : 2.0,                     // double size
 *   minimumPixelSize : 128,          // never smaller than 128 pixels
 *   maximumScale: 20000,             // never larger than 20000 * model size (overrides minimumPixelSize)
 *   allowPicking : false,            // not pickable
 *   debugShowBoundingVolume : false, // default
 *   debugWireframe : false
 * }));
 *
 * model.readyPromise.then(function(model) {
 *   // Play all animations when the model is ready to render
 *   model.activeAnimations.addAll();
 * });
 */
Model.fromGltf = function (options) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(options) || !defined(options.url)) {
    throw new DeveloperError("options.url is required");
  }
  //>>includeEnd('debug');

  var url = options.url;
  options = clone(options);

  // Create resource for the model file
  var modelResource = Resource.createIfNeeded(url);

  // Setup basePath to get dependent files
  var basePath = defaultValue(options.basePath, modelResource.clone());
  var resource = Resource.createIfNeeded(basePath);

  // If no cache key is provided, use a GUID.
  // Check using a URI to GUID dictionary that we have not already added this model.
  var cacheKey = defaultValue(
    options.cacheKey,
    uriToGuid[getAbsoluteUri(modelResource.url)]
  );
  if (!defined(cacheKey)) {
    cacheKey = createGuid();
    uriToGuid[getAbsoluteUri(modelResource.url)] = cacheKey;
  }

  if (defined(options.basePath) && !defined(options.cacheKey)) {
    cacheKey += resource.url;
  }
  options.cacheKey = cacheKey;
  options.basePath = resource;

  var model = new Model(options);

  var cachedGltf = gltfCache[cacheKey];
  if (!defined(cachedGltf)) {
    cachedGltf = new CachedGltf({
      ready: false,
    });
    cachedGltf.count = 1;
    cachedGltf.modelsToLoad.push(model);
    setCachedGltf(model, cachedGltf);
    gltfCache[cacheKey] = cachedGltf;

    // Add Accept header if we need it
    if (!defined(modelResource.headers.Accept)) {
      modelResource.headers.Accept = defaultModelAccept;
    }

    modelResource
      .fetchArrayBuffer()
      .then(function (arrayBuffer) {
        var array = new Uint8Array(arrayBuffer);
        if (containsGltfMagic(array)) {
          // Load binary glTF
          var parsedGltf = parseGlb(array);
          cachedGltf.makeReady(parsedGltf);
        } else {
          // Load text (JSON) glTF
          var json = getJsonFromTypedArray(array);
          cachedGltf.makeReady(json);
        }

        var resourceCredits = model._resourceCredits;
        var credits = modelResource.credits;
        if (defined(credits)) {
          var length = credits.length;
          for (var i = 0; i < length; i++) {
            resourceCredits.push(credits[i]);
          }
        }
      })
      .otherwise(
        ModelUtility.getFailedLoadFunction(model, "model", modelResource.url)
      );
  } else if (!cachedGltf.ready) {
    // Cache hit but the fetchArrayBuffer() or fetchText() request is still pending
    ++cachedGltf.count;
    cachedGltf.modelsToLoad.push(model);
  }
  // else if the cached glTF is defined and ready, the
  // model constructor will pick it up using the cache key.

  return model;
};

/**
 * For the unit tests to verify model caching.
 *
 * @private
 */
Model._gltfCache = gltfCache;

function getRuntime(model, runtimeName, name) {
  //>>includeStart('debug', pragmas.debug);
  if (model._state !== ModelState.LOADED) {
    throw new DeveloperError(
      "The model is not loaded.  Use Model.readyPromise or wait for Model.ready to be true."
    );
  }

  if (!defined(name)) {
    throw new DeveloperError("name is required.");
  }
  //>>includeEnd('debug');

  return model._runtime[runtimeName][name];
}

/**
 * Returns the glTF node with the given <code>name</code> property.  This is used to
 * modify a node's transform for animation outside of glTF animations.
 *
 * @param {String} name The glTF name of the node.
 * @returns {ModelNode} The node or <code>undefined</code> if no node with <code>name</code> exists.
 *
 * @exception {DeveloperError} The model is not loaded.  Use Model.readyPromise or wait for Model.ready to be true.
 *
 * @example
 * // Apply non-uniform scale to node LOD3sp
 * var node = model.getNode('LOD3sp');
 * node.matrix = Cesium.Matrix4.fromScale(new Cesium.Cartesian3(5.0, 1.0, 1.0), node.matrix);
 */
Model.prototype.getNode = function (name) {
  var node = getRuntime(this, "nodesByName", name);
  return defined(node) ? node.publicNode : undefined;
};

/**
 * Returns the glTF mesh with the given <code>name</code> property.
 *
 * @param {String} name The glTF name of the mesh.
 *
 * @returns {ModelMesh} The mesh or <code>undefined</code> if no mesh with <code>name</code> exists.
 *
 * @exception {DeveloperError} The model is not loaded.  Use Model.readyPromise or wait for Model.ready to be true.
 */
Model.prototype.getMesh = function (name) {
  return getRuntime(this, "meshesByName", name);
};

/**
 * Returns the glTF material with the given <code>name</code> property.
 *
 * @param {String} name The glTF name of the material.
 * @returns {ModelMaterial} The material or <code>undefined</code> if no material with <code>name</code> exists.
 *
 * @exception {DeveloperError} The model is not loaded.  Use Model.readyPromise or wait for Model.ready to be true.
 */
Model.prototype.getMaterial = function (name) {
  return getRuntime(this, "materialsByName", name);
};

/**
 * Sets the current value of an articulation stage.  After setting one or multiple stage values, call
 * Model.applyArticulations() to cause the node matrices to be recalculated.
 *
 * @param {String} articulationStageKey The name of the articulation, a space, and the name of the stage.
 * @param {Number} value The numeric value of this stage of the articulation.
 *
 * @exception {DeveloperError} The model is not loaded.  Use Model.readyPromise or wait for Model.ready to be true.
 *
 * @see Model#applyArticulations
 */
Model.prototype.setArticulationStage = function (articulationStageKey, value) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("value", value);
  //>>includeEnd('debug');

  var stage = getRuntime(this, "stagesByKey", articulationStageKey);
  var articulation = getRuntime(
    this,
    "articulationsByStageKey",
    articulationStageKey
  );
  if (defined(stage) && defined(articulation)) {
    value = CesiumMath.clamp(value, stage.minimumValue, stage.maximumValue);
    if (
      !CesiumMath.equalsEpsilon(stage.currentValue, value, articulationEpsilon)
    ) {
      stage.currentValue = value;
      articulation.isDirty = true;
    }
  }
};

var scratchArticulationCartesian = new Cartesian3();
var scratchArticulationRotation = new Matrix3();

/**
 * Modifies a Matrix4 by applying a transformation for a given value of a stage.  Note this is different usage
 * from the typical <code>result</code> parameter, in that the incoming value of <code>result</code> is
 * meaningful.  Various stages of an articulation can be multiplied together, so their
 * transformations are all merged into a composite Matrix4 representing them all.
 *
 * @param {object} stage The stage of an articulation that is being evaluated.
 * @param {Matrix4} result The matrix to be modified.
 * @returns {Matrix4} A matrix transformed as requested by the articulation stage.
 *
 * @private
 */
function applyArticulationStageMatrix(stage, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("stage", stage);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  var value = stage.currentValue;
  var cartesian = scratchArticulationCartesian;
  var rotation;
  switch (stage.type) {
    case "xRotate":
      rotation = Matrix3.fromRotationX(
        CesiumMath.toRadians(value),
        scratchArticulationRotation
      );
      Matrix4.multiplyByMatrix3(result, rotation, result);
      break;
    case "yRotate":
      rotation = Matrix3.fromRotationY(
        CesiumMath.toRadians(value),
        scratchArticulationRotation
      );
      Matrix4.multiplyByMatrix3(result, rotation, result);
      break;
    case "zRotate":
      rotation = Matrix3.fromRotationZ(
        CesiumMath.toRadians(value),
        scratchArticulationRotation
      );
      Matrix4.multiplyByMatrix3(result, rotation, result);
      break;
    case "xTranslate":
      cartesian.x = value;
      cartesian.y = 0.0;
      cartesian.z = 0.0;
      Matrix4.multiplyByTranslation(result, cartesian, result);
      break;
    case "yTranslate":
      cartesian.x = 0.0;
      cartesian.y = value;
      cartesian.z = 0.0;
      Matrix4.multiplyByTranslation(result, cartesian, result);
      break;
    case "zTranslate":
      cartesian.x = 0.0;
      cartesian.y = 0.0;
      cartesian.z = value;
      Matrix4.multiplyByTranslation(result, cartesian, result);
      break;
    case "xScale":
      cartesian.x = value;
      cartesian.y = 1.0;
      cartesian.z = 1.0;
      Matrix4.multiplyByScale(result, cartesian, result);
      break;
    case "yScale":
      cartesian.x = 1.0;
      cartesian.y = value;
      cartesian.z = 1.0;
      Matrix4.multiplyByScale(result, cartesian, result);
      break;
    case "zScale":
      cartesian.x = 1.0;
      cartesian.y = 1.0;
      cartesian.z = value;
      Matrix4.multiplyByScale(result, cartesian, result);
      break;
    case "uniformScale":
      Matrix4.multiplyByUniformScale(result, value, result);
      break;
    default:
      break;
  }
  return result;
}

var scratchApplyArticulationTransform = new Matrix4();

/**
 * Applies any modified articulation stages to the matrix of each node that participates
 * in any articulation.  Note that this will overwrite any nodeTransformations on participating nodes.
 *
 * @exception {DeveloperError} The model is not loaded.  Use Model.readyPromise or wait for Model.ready to be true.
 */
Model.prototype.applyArticulations = function () {
  var articulationsByName = this._runtime.articulationsByName;
  for (var articulationName in articulationsByName) {
    if (articulationsByName.hasOwnProperty(articulationName)) {
      var articulation = articulationsByName[articulationName];
      if (articulation.isDirty) {
        articulation.isDirty = false;
        var numNodes = articulation.nodes.length;
        for (var n = 0; n < numNodes; ++n) {
          var node = articulation.nodes[n];
          var transform = Matrix4.clone(
            node.originalMatrix,
            scratchApplyArticulationTransform
          );

          var numStages = articulation.stages.length;
          for (var s = 0; s < numStages; ++s) {
            var stage = articulation.stages[s];
            transform = applyArticulationStageMatrix(stage, transform);
          }
          node.matrix = transform;
        }
      }
    }
  }
};

///////////////////////////////////////////////////////////////////////////

function addBuffersToLoadResources(model) {
  var gltf = model.gltf;
  var loadResources = model._loadResources;
  ForEach.buffer(gltf, function (buffer, id) {
    loadResources.buffers[id] = buffer.extras._pipeline.source;
  });
}

function bufferLoad(model, id) {
  return function (arrayBuffer) {
    var loadResources = model._loadResources;
    var buffer = new Uint8Array(arrayBuffer);
    --loadResources.pendingBufferLoads;
    model.gltf.buffers[id].extras._pipeline.source = buffer;
  };
}

function parseBufferViews(model) {
  var bufferViews = model.gltf.bufferViews;
  var vertexBuffersToCreate = model._loadResources.vertexBuffersToCreate;

  // Only ARRAY_BUFFER here.  ELEMENT_ARRAY_BUFFER created below.
  ForEach.bufferView(model.gltf, function (bufferView, id) {
    if (bufferView.target === WebGLConstants.ARRAY_BUFFER) {
      vertexBuffersToCreate.enqueue(id);
    }
  });

  var indexBuffersToCreate = model._loadResources.indexBuffersToCreate;
  var indexBufferIds = {};

  // The Cesium Renderer requires knowing the datatype for an index buffer
  // at creation type, which is not part of the glTF bufferview so loop
  // through glTF accessors to create the bufferview's index buffer.
  ForEach.accessor(model.gltf, function (accessor) {
    var bufferViewId = accessor.bufferView;
    if (!defined(bufferViewId)) {
      return;
    }

    var bufferView = bufferViews[bufferViewId];
    if (
      bufferView.target === WebGLConstants.ELEMENT_ARRAY_BUFFER &&
      !defined(indexBufferIds[bufferViewId])
    ) {
      indexBufferIds[bufferViewId] = true;
      indexBuffersToCreate.enqueue({
        id: bufferViewId,
        componentType: accessor.componentType,
      });
    }
  });
}

function parseTechniques(model) {
  // retain references to gltf techniques
  var gltf = model.gltf;
  if (!usesExtension(gltf, "KHR_techniques_webgl")) {
    return;
  }

  var sourcePrograms = model._sourcePrograms;
  var sourceTechniques = model._sourceTechniques;
  var programs = gltf.extensions.KHR_techniques_webgl.programs;

  ForEach.technique(gltf, function (technique, techniqueId) {
    sourceTechniques[techniqueId] = clone(technique);

    var programId = technique.program;
    if (!defined(sourcePrograms[programId])) {
      sourcePrograms[programId] = clone(programs[programId]);
    }
  });
}

function shaderLoad(model, type, id) {
  return function (source) {
    var loadResources = model._loadResources;
    loadResources.shaders[id] = {
      source: source,
      type: type,
      bufferView: undefined,
    };
    --loadResources.pendingShaderLoads;
    model._rendererResources.sourceShaders[id] = source;
  };
}

function parseShaders(model) {
  var gltf = model.gltf;
  var buffers = gltf.buffers;
  var bufferViews = gltf.bufferViews;
  var sourceShaders = model._rendererResources.sourceShaders;
  ForEach.shader(gltf, function (shader, id) {
    // Shader references either uri (external or base64-encoded) or bufferView
    if (defined(shader.bufferView)) {
      var bufferViewId = shader.bufferView;
      var bufferView = bufferViews[bufferViewId];
      var bufferId = bufferView.buffer;
      var buffer = buffers[bufferId];
      var source = getStringFromTypedArray(
        buffer.extras._pipeline.source,
        bufferView.byteOffset,
        bufferView.byteLength
      );
      sourceShaders[id] = source;
    } else if (defined(shader.extras._pipeline.source)) {
      sourceShaders[id] = shader.extras._pipeline.source;
    } else {
      ++model._loadResources.pendingShaderLoads;

      var shaderResource = model._resource.getDerivedResource({
        url: shader.uri,
      });

      shaderResource
        .fetchText()
        .then(shaderLoad(model, shader.type, id))
        .otherwise(
          ModelUtility.getFailedLoadFunction(
            model,
            "shader",
            shaderResource.url
          )
        );
    }
  });
}

function parsePrograms(model) {
  var sourceTechniques = model._sourceTechniques;
  for (var techniqueId in sourceTechniques) {
    if (sourceTechniques.hasOwnProperty(techniqueId)) {
      var technique = sourceTechniques[techniqueId];
      model._loadResources.programsToCreate.enqueue({
        programId: technique.program,
        techniqueId: techniqueId,
      });
    }
  }
}

function parseArticulations(model) {
  var articulationsByName = {};
  var articulationsByStageKey = {};
  var runtimeStagesByKey = {};

  model._runtime.articulationsByName = articulationsByName;
  model._runtime.articulationsByStageKey = articulationsByStageKey;
  model._runtime.stagesByKey = runtimeStagesByKey;

  var gltf = model.gltf;
  if (
    !usesExtension(gltf, "AGI_articulations") ||
    !defined(gltf.extensions) ||
    !defined(gltf.extensions.AGI_articulations)
  ) {
    return;
  }

  var gltfArticulations = gltf.extensions.AGI_articulations.articulations;
  if (!defined(gltfArticulations)) {
    return;
  }

  var numArticulations = gltfArticulations.length;
  for (var i = 0; i < numArticulations; ++i) {
    var articulation = clone(gltfArticulations[i]);
    articulation.nodes = [];
    articulation.isDirty = true;
    articulationsByName[articulation.name] = articulation;

    var numStages = articulation.stages.length;
    for (var s = 0; s < numStages; ++s) {
      var stage = articulation.stages[s];
      stage.currentValue = stage.initialValue;

      var stageKey = articulation.name + " " + stage.name;
      articulationsByStageKey[stageKey] = articulation;
      runtimeStagesByKey[stageKey] = stage;
    }
  }
}

function imageLoad(model, textureId) {
  return function (image) {
    var loadResources = model._loadResources;
    --loadResources.pendingTextureLoads;
    loadResources.texturesToCreate.enqueue({
      id: textureId,
      image: image,
      bufferView: image.bufferView,
      width: image.width,
      height: image.height,
      internalFormat: image.internalFormat,
    });
  };
}

var ktxRegex = /(^data:image\/ktx)|(\.ktx$)/i;
var crnRegex = /(^data:image\/crn)|(\.crn$)/i;

function parseTextures(model, context, supportsWebP) {
  var gltf = model.gltf;
  var images = gltf.images;
  var uri;
  ForEach.texture(gltf, function (texture, id) {
    var imageId = texture.source;

    if (
      defined(texture.extensions) &&
      defined(texture.extensions.EXT_texture_webp) &&
      supportsWebP
    ) {
      imageId = texture.extensions.EXT_texture_webp.source;
    }

    var gltfImage = images[imageId];
    var extras = gltfImage.extras;

    var bufferViewId = gltfImage.bufferView;
    var mimeType = gltfImage.mimeType;
    uri = gltfImage.uri;

    // First check for a compressed texture
    if (defined(extras) && defined(extras.compressedImage3DTiles)) {
      var crunch = extras.compressedImage3DTiles.crunch;
      var s3tc = extras.compressedImage3DTiles.s3tc;
      var pvrtc = extras.compressedImage3DTiles.pvrtc1;
      var etc1 = extras.compressedImage3DTiles.etc1;

      if (context.s3tc && defined(crunch)) {
        mimeType = crunch.mimeType;
        if (defined(crunch.bufferView)) {
          bufferViewId = crunch.bufferView;
        } else {
          uri = crunch.uri;
        }
      } else if (context.s3tc && defined(s3tc)) {
        mimeType = s3tc.mimeType;
        if (defined(s3tc.bufferView)) {
          bufferViewId = s3tc.bufferView;
        } else {
          uri = s3tc.uri;
        }
      } else if (context.pvrtc && defined(pvrtc)) {
        mimeType = pvrtc.mimeType;
        if (defined(pvrtc.bufferView)) {
          bufferViewId = pvrtc.bufferView;
        } else {
          uri = pvrtc.uri;
        }
      } else if (context.etc1 && defined(etc1)) {
        mimeType = etc1.mimeType;
        if (defined(etc1.bufferView)) {
          bufferViewId = etc1.bufferView;
        } else {
          uri = etc1.uri;
        }
      }
    }

    // Image references either uri (external or base64-encoded) or bufferView
    if (defined(bufferViewId)) {
      model._loadResources.texturesToCreateFromBufferView.enqueue({
        id: id,
        image: undefined,
        bufferView: bufferViewId,
        mimeType: mimeType,
      });
    } else {
      ++model._loadResources.pendingTextureLoads;

      var imageResource = model._resource.getDerivedResource({
        url: uri,
      });

      var promise;
      if (ktxRegex.test(uri)) {
        promise = loadKTX(imageResource);
      } else if (crnRegex.test(uri)) {
        promise = loadCRN(imageResource);
      } else {
        promise = imageResource.fetchImage({
          preferImageBitmap: true,
        });
      }
      promise
        .then(imageLoad(model, id, imageId))
        .otherwise(
          ModelUtility.getFailedLoadFunction(model, "image", imageResource.url)
        );
    }
  });
}

var scratchArticulationStageInitialTransform = new Matrix4();

function parseNodes(model) {
  var runtimeNodes = {};
  var runtimeNodesByName = {};
  var skinnedNodes = [];

  var skinnedNodesIds = model._loadResources.skinnedNodesIds;
  var articulationsByName = model._runtime.articulationsByName;

  ForEach.node(model.gltf, function (node, id) {
    var runtimeNode = {
      // Animation targets
      matrix: undefined,
      translation: undefined,
      rotation: undefined,
      scale: undefined,

      // Per-node show inherited from parent
      computedShow: true,

      // Computed transforms
      transformToRoot: new Matrix4(),
      computedMatrix: new Matrix4(),
      dirtyNumber: 0, // The frame this node was made dirty by an animation; for graph traversal

      // Rendering
      commands: [], // empty for transform, light, and camera nodes

      // Skinned node
      inverseBindMatrices: undefined, // undefined when node is not skinned
      bindShapeMatrix: undefined, // undefined when node is not skinned or identity
      joints: [], // empty when node is not skinned
      computedJointMatrices: [], // empty when node is not skinned

      // Joint node
      jointName: node.jointName, // undefined when node is not a joint

      weights: [],

      // Graph pointers
      children: [], // empty for leaf nodes
      parents: [], // empty for root nodes

      // Publicly-accessible ModelNode instance to modify animation targets
      publicNode: undefined,
    };
    runtimeNode.publicNode = new ModelNode(
      model,
      node,
      runtimeNode,
      id,
      ModelUtility.getTransform(node)
    );

    runtimeNodes[id] = runtimeNode;
    runtimeNodesByName[node.name] = runtimeNode;

    if (defined(node.skin)) {
      skinnedNodesIds.push(id);
      skinnedNodes.push(runtimeNode);
    }

    if (
      defined(node.extensions) &&
      defined(node.extensions.AGI_articulations)
    ) {
      var articulationName = node.extensions.AGI_articulations.articulationName;
      if (defined(articulationName)) {
        var transform = Matrix4.clone(
          runtimeNode.publicNode.originalMatrix,
          scratchArticulationStageInitialTransform
        );
        var articulation = articulationsByName[articulationName];
        articulation.nodes.push(runtimeNode.publicNode);

        var numStages = articulation.stages.length;
        for (var s = 0; s < numStages; ++s) {
          var stage = articulation.stages[s];
          transform = applyArticulationStageMatrix(stage, transform);
        }
        runtimeNode.publicNode.matrix = transform;
      }
    }
  });

  model._runtime.nodes = runtimeNodes;
  model._runtime.nodesByName = runtimeNodesByName;
  model._runtime.skinnedNodes = skinnedNodes;
}

function parseMaterials(model) {
  var gltf = model.gltf;
  var techniques = model._sourceTechniques;

  var runtimeMaterialsByName = {};
  var runtimeMaterialsById = {};
  var uniformMaps = model._uniformMaps;

  ForEach.material(gltf, function (material, materialId) {
    // Allocated now so ModelMaterial can keep a reference to it.
    uniformMaps[materialId] = {
      uniformMap: undefined,
      values: undefined,
      jointMatrixUniformName: undefined,
      morphWeightsUniformName: undefined,
    };

    var modelMaterial = new ModelMaterial(model, material, materialId);

    if (
      defined(material.extensions) &&
      defined(material.extensions.KHR_techniques_webgl)
    ) {
      var techniqueId = material.extensions.KHR_techniques_webgl.technique;
      modelMaterial._technique = techniqueId;
      modelMaterial._program = techniques[techniqueId].program;

      ForEach.materialValue(material, function (value, uniformName) {
        if (!defined(modelMaterial._values)) {
          modelMaterial._values = {};
        }

        modelMaterial._values[uniformName] = clone(value);
      });
    }

    runtimeMaterialsByName[material.name] = modelMaterial;
    runtimeMaterialsById[materialId] = modelMaterial;
  });

  model._runtime.materialsByName = runtimeMaterialsByName;
  model._runtime.materialsById = runtimeMaterialsById;
}

function parseMeshes(model) {
  var runtimeMeshesByName = {};
  var runtimeMaterialsById = model._runtime.materialsById;

  ForEach.mesh(model.gltf, function (mesh, meshId) {
    runtimeMeshesByName[mesh.name] = new ModelMesh(
      mesh,
      runtimeMaterialsById,
      meshId
    );
    if (
      defined(model.extensionsUsed.WEB3D_quantized_attributes) ||
      model._dequantizeInShader
    ) {
      // Cache primitives according to their program
      ForEach.meshPrimitive(mesh, function (primitive, primitiveId) {
        var programId = getProgramForPrimitive(model, primitive);
        var programPrimitives = model._programPrimitives[programId];
        if (!defined(programPrimitives)) {
          programPrimitives = {};
          model._programPrimitives[programId] = programPrimitives;
        }
        programPrimitives[meshId + ".primitive." + primitiveId] = primitive;
      });
    }
  });

  model._runtime.meshesByName = runtimeMeshesByName;
}

///////////////////////////////////////////////////////////////////////////

var CreateVertexBufferJob = function () {
  this.id = undefined;
  this.model = undefined;
  this.context = undefined;
};

CreateVertexBufferJob.prototype.set = function (id, model, context) {
  this.id = id;
  this.model = model;
  this.context = context;
};

CreateVertexBufferJob.prototype.execute = function () {
  createVertexBuffer(this.id, this.model, this.context);
};

///////////////////////////////////////////////////////////////////////////

function createVertexBuffer(bufferViewId, model, context) {
  var loadResources = model._loadResources;
  var bufferViews = model.gltf.bufferViews;
  var bufferView = bufferViews[bufferViewId];

  // Use bufferView created at runtime
  if (!defined(bufferView)) {
    bufferView = loadResources.createdBufferViews[bufferViewId];
  }

  var vertexBuffer = Buffer.createVertexBuffer({
    context: context,
    typedArray: loadResources.getBuffer(bufferView),
    usage: BufferUsage.STATIC_DRAW,
  });
  vertexBuffer.vertexArrayDestroyable = false;
  model._rendererResources.buffers[bufferViewId] = vertexBuffer;
  model._geometryByteLength += vertexBuffer.sizeInBytes;
}

///////////////////////////////////////////////////////////////////////////

var CreateIndexBufferJob = function () {
  this.id = undefined;
  this.componentType = undefined;
  this.model = undefined;
  this.context = undefined;
};

CreateIndexBufferJob.prototype.set = function (
  id,
  componentType,
  model,
  context
) {
  this.id = id;
  this.componentType = componentType;
  this.model = model;
  this.context = context;
};

CreateIndexBufferJob.prototype.execute = function () {
  createIndexBuffer(this.id, this.componentType, this.model, this.context);
};

///////////////////////////////////////////////////////////////////////////

function createIndexBuffer(bufferViewId, componentType, model, context) {
  var loadResources = model._loadResources;
  var bufferViews = model.gltf.bufferViews;
  var bufferView = bufferViews[bufferViewId];

  // Use bufferView created at runtime
  if (!defined(bufferView)) {
    bufferView = loadResources.createdBufferViews[bufferViewId];
  }

  var indexBuffer = Buffer.createIndexBuffer({
    context: context,
    typedArray: loadResources.getBuffer(bufferView),
    usage: BufferUsage.STATIC_DRAW,
    indexDatatype: componentType,
  });
  indexBuffer.vertexArrayDestroyable = false;
  model._rendererResources.buffers[bufferViewId] = indexBuffer;
  model._geometryByteLength += indexBuffer.sizeInBytes;
}

var scratchVertexBufferJob = new CreateVertexBufferJob();
var scratchIndexBufferJob = new CreateIndexBufferJob();

function createBuffers(model, frameState) {
  var loadResources = model._loadResources;

  if (loadResources.pendingBufferLoads !== 0) {
    return;
  }

  var context = frameState.context;
  var vertexBuffersToCreate = loadResources.vertexBuffersToCreate;
  var indexBuffersToCreate = loadResources.indexBuffersToCreate;
  var i;

  if (model.asynchronous) {
    while (vertexBuffersToCreate.length > 0) {
      scratchVertexBufferJob.set(vertexBuffersToCreate.peek(), model, context);
      if (
        !frameState.jobScheduler.execute(scratchVertexBufferJob, JobType.BUFFER)
      ) {
        break;
      }
      vertexBuffersToCreate.dequeue();
    }

    while (indexBuffersToCreate.length > 0) {
      i = indexBuffersToCreate.peek();
      scratchIndexBufferJob.set(i.id, i.componentType, model, context);
      if (
        !frameState.jobScheduler.execute(scratchIndexBufferJob, JobType.BUFFER)
      ) {
        break;
      }
      indexBuffersToCreate.dequeue();
    }
  } else {
    while (vertexBuffersToCreate.length > 0) {
      createVertexBuffer(vertexBuffersToCreate.dequeue(), model, context);
    }

    while (indexBuffersToCreate.length > 0) {
      i = indexBuffersToCreate.dequeue();
      createIndexBuffer(i.id, i.componentType, model, context);
    }
  }
}

function getProgramForPrimitive(model, primitive) {
  var material = model._runtime.materialsById[primitive.material];
  if (!defined(material)) {
    return;
  }

  return material._program;
}

function modifyShaderForQuantizedAttributes(shader, programName, model) {
  var primitive;
  var primitives = model._programPrimitives[programName];

  // If no primitives were cached for this program, there's no need to modify the shader
  if (!defined(primitives)) {
    return shader;
  }

  var primitiveId;
  for (primitiveId in primitives) {
    if (primitives.hasOwnProperty(primitiveId)) {
      primitive = primitives[primitiveId];
      if (getProgramForPrimitive(model, primitive) === programName) {
        break;
      }
    }
  }

  // This is not needed after the program is processed, free the memory
  model._programPrimitives[programName] = undefined;

  var result;
  if (model.extensionsUsed.WEB3D_quantized_attributes) {
    result = ModelUtility.modifyShaderForQuantizedAttributes(
      model.gltf,
      primitive,
      shader
    );
    model._quantizedUniforms[programName] = result.uniforms;
  } else {
    var decodedData = model._decodedData[primitiveId];
    if (defined(decodedData)) {
      result = ModelUtility.modifyShaderForDracoQuantizedAttributes(
        model.gltf,
        primitive,
        shader,
        decodedData.attributes
      );
    } else {
      return shader;
    }
  }

  return result.shader;
}

function modifyShaderForColor(shader) {
  shader = ShaderSource.replaceMain(shader, "gltf_blend_main");
  shader +=
    "uniform vec4 gltf_color; \n" +
    "uniform float gltf_colorBlend; \n" +
    "void main() \n" +
    "{ \n" +
    "    gltf_blend_main(); \n" +
    "    gl_FragColor.rgb = mix(gl_FragColor.rgb, gltf_color.rgb, gltf_colorBlend); \n" +
    "    float highlight = ceil(gltf_colorBlend); \n" +
    "    gl_FragColor.rgb *= mix(gltf_color.rgb, vec3(1.0), highlight); \n" +
    "    gl_FragColor.a *= gltf_color.a; \n" +
    "} \n";

  return shader;
}

function modifyShader(shader, programName, callback) {
  if (defined(callback)) {
    shader = callback(shader, programName);
  }
  return shader;
}

var CreateProgramJob = function () {
  this.programToCreate = undefined;
  this.model = undefined;
  this.context = undefined;
};

CreateProgramJob.prototype.set = function (programToCreate, model, context) {
  this.programToCreate = programToCreate;
  this.model = model;
  this.context = context;
};

CreateProgramJob.prototype.execute = function () {
  createProgram(this.programToCreate, this.model, this.context);
};

///////////////////////////////////////////////////////////////////////////

// When building programs for the first time, do not include modifiers for clipping planes and color
// since this is the version of the program that will be cached for use with other Models.
function createProgram(programToCreate, model, context) {
  var programId = programToCreate.programId;
  var techniqueId = programToCreate.techniqueId;
  var program = model._sourcePrograms[programId];
  var shaders = model._rendererResources.sourceShaders;

  var vs = shaders[program.vertexShader];
  var fs = shaders[program.fragmentShader];

  var quantizedVertexShaders = model._quantizedVertexShaders;

  if (
    model.extensionsUsed.WEB3D_quantized_attributes ||
    model._dequantizeInShader
  ) {
    var quantizedVS = quantizedVertexShaders[programId];
    if (!defined(quantizedVS)) {
      quantizedVS = modifyShaderForQuantizedAttributes(vs, programId, model);
      quantizedVertexShaders[programId] = quantizedVS;
    }
    vs = quantizedVS;
  }

  var drawVS = modifyShader(vs, programId, model._vertexShaderLoaded);
  var drawFS = modifyShader(fs, programId, model._fragmentShaderLoaded);

  if (!defined(model._uniformMapLoaded)) {
    drawFS = "uniform vec4 czm_pickColor;\n" + drawFS;
  }

  var useIBL =
    model._imageBasedLightingFactor.x > 0.0 ||
    model._imageBasedLightingFactor.y > 0.0;
  if (useIBL) {
    drawFS = "#define USE_IBL_LIGHTING \n\n" + drawFS;
  }

  if (defined(model._lightColor)) {
    drawFS = "#define USE_CUSTOM_LIGHT_COLOR \n\n" + drawFS;
  }

  if (model._sourceVersion !== "2.0" || model._sourceKHRTechniquesWebGL) {
    drawFS = ShaderSource.replaceMain(drawFS, "non_gamma_corrected_main");
    drawFS =
      drawFS +
      "\n" +
      "void main() { \n" +
      "    non_gamma_corrected_main(); \n" +
      "    gl_FragColor = czm_gammaCorrect(gl_FragColor); \n" +
      "} \n";
  }

  if (OctahedralProjectedCubeMap.isSupported(context)) {
    var usesSH =
      defined(model._sphericalHarmonicCoefficients) ||
      model._useDefaultSphericalHarmonics;
    var usesSM =
      (defined(model._specularEnvironmentMapAtlas) &&
        model._specularEnvironmentMapAtlas.ready) ||
      model._useDefaultSpecularMaps;
    var addMatrix = usesSH || usesSM || useIBL;
    if (addMatrix) {
      drawFS = "uniform mat3 gltf_iblReferenceFrameMatrix; \n" + drawFS;
    }

    if (defined(model._sphericalHarmonicCoefficients)) {
      drawFS =
        "#define DIFFUSE_IBL \n" +
        "#define CUSTOM_SPHERICAL_HARMONICS \n" +
        "uniform vec3 gltf_sphericalHarmonicCoefficients[9]; \n" +
        drawFS;
    } else if (model._useDefaultSphericalHarmonics) {
      drawFS = "#define DIFFUSE_IBL \n" + drawFS;
    }

    if (
      defined(model._specularEnvironmentMapAtlas) &&
      model._specularEnvironmentMapAtlas.ready
    ) {
      drawFS =
        "#define SPECULAR_IBL \n" +
        "#define CUSTOM_SPECULAR_IBL \n" +
        "uniform sampler2D gltf_specularMap; \n" +
        "uniform vec2 gltf_specularMapSize; \n" +
        "uniform float gltf_maxSpecularLOD; \n" +
        drawFS;
    } else if (model._useDefaultSpecularMaps) {
      drawFS = "#define SPECULAR_IBL \n" + drawFS;
    }
  }

  if (defined(model._luminanceAtZenith)) {
    drawFS =
      "#define USE_SUN_LUMINANCE \n" +
      "uniform float gltf_luminanceAtZenith;\n" +
      drawFS;
  }

  createAttributesAndProgram(
    programId,
    techniqueId,
    drawFS,
    drawVS,
    model,
    context
  );
}

function recreateProgram(programToCreate, model, context) {
  var programId = programToCreate.programId;
  var techniqueId = programToCreate.techniqueId;
  var program = model._sourcePrograms[programId];
  var shaders = model._rendererResources.sourceShaders;

  var quantizedVertexShaders = model._quantizedVertexShaders;

  var clippingPlaneCollection = model.clippingPlanes;
  var addClippingPlaneCode = isClippingEnabled(model);

  var vs = shaders[program.vertexShader];
  var fs = shaders[program.fragmentShader];

  if (
    model.extensionsUsed.WEB3D_quantized_attributes ||
    model._dequantizeInShader
  ) {
    vs = quantizedVertexShaders[programId];
  }

  var finalFS = fs;
  if (isColorShadingEnabled(model)) {
    finalFS = Model._modifyShaderForColor(finalFS);
  }
  if (addClippingPlaneCode) {
    finalFS = modifyShaderForClippingPlanes(
      finalFS,
      clippingPlaneCollection,
      context
    );
  }

  var drawVS = modifyShader(vs, programId, model._vertexShaderLoaded);
  var drawFS = modifyShader(finalFS, programId, model._fragmentShaderLoaded);

  if (!defined(model._uniformMapLoaded)) {
    drawFS = "uniform vec4 czm_pickColor;\n" + drawFS;
  }

  var useIBL =
    model._imageBasedLightingFactor.x > 0.0 ||
    model._imageBasedLightingFactor.y > 0.0;
  if (useIBL) {
    drawFS = "#define USE_IBL_LIGHTING \n\n" + drawFS;
  }

  if (defined(model._lightColor)) {
    drawFS = "#define USE_CUSTOM_LIGHT_COLOR \n\n" + drawFS;
  }

  if (model._sourceVersion !== "2.0" || model._sourceKHRTechniquesWebGL) {
    drawFS = ShaderSource.replaceMain(drawFS, "non_gamma_corrected_main");
    drawFS =
      drawFS +
      "\n" +
      "void main() { \n" +
      "    non_gamma_corrected_main(); \n" +
      "    gl_FragColor = czm_gammaCorrect(gl_FragColor); \n" +
      "} \n";
  }

  if (OctahedralProjectedCubeMap.isSupported(context)) {
    var usesSH =
      defined(model._sphericalHarmonicCoefficients) ||
      model._useDefaultSphericalHarmonics;
    var usesSM =
      (defined(model._specularEnvironmentMapAtlas) &&
        model._specularEnvironmentMapAtlas.ready) ||
      model._useDefaultSpecularMaps;
    var addMatrix = usesSH || usesSM || useIBL;
    if (addMatrix) {
      drawFS = "uniform mat3 gltf_iblReferenceFrameMatrix; \n" + drawFS;
    }

    if (defined(model._sphericalHarmonicCoefficients)) {
      drawFS =
        "#define DIFFUSE_IBL \n" +
        "#define CUSTOM_SPHERICAL_HARMONICS \n" +
        "uniform vec3 gltf_sphericalHarmonicCoefficients[9]; \n" +
        drawFS;
    } else if (model._useDefaultSphericalHarmonics) {
      drawFS = "#define DIFFUSE_IBL \n" + drawFS;
    }

    if (
      defined(model._specularEnvironmentMapAtlas) &&
      model._specularEnvironmentMapAtlas.ready
    ) {
      drawFS =
        "#define SPECULAR_IBL \n" +
        "#define CUSTOM_SPECULAR_IBL \n" +
        "uniform sampler2D gltf_specularMap; \n" +
        "uniform vec2 gltf_specularMapSize; \n" +
        "uniform float gltf_maxSpecularLOD; \n" +
        drawFS;
    } else if (model._useDefaultSpecularMaps) {
      drawFS = "#define SPECULAR_IBL \n" + drawFS;
    }
  }

  if (defined(model._luminanceAtZenith)) {
    drawFS =
      "#define USE_SUN_LUMINANCE \n" +
      "uniform float gltf_luminanceAtZenith;\n" +
      drawFS;
  }

  createAttributesAndProgram(
    programId,
    techniqueId,
    drawFS,
    drawVS,
    model,
    context
  );
}

function createAttributesAndProgram(
  programId,
  techniqueId,
  drawFS,
  drawVS,
  model,
  context
) {
  var technique = model._sourceTechniques[techniqueId];
  var attributeLocations = ModelUtility.createAttributeLocations(
    technique,
    model._precreatedAttributes
  );

  model._rendererResources.programs[programId] = ShaderProgram.fromCache({
    context: context,
    vertexShaderSource: drawVS,
    fragmentShaderSource: drawFS,
    attributeLocations: attributeLocations,
  });
}

var scratchCreateProgramJob = new CreateProgramJob();

function createPrograms(model, frameState) {
  var loadResources = model._loadResources;
  var programsToCreate = loadResources.programsToCreate;

  if (loadResources.pendingShaderLoads !== 0) {
    return;
  }

  // PERFORMANCE_IDEA: this could be more fine-grained by looking
  // at the shader's bufferView's to determine the buffer dependencies.
  if (loadResources.pendingBufferLoads !== 0) {
    return;
  }

  var context = frameState.context;

  if (model.asynchronous) {
    while (programsToCreate.length > 0) {
      scratchCreateProgramJob.set(programsToCreate.peek(), model, context);
      if (
        !frameState.jobScheduler.execute(
          scratchCreateProgramJob,
          JobType.PROGRAM
        )
      ) {
        break;
      }
      programsToCreate.dequeue();
    }
  } else {
    // Create all loaded programs this frame
    while (programsToCreate.length > 0) {
      createProgram(programsToCreate.dequeue(), model, context);
    }
  }
}

function getOnImageCreatedFromTypedArray(loadResources, gltfTexture) {
  return function (image) {
    loadResources.texturesToCreate.enqueue({
      id: gltfTexture.id,
      image: image,
      bufferView: undefined,
    });

    --loadResources.pendingBufferViewToImage;
  };
}

function loadTexturesFromBufferViews(model) {
  var loadResources = model._loadResources;

  if (loadResources.pendingBufferLoads !== 0) {
    return;
  }

  while (loadResources.texturesToCreateFromBufferView.length > 0) {
    var gltfTexture = loadResources.texturesToCreateFromBufferView.dequeue();

    var gltf = model.gltf;
    var bufferView = gltf.bufferViews[gltfTexture.bufferView];
    var imageId = gltf.textures[gltfTexture.id].source;

    var onerror = ModelUtility.getFailedLoadFunction(
      model,
      "image",
      "id: " + gltfTexture.id + ", bufferView: " + gltfTexture.bufferView
    );

    if (gltfTexture.mimeType === "image/ktx") {
      loadKTX(loadResources.getBuffer(bufferView))
        .then(imageLoad(model, gltfTexture.id, imageId))
        .otherwise(onerror);
      ++model._loadResources.pendingTextureLoads;
    } else if (gltfTexture.mimeType === "image/crn") {
      loadCRN(loadResources.getBuffer(bufferView))
        .then(imageLoad(model, gltfTexture.id, imageId))
        .otherwise(onerror);
      ++model._loadResources.pendingTextureLoads;
    } else {
      var onload = getOnImageCreatedFromTypedArray(loadResources, gltfTexture);
      loadImageFromTypedArray({
        uint8Array: loadResources.getBuffer(bufferView),
        format: gltfTexture.mimeType,
        flipY: false,
      })
        .then(onload)
        .otherwise(onerror);
      ++loadResources.pendingBufferViewToImage;
    }
  }
}

function createSamplers(model) {
  var loadResources = model._loadResources;
  if (loadResources.createSamplers) {
    loadResources.createSamplers = false;

    var rendererSamplers = model._rendererResources.samplers;
    ForEach.sampler(model.gltf, function (sampler, samplerId) {
      rendererSamplers[samplerId] = new Sampler({
        wrapS: sampler.wrapS,
        wrapT: sampler.wrapT,
        minificationFilter: sampler.minFilter,
        magnificationFilter: sampler.magFilter,
      });
    });
  }
}

///////////////////////////////////////////////////////////////////////////

var CreateTextureJob = function () {
  this.gltfTexture = undefined;
  this.model = undefined;
  this.context = undefined;
};

CreateTextureJob.prototype.set = function (gltfTexture, model, context) {
  this.gltfTexture = gltfTexture;
  this.model = model;
  this.context = context;
};

CreateTextureJob.prototype.execute = function () {
  createTexture(this.gltfTexture, this.model, this.context);
};

///////////////////////////////////////////////////////////////////////////

function createTexture(gltfTexture, model, context) {
  var textures = model.gltf.textures;
  var texture = textures[gltfTexture.id];

  var rendererSamplers = model._rendererResources.samplers;
  var sampler = rendererSamplers[texture.sampler];
  if (!defined(sampler)) {
    sampler = new Sampler({
      wrapS: TextureWrap.REPEAT,
      wrapT: TextureWrap.REPEAT,
    });
  }

  var usesTextureTransform = false;
  var materials = model.gltf.materials;
  var materialsLength = materials.length;
  for (var i = 0; i < materialsLength; ++i) {
    var material = materials[i];
    if (
      defined(material.extensions) &&
      defined(material.extensions.KHR_techniques_webgl)
    ) {
      var values = material.extensions.KHR_techniques_webgl.values;
      for (var valueName in values) {
        if (
          values.hasOwnProperty(valueName) &&
          valueName.indexOf("Texture") !== -1
        ) {
          var value = values[valueName];
          if (
            value.index === gltfTexture.id &&
            defined(value.extensions) &&
            defined(value.extensions.KHR_texture_transform)
          ) {
            usesTextureTransform = true;
            break;
          }
        }
      }
    }
    if (usesTextureTransform) {
      break;
    }
  }

  var wrapS = sampler.wrapS;
  var wrapT = sampler.wrapT;
  var minFilter = sampler.minificationFilter;

  if (
    usesTextureTransform &&
    minFilter !== TextureMinificationFilter.LINEAR &&
    minFilter !== TextureMinificationFilter.NEAREST
  ) {
    if (
      minFilter === TextureMinificationFilter.NEAREST_MIPMAP_NEAREST ||
      minFilter === TextureMinificationFilter.NEAREST_MIPMAP_LINEAR
    ) {
      minFilter = TextureMinificationFilter.NEAREST;
    } else {
      minFilter = TextureMinificationFilter.LINEAR;
    }

    sampler = new Sampler({
      wrapS: sampler.wrapS,
      wrapT: sampler.wrapT,
      textureMinificationFilter: minFilter,
      textureMagnificationFilter: sampler.magnificationFilter,
    });
  }

  var internalFormat = gltfTexture.internalFormat;

  var mipmap =
    !(
      defined(internalFormat) && PixelFormat.isCompressedFormat(internalFormat)
    ) &&
    (minFilter === TextureMinificationFilter.NEAREST_MIPMAP_NEAREST ||
      minFilter === TextureMinificationFilter.NEAREST_MIPMAP_LINEAR ||
      minFilter === TextureMinificationFilter.LINEAR_MIPMAP_NEAREST ||
      minFilter === TextureMinificationFilter.LINEAR_MIPMAP_LINEAR);
  var requiresNpot =
    mipmap ||
    wrapS === TextureWrap.REPEAT ||
    wrapS === TextureWrap.MIRRORED_REPEAT ||
    wrapT === TextureWrap.REPEAT ||
    wrapT === TextureWrap.MIRRORED_REPEAT;

  var tx;
  var source = gltfTexture.image;

  if (defined(internalFormat)) {
    tx = new Texture({
      context: context,
      source: {
        arrayBufferView: gltfTexture.bufferView,
      },
      width: gltfTexture.width,
      height: gltfTexture.height,
      pixelFormat: internalFormat,
      sampler: sampler,
    });
  } else if (defined(source)) {
    var npot =
      !CesiumMath.isPowerOfTwo(source.width) ||
      !CesiumMath.isPowerOfTwo(source.height);

    if (requiresNpot && npot) {
      // WebGL requires power-of-two texture dimensions for mipmapping and REPEAT/MIRRORED_REPEAT wrap modes.
      var canvas = document.createElement("canvas");
      canvas.width = CesiumMath.nextPowerOfTwo(source.width);
      canvas.height = CesiumMath.nextPowerOfTwo(source.height);
      var canvasContext = canvas.getContext("2d");
      canvasContext.drawImage(
        source,
        0,
        0,
        source.width,
        source.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
      source = canvas;
    }

    tx = new Texture({
      context: context,
      source: source,
      pixelFormat: texture.internalFormat,
      pixelDatatype: texture.type,
      sampler: sampler,
      flipY: false,
    });
    // GLTF_SPEC: Support TEXTURE_CUBE_MAP.  https://github.com/KhronosGroup/glTF/issues/40
    if (mipmap) {
      tx.generateMipmap();
    }
  }
  if (defined(tx)) {
    model._rendererResources.textures[gltfTexture.id] = tx;
    model._texturesByteLength += tx.sizeInBytes;
  }
}

var scratchCreateTextureJob = new CreateTextureJob();

function createTextures(model, frameState) {
  var context = frameState.context;
  var texturesToCreate = model._loadResources.texturesToCreate;

  if (model.asynchronous) {
    while (texturesToCreate.length > 0) {
      scratchCreateTextureJob.set(texturesToCreate.peek(), model, context);
      if (
        !frameState.jobScheduler.execute(
          scratchCreateTextureJob,
          JobType.TEXTURE
        )
      ) {
        break;
      }
      texturesToCreate.dequeue();
    }
  } else {
    // Create all loaded textures this frame
    while (texturesToCreate.length > 0) {
      createTexture(texturesToCreate.dequeue(), model, context);
    }
  }
}

function getAttributeLocations(model, primitive) {
  var techniques = model._sourceTechniques;

  // Retrieve the compiled shader program to assign index values to attributes
  var attributeLocations = {};

  var location;
  var index;
  var material = model._runtime.materialsById[primitive.material];
  if (!defined(material)) {
    return attributeLocations;
  }

  var technique = techniques[material._technique];
  if (!defined(technique)) {
    return attributeLocations;
  }

  var attributes = technique.attributes;
  var program = model._rendererResources.programs[technique.program];
  var programAttributeLocations = program._attributeLocations;

  for (location in programAttributeLocations) {
    if (programAttributeLocations.hasOwnProperty(location)) {
      var attribute = attributes[location];
      if (defined(attribute)) {
        index = programAttributeLocations[location];
        attributeLocations[attribute.semantic] = index;
      }
    }
  }

  // Add pre-created attributes.
  var precreatedAttributes = model._precreatedAttributes;
  if (defined(precreatedAttributes)) {
    for (location in precreatedAttributes) {
      if (precreatedAttributes.hasOwnProperty(location)) {
        index = programAttributeLocations[location];
        attributeLocations[location] = index;
      }
    }
  }

  return attributeLocations;
}

function createJoints(model, runtimeSkins) {
  var gltf = model.gltf;
  var skins = gltf.skins;
  var nodes = gltf.nodes;
  var runtimeNodes = model._runtime.nodes;

  var skinnedNodesIds = model._loadResources.skinnedNodesIds;
  var length = skinnedNodesIds.length;
  for (var j = 0; j < length; ++j) {
    var id = skinnedNodesIds[j];
    var skinnedNode = runtimeNodes[id];
    var node = nodes[id];

    var runtimeSkin = runtimeSkins[node.skin];
    skinnedNode.inverseBindMatrices = runtimeSkin.inverseBindMatrices;
    skinnedNode.bindShapeMatrix = runtimeSkin.bindShapeMatrix;

    var gltfJoints = skins[node.skin].joints;
    var jointsLength = gltfJoints.length;
    for (var i = 0; i < jointsLength; ++i) {
      var nodeId = gltfJoints[i];
      var jointNode = runtimeNodes[nodeId];
      skinnedNode.joints.push(jointNode);
    }
  }
}

function createSkins(model) {
  var loadResources = model._loadResources;

  if (loadResources.pendingBufferLoads !== 0) {
    return;
  }

  if (!loadResources.createSkins) {
    return;
  }
  loadResources.createSkins = false;

  var gltf = model.gltf;
  var accessors = gltf.accessors;
  var runtimeSkins = {};

  ForEach.skin(gltf, function (skin, id) {
    var accessor = accessors[skin.inverseBindMatrices];

    var bindShapeMatrix;
    if (!Matrix4.equals(skin.bindShapeMatrix, Matrix4.IDENTITY)) {
      bindShapeMatrix = Matrix4.clone(skin.bindShapeMatrix);
    }

    runtimeSkins[id] = {
      inverseBindMatrices: ModelAnimationCache.getSkinInverseBindMatrices(
        model,
        accessor
      ),
      bindShapeMatrix: bindShapeMatrix, // not used when undefined
    };
  });

  createJoints(model, runtimeSkins);
}

function getChannelEvaluator(model, runtimeNode, targetPath, spline) {
  return function (localAnimationTime) {
    if (defined(spline)) {
      localAnimationTime = model.clampAnimations
        ? spline.clampTime(localAnimationTime)
        : spline.wrapTime(localAnimationTime);
      runtimeNode[targetPath] = spline.evaluate(
        localAnimationTime,
        runtimeNode[targetPath]
      );
      runtimeNode.dirtyNumber = model._maxDirtyNumber;
    }
  };
}

function createRuntimeAnimations(model) {
  var loadResources = model._loadResources;

  if (!loadResources.finishedPendingBufferLoads()) {
    return;
  }

  if (!loadResources.createRuntimeAnimations) {
    return;
  }
  loadResources.createRuntimeAnimations = false;

  model._runtime.animations = [];

  var runtimeNodes = model._runtime.nodes;
  var accessors = model.gltf.accessors;

  ForEach.animation(model.gltf, function (animation, i) {
    var channels = animation.channels;
    var samplers = animation.samplers;

    // Find start and stop time for the entire animation
    var startTime = Number.MAX_VALUE;
    var stopTime = -Number.MAX_VALUE;

    var channelsLength = channels.length;
    var channelEvaluators = new Array(channelsLength);

    for (var j = 0; j < channelsLength; ++j) {
      var channel = channels[j];
      var target = channel.target;
      var path = target.path;
      var sampler = samplers[channel.sampler];
      var input = ModelAnimationCache.getAnimationParameterValues(
        model,
        accessors[sampler.input]
      );
      var output = ModelAnimationCache.getAnimationParameterValues(
        model,
        accessors[sampler.output]
      );

      startTime = Math.min(startTime, input[0]);
      stopTime = Math.max(stopTime, input[input.length - 1]);

      var spline = ModelAnimationCache.getAnimationSpline(
        model,
        i,
        animation,
        channel.sampler,
        sampler,
        input,
        path,
        output
      );

      channelEvaluators[j] = getChannelEvaluator(
        model,
        runtimeNodes[target.node],
        target.path,
        spline
      );
    }

    model._runtime.animations[i] = {
      name: animation.name,
      startTime: startTime,
      stopTime: stopTime,
      channelEvaluators: channelEvaluators,
    };
  });
}

function createVertexArrays(model, context) {
  var loadResources = model._loadResources;
  if (
    !loadResources.finishedBuffersCreation() ||
    !loadResources.finishedProgramCreation() ||
    !loadResources.createVertexArrays
  ) {
    return;
  }
  loadResources.createVertexArrays = false;

  var rendererBuffers = model._rendererResources.buffers;
  var rendererVertexArrays = model._rendererResources.vertexArrays;
  var gltf = model.gltf;
  var accessors = gltf.accessors;
  ForEach.mesh(gltf, function (mesh, meshId) {
    ForEach.meshPrimitive(mesh, function (primitive, primitiveId) {
      var attributes = [];
      var attributeLocation;
      var attributeLocations = getAttributeLocations(model, primitive);
      var decodedData =
        model._decodedData[meshId + ".primitive." + primitiveId];
      ForEach.meshPrimitiveAttribute(primitive, function (
        accessorId,
        attributeName
      ) {
        // Skip if the attribute is not used by the material, e.g., because the asset
        // was exported with an attribute that wasn't used and the asset wasn't optimized.
        attributeLocation = attributeLocations[attributeName];
        if (defined(attributeLocation)) {
          // Use attributes of previously decoded draco geometry
          if (defined(decodedData)) {
            var decodedAttributes = decodedData.attributes;
            if (decodedAttributes.hasOwnProperty(attributeName)) {
              var decodedAttribute = decodedAttributes[attributeName];
              attributes.push({
                index: attributeLocation,
                vertexBuffer: rendererBuffers[decodedAttribute.bufferView],
                componentsPerAttribute: decodedAttribute.componentsPerAttribute,
                componentDatatype: decodedAttribute.componentDatatype,
                normalize: decodedAttribute.normalized,
                offsetInBytes: decodedAttribute.byteOffset,
                strideInBytes: decodedAttribute.byteStride,
              });

              return;
            }
          }

          var a = accessors[accessorId];
          var normalize = defined(a.normalized) && a.normalized;
          attributes.push({
            index: attributeLocation,
            vertexBuffer: rendererBuffers[a.bufferView],
            componentsPerAttribute: numberOfComponentsForType(a.type),
            componentDatatype: a.componentType,
            normalize: normalize,
            offsetInBytes: a.byteOffset,
            strideInBytes: getAccessorByteStride(gltf, a),
          });
        }
      });

      // Add pre-created attributes
      var attribute;
      var attributeName;
      var precreatedAttributes = model._precreatedAttributes;
      if (defined(precreatedAttributes)) {
        for (attributeName in precreatedAttributes) {
          if (precreatedAttributes.hasOwnProperty(attributeName)) {
            attributeLocation = attributeLocations[attributeName];
            if (defined(attributeLocation)) {
              attribute = precreatedAttributes[attributeName];
              attribute.index = attributeLocation;
              attributes.push(attribute);
            }
          }
        }
      }

      var indexBuffer;
      if (defined(primitive.indices)) {
        var accessor = accessors[primitive.indices];
        var bufferView = accessor.bufferView;

        // Use buffer of previously decoded draco geometry
        if (defined(decodedData)) {
          bufferView = decodedData.bufferView;
        }

        indexBuffer = rendererBuffers[bufferView];
      }
      rendererVertexArrays[
        meshId + ".primitive." + primitiveId
      ] = new VertexArray({
        context: context,
        attributes: attributes,
        indexBuffer: indexBuffer,
      });
    });
  });
}

function createRenderStates(model) {
  var loadResources = model._loadResources;
  if (loadResources.createRenderStates) {
    loadResources.createRenderStates = false;

    ForEach.material(model.gltf, function (material, materialId) {
      createRenderStateForMaterial(model, material, materialId);
    });
  }
}

function createRenderStateForMaterial(model, material, materialId) {
  var rendererRenderStates = model._rendererResources.renderStates;

  var blendEquationSeparate = [
    WebGLConstants.FUNC_ADD,
    WebGLConstants.FUNC_ADD,
  ];
  var blendFuncSeparate = [
    WebGLConstants.ONE,
    WebGLConstants.ONE_MINUS_SRC_ALPHA,
    WebGLConstants.ONE,
    WebGLConstants.ONE_MINUS_SRC_ALPHA,
  ];

  if (defined(material.extensions) && defined(material.extensions.KHR_blend)) {
    blendEquationSeparate = material.extensions.KHR_blend.blendEquation;
    blendFuncSeparate = material.extensions.KHR_blend.blendFactors;
  }

  var enableCulling = !material.doubleSided;
  var blendingEnabled = material.alphaMode === "BLEND";
  rendererRenderStates[materialId] = RenderState.fromCache({
    cull: {
      enabled: enableCulling,
    },
    depthTest: {
      enabled: true,
      func: DepthFunction.LESS_OR_EQUAL,
    },
    depthMask: !blendingEnabled,
    blending: {
      enabled: blendingEnabled,
      equationRgb: blendEquationSeparate[0],
      equationAlpha: blendEquationSeparate[1],
      functionSourceRgb: blendFuncSeparate[0],
      functionDestinationRgb: blendFuncSeparate[1],
      functionSourceAlpha: blendFuncSeparate[2],
      functionDestinationAlpha: blendFuncSeparate[3],
    },
  });
}

///////////////////////////////////////////////////////////////////////////

var gltfUniformsFromNode = {
  MODEL: function (uniformState, model, runtimeNode) {
    return function () {
      return runtimeNode.computedMatrix;
    };
  },
  VIEW: function (uniformState, model, runtimeNode) {
    return function () {
      return uniformState.view;
    };
  },
  PROJECTION: function (uniformState, model, runtimeNode) {
    return function () {
      return uniformState.projection;
    };
  },
  MODELVIEW: function (uniformState, model, runtimeNode) {
    var mv = new Matrix4();
    return function () {
      return Matrix4.multiplyTransformation(
        uniformState.view,
        runtimeNode.computedMatrix,
        mv
      );
    };
  },
  CESIUM_RTC_MODELVIEW: function (uniformState, model, runtimeNode) {
    // CESIUM_RTC extension
    var mvRtc = new Matrix4();
    return function () {
      Matrix4.multiplyTransformation(
        uniformState.view,
        runtimeNode.computedMatrix,
        mvRtc
      );
      return Matrix4.setTranslation(mvRtc, model._rtcCenterEye, mvRtc);
    };
  },
  MODELVIEWPROJECTION: function (uniformState, model, runtimeNode) {
    var mvp = new Matrix4();
    return function () {
      Matrix4.multiplyTransformation(
        uniformState.view,
        runtimeNode.computedMatrix,
        mvp
      );
      return Matrix4.multiply(uniformState._projection, mvp, mvp);
    };
  },
  MODELINVERSE: function (uniformState, model, runtimeNode) {
    var mInverse = new Matrix4();
    return function () {
      return Matrix4.inverse(runtimeNode.computedMatrix, mInverse);
    };
  },
  VIEWINVERSE: function (uniformState, model) {
    return function () {
      return uniformState.inverseView;
    };
  },
  PROJECTIONINVERSE: function (uniformState, model, runtimeNode) {
    return function () {
      return uniformState.inverseProjection;
    };
  },
  MODELVIEWINVERSE: function (uniformState, model, runtimeNode) {
    var mv = new Matrix4();
    var mvInverse = new Matrix4();
    return function () {
      Matrix4.multiplyTransformation(
        uniformState.view,
        runtimeNode.computedMatrix,
        mv
      );
      return Matrix4.inverse(mv, mvInverse);
    };
  },
  MODELVIEWPROJECTIONINVERSE: function (uniformState, model, runtimeNode) {
    var mvp = new Matrix4();
    var mvpInverse = new Matrix4();
    return function () {
      Matrix4.multiplyTransformation(
        uniformState.view,
        runtimeNode.computedMatrix,
        mvp
      );
      Matrix4.multiply(uniformState._projection, mvp, mvp);
      return Matrix4.inverse(mvp, mvpInverse);
    };
  },
  MODELINVERSETRANSPOSE: function (uniformState, model, runtimeNode) {
    var mInverse = new Matrix4();
    var mInverseTranspose = new Matrix3();
    return function () {
      Matrix4.inverse(runtimeNode.computedMatrix, mInverse);
      Matrix4.getMatrix3(mInverse, mInverseTranspose);
      return Matrix3.transpose(mInverseTranspose, mInverseTranspose);
    };
  },
  MODELVIEWINVERSETRANSPOSE: function (uniformState, model, runtimeNode) {
    var mv = new Matrix4();
    var mvInverse = new Matrix4();
    var mvInverseTranspose = new Matrix3();
    return function () {
      Matrix4.multiplyTransformation(
        uniformState.view,
        runtimeNode.computedMatrix,
        mv
      );
      Matrix4.inverse(mv, mvInverse);
      Matrix4.getMatrix3(mvInverse, mvInverseTranspose);
      return Matrix3.transpose(mvInverseTranspose, mvInverseTranspose);
    };
  },
  VIEWPORT: function (uniformState, model, runtimeNode) {
    return function () {
      return uniformState.viewportCartesian4;
    };
  },
};

function getUniformFunctionFromSource(source, model, semantic, uniformState) {
  var runtimeNode = model._runtime.nodes[source];
  return gltfUniformsFromNode[semantic](uniformState, model, runtimeNode);
}

function createUniformsForMaterial(
  model,
  material,
  technique,
  instanceValues,
  context,
  textures,
  defaultTexture
) {
  var uniformMap = {};
  var uniformValues = {};
  var jointMatrixUniformName;
  var morphWeightsUniformName;

  ForEach.techniqueUniform(technique, function (uniform, uniformName) {
    // GLTF_SPEC: This does not take into account uniform arrays,
    // indicated by uniforms with a count property.
    //
    // https://github.com/KhronosGroup/glTF/issues/258

    // GLTF_SPEC: In this implementation, material parameters with a
    // semantic or targeted via a source (for animation) are not
    // targetable for material animations.  Is this too strict?
    //
    // https://github.com/KhronosGroup/glTF/issues/142

    var uv;
    if (defined(instanceValues) && defined(instanceValues[uniformName])) {
      // Parameter overrides by the instance technique
      uv = ModelUtility.createUniformFunction(
        uniform.type,
        instanceValues[uniformName],
        textures,
        defaultTexture
      );
      uniformMap[uniformName] = uv.func;
      uniformValues[uniformName] = uv;
    } else if (defined(uniform.node)) {
      uniformMap[uniformName] = getUniformFunctionFromSource(
        uniform.node,
        model,
        uniform.semantic,
        context.uniformState
      );
    } else if (defined(uniform.semantic)) {
      if (uniform.semantic === "JOINTMATRIX") {
        jointMatrixUniformName = uniformName;
      } else if (uniform.semantic === "MORPHWEIGHTS") {
        morphWeightsUniformName = uniformName;
      } else if (uniform.semantic === "ALPHACUTOFF") {
        // The material's alphaCutoff value uses a uniform with semantic ALPHACUTOFF.
        // A uniform with this semantic will ignore the instance or default values.
        var alphaMode = material.alphaMode;
        if (defined(alphaMode) && alphaMode === "MASK") {
          var alphaCutoffValue = defaultValue(material.alphaCutoff, 0.5);
          uv = ModelUtility.createUniformFunction(
            uniform.type,
            alphaCutoffValue,
            textures,
            defaultTexture
          );
          uniformMap[uniformName] = uv.func;
          uniformValues[uniformName] = uv;
        }
      } else {
        // Map glTF semantic to Cesium automatic uniform
        uniformMap[uniformName] = ModelUtility.getGltfSemanticUniforms()[
          uniform.semantic
        ](context.uniformState, model);
      }
    } else if (defined(uniform.value)) {
      // Technique value that isn't overridden by a material
      var uv2 = ModelUtility.createUniformFunction(
        uniform.type,
        uniform.value,
        textures,
        defaultTexture
      );
      uniformMap[uniformName] = uv2.func;
      uniformValues[uniformName] = uv2;
    }
  });

  return {
    map: uniformMap,
    values: uniformValues,
    jointMatrixUniformName: jointMatrixUniformName,
    morphWeightsUniformName: morphWeightsUniformName,
  };
}

function createUniformMaps(model, context) {
  var loadResources = model._loadResources;

  if (!loadResources.finishedProgramCreation()) {
    return;
  }

  if (!loadResources.createUniformMaps) {
    return;
  }
  loadResources.createUniformMaps = false;

  var gltf = model.gltf;
  var techniques = model._sourceTechniques;
  var uniformMaps = model._uniformMaps;

  var textures = model._rendererResources.textures;
  var defaultTexture = model._defaultTexture;

  ForEach.material(gltf, function (material, materialId) {
    var modelMaterial = model._runtime.materialsById[materialId];
    var technique = techniques[modelMaterial._technique];
    var instanceValues = modelMaterial._values;

    var uniforms = createUniformsForMaterial(
      model,
      material,
      technique,
      instanceValues,
      context,
      textures,
      defaultTexture
    );

    var u = uniformMaps[materialId];
    u.uniformMap = uniforms.map; // uniform name -> function for the renderer
    u.values = uniforms.values; // material parameter name -> ModelMaterial for modifying the parameter at runtime
    u.jointMatrixUniformName = uniforms.jointMatrixUniformName;
    u.morphWeightsUniformName = uniforms.morphWeightsUniformName;

    if (defined(technique.attributes.a_outlineCoordinates)) {
      var outlineTexture = ModelOutlineLoader.createTexture(model, context);
      u.uniformMap.u_outlineTexture = function () {
        return outlineTexture;
      };
    }
  });
}

function createUniformsForDracoQuantizedAttributes(decodedData) {
  return ModelUtility.createUniformsForDracoQuantizedAttributes(
    decodedData.attributes
  );
}

function createUniformsForQuantizedAttributes(model, primitive) {
  var programId = getProgramForPrimitive(model, primitive);
  var quantizedUniforms = model._quantizedUniforms[programId];
  return ModelUtility.createUniformsForQuantizedAttributes(
    model.gltf,
    primitive,
    quantizedUniforms
  );
}

function createPickColorFunction(color) {
  return function () {
    return color;
  };
}

function createJointMatricesFunction(runtimeNode) {
  return function () {
    return runtimeNode.computedJointMatrices;
  };
}

function createMorphWeightsFunction(runtimeNode) {
  return function () {
    return runtimeNode.weights;
  };
}

function createSilhouetteColorFunction(model) {
  return function () {
    return model.silhouetteColor;
  };
}

function createSilhouetteSizeFunction(model) {
  return function () {
    return model.silhouetteSize;
  };
}

function createColorFunction(model) {
  return function () {
    return model.color;
  };
}

function createClippingPlanesMatrixFunction(model) {
  return function () {
    return model._clippingPlanesMatrix;
  };
}

function createIBLReferenceFrameMatrixFunction(model) {
  return function () {
    return model._iblReferenceFrameMatrix;
  };
}

function createClippingPlanesFunction(model) {
  return function () {
    var clippingPlanes = model.clippingPlanes;
    return !defined(clippingPlanes) || !clippingPlanes.enabled
      ? model._defaultTexture
      : clippingPlanes.texture;
  };
}

function createClippingPlanesEdgeStyleFunction(model) {
  return function () {
    var clippingPlanes = model.clippingPlanes;
    if (!defined(clippingPlanes)) {
      return Color.WHITE.withAlpha(0.0);
    }

    var style = Color.clone(clippingPlanes.edgeColor);
    style.alpha = clippingPlanes.edgeWidth;
    return style;
  };
}

function createColorBlendFunction(model) {
  return function () {
    return ColorBlendMode.getColorBlend(
      model.colorBlendMode,
      model.colorBlendAmount
    );
  };
}

function createIBLFactorFunction(model) {
  return function () {
    return model._imageBasedLightingFactor;
  };
}

function createLightColorFunction(model) {
  return function () {
    return model._lightColor;
  };
}

function createLuminanceAtZenithFunction(model) {
  return function () {
    return model.luminanceAtZenith;
  };
}

function createSphericalHarmonicCoefficientsFunction(model) {
  return function () {
    return model._sphericalHarmonicCoefficients;
  };
}

function createSpecularEnvironmentMapFunction(model) {
  return function () {
    return model._specularEnvironmentMapAtlas.texture;
  };
}

function createSpecularEnvironmentMapSizeFunction(model) {
  return function () {
    return model._specularEnvironmentMapAtlas.texture.dimensions;
  };
}

function createSpecularEnvironmentMapLOD(model) {
  return function () {
    return model._specularEnvironmentMapAtlas.maximumMipmapLevel;
  };
}

function triangleCountFromPrimitiveIndices(primitive, indicesCount) {
  switch (primitive.mode) {
    case PrimitiveType.TRIANGLES:
      return indicesCount / 3;
    case PrimitiveType.TRIANGLE_STRIP:
    case PrimitiveType.TRIANGLE_FAN:
      return Math.max(indicesCount - 2, 0);
    default:
      return 0;
  }
}

function createCommand(model, gltfNode, runtimeNode, context, scene3DOnly) {
  var nodeCommands = model._nodeCommands;
  var pickIds = model._pickIds;
  var allowPicking = model.allowPicking;
  var runtimeMeshesByName = model._runtime.meshesByName;

  var resources = model._rendererResources;
  var rendererVertexArrays = resources.vertexArrays;
  var rendererPrograms = resources.programs;
  var rendererRenderStates = resources.renderStates;
  var uniformMaps = model._uniformMaps;

  var gltf = model.gltf;
  var accessors = gltf.accessors;
  var gltfMeshes = gltf.meshes;

  var id = gltfNode.mesh;
  var mesh = gltfMeshes[id];

  var primitives = mesh.primitives;
  var length = primitives.length;

  // The glTF node hierarchy is a DAG so a node can have more than one
  // parent, so a node may already have commands.  If so, append more
  // since they will have a different model matrix.

  for (var i = 0; i < length; ++i) {
    var primitive = primitives[i];
    var ix = accessors[primitive.indices];
    var material = model._runtime.materialsById[primitive.material];
    var programId = material._program;
    var decodedData = model._decodedData[id + ".primitive." + i];

    var boundingSphere;
    var positionAccessor = primitive.attributes.POSITION;
    if (defined(positionAccessor)) {
      var minMax = ModelUtility.getAccessorMinMax(gltf, positionAccessor);
      boundingSphere = BoundingSphere.fromCornerPoints(
        Cartesian3.fromArray(minMax.min),
        Cartesian3.fromArray(minMax.max)
      );
    }

    var vertexArray = rendererVertexArrays[id + ".primitive." + i];
    var offset;
    var count;

    // Use indices of the previously decoded Draco geometry.
    if (defined(decodedData)) {
      count = decodedData.numberOfIndices;
      offset = 0;
    } else if (defined(ix)) {
      count = ix.count;
      offset = ix.byteOffset / IndexDatatype.getSizeInBytes(ix.componentType); // glTF has offset in bytes.  Cesium has offsets in indices
    } else {
      var positions = accessors[primitive.attributes.POSITION];
      count = positions.count;
      offset = 0;
    }

    // Update model triangle count using number of indices
    model._trianglesLength += triangleCountFromPrimitiveIndices(
      primitive,
      count
    );

    if (primitive.mode === PrimitiveType.POINTS) {
      model._pointsLength += count;
    }

    var um = uniformMaps[primitive.material];
    var uniformMap = um.uniformMap;
    if (defined(um.jointMatrixUniformName)) {
      var jointUniformMap = {};
      jointUniformMap[um.jointMatrixUniformName] = createJointMatricesFunction(
        runtimeNode
      );

      uniformMap = combine(uniformMap, jointUniformMap);
    }
    if (defined(um.morphWeightsUniformName)) {
      var morphWeightsUniformMap = {};
      morphWeightsUniformMap[
        um.morphWeightsUniformName
      ] = createMorphWeightsFunction(runtimeNode);

      uniformMap = combine(uniformMap, morphWeightsUniformMap);
    }

    uniformMap = combine(uniformMap, {
      gltf_color: createColorFunction(model),
      gltf_colorBlend: createColorBlendFunction(model),
      gltf_clippingPlanes: createClippingPlanesFunction(model),
      gltf_clippingPlanesEdgeStyle: createClippingPlanesEdgeStyleFunction(
        model
      ),
      gltf_clippingPlanesMatrix: createClippingPlanesMatrixFunction(model),
      gltf_iblReferenceFrameMatrix: createIBLReferenceFrameMatrixFunction(
        model
      ),
      gltf_iblFactor: createIBLFactorFunction(model),
      gltf_lightColor: createLightColorFunction(model),
      gltf_sphericalHarmonicCoefficients: createSphericalHarmonicCoefficientsFunction(
        model
      ),
      gltf_specularMap: createSpecularEnvironmentMapFunction(model),
      gltf_specularMapSize: createSpecularEnvironmentMapSizeFunction(model),
      gltf_maxSpecularLOD: createSpecularEnvironmentMapLOD(model),
      gltf_luminanceAtZenith: createLuminanceAtZenithFunction(model),
    });

    // Allow callback to modify the uniformMap
    if (defined(model._uniformMapLoaded)) {
      uniformMap = model._uniformMapLoaded(uniformMap, programId, runtimeNode);
    }

    // Add uniforms for decoding quantized attributes if used
    var quantizedUniformMap = {};
    if (model.extensionsUsed.WEB3D_quantized_attributes) {
      quantizedUniformMap = createUniformsForQuantizedAttributes(
        model,
        primitive
      );
    } else if (model._dequantizeInShader && defined(decodedData)) {
      quantizedUniformMap = createUniformsForDracoQuantizedAttributes(
        decodedData
      );
    }
    uniformMap = combine(uniformMap, quantizedUniformMap);

    var rs = rendererRenderStates[primitive.material];
    var isTranslucent = rs.blending.enabled;

    var owner = model._pickObject;
    if (!defined(owner)) {
      owner = {
        primitive: model,
        id: model.id,
        node: runtimeNode.publicNode,
        mesh: runtimeMeshesByName[mesh.name],
      };
    }

    var castShadows = ShadowMode.castShadows(model._shadows);
    var receiveShadows = ShadowMode.receiveShadows(model._shadows);

    var pickId;
    if (allowPicking && !defined(model._uniformMapLoaded)) {
      pickId = context.createPickId(owner);
      pickIds.push(pickId);
      var pickUniforms = {
        czm_pickColor: createPickColorFunction(pickId.color),
      };
      uniformMap = combine(uniformMap, pickUniforms);
    }

    if (allowPicking) {
      if (defined(model._pickIdLoaded) && defined(model._uniformMapLoaded)) {
        pickId = model._pickIdLoaded();
      } else {
        pickId = "czm_pickColor";
      }
    }

    var command = new DrawCommand({
      boundingVolume: new BoundingSphere(), // updated in update()
      cull: model.cull,
      modelMatrix: new Matrix4(), // computed in update()
      primitiveType: primitive.mode,
      vertexArray: vertexArray,
      count: count,
      offset: offset,
      shaderProgram: rendererPrograms[programId],
      castShadows: castShadows,
      receiveShadows: receiveShadows,
      uniformMap: uniformMap,
      renderState: rs,
      owner: owner,
      pass: isTranslucent ? Pass.TRANSLUCENT : model.opaquePass,
      pickId: pickId,
    });

    var command2D;
    if (!scene3DOnly) {
      command2D = DrawCommand.shallowClone(command);
      command2D.boundingVolume = new BoundingSphere(); // updated in update()
      command2D.modelMatrix = new Matrix4(); // updated in update()
    }

    var nodeCommand = {
      show: true,
      boundingSphere: boundingSphere,
      command: command,
      command2D: command2D,
      // Generated on demand when silhouette size is greater than 0.0 and silhouette alpha is greater than 0.0
      silhouetteModelCommand: undefined,
      silhouetteModelCommand2D: undefined,
      silhouetteColorCommand: undefined,
      silhouetteColorCommand2D: undefined,
      // Generated on demand when color alpha is less than 1.0
      translucentCommand: undefined,
      translucentCommand2D: undefined,
      // Generated on demand when back face culling is false
      disableCullingCommand: undefined,
      disableCullingCommand2D: undefined,
      // For updating node commands on shader reconstruction
      programId: programId,
    };
    runtimeNode.commands.push(nodeCommand);
    nodeCommands.push(nodeCommand);
  }
}

function createRuntimeNodes(model, context, scene3DOnly) {
  var loadResources = model._loadResources;

  if (!loadResources.finishedEverythingButTextureCreation()) {
    return;
  }

  if (!loadResources.createRuntimeNodes) {
    return;
  }
  loadResources.createRuntimeNodes = false;

  var rootNodes = [];
  var runtimeNodes = model._runtime.nodes;

  var gltf = model.gltf;
  var nodes = gltf.nodes;

  var scene = gltf.scenes[gltf.scene];
  var sceneNodes = scene.nodes;
  var length = sceneNodes.length;

  var stack = [];
  var seen = {};

  for (var i = 0; i < length; ++i) {
    stack.push({
      parentRuntimeNode: undefined,
      gltfNode: nodes[sceneNodes[i]],
      id: sceneNodes[i],
    });

    while (stack.length > 0) {
      var n = stack.pop();
      seen[n.id] = true;
      var parentRuntimeNode = n.parentRuntimeNode;
      var gltfNode = n.gltfNode;

      // Node hierarchy is a DAG so a node can have more than one parent so it may already exist
      var runtimeNode = runtimeNodes[n.id];
      if (runtimeNode.parents.length === 0) {
        if (defined(gltfNode.matrix)) {
          runtimeNode.matrix = Matrix4.fromColumnMajorArray(gltfNode.matrix);
        } else {
          // TRS converted to Cesium types
          var rotation = gltfNode.rotation;
          runtimeNode.translation = Cartesian3.fromArray(gltfNode.translation);
          runtimeNode.rotation = Quaternion.unpack(rotation);
          runtimeNode.scale = Cartesian3.fromArray(gltfNode.scale);
        }
      }

      if (defined(parentRuntimeNode)) {
        parentRuntimeNode.children.push(runtimeNode);
        runtimeNode.parents.push(parentRuntimeNode);
      } else {
        rootNodes.push(runtimeNode);
      }

      if (defined(gltfNode.mesh)) {
        createCommand(model, gltfNode, runtimeNode, context, scene3DOnly);
      }

      var children = gltfNode.children;
      if (defined(children)) {
        var childrenLength = children.length;
        for (var j = 0; j < childrenLength; j++) {
          var childId = children[j];
          if (!seen[childId]) {
            stack.push({
              parentRuntimeNode: runtimeNode,
              gltfNode: nodes[childId],
              id: children[j],
            });
          }
        }
      }
    }
  }

  model._runtime.rootNodes = rootNodes;
  model._runtime.nodes = runtimeNodes;
}

function getGeometryByteLength(buffers) {
  var memory = 0;
  for (var id in buffers) {
    if (buffers.hasOwnProperty(id)) {
      memory += buffers[id].sizeInBytes;
    }
  }
  return memory;
}

function getTexturesByteLength(textures) {
  var memory = 0;
  for (var id in textures) {
    if (textures.hasOwnProperty(id)) {
      memory += textures[id].sizeInBytes;
    }
  }
  return memory;
}

function createResources(model, frameState) {
  var context = frameState.context;
  var scene3DOnly = frameState.scene3DOnly;
  var quantizedVertexShaders = model._quantizedVertexShaders;
  var techniques = model._sourceTechniques;
  var programs = model._sourcePrograms;

  var resources = model._rendererResources;
  var shaders = resources.sourceShaders;
  if (model._loadRendererResourcesFromCache) {
    shaders = resources.sourceShaders =
      model._cachedRendererResources.sourceShaders;
  }

  for (var techniqueId in techniques) {
    if (techniques.hasOwnProperty(techniqueId)) {
      var programId = techniques[techniqueId].program;
      var program = programs[programId];
      var shader = shaders[program.vertexShader];

      ModelUtility.checkSupportedGlExtensions(program.glExtensions, context);

      if (
        model.extensionsUsed.WEB3D_quantized_attributes ||
        model._dequantizeInShader
      ) {
        var quantizedVS = quantizedVertexShaders[programId];
        if (!defined(quantizedVS)) {
          quantizedVS = modifyShaderForQuantizedAttributes(
            shader,
            programId,
            model
          );
          quantizedVertexShaders[programId] = quantizedVS;
        }
        shader = quantizedVS;
      }

      shader = modifyShader(shader, programId, model._vertexShaderLoaded);
    }
  }

  if (model._loadRendererResourcesFromCache) {
    var cachedResources = model._cachedRendererResources;

    resources.buffers = cachedResources.buffers;
    resources.vertexArrays = cachedResources.vertexArrays;
    resources.programs = cachedResources.programs;
    resources.silhouettePrograms = cachedResources.silhouettePrograms;
    resources.textures = cachedResources.textures;
    resources.samplers = cachedResources.samplers;
    resources.renderStates = cachedResources.renderStates;

    // Vertex arrays are unique to this model, create instead of using the cache.
    if (defined(model._precreatedAttributes)) {
      createVertexArrays(model, context);
    }

    model._cachedGeometryByteLength += getGeometryByteLength(
      cachedResources.buffers
    );
    model._cachedTexturesByteLength += getTexturesByteLength(
      cachedResources.textures
    );
  } else {
    createBuffers(model, frameState); // using glTF bufferViews
    createPrograms(model, frameState);
    createSamplers(model, context);
    loadTexturesFromBufferViews(model);
    createTextures(model, frameState);
  }

  createSkins(model);
  createRuntimeAnimations(model);

  if (!model._loadRendererResourcesFromCache) {
    createVertexArrays(model, context); // using glTF meshes
    createRenderStates(model); // using glTF materials/techniques/states
    // Long-term, we might not cache render states if they could change
    // due to an animation, e.g., a uniform going from opaque to transparent.
    // Could use copy-on-write if it is worth it.  Probably overkill.
  }

  createUniformMaps(model, context); // using glTF materials/techniques
  createRuntimeNodes(model, context, scene3DOnly); // using glTF scene
}

///////////////////////////////////////////////////////////////////////////

function getNodeMatrix(node, result) {
  var publicNode = node.publicNode;
  var publicMatrix = publicNode.matrix;

  if (publicNode.useMatrix && defined(publicMatrix)) {
    // Public matrix overrides original glTF matrix and glTF animations
    Matrix4.clone(publicMatrix, result);
  } else if (defined(node.matrix)) {
    Matrix4.clone(node.matrix, result);
  } else {
    Matrix4.fromTranslationQuaternionRotationScale(
      node.translation,
      node.rotation,
      node.scale,
      result
    );
    // Keep matrix returned by the node in-sync if the node is targeted by an animation.  Only TRS nodes can be targeted.
    publicNode.setMatrix(result);
  }
}

var scratchNodeStack = [];
var scratchComputedTranslation = new Cartesian4();
var scratchComputedMatrixIn2D = new Matrix4();

function updateNodeHierarchyModelMatrix(
  model,
  modelTransformChanged,
  justLoaded,
  projection
) {
  var maxDirtyNumber = model._maxDirtyNumber;

  var rootNodes = model._runtime.rootNodes;
  var length = rootNodes.length;

  var nodeStack = scratchNodeStack;
  var computedModelMatrix = model._computedModelMatrix;

  if (model._mode !== SceneMode.SCENE3D && !model._ignoreCommands) {
    var translation = Matrix4.getColumn(
      computedModelMatrix,
      3,
      scratchComputedTranslation
    );
    if (!Cartesian4.equals(translation, Cartesian4.UNIT_W)) {
      computedModelMatrix = Transforms.basisTo2D(
        projection,
        computedModelMatrix,
        scratchComputedMatrixIn2D
      );
      model._rtcCenter = model._rtcCenter3D;
    } else {
      var center = model.boundingSphere.center;
      var to2D = Transforms.wgs84To2DModelMatrix(
        projection,
        center,
        scratchComputedMatrixIn2D
      );
      computedModelMatrix = Matrix4.multiply(
        to2D,
        computedModelMatrix,
        scratchComputedMatrixIn2D
      );

      if (defined(model._rtcCenter)) {
        Matrix4.setTranslation(
          computedModelMatrix,
          Cartesian4.UNIT_W,
          computedModelMatrix
        );
        model._rtcCenter = model._rtcCenter2D;
      }
    }
  }

  for (var i = 0; i < length; ++i) {
    var n = rootNodes[i];

    getNodeMatrix(n, n.transformToRoot);
    nodeStack.push(n);

    while (nodeStack.length > 0) {
      n = nodeStack.pop();
      var transformToRoot = n.transformToRoot;
      var commands = n.commands;

      if (
        n.dirtyNumber === maxDirtyNumber ||
        modelTransformChanged ||
        justLoaded
      ) {
        var nodeMatrix = Matrix4.multiplyTransformation(
          computedModelMatrix,
          transformToRoot,
          n.computedMatrix
        );
        var commandsLength = commands.length;
        if (commandsLength > 0) {
          // Node has meshes, which has primitives.  Update their commands.
          for (var j = 0; j < commandsLength; ++j) {
            var primitiveCommand = commands[j];
            var command = primitiveCommand.command;
            Matrix4.clone(nodeMatrix, command.modelMatrix);

            // PERFORMANCE_IDEA: Can use transformWithoutScale if no node up to the root has scale (including animation)
            BoundingSphere.transform(
              primitiveCommand.boundingSphere,
              command.modelMatrix,
              command.boundingVolume
            );

            if (defined(model._rtcCenter)) {
              Cartesian3.add(
                model._rtcCenter,
                command.boundingVolume.center,
                command.boundingVolume.center
              );
            }

            // If the model crosses the IDL in 2D, it will be drawn in one viewport, but part of it
            // will be clipped by the viewport. We create a second command that translates the model
            // model matrix to the opposite side of the map so the part that was clipped in one viewport
            // is drawn in the other.
            command = primitiveCommand.command2D;
            if (defined(command) && model._mode === SceneMode.SCENE2D) {
              Matrix4.clone(nodeMatrix, command.modelMatrix);
              command.modelMatrix[13] -=
                CesiumMath.sign(command.modelMatrix[13]) *
                2.0 *
                CesiumMath.PI *
                projection.ellipsoid.maximumRadius;
              BoundingSphere.transform(
                primitiveCommand.boundingSphere,
                command.modelMatrix,
                command.boundingVolume
              );
            }
          }
        }
      }

      var children = n.children;
      if (defined(children)) {
        var childrenLength = children.length;
        for (var k = 0; k < childrenLength; ++k) {
          var child = children[k];

          // A node's transform needs to be updated if
          // - It was targeted for animation this frame, or
          // - Any of its ancestors were targeted for animation this frame

          // PERFORMANCE_IDEA: if a child has multiple parents and only one of the parents
          // is dirty, all the subtrees for each child instance will be dirty; we probably
          // won't see this in the wild often.
          child.dirtyNumber = Math.max(child.dirtyNumber, n.dirtyNumber);

          if (child.dirtyNumber === maxDirtyNumber || justLoaded) {
            // Don't check for modelTransformChanged since if only the model's model matrix changed,
            // we do not need to rebuild the local transform-to-root, only the final
            // [model's-model-matrix][transform-to-root] above.
            getNodeMatrix(child, child.transformToRoot);
            Matrix4.multiplyTransformation(
              transformToRoot,
              child.transformToRoot,
              child.transformToRoot
            );
          }

          nodeStack.push(child);
        }
      }
    }
  }

  ++model._maxDirtyNumber;
}

var scratchObjectSpace = new Matrix4();

function applySkins(model) {
  var skinnedNodes = model._runtime.skinnedNodes;
  var length = skinnedNodes.length;

  for (var i = 0; i < length; ++i) {
    var node = skinnedNodes[i];

    scratchObjectSpace = Matrix4.inverseTransformation(
      node.transformToRoot,
      scratchObjectSpace
    );

    var computedJointMatrices = node.computedJointMatrices;
    var joints = node.joints;
    var bindShapeMatrix = node.bindShapeMatrix;
    var inverseBindMatrices = node.inverseBindMatrices;
    var inverseBindMatricesLength = inverseBindMatrices.length;

    for (var m = 0; m < inverseBindMatricesLength; ++m) {
      // [joint-matrix] = [node-to-root^-1][joint-to-root][inverse-bind][bind-shape]
      if (!defined(computedJointMatrices[m])) {
        computedJointMatrices[m] = new Matrix4();
      }
      computedJointMatrices[m] = Matrix4.multiplyTransformation(
        scratchObjectSpace,
        joints[m].transformToRoot,
        computedJointMatrices[m]
      );
      computedJointMatrices[m] = Matrix4.multiplyTransformation(
        computedJointMatrices[m],
        inverseBindMatrices[m],
        computedJointMatrices[m]
      );
      if (defined(bindShapeMatrix)) {
        // NOTE: bindShapeMatrix is glTF 1.0 only, removed in glTF 2.0.
        computedJointMatrices[m] = Matrix4.multiplyTransformation(
          computedJointMatrices[m],
          bindShapeMatrix,
          computedJointMatrices[m]
        );
      }
    }
  }
}

function updatePerNodeShow(model) {
  // Totally not worth it, but we could optimize this:
  // http://help.agi.com/AGIComponents/html/BlogDeletionInBoundingVolumeHierarchies.htm

  var rootNodes = model._runtime.rootNodes;
  var length = rootNodes.length;

  var nodeStack = scratchNodeStack;

  for (var i = 0; i < length; ++i) {
    var n = rootNodes[i];
    n.computedShow = n.publicNode.show;
    nodeStack.push(n);

    while (nodeStack.length > 0) {
      n = nodeStack.pop();
      var show = n.computedShow;

      var nodeCommands = n.commands;
      var nodeCommandsLength = nodeCommands.length;
      for (var j = 0; j < nodeCommandsLength; ++j) {
        nodeCommands[j].show = show;
      }
      // if commandsLength is zero, the node has a light or camera

      var children = n.children;
      if (defined(children)) {
        var childrenLength = children.length;
        for (var k = 0; k < childrenLength; ++k) {
          var child = children[k];
          // Parent needs to be shown for child to be shown.
          child.computedShow = show && child.publicNode.show;
          nodeStack.push(child);
        }
      }
    }
  }
}

function updatePickIds(model, context) {
  var id = model.id;
  if (model._id !== id) {
    model._id = id;

    var pickIds = model._pickIds;
    var length = pickIds.length;
    for (var i = 0; i < length; ++i) {
      pickIds[i].object.id = id;
    }
  }
}

function updateWireframe(model) {
  if (model._debugWireframe !== model.debugWireframe) {
    model._debugWireframe = model.debugWireframe;

    // This assumes the original primitive was TRIANGLES and that the triangles
    // are connected for the wireframe to look perfect.
    var primitiveType = model.debugWireframe
      ? PrimitiveType.LINES
      : PrimitiveType.TRIANGLES;
    var nodeCommands = model._nodeCommands;
    var length = nodeCommands.length;

    for (var i = 0; i < length; ++i) {
      nodeCommands[i].command.primitiveType = primitiveType;
    }
  }
}

function updateShowBoundingVolume(model) {
  if (model.debugShowBoundingVolume !== model._debugShowBoundingVolume) {
    model._debugShowBoundingVolume = model.debugShowBoundingVolume;

    var debugShowBoundingVolume = model.debugShowBoundingVolume;
    var nodeCommands = model._nodeCommands;
    var length = nodeCommands.length;

    for (var i = 0; i < length; ++i) {
      nodeCommands[i].command.debugShowBoundingVolume = debugShowBoundingVolume;
    }
  }
}

function updateShadows(model) {
  if (model.shadows !== model._shadows) {
    model._shadows = model.shadows;

    var castShadows = ShadowMode.castShadows(model.shadows);
    var receiveShadows = ShadowMode.receiveShadows(model.shadows);
    var nodeCommands = model._nodeCommands;
    var length = nodeCommands.length;

    for (var i = 0; i < length; i++) {
      var nodeCommand = nodeCommands[i];
      nodeCommand.command.castShadows = castShadows;
      nodeCommand.command.receiveShadows = receiveShadows;
    }
  }
}

function getTranslucentRenderState(model, renderState) {
  var rs = clone(renderState, true);
  rs.cull.enabled = false;
  rs.depthTest.enabled = true;
  rs.depthMask = false;
  rs.blending = BlendingState.ALPHA_BLEND;

  if (model.opaquePass === Pass.CESIUM_3D_TILE) {
    rs.stencilTest = StencilConstants.setCesium3DTileBit();
    rs.stencilMask = StencilConstants.CESIUM_3D_TILE_MASK;
  }

  return RenderState.fromCache(rs);
}

function deriveTranslucentCommand(model, command) {
  var translucentCommand = DrawCommand.shallowClone(command);
  translucentCommand.pass = Pass.TRANSLUCENT;
  translucentCommand.renderState = getTranslucentRenderState(
    model,
    command.renderState
  );
  return translucentCommand;
}

function updateColor(model, frameState, forceDerive) {
  // Generate translucent commands when the blend color has an alpha in the range (0.0, 1.0) exclusive
  var scene3DOnly = frameState.scene3DOnly;
  var alpha = model.color.alpha;
  if (alpha > 0.0 && alpha < 1.0) {
    var nodeCommands = model._nodeCommands;
    var length = nodeCommands.length;
    if (
      length > 0 &&
      (!defined(nodeCommands[0].translucentCommand) || forceDerive)
    ) {
      for (var i = 0; i < length; ++i) {
        var nodeCommand = nodeCommands[i];
        var command = nodeCommand.command;
        nodeCommand.translucentCommand = deriveTranslucentCommand(
          model,
          command
        );
        if (!scene3DOnly) {
          var command2D = nodeCommand.command2D;
          nodeCommand.translucentCommand2D = deriveTranslucentCommand(
            model,
            command2D
          );
        }
      }
    }
  }
}

function getDisableCullingRenderState(renderState) {
  var rs = clone(renderState, true);
  rs.cull.enabled = false;
  return RenderState.fromCache(rs);
}

function deriveDisableCullingCommand(command) {
  var disableCullingCommand = DrawCommand.shallowClone(command);
  disableCullingCommand.renderState = getDisableCullingRenderState(
    command.renderState
  );
  return disableCullingCommand;
}

function updateBackFaceCulling(model, frameState, forceDerive) {
  var scene3DOnly = frameState.scene3DOnly;
  var backFaceCulling = model.backFaceCulling;
  if (!backFaceCulling) {
    var nodeCommands = model._nodeCommands;
    var length = nodeCommands.length;
    if (
      length > 0 &&
      (!defined(nodeCommands[0].disableCullingCommand) || forceDerive)
    ) {
      for (var i = 0; i < length; ++i) {
        var nodeCommand = nodeCommands[i];
        var command = nodeCommand.command;
        nodeCommand.disableCullingCommand = deriveDisableCullingCommand(
          command
        );
        if (!scene3DOnly) {
          var command2D = nodeCommand.command2D;
          nodeCommand.disableCullingCommand2D = deriveDisableCullingCommand(
            command2D
          );
        }
      }
    }
  }
}

function getProgramId(model, program) {
  var programs = model._rendererResources.programs;
  for (var id in programs) {
    if (programs.hasOwnProperty(id)) {
      if (programs[id] === program) {
        return id;
      }
    }
  }
}

function createSilhouetteProgram(model, program, frameState) {
  var vs = program.vertexShaderSource.sources[0];
  var attributeLocations = program._attributeLocations;
  var normalAttributeName = model._normalAttributeName;

  // Modified from http://forum.unity3d.com/threads/toon-outline-but-with-diffuse-surface.24668/
  vs = ShaderSource.replaceMain(vs, "gltf_silhouette_main");
  vs +=
    "uniform float gltf_silhouetteSize; \n" +
    "void main() \n" +
    "{ \n" +
    "    gltf_silhouette_main(); \n" +
    "    vec3 n = normalize(czm_normal3D * " +
    normalAttributeName +
    "); \n" +
    "    n.x *= czm_projection[0][0]; \n" +
    "    n.y *= czm_projection[1][1]; \n" +
    "    vec4 clip = gl_Position; \n" +
    "    clip.xy += n.xy * clip.w * gltf_silhouetteSize * czm_pixelRatio / czm_viewport.z; \n" +
    "    gl_Position = clip; \n" +
    "}";

  var fs =
    "uniform vec4 gltf_silhouetteColor; \n" +
    "void main() \n" +
    "{ \n" +
    "    gl_FragColor = czm_gammaCorrect(gltf_silhouetteColor); \n" +
    "}";

  return ShaderProgram.fromCache({
    context: frameState.context,
    vertexShaderSource: vs,
    fragmentShaderSource: fs,
    attributeLocations: attributeLocations,
  });
}

function hasSilhouette(model, frameState) {
  return (
    silhouetteSupported(frameState.context) &&
    model.silhouetteSize > 0.0 &&
    model.silhouetteColor.alpha > 0.0 &&
    defined(model._normalAttributeName)
  );
}

function hasTranslucentCommands(model) {
  var nodeCommands = model._nodeCommands;
  var length = nodeCommands.length;
  for (var i = 0; i < length; ++i) {
    var nodeCommand = nodeCommands[i];
    var command = nodeCommand.command;
    if (command.pass === Pass.TRANSLUCENT) {
      return true;
    }
  }
  return false;
}

function isTranslucent(model) {
  return model.color.alpha > 0.0 && model.color.alpha < 1.0;
}

function isInvisible(model) {
  return model.color.alpha === 0.0;
}

function alphaDirty(currAlpha, prevAlpha) {
  // Returns whether the alpha state has changed between invisible, translucent, or opaque
  return (
    Math.floor(currAlpha) !== Math.floor(prevAlpha) ||
    Math.ceil(currAlpha) !== Math.ceil(prevAlpha)
  );
}

var silhouettesLength = 0;

function createSilhouetteCommands(model, frameState) {
  // Wrap around after exceeding the 8-bit stencil limit.
  // The reference is unique to each model until this point.
  var stencilReference = ++silhouettesLength % 255;

  // If the model is translucent the silhouette needs to be in the translucent pass.
  // Otherwise the silhouette would be rendered before the model.
  var silhouetteTranslucent =
    hasTranslucentCommands(model) ||
    isTranslucent(model) ||
    model.silhouetteColor.alpha < 1.0;
  var silhouettePrograms = model._rendererResources.silhouettePrograms;
  var scene3DOnly = frameState.scene3DOnly;
  var nodeCommands = model._nodeCommands;
  var length = nodeCommands.length;
  for (var i = 0; i < length; ++i) {
    var nodeCommand = nodeCommands[i];
    var command = nodeCommand.command;

    // Create model command
    var modelCommand = isTranslucent(model)
      ? nodeCommand.translucentCommand
      : command;
    var silhouetteModelCommand = DrawCommand.shallowClone(modelCommand);
    var renderState = clone(modelCommand.renderState);

    // Write the reference value into the stencil buffer.
    renderState.stencilTest = {
      enabled: true,
      frontFunction: WebGLConstants.ALWAYS,
      backFunction: WebGLConstants.ALWAYS,
      reference: stencilReference,
      mask: ~0,
      frontOperation: {
        fail: WebGLConstants.KEEP,
        zFail: WebGLConstants.KEEP,
        zPass: WebGLConstants.REPLACE,
      },
      backOperation: {
        fail: WebGLConstants.KEEP,
        zFail: WebGLConstants.KEEP,
        zPass: WebGLConstants.REPLACE,
      },
    };

    if (isInvisible(model)) {
      // When the model is invisible disable color and depth writes but still write into the stencil buffer
      renderState.colorMask = {
        red: false,
        green: false,
        blue: false,
        alpha: false,
      };
      renderState.depthMask = false;
    }
    renderState = RenderState.fromCache(renderState);
    silhouetteModelCommand.renderState = renderState;
    nodeCommand.silhouetteModelCommand = silhouetteModelCommand;

    // Create color command
    var silhouetteColorCommand = DrawCommand.shallowClone(command);
    renderState = clone(command.renderState, true);
    renderState.depthTest.enabled = true;
    renderState.cull.enabled = false;
    if (silhouetteTranslucent) {
      silhouetteColorCommand.pass = Pass.TRANSLUCENT;
      renderState.depthMask = false;
      renderState.blending = BlendingState.ALPHA_BLEND;
    }

    // Only render silhouette if the value in the stencil buffer equals the reference
    renderState.stencilTest = {
      enabled: true,
      frontFunction: WebGLConstants.NOTEQUAL,
      backFunction: WebGLConstants.NOTEQUAL,
      reference: stencilReference,
      mask: ~0,
      frontOperation: {
        fail: WebGLConstants.KEEP,
        zFail: WebGLConstants.KEEP,
        zPass: WebGLConstants.KEEP,
      },
      backOperation: {
        fail: WebGLConstants.KEEP,
        zFail: WebGLConstants.KEEP,
        zPass: WebGLConstants.KEEP,
      },
    };
    renderState = RenderState.fromCache(renderState);

    // If the silhouette program has already been cached use it
    var program = command.shaderProgram;
    var id = getProgramId(model, program);
    var silhouetteProgram = silhouettePrograms[id];
    if (!defined(silhouetteProgram)) {
      silhouetteProgram = createSilhouetteProgram(model, program, frameState);
      silhouettePrograms[id] = silhouetteProgram;
    }

    var silhouetteUniformMap = combine(command.uniformMap, {
      gltf_silhouetteColor: createSilhouetteColorFunction(model),
      gltf_silhouetteSize: createSilhouetteSizeFunction(model),
    });

    silhouetteColorCommand.renderState = renderState;
    silhouetteColorCommand.shaderProgram = silhouetteProgram;
    silhouetteColorCommand.uniformMap = silhouetteUniformMap;
    silhouetteColorCommand.castShadows = false;
    silhouetteColorCommand.receiveShadows = false;
    nodeCommand.silhouetteColorCommand = silhouetteColorCommand;

    if (!scene3DOnly) {
      var command2D = nodeCommand.command2D;
      var silhouetteModelCommand2D = DrawCommand.shallowClone(
        silhouetteModelCommand
      );
      silhouetteModelCommand2D.boundingVolume = command2D.boundingVolume;
      silhouetteModelCommand2D.modelMatrix = command2D.modelMatrix;
      nodeCommand.silhouetteModelCommand2D = silhouetteModelCommand2D;

      var silhouetteColorCommand2D = DrawCommand.shallowClone(
        silhouetteColorCommand
      );
      silhouetteModelCommand2D.boundingVolume = command2D.boundingVolume;
      silhouetteModelCommand2D.modelMatrix = command2D.modelMatrix;
      nodeCommand.silhouetteColorCommand2D = silhouetteColorCommand2D;
    }
  }
}

function modifyShaderForClippingPlanes(
  shader,
  clippingPlaneCollection,
  context
) {
  shader = ShaderSource.replaceMain(shader, "gltf_clip_main");
  shader += Model._getClippingFunction(clippingPlaneCollection, context) + "\n";
  shader +=
    "uniform highp sampler2D gltf_clippingPlanes; \n" +
    "uniform mat4 gltf_clippingPlanesMatrix; \n" +
    "uniform vec4 gltf_clippingPlanesEdgeStyle; \n" +
    "void main() \n" +
    "{ \n" +
    "    gltf_clip_main(); \n" +
    getClipAndStyleCode(
      "gltf_clippingPlanes",
      "gltf_clippingPlanesMatrix",
      "gltf_clippingPlanesEdgeStyle"
    ) +
    "} \n";
  return shader;
}

function updateSilhouette(model, frameState, force) {
  // Generate silhouette commands when the silhouette size is greater than 0.0 and the alpha is greater than 0.0
  // There are two silhouette commands:
  //     1. silhouetteModelCommand : render model normally while enabling stencil mask
  //     2. silhouetteColorCommand : render enlarged model with a solid color while enabling stencil tests
  if (!hasSilhouette(model, frameState)) {
    return;
  }

  var nodeCommands = model._nodeCommands;
  var dirty =
    nodeCommands.length > 0 &&
    (alphaDirty(model.color.alpha, model._colorPreviousAlpha) ||
      alphaDirty(
        model.silhouetteColor.alpha,
        model._silhouetteColorPreviousAlpha
      ) ||
      !defined(nodeCommands[0].silhouetteModelCommand));

  model._colorPreviousAlpha = model.color.alpha;
  model._silhouetteColorPreviousAlpha = model.silhouetteColor.alpha;

  if (dirty || force) {
    createSilhouetteCommands(model, frameState);
  }
}

function updateClippingPlanes(model, frameState) {
  var clippingPlanes = model._clippingPlanes;
  if (defined(clippingPlanes) && clippingPlanes.owner === model) {
    if (clippingPlanes.enabled) {
      clippingPlanes.update(frameState);
    }
  }
}

var scratchBoundingSphere = new BoundingSphere();

function scaleInPixels(positionWC, radius, frameState) {
  scratchBoundingSphere.center = positionWC;
  scratchBoundingSphere.radius = radius;
  return frameState.camera.getPixelSize(
    scratchBoundingSphere,
    frameState.context.drawingBufferWidth,
    frameState.context.drawingBufferHeight
  );
}

var scratchPosition = new Cartesian3();
var scratchCartographic = new Cartographic();

function getScale(model, frameState) {
  var scale = model.scale;

  if (model.minimumPixelSize !== 0.0) {
    // Compute size of bounding sphere in pixels
    var context = frameState.context;
    var maxPixelSize = Math.max(
      context.drawingBufferWidth,
      context.drawingBufferHeight
    );
    var m = defined(model._clampedModelMatrix)
      ? model._clampedModelMatrix
      : model.modelMatrix;
    scratchPosition.x = m[12];
    scratchPosition.y = m[13];
    scratchPosition.z = m[14];

    if (defined(model._rtcCenter)) {
      Cartesian3.add(model._rtcCenter, scratchPosition, scratchPosition);
    }

    if (model._mode !== SceneMode.SCENE3D) {
      var projection = frameState.mapProjection;
      var cartographic = projection.ellipsoid.cartesianToCartographic(
        scratchPosition,
        scratchCartographic
      );
      projection.project(cartographic, scratchPosition);
      Cartesian3.fromElements(
        scratchPosition.z,
        scratchPosition.x,
        scratchPosition.y,
        scratchPosition
      );
    }

    var radius = model.boundingSphere.radius;
    var metersPerPixel = scaleInPixels(scratchPosition, radius, frameState);

    // metersPerPixel is always > 0.0
    var pixelsPerMeter = 1.0 / metersPerPixel;
    var diameterInPixels = Math.min(
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

function releaseCachedGltf(model) {
  if (
    defined(model._cacheKey) &&
    defined(model._cachedGltf) &&
    --model._cachedGltf.count === 0
  ) {
    delete gltfCache[model._cacheKey];
  }
  model._cachedGltf = undefined;
}

///////////////////////////////////////////////////////////////////////////

function CachedRendererResources(context, cacheKey) {
  this.buffers = undefined;
  this.vertexArrays = undefined;
  this.programs = undefined;
  this.sourceShaders = undefined;
  this.silhouettePrograms = undefined;
  this.textures = undefined;
  this.samplers = undefined;
  this.renderStates = undefined;
  this.ready = false;

  this.context = context;
  this.cacheKey = cacheKey;
  this.count = 0;
}

function destroy(property) {
  for (var name in property) {
    if (property.hasOwnProperty(name)) {
      property[name].destroy();
    }
  }
}

function destroyCachedRendererResources(resources) {
  destroy(resources.buffers);
  destroy(resources.vertexArrays);
  destroy(resources.programs);
  destroy(resources.silhouettePrograms);
  destroy(resources.textures);
}

CachedRendererResources.prototype.release = function () {
  if (--this.count === 0) {
    if (defined(this.cacheKey)) {
      // Remove if this was cached
      delete this.context.cache.modelRendererResourceCache[this.cacheKey];
    }
    destroyCachedRendererResources(this);
    return destroyObject(this);
  }

  return undefined;
};

///////////////////////////////////////////////////////////////////////////

function getUpdateHeightCallback(model, ellipsoid, cartoPosition) {
  return function (clampedPosition) {
    if (model.heightReference === HeightReference.RELATIVE_TO_GROUND) {
      var clampedCart = ellipsoid.cartesianToCartographic(
        clampedPosition,
        scratchCartographic
      );
      clampedCart.height += cartoPosition.height;
      ellipsoid.cartographicToCartesian(clampedCart, clampedPosition);
    }

    var clampedModelMatrix = model._clampedModelMatrix;

    // Modify clamped model matrix to use new height
    Matrix4.clone(model.modelMatrix, clampedModelMatrix);
    clampedModelMatrix[12] = clampedPosition.x;
    clampedModelMatrix[13] = clampedPosition.y;
    clampedModelMatrix[14] = clampedPosition.z;

    model._heightChanged = true;
  };
}

function updateClamping(model) {
  if (defined(model._removeUpdateHeightCallback)) {
    model._removeUpdateHeightCallback();
    model._removeUpdateHeightCallback = undefined;
  }

  var scene = model._scene;
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

  var globe = scene.globe;
  var ellipsoid = globe.ellipsoid;

  // Compute cartographic position so we don't recompute every update
  var modelMatrix = model.modelMatrix;
  scratchPosition.x = modelMatrix[12];
  scratchPosition.y = modelMatrix[13];
  scratchPosition.z = modelMatrix[14];
  var cartoPosition = ellipsoid.cartesianToCartographic(scratchPosition);

  if (!defined(model._clampedModelMatrix)) {
    model._clampedModelMatrix = Matrix4.clone(modelMatrix, new Matrix4());
  }

  // Install callback to handle updating of terrain tiles
  var surface = globe._surface;
  model._removeUpdateHeightCallback = surface.updateHeight(
    cartoPosition,
    getUpdateHeightCallback(model, ellipsoid, cartoPosition)
  );

  // Set the correct height now
  var height = globe.getHeight(cartoPosition);
  if (defined(height)) {
    // Get callback with cartoPosition being the non-clamped position
    var cb = getUpdateHeightCallback(model, ellipsoid, cartoPosition);

    // Compute the clamped cartesian and call updateHeight callback
    Cartographic.clone(cartoPosition, scratchCartographic);
    scratchCartographic.height = height;
    ellipsoid.cartographicToCartesian(scratchCartographic, scratchPosition);
    cb(scratchPosition);
  }
}

var scratchDisplayConditionCartesian = new Cartesian3();
var scratchDistanceDisplayConditionCartographic = new Cartographic();

function distanceDisplayConditionVisible(model, frameState) {
  var distance2;
  var ddc = model.distanceDisplayCondition;
  var nearSquared = ddc.near * ddc.near;
  var farSquared = ddc.far * ddc.far;

  if (frameState.mode === SceneMode.SCENE2D) {
    var frustum2DWidth =
      frameState.camera.frustum.right - frameState.camera.frustum.left;
    distance2 = frustum2DWidth * 0.5;
    distance2 = distance2 * distance2;
  } else {
    // Distance to center of primitive's reference frame
    var position = Matrix4.getTranslation(
      model.modelMatrix,
      scratchDisplayConditionCartesian
    );
    if (frameState.mode === SceneMode.COLUMBUS_VIEW) {
      var projection = frameState.mapProjection;
      var ellipsoid = projection.ellipsoid;
      var cartographic = ellipsoid.cartesianToCartographic(
        position,
        scratchDistanceDisplayConditionCartographic
      );
      position = projection.project(cartographic, position);
      Cartesian3.fromElements(position.z, position.x, position.y, position);
    }
    distance2 = Cartesian3.distanceSquared(
      position,
      frameState.camera.positionWC
    );
  }

  return distance2 >= nearSquared && distance2 <= farSquared;
}

var scratchClippingPlanesMatrix = new Matrix4();
var scratchIBLReferenceFrameMatrix4 = new Matrix4();
var scratchIBLReferenceFrameMatrix3 = new Matrix3();

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
  if (frameState.mode === SceneMode.MORPHING) {
    return;
  }

  if (!FeatureDetection.supportsWebP.initialized) {
    FeatureDetection.supportsWebP.initialize();
    return;
  }
  var supportsWebP = FeatureDetection.supportsWebP();

  var context = frameState.context;
  this._defaultTexture = context.defaultTexture;

  if (this._state === ModelState.NEEDS_LOAD && defined(this.gltf)) {
    // Use renderer resources from cache instead of loading/creating them?
    var cachedRendererResources;
    var cacheKey = this.cacheKey;
    if (defined(cacheKey)) {
      // cache key given? this model will pull from or contribute to context level cache
      context.cache.modelRendererResourceCache = defaultValue(
        context.cache.modelRendererResourceCache,
        {}
      );
      var modelCaches = context.cache.modelRendererResourceCache;

      cachedRendererResources = modelCaches[this.cacheKey];
      if (defined(cachedRendererResources)) {
        if (!cachedRendererResources.ready) {
          // Cached resources for the model are not loaded yet.  We'll
          // try again every frame until they are.
          return;
        }

        ++cachedRendererResources.count;
        this._loadRendererResourcesFromCache = true;
      } else {
        cachedRendererResources = new CachedRendererResources(
          context,
          cacheKey
        );
        cachedRendererResources.count = 1;
        modelCaches[this.cacheKey] = cachedRendererResources;
      }
      this._cachedRendererResources = cachedRendererResources;
    } else {
      // cache key not given? this model doesn't care about context level cache at all. Cache is here to simplify freeing on destroy.
      cachedRendererResources = new CachedRendererResources(context);
      cachedRendererResources.count = 1;
      this._cachedRendererResources = cachedRendererResources;
    }

    this._state = ModelState.LOADING;
    if (this._state !== ModelState.FAILED) {
      var extensions = this.gltf.extensions;
      if (defined(extensions) && defined(extensions.CESIUM_RTC)) {
        var center = Cartesian3.fromArray(extensions.CESIUM_RTC.center);
        if (!Cartesian3.equals(center, Cartesian3.ZERO)) {
          this._rtcCenter3D = center;

          var projection = frameState.mapProjection;
          var ellipsoid = projection.ellipsoid;
          var cartographic = ellipsoid.cartesianToCartographic(
            this._rtcCenter3D
          );
          var projectedCart = projection.project(cartographic);
          Cartesian3.fromElements(
            projectedCart.z,
            projectedCart.x,
            projectedCart.y,
            projectedCart
          );
          this._rtcCenter2D = projectedCart;

          this._rtcCenterEye = new Cartesian3();
          this._rtcCenter = this._rtcCenter3D;
        }
      }

      addPipelineExtras(this.gltf);

      this._loadResources = new ModelLoadResources();
      if (!this._loadRendererResourcesFromCache) {
        // Buffers are required to updateVersion
        ModelUtility.parseBuffers(this, bufferLoad);
      }
    }
  }

  var loadResources = this._loadResources;
  var incrementallyLoadTextures = this._incrementallyLoadTextures;
  var justLoaded = false;

  if (this._state === ModelState.LOADING) {
    // Transition from LOADING -> LOADED once resources are downloaded and created.
    // Textures may continue to stream in while in the LOADED state.
    if (loadResources.pendingBufferLoads === 0) {
      if (!loadResources.initialized) {
        frameState.brdfLutGenerator.update(frameState);

        ModelUtility.checkSupportedExtensions(
          this.extensionsRequired,
          supportsWebP
        );
        ModelUtility.updateForwardAxis(this);

        // glTF pipeline updates, not needed if loading from cache
        if (!defined(this.gltf.extras.sourceVersion)) {
          var gltf = this.gltf;
          // Add the original version so it remains cached
          gltf.extras.sourceVersion = ModelUtility.getAssetVersion(gltf);
          gltf.extras.sourceKHRTechniquesWebGL = defined(
            ModelUtility.getUsedExtensions(gltf).KHR_techniques_webgl
          );

          this._sourceVersion = gltf.extras.sourceVersion;
          this._sourceKHRTechniquesWebGL = gltf.extras.sourceKHRTechniquesWebGL;

          updateVersion(gltf);
          addDefaults(gltf);

          var options = {
            addBatchIdToGeneratedShaders: this._addBatchIdToGeneratedShaders,
          };

          processModelMaterialsCommon(gltf, options);
          processPbrMaterials(gltf, options);
        }

        this._sourceVersion = this.gltf.extras.sourceVersion;
        this._sourceKHRTechniquesWebGL = this.gltf.extras.sourceKHRTechniquesWebGL;

        // Skip dequantizing in the shader if not encoded
        this._dequantizeInShader =
          this._dequantizeInShader && DracoLoader.hasExtension(this);

        // We do this after to make sure that the ids don't change
        addBuffersToLoadResources(this);
        parseArticulations(this);
        parseTechniques(this);
        if (!this._loadRendererResourcesFromCache) {
          parseBufferViews(this);
          parseShaders(this);
          parsePrograms(this);
          parseTextures(this, context, supportsWebP);
        }
        parseMaterials(this);
        parseMeshes(this);
        parseNodes(this);

        // Start draco decoding
        DracoLoader.parse(this, context);

        loadResources.initialized = true;
      }

      if (!loadResources.finishedDecoding()) {
        DracoLoader.decodeModel(this, context).otherwise(
          ModelUtility.getFailedLoadFunction(this, "model", this.basePath)
        );
      }

      if (loadResources.finishedDecoding() && !loadResources.resourcesParsed) {
        this._boundingSphere = ModelUtility.computeBoundingSphere(this);
        this._initialRadius = this._boundingSphere.radius;

        DracoLoader.cacheDataForModel(this);

        loadResources.resourcesParsed = true;
      }

      if (
        loadResources.resourcesParsed &&
        loadResources.pendingShaderLoads === 0
      ) {
        if (!this.ignoreOutline) {
          ModelOutlineLoader.outlinePrimitives(this);
        }
        createResources(this, frameState);
      }
    }

    if (
      loadResources.finished() ||
      (incrementallyLoadTextures &&
        loadResources.finishedEverythingButTextureCreation())
    ) {
      this._state = ModelState.LOADED;
      justLoaded = true;
    }
  }

  // Incrementally stream textures.
  if (defined(loadResources) && this._state === ModelState.LOADED) {
    if (incrementallyLoadTextures && !justLoaded) {
      createResources(this, frameState);
    }

    if (loadResources.finished()) {
      this._loadResources = undefined; // Clear CPU memory since WebGL resources were created.

      var resources = this._rendererResources;
      var cachedResources = this._cachedRendererResources;

      cachedResources.buffers = resources.buffers;
      cachedResources.vertexArrays = resources.vertexArrays;
      cachedResources.programs = resources.programs;
      cachedResources.sourceShaders = resources.sourceShaders;
      cachedResources.silhouettePrograms = resources.silhouettePrograms;
      cachedResources.textures = resources.textures;
      cachedResources.samplers = resources.samplers;
      cachedResources.renderStates = resources.renderStates;
      cachedResources.ready = true;

      // The normal attribute name is required for silhouettes, so get it before the gltf JSON is released
      this._normalAttributeName = ModelUtility.getAttributeOrUniformBySemantic(
        this.gltf,
        "NORMAL"
      );

      // Vertex arrays are unique to this model, do not store in cache.
      if (defined(this._precreatedAttributes)) {
        cachedResources.vertexArrays = {};
      }

      if (this.releaseGltfJson) {
        releaseCachedGltf(this);
      }
    }
  }

  var iblSupported = OctahedralProjectedCubeMap.isSupported(context);
  if (this._shouldUpdateSpecularMapAtlas && iblSupported) {
    this._shouldUpdateSpecularMapAtlas = false;
    this._specularEnvironmentMapAtlas =
      this._specularEnvironmentMapAtlas &&
      this._specularEnvironmentMapAtlas.destroy();
    this._specularEnvironmentMapAtlas = undefined;
    if (defined(this._specularEnvironmentMaps)) {
      this._specularEnvironmentMapAtlas = new OctahedralProjectedCubeMap(
        this._specularEnvironmentMaps
      );
      var that = this;
      this._specularEnvironmentMapAtlas.readyPromise
        .then(function () {
          that._shouldRegenerateShaders = true;
        })
        .otherwise(function (error) {
          console.error("Error loading specularEnvironmentMaps: " + error);
        });
    }

    // Regenerate shaders to not use an environment map. Will be set to true again if there was a new environment map and it is ready.
    this._shouldRegenerateShaders = true;
  }

  if (defined(this._specularEnvironmentMapAtlas)) {
    this._specularEnvironmentMapAtlas.update(frameState);
  }

  var recompileWithDefaultAtlas =
    !defined(this._specularEnvironmentMapAtlas) &&
    defined(frameState.specularEnvironmentMaps) &&
    !this._useDefaultSpecularMaps;
  var recompileWithoutDefaultAtlas =
    !defined(frameState.specularEnvironmentMaps) &&
    this._useDefaultSpecularMaps;

  var recompileWithDefaultSHCoeffs =
    !defined(this._sphericalHarmonicCoefficients) &&
    defined(frameState.sphericalHarmonicCoefficients) &&
    !this._useDefaultSphericalHarmonics;
  var recompileWithoutDefaultSHCoeffs =
    !defined(frameState.sphericalHarmonicCoefficients) &&
    this._useDefaultSphericalHarmonics;

  this._shouldRegenerateShaders =
    this._shouldRegenerateShaders ||
    recompileWithDefaultAtlas ||
    recompileWithoutDefaultAtlas ||
    recompileWithDefaultSHCoeffs ||
    recompileWithoutDefaultSHCoeffs;

  this._useDefaultSpecularMaps =
    !defined(this._specularEnvironmentMapAtlas) &&
    defined(frameState.specularEnvironmentMaps);
  this._useDefaultSphericalHarmonics =
    !defined(this._sphericalHarmonicCoefficients) &&
    defined(frameState.sphericalHarmonicCoefficients);

  var silhouette = hasSilhouette(this, frameState);
  var translucent = isTranslucent(this);
  var invisible = isInvisible(this);
  var backFaceCulling = this.backFaceCulling;
  var displayConditionPassed = defined(this.distanceDisplayCondition)
    ? distanceDisplayConditionVisible(this, frameState)
    : true;
  var show =
    this.show &&
    displayConditionPassed &&
    this.scale !== 0.0 &&
    (!invisible || silhouette);

  if ((show && this._state === ModelState.LOADED) || justLoaded) {
    var animated =
      this.activeAnimations.update(frameState) || this._cesiumAnimationsDirty;
    this._cesiumAnimationsDirty = false;
    this._dirty = false;
    var modelMatrix = this.modelMatrix;

    var modeChanged = frameState.mode !== this._mode;
    this._mode = frameState.mode;

    // Model's model matrix needs to be updated
    var modelTransformChanged =
      !Matrix4.equals(this._modelMatrix, modelMatrix) ||
      this._scale !== this.scale ||
      this._minimumPixelSize !== this.minimumPixelSize ||
      this.minimumPixelSize !== 0.0 || // Minimum pixel size changed or is enabled
      this._maximumScale !== this.maximumScale ||
      this._heightReference !== this.heightReference ||
      this._heightChanged ||
      modeChanged;

    if (modelTransformChanged || justLoaded) {
      Matrix4.clone(modelMatrix, this._modelMatrix);

      updateClamping(this);

      if (defined(this._clampedModelMatrix)) {
        modelMatrix = this._clampedModelMatrix;
      }

      this._scale = this.scale;
      this._minimumPixelSize = this.minimumPixelSize;
      this._maximumScale = this.maximumScale;
      this._heightReference = this.heightReference;
      this._heightChanged = false;

      var scale = getScale(this, frameState);
      var computedModelMatrix = this._computedModelMatrix;
      Matrix4.multiplyByUniformScale(modelMatrix, scale, computedModelMatrix);
      if (this._upAxis === Axis.Y) {
        Matrix4.multiplyTransformation(
          computedModelMatrix,
          Axis.Y_UP_TO_Z_UP,
          computedModelMatrix
        );
      } else if (this._upAxis === Axis.X) {
        Matrix4.multiplyTransformation(
          computedModelMatrix,
          Axis.X_UP_TO_Z_UP,
          computedModelMatrix
        );
      }
      if (this.forwardAxis === Axis.Z) {
        // glTF 2.0 has a Z-forward convention that must be adapted here to X-forward.
        Matrix4.multiplyTransformation(
          computedModelMatrix,
          Axis.Z_UP_TO_X_UP,
          computedModelMatrix
        );
      }
    }

    // Update modelMatrix throughout the graph as needed
    if (animated || modelTransformChanged || justLoaded) {
      updateNodeHierarchyModelMatrix(
        this,
        modelTransformChanged,
        justLoaded,
        frameState.mapProjection
      );
      this._dirty = true;

      if (animated || justLoaded) {
        // Apply skins if animation changed any node transforms
        applySkins(this);
      }
    }

    if (this._perNodeShowDirty) {
      this._perNodeShowDirty = false;
      updatePerNodeShow(this);
    }
    updatePickIds(this, context);
    updateWireframe(this);
    updateShowBoundingVolume(this);
    updateShadows(this);
    updateClippingPlanes(this, frameState);

    // Regenerate shaders if ClippingPlaneCollection state changed or it was removed
    var clippingPlanes = this._clippingPlanes;
    var currentClippingPlanesState = 0;

    // If defined, use the reference matrix to transform miscellaneous properties like
    // clipping planes and IBL instead of the modelMatrix. This is so that when
    // models are part of a tileset these properties get transformed relative to
    // a common reference (such as the root).
    var referenceMatrix = defaultValue(this.referenceMatrix, modelMatrix);

    if (isClippingEnabled(this)) {
      var clippingPlanesMatrix = scratchClippingPlanesMatrix;
      clippingPlanesMatrix = Matrix4.multiply(
        context.uniformState.view3D,
        referenceMatrix,
        clippingPlanesMatrix
      );
      clippingPlanesMatrix = Matrix4.multiply(
        clippingPlanesMatrix,
        clippingPlanes.modelMatrix,
        clippingPlanesMatrix
      );
      this._clippingPlanesMatrix = Matrix4.inverseTranspose(
        clippingPlanesMatrix,
        this._clippingPlanesMatrix
      );
      currentClippingPlanesState = clippingPlanes.clippingPlanesState;
    }

    var usesSH =
      defined(this._sphericalHarmonicCoefficients) ||
      this._useDefaultSphericalHarmonics;
    var usesSM =
      (defined(this._specularEnvironmentMapAtlas) &&
        this._specularEnvironmentMapAtlas.ready) ||
      this._useDefaultSpecularMaps;

    if (usesSH || usesSM) {
      var iblReferenceFrameMatrix3 = scratchIBLReferenceFrameMatrix3;
      var iblReferenceFrameMatrix4 = scratchIBLReferenceFrameMatrix4;

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

    var shouldRegenerateShaders = this._shouldRegenerateShaders;
    shouldRegenerateShaders =
      shouldRegenerateShaders ||
      this._clippingPlanesState !== currentClippingPlanesState;
    this._clippingPlanesState = currentClippingPlanesState;

    // Regenerate shaders if color shading changed from last update
    var currentlyColorShadingEnabled = isColorShadingEnabled(this);
    if (currentlyColorShadingEnabled !== this._colorShadingEnabled) {
      this._colorShadingEnabled = currentlyColorShadingEnabled;
      shouldRegenerateShaders = true;
    }

    if (shouldRegenerateShaders) {
      regenerateShaders(this, frameState);
    } else {
      updateColor(this, frameState, false);
      updateBackFaceCulling(this, frameState, false);
      updateSilhouette(this, frameState, false);
    }
  }

  if (justLoaded) {
    // Called after modelMatrix update.
    var model = this;
    frameState.afterRender.push(function () {
      model._ready = true;
      model._readyPromise.resolve(model);
    });
    return;
  }

  // We don't check show at the top of the function since we
  // want to be able to progressively load models when they are not shown,
  // and then have them visible immediately when show is set to true.
  if (show && !this._ignoreCommands) {
    // PERFORMANCE_IDEA: This is terrible
    var commandList = frameState.commandList;
    var passes = frameState.passes;
    var nodeCommands = this._nodeCommands;
    var length = nodeCommands.length;
    var i;
    var nc;

    var idl2D =
      frameState.mapProjection.ellipsoid.maximumRadius * CesiumMath.PI;
    var boundingVolume;

    if (passes.render || (passes.pick && this.allowPicking)) {
      for (i = 0; i < length; ++i) {
        nc = nodeCommands[i];
        if (nc.show) {
          var command = nc.command;
          if (silhouette) {
            command = nc.silhouetteModelCommand;
          } else if (translucent) {
            command = nc.translucentCommand;
          } else if (!backFaceCulling) {
            command = nc.disableCullingCommand;
          }
          commandList.push(command);
          boundingVolume = nc.command.boundingVolume;
          if (
            frameState.mode === SceneMode.SCENE2D &&
            (boundingVolume.center.y + boundingVolume.radius > idl2D ||
              boundingVolume.center.y - boundingVolume.radius < idl2D)
          ) {
            var command2D = nc.command2D;
            if (silhouette) {
              command2D = nc.silhouetteModelCommand2D;
            } else if (translucent) {
              command2D = nc.translucentCommand2D;
            } else if (!backFaceCulling) {
              command2D = nc.disableCullingCommand2D;
            }
            commandList.push(command2D);
          }
        }
      }

      if (silhouette && !passes.pick) {
        // Render second silhouette pass
        for (i = 0; i < length; ++i) {
          nc = nodeCommands[i];
          if (nc.show) {
            commandList.push(nc.silhouetteColorCommand);
            boundingVolume = nc.command.boundingVolume;
            if (
              frameState.mode === SceneMode.SCENE2D &&
              (boundingVolume.center.y + boundingVolume.radius > idl2D ||
                boundingVolume.center.y - boundingVolume.radius < idl2D)
            ) {
              commandList.push(nc.silhouetteColorCommand2D);
            }
          }
        }
      }
    }
  }

  var credit = this._credit;
  if (defined(credit)) {
    frameState.creditDisplay.addCredit(credit);
  }

  var resourceCredits = this._resourceCredits;
  var creditCount = resourceCredits.length;
  for (var c = 0; c < creditCount; c++) {
    frameState.creditDisplay.addCredit(resourceCredits[c]);
  }
};

function destroyIfNotCached(rendererResources, cachedRendererResources) {
  if (rendererResources.programs !== cachedRendererResources.programs) {
    destroy(rendererResources.programs);
  }
  if (
    rendererResources.silhouettePrograms !==
    cachedRendererResources.silhouettePrograms
  ) {
    destroy(rendererResources.silhouettePrograms);
  }
}

// Run from update iff:
// - everything is loaded
// - clipping planes state change OR color state set
// Run this from destructor after removing color state and clipping plane state
function regenerateShaders(model, frameState) {
  // In regards to _cachedRendererResources:
  // Fair to assume that this is data that should just never get modified due to clipping planes or model color.
  // So if clipping planes or model color active:
  // - delink _rendererResources.*programs and create new dictionaries.
  // - do NOT destroy any programs - might be used by copies of the model or by might be needed in the future if clipping planes/model color is deactivated

  // If clipping planes and model color inactive:
  // - destroy _rendererResources.*programs
  // - relink _rendererResources.*programs to _cachedRendererResources

  // In both cases, need to mark commands as dirty, re-run derived commands (elsewhere)

  var rendererResources = model._rendererResources;
  var cachedRendererResources = model._cachedRendererResources;
  destroyIfNotCached(rendererResources, cachedRendererResources);

  var programId;
  if (
    isClippingEnabled(model) ||
    isColorShadingEnabled(model) ||
    model._shouldRegenerateShaders
  ) {
    model._shouldRegenerateShaders = false;

    rendererResources.programs = {};
    rendererResources.silhouettePrograms = {};

    var visitedPrograms = {};
    var techniques = model._sourceTechniques;
    var technique;

    for (var techniqueId in techniques) {
      if (techniques.hasOwnProperty(techniqueId)) {
        technique = techniques[techniqueId];
        programId = technique.program;
        if (!visitedPrograms[programId]) {
          visitedPrograms[programId] = true;
          recreateProgram(
            {
              programId: programId,
              techniqueId: techniqueId,
            },
            model,
            frameState.context
          );
        }
      }
    }
  } else {
    rendererResources.programs = cachedRendererResources.programs;
    rendererResources.silhouettePrograms =
      cachedRendererResources.silhouettePrograms;
  }

  // Fix all the commands, marking them as dirty so everything that derives will re-derive
  var rendererPrograms = rendererResources.programs;

  var nodeCommands = model._nodeCommands;
  var commandCount = nodeCommands.length;
  for (var i = 0; i < commandCount; ++i) {
    var nodeCommand = nodeCommands[i];
    programId = nodeCommand.programId;

    var renderProgram = rendererPrograms[programId];
    nodeCommand.command.shaderProgram = renderProgram;
    if (defined(nodeCommand.command2D)) {
      nodeCommand.command2D.shaderProgram = renderProgram;
    }
  }

  // Force update silhouette commands/shaders
  updateColor(model, frameState, true);
  updateBackFaceCulling(model, frameState, true);
  updateSilhouette(model, frameState, true);
}

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
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
  // Vertex arrays are unique to this model, destroy here.
  if (defined(this._precreatedAttributes)) {
    destroy(this._rendererResources.vertexArrays);
  }

  if (defined(this._removeUpdateHeightCallback)) {
    this._removeUpdateHeightCallback();
    this._removeUpdateHeightCallback = undefined;
  }

  if (defined(this._terrainProviderChangedCallback)) {
    this._terrainProviderChangedCallback();
    this._terrainProviderChangedCallback = undefined;
  }

  // Shaders modified for clipping and for color don't get cached, so destroy these manually
  if (defined(this._cachedRendererResources)) {
    destroyIfNotCached(this._rendererResources, this._cachedRendererResources);
  }

  this._rendererResources = undefined;
  this._cachedRendererResources =
    this._cachedRendererResources && this._cachedRendererResources.release();
  DracoLoader.destroyCachedDataForModel(this);

  var pickIds = this._pickIds;
  var length = pickIds.length;
  for (var i = 0; i < length; ++i) {
    pickIds[i].destroy();
  }

  releaseCachedGltf(this);
  this._quantizedVertexShaders = undefined;

  // Only destroy the ClippingPlaneCollection if this is the owner - if this model is part of a Cesium3DTileset,
  // _clippingPlanes references a ClippingPlaneCollection that this model does not own.
  var clippingPlaneCollection = this._clippingPlanes;
  if (
    defined(clippingPlaneCollection) &&
    !clippingPlaneCollection.isDestroyed() &&
    clippingPlaneCollection.owner === this
  ) {
    clippingPlaneCollection.destroy();
  }
  this._clippingPlanes = undefined;

  this._specularEnvironmentMapAtlas =
    this._specularEnvironmentMapAtlas &&
    this._specularEnvironmentMapAtlas.destroy();

  return destroyObject(this);
};

// exposed for testing
Model._getClippingFunction = getClippingFunction;
Model._modifyShaderForColor = modifyShaderForColor;
export default Model;
