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
   * @type {number}
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
   * @type {number}
   */
  this.morphTime = SceneMode.getMorphTime(SceneMode.SCENE3D);

  /**
   * The current frame number.
   *
   * @type {number}
   * @default 0
   */
  this.frameNumber = 0;

  /**
   * <code>true</code> if a new frame has been issued and the frame number has been updated.
   *
   * @type {boolean}
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
   * @type {boolean}
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
   * @type {number}
   * @default 2
   */
  this.maximumScreenSpaceError = undefined;

  /**
   * Ratio between a pixel and a density-independent pixel. Provides a standard unit of
   * measure for real pixel measurements appropriate to a particular device.
   *
   * @type {number}
   * @default 1.0
   */
  this.pixelRatio = 1.0;

  /**
   * @typedef FrameState.Passes
   * @type {object}
   * @property {boolean} render <code>true</code> if the primitive should update for a render pass, <code>false</code> otherwise.
   * @property {boolean} pick <code>true</code> if the primitive should update for a picking pass, <code>false</code> otherwise.
   * @property {boolean} pickVoxel <code>true</code> if the primitive should update for a voxel picking pass, <code>false</code> otherwise.
   * @property {boolean} depth <code>true</code> if the primitive should update for a depth only pass, <code>false</code> otherwise.
   * @property {boolean} postProcess <code>true</code> if the primitive should update for a per-feature post-process pass, <code>false</code> otherwise.
   * @property {boolean} offscreen <code>true</code> if the primitive should update for an offscreen pass, <code>false</code> otherwise.
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
    pickVoxel: false,
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
   * <p>
   * If any function in the array returns <code>true</code>, in request render mode
   * another frame will be rendered.
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
   * Gets whether or not to optimize for 3D only.
   *
   * @type {boolean}
   * @default false
   */
  this.scene3DOnly = false;

  /**
   * @typedef FrameState.Fog
   * @type {object}
   * @property {boolean} enabled <code>true</code> if fog is enabled, <code>false</code> otherwise. This affects both fog culling and rendering.
   * @property {boolean} renderable <code>true</code> if fog should be rendered, <code>false</code> if not. This flag should be checked in combination with fog.enabled.
   * @property {number} density A positive number used to mix the color and fog color based on camera distance.
   * @property {number} sse A scalar used to modify the screen space error of geometry partially in fog.
   * @property {number} minimumBrightness The minimum brightness of terrain with fog applied.
   */

  /**
   * @type {FrameState.Fog}
   */

  this.fog = {
    /**
     * @default false
     */
    enabled: false,
    renderable: false,
    density: undefined,
    sse: undefined,
    minimumBrightness: undefined,
  };

  /**
   * The current Atmosphere
   * @type {Atmosphere}
   */
  this.atmosphere = undefined;

  /**
   * A scalar used to vertically exaggerate the scene
   * @type {number}
   * @default 1.0
   */
  this.verticalExaggeration = 1.0;

  /**
   * The height relative to which the scene is vertically exaggerated.
   * @type {number}
   * @default 0.0
   */
  this.verticalExaggerationRelativeHeight = 0.0;

  /**
   * @typedef FrameState.ShadowState
   * @type {object}
   * @property {boolean} shadowsEnabled Whether there are any active shadow maps this frame.
   * @property {boolean} lightShadowsEnabled Whether there are any active shadow maps that originate from light sources. Does not include shadow maps that are used for analytical purposes.
   * @property {ShadowMap[]} shadowMaps All shadow maps that are enabled this frame.
   * @property {ShadowMap[]} lightShadowMaps Shadow maps that originate from light sources. Does not include shadow maps that are used for analytical purposes. Only these shadow maps will be used to generate receive shadows shaders.
   * @property {number} nearPlane The near plane of the scene's frustum commands. Used for fitting cascaded shadow maps.
   * @property {number} farPlane The far plane of the scene's frustum commands. Used for fitting cascaded shadow maps.
   * @property {number} closestObjectSize The size of the bounding volume that is closest to the camera. This is used to place more shadow detail near the object.
   * @property {number} lastDirtyTime The time when a shadow map was last dirty
   * @property {boolean} outOfView Whether the shadows maps are out of view this frame
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
   * @type {number}
   * @default 0.0
   */
  this.splitPosition = 0.0;

  /**
   * Distances to the near and far planes of the camera frustums
   * @type {number[]}
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
   * @type {number}
   */
  this.minimumDisableDepthTestDistance = undefined;

  /**
   * When <code>false</code>, 3D Tiles will render normally. When <code>true</code>, classified 3D Tile geometry will render normally and
   * unclassified 3D Tile geometry will render with the color multiplied with {@link FrameState#invertClassificationColor}.
   * @type {boolean}
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
   * @type {boolean}
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
   * @type {number}
   * @default 0.0
   */
  this.minimumTerrainHeight = 0.0;
}

/**
 * A function that will be called at the end of the frame.
 *
 * @callback FrameState.AfterRenderCallback
 * @returns {boolean} true if another render should be requested in request render mode
 */
export default FrameState;
