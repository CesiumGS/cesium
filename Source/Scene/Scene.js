/*global define*/
define([
        '../Core/Math',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/GeographicProjection',
        '../Core/Ellipsoid',
        '../Core/DeveloperError',
        '../Core/Occluder',
        '../Core/BoundingRectangle',
        '../Core/BoundingSphere',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Intersect',
        '../Core/IntersectionTests',
        '../Core/Interval',
        '../Core/Matrix4',
        '../Core/JulianDate',
        '../Core/ComponentDatatype',
        '../Core/PrimitiveType',
        '../Renderer/BufferUsage',
        '../Renderer/Context',
        '../Renderer/ClearCommand',
        '../Renderer/DrawCommand',
        '../Renderer/PassState',
        '../Renderer/PixelDatatype',
        '../Renderer/PixelFormat',
        '../Renderer/RenderbufferFormat',
        '../Shaders/PostProcessFilters/AdditiveBlend',
        '../Shaders/PostProcessFilters/BrightPass',
        '../Shaders/PostProcessFilters/GaussianBlur1D',
        '../Shaders/PostProcessFilters/PassThrough',
        '../Shaders/ViewportQuadVS',
        './Camera',
        './ScreenSpaceCameraController',
        './CompositePrimitive',
        './CullingVolume',
        './AnimationCollection',
        './SceneMode',
        './FrameState',
        './OrthographicFrustum',
        './PerspectiveOffCenterFrustum',
        './FrustumCommands'
    ], function(
        CesiumMath,
        Color,
        defaultValue,
        destroyObject,
        GeographicProjection,
        Ellipsoid,
        DeveloperError,
        Occluder,
        BoundingRectangle,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Intersect,
        IntersectionTests,
        Interval,
        Matrix4,
        JulianDate,
        ComponentDatatype,
        PrimitiveType,
        BufferUsage,
        Context,
        ClearCommand,
        DrawCommand,
        PassState,
        PixelDatatype,
        PixelFormat,
        RenderbufferFormat,
        AdditiveBlend,
        BrightPass,
        GaussianBlur1D,
        PassThrough,
        ViewportQuadVS,
        Camera,
        ScreenSpaceCameraController,
        CompositePrimitive,
        CullingVolume,
        AnimationCollection,
        SceneMode,
        FrameState,
        OrthographicFrustum,
        PerspectiveOffCenterFrustum,
        FrustumCommands) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias Scene
     * @constructor
     */
    var Scene = function(canvas) {
        var context = new Context(canvas);

        this._frameState = new FrameState();
        this._passState = new PassState(context);
        this._canvas = canvas;
        this._context = context;
        this._primitives = new CompositePrimitive();
        this._pickFramebuffer = undefined;
        this._camera = new Camera(canvas);
        this._screenSpaceCameraController = new ScreenSpaceCameraController(canvas, this._camera.controller);

        this._animations = new AnimationCollection();

        this._shaderFrameCount = 0;

        this._renderSun = false;
        this._fbo = undefined;
        this._downSampleFBO1 = undefined;
        this._downSampleFBO2 = undefined;
        this._downSampleCommand = undefined;
        this._brightPassCommand = undefined;
        this._blurXCommand = undefined;
        this._blurYCommand = undefined;
        this._blendCommand = undefined;

        this._commandList = [];
        this._frustumCommandsList = [];

        this._clearColorCommand = new ClearCommand();
        this._clearColorCommand.color = new Color();

        var clearDepthStencilCommand = new ClearCommand();
        clearDepthStencilCommand.depth = 1.0;
        clearDepthStencilCommand.stencil = 1.0;
        this._clearDepthStencilCommand = clearDepthStencilCommand;

        /**
         * The {@link SkyBox} used to draw the stars.
         *
         * @type SkyBox
         *
         * @default undefined
         *
         * @see Scene#backgroundColor
         */
        this.skyBox = undefined;

        /**
         * The {@link Sun}.
         *
         * @type Sun
         *
         * @default undefined
         */
        this.sun = undefined;

        /**
         * The sky atmosphere drawn around the globe.
         *
         * @type SkyAtmosphere
         *
         * @default undefined
         */
        this.skyAtmosphere = undefined;

        /**
         * The background color, which is only visible if there is no sky box, i.e., {@link Scene#skyBox} is undefined.
         *
         * @type Color
         *
         * @default Color.BLACK
         *
         * @see Scene#skyBox
         */
        this.backgroundColor = Color.BLACK.clone();

        /**
         * The current mode of the scene.
         *
         * @type SceneMode
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
         * @type Number
         */
        this.morphTime = 1.0;
        /**
         * The far-to-near ratio of the multi-frustum. The default is 1,000.0.
         *
         * @type Number
         */
        this.farToNearRatio = 1000.0;

        // initial guess at frustums.
        var near = this._camera.frustum.near;
        var far = this._camera.frustum.far;
        var numFrustums = Math.ceil(Math.log(far / near) / Math.log(this.farToNearRatio));
        updateFrustums(near, far, this.farToNearRatio, numFrustums, this._frustumCommandsList);
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.getCanvas = function() {
        return this._canvas;
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.getContext = function() {
        return this._context;
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.getPrimitives = function() {
        return this._primitives;
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.getCamera = function() {
        return this._camera;
    };
    // TODO: setCamera

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.getScreenSpaceCameraController = function() {
        return this._screenSpaceCameraController;
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.getUniformState = function() {
        return this._context.getUniformState();
    };

    /**
     * Gets state information about the current scene. If called outside of a primitive's <code>update</code>
     * function, the previous frame's state is returned.
     *
     * @memberof Scene
     */
    Scene.prototype.getFrameState = function() {
        return this._frameState;
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.getAnimations = function() {
        return this._animations;
    };

    function clearPasses(passes) {
        passes.color = false;
        passes.pick = false;
        passes.overlay = false;
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
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.getPositionWC(), camera.getDirectionWC(), camera.getUpWC());
        frameState.occluder = undefined;
        frameState.canvasDimensions.x = scene._canvas.clientWidth;
        frameState.canvasDimensions.y = scene._canvas.clientHeight;

        // TODO: The occluder is the top-level central body. When we add
        //       support for multiple central bodies, this should be the closest one.
        var cb = scene._primitives.getCentralBody();
        if (scene.mode === SceneMode.SCENE3D && typeof cb !== 'undefined') {
            var ellipsoid = cb.getEllipsoid();
            var occluder = new Occluder(new BoundingSphere(Cartesian3.ZERO, ellipsoid.getMinimumRadius()), camera.getPositionWC());
            frameState.occluder = occluder;
        }

        clearPasses(frameState.passes);
    }

    function updateFrustums(near, far, farToNearRatio, numFrustums, frustumCommandsList) {
        frustumCommandsList.length = numFrustums;
        for (var m = 0; m < numFrustums; ++m) {
            var curNear = Math.max(near, Math.pow(farToNearRatio, m) * near);
            var curFar = Math.min(far, farToNearRatio * curNear);
            curNear *= 0.99;

            var frustumCommands = frustumCommandsList[m];
            if (typeof frustumCommands === 'undefined') {
                frustumCommands = frustumCommandsList[m] = new FrustumCommands(curNear, curFar);
            } else {
                frustumCommands.near = curNear;
                frustumCommands.far = curFar;
            }
        }
    }

    function insertIntoBin(scene, command, distance) {
        var frustumCommandsList = scene._frustumCommandsList;
        var length = frustumCommandsList.length;
        for (var i = 0; i < length; ++i) {
            var frustumCommands = frustumCommandsList[i];
            var curNear = frustumCommands.near;
            var curFar = frustumCommands.far;

            if (typeof distance !== 'undefined') {
                if (distance.start > curFar) {
                    continue;
                }

                if (distance.stop < curNear) {
                    break;
                }
            }

            // PERFORMANCE_IDEA: sort bins
            frustumCommands.commands[frustumCommands.index++] = command;

            if (command.executeInClosestFrustum) {
                break;
            }
        }
    }

    var scratchCullingVolume = new CullingVolume();
    var distances = new Interval();
    var sunBS = new BoundingSphere();

    function createPotentiallyVisibleSet(scene, listName) {
        var commandLists = scene._commandList;
        var cullingVolume = scene._frameState.cullingVolume;
        var camera = scene._camera;

        var direction = camera.getDirectionWC();
        var position = camera.getPositionWC();

        var frustumCommandsList = scene._frustumCommandsList;
        var frustumsLength = frustumCommandsList.length;
        for (var n = 0; n < frustumsLength; ++n) {
            frustumCommandsList[n].index = 0;
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
        for (var k = 0; k < 5; ++k) {
            planes[k] = cullingVolume.planes[k];
        }
        cullingVolume = scratchCullingVolume;

        Cartesian3.clone(scene.getUniformState().getSunPositionWC(), sunBS.center);
        scene._renderSun = (cullingVolume.getVisibility(sunBS) === Intersect.OUTSIDE) ? false : true;

        var length = commandLists.length;
        for (var i = 0; i < length; ++i) {
            var commandList = commandLists[i][listName];
            var commandListLength = commandList.length;
            for (var j = 0; j < commandListLength; ++j) {
                var command = commandList[j];
                var boundingVolume = command.boundingVolume;
                if (typeof boundingVolume !== 'undefined') {
                    var modelMatrix = defaultValue(command.modelMatrix, Matrix4.IDENTITY);
                    var transformedBV = boundingVolume.transform(modelMatrix);               //TODO: Remove this allocation.
                    if (command.cull &&
                            ((cullingVolume.getVisibility(transformedBV) === Intersect.OUTSIDE) ||
                             (typeof occluder !== 'undefined' && !occluder.isBoundingSphereVisible(transformedBV)))) {
                        continue;
                    }

                    distances = transformedBV.getPlaneDistances(position, direction, distances);
                    near = Math.min(near, distances.start);
                    far = Math.max(far, distances.stop);

                    insertIntoBin(scene, command, distances);
                } else {
                    // Clear commands don't need a bounding volume - just add the clear to all frustums.
                    // If another command has no bounding volume, though, we need to use the camera's
                    // worst-case near and far planes to avoid clipping something important.
                    undefBV = !(command instanceof ClearCommand);
                    insertIntoBin(scene, command);
                }
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
        if (near !== Number.MAX_VALUE && (numFrustums !== frustumsLength || (frustumCommandsList.length !== 0 &&
                (near < frustumCommandsList[0].near || far > frustumCommandsList[frustumsLength - 1].far)))) {
            updateFrustums(near, far, farToNearRatio, numFrustums, frustumCommandsList);
            createPotentiallyVisibleSet(scene, listName);
        }
    }

    function executeCommands(scene, passState) {
        var camera = scene._camera;
        var frustum = camera.frustum.clone();
        var context = scene._context;
        var us = context.getUniformState();
        var skyBoxCommand = typeof scene.skyBox !== 'undefined' ? scene.skyBox.update(context, scene._frameState) : undefined;
        var sunCommand = typeof scene.sun !== 'undefined' ? scene.sun.update(context, scene._frameState) : undefined;
        var skyAtmosphereCommand = typeof scene.skyAtmosphere !== 'undefined' ? scene.skyAtmosphere.update(context, scene._frameState) : undefined;

        var clear = scene._clearColorCommand;
        Color.clone(defaultValue(scene.backgroundColor, Color.BLACK), clear.color);
        clear.execute(context, passState);

        // Ideally, we would render the sky box and atmosphere last for
        // early-z, but we would have to draw it in each frustum
        frustum.near = camera.frustum.near;
        frustum.far = camera.frustum.far;
        us.updateFrustum(frustum);

        if (typeof skyBoxCommand !== 'undefined') {
            skyBoxCommand.execute(context, passState);
        }

        if (typeof skyAtmosphereCommand !== 'undefined') {
            skyAtmosphereCommand.execute(context, passState);
        }

        if (typeof sunCommand !== 'undefined' && scene._renderSun) {
            sunCommand.execute(context, passState);
        }

        var clearDepthStencil = scene._clearDepthStencilCommand;

        var frustumCommandsList = scene._frustumCommandsList;
        var numFrustums = frustumCommandsList.length;
        for (var i = 0; i < numFrustums; ++i) {
            clearDepthStencil.execute(context, passState);

            var index = numFrustums - i - 1.0;
            var frustumCommands = frustumCommandsList[index];
            frustum.near = frustumCommands.near;
            frustum.far = frustumCommands.far;

            us.updateFrustum(frustum);

            var commands = frustumCommands.commands;
            var length = frustumCommands.index;
            for (var j = 0; j < length; ++j) {
                commands[j].execute(context, passState);
            }
        }

        if (typeof sunCommand !== 'undefined' && scene._renderSun) {
            scene._downSampleCommand.execute(context);
            scene._brightPassCommand.execute(context);
            scene._blurXCommand.execute(context);
            scene._blurYCommand.execute(context);
            scene._blendCommand.execute(context);
        }
    }

    function executeOverlayCommands(scene, passState) {
        var context = scene._context;
        var commandLists = scene._commandList;
        var length = commandLists.length;
        for (var i = 0; i < length; ++i) {
            var commandList = commandLists[i].overlayList;
            var commandListLength = commandList.length;
            for (var j = 0; j < commandListLength; ++j) {
                commandList[j].execute(context, passState);
            }
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
        if (typeof time === 'undefined') {
            time = new JulianDate();
        }

        var us = this.getUniformState();
        var frameState = this._frameState;

        var frameNumber = CesiumMath.incrementWrap(frameState.frameNumber, 15000000.0, 1.0);
        updateFrameState(this, frameNumber, time);
        frameState.passes.color = true;
        frameState.passes.overlay = true;

        us.update(frameState);

        this._commandList.length = 0;
        this._primitives.update(this._context, frameState, this._commandList);

        createPotentiallyVisibleSet(this, 'colorList');

        var passState = this._passState;
        if (typeof this.sun !== 'undefined' && this._renderSun) {
            updatePostProcess(this);
            passState.framebuffer = this._fbo;
        } else {
            passState.framebuffer = undefined;
        }

        executeCommands(this, passState);
        executeOverlayCommands(this, passState);
    };

    var attributeIndices = {
        position : 0,
        textureCoordinates : 1
    };

    function getVertexArray(context) {
        // Per-context cache for viewport quads
        var vertexArray = context.cache.viewportQuad_vertexArray;

        if (typeof vertexArray !== 'undefined') {
            return vertexArray;
        }

        var mesh = {
            attributes : {
                position : {
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    values : [
                       -1.0, -1.0,
                        1.0, -1.0,
                        1.0,  1.0,
                       -1.0,  1.0
                    ]
                },

                textureCoordinates : {
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    values : [
                        0.0, 0.0,
                        1.0, 0.0,
                        1.0, 1.0,
                        0.0, 1.0
                    ]
                }
            }
        };

        vertexArray = context.createVertexArrayFromMesh({
            mesh : mesh,
            attributeIndices : attributeIndices,
            bufferUsage : BufferUsage.STATIC_DRAW
        });

        context.cache.viewportQuad_vertexArray = vertexArray;
        return vertexArray;
    }

    function updatePostProcess(scene) {
        var context = scene.getContext();
        var canvas = context.getCanvas();
        var width = canvas.clientWidth;
        var height = canvas.clientHeight;

        if (typeof scene._fbo === 'undefined') {
            scene._fbo = context.createFramebuffer();

            scene._downSampleFBO1 = context.createFramebuffer();
            scene._downSampleFBO2 = context.createFramebuffer();

            var primitiveType = PrimitiveType.TRIANGLE_FAN;
            var vertexArray = getVertexArray(context);

            var downSampleCommand = scene._downSampleCommand = new DrawCommand();
            downSampleCommand.primitiveType = primitiveType;
            downSampleCommand.vertexArray = vertexArray;
            downSampleCommand.shaderProgram = context.getShaderCache().getShaderProgram(ViewportQuadVS, PassThrough, attributeIndices);
            downSampleCommand.uniformMap = {};
            downSampleCommand.framebuffer = scene._downSampleFBO1;

            var brightPassCommand = scene._brightPassCommand = new DrawCommand();
            brightPassCommand.primitiveType = primitiveType;
            brightPassCommand.vertexArray = vertexArray;
            brightPassCommand.shaderProgram = context.getShaderCache().getShaderProgram(ViewportQuadVS, BrightPass, attributeIndices);
            brightPassCommand.uniformMap = {
                u_avgLuminance : function() {
                    return 0.5;
                },
                u_threshold : function() {
                    return 0.25;
                },
                u_offset : function() {
                    return 0.1;
                }
            };
            brightPassCommand.framebuffer = scene._downSampleFBO2;

            var delta = 1.0;
            var sigma = 2.0;

            var blurXCommand = scene._blurXCommand = new DrawCommand();
            blurXCommand.primitiveType = primitiveType;
            blurXCommand.vertexArray = vertexArray;
            blurXCommand.shaderProgram = context.getShaderCache().getShaderProgram(ViewportQuadVS, GaussianBlur1D, attributeIndices);
            blurXCommand.uniformMap = {
                delta : function() {
                    return delta;
                },
                sigma : function() {
                    return sigma;
                },
                direction : function() {
                    return 0.0;
                }
            };
            blurXCommand.framebuffer = scene._downSampleFBO1;

            var blurYCommand = scene._blurYCommand = new DrawCommand();
            blurYCommand.primitiveType = primitiveType;
            blurYCommand.vertexArray = vertexArray;
            blurYCommand.shaderProgram = context.getShaderCache().getShaderProgram(ViewportQuadVS, GaussianBlur1D, attributeIndices);
            blurYCommand.uniformMap = {
                delta : function() {
                    return delta;
                },
                sigma : function() {
                    return sigma;
                },
                direction : function() {
                    return 1.0;
                }
            };
            blurYCommand.framebuffer = scene._downSampleFBO2;

            var additiveBlendCommand = scene._blendCommand = new DrawCommand();
            additiveBlendCommand.primitiveType = primitiveType;
            additiveBlendCommand.vertexArray = vertexArray;
            additiveBlendCommand.renderState = context.createRenderState();
            additiveBlendCommand.shaderProgram = context.getShaderCache().getShaderProgram(ViewportQuadVS, AdditiveBlend, attributeIndices);
        }

        var downSampleWidth = Math.pow(2.0, Math.ceil(Math.log(width) / Math.log(2)) - 2.0);
        var downSampleHeight = Math.pow(2.0, Math.ceil(Math.log(height) / Math.log(2)) - 2.0);
        var downSampleSize = Math.max(downSampleWidth, downSampleHeight);

        var fbo = scene._fbo;
        var colorTexture = fbo.getColorTexture();
        if (typeof colorTexture === 'undefined' || colorTexture.getWidth() !== width || colorTexture.getHeight() !== height) {
            fbo.setColorTexture(context.createTexture2D({
                width : width,
                height : height
            }));

            if (context.getDepthTexture()) {
                fbo.setDepthTexture(context.createTexture2D({
                    width : width,
                    height : height,
                    pixelFormat : PixelFormat.DEPTH_COMPONENT,
                    pixelDatatype : PixelDatatype.UNSIGNED_SHORT
                }));
            } else {
                fbo.setDepthRenderbuffer(context.createRenderbuffer({
                    format : RenderbufferFormat.DEPTH_COMPONENT16
                }));
            }

            scene._downSampleFBO1.setColorTexture(context.createTexture2D({
                width : downSampleSize,
                height : downSampleSize
            }));
            scene._downSampleFBO2.setColorTexture(context.createTexture2D({
                width : downSampleSize,
                height : downSampleSize
            }));

            var renderState = context.createRenderState({
                viewport : new BoundingRectangle(0.0, 0.0, downSampleSize, downSampleSize)
            });

            scene._downSampleCommand.renderState = renderState;
            scene._downSampleCommand.uniformMap.u_texture = function() {
                return fbo.getColorTexture();
            };

            scene._brightPassCommand.renderState = renderState;
            scene._brightPassCommand.uniformMap.u_texture = function() {
                return scene._downSampleFBO1.getColorTexture();
            };

            scene._blurXCommand.renderState = renderState;
            scene._blurXCommand.uniformMap.u_texture = function() {
                return scene._downSampleFBO2.getColorTexture();
            };
            scene._blurXCommand.uniformMap.u_step = function() {
                return new Cartesian2(1.0 / downSampleSize, 1.0 / downSampleSize);
            };

            scene._blurYCommand.renderState = renderState;
            scene._blurYCommand.uniformMap.u_texture = function() {
                return scene._downSampleFBO1.getColorTexture();
            };
            scene._blurYCommand.uniformMap.u_step = function() {
                return new Cartesian2(1.0 / downSampleSize, 1.0 / downSampleSize);
            };

            scene._blendCommand.uniformMap = {
                u_texture0 : function() {
                    return fbo.getColorTexture();
                },
                u_texture1 : function() {
                    return scene._downSampleFBO2.getColorTexture();
                }
            };
        }
    }

    var orthoPickingFrustum = new OrthographicFrustum();
    function getPickOrthographicCullingVolume(scene, windowPosition, width, height) {
        var canvas = scene._canvas;
        var camera = scene._camera;
        var frustum = camera.frustum;

        var canvasWidth = canvas.clientWidth;
        var canvasHeight = canvas.clientHeight;

        var x = (2.0 / canvasWidth) * windowPosition.x - 1.0;
        x *= (frustum.right - frustum.left) * 0.5;
        var y = (2.0 / canvasHeight) * (canvasHeight - windowPosition.y) - 1.0;
        y *= (frustum.top - frustum.bottom) * 0.5;

        var position = camera.position;
        position = new Cartesian3(position.z, position.x, position.y);
        position.y += x;
        position.z += y;

        var pixelSize = frustum.getPixelSize(new Cartesian2(canvasWidth, canvasHeight));

        var ortho = orthoPickingFrustum;
        ortho.right = pixelSize.x * 0.5;
        ortho.left = -ortho.right;
        ortho.top = pixelSize.y * 0.5;
        ortho.bottom = -ortho.top;
        ortho.near = frustum.near;
        ortho.far = frustum.far;

        return ortho.computeCullingVolume(position, camera.getDirectionWC(), camera.getUpWC());
    }

    var perspPickingFrustum = new PerspectiveOffCenterFrustum();
    function getPickPerspectiveCullingVolume(scene, windowPosition, width, height) {
        var canvas = scene._canvas;
        var camera = scene._camera;
        var frustum = camera.frustum;
        var near = frustum.near;

        var canvasWidth = canvas.clientWidth;
        var canvasHeight = canvas.clientHeight;

        var tanPhi = Math.tan(frustum.fovy * 0.5);
        var tanTheta = frustum.aspectRatio * tanPhi;

        var x = (2.0 / canvasWidth) * windowPosition.x - 1.0;
        var y = (2.0 / canvasHeight) * (canvasHeight - windowPosition.y) - 1.0;

        var xDir = x * near * tanTheta;
        var yDir = y * near * tanPhi;

        var pixelSize = frustum.getPixelSize(new Cartesian2(canvasWidth, canvasHeight));
        var pickWidth = pixelSize.x * width * 0.5;
        var pickHeight = pixelSize.y * height * 0.5;

        var offCenter = perspPickingFrustum;
        offCenter.top = yDir + pickHeight;
        offCenter.bottom = yDir - pickHeight;
        offCenter.right = xDir + pickWidth;
        offCenter.left = xDir - pickWidth;
        offCenter.near = near;
        offCenter.far = frustum.far;

        return offCenter.computeCullingVolume(camera.getPositionWC(), camera.getDirectionWC(), camera.getUpWC());
    }

    function getPickCullingVolume(scene, windowPosition, width, height) {
        if (scene.mode === SceneMode.SCENE2D) {
            return getPickOrthographicCullingVolume(scene, windowPosition, width, height);
        }

        return getPickPerspectiveCullingVolume(scene, windowPosition, width, height);
    }

    // pick rectangle width and height, assumed odd
    var rectangleWidth = 3.0;
    var rectangleHeight = 3.0;
    var scratchRectangle = new BoundingRectangle(0.0, 0.0, rectangleWidth, rectangleHeight);

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.pick = function(windowPosition) {
        var context = this._context;
        var primitives = this._primitives;
        var frameState = this._frameState;

        if (typeof this._pickFramebuffer === 'undefined') {
            this._pickFramebuffer = context.createPickFramebuffer();
        }

        // Update with previous frame's number and time, assuming that render is called before picking.
        updateFrameState(this, frameState.frameNumber, frameState.time);
        frameState.cullingVolume = getPickCullingVolume(this, windowPosition, rectangleWidth, rectangleHeight);
        frameState.passes.pick = true;

        var commandLists = this._commandList;
        commandLists.length = 0;
        primitives.update(context, frameState, commandLists);
        createPotentiallyVisibleSet(this, 'pickList');

        scratchRectangle.x = windowPosition.x - ((rectangleWidth - 1.0) * 0.5);
        scratchRectangle.y = (this._canvas.clientHeight - windowPosition.y) - ((rectangleHeight - 1.0) * 0.5);

        executeCommands(this, this._pickFramebuffer.begin(scratchRectangle));
        return this._pickFramebuffer.end(scratchRectangle);
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
        this._screenSpaceCameraController = this._screenSpaceCameraController && this._screenSpaceCameraController.destroy();
        this._pickFramebuffer = this._pickFramebuffer && this._pickFramebuffer.destroy();
        this._primitives = this._primitives && this._primitives.destroy();
        this.skyBox = this.skyBox && this.skyBox.destroy();
        this.skyAtmosphere = this.skyAtmosphere && this.skyAtmosphere.destroy();
        this.sun = this.sun && this.sun.destroy();
        this._fbo = this._fbo && this._fbo.destroy();
        this._downSampleFBO1 = this._downSampleFBO1 && this._downSampleFBO1.destroy();
        this._downSampleFBO2 = this._downSampleFBO2 && this._downSampleFBO2.destroy();
        this._downSampleCommand = this._downSampleCommand && this._downSampleCommand.shaderProgram && this._downSampleCommand.release();
        this._brightPassCommand = this._brightPassCommand && this._brightPassCommand.shaderProgram && this._brightPassCommand.release();
        this._blurXCommand = this._blurXCommand && this._blurXCommand.shaderProgram && this._blurXCommand.release();
        this._blurYCommand = this._blurYCommand && this._blurYCommand.shaderProgram && this._blurYCommand.release();
        this._blendCommand = this._blendCommand && this._blendCommand.shaderProgram && this._blendCommand.release();
        this._context = this._context && this._context.destroy();
        return destroyObject(this);
    };

    return Scene;
});
