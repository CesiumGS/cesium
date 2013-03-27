/*global define*/
define([
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Event',
        '../Core/ScreenSpaceEventHandler',
        '../Core/ScreenSpaceEventType',
        '../Core/Ellipsoid',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Cartographic',
        '../Core/Matrix4',
        '../ThirdParty/Tween',
        './OrthographicFrustum',
        './PerspectiveFrustum',
        './SceneMode'
    ], function(
        destroyObject,
        DeveloperError,
        CesiumMath,
        Event,
        ScreenSpaceEventHandler,
        ScreenSpaceEventType,
        Ellipsoid,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Cartographic,
        Matrix4,
        Tween,
        OrthographicFrustum,
        PerspectiveFrustum,
        SceneMode) {
    "use strict";

    /**
     * Transitions the scene among available modes. The transitions can
     * either be instantaneous or animated.
     * @alias SceneTransitioner
     * @constructor
     *
     * @param {Scene} scene The scene to be transitioned.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to be transitioned.
     *
     * @exception {DeveloperError} scene is required.
     *
     * @see Scene
     * @see SceneMode
     */
    var SceneTransitioner = function(scene, ellipsoid) {
        if (typeof scene === 'undefined') {
            throw new DeveloperError('scene is required.');
        }

        /**
         * Gets or sets the amount of time, in milliseconds, for
         * transition animations to complete.
         * @type {Number}
         */
        this.morphDuration = 2000;

        /**
         * Gets or sets whether or not to instantly complete the
         * transition animation on user input.
         * @type {Boolean}
         */
        this.completeMorphOnUserInput = true;

        /**
         * Gets the event fired at the beginning of a transition.
         * @type {Event}
         */
        this.onTransitionStart = new Event();

        /**
         * Gets the event fired at the completion of a transition.
         * @type {Event}
         */
        this.onTransitionComplete = new Event();

        this._scene = scene;
        this._ellipsoid = ellipsoid || Ellipsoid.WGS84;
        var canvas = scene.getCanvas();

        // Position camera and size frustum so the entire 2D map is visible
        var maxRadii = this._ellipsoid.getMaximumRadius();
        var position = new Cartesian3(0.0, 0.0, 2.0 * maxRadii);
        var direction = position.negate().normalize();
        var up = Cartesian3.UNIT_Y;

        var frustum = new OrthographicFrustum();
        frustum.right = maxRadii * Math.PI;
        frustum.left = -frustum.right;
        frustum.top = frustum.right * (canvas.clientHeight / canvas.clientWidth);
        frustum.bottom = -frustum.top;

        var transform = new Matrix4(0.0, 0.0, 1.0, 0.0, //
                                    1.0, 0.0, 0.0, 0.0, //
                                    0.0, 1.0, 0.0, 0.0, //
                                    0.0, 0.0, 0.0, 1.0);

        this._camera2D = {
            position : position,
            direction : direction,
            up : up,
            frustum : frustum,
            transform : transform
        };

        position = new Cartesian3(0.0, -1.0, 1.0).normalize().multiplyByScalar(5.0 * maxRadii);
        direction = Cartesian3.ZERO.subtract(position).normalize();
        var right = direction.cross(Cartesian3.UNIT_Z).normalize();
        up = right.cross(direction);

        frustum = new PerspectiveFrustum();
        frustum.fovy = CesiumMath.toRadians(60.0);
        frustum.aspectRatio = canvas.clientWidth / canvas.clientHeight;

        this._cameraCV = {
            position : position,
            direction : direction,
            up : up,
            frustum : frustum,
            transform : transform
        };

        position = new Cartesian3(0.0, -2.0, 1.0).normalize().multiplyByScalar(2.0 * maxRadii);
        direction = Cartesian3.ZERO.subtract(position).normalize();
        right = direction.cross(Cartesian3.UNIT_Z).normalize();
        up = right.cross(direction);

        this._camera3D = {
            position : position,
            direction : direction,
            up : up,
            frustum : frustum
        };

        this._currentAnimations = [];
        this._morphHandler = undefined;
        this._morphCancelled = false;
        this._completeMorph = undefined;
    };

    /**
     * @memberof SceneTransitioner
     * @returns {Scene} The scene to be transitioned.
     */
    SceneTransitioner.prototype.getScene = function() {
        return this._scene;
    };

    /**
     * @memberof SceneTransitioner
     * @returns {Ellipsoid} The ellipsoid to be transitioned.
     */
    SceneTransitioner.prototype.getEllipsoid = function() {
        return this._ellipsoid;
    };

    /**
     * Instantly transitions the scene to 2D.
     * @memberof SceneTransitioner
     */
    SceneTransitioner.prototype.to2D = function() {
        if (typeof this._completeMorph !== 'undefined') {
            this._completeMorph();
        }

        this._previousMode = this._scene.mode;
        if (this._previousMode !== SceneMode.SCENE2D) {
            this.onTransitionStart.raiseEvent(this, this._previousMode, SceneMode.SCENE2D, false);
            complete2DCallback(this);
        }
    };

    /**
     * Instantly transitions the scene to Columbus View.
     * @memberof SceneTransitioner
     */
    SceneTransitioner.prototype.toColumbusView = function() {
        if (typeof this._completeMorph !== 'undefined') {
            this._completeMorph();
        }

        var scene = this._scene;
        this._previousMode = scene.mode;

        if (this._previousMode !== SceneMode.COLUMBUS_VIEW) {
            this.onTransitionStart.raiseEvent(this, this._previousMode, SceneMode.COLUMBUS_VIEW, false);
            completeColumbusViewCallback(this);
        }
    };

    /**
     * Instantly transitions the scene to 3D.
     * @memberof SceneTransitioner
     */
    SceneTransitioner.prototype.to3D = function() {
        if (typeof this._completeMorph !== 'undefined') {
            this._completeMorph();
        }

        var scene = this._scene;
        this._previousMode = scene.mode;

        if (scene.mode !== SceneMode.SCENE3D) {
            this.onTransitionStart.raiseEvent(this, this._previousMode, SceneMode.SCENE3D, false);
            complete3DCallback(this);
        }
    };

    /**
     * Instantly completes an active transition.
     * @memberof SceneTransitioner
     *
     * @exception {DeveloperError} completeMorph can only be called during a transition.
     */
    SceneTransitioner.prototype.completeMorph = function() {
        if (typeof this._completeMorph === 'undefined') {
            throw new DeveloperError('completeMorph can only be called while morphing');
        }
        this._completeMorph();
    };

    /**
     * Asynchronously transitions the scene to 2D.
     * @memberof SceneTransitioner
     */
    SceneTransitioner.prototype.morphTo2D = function() {
        if (typeof this._completeMorph !== 'undefined') {
            this._completeMorph();
        }

        var currentMode = this._scene.mode;
        if (currentMode === SceneMode.SCENE2D || currentMode === SceneMode.MORPHING) {
            return;
        }
        this.onTransitionStart.raiseEvent(this, currentMode, SceneMode.SCENE2D, true);
        this._previousMode = SceneMode.MORPHING;

        updateFrustums(this);
        this._scene.mode = SceneMode.MORPHING;
        createMorphHandler(this, complete2DCallback);

        if (currentMode === SceneMode.COLUMBUS_VIEW) {
            morphFromColumbusViewTo2D(this, this.morphDuration, complete2DCallback);
        } else {
            morphFrom3DTo2D(this, this.morphDuration, complete2DCallback);
        }
    };

    /**
     * Asynchronously transitions the scene to Columbus View.
     * @memberof SceneTransitioner
     */
    SceneTransitioner.prototype.morphToColumbusView = function() {
        if (typeof this._completeMorph !== 'undefined') {
            this._completeMorph();
        }

        var currentMode = this._scene.mode;
        if (currentMode === SceneMode.COLUMBUS_VIEW || currentMode === SceneMode.MORPHING) {
            return;
        }
        this.onTransitionStart.raiseEvent(this, currentMode, SceneMode.COLUMBUS_VIEW, true);
        this._previousMode = SceneMode.MORPHING;

        updateFrustums(this);
        this._scene.mode = SceneMode.MORPHING;
        createMorphHandler(this, completeColumbusViewCallback);

        if (currentMode === SceneMode.SCENE2D) {
            morphFrom2DToColumbusView(this, this.morphDuration, completeColumbusViewCallback);
        } else {
            morphFrom3DToColumbusView(this, this.morphDuration, this._cameraCV, completeColumbusViewCallback);
        }
    };

    /**
     * Asynchronously transitions the scene to 3D.
     * @memberof SceneTransitioner
     */
    SceneTransitioner.prototype.morphTo3D = function() {
        if (typeof this._completeMorph !== 'undefined') {
            this._completeMorph();
        }

        var scene = this._scene;
        this._previousMode = scene.mode;

        if (this._previousMode === SceneMode.SCENE3D || this._previousMode === SceneMode.MORPHING) {
            return;
        }
        this.onTransitionStart.raiseEvent(this, this._previousMode, SceneMode.SCENE3D, true);
        this._previousMode = SceneMode.MORPHING;

        updateFrustums(this);
        scene.mode = SceneMode.MORPHING;
        createMorphHandler(this, complete3DCallback);

        if (this._previousMode === SceneMode.SCENE2D) {
            morphFrom2DTo3D(this, this.morphDuration, complete3DCallback);
        } else {
            morphFromColumbusViewTo3D(this, this.morphDuration, complete3DCallback);
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     * @memberof SceneTransitioner
     *
     * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     */
    SceneTransitioner.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     * @memberof SceneTransitioner
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

    function setCameraTransform(camera, transform) {
        var pos = new Cartesian4(camera.position.x, camera.position.y, camera.position.z, 1.0);
        var dir = new Cartesian4(camera.direction.x, camera.direction.y, camera.direction.z, 0.0);
        var up = new Cartesian4(camera.up.x, camera.up.y, camera.up.z, 0.0);

        var frame = transform.inverseTransformation().multiply(camera.transform);
        camera.transform = transform.clone();

        camera.position = Cartesian3.fromCartesian4(frame.multiplyByVector(pos));
        camera.direction = Cartesian3.fromCartesian4(frame.multiplyByVector(dir));
        camera.up = Cartesian3.fromCartesian4(frame.multiplyByVector(up));
        camera.right = camera.direction.cross(camera.up);
    }

    function createMorphHandler(transitioner, completeMorphFunction) {
        if (transitioner.completeMorphOnUserInput) {
            transitioner._morphHandler = new ScreenSpaceEventHandler(transitioner._scene.getCanvas());

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
        var animations = transitioner._scene.getAnimations();
        for ( var i = 0; i < transitioner._currentAnimations.length; ++i) {
            animations.remove(transitioner._currentAnimations[i]);
        }
        transitioner._currentAnimations.length = 0;
        transitioner._morphHandler = transitioner._morphHandler && transitioner._morphHandler.destroy();
    }

    function morphFromColumbusViewTo3D(transitioner, duration, onComplete) {
        var scene = transitioner._scene;

        var camera = scene.getCamera();
        setCameraTransform(camera, Matrix4.IDENTITY);

        var startPos = camera.position;
        var startDir = camera.direction;
        var startUp = camera.up;

        var maxRadii = transitioner._ellipsoid.getMaximumRadius();
        var endPos = transitioner._ellipsoid.cartographicToCartesian(new Cartographic(0.0, 0.0, 10.0));
        endPos = endPos.normalize().multiplyByScalar(2.0 * maxRadii);
        var endDir = Cartesian3.ZERO.subtract(endPos).normalize();
        var endRight = endDir.cross(Cartesian3.UNIT_Z).normalize();
        var endUp = endRight.cross(endDir);

        var update = function(value) {
            camera.position = columbusViewMorph(startPos, endPos, value.time);
            camera.direction = columbusViewMorph(startDir, endDir, value.time);
            camera.up = columbusViewMorph(startUp, endUp, value.time);
            camera.right = camera.direction.cross(camera.up);
        };

        var animation = scene.getAnimations().add({
            duration : duration,
            easingFunction : Tween.Easing.Quartic.Out,
            startValue : {
                time : 0.0
            },
            stopValue : {
                time : 1.0
            },
            onUpdate : update
        });
        transitioner._currentAnimations.push(animation);

        addMorphTimeAnimations(transitioner, scene, 0.0, 1.0, duration, onComplete);
    }

    function morphFrom2DTo3D(transitioner, duration, onComplete) {
        duration = duration * 0.5;

        var camera = transitioner._scene.getCamera();

        morphOrthographicToPerspective(transitioner, duration, function() {
            camera.frustum = transitioner._cameraCV.frustum.clone();
            camera.transform = transitioner._cameraCV.transform.clone();
            morphFromColumbusViewTo3D(transitioner, duration, onComplete);
        });
    }

    function columbusViewMorph(startPosition, endPosition, time) {
        // Just linear for now.
        return startPosition.lerp(endPosition, time);
    }

    function morphPerspectiveToOrthographic(transitioner, duration, onComplete) {
        var scene = transitioner._scene;
        var camera = scene.getCamera();

        var startPos = camera.position;
        var startFOVy = camera.frustum.fovy;
        var endFOVy = CesiumMath.RADIANS_PER_DEGREE * 0.5;
        var d = startPos.magnitude() * Math.tan(startFOVy * 0.5);
        camera.frustum.far = d / Math.tan(endFOVy * 0.5) + 10000000.0;

        var update = function(value) {
            camera.frustum.fovy = CesiumMath.lerp(startFOVy, endFOVy, value.time);

            var distance = d / Math.tan(camera.frustum.fovy * 0.5);
            camera.position = camera.position.normalize().multiplyByScalar(distance);
        };

        var animation = scene.getAnimations().add({
            duration : duration,
            easingFunction : Tween.Easing.Quartic.Out,
            startValue : {
                time : 0.0
            },
            stopValue : {
                time : 1.0
            },
            onUpdate : update,
            onComplete : function() {
                camera.frustum = transitioner._camera2D.frustum.clone();
                onComplete(transitioner);
            }
        });
        transitioner._currentAnimations.push(animation);
    }

    function morphFromColumbusViewTo2D(transitioner, duration, onComplete) {
        var scene = transitioner._scene;
        var camera = scene.getCamera();
        var maxRadii = transitioner._ellipsoid.getMaximumRadius();

        setCameraTransform(camera, transitioner._cameraCV.transform);

        var startPos = camera.position.clone();
        var startDir = camera.direction.clone();
        var startUp = camera.up.clone();

        var tanPhi = Math.tan(transitioner._cameraCV.frustum.fovy * 0.5);
        var tanTheta = transitioner._cameraCV.frustum.aspectRatio * tanPhi;
        var d = (maxRadii * Math.PI) / tanTheta;

        var endPos = transitioner._camera2D.position.normalize().multiplyByScalar(d);
        var endDir = transitioner._camera2D.direction.clone();
        var endUp = transitioner._camera2D.up.clone();

        var updateCV = function(value) {
            camera.position = columbusViewMorph(startPos, endPos, value.time);
            camera.direction = columbusViewMorph(startDir, endDir, value.time);
            camera.up = columbusViewMorph(startUp, endUp, value.time);
            camera.right = camera.direction.cross(camera.up);
        };

        duration = duration * 0.5;
        var animation = scene.getAnimations().add({
            duration : duration,
            easingFunction : Tween.Easing.Quartic.Out,
            startValue : {
                time : 0.0
            },
            stopValue : {
                time : 1.0
            },
            onUpdate : updateCV,
            onComplete : function() {
                morphPerspectiveToOrthographic(transitioner, duration, onComplete);
            }
        });
        transitioner._currentAnimations.push(animation);
    }

    function morphFrom3DTo2D(transitioner, duration, onComplete) {
        duration = duration * 0.5;

        var maxRadii = transitioner._ellipsoid.getMaximumRadius();

        var tanPhi = Math.tan(transitioner._camera3D.frustum.fovy * 0.5);
        var tanTheta = transitioner._camera3D.frustum.aspectRatio * tanPhi;
        var d = (maxRadii * Math.PI) / tanTheta;

        var camera3DTo2D = {};
        camera3DTo2D.position = transitioner._camera2D.position.normalize().multiplyByScalar(d);
        camera3DTo2D.direction = transitioner._camera2D.direction.clone();
        camera3DTo2D.up = transitioner._camera2D.up.clone();

        var complete = function() {
            morphPerspectiveToOrthographic(transitioner, duration, onComplete);
        };
        morphFrom3DToColumbusView(transitioner, duration, camera3DTo2D, complete);
    }

    function morphOrthographicToPerspective(transitioner, duration, onComplete) {
        var scene = transitioner._scene;
        var camera = scene.getCamera();
        var maxRadii = transitioner._ellipsoid.getMaximumRadius();

        var tanPhi = Math.tan(transitioner._cameraCV.frustum.fovy * 0.5);
        var tanTheta = transitioner._cameraCV.frustum.aspectRatio * tanPhi;
        var d = (maxRadii * Math.PI) / tanTheta;
        var endPos2D = transitioner._camera2D.position.normalize().multiplyByScalar(d);

        var top = camera.frustum.top;
        var bottom = camera.frustum.bottom;
        var right = camera.frustum.right;
        var left = camera.frustum.left;

        var frustum2D = transitioner._camera2D.frustum;
        var frustumCV = transitioner._cameraCV.frustum;

        var startPos = camera.position.clone();

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
            if (!startPos.equalsEpsilon(endPos2D, CesiumMath.EPSILON6)) {
                partialDuration = duration;
                startTime = 0.0;
                endTime = 1.0;
            } else {
                // If the camera and frustum are already in position for the switch to
                // a perspective projection, nothing needs to be animated.
                camera.position = endPos2D;
                camera.frustum = frustumCV.clone();
                onComplete(transitioner);
                return;
            }
        }

        var animation = scene.getAnimations().add({
            easingFunction : Tween.Easing.Quartic.Out,
            duration : partialDuration,
            startValue : {
                time : startTime
            },
            stopValue : {
                time : endTime
            },
            onUpdate : update2D,
            onComplete : function() {
                camera.frustum = frustumCV.clone();
                onComplete(transitioner);
            }
        });
        transitioner._currentAnimations.push(animation);
    }

    function morphFrom2DToColumbusView(transitioner, duration, onComplete) {
        var scene = transitioner._scene;
        var camera = scene.getCamera();

        duration = duration * 0.5;

        var completeFrustumChange = function() {
            var startPos = camera.position.clone();
            var startDir = camera.direction.clone();
            var startUp = camera.up.clone();

            var endPos = transitioner._cameraCV.position.clone();
            var endDir = transitioner._cameraCV.direction.clone();
            var endUp = transitioner._cameraCV.up.clone();

            var updateCV = function(value) {
                camera.position = columbusViewMorph(startPos, endPos, value.time);
                camera.direction = columbusViewMorph(startDir, endDir, value.time);
                camera.up = columbusViewMorph(startUp, endUp, value.time);
                camera.right = camera.direction.cross(camera.up);
            };

            var animation = scene.getAnimations().add({
                duration : duration,
                easingFunction : Tween.Easing.Quartic.Out,
                startValue : {
                    time : 0.0
                },
                stopValue : {
                    time : 1.0
                },
                onUpdate : updateCV,
                onComplete : function() {
                    onComplete(transitioner);
                }
            });

            transitioner._currentAnimations.push(animation);
        };

        morphOrthographicToPerspective(transitioner, duration, completeFrustumChange);
    }

    function morphFrom3DToColumbusView(transitioner, duration, endCamera, onComplete) {
        var scene = transitioner._scene;

        var camera = scene.getCamera();
        setCameraTransform(camera, transitioner._cameraCV.transform);

        var startPos = camera.position.clone();
        var startDir = camera.direction.clone();
        var startUp = camera.up.clone();

        var endPos = endCamera.position.clone();
        var endDir = endCamera.direction.clone();
        var endUp = endCamera.up.clone();

        var update = function(value) {
            camera.position = columbusViewMorph(startPos, endPos, value.time);
            camera.direction = columbusViewMorph(startDir, endDir, value.time);
            camera.up = columbusViewMorph(startUp, endUp, value.time);
            camera.right = camera.direction.cross(camera.up);
        };

        var animation = scene.getAnimations().add({
            duration : duration,
            easingFunction : Tween.Easing.Quartic.Out,
            startValue : {
                time : 0.0
            },
            stopValue : {
                time : 1.0
            },
            onUpdate : update,
            onComplete : function() {
                camera.position = endPos;
                camera.direction = endDir;
                camera.up = endUp;
            }
        });
        transitioner._currentAnimations.push(animation);

        addMorphTimeAnimations(transitioner, scene, 1.0, 0.0, duration, onComplete);
    }

    //immediately set the morph time of all objects in the scene
    function setMorphTime(scene, morphTime) {
        scene.morphTime = morphTime;

        var primitives = scene.getPrimitives();
        for ( var i = 0, len = primitives.getLength(); i < len; i++) {
            var primitive = primitives.get(i);
            if (typeof primitive.morphTime !== 'undefined') {
                primitive.morphTime = morphTime;
            }
        }

        var centralBody = primitives.getCentralBody();
        centralBody.morphTime = morphTime;

        if (typeof scene.skyBox !== 'undefined') {
            scene.skyBox.morphTime = morphTime;
        }

        if (typeof scene.skyAtmosphere !== 'undefined') {
            scene.skyAtmosphere.morphTime = morphTime;
        }
    }

    //in the future the animations will be more complicated
    function addMorphTimeAnimations(transitioner, scene, start, stop, duration, onComplete) {
        //for now, all objects morph at the same rate
        var template = {
            duration : duration,
            easingFunction : Tween.Easing.Quartic.Out
        };

        var primitives = scene.getPrimitives();
        var sceneAnimations = scene.getAnimations();
        var animation;
        for ( var i = 0, len = primitives.getLength(); i < len; i++) {
            var primitive = primitives.get(i);
            if (typeof primitive.morphTime !== 'undefined') {
                animation = sceneAnimations.addProperty(primitive, 'morphTime', start, stop, template);
                transitioner._currentAnimations.push(animation);
            }
        }

        var centralBody = primitives.getCentralBody();
        animation = sceneAnimations.addProperty(centralBody, 'morphTime', start, stop, template);
        transitioner._currentAnimations.push(animation);

        if (typeof scene.skyBox !== 'undefined') {
            animation = sceneAnimations.addProperty(scene.skyBox, 'morphTime', start, stop, template);
            transitioner._currentAnimations.push(animation);
        }

        if (typeof scene.skyAtmosphere !== 'undefined') {
            animation = sceneAnimations.addProperty(scene.skyAtmosphere, 'morphTime', start, stop, template);
            transitioner._currentAnimations.push(animation);
        }

        if (typeof onComplete !== 'undefined') {
            template.onComplete = function() {
                onComplete(transitioner);
            };
        }

        animation = sceneAnimations.addProperty(scene, 'morphTime', start, stop, template);
        transitioner._currentAnimations.push(animation);
    }

    function updateFrustums(transitioner) {
        var scene = transitioner._scene;

        var canvas = scene.getCanvas();
        var ratio = canvas.clientHeight / canvas.clientWidth;

        var frustum = transitioner._camera2D.frustum;
        frustum.top = frustum.right * ratio;
        frustum.bottom = -frustum.top;

        ratio = 1.0 / ratio;

        frustum = transitioner._cameraCV.frustum;
        frustum.aspectRatio = ratio;

        frustum = transitioner._camera3D.frustum;
        frustum.aspectRatio = ratio;

        var camera = scene.getCamera();
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
        setMorphTime(scene, 1.0);

        destroyMorphHandler(transitioner);

        updateFrustums(transitioner);
        var camera = scene.getCamera();
        camera.transform = Matrix4.IDENTITY.clone();

        if (transitioner._previousMode !== SceneMode.MORPHING || transitioner._morphCancelled) {
            transitioner._morphCancelled = false;

            // TODO: Match incoming columbus-view or 2D position
            camera.position = transitioner._camera3D.position.clone();
            camera.direction = transitioner._camera3D.direction.clone();
            camera.up = transitioner._camera3D.up.clone();
        }

        var wasMorphing = typeof transitioner._completeMorph !== 'undefined';
        transitioner._completeMorph = undefined;
        transitioner.onTransitionComplete.raiseEvent(transitioner, transitioner._previousMode, SceneMode.SCENE3D, wasMorphing);
    }

    function complete2DCallback(transitioner) {
        var scene = transitioner._scene;

        scene.mode = SceneMode.SCENE2D;
        setMorphTime(scene, 0.0);

        destroyMorphHandler(transitioner);

        updateFrustums(transitioner);
        var camera = scene.getCamera();
        camera.transform = transitioner._camera2D.transform.clone();

        // TODO: Match incoming columbus-view or 3D position
        camera.position = transitioner._camera2D.position.clone();
        camera.direction = transitioner._camera2D.direction.clone();
        camera.up = transitioner._camera2D.up.clone();

        var wasMorphing = typeof transitioner._completeMorph !== 'undefined';
        transitioner._completeMorph = undefined;
        transitioner.onTransitionComplete.raiseEvent(transitioner, transitioner._previousMode, SceneMode.SCENE2D, wasMorphing);
    }

    function completeColumbusViewCallback(transitioner) {
        var scene = transitioner._scene;
        scene.mode = SceneMode.COLUMBUS_VIEW;
        setMorphTime(scene, 0.0);

        destroyMorphHandler(transitioner);

        updateFrustums(transitioner);
        var camera = scene.getCamera();
        camera.transform = transitioner._cameraCV.transform.clone();

        if (transitioner._previousModeMode !== SceneMode.MORPHING || transitioner._morphCancelled) {
            transitioner._morphCancelled = false;

            // TODO: Match incoming 2D or 3D position
            camera.position = transitioner._cameraCV.position.clone();
            camera.direction = transitioner._cameraCV.direction.clone();
            camera.up = transitioner._cameraCV.up.clone();
            camera.right = camera.direction.cross(camera.up);
        }

        var wasMorphing = typeof transitioner._completeMorph !== 'undefined';
        transitioner._completeMorph = undefined;
        transitioner.onTransitionComplete.raiseEvent(transitioner, transitioner._previousMode, SceneMode.COLUMBUS_VIEW, wasMorphing);
    }

    return SceneTransitioner;
});
