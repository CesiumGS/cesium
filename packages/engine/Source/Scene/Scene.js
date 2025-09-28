import BoundingRectangle from "../Core/BoundingRectangle.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import BoxGeometry from "../Core/BoxGeometry.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import Color from "../Core/Color.js";
import ColorGeometryInstanceAttribute from "../Core/ColorGeometryInstanceAttribute.js";
import createGuid from "../Core/createGuid.js";
import CullingVolume from "../Core/CullingVolume.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import EllipsoidGeometry from "../Core/EllipsoidGeometry.js";
import Event from "../Core/Event.js";
import GeographicProjection from "../Core/GeographicProjection.js";
import GeometryInstance from "../Core/GeometryInstance.js";
import GeometryPipeline from "../Core/GeometryPipeline.js";
import HeightReference from "./HeightReference.js";
import Intersect from "../Core/Intersect.js";
import JulianDate from "../Core/JulianDate.js";
import CesiumMath from "../Core/Math.js";
import Matrix4 from "../Core/Matrix4.js";
import mergeSort from "../Core/mergeSort.js";
import Occluder from "../Core/Occluder.js";
import OrthographicFrustum from "../Core/OrthographicFrustum.js";
import OrthographicOffCenterFrustum from "../Core/OrthographicOffCenterFrustum.js";
import PerspectiveFrustum from "../Core/PerspectiveFrustum.js";
import PerspectiveOffCenterFrustum from "../Core/PerspectiveOffCenterFrustum.js";
import Rectangle from "../Core/Rectangle.js";
import RequestScheduler from "../Core/RequestScheduler.js";
import TaskProcessor from "../Core/TaskProcessor.js";
import Transforms from "../Core/Transforms.js";
import ClearCommand from "../Renderer/ClearCommand.js";
import ComputeEngine from "../Renderer/ComputeEngine.js";
import Context from "../Renderer/Context.js";
import ContextLimits from "../Renderer/ContextLimits.js";
import Pass from "../Renderer/Pass.js";
import RenderState from "../Renderer/RenderState.js";
import Atmosphere from "./Atmosphere.js";
import BrdfLutGenerator from "./BrdfLutGenerator.js";
import Camera from "./Camera.js";
import Cesium3DTilePass from "./Cesium3DTilePass.js";
import Cesium3DTilePassState from "./Cesium3DTilePassState.js";
import CreditDisplay from "./CreditDisplay.js";
import DebugCameraPrimitive from "./DebugCameraPrimitive.js";
import DepthPlane from "./DepthPlane.js";
import DerivedCommand from "./DerivedCommand.js";
import DeviceOrientationCameraController from "./DeviceOrientationCameraController.js";
import DynamicAtmosphereLightingType from "./DynamicAtmosphereLightingType.js";
import Fog from "./Fog.js";
import FrameState from "./FrameState.js";
import GlobeTranslucencyState from "./GlobeTranslucencyState.js";
import InvertClassification from "./InvertClassification.js";
import JobScheduler from "./JobScheduler.js";
import MapMode2D from "./MapMode2D.js";
import PerformanceDisplay from "./PerformanceDisplay.js";
import PerInstanceColorAppearance from "./PerInstanceColorAppearance.js";
import Picking from "./Picking.js";
import PostProcessStageCollection from "./PostProcessStageCollection.js";
import Primitive from "./Primitive.js";
import PrimitiveCollection from "./PrimitiveCollection.js";
import SceneMode from "./SceneMode.js";
import SceneTransforms from "./SceneTransforms.js";
import SceneTransitioner from "./SceneTransitioner.js";
import ScreenSpaceCameraController from "./ScreenSpaceCameraController.js";
import ShadowMap from "./ShadowMap.js";
import SharedContext from "../Renderer/SharedContext.js";
import SpecularEnvironmentCubeMap from "./SpecularEnvironmentCubeMap.js";
import StencilConstants from "./StencilConstants.js";
import SunLight from "./SunLight.js";
import SunPostProcess from "./SunPostProcess.js";
import TweenCollection from "./TweenCollection.js";
import View from "./View.js";
import DebugInspector from "./DebugInspector.js";
import VoxelCell from "./VoxelCell.js";
import VoxelPrimitive from "./VoxelPrimitive.js";
import getMetadataClassProperty from "./getMetadataClassProperty.js";
import PickedMetadataInfo from "./PickedMetadataInfo.js";
import getMetadataProperty from "./getMetadataProperty.js";

const requestRenderAfterFrame = function (scene) {
  return function () {
    scene.frameState.afterRender.push(function () {
      scene.requestRender();
    });
  };
};

/**
 * The container for all 3D graphical objects and state in a Cesium virtual scene.  Generally,
 * a scene is not created directly; instead, it is implicitly created by {@link CesiumWidget}.
 *
 * @alias Scene
 * @constructor
 *
 * @param {object} options Object with the following properties:
 * @param {HTMLCanvasElement} options.canvas The HTML canvas element to create the scene for.
 * @param {ContextOptions} [options.contextOptions] Context and WebGL creation properties.
 * @param {Element} [options.creditContainer] The HTML element in which the credits will be displayed. If not specified, a credit container will be created and added as a sibling of the canvas.
 * @param {Element} [options.creditViewport] The HTML element in which to display the credit popup.  If not specified, the viewport will be added as a sibling of the canvas.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.default] The default ellipsoid. If not specified, the default ellipsoid is used.
 * @param {MapProjection} [options.mapProjection=new GeographicProjection(options.ellipsoid)] The map projection to use in 2D and Columbus View modes.
 * @param {boolean} [options.orderIndependentTranslucency=true] If true and the configuration supports it, use order independent translucency.
 * @param {boolean} [options.scene3DOnly=false] If true, optimizes memory use and performance for 3D mode but disables the ability to use 2D or Columbus View.
 * @param {boolean} [options.shadows=false] Determines if shadows are cast by light sources.
 * @param {MapMode2D} [options.mapMode2D=MapMode2D.INFINITE_SCROLL] Determines if the 2D map is rotatable or can be scrolled infinitely in the horizontal direction.
 * @param {boolean} [options.requestRenderMode=false] If true, rendering a frame will only occur when needed as determined by changes within the scene. Enabling improves performance of the application, but requires using {@link Scene#requestRender} to render a new frame explicitly in this mode. This will be necessary in many cases after making changes to the scene in other parts of the API. See {@link https://cesium.com/blog/2018/01/24/cesium-scene-rendering-performance/|Improving Performance with Explicit Rendering}.
 * @param {number} [options.maximumRenderTimeChange=0.0] If requestRenderMode is true, this value defines the maximum change in simulation time allowed before a render is requested. See {@link https://cesium.com/blog/2018/01/24/cesium-scene-rendering-performance/|Improving Performance with Explicit Rendering}.
 * @param {number} [options.depthPlaneEllipsoidOffset=0.0] Adjust the DepthPlane to address rendering artefacts below ellipsoid zero elevation.
 * @param {number} [options.msaaSamples=4] If provided, this value controls the rate of multisample antialiasing. Typical multisampling rates are 2, 4, and sometimes 8 samples per pixel. Higher sampling rates of MSAA may impact performance in exchange for improved visual quality. This value only applies to WebGL2 contexts that support multisample render targets. Set to 1 to disable MSAA.
 *
 * @see CesiumWidget
 * @see {@link http://www.khronos.org/registry/webgl/specs/latest/#5.2|WebGLContextAttributes}
 *
 * @exception {DeveloperError} options and options.canvas are required.
 *
 * @example
 * // Create scene without anisotropic texture filtering
 * const scene = new Cesium.Scene({
 *   canvas : canvas,
 *   contextOptions : {
 *     allowTextureFilterAnisotropic : false
 *   }
 * });
 */
function Scene(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  const canvas = options.canvas;
  let creditContainer = options.creditContainer;
  let creditViewport = options.creditViewport;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(canvas)) {
    throw new DeveloperError("options and options.canvas are required.");
  }
  //>>includeEnd('debug');

  const countReferences = options.contextOptions instanceof SharedContext;
  if (countReferences) {
    this._context = options.contextOptions.createSceneContext(canvas);
  } else {
    const contextOptions = clone(options.contextOptions);
    this._context = new Context(canvas, contextOptions);
  }
  const context = this._context;

  const hasCreditContainer = defined(creditContainer);
  if (!hasCreditContainer) {
    creditContainer = document.createElement("div");
    creditContainer.style.position = "absolute";
    creditContainer.style.bottom = "0";
    creditContainer.style["text-shadow"] = "0 0 2px #000000";
    creditContainer.style.color = "#ffffff";
    creditContainer.style["font-size"] = "10px";
    creditContainer.style["padding-right"] = "5px";
    canvas.parentNode.appendChild(creditContainer);
  }
  if (!defined(creditViewport)) {
    creditViewport = canvas.parentNode;
  }

  this._id = createGuid();
  this._jobScheduler = new JobScheduler();
  this._frameState = new FrameState(
    context,
    new CreditDisplay(creditContainer, "•", creditViewport),
    this._jobScheduler,
  );
  this._frameState.scene3DOnly = options.scene3DOnly ?? false;
  this._removeCreditContainer = !hasCreditContainer;
  this._creditContainer = creditContainer;

  this._canvas = canvas;
  this._computeEngine = new ComputeEngine(context);

  this._ellipsoid = options.ellipsoid ?? Ellipsoid.default;
  this._globe = undefined;
  this._globeTranslucencyState = new GlobeTranslucencyState();
  this._primitives = new PrimitiveCollection({ countReferences });
  this._groundPrimitives = new PrimitiveCollection({ countReferences });

  this._globeHeight = undefined;
  this._globeHeightDirty = true;
  this._cameraUnderground = false;
  this._removeUpdateHeightCallback = undefined;

  this._logDepthBuffer = Scene.defaultLogDepthBuffer && context.fragmentDepth;
  this._logDepthBufferDirty = true;

  this._tweens = new TweenCollection();

  this._shaderFrameCount = 0;

  this._sunPostProcess = undefined;

  this._computeCommandList = [];
  this._overlayCommandList = [];

  this._useOIT = options.orderIndependentTranslucency ?? true;
  /**
   * The function that will be used for executing translucent commands when
   * useOIT is true. This is created once in
   * obtainTranslucentCommandExecutionFunction, then cached here.
   * @private
   */
  this._executeOITFunction = undefined;

  this._depthPlane = new DepthPlane(options.depthPlaneEllipsoidOffset);

  this._clearColorCommand = new ClearCommand({
    color: new Color(),
    stencil: 0,
    owner: this,
  });
  this._depthClearCommand = new ClearCommand({
    depth: 1.0,
    owner: this,
  });
  this._stencilClearCommand = new ClearCommand({
    stencil: 0,
  });
  this._classificationStencilClearCommand = new ClearCommand({
    stencil: 0,
    renderState: RenderState.fromCache({
      stencilMask: StencilConstants.CLASSIFICATION_MASK,
    }),
  });

  this._depthOnlyRenderStateCache = {};

  this._transitioner = new SceneTransitioner(this);

  this._preUpdate = new Event();
  this._postUpdate = new Event();

  this._renderError = new Event();
  this._preRender = new Event();
  this._postRender = new Event();

  this._minimumDisableDepthTestDistance = 0.0;
  this._debugInspector = new DebugInspector();

  this._msaaSamples = options.msaaSamples ?? 4;

  /**
   * Exceptions occurring in <code>render</code> are always caught in order to raise the
   * <code>renderError</code> event.  If this property is true, the error is rethrown
   * after the event is raised.  If this property is false, the <code>render</code> function
   * returns normally after raising the event.
   *
   * @type {boolean}
   * @default false
   */
  this.rethrowRenderErrors = false;

  /**
   * Determines whether or not to instantly complete the
   * scene transition animation on user input.
   *
   * @type {boolean}
   * @default true
   */
  this.completeMorphOnUserInput = true;

  /**
   * The event fired at the beginning of a scene transition.
   * @type {Event}
   * @default Event()
   */
  this.morphStart = new Event();

  /**
   * The event fired at the completion of a scene transition.
   * @type {Event}
   * @default Event()
   */
  this.morphComplete = new Event();

  /**
   * The {@link SkyBox} used to draw the stars.
   *
   * @type {SkyBox | undefined}
   * @default undefined
   *
   * @see Scene#backgroundColor
   */
  this.skyBox = undefined;

  /**
   * The sky atmosphere drawn around the globe.
   *
   * @type {SkyAtmosphere | undefined}
   * @default undefined
   */
  this.skyAtmosphere = undefined;

  /**
   * The {@link Sun}.
   *
   * @type {Sun | undefined}
   * @default undefined
   */
  this.sun = undefined;

  /**
   * Uses a bloom filter on the sun when enabled.
   *
   * @type {boolean}
   * @default true
   */
  this.sunBloom = true;
  this._sunBloom = undefined;

  /**
   * The {@link Moon}
   *
   * @type {Moon | undefined}
   * @default undefined
   */
  this.moon = undefined;

  /**
   * The background color, which is only visible if there is no sky box, i.e., {@link Scene#skyBox} is <code>undefined</code>.
   *
   * @type {Color}
   * @default {@link Color.BLACK}
   *
   * @see Scene#skyBox
   */
  this.backgroundColor = Color.clone(Color.BLACK);

  this._mode = SceneMode.SCENE3D;

  this._mapProjection = defined(options.mapProjection)
    ? options.mapProjection
    : new GeographicProjection(this._ellipsoid);

  /**
   * The current morph transition time between 2D/Columbus View and 3D,
   * with 0.0 being 2D or Columbus View and 1.0 being 3D.
   *
   * @type {number}
   * @default 1.0
   */
  this.morphTime = 1.0;

  /**
   * The far-to-near ratio of the multi-frustum when using a normal depth buffer.
   * <p>
   * This value is used to create the near and far values for each frustum of the multi-frustum. It is only used
   * when {@link Scene#logarithmicDepthBuffer} is <code>false</code>. When <code>logarithmicDepthBuffer</code> is
   * <code>true</code>, use {@link Scene#logarithmicDepthFarToNearRatio}.
   * </p>
   *
   * @type {number}
   * @default 1000.0
   */
  this.farToNearRatio = 1000.0;

  /**
   * The far-to-near ratio of the multi-frustum when using a logarithmic depth buffer.
   * <p>
   * This value is used to create the near and far values for each frustum of the multi-frustum. It is only used
   * when {@link Scene#logarithmicDepthBuffer} is <code>true</code>. When <code>logarithmicDepthBuffer</code> is
   * <code>false</code>, use {@link Scene#farToNearRatio}.
   * </p>
   *
   * @type {number}
   * @default 1e9
   */
  this.logarithmicDepthFarToNearRatio = 1e9;

  /**
   * Determines the uniform depth size in meters of each frustum of the multifrustum in 2D. If a primitive or model close
   * to the surface shows z-fighting, decreasing this will eliminate the artifact, but decrease performance. On the
   * other hand, increasing this will increase performance but may cause z-fighting among primitives close to the surface.
   *
   * @type {number}
   * @default 1.75e6
   */
  this.nearToFarDistance2D = 1.75e6;

  /**
   * The vertical exaggeration of the scene.
   * When set to 1.0, no exaggeration is applied.
   *
   * @type {number}
   * @default 1.0
   */
  this.verticalExaggeration = 1.0;

  /**
   * The reference height for vertical exaggeration of the scene.
   * When set to 0.0, the exaggeration is applied relative to the ellipsoid surface.
   *
   * @type {number}
   * @default 0.0
   */
  this.verticalExaggerationRelativeHeight = 0.0;

  /**
   * This property is for debugging only; it is not for production use.
   * <p>
   * A function that determines what commands are executed.  As shown in the examples below,
   * the function receives the command's <code>owner</code> as an argument, and returns a boolean indicating if the
   * command should be executed.
   * </p>
   * <p>
   * The default is <code>undefined</code>, indicating that all commands are executed.
   * </p>
   *
   * @type {Function | undefined}
   *
   * @default undefined
   *
   * @example
   * // Do not execute any commands.
   * scene.debugCommandFilter = function(command) {
   *     return false;
   * };
   *
   * // Execute only the billboard's commands.  That is, only draw the billboard.
   * const billboards = new Cesium.BillboardCollection();
   * scene.debugCommandFilter = function(command) {
   *     return command.owner === billboards;
   * };
   */
  this.debugCommandFilter = undefined;

  /**
   * This property is for debugging only; it is not for production use.
   * <p>
   * When <code>true</code>, commands are randomly shaded.  This is useful
   * for performance analysis to see what parts of a scene or model are
   * command-dense and could benefit from batching.
   * </p>
   *
   * @type {boolean}
   *
   * @default false
   */
  this.debugShowCommands = false;

  /**
   * This property is for debugging only; it is not for production use.
   * <p>
   * When <code>true</code>, commands are shaded based on the frustums they
   * overlap.  Commands in the closest frustum are tinted red, commands in
   * the next closest are green, and commands in the farthest frustum are
   * blue.  If a command overlaps more than one frustum, the color components
   * are combined, e.g., a command overlapping the first two frustums is tinted
   * yellow.
   * </p>
   *
   * @type {boolean}
   *
   * @default false
   */
  this.debugShowFrustums = false;

  /**
   * This property is for debugging only; it is not for production use.
   * <p>
   * Displays frames per second and time between frames.
   * </p>
   *
   * @type {boolean}
   *
   * @default false
   */
  this.debugShowFramesPerSecond = false;

  /**
   * This property is for debugging only; it is not for production use.
   * <p>
   * Indicates which frustum will have depth information displayed.
   * </p>
   *
   * @type {number}
   *
   * @default 1
   */
  this.debugShowDepthFrustum = 1;

  /**
   * This property is for debugging only; it is not for production use.
   * <p>
   * When <code>true</code>, draws outlines to show the boundaries of the camera frustums
   * </p>
   *
   * @type {boolean}
   *
   * @default false
   */
  this.debugShowFrustumPlanes = false;
  this._debugShowFrustumPlanes = false;
  this._debugFrustumPlanes = undefined;

  /**
   * When <code>true</code>, enables picking using the depth buffer.
   *
   * @type {boolean}
   * @default true
   */
  this.useDepthPicking = true;

  /**
   * When <code>true</code>, enables picking translucent geometry using the depth buffer. Note that {@link Scene#useDepthPicking} must also be true for enabling this to work.
   *
   * <p>
   * There is a decrease in performance when enabled. There are extra draw calls to write depth for
   * translucent geometry.
   * </p>
   *
   * @example
   * // picking the position of a translucent primitive
   * viewer.screenSpaceEventHandler.setInputAction(function onLeftClick(movement) {
   *      const pickedFeature = viewer.scene.pick(movement.position);
   *      if (!Cesium.defined(pickedFeature)) {
   *          // nothing picked
   *          return;
   *      }
   *      const worldPosition = viewer.scene.pickPosition(movement.position);
   * }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
   *
   * @type {boolean}
   * @default false
   */
  this.pickTranslucentDepth = false;

  /**
   * The time in milliseconds to wait before checking if the camera has not moved and fire the cameraMoveEnd event.
   * @type {number}
   * @default 500.0
   * @private
   */
  this.cameraEventWaitTime = 500.0;

  /**
   * Settings for atmosphere lighting effects affecting 3D Tiles and model rendering. This is not to be confused with
   * {@link Scene#skyAtmosphere} which is responsible for rendering the sky.
   *
   * @type {Atmosphere}
   */
  this.atmosphere = new Atmosphere();

  /**
   * Blends the atmosphere to geometry far from the camera for horizon views. Allows for additional
   * performance improvements by rendering less geometry and dispatching less terrain requests.
   *
   * Disbaled by default if an ellipsoid other than WGS84 is used.
   * @type {Fog}
   */
  this.fog = new Fog();
  this.fog.enabled = Ellipsoid.WGS84.equals(this._ellipsoid);

  if (!Ellipsoid.WGS84.equals(this._ellipsoid)) {
    Camera.DEFAULT_VIEW_RECTANGLE = Rectangle.fromDegrees(
      -45.0,
      -45.0,
      45.0,
      45.0,
    );
  }

  this._shadowMapCamera = new Camera(this);

  /**
   * The shadow map for the scene's light source. When enabled, models, primitives, and the globe may cast and receive shadows.
   * @type {ShadowMap}
   */
  this.shadowMap = new ShadowMap({
    context: context,
    lightCamera: this._shadowMapCamera,
    enabled: options.shadows ?? false,
  });

  /**
   * When <code>false</code>, 3D Tiles will render normally. When <code>true</code>, classified 3D Tile geometry will render normally and
   * unclassified 3D Tile geometry will render with the color multiplied by {@link Scene#invertClassificationColor}.
   * @type {boolean}
   * @default false
   */
  this.invertClassification = false;

  /**
   * The highlight color of unclassified 3D Tile geometry when {@link Scene#invertClassification} is <code>true</code>.
   * <p>When the color's alpha is less than 1.0, the unclassified portions of the 3D Tiles will not blend correctly with the classified positions of the 3D Tiles.</p>
   * <p>Also, when the color's alpha is less than 1.0, the WEBGL_depth_texture and EXT_frag_depth WebGL extensions must be supported.</p>
   * @type {Color}
   * @default Color.WHITE
   */
  this.invertClassificationColor = Color.clone(Color.WHITE);

  this._actualInvertClassificationColor = Color.clone(
    this._invertClassificationColor,
  );
  this._invertClassification = new InvertClassification();

  /**
   * The focal length for use when with cardboard or WebVR.
   * @type {number}
   */
  this.focalLength = undefined;

  /**
   * The eye separation distance in meters for use with cardboard or WebVR.
   * @type {number}
   */
  this.eyeSeparation = undefined;

  /**
   * Post processing effects applied to the final render.
   * @type {PostProcessStageCollection}
   */
  this.postProcessStages = new PostProcessStageCollection();

  this._brdfLutGenerator = new BrdfLutGenerator();

  this._performanceDisplay = undefined;
  this._debugVolume = undefined;

  this._screenSpaceCameraController = new ScreenSpaceCameraController(this);
  this._cameraUnderground = false;
  this._mapMode2D = options.mapMode2D ?? MapMode2D.INFINITE_SCROLL;

  // Keeps track of the state of a frame. FrameState is the state across
  // the primitives of the scene. This state is for internally keeping track
  // of celestial and environment effects that need to be updated/rendered in
  // a certain order as well as updating/tracking framebuffer usage.
  this._environmentState = {
    skyBoxCommand: undefined,
    skyAtmosphereCommand: undefined,
    sunDrawCommand: undefined,
    sunComputeCommand: undefined,
    moonCommand: undefined,

    isSunVisible: false,
    isMoonVisible: false,
    isReadyForAtmosphere: false,
    isSkyAtmosphereVisible: false,

    clearGlobeDepth: false,
    useDepthPlane: false,
    renderTranslucentDepthForPick: false,

    originalFramebuffer: undefined,
    useGlobeDepthFramebuffer: false,
    useOIT: false,
    useInvertClassification: false,
    usePostProcess: false,
    usePostProcessSelected: false,
    useWebVR: false,
  };

  this._useWebVR = false;
  this._cameraVR = undefined;
  this._aspectRatioVR = undefined;

  /**
   * When <code>true</code>, rendering a frame will only occur when needed as determined by changes within the scene.
   * Enabling improves performance of the application, but requires using {@link Scene#requestRender}
   * to render a new frame explicitly in this mode. This will be necessary in many cases after making changes
   * to the scene in other parts of the API.
   *
   * @see {@link https://cesium.com/blog/2018/01/24/cesium-scene-rendering-performance/|Improving Performance with Explicit Rendering}
   * @see Scene#maximumRenderTimeChange
   * @see Scene#requestRender
   *
   * @type {boolean}
   * @default false
   */
  this.requestRenderMode = options.requestRenderMode ?? false;
  this._renderRequested = true;

  /**
   * If {@link Scene#requestRenderMode} is <code>true</code>, this value defines the maximum change in
   * simulation time allowed before a render is requested. Lower values increase the number of frames rendered
   * and higher values decrease the number of frames rendered. If <code>undefined</code>, changes to
   * the simulation time will never request a render.
   * This value impacts the rate of rendering for changes in the scene like lighting, entity property updates,
   * and animations.
   *
   * @see {@link https://cesium.com/blog/2018/01/24/cesium-scene-rendering-performance/|Improving Performance with Explicit Rendering}
   * @see Scene#requestRenderMode
   *
   * @type {number}
   * @default 0.0
   */
  this.maximumRenderTimeChange = options.maximumRenderTimeChange ?? 0.0;
  this._lastRenderTime = undefined;
  this._frameRateMonitor = undefined;

  this._removeRequestListenerCallback =
    RequestScheduler.requestCompletedEvent.addEventListener(
      requestRenderAfterFrame(this),
    );
  this._removeTaskProcessorListenerCallback =
    TaskProcessor.taskCompletedEvent.addEventListener(
      requestRenderAfterFrame(this),
    );
  this._removeGlobeCallbacks = [];
  this._removeTerrainProviderReadyListener = undefined;

  const viewport = new BoundingRectangle(
    0,
    0,
    context.drawingBufferWidth,
    context.drawingBufferHeight,
  );
  const camera = new Camera(this);

  if (this._logDepthBuffer) {
    camera.frustum.near = 0.1;
    camera.frustum.far = 10000000000.0;
  }

  /**
   * The camera view for the scene camera flight destination. Used for preloading flight destination tiles.
   * @type {Camera}
   * @private
   */
  this.preloadFlightCamera = new Camera(this);

  /**
   * The culling volume for the scene camera flight destination. Used for preloading flight destination tiles.
   * @type {CullingVolume}
   * @private
   */
  this.preloadFlightCullingVolume = undefined;

  this._picking = new Picking(this);
  this._defaultView = new View(this, camera, viewport);
  this._view = this._defaultView;

  this._hdr = undefined;
  this._hdrDirty = undefined;
  this.highDynamicRange = false;
  this.gamma = 2.2;

  /**
   * The spherical harmonic coefficients for image-based lighting of PBR models.
   * @type {Cartesian3[]}
   */
  this.sphericalHarmonicCoefficients = undefined;

  /**
   * The url to the KTX2 file containing the specular environment map and convoluted mipmaps for image-based lighting of PBR models.
   * @type {string}
   */
  this.specularEnvironmentMaps = undefined;
  this._specularEnvironmentCubeMap = undefined;

  /**
   * The light source for shading. Defaults to a directional light from the Sun.
   * @type {Light}
   */
  this.light = new SunLight();

  // Give frameState, camera, and screen space camera controller initial state before rendering
  updateFrameNumber(this, 0.0, JulianDate.now());
  this.updateFrameState();
  this.initializeFrame();
}

