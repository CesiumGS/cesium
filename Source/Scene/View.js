define([
        '../Core/BoundingRectangle',
        '../Core/Cartesian3',
        '../Core/CullingVolume',
        '../Core/defined',
        '../Core/getTimestamp',
        '../Core/Interval',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/OrthographicFrustum',
        '../Core/OrthographicOffCenterFrustum',
        '../Renderer/ClearCommand',
        '../Renderer/Pass',
        '../Renderer/PassState',
        './Camera',
        './FrustumCommands',
        './GlobeDepth',
        './OIT',
        './PickDepthFramebuffer',
        './PickFramebuffer',
        './SceneFramebuffer',
        './SceneMode',
        './ShadowMap'
    ], function(
        BoundingRectangle,
        Cartesian3,
        CullingVolume,
        defined,
        getTimestamp,
        Interval,
        CesiumMath,
        Matrix4,
        OrthographicFrustum,
        OrthographicOffCenterFrustum,
        ClearCommand,
        Pass,
        PassState,
        Camera,
        FrustumCommands,
        GlobeDepth,
        OIT,
        PickDepthFramebuffer,
        PickFramebuffer,
        SceneFramebuffer,
        SceneMode,
        ShadowMap) {
    'use strict';

    /**
     * @private
     */
    function View(scene, camera, viewport) {
        var context = scene.context;

        var frustumCommandsList = [];

        // Initial guess at frustums.
        var near = camera.frustum.near;
        var far = camera.frustum.far;
        var farToNearRatio = scene.logarithmicDepthBuffer ? scene.logarithmicDepthFarToNearRatio : scene.farToNearRatio;

        var numFrustums = Math.ceil(Math.log(far / near) / Math.log(farToNearRatio));
        updateFrustums(near, far, farToNearRatio, numFrustums, scene.logarithmicDepthBuffer, frustumCommandsList, false, undefined);

        var globeDepth;
        if (context.depthTexture) {
            globeDepth = new GlobeDepth();
        }

        var oit;
        if (scene._useOIT && context.depthTexture) {
            oit = new OIT(context);
        }

        var passState = new PassState(context);
        passState.viewport = BoundingRectangle.clone(viewport);

        this.camera = camera;
        this._cameraClone = Camera.clone(camera);
        this._cameraStartFired = false;
        this._cameraMovedTime = undefined;

        this.viewport = viewport;
        this.passState = passState;
        this.pickFramebuffer = new PickFramebuffer(context);
        this.pickDepthFramebuffer = new PickDepthFramebuffer();
        this.sceneFramebuffer = new SceneFramebuffer();
        this.globeDepth = globeDepth;
        this.oit = oit;
        this.pickDepths = [];
        this.debugGlobeDepths = [];
        this.frustumCommandsList = frustumCommandsList;
        this.debugFrustumStatistics = undefined;
        this.updateFrustums = false;
    }

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
               Matrix4.equalsEpsilon(camera0.transform, camera1.transform, epsilon) &&
               camera0.frustum.equalsEpsilon(camera1.frustum, epsilon);
    }

    View.prototype.checkForCameraUpdates = function(scene) {
        var camera = this.camera;
        var cameraClone = this._cameraClone;
        if (!cameraEqual(camera, cameraClone, CesiumMath.EPSILON15)) {
            if (!this._cameraStartFired) {
                camera.moveStart.raiseEvent();
                this._cameraStartFired = true;
            }
            this._cameraMovedTime = getTimestamp();
            Camera.clone(camera, cameraClone);

            return true;
        }

        if (this._cameraStartFired && getTimestamp() - this._cameraMovedTime > scene.cameraEventWaitTime) {
            camera.moveEnd.raiseEvent();
            this._cameraStartFired = false;
        }

        return false;
    };

    function updateFrustums(near, far, farToNearRatio, numFrustums, logDepth, frustumCommandsList, is2D, nearToFarDistance2D) {
        frustumCommandsList.length = numFrustums;
        for (var m = 0; m < numFrustums; ++m) {
            var curNear;
            var curFar;

            if (is2D) {
                curNear = Math.min(far - nearToFarDistance2D, near + m * nearToFarDistance2D);
                curFar = Math.min(far, curNear + nearToFarDistance2D);
            } else  {
                curNear = Math.max(near, Math.pow(farToNearRatio, m) * near);
                curFar = farToNearRatio * curNear;
                if (!logDepth) {
                    curFar = Math.min(far, curFar);
                }
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

    function insertIntoBin(scene, view, command, distance) {
        if (scene.debugShowFrustums) {
            command.debugOverlappingFrustums = 0;
        }

        var frustumCommandsList = view.frustumCommandsList;
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

            var pass = command.pass;
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
            var cf = view.debugFrustumStatistics.commandsInFrustums;
            cf[command.debugOverlappingFrustums] = defined(cf[command.debugOverlappingFrustums]) ? cf[command.debugOverlappingFrustums] + 1 : 1;
            ++view.debugFrustumStatistics.totalCommands;
        }

        scene.updateDerivedCommands(command);
    }

    var scratchCullingVolume = new CullingVolume();
    var distances = new Interval();

    View.prototype.createPotentiallyVisibleSet = function(scene) {
        var frameState = scene.frameState;
        var camera = frameState.camera;
        var direction = camera.directionWC;
        var position = camera.positionWC;

        var computeList = scene._computeCommandList;
        var overlayList = scene._overlayCommandList;
        var commandList = frameState.commandList;

        if (scene.debugShowFrustums) {
            this.debugFrustumStatistics = {
                totalCommands : 0,
                commandsInFrustums : {}
            };
        }

        var frustumCommandsList = this.frustumCommandsList;
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

        var shadowsEnabled = frameState.shadowState.shadowsEnabled;
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
                    if (!scene.isVisible(command, cullingVolume, occluder)) {
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

                insertIntoBin(scene, this, command, distances);
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
            frameState.shadowState.nearPlane = shadowNear;
            frameState.shadowState.farPlane = shadowFar;
            frameState.shadowState.closestObjectSize = shadowClosestObjectSize;
        }

        // Exploit temporal coherence. If the frustums haven't changed much, use the frustums computed
        // last frame, else compute the new frustums and sort them by frustum again.
        var is2D = scene.mode === SceneMode.SCENE2D;
        var logDepth = frameState.useLogDepth;
        var farToNearRatio = logDepth ? scene.logarithmicDepthFarToNearRatio : scene.farToNearRatio;
        var numFrustums;

        if (is2D) {
            // The multifrustum for 2D is uniformly distributed. To avoid z-fighting in 2D,
            // the camera is moved to just before the frustum and the frustum depth is scaled
            // to be in [1.0, nearToFarDistance2D].
            far = Math.min(far, camera.position.z + scene.nearToFarDistance2D);
            near = Math.min(near, far);
            numFrustums = Math.ceil(Math.max(1.0, far - near) / scene.nearToFarDistance2D);
        } else {
            // The multifrustum for 3D/CV is non-uniformly distributed.
            numFrustums = Math.ceil(Math.log(far / near) / Math.log(farToNearRatio));
        }

        if (this.updateFrustums || (near !== Number.MAX_VALUE && (numFrustums !== numberOfFrustums || (frustumCommandsList.length !== 0 &&
                (near < frustumCommandsList[0].near || (far > frustumCommandsList[numberOfFrustums - 1].far && (logDepth || !CesiumMath.equalsEpsilon(far, frustumCommandsList[numberOfFrustums - 1].far, CesiumMath.EPSILON8)))))))) {
            this.updateFrustums = false;
            updateFrustums(near, far, farToNearRatio, numFrustums, logDepth, frustumCommandsList, is2D, scene.nearToFarDistance2D);
            this.createPotentiallyVisibleSet(scene);
        }

        var frustumSplits = frameState.frustumSplits;
        frustumSplits.length = numFrustums + 1;
        for (var j = 0; j < numFrustums; ++j) {
            frustumSplits[j] = frustumCommandsList[j].near;
            if (j === numFrustums - 1) {
                frustumSplits[j + 1] = frustumCommandsList[j].far;
            }
        }
    };

    View.prototype.destroy = function() {
        this.pickFramebuffer = this.pickFramebuffer && this.pickFramebuffer.destroy();
        this.pickDepthFramebuffer = this.pickDepthFramebuffer && this.pickDepthFramebuffer.destroy();
        this.sceneFramebuffer = this.sceneFramebuffer && this.sceneFramebuffer.destroy();
        this.globeDepth = this.globeDepth && this.globeDepth.destroy();
        this.oit = this.oit && this.oit.destroy();

        var i;
        var length;

        var pickDepths = this.pickDepths;
        var debugGlobeDepths = this.debugGlobeDepths;

        length = pickDepths.length;
        for (i = 0; i < length; ++i) {
            pickDepths[i].destroy();
        }

        length = debugGlobeDepths.length;
        for (i = 0; i < length; ++i) {
            debugGlobeDepths[i].destroy();
        }
    };

    return View;
});
