/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Math',
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
     * camera.frustum.fovy = CesiumMath.PI_OVER_THREE;
     * camera.frustum.near = 1.0;
     * camera.frustum.far = 2.0;
     */
    var Camera = function(canvas) {
        if (typeof canvas === 'undefined') {
            throw new DeveloperError('canvas is required.');
        }

        /**
         * DOC_TBA
         *
         * @type {Matrix4}
         */
        this.transform = Matrix4.IDENTITY.clone();
        this._transform = this.transform.clone();
        this._invTransform = Matrix4.IDENTITY.clone();

        var maxRadii = Ellipsoid.WGS84.getMaximumRadius();
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

        this._viewMatrix = undefined;
        this._invViewMatrix = undefined;
        updateViewMatrix(this);

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
     * @param {Cartesian3} eye The position of the camera.
     * @param {Cartesian3} target The position to look at.
     * @param {Cartesian3} up The up vector.
     *
     * @exception {DeveloperError} eye is required.
     * @exception {DeveloperError} target is required.
     * @exception {DeveloperError} up is required.
     */
    Camera.prototype.lookAt = function(eye, target, up) {
        if (typeof eye === 'undefined') {
            throw new DeveloperError('eye is required');
        }
        if (typeof target === 'undefined') {
            throw new DeveloperError('target is required');
        }
        if (typeof up === 'undefined') {
            throw new DeveloperError('up is required');
        }

        this.position = Cartesian3.clone(eye, this.position);
        this.direction = Cartesian3.subtract(target, eye, this.direction).normalize(this.direction);
        this.right = Cartesian3.cross(this.direction, up, this.right).normalize(this.right);
        this.up = Cartesian3.cross(this.right, this.direction, this.up);
    };

    /**
     * Zooms to a cartographic extent on the central body. The camera will be looking straight down at the extent,
     * with the up vector pointing toward local north.
     *
     * @memberof Camera
     * @param {Ellipsoid} ellipsoid The ellipsoid to view.
     * @param {Extent} extent The extent to view.
     *
     * @exception {DeveloperError} extent is required.
     */
    Camera.prototype.viewExtent = function(extent, ellipsoid) {
        if (typeof extent === 'undefined') {
            throw new DeveloperError('extent is required.');
        }

        ellipsoid = (typeof ellipsoid === 'undefined') ? Ellipsoid.WGS84 : ellipsoid;

        var north = extent.north;
        var south = extent.south;
        var east = extent.east;
        var west = extent.west;

        // If we go across the International Date Line
        if (west > east) {
            east += CesiumMath.TWO_PI;
        }

        var northEast = ellipsoid.cartographicToCartesian(new Cartographic(east, north));
        var southWest = ellipsoid.cartographicToCartesian(new Cartographic(west, south));
        var diagonal = northEast.subtract(southWest);
        var center = southWest.add(diagonal.normalize().multiplyByScalar(diagonal.magnitude() * 0.5));

        var northWest = ellipsoid.cartographicToCartesian(new Cartographic(west, north)).subtract(center);
        var southEast = ellipsoid.cartographicToCartesian(new Cartographic(east, south)).subtract(center);
        northEast = northEast.subtract(center);
        southWest = southWest.subtract(center);

        this.direction = center.negate().normalize();
        this.right = this.direction.cross(Cartesian3.UNIT_Z).normalize();
        this.up = this.right.cross(this.direction);

        var height = Math.max(Math.abs(this.up.dot(northWest)), Math.abs(this.up.dot(southEast)), Math.abs(this.up.dot(northEast)), Math.abs(this.up.dot(southWest)));
        var width = Math.max(Math.abs(this.right.dot(northWest)), Math.abs(this.right.dot(southEast)), Math.abs(this.right.dot(northEast)), Math.abs(this.right.dot(southWest)));

        var tanPhi = Math.tan(this.frustum.fovy * 0.5);
        var tanTheta = this.frustum.aspectRatio * tanPhi;
        var d = Math.max(width / tanTheta, height / tanPhi);

        this.position = center.normalize().multiplyByScalar(center.magnitude() + d);
    };

    /**
     * Zooms to a cartographic extent on the Columbus view map. The camera will be looking straight down at the extent,
     * with the up vector pointing toward local north.
     *
     * @memberof Camera
     * @param {Ellipsoid} ellipsoid The ellipsoid to view.
     * @param {Extent} extent The extent to view.
     *
     * @exception {DeveloperError} extent is required.
     * @exception {DeveloperError} projection is required.
     */
    Camera.prototype.viewExtentColumbusView = function(extent, projection) {
        if (typeof extent === 'undefined') {
            throw new DeveloperError('extent is required.');
        }

        if (typeof projection === 'undefined') {
            throw new DeveloperError('projection is required.');
        }

        var north = extent.north;
        var south = extent.south;
        var east = extent.east;
        var west = extent.west;

        var transform = this.transform.setColumn(3, Cartesian4.UNIT_W);

        var northEast = projection.project(new Cartographic(east, north));
        northEast = transform.multiplyByPoint(northEast);
        northEast = Cartesian3.fromCartesian4(this.getInverseTransform().multiplyByVector(northEast));

        var southWest = projection.project(new Cartographic(west, south));
        southWest = transform.multiplyByPoint(southWest);
        southWest = Cartesian3.fromCartesian4(this.getInverseTransform().multiplyByVector(southWest));

        var tanPhi = Math.tan(this.frustum.fovy * 0.5);
        var tanTheta = this.frustum.aspectRatio * tanPhi;
        var d = Math.max((northEast.x - southWest.x) / tanTheta, (northEast.y - southWest.y) / tanPhi) * 0.5;

        var position = projection.project(new Cartographic(0.5 * (west + east), 0.5 * (north + south), d));
        position = transform.multiplyByPoint(position);
        this.position = Cartesian3.fromCartesian4(this.getInverseTransform().multiplyByVector(position));

        // Not exactly -z direction because that would lock the camera in place with a constrained z axis.
        this.direction = new Cartesian3(0.0, 0.0001, -0.999);
        Cartesian3.UNIT_X.clone(this.right);
        this.up = this.right.cross(this.direction);
    };

    /**
     * Zooms to a cartographic extent on the 2D map. The camera will be looking straight down at the extent,
     * with the up vector pointing toward local north.
     *
     * @memberof Camera
     * @param {Ellipsoid} ellipsoid The ellipsoid to view.
     * @param {Extent} extent The extent to view.
     *
     * @exception {DeveloperError} extent is required.
     * @exception {DeveloperError} projection is required.
     */
    Camera.prototype.viewExtent2D = function(extent, projection) {
        if (typeof extent === 'undefined') {
            throw new DeveloperError('extent is required.');
        }

        if (typeof projection === 'undefined') {
            throw new DeveloperError('projection is required.');
        }

        var north = extent.north;
        var south = extent.south;
        var east = extent.east;
        var west = extent.west;
        var lla = new Cartographic(0.5 * (west + east), 0.5 * (north + south));

        var northEast = projection.project(new Cartographic(east, north));
        var southWest = projection.project(new Cartographic(west, south));

        var width = Math.abs(northEast.x - southWest.x) * 0.5;
        var height = Math.abs(northEast.y - southWest.y) * 0.5;

        var position = projection.project(lla);
        this.position.x = position.x;
        this.position.y = position.y;

        var right, top;
        var ratio = this.frustum.right / this.frustum.top;
        var heightRatio = height * ratio;
        if (width > heightRatio) {
            right = width;
            top = right / ratio;
        } else {
            top = height;
            right = heightRatio;
        }

        this.frustum.right = right;
        this.frustum.left = -right;
        this.frustum.top = top;
        this.frustum.bottom = -top;

        //Orient the camera north.
        Cartesian3.UNIT_X.clone(this.right);
        this.up = this.right.cross(this.direction);
    };

    function updateViewMatrix(camera) {
        var r = camera._right;
        var u = camera._up;
        var d = camera._direction;
        var e = camera._position;

        var viewMatrix = new Matrix4( r.x,  r.y,  r.z, -r.dot(e),
                                      u.x,  u.y,  u.z, -u.dot(e),
                                     -d.x, -d.y, -d.z,  d.dot(e),
                                      0.0,  0.0,  0.0,      1.0);
        camera._viewMatrix = viewMatrix.multiply(camera._invTransform);

        camera._invViewMatrix = camera._viewMatrix.inverseTransformation();
    }

    function update(camera) {
        var position = camera._position;
        var positionChanged = !position.equals(camera.position);
        if (positionChanged) {
            position = camera._position = camera.position.clone();
        }

        var direction = camera._direction;
        var directionChanged = !direction.equals(camera.direction);
        if (directionChanged) {
            direction = camera._direction = camera.direction.clone();
        }

        var up = camera._up;
        var upChanged = !up.equals(camera.up);
        if (upChanged) {
            up = camera._up = camera.up.clone();
        }

        var right = camera._right;
        var rightChanged = !right.equals(camera.right);
        if (rightChanged) {
            right = camera._right = camera.right.clone();
        }

        var transform = camera._transform;
        var transformChanged = !transform.equals(camera.transform);
        if (transformChanged) {
            transform = camera._transform = camera.transform.clone();

            camera._invTransform = camera._transform.inverseTransformation();
        }

        if (positionChanged || transformChanged) {
            camera._positionWC = Cartesian3.fromCartesian4(transform.multiplyByPoint(position));
        }

        if (directionChanged || transformChanged) {
            camera._directionWC = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(direction.x, direction.y, direction.z, 0.0)));
        }

        if (upChanged || transformChanged) {
            camera._upWC = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(up.x, up.y, up.z, 0.0)));
        }

        if (rightChanged || transformChanged) {
            camera._rightWC = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(right.x, right.y, right.z, 0.0)));
        }

        if (directionChanged || upChanged || rightChanged) {
            var det = direction.dot(up.cross(right));
            if (Math.abs(1.0 - det) > CesiumMath.EPSILON2) {
                //orthonormalize axes
                direction = camera._direction = direction.normalize();
                camera.direction = direction.clone();

                var invUpMag = 1.0 / up.magnitudeSquared();
                var scalar = up.dot(direction) * invUpMag;
                var w0 = direction.multiplyByScalar(scalar);
                up = camera._up = up.subtract(w0).normalize();
                camera.up = up.clone();

                right = camera._right = direction.cross(up);
                camera.right = right.clone();
            }
        }

        if (positionChanged || directionChanged || upChanged || rightChanged || transformChanged) {
            updateViewMatrix(camera);
        }
    }

    /**
     * DOC_TBA
     *
     * @memberof Camera
     *
     * @return {Matrix4} DOC_TBA
     */
    Camera.prototype.getInverseTransform = function() {
        update(this);
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
     * @see czm_view
     */
    Camera.prototype.getViewMatrix = function() {
        update(this);
        return this._viewMatrix;
    };

    /**
     * DOC_TBA
     * @memberof Camera
     */
    Camera.prototype.getInverseViewMatrix = function() {
        update(this);
        return this._invViewMatrix;
    };

    /**
     * The position of the camera in world coordinates.
     *
     * @type {Cartesian3}
     */
    Camera.prototype.getPositionWC = function() {
        update(this);
        return this._positionWC;
    };

    /**
     * The view direction of the camera in world coordinates.
     *
     * @type {Cartesian3}
     */
    Camera.prototype.getDirectionWC = function() {
        update(this);
        return this._directionWC;
    };

    /**
     * The up direction of the camera in world coordinates.
     *
     * @type {Cartesian3}
     */
    Camera.prototype.getUpWC = function() {
        update(this);
        return this._upWC;
    };

    /**
     * The right direction of the camera in world coordinates.
     *
     * @type {Cartesian3}
     */
    Camera.prototype.getRightWC = function() {
        update(this);
        return this._rightWC;
    };

    function getPickRayPerspective(camera, windowPosition) {
        var width = camera._canvas.clientWidth;
        var height = camera._canvas.clientHeight;

        var tanPhi = Math.tan(camera.frustum.fovy * 0.5);
        var tanTheta = camera.frustum.aspectRatio * tanPhi;
        var near = camera.frustum.near;

        var x = (2.0 / width) * windowPosition.x - 1.0;
        var y = (2.0 / height) * (height - windowPosition.y) - 1.0;

        var position = camera.getPositionWC();
        var nearCenter = position.add(camera.getDirectionWC().multiplyByScalar(near));
        var xDir = camera.getRightWC().multiplyByScalar(x * near * tanTheta);
        var yDir = camera.getUpWC().multiplyByScalar(y * near * tanPhi);
        var direction = nearCenter.add(xDir).add(yDir).subtract(position).normalize();

        return new Ray(position, direction);
    }

    function getPickRayOrthographic(camera, windowPosition) {
        var width = camera._canvas.clientWidth;
        var height = camera._canvas.clientHeight;

        var x = (2.0 / width) * windowPosition.x - 1.0;
        x *= (camera.frustum.right - camera.frustum.left) * 0.5;
        var y = (2.0 / height) * (height - windowPosition.y) - 1.0;
        y *= (camera.frustum.top - camera.frustum.bottom) * 0.5;

        var position = camera.position.clone();
        position.x += x;
        position.y += y;

        return new Ray(position, camera.getDirectionWC());
    }

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
            return getPickRayPerspective(this, windowPosition);
        }

        return getPickRayOrthographic(this, windowPosition);
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
        var ray = getPickRayPerspective(this, windowPosition);
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

        var ray = getPickRayOrthographic(this, windowPosition);
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

        var ray = getPickRayPerspective(this, windowPosition);
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
