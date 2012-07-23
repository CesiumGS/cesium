/*global define*/
define([
        '../Core/destroyObject',
        '../Core/Math',
        '../Core/EventHandler',
        '../Core/MouseEventType',
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
        CesiumMath,
        EventHandler,
        MouseEventType,
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
     * DOC_TBA
     *
     * @alias SceneTransitioner
     * @constructor
     */
    var SceneTransitioner = function(scene, ellipsoid) {
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
        frustum.near = 0.01 * maxRadii;
        frustum.far = 60.0 * maxRadii;

        var transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                                    1.0, 0.0, 0.0, 0.0,
                                    0.0, 1.0, 0.0, 0.0,
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
        frustum.near = 0.01 * maxRadii;
        frustum.far = 60.0 * maxRadii;

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

        /**
         * DOC_TBA
         * @type {Number}
         */
        this.morphDuration2D = 3000;

        /**
         * DOC_TBA
         * @type {Number}
         */
        this.morphDuration3D = 3000;

        /**
         * DOC_TBA
         * @type {Number}
         */
        this.morphDurationColumbusView = 3000;

        /**
         * DOC_TBA
         * @type {Boolean}
         */
        this.endMorphOnMouseInput = true;
    };

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
    }

    //in the future the animations will be more complicated
    function addMorphTimeAnimations(transitioner, scene, start, stop, duration, onComplete) {
        //for now, all objects morph at the same rate
        var template = {
            duration : duration,
            easingFunction : Tween.Easing.Quartic.EaseOut
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

        if (typeof onComplete !== 'undefined') {
            template.onComplete = function() {
                onComplete.call(transitioner);
            };
        }

        animation = sceneAnimations.addProperty(scene, 'morphTime', start, stop, template);
        transitioner._currentAnimations.push(animation);
    }

    /**
     * DOC_TBA
     * @memberof SceneTransitioner
     */
    SceneTransitioner.prototype.to2D = function() {
        var scene = this._scene;

        if (scene.mode !== SceneMode.SCENE2D) {
            scene.mode = SceneMode.SCENE2D;
            setMorphTime(scene, 0.0);

            this._destroyMorphHandler();

            var camera = scene.getCamera();
            camera.frustum = this._camera2D.frustum.clone();
            camera.transform = this._camera2D.transform.clone();

            var controllers = camera.getControllers();
            controllers.removeAll();
            controllers.add2D(scene.scene2D.projection);

            // TODO: Match incoming columbus-view or 3D position
            camera.position = this._camera2D.position.clone();
            camera.direction = this._camera2D.direction.clone();
            camera.up = this._camera2D.up.clone();
        }
    };

    /**
     * DOC_TBA
     * @memberof SceneTransitioner
     */
    SceneTransitioner.prototype.toColumbusView = function() {
        var scene = this._scene;
        var previousMode = scene.mode;

        if (scene.mode !== SceneMode.COLUMBUS_VIEW) {
            scene.mode = SceneMode.COLUMBUS_VIEW;
            setMorphTime(scene, 0.0);

            this._destroyMorphHandler();

            var camera = scene.getCamera();
            var controllers = camera.getControllers();
            controllers.removeAll();

            controllers.addColumbusView();

            camera.frustum = this._cameraCV.frustum.clone();
            camera.transform = this._cameraCV.transform.clone();

            if (previousMode !== SceneMode.MORPHING || this._morphCancelled) {
                this._morphCancelled = false;

                // TODO: Match incoming 2D or 3D position
                camera.position = this._cameraCV.position.clone();
                camera.direction = this._cameraCV.direction.clone();
                camera.up = this._cameraCV.up.clone();
            }
        }
    };

    /**
     * DOC_TBA
     * @memberof SceneTransitioner
     */
    SceneTransitioner.prototype.to3D = function() {
        var scene = this._scene;
        var previousMode = scene.mode;

        if (scene.mode !== SceneMode.SCENE3D) {
            scene.mode = SceneMode.SCENE3D;
            setMorphTime(scene, 1.0);

            this._destroyMorphHandler();

            var camera = scene.getCamera();
            var controllers = camera.getControllers();
            controllers.removeAll();
            controllers.addCentralBody();

            camera.frustum = this._camera3D.frustum.clone();
            camera.transform = Matrix4.IDENTITY;

            if (previousMode !== SceneMode.MORPHING || this._morphCancelled) {
                this._morphCancelled = false;

                // TODO: Match incoming columbus-view or 2D position
                camera.position = this._camera3D.position.clone();
                camera.direction = this._camera3D.direction.clone();
                camera.up = this._camera3D.up.clone();
            }
        }
    };

    SceneTransitioner.prototype._createMorphHandler = function(endMorphFunction) {
        var that = this;

        var controllers = this._scene.getCamera().getControllers();
        controllers.removeAll();

        if (this.endMorphOnMouseInput) {
            this._morphHandler = new EventHandler(this._scene.getCanvas());

            var cancelMorph = function() {
                that._morphCancelled = true;
                endMorphFunction.call(that);
            };
            this._morphHandler.setMouseAction(cancelMorph, MouseEventType.LEFT_DOWN);
            this._morphHandler.setMouseAction(cancelMorph, MouseEventType.MIDDLE_DOWN);
            this._morphHandler.setMouseAction(cancelMorph, MouseEventType.RIGHT_DOWN);
            this._morphHandler.setMouseAction(cancelMorph, MouseEventType.WHEEL);
        }
    };

    SceneTransitioner.prototype._destroyMorphHandler = function() {
        var animations = this._scene.getAnimations();
        for ( var i = 0; i < this._currentAnimations.length; ++i) {
            animations.remove(this._currentAnimations[i]);
        }
        this._currentAnimations.length = 0;
        this._morphHandler = this._morphHandler && this._morphHandler.destroy();
    };

    SceneTransitioner.prototype._changeCameraTransform = function(camera, transform) {
        var pos = new Cartesian4(camera.position.x, camera.position.y, camera.position.z, 1.0);
        var dir = new Cartesian4(camera.direction.x, camera.direction.y, camera.direction.z, 0.0);
        var up = new Cartesian4(camera.up.x, camera.up.y, camera.up.z, 0.0);

        var frame = transform.inverseTransformation().multiply(camera.transform);
        camera.transform = transform.clone();

        camera.position = Cartesian3.fromCartesian4(frame.multiplyByVector(pos));
        camera.direction = Cartesian3.fromCartesian4(frame.multiplyByVector(dir));
        camera.up = Cartesian3.fromCartesian4(frame.multiplyByVector(up));
        camera.right = camera.direction.cross(camera.up);
    };

    SceneTransitioner.prototype._columbusViewMorph = function(startPosition, endPosition, time) {
        // Just linear for now.
        return startPosition.lerp(endPosition, time);
    };

    SceneTransitioner.prototype._scenePerspectiveToOrthographic = function(duration, onComplete) {
        var that = this;

        var scene = this._scene;
        var camera = scene.getCamera();

        var startPos = camera.position;
        var startFOVy = camera.frustum.fovy;
        var endFOVy = CesiumMath.RADIANS_PER_DEGREE * 0.5;
        var d = startPos.magnitude() * Math.tan(startFOVy * 0.5);

        // TODO: remove this when multi-frustum is implemented.
        camera.frustum.far = d / Math.tan(endFOVy * 0.5) + 10000000.0;

        var update = function(value) {
            camera.frustum.fovy = CesiumMath.lerp(startFOVy, endFOVy, value.time);

            var distance = d / Math.tan(camera.frustum.fovy * 0.5);
            camera.position = camera.position.normalize().multiplyByScalar(distance);
        };

        var animation = scene.getAnimations().add({
            duration : duration,
            easingFunction : Tween.Easing.Quartic.EaseOut,
            startValue : {
                time : 0.0
            },
            stopValue : {
                time : 1.0
            },
            onUpdate : update,
            onComplete : function() {
                camera.frustum = that._camera2D.frustum.clone();
                onComplete.call(that);
            }
        });
        this._currentAnimations.push(animation);
    };

    SceneTransitioner.prototype._sceneCVTo2D = function(duration, onComplete) {
        var that = this;

        var scene = this._scene;
        var camera = scene.getCamera();
        var maxRadii = this._ellipsoid.getMaximumRadius();

        this._changeCameraTransform(camera, this._cameraCV.transform);

        var startPos = camera.position.clone();
        var startDir = camera.direction.clone();
        var startUp = camera.up.clone();

        var tanPhi = Math.tan(this._cameraCV.frustum.fovy * 0.5);
        var tanTheta = this._cameraCV.frustum.aspectRatio * tanPhi;
        var d = (maxRadii * Math.PI) / tanTheta;

        var endPos = this._camera2D.position.normalize().multiplyByScalar(d);
        var endDir = that._camera2D.direction.clone();
        var endUp = that._camera2D.up.clone();

        var updateCV = function(value) {
            camera.position = that._columbusViewMorph(startPos, endPos, value.time);
            camera.direction = that._columbusViewMorph(startDir, endDir, value.time);
            camera.up = that._columbusViewMorph(startUp, endUp, value.time);
            camera.right = camera.direction.cross(camera.up);
        };

        duration = duration * 0.5;
        var animation = scene.getAnimations().add({
            duration : duration,
            easingFunction : Tween.Easing.Quartic.EaseOut,
            startValue : {
                time : 0.0
            },
            stopValue : {
                time : 1.0
            },
            onUpdate : updateCV,
            onComplete : function() {
                that._scenePerspectiveToOrthographic(duration, onComplete);
            }
        });
        this._currentAnimations.push(animation);
    };

    SceneTransitioner.prototype._scene3DTo2D = function(duration, onComplete) {
        duration = duration * 0.5;

        var maxRadii = this._ellipsoid.getMaximumRadius();

        var tanPhi = Math.tan(this._camera3D.frustum.fovy * 0.5);
        var tanTheta = this._camera3D.frustum.aspectRatio * tanPhi;
        var d = (maxRadii * Math.PI) / tanTheta;

        var camera3DTo2D = {};
        camera3DTo2D.position = this._camera2D.position.normalize().multiplyByScalar(d);
        camera3DTo2D.direction = this._camera2D.direction.clone();
        camera3DTo2D.up = this._camera2D.up.clone();

        var complete = function() {
            this._scenePerspectiveToOrthographic(duration, onComplete);
        };
        this._scene3DToCV(duration, camera3DTo2D, complete);
    };

    SceneTransitioner.prototype._sceneOrthographicToPerspective = function(duration, onComplete) {
        var that = this;

        var scene = this._scene;
        var camera = scene.getCamera();
        var maxRadii = this._ellipsoid.getMaximumRadius();

        var tanPhi = Math.tan(this._cameraCV.frustum.fovy * 0.5);
        var tanTheta = this._cameraCV.frustum.aspectRatio * tanPhi;
        var d = (maxRadii * Math.PI) / tanTheta;
        var endPos2D = this._camera2D.position.normalize().multiplyByScalar(d);

        var top = camera.frustum.top;
        var bottom = camera.frustum.bottom;
        var right = camera.frustum.right;
        var left = camera.frustum.left;

        var frustum2D = this._camera2D.frustum;
        var frustumCV = this._cameraCV.frustum;

        var startPos = camera.position.clone();

        var update2D = function(value) {
            camera.position = that._columbusViewMorph(startPos, endPos2D, value.time);
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
        if (partialDuration === 0 && Cartesian2.magnitude(Cartesian2.subtract(startPos, endPos2D, startPos)) !== 0) {
            partialDuration = duration;
            startTime = 0.0;
            endTime = 1.0;
        }

        var animation = scene.getAnimations().add({
            easingFunction : Tween.Easing.Quartic.EaseOut,
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
                onComplete.call(that);
            }
        });
        this._currentAnimations.push(animation);
    };

    SceneTransitioner.prototype._scene2DToCV = function(duration, onComplete) {
        var that = this;

        var scene = this._scene;
        var camera = scene.getCamera();

        duration = duration * 0.5;

        var completeFrustumChange = function() {
            var startPos = camera.position.clone();
            var startDir = camera.direction.clone();
            var startUp = camera.up.clone();

            var endPos = that._cameraCV.position.clone();
            var endDir = that._cameraCV.direction.clone();
            var endUp = that._cameraCV.up.clone();

            var updateCV = function(value) {
                camera.position = that._columbusViewMorph(startPos, endPos, value.time);
                camera.direction = that._columbusViewMorph(startDir, endDir, value.time);
                camera.up = that._columbusViewMorph(startUp, endUp, value.time);
                camera.right = camera.direction.cross(camera.up);
            };

            var animation = scene.getAnimations().add({
                duration : duration,
                easingFunction : Tween.Easing.Quartic.EaseOut,
                startValue : {
                    time : 0.0
                },
                stopValue : {
                    time : 1.0
                },
                onUpdate : updateCV,
                onComplete : function() {
                    onComplete.call(that);
                }
            });

            that._currentAnimations.push(animation);
        };

        this._sceneOrthographicToPerspective(duration, completeFrustumChange);
    };

    SceneTransitioner.prototype._scene3DToCV = function(duration, endCamera, onComplete) {
        var that = this;

        var scene = this._scene;

        var camera = scene.getCamera();
        this._changeCameraTransform(camera, this._cameraCV.transform);

        var startPos = camera.position.clone();
        var startDir = camera.direction.clone();
        var startUp = camera.up.clone();

        var endPos = endCamera.position.clone();
        var endDir = endCamera.direction.clone();
        var endUp = endCamera.up.clone();

        var update = function(value) {
            camera.position = that._columbusViewMorph(startPos, endPos, value.time);
            camera.direction = that._columbusViewMorph(startDir, endDir, value.time);
            camera.up = that._columbusViewMorph(startUp, endUp, value.time);
            camera.right = camera.direction.cross(camera.up);
        };

        var animation = scene.getAnimations().add({
            duration : duration,
            easingFunction : Tween.Easing.Quartic.EaseOut,
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
        this._currentAnimations.push(animation);

        addMorphTimeAnimations(this, scene, 1.0, 0.0, duration, onComplete);
    };

    SceneTransitioner.prototype._scene2DTo3D = function(duration, onComplete) {
        duration = duration * 0.5;

        var camera = this._scene.getCamera();

        this._sceneOrthographicToPerspective(duration, function() {
            camera.frustum = this._cameraCV.frustum.clone();
            camera.transform = this._cameraCV.transform.clone();
            this._sceneCVTo3D(duration, onComplete);
        });
    };

    SceneTransitioner.prototype._sceneCVTo3D = function(duration, onComplete) {
        var scene = this._scene;

        var that = this;

        var camera = scene.getCamera();
        this._changeCameraTransform(camera, Matrix4.IDENTITY);

        var startPos = camera.position;
        var startDir = camera.direction;
        var startUp = camera.up;

        var maxRadii = this._ellipsoid.getMaximumRadius();
        var endPos = this._ellipsoid.cartographicToCartesian(new Cartographic(0.0, 0.0, 10.0));
        endPos = endPos.normalize().multiplyByScalar(2.0 * maxRadii);
        var endDir = Cartesian3.ZERO.subtract(endPos).normalize();
        var endRight = endDir.cross(Cartesian3.UNIT_Z).normalize();
        var endUp = endRight.cross(endDir);

        var update = function(value) {
            camera.position = that._columbusViewMorph(startPos, endPos, value.time);
            camera.direction = that._columbusViewMorph(startDir, endDir, value.time);
            camera.up = that._columbusViewMorph(startUp, endUp, value.time);
            camera.right = camera.direction.cross(camera.up);
        };

        var animation = scene.getAnimations().add({
            duration : duration,
            easingFunction : Tween.Easing.Quartic.EaseOut,
            startValue : {
                time : 0.0
            },
            stopValue : {
                time : 1.0
            },
            onUpdate : update
        });
        this._currentAnimations.push(animation);

        addMorphTimeAnimations(this, scene, 0.0, 1.0, duration, onComplete);
    };

    /**
     * DOC_TBA
     * @memberof SceneTransitioner
     */
    SceneTransitioner.prototype.morphTo2D = function() {
        var previousMode = this._scene.mode;

        if (previousMode === SceneMode.SCENE2D || previousMode === SceneMode.MORPHING) {
            return;
        }

        this._scene.mode = SceneMode.MORPHING;
        this._createMorphHandler(this.to2D);

        if (previousMode === SceneMode.COLUMBUS_VIEW) {
            this._sceneCVTo2D(this.morphDuration2D, this.to2D);
        } else {
            this._scene3DTo2D(this.morphDuration2D, this.to2D);
        }
    };

    /**
     * DOC_TBA
     * @memberof SceneTransitioner
     */
    SceneTransitioner.prototype.morphToColumbusView = function() {
        var previousMode = this._scene.mode;

        if (previousMode === SceneMode.COLUMBUS_VIEW || previousMode === SceneMode.MORPHING) {
            return;
        }

        this._scene.mode = SceneMode.MORPHING;
        this._createMorphHandler(this.toColumbusView);

        if (previousMode === SceneMode.SCENE2D) {
            this._scene2DToCV(this.morphDurationColumbusView, this.toColumbusView);
        } else {
            this._scene3DToCV(this.morphDurationColumbusView, this._cameraCV, this.toColumbusView);
        }
    };

    /**
     * DOC_TBA
     * @memberof SceneTransitioner
     */
    SceneTransitioner.prototype.morphTo3D = function() {
        var scene = this._scene;
        var previousMode = scene.mode;

        if (previousMode === SceneMode.SCENE3D || previousMode === SceneMode.MORPHING) {
            return;
        }

        scene.mode = SceneMode.MORPHING;
        this._createMorphHandler(this.to3D);

        if (previousMode === SceneMode.SCENE2D) {
            this._scene2DTo3D(this.morphDuration3D, this.to3D);
        } else {
            this._sceneCVTo3D(this.morphDuration3D, this.to3D);
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof SceneTransitioner
     *
     * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see SceneTransitioner#destroy
     */
    SceneTransitioner.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof SceneTransitioner
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see SceneTransitioner#isDestroyed
     *
     * @example
     * transitioner = transitioner && transitioner.destroy();
     */
    SceneTransitioner.prototype.destroy = function() {
        this._destroyMorphHandler();
        return destroyObject(this);
    };

    return SceneTransitioner;
});