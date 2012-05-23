/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Cartographic2',
        '../Core/Cartographic3',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/Math',
        '../Core/Occluder',
        '../Core/Rectangle'
    ], function(
        BoundingSphere,
        Cartesian3,
        Cartographic2,
        Cartographic3,
        DeveloperError,
        Ellipsoid,
        CesiumMath,
        Occluder,
        Rectangle) {
    "use strict";

    /**
     * Two-dimensional coordinates given in latitude and longitude.
     *
     * @name Extent
     * @constructor
     *
     * @param {Number} north The northernmost latitude in the range [-Pi/2, Pi/2].
     * @param {Number} east The easternmost longitude in the range [-Pi, Pi].
     * @param {Number} south The southernmost latitude in the range [-Pi/2, Pi/2].
     * @param {Number} west The westernmost longitude in the range [-Pi, Pi].
     *
     * @exception {DeveloperError} One of the parameters is out of range.
     */
    function Extent(north, east, south, west) {
        /**
         * The northernmost latitude.
         *
         * @type Number
         */
        this.north = (typeof north !== 'undefined') ? north : CesiumMath.PI_OVER_TWO;

        /**
         * The southernmost latitude.
         *
         * @type Number
         */
        this.south = (typeof south !== 'undefined') ? south : -CesiumMath.PI_OVER_TWO;

        /**
         * The westernmost longitude.
         *
         * @type Number
         */
        this.west = (typeof west !== 'undefined') ? west : -CesiumMath.PI;

        /**
         * The easternmost longitude.
         *
         * @type Number
         */
        this.east = (typeof east !== 'undefined') ? east : CesiumMath.PI;

        if (!Extent.valid(this)) {
            throw new DeveloperError("One or more of the parameters is out of range.", "north, south, east or west");
        }
    }

    /**
     * Checks that an {@link Extent}'s members are in the proper ranges, north is greater than south and east is greater than west.
     *
     * @param {Extent} extent The extent to be checked for validity.
     *
     * @returns {Boolean} True if all of the members of <code>extent</code> are in their respective ranges and false otherwise.
     */
    Extent.valid = function(extent) {
        if (typeof extent === 'undefined' ||
            typeof extent.north === 'undefined' ||
            typeof extent.south === 'undefined' ||
            typeof extent.west === 'undefined' ||
            typeof extent.east === 'undefined') {
            return false;
        }

        if (extent.north < -CesiumMath.PI_OVER_TWO || extent.north > CesiumMath.PI_OVER_TWO) {
            return false;
        }

        if (extent.south < -CesiumMath.PI_OVER_TWO || extent.south > CesiumMath.PI_OVER_TWO) {
            return false;
        }

        if (extent.north < extent.south) {
            return false;
        }

        if (extent.west < -CesiumMath.PI || extent.west > CesiumMath.PI) {
            return false;
        }

        if (extent.east < -CesiumMath.PI || extent.east > CesiumMath.PI) {
            return false;
        }

        if (extent.west > extent.east) {
            return false;
        }

        return true;
    };

    function getPosition(lla, ellipsoid, time, projection) {
        if (typeof time === 'undefined' || time === 0.0 || typeof projection === 'undefined') {
            return ellipsoid.toCartesian(lla);
        }

        var twod = projection.project(lla);
        twod = new Cartesian3(0.0, twod.x, twod.y);
        return twod.lerp(ellipsoid.toCartesian(lla), time);
    }

    Extent._computePositions = function(extent, ellipsoid, time, projection) {
        if (typeof extent === 'undefined') {
            throw new DeveloperError("extent is required.", "extent");
        }

        if (!Extent.valid(extent)) {
            throw new DeveloperError("extent is invalid.", "extent");
        }

        ellipsoid = ellipsoid || Ellipsoid.WGS84;
        var positions = [];

        var lla = new Cartographic3(extent.west, extent.north, 0.0);
        positions.push(getPosition(lla, ellipsoid, time, projection));
        lla.longitude = extent.east;
        positions.push(getPosition(lla, ellipsoid, time, projection));
        lla.latitude = extent.south;
        positions.push(getPosition(lla, ellipsoid, time, projection));
        lla.longitude = extent.west;
        positions.push(getPosition(lla, ellipsoid, time, projection));

        if (extent.north < 0.0) {
            lla.latitude = extent.north;
        } else if (extent.south > 0.0) {
            lla.latitude = extent.south;
        } else {
            lla.latitude = 0.0;
        }

        for ( var i = 1; i < 8; ++i) {
            var temp = -Math.PI + i * CesiumMath.PI_OVER_TWO;
            if (extent.west < temp && temp < extent.east) {
                lla.longitude = temp;
                positions.push(getPosition(lla, ellipsoid, time, projection));
            }
        }

        if (lla.latitude === 0.0) {
            lla.longitude = extent.west;
            positions.push(getPosition(lla, ellipsoid, time, projection));
            lla.longitude = extent.east;
            positions.push(getPosition(lla, ellipsoid, time, projection));
        }

        return positions;
    };

    Extent.computeMorphBoundingSphere = function(extent, ellipsoid, time, projection) {
        return new BoundingSphere(Extent._computePositions(extent, ellipsoid, time, projection));
    };

    Extent.compute3DBoundingSphere = function(extent, ellipsoid) {
        return new BoundingSphere(Extent._computePositions(extent, ellipsoid));
    };

    Extent.computeOccludeePoint = function(extent, ellipsoid) {
        ellipsoid = ellipsoid || Ellipsoid.WGS84;
        var positions = Extent._computePositions(extent, ellipsoid);
        var bs = new BoundingSphere(positions);

        // TODO: get correct ellipsoid center
        var ellipsoidCenter = Cartesian3.ZERO;
        if (!ellipsoidCenter.equals(bs.center)) {
            return Occluder.getOccludeePoint(new BoundingSphere(ellipsoidCenter, ellipsoid.getMinimumRadius()), bs.center, positions);
        }
        return {
            valid : false,
            occludeePoint : null
        };
    };

    Extent.computeBoundingRectangle = function(extent, projection) {
        if (typeof extent === 'undefined') {
            throw new DeveloperError("extent is required.", "extent");
        }

        if (!Extent.valid(extent)) {
            throw new DeveloperError("extent is invalid.", "extent");
        }

        if (typeof projection === 'undefined') {
            throw new DeveloperError("projection is required.", "projection");
        }

        var lla = new Cartographic2(extent.west, extent.south);
        var lowerLeft = projection.project(lla);
        lla.longitude = extent.east;
        lla.latitude = extent.north;
        var upperRight = projection.project(lla);

        var diagonal = upperRight.subtract(lowerLeft);
        return new Rectangle(lowerLeft.x, lowerLeft.y, diagonal.x, diagonal.y);
    };

    Extent.compute2DBoundingSphere = function(extent, projection) {
        var rect = Extent.computeBoundingRectangle(extent, projection);
        var center = new Cartesian3((2.0 * rect.x + rect.width) * 0.5, (2.0 * rect.y + rect.height) * 0.5, 0.0);
        var radius = Math.sqrt(rect.width * rect.width + rect.height * rect.height) * 0.5;
        return new BoundingSphere(center, radius);
    };

    return Extent;
});