/**
 * Use this to set the default value for {@link Scene#logarithmicDepthBuffer} in newly constructed Scenes
 * This property relies on fragmentDepth being supported.
 */
Scene.defaultLogDepthBuffer = true;

function updateGlobeListeners(scene, globe) {
  for (let i = 0; i < scene._removeGlobeCallbacks.length; ++i) {
    scene._removeGlobeCallbacks[i]();
  }
  scene._removeGlobeCallbacks.length = 0;

  const removeGlobeCallbacks = [];
  if (defined(globe)) {
    removeGlobeCallbacks.push(
      globe.imageryLayersUpdatedEvent.addEventListener(
        requestRenderAfterFrame(scene),
      ),
    );
    removeGlobeCallbacks.push(
      globe.terrainProviderChanged.addEventListener(
        requestRenderAfterFrame(scene),
      ),
    );
  }
  scene._removeGlobeCallbacks = removeGlobeCallbacks;
}

Object.defineProperties(Scene.prototype, {
  /**
   * Gets the canvas element to which this scene is bound.
   * @memberof Scene.prototype
   *
   * @type {HTMLCanvasElement}
   * @readonly
   */
  canvas: {
    get: function () {
      return this._canvas;
    },
  },

  /**
   * The drawingBufferHeight of the underlying GL context.
   * @memberof Scene.prototype
   *
   * @type {number}
   * @readonly
   *
   * @see {@link https://www.khronos.org/registry/webgl/specs/1.0/#DOM-WebGLRenderingContext-drawingBufferHeight|drawingBufferHeight}
   */
  drawingBufferHeight: {
    get: function () {
      return this._context.drawingBufferHeight;
    },
  },

  /**
   * The drawingBufferWidth of the underlying GL context.
   * @memberof Scene.prototype
   *
   * @type {number}
   * @readonly
   *
   * @see {@link https://www.khronos.org/registry/webgl/specs/1.0/#DOM-WebGLRenderingContext-drawingBufferWidth|drawingBufferWidth}
   */
  drawingBufferWidth: {
    get: function () {
      return this._context.drawingBufferWidth;
    },
  },

  /**
   * The maximum aliased line width, in pixels, supported by this WebGL implementation.  It will be at least one.
   * @memberof Scene.prototype
   *
   * @type {number}
   * @readonly
   *
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>ALIASED_LINE_WIDTH_RANGE</code>.
   */
  maximumAliasedLineWidth: {
    get: function () {
      return ContextLimits.maximumAliasedLineWidth;
    },
  },

  /**
   * The maximum length in pixels of one edge of a cube map, supported by this WebGL implementation.  It will be at least 16.
   * @memberof Scene.prototype
   *
   * @type {number}
   * @readonly
   *
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>GL_MAX_CUBE_MAP_TEXTURE_SIZE</code>.
   */
  maximumCubeMapSize: {
    get: function () {
      return ContextLimits.maximumCubeMapSize;
    },
  },

  /**
   * Returns <code>true</code> if the {@link Scene#pickPosition} function is supported.
   * @memberof Scene.prototype
   *
   * @type {boolean}
   * @readonly
   *
   * @see Scene#pickPosition
   */
  pickPositionSupported: {
    get: function () {
      return this._context.depthTexture;
    },
  },

  /**
   * Returns <code>true</code> if the {@link Scene#sampleHeight} and {@link Scene#sampleHeightMostDetailed} functions are supported.
   * @memberof Scene.prototype
   *
   * @type {boolean}
   * @readonly
   *
   * @see Scene#sampleHeight
   * @see Scene#sampleHeightMostDetailed
   */
  sampleHeightSupported: {
    get: function () {
      return this._context.depthTexture;
    },
  },

  /**
   * Returns <code>true</code> if the {@link Scene#clampToHeight} and {@link Scene#clampToHeightMostDetailed} functions are supported.
   * @memberof Scene.prototype
   *
   * @type {boolean}
   * @readonly
   *
   * @see Scene#clampToHeight
   * @see Scene#clampToHeightMostDetailed
   */
  clampToHeightSupported: {
    get: function () {
      return this._context.depthTexture;
    },
  },

  /**
   * Returns <code>true</code> if the {@link Scene#invertClassification} is supported.
   * @memberof Scene.prototype
   *
   * @type {boolean}
   * @readonly
   *
   * @see Scene#invertClassification
   */
  invertClassificationSupported: {
    get: function () {
      return this._context.depthTexture;
    },
  },

  /**
   * Returns <code>true</code> if specular environment maps are supported.
   * @memberof Scene.prototype
   *
   * @type {boolean}
   * @readonly
   *
   * @see Scene#specularEnvironmentMaps
   */
  specularEnvironmentMapsSupported: {
    get: function () {
      return SpecularEnvironmentCubeMap.isSupported(this._context);
    },
  },

  /**
   * The ellipsoid.  If not specified, the default ellipsoid is used.
   * @memberof Scene.prototype
   *
   * @type {Ellipsoid}
   * @readonly
   */
  ellipsoid: {
    get: function () {
      return this._ellipsoid;
    },
  },

  /**
   * Gets or sets the depth-test ellipsoid.
   * @memberof Scene.prototype
   *
   * @type {Globe}
   */
  globe: {
    get: function () {
      return this._globe;
    },

    set: function (globe) {
      this._globe = this._globe && this._globe.destroy();
      this._globe = globe;

      updateGlobeListeners(this, globe);
    },
  },

  /**
   * Gets the collection of primitives.
   * @memberof Scene.prototype
   *
   * @type {PrimitiveCollection}
   * @readonly
   */
  primitives: {
    get: function () {
      return this._primitives;
    },
  },

  /**
   * Gets the collection of ground primitives.
   * @memberof Scene.prototype
   *
   * @type {PrimitiveCollection}
   * @readonly
   */
  groundPrimitives: {
    get: function () {
      return this._groundPrimitives;
    },
  },

  /**
   * Gets or sets the camera.
   * @memberof Scene.prototype
   *
   * @type {Camera}
   * @readonly
   */
  camera: {
    get: function () {
      return this._view.camera;
    },
    set: function (camera) {
      // For internal use only. Documentation is still @readonly.
      this._view.camera = camera;
    },
  },

  /**
   * Gets or sets the view.
   * @memberof Scene.prototype
   *
   * @type {View}
   * @readonly
   *
   * @private
   */
  view: {
    get: function () {
      return this._view;
    },
    set: function (view) {
      // For internal use only. Documentation is still @readonly.
      this._view = view;
    },
  },

  /**
   * Gets the default view.
   * @memberof Scene.prototype
   *
   * @type {View}
   * @readonly
   *
   * @private
   */
  defaultView: {
    get: function () {
      return this._defaultView;
    },
  },

  /**
   * Gets picking functions and state
   * @memberof Scene.prototype
   *
   * @type {Picking}
   * @readonly
   *
   * @private
   */
  picking: {
    get: function () {
      return this._picking;
    },
  },

  /**
   * Gets the controller for camera input handling.
   * @memberof Scene.prototype
   *
   * @type {ScreenSpaceCameraController}
   * @readonly
   */
  screenSpaceCameraController: {
    get: function () {
      return this._screenSpaceCameraController;
    },
  },

  /**
   * Get the map projection to use in 2D and Columbus View modes.
   * @memberof Scene.prototype
   *
   * @type {MapProjection}
   * @readonly
   *
   * @default new GeographicProjection()
   */
  mapProjection: {
    get: function () {
      return this._mapProjection;
    },
  },

  /**
   * Gets the job scheduler
   * @memberof Scene.prototype
   * @type {JobScheduler}
   * @readonly
   *
   * @private
   */
  jobScheduler: {
    get: function () {
      return this._jobScheduler;
    },
  },

  /**
   * Gets state information about the current scene. If called outside of a primitive's <code>update</code>
   * function, the previous frame's state is returned.
   * @memberof Scene.prototype
   *
   * @type {FrameState}
   * @readonly
   *
   * @private
   */
  frameState: {
    get: function () {
      return this._frameState;
    },
  },

  /**
   * Gets the environment state.
   * @memberof Scene.prototype
   *
   * @type {EnvironmentState}
   * @readonly
   *
   * @private
   */
  environmentState: {
    get: function () {
      return this._environmentState;
    },
  },

  /**
   * Gets the collection of tweens taking place in the scene.
   * @memberof Scene.prototype
   *
   * @type {TweenCollection}
   * @readonly
   *
   * @private
   */
  tweens: {
    get: function () {
      return this._tweens;
    },
  },

  /**
   * Gets the collection of image layers that will be rendered on the globe.
   * @memberof Scene.prototype
   *
   * @type {ImageryLayerCollection}
   * @readonly
   */
  imageryLayers: {
    get: function () {
      if (!defined(this.globe)) {
        return undefined;
      }

      return this.globe.imageryLayers;
    },
  },

  /**
   * The terrain provider providing surface geometry for the globe.
   * @memberof Scene.prototype
   *
   * @type {TerrainProvider}
   */
  terrainProvider: {
    get: function () {
      if (!defined(this.globe)) {
        return undefined;
      }

      return this.globe.terrainProvider;
    },
    set: function (terrainProvider) {
      // Cancel any in-progress terrain update
      this._removeTerrainProviderReadyListener =
        this._removeTerrainProviderReadyListener &&
        this._removeTerrainProviderReadyListener();

      if (defined(this.globe)) {
        this.globe.terrainProvider = terrainProvider;
      }
    },
  },

  /**
   * Gets an event that's raised when the terrain provider is changed
   * @memberof Scene.prototype
   *
   * @type {Event}
   * @readonly
   */
  terrainProviderChanged: {
    get: function () {
      if (!defined(this.globe)) {
        return undefined;
      }

      return this.globe.terrainProviderChanged;
    },
  },

  /**
   * Gets the event that will be raised before the scene is updated or rendered.  Subscribers to the event
   * receive the Scene instance as the first parameter and the current time as the second parameter.
   * @memberof Scene.prototype
   *
   * @see {@link https://cesium.com/blog/2018/01/24/cesium-scene-rendering-performance/|Improving Performance with Explicit Rendering}
   * @see Scene#postUpdate
   * @see Scene#preRender
   * @see Scene#postRender
   *
   * @type {Event}
   * @readonly
   */
  preUpdate: {
    get: function () {
      return this._preUpdate;
    },
  },

  /**
   * Gets the event that will be raised immediately after the scene is updated and before the scene is rendered.
   * Subscribers to the event receive the Scene instance as the first parameter and the current time as the second
   * parameter.
   * @memberof Scene.prototype
   *
   * @see {@link https://cesium.com/blog/2018/01/24/cesium-scene-rendering-performance/|Improving Performance with Explicit Rendering}
   * @see Scene#preUpdate
   * @see Scene#preRender
   * @see Scene#postRender
   *
   * @type {Event}
   * @readonly
   */
  postUpdate: {
    get: function () {
      return this._postUpdate;
    },
  },

  /**
   * Gets the event that will be raised when an error is thrown inside the <code>render</code> function.
   * The Scene instance and the thrown error are the only two parameters passed to the event handler.
   * By default, errors are not rethrown after this event is raised, but that can be changed by setting
   * the <code>rethrowRenderErrors</code> property.
   * @memberof Scene.prototype
   *
   * @type {Event}
   * @readonly
   */
  renderError: {
    get: function () {
      return this._renderError;
    },
  },

  /**
   * Gets the event that will be raised after the scene is updated and immediately before the scene is rendered.
   * Subscribers to the event receive the Scene instance as the first parameter and the current time as the second
   * parameter.
   * @memberof Scene.prototype
   *
   * @see {@link https://cesium.com/blog/2018/01/24/cesium-scene-rendering-performance/|Improving Performance with Explicit Rendering}
   * @see Scene#preUpdate
   * @see Scene#postUpdate
   * @see Scene#postRender
   *
   * @type {Event}
   * @readonly
   */
  preRender: {
    get: function () {
      return this._preRender;
    },
  },

  /**
   * Gets the event that will be raised immediately after the scene is rendered.  Subscribers to the event
   * receive the Scene instance as the first parameter and the current time as the second parameter.
   * @memberof Scene.prototype
   *
   * @see {@link https://cesium.com/blog/2018/01/24/cesium-scene-rendering-performance/|Improving Performance with Explicit Rendering}
   * @see Scene#preUpdate
   * @see Scene#postUpdate
   * @see Scene#postRender
   *
   * @type {Event}
   * @readonly
   */
  postRender: {
    get: function () {
      return this._postRender;
    },
  },

  /**
   * Gets the simulation time when the scene was last rendered. Returns <code>undefined</code>
   * if the scene has not yet been rendered.
   * @memberof Scene.prototype
   *
   * @type {JulianDate | undefined}
   * @readonly
   */
  lastRenderTime: {
    get: function () {
      return this._lastRenderTime;
    },
  },

  /**
   * @memberof Scene.prototype
   * @private
   * @readonly
   */
  context: {
    get: function () {
      return this._context;
    },
  },

  /**
   * This property is for debugging only; it is not for production use.
   * <p>
   * When {@link Scene.debugShowFrustums} is <code>true</code>, this contains
   * properties with statistics about the number of command execute per frustum.
   * <code>totalCommands</code> is the total number of commands executed, ignoring
   * overlap. <code>commandsInFrustums</code> is an array with the number of times
   * commands are executed redundantly, e.g., how many commands overlap two or
   * three frustums.
   * </p>
   *
   * @memberof Scene.prototype
   *
   * @type {Object | undefined}
   * @readonly
   *
   * @default undefined
   */
  debugFrustumStatistics: {
    get: function () {
      return this._view.debugFrustumStatistics;
    },
  },

  /**
   * Gets whether or not the scene is optimized for 3D only viewing.
   * @memberof Scene.prototype
   * @type {boolean}
   * @readonly
   */
  scene3DOnly: {
    get: function () {
      return this._frameState.scene3DOnly;
    },
  },

  /**
   * Gets whether or not the scene has order independent translucency enabled.
   * Note that this only reflects the original construction option, and there are
   * other factors that could prevent OIT from functioning on a given system configuration.
   * @memberof Scene.prototype
   * @type {boolean}
   * @readonly
   */
  orderIndependentTranslucency: {
    get: function () {
      return this._useOIT;
    },
  },

  /**
   * Gets the unique identifier for this scene.
   * @memberof Scene.prototype
   * @type {string}
   * @readonly
   */
  id: {
    get: function () {
      return this._id;
    },
  },

  /**
   * Gets or sets the current mode of the scene.
   * @memberof Scene.prototype
   * @type {SceneMode}
   * @default {@link SceneMode.SCENE3D}
   */
  mode: {
    get: function () {
      return this._mode;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (this.scene3DOnly && value !== SceneMode.SCENE3D) {
        throw new DeveloperError(
          "Only SceneMode.SCENE3D is valid when scene3DOnly is true.",
        );
      }
      //>>includeEnd('debug');
      if (value === SceneMode.SCENE2D) {
        this.morphTo2D(0);
      } else if (value === SceneMode.SCENE3D) {
        this.morphTo3D(0);
      } else if (value === SceneMode.COLUMBUS_VIEW) {
        this.morphToColumbusView(0);
        //>>includeStart('debug', pragmas.debug);
      } else {
        throw new DeveloperError(
          "value must be a valid SceneMode enumeration.",
        );
        //>>includeEnd('debug');
      }
      this._mode = value;
    },
  },

  /**
   * Gets the number of frustums used in the last frame.
   * @memberof Scene.prototype
   * @type {FrustumCommands[]}
   *
   * @private
   */
  frustumCommandsList: {
    get: function () {
      return this._view.frustumCommandsList;
    },
  },

  /**
   * Gets the number of frustums used in the last frame.
   * @memberof Scene.prototype
   * @type {number}
   *
   * @private
   */
  numberOfFrustums: {
    get: function () {
      return this._view.frustumCommandsList.length;
    },
  },

  /**
   * When <code>true</code>, splits the scene into two viewports with steroscopic views for the left and right eyes.
   * Used for cardboard and WebVR.
   * @memberof Scene.prototype
   * @type {boolean}
   * @default false
   */
  useWebVR: {
    get: function () {
      return this._useWebVR;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (this.camera.frustum instanceof OrthographicFrustum) {
        throw new DeveloperError(
          "VR is unsupported with an orthographic projection.",
        );
      }
      //>>includeEnd('debug');
      this._useWebVR = value;
      if (this._useWebVR) {
        this._frameState.creditDisplay.container.style.visibility = "hidden";
        this._cameraVR = new Camera(this);
        if (!defined(this._deviceOrientationCameraController)) {
          this._deviceOrientationCameraController =
            new DeviceOrientationCameraController(this);
        }

        this._aspectRatioVR = this.camera.frustum.aspectRatio;
      } else {
        this._frameState.creditDisplay.container.style.visibility = "visible";
        this._cameraVR = undefined;
        this._deviceOrientationCameraController =
          this._deviceOrientationCameraController &&
          !this._deviceOrientationCameraController.isDestroyed() &&
          this._deviceOrientationCameraController.destroy();

        this.camera.frustum.aspectRatio = this._aspectRatioVR;
        this.camera.frustum.xOffset = 0.0;
      }
    },
  },

  /**
   * Determines if the 2D map is rotatable or can be scrolled infinitely in the horizontal direction.
   * @memberof Scene.prototype
   * @type {MapMode2D}
   * @readonly
   */
  mapMode2D: {
    get: function () {
      return this._mapMode2D;
    },
  },

  /**
   * Gets or sets the position of the splitter within the viewport.  Valid values are between 0.0 and 1.0.
   * @memberof Scene.prototype
   *
   * @type {number}
   */
  splitPosition: {
    get: function () {
      return this._frameState.splitPosition;
    },
    set: function (value) {
      this._frameState.splitPosition = value;
    },
  },

  /**
   * The distance from the camera at which to disable the depth test of billboards, labels and points
   * to, for example, prevent clipping against terrain. When set to zero, the depth test should always
   * be applied. When less than zero, the depth test should never be applied. Setting the disableDepthTestDistance
   * property of a billboard, label or point will override this value.
   * @memberof Scene.prototype
   * @type {number}
   * @default 0.0
   */
  minimumDisableDepthTestDistance: {
    get: function () {
      return this._minimumDisableDepthTestDistance;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value) || value < 0.0) {
        throw new DeveloperError(
          "minimumDisableDepthTestDistance must be greater than or equal to 0.0.",
        );
      }
      //>>includeEnd('debug');
      this._minimumDisableDepthTestDistance = value;
    },
  },

  /**
   * Whether or not to use a logarithmic depth buffer. Enabling this option will allow for less frustums in the multi-frustum,
   * increasing performance. This property relies on fragmentDepth being supported.
   * @memberof Scene.prototype
   * @type {boolean}
   */
  logarithmicDepthBuffer: {
    get: function () {
      return this._logDepthBuffer;
    },
    set: function (value) {
      value = this._context.fragmentDepth && value;
      if (this._logDepthBuffer !== value) {
        this._logDepthBuffer = value;
        this._logDepthBufferDirty = true;
      }
    },
  },

  /**
   * The value used for gamma correction. This is only used when rendering with high dynamic range.
   * @memberof Scene.prototype
   * @type {number}
   * @default 2.2
   */
  gamma: {
    get: function () {
      return this._context.uniformState.gamma;
    },
    set: function (value) {
      this._context.uniformState.gamma = value;
    },
  },

  /**
   * Whether or not to use high dynamic range rendering.
   * @memberof Scene.prototype
   * @type {boolean}
   * @default false
   */
  highDynamicRange: {
    get: function () {
      return this._hdr;
    },
    set: function (value) {
      const context = this._context;
      const hdr =
        value &&
        context.depthTexture &&
        (context.colorBufferFloat || context.colorBufferHalfFloat);
      this._hdrDirty = hdr !== this._hdr;
      this._hdr = hdr;
    },
  },

  /**
   * Whether or not high dynamic range rendering is supported.
   * @memberof Scene.prototype
   * @type {boolean}
   * @readonly
   * @default true
   */
  highDynamicRangeSupported: {
    get: function () {
      const context = this._context;
      return (
        context.depthTexture &&
        (context.colorBufferFloat || context.colorBufferHalfFloat)
      );
    },
  },

  /**
   * Whether or not the camera is underneath the globe.
   * @memberof Scene.prototype
   * @type {boolean}
   * @readonly
   * @default false
   */
  cameraUnderground: {
    get: function () {
      return this._cameraUnderground;
    },
  },

  /**
   * The sample rate of multisample antialiasing (values greater than 1 enable MSAA).
   * @memberof Scene.prototype
   * @type {number}
   * @default 4
   */
  msaaSamples: {
    get: function () {
      return this._msaaSamples;
    },
    set: function (value) {
      value = Math.min(value, ContextLimits.maximumSamples);
      this._msaaSamples = value;
    },
  },

  /**
   * Returns <code>true</code> if the Scene's context supports MSAA.
   * @memberof Scene.prototype
   * @type {boolean}
   * @readonly
   */
  msaaSupported: {
    get: function () {
      return this._context.msaa;
    },
  },

  /**
   * Ratio between a pixel and a density-independent pixel. Provides a standard unit of
   * measure for real pixel measurements appropriate to a particular device.
   *
   * @memberof Scene.prototype
   * @type {number}
   * @default 1.0
   * @private
   */
  pixelRatio: {
    get: function () {
      return this._frameState.pixelRatio;
    },
    set: function (value) {
      this._frameState.pixelRatio = value;
    },
  },

  /**
   * @private
   */
  opaqueFrustumNearOffset: {
    get: function () {
      return 0.9999;
    },
  },

  /**
   * @private
   */
  globeHeight: {
    get: function () {
      return this._globeHeight;
    },
  },
});

