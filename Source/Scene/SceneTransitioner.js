/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/EasingFunction',
        '../Core/Ellipsoid',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/ScreenSpaceEventHandler',
        '../Core/ScreenSpaceEventType',
        './Camera',
        './OrthographicFrustum',
        './PerspectiveFrustum',
        './SceneMode'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        destroyObject,
        DeveloperError,
        EasingFunction,
        Ellipsoid,
        CesiumMath,
        Matrix4,
        ScreenSpaceEventHandler,
        ScreenSpaceEventType,
        Camera,
        OrthographicFrustum,
        PerspectiveFrustum,
        SceneMode) {
    "use strict";

    /**
     * @private
     */
    var SceneTransitioner = function(scene, ellipsoid) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

        this._scene = scene;
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

        // Position camera and size frustum so the entire 2D map is visible
        var maxRadii = ellipsoid.maximumRadius;
        var position = new Cartesian3(0.0, 0.0, 2.0 * maxRadii);
        var direction = new Cartesian3();
        direction = Cartesian3.normalize(Cartesian3.negate(position, direction), direction);
        var up = Cartesian3.clone(Cartesian3.UNIT_Y);

        var position2D = Matrix4.multiplyByPoint(Camera.TRANSFORM_2D, position, new Cartesian3());
        var direction2D = Matrix4.multiplyByPointAsVector(Camera.TRANSFORM_2D, direction, new Cartesian3());
        var up2D = Matrix4.multiplyByPointAsVector(Camera.TRANSFORM_2D, up, new Cartesian3());

        var frustum = new OrthographicFrustum();
        frustum.right = maxRadii * Math.PI;
        frustum.left = -frustum.right;
        frustum.top = frustum.right * (scene.drawingBufferHeight / scene.drawingBufferWidth);
        frustum.bottom = -frustum.top;

        this._camera2D = {
            position : position,
            direction : direction,
            up : up,
            position2D : position2D,
            direction2D : direction2D,
            up2D : up2D,
            frustum : frustum
        };

        position = new Cartesian3(0.0, -1.0, 1.0);
        position = Cartesian3.multiplyByScalar(Cartesian3.normalize(position, position), 5.0 * maxRadii, position);
        direction = new Cartesian3();
        direction = Cartesian3.normalize(Cartesian3.subtract(Cartesian3.ZERO, position, direction), direction);
        var right = new Cartesian3();
        right = Cartesian3.normalize(Cartesian3.cross(direction, Cartesian3.UNIT_Z, right), right);
        up = new Cartesian3();
        up = Cartesian3.normalize(Cartesian3.cross(right, direction, up), up);

        position2D = Matrix4.multiplyByPoint(Camera.TRANSFORM_2D, position, new Cartesian3());
        direction2D = Matrix4.multiplyByPointAsVector(Camera.TRANSFORM_2D, direction, new Cartesian3());
        var right2D = Matrix4.multiplyByPointAsVector(Camera.TRANSFORM_2D, right, new Cartesian3());
        up2D = new Cartesian3();
        up2D = Cartesian3.normalize(Cartesian3.cross(right2D, direction2D, up2D), up2D);

        frustum = new PerspectiveFrustum();
        frustum.aspectRatio = scene.drawingBufferWidth / scene.drawingBufferHeight;
        frustum.fov = CesiumMath.toRadians(60.0);

        this._cameraCV = {
            position : position,
            direction : direction,
            up : up,
            position2D : position2D,
            direction2D : direction2D,
            up2D : up2D,
            frustum : frustum
        };

        position = new Cartesian3();
        position = Cartesian3.multiplyByScalar(Cartesian3.normalize(new Cartesian3(0.0, -2.0, 1.0), position), 2.0 * maxRadii, position);
        direction = new Cartesian3();
        direction = Cartesian3.normalize(Cartesian3.subtract(Cartesian3.ZERO, position, direction), direction);
        right = new Cartesian3();
        right = Cartesian3.normalize(Cartesian3.cross(direction, Cartesian3.UNIT_Z, right), right);
        up = new Cartesian3();
        up = Cartesian3.normalize(Cartesian3.cross(right, direction, up), up);

        this._camera3D = {
            position : position,
            direction : direction,
            up : up,
            frustum : frustum
        };

        this._currentTweens = [];
        this._morphHandler = undefined;
        this._morphCancelled = false;
        this._completeMorph = undefined;
    };

    SceneTransitioner.prototype.completeMorph = function() {
        if (defined(this._completeMorph)) {
            this._completeMorph();
        }
    };

    SceneTransitioner.prototype.morphTo2D = function(duration, ellipsoid) {
        if (defined(this._completeMorph)) {
            this._completeMorph();
        }

        var scene = this._scene;
        this._previousMode = scene.mode;

        if (this._previousMode === SceneMode.SCENE2D || this._previousMode === SceneMode.MORPHING) {
            return;
        }
        this._scene.morphStart.raiseEvent(this, this._previousMode, SceneMode.SCENE2D, true);

        updateFrustums(this);
        scene.mode = SceneMode.MORPHING;
        createMorphHandler(this, complete2DCallback);

        if (this._previousMode === SceneMode.COLUMBUS_VIEW) {
            morphFromColumbusViewTo2D(this, duration, ellipsoid, complete2DCallback);
        } else {
            morphFrom3DTo2D(this, duration, ellipsoid, complete2DCallback);
        }

        if (duration === 0.0 && defined(this._completeMorph)) {
            this._completeMorph();
        }
    };

    SceneTransitioner.prototype.morphToColumbusView = function(duration, ellipsoid) {
        if (defined(this._completeMorph)) {
            this._completeMorph();
        }

        var scene = this._scene;
        this._previousMode = scene.mode;

        if (this._previousMode === SceneMode.COLUMBUS_VIEW || this._previousMode === SceneMode.MORPHING) {
            return;
        }
        this._scene.morphStart.raiseEvent(this, this._previousMode, SceneMode.COLUMBUS_VIEW, true);

        updateFrustums(this);
        scene.mode = SceneMode.MORPHING;
        createMorphHandler(this, completeColumbusViewCallback);

        if (this._previousMode === SceneMode.SCENE2D) {
            morphFrom2DToColumbusView(this, duration, ellipsoid, completeColumbusViewCallback);
        } else {
            morphFrom3DToColumbusView(this, duration, this._cameraCV, completeColumbusViewCallback);
        }

        if (duration === 0.0 && defined(this._completeMorph)) {
            this._completeMorph();
        }
    };

    SceneTransitioner.prototype.morphTo3D = function(duration, ellipsoid) {
        if (defined(this._completeMorph)) {
            this._completeMorph();
        }

        var scene = this._scene;
        this._previousMode = scene.mode;

        if (this._previousMode === SceneMode.SCENE3D || this._previousMode === SceneMode.MORPHING) {
            return;
        }
        this._scene.morphStart.raiseEvent(this, this._previousMode, SceneMode.SCENE3D, true);

        updateFrustums(this);
        scene.mode = SceneMode.MORPHING;
        createMorphHandler(this, complete3DCallback);

        if (this._previousMode === SceneMode.SCENE2D) {
            morphFrom2DTo3D(this, duration, ellipsoid, complete3DCallback);
        } else {
            morphFromColumbusViewTo3D(this, duration, ellipsoid, complete3DCallback);
        }

        if (duration === 0.0 && defined(this._completeMorph)) {
            this._completeMorph();
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     */
    SceneTransitioner.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @example
     * transitioner = transitioner && transitioner.destroy();
     */
    SceneTransitioner.prototype.destroy = function() {
        destroyMorphHandler(this);
        return destroyObject(this);
    };

    function createMorphHandler(transitioner, completeMorphFunction) {
        if (transitioner._scene.completeMorphOnUserInput) {
            transitioner._morphHandler = new ScreenSpaceEventHandler(transitioner._scene.canvas);

            var completeMorph = function() {
                transitioner._morphCancelled = true;
                completeMorphFunction(transitioner);
            };

            transitioner._completeMorph = completeMorph;
            transitioner._morphHandler.setInputAction(completeMorph, ScreenSpaceEventType.LEFT_DOWN);
            transitioner._morphHandler.setInputAction(completeMorph, ScreenSpaceEventType.MIDDLE_DOWN);
            transitioner._morphHandler.setInputAction(completeMorph, ScreenSpaceEventType.RIGHT_DOWN);
            transitioner._morphHandler.setInputAction(completeMorph, ScreenSpaceEventType.WHEEL);
        }
    }

    function destroyMorphHandler(transitioner) {
        var tweens = transitioner._currentTweens;
        for ( var i = 0; i < tweens.length; ++i) {
            tweens[i].cancelTween();
        }
        transitioner._currentTweens.length = 0;
        transitioner._morphHandler = transitioner._morphHandler && transitioner._morphHandler.destroy();
    }

    function morphFromColumbusViewTo3D(transitioner, duration, ellipsoid, complete) {
        var scene = transitioner._scene;

        var camera = scene.camera;
        camera.setTransform(Matrix4.IDENTITY);

        var startPos = camera.position;
        var startDir = camera.direction;
        var startUp = camera.up;

        var endPos = Cartesian3.clone(transitioner._camera2D.position);
        var endDir = Cartesian3.clone(transitioner._camera2D.direction);
        var endUp = Cartesian3.clone(transitioner._camera2D.up);

        var update = function(value) {
            camera.position = columbusViewMorph(startPos, endPos, value.time);
            camera.direction = columbusViewMorph(startDir, endDir, value.time);
            camera.up = columbusViewMorph(startUp, endUp, value.time);
            camera.right = Cartesian3.cross(camera.direction, camera.up, camera.right);
            Cartesian3.normalize(camera.right, camera.right);
        };

        var tween = scene.tweens.add({
            duration : duration,
            easingFunction : EasingFunction.QUARTIC_OUT,
            startObject : {
                time : 0.0
            },
            stopObject : {
                time : 1.0
            },
            update : update
        });
        transitioner._currentTweens.push(tween);

        addMorphTimeAnimations(transitioner, scene, 0.0, 1.0, duration, complete);
    }

    function morphFrom2DTo3D(transitioner, duration, ellipsoid, complete) {
        duration *= 0.5;

        var camera = transitioner._scene.camera;
        camera.setTransform(Matrix4.IDENTITY);

        morphOrthographicToPerspective(transitioner, duration, ellipsoid, function() {
            camera.frustum = transitioner._cameraCV.frustum.clone();
            morphFromColumbusViewTo3D(transitioner, duration, ellipsoid, complete);
        });
    }

    function columbusViewMorph(startPosition, endPosition, time) {
        // Just linear for now.
        return Cartesian3.lerp(startPosition, endPosition, time, new Cartesian3());
    }

    function morphPerspectiveToOrthographic(transitioner, duration, complete) {
        var scene = transitioner._scene;
        var camera = scene.camera;

        var startPos = camera.position;
        var startFOV = camera.frustum.fov;
        var endFOV = CesiumMath.RADIANS_PER_DEGREE * 0.5;
        var d = Cartesian3.magnitude(startPos) * Math.tan(startFOV * 0.5);
        camera.frustum.far = d / Math.tan(endFOV * 0.5) + 10000000.0;

        var update = function(value) {
            camera.frustum.fov = CesiumMath.lerp(startFOV, endFOV, value.time);

            var distance = d / Math.tan(camera.frustum.fov * 0.5);
            var pos = new Cartesian3();
            camera.position = Cartesian3.multiplyByScalar(Cartesian3.normalize(camera.position, pos), distance, pos);
        };

        var tween = scene.tweens.add({
            duration : duration,
            easingFunction : EasingFunction.QUARTIC_OUT,
            startObject : {
                time : 0.0
            },
            stopObject : {
                time : 1.0
            },
            update : update,
            complete : function() {
                camera.frustum = transitioner._camera2D.frustum.clone();
                complete(transitioner);
            }
        });
        transitioner._currentTweens.push(tween);
    }

    function morphFromColumbusViewTo2D(transitioner, duration, ellipsoid, complete) {
        var scene = transitioner._scene;
        var camera = scene.camera;
        camera.setTransform(Matrix4.IDENTITY);
        var maxRadii = ellipsoid.maximumRadius;

        var startPos = Cartesian3.clone(camera.position);
        var startDir = Cartesian3.clone(camera.direction);
        var startUp = Cartesian3.clone(camera.up);

        var tanPhi = Math.tan(transitioner._cameraCV.frustum.fovy * 0.5);
        var tanTheta = transitioner._cameraCV.frustum.aspectRatio * tanPhi;
        var d = (maxRadii * Math.PI) / tanTheta;

        var endPos = new Cartesian3();
        endPos = Cartesian3.multiplyByScalar(Cartesian3.normalize(transitioner._camera2D.position, endPos), d, endPos);
        var endDir = Cartesian3.clone(transitioner._camera2D.direction);
        var endUp = Cartesian3.clone(transitioner._camera2D.up);

        var updateCV = function(value) {
            camera.position = columbusViewMorph(startPos, endPos, value.time);
            camera.direction = columbusViewMorph(startDir, endDir, value.time);
            camera.up = columbusViewMorph(startUp, endUp, value.time);
            camera.right = Cartesian3.cross(camera.direction, camera.up, camera.right);
            Cartesian3.normalize(camera.right, camera.right);
        };

        duration *= 0.5;
        var tween = scene.tweens.add({
            duration : duration,
            easingFunction : EasingFunction.QUARTIC_OUT,
            startObject : {
                time : 0.0
            },
            stopObject : {
                time : 1.0
            },
            update : updateCV,
            complete : function() {
                morphPerspectiveToOrthographic(transitioner, duration, complete);
            }
        });
        transitioner._currentTweens.push(tween);
    }

    function morphFrom3DTo2D(transitioner, duration, ellipsoid, complete) {
        duration *= 0.5;

        var maxRadii = ellipsoid.maximumRadius;

        var tanPhi = Math.tan(transitioner._camera3D.frustum.fovy * 0.5);
        var tanTheta = transitioner._camera3D.frustum.aspectRatio * tanPhi;
        var d = (maxRadii * Math.PI) / tanTheta;

        var camera3DTo2D = {};
        var pos2D = new Cartesian3();
        camera3DTo2D.position2D = Cartesian3.multiplyByScalar(Cartesian3.normalize(transitioner._camera2D.position2D, pos2D), d, pos2D);
        camera3DTo2D.direction2D = Cartesian3.clone(transitioner._camera2D.direction2D);
        camera3DTo2D.up2D = Cartesian3.clone(transitioner._camera2D.up2D);

        var completeCallback = function() {
            morphPerspectiveToOrthographic(transitioner, duration, complete);
        };
        morphFrom3DToColumbusView(transitioner, duration, camera3DTo2D, completeCallback);
    }

    function morphOrthographicToPerspective(transitioner, duration, ellipsoid, complete) {
        var scene = transitioner._scene;
        var camera = scene.camera;
        var maxRadii = ellipsoid.maximumRadius;

        var tanPhi = Math.tan(transitioner._cameraCV.frustum.fovy * 0.5);
        var tanTheta = transitioner._cameraCV.frustum.aspectRatio * tanPhi;
        var d = (maxRadii * Math.PI) / tanTheta;
        var endPos2D = new Cartesian3();
        endPos2D = Cartesian3.multiplyByScalar(Cartesian3.normalize(transitioner._camera2D.position, endPos2D), d, endPos2D);

        var top = camera.frustum.top;
        var bottom = camera.frustum.bottom;
        var right = camera.frustum.right;
        var left = camera.frustum.left;

        var frustum2D = transitioner._camera2D.frustum;
        var frustumCV = transitioner._cameraCV.frustum;

        var startPos = Cartesian3.clone(camera.position);

        var update2D = function(value) {
            camera.position = columbusViewMorph(startPos, endPos2D, value.time);
            camera.frustum.top = CesiumMath.lerp(top, frustum2D.top, value.time);
            camera.frustum.bottom = CesiumMath.lerp(bottom, frustum2D.bottom, value.time);
            camera.frustum.right = CesiumMath.lerp(right, frustum2D.right, value.time);
            camera.frustum.left = CesiumMath.lerp(left, frustum2D.left, value.time);
        };

        var startTime = (right - left) / (2.0 * maxRadii * Math.PI);
        var endTime = 1.0;
        if (startTime > endTime) {
            startTime = 0.0;
        }

        var partialDuration = (endTime - startTime) * duration;
        if (partialDuration < CesiumMath.EPSILON6) {
            if (!Cartesian3.equalsEpsilon(startPos, endPos2D, CesiumMath.EPSILON6)) {
                partialDuration = duration;
                startTime = 0.0;
                endTime = 1.0;
            } else {
                // If the camera and frustum are already in position for the switch to
                // a perspective projection, nothing needs to be animated.
                camera.position = endPos2D;
                camera.frustum = frustumCV.clone();
                complete(transitioner);
                return;
            }
        }

        var tween = scene.tweens.add({
            easingFunction : EasingFunction.QUARTIC_OUT,
            duration : partialDuration,
            startObject : {
                time : startTime
            },
            stopObject : {
                time : endTime
            },
            update : update2D,
            complete : function() {
                camera.frustum = frustumCV.clone();
                complete(transitioner);
            }
        });
        transitioner._currentTweens.push(tween);
    }

    function morphFrom2DToColumbusView(transitioner, duration, ellipsoid, complete) {
        var scene = transitioner._scene;
        var camera = scene.camera;
        camera.setTransform(Matrix4.IDENTITY);

        duration *= 0.5;

        var completeFrustumChange = function() {
            var startPos = Cartesian3.clone(camera.position);
            var startDir = Cartesian3.clone(camera.direction);
            var startUp = Cartesian3.clone(camera.up);

            var endPos = Cartesian3.clone(transitioner._cameraCV.position);
            var endDir = Cartesian3.clone(transitioner._cameraCV.direction);
            var endUp = Cartesian3.clone(transitioner._cameraCV.up);

            var updateCV = function(value) {
                camera.position = columbusViewMorph(startPos, endPos, value.time);
                camera.direction = columbusViewMorph(startDir, endDir, value.time);
                camera.up = columbusViewMorph(startUp, endUp, value.time);
                camera.right = Cartesian3.cross(camera.direction, camera.up, camera.right);
                Cartesian3.normalize(camera.right, camera.right);
            };

            var tween = scene.tweens.add({
                duration : duration,
                easingFunction : EasingFunction.QUARTIC_OUT,
                startObject : {
                    time : 0.0
                },
                stopObject : {
                    time : 1.0
                },
                update : updateCV,
                complete : function() {
                    complete(transitioner);
                }
            });

            transitioner._currentTweens.push(tween);
        };

        morphOrthographicToPerspective(transitioner, duration, ellipsoid, completeFrustumChange);
    }

    function morphFrom3DToColumbusView(transitioner, duration, endCamera, complete) {
        var scene = transitioner._scene;
        var camera = scene.camera;
        camera.setTransform(Matrix4.IDENTITY);

        var startPos = Cartesian3.clone(camera.position);
        var startDir = Cartesian3.clone(camera.direction);
        var startUp = Cartesian3.clone(camera.up);

        var endPos = Cartesian3.clone(endCamera.position2D);
        var endDir = Cartesian3.clone(endCamera.direction2D);
        var endUp = Cartesian3.clone(endCamera.up2D);

        var update = function(value) {
            camera.position = columbusViewMorph(startPos, endPos, value.time);
            camera.direction = columbusViewMorph(startDir, endDir, value.time);
            camera.up = columbusViewMorph(startUp, endUp, value.time);
            camera.right = Cartesian3.cross(camera.direction, camera.up, camera.right);
            Cartesian3.normalize(camera.right, camera.right);
        };

        var tween = scene.tweens.add({
            duration : duration,
            easingFunction : EasingFunction.QUARTIC_OUT,
            startObject : {
                time : 0.0
            },
            stopObject : {
                time : 1.0
            },
            update : update,
            complete : function() {
                camera.position = endPos;
                camera.direction = endDir;
                camera.up = endUp;
                camera.right = Cartesian3.cross(endDir, endUp, camera.right);
                Cartesian3.normalize(camera.right, camera.right);
            }
        });
        transitioner._currentTweens.push(tween);

        addMorphTimeAnimations(transitioner, scene, 1.0, 0.0, duration, complete);
    }

    function addMorphTimeAnimations(transitioner, scene, start, stop, duration, complete) {
        // Later, this will be linear and each object will adjust, if desired, in its vertex shader.
        var options = {
            object : scene,
            property : 'morphTime',
            startValue : start,
            stopValue : stop,
            duration : duration,
            easingFunction : EasingFunction.QUARTIC_OUT
        };

        if (defined(complete)) {
            options.complete = function() {
                complete(transitioner);
            };
        }

        var tween = scene.tweens.addProperty(options);
        transitioner._currentTweens.push(tween);
    }

    function updateFrustums(transitioner) {
        var scene = transitioner._scene;

        var ratio = scene.drawingBufferHeight / scene.drawingBufferWidth;

        var frustum = transitioner._camera2D.frustum;
        frustum.top = frustum.right * ratio;
        frustum.bottom = -frustum.top;

        ratio = 1.0 / ratio;

        frustum = transitioner._cameraCV.frustum;
        frustum.aspectRatio = ratio;

        frustum = transitioner._camera3D.frustum;
        frustum.aspectRatio = ratio;

        var camera = scene.camera;
        switch (scene.mode) {
        case SceneMode.SCENE3D:
            camera.frustum = transitioner._camera3D.frustum.clone();
            break;
        case SceneMode.COLUMBUS_VIEW:
            camera.frustum = transitioner._cameraCV.frustum.clone();
            break;
        case SceneMode.SCENE2D:
            camera.frustum = transitioner._camera2D.frustum.clone();
            break;
        }
    }

    function complete3DCallback(transitioner) {
        var scene = transitioner._scene;
        scene.mode = SceneMode.SCENE3D;
        scene.morphTime = SceneMode.getMorphTime(SceneMode.SCENE3D);

        destroyMorphHandler(transitioner);
        updateFrustums(transitioner);

        if (transitioner._previousMode !== SceneMode.MORPHING || transitioner._morphCancelled) {
            transitioner._morphCancelled = false;

            // TODO: Match incoming columbus-view or 2D position
            var camera = scene.camera;
            camera.position = Cartesian3.clone(transitioner._camera3D.position);
            camera.direction = Cartesian3.clone(transitioner._camera3D.direction);
            camera.up = Cartesian3.clone(transitioner._camera3D.up);
            camera.right = Cartesian3.cross(camera.direction, camera.up, camera.right);
            Cartesian3.normalize(camera.right, camera.right);
        }

        var wasMorphing = defined(transitioner._completeMorph);
        transitioner._completeMorph = undefined;
        transitioner._scene.morphComplete.raiseEvent(transitioner, transitioner._previousMode, SceneMode.SCENE3D, wasMorphing);
    }

    function complete2DCallback(transitioner) {
        var scene = transitioner._scene;

        scene.mode = SceneMode.SCENE2D;
        scene.morphTime = SceneMode.getMorphTime(SceneMode.SCENE2D);

        destroyMorphHandler(transitioner);
        updateFrustums(transitioner);

        // TODO: Match incoming columbus-view or 3D position
        var camera = scene.camera;
        Cartesian3.clone(transitioner._camera2D.position, camera.position);
        Cartesian3.clone(transitioner._camera2D.direction, camera.direction);
        Cartesian3.clone(transitioner._camera2D.up, camera.up);
        Cartesian3.cross(camera.direction, camera.up, camera.right);
        Cartesian3.normalize(camera.right, camera.right);

        var wasMorphing = defined(transitioner._completeMorph);
        transitioner._completeMorph = undefined;
        transitioner._scene.morphComplete.raiseEvent(transitioner, transitioner._previousMode, SceneMode.SCENE2D, wasMorphing);
    }

    function completeColumbusViewCallback(transitioner) {
        var scene = transitioner._scene;
        scene.mode = SceneMode.COLUMBUS_VIEW;
        scene.morphTime = SceneMode.getMorphTime(SceneMode.COLUMBUS_VIEW);

        destroyMorphHandler(transitioner);
        updateFrustums(transitioner);

        if (transitioner._previousModeMode !== SceneMode.MORPHING || transitioner._morphCancelled) {
            transitioner._morphCancelled = false;

            // TODO: Match incoming 2D or 3D position
            var camera = scene.camera;
            Cartesian3.clone(transitioner._cameraCV.position, camera.position);
            Cartesian3.clone(transitioner._cameraCV.direction, camera.direction);
            Cartesian3.clone(transitioner._cameraCV.up, camera.up);
            Cartesian3.cross(camera.direction, camera.up, camera.right);
            Cartesian3.normalize(camera.right, camera.right);
        }

        var wasMorphing = defined(transitioner._completeMorph);
        transitioner._completeMorph = undefined;
        transitioner._scene.morphComplete.raiseEvent(transitioner, transitioner._previousMode, SceneMode.COLUMBUS_VIEW, wasMorphing);
    }

    return SceneTransitioner;
});
