/*global define*/
define([
        './Cartesian3',
        './Cartographic',
        './defined',
        './DeveloperError',
        './GeographicProjection',
        './Math',
        './Matrix2',
        './Rectangle'
    ], function(
        Cartesian3,
        Cartographic,
        defined,
        DeveloperError,
        GeographicProjection,
        CesiumMath,
        Matrix2,
        Rectangle) {
    "use strict";

    var cos = Math.cos;
    var sin = Math.sin;
    var sqrt = Math.sqrt;

    /**
     * @private
     */
    var RectangleGeometryLibrary = {};

    /**
     * @private
     */
    RectangleGeometryLibrary.computePosition = function(options, row, col, position, st) {
        var radiiSquared = options.ellipsoid.radiiSquared;
        var nwCorner = options.nwCorner;
        var rectangle = options.rectangle;

        var stLatitude = nwCorner.latitude - options.granYCos * row + col * options.granXSin;
        var cosLatitude = cos(stLatitude);
        var nZ = sin(stLatitude);
        var kZ = radiiSquared.z * nZ;

        var stLongitude = nwCorner.longitude + row * options.granYSin + col * options.granXCos;
        var nX = cosLatitude * cos(stLongitude);
        var nY = cosLatitude * sin(stLongitude);

        var kX = radiiSquared.x * nX;
        var kY = radiiSquared.y * nY;

        var gamma = sqrt((kX * nX) + (kY * nY) + (kZ * nZ));

        position.x = kX / gamma;
        position.y = kY / gamma;
        position.z = kZ / gamma;

        if (defined(options.vertexFormat) && options.vertexFormat.st) {
            st.x = (stLongitude - rectangle.west) * options.lonScalar - 0.5;
            st.y = (stLatitude - rectangle.south) * options.latScalar - 0.5;

            Matrix2.multiplyByVector(options.textureMatrix, st, st);

            st.x += 0.5;
            st.y += 0.5;
        }
    };

    var rotationMatrixScratch = new Matrix2();
    var nwCartesian = new Cartesian3();
    var centerScratch = new Cartographic();
    var centerCartesian = new Cartesian3();
    var proj = new GeographicProjection();
    /**
     * @private
     */
    RectangleGeometryLibrary.computeOptions = function(geometry, rectangle, nwCorner) {
        var granularity = geometry._granularity;
        var ellipsoid = geometry._ellipsoid;
        var surfaceHeight = geometry._surfaceHeight;
        var rotation = geometry._rotation;
        var extrudedHeight = geometry._extrudedHeight;
        var east = rectangle.east;
        var west = rectangle.west;
        var north = rectangle.north;
        var south = rectangle.south;

        var width;
        var height;
        var granularityX;
        var granularityY;
        var dx;
        var dy = north - south;
        if (west > east) {
            dx = (CesiumMath.TWO_PI - west + east);
            width = Math.ceil(dx / granularity) + 1;
            height = Math.ceil(dy / granularity) + 1;
            granularityX = dx / (width - 1);
            granularityY = dy / (height - 1);
        } else {
            dx = east - west;
            width = Math.ceil(dx / granularity) + 1;
            height = Math.ceil(dy / granularity) + 1;
            granularityX = dx / (width - 1);
            granularityY = dy / (height - 1);
        }

        nwCorner = Rectangle.northwest(rectangle, nwCorner);
        var center = Rectangle.center(rectangle, centerScratch);

        var granYCos = granularityY;
        var granXCos = granularityX;
        var granYSin = 0.0;
        var granXSin = 0.0;

        if (defined(rotation)) { // rotation doesn't work when center is on/near IDL
            var cosRotation = Math.cos(rotation);
            granYCos *= cosRotation;
            granXCos *= cosRotation;

            var sinRotation = Math.sin(rotation);
            granYSin = granularityY * sinRotation;
            granXSin = granularityX * sinRotation;

            nwCartesian = proj.project(nwCorner, nwCartesian);
            centerCartesian = proj.project(center, centerCartesian);

            nwCartesian = Cartesian3.subtract(nwCartesian, centerCartesian, nwCartesian);
            var rotationMatrix = Matrix2.fromRotation(rotation, rotationMatrixScratch);
            nwCartesian = Matrix2.multiplyByVector(rotationMatrix, nwCartesian, nwCartesian);
            nwCartesian = Cartesian3.add(nwCartesian, centerCartesian, nwCartesian);
            nwCorner = proj.unproject(nwCartesian, nwCorner);

            var latitude = nwCorner.latitude;
            var latitude0 = latitude + (width - 1) * granXSin;
            var latitude1 = latitude - granYCos * (height - 1);
            var latitude2 = latitude - granYCos * (height - 1) + (width - 1) * granXSin;

            north = Math.max(latitude, latitude0, latitude1, latitude2);
            south = Math.min(latitude, latitude0, latitude1, latitude2);

            var longitude = nwCorner.longitude;
            var longitude0 = longitude + (width - 1) * granXCos;
            var longitude1 = longitude + (height - 1) * granYSin;
            var longitude2 = longitude + (height - 1) * granYSin + (width - 1) * granXCos;

            east = Math.max(longitude, longitude0, longitude1, longitude2);
            west = Math.min(longitude, longitude0, longitude1, longitude2);

            if (north < -CesiumMath.PI_OVER_TWO || north > CesiumMath.PI_OVER_TWO ||
                    south < -CesiumMath.PI_OVER_TWO || south > CesiumMath.PI_OVER_TWO) {
                throw new DeveloperError('Rotated rectangle is invalid.  It crosses over either the north or south pole.');
            }

            rectangle.north = north;
            rectangle.south = south;
            rectangle.east = east;
            rectangle.west = west;
        }

         return {
            granYCos : granYCos,
            granYSin : granYSin,
            granXCos : granXCos,
            granXSin : granXSin,
            ellipsoid : ellipsoid,
            width : width,
            height : height,
            surfaceHeight : surfaceHeight,
            extrudedHeight : extrudedHeight,
            nwCorner: nwCorner,
            rectangle: rectangle
        };
    };

    return RectangleGeometryLibrary;
});