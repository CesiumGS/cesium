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
    'use strict';

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
            var stNwCorner = options.stNwCorner;
            if (defined(stNwCorner)) {
                stLatitude = stNwCorner.latitude - options.stGranYCos * row + col * options.stGranXSin;
                stLongitude = stNwCorner.longitude + row * options.stGranYSin + col * options.stGranXCos;

                st.x = (stLongitude - options.stWest) * options.lonScalar;
                st.y = (stLatitude - options.stSouth) * options.latScalar;
            } else {
                st.x = (stLongitude - rectangle.west) * options.lonScalar;
                st.y = (stLatitude - rectangle.south) * options.latScalar;
            }
        }
    };

    var rotationMatrixScratch = new Matrix2();
    var nwCartesian = new Cartesian3();
    var centerScratch = new Cartographic();
    var centerCartesian = new Cartesian3();
    var proj = new GeographicProjection();

    function getRotationOptions(nwCorner, rotation, granularityX, granularityY, center, width, height) {
        var cosRotation = Math.cos(rotation);
        var granYCos = granularityY * cosRotation;
        var granXCos = granularityX * cosRotation;

        var sinRotation = Math.sin(rotation);
        var granYSin = granularityY * sinRotation;
        var granXSin = granularityX * sinRotation;

        nwCartesian = proj.project(nwCorner, nwCartesian);

        nwCartesian = Cartesian3.subtract(nwCartesian, centerCartesian, nwCartesian);
        var rotationMatrix = Matrix2.fromRotation(rotation, rotationMatrixScratch);
        nwCartesian = Matrix2.multiplyByVector(rotationMatrix, nwCartesian, nwCartesian);
        nwCartesian = Cartesian3.add(nwCartesian, centerCartesian, nwCartesian);
        nwCorner = proj.unproject(nwCartesian, nwCorner);

        width -= 1;
        height -= 1;

        var latitude = nwCorner.latitude;
        var latitude0 = latitude + width * granXSin;
        var latitude1 = latitude - granYCos * height;
        var latitude2 = latitude - granYCos * height + width * granXSin;

        var north = Math.max(latitude, latitude0, latitude1, latitude2);
        var south = Math.min(latitude, latitude0, latitude1, latitude2);

        var longitude = nwCorner.longitude;
        var longitude0 = longitude + width * granXCos;
        var longitude1 = longitude + height * granYSin;
        var longitude2 = longitude + height * granYSin + width * granXCos;

        var east = Math.max(longitude, longitude0, longitude1, longitude2);
        var west = Math.min(longitude, longitude0, longitude1, longitude2);

        return {
            north: north,
            south: south,
            east: east,
            west: west,
            granYCos : granYCos,
            granYSin : granYSin,
            granXCos : granXCos,
            granXSin : granXSin,
            nwCorner : nwCorner
        };
    }

    /**
     * @private
     */
    RectangleGeometryLibrary.computeOptions = function(geometry, rectangle, nwCorner, stNwCorner) {
        var granularity = geometry._granularity;
        var ellipsoid = geometry._ellipsoid;
        var surfaceHeight = geometry._surfaceHeight;
        var rotation = geometry._rotation;
        var stRotation = geometry._stRotation;
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
        if (rotation !== 0 || stRotation !== 0) {
            if (center.longitude < nwCorner.longitude) {
                center.longitude += CesiumMath.TWO_PI;
            }
            centerCartesian = proj.project(center, centerCartesian);
        }

        var granYCos = granularityY;
        var granXCos = granularityX;
        var granYSin = 0.0;
        var granXSin = 0.0;

        var options = {
            granYCos : granYCos,
            granYSin : granYSin,
            granXCos : granXCos,
            granXSin : granXSin,
            ellipsoid : ellipsoid,
            surfaceHeight : surfaceHeight,
            extrudedHeight : extrudedHeight,
            nwCorner : nwCorner,
            rectangle : rectangle,
            width: width,
            height: height
        };

        if (rotation !== 0) {
            var rotationOptions = getRotationOptions(nwCorner, rotation, granularityX, granularityY, center, width, height);
            north = rotationOptions.north;
            south = rotationOptions.south;
            east = rotationOptions.east;
            west = rotationOptions.west;

            //>>includeStart('debug', pragmas.debug);
            if (north < -CesiumMath.PI_OVER_TWO || north > CesiumMath.PI_OVER_TWO ||
                south < -CesiumMath.PI_OVER_TWO || south > CesiumMath.PI_OVER_TWO) {
                throw new DeveloperError('Rotated rectangle is invalid.  It crosses over either the north or south pole.');
            }
            //>>includeEnd('debug')

            options.granYCos = rotationOptions.granYCos;
            options.granYSin = rotationOptions.granYSin;
            options.granXCos = rotationOptions.granXCos;
            options.granXSin = rotationOptions.granXSin;

            rectangle.north = north;
            rectangle.south = south;
            rectangle.east = east;
            rectangle.west = west;
        }

        if (stRotation !== 0) {
            rotation = rotation - stRotation;
            stNwCorner = Rectangle.northwest(rectangle, stNwCorner);

            var stRotationOptions = getRotationOptions(stNwCorner, rotation, granularityX, granularityY, center, width, height);

            options.stGranYCos =  stRotationOptions.granYCos;
            options.stGranXCos = stRotationOptions.granXCos;
            options.stGranYSin = stRotationOptions.granYSin;
            options.stGranXSin = stRotationOptions.granXSin;
            options.stNwCorner = stNwCorner;
            options.stWest = stRotationOptions.west;
            options.stSouth = stRotationOptions.south;
        }

        return options;
    };

    return RectangleGeometryLibrary;
});
