import SceneMode from "./SceneMode.js";

/**
 * State information about the current frame.  An instance of this class
 * is provided to update functions.
 *
 * @param {Context} context The rendering context
 * @param {CreditDisplay} creditDisplay Handles adding and removing credits from an HTML element
 * @param {JobScheduler} jobScheduler The job scheduler
 *
 * @alias FrameState
 * @constructor
 *
 * @private
 */
function FrameState(context, creditDisplay, jobScheduler) {
  /**
   * The rendering context.
   *
   * @type {Context}
   */
  this.context = context;

  /**
   * An array of rendering commands.
   *
   * @type {DrawCommand[]}
   */
  this.commandList = [];

  /**
   * An array of shadow maps.
   * @type {ShadowMap[]}
   */
  this.shadowMaps = [];

  /**
   * The BRDF look up texture generator used for image-based lighting for PBR models
   * @type {BrdfLutGenerator}
   */
  this.brdfLutGenerator = undefined;

  /**
   * The environment map used for image-based lighting for PBR models
   * @type {CubeMap}
   */
  this.environmentMap = undefined;

  /**
   * The spherical harmonic coefficients used for image-based lighting for PBR models.
   * @type {Cartesian3[]}
   */
  this.sphericalHarmonicCoefficients = undefined;

  /**
   * The specular environment atlas used for image-based lighting for PBR models.
   * @type {Texture}
   */
  this.specularEnvironmentMaps = undefined;

  /**
   * The maximum level-of-detail of the specular environment atlas used for image-based lighting for PBR models.
   * @type {Number}
   */
  this.specularEnvironmentMapsMaximumLOD = undefined;

  /**
   * The current mode of the scene.
   *
   * @type {SceneMode}
   * @default {@link SceneMode.SCENE3D}
   */
  this.mode = SceneMode.SCENE3D;

  /**
   * The current morph transition time between 2D/Columbus View and 3D,
   * with 0.0 being 2D or Columbus View and 1.0 being 3D.
   *
   * @type {Number}
   */
  this.morphTime = SceneMode.getMorphTime(SceneMode.SCENE3D);

  /**
   * The current frame number.
   *
   * @type {Number}
   * @default 0
   */
  this.frameNumber = 0;

  /**
   * <code>true</code> if a new frame has been issued and the frame number has been updated.
   *
   * @type {Boolean}
   * @default false
   */
  this.newFrame = false;

  /**
   * The scene's current time.
   *
   * @type {JulianDate}
   * @default undefined
   */
  this.time = undefined;

  /**
   * The job scheduler.
   *
   * @type {JobScheduler}
   */
  this.jobScheduler = jobScheduler;

  /**
   * The map projection to use in 2D and Columbus View modes.
   *
   * @type {MapProjection}
   * @default undefined
   */
  this.mapProjection = undefined;

  /**
   * The current camera.
   *
   * @type {Camera}
   * @default undefined
   */
  this.camera = undefined;

  /**
   * Whether the camera is underground.
   *
   * @type {Boolean}
   * @default false
   */
  this.cameraUnderground = false;

  /**
   * The {@link GlobeTranslucencyState} object used by the scene.
   *
   * @type {GlobeTranslucencyState}
   * @default undefined
   */
  this.globeTranslucencyState = undefined;

  /**
   * The culling volume.
   *
   * @type {CullingVolume}
   * @default undefined
   */
  this.cullingVolume = undefined;

  /**
   * The current occluder.
   *
   * @type {Occluder}
   * @default undefined
   */
  this.occluder = undefined;

  /**
   * The maximum screen-space error used to drive level-of-detail refinement.  Higher
   * values will provide better performance but lower visual quality.
   *
   * @type {Number}
   * @default 2
   */
  this.maximumScreenSpaceError = undefined;

  /**
   * Ratio between a pixel and a density-independent pixel. Provides a standard unit of
   * measure for real pixel measurements appropriate to a particular device.
   *
   * @type {Number}
   * @default 1.0
   */
  this.pixelRatio = 1.0;

  /**
   * @typedef FrameState.Passes
   * @type {Object}
   * @property {Boolean} render <code>true</code> if the primitive should update for a render pass, <code>false</code> otherwise.
   * @property {Boolean} pick <code>true</code> if the primitive should update for a picking pass, <code>false</code> otherwise.
   * @property {Boolean} depth <code>true</code> if the primitive should update for a depth only pass, <code>false</code> otherwise.
   * @property {Boolean} postProcess <code>true</code> if the primitive should update for a per-feature post-process pass, <code>false</code> otherwise.
   * @property {Boolean} offscreen <code>true</code> if the primitive should update for an offscreen pass, <code>false</code> otherwise.
   */

  /**
   * @type {FrameState.Passes}
   */
  this.passes = {
    /**
     * @default false
     */
    render: false,
    /**
     * @default false
     */
    pick: false,
    /**
     * @default false
     */
    depth: false,
    /**
     * @default false
     */
    postProcess: false,
    /**
     * @default false
     */
    offscreen: false,
  };

  /**
   * The credit display.
   *
   * @type {CreditDisplay}
   */
  this.creditDisplay = creditDisplay;

  /**
   * An array of functions to be called at the end of the frame.  This array
   * will be cleared after each frame.
   * <p>
   * This allows queueing up events in <code>update</code> functions and
   * firing them at a time when the subscribers are free to change the
   * scene state, e.g., manipulate the camera, instead of firing events
   * directly in <code>update</code> functions.
   * </p>
   *
   * @type {FrameState.AfterRenderCallback[]}
   *
   * @example
   * frameState.afterRender.push(function() {
   *   // take some action, raise an event, etc.
   * });
   */
  this.afterRender = [];

  /**
   * Gets whether or not to optimized for 3D only.
   *
   * @type {Boolean}
   * @default false
   */
  this.scene3DOnly = false;

  /**
   * @typedef FrameState.Fog
   * @type {Object}
   * @property {Boolean} enabled <code>true</code> if fog is enabled, <code>false</code> otherwise.
   * @property {Number} density A positive number used to mix the color and fog color based on camera distance.
   * @property {Number} sse A scalar used to modify the screen space error of geometry partially in fog.
   * @property {Number} minimumBrightness The minimum brightness of terrain with fog applied.
   */

  /**
   * @type {FrameState.Fog}
   */

  this.fog = {
    /**
     * @default false
     */
    enabled: false,
    density: undefined,
    sse: undefined,
    minimumBrightness: undefined,
  };

  /**
   * A scalar used to exaggerate the terrain.
   * @type {Number}
   * @default 1.0
   */
  this.terrainExaggeration = 1.0;

  /**
   * The height relative to which terrain is exaggerated.
   * @type {Number}
   * @default 0.0
   */
  this.terrainExaggerationRelativeHeight = 0.0;

  /**
   * @typedef FrameState.ShadowState
   * @type {Object}
   * @property {Boolean} shadowsEnabled Whether there are any active shadow maps this frame.
   * @property {Boolean} lightShadowsEnabled Whether there are any active shadow maps that originate from light sources. Does not include shadow maps that are used for analytical purposes.
   * @property {ShadowMap[]} shadowMaps All shadow maps that are enabled this frame.
   * @property {ShadowMap[]} lightShadowMaps Shadow maps that originate from light sources. Does not include shadow maps that are used for analytical purposes. Only these shadow maps will be used to generate receive shadows shaders.
   * @property {Number} nearPlane The near plane of the scene's frustum commands. Used for fitting cascaded shadow maps.
   * @property {Number} farPlane The far plane of the scene's frustum commands. Used for fitting cascaded shadow maps.
   * @property {Number} closestObjectSize The size of the bounding volume that is closest to the camera. This is used to place more shadow detail near the object.
   * @property {Number} lastDirtyTime The time when a shadow map was last dirty
   * @property {Boolean} outOfView Whether the shadows maps are out of view this frame
   */

  /**
   * @type {FrameState.ShadowState}
   */

  this.shadowState = {
    /**
     * @default true
     */
    shadowsEnabled: true,
    shadowMaps: [],
    lightShadowMaps: [],
    /**
     * @default 1.0
     */
    nearPlane: 1.0,
    /**
     * @default 5000.0
     */
    farPlane: 5000.0,
    /**
     * @default 1000.0
     */
    closestObjectSize: 1000.0,
    /**
     * @default 0
     */
    lastDirtyTime: 0,
    /**
     * @default true
     */
    outOfView: true,
  };

  /**
   * The position of the splitter to use when rendering different things on either side of a splitter.
   * This value should be between 0.0 and 1.0 with 0 being the far left of the viewport and 1 being the far right of the viewport.
   * @type {Number}
   * @default 0.0
   */
  this.splitPosition = 0.0;

  /**
   * Distances to the near and far planes of the camera frustums
   * @type {Number[]}
   * @default []
   */
  this.frustumSplits = [];

  /**
   * The current scene background color
   *
   * @type {Color}
   */
  this.backgroundColor = undefined;

  /**
   * The light used to shade the scene.
   *
   * @type {Light}
   */
  this.light = undefined;

  /**
   * The distance from the camera at which to disable the depth test of billboards, labels and points
   * to, for example, prevent clipping against terrain. When set to zero, the depth test should always
   * be applied. When less than zero, the depth test should never be applied.
   * @type {Number}
   */
  this.minimumDisableDepthTestDistance = undefined;

  /**
   * When <code>false</code>, 3D Tiles will render normally. When <code>true</code>, classified 3D Tile geometry will render normally and
   * unclassified 3D Tile geometry will render with the color multiplied with {@link FrameState#invertClassificationColor}.
   * @type {Boolean}
   * @default false
   */
  this.invertClassification = false;

  /**
   * The highlight color of unclassified 3D Tile geometry when {@link FrameState#invertClassification} is <code>true</code>.
   * @type {Color}
   */
  this.invertClassificationColor = undefined;

  /**
   * Whether or not the scene uses a logarithmic depth buffer.
   *
   * @type {Boolean}
   * @default false
   */
  this.useLogDepth = false;

  /**
   * Additional state used to update 3D Tilesets.
   *
   * @type {Cesium3DTilePassState}
   */
  this.tilesetPassState = undefined;

  /**
   * The minimum terrain height out of all rendered terrain tiles. Used to improve culling for objects underneath the ellipsoid but above terrain.
   *
   * @type {Number}
   * @default 0.0
   */
  this.minimumTerrainHeight = 0.0;
}

/**
 * A function that will be called at the end of the frame.
 *
 * @callback FrameState.AfterRenderCallback
 */
export default FrameState;
