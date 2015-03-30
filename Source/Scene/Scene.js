/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/BoundingSphere',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
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
        '../Core/Intersect',
        '../Core/Interval',
        '../Core/JulianDate',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/mergeSort',
        '../Core/Occluder',
        '../Core/ShowGeometryInstanceAttribute',
        '../Renderer/ClearCommand',
        '../Renderer/Context',
        '../Renderer/PassState',
        './Camera',
        './CreditDisplay',
        './CullingVolume',
        './FrameState',
        './FrustumCommands',
        './FXAA',
        './OIT',
        './OrthographicFrustum',
        './Pass',
        './PerformanceDisplay',
        './PerInstanceColorAppearance',
        './PerspectiveFrustum',
        './PerspectiveOffCenterFrustum',
        './Primitive',
        './PrimitiveCollection',
        './SceneMode',
        './SceneTransforms',
        './SceneTransitioner',
        './ScreenSpaceCameraController',
        './SunPostProcess',
        './TweenCollection'
    ], function(
        BoundingRectangle,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
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
        Intersect,
        Interval,
        JulianDate,
        CesiumMath,
        Matrix4,
        mergeSort,
        Occluder,
        ShowGeometryInstanceAttribute,
        ClearCommand,
        Context,
        PassState,
        Camera,
        CreditDisplay,
        CullingVolume,
        FrameState,
        FrustumCommands,
        FXAA,
        OIT,
        OrthographicFrustum,
        Pass,
        PerformanceDisplay,
        PerInstanceColorAppearance,
        PerspectiveFrustum,
        PerspectiveOffCenterFrustum,
        Primitive,
        PrimitiveCollection,
        SceneMode,
        SceneTransforms,
        SceneTransitioner,
        ScreenSpaceCameraController,
        SunPostProcess,
        TweenCollection) {
    "use strict";

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
     *     preserveDrawingBuffer : false
     *     failIfMajorPerformanceCaveat : true
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
     * <code>webgl.failIfMajorPerformanceCaveat</code> defaults to true, which ensures a context is not successfully created
     * if the system has a major performance issue such as only supporting software rendering.  The standard WebGL default is false,
     * which is not appropriate for almost any Cesium app.
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
     * @param {Boolean} [options.scene3DOnly=false] If true, optimizes memory use and performance for 3D mode but disables the ability to use 2D or Columbus View.     *
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
    var Scene = function(options) {
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
            creditContainer.style['text-shadow'] = '0px 0px 2px #000000';
            creditContainer.style.color = '#ffffff';
            creditContainer.style['font-size'] = '10px';
            creditContainer.style['padding-right'] = '5px';
            canvas.parentNode.appendChild(creditContainer);
        }

        this._id = createGuid();
        this._frameState = new FrameState(new CreditDisplay(creditContainer));
        this._frameState.scene3DOnly = defaultValue(options.scene3DOnly, false);

        this._passState = new PassState(context);
        this._canvas = canvas;
        this._context = context;
        this._globe = undefined;
        this._primitives = new PrimitiveCollection();
        this._pickFramebuffer = undefined;

        this._tweens = new TweenCollection();

        this._shaderFrameCount = 0;

        this._sunPostProcess = undefined;

        this._commandList = [];
        this._frustumCommandsList = [];
        this._overlayCommandList = [];

        this._oit = defaultValue(options.orderIndependentTranslucency, true) ? new OIT(context) : undefined;
        this._executeOITFunction = undefined;

        this._fxaa = new FXAA();

        this._clearColorCommand = new ClearCommand({
            color : new Color(),
            owner : this
        });
        this._depthClearCommand = new ClearCommand({
            depth : 1.0,
            owner : this
        });

        this._transitioner = new SceneTransitioner(this);

        this._renderError = new Event();
        this._preRender = new Event();
        this._postRender = new Event();

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
         * If <code>true</code>, enables Fast Aproximate Anti-aliasing only if order independent translucency
         * is supported.
         *
         * @type Boolean
         * @default true
         */
        this.fxaaOrderIndependentTranslucency = true;

        /**
         * When <code>true</code>, enables Fast Approximate Anti-aliasing even when order independent translucency
         * is unsupported.
         *
         * @type Boolean
         * @default false
         */
        this.fxaa = false;

        this._performanceDisplay = undefined;
        this._debugSphere = undefined;

        var camera = new Camera(this);
        this._camera = camera;
        this._screenSpaceCameraController = new ScreenSpaceCameraController(this);

        // initial guess at frustums.
        var near = camera.frustum.near;
        var far = camera.frustum.far;
        var numFrustums = Math.ceil(Math.log(far / near) / Math.log(this.farToNearRatio));
        updateFrustums(near, far, this.farToNearRatio, numFrustums, this._frustumCommandsList);

        // give frameState, camera, and screen space camera controller initial state before rendering
        updateFrameState(this, 0.0, JulianDate.now());
        this.initializeFrame();
    };

    defineProperties(Scene.prototype, {
        /**
         * Gets the canvas element to which this scene is bound.
         * @memberof Scene.prototype
         *
         * @type {Element}
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
                return this._context.maximumAliasedLineWidth;
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
                return this._context.maximumCubeMapSize;
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
                if (this.scene3DOnly && value !== SceneMode.SCENE3D) {
                    throw new DeveloperError('Only SceneMode.SCENE3D is valid when scene3DOnly is true.');
                }
                this._mode = value;
            }
        }
    });

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
    }

    function updateFrameState(scene, frameNumber, time) {
        var camera = scene._camera;

        var frameState = scene._frameState;
        frameState.mode = scene._mode;
        frameState.morphTime = scene.morphTime;
        frameState.mapProjection = scene.mapProjection;
        frameState.frameNumber = frameNumber;
        frameState.time = JulianDate.clone(time, frameState.time);
        frameState.camera = camera;
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.positionWC, camera.directionWC, camera.upWC);
        frameState.occluder = getOccluder(scene);

        clearPasses(frameState.passes);
    }

    function updateFrustums(near, far, farToNearRatio, numFrustums, frustumCommandsList) {
        frustumCommandsList.length = numFrustums;
        for (var m = 0; m < numFrustums; ++m) {
            var curNear = Math.max(near, Math.pow(farToNearRatio, m) * near);
            var curFar = Math.min(far, farToNearRatio * curNear);

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

    function createPotentiallyVisibleSet(scene) {
        var commandList = scene._commandList;
        var overlayList = scene._overlayCommandList;

        var cullingVolume = scene._frameState.cullingVolume;
        var camera = scene._camera;

        var direction = camera.directionWC;
        var position = camera.positionWC;

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

        var near = Number.MAX_VALUE;
        var far = Number.MIN_VALUE;
        var undefBV = false;

        var occluder;
        if (scene._frameState.mode === SceneMode.SCENE3D) {
            occluder = scene._frameState.occluder;
        }

        // get user culling volume minus the far plane.
        var planes = scratchCullingVolume.planes;
        for (var m = 0; m < 5; ++m) {
            planes[m] = cullingVolume.planes[m];
        }
        cullingVolume = scratchCullingVolume;

        var length = commandList.length;
        for (var i = 0; i < length; ++i) {
            var command = commandList[i];
            var pass = command.pass;

            if (pass === Pass.OVERLAY) {
                overlayList.push(command);
            } else {
                var boundingVolume = command.boundingVolume;
                if (defined(boundingVolume)) {
                    if (command.cull &&
                            ((cullingVolume.computeVisibility(boundingVolume) === Intersect.OUTSIDE) ||
                             (defined(occluder) && !occluder.isBoundingSphereVisible(boundingVolume)))) {
                        continue;
                    }

                    distances = BoundingSphere.computePlaneDistances(boundingVolume, position, direction, distances);
                    near = Math.min(near, distances.start);
                    far = Math.max(far, distances.stop);
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
        }

        // Exploit temporal coherence. If the frustums haven't changed much, use the frustums computed
        // last frame, else compute the new frustums and sort them by frustum again.
        var farToNearRatio = scene.farToNearRatio;
        var numFrustums = Math.ceil(Math.log(far / near) / Math.log(farToNearRatio));
        if (near !== Number.MAX_VALUE && (numFrustums !== numberOfFrustums || (frustumCommandsList.length !== 0 &&
                (near < frustumCommandsList[0].near || far > frustumCommandsList[numberOfFrustums - 1].far)))) {
            updateFrustums(near, far, farToNearRatio, numFrustums, frustumCommandsList);
            createPotentiallyVisibleSet(scene);
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

        fs.sources = fs.sources.map(function(source) {
            source = source.replace(/void\s+main\s*\(\s*(?:void)?\s*\)/g, 'void czm_Debug_main()');
            return source;
        });

        var newMain =
            'void main() \n' +
            '{ \n' +
            '    czm_Debug_main(); \n';

        if (scene.debugShowCommands) {
            if (!defined(command._debugColor)) {
                command._debugColor = Color.fromRandom();
            }
            var c = command._debugColor;
            newMain += '    gl_FragColor.rgb *= vec3(' + c.red + ', ' + c.green + ', ' + c.blue + '); \n';
        }

        if (scene.debugShowFrustums) {
            // Support up to three frustums.  If a command overlaps all
            // three, it's code is not changed.
            var r = (command.debugOverlappingFrustums & (1 << 0)) ? '1.0' : '0.0';
            var g = (command.debugOverlappingFrustums & (1 << 1)) ? '1.0' : '0.0';
            var b = (command.debugOverlappingFrustums & (1 << 2)) ? '1.0' : '0.0';
            newMain += '    gl_FragColor.rgb *= vec3(' + r + ', ' + g + ', ' + b + '); \n';
        }

        newMain += '}';

        fs.sources.push(newMain);

        var attributeLocations = getAttributeLocations(sp);
        return context.createShaderProgram(sp.vertexShaderSource, fs, attributeLocations);
    }

    function executeDebugCommand(command, scene, passState, renderState, shaderProgram) {
        if (defined(command.shaderProgram) || defined(shaderProgram)) {
            // Replace shader for frustum visualization
            var sp = createDebugFragmentShaderProgram(command, scene, shaderProgram);
            command.execute(scene.context, passState, renderState, sp);
            sp.destroy();
        }
    }

    var transformFrom2D = new Matrix4(0.0, 0.0, 1.0, 0.0,
                                        1.0, 0.0, 0.0, 0.0,
                                        0.0, 1.0, 0.0, 0.0,
                                        0.0, 0.0, 0.0, 1.0);
    transformFrom2D = Matrix4.inverseTransformation(transformFrom2D, transformFrom2D);

    function executeCommand(command, scene, context, passState, renderState, shaderProgram, debugFramebuffer) {
        if ((defined(scene.debugCommandFilter)) && !scene.debugCommandFilter(command)) {
            return;
        }

        if (scene.debugShowCommands || scene.debugShowFrustums) {
            executeDebugCommand(command, scene, passState, renderState, shaderProgram);
        } else {
            command.execute(context, passState, renderState, shaderProgram);
        }

        if (command.debugShowBoundingVolume && (defined(command.boundingVolume))) {
            // Debug code to draw bounding volume for command.  Not optimized!
            // Assumes bounding volume is a bounding sphere.
            if (defined(scene._debugSphere)) {
                scene._debugSphere.destroy();
            }

            var frameState = scene._frameState;
            var boundingVolume = command.boundingVolume;
            var radius = boundingVolume.radius;
            var center = boundingVolume.center;

            var geometry = GeometryPipeline.toWireframe(EllipsoidGeometry.createGeometry(new EllipsoidGeometry({
                radii : new Cartesian3(radius, radius, radius),
                vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT
            })));

            if (frameState.mode !== SceneMode.SCENE3D) {
                center = Matrix4.multiplyByPoint(transformFrom2D, center, center);
                var projection = frameState.mapProjection;
                var centerCartographic = projection.unproject(center);
                center = projection.ellipsoid.cartographicToCartesian(centerCartographic);
            }

            scene._debugSphere = new Primitive({
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

            var commandList = [];
            scene._debugSphere.update(context, frameState, commandList);

            var framebuffer;
            if (defined(debugFramebuffer)) {
                framebuffer = passState.framebuffer;
                passState.framebuffer = debugFramebuffer;
            }

            commandList[0].execute(context, passState);

            if (defined(framebuffer)) {
                passState.framebuffer = framebuffer;
            }
        }
    }

    function isVisible(command, frameState) {
        if (!defined(command)) {
            return;
        }

        var occluder = (frameState.mode === SceneMode.SCENE3D) ? frameState.occluder: undefined;
        var cullingVolume = frameState.cullingVolume;

        // get user culling volume minus the far plane.
        var planes = scratchCullingVolume.planes;
        for (var k = 0; k < 5; ++k) {
            planes[k] = cullingVolume.planes[k];
        }
        cullingVolume = scratchCullingVolume;

        var boundingVolume = command.boundingVolume;

        return ((defined(command)) &&
                 ((!defined(command.boundingVolume)) ||
                  !command.cull ||
                  ((cullingVolume.computeVisibility(boundingVolume) !== Intersect.OUTSIDE) &&
                   (!defined(occluder) || occluder.isBoundingSphereVisible(boundingVolume)))));
    }

    function translucentCompare(a, b, position) {
        return BoundingSphere.distanceSquaredTo(b.boundingVolume, position) - BoundingSphere.distanceSquaredTo(a.boundingVolume, position);
    }

    function executeTranslucentCommandsSorted(scene, executeFunction, passState, commands) {
        var context = scene.context;

        mergeSort(commands, translucentCompare, scene._camera.positionWC);

        var length = commands.length;
        for (var j = 0; j < length; ++j) {
            executeFunction(commands[j], scene, context, passState);
        }
    }

    var scratchPerspectiveFrustum = new PerspectiveFrustum();
    var scratchPerspectiveOffCenterFrustum = new PerspectiveOffCenterFrustum();
    var scratchOrthographicFrustum = new OrthographicFrustum();

    function executeCommands(scene, passState, clearColor, picking) {
        var frameState = scene._frameState;
        var camera = scene._camera;
        var context = scene.context;
        var us = context.uniformState;

        var i;
        var j;

        var frustum;
        if (defined(camera.frustum.fov)) {
            frustum = camera.frustum.clone(scratchPerspectiveFrustum);
        } else if (defined(camera.frustum.infiniteProjectionMatrix)){
            frustum = camera.frustum.clone(scratchPerspectiveOffCenterFrustum);
        } else {
            frustum = camera.frustum.clone(scratchOrthographicFrustum);
        }

        if (defined(scene.sun) && scene.sunBloom !== scene._sunBloom) {
            if (scene.sunBloom) {
                scene._sunPostProcess = new SunPostProcess();
            } else if(defined(scene._sunPostProcess)){
                scene._sunPostProcess = scene._sunPostProcess.destroy();
            }

            scene._sunBloom = scene.sunBloom;
        } else if (!defined(scene.sun) && defined(scene._sunPostProcess)) {
            scene._sunPostProcess = scene._sunPostProcess.destroy();
            scene._sunBloom = false;
        }

        var skyBoxCommand = (frameState.passes.render && defined(scene.skyBox)) ? scene.skyBox.update(context, frameState) : undefined;
        var skyAtmosphereCommand = (frameState.passes.render && defined(scene.skyAtmosphere)) ? scene.skyAtmosphere.update(context, frameState) : undefined;
        var sunCommand = (frameState.passes.render && defined(scene.sun)) ? scene.sun.update(scene) : undefined;
        var sunVisible = isVisible(sunCommand, frameState);

        var clear = scene._clearColorCommand;
        Color.clone(clearColor, clear.color);
        clear.execute(context, passState);

        var renderTranslucentCommands = false;
        var frustumCommandsList = scene._frustumCommandsList;
        var numFrustums = frustumCommandsList.length;
        for (i = 0; i < numFrustums; ++i) {
            if (frustumCommandsList[i].indices[Pass.TRANSLUCENT] > 0) {
                renderTranslucentCommands = true;
                break;
            }
        }

        var useOIT = !picking && renderTranslucentCommands && defined(scene._oit) && scene._oit.isSupported();
        if (useOIT) {
            scene._oit.update(context);
            scene._oit.clear(context, passState, clearColor);
            useOIT = useOIT && scene._oit.isSupported();
        }

        var useFXAA = !picking && (scene.fxaa || (useOIT && scene.fxaaOrderIndependentTranslucency));
        if (useFXAA) {
            scene._fxaa.update(context);
            scene._fxaa.clear(context, passState, clearColor);
        }

        var opaqueFramebuffer = passState.framebuffer;
        if (useOIT) {
            opaqueFramebuffer = scene._oit.getColorFramebuffer();
        } else if (useFXAA) {
            opaqueFramebuffer = scene._fxaa.getColorFramebuffer();
        }

        if (sunVisible && scene.sunBloom) {
            passState.framebuffer = scene._sunPostProcess.update(context);
        } else {
            passState.framebuffer = opaqueFramebuffer;
        }

        // Ideally, we would render the sky box and atmosphere last for
        // early-z, but we would have to draw it in each frustum
        frustum.near = camera.frustum.near;
        frustum.far = camera.frustum.far;
        us.updateFrustum(frustum);

        if (defined(skyBoxCommand)) {
            executeCommand(skyBoxCommand, scene, context, passState);
        }

        if (defined(skyAtmosphereCommand)) {
            executeCommand(skyAtmosphereCommand, scene, context, passState);
        }

        if (defined(sunCommand) && sunVisible) {
            sunCommand.execute(context, passState);

            if (scene.sunBloom) {
                scene._sunPostProcess.execute(context, opaqueFramebuffer);
                passState.framebuffer = opaqueFramebuffer;
            }
        }

        var clearDepth = scene._depthClearCommand;
        var executeTranslucentCommands;
        if (useOIT) {
            if (!defined(scene._executeOITFunction)) {
                scene._executeOITFunction = function(scene, executeFunction, passState, commands) {
                    scene._oit.executeCommands(scene, executeFunction, passState, commands);
                };
            }
            executeTranslucentCommands = scene._executeOITFunction;
        } else {
            executeTranslucentCommands = executeTranslucentCommandsSorted;
        }

        // Execute commands in each frustum in back to front order
        for (i = 0; i < numFrustums; ++i) {
            var index = numFrustums - i - 1;
            var frustumCommands = frustumCommandsList[index];
            frustum.near = frustumCommands.near;
            frustum.far = frustumCommands.far;

            if (index !== 0) {
                // Avoid tearing artifacts between adjacent frustums
                frustum.near *= 0.99;
            }

            us.updateFrustum(frustum);
            clearDepth.execute(context, passState);

            var commands;
            var length;

            // Execute commands in order by pass up to the translucent pass.
            // Translucent geometry needs special handling (sorting/OIT).
            var numPasses = Pass.TRANSLUCENT;
            for (var pass = 0; pass < numPasses; ++pass) {
                commands = frustumCommands.commands[pass];
                length = frustumCommands.indices[pass];
                for (j = 0; j < length; ++j) {
                    executeCommand(commands[j], scene, context, passState);
                }
            }

            frustum.near = frustumCommands.near;
            us.updateFrustum(frustum);

            commands = frustumCommands.commands[Pass.TRANSLUCENT];
            commands.length = frustumCommands.indices[Pass.TRANSLUCENT];
            executeTranslucentCommands(scene, executeCommand, passState, commands);
        }

        if (useOIT) {
            passState.framebuffer = useFXAA ? scene._fxaa.getColorFramebuffer() : undefined;
            scene._oit.execute(context, passState);
        }

        if (useFXAA) {
            passState.framebuffer = undefined;
            scene._fxaa.execute(context, passState);
        }
    }

    function executeOverlayCommands(scene, passState) {
        var context = scene.context;
        var commandList = scene._overlayCommandList;
        var length = commandList.length;
        for (var i = 0; i < length; ++i) {
            commandList[i].execute(context, passState);
        }
    }

    function updatePrimitives(scene) {
        var context = scene.context;
        var frameState = scene._frameState;
        var commandList = scene._commandList;

        if (scene._globe) {
            scene._globe.update(context, frameState, commandList);
        }

        scene._primitives.update(context, frameState, commandList);

        if (defined(scene.moon)) {
            scene.moon.update(context, frameState, commandList);
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
        this._camera.update(this._mode);
        this._screenSpaceCameraController.update();
    };

    function render(scene, time) {
        if (!defined(time)) {
            time = JulianDate.now();
        }

        scene._preRender.raiseEvent(scene, time);

        var us = scene.context.uniformState;
        var frameState = scene._frameState;

        var frameNumber = CesiumMath.incrementWrap(frameState.frameNumber, 15000000.0, 1.0);
        updateFrameState(scene, frameNumber, time);
        frameState.passes.render = true;
        frameState.creditDisplay.beginFrame();

        var context = scene.context;
        us.update(context, frameState);

        scene._commandList.length = 0;
        scene._overlayCommandList.length = 0;

        updatePrimitives(scene);
        createPotentiallyVisibleSet(scene);

        var passState = scene._passState;

        executeCommands(scene, passState, defaultValue(scene.backgroundColor, Color.BLACK));
        executeOverlayCommands(scene, passState);

        frameState.creditDisplay.endFrame();

        if (scene.debugShowFramesPerSecond) {
            if (!defined(scene._performanceDisplay)) {
                var performanceContainer = document.createElement('div');
                performanceContainer.className = 'cesium-performanceDisplay';
                performanceContainer.style.position = 'absolute';
                performanceContainer.style.top = '50px';
                performanceContainer.style.right = '10px';
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
        var context = this._context;
        return Math.max(context.minimumAliasedLineWidth, Math.min(width, context.maximumAliasedLineWidth));
    };

    var orthoPickingFrustum = new OrthographicFrustum();
    var scratchOrigin = new Cartesian3();
    var scratchDirection = new Cartesian3();
    var scratchBufferDimensions = new Cartesian2();
    var scratchPixelSize = new Cartesian2();
    var scratchPickVolumeMatrix4 = new Matrix4();

    function getPickOrthographicCullingVolume(scene, drawingBufferPosition, width, height) {
        var camera = scene._camera;
        var frustum = camera.frustum;

        var drawingBufferWidth = scene.drawingBufferWidth;
        var drawingBufferHeight = scene.drawingBufferHeight;

        var x = (2.0 / drawingBufferWidth) * drawingBufferPosition.x - 1.0;
        x *= (frustum.right - frustum.left) * 0.5;
        var y = (2.0 / drawingBufferHeight) * (drawingBufferHeight - drawingBufferPosition.y) - 1.0;
        y *= (frustum.top - frustum.bottom) * 0.5;

        var transform = Matrix4.clone(camera.transform, scratchPickVolumeMatrix4);
        camera._setTransform(Matrix4.IDENTITY);

        var origin = Cartesian3.clone(camera.position, scratchOrigin);
        Cartesian3.multiplyByScalar(camera.right, x, scratchDirection);
        Cartesian3.add(scratchDirection, origin, origin);
        Cartesian3.multiplyByScalar(camera.up, y, scratchDirection);
        Cartesian3.add(scratchDirection, origin, origin);

        camera._setTransform(transform);

        Cartesian3.fromElements(origin.z, origin.x, origin.y, origin);

        scratchBufferDimensions.x = drawingBufferWidth;
        scratchBufferDimensions.y = drawingBufferHeight;

        var pixelSize = frustum.getPixelSize(scratchBufferDimensions, undefined, scratchPixelSize);

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

        var drawingBufferWidth = scene.drawingBufferWidth;
        var drawingBufferHeight = scene.drawingBufferHeight;

        var tanPhi = Math.tan(frustum.fovy * 0.5);
        var tanTheta = frustum.aspectRatio * tanPhi;

        var x = (2.0 / drawingBufferWidth) * drawingBufferPosition.x - 1.0;
        var y = (2.0 / drawingBufferHeight) * (drawingBufferHeight - drawingBufferPosition.y) - 1.0;

        var xDir = x * near * tanTheta;
        var yDir = y * near * tanPhi;

        scratchBufferDimensions.x = drawingBufferWidth;
        scratchBufferDimensions.y = drawingBufferHeight;

        var pixelSize = frustum.getPixelSize(scratchBufferDimensions, undefined, scratchPixelSize);
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
        if (scene._mode === SceneMode.SCENE2D) {
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

        us.update(context, frameState);

        this._commandList.length = 0;
        updatePrimitives(this);
        createPotentiallyVisibleSet(this);

        scratchRectangle.x = drawingBufferPosition.x - ((rectangleWidth - 1.0) * 0.5);
        scratchRectangle.y = (this.drawingBufferHeight - drawingBufferPosition.y) - ((rectangleHeight - 1.0) * 0.5);

        executeCommands(this, this._pickFramebuffer.begin(scratchRectangle), scratchColorZero, true);
        var object = this._pickFramebuffer.end(scratchRectangle);
        context.endFrame();
        callAfterRenderFunctions(frameState);
        return object;
    };

    /**
     * Returns a list of objects, each containing a `primitive` property, for all primitives at
     * a particular window coordinate position. Other properties may also be set depending on the
     * type of primitive. The primitives in the list are ordered by their visual order in the
     * scene (front to back).
     *
     * @param {Cartesian2} windowPosition Window coordinates to perform picking on.
     * @returns {Object[]} Array of objects, each containing 1 picked primitives.
     *
     * @exception {DeveloperError} windowPosition is undefined.
     *
     * @example
     * var pickedObjects = Cesium.Scene.drillPick(new Cesium.Cartesian2(100.0, 200.0));
     */
    Scene.prototype.drillPick = function(windowPosition) {
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

        var pickedResult = this.pick(windowPosition);
        while (defined(pickedResult) && defined(pickedResult.primitive)) {
            result.push(pickedResult);

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
     * @see Scene#isDestroyed
     *
     * @example
     * scene = scene && scene.destroy();
     */
    Scene.prototype.destroy = function() {
        this._tweens.removeAll();
        this._screenSpaceCameraController = this._screenSpaceCameraController && this._screenSpaceCameraController.destroy();
        this._pickFramebuffer = this._pickFramebuffer && this._pickFramebuffer.destroy();
        this._primitives = this._primitives && this._primitives.destroy();
        this._globe = this._globe && this._globe.destroy();
        this.skyBox = this.skyBox && this.skyBox.destroy();
        this.skyAtmosphere = this.skyAtmosphere && this.skyAtmosphere.destroy();
        this._debugSphere = this._debugSphere && this._debugSphere.destroy();
        this.sun = this.sun && this.sun.destroy();
        this._sunPostProcess = this._sunPostProcess && this._sunPostProcess.destroy();

        this._transitioner.destroy();

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
