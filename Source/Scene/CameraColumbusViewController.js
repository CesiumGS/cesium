/*global define*/
define([
        '../Core/destroyObject',
        '../Core/FAR',
        '../Core/Ellipsoid',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Matrix4',
        './CameraEventHandler',
        './CameraEventType',
        './CameraSpindleController',
        './CameraFreeLookController',
        './CameraHelpers'
    ], function(
        destroyObject,
        FAR,
        Ellipsoid,
        Cartesian3,
        Cartesian4,
        Matrix4,
        CameraEventHandler,
        CameraEventType,
        CameraSpindleController,
        CameraFreeLookController,
        CameraHelpers) {
    "use strict";

    var maintainInertia = CameraHelpers.maintainInertia;

    /**
     * DOC_TBD
     * @name CameraColumbusViewController
     * @constructor
     */
    function CameraColumbusViewController(canvas, camera) {
        this._canvas = canvas;
        this._camera = camera;

        /**
         * A parameter in the range <code>[0, 1]</code> used to determine how long
         * the camera will continue to translate because of inertia.
         * With a value of zero, the camera will have no inertia.
         *
         * @type Number
         */
        this.inertiaTranslate = 0.9;

        this._translateFactor = 1.0;
        this._minimumZoomRate = 20.0;
        this._maximumZoomRate = FAR;

        this._translateHandler = new CameraEventHandler(canvas, CameraEventType.LEFT_DRAG);

        this._spindleController = new CameraSpindleController(canvas, camera, Ellipsoid.UNIT_SPHERE);

        // TODO: Shouldn't change private variables like this, need to be able to change event modifiers
        //       on controllers.
        this._spindleController._spinHandler = this._spindleController._spinHandler && this._spindleController._spinHandler.destroy();

        this._freeLookController = new CameraFreeLookController(canvas, camera);
        this._freeLookController.horizontalRotationAxis = Cartesian3.UNIT_Z;

        this._transform = this._camera.transform.clone();

        this._lastInertiaTranslateMovement = undefined;
    }

    /**
     * @private
     */
    CameraColumbusViewController.prototype.update = function() {
        var translate = this._translateHandler;
        var translating = translate.isMoving() && translate.getMovement();

        if (translating) {
            this._translate(translate.getMovement());
        }

        if (!translating && this.inertiaTranslate < 1.0) {
            maintainInertia(translate, this.inertiaTranslate, this._translate, this, '_lastInertiaTranslateMovement');
        }

        this._spindleController.update();
        this._freeLookController.update();

        return true;
    };

    CameraColumbusViewController.prototype._translate = function(movement) {
        var camera = this._camera;

        var startRay = camera.getPickRay(movement.startPosition);
        var endRay = camera.getPickRay(movement.endPosition);

        var position = new Cartesian4(startRay.position.x, startRay.position.y, startRay.position.z, 1.0);
        position = camera.getInverseTransform().multiplyWithVector(position).getXYZ();
        var direction = new Cartesian4(startRay.direction.x, startRay.direction.y, startRay.direction.z, 0.0);
        direction = camera.getInverseTransform().multiplyWithVector(direction).getXYZ();
        var scalar = -position.z / direction.z;
        var startPlanePos = position.add(direction.multiplyWithScalar(scalar));

        position = new Cartesian4(endRay.position.x, endRay.position.y, endRay.position.z, 1.0);
        position = camera.getInverseTransform().multiplyWithVector(position).getXYZ();
        direction = new Cartesian4(endRay.direction.x, endRay.direction.y, endRay.direction.z, 0.0);
        direction = camera.getInverseTransform().multiplyWithVector(direction).getXYZ();
        scalar = -position.z / direction.z;
        var endPlanePos = position.add(direction.multiplyWithScalar(scalar));

        var diff = startPlanePos.subtract(endPlanePos);
        camera.position = camera.position.add(diff);

        this._updateReferenceFrame();
    };

    CameraColumbusViewController.prototype._updateReferenceFrame = function() {
        var camera = this._camera;

        var position = camera.position;
        var direction = camera.direction;

        var scalar = -position.z / direction.z;
        var center = position.add(direction.multiplyWithScalar(scalar));
        center = new Cartesian4(center.x, center.y, center.z, 1.0);
        var centerWC = camera.transform.multiplyWithVector(center);
        this._transform.setColumn3(centerWC);

        var cameraPosition = new Cartesian4(camera.position.x, camera.position.y, camera.position.z, 1.0);
        var positionWC = camera.transform.multiplyWithVector(cameraPosition);
        camera.transform = this._transform.clone();
        camera.position = camera.getInverseTransform().multiplyWithVector(positionWC).getXYZ();
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
        this._translateHandler = this._translateHandler && this._translateHandler.destroy();
        this._spindleController = this._spindleController && this._spindleController.destroy();
        this._freeLookController = this._freeLookController && this._freeLookController.destroy();
        return destroyObject(this);
    };

    return CameraColumbusViewController;
});