/**
 * Determines if a compressed texture format is supported.
 * @param {string} format The texture format. May be the name of the format or the WebGL extension name, e.g. s3tc or WEBGL_compressed_texture_s3tc.
 * @return {boolean} Whether or not the format is supported.
 */
Scene.prototype.getCompressedTextureFormatSupported = function (format) {
  const context = this.context;
  return (
    ((format === "WEBGL_compressed_texture_s3tc" || format === "s3tc") &&
      context.s3tc) ||
    ((format === "WEBGL_compressed_texture_pvrtc" || format === "pvrtc") &&
      context.pvrtc) ||
    ((format === "WEBGL_compressed_texture_etc" || format === "etc") &&
      context.etc) ||
    ((format === "WEBGL_compressed_texture_etc1" || format === "etc1") &&
      context.etc1) ||
    ((format === "WEBGL_compressed_texture_astc" || format === "astc") &&
      context.astc) ||
    ((format === "EXT_texture_compression_bptc" || format === "bc7") &&
      context.bc7)
  );
};

function pickedMetadataInfoChanged(command, frameState) {
  const oldPickedMetadataInfo = command.pickedMetadataInfo;
  const newPickedMetadataInfo = frameState.pickedMetadataInfo;
  if (oldPickedMetadataInfo?.schemaId !== newPickedMetadataInfo?.schemaId) {
    return true;
  }
  if (oldPickedMetadataInfo?.className !== newPickedMetadataInfo?.className) {
    return true;
  }
  if (
    oldPickedMetadataInfo?.propertyName !== newPickedMetadataInfo?.propertyName
  ) {
    return true;
  }
  return false;
}

function updateDerivedCommands(scene, command, shadowsDirty) {
  const frameState = scene._frameState;
  const context = scene._context;
  const oit = scene._view.oit;
  const { lightShadowMaps, lightShadowsEnabled } = frameState.shadowState;

  let derivedCommands = command.derivedCommands;

  if (defined(command.pickId)) {
    derivedCommands.picking = DerivedCommand.createPickDerivedCommand(
      scene,
      command,
      context,
      derivedCommands.picking,
    );
  }
  if (frameState.pickingMetadata && command.pickMetadataAllowed) {
    command.pickedMetadataInfo = frameState.pickedMetadataInfo;
    if (defined(command.pickedMetadataInfo)) {
      derivedCommands.pickingMetadata =
        DerivedCommand.createPickMetadataDerivedCommand(
          scene,
          command,
          context,
          derivedCommands.pickingMetadata,
        );
    }
  }
  if (!command.pickOnly) {
    derivedCommands.depth = DerivedCommand.createDepthOnlyDerivedCommand(
      scene,
      command,
      context,
      derivedCommands.depth,
    );
  }

  derivedCommands.originalCommand = command;

  if (scene._hdr) {
    derivedCommands.hdr = DerivedCommand.createHdrCommand(
      command,
      context,
      derivedCommands.hdr,
    );
    command = derivedCommands.hdr.command;
    derivedCommands = command.derivedCommands;
  }

  if (lightShadowsEnabled && command.receiveShadows) {
    derivedCommands.shadows = ShadowMap.createReceiveDerivedCommand(
      lightShadowMaps,
      command,
      shadowsDirty,
      context,
      derivedCommands.shadows,
    );
  }

  if (command.pass === Pass.TRANSLUCENT && defined(oit) && oit.isSupported()) {
    if (lightShadowsEnabled && command.receiveShadows) {
      derivedCommands.oit = defined(derivedCommands.oit)
        ? derivedCommands.oit
        : {};
      derivedCommands.oit.shadows = oit.createDerivedCommands(
        derivedCommands.shadows.receiveCommand,
        context,
        derivedCommands.oit.shadows,
      );
    } else {
      derivedCommands.oit = oit.createDerivedCommands(
        command,
        context,
        derivedCommands.oit,
      );
    }
  }
}

/**
 * @private
 */
Scene.prototype.updateDerivedCommands = function (command) {
  const { derivedCommands } = command;
  if (!defined(derivedCommands)) {
    // Is not a DrawCommand
    return;
  }

  const frameState = this._frameState;
  const { shadowState, useLogDepth } = this._frameState;
  const context = this._context;

  // Update derived commands when any shadow maps become dirty
  let shadowsDirty = false;
  const lastDirtyTime = shadowState.lastDirtyTime;
  if (command.lastDirtyTime !== lastDirtyTime) {
    command.lastDirtyTime = lastDirtyTime;
    command.dirty = true;
    shadowsDirty = true;
  }

  const useHdr = this._hdr;
  const hasLogDepthDerivedCommands = defined(derivedCommands.logDepth);
  const hasHdrCommands = defined(derivedCommands.hdr);
  const hasDerivedCommands = defined(derivedCommands.originalCommand);
  const needsLogDepthDerivedCommands =
    useLogDepth && !hasLogDepthDerivedCommands;
  const needsHdrCommands = useHdr && !hasHdrCommands;
  const needsDerivedCommands = (!useLogDepth || !useHdr) && !hasDerivedCommands;
  const needsUpdateForMetadataPicking =
    frameState.pickingMetadata &&
    pickedMetadataInfoChanged(command, frameState);
  command.dirty =
    command.dirty ||
    needsLogDepthDerivedCommands ||
    needsHdrCommands ||
    needsDerivedCommands ||
    needsUpdateForMetadataPicking;

  if (!command.dirty) {
    return;
  }

  command.dirty = false;

  const { shadowsEnabled, shadowMaps } = shadowState;
  if (shadowsEnabled && command.castShadows) {
    derivedCommands.shadows = ShadowMap.createCastDerivedCommand(
      shadowMaps,
      command,
      shadowsDirty,
      context,
      derivedCommands.shadows,
    );
  }

  if (hasLogDepthDerivedCommands || needsLogDepthDerivedCommands) {
    derivedCommands.logDepth = DerivedCommand.createLogDepthCommand(
      command,
      context,
      derivedCommands.logDepth,
    );
    updateDerivedCommands(this, derivedCommands.logDepth.command, shadowsDirty);
  }
  if (hasDerivedCommands || needsDerivedCommands) {
    updateDerivedCommands(this, command, shadowsDirty);
  }
};

const renderTilesetPassState = new Cesium3DTilePassState({
  pass: Cesium3DTilePass.RENDER,
});

const preloadTilesetPassState = new Cesium3DTilePassState({
  pass: Cesium3DTilePass.PRELOAD,
});

const preloadFlightTilesetPassState = new Cesium3DTilePassState({
  pass: Cesium3DTilePass.PRELOAD_FLIGHT,
});

const requestRenderModeDeferCheckPassState = new Cesium3DTilePassState({
  pass: Cesium3DTilePass.REQUEST_RENDER_MODE_DEFER_CHECK,
});

const scratchOccluderBoundingSphere = new BoundingSphere();
let scratchOccluder;
/**
 * Get the central body occluder for the scene.
 * Assumes only one central body occluder, the top-level globe.
 *
 * @param {Scene} scene
 * @returns {Occluder|undefined}
 *
 * @private
 */
function getOccluder(scene) {
  if (
    scene._mode !== SceneMode.SCENE3D ||
    !scene.globe?.show ||
    scene._cameraUnderground ||
    scene._globeTranslucencyState.translucent
  ) {
    return undefined;
  }

  scratchOccluderBoundingSphere.radius =
    scene.ellipsoid.minimumRadius + scene.frameState.minimumTerrainHeight;
  scratchOccluder = Occluder.fromBoundingSphere(
    scratchOccluderBoundingSphere,
    scene.camera.positionWC,
    scratchOccluder,
  );

  return scratchOccluder;
}

/**
 * @private
 * @param {FrameState.Passes} passes
 */
Scene.prototype.clearPasses = function (passes) {
  passes.render = false;
  passes.pick = false;
  passes.pickVoxel = false;
  passes.depth = false;
  passes.postProcess = false;
  passes.offscreen = false;
};

function updateFrameNumber(scene, frameNumber, time) {
  const frameState = scene._frameState;
  frameState.frameNumber = frameNumber;
  frameState.time = JulianDate.clone(time, frameState.time);
}

/**
 * @private
 */
Scene.prototype.updateFrameState = function () {
  const camera = this.camera;

  const frameState = this._frameState;
  frameState.commandList.length = 0;
  frameState.shadowMaps.length = 0;
  frameState.brdfLutGenerator = this._brdfLutGenerator;
  frameState.environmentMap = this.skyBox && this.skyBox._cubeMap;
  frameState.mode = this._mode;
  frameState.morphTime = this.morphTime;
  frameState.mapProjection = this.mapProjection;
  frameState.camera = camera;
  frameState.cullingVolume = camera.frustum.computeCullingVolume(
    camera.positionWC,
    camera.directionWC,
    camera.upWC,
  );
  frameState.occluder = getOccluder(this);
  frameState.minimumTerrainHeight = 0.0;
  frameState.minimumDisableDepthTestDistance =
    this._minimumDisableDepthTestDistance;
  frameState.invertClassification = this.invertClassification;
  frameState.useLogDepth =
    this._logDepthBuffer &&
    !(
      this.camera.frustum instanceof OrthographicFrustum ||
      this.camera.frustum instanceof OrthographicOffCenterFrustum
    );
  frameState.light = this.light;
  frameState.cameraUnderground = this._cameraUnderground;
  frameState.globeTranslucencyState = this._globeTranslucencyState;

  const { globe } = this;
  if (defined(globe) && globe._terrainExaggerationChanged) {
    // Honor a user-set value for the old deprecated globe.terrainExaggeration.
    // This can be removed when Globe.terrainExaggeration is removed.
    this.verticalExaggeration = globe._terrainExaggeration;
    this.verticalExaggerationRelativeHeight =
      globe._terrainExaggerationRelativeHeight;
    globe._terrainExaggerationChanged = false;
  }
  frameState.verticalExaggeration = this.verticalExaggeration;
  frameState.verticalExaggerationRelativeHeight =
    this.verticalExaggerationRelativeHeight;

  if (
    defined(this._specularEnvironmentCubeMap) &&
    this._specularEnvironmentCubeMap.ready
  ) {
    frameState.specularEnvironmentMaps =
      this._specularEnvironmentCubeMap.texture;
    frameState.specularEnvironmentMapsMaximumLOD =
      this._specularEnvironmentCubeMap.maximumMipmapLevel;
  } else {
    frameState.specularEnvironmentMaps = undefined;
    frameState.specularEnvironmentMapsMaximumLOD = undefined;
  }

  frameState.sphericalHarmonicCoefficients = this.sphericalHarmonicCoefficients;

  this._actualInvertClassificationColor = Color.clone(
    this.invertClassificationColor,
    this._actualInvertClassificationColor,
  );
  if (!InvertClassification.isTranslucencySupported(this._context)) {
    this._actualInvertClassificationColor.alpha = 1.0;
  }

  frameState.invertClassificationColor = this._actualInvertClassificationColor;

  if (defined(this.globe)) {
    frameState.maximumScreenSpaceError = this.globe.maximumScreenSpaceError;
  } else {
    frameState.maximumScreenSpaceError = 2;
  }

  this.clearPasses(frameState.passes);

  frameState.tilesetPassState = undefined;
};

