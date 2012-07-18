/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Math',
        '../Core/Intersect',
        '../Core/Ellipsoid',
        '../Core/IntersectionTests',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Cartographic',
        '../Core/Matrix4',
        '../Core/Ray',
        './CameraControllerCollection',
        './PerspectiveFrustum'
    ], function(
        DeveloperError,
        destroyObject,
        CesiumMath,
        Intersect,
        Ellipsoid,
        IntersectionTests,
        Cartesian3,
        Cartesian4,
        Cartographic,
        Matrix4,
        Ray,
        CameraControllerCollection,
        PerspectiveFrustum) {
    "use strict";

    /**
     * The camera is defined by a position, orientation, and view frustum.
     * <br /><br />
     * The orientation forms an orthonormal basis with a view, up and right = view x up unit vectors.
     * <br /><br />
     * The viewing frustum is defined by 6 planes.
     * Each plane is represented by a {Cartesian4} object, where the x, y, and z components
     * define the unit vector normal to the plane, and the w component is the distance of the
     * plane from the origin/camera position.
     *
     * @alias Camera
     *
     * @exception {DeveloperError} canvas is required.
     *
     * @constructor
     *
     * @example
     * // Create a camera looking down the negative z-axis, positioned at the origin,
     * // with a field of view of 60 degrees, and 1:1 aspect ratio.
     * var camera = new Camera(canvas);
     * camera.position = new Cartesian3();
     * camera.direction = Cartesian3.UNIT_Z.negate();
     * camera.up = Cartesian3.UNIT_Y;
     * camera.fovy = CesiumMath.PI_OVER_THREE;
     * camera.near = 1.0;
     * camera.far = 2.0;
     */
    var Camera = function(canvas) {
        if (!canvas) {
            throw new DeveloperError('canvas is required.');
        }

        /**
         * DOC_TBA
         *
         * @type {Matrix4}
         */
        this.transform = Matrix4.IDENTITY;
        this._transform = this.transform.clone();
        this._invTransform = Matrix4.IDENTITY;

        var maxRadii = Ellipsoid.WGS84.getRadii().getMaximumComponent();
        var position = new Cartesian3(0.0, -2.0, 1.0).normalize().multiplyByScalar(2.0 * maxRadii);

        /**
         * The position of the camera.
         *
         * @type {Cartesian3}
         */
        this.position = position.clone();
        this._position = position;
        this._positionWC = position;

        var direction = Cartesian3.ZERO.subtract(position).normalize();

        /**
         * The view direction of the camera.
         *
         * @type {Cartesian3}
         */
        this.direction = direction.clone();
        this._direction = direction;
        this._directionWC = direction;

        var right = direction.cross(Cartesian3.UNIT_Z).normalize();

        /**
         * The right direction of the camera.
         *
         * @type {Cartesian3}
         */
        this.right = right.clone();
        this._right = right;
        this._rightWC = right;

        var up = right.cross(direction);

        /**
         * The up direction of the camera.
         *
         * @type {Cartesian3}
         */
        this.up = up.clone();
        this._up = up;
        this._upWC = up;

        /**
         * DOC_TBA
         *
         * @type {Frustum}
         */
        this.frustum = new PerspectiveFrustum();
        this.frustum.fovy = CesiumMath.toRadians(60.0);
        this.frustum.aspectRatio = canvas.clientWidth / canvas.clientHeight;
        this.frustum.near = 0.01 * maxRadii;
        this.frustum.far = 20.0 * maxRadii;

        this._viewMatrix = undefined;
        this._invViewMatrix = undefined;
        this._updateViewMatrix();

        this._planes = this.frustum.getPlanes(this._positionWC, this._directionWC, this._upWC);

        this._canvas = canvas;
        this._controllers = new CameraControllerCollection(this, canvas);
    };

    /**
     * DOC_TBA
     * @memberof Camera
     */
    Camera.prototype.getControllers = function() {
        return this._controllers;
    };

    /**
     * DOC_TBA
     * @memberof Camera
     */
    Camera.prototype.update = function() {
        this._controllers.update();
    };

    /**
     * Sets the camera position and orientation with an eye position, target, and up vector.
     *
     * @memberof Camera
     *
     * @param {Array} arguments If one parameter is passed to this function, it must have three
     * properties with the names eye, target, and up; otherwise three arguments are expected which
     * the same as the properties of one object and given in the order given above.
     *
     */
    Camera.prototype.lookAt = function() {
        var eye, target, up;
        if (arguments.length === 1) {
            var param = arguments[0];
            if (param.eye && param.target && param.up) {
                eye = param.eye;
                target = param.target;
                up = param.up;
            } else {
                return;
            }
        } else if (arguments.length === 3) {
            eye = arguments[0];
            target = arguments[1];
            up = arguments[2];
        } else {
            return;
        }

        this.position = eye;
        this.direction = target.subtract(eye).normalize();
        this.up = up.normalize();
        this.right = this.direction.cross(this.up);
    };

    /**
     * Zooms to a cartographic extent on the centralBody. The camera will be looking straight down at the extent, with the up vector pointing toward local north.
     *
     * @memberof Camera
     * @param {Ellipsoid} ellipsoid The ellipsoid to view.
     * @param {double} west The west longitude of the extent.
     * @param {double} south The south latitude of the extent.
     * @param {double} east The east longitude of the extent.
     * @param {double} north The north latitude of the extent.
     *
     */
    Camera.prototype.viewExtent = function(ellipsoid, west, south, east, north) {
        //
        // Ensure we go from -180 to 180
        //
        west = CesiumMath.negativePiToPi(west);
        east = CesiumMath.negativePiToPi(east);

        // If we go across the International Date Line
        if (west > east) {
            east += CesiumMath.TWO_PI;
        }

        var lla = new Cartographic(0.5 * (west + east), 0.5 * (north + south), 0.0);
        var northVector = ellipsoid.cartographicToCartesian(new Cartographic(lla.longitude, north, 0.0));
        var eastVector = ellipsoid.cartographicToCartesian(new Cartographic(east, lla.latitude, 0.0));
        var centerVector = ellipsoid.cartographicToCartesian(lla);
        var invTanHalfPerspectiveAngle = 1.0 / Math.tan(0.5 * this.frustum.fovy);
        var screenViewDistanceX;
        var screenViewDistanceY;
        var tempVec;
        if (this._canvas.clientWidth >= this._canvas.clientHeight) {
            tempVec = eastVector.subtract(centerVector);
            screenViewDistanceX = Math.sqrt(tempVec.dot(tempVec) * invTanHalfPerspectiveAngle);
            tempVec = northVector.subtract(centerVector);
            screenViewDistanceY = Math.sqrt(tempVec.dot(tempVec) * invTanHalfPerspectiveAngle * this._canvas.clientWidth / this._canvas.clientHeight);
        } else {
            tempVec = eastVector.subtract(centerVector);
            screenViewDistanceX = Math.sqrt(tempVec.dot(tempVec) * invTanHalfPerspectiveAngle * this._canvas.clientWidth / this._canvas.clientHeight);
            tempVec = northVector.subtract(centerVector);
            screenViewDistanceY = Math.sqrt(tempVec.dot(tempVec) * invTanHalfPerspectiveAngle);
        }
        lla.height += Math.max(screenViewDistanceX, screenViewDistanceY);

        this.position = ellipsoid.cartographicToCartesian(lla);
        this.direction = Cartesian3.ZERO.subtract(centerVector).normalize();
        this.right = this.direction.cross(Cartesian3.UNIT_Z).normalize();
        this.up = this.right.cross(this.direction);
    };

    Camera.prototype._updateViewMatrix = function() {
        var r = this._right;
        var u = this._up;
        var d = this._direction;
        var e = this._position;

        var viewMatrix = new Matrix4( r.x,  r.y,  r.z, -r.dot(e),
                                      u.x,  u.y,  u.z, -u.dot(e),
                                     -d.x, -d.y, -d.z,  d.dot(e),
                                      0.0,  0.0,  0.0,      1.0);
        this._viewMatrix = viewMatrix.multiply(this._invTransform);

        this._invViewMatrix = this._viewMatrix.inverseTransformation();
    };

    Camera.prototype._update = function() {
        var position = this._position;
        var positionChanged = !position.equals(this.position);
        if (positionChanged) {
            position = this._position = this.position.clone();
        }

        var direction = this._direction;
        var directionChanged = !direction.equals(this.direction);
        if (directionChanged) {
            direction = this._direction = this.direction.clone();
        }

        var up = this._up;
        var upChanged = !up.equals(this.up);
        if (upChanged) {
            up = this._up = this.up.clone();
        }

        var right = this._right;
        var rightChanged = !right.equals(this.right);
        if (rightChanged) {
            right = this._right = this.right.clone();
        }

        var transform = this._transform;
        var transformChanged = !transform.equals(this.transform);
        if (transformChanged) {
            transform = this._transform = this.transform.clone();

            this._invTransform = this._transform.inverseTransformation();
        }

        if (positionChanged || transformChanged) {
            this._positionWC = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(position.x, position.y, position.z, 1.0)));
        }

        if (directionChanged || transformChanged) {
            this._directionWC = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(direction.x, direction.y, direction.z, 0.0)));
        }

        if (upChanged || transformChanged) {
            this._upWC = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(up.x, up.y, up.z, 0.0)));
        }

        if (rightChanged || transformChanged) {
            this._rightWC = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(right.x, right.y, right.z, 0.0)));
        }

        if (positionChanged || directionChanged || upChanged || transformChanged) {
            this._planes = this.frustum.getPlanes(this._positionWC, this._directionWC, this._upWC);
        }

        if (directionChanged || upChanged || rightChanged) {
            var det = direction.dot(up.cross(right));
            if (Math.abs(1.0 - det) > CesiumMath.EPSILON2) {
                //orthonormalize axes
                direction = this._direction = direction.normalize();
                this.direction = direction.clone();

                var invUpMag = 1.0 / up.magnitudeSquared();
                var scalar = up.dot(direction) * invUpMag;
                var w0 = direction.multiplyByScalar(scalar);
                up = this._up = up.subtract(w0).normalize();
                this.up = up.clone();

                right = this._right = direction.cross(up);
                this.right = right.clone();
            }
        }

        if (positionChanged || directionChanged || upChanged || rightChanged || transformChanged) {
            this._updateViewMatrix();
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof Camera
     *
     * @return {Matrix4} DOC_TBA
     */
    Camera.prototype.getInverseTransform = function() {
        this._update();
        return this._invTransform;
    };

    /**
     * Returns the view matrix.
     *
     * @memberof Camera
     *
     * @return {Matrix4} The view matrix.
     *
     * @see UniformState#getView
     * @see UniformState#setView
     * @see agi_view
     */
    Camera.prototype.getViewMatrix = function() {
        this._update();
        return this._viewMatrix;
    };

    /**
     * DOC_TBA
     * @memberof Camera
     */
    Camera.prototype.getInverseViewMatrix = function() {
        this._update();
        return this._invViewMatrix;
    };

    /**
     * The position of the camera in world coordinates.
     *
     * @type {Cartesian3}
     */
    Camera.prototype.getPositionWC = function() {
        this._update();
        return this._positionWC;
    };

    /**
     * The view direction of the camera in world coordinates.
     *
     * @type {Cartesian3}
     */
    Camera.prototype.getDirectionWC = function() {
        this._update();
        return this._directionWC;
    };

    /**
     * The up direction of the camera in world coordinates.
     *
     * @type {Cartesian3}
     */
    Camera.prototype.getUpWC = function() {
        this._update();
        return this._upWC;
    };

    /**
     * The right direction of the camera in world coordinates.
     *
     * @type {Cartesian3}
     */
    Camera.prototype.getRightWC = function() {
        this._update();
        return this._rightWC;
    };

    Camera.prototype._getPickRayPerspective = function(windowPosition) {
        var width = this._canvas.clientWidth;
        var height = this._canvas.clientHeight;

        var tanPhi = Math.tan(this.frustum.fovy * 0.5);
        var tanTheta = this.frustum.aspectRatio * tanPhi;
        var near = this.frustum.near;

        var x = (2.0 / width) * windowPosition.x - 1.0;
        var y = (2.0 / height) * (height - windowPosition.y) - 1.0;

        var position = this.getPositionWC();
        var nearCenter = position.add(this.getDirectionWC().multiplyByScalar(near));
        var xDir = this.getRightWC().multiplyByScalar(x * near * tanTheta);
        var yDir = this.getUpWC().multiplyByScalar(y * near * tanPhi);
        var direction = nearCenter.add(xDir).add(yDir).subtract(position).normalize();

        return new Ray(position.clone(), direction);
    };

    Camera.prototype._getPickRayOrthographic = function(windowPosition) {
        var width = this._canvas.clientWidth;
        var height = this._canvas.clientHeight;

        var x = (2.0 / width) * windowPosition.x - 1.0;
        x *= (this.frustum.right - this.frustum.left) * 0.5;
        var y = (2.0 / height) * (height - windowPosition.y) - 1.0;
        y *= (this.frustum.top - this.frustum.bottom) * 0.5;

        var position = this.position.clone();
        position.x += x;
        position.y += y;

        return new Ray(position, this.getDirectionWC());
    };

    /**
     * Create a ray from the camera position through the pixel at <code>windowPosition</code>
     * in world coordinates.
     *
     * @memberof Camera
     *
     * @param {Cartesian2} windowPosition The x and y coordinates of a pixel.
     *
     * @exception {DeveloperError} windowPosition is required.
     *
     * @return {Object} Returns the {@link Cartesian3} position and direction of the ray.
     */
    Camera.prototype.getPickRay = function(windowPosition) {
        if (typeof windowPosition === 'undefined') {
            throw new DeveloperError('windowPosition is required.');
        }

        var frustum = this.frustum;
        if (typeof frustum.aspectRatio !== 'undefined' && typeof frustum.fovy !== 'undefined' && typeof frustum.near !== 'undefined') {
            return this._getPickRayPerspective(windowPosition);
        }

        return this._getPickRayOrthographic(windowPosition);
    };

    /**
     * Pick an ellipsoid in 3D mode.
     *
     * @memberof Camera
     *
     * @param {Cartesian2} windowPosition The x and y coordinates of a pixel.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to pick.
     *
     * @exception {DeveloperError} windowPosition is required.
     *
     * @return {Cartesian3} If the ellipsoid was picked, returns the point on the surface of the ellipsoid.
     * If the ellipsoid was not picked, returns undefined.
     */
    Camera.prototype.pickEllipsoid = function(windowPosition, ellipsoid) {
        if (typeof windowPosition === 'undefined') {
            throw new DeveloperError('windowPosition is required.');
        }

        ellipsoid = ellipsoid || Ellipsoid.WGS84;
        var ray = this._getPickRayPerspective(windowPosition);
        var intersection = IntersectionTests.rayEllipsoid(ray, ellipsoid);
        if (!intersection) {
            return undefined;
        }

        var iPt = ray.getPoint(intersection.start);
        return iPt;
    };

    /**
     * Pick the map in 2D mode.
     *
     * @param {Cartesian2} windowPosition The x and y coordinates of a pixel.
     * @param {DOC_TBA} projection DOC_TBA
     *
     * @exception {DeveloperError} windowPosition is required.
     * @exception {DeveloperError} projection is required.
     *
     * @return {Cartesian3} If the map was picked, returns the point on the surface of the map.
     * If the map was not picked, returns undefined.
     */
    Camera.prototype.pickMap2D = function(windowPosition, projection) {
        if (typeof windowPosition === 'undefined') {
            throw new DeveloperError('windowPosition is required.');
        }

        if (typeof projection === 'undefined') {
            throw new DeveloperError('projection is required.');
        }

        var ray = this._getPickRayOrthographic(windowPosition);
        var position = ray.origin;
        position.z = 0.0;
        var cart = projection.unproject(position);

        if (cart.latitude < -CesiumMath.PI_OVER_TWO || cart.latitude > CesiumMath.PI_OVER_TWO ||
                cart.longitude < - Math.PI || cart.longitude > Math.PI) {
            return undefined;
        }

        return projection.getEllipsoid().cartographicToCartesian(cart);
    };

    /**
     * Pick the map in Columbus View mode.
     *
     * @param {Cartesian2} windowPosition The x and y coordinates of a pixel.
     * @param {DOC_TBA} projection DOC_TBA
     *
     * @exception {DeveloperError} windowPosition is required.
     * @exception {DeveloperError} projection is required.
     *
     * @return {Cartesian3} If the map was picked, returns the point on the surface of the map.
     * If the map was not picked, returns undefined.
     */
    Camera.prototype.pickMapColumbusView = function(windowPosition, projection) {
        if (typeof windowPosition === 'undefined') {
            throw new DeveloperError('windowPosition is required.');
        }

        if (typeof projection === 'undefined') {
            throw new DeveloperError('projection is required.');
        }

        var ray = this._getPickRayPerspective(windowPosition);
        var scalar = -ray.origin.x / ray.direction.x;
        var position = ray.getPoint(scalar);

        var cart = projection.unproject(new Cartesian3(position.y, position.z, 0.0));

        if (cart.latitude < -CesiumMath.PI_OVER_TWO || cart.latitude > CesiumMath.PI_OVER_TWO ||
                cart.longitude < - Math.PI || cart.longitude > Math.PI) {
            return undefined;
        }

        position = projection.getEllipsoid().cartographicToCartesian(cart);
        return position;
    };

    /**
     * Determines whether a bounding volume intersects with the frustum or not.
     *
     * @memberof Camera
     *
     * @param {Object} object The bounding volume whose intersection with the frustum is to be tested.
     * @param {Function} planeIntersectTest The function that tests for intersections between a plane
     * and the bounding volume type of object
     *
     * @return {Enumeration}  Intersect.OUTSIDE,
     *                                 Intersect.INTERSECTING, or
     *                                 Intersect.INSIDE.
     */
    Camera.prototype.getVisibility = function(object, planeIntersectTest) {
        this._update();
        var planes = this._planes;
        var intersecting = false;
        for ( var k = 0; k < planes.length; k++) {
            var result = planeIntersectTest(object, planes[k]);
            if (result === Intersect.OUTSIDE) {
                return Intersect.OUTSIDE;
            } else if (result === Intersect.INTERSECTING) {
                intersecting = true;
            }
        }

        return intersecting ? Intersect.INTERSECTING : Intersect.INSIDE;
    };

    /**
     * Returns a duplicate of a Camera instance.
     *
     * @memberof Camera
     *
     * @return {Camera} A new copy of the Camera instance.
     */
    Camera.prototype.clone = function() {
        var camera = new Camera(this._canvas);
        camera.position = this.position.clone();
        camera.direction = this.direction.clone();
        camera.up = this.up.clone();
        camera.right = this.right.clone();
        camera.transform = this.transform.clone();
        camera.frustum = this.frustum.clone();
        return camera;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof Camera
     *
     * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see Camera#destroy
     */
    Camera.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes keyboard listeners held by this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof Camera
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Camera#isDestroyed
     *
     * @example
     * camera = camera && camera.destroy();
     */
    Camera.prototype.destroy = function() {
        this._controllers.destroy();
        return destroyObject(this);
    };

    return Camera;
});
