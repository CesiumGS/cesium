import BoundingRectangle from "../Core/BoundingRectangle.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import BoxGeometry from "../Core/BoxGeometry.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import clone from "../Core/clone.js";
import Color from "../Core/Color.js";
import ColorGeometryInstanceAttribute from "../Core/ColorGeometryInstanceAttribute.js";
import createGuid from "../Core/createGuid.js";
import CullingVolume from "../Core/CullingVolume.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import EllipsoidGeometry from "../Core/EllipsoidGeometry.js";
import Event from "../Core/Event.js";
import GeographicProjection from "../Core/GeographicProjection.js";
import GeometryInstance from "../Core/GeometryInstance.js";
import GeometryPipeline from "../Core/GeometryPipeline.js";
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
import RequestScheduler from "../Core/RequestScheduler.js";
import TaskProcessor from "../Core/TaskProcessor.js";
import Transforms from "../Core/Transforms.js";
import ClearCommand from "../Renderer/ClearCommand.js";
import ComputeEngine from "../Renderer/ComputeEngine.js";
import Context from "../Renderer/Context.js";
import ContextLimits from "../Renderer/ContextLimits.js";
import Pass from "../Renderer/Pass.js";
import RenderState from "../Renderer/RenderState.js";
import BrdfLutGenerator from "./BrdfLutGenerator.js";
import Camera from "./Camera.js";
import Cesium3DTilePass from "./Cesium3DTilePass.js";
import Cesium3DTilePassState from "./Cesium3DTilePassState.js";
import CreditDisplay from "./CreditDisplay.js";
import DebugCameraPrimitive from "./DebugCameraPrimitive.js";
import DepthPlane from "./DepthPlane.js";
import DerivedCommand from "./DerivedCommand.js";
import DeviceOrientationCameraController from "./DeviceOrientationCameraController.js";
import Fog from "./Fog.js";
import FrameState from "./FrameState.js";
import GlobeDepth from "./GlobeDepth.js";
import GlobeTranslucencyState from "./GlobeTranslucencyState.js";
import ImagerySplitDirection from "./ImagerySplitDirection.js";
import InvertClassification from "./InvertClassification.js";
import JobScheduler from "./JobScheduler.js";
import MapMode2D from "./MapMode2D.js";
import OctahedralProjectedCubeMap from "./OctahedralProjectedCubeMap.js";
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
import StencilConstants from "./StencilConstants.js";
import SunLight from "./SunLight.js";
import SunPostProcess from "./SunPostProcess.js";
import TweenCollection from "./TweenCollection.js";
import View from "./View.js";
import DebugInspector from "./DebugInspector.js";

var requestRenderAfterFrame = function (scene) {
  return function () {
    scene.frameState.afterRender.push(function () {
      scene.requestRender();
    });
  };
};

/**
 * The container for all 3D graphical objects and state in a Cesium virtual scene.  Generally,
 * a scene is not created directly; instead, it is implicitly created by {@link CesiumWidget}.
 * <p>
 * <em><code>contextOptions</code> parameter details:</em>
 * </p>
 * <p>
 * The default values are:
 * <code>
 * {
 *   webgl : {
 *     alpha : false,
 *     depth : true,
 *     stencil : false,
 *     antialias : true,
 *     powerPreference: 'high-performance',
 *     premultipliedAlpha : true,
 *     preserveDrawingBuffer : false,
 *     failIfMajorPerformanceCaveat : false
 *   },
 *   allowTextureFilterAnisotropic : true
 * }
 * </code>
 * </p>
 * <p>
 * The <code>webgl</code> property corresponds to the {@link http://www.khronos.org/registry/webgl/specs/latest/#5.2|WebGLContextAttributes}
 * object used to create the WebGL context.
 * </p>
 * <p>
 * <code>webgl.alpha</code> defaults to false, which can improve performance compared to the standard WebGL default
 * of true.  If an application needs to composite Cesium above other HTML elements using alpha-blending, set
 * <code>webgl.alpha</code> to true.
 * </p>
 * <p>
 * The other <code>webgl</code> properties match the WebGL defaults for {@link http://www.khronos.org/registry/webgl/specs/latest/#5.2|WebGLContextAttributes}.
 * </p>
 * <p>
 * <code>allowTextureFilterAnisotropic</code> defaults to true, which enables anisotropic texture filtering when the
 * WebGL extension is supported.  Setting this to false will improve performance, but hurt visual quality, especially for horizon views.
 * </p>
 *
 * @alias Scene
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {HTMLCanvasElement} options.canvas The HTML canvas element to create the scene for.
 * @param {Object} [options.contextOptions] Context and WebGL creation properties.  See details above.
 * @param {Element} [options.creditContainer] The HTML element in which the credits will be displayed.
 * @param {Element} [options.creditViewport] The HTML element in which to display the credit popup.  If not specified, the viewport will be a added as a sibling of the canvas.
 * @param {MapProjection} [options.mapProjection=new GeographicProjection()] The map projection to use in 2D and Columbus View modes.
 * @param {Boolean} [options.orderIndependentTranslucency=true] If true and the configuration supports it, use order independent translucency.
 * @param {Boolean} [options.scene3DOnly=false] If true, optimizes memory use and performance for 3D mode but disables the ability to use 2D or Columbus View.
 * @param {Boolean} [options.shadows=false] Determines if shadows are cast by light sources.
 * @param {MapMode2D} [options.mapMode2D=MapMode2D.INFINITE_SCROLL] Determines if the 2D map is rotatable or can be scrolled infinitely in the horizontal direction.
 * @param {Boolean} [options.requestRenderMode=false] If true, rendering a frame will only occur when needed as determined by changes within the scene. Enabling improves performance of the application, but requires using {@link Scene#requestRender} to render a new frame explicitly in this mode. This will be necessary in many cases after making changes to the scene in other parts of the API. See {@link https://cesium.com/blog/2018/01/24/cesium-scene-rendering-performance/|Improving Performance with Explicit Rendering}.
 * @param {Number} [options.maximumRenderTimeChange=0.0] If requestRenderMode is true, this value defines the maximum change in simulation time allowed before a render is requested. See {@link https://cesium.com/blog/2018/01/24/cesium-scene-rendering-performance/|Improving Performance with Explicit Rendering}.
 *
 * @see CesiumWidget
 * @see {@link http://www.khronos.org/registry/webgl/specs/latest/#5.2|WebGLContextAttributes}
 *
 * @exception {DeveloperError} options and options.canvas are required.
 *
 * @example
 * // Create scene without anisotropic texture filtering
 * var scene = new Cesium.Scene({
 *   canvas : canvas,
 *   contextOptions : {
 *     allowTextureFilterAnisotropic : false
 *   }
 * });
 */
function Scene(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var canvas = options.canvas;
  var creditContainer = options.creditContainer;
  var creditViewport = options.creditViewport;

  var contextOptions = clone(options.contextOptions);
  if (!defined(contextOptions)) {
    contextOptions = {};
  }
  if (!defined(contextOptions.webgl)) {
    contextOptions.webgl = {};
  }
  contextOptions.webgl.powerPreference = defaultValue(
    contextOptions.webgl.powerPreference,
    "high-performance"
  );

  //>>includeStart('debug', pragmas.debug);
  if (!defined(canvas)) {
    throw new DeveloperError("options and options.canvas are required.");
  }
  //>>includeEnd('debug');
  var hasCreditContainer = defined(creditContainer);
  var context = new Context(canvas, contextOptions);
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
    new CreditDisplay(creditContainer, " • ", creditViewport),
    this._jobScheduler
  );
  this._frameState.scene3DOnly = defaultValue(options.scene3DOnly, false);
  this._removeCreditContainer = !hasCreditContainer;
  this._creditContainer = creditContainer;

  this._canvas = canvas;
  this._context = context;
  this._computeEngine = new ComputeEngine(context);
  this._globe = undefined;
  this._globeTranslucencyState = new GlobeTranslucencyState();
  this._primitives = new PrimitiveCollection();
  this._groundPrimitives = new PrimitiveCollection();

  this._globeHeight = undefined;
  this._cameraUnderground = false;

  this._logDepthBuffer = context.fragmentDepth;
  this._logDepthBufferDirty = true;

  this._tweens = new TweenCollection();

  this._shaderFrameCount = 0;

  this._sunPostProcess = undefined;

  this._computeCommandList = [];
  this._overlayCommandList = [];

  this._useOIT = defaultValue(options.orderIndependentTranslucency, true);
  this._executeOITFunction = undefined;

  this._depthPlane = new DepthPlane();

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

  /**
   * Exceptions occurring in <code>render</code> are always caught in order to raise the
   * <code>renderError</code> event.  If this property is true, the error is rethrown
   * after the event is raised.  If this property is false, the <code>render</code> function
   * returns normally after raising the event.
   *
   * @type {Boolean}
   * @default false
   */
  this.rethrowRenderErrors = false;

  /**
   * Determines whether or not to instantly complete the
   * scene transition animation on user input.
   *
   * @type {Boolean}
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
   * @type {SkyBox}
   * @default undefined
   *
   * @see Scene#backgroundColor
   */
  this.skyBox = undefined;

  /**
   * The sky atmosphere drawn around the globe.
   *
   * @type {SkyAtmosphere}
   * @default undefined
   */
  this.skyAtmosphere = undefined;

  /**
   * The {@link Sun}.
   *
   * @type {Sun}
   * @default undefined
   */
  this.sun = undefined;

  /**
   * Uses a bloom filter on the sun when enabled.
   *
   * @type {Boolean}
   * @default true
   */
  this.sunBloom = true;
  this._sunBloom = undefined;

  /**
   * The {@link Moon}
   *
   * @type Moon
   * @default undefined
   */
  this.moon = undefined;

  /**
   * The background color, which is only visible if there is no sky box, i.e., {@link Scene#skyBox} is undefined.
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
    : new GeographicProjection();

  /**
   * The current morph transition time between 2D/Columbus View and 3D,
   * with 0.0 being 2D or Columbus View and 1.0 being 3D.
   *
   * @type {Number}
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
   * @type {Number}
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
   * @type {Number}
   * @default 1e9
   */
  this.logarithmicDepthFarToNearRatio = 1e9;

  /**
   * Determines the uniform depth size in meters of each frustum of the multifrustum in 2D. If a primitive or model close
   * to the surface shows z-fighting, decreasing this will eliminate the artifact, but decrease performance. On the
   * other hand, increasing this will increase performance but may cause z-fighting among primitives close to the surface.
   *
   * @type {Number}
   * @default 1.75e6
   */
  this.nearToFarDistance2D = 1.75e6;

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
   * @type Function
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
   * var billboards = new Cesium.BillboardCollection();
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
   * @type Boolean
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
   * @type Boolean
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
   * @type Boolean
   *
   * @default false
   */
  this.debugShowFramesPerSecond = false;

  /**
   * This property is for debugging only; it is not for production use.
   * <p>
   * Displays depth information for the indicated frustum.
   * </p>
   *
   * @type Boolean
   *
   * @default false
   */
  this.debugShowGlobeDepth = false;

  /**
   * This property is for debugging only; it is not for production use.
   * <p>
   * Indicates which frustum will have depth information displayed.
   * </p>
   *
   * @type Number
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
   * @type Boolean
   *
   * @default false
   */
  this.debugShowFrustumPlanes = false;
  this._debugShowFrustumPlanes = false;
  this._debugFrustumPlanes = undefined;

  /**
   * When <code>true</code>, enables picking using the depth buffer.
   *
   * @type Boolean
   * @default true
   */
  this.useDepthPicking = true;

  /**
   * When <code>true</code>, enables picking translucent geometry using the depth buffer. Note that {@link Scene#useDepthPicking} must also be true for enabling this to work.
   *
   * <p>
   * Render must be called between picks.
   * <br>There is a decrease in performance when enabled. There are extra draw calls to write depth for
   * translucent geometry.
   * </p>
   *
   * @example
   * // picking the position of a translucent primitive
   * viewer.screenSpaceEventHandler.setInputAction(function onLeftClick(movement) {
   *      var pickedFeature = viewer.scene.pick(movement.position);
   *      if (!Cesium.defined(pickedFeature)) {
   *          // nothing picked
   *          return;
   *      }
   *      viewer.scene.render();
   *      var worldPosition = viewer.scene.pickPosition(movement.position);
   * }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
   *
   * @type {Boolean}
   * @default false
   */
  this.pickTranslucentDepth = false;

  /**
   * The time in milliseconds to wait before checking if the camera has not moved and fire the cameraMoveEnd event.
   * @type {Number}
   * @default 500.0
   * @private
   */
  this.cameraEventWaitTime = 500.0;

  /**
   * Blends the atmosphere to geometry far from the camera for horizon views. Allows for additional
   * performance improvements by rendering less geometry and dispatching less terrain requests.
   * @type {Fog}
   */
  this.fog = new Fog();

  this._shadowMapCamera = new Camera(this);

  /**
   * The shadow map for the scene's light source. When enabled, models, primitives, and the globe may cast and receive shadows.
   * @type {ShadowMap}
   */
  this.shadowMap = new ShadowMap({
    context: context,
    lightCamera: this._shadowMapCamera,
    enabled: defaultValue(options.shadows, false),
  });

  /**
   * When <code>false</code>, 3D Tiles will render normally. When <code>true</code>, classified 3D Tile geometry will render normally and
   * unclassified 3D Tile geometry will render with the color multiplied by {@link Scene#invertClassificationColor}.
   * @type {Boolean}
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
    this._invertClassificationColor
  );
  this._invertClassification = new InvertClassification();

  /**
   * The focal length for use when with cardboard or WebVR.
   * @type {Number}
   */
  this.focalLength = undefined;

  /**
   * The eye separation distance in meters for use with cardboard or WebVR.
   * @type {Number}
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
  this._mapMode2D = defaultValue(options.mapMode2D, MapMode2D.INFINITE_SCROLL);

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
    separatePrimitiveFramebuffer: false,
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
   * @type {Boolean}
   * @default false
   */
  this.requestRenderMode = defaultValue(options.requestRenderMode, false);
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
   * @type {Number}
   * @default 0.0
   */
  this.maximumRenderTimeChange = defaultValue(
    options.maximumRenderTimeChange,
    0.0
  );
  this._lastRenderTime = undefined;
  this._frameRateMonitor = undefined;

  this._removeRequestListenerCallback = RequestScheduler.requestCompletedEvent.addEventListener(
    requestRenderAfterFrame(this)
  );
  this._removeTaskProcessorListenerCallback = TaskProcessor.taskCompletedEvent.addEventListener(
    requestRenderAfterFrame(this)
  );
  this._removeGlobeCallbacks = [];

  var viewport = new BoundingRectangle(
    0,
    0,
    context.drawingBufferWidth,
    context.drawingBufferHeight
  );
  var camera = new Camera(this);

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
   * @type {String}
   */
  this.specularEnvironmentMaps = undefined;
  this._specularEnvironmentMapAtlas = undefined;

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