/**
 * Check whether a draw command will render anything visible in the current Scene,
 * based on its bounding volume.
 *
 * @param {CullingVolume} cullingVolume The culling volume of the current Scene.
 * @param {DrawCommand} [command] The draw command
 * @param {Occluder} [occluder] An occluder that may be in front of the command's bounding volume.
 * @returns {boolean} <code>true</code> if the command's bounding volume is visible in the scene.
 *
 * @private
 */
Scene.prototype.isVisible = function (cullingVolume, command, occluder) {
  if (!defined(command)) {
    return false;
  }
  const { boundingVolume } = command;
  if (!defined(boundingVolume) || !command.cull) {
    return true;
  }
  if (cullingVolume.computeVisibility(boundingVolume) === Intersect.OUTSIDE) {
    return false;
  }
  return (
    !defined(occluder) ||
    !command.occlude ||
    !boundingVolume.isOccluded(occluder)
  );
};

let transformFrom2D = new Matrix4(
  0.0,
  0.0,
  1.0,
  0.0,
  1.0,
  0.0,
  0.0,
  0.0,
  0.0,
  1.0,
  0.0,
  0.0,
  0.0,
  0.0,
  0.0,
  1.0,
);
transformFrom2D = Matrix4.inverseTransformation(
  transformFrom2D,
  transformFrom2D,
);

/**
 * Debug code to draw bounding volume for command.  Not optimized!
 * Assumes bounding volume is a bounding sphere or box.
 *
 * @param {DrawCommand} command The draw command for which to render the bounding volume.
 * @param {Scene} scene The scene.
 * @param {PassState} passState The state for the current render pass.
 * @param {Framebuffer} debugFramebuffer The framebuffer where the bounding volume will be rendered.
 *
 * @private
 */
function debugShowBoundingVolume(command, scene, passState, debugFramebuffer) {
  const frameState = scene._frameState;
  const context = frameState.context;
  const boundingVolume = command.boundingVolume;

  if (defined(scene._debugVolume)) {
    scene._debugVolume.destroy();
  }

  let center = Cartesian3.clone(boundingVolume.center);
  if (frameState.mode !== SceneMode.SCENE3D) {
    center = Matrix4.multiplyByPoint(transformFrom2D, center, center);
    const projection = frameState.mapProjection;
    const centerCartographic = projection.unproject(center);
    center = projection.ellipsoid.cartographicToCartesian(centerCartographic);
  }

  let geometry;
  let modelMatrix;
  const { radius } = boundingVolume;
  if (defined(radius)) {
    geometry = EllipsoidGeometry.createGeometry(
      new EllipsoidGeometry({
        radii: new Cartesian3(radius, radius, radius),
        vertexFormat: PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
      }),
    );
    modelMatrix = Matrix4.fromTranslation(center);
  } else {
    geometry = BoxGeometry.createGeometry(
      BoxGeometry.fromDimensions({
        dimensions: new Cartesian3(2.0, 2.0, 2.0),
        vertexFormat: PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
      }),
    );
    modelMatrix = Matrix4.fromRotationTranslation(
      boundingVolume.halfAxes,
      center,
      new Matrix4(),
    );
  }
  scene._debugVolume = new Primitive({
    geometryInstances: new GeometryInstance({
      geometry: GeometryPipeline.toWireframe(geometry),
      modelMatrix: modelMatrix,
      attributes: {
        color: new ColorGeometryInstanceAttribute(1.0, 0.0, 0.0, 1.0),
      },
    }),
    appearance: new PerInstanceColorAppearance({
      flat: true,
      translucent: false,
    }),
    asynchronous: false,
  });

  const savedCommandList = frameState.commandList;
  const commandList = (frameState.commandList = []);
  scene._debugVolume.update(frameState);

  command = commandList[0];

  if (frameState.useLogDepth) {
    const logDepth = DerivedCommand.createLogDepthCommand(command, context);
    command = logDepth.command;
  }

  let framebuffer;
  if (defined(debugFramebuffer)) {
    framebuffer = passState.framebuffer;
    passState.framebuffer = debugFramebuffer;
  }

  command.execute(context, passState);

  if (defined(framebuffer)) {
    passState.framebuffer = framebuffer;
  }

  frameState.commandList = savedCommandList;
}

/**
 * Execute a single draw command, or one of its derived commands if appropriate for the current render state.
 *
 * @param {DrawCommand} command The command to execute.
 * @param {Scene} scene The scene.
 * @param {PassState} passState The state for the current render pass.
 * @param {Framebuffer} debugFramebuffer The framebuffer where debug QCs will be rendered.
 *
 * @private
 */
function executeCommand(command, scene, passState, debugFramebuffer) {
  const frameState = scene._frameState;
  const context = scene._context;

  if (defined(scene.debugCommandFilter) && !scene.debugCommandFilter(command)) {
    return;
  }

  if (command instanceof ClearCommand) {
    command.execute(context, passState);
    return;
  }

  if (command.debugShowBoundingVolume && defined(command.boundingVolume)) {
    debugShowBoundingVolume(command, scene, passState, debugFramebuffer);
  }

  if (frameState.useLogDepth && defined(command.derivedCommands.logDepth)) {
    command = command.derivedCommands.logDepth.command;
  }

  const passes = frameState.passes;
  if (
    !passes.pick &&
    !passes.pickVoxel &&
    !passes.depth &&
    scene._hdr &&
    defined(command.derivedCommands) &&
    defined(command.derivedCommands.hdr)
  ) {
    command = command.derivedCommands.hdr.command;
  }

  if (passes.pick || passes.depth) {
    if (passes.pick && !passes.depth) {
      if (
        frameState.pickingMetadata &&
        defined(command.derivedCommands.pickingMetadata)
      ) {
        command = command.derivedCommands.pickingMetadata.pickMetadataCommand;
        command.execute(context, passState);
        return;
      }
      if (
        !frameState.pickingMetadata &&
        defined(command.derivedCommands.picking)
      ) {
        command = command.derivedCommands.picking.pickCommand;
        command.execute(context, passState);
        return;
      }
    } else if (defined(command.derivedCommands.depth)) {
      command = command.derivedCommands.depth.depthOnlyCommand;
      command.execute(context, passState);
      return;
    }
  }

  if (scene.debugShowCommands || scene.debugShowFrustums) {
    scene._debugInspector.executeDebugShowFrustumsCommand(
      scene,
      command,
      passState,
    );
    return;
  }

  if (
    frameState.shadowState.lightShadowsEnabled &&
    command.receiveShadows &&
    defined(command.derivedCommands.shadows)
  ) {
    // If the command receives shadows, execute the derived shadows command.
    // Some commands, such as OIT derived commands, do not have derived shadow commands themselves
    // and instead shadowing is built-in. In this case execute the command regularly below.
    command.derivedCommands.shadows.receiveCommand.execute(context, passState);
  } else {
    command.execute(context, passState);
  }
}

/**
 * Execute a single ID draw command, used to render information for picking.
 *
 * @param {DrawCommand} command The command to execute.
 * @param {Scene} scene The scene.
 * @param {PassState} passState The state for the current render pass.
 *
 * @private
 */
function executeIdCommand(command, scene, passState) {
  const { derivedCommands } = command;
  if (!defined(derivedCommands)) {
    return;
  }

  const frameState = scene._frameState;
  const context = scene._context;

  if (frameState.useLogDepth && defined(derivedCommands.logDepth)) {
    command = derivedCommands.logDepth.command;
  }

  const { picking, pickingMetadata, depth } = command.derivedCommands;
  if (defined(pickingMetadata)) {
    command = derivedCommands.pickingMetadata.pickMetadataCommand;
    command.execute(context, passState);
  }
  if (defined(picking)) {
    command = picking.pickCommand;
    command.execute(context, passState);
  } else if (defined(depth)) {
    command = depth.depthOnlyCommand;
    command.execute(context, passState);
  }
}

function backToFront(a, b, position) {
  return (
    b.boundingVolume.distanceSquaredTo(position) -
    a.boundingVolume.distanceSquaredTo(position)
  );
}

const scratchCart3 = new Cartesian3();
function distanceSquaredToCenter(center, position) {
  const diff = Cartesian3.subtract(center, position, scratchCart3);
  const distance = Math.max(0.0, Cartesian3.magnitude(diff));
  return distance * distance;
}

function backToFrontSplats(a, b, position) {
  const boxA = a.boundingVolume;
  const boxB = b.boundingVolume;

  return (
    distanceSquaredToCenter(boxB.center, position) -
    distanceSquaredToCenter(boxA.center, position)
  );
}

function frontToBack(a, b, position) {
  // When distances are equal equal favor sorting b before a. This gives render priority to commands later in the list.
  return (
    a.boundingVolume.distanceSquaredTo(position) -
    b.boundingVolume.distanceSquaredTo(position) +
    CesiumMath.EPSILON12
  );
}

function executeTranslucentCommandsBackToFront(
  scene,
  executeFunction,
  passState,
  commands,
  invertClassification,
) {
  mergeSort(commands, backToFront, scene.camera.positionWC);

  if (defined(invertClassification)) {
    executeFunction(invertClassification.unclassifiedCommand, scene, passState);
  }

  for (let i = 0; i < commands.length; ++i) {
    executeFunction(commands[i], scene, passState);
  }
}

function executeTranslucentCommandsFrontToBack(
  scene,
  executeFunction,
  passState,
  commands,
  invertClassification,
) {
  mergeSort(commands, frontToBack, scene.camera.positionWC);

  if (defined(invertClassification)) {
    executeFunction(invertClassification.unclassifiedCommand, scene, passState);
  }

  for (let i = 0; i < commands.length; ++i) {
    executeFunction(commands[i], scene, passState);
  }
}
/**
 * Execute commands to render voxels in the scene.
 *
 * @param {Scene} scene The scene.
 * @param {PassState} passState The state for the current render pass.
 * @param {FrustumCommands} frustumCommands The draw commands for the current frustum.
 *
 * @private
 */
function performVoxelsPass(scene, passState, frustumCommands) {
  scene.context.uniformState.updatePass(Pass.VOXELS);

  const commands = frustumCommands.commands[Pass.VOXELS];
  commands.length = frustumCommands.indices[Pass.VOXELS];

  mergeSort(commands, backToFront, scene.camera.positionWC);

  for (let i = 0; i < commands.length; ++i) {
    executeCommand(commands[i], scene, passState);
  }
}

function performGaussianSplatPass(scene, passState, frustumCommands) {
  scene.context.uniformState.updatePass(Pass.GAUSSIAN_SPLATS);

  const commands = frustumCommands.commands[Pass.GAUSSIAN_SPLATS];
  commands.length = frustumCommands.indices[Pass.GAUSSIAN_SPLATS];

  mergeSort(commands, backToFrontSplats, scene.camera.positionWC);

  for (let i = 0; i < commands.length; ++i) {
    executeCommand(commands[i], scene, passState);
  }
}

const scratchPerspectiveFrustum = new PerspectiveFrustum();
const scratchPerspectiveOffCenterFrustum = new PerspectiveOffCenterFrustum();
const scratchOrthographicFrustum = new OrthographicFrustum();
const scratchOrthographicOffCenterFrustum = new OrthographicOffCenterFrustum();
/**
 * Create a working frustum from the original camera frustum.
 *
 * @param {Camera} camera The camera
 * @returns {PerspectiveFrustum|PerspectiveOffCenterFrustum|OrthographicFrustum|OrthographicOffCenterFrustum} The working frustum
 *
 * @private
 */
function createWorkingFrustum(camera) {
  const { frustum } = camera;
  if (defined(frustum.fov)) {
    return frustum.clone(scratchPerspectiveFrustum);
  }
  if (defined(frustum.infiniteProjectionMatrix)) {
    return frustum.clone(scratchPerspectiveOffCenterFrustum);
  }
  if (defined(frustum.width)) {
    return frustum.clone(scratchOrthographicFrustum);
  }
  return frustum.clone(scratchOrthographicOffCenterFrustum);
}

/**
 * Determine how translucent surfaces will be handled.
 *
 * When OIT is enabled, then this will delegate to OIT.executeCommands.
 * Otherwise, it will just be executeTranslucentCommandsBackToFront
 * for render passes, or executeTranslucentCommandsFrontToBack for
 * other passes.
 *
 * @param {Scene} scene The scene.
 * @returns {Function} A function to execute translucent commands.
 */
function obtainTranslucentCommandExecutionFunction(scene) {
  if (scene._environmentState.useOIT) {
    if (!defined(scene._executeOITFunction)) {
      const { view, context } = scene;
      scene._executeOITFunction = function (
        scene,
        executeFunction,
        passState,
        commands,
        invertClassification,
      ) {
        view.globeDepth.prepareColorTextures(context);
        view.oit.executeCommands(
          scene,
          executeFunction,
          passState,
          commands,
          invertClassification,
        );
      };
    }
    return scene._executeOITFunction;
  }
  if (scene.frameState.passes.render) {
    return executeTranslucentCommandsBackToFront;
  }
  return executeTranslucentCommandsFrontToBack;
}

/**
 * Execute draw commands to render translucent objects in the scene.
 *
 * @param {Scene} scene The scene.
 * @param {PassState} passState The state for the current render pass.
 * @param {FrustumCommands} frustumCommands The draw commands for the current frustum.
 *
 * @private
 */
function performTranslucentPass(scene, passState, frustumCommands) {
  const { frameState, context } = scene;
  const { pick, pickVoxel } = frameState.passes;
  const picking = pick || pickVoxel;

  let invertClassification;
  if (
    !picking &&
    scene._environmentState.useInvertClassification &&
    frameState.invertClassificationColor.alpha < 1.0
  ) {
    // Fullscreen pass to copy unclassified fragments when alpha < 1.0.
    // Not executed when undefined.
    invertClassification = scene._invertClassification;
  }

  const executeTranslucentCommands =
    obtainTranslucentCommandExecutionFunction(scene);

  context.uniformState.updatePass(Pass.TRANSLUCENT);
  const commands = frustumCommands.commands[Pass.TRANSLUCENT];
  commands.length = frustumCommands.indices[Pass.TRANSLUCENT];
  executeTranslucentCommands(
    scene,
    executeCommand,
    passState,
    commands,
    invertClassification,
  );
}

/**
 * Execute commands for classification of translucent 3D Tiles.
 *
 * @param {Scene} scene The scene.
 * @param {PassState} passState The state for the current render pass.
 * @param {FrustumCommands} frustumCommands The draw commands for the current frustum.
 *
 * @private
 */
function performTranslucent3DTilesClassification(
  scene,
  passState,
  frustumCommands,
) {
  const { translucentTileClassification, globeDepth } = scene._view;
  const has3DTilesClassificationCommands =
    frustumCommands.indices[Pass.CESIUM_3D_TILE_CLASSIFICATION] > 0;
  if (
    !has3DTilesClassificationCommands ||
    !translucentTileClassification.isSupported()
  ) {
    return;
  }

  const commands = frustumCommands.commands[Pass.TRANSLUCENT];
  translucentTileClassification.executeTranslucentCommands(
    scene,
    executeCommand,
    passState,
    commands,
    globeDepth.depthStencilTexture,
  );
  translucentTileClassification.executeClassificationCommands(
    scene,
    executeCommand,
    passState,
    frustumCommands,
  );
}

/**
 * Execute the draw commands for all the render passes.
 *
 * @param {Scene} scene
 * @param {PassState} passState
 *
 * @private
 */
