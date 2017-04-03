/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/IntersectionTests',
        '../Core/Plane',
        '../Core/Ray',
        '../Core/Rectangle',
        './SceneMode'
    ], function(
        Cartesian3,
        Cartographic,
        defaultValue,
        defined,
        DeveloperError,
        Ellipsoid,
        IntersectionTests,
        Plane,
        Ray,
        Rectangle,
        SceneMode) {
    'use strict';

    /**
     * @param {Object} options Object with the following properties:
     * @param {Rectangle} options.rectangle
     * @param {Number} [options.minimumHeight=0.0]
     * @param {Number} [options.maximumHeight=0.0]
     * @param {Ellipsoid} [options.ellipsoid=Cesium.Ellipsoid.WGS84]
     *
     * @private
     */
    var TileBoundingBox = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.rectangle)) {
            throw new DeveloperError('options.url is required.');
        }
        //>>includeEnd('debug');

        this.rectangle = Rectangle.clone(options.rectangle);
        this.minimumHeight = defaultValue(options.minimumHeight, 0.0);
        this.maximumHeight = defaultValue(options.maximumHeight, 0.0);

        /**
         * The world coordinates of the southwest corner of the tile's rectangle.
         *
         * @type {Cartesian3}
         * @default Cartesian3()
         */
        this.southwestCornerCartesian = new Cartesian3();

        /**
         * The world coordinates of the northeast corner of the tile's rectangle.
         *
         * @type {Cartesian3}
         * @default Cartesian3()
         */
        this.northeastCornerCartesian = new Cartesian3();

        /**
         * A normal that, along with southwestCornerCartesian, defines a plane at the western edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         *
         * @type {Cartesian3}
         * @default Cartesian3()
         */
        this.westNormal = new Cartesian3();

        /**
         * A normal that, along with southwestCornerCartesian, defines a plane at the southern edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         * Because points of constant latitude do not necessary lie in a plane, positions below this
         * plane are not necessarily inside the tile, but they are close.
         *
         * @type {Cartesian3}
         * @default Cartesian3()
         */
        this.southNormal = new Cartesian3();

        /**
         * A normal that, along with northeastCornerCartesian, defines a plane at the eastern edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         *
         * @type {Cartesian3}
         * @default Cartesian3()
         */
        this.eastNormal = new Cartesian3();

        /**
         * A normal that, along with northeastCornerCartesian, defines a plane at the eastern edge of
         * the tile.  Any position above (in the direction of the normal) this plane is outside the tile.
         * Because points of constant latitude do not necessary lie in a plane, positions below this
         * plane are not necessarily inside the tile, but they are close.
         *
         * @type {Cartesian3}
         * @default Cartesian3()
         */
        this.northNormal = new Cartesian3();

        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        computeBox(this, options.rectangle, ellipsoid);
    };

    var cartesian3Scratch = new Cartesian3();
    var cartesian3Scratch2 = new Cartesian3();
    var cartesian3Scratch3 = new Cartesian3();
    var eastWestNormalScratch = new Cartesian3();
    var westernMidpointScratch = new Cartesian3();
    var easternMidpointScratch = new Cartesian3();
    var cartographicScratch = new Cartographic();
    var planeScratch = new Plane(Cartesian3.ZERO, 0.0);
    var rayScratch = new Ray();

    function computeBox(tileBB, rectangle, ellipsoid) {
        ellipsoid.cartographicToCartesian(Rectangle.southwest(rectangle), tileBB.southwestCornerCartesian);
        ellipsoid.cartographicToCartesian(Rectangle.northeast(rectangle), tileBB.northeastCornerCartesian);

        // The middle latitude on the western edge.
        cartographicScratch.longitude = rectangle.west;
        cartographicScratch.latitude = (rectangle.south + rectangle.north) * 0.5;
        cartographicScratch.height = 0.0;
        var westernMidpointCartesian = ellipsoid.cartographicToCartesian(cartographicScratch, westernMidpointScratch);

        // Compute the normal of the plane on the western edge of the tile.
        var westNormal = Cartesian3.cross(westernMidpointCartesian, Cartesian3.UNIT_Z, cartesian3Scratch);
        Cartesian3.normalize(westNormal, tileBB.westNormal);

        // The middle latitude on the eastern edge.
        cartographicScratch.longitude = rectangle.east;
        var easternMidpointCartesian = ellipsoid.cartographicToCartesian(cartographicScratch, easternMidpointScratch);

        // Compute the normal of the plane on the eastern edge of the tile.
        var eastNormal = Cartesian3.cross(Cartesian3.UNIT_Z, easternMidpointCartesian, cartesian3Scratch);
        Cartesian3.normalize(eastNormal, tileBB.eastNormal);

        // Compute the normal of the plane bounding the southern edge of the tile.
        var westVector = Cartesian3.subtract(westernMidpointCartesian, easternMidpointCartesian, cartesian3Scratch);
        var eastWestNormal = Cartesian3.normalize(westVector, eastWestNormalScratch);

        var south = rectangle.south;
        var southSurfaceNormal;

        if (south > 0.0) {
            // Compute a plane that doesn't cut through the tile.
            cartographicScratch.longitude = (rectangle.west +  rectangle.east) * 0.5;
            cartographicScratch.latitude = south;
            var southCenterCartesian = ellipsoid.cartographicToCartesian(cartographicScratch, rayScratch.origin);
            Cartesian3.clone(eastWestNormal, rayScratch.direction);
            var westPlane = Plane.fromPointNormal(tileBB.southwestCornerCartesian, tileBB.westNormal, planeScratch);
            // Find a point that is on the west and the south planes
            IntersectionTests.rayPlane(rayScratch, westPlane, tileBB.southwestCornerCartesian);
            southSurfaceNormal = ellipsoid.geodeticSurfaceNormal(southCenterCartesian, cartesian3Scratch2);

        } else {
            southSurfaceNormal = ellipsoid.geodeticSurfaceNormalCartographic(Rectangle.southeast(rectangle), cartesian3Scratch2);
        }
        var southNormal = Cartesian3.cross(southSurfaceNormal, westVector, cartesian3Scratch3);
        Cartesian3.normalize(southNormal, tileBB.southNormal);

        // Compute the normal of the plane bounding the northern edge of the tile.
        var north = rectangle.north;
        var northSurfaceNormal;
        if (north < 0.0) {
            // Compute a plane that doesn't cut through the tile.
            cartographicScratch.longitude = (rectangle.west + rectangle.east) * 0.5;
            cartographicScratch.latitude = north;
            var northCenterCartesian = ellipsoid.cartographicToCartesian(cartographicScratch, rayScratch.origin);
            Cartesian3.negate(eastWestNormal, rayScratch.direction);
            var eastPlane = Plane.fromPointNormal(tileBB.northeastCornerCartesian, tileBB.eastNormal, planeScratch);
            // Find a point that is on the east and the north planes
            IntersectionTests.rayPlane(rayScratch, eastPlane, tileBB.northeastCornerCartesian);
            northSurfaceNormal = ellipsoid.geodeticSurfaceNormal(northCenterCartesian, cartesian3Scratch2);

        } else {
            northSurfaceNormal = ellipsoid.geodeticSurfaceNormalCartographic(Rectangle.northwest(rectangle), cartesian3Scratch2);
        }
        var northNormal = Cartesian3.cross(westVector, northSurfaceNormal, cartesian3Scratch3);
        Cartesian3.normalize(northNormal, tileBB.northNormal);
    }

    var southwestCornerScratch = new Cartesian3();
    var northeastCornerScratch = new Cartesian3();
    var negativeUnitY = new Cartesian3(0.0, -1.0, 0.0);
    var negativeUnitZ = new Cartesian3(0.0, 0.0, -1.0);
    var vectorScratch = new Cartesian3();

    /**
     * Gets the distance from the camera to the closest point on the tile.  This is used for level-of-detail selection.
     *
     * @param {FrameState} frameState The state information of the current rendering frame.
     *
     * @returns {Number} The distance from the camera to the closest point on the tile, in meters.
     */
    TileBoundingBox.prototype.distanceToCamera = function(frameState) {
        var camera = frameState.camera;
        var cameraCartesianPosition = camera.positionWC;
        var cameraCartographicPosition = camera.positionCartographic;

        var result = 0.0;
        if (!Rectangle.contains(this.rectangle, cameraCartographicPosition)) {
            var southwestCornerCartesian = this.southwestCornerCartesian;
            var northeastCornerCartesian = this.northeastCornerCartesian;
            var westNormal = this.westNormal;
            var southNormal = this.southNormal;
            var eastNormal = this.eastNormal;
            var northNormal = this.northNormal;

            if (frameState.mode !== SceneMode.SCENE3D) {
                southwestCornerCartesian = frameState.mapProjection.project(Rectangle.southwest(this.rectangle), southwestCornerScratch);
                southwestCornerCartesian.z = southwestCornerCartesian.y;
                southwestCornerCartesian.y = southwestCornerCartesian.x;
                southwestCornerCartesian.x = 0.0;
                northeastCornerCartesian = frameState.mapProjection.project(Rectangle.northeast(this.rectangle), northeastCornerScratch);
                northeastCornerCartesian.z = northeastCornerCartesian.y;
                northeastCornerCartesian.y = northeastCornerCartesian.x;
                northeastCornerCartesian.x = 0.0;
                westNormal = negativeUnitY;
                eastNormal = Cartesian3.UNIT_Y;
                southNormal = negativeUnitZ;
                northNormal = Cartesian3.UNIT_Z;
            }

            var vectorFromSouthwestCorner = Cartesian3.subtract(cameraCartesianPosition, southwestCornerCartesian, vectorScratch);
            var distanceToWestPlane = Cartesian3.dot(vectorFromSouthwestCorner, westNormal);
            var distanceToSouthPlane = Cartesian3.dot(vectorFromSouthwestCorner, southNormal);

            var vectorFromNortheastCorner = Cartesian3.subtract(cameraCartesianPosition, northeastCornerCartesian, vectorScratch);
            var distanceToEastPlane = Cartesian3.dot(vectorFromNortheastCorner, eastNormal);
            var distanceToNorthPlane = Cartesian3.dot(vectorFromNortheastCorner, northNormal);

            if (distanceToWestPlane > 0.0) {
                result += distanceToWestPlane * distanceToWestPlane;
            } else if (distanceToEastPlane > 0.0) {
                result += distanceToEastPlane * distanceToEastPlane;
            }

            if (distanceToSouthPlane > 0.0) {
                result += distanceToSouthPlane * distanceToSouthPlane;
            } else if (distanceToNorthPlane > 0.0) {
                result += distanceToNorthPlane * distanceToNorthPlane;
            }
        }

        var cameraHeight;
        if (frameState.mode === SceneMode.SCENE3D) {
            cameraHeight = cameraCartographicPosition.height;
        } else {
            cameraHeight = cameraCartesianPosition.x;
        }

        var maximumHeight = frameState.mode === SceneMode.SCENE3D ? this.maximumHeight : 0.0;
        var distanceFromTop = cameraHeight - maximumHeight;
        if (distanceFromTop > 0.0) {
            result += distanceFromTop * distanceFromTop;
        }

        return Math.sqrt(result);
    };

    return TileBoundingBox;
});
