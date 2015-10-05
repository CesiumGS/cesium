/*global define*/
define([
        '../ThirdParty/geographiclib',
        './Cartesian3',
        './Cartographic',
        './defaultValue',
        './defined',
        './defineProperties',
        './DeveloperError',
        './Ellipsoid',
        './Math'
    ], function(
        GeographicLib,
        Cartesian3,
        Cartographic,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid,
        CesiumMath) {
    "use strict";

    var Geodesic = GeographicLib.Geodesic,
        degree = CesiumMath.RADIANS_PER_DEGREE;

    function geodesicInverse(ellipsoidGeodesic, a, b,
                             firstLongitude, firstLatitude,
                             secondLongitude, secondLatitude) {
        var geod = new Geodesic.Geodesic(a, (a - b) / a),
            lat1 = firstLatitude / degree, lon1 = firstLongitude / degree,
            lat2 = secondLatitude / degree, lon2 = secondLongitude / degree,
            r = geod.Inverse(lat1, lon1, lat2, lon2);
        ellipsoidGeodesic._distance = r.s12;
        ellipsoidGeodesic._startHeading = r.azi1 * degree;
        ellipsoidGeodesic._endHeading = r.azi2 * degree;
        ellipsoidGeodesic._line = geod.Line(r.lat1, r.lon1, r.azi1);
    }

    function computeProperties(ellipsoidGeodesic, start, end, ellipsoid) {
        //>>includeStart('debug', pragmas.debug);
        if (ellipsoid.radii.x !== ellipsoid.radii.y) {
            throw new DeveloperError('equatorial axes of ellipsoid not equal');
        }
        //>>includeEnd('debug');

        geodesicInverse(ellipsoidGeodesic, ellipsoid.radii.x, ellipsoid.radii.z,
                        start.longitude, start.latitude,
                        end.longitude, end.latitude);

        ellipsoidGeodesic._start = Cartographic.clone(start, ellipsoidGeodesic._start);
        ellipsoidGeodesic._end = Cartographic.clone(end, ellipsoidGeodesic._end);
        ellipsoidGeodesic._start.height = 0;
        ellipsoidGeodesic._end.height = 0;
    }

    /**
     * Initializes a geodesic on the ellipsoid connecting the two provided planetodetic points.
     *
     * @alias EllipsoidGeodesic
     * @constructor
     *
     * @param {Cartographic} [start] The initial planetodetic point on the path.
     * @param {Cartographic} [end] The final planetodetic point on the path.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the geodesic lies.
     */
    var EllipsoidGeodesic = function(start, end, ellipsoid) {
        var e = defaultValue(ellipsoid, Ellipsoid.WGS84);
        this._ellipsoid = e;
        this._start = new Cartographic();
        this._end = new Cartographic();

        this._startHeading = undefined;
        this._endHeading = undefined;
        this._distance = undefined;
        this._line = undefined;

        if (defined(start) && defined(end)) {
            computeProperties(this, start, end, e);
        }
    };

    defineProperties(EllipsoidGeodesic.prototype, {
        /**
         * Gets the ellipsoid.
         * @memberof EllipsoidGeodesic.prototype
         * @type {Ellipsoid}
         * @readonly
         */
        ellipsoid : {
            get : function() {
                return this._ellipsoid;
            }
        },

        /**
         * Gets the surface distance between the start and end point
         * @memberof EllipsoidGeodesic.prototype
         * @type {Number}
         * @readonly
         */
        surfaceDistance : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(this._distance)) {
                    throw new DeveloperError('set end positions before getting surfaceDistance');
                }
                //>>includeEnd('debug');

                return this._distance;
            }
        },

        /**
         * Gets the initial planetodetic point on the path.
         * @memberof EllipsoidGeodesic.prototype
         * @type {Cartographic}
         * @readonly
         */
        start : {
            get : function() {
                return this._start;
            }
        },

        /**
         * Gets the final planetodetic point on the path.
         * @memberof EllipsoidGeodesic.prototype
         * @type {Cartographic}
         * @readonly
         */
        end : {
            get : function() {
                return this._end;
            }
        },

        /**
         * Gets the heading at the initial point.
         * @memberof EllipsoidGeodesic.prototype
         * @type {Number}
         * @readonly
         */
        startHeading : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(this._distance)) {
                    throw new DeveloperError('set end positions before getting startHeading');
                }
                //>>includeEnd('debug');

                return this._startHeading;
            }
        },

        /**
         * Gets the heading at the final point.
         * @memberof EllipsoidGeodesic.prototype
         * @type {Number}
         * @readonly
         */
        endHeading : {
            get : function() {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(this._distance)) {
                    throw new DeveloperError('set end positions before getting endHeading');
                }
                //>>includeEnd('debug');

                return this._endHeading;
            }
        }
    });

    /**
     * Sets the start and end points of the geodesic
     *
     * @param {Cartographic} start The initial planetodetic point on the path.
     * @param {Cartographic} end The final planetodetic point on the path.
     */
    EllipsoidGeodesic.prototype.setEndPoints = function(start, end) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(start)) {
            throw new DeveloperError('start cartographic position is required');
        }
        if (!defined(end)) {
            throw new DeveloperError('end cartgraphic position is required');
        }
        //>>includeEnd('debug');

        computeProperties(this, start, end, this._ellipsoid);
    };

    /**
     * Provides the location of a point at the indicated portion along the geodesic.
     *
     * @param {Number} fraction The portion of the distance between the initial and final points.
     * @returns {Cartographic} The location of the point along the geodesic.
     */
    EllipsoidGeodesic.prototype.interpolateUsingFraction = function(fraction, result) {
        return this.interpolateUsingSurfaceDistance(this._distance * fraction, result);
    };

    /**
     * Provides the location of a point at the indicated distance along the geodesic.
     *
     * @param {Number} distance The distance from the inital point to the point of interest along the geodesic
     * @returns {Cartographic} The location of the point along the geodesic.
     *
     * @exception {DeveloperError} start and end must be set before calling funciton interpolateUsingSurfaceDistance
     */
    EllipsoidGeodesic.prototype.interpolateUsingSurfaceDistance = function(distance, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(this._distance)) {
            throw new DeveloperError('start and end must be set before calling funciton interpolateUsingSurfaceDistance');
        }
        //>>includeEnd('debug');

        var r = this._line.Position(distance,
                                    Geodesic.STANDARD | Geodesic.LONG_UNROLL),
            lat2 = r.lat2 * degree,
            lon2 = r.lon2 * degree;

        if (defined(result)) {
            result.longitude = lon2;
            result.latitude = lat2;
            result.height = 0.0;
            return result;
        }

        return new Cartographic(lon2, lat2, 0.0);
    };

    return EllipsoidGeodesic;
});