function updateGlobeListeners(scene, globe) {
  for (var i = 0; i < scene._removeGlobeCallbacks.length; ++i) {
    scene._removeGlobeCallbacks[i]();
  }
  scene._removeGlobeCallbacks.length = 0;

  var removeGlobeCallbacks = [];
  if (defined(globe)) {
    removeGlobeCallbacks.push(
      globe.imageryLayersUpdatedEvent.addEventListener(
        requestRenderAfterFrame(scene)
      )
    );
    removeGlobeCallbacks.push(
      globe.terrainProviderChanged.addEventListener(
        requestRenderAfterFrame(scene)
      )
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
   * @type {Number}
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
   * The drawingBufferHeight of the underlying GL context.
   * @memberof Scene.prototype
   *
   * @type {Number}
   * @readonly
   *
   * @see {@link https://www.khronos.org/registry/webgl/specs/1.0/#DOM-WebGLRenderingContext-drawingBufferHeight|drawingBufferHeight}
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
   * @type {Number}
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
   * @type {Number}
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
   * @type {Boolean}
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
   * @type {Boolean}
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
   * @type {Boolean}
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
   * @type {Boolean}
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
   * @type {Boolean}
   * @readonly
   *
   * @see Scene#specularEnvironmentMaps
   */
  specularEnvironmentMapsSupported: {
    get: function () {
      return OctahedralProjectedCubeMap.isSupported(this._context);
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
   * Gets the simulation time when the scene was last rendered. Returns undefined if the scene has not yet been
   * rendered.
   * @memberof Scene.prototype
   *
   * @type {JulianDate}
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
   * @type {Object}
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
   * @type {Boolean}
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
   * @type {Boolean}
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
   * @type {String}
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
          "Only SceneMode.SCENE3D is valid when scene3DOnly is true."
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
          "value must be a valid SceneMode enumeration."
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
   * @type {Number}
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
   * @type {Boolean}
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
          "VR is unsupported with an orthographic projection."
        );
      }
      //>>includeEnd('debug');
      this._useWebVR = value;
      if (this._useWebVR) {
        this._frameState.creditDisplay.container.style.visibility = "hidden";
        this._cameraVR = new Camera(this);
        if (!defined(this._deviceOrientationCameraController)) {
          this._deviceOrientationCameraController = new DeviceOrientationCameraController(
            this
          );
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
   * Gets or sets the position of the Imagery splitter within the viewport.  Valid values are between 0.0 and 1.0.
   * @memberof Scene.prototype
   *
   * @type {Number}
   */
  imagerySplitPosition: {
    get: function () {
      return this._frameState.imagerySplitPosition;
    },
    set: function (value) {
      this._frameState.imagerySplitPosition = value;
    },
  },

  /**
   * The distance from the camera at which to disable the depth test of billboards, labels and points
   * to, for example, prevent clipping against terrain. When set to zero, the depth test should always
   * be applied. When less than zero, the depth test should never be applied. Setting the disableDepthTestDistance
   * property of a billboard, label or point will override this value.
   * @memberof Scene.prototype
   * @type {Number}
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
          "minimumDisableDepthTestDistance must be greater than or equal to 0.0."
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
   * @type {Boolean}
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
   * @type {Number}
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
   * @type {Boolean}
   * @default true
   */
  highDynamicRange: {
    get: function () {
      return this._hdr;
    },
    set: function (value) {
      var context = this._context;
      var hdr =
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
   * @type {Boolean}
   * @readonly
   * @default true
   */
  highDynamicRangeSupported: {
    get: function () {
      var context = this._context;
      return (
        context.depthTexture &&
        (context.colorBufferFloat || context.colorBufferHalfFloat)
      );
    },
  },

  /**
   * Whether or not the camera is underneath the globe.
   * @memberof Scene.prototype
   * @type {Boolean}
   * @readonly
   * @default false
   */
  cameraUnderground: {
    get: function () {
      return this._cameraUnderground;
    },
  },

  /**
   * Ratio between a pixel and a density-independent pixel. Provides a standard unit of
   * measure for real pixel measurements appropriate to a particular device.
   *
   * @memberof Scene.prototype
   * @type {Number}
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
 * @param {String} format The texture format. May be the name of the format or the WebGL extension name, e.g. s3tc or WEBGL_compressed_texture_s3tc.
 * @return {boolean} Whether or not the format is supported.
 */
Scene.prototype.getCompressedTextureFormatSupported = function (format) {
  var context = this.context;
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

function updateDerivedCommands(scene, command, shadowsDirty) {
  var frameState = scene._frameState;
  var context = scene._context;
  var oit = scene._view.oit;
  var lightShadowMaps = frameState.shadowState.lightShadowMaps;
  var lightShadowsEnabled = frameState.shadowState.lightShadowsEnabled;

  var derivedCommands = command.derivedCommands;

  if (defined(command.pickId)) {
    derivedCommands.picking = DerivedCommand.createPickDerivedCommand(
      scene,
      command,
      context,
      derivedCommands.picking
    );
  }

  if (!command.pickOnly) {
    derivedCommands.depth = DerivedCommand.createDepthOnlyDerivedCommand(
      scene,
      command,
      context,
      derivedCommands.depth
    );
  }

  derivedCommands.originalCommand = command;

  if (scene._hdr) {
    derivedCommands.hdr = DerivedCommand.createHdrCommand(
      command,
      context,
      derivedCommands.hdr
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
      derivedCommands.shadows
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
        derivedCommands.oit.shadows
      );
    } else {
      derivedCommands.oit = oit.createDerivedCommands(
        command,
        context,
        derivedCommands.oit
      );
    }
  }
}

/**
 * @private
 */
Scene.prototype.updateDerivedCommands = function (command) {
  if (!defined(command.derivedCommands)) {
    // Is not a DrawCommand
    return;
  }

  var frameState = this._frameState;
  var context = this._context;

  // Update derived commands when any shadow maps become dirty
  var shadowsDirty = false;
  var lastDirtyTime = frameState.shadowState.lastDirtyTime;
  if (command.lastDirtyTime !== lastDirtyTime) {
    command.lastDirtyTime = lastDirtyTime;
    command.dirty = true;
    shadowsDirty = true;
  }

  var derivedCommands = command.derivedCommands;

  var useSplitting =
    defined(command.owner) &&
    defined(command.owner.primitive) &&
    defined(command.owner.primitive.splitDirection) &&
    command.owner.primitive.splitDirection !== ImagerySplitDirection.NONE;

  if (useSplitting) {
    if (!defined(derivedCommands.splitting) || command.dirty) {
      derivedCommands.splitting = DerivedCommand.createSplittingCommand(
        command,
        context,
        derivedCommands.splitting
      );
    }

    command = derivedCommands.splitting.command;
    derivedCommands = command.derivedCommands;
  }

  var useLogDepth = frameState.useLogDepth;
  var useHdr = this._hdr;
  var hasLogDepthDerivedCommands = defined(derivedCommands.logDepth);
  var hasHdrCommands = defined(derivedCommands.hdr);
  var hasDerivedCommands = defined(derivedCommands.originalCommand);
  var needsLogDepthDerivedCommands = useLogDepth && !hasLogDepthDerivedCommands;
  var needsHdrCommands = useHdr && !hasHdrCommands;
  var needsDerivedCommands = (!useLogDepth || !useHdr) && !hasDerivedCommands;
  command.dirty =
    command.dirty ||
    needsLogDepthDerivedCommands ||
    needsHdrCommands ||
    needsDerivedCommands;

  if (command.dirty) {
    command.dirty = false;

    var shadowMaps = frameState.shadowState.shadowMaps;
    var shadowsEnabled = frameState.shadowState.shadowsEnabled;
    if (shadowsEnabled && command.castShadows) {
      derivedCommands.shadows = ShadowMap.createCastDerivedCommand(
        shadowMaps,
        command,
        shadowsDirty,
        context,
        derivedCommands.shadows
      );
    }

    if (hasLogDepthDerivedCommands || needsLogDepthDerivedCommands) {
      derivedCommands.logDepth = DerivedCommand.createLogDepthCommand(
        command,
        context,
        derivedCommands.logDepth
      );
      updateDerivedCommands(
        this,
        derivedCommands.logDepth.command,
        shadowsDirty
      );
    }
    if (hasDerivedCommands || needsDerivedCommands) {
      updateDerivedCommands(this, command, shadowsDirty);
    }
  }
};

var renderTilesetPassState = new Cesium3DTilePassState({
  pass: Cesium3DTilePass.RENDER,
});

var preloadTilesetPassState = new Cesium3DTilePassState({
  pass: Cesium3DTilePass.PRELOAD,
});

var preloadFlightTilesetPassState = new Cesium3DTilePassState({
  pass: Cesium3DTilePass.PRELOAD_FLIGHT,
});

var requestRenderModeDeferCheckPassState = new Cesium3DTilePassState({
  pass: Cesium3DTilePass.REQUEST_RENDER_MODE_DEFER_CHECK,
});

var scratchOccluderBoundingSphere = new BoundingSphere();
var scratchOccluder;

function getOccluder(scene) {
  // TODO: The occluder is the top-level globe. When we add
  //       support for multiple central bodies, this should be the closest one.
  var globe = scene.globe;
  if (
    scene._mode === SceneMode.SCENE3D &&
    defined(globe) &&
    globe.show &&
    !scene._cameraUnderground &&
    !scene._globeTranslucencyState.translucent
  ) {
    var ellipsoid = globe.ellipsoid;
    var minimumTerrainHeight = scene.frameState.minimumTerrainHeight;
    scratchOccluderBoundingSphere.radius =
      ellipsoid.minimumRadius + minimumTerrainHeight;
    scratchOccluder = Occluder.fromBoundingSphere(
      scratchOccluderBoundingSphere,
      scene.camera.positionWC,
      scratchOccluder
    );
    return scratchOccluder;
  }

  return undefined;
}

/**
 * @private
 */
Scene.prototype.clearPasses = function (passes) {
  passes.render = false;
  passes.pick = false;
  passes.depth = false;
  passes.postProcess = false;
  passes.offscreen = false;
};

function updateFrameNumber(scene, frameNumber, time) {
  var frameState = scene._frameState;
  frameState.frameNumber = frameNumber;
  frameState.time = JulianDate.clone(time, frameState.time);
}

/**
 * @private
 */
Scene.prototype.updateFrameState = function () {
  var camera = this.camera;

  var frameState = this._frameState;
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
    camera.upWC
  );
  frameState.occluder = getOccluder(this);
  frameState.minimumTerrainHeight = 0.0;
  frameState.minimumDisableDepthTestDistance = this._minimumDisableDepthTestDistance;
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

  if (defined(this.globe)) {
    frameState.terrainExaggeration = this.globe.terrainExaggeration;
    frameState.terrainExaggerationRelativeHeight = this.globe.terrainExaggerationRelativeHeight;
  }

  if (
    defined(this._specularEnvironmentMapAtlas) &&
    this._specularEnvironmentMapAtlas.ready
  ) {
    frameState.specularEnvironmentMaps = this._specularEnvironmentMapAtlas.texture;
    frameState.specularEnvironmentMapsMaximumLOD = this._specularEnvironmentMapAtlas.maximumMipmapLevel;
  } else {
    frameState.specularEnvironmentMaps = undefined;
    frameState.specularEnvironmentMapsMaximumLOD = undefined;
  }

  frameState.sphericalHarmonicCoefficients = this.sphericalHarmonicCoefficients;

  this._actualInvertClassificationColor = Color.clone(
    this.invertClassificationColor,
    this._actualInvertClassificationColor
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
 * @private
 */
Scene.prototype.isVisible = function (command, cullingVolume, occluder) {
  return (
    defined(command) &&
    (!defined(command.boundingVolume) ||
      !command.cull ||
      (cullingVolume.computeVisibility(command.boundingVolume) !==
        Intersect.OUTSIDE &&
        (!defined(occluder) ||
          !command.occlude ||
          !command.boundingVolume.isOccluded(occluder))))
  );
};

var transformFrom2D = new Matrix4(
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
  1.0
);
transformFrom2D = Matrix4.inverseTransformation(
  transformFrom2D,
  transformFrom2D
);

function debugShowBoundingVolume(command, scene, passState, debugFramebuffer) {
  // Debug code to draw bounding volume for command.  Not optimized!
  // Assumes bounding volume is a bounding sphere or box
  var frameState = scene._frameState;
  var context = frameState.context;
  var boundingVolume = command.boundingVolume;

  if (defined(scene._debugVolume)) {
    scene._debugVolume.destroy();
  }

  var geometry;

  var center = Cartesian3.clone(boundingVolume.center);
  if (frameState.mode !== SceneMode.SCENE3D) {
    center = Matrix4.multiplyByPoint(transformFrom2D, center, center);
    var projection = frameState.mapProjection;
    var centerCartographic = projection.unproject(center);
    center = projection.ellipsoid.cartographicToCartesian(centerCartographic);
  }

  if (defined(boundingVolume.radius)) {
    var radius = boundingVolume.radius;

    geometry = GeometryPipeline.toWireframe(
      EllipsoidGeometry.createGeometry(
        new EllipsoidGeometry({
          radii: new Cartesian3(radius, radius, radius),
          vertexFormat: PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
        })
      )
    );

    scene._debugVolume = new Primitive({
      geometryInstances: new GeometryInstance({
        geometry: geometry,
        modelMatrix: Matrix4.fromTranslation(center),
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
  } else {
    var halfAxes = boundingVolume.halfAxes;

    geometry = GeometryPipeline.toWireframe(
      BoxGeometry.createGeometry(
        BoxGeometry.fromDimensions({
          dimensions: new Cartesian3(2.0, 2.0, 2.0),
          vertexFormat: PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
        })
      )
    );

    scene._debugVolume = new Primitive({
      geometryInstances: new GeometryInstance({
        geometry: geometry,
        modelMatrix: Matrix4.fromRotationTranslation(
          halfAxes,
          center,
          new Matrix4()
        ),
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
  }

  var savedCommandList = frameState.commandList;
  var commandList = (frameState.commandList = []);
  scene._debugVolume.update(frameState);

  command = commandList[0];

  if (frameState.useLogDepth) {
    var logDepth = DerivedCommand.createLogDepthCommand(command, context);
    command = logDepth.command;
  }

  var framebuffer;
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

function executeCommand(command, scene, context, passState, debugFramebuffer) {
  var frameState = scene._frameState;

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

  if (defined(command.derivedCommands.splitting)) {
    command = command.derivedCommands.splitting.command;

    var splitDirection =
      defined(command.owner) &&
      defined(command.owner.primitive) &&
      defined(command.owner.primitive.splitDirection)
        ? command.owner.primitive.splitDirection
        : ImagerySplitDirection.NONE;

    context._us._primitiveSplitDirection = splitDirection;
  }

  if (frameState.useLogDepth && defined(command.derivedCommands.logDepth)) {
    command = command.derivedCommands.logDepth.command;
  }

  var passes = frameState.passes;
  if (
    !passes.pick &&
    !passes.depth &&
    scene._hdr &&
    defined(command.derivedCommands) &&
    defined(command.derivedCommands.hdr)
  ) {
    command = command.derivedCommands.hdr.command;
  }

  if (passes.pick || passes.depth) {
    if (
      passes.pick &&
      !passes.depth &&
      defined(command.derivedCommands.picking)
    ) {
      command = command.derivedCommands.picking.pickCommand;
      command.execute(context, passState);
      return;
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
      passState
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

function executeIdCommand(command, scene, context, passState) {
  var frameState = scene._frameState;
  var derivedCommands = command.derivedCommands;
  if (!defined(derivedCommands)) {
    return;
  }

  if (frameState.useLogDepth && defined(derivedCommands.logDepth)) {
    command = derivedCommands.logDepth.command;
  }

  derivedCommands = command.derivedCommands;
  if (defined(derivedCommands.picking)) {
    command = derivedCommands.picking.pickCommand;
    command.execute(context, passState);
  } else if (defined(derivedCommands.depth)) {
    command = derivedCommands.depth.depthOnlyCommand;
    command.execute(context, passState);
  }
}

function backToFront(a, b, position) {
  return (
    b.boundingVolume.distanceSquaredTo(position) -
    a.boundingVolume.distanceSquaredTo(position)
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
  invertClassification
) {
  var context = scene.context;

  mergeSort(commands, backToFront, scene.camera.positionWC);

  if (defined(invertClassification)) {
    executeFunction(
      invertClassification.unclassifiedCommand,
      scene,
      context,
      passState
    );
  }

  var length = commands.length;
  for (var i = 0; i < length; ++i) {
    executeFunction(commands[i], scene, context, passState);
  }
}

function executeTranslucentCommandsFrontToBack(
  scene,
  executeFunction,
  passState,
  commands,
  invertClassification
) {
  var context = scene.context;

  mergeSort(commands, frontToBack, scene.camera.positionWC);

  if (defined(invertClassification)) {
    executeFunction(
      invertClassification.unclassifiedCommand,
      scene,
      context,
      passState
    );
  }

  var length = commands.length;
  for (var i = 0; i < length; ++i) {
    executeFunction(commands[i], scene, context, passState);
  }
}

function getDebugGlobeDepth(scene, index) {
  var globeDepths = scene._view.debugGlobeDepths;
  var globeDepth = globeDepths[index];
  if (!defined(globeDepth) && scene.context.depthTexture) {
    globeDepth = new GlobeDepth();
    globeDepths[index] = globeDepth;
  }
  return globeDepth;
}

var scratchPerspectiveFrustum = new PerspectiveFrustum();
var scratchPerspectiveOffCenterFrustum = new PerspectiveOffCenterFrustum();
var scratchOrthographicFrustum = new OrthographicFrustum();
var scratchOrthographicOffCenterFrustum = new OrthographicOffCenterFrustum();

function executeCommands(scene, passState) {
  var camera = scene.camera;
  var context = scene.context;
  var frameState = scene.frameState;
  var us = context.uniformState;

  us.updateCamera(camera);

  // Create a working frustum from the original camera frustum.
  var frustum;
  if (defined(camera.frustum.fov)) {
    frustum = camera.frustum.clone(scratchPerspectiveFrustum);
  } else if (defined(camera.frustum.infiniteProjectionMatrix)) {
    frustum = camera.frustum.clone(scratchPerspectiveOffCenterFrustum);
  } else if (defined(camera.frustum.width)) {
    frustum = camera.frustum.clone(scratchOrthographicFrustum);
  } else {
    frustum = camera.frustum.clone(scratchOrthographicOffCenterFrustum);
  }

  // Ideally, we would render the sky box and atmosphere last for
  // early-z, but we would have to draw it in each frustum
  frustum.near = camera.frustum.near;
  frustum.far = camera.frustum.far;
  us.updateFrustum(frustum);
  us.updatePass(Pass.ENVIRONMENT);

  var passes = frameState.passes;
  var picking = passes.pick;
  var environmentState = scene._environmentState;
  var view = scene._view;
  var renderTranslucentDepthForPick =
    environmentState.renderTranslucentDepthForPick;
  var useWebVR = environmentState.useWebVR;

  // Do not render environment primitives during a pick pass since they do not generate picking commands.
  if (!picking) {
    var skyBoxCommand = environmentState.skyBoxCommand;
    if (defined(skyBoxCommand)) {
      executeCommand(skyBoxCommand, scene, context, passState);
    }

    if (environmentState.isSkyAtmosphereVisible) {
      executeCommand(
        environmentState.skyAtmosphereCommand,
        scene,
        context,
        passState
      );
    }

    if (environmentState.isSunVisible) {
      environmentState.sunDrawCommand.execute(context, passState);
      if (scene.sunBloom && !useWebVR) {
        var framebuffer;
        if (environmentState.useGlobeDepthFramebuffer) {
          framebuffer = view.globeDepth.framebuffer;
        } else if (environmentState.usePostProcess) {
          framebuffer = view.sceneFramebuffer.getFramebuffer();
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

  // Determine how translucent surfaces will be handled.
  var executeTranslucentCommands;
  if (environmentState.useOIT) {
    if (!defined(scene._executeOITFunction)) {
      scene._executeOITFunction = function (
        scene,
        executeFunction,
        passState,
        commands,
        invertClassification
      ) {
        view.oit.executeCommands(
          scene,
          executeFunction,
          passState,
          commands,
          invertClassification
        );
      };
    }
    executeTranslucentCommands = scene._executeOITFunction;
  } else if (passes.render) {
    executeTranslucentCommands = executeTranslucentCommandsBackToFront;
  } else {
    executeTranslucentCommands = executeTranslucentCommandsFrontToBack;
  }

  var frustumCommandsList = view.frustumCommandsList;
  var numFrustums = frustumCommandsList.length;

  var clearGlobeDepth = environmentState.clearGlobeDepth;
  var useDepthPlane = environmentState.useDepthPlane;
  var globeTranslucencyState = scene._globeTranslucencyState;
  var globeTranslucent = globeTranslucencyState.translucent;
  var globeTranslucencyFramebuffer = scene._view.globeTranslucencyFramebuffer;
  var separatePrimitiveFramebuffer = (environmentState.separatePrimitiveFramebuffer = false);
  var clearDepth = scene._depthClearCommand;
  var clearStencil = scene._stencilClearCommand;
  var clearClassificationStencil = scene._classificationStencilClearCommand;
  var depthPlane = scene._depthPlane;
  var usePostProcessSelected = environmentState.usePostProcessSelected;

  var height2D = camera.position.z;

  // Execute commands in each frustum in back to front order
  var j;
  for (var i = 0; i < numFrustums; ++i) {
    var index = numFrustums - i - 1;
    var frustumCommands = frustumCommandsList[index];

    if (scene.mode === SceneMode.SCENE2D) {
      // To avoid z-fighting in 2D, move the camera to just before the frustum
      // and scale the frustum depth to be in [1.0, nearToFarDistance2D].
      camera.position.z = height2D - frustumCommands.near + 1.0;
      frustum.far = Math.max(1.0, frustumCommands.far - frustumCommands.near);
      frustum.near = 1.0;
      us.update(frameState);
      us.updateFrustum(frustum);
    } else {
      // Avoid tearing artifacts between adjacent frustums in the opaque passes
      frustum.near =
        index !== 0
          ? frustumCommands.near * scene.opaqueFrustumNearOffset
          : frustumCommands.near;
      frustum.far = frustumCommands.far;
      us.updateFrustum(frustum);
    }

    var globeDepth = scene.debugShowGlobeDepth
      ? getDebugGlobeDepth(scene, index)
      : view.globeDepth;

    if (separatePrimitiveFramebuffer) {
      // Render to globe framebuffer in GLOBE pass
      passState.framebuffer = globeDepth.framebuffer;
    }

    var fb;
    if (
      scene.debugShowGlobeDepth &&
      defined(globeDepth) &&
      environmentState.useGlobeDepthFramebuffer
    ) {
      globeDepth.update(
        context,
        passState,
        view.viewport,
        scene._hdr,
        clearGlobeDepth
      );
      globeDepth.clear(context, passState, scene._clearColorCommand.color);
      fb = passState.framebuffer;
      passState.framebuffer = globeDepth.framebuffer;
    }

    clearDepth.execute(context, passState);

    if (context.stencilBuffer) {
      clearStencil.execute(context, passState);
    }

    us.updatePass(Pass.GLOBE);
    var commands = frustumCommands.commands[Pass.GLOBE];
    var length = frustumCommands.indices[Pass.GLOBE];

    if (globeTranslucent) {
      globeTranslucencyState.executeGlobeCommands(
        frustumCommands,
        executeCommand,
        globeTranslucencyFramebuffer,
        scene,
        passState
      );
    } else {
      for (j = 0; j < length; ++j) {
        executeCommand(commands[j], scene, context, passState);
      }
    }

    if (defined(globeDepth) && environmentState.useGlobeDepthFramebuffer) {
      globeDepth.executeCopyDepth(context, passState);
    }

    if (
      scene.debugShowGlobeDepth &&
      defined(globeDepth) &&
      environmentState.useGlobeDepthFramebuffer
    ) {
      passState.framebuffer = fb;
    }

    // Draw terrain classification
    if (!environmentState.renderTranslucentDepthForPick) {
      us.updatePass(Pass.TERRAIN_CLASSIFICATION);
      commands = frustumCommands.commands[Pass.TERRAIN_CLASSIFICATION];
      length = frustumCommands.indices[Pass.TERRAIN_CLASSIFICATION];

      if (globeTranslucent) {
        globeTranslucencyState.executeGlobeClassificationCommands(
          frustumCommands,
          executeCommand,
          globeTranslucencyFramebuffer,
          scene,
          passState
        );
      } else {
        for (j = 0; j < length; ++j) {
          executeCommand(commands[j], scene, context, passState);
        }
      }
    }

    if (clearGlobeDepth) {
      clearDepth.execute(context, passState);
      if (useDepthPlane) {
        depthPlane.execute(context, passState);
      }
    }

    if (separatePrimitiveFramebuffer) {
      // Render to primitive framebuffer in all other passes
      passState.framebuffer = globeDepth.primitiveFramebuffer;
    }

    if (
      !environmentState.useInvertClassification ||
      picking ||
      environmentState.renderTranslucentDepthForPick
    ) {
      // Common/fastest path. Draw 3D Tiles and classification normally.

      // Draw 3D Tiles
      us.updatePass(Pass.CESIUM_3D_TILE);
      commands = frustumCommands.commands[Pass.CESIUM_3D_TILE];
      length = frustumCommands.indices[Pass.CESIUM_3D_TILE];
      for (j = 0; j < length; ++j) {
        executeCommand(commands[j], scene, context, passState);
      }

      if (length > 0) {
        if (defined(globeDepth) && environmentState.useGlobeDepthFramebuffer) {
          globeDepth.executeUpdateDepth(context, passState, clearGlobeDepth);
        }

        // Draw classifications. Modifies 3D Tiles color.
        if (!environmentState.renderTranslucentDepthForPick) {
          us.updatePass(Pass.CESIUM_3D_TILE_CLASSIFICATION);
          commands =
            frustumCommands.commands[Pass.CESIUM_3D_TILE_CLASSIFICATION];
          length = frustumCommands.indices[Pass.CESIUM_3D_TILE_CLASSIFICATION];
          for (j = 0; j < length; ++j) {
            executeCommand(commands[j], scene, context, passState);
          }
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

      var opaqueClassificationFramebuffer = passState.framebuffer;
      passState.framebuffer = scene._invertClassification._fbo;

      // Draw normally
      us.updatePass(Pass.CESIUM_3D_TILE);
      commands = frustumCommands.commands[Pass.CESIUM_3D_TILE];
      length = frustumCommands.indices[Pass.CESIUM_3D_TILE];
      for (j = 0; j < length; ++j) {
        executeCommand(commands[j], scene, context, passState);
      }

      if (defined(globeDepth) && environmentState.useGlobeDepthFramebuffer) {
        globeDepth.executeUpdateDepth(context, passState, clearGlobeDepth);
      }

      // Set stencil
      us.updatePass(Pass.CESIUM_3D_TILE_CLASSIFICATION_IGNORE_SHOW);
      commands =
        frustumCommands.commands[
          Pass.CESIUM_3D_TILE_CLASSIFICATION_IGNORE_SHOW
        ];
      length =
        frustumCommands.indices[Pass.CESIUM_3D_TILE_CLASSIFICATION_IGNORE_SHOW];
      for (j = 0; j < length; ++j) {
        executeCommand(commands[j], scene, context, passState);
      }

      passState.framebuffer = opaqueClassificationFramebuffer;

      // Fullscreen pass to copy classified fragments
      scene._invertClassification.executeClassified(context, passState);
      if (frameState.invertClassificationColor.alpha === 1.0) {
        // Fullscreen pass to copy unclassified fragments when alpha == 1.0
        scene._invertClassification.executeUnclassified(context, passState);
      }

      // Clear stencil set by the classification for the next classification pass
      if (length > 0 && context.stencilBuffer) {
        clearClassificationStencil.execute(context, passState);
      }

      // Draw style over classification.
      us.updatePass(Pass.CESIUM_3D_TILE_CLASSIFICATION);
      commands = frustumCommands.commands[Pass.CESIUM_3D_TILE_CLASSIFICATION];
      length = frustumCommands.indices[Pass.CESIUM_3D_TILE_CLASSIFICATION];
      for (j = 0; j < length; ++j) {
        executeCommand(commands[j], scene, context, passState);
      }
    }

    if (length > 0 && context.stencilBuffer) {
      clearStencil.execute(context, passState);
    }

    us.updatePass(Pass.OPAQUE);
    commands = frustumCommands.commands[Pass.OPAQUE];
    length = frustumCommands.indices[Pass.OPAQUE];
    for (j = 0; j < length; ++j) {
      executeCommand(commands[j], scene, context, passState);
    }

    if (index !== 0 && scene.mode !== SceneMode.SCENE2D) {
      // Do not overlap frustums in the translucent pass to avoid blending artifacts
      frustum.near = frustumCommands.near;
      us.updateFrustum(frustum);
    }

    var invertClassification;
    if (
      !picking &&
      environmentState.useInvertClassification &&
      frameState.invertClassificationColor.alpha < 1.0
    ) {
      // Fullscreen pass to copy unclassified fragments when alpha < 1.0.
      // Not executed when undefined.
      invertClassification = scene._invertClassification;
    }

    us.updatePass(Pass.TRANSLUCENT);
    commands = frustumCommands.commands[Pass.TRANSLUCENT];
    commands.length = frustumCommands.indices[Pass.TRANSLUCENT];
    executeTranslucentCommands(
      scene,
      executeCommand,
      passState,
      commands,
      invertClassification
    );

    // Classification for translucent 3D Tiles
    var has3DTilesClassificationCommands =
      frustumCommands.indices[Pass.CESIUM_3D_TILE_CLASSIFICATION] > 0;
    if (
      has3DTilesClassificationCommands &&
      view.translucentTileClassification.isSupported()
    ) {
      view.translucentTileClassification.executeTranslucentCommands(
        scene,
        executeCommand,
        passState,
        commands,
        globeDepth.framebuffer
      );
      view.translucentTileClassification.executeClassificationCommands(
        scene,
        executeCommand,
        passState,
        frustumCommands
      );
    }

    if (
      context.depthTexture &&
      scene.useDepthPicking &&
      (environmentState.useGlobeDepthFramebuffer ||
        renderTranslucentDepthForPick)
    ) {
      // PERFORMANCE_IDEA: Use MRT to avoid the extra copy.
      var depthStencilTexture = renderTranslucentDepthForPick
        ? passState.framebuffer.depthStencilTexture
        : globeDepth.framebuffer.depthStencilTexture;
      var pickDepth = scene._picking.getPickDepth(scene, index);
      pickDepth.update(context, depthStencilTexture);
      pickDepth.executeCopyDepth(context, passState);
    }

    if (separatePrimitiveFramebuffer) {
      // Reset framebuffer
      passState.framebuffer = globeDepth.framebuffer;
    }

    if (picking || !usePostProcessSelected) {
      continue;
    }

    var originalFramebuffer = passState.framebuffer;
    passState.framebuffer = view.sceneFramebuffer.getIdFramebuffer();

    // reset frustum
    frustum.near =
      index !== 0
        ? frustumCommands.near * scene.opaqueFrustumNearOffset
        : frustumCommands.near;
    frustum.far = frustumCommands.far;
    us.updateFrustum(frustum);

    us.updatePass(Pass.GLOBE);
    commands = frustumCommands.commands[Pass.GLOBE];
    length = frustumCommands.indices[Pass.GLOBE];

    if (globeTranslucent) {
      globeTranslucencyState.executeGlobeCommands(
        frustumCommands,
        executeIdCommand,
        globeTranslucencyFramebuffer,
        scene,
        passState
      );
    } else {
      for (j = 0; j < length; ++j) {
        executeIdCommand(commands[j], scene, context, passState);
      }
    }

    if (clearGlobeDepth) {
      clearDepth.framebuffer = passState.framebuffer;
      clearDepth.execute(context, passState);
      clearDepth.framebuffer = undefined;
    }

    if (clearGlobeDepth && useDepthPlane) {
      depthPlane.execute(context, passState);
    }

    us.updatePass(Pass.CESIUM_3D_TILE);
    commands = frustumCommands.commands[Pass.CESIUM_3D_TILE];
    length = frustumCommands.indices[Pass.CESIUM_3D_TILE];
    for (j = 0; j < length; ++j) {
      executeIdCommand(commands[j], scene, context, passState);
    }

    us.updatePass(Pass.OPAQUE);
    commands = frustumCommands.commands[Pass.OPAQUE];
    length = frustumCommands.indices[Pass.OPAQUE];
    for (j = 0; j < length; ++j) {
      executeIdCommand(commands[j], scene, context, passState);
    }

    us.updatePass(Pass.TRANSLUCENT);
    commands = frustumCommands.commands[Pass.TRANSLUCENT];
    length = frustumCommands.indices[Pass.TRANSLUCENT];
    for (j = 0; j < length; ++j) {
      executeIdCommand(commands[j], scene, context, passState);
    }

    passState.framebuffer = originalFramebuffer;
  }
}

function executeComputeCommands(scene) {
  var us = scene.context.uniformState;
  us.updatePass(Pass.COMPUTE);

  var sunComputeCommand = scene._environmentState.sunComputeCommand;
  if (defined(sunComputeCommand)) {
    sunComputeCommand.execute(scene._computeEngine);
  }

  var commandList = scene._computeCommandList;
  var length = commandList.length;
  for (var i = 0; i < length; ++i) {
    commandList[i].execute(scene._computeEngine);
  }
}

function executeOverlayCommands(scene, passState) {
  var us = scene.context.uniformState;
  us.updatePass(Pass.OVERLAY);

  var context = scene.context;
  var commandList = scene._overlayCommandList;
  var length = commandList.length;
  for (var i = 0; i < length; ++i) {
    commandList[i].execute(context, passState);
  }
}

function insertShadowCastCommands(scene, commandList, shadowMap) {
  var shadowVolume = shadowMap.shadowMapCullingVolume;
  var isPointLight = shadowMap.isPointLight;
  var passes = shadowMap.passes;
  var numberOfPasses = passes.length;

  var length = commandList.length;
  for (var i = 0; i < length; ++i) {
    var command = commandList[i];
    scene.updateDerivedCommands(command);

    if (
      command.castShadows &&
      (command.pass === Pass.GLOBE ||
        command.pass === Pass.CESIUM_3D_TILE ||
        command.pass === Pass.OPAQUE ||
        command.pass === Pass.TRANSLUCENT)
    ) {
      if (scene.isVisible(command, shadowVolume)) {
        if (isPointLight) {
          for (var k = 0; k < numberOfPasses; ++k) {
            passes[k].commandList.push(command);
          }
        } else if (numberOfPasses === 1) {
          passes[0].commandList.push(command);
        } else {
          var wasVisible = false;
          // Loop over cascades from largest to smallest
          for (var j = numberOfPasses - 1; j >= 0; --j) {
            var cascadeVolume = passes[j].cullingVolume;
            if (scene.isVisible(command, cascadeVolume)) {
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
  }
}

function executeShadowMapCastCommands(scene) {
  var frameState = scene.frameState;
  var shadowMaps = frameState.shadowState.shadowMaps;
  var shadowMapLength = shadowMaps.length;

  if (!frameState.shadowState.shadowsEnabled) {
    return;
  }

  var context = scene.context;
  var uniformState = context.uniformState;

  for (var i = 0; i < shadowMapLength; ++i) {
    var shadowMap = shadowMaps[i];
    if (shadowMap.outOfView) {
      continue;
    }

    // Reset the command lists
    var j;
    var passes = shadowMap.passes;
    var numberOfPasses = passes.length;
    for (j = 0; j < numberOfPasses; ++j) {
      passes[j].commandList.length = 0;
    }

    // Insert the primitive/model commands into the command lists
    var sceneCommands = scene.frameState.commandList;
    insertShadowCastCommands(scene, sceneCommands, shadowMap);

    for (j = 0; j < numberOfPasses; ++j) {
      var pass = shadowMap.passes[j];
      uniformState.updateCamera(pass.camera);
      shadowMap.updatePass(context, j);
      var numberOfCommands = pass.commandList.length;
      for (var k = 0; k < numberOfCommands; ++k) {
        var command = pass.commandList[k];
        // Set the correct pass before rendering into the shadow map because some shaders
        // conditionally render based on whether the pass is translucent or opaque.
        uniformState.updatePass(command.pass);
        executeCommand(
          command.derivedCommands.shadows.castCommands[i],
          scene,
          context,
          pass.passState
        );
      }
    }
  }
}

var scratchEyeTranslation = new Cartesian3();

/**
 * @private
 */
Scene.prototype.updateAndExecuteCommands = function (
  passState,
  backgroundColor
) {
  var frameState = this._frameState;
  var mode = frameState.mode;
  var useWebVR = this._environmentState.useWebVR;

  if (useWebVR) {
    executeWebVRCommands(this, passState, backgroundColor);
  } else if (
    mode !== SceneMode.SCENE2D ||
    this._mapMode2D === MapMode2D.ROTATE
  ) {
    executeCommandsInViewport(true, this, passState, backgroundColor);
  } else {
    updateAndClearFramebuffers(this, passState, backgroundColor);
    execute2DViewportCommands(this, passState);
  }
};

function executeWebVRCommands(scene, passState, backgroundColor) {
  var view = scene._view;
  var camera = view.camera;
  var environmentState = scene._environmentState;
  var renderTranslucentDepthForPick =
    environmentState.renderTranslucentDepthForPick;

  updateAndClearFramebuffers(scene, passState, backgroundColor);

  if (!renderTranslucentDepthForPick) {
    updateAndRenderPrimitives(scene);
  }

  view.createPotentiallyVisibleSet(scene);

  if (!renderTranslucentDepthForPick) {
    executeComputeCommands(scene);
    executeShadowMapCastCommands(scene);
  }

  // Based on Calculating Stereo pairs by Paul Bourke
  // http://paulbourke.net/stereographics/stereorender/
  var viewport = passState.viewport;
  viewport.x = 0;
  viewport.y = 0;
  viewport.width = viewport.width * 0.5;

  var savedCamera = Camera.clone(camera, scene._cameraVR);
  savedCamera.frustum = camera.frustum;

  var near = camera.frustum.near;
  var fo = near * defaultValue(scene.focalLength, 5.0);
  var eyeSeparation = defaultValue(scene.eyeSeparation, fo / 30.0);
  var eyeTranslation = Cartesian3.multiplyByScalar(
    savedCamera.right,
    eyeSeparation * 0.5,
    scratchEyeTranslation
  );

  camera.frustum.aspectRatio = viewport.width / viewport.height;

  var offset = (0.5 * eyeSeparation * near) / fo;

  Cartesian3.add(savedCamera.position, eyeTranslation, camera.position);
  camera.frustum.xOffset = offset;

  executeCommands(scene, passState);

  viewport.x = viewport.width;

  Cartesian3.subtract(savedCamera.position, eyeTranslation, camera.position);
  camera.frustum.xOffset = -offset;

  executeCommands(scene, passState);

  Camera.clone(savedCamera, camera);
}

var scratch2DViewportCartographic = new Cartographic(
  Math.PI,
  CesiumMath.PI_OVER_TWO
);
var scratch2DViewportMaxCoord = new Cartesian3();
var scratch2DViewportSavedPosition = new Cartesian3();
var scratch2DViewportTransform = new Matrix4();
var scratch2DViewportCameraTransform = new Matrix4();
var scratch2DViewportEyePoint = new Cartesian3();
var scratch2DViewportWindowCoords = new Cartesian3();
var scratch2DViewport = new BoundingRectangle();

function execute2DViewportCommands(scene, passState) {
  var context = scene.context;
  var frameState = scene.frameState;
  var camera = scene.camera;

  var originalViewport = passState.viewport;
  var viewport = BoundingRectangle.clone(originalViewport, scratch2DViewport);
  passState.viewport = viewport;

  var maxCartographic = scratch2DViewportCartographic;
  var maxCoord = scratch2DViewportMaxCoord;

  var projection = scene.mapProjection;
  projection.project(maxCartographic, maxCoord);

  var position = Cartesian3.clone(
    camera.position,
    scratch2DViewportSavedPosition
  );
  var transform = Matrix4.clone(
    camera.transform,
    scratch2DViewportCameraTransform
  );
  var frustum = camera.frustum.clone();

  camera._setTransform(Matrix4.IDENTITY);

  var viewportTransformation = Matrix4.computeViewportTransformation(
    viewport,
    0.0,
    1.0,
    scratch2DViewportTransform
  );
  var projectionMatrix = camera.frustum.projectionMatrix;

  var x = camera.positionWC.y;
  var eyePoint = Cartesian3.fromElements(
    CesiumMath.sign(x) * maxCoord.x - x,
    0.0,
    -camera.positionWC.x,
    scratch2DViewportEyePoint
  );
  var windowCoordinates = Transforms.pointToGLWindowCoordinates(
    projectionMatrix,
    viewportTransformation,
    eyePoint,
    scratch2DViewportWindowCoords
  );

  windowCoordinates.x = Math.floor(windowCoordinates.x);

  var viewportX = viewport.x;
  var viewportWidth = viewport.width;

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
      camera.upWC
    );
    context.uniformState.update(frameState);

    executeCommandsInViewport(true, scene, passState);

    viewport.x = windowCoordinates.x;

    camera.position.x = -camera.position.x;

    camera.frustum.right = -camera.frustum.left;
    camera.frustum.left = 0.0;

    frameState.cullingVolume = camera.frustum.computeCullingVolume(
      camera.positionWC,
      camera.directionWC,
      camera.upWC
    );
    context.uniformState.update(frameState);

    executeCommandsInViewport(false, scene, passState);
  } else if (windowCoordinates.x > viewportX + viewportWidth * 0.5) {
    viewport.width = windowCoordinates.x - viewportX;

    var right = camera.frustum.right;
    camera.frustum.right = maxCoord.x - x;

    frameState.cullingVolume = camera.frustum.computeCullingVolume(
      camera.positionWC,
      camera.directionWC,
      camera.upWC
    );
    context.uniformState.update(frameState);

    executeCommandsInViewport(true, scene, passState);

    viewport.x = windowCoordinates.x;
    viewport.width = viewportX + viewportWidth - windowCoordinates.x;

    camera.position.x = -camera.position.x;

    camera.frustum.left = -camera.frustum.right;
    camera.frustum.right = right - camera.frustum.right * 2.0;

    frameState.cullingVolume = camera.frustum.computeCullingVolume(
      camera.positionWC,
      camera.directionWC,
      camera.upWC
    );
    context.uniformState.update(frameState);

    executeCommandsInViewport(false, scene, passState);
  } else {
    viewport.x = windowCoordinates.x;
    viewport.width = viewportX + viewportWidth - windowCoordinates.x;

    var left = camera.frustum.left;
    camera.frustum.left = -maxCoord.x - x;

    frameState.cullingVolume = camera.frustum.computeCullingVolume(
      camera.positionWC,
      camera.directionWC,
      camera.upWC
    );
    context.uniformState.update(frameState);

    executeCommandsInViewport(true, scene, passState);

    viewport.x = viewportX;
    viewport.width = windowCoordinates.x - viewportX;

    camera.position.x = -camera.position.x;

    camera.frustum.right = -camera.frustum.left;
    camera.frustum.left = left - camera.frustum.left * 2.0;

    frameState.cullingVolume = camera.frustum.computeCullingVolume(
      camera.positionWC,
      camera.directionWC,
      camera.upWC
    );
    context.uniformState.update(frameState);

    executeCommandsInViewport(false, scene, passState);
  }

  camera._setTransform(transform);
  Cartesian3.clone(position, camera.position);
  camera.frustum = frustum.clone();
  passState.viewport = originalViewport;
}

function executeCommandsInViewport(
  firstViewport,
  scene,
  passState,
  backgroundColor
) {
  var environmentState = scene._environmentState;
  var view = scene._view;
  var renderTranslucentDepthForPick =
    environmentState.renderTranslucentDepthForPick;

  if (!firstViewport && !renderTranslucentDepthForPick) {
    scene.frameState.commandList.length = 0;
  }

  if (!renderTranslucentDepthForPick) {
    updateAndRenderPrimitives(scene);
  }

  view.createPotentiallyVisibleSet(scene);

  if (firstViewport) {
    if (defined(backgroundColor)) {
      updateAndClearFramebuffers(scene, passState, backgroundColor);
    }
    if (!renderTranslucentDepthForPick) {
      executeComputeCommands(scene);
      executeShadowMapCastCommands(scene);
    }
  }

  executeCommands(scene, passState);
}

var scratchCullingVolume = new CullingVolume();

/**
 * @private
 */
Scene.prototype.updateEnvironment = function () {
  var frameState = this._frameState;
  var view = this._view;

  // Update celestial and terrestrial environment effects.
  var environmentState = this._environmentState;
  var renderPass = frameState.passes.render;
  var offscreenPass = frameState.passes.offscreen;
  var skyAtmosphere = this.skyAtmosphere;
  var globe = this.globe;
  var globeTranslucencyState = this._globeTranslucencyState;

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
        skyAtmosphere.setDynamicAtmosphereColor(
          globe.enableLighting && globe.dynamicAtmosphereLighting,
          globe.dynamicAtmosphereLightingFromSun
        );
        environmentState.isReadyForAtmosphere =
          environmentState.isReadyForAtmosphere ||
          globe._surface._tilesToRender.length > 0;
      }
      environmentState.skyAtmosphereCommand = skyAtmosphere.update(
        frameState,
        globe
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
    var sunCommands = defined(this.sun)
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

  var clearGlobeDepth = (environmentState.clearGlobeDepth =
    defined(globe) &&
    globe.show &&
    (!globe.depthTestAgainstTerrain || this.mode === SceneMode.SCENE2D));
  var useDepthPlane = (environmentState.useDepthPlane =
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

  var occluder =
    frameState.mode === SceneMode.SCENE3D &&
    !globeTranslucencyState.sunVisibleThroughGlobe
      ? frameState.occluder
      : undefined;
  var cullingVolume = frameState.cullingVolume;

  // get user culling volume minus the far plane.
  var planes = scratchCullingVolume.planes;
  for (var k = 0; k < 5; ++k) {
    planes[k] = cullingVolume.planes[k];
  }
  cullingVolume = scratchCullingVolume;

  // Determine visibility of celestial and terrestrial environment effects.
  environmentState.isSkyAtmosphereVisible =
    defined(environmentState.skyAtmosphereCommand) &&
    environmentState.isReadyForAtmosphere;
  environmentState.isSunVisible = this.isVisible(
    environmentState.sunDrawCommand,
    cullingVolume,
    occluder
  );
  environmentState.isMoonVisible = this.isVisible(
    environmentState.moonCommand,
    cullingVolume,
    occluder
  );

  var envMaps = this.specularEnvironmentMaps;
  var envMapAtlas = this._specularEnvironmentMapAtlas;
  if (
    defined(envMaps) &&
    (!defined(envMapAtlas) || envMapAtlas.url !== envMaps)
  ) {
    envMapAtlas = envMapAtlas && envMapAtlas.destroy();
    this._specularEnvironmentMapAtlas = new OctahedralProjectedCubeMap(envMaps);
  } else if (!defined(envMaps) && defined(envMapAtlas)) {
    envMapAtlas.destroy();
    this._specularEnvironmentMapAtlas = undefined;
  }

  if (defined(this._specularEnvironmentMapAtlas)) {
    this._specularEnvironmentMapAtlas.update(frameState);
  }
};

function updateDebugFrustumPlanes(scene) {
  var frameState = scene._frameState;
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
  var frameState = scene._frameState;
  var shadowMaps = frameState.shadowMaps;
  var length = shadowMaps.length;

  var shadowsEnabled =
    length > 0 && !frameState.passes.pick && scene.mode === SceneMode.SCENE3D;
  if (shadowsEnabled !== frameState.shadowState.shadowsEnabled) {
    // Update derived commands when shadowsEnabled changes
    ++frameState.shadowState.lastDirtyTime;
    frameState.shadowState.shadowsEnabled = shadowsEnabled;
  }

  frameState.shadowState.lightShadowsEnabled = false;

  if (!shadowsEnabled) {
    return;
  }

  // Check if the shadow maps are different than the shadow maps last frame.
  // If so, the derived commands need to be updated.
  for (var j = 0; j < length; ++j) {
    if (shadowMaps[j] !== frameState.shadowState.shadowMaps[j]) {
      ++frameState.shadowState.lastDirtyTime;
      break;
    }
  }

  frameState.shadowState.shadowMaps.length = 0;
  frameState.shadowState.lightShadowMaps.length = 0;

  for (var i = 0; i < length; ++i) {
    var shadowMap = shadowMaps[i];
    shadowMap.update(frameState);

    frameState.shadowState.shadowMaps.push(shadowMap);

    if (shadowMap.fromLightSource) {
      frameState.shadowState.lightShadowMaps.push(shadowMap);
      frameState.shadowState.lightShadowsEnabled = true;
    }

    if (shadowMap.dirty) {
      ++frameState.shadowState.lastDirtyTime;
      shadowMap.dirty = false;
    }
  }
}

function updateAndRenderPrimitives(scene) {
  var frameState = scene._frameState;

  scene._groundPrimitives.update(frameState);
  scene._primitives.update(frameState);

  updateDebugFrustumPlanes(scene);
  updateShadowMaps(scene);

  if (scene._globe) {
    scene._globe.render(frameState);
  }
}

function updateAndClearFramebuffers(scene, passState, clearColor) {
  var context = scene._context;
  var frameState = scene._frameState;
  var environmentState = scene._environmentState;
  var view = scene._view;

  var passes = scene._frameState.passes;
  var picking = passes.pick;
  var useWebVR = environmentState.useWebVR;

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
  var clear = scene._clearColorCommand;
  Color.clone(clearColor, clear.color);
  clear.execute(context, passState);

  // Update globe depth rendering based on the current context and clear the globe depth framebuffer.
  // Globe depth is copied for the pick pass to support picking batched geometries in GroundPrimitives.
  var useGlobeDepthFramebuffer = (environmentState.useGlobeDepthFramebuffer = defined(
    view.globeDepth
  ));
  if (useGlobeDepthFramebuffer) {
    view.globeDepth.update(
      context,
      passState,
      view.viewport,
      scene._hdr,
      environmentState.clearGlobeDepth
    );
    view.globeDepth.clear(context, passState, clearColor);
  }

  // If supported, configure OIT to use the globe depth framebuffer and clear the OIT framebuffer.
  var oit = view.oit;
  var useOIT = (environmentState.useOIT =
    !picking && defined(oit) && oit.isSupported());
  if (useOIT) {
    oit.update(context, passState, view.globeDepth.framebuffer, scene._hdr);
    oit.clear(context, passState, clearColor);
    environmentState.useOIT = oit.isSupported();
  }

  var postProcess = scene.postProcessStages;
  var usePostProcess = (environmentState.usePostProcess =
    !picking &&
    (scene._hdr ||
      postProcess.length > 0 ||
      postProcess.ambientOcclusion.enabled ||
      postProcess.fxaa.enabled ||
      postProcess.bloom.enabled));
  environmentState.usePostProcessSelected = false;
  if (usePostProcess) {
    view.sceneFramebuffer.update(context, view.viewport, scene._hdr);
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
    passState.framebuffer = view.sceneFramebuffer.getFramebuffer();
  }

  if (defined(passState.framebuffer)) {
    clear.execute(context, passState);
  }

  var useInvertClassification = (environmentState.useInvertClassification =
    !picking && defined(passState.framebuffer) && scene.invertClassification);
  if (useInvertClassification) {
    var depthFramebuffer;
    if (scene.frameState.invertClassificationColor.alpha === 1.0) {
      if (environmentState.useGlobeDepthFramebuffer) {
        depthFramebuffer = view.globeDepth.framebuffer;
      }
    }

    if (defined(depthFramebuffer) || context.depthTexture) {
      scene._invertClassification.previousFramebuffer = depthFramebuffer;
      scene._invertClassification.update(context);
      scene._invertClassification.clear(context, passState);

      if (scene.frameState.invertClassificationColor.alpha < 1.0 && useOIT) {
        var command = scene._invertClassification.unclassifiedCommand;
        var derivedCommands = command.derivedCommands;
        derivedCommands.oit = oit.createDerivedCommands(
          command,
          context,
          derivedCommands.oit
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
      passState
    );
  }
}

/**
 * @private
 */
Scene.prototype.resolveFramebuffers = function (passState) {
  var context = this._context;
  var frameState = this._frameState;
  var environmentState = this._environmentState;
  var view = this._view;
  var globeDepth = view.globeDepth;

  var useOIT = environmentState.useOIT;
  var useGlobeDepthFramebuffer = environmentState.useGlobeDepthFramebuffer;
  var usePostProcess = environmentState.usePostProcess;

  var defaultFramebuffer = environmentState.originalFramebuffer;
  var globeFramebuffer = useGlobeDepthFramebuffer
    ? globeDepth.framebuffer
    : undefined;
  var sceneFramebuffer = view.sceneFramebuffer.getFramebuffer();
  var idFramebuffer = view.sceneFramebuffer.getIdFramebuffer();

  if (environmentState.separatePrimitiveFramebuffer) {
    // Merge primitive framebuffer into globe framebuffer
    globeDepth.executeMergeColor(context, passState);
  }

  if (useOIT) {
    passState.framebuffer = usePostProcess
      ? sceneFramebuffer
      : defaultFramebuffer;
    view.oit.execute(context, passState);
  }

  var translucentTileClassification = view.translucentTileClassification;
  if (
    translucentTileClassification.hasTranslucentDepth &&
    translucentTileClassification.isSupported()
  ) {
    translucentTileClassification.execute(this, passState);
  }

  if (usePostProcess) {
    var inputFramebuffer = sceneFramebuffer;
    if (useGlobeDepthFramebuffer && !useOIT) {
      inputFramebuffer = globeFramebuffer;
    }

    var postProcess = this.postProcessStages;
    var colorTexture = inputFramebuffer.getColorTexture(0);
    var idTexture = idFramebuffer.getColorTexture(0);
    var depthTexture = defaultValue(globeFramebuffer, sceneFramebuffer)
      .depthStencilTexture;
    postProcess.execute(context, colorTexture, depthTexture, idTexture);
    postProcess.copy(context, defaultFramebuffer);
  }

  if (!useOIT && !usePostProcess && useGlobeDepthFramebuffer) {
    passState.framebuffer = defaultFramebuffer;
    globeDepth.executeCopyColor(context, passState);
  }

  var useLogDepth = frameState.useLogDepth;

  if (this.debugShowGlobeDepth && useGlobeDepthFramebuffer) {
    var gd = getDebugGlobeDepth(this, this.debugShowDepthFrustum - 1);
    gd.executeDebugGlobeDepth(context, passState, useLogDepth);
  }

  if (this.debugShowPickDepth && useGlobeDepthFramebuffer) {
    var pd = this._picking.getPickDepth(this, this.debugShowDepthFrustum - 1);
    pd.executeDebugPickDepth(context, passState, useLogDepth);
  }
};

function callAfterRenderFunctions(scene) {
  // Functions are queued up during primitive update and executed here in case
  // the function modifies scene state that should remain constant over the frame.
  var functions = scene._frameState.afterRender;
  for (var i = 0, length = functions.length; i < length; ++i) {
    functions[i]();
    scene.requestRender();
  }

  functions.length = 0;
}

function getGlobeHeight(scene) {
  var globe = scene._globe;
  var camera = scene.camera;
  var cartographic = camera.positionCartographic;
  if (defined(globe) && globe.show && defined(cartographic)) {
    return globe.getHeight(cartographic);
  }
  return undefined;
}

function isCameraUnderground(scene) {
  var camera = scene.camera;
  var mode = scene._mode;
  var globe = scene.globe;
  var cameraController = scene._screenSpaceCameraController;
  var cartographic = camera.positionCartographic;

  if (!defined(cartographic)) {
    return false;
  }

  if (!cameraController.onMap() && cartographic.height < 0.0) {
    // The camera can go off the map while in Columbus View.
    // Make a best guess as to whether it's underground by checking if its height is less than zero.
    return true;
  }

  if (
    !defined(globe) ||
    !globe.show ||
    mode === SceneMode.SCENE2D ||
    mode === SceneMode.MORPHING
  ) {
    return false;
  }

  var globeHeight = scene._globeHeight;
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

  this._globeHeight = getGlobeHeight(this);
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
      var performanceContainer = document.createElement("div");
      performanceContainer.className =
        "cesium-performanceDisplay-defaultContainer";
      var container = scene._canvas.parentNode;
      container.appendChild(performanceContainer);
      var performanceDisplay = new PerformanceDisplay({
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
      scene._performanceContainer
    );
  }
}

function prePassesUpdate(scene) {
  scene._jobScheduler.resetBudgets();

  var frameState = scene._frameState;
  var primitives = scene.primitives;
  primitives.prePassesUpdate(frameState);

  if (defined(scene.globe)) {
    scene.globe.update(frameState);
  }

  scene._picking.update();
  frameState.creditDisplay.update();
}

function postPassesUpdate(scene) {
  var frameState = scene._frameState;
  var primitives = scene.primitives;
  primitives.postPassesUpdate(frameState);

  RequestScheduler.update();
}

var scratchBackgroundColor = new Color();

function render(scene) {
  var frameState = scene._frameState;

  var context = scene.context;
  var us = context.uniformState;

  var view = scene._defaultView;
  scene._view = view;

  scene.updateFrameState();
  frameState.passes.render = true;
  frameState.passes.postProcess = scene.postProcessStages.hasSelected;
  frameState.tilesetPassState = renderTilesetPassState;

  var backgroundColor = defaultValue(scene.backgroundColor, Color.BLACK);
  if (scene._hdr) {
    backgroundColor = Color.clone(backgroundColor, scratchBackgroundColor);
    backgroundColor.red = Math.pow(backgroundColor.red, scene.gamma);
    backgroundColor.green = Math.pow(backgroundColor.green, scene.gamma);
    backgroundColor.blue = Math.pow(backgroundColor.blue, scene.gamma);
  }
  frameState.backgroundColor = backgroundColor;

  scene.fog.update(frameState);

  us.update(frameState);

  var shadowMap = scene.shadowMap;
  if (defined(shadowMap) && shadowMap.enabled) {
    if (!defined(scene.light) || scene.light instanceof SunLight) {
      // Negate the sun direction so that it is from the Sun, not to the Sun
      Cartesian3.negate(us.sunDirectionWC, scene._shadowMapCamera.direction);
    } else {
      Cartesian3.clone(scene.light.direction, scene._shadowMapCamera.direction);
    }
    frameState.shadowMaps.push(shadowMap);
  }

  scene._computeCommandList.length = 0;
  scene._overlayCommandList.length = 0;

  var viewport = view.viewport;
  viewport.x = 0;
  viewport.y = 0;
  viewport.width = context.drawingBufferWidth;
  viewport.height = context.drawingBufferHeight;

  var passState = view.passState;
  passState.framebuffer = undefined;
  passState.blendingEnabled = undefined;
  passState.scissorTest = undefined;
  passState.viewport = BoundingRectangle.clone(viewport, passState.viewport);

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
 * directly because {@link CesiumWidget} or {@link Viewer} do it automatically.
 * @param {JulianDate} [time] The simulation time at which to render.
 */
Scene.prototype.render = function (time) {
  /**
   *
   * Pre passes update. Execute any pass invariant code that should run before the passes here.
   *
   */
  this._preUpdate.raiseEvent(this, time);

  var frameState = this._frameState;
  frameState.newFrame = false;

  if (!defined(time)) {
    time = JulianDate.now();
  }

  // Determine if shouldRender
  var cameraChanged = this._view.checkForCameraUpdates(this);
  var shouldRender =
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
    var difference = Math.abs(
      JulianDate.secondsDifference(this._lastRenderTime, time)
    );
    shouldRender = shouldRender || difference > this.maximumRenderTimeChange;
  }

  if (shouldRender) {
    this._lastRenderTime = JulianDate.clone(time, this._lastRenderTime);
    this._renderRequested = false;
    this._logDepthBufferDirty = false;
    this._hdrDirty = false;

    var frameNumber = CesiumMath.incrementWrap(
      frameState.frameNumber,
      15000000.0,
      1.0
    );
    updateFrameNumber(this, frameNumber, time);
    frameState.newFrame = true;
  }

  tryAndCatchError(this, prePassesUpdate);

  /**
   *
   * Passes update. Add any passes here
   *
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
   *
   * Post passes update. Execute any pass invariant code that should run after the passes here.
   *
   */
  updateDebugShowFramesPerSecond(this, shouldRender);
  tryAndCatchError(this, postPassesUpdate);

  // Often used to trigger events (so don't want in trycatch) that the user might be subscribed to. Things like the tile load events, ready promises, etc.
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
    Math.min(width, ContextLimits.maximumAliasedLineWidth)
  );
};

/**
 * Returns an object with a `primitive` property that contains the first (top) primitive in the scene
 * at a particular window coordinate or undefined if nothing is at the location. Other properties may
 * potentially be set depending on the type of primitive and may be used to further identify the picked object.
 * <p>
 * When a feature of a 3D Tiles tileset is picked, <code>pick</code> returns a {@link Cesium3DTileFeature} object.
 * </p>
 *
 * @example
 * // On mouse over, color the feature yellow.
 * handler.setInputAction(function(movement) {
 *     var feature = scene.pick(movement.endPosition);
 *     if (feature instanceof Cesium.Cesium3DTileFeature) {
 *         feature.color = Cesium.Color.YELLOW;
 *     }
 * }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
 *
 * @param {Cartesian2} windowPosition Window coordinates to perform picking on.
 * @param {Number} [width=3] Width of the pick rectangle.
 * @param {Number} [height=3] Height of the pick rectangle.
 * @returns {Object} Object containing the picked primitive.
 */
Scene.prototype.pick = function (windowPosition, width, height) {
  return this._picking.pick(this, windowPosition, width, height);
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
  result
) {
  return this._picking.pickPositionWorldCoordinates(
    this,
    windowPosition,
    result
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
 * Returns a list of objects, each containing a `primitive` property, for all primitives at
 * a particular window coordinate position. Other properties may also be set depending on the
 * type of primitive and may be used to further identify the picked object. The primitives in
 * the list are ordered by their visual order in the scene (front to back).
 *
 * @param {Cartesian2} windowPosition Window coordinates to perform picking on.
 * @param {Number} [limit] If supplied, stop drilling after collecting this many picks.
 * @param {Number} [width=3] Width of the pick rectangle.
 * @param {Number} [height=3] Height of the pick rectangle.
 * @returns {Array.<*>} Array of objects, each containing 1 picked primitives.
 *
 * @exception {DeveloperError} windowPosition is undefined.
 *
 * @example
 * var pickedObjects = scene.drillPick(new Cesium.Cartesian2(100.0, 200.0));
 *
 * @see Scene#pick
 */
Scene.prototype.drillPick = function (windowPosition, limit, width, height) {
  return this._picking.drillPick(this, windowPosition, limit, width, height);
};

function updatePreloadPass(scene) {
  var frameState = scene._frameState;
  preloadTilesetPassState.camera = frameState.camera;
  preloadTilesetPassState.cullingVolume = frameState.cullingVolume;

  var primitives = scene.primitives;
  primitives.updateForPass(frameState, preloadTilesetPassState);
}

function updatePreloadFlightPass(scene) {
  var frameState = scene._frameState;
  var camera = frameState.camera;
  if (!camera.canPreloadFlight()) {
    return;
  }

  preloadFlightTilesetPassState.camera = scene.preloadFlightCamera;
  preloadFlightTilesetPassState.cullingVolume =
    scene.preloadFlightCullingVolume;

  var primitives = scene.primitives;
  primitives.updateForPass(frameState, preloadFlightTilesetPassState);
}

function updateRequestRenderModeDeferCheckPass(scene) {
  // Check if any ignored requests are ready to go (to wake rendering up again)
  scene.primitives.updateForPass(
    scene._frameState,
    requestRenderModeDeferCheckPassState
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
 * @param {Number} [width=0.1] Width of the intersection volume in meters.
 * @returns {Object} An object containing the object and position of the first intersection.
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
 * @param {Number} [limit=Number.MAX_VALUE] If supplied, stop finding intersections after this many intersections.
 * @param {Object[]} [objectsToExclude] A list of primitives, entities, or 3D Tiles features to exclude from the ray intersection.
 * @param {Number} [width=0.1] Width of the intersection volume in meters.
 * @returns {Object[]} List of objects containing the object and position of each intersection.
 *
 * @exception {DeveloperError} Ray intersections are only supported in 3D mode.
 */
Scene.prototype.drillPickFromRay = function (
  ray,
  limit,
  objectsToExclude,
  width
) {
  return this._picking.drillPickFromRay(
    this,
    ray,
    limit,
    objectsToExclude,
    width
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
 * @param {Number} [width=0.1] Width of the intersection volume in meters.
 * @returns {Promise.<Object>} A promise that resolves to an object containing the object and position of the first intersection.
 *
 * @exception {DeveloperError} Ray intersections are only supported in 3D mode.
 */
Scene.prototype.pickFromRayMostDetailed = function (
  ray,
  objectsToExclude,
  width
) {
  return this._picking.pickFromRayMostDetailed(
    this,
    ray,
    objectsToExclude,
    width
  );
};

/**
 * Initiates an asynchronous {@link Scene#drillPickFromRay} request using the maximum level of detail for 3D Tilesets
 * regardless of visibility.
 *
 * @private
 *
 * @param {Ray} ray The ray.
 * @param {Number} [limit=Number.MAX_VALUE] If supplied, stop finding intersections after this many intersections.
 * @param {Object[]} [objectsToExclude] A list of primitives, entities, or 3D Tiles features to exclude from the ray intersection.
 * @param {Number} [width=0.1] Width of the intersection volume in meters.
 * @returns {Promise.<Object[]>} A promise that resolves to a list of objects containing the object and position of each intersection.
 *
 * @exception {DeveloperError} Ray intersections are only supported in 3D mode.
 */
Scene.prototype.drillPickFromRayMostDetailed = function (
  ray,
  limit,
  objectsToExclude,
  width
) {
  return this._picking.drillPickFromRayMostDetailed(
    this,
    ray,
    limit,
    objectsToExclude,
    width
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
 * @param {Number} [width=0.1] Width of the intersection volume in meters.
 * @returns {Number} The height. This may be <code>undefined</code> if there was no scene geometry to sample height from.
 *
 * @example
 * var position = new Cesium.Cartographic(-1.31968, 0.698874);
 * var height = viewer.scene.sampleHeight(position);
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
 * @param {Number} [width=0.1] Width of the intersection volume in meters.
 * @param {Cartesian3} [result] An optional object to return the clamped position.
 * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided. This may be <code>undefined</code> if there was no scene geometry to clamp to.
 *
 * @example
 * // Clamp an entity to the underlying scene geometry
 * var position = entity.position.getValue(Cesium.JulianDate.now());
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
  result
) {
  return this._picking.clampToHeight(
    this,
    cartesian,
    objectsToExclude,
    width,
    result
  );
};

/**
 * Initiates an asynchronous {@link Scene#sampleHeight} query for an array of {@link Cartographic} positions
 * using the maximum level of detail for 3D Tilesets in the scene. The height of the input positions is ignored.
 * Returns a promise that is resolved when the query completes. Each point height is modified in place.
 * If a height cannot be determined because no geometry can be sampled at that location, or another error occurs,
 * the height is set to undefined.
 *
 * @param {Cartographic[]} positions The cartographic positions to update with sampled heights.
 * @param {Object[]} [objectsToExclude] A list of primitives, entities, or 3D Tiles features to not sample height from.
 * @param {Number} [width=0.1] Width of the intersection volume in meters.
 * @returns {Promise.<Cartographic[]>} A promise that resolves to the provided list of positions when the query has completed.
 *
 * @example
 * var positions = [
 *     new Cesium.Cartographic(-1.31968, 0.69887),
 *     new Cesium.Cartographic(-1.10489, 0.83923)
 * ];
 * var promise = viewer.scene.sampleHeightMostDetailed(positions);
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
  width
) {
  return this._picking.sampleHeightMostDetailed(
    this,
    positions,
    objectsToExclude,
    width
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
 * @param {Number} [width=0.1] Width of the intersection volume in meters.
 * @returns {Promise.<Cartesian3[]>} A promise that resolves to the provided list of positions when the query has completed.
 *
 * @example
 * var cartesians = [
 *     entities[0].position.getValue(Cesium.JulianDate.now()),
 *     entities[1].position.getValue(Cesium.JulianDate.now())
 * ];
 * var promise = viewer.scene.clampToHeightMostDetailed(cartesians);
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
  width
) {
  return this._picking.clampToHeightMostDetailed(
    this,
    cartesians,
    objectsToExclude,
    width
  );
};

/**
 * Transforms a position in cartesian coordinates to canvas coordinates.  This is commonly used to place an
 * HTML element at the same screen position as an object in the scene.
 *
 * @param {Cartesian3} position The position in cartesian coordinates.
 * @param {Cartesian2} [result] An optional object to return the input position transformed to canvas coordinates.
 * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if one was not provided.  This may be <code>undefined</code> if the input position is near the center of the ellipsoid.
 *
 * @example
 * // Output the canvas position of longitude/latitude (0, 0) every time the mouse moves.
 * var scene = widget.scene;
 * var ellipsoid = scene.globe.ellipsoid;
 * var position = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
 * var handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
 * handler.setInputAction(function(movement) {
 *     console.log(scene.cartesianToCanvasCoordinates(position));
 * }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
 */
Scene.prototype.cartesianToCanvasCoordinates = function (position, result) {
  return SceneTransforms.wgs84ToWindowCoordinates(this, position, result);
};

/**
 * Instantly completes an active transition.
 */
Scene.prototype.completeMorph = function () {
  this._transitioner.completeMorph();
};

/**
 * Asynchronously transitions the scene to 2D.
 * @param {Number} [duration=2.0] The amount of time, in seconds, for transition animations to complete.
 */
Scene.prototype.morphTo2D = function (duration) {
  var ellipsoid;
  var globe = this.globe;
  if (defined(globe)) {
    ellipsoid = globe.ellipsoid;
  } else {
    ellipsoid = this.mapProjection.ellipsoid;
  }
  duration = defaultValue(duration, 2.0);
  this._transitioner.morphTo2D(duration, ellipsoid);
};

/**
 * Asynchronously transitions the scene to Columbus View.
 * @param {Number} [duration=2.0] The amount of time, in seconds, for transition animations to complete.
 */
Scene.prototype.morphToColumbusView = function (duration) {
  var ellipsoid;
  var globe = this.globe;
  if (defined(globe)) {
    ellipsoid = globe.ellipsoid;
  } else {
    ellipsoid = this.mapProjection.ellipsoid;
  }
  duration = defaultValue(duration, 2.0);
  this._transitioner.morphToColumbusView(duration, ellipsoid);
};

/**
 * Asynchronously transitions the scene to 3D.
 * @param {Number} [duration=2.0] The amount of time, in seconds, for transition animations to complete.
 */
Scene.prototype.morphTo3D = function (duration) {
  var ellipsoid;
  var globe = this.globe;
  if (defined(globe)) {
    ellipsoid = globe.ellipsoid;
  } else {
    ellipsoid = this.mapProjection.ellipsoid;
  }
  duration = defaultValue(duration, 2.0);
  this._transitioner.morphTo3D(duration, ellipsoid);
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
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
      this._performanceContainer
    );
  }

  this._removeRequestListenerCallback();
  this._removeTaskProcessorListenerCallback();
  for (var i = 0; i < this._removeGlobeCallbacks.length; ++i) {
    this._removeGlobeCallbacks[i]();
  }
  this._removeGlobeCallbacks.length = 0;

  return destroyObject(this);
};
export default Scene;