function executeCommands(scene, passState) {
  const { camera, context, frameState } = scene;
  const { uniformState } = context;

  uniformState.updateCamera(camera);

  const frustum = createWorkingFrustum(camera);
  frustum.near = camera.frustum.near;
  frustum.far = camera.frustum.far;

  const passes = frameState.passes;
  const picking = passes.pick || passes.pickVoxel;

  // Ideally, we would render the sky box and atmosphere last for
  // early-z, but we would have to draw it in each frustum.
  // Do not render environment primitives during a pick pass since they do not generate picking commands.
  if (!picking) {
    renderEnvironment(scene, passState);
  }

  const {
    clearGlobeDepth,
    renderTranslucentDepthForPick,
    useDepthPlane,
    useGlobeDepthFramebuffer,
    useInvertClassification,
    usePostProcessSelected,
  } = scene._environmentState;

  const {
    globeDepth,
    globeTranslucencyFramebuffer,
    sceneFramebuffer,
    frustumCommandsList,
  } = scene._view;
  const numFrustums = frustumCommandsList.length;

  const globeTranslucencyState = scene._globeTranslucencyState;
  const clearDepth = scene._depthClearCommand;
  const clearStencil = scene._stencilClearCommand;
  const clearClassificationStencil = scene._classificationStencilClearCommand;
  const depthPlane = scene._depthPlane;

  const height2D = camera.position.z;

  function performPass(frustumCommands, passId) {
    uniformState.updatePass(passId);
    const commands = frustumCommands.commands[passId];
    const commandCount = frustumCommands.indices[passId];
    for (let j = 0; j < commandCount; ++j) {
      executeCommand(commands[j], scene, passState);
    }
    return commandCount;
  }

  function performIdPass(frustumCommands, passId) {
    uniformState.updatePass(passId);
    const commands = frustumCommands.commands[passId];
    const commandCount = frustumCommands.indices[passId];
    for (let j = 0; j < commandCount; ++j) {
      executeIdCommand(commands[j], scene, passState);
    }
  }

  // Execute commands in each frustum in back to front order
  for (let i = 0; i < numFrustums; ++i) {
    const index = numFrustums - i - 1;
    const frustumCommands = frustumCommandsList[index];

    if (scene.mode === SceneMode.SCENE2D) {
      // To avoid z-fighting in 2D, move the camera to just before the frustum
      // and scale the frustum depth to be in [1.0, nearToFarDistance2D].
      camera.position.z = height2D - frustumCommands.near + 1.0;
      frustum.far = Math.max(1.0, frustumCommands.far - frustumCommands.near);
      frustum.near = 1.0;
      uniformState.update(frameState);
      uniformState.updateFrustum(frustum);
    } else {
      // Avoid tearing artifacts between adjacent frustums in the opaque passes
      frustum.near =
        index !== 0
          ? frustumCommands.near * scene.opaqueFrustumNearOffset
          : frustumCommands.near;
      frustum.far = frustumCommands.far;
      uniformState.updateFrustum(frustum);
    }

    clearDepth.execute(context, passState);

    if (context.stencilBuffer) {
      clearStencil.execute(context, passState);
    }

    if (globeTranslucencyState.translucent) {
      uniformState.updatePass(Pass.GLOBE);
      globeTranslucencyState.executeGlobeCommands(
        frustumCommands,
        executeCommand,
        globeTranslucencyFramebuffer,
        scene,
        passState,
      );
    } else {
      performPass(frustumCommands, Pass.GLOBE);
    }

    if (useGlobeDepthFramebuffer) {
      globeDepth.executeCopyDepth(context, passState);
    }

    // Draw terrain classification
    if (!renderTranslucentDepthForPick) {
      if (globeTranslucencyState.translucent) {
        uniformState.updatePass(Pass.TERRAIN_CLASSIFICATION);
        globeTranslucencyState.executeGlobeClassificationCommands(
          frustumCommands,
          executeCommand,
          globeTranslucencyFramebuffer,
          scene,
          passState,
        );
      } else {
        performPass(frustumCommands, Pass.TERRAIN_CLASSIFICATION);
      }
    }

    if (clearGlobeDepth) {
      clearDepth.execute(context, passState);
      if (useDepthPlane) {
        depthPlane.execute(context, passState);
      }
    }

    let commandCount;
    if (!useInvertClassification || picking || renderTranslucentDepthForPick) {
      // Common/fastest path. Draw 3D Tiles and classification normally.

      // Draw 3D Tiles
      commandCount = performPass(frustumCommands, Pass.CESIUM_3D_TILE);

      if (commandCount > 0) {
        if (useGlobeDepthFramebuffer) {
          globeDepth.prepareColorTextures(context, clearGlobeDepth);
          globeDepth.executeUpdateDepth(
            context,
            passState,
            globeDepth.depthStencilTexture,
          );
        }

        // Draw classifications. Modifies 3D Tiles color.
        if (!renderTranslucentDepthForPick) {
          commandCount = performPass(
            frustumCommands,
            Pass.CESIUM_3D_TILE_CLASSIFICATION,
          );
        }
      }
    } else {
      // When the invert classification color is opaque:
      //    Main FBO (FBO1):                   Main_Color   + Main_DepthStencil
      //    Invert classification FBO (FBO2) : Invert_Color + Main_DepthStencil
      //
      //    1. Clear FBO2 color to vec4(0.0) for each frustum
      //    2. Draw 3D Tiles to FBO2
      //    3. Draw classification to FBO2
      //    4. Fullscreen pass to FBO1, draw Invert_Color when:
      //           * Main_DepthStencil has the stencil bit set > 0 (classified)
      //    5. Fullscreen pass to FBO1, draw Invert_Color * czm_invertClassificationColor when:
      //           * Main_DepthStencil has stencil bit set to 0 (unclassified) and
      //           * Invert_Color !== vec4(0.0)
      //
      // When the invert classification color is translucent:
      //    Main FBO (FBO1):                  Main_Color         + Main_DepthStencil
      //    Invert classification FBO (FBO2): Invert_Color       + Invert_DepthStencil
      //    IsClassified FBO (FBO3):          IsClassified_Color + Invert_DepthStencil
      //
      //    1. Clear FBO2 and FBO3 color to vec4(0.0), stencil to 0, and depth to 1.0
      //    2. Draw 3D Tiles to FBO2
      //    3. Draw classification to FBO2
      //    4. Fullscreen pass to FBO3, draw any color when
      //           * Invert_DepthStencil has the stencil bit set > 0 (classified)
      //    5. Fullscreen pass to FBO1, draw Invert_Color when:
      //           * Invert_Color !== vec4(0.0) and
      //           * IsClassified_Color !== vec4(0.0)
      //    6. Fullscreen pass to FBO1, draw Invert_Color * czm_invertClassificationColor when:
      //           * Invert_Color !== vec4(0.0) and
      //           * IsClassified_Color === vec4(0.0)
      //
      // NOTE: Step six when translucent invert color occurs after the TRANSLUCENT pass
      //
      scene._invertClassification.clear(context, passState);

      const opaqueClassificationFramebuffer = passState.framebuffer;
      passState.framebuffer = scene._invertClassification._fbo.framebuffer;

      // Draw normally
      commandCount = performPass(frustumCommands, Pass.CESIUM_3D_TILE);

      if (useGlobeDepthFramebuffer) {
        scene._invertClassification.prepareTextures(context);
        globeDepth.executeUpdateDepth(
          context,
          passState,
          scene._invertClassification._fbo.getDepthStencilTexture(),
        );
      }

      // Set stencil
      commandCount = performPass(
        frustumCommands,
        Pass.CESIUM_3D_TILE_CLASSIFICATION_IGNORE_SHOW,
      );

      passState.framebuffer = opaqueClassificationFramebuffer;

      // Fullscreen pass to copy classified fragments
      scene._invertClassification.executeClassified(context, passState);
      if (frameState.invertClassificationColor.alpha === 1.0) {
        // Fullscreen pass to copy unclassified fragments when alpha == 1.0
        scene._invertClassification.executeUnclassified(context, passState);
      }

      // Clear stencil set by the classification for the next classification pass
      if (commandCount > 0 && context.stencilBuffer) {
        clearClassificationStencil.execute(context, passState);
      }

      // Draw style over classification.
      commandCount = performPass(
        frustumCommands,
        Pass.CESIUM_3D_TILE_CLASSIFICATION,
      );
    }

    if (commandCount > 0 && context.stencilBuffer) {
      clearStencil.execute(context, passState);
    }

    performVoxelsPass(scene, passState, frustumCommands);

    performPass(frustumCommands, Pass.OPAQUE);

    performGaussianSplatPass(scene, passState, frustumCommands);

    if (index !== 0 && scene.mode !== SceneMode.SCENE2D) {
      // Do not overlap frustums in the translucent pass to avoid blending artifacts
      frustum.near = frustumCommands.near;
      uniformState.updateFrustum(frustum);
    }

    performTranslucentPass(scene, passState, frustumCommands);

    performTranslucent3DTilesClassification(scene, passState, frustumCommands);

    if (
      context.depthTexture &&
      scene.useDepthPicking &&
      (useGlobeDepthFramebuffer || renderTranslucentDepthForPick)
    ) {
      // PERFORMANCE_IDEA: Use MRT to avoid the extra copy.
      const pickDepth = scene._picking.getPickDepth(scene, index);
      pickDepth.update(context, globeDepth.depthStencilTexture);
      pickDepth.executeCopyDepth(context, passState);
    }

    if (picking || !usePostProcessSelected) {
      continue;
    }

    const originalFramebuffer = passState.framebuffer;
    passState.framebuffer = sceneFramebuffer.getIdFramebuffer();

    // reset frustum
    frustum.near =
      index !== 0
        ? frustumCommands.near * scene.opaqueFrustumNearOffset
        : frustumCommands.near;
    frustum.far = frustumCommands.far;
    uniformState.updateFrustum(frustum);

    if (globeTranslucencyState.translucent) {
      uniformState.updatePass(Pass.GLOBE);
      globeTranslucencyState.executeGlobeCommands(
        frustumCommands,
        executeIdCommand,
        globeTranslucencyFramebuffer,
        scene,
        passState,
      );
    } else {
      performIdPass(frustumCommands, Pass.GLOBE);
    }

    if (clearGlobeDepth) {
      clearDepth.framebuffer = passState.framebuffer;
      clearDepth.execute(context, passState);
      clearDepth.framebuffer = undefined;
    }

    if (clearGlobeDepth && useDepthPlane) {
      depthPlane.execute(context, passState);
    }

    performIdPass(frustumCommands, Pass.CESIUM_3D_TILE);
    performIdPass(frustumCommands, Pass.OPAQUE);
    performIdPass(frustumCommands, Pass.TRANSLUCENT);

    passState.framebuffer = originalFramebuffer;
  }
}

/**
 * Render the sky, atmosphere, sun, and moon
 *
 * @param {Scene} scene The scene.
 * @param {PassState} passState The render state for the pass.
 *
 * @private
 */
function renderEnvironment(scene, passState) {
  const { context, environmentState, view } = scene;

  context.uniformState.updatePass(Pass.ENVIRONMENT);

  if (defined(environmentState.skyBoxCommand)) {
    executeCommand(environmentState.skyBoxCommand, scene, passState);
  }

  if (environmentState.isSkyAtmosphereVisible) {
    executeCommand(environmentState.skyAtmosphereCommand, scene, passState);
  }

  if (environmentState.isSunVisible) {
    environmentState.sunDrawCommand.execute(context, passState);
    if (scene.sunBloom && !environmentState.useWebVR) {
      let framebuffer;
      if (environmentState.useGlobeDepthFramebuffer) {
        framebuffer = view.globeDepth.framebuffer;
      } else if (environmentState.usePostProcess) {
        framebuffer = view.sceneFramebuffer.framebuffer;
      } else {
        framebuffer = environmentState.originalFramebuffer;
      }
      scene._sunPostProcess.execute(context);
      scene._sunPostProcess.copy(context, framebuffer);
      passState.framebuffer = framebuffer;
    }
  }

  // Moon can be seen through the atmosphere, since the sun is rendered after the atmosphere.
  if (environmentState.isMoonVisible) {
    environmentState.moonCommand.execute(context, passState);
  }
}

/**
 * Execute compute commands from the scene's environment state and computeCommandList
 *
 * @param {Scene} scene
 *
 * @private
 */
function executeComputeCommands(scene) {
  scene.context.uniformState.updatePass(Pass.COMPUTE);

  const sunComputeCommand = scene._environmentState.sunComputeCommand;
  if (defined(sunComputeCommand)) {
    sunComputeCommand.execute(scene._computeEngine);
  }

  const commandList = scene._computeCommandList;
  for (let i = 0; i < commandList.length; ++i) {
    commandList[i].execute(scene._computeEngine);
  }
}

/**
 * Execute the draw commands for overlays
 *
 * @param {Scene} scene
 * @param {PassState} passState
 *
 * @private
 */
function executeOverlayCommands(scene, passState) {
  scene.context.uniformState.updatePass(Pass.OVERLAY);

  const context = scene.context;
  const commandList = scene._overlayCommandList;
  for (let i = 0; i < commandList.length; ++i) {
    commandList[i].execute(context, passState);
  }
}

/**
 * Add the scene's draw commands into the shadow map passes.
 *
 * @param {Scene} scene
 * @param {DrawCommand[]} commandList
 * @param {ShadowMap} shadowMap
 *
 * @private
 */
function insertShadowCastCommands(scene, commandList, shadowMap) {
  const { shadowMapCullingVolume, isPointLight, passes } = shadowMap;
  const numberOfPasses = passes.length;

  const shadowedPasses = [
    Pass.GLOBE,
    Pass.CESIUM_3D_TILE,
    Pass.OPAQUE,
    Pass.TRANSLUCENT,
  ];

  for (let i = 0; i < commandList.length; ++i) {
    const command = commandList[i];
    scene.updateDerivedCommands(command);

    if (
      !command.castShadows ||
      shadowedPasses.indexOf(command.pass) < 0 ||
      !scene.isVisible(shadowMapCullingVolume, command)
    ) {
      continue;
    }

    if (isPointLight) {
      for (let k = 0; k < numberOfPasses; ++k) {
        passes[k].commandList.push(command);
      }
    } else if (numberOfPasses === 1) {
      passes[0].commandList.push(command);
    } else {
      let wasVisible = false;
      // Loop over cascades from largest to smallest
      for (let j = numberOfPasses - 1; j >= 0; --j) {
        const cascadeVolume = passes[j].cullingVolume;
        if (scene.isVisible(cascadeVolume, command)) {
          passes[j].commandList.push(command);
          wasVisible = true;
        } else if (wasVisible) {
          // If it was visible in the previous cascade but now isn't
          // then there is no need to check any more cascades
          break;
        }
      }
    }
  }
}

/**
 * Execute the draw commands to cast shadows into the shadow maps.
 *
 * @param {Scene} scene
 *
 * @private
 */
function executeShadowMapCastCommands(scene) {
  const { shadowState, commandList } = scene.frameState;
  const { shadowsEnabled, shadowMaps } = shadowState;

  if (!shadowsEnabled) {
    return;
  }

  const { context } = scene;
  const { uniformState } = context;

  for (let i = 0; i < shadowMaps.length; ++i) {
    const shadowMap = shadowMaps[i];
    if (shadowMap.outOfView) {
      continue;
    }

    // Reset the command lists
    const { passes } = shadowMap;
    for (let j = 0; j < passes.length; ++j) {
      passes[j].commandList.length = 0;
    }

    // Insert the primitive/model commands into the shadow map command lists
    insertShadowCastCommands(scene, commandList, shadowMap);

    for (let j = 0; j < passes.length; ++j) {
      const pass = shadowMap.passes[j];
      const { camera, commandList } = pass;
      uniformState.updateCamera(camera);
      shadowMap.updatePass(context, j);
      for (let k = 0; k < commandList.length; ++k) {
        const command = commandList[k];
        // Set the correct pass before rendering into the shadow map because some shaders
        // conditionally render based on whether the pass is translucent or opaque.
        uniformState.updatePass(command.pass);
        const castCommand = command.derivedCommands.shadows.castCommands[i];
        executeCommand(castCommand, scene, pass.passState);
      }
    }
  }
}

const scratchEyeTranslation = new Cartesian3();

/**
 * Update and clear framebuffers, and execute draw commands.
 *
 * @param {PassState} passState State specific to each render pass.
 * @param {Color} backgroundColor
 *
 * @private
 */
Scene.prototype.updateAndExecuteCommands = function (
  passState,
  backgroundColor,
) {
  updateAndClearFramebuffers(this, passState, backgroundColor);

  if (this._environmentState.useWebVR) {
    executeWebVRCommands(this, passState, backgroundColor);
  } else if (
    this._frameState.mode !== SceneMode.SCENE2D ||
    this._mapMode2D === MapMode2D.ROTATE
  ) {
    executeCommandsInViewport(true, this, passState);
  } else {
    execute2DViewportCommands(this, passState);
  }
};

/**
 * Execute the draw commands to render the scene into the stereo viewports of a WebVR application.
 *
 * @param {Scene} scene
 * @param {PassState} passState
 *
 * @private
 */
function executeWebVRCommands(scene, passState) {
  const view = scene._view;
  const camera = view.camera;
  const environmentState = scene._environmentState;
  const renderTranslucentDepthForPick =
    environmentState.renderTranslucentDepthForPick;

  updateAndRenderPrimitives(scene);

  view.createPotentiallyVisibleSet(scene);

  executeComputeCommands(scene);

  if (!renderTranslucentDepthForPick) {
    executeShadowMapCastCommands(scene);
  }

  // Based on Calculating Stereo pairs by Paul Bourke
  // http://paulbourke.net/stereographics/stereorender/
  const viewport = passState.viewport;
  viewport.x = 0;
  viewport.y = 0;
  viewport.width = viewport.width * 0.5;

  const savedCamera = Camera.clone(camera, scene._cameraVR);
  savedCamera.frustum = camera.frustum;

  const near = camera.frustum.near;
  const fo = near * (scene.focalLength ?? 5.0);
  const eyeSeparation = scene.eyeSeparation ?? fo / 30.0;
  const eyeTranslation = Cartesian3.multiplyByScalar(
    savedCamera.right,
    eyeSeparation * 0.5,
    scratchEyeTranslation,
  );

  camera.frustum.aspectRatio = viewport.width / viewport.height;

  const offset = (0.5 * eyeSeparation * near) / fo;

  Cartesian3.add(savedCamera.position, eyeTranslation, camera.position);
  camera.frustum.xOffset = offset;

  executeCommands(scene, passState);

  viewport.x = viewport.width;

  Cartesian3.subtract(savedCamera.position, eyeTranslation, camera.position);
  camera.frustum.xOffset = -offset;

  executeCommands(scene, passState);

  Camera.clone(savedCamera, camera);
}

const scratch2DViewportCartographic = new Cartographic(
  Math.PI,
  CesiumMath.PI_OVER_TWO,
);
const scratch2DViewportMaxCoord = new Cartesian3();
const scratch2DViewportSavedPosition = new Cartesian3();
const scratch2DViewportTransform = new Matrix4();
const scratch2DViewportCameraTransform = new Matrix4();
const scratch2DViewportEyePoint = new Cartesian3();
const scratch2DViewportWindowCoords = new Cartesian3();
const scratch2DViewport = new BoundingRectangle();

/**
 * Execute the draw commands to render into a 2D viewport.
 *
 * @param {Scene} scene
 * @param {PassState} passState
 *
 * @private
 */
function execute2DViewportCommands(scene, passState) {
  const { frameState, camera } = scene;
  const { uniformState } = scene.context;

  const originalViewport = passState.viewport;
  const viewport = BoundingRectangle.clone(originalViewport, scratch2DViewport);
  passState.viewport = viewport;

  const maxCartographic = scratch2DViewportCartographic;
  const maxCoord = scratch2DViewportMaxCoord;

  const projection = scene.mapProjection;
  projection.project(maxCartographic, maxCoord);

  const position = Cartesian3.clone(
    camera.position,
    scratch2DViewportSavedPosition,
  );
  const transform = Matrix4.clone(
    camera.transform,
    scratch2DViewportCameraTransform,
  );
  const frustum = camera.frustum.clone();

  camera._setTransform(Matrix4.IDENTITY);

  const viewportTransformation = Matrix4.computeViewportTransformation(
    viewport,
    0.0,
    1.0,
    scratch2DViewportTransform,
  );
  const projectionMatrix = camera.frustum.projectionMatrix;

  const x = camera.positionWC.y;
  const eyePoint = Cartesian3.fromElements(
    CesiumMath.sign(x) * maxCoord.x - x,
    0.0,
    -camera.positionWC.x,
    scratch2DViewportEyePoint,
  );
  const windowCoordinates = Transforms.pointToGLWindowCoordinates(
    projectionMatrix,
    viewportTransformation,
    eyePoint,
    scratch2DViewportWindowCoords,
  );

  windowCoordinates.x = Math.floor(windowCoordinates.x);

  const viewportX = viewport.x;
  const viewportWidth = viewport.width;

  if (
    x === 0.0 ||
    windowCoordinates.x <= viewportX ||
    windowCoordinates.x >= viewportX + viewportWidth
  ) {
    executeCommandsInViewport(true, scene, passState);
  } else if (
    Math.abs(viewportX + viewportWidth * 0.5 - windowCoordinates.x) < 1.0
  ) {
    viewport.width = windowCoordinates.x - viewport.x;

    camera.position.x *= CesiumMath.sign(camera.position.x);

    camera.frustum.right = 0.0;

    frameState.cullingVolume = camera.frustum.computeCullingVolume(
      camera.positionWC,
      camera.directionWC,
      camera.upWC,
    );
    uniformState.update(frameState);

    executeCommandsInViewport(true, scene, passState);

    viewport.x = windowCoordinates.x;

    camera.position.x = -camera.position.x;

    camera.frustum.right = -camera.frustum.left;
    camera.frustum.left = 0.0;

    frameState.cullingVolume = camera.frustum.computeCullingVolume(
      camera.positionWC,
      camera.directionWC,
      camera.upWC,
    );
    uniformState.update(frameState);

    executeCommandsInViewport(false, scene, passState);
  } else if (windowCoordinates.x > viewportX + viewportWidth * 0.5) {
    viewport.width = windowCoordinates.x - viewportX;

    const right = camera.frustum.right;
    camera.frustum.right = maxCoord.x - x;

    frameState.cullingVolume = camera.frustum.computeCullingVolume(
      camera.positionWC,
      camera.directionWC,
      camera.upWC,
    );
    uniformState.update(frameState);

    executeCommandsInViewport(true, scene, passState);

    viewport.x = windowCoordinates.x;
    viewport.width = viewportX + viewportWidth - windowCoordinates.x;

    camera.position.x = -camera.position.x;

    camera.frustum.left = -camera.frustum.right;
    camera.frustum.right = right - camera.frustum.right * 2.0;

    frameState.cullingVolume = camera.frustum.computeCullingVolume(
      camera.positionWC,
      camera.directionWC,
      camera.upWC,
    );
    uniformState.update(frameState);

    executeCommandsInViewport(false, scene, passState);
  } else {
    viewport.x = windowCoordinates.x;
    viewport.width = viewportX + viewportWidth - windowCoordinates.x;

    const left = camera.frustum.left;
    camera.frustum.left = -maxCoord.x - x;

    frameState.cullingVolume = camera.frustum.computeCullingVolume(
      camera.positionWC,
      camera.directionWC,
      camera.upWC,
    );
    uniformState.update(frameState);

    executeCommandsInViewport(true, scene, passState);

    viewport.x = viewportX;
    viewport.width = windowCoordinates.x - viewportX;

    camera.position.x = -camera.position.x;

    camera.frustum.right = -camera.frustum.left;
    camera.frustum.left = left - camera.frustum.left * 2.0;

    frameState.cullingVolume = camera.frustum.computeCullingVolume(
      camera.positionWC,
      camera.directionWC,
      camera.upWC,
    );
    uniformState.update(frameState);

    executeCommandsInViewport(false, scene, passState);
  }

  camera._setTransform(transform);
  Cartesian3.clone(position, camera.position);
  camera.frustum = frustum.clone();
  passState.viewport = originalViewport;
}

