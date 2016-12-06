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
            var stnwCorner = options.stnwCorner;
            if (defined(stnwCorner)) {
                stLatitude = stnwCorner.latitude - options.stgranycos * row + col * options.stgranxsin;
                stLongitude = stnwCorner.longitude + row * options.stgranysin + col * options.stgranxcos;

                st.x = (stLongitude - options.stwest) * options.lonScalar;
                st.y = (stLatitude - options.stsouth) * options.latScalar;
            } else {
                st.x = (stLongitude - rectangle.west) * options.lonScalar;
                st.y = (stLatitude - rectangle.south) * options.latScalar;
            }


            // var stRotation = options.stRotation - options.rotation;
            // var cosRotation = Math.cos(stRotation);
            // var granularityX = 1/options.width;
            // var granularityY = 1/options.height;
            // var granYCos = granularityY;
            // var granXCos = granularityX;
            // var granYSin = 0.0;
            // var granXSin = 0.0;
            //
            // granYCos *= cosRotation;
            // granXCos *= cosRotation;
            //
            // var sinRotation = Math.sin(stRotation);
            // granYSin = granularityY * sinRotation;
            // granXSin = granularityX * sinRotation;
            //
            //
            // st.x -= 0.5;
            // st.y -= 0.5;
            //
            //
            //
            //
            // // st.x = col * 1/options.width;
            // // st.y = 1 - row * 1/options.height;
            //
            // st.x = row * granYSin + col * granXCos;
            // st.y = 1 - (granYCos * row + col * granXSin);
            //
            // st.x += 0.5;
            // st.y += 0.5;
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

        var granYCos = granularityY;
        var granXCos = granularityX;
        var granYSin = 0.0;
        var granXSin = 0.0;

        if (defined(rotation) && rotation !== 0) {
            var cosRotation = Math.cos(rotation);
            granYCos *= cosRotation;
            granXCos *= cosRotation;

            var sinRotation = Math.sin(rotation);
            granYSin = granularityY * sinRotation;
            granXSin = granularityX * sinRotation;

            if (center.longitude < nwCorner.longitude) {
                center.longitude += CesiumMath.TWO_PI;
            }

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

            //>>includeStart('debug', pragmas.debug);
            if (north < -CesiumMath.PI_OVER_TWO || north > CesiumMath.PI_OVER_TWO ||
                south < -CesiumMath.PI_OVER_TWO || south > CesiumMath.PI_OVER_TWO) {
                throw new DeveloperError('Rotated rectangle is invalid.  It crosses over either the north or south pole.');
            }
            //>>includeEnd('debug')

            rectangle.north = north;
            rectangle.south = south;
            rectangle.east = east;
            rectangle.west = west;
        }

        var stgranYCos;
        var stgranXCos;
        var stgranYSin;
        var stgranXSin;
        var stnwCorner;
        var stsouth;
        var stwest;
        if (stRotation !== 0) {
            rotation = rotation - stRotation;
            stgranYCos = granularityY;
            stgranXCos = granularityX;
  //          stgranYSin = 0.0;
//            stgranXSin = 0.0;

            var stcosRotation = Math.cos(rotation);
            stgranYCos *= stcosRotation;
            stgranXCos *= stcosRotation;

            var stsinRotation = Math.sin(rotation);
            stgranYSin = granularityY * stsinRotation;
            stgranXSin = granularityX * stsinRotation;

            stnwCorner = Rectangle.northwest(rectangle, stnwCorner);
            nwCartesian = proj.project(stnwCorner, nwCartesian);
            centerCartesian = proj.project(center, centerCartesian);

            nwCartesian = Cartesian3.subtract(nwCartesian, centerCartesian, nwCartesian);
            nwCartesian = Matrix2.multiplyByVector(Matrix2.fromRotation(rotation, rotationMatrixScratch), nwCartesian, nwCartesian);
            nwCartesian = Cartesian3.add(nwCartesian, centerCartesian, nwCartesian);
            stnwCorner = proj.unproject(nwCartesian, stnwCorner);

            var la = nwCorner.latitude;
            var l0 = la + (width - 1) * granXSin;
            var l1 = la - granYCos * (height - 1);
            var l2 = la - granYCos * (height - 1) + (width - 1) * granXSin;

            stsouth = Math.min(la, l0, l1, l2);

            var lo = nwCorner.longitude;
            var lo0 = lo + (width - 1) * granXCos;
            var lo1 = lo + (height - 1) * granYSin;
            var lo2 = lo + (height - 1) * granYSin + (width - 1) * granXCos;

            stwest = Math.min(lo, lo0, lo1, lo2);
        }

        return {
            granYCos : granYCos,
            granYSin : granYSin,
            granXCos : granXCos,
            granXSin : granXSin,
            granX: granularityX,
            granY: granularityY,
            ellipsoid : ellipsoid,
            width : width,
            height : height,
            surfaceHeight : surfaceHeight,
            extrudedHeight : extrudedHeight,
            nwCorner : nwCorner,
            rectangle : rectangle,
            stgranycos: stgranYCos,
            stgranxcos: stgranXCos,
            stgranysin: stgranYSin,
            stgranxsin: stgranXSin,
            stnwCorner: stnwCorner,
            stwest: stwest,
            stsouth: stsouth
        };
    };

    return RectangleGeometryLibrary;
});
