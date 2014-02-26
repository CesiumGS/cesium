/*global define*/
define([
        '../Core/Math',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/GeographicProjection',
        '../Core/Ellipsoid',
        '../Core/Occluder',
        '../Core/BoundingRectangle',
        '../Core/BoundingSphere',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Intersect',
        '../Core/Interval',
        '../Core/Matrix4',
        '../Core/JulianDate',
        '../Core/EllipsoidGeometry',
        '../Core/GeometryInstance',
        '../Core/GeometryPipeline',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/ShowGeometryInstanceAttribute',
        '../Core/PrimitiveType',
        '../Renderer/createShaderSource',
        '../Renderer/BlendFunction',
        '../Renderer/BlendingState',
        '../Renderer/Context',
        '../Renderer/ClearCommand',
        '../Renderer/DrawCommand',
        '../Renderer/FramebufferStatus',
        '../Renderer/PassState',
        '../Renderer/Pass',
        '../Renderer/PixelFormat',
        '../Renderer/PixelDatatype',
        '../Renderer/RenderbufferFormat',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        './Camera',
        './ScreenSpaceCameraController',
        './CompositePrimitive',
        './CullingVolume',
        './AnimationCollection',
        './SceneMode',
        './SceneTransforms',
        './FrameState',
        './OrthographicFrustum',
        './PerspectiveFrustum',
        './PerspectiveOffCenterFrustum',
        './FrustumCommands',
        './PerformanceDisplay',
        './Primitive',
        './PerInstanceColorAppearance',
        './SunPostProcess',
        './CreditDisplay',
        '../Shaders/CompositeOITFS',
        '../Shaders/PostProcessFilters/FXAA',
        '../Shaders/ViewportQuadVS'
    ], function(
        CesiumMath,
        Color,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        GeographicProjection,
        Ellipsoid,
        Occluder,
        BoundingRectangle,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Intersect,
        Interval,
        Matrix4,
        JulianDate,
        EllipsoidGeometry,
        GeometryInstance,
        GeometryPipeline,
        ColorGeometryInstanceAttribute,
        ShowGeometryInstanceAttribute,
        PrimitiveType,
        createShaderSource,
        BlendFunction,
        BlendingState,
        Context,
        ClearCommand,
        DrawCommand,
        FramebufferStatus,
        PassState,
        Pass,
        PixelFormat,
        PixelDatatype,
        RenderbufferFormat,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        Camera,
        ScreenSpaceCameraController,
        CompositePrimitive,
        CullingVolume,
        AnimationCollection,
        SceneMode,
        SceneTransforms,
        FrameState,
        OrthographicFrustum,
        PerspectiveFrustum,
        PerspectiveOffCenterFrustum,
        FrustumCommands,
        PerformanceDisplay,
        Primitive,
        PerInstanceColorAppearance,
        SunPostProcess,
        CreditDisplay,
        CompositeOITFS,
        FXAA,
        ViewportQuadVS) {
    "use strict";

    /**
     * The container for all 3D graphical objects and state in a Cesium virtual scene.  Generally,
     * a scene is not created directly; instead, it is implicitly created by {@link CesiumWidget}.
     *
     * @alias Scene
     * @constructor
     *
     * @param {HTMLCanvasElement} canvas The HTML canvas element to create the scene for.
     * @param {Object} [contextOptions=undefined] Context and WebGL creation properties corresponding to {@link Context#options}.
     * @param {HTMLElement} [creditContainer=undefined] The HTML element in which the credits will be displayed.
     *
     * @see CesiumWidget
     * @see <a href='http://www.khronos.org/registry/webgl/specs/latest/#5.2'>WebGLContextAttributes</a>
     *
     * @example
     * // Create scene without anisotropic texture filtering
     * var scene = new Cesium.Scene(canvas, {
     *   allowTextureFilterAnisotropic : false
     * });
     */
    var Scene = function(canvas, contextOptions, creditContainer) {
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
        this._frameState = new FrameState(new CreditDisplay(creditContainer));
        this._passState = new PassState(context);
        this._canvas = canvas;
        this._context = context;
        this._primitives = new CompositePrimitive();
        this._pickFramebuffer = undefined;
        this._camera = new Camera(context);
        this._screenSpaceCameraController = new ScreenSpaceCameraController(canvas, this._camera.controller);

        this._animations = new AnimationCollection();

        this._shaderFrameCount = 0;

        this._sunPostProcess = undefined;

        this._commandList = [];
        this._frustumCommandsList = [];
        this._overlayCommandList = [];

        var textureFloat = context.getFloatingPointTexture();
        this._translucentMRTSupport = context.getDrawBuffers() && textureFloat;
        this._translucentMultipassSupport = !this._translucentMRTSupport && textureFloat;

        this._clearColorCommand = new ClearCommand();
        this._clearColorCommand.color = new Color();
        this._clearColorCommand.owner = this;

        var opaqueClearCommand = new ClearCommand();
        opaqueClearCommand.color = new Color(0.0, 0.0, 0.0, 0.0);
        opaqueClearCommand.depth = 1.0;
        opaqueClearCommand.owner = this;
        this._opaqueClearCommand = opaqueClearCommand;

        var translucentClearCommand = new ClearCommand();
        translucentClearCommand.color = new Color(0.0, 0.0, 0.0, 1.0);
        translucentClearCommand.owner = this;
        this._translucentClearCommand = translucentClearCommand;

        var alphaClearCommand;
        if (this._translucentMultipassSupport) {
            translucentClearCommand.color.alpha = 0.0;

            alphaClearCommand = new ClearCommand();
            alphaClearCommand.color = new Color(1.0, 1.0, 1.0, 1.0);
            alphaClearCommand.owner = this;
        }
        this._alphaClearCommand = alphaClearCommand;

        var depthClearCommand = new ClearCommand();
        depthClearCommand.depth = 1.0;
        depthClearCommand.owner = this;
        this._depthClearCommand = depthClearCommand;

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

        /**
         * The current mode of the scene.
         *
         * @type {SceneMode}
         * @default {@link SceneMode.SCENE3D}
         */
        this.mode = SceneMode.SCENE3D;
        /**
         * DOC_TBA
         */
        this.scene2D = {
            /**
             * The projection to use in 2D mode.
             */
            projection : new GeographicProjection(Ellipsoid.WGS84)
        };
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
         *
         * @see DrawCommand
         * @see ClearCommand
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
         * When {@link Scene.debugShowFrustums} is <code>true</code>, this contains
         * properties with statistics about the number of command execute per frustum.
         * <code>totalCommands</code> is the total number of commands executed, ignoring
         * overlap. <code>commandsInFrustums</code> is an array with the number of times
         * commands are executed redundantly, e.g., how many commands overlap two or
         * three frustums.
         * </p>
         *
         * @type Object
         *
         * @default undefined
         *
         * @readonly
         */
        this.debugFrustumStatistics = undefined;

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

        this._performanceDisplay = undefined;

        this._debugSphere = undefined;

        this._opaqueTexture = undefined;
        this._accumulationTexture = undefined;
        this._revealageTexture = undefined;
        this._compositeTexture = undefined;
        this._depthTexture = undefined;
        this._depthRenderbuffer = undefined;

        this._opaqueFBO = undefined;
        this._translucentFBO = undefined;
        this._alphaFBO = undefined;
        this._compositeFBO = undefined;

        this._compositeCommand = undefined;
        this._fxaaCommand = undefined;

        this._translucentRenderStateCache = {};
        this._alphaRenderStateCache = {};
        this._translucentShaderCache = {};
        this._alphaShaderCache = {};

        // initial guess at frustums.
        var near = this._camera.frustum.near;
        var far = this._camera.frustum.far;
        var numFrustums = Math.ceil(Math.log(far / near) / Math.log(this.farToNearRatio));
        updateFrustums(near, far, this.farToNearRatio, numFrustums, this._frustumCommandsList);

        // give frameState, camera, and screen space camera controller initial state before rendering
        updateFrameState(this, 0.0, new JulianDate());
        this.initializeFrame();
    };

    defineProperties(Scene.prototype, {
        /**
         * Gets the canvas element to which this scene is bound.
         * @memberof Scene.prototype
         * @type {Element}
         */
        canvas : {
            get : function() {
                return this._canvas;
            }
        },

        /**
         * Gets the context.
         * @memberof Scene.prototype
         * @type {Context}
         */
        context : {
            get : function() {
                return this._context;
            }
        },

        /**
         * Gets the collection of primitives.
         * @memberof Scene.prototype
         * @type {CompositePrimitive}
         */
        primitives : {
            get : function() {
                return this._primitives;
            }
        },

        /**
         * Gets the camera.
         * @memberof Scene.prototype
         * @type {Camera}
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
         * @type {ScreenSpaceCameraController}
         */
        screenSpaceCameraController : {
            get : function() {
                return this._screenSpaceCameraController;
            }
        },

        /**
         * Gets state information about the current scene. If called outside of a primitive's <code>update</code>
         * function, the previous frame's state is returned.
         * @memberof Scene.prototype
         * @type {FrameState}
         */
        frameState : {
            get: function() {
                return this._frameState;
            }
        },

        /**
         * Gets the collection of animations taking place in the scene.
         * @memberof Scene.prototype
         * @type {AnimationCollection}
         */
        animations : {
            get : function() {
                return this._animations;
            }
        }
    });

    var scratchOccluderBoundingSphere = new BoundingSphere();
    var scratchOccluder;

    function getOccluder(scene) {
        // TODO: The occluder is the top-level central body. When we add
        //       support for multiple central bodies, this should be the closest one.
        var cb = scene._primitives.centralBody;
        if (scene.mode === SceneMode.SCENE3D && defined(cb)) {
            var ellipsoid = cb.ellipsoid;
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
        frameState.mode = scene.mode;
        frameState.morphTime = scene.morphTime;
        frameState.scene2D = scene.scene2D;
        frameState.frameNumber = frameNumber;
        frameState.time = time;
        frameState.camera = camera;
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.positionWC, camera.directionWC, camera.upWC);
        frameState.occluder = getOccluder(scene);
        frameState.events.length = 0;

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

            if (command.pass === Pass.OPAQUE || command instanceof ClearCommand) {
                frustumCommands.opaqueCommands[frustumCommands.opaqueIndex++] = command;
            } else if (command.pass === Pass.TRANSLUCENT){
                frustumCommands.translucentCommands[frustumCommands.translucentIndex++] = command;
            }

            if (scene.debugShowFrustums) {
                command.debugOverlappingFrustums |= (1 << i);
            }

            if (command.executeInClosestFrustum) {
                break;
            }
        }

        if (scene.debugShowFrustums) {
            var cf = scene.debugFrustumStatistics.commandsInFrustums;
            cf[command.debugOverlappingFrustums] = defined(cf[command.debugOverlappingFrustums]) ? cf[command.debugOverlappingFrustums] + 1 : 1;
            ++scene.debugFrustumStatistics.totalCommands;
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
            scene.debugFrustumStatistics = {
                totalCommands : 0,
                commandsInFrustums : {}
            };
        }

        var frustumCommandsList = scene._frustumCommandsList;
        var numberOfFrustums = frustumCommandsList.length;
        for (var n = 0; n < numberOfFrustums; ++n) {
            frustumCommandsList[n].opaqueIndex = 0;
            frustumCommandsList[n].translucentIndex = 0;
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
                            ((cullingVolume.getVisibility(boundingVolume) === Intersect.OUTSIDE) ||
                             (defined(occluder) && !occluder.isBoundingSphereVisible(boundingVolume)))) {
                        continue;
                    }

                    distances = boundingVolume.getPlaneDistances(position, direction, distances);
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
        var attributes = shaderProgram.getVertexAttributes();
        for (var a in attributes) {
            if (attributes.hasOwnProperty(a)) {
                attributeLocations[a] = attributes[a].index;
            }
        }

        return attributeLocations;
    }

    function createDebugFragmentShaderProgram(command, scene, context, shaderProgram) {
        var sp = defaultValue(shaderProgram, command.shaderProgram);
        var fragmentShaderSource = sp.fragmentShaderSource;
        var renamedFS = fragmentShaderSource.replace(/void\s+main\s*\(\s*(?:void)?\s*\)/g, 'void czm_Debug_main()');

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

        var source = renamedFS + '\n' + newMain;
        var attributeLocations = getAttributeLocations(sp);
        return context.getShaderCache().getShaderProgram(sp.vertexShaderSource, source, attributeLocations);
    }

    function executeDebugCommand(command, scene, context, passState, renderState, shaderProgram) {
        if (defined(command.shaderProgram) || defined(shaderProgram)) {
            // Replace shader for frustum visualization
            var sp = createDebugFragmentShaderProgram(command, scene, context, shaderProgram);
            command.execute(context, passState, renderState, sp);
            sp.release();
        }
    }

    function executeCommand(command, scene, context, passState, renderState, shaderProgram) {
        if ((defined(scene.debugCommandFilter)) && !scene.debugCommandFilter(command)) {
            return;
        }

        if (scene.debugShowCommands || scene.debugShowFrustums) {
            executeDebugCommand(command, scene, context, passState, renderState, shaderProgram);
        } else {
            command.execute(context, passState, renderState, shaderProgram);
        }

        if (command.debugShowBoundingVolume && (defined(command.boundingVolume))) {
            // Debug code to draw bounding volume for command.  Not optimized!
            // Assumes bounding volume is a bounding sphere.

            if (!defined(scene._debugSphere)) {
                var geometry = EllipsoidGeometry.createGeometry(new EllipsoidGeometry({
                    ellipsoid : Ellipsoid.UNIT_SPHERE,
                    vertexFormat : PerInstanceColorAppearance.FLAT_VERTEX_FORMAT
                }));
                scene._debugSphere = new Primitive({
                    geometryInstances : new GeometryInstance({
                        geometry : GeometryPipeline.toWireframe(geometry),
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

            var m = Matrix4.multiplyByTranslation(Matrix4.IDENTITY, command.boundingVolume.center);
            scene._debugSphere.modelMatrix = Matrix4.multiplyByUniformScale(m, command.boundingVolume.radius);

            var commandList = [];
            scene._debugSphere.update(context, scene._frameState, commandList);

            var framebuffer;
            var renderToTexture = scene._translucentMRTSupport || scene._translucentMultipassSupport;
            if (renderToTexture) {
                framebuffer = passState.framebuffer;
                passState.framebuffer = scene._opaqueFBO;
            }

            commandList[0].execute(context, passState);

            if (renderToTexture) {
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
                  ((cullingVolume.getVisibility(boundingVolume) !== Intersect.OUTSIDE) &&
                   (!defined(occluder) || occluder.isBoundingSphereVisible(boundingVolume)))));
    }

    var translucentMRTBlend = {
        enabled : true,
        functionSourceRgb : BlendFunction.ONE,
        functionDestinationRgb : BlendFunction.ONE,
        functionSourceAlpha : BlendFunction.ZERO,
        functionDestinationAlpha : BlendFunction.ONE_MINUS_SOURCE_ALPHA
    };

    var translucentColorBlend = {
        enabled : true,
        functionSourceRgb : BlendFunction.ONE,
        functionDestinationRgb : BlendFunction.ONE,
        functionSourceAlpha : BlendFunction.ONE,
        functionDestinationAlpha : BlendFunction.ONE
    };

    var translucentAlphaBlend = {
        enabled : true,
        functionSourceRgb : BlendFunction.ZERO,
        functionDestinationRgb : BlendFunction.ONE_MINUS_SOURCE_ALPHA,
        functionSourceAlpha : BlendFunction.ZERO,
        functionDestinationAlpha : BlendFunction.ONE_MINUS_SOURCE_ALPHA
    };

    function getTranslucentRenderState(context, translucentBlending, cache, renderState) {
        var translucentState = cache[renderState.id];
        if (!defined(translucentState)) {
            var depthMask = renderState.depthMask;
            var blending = renderState.blending;

            renderState.depthMask = false;
            renderState.blending = translucentBlending;

            translucentState = context.createRenderState(renderState);
            cache[renderState.id] = translucentState;

            renderState.depthMask = depthMask;
            renderState.blending = blending;
        }

        return translucentState;
    }

    function getTranslucentMRTRenderState(scene, renderState) {
        return getTranslucentRenderState(scene._context, translucentMRTBlend, scene._translucentRenderStateCache, renderState);
    }

    function getTranslucentColorRenderState(scene, renderState) {
        return getTranslucentRenderState(scene._context, translucentColorBlend, scene._translucentRenderStateCache, renderState);
    }

    function getTranslucentAlphaRenderState(scene, renderState) {
        return getTranslucentRenderState(scene._context, translucentAlphaBlend, scene._alphaRenderStateCache, renderState);
    }

    var mrtShaderSource =
        '    vec3 Ci = czm_gl_FragColor.rgb;\n' +
        '    float ai = czm_gl_FragColor.a;\n' +
        '    float wzi = czm_alphaWeight(ai);\n' +
        '    gl_FragData[0] = vec4(Ci * wzi, ai);\n' +
        '    gl_FragData[1] = vec4(ai * wzi);\n';

    var colorShaderSource =
        '    vec3 Ci = czm_gl_FragColor.rgb;\n' +
        '    float ai = czm_gl_FragColor.a;\n' +
        '    float wzi = czm_alphaWeight(ai);\n' +
        '    gl_FragColor = vec4(Ci, ai) * wzi;\n';

    var alphaShaderSource =
        '    float ai = czm_gl_FragColor.a;\n' +
        '    gl_FragColor = vec4(ai);\n';

    function getTranslucentShaderProgram(scene, shaderProgram, cache, source) {
        var id = shaderProgram.id;
        var shader = cache[id];
        if (!defined(shader)) {
            var attributeLocations = shaderProgram._attributeLocations;
            var vs = shaderProgram.vertexShaderSource;
            var fs = shaderProgram.fragmentShaderSource;

            var renamedFS = fs.replace(/void\s+main\s*\(\s*(?:void)?\s*\)/g, 'void czm_translucent_main()');
            renamedFS = renamedFS.replace(/gl_FragColor/g, 'czm_gl_FragColor');
            renamedFS = renamedFS.replace(/discard/g, 'czm_discard = true');
            renamedFS = renamedFS.replace(/czm_phong/g, 'czm_translucentPhong');

            // Discarding the fragment in main is a workaround for ANGLE D3D9
            // shader compilation errors.
            var newSource =
                (source.indexOf('gl_FragData') !== -1 ? '#extension GL_EXT_draw_buffers : enable \n' : '') +
                'vec4 czm_gl_FragColor;\n' +
                'bool czm_discard = false;\n' +
                renamedFS + '\n\n' +
                'void main()\n' +
                '{\n' +
                '    czm_translucent_main();\n' +
                '    if (czm_discard)\n' +
                '    {\n' +
                '        discard;\n' +
                '    }\n' +
                source +
                '}\n';

            shader = scene._context.getShaderCache().getShaderProgram(vs, newSource, attributeLocations);
            cache[id] = shader;
        }

        return shader;
    }

    function getTranslucentMRTShaderProgram(scene, shaderProgram) {
        return getTranslucentShaderProgram(scene, shaderProgram, scene._translucentShaderCache, mrtShaderSource);
    }

    function getTranslucentColorShaderProgram(scene, shaderProgram) {
        return getTranslucentShaderProgram(scene, shaderProgram, scene._translucentShaderCache, colorShaderSource);
    }

    function getTranslucentAlphaShaderProgram(scene, shaderProgram) {
        return getTranslucentShaderProgram(scene, shaderProgram, scene._alphaShaderCache, alphaShaderSource);
    }

    function executeTranslucentCommandsInOrder(scene, passState, frustumCommands) {
        var context = scene._context;
        var commands = frustumCommands.translucentCommands;
        var length = commands.length = frustumCommands.translucentIndex;
        for (var j = 0; j < length; ++j) {
            executeCommand(commands[j], scene, context, passState);
        }
    }

    function executeTranslucentCommandsSorted(scene, passState, frustumCommands) {
        var command;
        var renderState;
        var shaderProgram;
        var j;

        var context = scene._context;
        var framebuffer = passState.framebuffer;
        var commands = frustumCommands.translucentCommands;
        var length = commands.length = frustumCommands.translucentIndex;

        passState.framebuffer = scene._translucentFBO;

        for (j = 0; j < length; ++j) {
            command = commands[j];
            renderState = getTranslucentColorRenderState(scene, command.renderState);
            shaderProgram = getTranslucentColorShaderProgram(scene, command.shaderProgram);
            executeCommand(command, scene, context, passState, renderState, shaderProgram);
        }

        passState.framebuffer = scene._alphaFBO;

        for (j = 0; j < length; ++j) {
            command = commands[j];
            renderState = getTranslucentAlphaRenderState(scene, command.renderState);
            shaderProgram = getTranslucentAlphaShaderProgram(scene, command.shaderProgram);
            executeCommand(command, scene, context, passState, renderState, shaderProgram);
        }

        passState.framebuffer = framebuffer;
    }

    function executeTranslucentCommandsSortedMRT(scene, passState, frustumCommands) {
        var context = scene._context;
        var framebuffer = passState.framebuffer;
        var commands = frustumCommands.translucentCommands;
        var length = commands.length = frustumCommands.translucentIndex;

        passState.framebuffer = scene._translucentFBO;
        for (var j = 0; j < length; ++j) {
            var command = commands[j];
            var renderState = getTranslucentMRTRenderState(scene, command.renderState);
            var shaderProgram = getTranslucentMRTShaderProgram(scene, command.shaderProgram);
            executeCommand(command, scene, context, passState, renderState, shaderProgram);
        }

        passState.framebuffer = framebuffer;
    }

    var scratchPerspectiveFrustum = new PerspectiveFrustum();
    var scratchPerspectiveOffCenterFrustum = new PerspectiveOffCenterFrustum();
    var scratchOrthographicFrustum = new OrthographicFrustum();

    function executeCommands(scene, passState, clearColor, picking) {
        var frameState = scene._frameState;
        var camera = scene._camera;
        var context = scene._context;
        var us = context.getUniformState();
        var sortTranslucent = !picking && (scene._translucentMRTSupport || scene._translucentMultipassSupport);

        var frustum;
        if (defined(camera.frustum.fovy)) {
            frustum = camera.frustum.clone(scratchPerspectiveFrustum);
        } else if (defined(camera.frustum.infiniteProjectionMatrix)){
            frustum = camera.frustum.clone(scratchPerspectiveOffCenterFrustum);
        } else {
            frustum = camera.frustum.clone(scratchOrthographicFrustum);
        }

        if (defined(scene.sun) && scene.sunBloom !== scene._sunBloom) {
            if (scene.sunBloom) {
                scene._sunPostProcess = new SunPostProcess();
            } else {
                scene._sunPostProcess = scene._sunPostProcess.destroy();
            }

            scene._sunBloom = scene.sunBloom;
        } else if (!defined(scene.sun) && defined(scene._sunPostProcess)) {
            scene._sunPostProcess = scene._sunPostProcess.destroy();
            scene._sunBloom = false;
        }

        var skyBoxCommand = (frameState.passes.render && defined(scene.skyBox)) ? scene.skyBox.update(context, frameState) : undefined;
        var skyAtmosphereCommand = (frameState.passes.render && defined(scene.skyAtmosphere)) ? scene.skyAtmosphere.update(context, frameState) : undefined;
        var sunCommand = (frameState.passes.render && defined(scene.sun)) ? scene.sun.update(context, frameState) : undefined;
        var sunVisible = isVisible(sunCommand, frameState);

        var clear = scene._clearColorCommand;
        Color.clone(clearColor, clear.color);
        clear.execute(context, passState);

        var opaqueFramebuffer = passState.framebuffer;

        if (sortTranslucent) {
            sortTranslucent = updateFramebuffers(scene);

            if (sortTranslucent) {
                opaqueFramebuffer = scene._opaqueFBO;

                passState.framebuffer = scene._opaqueFBO;
                Color.clone(clearColor, scene._opaqueClearCommand.color);
                scene._opaqueClearCommand.execute(context, passState);
                passState.framebuffer = scene._translucentFBO;
                scene._translucentClearCommand.execute(context, passState);

                passState.framebuffer = scene._compositeFBO;
                clear.execute(context, passState);

                if (scene._translucentMultipassSupport) {
                    passState.framebuffer = scene._alphaFBO;
                    scene._alphaClearCommand.execute(context, passState);
                }
            }
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
        if (sortTranslucent) {
            executeTranslucentCommands = scene._translucentMRTSupport ? executeTranslucentCommandsSortedMRT : executeTranslucentCommandsSorted;
        } else {
            executeTranslucentCommands = executeTranslucentCommandsInOrder;
        }

        var frustumCommandsList = scene._frustumCommandsList;
        var numFrustums = frustumCommandsList.length;
        for (var i = 0; i < numFrustums; ++i) {
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

            var commands = frustumCommands.opaqueCommands;
            var length = frustumCommands.opaqueIndex;
            for (var j = 0; j < length; ++j) {
                executeCommand(commands[j], scene, context, passState);
            }

            frustum.near = frustumCommands.near;
            us.updateFrustum(frustum);

            executeTranslucentCommands(scene, passState, frustumCommands);
        }

        if (sortTranslucent) {
            passState.framebuffer = scene._compositeFBO;
            scene._compositeCommand.execute(context, passState);
            passState.framebuffer = undefined;
            scene._fxaaCommand.execute(context, passState);
        }
    }

    function executeOverlayCommands(scene, passState) {
        var context = scene._context;
        var commandList = scene._overlayCommandList;
        var length = commandList.length;
        for (var i = 0; i < length; ++i) {
            commandList[i].execute(context, passState);
        }
    }

    function updateTextures(scene, width, height) {
        var context = scene._context;

        var sampler = context.createSampler({
            minificationFilter : TextureMinificationFilter.NEAREST,
            magnificationFilter : TextureMagnificationFilter.NEAREST
        });
        var opaqueTexture = scene._opaqueTexture = context.createTexture2D({
            width : width,
            height : height
        });
        opaqueTexture.setSampler(sampler);
        var accumulationTexture = scene._accumulationTexture = context.createTexture2D({
            width : width,
            height : height,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.FLOAT
        });
        accumulationTexture.setSampler(sampler);
        var revealageTexture = scene._revealageTexture = context.createTexture2D({
            width : width,
            height : height,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.FLOAT
        });
        revealageTexture.setSampler(sampler);
        scene._compositeTexture = context.createTexture2D({
            width : width,
            height : height,
            pixelFormat : PixelFormat.RGB,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE
        });

        if (context.getDepthTexture()) {
            scene._depthTexture = context.createTexture2D({
                width : width,
                height : height,
                pixelFormat : PixelFormat.DEPTH_COMPONENT,
                pixelDatatype : PixelDatatype.UNSIGNED_SHORT
            });
        } else {
            scene._depthRenderbuffer = context.createRenderbuffer({
                width : width,
                height : height,
                format : RenderbufferFormat.DEPTH_COMPONENT16
            });
        }
    }

    function updatePostCommands(scene) {
        var context = scene._context;
        var command;
        var fs;

        if (!defined(scene._compositeCommand)) {
            fs = createShaderSource({
                defines : [scene._translucentMRTSupport ? 'MRT' : ''],
                sources : [CompositeOITFS]
            });

            command = new DrawCommand();
            command.primitiveType = PrimitiveType.TRIANGLE_FAN;
            command.vertexArray = context.getViewportQuadVertexArray();
            command.renderState = context.createRenderState();
            command.shaderProgram = context.getShaderCache().getShaderProgram(ViewportQuadVS, fs, {
                position : 0,
                textureCoordinates : 1
            });

            scene._compositeCommand = command;
        }

        scene._compositeCommand.uniformMap = {
            u_opaque : function() {
                return scene._opaqueTexture;
            },
            u_accumulation : function() {
                return scene._accumulationTexture;
            },
            u_revealage : function() {
                return scene._revealageTexture;
            }
        };

        if (!defined(scene._fxaaCommand)) {
            fs = createShaderSource({
                sources : [FXAA]
            });

            command = new DrawCommand();
            command.primitiveType = PrimitiveType.TRIANGLE_FAN;
            command.vertexArray = context.getViewportQuadVertexArray();
            command.renderState = context.createRenderState();
            command.shaderProgram = context.getShaderCache().getShaderProgram(ViewportQuadVS, fs, {
                position : 0,
                textureCoordinates : 1
            });

            scene._fxaaCommand = command;
        }

        var step = new Cartesian2(1.0 / scene._compositeTexture.getWidth(), 1.0 / scene._compositeTexture.getHeight());
        scene._fxaaCommand.uniformMap = {
            u_texture : function() {
                return scene._compositeTexture;
            },
            u_step : function() {
                return step;
            }
        };
    }

    function updateFramebuffers(scene) {
        var context = scene._context;
        var canvas = scene._canvas;

        var width = canvas.clientWidth;
        var height = canvas.clientHeight;

        var supported = true;
        var colorTexture = scene._opaqueTexture;

        if (!defined(colorTexture) || colorTexture.getWidth() !== width || colorTexture.getHeight() !== height) {
            updateTextures(scene, width, height);

            scene._opaqueFBO = context.createFramebuffer({
                colorTextures : [scene._opaqueTexture],
                depthTexture : scene._depthTexture,
                depthRenderbuffer : scene._depthRenderbuffer
            });
            scene._opaqueFBO.destroyAttachments = false;

            if (scene._translucentMRTSupport) {
                scene._translucentFBO = context.createFramebuffer({
                    colorTextures : [scene._accumulationTexture, scene._revealageTexture],
                    depthTexture : scene._depthTexture,
                    depthRenderbuffer : scene._depthRenderbuffer
                });
                scene._translucentFBO.destroyAttachments = false;

                if(scene._translucentFBO.getStatus() !== FramebufferStatus.COMPLETE) {
                    scene._translucentFBO.destroy();
                    scene._translucentMRTSupport = false;
                }
            }

            if (!scene._translucentMRTSupport) {
                scene._translucentFBO = context.createFramebuffer({
                    colorTextures : [scene._accumulationTexture],
                    depthTexture : scene._depthTexture,
                    depthRenderbuffer : scene._depthRenderbuffer
                });
                scene._translucentFBO.destroyAttachments = false;

                if(scene._translucentFBO.getStatus() !== FramebufferStatus.COMPLETE) {
                    scene._translucentFBO.destroy();
                    scene._opaqueFBO.destroy();

                    scene._opaqueTexture = scene._opaqueTexture && scene._opaqueTexture.destroy();
                    scene._accumulationTexture = scene._accumulationTexture && scene._accumulationTexture.destroy();
                    scene._revealageTexture = scene._revealageTexture && scene._revealageTexture.destroy();
                    scene._compositeTexture = scene._compositeTexture && scene._compositeTexture.destroy();
                    scene._depthTexture = scene._depthTexture && scene._depthTexture.destroy();
                    scene._depthRenderbuffer = scene._depthRenderbuffer && scene._depthRenderbuffer.destroy();

                    scene._translucentMultipassSupport = false;
                } else {
                    scene._alphaFBO = context.createFramebuffer({
                        colorTextures : [scene._revealageTexture],
                        depthTexture : scene._depthTexture,
                        depthRenderbuffer : scene._depthRenderbuffer
                    });
                    scene._alphaFBO.destroyAttachments = false;
                }
            }

            supported = scene._translucentMRTSupport || scene._translucentMultipassSupport;
            if (supported) {
                scene._compositeFBO = context.createFramebuffer({
                    colorTextures : [scene._compositeTexture]
                });
                scene._compositeFBO.destroyAttachments = false;

                updatePostCommands(scene);
            }
        }

        return supported;
    }

    function updatePrimitives(scene) {
        var context = scene._context;
        var frameState = scene._frameState;
        var commandList = scene._commandList;

        scene._primitives.update(context, frameState, commandList);

        if (defined(scene.moon)) {
            scene.moon.update(context, frameState, commandList);
        }
    }

    function executeEvents(frameState) {
        // Events are queued up during primitive update and executed here in case
        // the callback modifies scene state that should remain constant over the frame.
        var events = frameState.events;
        var length = events.length;
        for (var i = 0; i < length; ++i) {
            events[i].raiseEvent();
        }
    }

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.initializeFrame = function() {
        // Destroy released shaders once every 120 frames to avoid thrashing the cache
        if (this._shaderFrameCount++ === 120) {
            this._shaderFrameCount = 0;
            this._context.getShaderCache().destroyReleasedShaderPrograms();
        }

        this._animations.update();
        this._camera.controller.update(this.mode, this.scene2D);
        this._screenSpaceCameraController.update(this.mode);
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.render = function(time) {
        if (!defined(time)) {
            time = new JulianDate();
        }

        var us = this.context.getUniformState();
        var frameState = this._frameState;

        var frameNumber = CesiumMath.incrementWrap(frameState.frameNumber, 15000000.0, 1.0);
        updateFrameState(this, frameNumber, time);
        frameState.passes.render = true;
        frameState.creditDisplay.beginFrame();

        var context = this._context;
        us.update(context, frameState);

        this._commandList.length = 0;
        this._overlayCommandList.length = 0;

        updatePrimitives(this);
        createPotentiallyVisibleSet(this);

        var passState = this._passState;

        executeCommands(this, passState, defaultValue(this.backgroundColor, Color.BLACK));
        executeOverlayCommands(this, passState);

        frameState.creditDisplay.endFrame();

        if (this.debugShowFramesPerSecond) {
            if (!defined(this._performanceDisplay)) {
                var performanceContainer = document.createElement('div');
                performanceContainer.style.position = 'absolute';
                performanceContainer.style.top = '10px';
                performanceContainer.style.left = '10px';
                var container = this._canvas.parentNode;
                container.appendChild(performanceContainer);
                var performanceDisplay = new PerformanceDisplay({container: performanceContainer});
                this._performanceDisplay = performanceDisplay;
                this._performanceContainer = performanceContainer;
            }

            this._performanceDisplay.update();
        } else if (defined(this._performanceDisplay)) {
            this._performanceDisplay = this._performanceDisplay && this._performanceDisplay.destroy();
            this._performanceContainer.parentNode.removeChild(this._performanceContainer);
        }

        context.endFrame();
        executeEvents(frameState);
    };

    var orthoPickingFrustum = new OrthographicFrustum();
    var scratchOrigin = new Cartesian3();
    var scratchDirection = new Cartesian3();
    var scratchBufferDimensions = new Cartesian2();
    var scratchPixelSize = new Cartesian2();

    function getPickOrthographicCullingVolume(scene, drawingBufferPosition, width, height) {
        var context = scene._context;
        var camera = scene._camera;
        var frustum = camera.frustum;

        var drawingBufferWidth = context.getDrawingBufferWidth();
        var drawingBufferHeight = context.getDrawingBufferHeight();

        var x = (2.0 / drawingBufferWidth) * drawingBufferPosition.x - 1.0;
        x *= (frustum.right - frustum.left) * 0.5;
        var y = (2.0 / drawingBufferHeight) * (drawingBufferHeight - drawingBufferPosition.y) - 1.0;
        y *= (frustum.top - frustum.bottom) * 0.5;

        var origin = Cartesian3.clone(camera.position, scratchOrigin);
        Cartesian3.multiplyByScalar(camera.right, x, scratchDirection);
        Cartesian3.add(scratchDirection, origin, origin);
        Cartesian3.multiplyByScalar(camera.up, y, scratchDirection);
        Cartesian3.add(scratchDirection, origin, origin);

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
        var context = scene._context;
        var camera = scene._camera;
        var frustum = camera.frustum;
        var near = frustum.near;

        var drawingBufferWidth = context.getDrawingBufferWidth();
        var drawingBufferHeight = context.getDrawingBufferHeight();

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
        if (scene.mode === SceneMode.SCENE2D) {
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
     * @memberof Scene
     *
     * @param {Cartesian2} windowPosition Window coordinates to perform picking on.
     *
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
        var us = this.context.getUniformState();
        var frameState = this._frameState;

        var drawingBufferPosition = SceneTransforms.transformWindowToDrawingBuffer(context, windowPosition, scratchPosition);

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
        scratchRectangle.y = (context.getDrawingBufferHeight() - drawingBufferPosition.y) - ((rectangleHeight - 1.0) * 0.5);

        executeCommands(this, this._pickFramebuffer.begin(scratchRectangle), scratchColorZero, true);
        var object = this._pickFramebuffer.end(scratchRectangle);
        context.endFrame();
        executeEvents(frameState);
        return object;
    };

    /**
     * Returns a list of objects, each containing a `primitive` property, for all primitives at
     * a particular window coordinate position. Other properties may also be set depending on the
     * type of primitive. The primitives in the list are ordered by their visual order in the
     * scene (front to back).
     *
     * @memberof Scene
     *
     * @param {Cartesian2} windowPosition Window coordinates to perform picking on.
     *
     * @returns {Array} Array of objects, each containing 1 picked primitives.
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

        var pickedObjects = [];

        var pickedResult = this.pick(windowPosition);
        while (defined(pickedResult) && defined(pickedResult.primitive)) {
            var primitive = pickedResult.primitive;
            pickedObjects.push(pickedResult);

            // hide the picked primitive and call picking again to get the next primitive
            if (defined(primitive.show)) {
                primitive.show = false;
            } else if (typeof primitive.setShow === 'function') {
                primitive.setShow(false);
            } else if (typeof primitive.getGeometryInstanceAttributes === 'function') {
                var attributes = primitive.getGeometryInstanceAttributes(pickedResult.id);
                if (defined(attributes) && defined(attributes.show)) {
                    attributes.show = ShowGeometryInstanceAttribute.toValue(false);
                }
            }

            pickedResult = this.pick(windowPosition);
        }

        // unhide the picked primitives
        for (var i = 0; i < pickedObjects.length; ++i) {
            var p = pickedObjects[i].primitive;
            if (defined(p.show)) {
                p.show = true;
            } else if (typeof p.setShow === 'function') {
                p.setShow(true);
            } else if (typeof p.getGeometryInstanceAttributes === 'function') {
                var attr = p.getGeometryInstanceAttributes(pickedObjects[i].id);
                if (defined(attr) && defined(attr.show)) {
                    attr.show = ShowGeometryInstanceAttribute.toValue(true);
                }
            }
        }

        return pickedObjects;
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.destroy = function() {
        this._animations.removeAll();
        this._screenSpaceCameraController = this._screenSpaceCameraController && this._screenSpaceCameraController.destroy();
        this._pickFramebuffer = this._pickFramebuffer && this._pickFramebuffer.destroy();
        this._primitives = this._primitives && this._primitives.destroy();
        this.skyBox = this.skyBox && this.skyBox.destroy();
        this.skyAtmosphere = this.skyAtmosphere && this.skyAtmosphere.destroy();
        this._debugSphere = this._debugSphere && this._debugSphere.destroy();
        this.sun = this.sun && this.sun.destroy();
        this._sunPostProcess = this._sunPostProcess && this._sunPostProcess.destroy();

        if (defined(this._compositeCommand)) {
            this._compositeCommand.shaderProgram = this._compositeCommand.shaderProgram && this._compositeCommand.shaderProgram.release();
        }

        this._opaqueFBO = this._opaqueFBO && !this._opaqueFBO.isDestroyed() && this._opaqueFBO.destroy();
        this._translucentFBO = this._translucentFBO && !this._translucentFBO.isDestroyed() && this._translucentFBO.destroy();
        this._alphaFBO = this._alphaFBO && !this._alphaFBO.isDestroyed() && this._alphaFBO.destroy();

        this._opaqueTexture = this._opaqueTexture && !this._opaqueTexture.isDestroyed() && this._opaqueTexture.destroy();
        this._accumulationTexture = this._accumulationTexture && !this._accumulationTexture.isDestroyed() && this._accumulationTexture.destroy();
        this._revealageTexture = this._revealageTexture && !this._revealageTexture.isDestroyed() && this._revealageTexture.destroy();
        this._depthTexture = this._depthTexture && !this._depthTexture.isDestroyed() && this._depthTexture.destroy();
        this._depthRenderbuffer = this._depthRenderbuffer && !this._depthRenderbuffer.isDestroyed() && this._depthRenderbuffer.destroy();

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