/**
 * Execute the draw commands to render the scene into the viewport.
 * If this is the first viewport rendered, the framebuffers will be cleared to the background color.
 *
 * @param {boolean} firstViewport <code>true</code> if this is the first viewport rendered.
 * @param {Scene} scene
 * @param {PassState} passState
 *
 * @private
 */
function executeCommandsInViewport(firstViewport, scene, passState) {
  const view = scene._view;
  const { renderTranslucentDepthForPick } = scene._environmentState;

  if (!firstViewport) {
    scene.frameState.commandList.length = 0;
  }

  updateAndRenderPrimitives(scene);

  view.createPotentiallyVisibleSet(scene);

  if (firstViewport) {
    executeComputeCommands(scene);
    if (!renderTranslucentDepthForPick) {
      executeShadowMapCastCommands(scene);
    }
  }

  executeCommands(scene, passState);
}

const scratchCullingVolume = new CullingVolume();

/**
 * @private
 */
Scene.prototype.updateEnvironment = function () {
  const frameState = this._frameState;
  const view = this._view;

  // Update celestial and terrestrial environment effects.
  const environmentState = this._environmentState;
  const renderPass = frameState.passes.render;
  const offscreenPass = frameState.passes.offscreen;
  const atmosphere = this.atmosphere;
  const skyAtmosphere = this.skyAtmosphere;
  const globe = this.globe;
  const globeTranslucencyState = this._globeTranslucencyState;

  if (
    !renderPass ||
    (this._mode !== SceneMode.SCENE2D &&
      view.camera.frustum instanceof OrthographicFrustum) ||
    !globeTranslucencyState.environmentVisible
  ) {
    environmentState.skyAtmosphereCommand = undefined;
    environmentState.skyBoxCommand = undefined;
    environmentState.sunDrawCommand = undefined;
    environmentState.sunComputeCommand = undefined;
    environmentState.moonCommand = undefined;
  } else {
    if (defined(skyAtmosphere)) {
      if (defined(globe)) {
        skyAtmosphere.setDynamicLighting(
          DynamicAtmosphereLightingType.fromGlobeFlags(globe),
        );
        environmentState.isReadyForAtmosphere =
          environmentState.isReadyForAtmosphere ||
          !globe.show ||
          globe._surface._tilesToRender.length > 0;
      } else {
        const dynamicLighting = atmosphere.dynamicLighting;
        skyAtmosphere.setDynamicLighting(dynamicLighting);
        environmentState.isReadyForAtmosphere = true;
      }

      environmentState.skyAtmosphereCommand = skyAtmosphere.update(
        frameState,
        globe,
      );
      if (defined(environmentState.skyAtmosphereCommand)) {
        this.updateDerivedCommands(environmentState.skyAtmosphereCommand);
      }
    } else {
      environmentState.skyAtmosphereCommand = undefined;
    }

    environmentState.skyBoxCommand = defined(this.skyBox)
      ? this.skyBox.update(frameState, this._hdr)
      : undefined;
    const sunCommands = defined(this.sun)
      ? this.sun.update(frameState, view.passState, this._hdr)
      : undefined;
    environmentState.sunDrawCommand = defined(sunCommands)
      ? sunCommands.drawCommand
      : undefined;
    environmentState.sunComputeCommand = defined(sunCommands)
      ? sunCommands.computeCommand
      : undefined;
    environmentState.moonCommand = defined(this.moon)
      ? this.moon.update(frameState)
      : undefined;
  }

  const clearGlobeDepth = (environmentState.clearGlobeDepth =
    defined(globe) &&
    globe.show &&
    (!globe.depthTestAgainstTerrain || this.mode === SceneMode.SCENE2D));
  const useDepthPlane = (environmentState.useDepthPlane =
    clearGlobeDepth &&
    this.mode === SceneMode.SCENE3D &&
    globeTranslucencyState.useDepthPlane);
  if (useDepthPlane) {
    // Update the depth plane that is rendered in 3D when the primitives are
    // not depth tested against terrain so primitives on the backface
    // of the globe are not picked.
    this._depthPlane.update(frameState);
  }

  environmentState.renderTranslucentDepthForPick = false;
  environmentState.useWebVR =
    this._useWebVR && this.mode !== SceneMode.SCENE2D && !offscreenPass;

  const occluder =
    frameState.mode === SceneMode.SCENE3D &&
    !globeTranslucencyState.sunVisibleThroughGlobe
      ? frameState.occluder
      : undefined;
  let cullingVolume = frameState.cullingVolume;

  // get user culling volume minus the far plane.
  const planes = scratchCullingVolume.planes;
  for (let k = 0; k < 5; ++k) {
    planes[k] = cullingVolume.planes[k];
  }
  cullingVolume = scratchCullingVolume;

  // Determine visibility of celestial and terrestrial environment effects.
  environmentState.isSkyAtmosphereVisible =
    defined(environmentState.skyAtmosphereCommand) &&
    environmentState.isReadyForAtmosphere;
  environmentState.isSunVisible = this.isVisible(
    cullingVolume,
    environmentState.sunDrawCommand,
    occluder,
  );
  environmentState.isMoonVisible = this.isVisible(
    cullingVolume,
    environmentState.moonCommand,
    occluder,
  );

  const envMaps = this.specularEnvironmentMaps;
  let specularEnvironmentCubeMap = this._specularEnvironmentCubeMap;
  if (defined(envMaps) && specularEnvironmentCubeMap?.url !== envMaps) {
    specularEnvironmentCubeMap =
      specularEnvironmentCubeMap && specularEnvironmentCubeMap.destroy();
    this._specularEnvironmentCubeMap = new SpecularEnvironmentCubeMap(envMaps);
  } else if (!defined(envMaps) && defined(specularEnvironmentCubeMap)) {
    specularEnvironmentCubeMap.destroy();
    this._specularEnvironmentCubeMap = undefined;
  }

  if (defined(this._specularEnvironmentCubeMap)) {
    this._specularEnvironmentCubeMap.update(frameState);
  }
};

function updateDebugFrustumPlanes(scene) {
  const frameState = scene._frameState;
  if (scene.debugShowFrustumPlanes !== scene._debugShowFrustumPlanes) {
    if (scene.debugShowFrustumPlanes) {
      scene._debugFrustumPlanes = new DebugCameraPrimitive({
        camera: scene.camera,
        updateOnChange: false,
        frustumSplits: frameState.frustumSplits,
      });
    } else {
      scene._debugFrustumPlanes =
        scene._debugFrustumPlanes && scene._debugFrustumPlanes.destroy();
    }
    scene._debugShowFrustumPlanes = scene.debugShowFrustumPlanes;
  }

  if (defined(scene._debugFrustumPlanes)) {
    scene._debugFrustumPlanes.update(frameState);
  }
}

function updateShadowMaps(scene) {
  const frameState = scene._frameState;
  const { passes, shadowState, shadowMaps } = frameState;
  const length = shadowMaps.length;

  const shadowsEnabled =
    length > 0 &&
    !passes.pick &&
    !passes.pickVoxel &&
    scene.mode === SceneMode.SCENE3D;
  if (shadowsEnabled !== shadowState.shadowsEnabled) {
    // Update derived commands when shadowsEnabled changes
    ++shadowState.lastDirtyTime;
    shadowState.shadowsEnabled = shadowsEnabled;
  }

  shadowState.lightShadowsEnabled = false;

  if (!shadowsEnabled) {
    return;
  }

  // Check if the shadow maps are different than the shadow maps last frame.
  // If so, the derived commands need to be updated.
  for (let j = 0; j < length; ++j) {
    if (shadowMaps[j] !== shadowState.shadowMaps[j]) {
      ++shadowState.lastDirtyTime;
      break;
    }
  }

  shadowState.shadowMaps.length = 0;
  shadowState.lightShadowMaps.length = 0;

  for (let i = 0; i < length; ++i) {
    const shadowMap = shadowMaps[i];
    shadowMap.update(frameState);

    shadowState.shadowMaps.push(shadowMap);

    if (shadowMap.fromLightSource) {
      shadowState.lightShadowMaps.push(shadowMap);
      shadowState.lightShadowsEnabled = true;
    }

    if (shadowMap.dirty) {
      ++shadowState.lastDirtyTime;
      shadowMap.dirty = false;
    }
  }
}

function updateAndRenderPrimitives(scene) {
  const frameState = scene._frameState;

  scene._groundPrimitives.update(frameState);
  scene._primitives.update(frameState);

  updateDebugFrustumPlanes(scene);
  updateShadowMaps(scene);

  if (scene._globe) {
    scene._globe.render(frameState);
  }
}

function updateAndClearFramebuffers(scene, passState, clearColor) {
  const context = scene._context;
  const frameState = scene._frameState;
  const environmentState = scene._environmentState;
  const view = scene._view;

  const passes = frameState.passes;
  const picking = passes.pick || passes.pickVoxel;
  if (defined(view.globeDepth)) {
    view.globeDepth.picking = picking;
  }
  const useWebVR = environmentState.useWebVR;

  // Preserve the reference to the original framebuffer.
  environmentState.originalFramebuffer = passState.framebuffer;

  // Manage sun bloom post-processing effect.
  if (defined(scene.sun) && scene.sunBloom !== scene._sunBloom) {
    if (scene.sunBloom && !useWebVR) {
      scene._sunPostProcess = new SunPostProcess();
    } else if (defined(scene._sunPostProcess)) {
      scene._sunPostProcess = scene._sunPostProcess.destroy();
    }

    scene._sunBloom = scene.sunBloom;
  } else if (!defined(scene.sun) && defined(scene._sunPostProcess)) {
    scene._sunPostProcess = scene._sunPostProcess.destroy();
    scene._sunBloom = false;
  }

  // Clear the pass state framebuffer.
  const clear = scene._clearColorCommand;
  Color.clone(clearColor, clear.color);
  clear.execute(context, passState);

  // Update globe depth rendering based on the current context and clear the globe depth framebuffer.
  // Globe depth is copied for the pick pass to support picking batched geometries in GroundPrimitives.
  const useGlobeDepthFramebuffer = (environmentState.useGlobeDepthFramebuffer =
    defined(view.globeDepth));
  if (useGlobeDepthFramebuffer) {
    view.globeDepth.update(
      context,
      passState,
      view.viewport,
      scene.msaaSamples,
      scene._hdr,
      environmentState.clearGlobeDepth,
    );
    view.globeDepth.clear(context, passState, clearColor);
  }

  // If supported, configure OIT to use the globe depth framebuffer and clear the OIT framebuffer.
  const oit = view.oit;
  const useOIT = (environmentState.useOIT =
    !picking && defined(oit) && oit.isSupported());
  if (useOIT) {
    oit.update(
      context,
      passState,
      view.globeDepth.colorFramebufferManager,
      scene._hdr,
      scene.msaaSamples,
    );
    oit.clear(context, passState, clearColor);
    environmentState.useOIT = oit.isSupported();
  }

  const postProcess = scene.postProcessStages;
  let usePostProcess = (environmentState.usePostProcess =
    !picking &&
    (scene._hdr ||
      postProcess.length > 0 ||
      postProcess.ambientOcclusion.enabled ||
      postProcess.fxaa.enabled ||
      postProcess.bloom.enabled));
  environmentState.usePostProcessSelected = false;
  if (usePostProcess) {
    view.sceneFramebuffer.update(
      context,
      view.viewport,
      scene._hdr,
      scene.msaaSamples,
    );
    view.sceneFramebuffer.clear(context, passState, clearColor);

    postProcess.update(context, frameState.useLogDepth, scene._hdr);
    postProcess.clear(context);

    usePostProcess = environmentState.usePostProcess = postProcess.ready;
    environmentState.usePostProcessSelected =
      usePostProcess && postProcess.hasSelected;
  }

  if (environmentState.isSunVisible && scene.sunBloom && !useWebVR) {
    passState.framebuffer = scene._sunPostProcess.update(passState);
    scene._sunPostProcess.clear(context, passState, clearColor);
  } else if (useGlobeDepthFramebuffer) {
    passState.framebuffer = view.globeDepth.framebuffer;
  } else if (usePostProcess) {
    passState.framebuffer = view.sceneFramebuffer.framebuffer;
  }

  if (defined(passState.framebuffer)) {
    clear.execute(context, passState);
  }

  const useInvertClassification = (environmentState.useInvertClassification =
    !picking && defined(passState.framebuffer) && scene.invertClassification);
  if (useInvertClassification) {
    let depthFramebuffer;
    if (frameState.invertClassificationColor.alpha === 1.0) {
      if (useGlobeDepthFramebuffer) {
        depthFramebuffer = view.globeDepth.framebuffer;
      }
    }

    if (defined(depthFramebuffer) || context.depthTexture) {
      scene._invertClassification.previousFramebuffer = depthFramebuffer;
      scene._invertClassification.update(
        context,
        scene.msaaSamples,
        view.globeDepth.colorFramebufferManager,
      );
      scene._invertClassification.clear(context, passState);

      if (frameState.invertClassificationColor.alpha < 1.0 && useOIT) {
        const command = scene._invertClassification.unclassifiedCommand;
        const derivedCommands = command.derivedCommands;
        derivedCommands.oit = oit.createDerivedCommands(
          command,
          context,
          derivedCommands.oit,
        );
      }
    } else {
      environmentState.useInvertClassification = false;
    }
  }

  if (scene._globeTranslucencyState.translucent) {
    view.globeTranslucencyFramebuffer.updateAndClear(
      scene._hdr,
      view.viewport,
      context,
      passState,
    );
  }
}

/**
 * @private
 */
Scene.prototype.resolveFramebuffers = function (passState) {
  const context = this._context;
  const environmentState = this._environmentState;
  const view = this._view;
  const { globeDepth, translucentTileClassification } = view;
  if (defined(globeDepth)) {
    globeDepth.prepareColorTextures(context);
  }

  const {
    useOIT,
    useGlobeDepthFramebuffer,
    usePostProcess,
    originalFramebuffer,
  } = environmentState;

  const globeFramebuffer = useGlobeDepthFramebuffer
    ? globeDepth.colorFramebufferManager
    : undefined;
  const sceneFramebuffer = view.sceneFramebuffer._colorFramebuffer;
  const idFramebuffer = view.sceneFramebuffer.idFramebuffer;

  if (useOIT) {
    passState.framebuffer = usePostProcess
      ? sceneFramebuffer.framebuffer
      : originalFramebuffer;
    view.oit.execute(context, passState);
  }

  if (
    translucentTileClassification.hasTranslucentDepth &&
    translucentTileClassification.isSupported()
  ) {
    translucentTileClassification.execute(this, passState);
  }

  if (usePostProcess) {
    view.sceneFramebuffer.prepareColorTextures(context);
    let inputFramebuffer = sceneFramebuffer;
    if (useGlobeDepthFramebuffer && !useOIT) {
      inputFramebuffer = globeFramebuffer;
    }

    const postProcess = this.postProcessStages;
    const colorTexture = inputFramebuffer.getColorTexture(0);
    const idTexture = idFramebuffer.getColorTexture(0);
    const depthTexture = (
      globeFramebuffer ?? sceneFramebuffer
    ).getDepthStencilTexture();
    postProcess.execute(context, colorTexture, depthTexture, idTexture);
    postProcess.copy(context, originalFramebuffer);
  }

  if (!useOIT && !usePostProcess && useGlobeDepthFramebuffer) {
    passState.framebuffer = originalFramebuffer;
    globeDepth.executeCopyColor(context, passState);
  }
};

function callAfterRenderFunctions(scene) {
  // Functions are queued up during primitive update and executed here in case
  // the function modifies scene state that should remain constant over the frame.
  const functions = scene._frameState.afterRender;
  for (let i = 0; i < functions.length; ++i) {
    const shouldRequestRender = functions[i]();
    if (shouldRequestRender) {
      scene.requestRender();
    }
  }

  functions.length = 0;
}

function getGlobeHeight(scene) {
  if (scene.mode === SceneMode.MORPHING) {
    return;
  }
  const cartographic = scene.camera.positionCartographic;
  return scene.getHeight(cartographic);
}

function getMaxPrimitiveHeight(primitive, cartographic, scene) {
  let maxHeight = Number.NEGATIVE_INFINITY;

  if (primitive instanceof PrimitiveCollection) {
    // If it's a PrimitiveCollection, iterate through its children
    const length = primitive.length;
    for (let i = 0; i < length; ++i) {
      const subPrimitive = primitive.get(i);
      const subHeight = getMaxPrimitiveHeight(
        subPrimitive,
        cartographic,
        scene,
      );
      if (defined(subHeight) && subHeight > maxHeight) {
        maxHeight = subHeight;
      }
    }
  } else if (
    primitive.isCesium3DTileset &&
    primitive.show &&
    primitive.enableCollision
  ) {
    // If it's an individual primitive, check its height
    const result = primitive.getHeight(cartographic, scene);
    if (defined(result) && result > maxHeight) {
      return result;
    }
  }

  return maxHeight;
}

/**
 * Gets the height of the loaded surface at the cartographic position.
 * @param {Cartographic} cartographic The cartographic position.
 * @param {HeightReference} [heightReference=CLAMP_TO_GROUND] Based on the height reference value, determines whether to ignore heights from 3D Tiles or terrain.
 * @private
 */
Scene.prototype.getHeight = function (cartographic, heightReference) {
  if (!defined(cartographic)) {
    return undefined;
  }

  const ignore3dTiles =
    heightReference === HeightReference.CLAMP_TO_TERRAIN ||
    heightReference === HeightReference.RELATIVE_TO_TERRAIN;

  const ignoreTerrain =
    heightReference === HeightReference.CLAMP_TO_3D_TILE ||
    heightReference === HeightReference.RELATIVE_TO_3D_TILE;

  if (!defined(cartographic)) {
    return;
  }

  let maxHeight = Number.NEGATIVE_INFINITY;

  if (!ignore3dTiles) {
    const maxPrimitiveHeight = getMaxPrimitiveHeight(
      this.primitives,
      cartographic,
      this,
    );
    if (defined(maxPrimitiveHeight) && maxPrimitiveHeight > maxHeight) {
      maxHeight = maxPrimitiveHeight;
    }
  }

  const globe = this._globe;
  if (!ignoreTerrain && defined(globe) && globe.show) {
    const result = globe.getHeight(cartographic);
    if (result > maxHeight) {
      maxHeight = result;
    }
  }

  if (maxHeight > Number.NEGATIVE_INFINITY) {
    return maxHeight;
  }

  return undefined;
};

const updateHeightScratchCartographic = new Cartographic();
/**
 * Calls the callback when a new tile is rendered that contains the given cartographic. The only parameter
 * is the cartesian position on the tile.
 *
 * @private
 *
 * @param {Cartographic} cartographic The cartographic position.
 * @param {Function} callback The function to be called when a new tile is loaded containing the updated cartographic.
 * @param {HeightReference} [heightReference=CLAMP_TO_GROUND] Based on the height reference value, determines whether to ignore heights from 3D Tiles or terrain.
 * @returns {Function} The function to remove this callback from the quadtree.
 */
