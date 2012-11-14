/*global define*/
define([
        '../Core/destroyObject',
        '../Core/Ellipsoid',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Math',
        '../Core/Matrix4',
        './CameraEventHandler',
        './CameraEventType',
        './CameraSpindleController',
        './CameraFreeLookController',
        './CameraHelpers',
        './AnimationCollection',
        '../ThirdParty/Tween'
    ], function(
        destroyObject,
        Ellipsoid,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        CesiumMath,
        Matrix4,
        CameraEventHandler,
        CameraEventType,
        CameraSpindleController,
        CameraFreeLookController,
        CameraHelpers,
        AnimationCollection,
        Tween) {
    "use strict";

    var maintainInertia = CameraHelpers.maintainInertia;
    var handleZoom = CameraHelpers.handleZoom;

    /**
     * DOC_TBD
     * @alias CameraColumbusViewController
     * @constructor
     */
    var CameraColumbusViewController = function(canvas, camera, ellipsoid) {
        this._canvas = canvas;
        this._camera = camera;
        this._ellipsoid = ellipsoid || Ellipsoid.WGS84;

        /**
         * A parameter in the range <code>[0, 1]</code> used to determine how long
         * the camera will continue to translate because of inertia.
         * With a value of zero, the camera will have no inertia.
         *
         * @type Number
         */
        this.inertiaTranslate = 0.9;

        /**
         * A parameter in the range <code>[0, 1)</code> used to determine how long
         * the camera will continue to zoom because of inertia.
         * With value of zero, the camera will have no inertia.
         *
         * @type Number
         */
        this.inertiaZoom = 0.8;

        this._translateHandler = new CameraEventHandler(canvas, CameraEventType.LEFT_DRAG);
        this._rotateHandler = new CameraEventHandler(canvas, CameraEventType.MIDDLE_DRAG);
        this._zoomHandler = new CameraEventHandler(canvas, CameraEventType.RIGHT_DRAG);

        // TODO: Separate mouse behaviour from mouse handling.
        this._spindleController = new CameraSpindleController(canvas, camera, Ellipsoid.UNIT_SPHERE);
        this._spindleController.constrainedAxis = Cartesian3.UNIT_Z;

        this._freeLookController = new CameraFreeLookController(canvas, camera);
        this._freeLookController.horizontalRotationAxis = Cartesian3.UNIT_Z;

        this._transform = this._camera.transform.clone();
        this._lastInertiaTranslateMovement = undefined;

        this._animationCollection = new AnimationCollection();
        this._translateAnimation = undefined;

        this._mapWidth = this._ellipsoid.getRadii().x * Math.PI;
        this._mapHeight = this._ellipsoid.getRadii().y * CesiumMath.PI_OVER_TWO;
    };

    /**
     * @private
     */
    CameraColumbusViewController.prototype.update = function() {
        var translate = this._translateHandler;
        var translating = translate.isMoving() && translate.getMovement();
        var rotate = this._rotateHandler;
        var rotating = rotate.isMoving() && rotate.getMovement();
        var zoom = this._zoomHandler;
        var zoomimg = zoom && zoom.isMoving();

        if (rotating) {
            this._rotate(rotate.getMovement());
        }

        var buttonDown = translate.isButtonDown() || rotate.isButtonDown() ||
            rotate.isButtonDown() || this._freeLookController._handler.isButtonDown();
        if (buttonDown) {
            this._animationCollection.removeAll();
        }

        if (translating) {
            this._translate(translate.getMovement());
        }

        if (!translating && this.inertiaTranslate < 1.0) {
            maintainInertia(translate, this.inertiaTranslate, this._translate, this, '_lastInertiaTranslateMovement');
        }

        if (zoomimg) {
            this._zoom(zoom.getMovement());
        }

        if (zoom && !zoomimg && this.inertiaZoom < 1.0) {
            maintainInertia(zoom, this.inertiaZoom, this._zoom, this, '_lastInertiaZoomMovement');
        }

        this._freeLookController.update();

        if (!buttonDown) {
            this._correctPosition();
        }

        this._animationCollection.update();

        return true;
    };

    CameraColumbusViewController.prototype._addCorrectTranslateAnimation = function(position, center, maxX, maxY) {
        var newPosition = position.clone();

        if (center.y > maxX) {
            newPosition.y -= center.y - maxX;
        } else if (center.y < -maxX) {
            newPosition.y += -maxX - center.y;
        }

        if (center.z > maxY) {
            newPosition.z -= center.z - maxY;
        } else if (center.z < -maxY) {
            newPosition.z += -maxY - center.z;
        }

        var camera = this._camera;
        var updateCV = function(value) {
            var interp = position.lerp(newPosition, value.time);
            var pos = new Cartesian4(interp.x, interp.y, interp.z, 1.0);
            camera.position = Cartesian3.fromCartesian4(camera.getInverseTransform().multiplyByVector(pos));
        };

        this._translateAnimation = this._animationCollection.add({
            easingFunction : Tween.Easing.Exponential.EaseOut,
            startValue : {
                time : 0.0
            },
            stopValue : {
                time : 1.0
            },
            onUpdate : updateCV
        });
    };

    CameraColumbusViewController.prototype._translate = function(movement) {
        var camera = this._camera;
        var sign = (camera.direction.dot(Cartesian3.UNIT_Z) >= 0) ? 1.0 : -1.0;

        var startRay = camera.getPickRay(movement.startPosition);
        var endRay = camera.getPickRay(movement.endPosition);

        var normal = Cartesian3.fromCartesian4(camera.getInverseTransform().multiplyByVector(Cartesian4.UNIT_X));

        var position = new Cartesian4(startRay.origin.x, startRay.origin.y, startRay.origin.z, 1.0);
        position = Cartesian3.fromCartesian4(camera.getInverseTransform().multiplyByVector(position));
        var direction = new Cartesian4(startRay.direction.x, startRay.direction.y, startRay.direction.z, 0.0);
        direction = Cartesian3.fromCartesian4(camera.getInverseTransform().multiplyByVector(direction));
        var scalar = sign * normal.dot(position) / normal.dot(direction);
        var startPlanePos = position.add(direction.multiplyByScalar(scalar));

        position = new Cartesian4(endRay.origin.x, endRay.origin.y, endRay.origin.z, 1.0);
        position = Cartesian3.fromCartesian4(camera.getInverseTransform().multiplyByVector(position));
        direction = new Cartesian4(endRay.direction.x, endRay.direction.y, endRay.direction.z, 0.0);
        direction = Cartesian3.fromCartesian4(camera.getInverseTransform().multiplyByVector(direction));
        scalar = sign * normal.dot(position) / normal.dot(direction);
        var endPlanePos = position.add(direction.multiplyByScalar(scalar));

        var diff = startPlanePos.subtract(endPlanePos);
        camera.position = camera.position.add(diff);
    };

    CameraColumbusViewController.prototype._correctPosition = function()
    {
        var camera = this._camera;
        var position = camera.position;
        var direction = camera.direction;

        var normal = Cartesian3.fromCartesian4(camera.getInverseTransform().multiplyByVector(Cartesian4.UNIT_X));
        var scalar = -normal.dot(position) / normal.dot(direction);
        var center = position.add(direction.multiplyByScalar(scalar));
        center = new Cartesian4(center.x, center.y, center.z, 1.0);
        var centerWC = camera.transform.multiplyByVector(center);
        this._transform.setColumn(3, centerWC, this._transform);

        var cameraPosition = new Cartesian4(camera.position.x, camera.position.y, camera.position.z, 1.0);
        var positionWC = camera.transform.multiplyByVector(cameraPosition);

        var tanPhi = Math.tan(this._camera.frustum.fovy * 0.5);
        var tanTheta = this._camera.frustum.aspectRatio * tanPhi;
        var distToC = positionWC.subtract(centerWC).magnitude();
        var dWidth = tanTheta * distToC;
        var dHeight = tanPhi * distToC;

        var maxX = Math.max(dWidth - this._mapWidth, this._mapWidth);
        var maxY = Math.max(dHeight - this._mapHeight, this._mapHeight);

        if (positionWC.x < -maxX || positionWC.x > maxX || positionWC.y < -maxY || positionWC.y > maxY) {
            if (!this._translateHandler.isButtonDown()) {
                var translateX = centerWC.y < -maxX || centerWC.y > maxX;
                var translateY = centerWC.z < -maxY || centerWC.z > maxY;
                if ((translateX || translateY) && !this._lastInertiaTranslateMovement &&
                        !this._animationCollection.contains(this._translateAnimation)) {
                    this._addCorrectTranslateAnimation(Cartesian3.fromCartesian4(positionWC), Cartesian3.fromCartesian4(centerWC), maxX, maxY);
                }
            }

            maxX = maxX + this._mapWidth * 0.5;
            if (centerWC.y > maxX) {
                positionWC.y -= centerWC.y - maxX;
            } else if (centerWC.y < -maxX) {
                positionWC.y += -maxX - centerWC.y;
            }

            maxY = maxY + this._mapHeight * 0.5;
            if (centerWC.z > maxY) {
                positionWC.z -= centerWC.z - maxY;
            } else if (centerWC.z < -maxY) {
                positionWC.z += -maxY - centerWC.z;
            }
        }

        camera.position = Cartesian3.fromCartesian4(camera.getInverseTransform().multiplyByVector(positionWC));
    };

    CameraColumbusViewController.prototype._rotate = function(movement) {
        var camera = this._camera;

        var position = camera.getPositionWC();
        var up = camera.getUpWC();
        var right = camera.getRightWC();
        var direction = camera.getDirectionWC();

        var oldTransform = camera.transform;
        camera.transform = this._transform;

        var invTransform = camera.getInverseTransform();
        camera.position = Cartesian3.fromCartesian4(invTransform.multiplyByPoint(position));
        camera.up = Cartesian3.fromCartesian4(invTransform.multiplyByVector(new Cartesian4(up.x, up.y, up.z, 0.0)));
        camera.right = Cartesian3.fromCartesian4(invTransform.multiplyByVector(new Cartesian4(right.x, right.y, right.z, 0.0)));
        camera.direction = Cartesian3.fromCartesian4(invTransform.multiplyByVector(new Cartesian4(direction.x, direction.y, direction.z, 0.0)));

        this._spindleController._rotate(movement);

        position = camera.getPositionWC();
        up = camera.getUpWC();
        right = camera.getRightWC();
        direction = camera.getDirectionWC();

        camera.transform = oldTransform;
        var transform = camera.getInverseTransform();

        camera.position = Cartesian3.fromCartesian4(transform.multiplyByPoint(position));
        camera.up = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(up.x, up.y, up.z, 0.0)));
        camera.right = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(right.x, right.y, right.z, 0.0)));
        camera.direction = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(direction.x, direction.y, direction.z, 0.0)));
    };

    CameraColumbusViewController.prototype._zoom = function(movement) {
        handleZoom(this._spindleController, movement, this._camera.position.z);
    };

    /**
      * Returns true if this object was destroyed; otherwise, false.
      * <br /><br />
      * If this object was destroyed, it should not be used; calling any function other than
      * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
      *
      * @memberof CameraColumbusViewController
      *
      * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
      *
      * @see CameraSpindleController#destroy
      */
    CameraColumbusViewController.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes mouse listeners held by this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof CameraColumbusViewController
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CameraColumbusViewController#isDestroyed
     *
     * @example
     * controller = controller && controller.destroy();
     */
    CameraColumbusViewController.prototype.destroy = function() {
        this._rotateHandler = this._rotateHandler && this._rotateHandler.destroy();
        this._translateHandler = this._translateHandler && this._translateHandler.destroy();
        this._zoomHandler = this._zoomHandle && this._zoomHandler.destroy();
        this._spindleController = this._spindleController && this._spindleController.destroy();
        this._freeLookController = this._freeLookController && this._freeLookController.destroy();
        return destroyObject(this);
    };

    return CameraColumbusViewController;
});