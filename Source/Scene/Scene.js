/*global define*/
define([
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/EquidistantCylindricalProjection',
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
        '../Renderer/Context',
        '../Renderer/Command',
        './Camera',
        './CompositePrimitive',
        './CullingVolume',
        './AnimationCollection',
        './SceneMode',
        './FrameState',
        './OrthographicFrustum',
        './PerspectiveOffCenterFrustum'
    ], function(
        Color,
        defaultValue,
        destroyObject,
        EquidistantCylindricalProjection,
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
        Context,
        Command,
        Camera,
        CompositePrimitive,
        CullingVolume,
        AnimationCollection,
        SceneMode,
        FrameState,
        OrthographicFrustum,
        PerspectiveOffCenterFrustum) {
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
        this._canvas = canvas;
        this._context = context;
        this._primitives = new CompositePrimitive();
        this._pickFramebuffer = undefined;
        this._camera = new Camera(canvas);

        this._animate = undefined; // Animation callback
        this._animations = new AnimationCollection();

        this._shaderFrameCount = 0;

        this._near = this._camera.frustum.near;
        this._far = this._camera.frustum.far;

        this._commandList = [];
        this._renderList = [];
        this._frustumCommands = [];
        this._useBins = false;

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
            projection : new EquidistantCylindricalProjection(Ellipsoid.WGS84)
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
    Scene.prototype.getUniformState = function() {
        return this._context.getUniformState();
    };

    /**
     * Gets state information about the current scene.
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

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.setSunPosition = function(sunPosition) {
        this.getUniformState().setSunPosition(sunPosition);
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.getSunPosition = function() {
        return this.getUniformState().getSunPosition();
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.setAnimation = function(animationCallback) {
        this._animate = animationCallback;
    };

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.getAnimation = function() {
        return this._animate;
    };

    function clearPasses(passes) {
        passes.color = false;
        passes.pick = false;
        passes.overlay = false;
    }

    function updateFrameState(scene) {
        var camera = scene._camera;

        var frameState = scene._frameState;
        frameState.mode = scene.mode;
        frameState.scene2D = scene.scene2D;
        frameState.camera = camera;
        frameState.cullingVolume = camera.frustum.computeCullingVolume(camera.getPositionWC(), camera.getDirectionWC(), camera.getUpWC());
        frameState.occluder = undefined;

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

    function update(scene) {
        var us = scene.getUniformState();
        var camera = scene._camera;

        // Destroy released shaders once every 120 frames to avoid thrashing the cache
        if (scene._shaderFrameCount++ === 120) {
            scene._shaderFrameCount = 0;
            scene._context.getShaderCache().destroyReleasedShaderPrograms();
        }

        scene._animations.update();
        camera.update();
        us.setView(camera.getViewMatrix());
        us.setProjection(camera.frustum.getProjectionMatrix());
        if (camera.frustum.getInfiniteProjectionMatrix) {
            us.setInfiniteProjection(camera.frustum.getInfiniteProjectionMatrix());
        }

        if (scene._animate) {
            scene._animate();
        }

        updateFrameState(scene);
        scene._frameState.passes.color = true;
        scene._frameState.passes.overlay = true;

        scene._commandList.length = 0;
        scene._primitives.update(scene._context, scene._frameState, scene._commandList);
    }

    function insertIntoBin(scene, command, distance) {
        var frustumCommands = scene._frustumCommands;
        var length = frustumCommands.length;
        if (length === 0 || frustumCommands[length - 1].far < frustumCommands.near) {
            return;
        }

        for (var i = 0; i < length; ++i) {
            var curNear = frustumCommands[i].near;
            var curFar = frustumCommands[i].far;

            if (typeof distance !== 'undefined') {
                if (distance.start > curFar) {
                    continue;
                }

                if (distance.stop < curNear) {
                    break;
                }
            }

            // PERFORMANCE_IDEA: sort bins
            frustumCommands[i].push(command);
        }
    }

    var scratchCullingVolume = new CullingVolume();
    var distances = new Interval();
    function createPotentiallyVisibleSet(scene, listName) {
        var commandLists = scene._commandList;
        var cullingVolume = scene._frameState.cullingVolume;
        var camera = scene._camera;

        var direction = camera.getDirectionWC();
        var position = camera.getPositionWC();

        var renderList = scene._renderList;
        renderList.length = 0;

        var frustumCommands = scene._frustumCommands;
        var frustumsLength = frustumCommands.length;
        if (scene._useBins) {
            for (var n = 0; n < frustumsLength; ++n) {
                frustumCommands[n].length = 0;
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
        for (var k = 0; k < 5; ++k) {
            planes[k] = cullingVolume.planes[k];
        }
        cullingVolume = scratchCullingVolume;

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
                    if (cullingVolume.getVisibility(transformedBV) === Intersect.OUTSIDE ||
                            (typeof occluder !== 'undefined' && !occluder.isVisible(transformedBV))) {
                        continue;
                    }

                    renderList.push(command);

                    distances = transformedBV.getPlaneDistances(position, direction, distances);
                    near = Math.min(near, distances.start);
                    far = Math.max(far, distances.stop);

                    insertIntoBin(scene, command, distances);
                } else {
                    undefBV = true;
                    renderList.push(command);
                    insertIntoBin(scene, command);
                }
            }
        }

        if (undefBV) {
            near = camera.frustum.near;
            far = camera.frustum.far;
        } else {
            near = Math.max(near, camera.frustum.near);
            far = Math.min(far, camera.frustum.far);
        }

        scene._near = near;
        scene._far = far;

        // Exploit temporal coherence. If the frustums haven't changed much, use the frustums computed
        // last frame.
        var farToNearRatio = scene.farToNearRatio;
        var numFrustums = Math.ceil(Math.log(far / near) / Math.log(farToNearRatio));
        if (frustumsLength !== 0 && numFrustums === frustumsLength &&
                near >= frustumCommands[0].near && far <= frustumCommands[frustumsLength - 1].far) {
            scene._useBins = true;
        } else {
            scene._useBins = false;

            frustumCommands.length = numFrustums;
            for (var m = 0; m < numFrustums; ++m) {
                var frustum = frustumCommands[m];
                if (typeof frustum === 'undefined') {
                    frustum = frustumCommands[m] = [];
                } else {
                    frustum.length = 0;
                }

                frustum.near = Math.pow(farToNearRatio, m) * near;
                frustum.far = farToNearRatio * frustum.near;
            }
        }
    }

    var scratchNearPlane = new Cartesian4();
    var scratchFarPlane = new Cartesian4();
    var scratchRenderCartesian3 = new Cartesian3();
    var drawCommand = new Command();
    function renderPrimitives(scene, framebuffer) {
        var farToNearRatio = scene.farToNearRatio;
        var camera = scene._camera;
        var frustum = camera.frustum.clone();

        var context = scene._context;
        var us = context.getUniformState();
        var clearColor = context.createClearState({
            color : Color.BLACK
        });
        var clearDepth = context.createClearState({
            depth : 1.0
        });
        context.clear(clearColor);

        var numFrustums;
        var near;
        var far;
        var length;

        if (scene._useBins) {
            var frustumCommands = scene._frustumCommands;

            numFrustums = frustumCommands.length;
            for (var i = 0; i < numFrustums; ++i) {
                context.clear(clearDepth);

                var index = numFrustums - i - 1.0;
                var commands = frustumCommands[index];
                frustum.near = commands.near;
                frustum.far = commands.far;

                us.setProjection(frustum.getProjectionMatrix());
                if (frustum.getInfiniteProjectionMatrix) {
                    us.setInfiniteProjection(frustum.getInfiniteProjectionMatrix());
                }

                if (typeof commands !== 'undefined') {
                    length = commands.length;
                    for (var j = 0; j < length; ++j) {
                        var command = commands[j];
                        drawCommand.primitiveType = command.primitiveType;
                        drawCommand.vertexArray = command.vertexArray;
                        drawCommand.count = command.count;
                        drawCommand.offset = command.offset;
                        drawCommand.shaderProgram = command.shaderProgram;
                        drawCommand.uniformMap = command.uniformMap;
                        drawCommand.renderState = command.renderState;
                        drawCommand.framebuffer = defaultValue(command.framebuffer, framebuffer);
                        drawCommand.boundingVolume = command.boundingVolume;
                        drawCommand.modelMatrix = command.modelMatrix;

                        context.draw(drawCommand);
                    }
                }
            }
        } else {
            var renderList = scene._renderList;

            near = scene._near;
            far = scene._far;

            var direction = camera.getDirectionWC();
            var position = camera.getPositionWC();

            var nearPlane = scratchNearPlane;
            nearPlane.x = direction.x;
            nearPlane.y = direction.y;
            nearPlane.z = direction.z;

            var farPlane = scratchFarPlane;
            farPlane.x = -direction.x;
            farPlane.y = -direction.y;
            farPlane.z = -direction.z;

            numFrustums = Math.ceil(Math.log(far / near) / Math.log(farToNearRatio));
            for (var p = 0; p < numFrustums; ++p) {
                context.clear(clearDepth);
                frustum.near = Math.pow(farToNearRatio, numFrustums - p - 1.0) * near;
                frustum.far = frustum.near * farToNearRatio;

                us.setProjection(frustum.getProjectionMatrix());
                if (frustum.getInfiniteProjectionMatrix) {
                    us.setInfiniteProjection(frustum.getInfiniteProjectionMatrix());
                }

                // compute near plane
                var nearCenter = scratchRenderCartesian3;
                Cartesian3.multiplyByScalar(direction, frustum.near, nearCenter);
                Cartesian3.add(position, nearCenter, nearCenter);
                nearPlane.w = -Cartesian3.dot(direction, nearCenter);

                // compute far plane
                var farCenter = scratchRenderCartesian3;
                Cartesian3.multiplyByScalar(direction, frustum.far, farCenter);
                Cartesian3.add(position, farCenter, farCenter);
                farPlane.w = -Cartesian3.dot(farPlane, farCenter);

                length = renderList.length;
                for (var q = 0; q < length; ++q) {
                    var renderCommand = renderList[q];

                    var boundingVolume = renderCommand.boundingVolume;
                    if (typeof boundingVolume !== 'undefined') {
                        var modelMatrix = defaultValue(renderCommand.modelMatrix, Matrix4.IDENTITY);
                        var transformedBV = boundingVolume.transform(modelMatrix); //MULTIFRUSTUM TODO: Remove this allocation.

                        if (transformedBV.intersect(farPlane) === Intersect.OUTSIDE) {
                            continue; // MULTIFURSTUM TODO: discard command
                        }

                        var nearIntersect = transformedBV.intersect(nearPlane);
                        if (nearIntersect === Intersect.OUTSIDE) {
                            continue;
                        }

                        drawCommand.primitiveType = renderCommand.primitiveType;
                        drawCommand.vertexArray = renderCommand.vertexArray;
                        drawCommand.count = renderCommand.count;
                        drawCommand.offset = renderCommand.offset;
                        drawCommand.shaderProgram = renderCommand.shaderProgram;
                        drawCommand.uniformMap = renderCommand.uniformMap;
                        drawCommand.renderState = renderCommand.renderState;
                        drawCommand.framebuffer = defaultValue(renderCommand.framebuffer, framebuffer);
                        drawCommand.boundingVolume = renderCommand.boundingVolume;
                        drawCommand.modelMatrix = renderCommand.modelMatrix;

                        context.draw(drawCommand);

                        if (nearIntersect === Intersect.INSIDE) {
                            renderList.splice(q, 1);
                            length = renderList.length;
                            --q;
                        }
                    } else {
                        drawCommand.primitiveType = renderCommand.primitiveType;
                        drawCommand.vertexArray = renderCommand.vertexArray;
                        drawCommand.count = renderCommand.count;
                        drawCommand.offset = renderCommand.offset;
                        drawCommand.shaderProgram = renderCommand.shaderProgram;
                        drawCommand.uniformMap = renderCommand.uniformMap;
                        drawCommand.renderState = renderCommand.renderState;
                        drawCommand.framebuffer = defaultValue(renderCommand.framebuffer, framebuffer);
                        drawCommand.boundingVolume = renderCommand.boundingVolume;
                        drawCommand.modelMatrix = renderCommand.modelMatrix;

                        context.draw(drawCommand);
                    }
                }
            }
        }
    }

    function renderOverlays(scene) {
        var context = scene._context;
        var commandLists = scene._commandList;
        var length = commandLists.length;
        for (var i = 0; i < length; ++i) {
            var commandList = commandLists[i].overlayList;
            var commandListLength = commandList.length;
            for (var j = 0; j < commandListLength; ++j) {
                var command = commandList[j];
                context.draw(command);
            }
        }
    }

    /**
     * DOC_TBA
     * @memberof Scene
     */
    Scene.prototype.render = function() {
        update(this);
        createPotentiallyVisibleSet(this, 'colorList');
        renderPrimitives(this);
        renderOverlays(this);
    };

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

        this._pickFramebuffer = this._pickFramebuffer || context.createPickFramebuffer();
        var fb = this._pickFramebuffer.begin();

        updateFrameState(this);
        frameState.cullingVolume = getPickCullingVolume(this, windowPosition, rectangleWidth, rectangleHeight);
        frameState.passes.pick = true;

        var commandLists = this._commandList;
        commandLists.length = 0;
        primitives.update(context, frameState, commandLists);

        createPotentiallyVisibleSet(this, 'pickList');
        renderPrimitives(this, fb);

        scratchRectangle.x = windowPosition.x - ((rectangleWidth - 1.0) * 0.5);
        scratchRectangle.y = (this._canvas.clientHeight - windowPosition.y) - ((rectangleHeight - 1.0) * 0.5);
        return this._pickFramebuffer.end(scratchRectangle);
    };

    /**
     * Pick an ellipsoid or map.
     *
     * @memberof Scene
     *
     * @param {Cartesian2} windowPosition The x and y coordinates of a pixel.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to pick.
     *
     * @exception {DeveloperError} windowPosition is required.
     *
     * @return {Cartesian3} If the ellipsoid or map was picked, returns the point on the surface of the ellipsoid or map
     * in world coordinates. If the ellipsoid or map was not picked, returns undefined.
     */
    Scene.prototype.pickEllipsoid = function(windowPosition, ellipsoid) {
        if (typeof windowPosition === 'undefined') {
            throw new DeveloperError('windowPosition is required.');
        }

        ellipsoid = ellipsoid || Ellipsoid.WGS84;

        var p;
        if (this.mode === SceneMode.SCENE3D) {
            p = this._camera.pickEllipsoid(windowPosition, ellipsoid);
        } else if (this.mode === SceneMode.SCENE2D) {
            p = this._camera.pickMap2D(windowPosition, this.scene2D.projection);
        } else if (this.mode === SceneMode.COLUMBUS_VIEW) {
            p = this._camera.pickMapColumbusView(windowPosition, this.scene2D.projection);
        }

        return p;
    };

    /**
     * View an extent on an ellipsoid or map.
     *
     * @memberof Scene
     *
     * @param {Extent} extent The extent to view.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to view.
     *
     * @exception {DeveloperError} extent is required.
     */
    Scene.prototype.viewExtent = function(extent, ellipsoid) {
        if (typeof extent === 'undefined') {
            throw new DeveloperError('extent is required.');
        }

        ellipsoid = ellipsoid || Ellipsoid.WGS84;

        if (this.mode === SceneMode.SCENE3D) {
            this._camera.viewExtent(extent, ellipsoid);
        } else if (this.mode === SceneMode.SCENE2D) {
            this._camera.viewExtent2D(extent, this.scene2D.projection);
        } else if (this.mode === SceneMode.COLUMBUS_VIEW) {
            this._camera.viewExtentColumbusView(extent, this.scene2D.projection);
        }
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
        this._camera = this._camera && this._camera.destroy();
        this._pickFramebuffer = this._pickFramebuffer && this._pickFramebuffer.destroy();
        this._primitives = this._primitives && this._primitives.destroy();
        this._context = this._context && this._context.destroy();
        return destroyObject(this);
    };

    return Scene;
});