Scene.prototype.updateHeight = function (
  cartographic,
  callback,
  heightReference,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.func("callback", callback);
  //>>includeEnd('debug');

  const ellipsoid = this._ellipsoid;
  const callbackWrapper = (clampedCartographic) => {
    Cartographic.clone(cartographic, updateHeightScratchCartographic);

    let height;
    if (defined(clampedCartographic)) {
      height = clampedCartographic.height;
    }
    if (!defined(height)) {
      height = this.getHeight(cartographic, heightReference);
    }
    if (defined(height)) {
      updateHeightScratchCartographic.height = height;
      callback(updateHeightScratchCartographic);
    }
  };

  const ignore3dTiles =
    heightReference === HeightReference.CLAMP_TO_TERRAIN ||
    heightReference === HeightReference.RELATIVE_TO_TERRAIN;

  const ignoreTerrain =
    heightReference === HeightReference.CLAMP_TO_3D_TILE ||
    heightReference === HeightReference.RELATIVE_TO_3D_TILE;

  let terrainRemoveCallback;
  if (!ignoreTerrain && defined(this.globe)) {
    terrainRemoveCallback = this.globe._surface.updateHeight(
      cartographic,
      callbackWrapper,
    );
  }

  let tilesetRemoveCallbacks = {};
  const createPrimitiveEventListener = (primitive) => {
    if (
      ignore3dTiles ||
      primitive.isDestroyed() ||
      !primitive.isCesium3DTileset
    ) {
      return;
    }

    const tilesetRemoveCallback = primitive.updateHeight(
      cartographic,
      callbackWrapper,
      ellipsoid,
    );
    tilesetRemoveCallbacks[primitive.id] = tilesetRemoveCallback;
  };

  if (!ignore3dTiles) {
    const length = this.primitives.length;
    for (let i = 0; i < length; ++i) {
      const primitive = this.primitives.get(i);
      createPrimitiveEventListener(primitive);
    }
  }

  const removeAddedListener = this.primitives.primitiveAdded.addEventListener(
    createPrimitiveEventListener,
  );
  const removeRemovedListener =
    this.primitives.primitiveRemoved.addEventListener((primitive) => {
      if (primitive.isDestroyed() || !primitive.isCesium3DTileset) {
        return;
      }
      if (defined(tilesetRemoveCallbacks[primitive.id])) {
        tilesetRemoveCallbacks[primitive.id]();
      }
      delete tilesetRemoveCallbacks[primitive.id];
    });

  const removeCallback = () => {
    terrainRemoveCallback = terrainRemoveCallback && terrainRemoveCallback();
    Object.values(tilesetRemoveCallbacks).forEach((tilesetRemoveCallback) =>
      tilesetRemoveCallback(),
    );
    tilesetRemoveCallbacks = {};
    removeAddedListener();
    removeRemovedListener();
  };

  return removeCallback;
};

function isCameraUnderground(scene) {
  const camera = scene.camera;
  const mode = scene._mode;
  const cameraController = scene._screenSpaceCameraController;
  const cartographic = camera.positionCartographic;

  if (!defined(cartographic)) {
    return false;
  }

  if (!cameraController.onMap() && cartographic.height < 0.0) {
    // The camera can go off the map while in Columbus View.
    // Make a best guess as to whether it's underground by checking if its height is less than zero.
    return true;
  }

  if (mode === SceneMode.SCENE2D || mode === SceneMode.MORPHING) {
    return false;
  }

  const globeHeight = scene._globeHeight;
  return defined(globeHeight) && cartographic.height < globeHeight;
}

/**
 * @private
 */
Scene.prototype.initializeFrame = function () {
  // Destroy released shaders and textures once every 120 frames to avoid thrashing the cache
  if (this._shaderFrameCount++ === 120) {
    this._shaderFrameCount = 0;
    this._context.shaderCache.destroyReleasedShaderPrograms();
    this._context.textureCache.destroyReleasedTextures();
  }

  this._tweens.update();

  if (this._globeHeightDirty) {
    if (defined(this._removeUpdateHeightCallback)) {
      this._removeUpdateHeightCallback();
      this._removeUpdateHeightCallback = undefined;
    }

    this._globeHeight = getGlobeHeight(this);
    this._globeHeightDirty = false;

    const cartographic = this.camera.positionCartographic;
    this._removeUpdateHeightCallback = this.updateHeight(
      cartographic,
      (updatedCartographic) => {
        if (this.isDestroyed()) {
          return;
        }

        this._globeHeight = updatedCartographic.height;
      },
    );
  }
  this._cameraUnderground = isCameraUnderground(this);
  this._globeTranslucencyState.update(this);

  this._screenSpaceCameraController.update();
  if (defined(this._deviceOrientationCameraController)) {
    this._deviceOrientationCameraController.update();
  }

  this.camera.update(this._mode);
  this.camera._updateCameraChanged();
};

function updateDebugShowFramesPerSecond(scene, renderedThisFrame) {
  if (scene.debugShowFramesPerSecond) {
    if (!defined(scene._performanceDisplay)) {
      const performanceContainer = document.createElement("div");
      performanceContainer.className =
        "cesium-performanceDisplay-defaultContainer";
      const container = scene._canvas.parentNode;
      container.appendChild(performanceContainer);
      const performanceDisplay = new PerformanceDisplay({
        container: performanceContainer,
      });
      scene._performanceDisplay = performanceDisplay;
      scene._performanceContainer = performanceContainer;
    }

    scene._performanceDisplay.throttled = scene.requestRenderMode;
    scene._performanceDisplay.update(renderedThisFrame);
  } else if (defined(scene._performanceDisplay)) {
    scene._performanceDisplay =
      scene._performanceDisplay && scene._performanceDisplay.destroy();
    scene._performanceContainer.parentNode.removeChild(
      scene._performanceContainer,
    );
  }
}

function prePassesUpdate(scene) {
  scene._jobScheduler.resetBudgets();

  const frameState = scene._frameState;
  scene.primitives.prePassesUpdate(frameState);

  if (defined(scene.globe)) {
    scene.globe.update(frameState);
  }

  scene._picking.update();
  frameState.creditDisplay.update();
}

function postPassesUpdate(scene) {
  scene.primitives.postPassesUpdate(scene._frameState);
  RequestScheduler.update();
}

const scratchBackgroundColor = new Color();

/**
 * Render the scene
 *
 * @param {Scene} scene
 * @private
 */
function render(scene) {
  const frameState = scene._frameState;

  const context = scene.context;
  const { uniformState } = context;

  const view = scene._defaultView;
  scene._view = view;

  scene.updateFrameState();
  frameState.passes.render = true;
  frameState.passes.postProcess = scene.postProcessStages.hasSelected;
  frameState.tilesetPassState = renderTilesetPassState;

  let backgroundColor = scene.backgroundColor ?? Color.BLACK;
  if (scene._hdr) {
    backgroundColor = Color.clone(backgroundColor, scratchBackgroundColor);
    backgroundColor.red = Math.pow(backgroundColor.red, scene.gamma);
    backgroundColor.green = Math.pow(backgroundColor.green, scene.gamma);
    backgroundColor.blue = Math.pow(backgroundColor.blue, scene.gamma);
  }
  frameState.backgroundColor = backgroundColor;

  frameState.atmosphere = scene.atmosphere;
  scene.fog.update(frameState);

  uniformState.update(frameState);

  const shadowMap = scene.shadowMap;
  if (defined(shadowMap) && shadowMap.enabled) {
    if (!defined(scene.light) || scene.light instanceof SunLight) {
      // Negate the sun direction so that it is from the Sun, not to the Sun
      Cartesian3.negate(
        uniformState.sunDirectionWC,
        scene._shadowMapCamera.direction,
      );
    } else {
      Cartesian3.clone(scene.light.direction, scene._shadowMapCamera.direction);
    }
    frameState.shadowMaps.push(shadowMap);
  }

  scene._computeCommandList.length = 0;
  scene._overlayCommandList.length = 0;

  const viewport = view.viewport;
  viewport.x = 0;
  viewport.y = 0;
  viewport.width = context.drawingBufferWidth;
  viewport.height = context.drawingBufferHeight;

  const passState = view.passState;
  passState.framebuffer = undefined;
  passState.blendingEnabled = undefined;
  passState.scissorTest = undefined;
  passState.viewport = BoundingRectangle.clone(viewport, passState.viewport);

  context.beginFrame();

  if (defined(scene.globe)) {
    scene.globe.beginFrame(frameState);
  }

  scene.updateEnvironment();
  scene.updateAndExecuteCommands(passState, backgroundColor);
  scene.resolveFramebuffers(passState);

  passState.framebuffer = undefined;
  executeOverlayCommands(scene, passState);

  if (defined(scene.globe)) {
    scene.globe.endFrame(frameState);

    if (!scene.globe.tilesLoaded) {
      scene._renderRequested = true;
    }
  }

  context.endFrame();
}

function tryAndCatchError(scene, functionToExecute) {
  try {
    functionToExecute(scene);
  } catch (error) {
    scene._renderError.raiseEvent(scene, error);

    if (scene.rethrowRenderErrors) {
      throw error;
    }
  }
}

function updateMostDetailedRayPicks(scene) {
  return scene._picking.updateMostDetailedRayPicks(scene);
}

/**
 * Update and render the scene. It is usually not necessary to call this function
 * directly because {@link CesiumWidget} will do it automatically.
 * @param {JulianDate} [time] The simulation time at which to render.
 */
Scene.prototype.render = function (time) {
  /**
   *
   * Pre passes update. Execute any pass invariant code that should run before the passes here.
   *
   */
  this._preUpdate.raiseEvent(this, time);

  const frameState = this._frameState;
  frameState.newFrame = false;

  if (!defined(time)) {
    time = JulianDate.now();
  }

  const cameraChanged = this._view.checkForCameraUpdates(this);
  if (cameraChanged) {
    this._globeHeightDirty = true;
  }

  // Determine if should render a new frame in request render mode
  let shouldRender =
    !this.requestRenderMode ||
    this._renderRequested ||
    cameraChanged ||
    this._logDepthBufferDirty ||
    this._hdrDirty ||
    this.mode === SceneMode.MORPHING;
  if (
    !shouldRender &&
    defined(this.maximumRenderTimeChange) &&
    defined(this._lastRenderTime)
  ) {
    const difference = Math.abs(
      JulianDate.secondsDifference(this._lastRenderTime, time),
    );
    shouldRender = shouldRender || difference > this.maximumRenderTimeChange;
  }

  if (shouldRender) {
    this._lastRenderTime = JulianDate.clone(time, this._lastRenderTime);
    this._renderRequested = false;
    this._logDepthBufferDirty = false;
    this._hdrDirty = false;

    const frameNumber = CesiumMath.incrementWrap(
      frameState.frameNumber,
      15000000.0,
      1.0,
    );
    updateFrameNumber(this, frameNumber, time);
    frameState.newFrame = true;
  }

  tryAndCatchError(this, prePassesUpdate);

  /**
   * Passes update. Add any passes here
   */
  if (this.primitives.show) {
    tryAndCatchError(this, updateMostDetailedRayPicks);
    tryAndCatchError(this, updatePreloadPass);
    tryAndCatchError(this, updatePreloadFlightPass);
    if (!shouldRender) {
      tryAndCatchError(this, updateRequestRenderModeDeferCheckPass);
    }
  }

  this._postUpdate.raiseEvent(this, time);

  if (shouldRender) {
    this._preRender.raiseEvent(this, time);
    frameState.creditDisplay.beginFrame();
    tryAndCatchError(this, render);
  }

  /**
   * Post passes update. Execute any pass invariant code that should run after the passes here.
   */
  updateDebugShowFramesPerSecond(this, shouldRender);
  tryAndCatchError(this, postPassesUpdate);

  // Often used to trigger events (so don't want in trycatch) that the user
  // might be subscribed to. Things like the tile load events, promises, etc.
  // We don't want those events to resolve during the render loop because the events might add new primitives
  callAfterRenderFunctions(this);

  if (shouldRender) {
    this._postRender.raiseEvent(this, time);
    frameState.creditDisplay.endFrame();
  }
};

/**
 * Update and render the scene. Always forces a new render frame regardless of whether a render was
 * previously requested.
 * @param {JulianDate} [time] The simulation time at which to render.
 *
 * @private
 */
Scene.prototype.forceRender = function (time) {
  this._renderRequested = true;
  this.render(time);
};

/**
 * Requests a new rendered frame when {@link Scene#requestRenderMode} is set to <code>true</code>.
 * The render rate will not exceed the {@link CesiumWidget#targetFrameRate}.
 *
 * @see Scene#requestRenderMode
 */
Scene.prototype.requestRender = function () {
  this._renderRequested = true;
};

/**
 * @private
 */
Scene.prototype.clampLineWidth = function (width) {
  return Math.max(
    ContextLimits.minimumAliasedLineWidth,
    Math.min(width, ContextLimits.maximumAliasedLineWidth),
  );
};

/**
 * Returns an object with a <code>primitive</code> property that contains the first (top) primitive in the scene
 * at a particular window coordinate or <code>undefined</code> if nothing is at the location. Other properties may
 * potentially be set depending on the type of primitive and may be used to further identify the picked object.
 * <p>
 * When a feature of a 3D Tiles tileset is picked, <code>pick</code> returns a {@link Cesium3DTileFeature} object.
 * </p>
 *
 * @example
 * // On mouse over, color the feature yellow.
 * handler.setInputAction(function(movement) {
 *     const feature = scene.pick(movement.endPosition);
 *     if (feature instanceof Cesium.Cesium3DTileFeature) {
 *         feature.color = Cesium.Color.YELLOW;
 *     }
 * }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
 *
 * @param {Cartesian2} windowPosition Window coordinates to perform picking on.
 * @param {number} [width=3] Width of the pick rectangle.
 * @param {number} [height=3] Height of the pick rectangle.
 * @returns {Object | undefined} Object containing the picked primitive or <code>undefined</code> if nothing is at the location.
 */
Scene.prototype.pick = function (windowPosition, width, height) {
  return this._picking.pick(this, windowPosition, width, height);
};

/**
 * Returns a {@link VoxelCell} for the voxel sample rendered at a particular window coordinate,
 * or <code>undefined</code> if no voxel is rendered at that position.
 *
 * @example
 * On left click, report the value of the "color" property at that voxel sample.
 * handler.setInputAction(function(movement) {
 *   const voxelCell = scene.pickVoxel(movement.position);
 *   if (defined(voxelCell)) {
 *     console.log(voxelCell.getProperty("color"));
 *   }
 * }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
 *
 * @param {Cartesian2} windowPosition Window coordinates to perform picking on.
 * @param {number} [width=3] Width of the pick rectangle.
 * @param {number} [height=3] Height of the pick rectangle.
 * @returns {VoxelCell|undefined} Information about the voxel cell rendered at the picked position or <code>undefined</code> if no voxel is rendered at that position.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
Scene.prototype.pickVoxel = function (windowPosition, width, height) {
  const pickedObject = this.pick(windowPosition, width, height);
  if (!defined(pickedObject)) {
    return;
  }
  const voxelPrimitive = pickedObject.primitive;
  if (!(voxelPrimitive instanceof VoxelPrimitive)) {
    return;
  }
  const voxelCoordinate = this._picking.pickVoxelCoordinate(
    this,
    windowPosition,
    width,
    height,
  );
  // Look up the keyframeNode containing this picked cell
  const tileIndex = 255 * voxelCoordinate[0] + voxelCoordinate[1];
  const keyframeNode = voxelPrimitive._traversal.findKeyframeNode(tileIndex);
  if (!defined(keyframeNode)) {
    // The tile rendered at the pick position has since been discarded by
    // a traversal update
    return;
  }
  // Look up the metadata for the picked cell
  const sampleIndex = 255 * voxelCoordinate[2] + voxelCoordinate[3];
  return VoxelCell.fromKeyframeNode(
    voxelPrimitive,
    tileIndex,
    sampleIndex,
    keyframeNode,
  );
};

/**
 * Pick a metadata value at the given window position.
 *
 * @param {Cartesian2} windowPosition Window coordinates to perform picking on.
 * @param {string|undefined} schemaId The ID of the metadata schema to pick values
 * from. If this is <code>undefined</code>, then it will pick the values from the object
 * that match the given class- and property name, regardless of the schema ID.
 * @param {string} className The name of the metadata class to pick
 * values from
 * @param {string} propertyName The name of the metadata property to pick
 * values from
 * @returns {MetadataValue|undefined} The metadata value, or <code>undefined</code> when
 * no matching metadata was found at the given position
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
Scene.prototype.pickMetadata = function (
  windowPosition,
  schemaId,
  className,
  propertyName,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("windowPosition", windowPosition);
  Check.typeOf.string("className", className);
  Check.typeOf.string("propertyName", propertyName);
  //>>includeEnd('debug');

  const pickedObject = this.pick(windowPosition);
  if (!defined(pickedObject)) {
    return undefined;
  }

  // Check if the picked object is a model that has structural
  // metadata, with a schema that contains the specified
  // property.
  const structuralMetadata = pickedObject.detail?.model?.structuralMetadata;
  if (!defined(structuralMetadata)) {
    return undefined;
  }
  const schema = structuralMetadata.schema;
  const classProperty = getMetadataClassProperty(
    schema,
    schemaId,
    className,
    propertyName,
  );
  if (!defined(classProperty)) {
    return undefined;
  }
  const metadataProperty = getMetadataProperty(
    structuralMetadata,
    className,
    propertyName,
  );
  if (!defined(metadataProperty)) {
    return undefined;
  }

  const pickedMetadataInfo = new PickedMetadataInfo(
    schemaId,
    className,
    propertyName,
    classProperty,
    metadataProperty,
  );

  const pickedMetadataValues = this._picking.pickMetadata(
    this,
    windowPosition,
    pickedMetadataInfo,
  );

  return pickedMetadataValues;
};

/**
 * Pick the schema of the metadata of the object at the given position
 *
 * @param {Cartesian2} windowPosition Window coordinates to perform picking on.
 * @returns {MetadataSchema | undefined} The metadata schema, or <code>undefined</code> if there is no object with
 * associated metadata at the given position.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
Scene.prototype.pickMetadataSchema = function (windowPosition) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("windowPosition", windowPosition);
  //>>includeEnd('debug');

  const pickedObject = this.pick(windowPosition);
  if (!defined(pickedObject)) {
    return undefined;
  }
  const schema = pickedObject.detail?.model?.structuralMetadata?.schema;
  return schema;
};

/**
 * Returns the cartesian position reconstructed from the depth buffer and window position.
 * The returned position is in world coordinates. Used internally by camera functions to
 * prevent conversion to projected 2D coordinates and then back.
 * <p>
 * Set {@link Scene#pickTranslucentDepth} to <code>true</code> to include the depth of
 * translucent primitives; otherwise, this essentially picks through translucent primitives.
 * </p>
 *
 * @private
 *
 * @param {Cartesian2} windowPosition Window coordinates to perform picking on.
 * @param {Cartesian3} [result] The object on which to restore the result.
 * @returns {Cartesian3} The cartesian position in world coordinates.
 *
 * @exception {DeveloperError} Picking from the depth buffer is not supported. Check pickPositionSupported.
 */
Scene.prototype.pickPositionWorldCoordinates = function (
  windowPosition,
  result,
) {
  return this._picking.pickPositionWorldCoordinates(
    this,
    windowPosition,
    result,
  );
};

/**
 * Returns the cartesian position reconstructed from the depth buffer and window position.
 * <p>
 * The position reconstructed from the depth buffer in 2D may be slightly different from those
 * reconstructed in 3D and Columbus view. This is caused by the difference in the distribution
 * of depth values of perspective and orthographic projection.
 * </p>
 * <p>
 * Set {@link Scene#pickTranslucentDepth} to <code>true</code> to include the depth of
 * translucent primitives; otherwise, this essentially picks through translucent primitives.
 * </p>
 *
 * @param {Cartesian2} windowPosition Window coordinates to perform picking on.
 * @param {Cartesian3} [result] The object on which to restore the result.
 * @returns {Cartesian3} The cartesian position.
 *
 * @exception {DeveloperError} Picking from the depth buffer is not supported. Check pickPositionSupported.
 */
