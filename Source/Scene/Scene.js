/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/BoundingSphere',
        '../Core/BoxGeometry',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Cartographic',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/createGuid',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/EllipsoidGeometry',
        '../Core/Event',
        '../Core/GeographicProjection',
        '../Core/GeometryInstance',
        '../Core/GeometryPipeline',
        '../Core/getTimestamp',
        '../Core/Intersect',
        '../Core/Interval',
        '../Core/JulianDate',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/mergeSort',
        '../Core/Occluder',
        '../Core/PixelFormat',
        '../Core/ShowGeometryInstanceAttribute',
        '../Core/Transforms',
        '../Renderer/ClearCommand',
        '../Renderer/ComputeEngine',
        '../Renderer/Context',
        '../Renderer/ContextLimits',
        '../Renderer/DrawCommand',
        '../Renderer/Framebuffer',
        '../Renderer/Pass',
        '../Renderer/PassState',
        '../Renderer/PixelDatatype',
        '../Renderer/RenderState',
        '../Renderer/ShaderProgram',
        '../Renderer/ShaderSource',
        '../Renderer/Texture',
        './Camera',
        './CreditDisplay',
        './CullingVolume',
        './DebugCameraPrimitive',
        './DepthPlane',
        './DeviceOrientationCameraController',
        './Fog',
        './FrameState',
        './FrustumCommands',
        './FXAA',
        './GlobeDepth',
        './MapMode2D',
        './OIT',
        './OrthographicFrustum',
        './OrthographicOffCenterFrustum',
        './PerformanceDisplay',
        './PerInstanceColorAppearance',
        './PerspectiveFrustum',
        './PerspectiveOffCenterFrustum',
        './PickDepth',
        './Primitive',
        './PrimitiveCollection',
        './SceneMode',
        './SceneTransforms',
        './SceneTransitioner',
        './ScreenSpaceCameraController',
        './ShadowMap',
        './SunPostProcess',
        './TweenCollection'
    ], function(
        BoundingRectangle,
        BoundingSphere,
        BoxGeometry,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Cartographic,
        Color,
        ColorGeometryInstanceAttribute,
        createGuid,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        EllipsoidGeometry,
        Event,
        GeographicProjection,
        GeometryInstance,
        GeometryPipeline,
        getTimestamp,
        Intersect,
        Interval,
        JulianDate,
        CesiumMath,
        Matrix4,
        mergeSort,
        Occluder,
        PixelFormat,
        ShowGeometryInstanceAttribute,
        Transforms,
        ClearCommand,
        ComputeEngine,
        Context,
        ContextLimits,
        DrawCommand,
        Framebuffer,
        Pass,
        PassState,
        PixelDatatype,
        RenderState,
        ShaderProgram,
        ShaderSource,
        Texture,
        Camera,
        CreditDisplay,
        CullingVolume,
        DebugCameraPrimitive,
        DepthPlane,
        DeviceOrientationCameraController,
        Fog,
        FrameState,
        FrustumCommands,
        FXAA,
        GlobeDepth,
        MapMode2D,
        OIT,
        OrthographicFrustum,
        OrthographicOffCenterFrustum,
        PerformanceDisplay,
        PerInstanceColorAppearance,
        PerspectiveFrustum,
        PerspectiveOffCenterFrustum,
        PickDepth,
        Primitive,
        PrimitiveCollection,
        SceneMode,
        SceneTransforms,
        SceneTransitioner,
        ScreenSpaceCameraController,
        ShadowMap,
        SunPostProcess,
        TweenCollection) {
    'use strict';

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
     * @param {Object} [options] Object with the following properties:
     * @param {Canvas} options.canvas The HTML canvas element to create the scene for.
     * @param {Object} [options.contextOptions] Context and WebGL creation properties.  See details above.
     * @param {Element} [options.creditContainer] The HTML element in which the credits will be displayed.
     * @param {MapProjection} [options.mapProjection=new GeographicProjection()] The map projection to use in 2D and Columbus View modes.
     * @param {Boolean} [options.orderIndependentTranslucency=true] If true and the configuration supports it, use order independent translucency.
     * @param {Boolean} [options.scene3DOnly=false] If true, optimizes memory use and performance for 3D mode but disables the ability to use 2D or Columbus View.
     * @param {Number} [options.terrainExaggeration=1.0] A scalar used to exaggerate the terrain. Note that terrain exaggeration will not modify any other primitive as they are positioned relative to the ellipsoid.
     * @param {Boolean} [options.shadows=false] Determines if shadows are cast by the sun.
     * @param {MapMode2D} [options.mapMode2D=MapMode2D.INFINITE_SCROLL] Determines if the 2D map is rotatable or can be scrolled infinitely in the horizontal direction.
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
        var contextOptions = options.contextOptions;
        var creditContainer = options.creditContainer;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(canvas)) {
            throw new DeveloperError('options and options.canvas are required.');
        }
        //>>includeEnd('debug');

        var context = new Context(canvas, contextOptions);
        if (!defined(creditContainer)) {
            creditContainer = document.createElement('div');
            creditContainer.style.position = 'absolute';
            creditContainer.style.bottom = '0';
            creditContainer.style['text-shadow'] = '0 0 2px #000000';
            creditContainer.style.color = '#ffffff';
            creditContainer.style['font-size'] = '10px';
            creditContainer.style['padding-right'] = '5px';
            canvas.parentNode.appendChild(creditContainer);
        }

        this._id = createGuid();
        this._frameState = new FrameState(context, new CreditDisplay(creditContainer));
        this._frameState.scene3DOnly = defaultValue(options.scene3DOnly, false);

        var ps = new PassState(context);
        ps.viewport = new BoundingRectangle();
        ps.viewport.x = 0;
        ps.viewport.y = 0;
        ps.viewport.width = context.drawingBufferWidth;
        ps.viewport.height = context.drawingBufferHeight;
        this._passState = ps;

        this._canvas = canvas;
        this._context = context;
        this._computeEngine = new ComputeEngine(context);
        this._globe = undefined;
        this._primitives = new PrimitiveCollection();
        this._groundPrimitives = new PrimitiveCollection();

        this._tweens = new TweenCollection();

        this._shaderFrameCount = 0;

        this._sunPostProcess = undefined;

        this._computeCommandList = [];
        this._frustumCommandsList = [];
        this._overlayCommandList = [];

        this._pickFramebuffer = undefined;

        this._useOIT = defaultValue(options.orderIndependentTranslucency, true);
        this._executeOITFunction = undefined;

        var globeDepth;
        if (context.depthTexture) {
            globeDepth = new GlobeDepth();
        }

        var oit;
        if (this._useOIT && defined(globeDepth)) {
            oit = new OIT(context);
        }

        this._globeDepth = globeDepth;
        this._depthPlane = new DepthPlane();
        this._oit = oit;
        this._fxaa = new FXAA();

        this._clearColorCommand = new ClearCommand({
            color : new Color(),
            stencil : 0,
            owner : this
        });
        this._depthClearCommand = new ClearCommand({
            depth : 1.0,
            owner : this
        });
        this._stencilClearCommand = new ClearCommand({
            stencil : 0
        });

        this._pickDepths = [];
        this._debugGlobeDepths = [];

        this._pickDepthPassState = undefined;
        this._pickDepthFramebuffer = undefined;
        this._pickDepthFramebufferWidth = undefined;
        this._pickDepthFramebufferHeight = undefined;
        this._depthOnlyRenderStateCache = {};

        this._transitioner = new SceneTransitioner(this);

        this._renderError = new Event();
        this._preRender = new Event();
        this._postRender = new Event();

        this._cameraStartFired = false;
        this._cameraMovedTime = undefined;

        this._pickPositionCache = {};
        this._pickPositionCacheDirty = false;

        this._minimumDisableDepthTestDistance = 0.0;

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

        this._mapProjection = defined(options.mapProjection) ? options.mapProjection : new GeographicProjection();

        /**
         * The current morph transition time between 2D/Columbus View and 3D,
         * with 0.0 being 2D or Columbus View and 1.0 being 3D.
         *
         * @type {Number}
         * @default 1.0
         */
        this.morphTime = 1.0;
        /**
         * The far-to-near ratio of the multi-frustum. The default is 1,000.0.
         *
         * @type {Number}
         * @default 1000.0
         */
        this.farToNearRatio = 1000.0;

        /**
         * Determines the uniform depth size in meters of each frustum of the multifrustum in 2D. If a primitive or model close
         * to the surface shows z-fighting, decreasing this will eliminate the artifact, but decrease performance. On the
         * other hand, increasing this will increase performance but may cause z-fighting among primitives close to thesurface.
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

        this._debugFrustumStatistics = undefined;

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
         * When <code>true</code>, enables Fast Approximate Anti-aliasing even when order independent translucency
         * is unsupported.
         *
         * @type Boolean
         * @default true
         */
        this.fxaa = true;

        /**
         * When <code>true</code>, enables picking using the depth buffer.
         *
         * @type Boolean
         * @default true
         */
        this.useDepthPicking = true;

        /**
         * When <code>true</code>, enables picking translucent geometry using the depth buffer.
         * {@link Scene#useDepthPicking} must also be true to enable picking the depth buffer.
         * <p>
         * There is a decrease in performance when enabled. There are extra draw calls to write depth for
         * translucent geometry.
         * </p>
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
         * Set to true to copy the depth texture after rendering the globe. Makes czm_globeDepthTexture valid.
         * @type {Boolean}
         * @default false
         * @private
         */
        this.copyGlobeDepth = false;

        /**
         * Blends the atmosphere to geometry far from the camera for horizon views. Allows for additional
         * performance improvements by rendering less geometry and dispatching less terrain requests.
         * @type {Fog}
         */
        this.fog = new Fog();

        this._sunCamera = new Camera(this);

        /**
         * The shadow map in the scene. When enabled, models, primitives, and the globe may cast and receive shadows.
         * By default the light source of the shadow map is the sun.
         * @type {ShadowMap}
         */
        this.shadowMap = new ShadowMap({
            context : context,
            lightCamera : this._sunCamera,
            enabled : defaultValue(options.shadows, false)
        });

        this._terrainExaggeration = defaultValue(options.terrainExaggeration, 1.0);

        this._performanceDisplay = undefined;
        this._debugVolume = undefined;

        var camera = new Camera(this);
        this._camera = camera;
        this._cameraClone = Camera.clone(camera);
        this._screenSpaceCameraController = new ScreenSpaceCameraController(this);
        this._mapMode2D = defaultValue(options.mapMode2D, MapMode2D.INFINITE_SCROLL);

        // Keeps track of the state of a frame. FrameState is the state across
        // the primitives of the scene. This state is for internally keeping track
        // of celestial and environment effects that need to be updated/rendered in
        // a certain order as well as updating/tracking framebuffer usage.
        this._environmentState = {
            skyBoxCommand : undefined,
            skyAtmosphereCommand : undefined,
            sunDrawCommand : undefined,
            sunComputeCommand : undefined,
            moonCommand : undefined,

            isSunVisible : false,
            isMoonVisible : false,
            isReadyForAtmosphere : false,
            isSkyAtmosphereVisible : false,

            clearGlobeDepth : false,
            useDepthPlane : false,

            originalFramebuffer : undefined,
            useGlobeDepthFramebuffer : false,
            useOIT : false,
            useFXAA : false
        };

        this._useWebVR = false;
        this._cameraVR = undefined;
        this._aspectRatioVR = undefined;

        // initial guess at frustums.
        var near = camera.frustum.near;
        var far = camera.frustum.far;
        var numFrustums = Math.ceil(Math.log(far / near) / Math.log(this.farToNearRatio));
        updateFrustums(near, far, this.farToNearRatio, numFrustums, this._frustumCommandsList, false, undefined);

        // give frameState, camera, and screen space camera controller initial state before rendering
        updateFrameState(this, 0.0, JulianDate.now());
        this.initializeFrame();
    }

    var OPAQUE_FRUSTUM_NEAR_OFFSET = 0.9999;

    defineProperties(Scene.prototype, {
        /**
         * Gets the canvas element to which this scene is bound.
         * @memberof Scene.prototype
         *
         * @type {Canvas}
         * @readonly
         */
        canvas : {
            get : function() {
                return this._canvas;
            }
        },

        /**
         * The drawingBufferWidth of the underlying GL context.
         * @memberof Scene.prototype
         *
         * @type {Number}
         * @readonly
         *
         * @see {@link https://www.khronos.org/registry/webgl/specs/1.0/#DOM-WebGLRenderingContext-drawingBufferWidth|drawingBufferWidth}
         */
        drawingBufferHeight : {
            get : function() {
                return this._context.drawingBufferHeight;
            }
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
        drawingBufferWidth : {
            get : function() {
                return this._context.drawingBufferWidth;
            }
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
        maximumAliasedLineWidth : {
            get : function() {
                return ContextLimits.maximumAliasedLineWidth;
            }
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
        maximumCubeMapSize : {
            get : function() {
                return ContextLimits.maximumCubeMapSize;
            }
        },

        /**
         * Returns true if the pickPosition function is supported.
         * @memberof Scene.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        pickPositionSupported : {
            get : function() {
                return this._context.depthTexture;
            }
        },

        /**
         * Gets or sets the depth-test ellipsoid.
         * @memberof Scene.prototype
         *
         * @type {Globe}
         */
        globe : {
            get: function() {
                return this._globe;
            },

            set: function(globe) {
                this._globe = this._globe && this._globe.destroy();
                this._globe = globe;
            }
        },

        /**
         * Gets the collection of primitives.
         * @memberof Scene.prototype
         *
         * @type {PrimitiveCollection}
         * @readonly
         */
        primitives : {
            get : function() {
                return this._primitives;
            }
        },

        /**
         * Gets the collection of ground primitives.
         * @memberof Scene.prototype
         *
         * @type {PrimitiveCollection}
         * @readonly
         */
        groundPrimitives : {
            get : function() {
                return this._groundPrimitives;
            }
        },

        /**
         * Gets the camera.
         * @memberof Scene.prototype
         *
         * @type {Camera}
         * @readonly
         */
        camera : {
            get : function() {
                return this._camera;
            }
        },
        // TODO: setCamera

        /**
         * Gets the controller for camera input handling.
         * @memberof Scene.prototype
         *
         * @type {ScreenSpaceCameraController}
         * @readonly
         */
        screenSpaceCameraController : {
            get : function() {
                return this._screenSpaceCameraController;
            }
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
        mapProjection : {
            get: function() {
                return this._mapProjection;
            }
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
        frameState : {
            get: function() {
                return this._frameState;
            }
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
        tweens : {
            get : function() {
                return this._tweens;
            }
        },

        /**
         * Gets the collection of image layers that will be rendered on the globe.
         * @memberof Scene.prototype
         *
         * @type {ImageryLayerCollection}
         * @readonly
         */
        imageryLayers : {
            get : function() {
                return this.globe.imageryLayers;
            }
        },

        /**
         * The terrain provider providing surface geometry for the globe.
         * @memberof Scene.prototype
         *
         * @type {TerrainProvider}
         */
        terrainProvider : {
            get : function() {
                return this.globe.terrainProvider;
            },
            set : function(terrainProvider) {
                this.globe.terrainProvider = terrainProvider;
            }
        },

        /**
         * Gets an event that's raised when the terrain provider is changed
         * @memberof Scene.prototype
         *
         * @type {Event}
         * @readonly
         */
        terrainProviderChanged : {
            get : function() {
                return this.globe.terrainProviderChanged;
            }
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
        renderError : {
            get : function() {
                return this._renderError;
            }
        },

        /**
         * Gets the event that will be raised at the start of each call to <code>render</code>.  Subscribers to the event
         * receive the Scene instance as the first parameter and the current time as the second parameter.
         * @memberof Scene.prototype
         *
         * @type {Event}
         * @readonly
         */
        preRender : {
            get : function() {
                return this._preRender;
            }
        },

        /**
         * Gets the event that will be raised at the end of each call to <code>render</code>.  Subscribers to the event
         * receive the Scene instance as the first parameter and the current time as the second parameter.
         * @memberof Scene.prototype
         *
         * @type {Event}
         * @readonly
         */
        postRender : {
            get : function() {
                return this._postRender;
            }
        },

        /**
         * @memberof Scene.prototype
         * @private
         * @readonly
         */
        context : {
            get : function() {
                return this._context;
            }
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
        debugFrustumStatistics : {
            get : function() {
                return this._debugFrustumStatistics;
            }
        },

        /**
         * Gets whether or not the scene is optimized for 3D only viewing.
         * @memberof Scene.prototype
         * @type {Boolean}
         * @readonly
         */
        scene3DOnly : {
            get : function() {
                return this._frameState.scene3DOnly;
            }
        },

        /**
         * Gets whether or not the scene has order independent translucency enabled.
         * Note that this only reflects the original construction option, and there are
         * other factors that could prevent OIT from functioning on a given system configuration.
         * @memberof Scene.prototype
         * @type {Boolean}
         * @readonly
         */
        orderIndependentTranslucency : {
            get : function() {
                return defined(this._oit);
            }
        },

        /**
         * Gets the unique identifier for this scene.
         * @memberof Scene.prototype
         * @type {String}
         * @readonly
         */
        id : {
            get : function() {
                return this._id;
            }
        },

        /**
         * Gets or sets the current mode of the scene.
         * @memberof Scene.prototype
         * @type {SceneMode}
         * @default {@link SceneMode.SCENE3D}
         */
        mode : {
            get : function() {
                return this._mode;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (this.scene3DOnly && value !== SceneMode.SCENE3D) {
                    throw new DeveloperError('Only SceneMode.SCENE3D is valid when scene3DOnly is true.');
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
                    throw new DeveloperError('value must be a valid SceneMode enumeration.');
                    //>>includeEnd('debug');
                }
                this._mode = value;
            }
        },

        /**
         * Gets the number of frustums used in the last frame.
         * @memberof Scene.prototype
         * @type {Number}
         *
         * @private
         */
        numberOfFrustums : {
            get : function() {
                return this._frustumCommandsList.length;
            }
        },

        /**
         * Gets the scalar used to exaggerate the terrain.
         * @memberof Scene.prototype
         * @type {Number}
         */
        terrainExaggeration : {
            get : function() {
                return this._terrainExaggeration;
            }
        },

        /**
         * When <code>true</code>, splits the scene into two viewports with steroscopic views for the left and right eyes.
         * Used for cardboard and WebVR.
         * @memberof Scene.prototype
         * @type {Boolean}
         * @default false
         */
        useWebVR : {
            get : function() {
                return this._useWebVR;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (this.camera.frustum instanceof OrthographicFrustum) {
                    throw new DeveloperError('VR is unsupported with an orthographic projection.');
                }
                //>>includeEnd('debug');
                this._useWebVR = value;
                if (this._useWebVR) {
                    this._frameState.creditDisplay.container.style.visibility = 'hidden';
                    this._cameraVR = new Camera(this);
                    if (!defined(this._deviceOrientationCameraController)) {
                        this._deviceOrientationCameraController = new DeviceOrientationCameraController(this);
                    }

                    this._aspectRatioVR = this._camera.frustum.aspectRatio;
                } else {
                    this._frameState.creditDisplay.container.style.visibility = 'visible';
                    this._cameraVR = undefined;
                    this._deviceOrientationCameraController = this._deviceOrientationCameraController && !this._deviceOrientationCameraController.isDestroyed() && this._deviceOrientationCameraController.destroy();

                    this._camera.frustum.aspectRatio = this._aspectRatioVR;
                    this._camera.frustum.xOffset = 0.0;
                }
            }
        },

        /**
         * Determines if the 2D map is rotatable or can be scrolled infinitely in the horizontal direction.
         * @memberof Scene.prototype
         * @type {Boolean}
         */
        mapMode2D : {
            get : function() {
                return this._mapMode2D;
            }
        },

         /**
         * Gets or sets the position of the Imagery splitter within the viewport.  Valid values are between 0.0 and 1.0.
         * @memberof Scene.prototype
         *
         * @type {Number}
         */
        imagerySplitPosition : {
            get: function() {
                return this._frameState.imagerySplitPosition;
            },
            set: function(value) {
                this._frameState.imagerySplitPosition = value;
            }
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
        minimumDisableDepthTestDistance : {
            get : function() {
                return this._minimumDisableDepthTestDistance;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(value) || value < 0.0) {
                    throw new DeveloperError('minimumDisableDepthTestDistance must be greater than or equal to 0.0.');
                }
                //>>includeEnd('debug');
                this._minimumDisableDepthTestDistance = value;
            }
        }
    });

    /**
     * Determines if a compressed texture format is supported.
     * @param {String} format The texture format. May be the name of the format or the WebGL extension name, e.g. s3tc or WEBGL_compressed_texture_s3tc.
     * @return {boolean} Whether or not the format is supported.
     */
    Scene.prototype.getCompressedTextureFormatSupported = function(format) {
        var context = this.context;
        return ((format === 'WEBGL_compressed_texture_s3tc' || format === 's3tc') && context.s3tc) ||
               ((format === 'WEBGL_compressed_texture_pvrtc' || format === 'pvrtc') && context.pvrtc) ||
               ((format === 'WEBGL_compressed_texture_etc1' || format === 'etc1') && context.etc1);
    };

    var scratchPosition0 = new Cartesian3();
    var scratchPosition1 = new Cartesian3();
    function maxComponent(a, b) {
        var x = Math.max(Math.abs(a.x), Math.abs(b.x));
        var y = Math.max(Math.abs(a.y), Math.abs(b.y));
        var z = Math.max(Math.abs(a.z), Math.abs(b.z));
        return Math.max(Math.max(x, y), z);
    }

    function cameraEqual(camera0, camera1, epsilon) {
        var scalar = 1 / Math.max(1, maxComponent(camera0.position, camera1.position));
        Cartesian3.multiplyByScalar(camera0.position, scalar, scratchPosition0);
        Cartesian3.multiplyByScalar(camera1.position, scalar, scratchPosition1);
        return Cartesian3.equalsEpsilon(scratchPosition0, scratchPosition1, epsilon) &&
            Cartesian3.equalsEpsilon(camera0.direction, camera1.direction, epsilon) &&
            Cartesian3.equalsEpsilon(camera0.up, camera1.up, epsilon) &&
            Cartesian3.equalsEpsilon(camera0.right, camera1.right, epsilon) &&
            Matrix4.equalsEpsilon(camera0.transform, camera1.transform, epsilon);
    }

    function updateDerivedCommands(scene, command) {
        var frameState = scene.frameState;
        var context = scene._context;
        var shadowsEnabled = frameState.shadowHints.shadowsEnabled;
        var shadowMaps = frameState.shadowHints.shadowMaps;
        var lightShadowMaps = frameState.shadowHints.lightShadowMaps;
        var lightShadowsEnabled = shadowsEnabled && (lightShadowMaps.length > 0);

        // Update derived commands when any shadow maps become dirty
        var shadowsDirty = false;
        var lastDirtyTime = frameState.shadowHints.lastDirtyTime;
        if (command.lastDirtyTime !== lastDirtyTime) {
            command.lastDirtyTime = lastDirtyTime;
            command.dirty = true;
            shadowsDirty = true;
        }

        var derivedCommands = command.derivedCommands;
        if (command.dirty && defined(derivedCommands)) {
            command.dirty = false;

            if (shadowsEnabled && (command.receiveShadows || command.castShadows)) {
                derivedCommands.shadows = ShadowMap.createDerivedCommands(shadowMaps, lightShadowMaps, command, shadowsDirty, context, derivedCommands.shadows);
            }

            var oit = scene._oit;
            if (command.pass === Pass.TRANSLUCENT && defined(oit) && oit.isSupported()) {
                if (lightShadowsEnabled && command.receiveShadows) {
                    derivedCommands.oit = defined(derivedCommands.oit) ? derivedCommands.oit : {};
                    derivedCommands.oit.shadows = oit.createDerivedCommands(command.derivedCommands.shadows.receiveCommand, context, derivedCommands.oit.shadows);
                } else {
                    derivedCommands.oit = oit.createDerivedCommands(command, context, derivedCommands.oit);
                }
            }

            derivedCommands.depth = createDepthOnlyDerivedCommand(scene, command, context, derivedCommands.depth);
        }
    }

    var scratchOccluderBoundingSphere = new BoundingSphere();
    var scratchOccluder;

    function getOccluder(scene) {
        // TODO: The occluder is the top-level globe. When we add
        //       support for multiple central bodies, this should be the closest one.
        var globe = scene.globe;
        if (scene._mode === SceneMode.SCENE3D && defined(globe)) {
            var ellipsoid = globe.ellipsoid;
            scratchOccluderBoundingSphere.radius = ellipsoid.minimumRadius;
            scratchOccluder = Occluder.fromBoundingSphere(scratchOccluderBoundingSphere, scene._camera.positionWC, scratchOccluder);
            return scratchOccluder;
        }

        return undefined;
    }

    function clearPasses(passes) {
        passes.render = false;
        passes.pick = false;
        passes.depth = false;
    }

    function updateFrameState(scene, frameNumber, time) {
        var camera = scene._camera;

        var frameState = scene._frameState;
        frameState.commandList.length = 0;
        frameState.shadowMaps.length = 0;
        frameState.mode = scene._mode;
        frameState.morphTime = scene.morphTime;
        frameState.mapProjection = scene.mapProjection;
        frameState.frameNumber = frameNumber;
        frameState.time = JulianDate.clone(time, frameState.time);
        frameState.camera = camera;
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.positionWC, camera.directionWC, camera.upWC);
        frameState.occluder = getOccluder(scene);
        frameState.terrainExaggeration = scene._terrainExaggeration;
        frameState.minimumDisableDepthTestDistance = scene._minimumDisableDepthTestDistance;
        if (defined(scene.globe)) {
            frameState.maximumScreenSpaceError = scene.globe.maximumScreenSpaceError;
        } else {
            frameState.maximumScreenSpaceError = 2;
        }

        clearPasses(frameState.passes);
    }

    function updateFrustums(near, far, farToNearRatio, numFrustums, frustumCommandsList, is2D, nearToFarDistance2D) {
        frustumCommandsList.length = numFrustums;
        for (var m = 0; m < numFrustums; ++m) {
            var curNear;
            var curFar;

            if (!is2D) {
                curNear = Math.max(near, Math.pow(farToNearRatio, m) * near);
                curFar = Math.min(far, farToNearRatio * curNear);
            } else {
                curNear = Math.min(far - nearToFarDistance2D, near + m * nearToFarDistance2D);
                curFar = Math.min(far, curNear + nearToFarDistance2D);
            }

            var frustumCommands = frustumCommandsList[m];
            if (!defined(frustumCommands)) {
                frustumCommands = frustumCommandsList[m] = new FrustumCommands(curNear, curFar);
            } else {
                frustumCommands.near = curNear;
                frustumCommands.far = curFar;
            }
        }
    }

    function insertIntoBin(scene, command, distance) {
        if (scene.debugShowFrustums) {
            command.debugOverlappingFrustums = 0;
        }

        if (!scene.frameState.passes.pick) {
            updateDerivedCommands(scene, command);
        }

        var frustumCommandsList = scene._frustumCommandsList;
        var length = frustumCommandsList.length;

        for (var i = 0; i < length; ++i) {
            var frustumCommands = frustumCommandsList[i];
            var curNear = frustumCommands.near;
            var curFar = frustumCommands.far;

            if (distance.start > curFar) {
                continue;
            }

            if (distance.stop < curNear) {
                break;
            }

            var pass = command instanceof ClearCommand ? Pass.OPAQUE : command.pass;
            var index = frustumCommands.indices[pass]++;
            frustumCommands.commands[pass][index] = command;

            if (scene.debugShowFrustums) {
                command.debugOverlappingFrustums |= (1 << i);
            }

            if (command.executeInClosestFrustum) {
                break;
            }
        }

        if (scene.debugShowFrustums) {
            var cf = scene._debugFrustumStatistics.commandsInFrustums;
            cf[command.debugOverlappingFrustums] = defined(cf[command.debugOverlappingFrustums]) ? cf[command.debugOverlappingFrustums] + 1 : 1;
            ++scene._debugFrustumStatistics.totalCommands;
        }
    }

    var scratchCullingVolume = new CullingVolume();
    var distances = new Interval();

    function isVisible(command, cullingVolume, occluder) {
        return ((defined(command)) &&
                ((!defined(command.boundingVolume)) ||
                 !command.cull ||
                 ((cullingVolume.computeVisibility(command.boundingVolume) !== Intersect.OUTSIDE) &&
                  (!defined(occluder) || !command.boundingVolume.isOccluded(occluder)))));
    }

    function createPotentiallyVisibleSet(scene) {
        var frameState = scene._frameState;
        var camera = frameState.camera;
        var direction = camera.directionWC;
        var position = camera.positionWC;

        var computeList = scene._computeCommandList;
        var overlayList = scene._overlayCommandList;
        var commandList = frameState.commandList;

        if (scene.debugShowFrustums) {
            scene._debugFrustumStatistics = {
                totalCommands : 0,
                commandsInFrustums : {}
            };
        }

        var frustumCommandsList = scene._frustumCommandsList;
        var numberOfFrustums = frustumCommandsList.length;
        var numberOfPasses = Pass.NUMBER_OF_PASSES;
        for (var n = 0; n < numberOfFrustums; ++n) {
            for (var p = 0; p < numberOfPasses; ++p) {
                frustumCommandsList[n].indices[p] = 0;
            }
        }

        computeList.length = 0;
        overlayList.length = 0;

        var near = Number.MAX_VALUE;
        var far = -Number.MAX_VALUE;
        var undefBV = false;

        var shadowsEnabled = frameState.shadowHints.shadowsEnabled;
        var shadowNear = Number.MAX_VALUE;
        var shadowFar = -Number.MAX_VALUE;
        var shadowClosestObjectSize = Number.MAX_VALUE;

        var occluder = (frameState.mode === SceneMode.SCENE3D) ? frameState.occluder: undefined;
        var cullingVolume = frameState.cullingVolume;

        // get user culling volume minus the far plane.
        var planes = scratchCullingVolume.planes;
        for (var k = 0; k < 5; ++k) {
            planes[k] = cullingVolume.planes[k];
        }
        cullingVolume = scratchCullingVolume;

        var length = commandList.length;
        for (var i = 0; i < length; ++i) {
            var command = commandList[i];
            var pass = command.pass;

            if (pass === Pass.COMPUTE) {
                computeList.push(command);
            } else if (pass === Pass.OVERLAY) {
                overlayList.push(command);
            } else {
                var boundingVolume = command.boundingVolume;
                if (defined(boundingVolume)) {
                    if (!isVisible(command, cullingVolume, occluder)) {
                        continue;
                    }

                    distances = boundingVolume.computePlaneDistances(position, direction, distances);
                    near = Math.min(near, distances.start);
                    far = Math.max(far, distances.stop);

                    // Compute a tight near and far plane for commands that receive shadows. This helps compute
                    // good splits for cascaded shadow maps. Ignore commands that exceed the maximum distance.
                    // When moving the camera low LOD globe tiles begin to load, whose bounding volumes
                    // throw off the near/far fitting for the shadow map. Only update for globe tiles that the
                    // camera isn't inside.
                    if (shadowsEnabled && command.receiveShadows && (distances.start < ShadowMap.MAXIMUM_DISTANCE) &&
                        !((pass === Pass.GLOBE) && (distances.start < -100.0) && (distances.stop > 100.0))) {

                        // Get the smallest bounding volume the camera is near. This is used to place more shadow detail near the object.
                        var size = distances.stop - distances.start;
                        if ((pass !== Pass.GLOBE) && (distances.start < 100.0)) {
                            shadowClosestObjectSize = Math.min(shadowClosestObjectSize, size);
                        }
                        shadowNear = Math.min(shadowNear, distances.start);
                        shadowFar = Math.max(shadowFar, distances.stop);
                    }
                } else {
                    // Clear commands don't need a bounding volume - just add the clear to all frustums.
                    // If another command has no bounding volume, though, we need to use the camera's
                    // worst-case near and far planes to avoid clipping something important.
                    distances.start = camera.frustum.near;
                    distances.stop = camera.frustum.far;
                    undefBV = !(command instanceof ClearCommand);
                }

                insertIntoBin(scene, command, distances);
            }
        }

        if (undefBV) {
            near = camera.frustum.near;
            far = camera.frustum.far;
        } else {
            // The computed near plane must be between the user defined near and far planes.
            // The computed far plane must between the user defined far and computed near.
            // This will handle the case where the computed near plane is further than the user defined far plane.
            near = Math.min(Math.max(near, camera.frustum.near), camera.frustum.far);
            far = Math.max(Math.min(far, camera.frustum.far), near);

            if (shadowsEnabled) {
                shadowNear = Math.min(Math.max(shadowNear, camera.frustum.near), camera.frustum.far);
                shadowFar = Math.max(Math.min(shadowFar, camera.frustum.far), shadowNear);
            }
        }

        // Use the computed near and far for shadows
        if (shadowsEnabled) {
            frameState.shadowHints.nearPlane = shadowNear;
            frameState.shadowHints.farPlane = shadowFar;
            frameState.shadowHints.closestObjectSize = shadowClosestObjectSize;
        }

        // Exploit temporal coherence. If the frustums haven't changed much, use the frustums computed
        // last frame, else compute the new frustums and sort them by frustum again.
        var is2D = scene.mode === SceneMode.SCENE2D;
        var farToNearRatio = scene.farToNearRatio;

        var numFrustums;
        if (!is2D) {
            // The multifrustum for 3D/CV is non-uniformly distributed.
            numFrustums = Math.ceil(Math.log(far / near) / Math.log(farToNearRatio));
        } else {
            // The multifrustum for 2D is uniformly distributed. To avoid z-fighting in 2D,
            // the camera i smoved to just before the frustum and the frustum depth is scaled
            // to be in [1.0, nearToFarDistance2D].
            far = Math.min(far, camera.position.z + scene.nearToFarDistance2D);
            near = Math.min(near, far);
            numFrustums = Math.ceil(Math.max(1.0, far - near) / scene.nearToFarDistance2D);
        }

        if (near !== Number.MAX_VALUE && (numFrustums !== numberOfFrustums || (frustumCommandsList.length !== 0 &&
                (near < frustumCommandsList[0].near || (far > frustumCommandsList[numberOfFrustums - 1].far && !CesiumMath.equalsEpsilon(far, frustumCommandsList[numberOfFrustums - 1].far, CesiumMath.EPSILON8)))))) {
            updateFrustums(near, far, farToNearRatio, numFrustums, frustumCommandsList, is2D, scene.nearToFarDistance2D);
            createPotentiallyVisibleSet(scene);
        }

        var frustumSplits = frameState.frustumSplits;
        frustumSplits.length = numFrustums + 1;
        for (var j = 0; j < numFrustums; ++j) {
            frustumSplits[j] = frustumCommandsList[j].near;
            if (j === numFrustums - 1) {
                frustumSplits[j + 1] = frustumCommandsList[j].far;
            }
        }
    }

    function getAttributeLocations(shaderProgram) {
        var attributeLocations = {};
        var attributes = shaderProgram.vertexAttributes;
        for (var a in attributes) {
            if (attributes.hasOwnProperty(a)) {
                attributeLocations[a] = attributes[a].index;
            }
        }

        return attributeLocations;
    }

    function createDebugFragmentShaderProgram(command, scene, shaderProgram) {
        var context = scene.context;
        var sp = defaultValue(shaderProgram, command.shaderProgram);
        var fs = sp.fragmentShaderSource.clone();

        var targets = [];
        fs.sources = fs.sources.map(function(source) {
            source = ShaderSource.replaceMain(source, 'czm_Debug_main');
            var re = /gl_FragData\[(\d+)\]/g;
            var match;
            while ((match = re.exec(source)) !== null) {
                if (targets.indexOf(match[1]) === -1) {
                    targets.push(match[1]);
                }
            }
            return source;
        });
        var length = targets.length;

        var newMain =
            'void main() \n' +
            '{ \n' +
            '    czm_Debug_main(); \n';

        var i;
        if (scene.debugShowCommands) {
            if (!defined(command._debugColor)) {
                command._debugColor = Color.fromRandom();
            }
            var c = command._debugColor;
            if (length > 0) {
                for (i = 0; i < length; ++i) {
                    newMain += '    gl_FragData[' + targets[i] + '].rgb *= vec3(' + c.red + ', ' + c.green + ', ' + c.blue + '); \n';
                }
            } else {
                newMain += '    ' + 'gl_FragColor' + '.rgb *= vec3(' + c.red + ', ' + c.green + ', ' + c.blue + '); \n';
            }
        }

        if (scene.debugShowFrustums) {
            // Support up to three frustums.  If a command overlaps all
            // three, it's code is not changed.
            var r = (command.debugOverlappingFrustums & (1 << 0)) ? '1.0' : '0.0';
            var g = (command.debugOverlappingFrustums & (1 << 1)) ? '1.0' : '0.0';
            var b = (command.debugOverlappingFrustums & (1 << 2)) ? '1.0' : '0.0';
            if (length > 0) {
                for (i = 0; i < length; ++i) {
                    newMain += '    gl_FragData[' + targets[i] + '].rgb *= vec3(' + r + ', ' + g + ', ' + b + '); \n';
                }
            } else {
                newMain += '    ' + 'gl_FragColor' + '.rgb *= vec3(' + r + ', ' + g + ', ' + b + '); \n';
            }
        }

        newMain += '}';

        fs.sources.push(newMain);

        var attributeLocations = getAttributeLocations(sp);

        return ShaderProgram.fromCache({
            context : context,
            vertexShaderSource : sp.vertexShaderSource,
            fragmentShaderSource : fs,
            attributeLocations : attributeLocations
        });
    }

    function executeDebugCommand(command, scene, passState) {
        var debugCommand = DrawCommand.shallowClone(command);
        debugCommand.shaderProgram = createDebugFragmentShaderProgram(command, scene);
        debugCommand.execute(scene.context, passState);
        debugCommand.shaderProgram.destroy();
    }

    var transformFrom2D = new Matrix4(0.0, 0.0, 1.0, 0.0,
                                      1.0, 0.0, 0.0, 0.0,
                                      0.0, 1.0, 0.0, 0.0,
                                      0.0, 0.0, 0.0, 1.0);
    transformFrom2D = Matrix4.inverseTransformation(transformFrom2D, transformFrom2D);

    function executeCommand(command, scene, context, passState, debugFramebuffer) {
        if ((defined(scene.debugCommandFilter)) && !scene.debugCommandFilter(command)) {
            return;
        }

        var shadowsEnabled = scene.frameState.shadowHints.shadowsEnabled;
        var lightShadowsEnabled = shadowsEnabled && (scene.frameState.shadowHints.lightShadowMaps.length > 0);

        if (scene.debugShowCommands || scene.debugShowFrustums) {
            executeDebugCommand(command, scene, passState);
        } else if (lightShadowsEnabled && command.receiveShadows && defined(command.derivedCommands.shadows)) {
            // If the command receives shadows, execute the derived shadows command.
            // Some commands, such as OIT derived commands, do not have derived shadow commands themselves
            // and instead shadowing is built-in. In this case execute the command regularly below.
            command.derivedCommands.shadows.receiveCommand.execute(context, passState);
        } else if (scene.frameState.passes.depth && defined(command.derivedCommands.depth)) {
            command.derivedCommands.depth.depthOnlyCommand.execute(context, passState);
        } else {
            command.execute(context, passState);
        }

        if (command.debugShowBoundingVolume && (defined(command.boundingVolume))) {
            // Debug code to draw bounding volume for command.  Not optimized!
            // Assumes bounding volume is a bounding sphere or box
            var frameState = scene._frameState;
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

                geometry = GeometryPipeline.toWireframe(EllipsoidGeometry.createGeometry(new EllipsoidGeometry({
                    radii : new Cartesian3(radius, radius, radius),
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT
                })));

                scene._debugVolume = new Primitive({
                    geometryInstances : new GeometryInstance({
                        geometry : geometry,
                        modelMatrix : Matrix4.multiplyByTranslation(Matrix4.IDENTITY, center, new Matrix4()),
                        attributes : {
                            color : new ColorGeometryInstanceAttribute(1.0, 0.0, 0.0, 1.0)
                        }
                    }),
                    appearance : new PerInstanceColorAppearance({
                        flat : true,
                        translucent : false
                    }),
                    asynchronous : false
                });
            } else {
                var halfAxes = boundingVolume.halfAxes;

                geometry = GeometryPipeline.toWireframe(BoxGeometry.createGeometry(BoxGeometry.fromDimensions({
                    dimensions : new Cartesian3(2.0, 2.0, 2.0),
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT
                })));

                scene._debugVolume = new Primitive({
                    geometryInstances : new GeometryInstance({
                        geometry : geometry,
                        modelMatrix : Matrix4.fromRotationTranslation(halfAxes, center, new Matrix4()),
                        attributes : {
                            color : new ColorGeometryInstanceAttribute(1.0, 0.0, 0.0, 1.0)
                        }
                    }),
                    appearance : new PerInstanceColorAppearance({
                        flat : true,
                        translucent : false
                    }),
                    asynchronous : false
                });
            }

            var savedCommandList = frameState.commandList;
            var commandList = frameState.commandList = [];
            scene._debugVolume.update(frameState);

            var framebuffer;
            if (defined(debugFramebuffer)) {
                framebuffer = passState.framebuffer;
                passState.framebuffer = debugFramebuffer;
            }

            commandList[0].execute(context, passState);

            if (defined(framebuffer)) {
                passState.framebuffer = framebuffer;
            }

            frameState.commandList = savedCommandList;
        }
    }

    function translucentCompare(a, b, position) {
        return b.boundingVolume.distanceSquaredTo(position) - a.boundingVolume.distanceSquaredTo(position);
    }

    function executeTranslucentCommandsSorted(scene, executeFunction, passState, commands) {
        var context = scene.context;

        mergeSort(commands, translucentCompare, scene._camera.positionWC);

        var length = commands.length;
        for (var j = 0; j < length; ++j) {
            executeFunction(commands[j], scene, context, passState);
        }
    }

    function getDebugGlobeDepth(scene, index) {
        var globeDepth = scene._debugGlobeDepths[index];
        if (!defined(globeDepth) && scene.context.depthTexture) {
            globeDepth = new GlobeDepth();
            scene._debugGlobeDepths[index] = globeDepth;
        }
        return globeDepth;
    }

    function getPickDepth(scene, index) {
        var pickDepth = scene._pickDepths[index];
        if (!defined(pickDepth)) {
            pickDepth = new PickDepth();
            scene._pickDepths[index] = pickDepth;
        }
        return pickDepth;
    }

    var scratchPerspectiveFrustum = new PerspectiveFrustum();
    var scratchPerspectiveOffCenterFrustum = new PerspectiveOffCenterFrustum();
    var scratchOrthographicFrustum = new OrthographicFrustum();
    var scratchOrthographicOffCenterFrustum = new OrthographicOffCenterFrustum();

    function executeCommands(scene, passState) {
        var camera = scene._camera;
        var context = scene.context;
        var us = context.uniformState;

        us.updateCamera(camera);

        // Create a working frustum from the original camera frustum.
        var frustum;
        if (defined(camera.frustum.fov)) {
            frustum = camera.frustum.clone(scratchPerspectiveFrustum);
        } else if (defined(camera.frustum.infiniteProjectionMatrix)){
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

        var useWebVR = scene._useWebVR && scene.mode !== SceneMode.SCENE2D;
        var passes = scene._frameState.passes;
        var picking = passes.pick;
        var depthOnly = passes.depth;
        var environmentState = scene._environmentState;

        // Do not render environment primitives during a pick pass since they do not generate picking commands.
        if (!picking) {
            var skyBoxCommand = environmentState.skyBoxCommand;
            if (defined(skyBoxCommand)) {
                executeCommand(skyBoxCommand, scene, context, passState);
            }

            if (environmentState.isSkyAtmosphereVisible) {
                executeCommand(environmentState.skyAtmosphereCommand, scene, context, passState);
            }

            if (environmentState.isSunVisible) {
                environmentState.sunDrawCommand.execute(context, passState);
                if (scene.sunBloom && !useWebVR) {
                    var framebuffer;
                    if (environmentState.useGlobeDepthFramebuffer) {
                        framebuffer = scene._globeDepth.framebuffer;
                    } else if (environmentState.useFXAA) {
                        framebuffer = scene._fxaa.getColorFramebuffer();
                    } else {
                        framebuffer = environmentState.originalFramebuffer;
                    }
                    scene._sunPostProcess.execute(context, framebuffer);
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
                scene._executeOITFunction = function(scene, executeFunction, passState, commands) {
                    scene._oit.executeCommands(scene, executeFunction, passState, commands);
                };
            }
            executeTranslucentCommands = scene._executeOITFunction;
        } else {
            executeTranslucentCommands = executeTranslucentCommandsSorted;
        }

        var clearGlobeDepth = environmentState.clearGlobeDepth;
        var useDepthPlane = environmentState.useDepthPlane;
        var clearDepth = scene._depthClearCommand;
        var depthPlane = scene._depthPlane;

        var height2D = camera.position.z;

        // Execute commands in each frustum in back to front order
        var j;
        var frustumCommandsList = scene._frustumCommandsList;
        var numFrustums = frustumCommandsList.length;

        for (var i = 0; i < numFrustums; ++i) {
            var index = numFrustums - i - 1;
            var frustumCommands = frustumCommandsList[index];

            if (scene.mode === SceneMode.SCENE2D) {
                // To avoid z-fighting in 2D, move the camera to just before the frustum
                // and scale the frustum depth to be in [1.0, nearToFarDistance2D].
                camera.position.z = height2D - frustumCommands.near + 1.0;
                frustum.far = Math.max(1.0, frustumCommands.far - frustumCommands.near);
                frustum.near = 1.0;
                us.update(scene.frameState);
                us.updateFrustum(frustum);
            } else {
                // Avoid tearing artifacts between adjacent frustums in the opaque passes
                frustum.near = index !== 0 ? frustumCommands.near * OPAQUE_FRUSTUM_NEAR_OFFSET : frustumCommands.near;
                frustum.far = frustumCommands.far;
                us.updateFrustum(frustum);
            }

            var globeDepth = scene.debugShowGlobeDepth ? getDebugGlobeDepth(scene, index) : scene._globeDepth;

            var fb;
            if (scene.debugShowGlobeDepth && defined(globeDepth) && environmentState.useGlobeDepthFramebuffer) {
                fb = passState.framebuffer;
                passState.framebuffer = globeDepth.framebuffer;
            }

            clearDepth.execute(context, passState);

            us.updatePass(Pass.GLOBE);
            var commands = frustumCommands.commands[Pass.GLOBE];
            var length = frustumCommands.indices[Pass.GLOBE];
            for (j = 0; j < length; ++j) {
                executeCommand(commands[j], scene, context, passState);
            }

            if (defined(globeDepth) && environmentState.useGlobeDepthFramebuffer && (scene.copyGlobeDepth || scene.debugShowGlobeDepth)) {
                globeDepth.update(context, passState);
                globeDepth.executeCopyDepth(context, passState);
            }

            if (scene.debugShowGlobeDepth && defined(globeDepth) && environmentState.useGlobeDepthFramebuffer) {
                passState.framebuffer = fb;
            }

            us.updatePass(Pass.GROUND);
            commands = frustumCommands.commands[Pass.GROUND];
            length = frustumCommands.indices[Pass.GROUND];
            for (j = 0; j < length; ++j) {
                executeCommand(commands[j], scene, context, passState);
            }

            // Clear the stencil after the ground pass
            if (length > 0 && context.stencilBuffer) {
                scene._stencilClearCommand.execute(context, passState);
            }

            if (clearGlobeDepth) {
                clearDepth.execute(context, passState);
                if (useDepthPlane) {
                    depthPlane.execute(context, passState);
                }
            }

            // Execute commands in order by pass up to the translucent pass.
            // Translucent geometry needs special handling (sorting/OIT).
            var startPass = Pass.GROUND + 1;
            var endPass = Pass.TRANSLUCENT;
            for (var pass = startPass; pass < endPass; ++pass) {
                us.updatePass(pass);
                commands = frustumCommands.commands[pass];
                length = frustumCommands.indices[pass];
                for (j = 0; j < length; ++j) {
                    executeCommand(commands[j], scene, context, passState);
                }
            }

            if (index !== 0 && scene.mode !== SceneMode.SCENE2D) {
                // Do not overlap frustums in the translucent pass to avoid blending artifacts
                frustum.near = frustumCommands.near;
                us.updateFrustum(frustum);
            }

            us.updatePass(Pass.TRANSLUCENT);
            commands = frustumCommands.commands[Pass.TRANSLUCENT];
            commands.length = frustumCommands.indices[Pass.TRANSLUCENT];
            executeTranslucentCommands(scene, executeCommand, passState, commands);

            if (defined(globeDepth) && (environmentState.useGlobeDepthFramebuffer || depthOnly) && scene.useDepthPicking) {
                // PERFORMANCE_IDEA: Use MRT to avoid the extra copy.
                var depthStencilTexture = depthOnly ? passState.framebuffer.depthStencilTexture : globeDepth.framebuffer.depthStencilTexture;
                var pickDepth = getPickDepth(scene, index);
                pickDepth.update(context, depthStencilTexture);
                pickDepth.executeCopyDepth(context, passState);
            }
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
            updateDerivedCommands(scene, command);

            if (command.castShadows && (command.pass === Pass.GLOBE || command.pass === Pass.OPAQUE || command.pass === Pass.TRANSLUCENT)) {
                if (isVisible(command, shadowVolume)) {
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
                            if (isVisible(command, cascadeVolume)) {
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
        var shadowMaps = frameState.shadowHints.shadowMaps;
        var shadowMapLength = shadowMaps.length;

        if (!frameState.shadowHints.shadowsEnabled) {
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
                    executeCommand(command.derivedCommands.shadows.castCommands[i], scene, context, pass.passState);
                }
            }
        }
    }

    function updateAndExecuteCommands(scene, passState, backgroundColor) {
        var context = scene._context;

        var viewport = passState.viewport;
        viewport.x = 0;
        viewport.y = 0;
        viewport.width = context.drawingBufferWidth;
        viewport.height = context.drawingBufferHeight;

        var frameState = scene._frameState;
        var camera = frameState.camera;
        var mode = frameState.mode;
        var depthOnly = frameState.passes.depth;

        if (scene._useWebVR && mode !== SceneMode.SCENE2D) {
            updateAndClearFramebuffers(scene, passState, backgroundColor);

            if (!depthOnly) {
                updatePrimitives(scene);
            }

            createPotentiallyVisibleSet(scene);

            if (!depthOnly) {
                executeComputeCommands(scene);
                executeShadowMapCastCommands(scene);
            }

            // Based on Calculating Stereo pairs by Paul Bourke
            // http://paulbourke.net/stereographics/stereorender/

            viewport.x = 0;
            viewport.y = 0;
            viewport.width = context.drawingBufferWidth * 0.5;
            viewport.height = context.drawingBufferHeight;

            var savedCamera = Camera.clone(camera, scene._cameraVR);

            var near = camera.frustum.near;
            var fo = near * 5.0;
            var eyeSeparation = fo / 30.0;
            var eyeTranslation = Cartesian3.multiplyByScalar(savedCamera.right, eyeSeparation * 0.5, scratchEyeTranslation);

            camera.frustum.aspectRatio = viewport.width / viewport.height;

            var offset = 0.5 * eyeSeparation * near / fo;

            Cartesian3.add(savedCamera.position, eyeTranslation, camera.position);
            camera.frustum.xOffset = offset;

            executeCommands(scene, passState);

            viewport.x = passState.viewport.width;

            Cartesian3.subtract(savedCamera.position, eyeTranslation, camera.position);
            camera.frustum.xOffset = -offset;

            executeCommands(scene, passState);

            Camera.clone(savedCamera, camera);
        } else {
            updateAndClearFramebuffers(scene, passState, backgroundColor);
            if (mode !== SceneMode.SCENE2D || scene._mapMode2D === MapMode2D.ROTATE) {
                executeCommandsInViewport(true, scene, passState);
            } else {
                execute2DViewportCommands(scene, passState);
            }
        }
    }

    var scratch2DViewportCartographic = new Cartographic(Math.PI, CesiumMath.PI_OVER_TWO);
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

        var position = Cartesian3.clone(camera.position, scratch2DViewportSavedPosition);
        var transform = Matrix4.clone(camera.transform, scratch2DViewportCameraTransform);
        var frustum = camera.frustum.clone();

        camera._setTransform(Matrix4.IDENTITY);

        var viewportTransformation = Matrix4.computeViewportTransformation(viewport, 0.0, 1.0, scratch2DViewportTransform);
        var projectionMatrix = camera.frustum.projectionMatrix;

        var x = camera.positionWC.y;
        var eyePoint = Cartesian3.fromElements(CesiumMath.sign(x) * maxCoord.x - x, 0.0, -camera.positionWC.x, scratch2DViewportEyePoint);
        var windowCoordinates = Transforms.pointToGLWindowCoordinates(projectionMatrix, viewportTransformation, eyePoint, scratch2DViewportWindowCoords);

        windowCoordinates.x = Math.floor(windowCoordinates.x);

        var viewportX = viewport.x;
        var viewportWidth = viewport.width;

        if (x === 0.0 || windowCoordinates.x <= viewportX  || windowCoordinates.x >= viewportX + viewportWidth) {
            executeCommandsInViewport(true, scene, passState);
        } else if (Math.abs(viewportX + viewportWidth * 0.5 - windowCoordinates.x) < 1.0) {
            viewport.width = windowCoordinates.x - viewport.x;

            camera.position.x *= CesiumMath.sign(camera.position.x);

            camera.frustum.right = 0.0;

            frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.positionWC, camera.directionWC, camera.upWC);
            context.uniformState.update(frameState);

            executeCommandsInViewport(true, scene, passState);

            viewport.x = windowCoordinates.x;

            camera.position.x = -camera.position.x;

            camera.frustum.right = -camera.frustum.left;
            camera.frustum.left = 0.0;

            frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.positionWC, camera.directionWC, camera.upWC);
            context.uniformState.update(frameState);

            executeCommandsInViewport(false, scene, passState);
        } else if (windowCoordinates.x > viewportX + viewportWidth * 0.5) {
            viewport.width = windowCoordinates.x - viewportX;

            var right = camera.frustum.right;
            camera.frustum.right = maxCoord.x - x;

            frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.positionWC, camera.directionWC, camera.upWC);
            context.uniformState.update(frameState);

            executeCommandsInViewport(true, scene, passState);

            viewport.x = windowCoordinates.x;
            viewport.width = viewportX + viewportWidth - windowCoordinates.x;

            camera.position.x = -camera.position.x;

            camera.frustum.left = -camera.frustum.right;
            camera.frustum.right = right - camera.frustum.right * 2.0;

            frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.positionWC, camera.directionWC, camera.upWC);
            context.uniformState.update(frameState);

            executeCommandsInViewport(false, scene, passState);
        } else {
            viewport.x = windowCoordinates.x;
            viewport.width = viewportX + viewportWidth - windowCoordinates.x;

            var left = camera.frustum.left;
            camera.frustum.left = -maxCoord.x - x;

            frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.positionWC, camera.directionWC, camera.upWC);
            context.uniformState.update(frameState);

            executeCommandsInViewport(true, scene, passState);

            viewport.x = viewportX;
            viewport.width = windowCoordinates.x - viewportX;

            camera.position.x = -camera.position.x;

            camera.frustum.right = -camera.frustum.left;
            camera.frustum.left = left - camera.frustum.left * 2.0;

            frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.positionWC, camera.directionWC, camera.upWC);
            context.uniformState.update(frameState);

            executeCommandsInViewport(false, scene, passState);
        }

        camera._setTransform(transform);
        Cartesian3.clone(position, camera.position);
        camera.frustum = frustum.clone();
        passState.viewport = originalViewport;
    }

    function executeCommandsInViewport(firstViewport, scene, passState) {
        var depthOnly = scene.frameState.passes.depth;

        if (!firstViewport && !depthOnly) {
            scene.frameState.commandList.length = 0;
        }

        if (!depthOnly) {
            updatePrimitives(scene);
        }

        createPotentiallyVisibleSet(scene);

        if (firstViewport && !depthOnly) {
            executeComputeCommands(scene);
            executeShadowMapCastCommands(scene);
        }

        executeCommands(scene, passState);
    }

    function updateEnvironment(scene, passState) {
        var frameState = scene._frameState;

        // Update celestial and terrestrial environment effects.
        var environmentState = scene._environmentState;
        var renderPass = frameState.passes.render;
        var skyAtmosphere = scene.skyAtmosphere;
        var globe = scene.globe;

        if (!renderPass || (scene._mode !== SceneMode.SCENE2D && frameState.camera.frustum instanceof OrthographicFrustum)) {
            environmentState.skyAtmosphereCommand = undefined;
            environmentState.skyBoxCommand = undefined;
            environmentState.sunDrawCommand = undefined;
            environmentState.sunComputeCommand = undefined;
            environmentState.moonCommand = undefined;
        } else {
            if (defined(skyAtmosphere) && defined(globe)) {
                skyAtmosphere.setDynamicAtmosphereColor(globe.enableLighting);
                environmentState.isReadyForAtmosphere = environmentState.isReadyForAtmosphere || globe._surface._tilesToRender.length > 0;
            }
            environmentState.skyAtmosphereCommand = defined(skyAtmosphere) ? skyAtmosphere.update(frameState) : undefined;
            environmentState.skyBoxCommand = defined(scene.skyBox) ? scene.skyBox.update(frameState) : undefined;
            var sunCommands = defined(scene.sun) ? scene.sun.update(frameState, passState) : undefined;
            environmentState.sunDrawCommand = defined(sunCommands) ? sunCommands.drawCommand : undefined;
            environmentState.sunComputeCommand = defined(sunCommands) ? sunCommands.computeCommand : undefined;
            environmentState.moonCommand = defined(scene.moon) ? scene.moon.update(frameState) : undefined;
        }

        var clearGlobeDepth = environmentState.clearGlobeDepth = defined(globe) && (!globe.depthTestAgainstTerrain || scene.mode === SceneMode.SCENE2D);
        var useDepthPlane = environmentState.useDepthPlane = clearGlobeDepth && scene.mode === SceneMode.SCENE3D;
        if (useDepthPlane) {
            // Update the depth plane that is rendered in 3D when the primitives are
            // not depth tested against terrain so primitives on the backface
            // of the globe are not picked.
            scene._depthPlane.update(frameState);
        }

        var occluder = (frameState.mode === SceneMode.SCENE3D) ? frameState.occluder: undefined;
        var cullingVolume = frameState.cullingVolume;

        // get user culling volume minus the far plane.
        var planes = scratchCullingVolume.planes;
        for (var k = 0; k < 5; ++k) {
            planes[k] = cullingVolume.planes[k];
        }
        cullingVolume = scratchCullingVolume;

        // Determine visibility of celestial and terrestrial environment effects.
        environmentState.isSkyAtmosphereVisible = defined(environmentState.skyAtmosphereCommand) && environmentState.isReadyForAtmosphere;
        environmentState.isSunVisible = isVisible(environmentState.sunDrawCommand, cullingVolume, occluder);
        environmentState.isMoonVisible = isVisible(environmentState.moonCommand, cullingVolume, occluder);
    }

    function updateDebugFrustumPlanes(scene) {
        var frameState = scene._frameState;
        if (scene.debugShowFrustumPlanes !== scene._debugShowFrustumPlanes) {
            if (scene.debugShowFrustumPlanes) {
                scene._debugFrustumPlanes = new DebugCameraPrimitive({
                    camera: scene.camera,
                    updateOnChange: false
                });
            } else {
                scene._debugFrustumPlanes = scene._debugFrustumPlanes && scene._debugFrustumPlanes.destroy();
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

        var shadowsEnabled = (length > 0) && !frameState.passes.pick && (scene.mode === SceneMode.SCENE3D);
        if (shadowsEnabled !== frameState.shadowHints.shadowsEnabled) {
            // Update derived commands when shadowsEnabled changes
            ++frameState.shadowHints.lastDirtyTime;
            frameState.shadowHints.shadowsEnabled = shadowsEnabled;
        }

        if (!shadowsEnabled) {
            return;
        }

        // Check if the shadow maps are different than the shadow maps last frame.
        // If so, the derived commands need to be updated.
        for (var j = 0; j < length; ++j) {
            if (shadowMaps[j] !== frameState.shadowHints.shadowMaps[j]) {
                ++frameState.shadowHints.lastDirtyTime;
                break;
            }
        }

        frameState.shadowHints.shadowMaps.length = 0;
        frameState.shadowHints.lightShadowMaps.length = 0;

        for (var i = 0; i < length; ++i) {
            var shadowMap = shadowMaps[i];
            shadowMap.update(frameState);

            frameState.shadowHints.shadowMaps.push(shadowMap);

            if (shadowMap.fromLightSource) {
                frameState.shadowHints.lightShadowMaps.push(shadowMap);
            }

            if (shadowMap.dirty) {
                ++frameState.shadowHints.lastDirtyTime;
                shadowMap.dirty = false;
            }
        }
    }

    function updatePrimitives(scene) {
        var frameState = scene._frameState;

        scene._groundPrimitives.update(frameState);
        scene._primitives.update(frameState);

        updateDebugFrustumPlanes(scene);
        updateShadowMaps(scene);

        if (scene._globe) {
            scene._globe.update(frameState);
        }
    }

    function updateAndClearFramebuffers(scene, passState, clearColor) {
        var context = scene._context;
        var environmentState = scene._environmentState;

        var passes = scene._frameState.passes;
        var picking = passes.pick;
        var useWebVR = scene._useWebVR && scene.mode !== SceneMode.SCENE2D;

        // Preserve the reference to the original framebuffer.
        environmentState.originalFramebuffer = passState.framebuffer;

        // Manage sun bloom post-processing effect.
        if (defined(scene.sun) && scene.sunBloom !== scene._sunBloom) {
            if (scene.sunBloom && !useWebVR) {
                scene._sunPostProcess = new SunPostProcess();
            } else if(defined(scene._sunPostProcess)){
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
        var useGlobeDepthFramebuffer = environmentState.useGlobeDepthFramebuffer = !picking && defined(scene._globeDepth);
        if (useGlobeDepthFramebuffer) {
            scene._globeDepth.update(context, passState);
            scene._globeDepth.clear(context, passState, clearColor);
        }

        // Determine if there are any translucent surfaces in any of the frustums.
        var renderTranslucentCommands = false;
        var frustumCommandsList = scene._frustumCommandsList;
        var numFrustums = frustumCommandsList.length;
        for (var i = 0; i < numFrustums; ++i) {
            if (frustumCommandsList[i].indices[Pass.TRANSLUCENT] > 0) {
                renderTranslucentCommands = true;
                break;
            }
        }

        // If supported, configure OIT to use the globe depth framebuffer and clear the OIT framebuffer.
        var useOIT = environmentState.useOIT = !picking && renderTranslucentCommands && defined(scene._oit) && scene._oit.isSupported();
        if (useOIT) {
            scene._oit.update(context, passState, scene._globeDepth.framebuffer);
            scene._oit.clear(context, passState, clearColor);
            environmentState.useOIT = scene._oit.isSupported();
        }

        // If supported, configure FXAA to use the globe depth color texture and clear the FXAA framebuffer.
        var useFXAA = environmentState.useFXAA = !picking && scene.fxaa;
        if (useFXAA) {
            scene._fxaa.update(context, passState);
            scene._fxaa.clear(context, passState, clearColor);
        }

        if (environmentState.isSunVisible && scene.sunBloom && !useWebVR) {
            passState.framebuffer = scene._sunPostProcess.update(passState);
        } else if (useGlobeDepthFramebuffer) {
            passState.framebuffer = scene._globeDepth.framebuffer;
        } else if (useFXAA) {
            passState.framebuffer = scene._fxaa.getColorFramebuffer();
        }

        if (defined(passState.framebuffer)) {
            clear.execute(context, passState);
        }
    }

    function resolveFramebuffers(scene, passState) {
        var context = scene._context;
        var environmentState = scene._environmentState;

        var useGlobeDepthFramebuffer = environmentState.useGlobeDepthFramebuffer;
        if (scene.debugShowGlobeDepth && useGlobeDepthFramebuffer) {
            var gd = getDebugGlobeDepth(scene, scene.debugShowDepthFrustum - 1);
            gd.executeDebugGlobeDepth(context, passState);
        }

        if (scene.debugShowPickDepth && useGlobeDepthFramebuffer) {
            var pd = getPickDepth(scene, scene.debugShowDepthFrustum - 1);
            pd.executeDebugPickDepth(context, passState);
        }

        var useOIT = environmentState.useOIT;
        var useFXAA = environmentState.useFXAA;

        if (useOIT) {
            passState.framebuffer = useFXAA ? scene._fxaa.getColorFramebuffer() : undefined;
            scene._oit.execute(context, passState);
        }

        if (useFXAA) {
            if (!useOIT && useGlobeDepthFramebuffer) {
                passState.framebuffer = scene._fxaa.getColorFramebuffer();
                scene._globeDepth.executeCopyColor(context, passState);
            }

            passState.framebuffer = environmentState.originalFramebuffer;
            scene._fxaa.execute(context, passState);
        }

        if (!useOIT && !useFXAA && useGlobeDepthFramebuffer) {
            passState.framebuffer = environmentState.originalFramebuffer;
            scene._globeDepth.executeCopyColor(context, passState);
        }
    }

    function callAfterRenderFunctions(frameState) {
        // Functions are queued up during primitive update and executed here in case
        // the function modifies scene state that should remain constant over the frame.
        var functions = frameState.afterRender;
        for (var i = 0, length = functions.length; i < length; ++i) {
            functions[i]();
        }
        functions.length = 0;
    }

    /**
     * @private
     */
    Scene.prototype.initializeFrame = function() {
        // Destroy released shaders once every 120 frames to avoid thrashing the cache
        if (this._shaderFrameCount++ === 120) {
            this._shaderFrameCount = 0;
            this._context.shaderCache.destroyReleasedShaderPrograms();
        }

        this._tweens.update();

        this._screenSpaceCameraController.update();
        if (defined(this._deviceOrientationCameraController)) {
            this._deviceOrientationCameraController.update();
        }

        this._camera.update(this._mode);
        this._camera._updateCameraChanged();
    };

    var scratchEyeTranslation = new Cartesian3();

    function render(scene, time) {
        scene._pickPositionCacheDirty = true;

        if (!defined(time)) {
            time = JulianDate.now();
        }

        var camera = scene._camera;
        if (!cameraEqual(camera, scene._cameraClone, CesiumMath.EPSILON6)) {
            if (!scene._cameraStartFired) {
                camera.moveStart.raiseEvent();
                scene._cameraStartFired = true;
            }
            scene._cameraMovedTime = getTimestamp();
            Camera.clone(camera, scene._cameraClone);
        } else if (scene._cameraStartFired && getTimestamp() - scene._cameraMovedTime > scene.cameraEventWaitTime) {
            camera.moveEnd.raiseEvent();
            scene._cameraStartFired = false;
        }

        scene._preRender.raiseEvent(scene, time);

        var context = scene.context;
        var us = context.uniformState;
        var frameState = scene._frameState;

        var frameNumber = CesiumMath.incrementWrap(frameState.frameNumber, 15000000.0, 1.0);
        updateFrameState(scene, frameNumber, time);
        frameState.passes.render = true;

        var backgroundColor = defaultValue(scene.backgroundColor, Color.BLACK);
        frameState.backgroundColor = backgroundColor;

        frameState.creditDisplay.beginFrame();

        scene.fog.update(frameState);

        us.update(frameState);

        var shadowMap = scene.shadowMap;
        if (defined(shadowMap) && shadowMap.enabled) {
            // Update the sun's direction
            Cartesian3.negate(us.sunDirectionWC, scene._sunCamera.direction);
            frameState.shadowMaps.push(shadowMap);
        }

        scene._computeCommandList.length = 0;
        scene._overlayCommandList.length = 0;

        var passState = scene._passState;
        passState.framebuffer = undefined;
        passState.blendingEnabled = undefined;
        passState.scissorTest = undefined;

        if (defined(scene.globe)) {
            scene.globe.beginFrame(frameState);
        }

        updateEnvironment(scene, passState);
        updateAndExecuteCommands(scene, passState, backgroundColor);
        resolveFramebuffers(scene, passState);
        executeOverlayCommands(scene, passState);

        if (defined(scene.globe)) {
            scene.globe.endFrame(frameState);
        }

        frameState.creditDisplay.endFrame();

        if (scene.debugShowFramesPerSecond) {
            if (!defined(scene._performanceDisplay)) {
                var performanceContainer = document.createElement('div');
                performanceContainer.className = 'cesium-performanceDisplay-defaultContainer';
                var container = scene._canvas.parentNode;
                container.appendChild(performanceContainer);
                var performanceDisplay = new PerformanceDisplay({container: performanceContainer});
                scene._performanceDisplay = performanceDisplay;
                scene._performanceContainer = performanceContainer;
            }

            scene._performanceDisplay.update();
        } else if (defined(scene._performanceDisplay)) {
            scene._performanceDisplay = scene._performanceDisplay && scene._performanceDisplay.destroy();
            scene._performanceContainer.parentNode.removeChild(scene._performanceContainer);
        }

        context.endFrame();
        callAfterRenderFunctions(frameState);

        scene._postRender.raiseEvent(scene, time);
    }

    /**
     * @private
     */
    Scene.prototype.render = function(time) {
        try {
            render(this, time);
        } catch (error) {
            this._renderError.raiseEvent(this, error);

            if (this.rethrowRenderErrors) {
                throw error;
            }
        }
    };

    /**
     * @private
     */
    Scene.prototype.clampLineWidth = function(width) {
        return Math.max(ContextLimits.minimumAliasedLineWidth, Math.min(width, ContextLimits.maximumAliasedLineWidth));
    };

    var orthoPickingFrustum = new OrthographicOffCenterFrustum();
    var scratchOrigin = new Cartesian3();
    var scratchDirection = new Cartesian3();
    var scratchPixelSize = new Cartesian2();
    var scratchPickVolumeMatrix4 = new Matrix4();

    function getPickOrthographicCullingVolume(scene, drawingBufferPosition, width, height) {
        var camera = scene._camera;
        var frustum = camera.frustum;
        if (defined(frustum._offCenterFrustum)) {
            frustum = frustum._offCenterFrustum;
        }

        var viewport = scene._passState.viewport;
        var x = 2.0 * (drawingBufferPosition.x - viewport.x) / viewport.width - 1.0;
        x *= (frustum.right - frustum.left) * 0.5;
        var y = 2.0 * (viewport.height - drawingBufferPosition.y - viewport.y) / viewport.height - 1.0;
        y *= (frustum.top - frustum.bottom) * 0.5;

        var transform = Matrix4.clone(camera.transform, scratchPickVolumeMatrix4);
        camera._setTransform(Matrix4.IDENTITY);

        var origin = Cartesian3.clone(camera.position, scratchOrigin);
        Cartesian3.multiplyByScalar(camera.right, x, scratchDirection);
        Cartesian3.add(scratchDirection, origin, origin);
        Cartesian3.multiplyByScalar(camera.up, y, scratchDirection);
        Cartesian3.add(scratchDirection, origin, origin);

        camera._setTransform(transform);

        if (scene.mode === SceneMode.SCENE2D) {
            Cartesian3.fromElements(origin.z, origin.x, origin.y, origin);
        }

        var pixelSize = frustum.getPixelDimensions(viewport.width, viewport.height, 1.0, scratchPixelSize);

        var ortho = orthoPickingFrustum;
        ortho.right = pixelSize.x * 0.5;
        ortho.left = -ortho.right;
        ortho.top = pixelSize.y * 0.5;
        ortho.bottom = -ortho.top;
        ortho.near = frustum.near;
        ortho.far = frustum.far;

        return ortho.computeCullingVolume(origin, camera.directionWC, camera.upWC);
    }

    var perspPickingFrustum = new PerspectiveOffCenterFrustum();

    function getPickPerspectiveCullingVolume(scene, drawingBufferPosition, width, height) {
        var camera = scene._camera;
        var frustum = camera.frustum;
        var near = frustum.near;

        var tanPhi = Math.tan(frustum.fovy * 0.5);
        var tanTheta = frustum.aspectRatio * tanPhi;

        var viewport = scene._passState.viewport;
        var x = 2.0 * (drawingBufferPosition.x - viewport.x) / viewport.width - 1.0;
        var y = 2.0 * (viewport.height - drawingBufferPosition.y - viewport.y) / viewport.height - 1.0;

        var xDir = x * near * tanTheta;
        var yDir = y * near * tanPhi;

        var pixelSize = frustum.getPixelDimensions(viewport.width, viewport.height, 1.0, scratchPixelSize);
        var pickWidth = pixelSize.x * width * 0.5;
        var pickHeight = pixelSize.y * height * 0.5;

        var offCenter = perspPickingFrustum;
        offCenter.top = yDir + pickHeight;
        offCenter.bottom = yDir - pickHeight;
        offCenter.right = xDir + pickWidth;
        offCenter.left = xDir - pickWidth;
        offCenter.near = near;
        offCenter.far = frustum.far;

        return offCenter.computeCullingVolume(camera.positionWC, camera.directionWC, camera.upWC);
    }

    function getPickCullingVolume(scene, drawingBufferPosition, width, height) {
        var frustum = scene.camera.frustum;
        if (frustum instanceof OrthographicFrustum || frustum instanceof OrthographicOffCenterFrustum) {
            return getPickOrthographicCullingVolume(scene, drawingBufferPosition, width, height);
        }

        return getPickPerspectiveCullingVolume(scene, drawingBufferPosition, width, height);
    }

    // pick rectangle width and height, assumed odd
    var rectangleWidth = 3.0;
    var rectangleHeight = 3.0;
    var scratchRectangle = new BoundingRectangle(0.0, 0.0, rectangleWidth, rectangleHeight);
    var scratchColorZero = new Color(0.0, 0.0, 0.0, 0.0);
    var scratchPosition = new Cartesian2();

    /**
     * Returns an object with a `primitive` property that contains the first (top) primitive in the scene
     * at a particular window coordinate or undefined if nothing is at the location. Other properties may
     * potentially be set depending on the type of primitive.
     *
     * @param {Cartesian2} windowPosition Window coordinates to perform picking on.
     * @returns {Object} Object containing the picked primitive.
     *
     * @exception {DeveloperError} windowPosition is undefined.
     */
    Scene.prototype.pick = function(windowPosition) {
        //>>includeStart('debug', pragmas.debug);
        if(!defined(windowPosition)) {
            throw new DeveloperError('windowPosition is undefined.');
        }
        //>>includeEnd('debug');

        var context = this._context;
        var us = context.uniformState;
        var frameState = this._frameState;

        var drawingBufferPosition = SceneTransforms.transformWindowToDrawingBuffer(this, windowPosition, scratchPosition);

        if (!defined(this._pickFramebuffer)) {
            this._pickFramebuffer = context.createPickFramebuffer();
        }

        // Update with previous frame's number and time, assuming that render is called before picking.
        updateFrameState(this, frameState.frameNumber, frameState.time);
        frameState.cullingVolume = getPickCullingVolume(this, drawingBufferPosition, rectangleWidth, rectangleHeight);
        frameState.passes.pick = true;

        us.update(frameState);

        scratchRectangle.x = drawingBufferPosition.x - ((rectangleWidth - 1.0) * 0.5);
        scratchRectangle.y = (this.drawingBufferHeight - drawingBufferPosition.y) - ((rectangleHeight - 1.0) * 0.5);

        var passState = this._pickFramebuffer.begin(scratchRectangle);

        updateAndExecuteCommands(this, passState, scratchColorZero);
        resolveFramebuffers(this, passState);

        var object = this._pickFramebuffer.end(scratchRectangle);
        context.endFrame();
        callAfterRenderFunctions(frameState);
        return object;
    };

    var fragDepthRegex = /\bgl_FragDepthEXT\b/;
    var discardRegex = /\bdiscard\b/;

    function getDepthOnlyShaderProgram(context, shaderProgram) {
        var shader = context.shaderCache.getDerivedShaderProgram(shaderProgram, 'depthOnly');
        if (!defined(shader)) {
            var attributeLocations = shaderProgram._attributeLocations;
            var fs = shaderProgram.fragmentShaderSource;

            var writesDepthOrDiscards = false;
            var sources = fs.sources;
            var length = sources.length;
            for (var i = 0; i < length; ++i) {
                if (fragDepthRegex.test(sources[i]) || discardRegex.test(sources[i])) {
                    writesDepthOrDiscards = true;
                    break;
                }
            }

            if (!writesDepthOrDiscards) {
                fs = new ShaderSource({
                    sources : ['void main() { gl_FragColor = vec4(1.0); }']
                });
            }

            shader = context.shaderCache.createDerivedShaderProgram(shaderProgram, 'depthOnly', {
                vertexShaderSource : shaderProgram.vertexShaderSource,
                fragmentShaderSource : fs,
                attributeLocations : attributeLocations
            });
        }

        return shader;
    }

    function getDepthOnlyRenderState(scene, renderState) {
        var cache = scene._depthOnlyRenderStateCache;
        var depthOnlyState = cache[renderState.id];
        if (!defined(depthOnlyState)) {
            var rs = RenderState.getState(renderState);
            rs.depthMask = true;
            rs.colorMask = {
                red : false,
                green : false,
                blue : false,
                alpha : false
            };

            depthOnlyState = RenderState.fromCache(rs);
            cache[renderState.id] = depthOnlyState;
        }

        return depthOnlyState;
    }

    function createDepthOnlyDerivedCommand(scene, command, context, result) {
        // For a depth only pass, we bind a framebuffer with only a depth attachment (no color attachments),
        // do not write color, and write depth. If the fragment shader doesn't modify the fragment depth
        // or discard, the driver can replace the fragment shader with a pass-through shader. We're unsure if this
        // actually happens so we modify the shader to use a pass-through fragment shader.

        if (!defined(result)) {
            result = {};
        }

        var shader;
        var renderState;
        if (defined(result.depthOnlyCommand)) {
            shader = result.depthOnlyCommand.shaderProgram;
            renderState = result.depthOnlyCommand.renderState;
        }

        result.depthOnlyCommand = DrawCommand.shallowClone(command, result.depthOnlyCommand);

        if (!defined(shader) || result.shaderProgramId !== command.shaderProgram.id) {
            result.depthOnlyCommand.shaderProgram = getDepthOnlyShaderProgram(context, command.shaderProgram);
            result.depthOnlyCommand.renderState = getDepthOnlyRenderState(scene, command.renderState);
            result.shaderProgramId = command.shaderProgram.id;
        } else {
            result.depthOnlyCommand.shaderProgram = shader;
            result.depthOnlyCommand.renderState = renderState;
        }

        return result;
    }

    function renderTranslucentDepthForPick(scene, drawingBufferPosition) {
        // PERFORMANCE_IDEA: render translucent only and merge with the previous frame
        var context = scene._context;
        var frameState = scene._frameState;

        clearPasses(frameState.passes);
        frameState.passes.pick = true;
        frameState.passes.depth = true;
        frameState.cullingVolume = getPickCullingVolume(scene, drawingBufferPosition, 1, 1);

        var passState = scene._pickDepthPassState;
        if (!defined(passState)) {
            passState = scene._pickDepthPassState = new PassState(context);
            passState.scissorTest = {
                enabled : true,
                rectangle : new BoundingRectangle()
            };
            passState.viewport = new BoundingRectangle();
        }

        var width = context.drawingBufferWidth;
        var height = context.drawingBufferHeight;

        var framebuffer = scene._pickDepthFramebuffer;
        var pickDepthFBWidth = scene._pickDepthFramebufferWidth;
        var pickDepthFBHeight = scene._pickDepthFramebufferHeight;
        if (!defined(framebuffer) || pickDepthFBWidth !== width || pickDepthFBHeight !== height) {
            scene._pickDepthFramebuffer = scene._pickDepthFramebuffer && scene._pickDepthFramebuffer.destroy();
            framebuffer = scene._pickDepthFramebuffer = new Framebuffer({
                context : context,
                depthStencilTexture : new Texture({
                    context : context,
                    width : width,
                    height : height,
                    pixelFormat : PixelFormat.DEPTH_STENCIL,
                    pixelDatatype : PixelDatatype.UNSIGNED_INT_24_8
                })
            });

            scene._pickDepthFramebufferWidth = width;
            scene._pickDepthFramebufferHeight = height;
        }

        passState.framebuffer = framebuffer;
        passState.viewport.width = width;
        passState.viewport.height = height;
        passState.scissorTest.rectangle.x = drawingBufferPosition.x;
        passState.scissorTest.rectangle.y = height - drawingBufferPosition.y;
        passState.scissorTest.rectangle.width = 1;
        passState.scissorTest.rectangle.height = 1;

        updateAndExecuteCommands(scene, passState, scratchColorZero);
        resolveFramebuffers(scene, passState);

        context.endFrame();
    }

    var scratchPackedDepth = new Cartesian4();
    var packedDepthScale = new Cartesian4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0);

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
    Scene.prototype.pickPositionWorldCoordinates = function(windowPosition, result) {
        if (!this.useDepthPicking) {
            return undefined;
        }

        //>>includeStart('debug', pragmas.debug);
        if(!defined(windowPosition)) {
            throw new DeveloperError('windowPosition is undefined.');
        }
        if (!defined(this._globeDepth)) {
            throw new DeveloperError('Picking from the depth buffer is not supported. Check pickPositionSupported.');
        }
        //>>includeEnd('debug');

        var cacheKey = windowPosition.toString();

        if (this._pickPositionCacheDirty){
            this._pickPositionCache = {};
            this._pickPositionCacheDirty = false;
        } else if (this._pickPositionCache.hasOwnProperty(cacheKey)){
            return Cartesian3.clone(this._pickPositionCache[cacheKey], result);
        }

        var context = this._context;
        var uniformState = context.uniformState;

        var drawingBufferPosition = SceneTransforms.transformWindowToDrawingBuffer(this, windowPosition, scratchPosition);
        if (this.pickTranslucentDepth) {
            renderTranslucentDepthForPick(this, drawingBufferPosition);
        }
        drawingBufferPosition.y = this.drawingBufferHeight - drawingBufferPosition.y;

        var camera = this._camera;

        // Create a working frustum from the original camera frustum.
        var frustum;
        if (defined(camera.frustum.fov)) {
            frustum = camera.frustum.clone(scratchPerspectiveFrustum);
        } else if (defined(camera.frustum.infiniteProjectionMatrix)){
            frustum = camera.frustum.clone(scratchPerspectiveOffCenterFrustum);
        } else if (defined(camera.frustum.width)) {
            frustum = camera.frustum.clone(scratchOrthographicFrustum);
        } else {
            frustum = camera.frustum.clone(scratchOrthographicOffCenterFrustum);
        }

        var numFrustums = this.numberOfFrustums;
        for (var i = 0; i < numFrustums; ++i) {
            var pickDepth = getPickDepth(this, i);
            var pixels = context.readPixels({
                x : drawingBufferPosition.x,
                y : drawingBufferPosition.y,
                width : 1,
                height : 1,
                framebuffer : pickDepth.framebuffer
            });

            var packedDepth = Cartesian4.unpack(pixels, 0, scratchPackedDepth);
            Cartesian4.divideByScalar(packedDepth, 255.0, packedDepth);
            var depth = Cartesian4.dot(packedDepth, packedDepthScale);

            if (depth > 0.0 && depth < 1.0) {
                var renderedFrustum = this._frustumCommandsList[i];
                var height2D;
                if (this.mode === SceneMode.SCENE2D) {
                    height2D = camera.position.z;
                    camera.position.z = height2D - renderedFrustum.near + 1.0;
                    frustum.far = Math.max(1.0, renderedFrustum.far - renderedFrustum.near);
                    frustum.near = 1.0;
                    uniformState.update(this.frameState);
                    uniformState.updateFrustum(frustum);
                } else {
                    frustum.near = renderedFrustum.near * (i !== 0 ? OPAQUE_FRUSTUM_NEAR_OFFSET : 1.0);
                    frustum.far = renderedFrustum.far;
                    uniformState.updateFrustum(frustum);
                }

                result = SceneTransforms.drawingBufferToWgs84Coordinates(this, drawingBufferPosition, depth, result);

                if (this.mode === SceneMode.SCENE2D) {
                    camera.position.z = height2D;
                    uniformState.update(this.frameState);
                }

                this._pickPositionCache[cacheKey] = Cartesian3.clone(result);
                return result;
            }
        }

        this._pickPositionCache[cacheKey] = undefined;
        return undefined;
    };

    var scratchPickPositionCartographic = new Cartographic();

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
    Scene.prototype.pickPosition = function(windowPosition, result) {
        result = this.pickPositionWorldCoordinates(windowPosition, result);
        if (defined(result) && this.mode !== SceneMode.SCENE3D) {
            Cartesian3.fromElements(result.y, result.z, result.x, result);

            var projection = this.mapProjection;
            var ellipsoid = projection.ellipsoid;

            var cart = projection.unproject(result, scratchPickPositionCartographic);
            ellipsoid.cartographicToCartesian(cart, result);
        }

        return result;
    };

    /**
     * Returns a list of objects, each containing a `primitive` property, for all primitives at
     * a particular window coordinate position. Other properties may also be set depending on the
     * type of primitive. The primitives in the list are ordered by their visual order in the
     * scene (front to back).
     *
     * @param {Cartesian2} windowPosition Window coordinates to perform picking on.
     * @param {Number} [limit] If supplied, stop drilling after collecting this many picks.
     * @returns {Object[]} Array of objects, each containing 1 picked primitives.
     *
     * @exception {DeveloperError} windowPosition is undefined.
     *
     * @example
     * var pickedObjects = scene.drillPick(new Cesium.Cartesian2(100.0, 200.0));
     */
    Scene.prototype.drillPick = function(windowPosition, limit) {
        // PERFORMANCE_IDEA: This function calls each primitive's update for each pass. Instead
        // we could update the primitive once, and then just execute their commands for each pass,
        // and cull commands for picked primitives.  e.g., base on the command's owner.

        //>>includeStart('debug', pragmas.debug);
        if (!defined(windowPosition)) {
            throw new DeveloperError('windowPosition is undefined.');
        }
        //>>includeEnd('debug');

        var i;
        var attributes;
        var result = [];
        var pickedPrimitives = [];
        var pickedAttributes = [];
        if (!defined(limit)) {
            limit = Number.MAX_VALUE;
        }

        var pickedResult = this.pick(windowPosition);
        while (defined(pickedResult) && defined(pickedResult.primitive)) {
            result.push(pickedResult);
            if (0 >= --limit) {
                break;
            }

            var primitive = pickedResult.primitive;
            var hasShowAttribute = false;

            //If the picked object has a show attribute, use it.
            if (typeof primitive.getGeometryInstanceAttributes === 'function') {
                if (defined(pickedResult.id)) {
                    attributes = primitive.getGeometryInstanceAttributes(pickedResult.id);
                    if (defined(attributes) && defined(attributes.show)) {
                        hasShowAttribute = true;
                        attributes.show = ShowGeometryInstanceAttribute.toValue(false, attributes.show);
                        pickedAttributes.push(attributes);
                    }
                }
            }

            //Otherwise, hide the entire primitive
            if (!hasShowAttribute) {
                primitive.show = false;
                pickedPrimitives.push(primitive);
            }

            pickedResult = this.pick(windowPosition);
        }

        // unhide everything we hid while drill picking
        for (i = 0; i < pickedPrimitives.length; ++i) {
            pickedPrimitives[i].show = true;
        }

        for (i = 0; i < pickedAttributes.length; ++i) {
            attributes = pickedAttributes[i];
            attributes.show = ShowGeometryInstanceAttribute.toValue(true, attributes.show);
        }

        return result;
    };

    /**
     * Instantly completes an active transition.
     */
    Scene.prototype.completeMorph = function(){
        this._transitioner.completeMorph();
    };

    /**
     * Asynchronously transitions the scene to 2D.
     * @param {Number} [duration=2.0] The amount of time, in seconds, for transition animations to complete.
     */
    Scene.prototype.morphTo2D = function(duration) {
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
    Scene.prototype.morphToColumbusView = function(duration) {
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
    Scene.prototype.morphTo3D = function(duration) {
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
    Scene.prototype.isDestroyed = function() {
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
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     *
     * @example
     * scene = scene && scene.destroy();
     *
     * @see Scene#isDestroyed
     */
    Scene.prototype.destroy = function() {
        this._tweens.removeAll();
        this._computeEngine = this._computeEngine && this._computeEngine.destroy();
        this._screenSpaceCameraController = this._screenSpaceCameraController && this._screenSpaceCameraController.destroy();
        this._deviceOrientationCameraController = this._deviceOrientationCameraController && !this._deviceOrientationCameraController.isDestroyed() && this._deviceOrientationCameraController.destroy();
        this._pickFramebuffer = this._pickFramebuffer && this._pickFramebuffer.destroy();
        this._pickDepthFramebuffer = this._pickDepthFramebuffer && this._pickDepthFramebuffer.destroy();
        this._primitives = this._primitives && this._primitives.destroy();
        this._groundPrimitives = this._groundPrimitives && this._groundPrimitives.destroy();
        this._globe = this._globe && this._globe.destroy();
        this.skyBox = this.skyBox && this.skyBox.destroy();
        this.skyAtmosphere = this.skyAtmosphere && this.skyAtmosphere.destroy();
        this._debugSphere = this._debugSphere && this._debugSphere.destroy();
        this.sun = this.sun && this.sun.destroy();
        this._sunPostProcess = this._sunPostProcess && this._sunPostProcess.destroy();
        this._depthPlane = this._depthPlane && this._depthPlane.destroy();
        this._transitioner.destroy();
        this._debugFrustumPlanes = this._debugFrustumPlanes && this._debugFrustumPlanes.destroy();

        if (defined(this._globeDepth)) {
            this._globeDepth.destroy();
        }

        if (defined(this._oit)) {
            this._oit.destroy();
        }
        this._fxaa.destroy();

        this._context = this._context && this._context.destroy();
        this._frameState.creditDisplay.destroy();
        if (defined(this._performanceDisplay)){
            this._performanceDisplay = this._performanceDisplay && this._performanceDisplay.destroy();
            this._performanceContainer.parentNode.removeChild(this._performanceContainer);
        }

        return destroyObject(this);
    };

    return Scene;
});
