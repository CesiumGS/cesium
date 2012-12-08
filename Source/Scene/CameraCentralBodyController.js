/*global define*/
define([
        '../Core/destroyObject',
        '../Core/Ellipsoid',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/IntersectionTests',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/Ray',
        '../Core/Transforms',
        './CameraEventHandler',
        './CameraEventType',
        './CameraSpindleController',
        './CameraFreeLookController',
        './CameraHelpers'
    ], function(
        destroyObject,
        Ellipsoid,
        Cartesian3,
        Cartesian4,
        IntersectionTests,
        CesiumMath,
        Matrix4,
        Ray,
        Transforms,
        CameraEventHandler,
        CameraEventType,
        CameraSpindleController,
        CameraFreeLookController,
        CameraHelpers) {
    "use strict";

    var maxHeight = CameraHelpers.maxHeight;

    /**
     * Defines camera movement and handles mouse events that move the camera. Moves the camera
     * position around the center of an ellipsoid or a point on the surface. Also, moves the camera viewing
     * direction.
     *
     * @alias CameraCentralBodyController
     *
     * @param {HTMLCanvasElement} canvas An HTML canvas element used for its dimensions
     * and for listening on user events.
     * @param {Camera} camera The camera to use.
     * @param {Ellipsoid} ellipsoid The ellipsoid to move around.
     *
     * @internalConstructor
     *
     * @see CameraSpindleController
     * @see CameraFreeLookController
     */
    var CameraCentralBodyController = function(canvas, camera, ellipsoid) {
        this._canvas = canvas;
        this._camera = camera;
        this._rotateHandler = new CameraEventHandler(canvas, CameraEventType.MIDDLE_DRAG);

        /**
         * Rotates the camera's position and axes around the center of the ellipsoid.
         *
         * @type {CameraSpindleController}
         */
        this.spindleController = new CameraSpindleController(canvas, camera, ellipsoid);

        /**
         * Rotates the view direction about the camera's other axes. The camera's position is stationary.
         *
         * @type {CameraFreeLookController}
         */
        this.freeLookController = new CameraFreeLookController(canvas, camera);
    };

    /**
     * @private
     */
    CameraCentralBodyController.prototype.update = function() {
        var rotate = this._rotateHandler;
        var rotating = rotate.isMoving() && rotate.getMovement();

        if (rotating) {
            this._rotate(rotate.getMovement());
        }

        this.spindleController.update();
        this.freeLookController.update();

        return true;
    };

    CameraCentralBodyController.prototype._rotate = function(movement) {
        var camera = this._camera;

        var ellipsoid = this.spindleController.getEllipsoid();
        var position = camera.position;
        if (ellipsoid.cartesianToCartographic(position).height - maxHeight - 1.0 < CesiumMath.EPSILON3 &&
                movement.endPosition.y - movement.startPosition.y < 0) {
            return;
        }

        var up = camera.up;
        var right = camera.right;
        var direction = camera.direction;

        var oldTransform = camera.transform;
        var oldEllipsoid = this.spindleController.getEllipsoid();
        var oldConstrainedZ = this.spindleController.constrainedAxis;

        var ray = new Ray(this._camera.getPositionWC(), this._camera.getDirectionWC());
        var intersection = IntersectionTests.rayEllipsoid(ray, this.spindleController.getEllipsoid());
        if (typeof intersection === 'undefined') {
            return;
        }

        var center = ray.getPoint(intersection.start);
        center = Cartesian3.fromCartesian4(camera.getInverseTransform().multiplyByPoint(center));
        var localTransform = Transforms.eastNorthUpToFixedFrame(center);
        var transform = localTransform.multiply(oldTransform);

        this.spindleController.constrainedAxis = Cartesian3.UNIT_Z;
        this.spindleController.setReferenceFrame(transform, Ellipsoid.UNIT_SPHERE);

        var invTransform = camera.getInverseTransform();
        camera.position = Cartesian3.fromCartesian4(invTransform.multiplyByPoint(position));
        camera.up = Cartesian3.fromCartesian4(invTransform.multiplyByVector(new Cartesian4(up.x, up.y, up.z, 0.0)));
        camera.right = Cartesian3.fromCartesian4(invTransform.multiplyByVector(new Cartesian4(right.x, right.y, right.z, 0.0)));
        camera.direction = Cartesian3.fromCartesian4(invTransform.multiplyByVector(new Cartesian4(direction.x, direction.y, direction.z, 0.0)));

        this.spindleController._rotate(movement);

        position = camera.position;
        up = camera.up;
        right = camera.right;
        direction = camera.direction;

        this.spindleController.constrainedAxis = oldConstrainedZ;
        this.spindleController.setReferenceFrame(oldTransform, oldEllipsoid);

        camera.position = Cartesian3.fromCartesian4(transform.multiplyByPoint(position));
        camera.up = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(up.x, up.y, up.z, 0.0)));
        camera.right = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(right.x, right.y, right.z, 0.0)));
        camera.direction = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(direction.x, direction.y, direction.z, 0.0)));

        position = ellipsoid.cartesianToCartographic(camera.position);
        if (position.height < maxHeight + 1.0) {
            position.height = maxHeight + 1.0;
            camera.position = ellipsoid.cartographicToCartesian(position);
            camera.direction = Cartesian3.fromCartesian4(transform.getColumn(3).subtract(camera.position)).normalize();
            camera.right = camera.position.negate().cross(camera.direction).normalize();
            camera.up = camera.right.cross(camera.direction);
        }
    };

    /**
      * Returns true if this object was destroyed; otherwise, false.
      * <br /><br />
      * If this object was destroyed, it should not be used; calling any function other than
      * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
      *
      * @memberof CameraCentralBodyController
      *
      * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
      *
      * @see CameraCentralBodyController#destroy
      */
    CameraCentralBodyController.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes mouse and keyboard listeners held by this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof CameraCentralBodyController
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CameraCentralBodyController#isDestroyed
     *
     * @example
     * controller = controller && controller.destroy();
     */
    CameraCentralBodyController.prototype.destroy = function() {
        this._rotateHandler = this._rotateHandler && this._rotateHandler.destroy();
        this.spindleController = this.spindleController && this.spindleController.destroy();
        this.freeLookController = this.freeLookController && this.freeLookController.destroy();
        return destroyObject(this);
    };

    return CameraCentralBodyController;
});