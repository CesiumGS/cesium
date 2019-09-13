define([
        '../Core/ApproximateTerrainHeights',
        '../Core/BoundingRectangle',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/Check',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/Matrix4',
        '../Core/OrthographicFrustum',
        '../Core/OrthographicOffCenterFrustum',
        '../Core/PerspectiveFrustum',
        '../Core/PerspectiveOffCenterFrustum',
        '../Core/Ray',
        '../Core/ShowGeometryInstanceAttribute',
        '../ThirdParty/when',
        './Cesium3DTileFeature',
        './Cesium3DTilePass',
        './Cesium3DTilePassState',
        './Cesium3DTileset',
        './PickDepth',
        './PrimitiveCollection',
        './SceneMode',
        './SceneTransforms'
    ], function(
        ApproximateTerrainHeights,
        BoundingRectangle,
        Cartesian2,
        Cartesian3,
        Cartographic,
        Check,
        Color,
        defaultValue,
        defined,
        DeveloperError,
        Matrix4,
        OrthographicFrustum,
        OrthographicOffCenterFrustum,
        PerspectiveFrustum,
        PerspectiveOffCenterFrustum,
        Ray,
        ShowGeometryInstanceAttribute,
        when,
        Cesium3DTileFeature,
        Cesium3DTilePass,
        Cesium3DTilePassState,
        Cesium3DTileset,
        PickDepth,
        PrimitiveCollection,
        SceneMode,
        SceneTransforms
    ) {
    'use strict';

    /**
     * @private
     */
    var Picking = {};

    var mostDetailedPreloadTilesetPassState = new Cesium3DTilePassState({
        pass : Cesium3DTilePass.MOST_DETAILED_PRELOAD
    });

    var mostDetailedPickTilesetPassState = new Cesium3DTilePassState({
        pass : Cesium3DTilePass.MOST_DETAILED_PICK
    });

    var pickTilesetPassState = new Cesium3DTilePassState({
        pass : Cesium3DTilePass.PICK
    });

    Picking.getPickDepth = function(scene, index) {
        var pickDepths = scene._view.pickDepths;
        var pickDepth = pickDepths[index];
        if (!defined(pickDepth)) {
            pickDepth = new PickDepth();
            pickDepths[index] = pickDepth;
        }
        return pickDepth;
    };

    var scratchOrthoPickingFrustum = new OrthographicOffCenterFrustum();
    var scratchOrigin = new Cartesian3();
    var scratchDirection = new Cartesian3();
    var scratchPixelSize = new Cartesian2();
    var scratchPickVolumeMatrix4 = new Matrix4();

    function getPickOrthographicCullingVolume(scene, drawingBufferPosition, width, height, viewport) {
        var camera = scene.camera;
        var frustum = camera.frustum;
        if (defined(frustum._offCenterFrustum)) {
            frustum = frustum._offCenterFrustum;
        }

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

        var ortho = scratchOrthoPickingFrustum;
        ortho.right = pixelSize.x * 0.5;
        ortho.left = -ortho.right;
        ortho.top = pixelSize.y * 0.5;
        ortho.bottom = -ortho.top;
        ortho.near = frustum.near;
        ortho.far = frustum.far;

        return ortho.computeCullingVolume(origin, camera.directionWC, camera.upWC);
    }

    var scratchPerspPickingFrustum = new PerspectiveOffCenterFrustum();

    function getPickPerspectiveCullingVolume(scene, drawingBufferPosition, width, height, viewport) {
        var camera = scene.camera;
        var frustum = camera.frustum;
        var near = frustum.near;

        var tanPhi = Math.tan(frustum.fovy * 0.5);
        var tanTheta = frustum.aspectRatio * tanPhi;

        var x = 2.0 * (drawingBufferPosition.x - viewport.x) / viewport.width - 1.0;
        var y = 2.0 * (viewport.height - drawingBufferPosition.y - viewport.y) / viewport.height - 1.0;

        var xDir = x * near * tanTheta;
        var yDir = y * near * tanPhi;

        var pixelSize = frustum.getPixelDimensions(viewport.width, viewport.height, 1.0, scratchPixelSize);
        var pickWidth = pixelSize.x * width * 0.5;
        var pickHeight = pixelSize.y * height * 0.5;

        var offCenter = scratchPerspPickingFrustum;
        offCenter.top = yDir + pickHeight;
        offCenter.bottom = yDir - pickHeight;
        offCenter.right = xDir + pickWidth;
        offCenter.left = xDir - pickWidth;
        offCenter.near = near;
        offCenter.far = frustum.far;

        return offCenter.computeCullingVolume(camera.positionWC, camera.directionWC, camera.upWC);
    }

    function getPickCullingVolume(scene, drawingBufferPosition, width, height, viewport) {
        var frustum = scene.camera.frustum;
        if (frustum instanceof OrthographicFrustum || frustum instanceof OrthographicOffCenterFrustum) {
            return getPickOrthographicCullingVolume(scene, drawingBufferPosition, width, height, viewport);
        }

        return getPickPerspectiveCullingVolume(scene, drawingBufferPosition, width, height, viewport);
    }

    // pick rectangle width and height, assumed odd
    var rectangleWidth = 3.0;
    var rectangleHeight = 3.0;
    var scratchRectangle = new BoundingRectangle(0.0, 0.0, rectangleWidth, rectangleHeight);
    var scratchColorZero = new Color(0.0, 0.0, 0.0, 0.0);
    var scratchPosition = new Cartesian2();

    Picking.pick = function(scene, windowPosition, width, height) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(windowPosition)) {
            throw new DeveloperError('windowPosition is undefined.');
        }
        //>>includeEnd('debug');

        rectangleWidth = defaultValue(width, 3.0);
        rectangleHeight = defaultValue(height, rectangleWidth);

        var context = scene._context;
        var us = context.uniformState;
        var frameState = scene._frameState;

        var view = scene._defaultView;
        scene._view = view;

        var viewport = view.viewport;
        viewport.x = 0;
        viewport.y = 0;
        viewport.width = context.drawingBufferWidth;
        viewport.height = context.drawingBufferHeight;

        var passState = view.passState;
        passState.viewport = BoundingRectangle.clone(viewport, passState.viewport);

        var drawingBufferPosition = SceneTransforms.transformWindowToDrawingBuffer(scene, windowPosition, scratchPosition);

        scene._jobScheduler.disableThisFrame();

        scene.updateFrameState();
        frameState.cullingVolume = getPickCullingVolume(scene, drawingBufferPosition, rectangleWidth, rectangleHeight, viewport);
        frameState.invertClassification = false;
        frameState.passes.pick = true;
        frameState.tilesetPassState = pickTilesetPassState;

        us.update(frameState);

        scene.updateEnvironment();

        scratchRectangle.x = drawingBufferPosition.x - ((rectangleWidth - 1.0) * 0.5);
        scratchRectangle.y = (scene.drawingBufferHeight - drawingBufferPosition.y) - ((rectangleHeight - 1.0) * 0.5);
        scratchRectangle.width = rectangleWidth;
        scratchRectangle.height = rectangleHeight;
        passState = view.pickFramebuffer.begin(scratchRectangle, view.viewport);

        scene.updateAndExecuteCommands(passState, scratchColorZero);
        scene.resolveFramebuffers(passState);

        var object = view.pickFramebuffer.end(scratchRectangle);
        context.endFrame();
        return object;
    };

    function renderTranslucentDepthForPick(scene, drawingBufferPosition) {
        // PERFORMANCE_IDEA: render translucent only and merge with the previous frame
        var context = scene._context;
        var frameState = scene._frameState;
        var environmentState = scene._environmentState;

        var view = scene._defaultView;
        scene._view = view;

        var viewport = view.viewport;
        viewport.x = 0;
        viewport.y = 0;
        viewport.width = context.drawingBufferWidth;
        viewport.height = context.drawingBufferHeight;

        var passState = view.passState;
        passState.viewport = BoundingRectangle.clone(viewport, passState.viewport);

        scene.clearPasses(frameState.passes);
        frameState.passes.pick = true;
        frameState.passes.depth = true;
        frameState.cullingVolume = getPickCullingVolume(scene, drawingBufferPosition, 1, 1, viewport);
        frameState.tilesetPassState = pickTilesetPassState;

        scene.updateEnvironment();
        environmentState.renderTranslucentDepthForPick = true;
        passState = view.pickDepthFramebuffer.update(context, drawingBufferPosition, viewport);

        scene.updateAndExecuteCommands(passState, scratchColorZero);
        scene.resolveFramebuffers(passState);

        context.endFrame();
    }

    var scratchPerspectiveFrustum = new PerspectiveFrustum();
    var scratchPerspectiveOffCenterFrustum = new PerspectiveOffCenterFrustum();
    var scratchOrthographicFrustum = new OrthographicFrustum();
    var scratchOrthographicOffCenterFrustum = new OrthographicOffCenterFrustum();

    Picking.pickPositionWorldCoordinates = function(scene, windowPosition, result) {
        if (!scene.useDepthPicking) {
            return undefined;
        }

        //>>includeStart('debug', pragmas.debug);
        if (!defined(windowPosition)) {
            throw new DeveloperError('windowPosition is undefined.');
        }
        if (!scene._context.depthTexture) {
            throw new DeveloperError('Picking from the depth buffer is not supported. Check pickPositionSupported.');
        }
        //>>includeEnd('debug');

        var cacheKey = windowPosition.toString();

        if (scene._pickPositionCacheDirty){
            scene._pickPositionCache = {};
            scene._pickPositionCacheDirty = false;
        } else if (scene._pickPositionCache.hasOwnProperty(cacheKey)){
            return Cartesian3.clone(scene._pickPositionCache[cacheKey], result);
        }

        var frameState = scene._frameState;
        var context = scene._context;
        var uniformState = context.uniformState;

        var view = scene._defaultView;
        scene._view = view;

        var drawingBufferPosition = SceneTransforms.transformWindowToDrawingBuffer(scene, windowPosition, scratchPosition);
        if (scene.pickTranslucentDepth) {
            renderTranslucentDepthForPick(scene, drawingBufferPosition);
        } else {
            scene.updateFrameState();
            uniformState.update(frameState);
            scene.updateEnvironment();
        }
        drawingBufferPosition.y = scene.drawingBufferHeight - drawingBufferPosition.y;

        var camera = scene.camera;

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

        var frustumCommandsList = view.frustumCommandsList;
        var numFrustums = frustumCommandsList.length;
        for (var i = 0; i < numFrustums; ++i) {
            var pickDepth = Picking.getPickDepth(scene, i);
            var depth = pickDepth.getDepth(context, drawingBufferPosition.x, drawingBufferPosition.y);
            if (depth > 0.0 && depth < 1.0) {
                var renderedFrustum = frustumCommandsList[i];
                var height2D;
                if (scene.mode === SceneMode.SCENE2D) {
                    height2D = camera.position.z;
                    camera.position.z = height2D - renderedFrustum.near + 1.0;
                    frustum.far = Math.max(1.0, renderedFrustum.far - renderedFrustum.near);
                    frustum.near = 1.0;
                    uniformState.update(frameState);
                    uniformState.updateFrustum(frustum);
                } else {
                    frustum.near = renderedFrustum.near * (i !== 0 ? scene.opaqueFrustumNearOffset : 1.0);
                    frustum.far = renderedFrustum.far;
                    uniformState.updateFrustum(frustum);
                }

                result = SceneTransforms.drawingBufferToWgs84Coordinates(scene, drawingBufferPosition, depth, result);

                if (scene.mode === SceneMode.SCENE2D) {
                    camera.position.z = height2D;
                    uniformState.update(frameState);
                }

                scene._pickPositionCache[cacheKey] = Cartesian3.clone(result);
                return result;
            }
        }

        scene._pickPositionCache[cacheKey] = undefined;
        return undefined;
    };

    var scratchPickPositionCartographic = new Cartographic();

    Picking.pickPosition = function(scene, windowPosition, result) {
        result = Picking.pickPositionWorldCoordinates(scene, windowPosition, result);
        if (defined(result) && scene.mode !== SceneMode.SCENE3D) {
            Cartesian3.fromElements(result.y, result.z, result.x, result);

            var projection = scene.mapProjection;
            var ellipsoid = projection.ellipsoid;

            var cart = projection.unproject(result, scratchPickPositionCartographic);
            ellipsoid.cartographicToCartesian(cart, result);
        }

        return result;
    };

    function drillPick(limit, pickCallback) {
        // PERFORMANCE_IDEA: This function calls each primitive's update for each pass. Instead
        // we could update the primitive once, and then just execute their commands for each pass,
        // and cull commands for picked primitives.  e.g., base on the command's owner.
        var i;
        var attributes;
        var result = [];
        var pickedPrimitives = [];
        var pickedAttributes = [];
        var pickedFeatures = [];
        if (!defined(limit)) {
            limit = Number.MAX_VALUE;
        }

        var pickedResult = pickCallback();
        while (defined(pickedResult)) {
            var object = pickedResult.object;
            var position = pickedResult.position;
            var exclude = pickedResult.exclude;

            if (defined(position) && !defined(object)) {
                result.push(pickedResult);
                break;
            }

            if (!defined(object) || !defined(object.primitive)) {
                break;
            }

            if (!exclude) {
                result.push(pickedResult);
                if (0 >= --limit) {
                    break;
                }
            }

            var primitive = object.primitive;
            var hasShowAttribute = false;

            // If the picked object has a show attribute, use it.
            if (typeof primitive.getGeometryInstanceAttributes === 'function') {
                if (defined(object.id)) {
                    attributes = primitive.getGeometryInstanceAttributes(object.id);
                    if (defined(attributes) && defined(attributes.show)) {
                        hasShowAttribute = true;
                        attributes.show = ShowGeometryInstanceAttribute.toValue(false, attributes.show);
                        pickedAttributes.push(attributes);
                    }
                }
            }

            if (object instanceof Cesium3DTileFeature) {
                hasShowAttribute = true;
                object.show = false;
                pickedFeatures.push(object);
            }

            // Otherwise, hide the entire primitive
            if (!hasShowAttribute) {
                primitive.show = false;
                pickedPrimitives.push(primitive);
            }

            pickedResult = pickCallback();
        }

        // Unhide everything we hid while drill picking
        for (i = 0; i < pickedPrimitives.length; ++i) {
            pickedPrimitives[i].show = true;
        }

        for (i = 0; i < pickedAttributes.length; ++i) {
            attributes = pickedAttributes[i];
            attributes.show = ShowGeometryInstanceAttribute.toValue(true, attributes.show);
        }

        for (i = 0; i < pickedFeatures.length; ++i) {
            pickedFeatures[i].show = true;
        }

        return result;
    }

    Picking.drillPick = function(scene, windowPosition, limit, width, height) {
        var pickCallback = function() {
            var object = Picking.pick(scene, windowPosition, width, height);
            if (defined(object)) {
                return {
                    object : object,
                    position : undefined,
                    exclude : false
                };
            }
        };
        var objects = drillPick(limit, pickCallback);
        return objects.map(function(element) {
            return element.object;
        });
    };

    var scratchRight = new Cartesian3();
    var scratchUp = new Cartesian3();

    function MostDetailedRayPick(ray, width, tilesets) {
        this.ray = ray;
        this.width = width;
        this.tilesets = tilesets;
        this.ready = false;
        this.deferred = when.defer();
        this.promise = this.deferred.promise;
    }

    function updateOffscreenCameraFromRay(scene, ray, width, camera) {
        var direction = ray.direction;
        var orthogonalAxis = Cartesian3.mostOrthogonalAxis(direction, scratchRight);
        var right = Cartesian3.cross(direction, orthogonalAxis, scratchRight);
        var up = Cartesian3.cross(direction, right, scratchUp);

        camera.position = ray.origin;
        camera.direction = direction;
        camera.up = up;
        camera.right = right;

        camera.frustum.width = defaultValue(width, scene.pickOffscreenDefaultWidth);
        return camera.frustum.computeCullingVolume(camera.positionWC, camera.directionWC, camera.upWC);
    }

    Picking.updateMostDetailedRayPick = function(scene, rayPick) {
        var frameState = scene._frameState;

        var ray = rayPick.ray;
        var width = rayPick.width;
        var tilesets = rayPick.tilesets;

        var camera = scene._pickOffscreenView.camera;
        var cullingVolume = updateOffscreenCameraFromRay(scene, ray, width, camera);

        var tilesetPassState = mostDetailedPreloadTilesetPassState;
        tilesetPassState.camera = camera;
        tilesetPassState.cullingVolume = cullingVolume;

        var ready = true;
        var tilesetsLength = tilesets.length;
        for (var i = 0; i < tilesetsLength; ++i) {
            var tileset = tilesets[i];
            if (tileset.show && scene.primitives.contains(tileset)) {
                // Only update tilesets that are still contained in the scene's primitive collection and are still visible
                // Update tilesets continually until all tilesets are ready. This way tiles are never removed from the cache.
                tileset.updateForPass(frameState, tilesetPassState);
                ready = (ready && tilesetPassState.ready);
            }
        }

        if (ready) {
            rayPick.deferred.resolve();
        }

        return ready;
    };

    function getTilesets(primitives, objectsToExclude, tilesets) {
        var length = primitives.length;
        for (var i = 0; i < length; ++i) {
            var primitive = primitives.get(i);
            if (primitive.show) {
                if ((primitive instanceof Cesium3DTileset)) {
                    if (!defined(objectsToExclude) || objectsToExclude.indexOf(primitive) === -1) {
                        tilesets.push(primitive);
                    }
                } else if (primitive instanceof PrimitiveCollection) {
                    getTilesets(primitive, objectsToExclude, tilesets);
                }
            }
        }
    }

    function launchMostDetailedRayPick(scene, ray, objectsToExclude, width, callback) {
        var tilesets = [];
        getTilesets(scene.primitives, objectsToExclude, tilesets);
        if (tilesets.length === 0) {
            return when.resolve(callback());
        }

        var rayPick = new MostDetailedRayPick(ray, width, tilesets);
        scene._mostDetailedRayPicks.push(rayPick);
        return rayPick.promise.then(function() {
            return callback();
        });
    }

    function isExcluded(object, objectsToExclude) {
        if (!defined(object) || !defined(objectsToExclude) || objectsToExclude.length === 0) {
            return false;
        }
        return (objectsToExclude.indexOf(object) > -1) ||
               (objectsToExclude.indexOf(object.primitive) > -1) ||
               (objectsToExclude.indexOf(object.id) > -1);
    }

    function getRayIntersection(scene, ray, objectsToExclude, width, requirePosition, mostDetailed) {
        var context = scene._context;
        var uniformState = context.uniformState;
        var frameState = scene._frameState;

        var view = scene._pickOffscreenView;
        scene._view = view;

        updateOffscreenCameraFromRay(scene, ray, width, view.camera);

        scratchRectangle = BoundingRectangle.clone(view.viewport, scratchRectangle);

        var passState = view.pickFramebuffer.begin(scratchRectangle, view.viewport);

        scene._jobScheduler.disableThisFrame();

        scene.updateFrameState();
        frameState.invertClassification = false;
        frameState.passes.pick = true;
        frameState.passes.offscreen = true;

        if (mostDetailed) {
            frameState.tilesetPassState = mostDetailedPickTilesetPassState;
        } else {
            frameState.tilesetPassState = scene.pickTilesetPassState;
        }

        uniformState.update(frameState);

        scene.updateEnvironment();
        scene.updateAndExecuteCommands(passState, scratchColorZero);
        scene.resolveFramebuffers(passState);

        var position;
        var object = view.pickFramebuffer.end(context);

        if (scene._context.depthTexture) {
            var numFrustums = view.frustumCommandsList.length;
            for (var i = 0; i < numFrustums; ++i) {
                var pickDepth = Picking.getPickDepth(scene, i);
                var depth = pickDepth.getDepth(context, 0, 0);
                if (depth > 0.0 && depth < 1.0) {
                    var renderedFrustum = view.frustumCommandsList[i];
                    var near = renderedFrustum.near * (i !== 0 ? scene.opaqueFrustumNearOffset : 1.0);
                    var far = renderedFrustum.far;
                    var distance = near + depth * (far - near);
                    position = Ray.getPoint(ray, distance);
                    break;
                }
            }
        }

        scene._view = scene._defaultView;
        context.endFrame();

        if (defined(object) || defined(position)) {
            return {
                object : object,
                position : position,
                exclude : (!defined(position) && requirePosition) || isExcluded(object, objectsToExclude)
            };
        }
    }

    function getRayIntersections(scene, ray, limit, objectsToExclude, width, requirePosition, mostDetailed) {
        var pickCallback = function() {
            return getRayIntersection(scene, ray, objectsToExclude, width, requirePosition, mostDetailed);
        };
        return drillPick(limit, pickCallback);
    }

    function pickFromRay(scene, ray, objectsToExclude, width, requirePosition, mostDetailed) {
        var results = getRayIntersections(scene, ray, 1, objectsToExclude, width, requirePosition, mostDetailed);
        if (results.length > 0) {
            return results[0];
        }
    }

    function drillPickFromRay(scene, ray, limit, objectsToExclude, width, requirePosition, mostDetailed) {
        return getRayIntersections(scene, ray, limit, objectsToExclude, width, requirePosition, mostDetailed);
    }

    function deferPromiseUntilPostRender(scene, promise) {
        // Resolve promise after scene's postRender in case entities are created when the promise resolves.
        // Entities can't be created between viewer._onTick and viewer._postRender.
        var deferred = when.defer();
        promise.then(function(result) {
            var removeCallback = scene.postRender.addEventListener(function() {
                deferred.resolve(result);
                removeCallback();
            });
        }).otherwise(function(error) {
            deferred.reject(error);
        });
        return deferred.promise;
    }

    Picking.pickFromRay = function(scene, ray, objectsToExclude, width) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('ray', ray);
        if (scene._mode !== SceneMode.SCENE3D) {
            throw new DeveloperError('Ray intersections are only supported in 3D mode.');
        }
        //>>includeEnd('debug');

        return pickFromRay(scene, ray, objectsToExclude, width, false, false);
    };

    Picking.drillPickFromRay = function(scene, ray, limit, objectsToExclude, width) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('ray', ray);
        if (scene._mode !== SceneMode.SCENE3D) {
            throw new DeveloperError('Ray intersections are only supported in 3D mode.');
        }
        //>>includeEnd('debug');

        return drillPickFromRay(scene, ray, limit, objectsToExclude, width,false, false);
    };

    Picking.pickFromRayMostDetailed = function(scene, ray, objectsToExclude, width) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('ray', ray);
        if (scene._mode !== SceneMode.SCENE3D) {
            throw new DeveloperError('Ray intersections are only supported in 3D mode.');
        }
        //>>includeEnd('debug');

        ray = Ray.clone(ray);
        objectsToExclude = defined(objectsToExclude) ? objectsToExclude.slice() : objectsToExclude;
        return deferPromiseUntilPostRender(scene, launchMostDetailedRayPick(scene, ray, objectsToExclude, width, function() {
            return pickFromRay(scene, ray, objectsToExclude, width, false, true);
        }));
    };

    Picking.drillPickFromRayMostDetailed = function(scene, ray, limit, objectsToExclude, width) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('ray', ray);
        if (scene._mode !== SceneMode.SCENE3D) {
            throw new DeveloperError('Ray intersections are only supported in 3D mode.');
        }
        //>>includeEnd('debug');

        ray = Ray.clone(ray);
        objectsToExclude = defined(objectsToExclude) ? objectsToExclude.slice() : objectsToExclude;
        return deferPromiseUntilPostRender(scene, launchMostDetailedRayPick(scene, ray, objectsToExclude, width, function() {
            return drillPickFromRay(scene, ray, limit, objectsToExclude, width, false, true);
        }));
    };

    var scratchSurfacePosition = new Cartesian3();
    var scratchSurfaceNormal = new Cartesian3();
    var scratchSurfaceRay = new Ray();
    var scratchCartographic = new Cartographic();

    function getRayForSampleHeight(scene, cartographic) {
        var globe = scene.globe;
        var ellipsoid = defined(globe) ? globe.ellipsoid : scene.mapProjection.ellipsoid;
        var height = ApproximateTerrainHeights._defaultMaxTerrainHeight;
        var surfaceNormal = ellipsoid.geodeticSurfaceNormalCartographic(cartographic, scratchSurfaceNormal);
        var surfacePosition = Cartographic.toCartesian(cartographic, ellipsoid, scratchSurfacePosition);
        var surfaceRay = scratchSurfaceRay;
        surfaceRay.origin = surfacePosition;
        surfaceRay.direction =  surfaceNormal;
        var ray = new Ray();
        Ray.getPoint(surfaceRay, height, ray.origin);
        Cartesian3.negate(surfaceNormal, ray.direction);
        return ray;
    }

    function getRayForClampToHeight(scene, cartesian) {
        var globe = scene.globe;
        var ellipsoid = defined(globe) ? globe.ellipsoid : scene.mapProjection.ellipsoid;
        var cartographic = Cartographic.fromCartesian(cartesian, ellipsoid, scratchCartographic);
        return getRayForSampleHeight(scene, cartographic);
    }

    function getHeightFromCartesian(scene, cartesian) {
        var globe = scene.globe;
        var ellipsoid = defined(globe) ? globe.ellipsoid : scene.mapProjection.ellipsoid;
        var cartographic = Cartographic.fromCartesian(cartesian, ellipsoid, scratchCartographic);
        return cartographic.height;
    }

    function sampleHeightMostDetailed(scene, cartographic, objectsToExclude, width) {
        var ray = getRayForSampleHeight(scene, cartographic);
        return launchMostDetailedRayPick(scene, ray, objectsToExclude, width, function() {
            var pickResult = pickFromRay(scene, ray, objectsToExclude, width, true, true);
            if (defined(pickResult)) {
                return getHeightFromCartesian(scene, pickResult.position);
            }
        });
    }

    function clampToHeightMostDetailed(scene, cartesian, objectsToExclude, width, result) {
        var ray = getRayForClampToHeight(scene, cartesian);
        return launchMostDetailedRayPick(scene, ray, objectsToExclude, width, function() {
            var pickResult = pickFromRay(scene, ray, objectsToExclude, width, true, true);
            if (defined(pickResult)) {
                return Cartesian3.clone(pickResult.position, result);
            }
        });
    }

    Picking.sampleHeight = function(scene, position, objectsToExclude, width) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('position', position);
        if (scene._mode !== SceneMode.SCENE3D) {
            throw new DeveloperError('sampleHeight is only supported in 3D mode.');
        }
        if (!scene.sampleHeightSupported) {
            throw new DeveloperError('sampleHeight requires depth texture support. Check sampleHeightSupported.');
        }
        //>>includeEnd('debug');

        var ray = getRayForSampleHeight(scene, position);
        var pickResult = pickFromRay(scene, ray, objectsToExclude, width, true, false);
        if (defined(pickResult)) {
            return getHeightFromCartesian(scene, pickResult.position);
        }
    };

    Picking.clampToHeight = function(scene, cartesian, objectsToExclude, width, result) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('cartesian', cartesian);
        if (scene._mode !== SceneMode.SCENE3D) {
            throw new DeveloperError('sampleHeight is only supported in 3D mode.');
        }
        if (!scene.clampToHeightSupported) {
            throw new DeveloperError('clampToHeight requires depth texture support. Check clampToHeightSupported.');
        }
        //>>includeEnd('debug');

        var ray = getRayForClampToHeight(scene, cartesian);
        var pickResult = pickFromRay(scene, ray, objectsToExclude, width, true, false);
        if (defined(pickResult)) {
            return Cartesian3.clone(pickResult.position, result);
        }
    };

    Picking.sampleHeightMostDetailed = function(scene, positions, objectsToExclude, width) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('positions', positions);
        if (scene._mode !== SceneMode.SCENE3D) {
            throw new DeveloperError('sampleHeightMostDetailed is only supported in 3D mode.');
        }
        if (!scene.sampleHeightSupported) {
            throw new DeveloperError('sampleHeightMostDetailed requires depth texture support. Check sampleHeightSupported.');
        }
        //>>includeEnd('debug');

        objectsToExclude = defined(objectsToExclude) ? objectsToExclude.slice() : objectsToExclude;
        var length = positions.length;
        var promises = new Array(length);
        for (var i = 0; i < length; ++i) {
            promises[i] = sampleHeightMostDetailed(scene, positions[i], objectsToExclude, width);
        }
        return deferPromiseUntilPostRender(scene, when.all(promises).then(function(heights) {
            var length = heights.length;
            for (var i = 0; i < length; ++i) {
                positions[i].height = heights[i];
            }
            return positions;
        }));
    };

    Picking.clampToHeightMostDetailed = function(scene, cartesians, objectsToExclude, width) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('cartesians', cartesians);
        if (scene._mode !== SceneMode.SCENE3D) {
            throw new DeveloperError('clampToHeightMostDetailed is only supported in 3D mode.');
        }
        if (!scene.clampToHeightSupported) {
            throw new DeveloperError('clampToHeightMostDetailed requires depth texture support. Check clampToHeightSupported.');
        }
        //>>includeEnd('debug');

        objectsToExclude = defined(objectsToExclude) ? objectsToExclude.slice() : objectsToExclude;
        var length = cartesians.length;
        var promises = new Array(length);
        for (var i = 0; i < length; ++i) {
            promises[i] = clampToHeightMostDetailed(scene, cartesians[i], objectsToExclude, width, cartesians[i]);
        }
        return deferPromiseUntilPostRender(scene, when.all(promises).then(function(clampedCartesians) {
            var length = clampedCartesians.length;
            for (var i = 0; i < length; ++i) {
                cartesians[i] = clampedCartesians[i];
            }
            return cartesians;
        }));
    };

    return Picking;
});