Scene.prototype.pickPosition = function (windowPosition, result) {
  return this._picking.pickPosition(this, windowPosition, result);
};

/**
 * Returns a list of objects, each containing a <code>primitive</code> property, for all primitives at
 * a particular window coordinate position. Other properties may also be set depending on the
 * type of primitive and may be used to further identify the picked object. The primitives in
 * the list are ordered by their visual order in the scene (front to back).
 *
 * @param {Cartesian2} windowPosition Window coordinates to perform picking on.
 * @param {number} [limit] If supplied, stop drilling after collecting this many picks.
 * @param {number} [width=3] Width of the pick rectangle.
 * @param {number} [height=3] Height of the pick rectangle.
 * @returns {any[]} Array of objects, each containing 1 picked primitives.
 *
 * @exception {DeveloperError} windowPosition is undefined.
 *
 * @example
 * const pickedObjects = scene.drillPick(new Cesium.Cartesian2(100.0, 200.0));
 *
 * @see Scene#pick
 */
Scene.prototype.drillPick = function (windowPosition, limit, width, height) {
  return this._picking.drillPick(this, windowPosition, limit, width, height);
};

function updatePreloadPass(scene) {
  const frameState = scene._frameState;
  preloadTilesetPassState.camera = frameState.camera;
  preloadTilesetPassState.cullingVolume = frameState.cullingVolume;

  const primitives = scene.primitives;
  primitives.updateForPass(frameState, preloadTilesetPassState);
}

function updatePreloadFlightPass(scene) {
  const frameState = scene._frameState;
  const camera = frameState.camera;
  if (!camera.canPreloadFlight()) {
    return;
  }

  preloadFlightTilesetPassState.camera = scene.preloadFlightCamera;
  preloadFlightTilesetPassState.cullingVolume =
    scene.preloadFlightCullingVolume;

  const primitives = scene.primitives;
  primitives.updateForPass(frameState, preloadFlightTilesetPassState);
}

function updateRequestRenderModeDeferCheckPass(scene) {
  // Check if any ignored requests are ready to go (to wake rendering up again)
  scene.primitives.updateForPass(
    scene._frameState,
    requestRenderModeDeferCheckPassState,
  );
}

/**
 * Returns an object containing the first object intersected by the ray and the position of intersection,
 * or <code>undefined</code> if there were no intersections. The intersected object has a <code>primitive</code>
 * property that contains the intersected primitive. Other properties may be set depending on the type of primitive
 * and may be used to further identify the picked object. The ray must be given in world coordinates.
 * <p>
 * This function only picks globe tiles and 3D Tiles that are rendered in the current view. Picks all other
 * primitives regardless of their visibility.
 * </p>
 *
 * @private
 *
 * @param {Ray} ray The ray.
 * @param {Object[]} [objectsToExclude] A list of primitives, entities, or 3D Tiles features to exclude from the ray intersection.
 * @param {number} [width=0.1] Width of the intersection volume in meters.
 * @returns {object | undefined} An object containing the object and position of the first intersection or <code>undefined</code> if there are no intersections.
 *
 * @exception {DeveloperError} Ray intersections are only supported in 3D mode.
 */
Scene.prototype.pickFromRay = function (ray, objectsToExclude, width) {
  return this._picking.pickFromRay(this, ray, objectsToExclude, width);
};

/**
 * Returns a list of objects, each containing the object intersected by the ray and the position of intersection.
 * The intersected object has a <code>primitive</code> property that contains the intersected primitive. Other
 * properties may also be set depending on the type of primitive and may be used to further identify the picked object.
 * The primitives in the list are ordered by first intersection to last intersection. The ray must be given in
 * world coordinates.
 * <p>
 * This function only picks globe tiles and 3D Tiles that are rendered in the current view. Picks all other
 * primitives regardless of their visibility.
 * </p>
 *
 * @private
 *
 * @param {Ray} ray The ray.
 * @param {number} [limit=Number.MAX_VALUE] If supplied, stop finding intersections after this many intersections.
 * @param {Object[]} [objectsToExclude] A list of primitives, entities, or 3D Tiles features to exclude from the ray intersection.
 * @param {number} [width=0.1] Width of the intersection volume in meters.
 * @returns {Object[]} List of objects containing the object and position of each intersection.
 *
 * @exception {DeveloperError} Ray intersections are only supported in 3D mode.
 */
Scene.prototype.drillPickFromRay = function (
  ray,
  limit,
  objectsToExclude,
  width,
) {
  return this._picking.drillPickFromRay(
    this,
    ray,
    limit,
    objectsToExclude,
    width,
  );
};

/**
 * Initiates an asynchronous {@link Scene#pickFromRay} request using the maximum level of detail for 3D Tilesets
 * regardless of visibility.
 *
 * @private
 *
 * @param {Ray} ray The ray.
 * @param {Object[]} [objectsToExclude] A list of primitives, entities, or 3D Tiles features to exclude from the ray intersection.
 * @param {number} [width=0.1] Width of the intersection volume in meters.
 * @returns {Promise<object>} A promise that resolves to an object containing the object and position of the first intersection.
 *
 * @exception {DeveloperError} Ray intersections are only supported in 3D mode.
 */
Scene.prototype.pickFromRayMostDetailed = function (
  ray,
  objectsToExclude,
  width,
) {
  return this._picking.pickFromRayMostDetailed(
    this,
    ray,
    objectsToExclude,
    width,
  );
};

/**
 * Initiates an asynchronous {@link Scene#drillPickFromRay} request using the maximum level of detail for 3D Tilesets
 * regardless of visibility.
 *
 * @private
 *
 * @param {Ray} ray The ray.
 * @param {number} [limit=Number.MAX_VALUE] If supplied, stop finding intersections after this many intersections.
 * @param {Object[]} [objectsToExclude] A list of primitives, entities, or 3D Tiles features to exclude from the ray intersection.
 * @param {number} [width=0.1] Width of the intersection volume in meters.
 * @returns {Promise<Object[]>} A promise that resolves to a list of objects containing the object and position of each intersection.
 *
 * @exception {DeveloperError} Ray intersections are only supported in 3D mode.
 */
Scene.prototype.drillPickFromRayMostDetailed = function (
  ray,
  limit,
  objectsToExclude,
  width,
) {
  return this._picking.drillPickFromRayMostDetailed(
    this,
    ray,
    limit,
    objectsToExclude,
    width,
  );
};

/**
 * Returns the height of scene geometry at the given cartographic position or <code>undefined</code> if there was no
 * scene geometry to sample height from. The height of the input position is ignored. May be used to clamp objects to
 * the globe, 3D Tiles, or primitives in the scene.
 * <p>
 * This function only samples height from globe tiles and 3D Tiles that are rendered in the current view. Samples height
 * from all other primitives regardless of their visibility.
 * </p>
 *
 * @param {Cartographic} position The cartographic position to sample height from.
 * @param {Object[]} [objectsToExclude] A list of primitives, entities, or 3D Tiles features to not sample height from.
 * @param {number} [width=0.1] Width of the intersection volume in meters.
 * @returns {number | undefined} The height. This may be <code>undefined</code> if there was no scene geometry to sample height from.
 *
 * @example
 * const position = new Cesium.Cartographic(-1.31968, 0.698874);
 * const height = viewer.scene.sampleHeight(position);
 * console.log(height);
 *
 * @see Scene#clampToHeight
 * @see Scene#clampToHeightMostDetailed
 * @see Scene#sampleHeightMostDetailed
 *
 * @exception {DeveloperError} sampleHeight is only supported in 3D mode.
 * @exception {DeveloperError} sampleHeight requires depth texture support. Check sampleHeightSupported.
 */
Scene.prototype.sampleHeight = function (position, objectsToExclude, width) {
  return this._picking.sampleHeight(this, position, objectsToExclude, width);
};

/**
 * Clamps the given cartesian position to the scene geometry along the geodetic surface normal. Returns the
 * clamped position or <code>undefined</code> if there was no scene geometry to clamp to. May be used to clamp
 * objects to the globe, 3D Tiles, or primitives in the scene.
 * <p>
 * This function only clamps to globe tiles and 3D Tiles that are rendered in the current view. Clamps to
 * all other primitives regardless of their visibility.
 * </p>
 *
 * @param {Cartesian3} cartesian The cartesian position.
 * @param {Object[]} [objectsToExclude] A list of primitives, entities, or 3D Tiles features to not clamp to.
 * @param {number} [width=0.1] Width of the intersection volume in meters.
 * @param {Cartesian3} [result] An optional object to return the clamped position.
 * @returns {Cartesian3 | undefined} The modified result parameter or a new Cartesian3 instance if one was not provided. This may be <code>undefined</code> if there was no scene geometry to clamp to.
 *
 * @example
 * // Clamp an entity to the underlying scene geometry
 * const position = entity.position.getValue(Cesium.JulianDate.now());
 * entity.position = viewer.scene.clampToHeight(position);
 *
 * @see Scene#sampleHeight
 * @see Scene#sampleHeightMostDetailed
 * @see Scene#clampToHeightMostDetailed
 *
 * @exception {DeveloperError} clampToHeight is only supported in 3D mode.
 * @exception {DeveloperError} clampToHeight requires depth texture support. Check clampToHeightSupported.
 */
Scene.prototype.clampToHeight = function (
  cartesian,
  objectsToExclude,
  width,
  result,
) {
  return this._picking.clampToHeight(
    this,
    cartesian,
    objectsToExclude,
    width,
    result,
  );
};

/**
 * Initiates an asynchronous {@link Scene#sampleHeight} query for an array of {@link Cartographic} positions
 * using the maximum level of detail for 3D Tilesets in the scene. The height of the input positions is ignored.
 * Returns a promise that is resolved when the query completes. Each point height is modified in place.
 * If a height cannot be determined because no geometry can be sampled at that location, or another error occurs,
 * the height is set to <code>undefined</code>.
 *
 * @param {Cartographic[]} positions The cartographic positions to update with sampled heights.
 * @param {Object[]} [objectsToExclude] A list of primitives, entities, or 3D Tiles features to not sample height from.
 * @param {number} [width=0.1] Width of the intersection volume in meters.
 * @returns {Promise<Array<Cartographic | undefined>>} A promise that resolves to the provided list of positions when the query has completed. Positions may become <code>undefined</code> if the height cannot be determined.
 *
 * @example
 * const positions = [
 *     new Cesium.Cartographic(-1.31968, 0.69887),
 *     new Cesium.Cartographic(-1.10489, 0.83923)
 * ];
 * const promise = viewer.scene.sampleHeightMostDetailed(positions);
 * promise.then(function(updatedPosition) {
 *     // positions[0].height and positions[1].height have been updated.
 *     // updatedPositions is just a reference to positions.
 * }
 *
 * @see Scene#sampleHeight
 *
 * @exception {DeveloperError} sampleHeightMostDetailed is only supported in 3D mode.
 * @exception {DeveloperError} sampleHeightMostDetailed requires depth texture support. Check sampleHeightSupported.
 */
Scene.prototype.sampleHeightMostDetailed = function (
  positions,
  objectsToExclude,
  width,
) {
  return this._picking.sampleHeightMostDetailed(
    this,
    positions,
    objectsToExclude,
    width,
  );
};

/**
 * Initiates an asynchronous {@link Scene#clampToHeight} query for an array of {@link Cartesian3} positions
 * using the maximum level of detail for 3D Tilesets in the scene. Returns a promise that is resolved when
 * the query completes. Each position is modified in place. If a position cannot be clamped because no geometry
 * can be sampled at that location, or another error occurs, the element in the array is set to undefined.
 *
 * @param {Cartesian3[]} cartesians The cartesian positions to update with clamped positions.
 * @param {Object[]} [objectsToExclude] A list of primitives, entities, or 3D Tiles features to not clamp to.
 * @param {number} [width=0.1] Width of the intersection volume in meters.
 * @returns {Promise<Array<Cartesian3 | undefined>>} A promise that resolves to the provided list of positions when the query has completed. Positions may become <code>undefined</code> if they cannot be clamped.
 *
 * @example
 * const cartesians = [
 *     entities[0].position.getValue(Cesium.JulianDate.now()),
 *     entities[1].position.getValue(Cesium.JulianDate.now())
 * ];
 * const promise = viewer.scene.clampToHeightMostDetailed(cartesians);
 * promise.then(function(updatedCartesians) {
 *     entities[0].position = updatedCartesians[0];
 *     entities[1].position = updatedCartesians[1];
 * }
 *
 * @see Scene#clampToHeight
 *
 * @exception {DeveloperError} clampToHeightMostDetailed is only supported in 3D mode.
 * @exception {DeveloperError} clampToHeightMostDetailed requires depth texture support. Check clampToHeightSupported.
 */
Scene.prototype.clampToHeightMostDetailed = function (
  cartesians,
  objectsToExclude,
  width,
) {
  return this._picking.clampToHeightMostDetailed(
    this,
    cartesians,
    objectsToExclude,
    width,
  );
};

/**
 * Transforms a position in cartesian coordinates to canvas coordinates.  This is commonly used to place an
 * HTML element at the same screen position as an object in the scene.
 *
 * @param {Cartesian3} position The position in cartesian coordinates.
 * @param {Cartesian2} [result] An optional object to return the input position transformed to canvas coordinates.
 * @returns {Cartesian2 | undefined} The modified result parameter or a new Cartesian2 instance if one was not provided.  This may be <code>undefined</code> if the input position is near the center of the ellipsoid.
 *
 * @example
 * // Output the canvas position of longitude/latitude (0, 0) every time the mouse moves.
 * const scene = widget.scene;
 * const position = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
 * const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
 * handler.setInputAction(function(movement) {
 *     console.log(scene.cartesianToCanvasCoordinates(position));
 * }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
 */
Scene.prototype.cartesianToCanvasCoordinates = function (position, result) {
  return SceneTransforms.worldToWindowCoordinates(this, position, result);
};

/**
 * Instantly completes an active transition.
 */
Scene.prototype.completeMorph = function () {
  this._transitioner.completeMorph();
};

/**
 * Asynchronously transitions the scene to 2D.
 * @param {number} [duration=2.0] The amount of time, in seconds, for transition animations to complete.
 */
Scene.prototype.morphTo2D = function (duration) {
  duration = duration ?? 2.0;
  this._transitioner.morphTo2D(duration, this._ellipsoid);
};

/**
 * Asynchronously transitions the scene to Columbus View.
 * @param {number} [duration=2.0] The amount of time, in seconds, for transition animations to complete.
 */
Scene.prototype.morphToColumbusView = function (duration) {
  duration = duration ?? 2.0;
  this._transitioner.morphToColumbusView(duration, this._ellipsoid);
};

/**
 * Asynchronously transitions the scene to 3D.
 * @param {number} [duration=2.0] The amount of time, in seconds, for transition animations to complete.
 */
Scene.prototype.morphTo3D = function (duration) {
  duration = duration ?? 2.0;
  this._transitioner.morphTo3D(duration, this._ellipsoid);
};

function setTerrain(scene, terrain) {
  // Cancel any in-progress terrain update
  scene._removeTerrainProviderReadyListener =
    scene._removeTerrainProviderReadyListener &&
    scene._removeTerrainProviderReadyListener();

  // If the terrain is already loaded, set it immediately
  if (terrain.ready) {
    if (defined(scene.globe)) {
      scene.globe.terrainProvider = terrain.provider;
    }
    return;
  }
  // Otherwise, set a placeholder
  scene.globe.terrainProvider = undefined;
  scene._removeTerrainProviderReadyListener =
    terrain.readyEvent.addEventListener((provider) => {
      if (defined(scene) && defined(scene.globe)) {
        scene.globe.terrainProvider = provider;
      }

      scene._removeTerrainProviderReadyListener();
    });
}

/**
 * Update the terrain providing surface geometry for the globe.
 *
 * @param {Terrain} terrain The terrain provider async helper
 * @returns {Terrain} terrain The terrain provider async helper
 *
 * @example
 * // Use Cesium World Terrain
 * scene.setTerrain(Cesium.Terrain.fromWorldTerrain());
 *
 * @example
 * // Use a custom terrain provider
 * const terrain = new Cesium.Terrain(Cesium.CesiumTerrainProvider.fromUrl("https://myTestTerrain.com"));
 * scene.setTerrain(terrain);
 *
 * terrain.errorEvent.addEventListener(error => {
 *   alert(`Encountered an error while creating terrain! ${error}`);
 * });
 */
Scene.prototype.setTerrain = function (terrain) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("terrain", terrain);
  //>>includeEnd('debug');

  setTerrain(this, terrain);

  return terrain;
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see Scene#destroy
 */
Scene.prototype.isDestroyed = function () {
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
 * scene = scene && scene.destroy();
 *
 * @see Scene#isDestroyed
 */
Scene.prototype.destroy = function () {
  this._tweens.removeAll();
  this._computeEngine = this._computeEngine && this._computeEngine.destroy();
  this._screenSpaceCameraController =
    this._screenSpaceCameraController &&
    this._screenSpaceCameraController.destroy();
  this._deviceOrientationCameraController =
    this._deviceOrientationCameraController &&
    !this._deviceOrientationCameraController.isDestroyed() &&
    this._deviceOrientationCameraController.destroy();
  this._primitives = this._primitives && this._primitives.destroy();
  this._groundPrimitives =
    this._groundPrimitives && this._groundPrimitives.destroy();
  this._globe = this._globe && this._globe.destroy();
  this._removeTerrainProviderReadyListener =
    this._removeTerrainProviderReadyListener &&
    this._removeTerrainProviderReadyListener();
  this.skyBox = this.skyBox && this.skyBox.destroy();
  this.skyAtmosphere = this.skyAtmosphere && this.skyAtmosphere.destroy();
  this._debugSphere = this._debugSphere && this._debugSphere.destroy();
  this.sun = this.sun && this.sun.destroy();
  this._sunPostProcess = this._sunPostProcess && this._sunPostProcess.destroy();
  this._depthPlane = this._depthPlane && this._depthPlane.destroy();
  this._transitioner = this._transitioner && this._transitioner.destroy();
  this._debugFrustumPlanes =
    this._debugFrustumPlanes && this._debugFrustumPlanes.destroy();
  this._brdfLutGenerator =
    this._brdfLutGenerator && this._brdfLutGenerator.destroy();
  this._picking = this._picking && this._picking.destroy();

  this._defaultView = this._defaultView && this._defaultView.destroy();
  this._view = undefined;

  if (this._removeCreditContainer) {
    this._canvas.parentNode.removeChild(this._creditContainer);
  }

  this.postProcessStages =
    this.postProcessStages && this.postProcessStages.destroy();

  this._context = this._context && this._context.destroy();
  this._frameState.creditDisplay =
    this._frameState.creditDisplay && this._frameState.creditDisplay.destroy();

  if (defined(this._performanceDisplay)) {
    this._performanceDisplay =
      this._performanceDisplay && this._performanceDisplay.destroy();
    this._performanceContainer.parentNode.removeChild(
      this._performanceContainer,
    );
  }

  this._removeRequestListenerCallback();
  this._removeTaskProcessorListenerCallback();
  for (let i = 0; i < this._removeGlobeCallbacks.length; ++i) {
    this._removeGlobeCallbacks[i]();
  }
  this._removeGlobeCallbacks.length = 0;

  if (defined(this._removeUpdateHeightCallback)) {
    this._removeUpdateHeightCallback();
    this._removeUpdateHeightCallback = undefined;
  }

  return destroyObject(this);
};
export default Scene;
